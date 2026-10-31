import "server-only";
import { HTMLElement, parse } from "node-html-parser";
import { ApiHttpError } from "@/lib/api/errors";
import { buildFields, cleanText } from "@/lib/forms/field-rules";
import { MAX_FORM_FIELDS, type FieldType, type FormFieldDto } from "@/lib/forms/types";

type RawField = {
  question: string;
  type?: FieldType;
  required?: boolean;
  options?: string[];
  maxLength?: number;
};

const SKIPPED_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "file",
  "password",
  "search",
]);

const TOKEN_NAME_PATTERN = /(csrf|xsrf|token|nonce|captcha|honeypot)/i;

function humanizeName(raw: string): string {
  return cleanText(
    raw
      .replace(/[_\-.]+/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
    140,
  );
}

function findWrappingLabel(element: HTMLElement): string | undefined {
  let parent = element.parentNode;
  while (parent) {
    if (parent instanceof HTMLElement && parent.tagName.toLowerCase() === "label") {
      return cleanText(parent.text, 160);
    }
    parent = parent.parentNode;
  }
  return undefined;
}

function findFieldsetLegend(element: HTMLElement): string | undefined {
  let parent = element.parentNode;
  while (parent) {
    if (parent instanceof HTMLElement && parent.tagName.toLowerCase() === "fieldset") {
      const legend = parent.querySelector("legend");
      return legend ? cleanText(legend.text, 160) : undefined;
    }
    parent = parent.parentNode;
  }
  return undefined;
}

function isPlaceholderOption(text: string): boolean {
  return /^(select|choose|please|--|—|-)/i.test(text);
}

export function extractFormFromHtml(html: string): {
  title: string;
  fields: FormFieldDto[];
} {
  const root = parse(html, { comment: false });

  const labelsByFor = new Map<string, string>();
  root.querySelectorAll("label").forEach((label) => {
    const target = label.getAttribute("for")?.trim();
    const text = cleanText(label.text, 160);
    if (target && text) labelsByFor.set(target, text);
  });

  const controls = root.querySelectorAll("input, select, textarea");
  const radioGroupsSeen = new Set<string>();
  const seenQuestions = new Set<string>();
  const rawFields: RawField[] = [];

  for (const element of controls) {
    if (rawFields.length >= 40) break;

    const tag = element.tagName.toLowerCase();
    const inputType = (element.getAttribute("type") ?? "text").toLowerCase();

    if (tag === "input" && SKIPPED_INPUT_TYPES.has(inputType)) continue;
    if (inputType === "checkbox") continue;

    const name = (element.getAttribute("name") ?? "").trim();
    if (name && TOKEN_NAME_PATTERN.test(name)) continue;

    let options: string[] = [];

    if (tag === "select") {
      options = element
        .querySelectorAll("option")
        .map((option) => cleanText(option.text, 100))
        .filter((option) => option.length > 0 && !isPlaceholderOption(option));
    }

    if (inputType === "radio") {
      if (!name || radioGroupsSeen.has(name)) continue;
      radioGroupsSeen.add(name);

      const group = controls.filter(
        (control) =>
          control.tagName.toLowerCase() === "input" &&
          (control.getAttribute("type") ?? "").toLowerCase() === "radio" &&
          (control.getAttribute("name") ?? "").trim() === name,
      );

      options = group
        .map((control) => {
          const id = control.getAttribute("id")?.trim();
          const value = control.getAttribute("value") ?? "";
          const label =
            (id ? labelsByFor.get(id) : undefined) ??
            findWrappingLabel(control) ??
            value;
          return cleanText(label, 100);
        })
        .filter(Boolean);
    }

    const id = element.getAttribute("id")?.trim();
    const explicitLabel = id ? labelsByFor.get(id) : undefined;
    const wrappingLabel = findWrappingLabel(element);
    const ariaLabel = element.getAttribute("aria-label");
    const placeholder = element.getAttribute("placeholder");
    const titleAttribute = element.getAttribute("title");
    const legend = inputType === "radio" ? findFieldsetLegend(element) : undefined;

    const questionSource =
      legend ||
      explicitLabel ||
      wrappingLabel ||
      ariaLabel ||
      placeholder ||
      titleAttribute ||
      humanizeName(name || id || "");

    const question = cleanText(questionSource, 160);
    if (!question) continue;

    const dedupeKey = question.toLowerCase();
    if (seenQuestions.has(dedupeKey)) continue;
    seenQuestions.add(dedupeKey);

    const required =
      element.hasAttribute("required") ||
      (element.getAttribute("aria-required") ?? "").toLowerCase() === "true" ||
      Boolean(explicitLabel?.includes("*")) ||
      Boolean(wrappingLabel?.includes("*"));

    const maxLengthRaw = Number(element.getAttribute("maxlength"));
    const maxLength =
      Number.isFinite(maxLengthRaw) && maxLengthRaw > 0
        ? Math.min(maxLengthRaw, 2000)
        : undefined;

    let type: FieldType | undefined;
    if (tag === "textarea") type = "longtext";
    else if (tag === "select" || inputType === "radio") type = "choice";
    else if (inputType === "email") type = "email";
    else if (inputType === "tel") type = "phone";
    else if (inputType === "date") type = "date";
    else if (inputType === "number") type = "number";

    rawFields.push({
      question,
      required,
      ...(type ? { type } : {}),
      ...(options.length > 0 ? { options } : {}),
      ...(maxLength ? { maxLength } : {}),
    });
  }

  const fields = buildFields(rawFields).slice(0, MAX_FORM_FIELDS);

  if (fields.length === 0) {
    throw new ApiHttpError(
      422,
      "no_fields",
      "We couldn’t find any questions on that page. Try a link that opens the form directly, or upload a PDF or photo.",
    );
  }

  const pageTitle =
    cleanText(root.querySelector("title")?.text ?? "", 140) ||
    cleanText(root.querySelector("h1")?.text ?? "", 140) ||
    "Web form";

  return { title: pageTitle, fields };
}
