import {
  statusForConfidence,
  type Candidate,
  type Confidence,
  type FieldMatch,
  type PageField,
} from "./types";

const STOPWORDS = new Set([
  "the",
  "your",
  "our",
  "and",
  "for",
  "with",
  "please",
  "enter",
  "provide",
  "furnish",
  "kindly",
  "state",
  "full",
  "of",
  "in",
  "is",
  "a",
  "an",
  "to",
  "on",
]);

const KEY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(e-?mail)\b/i, "email"],
  [/\b(phone|mobile|contact number|telephone|cell)\b/i, "phone"],
  [/\b(date of birth|dob|birth date|born on)\b/i, "dateOfBirth"],
  [/\b(full name|your name|applicant name|legal name)\b/i, "fullName"],
  [/\b(first name|given name)\b/i, "firstName"],
  [/\b(last name|surname|family name)\b/i, "lastName"],
  [/\b(pin ?code|postal code|zip code|postcode)\b/i, "postalCode"],
  [/\b(street address|residential address|postal address|home address|address)\b/i, "address"],
  [/\b(city|town)\b/i, "city"],
  [/\b(state|province|region)\b/i, "state"],
  [/\b(country)\b/i, "country"],
  [/\b(company|employer|organisation|organization)\b/i, "company"],
  [/\b(website|portfolio|url)\b/i, "website"],
  [/\b(age)\b/i, "age"],
  [/\b(gender|sex)\b/i, "gender"],
];

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokensFor(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 1 && !STOPWORDS.has(token)),
  );
}

function overlap(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / Math.min(left.size, right.size);
}

function guessKeyFromText(text: string): string | null {
  for (const [pattern, key] of KEY_PATTERNS) {
    if (pattern.test(text)) return key;
  }
  return null;
}

function guessKey(field: PageField): string | null {
  return guessKeyFromText(
    [field.label, field.name ?? "", field.placeholder ?? "", field.autocomplete ?? ""]
      .filter(Boolean)
      .join(" "),
  );
}

function typeAffinity(field: PageField, candidate: Candidate): number {
  const type = (candidate.type ?? "").toLowerCase();
  if (!type) return 0;
  if (field.inputType === "email" && type === "email") return 6;
  if ((field.inputType === "tel" || field.inputType === "number") && /phone|number|tel/.test(type)) return 6;
  if (field.inputType === "date" && /date/.test(type)) return 6;
  if (field.inputType === "textarea" && /long|text/.test(type)) return 3;
  if (field.inputType === "select" && /choice|select/.test(type)) return 4;
  if (field.inputType === "email" && type && type !== "email") return -8;
  if (field.inputType === "date" && type && !/date/.test(type)) return -8;
  return 0;
}

function scorePair(field: PageField, candidate: Candidate): number {
  let score = 0;

  const canonical = guessKey(field);
  const candidateCanonical = guessKeyFromText(
    `${candidate.key} ${candidate.label}`,
  );
  if (
    canonical &&
    (candidateCanonical === canonical ||
      normalizeText(candidate.key) === normalizeText(canonical))
  ) {
    score += 55;
  }

  if (field.name && normalizeText(candidate.key) === normalizeText(field.name)) {
    score += 40;
  }

  const fieldText = [field.label, field.placeholder ?? "", field.helpText ?? ""]
    .filter(Boolean)
    .join(" ");
  const candidateText = [candidate.label, candidate.key].filter(Boolean).join(" ");
  const shared = overlap(tokensFor(fieldText), tokensFor(candidateText));
  score += shared * 45;

  if (field.autocomplete) {
    const hint = normalizeText(field.autocomplete.split(" ")[0] ?? "");
    if (hint && normalizeText(candidate.key).includes(hint)) score += 10;
  }

  score += typeAffinity(field, candidate);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function questionFor(field: PageField): string {
  const label = field.label || field.name || "this field";
  const subject = label.endsWith("?") ? label : `What should go in “${label}”?`;
  return subject.length > 220 ? subject.slice(0, 217) + "…" : subject;
}

function guidanceFor(field: PageField): string {
  const shape =
    field.inputType === "date"
      ? "a date"
      : field.inputType === "email"
        ? "an email address"
        : field.inputType === "tel"
          ? "a phone number"
          : field.inputType === "number"
            ? "a number"
            : field.inputType === "select" || field.inputType === "radio"
              ? "one of the listed options"
              : "text";

  return `The page expects ${shape}${field.required ? " and marks it required" : ""}.`;
}

export function matchFieldsWithRules(
  fields: PageField[],
  candidates: Candidate[],
): FieldMatch[] {
  return fields.map((field) => {
    const scored = candidates
      .map((candidate) => ({ candidate, score: scorePair(field, candidate) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const runnerUp = scored[1];
    const ambiguousTie = Boolean(
      best && runnerUp && best.score - runnerUp.score <= 8 && best.score >= 30,
    );

    let confidence: Confidence = "low";
    if (best && best.score >= 55 && !ambiguousTie) confidence = "high";
    else if (best && best.score >= 30) confidence = "medium";

    const candidateKey = best && confidence !== "low" ? best.candidate.key : null;

    const reason =
      confidence === "high"
        ? "Label matches this answer closely."
        : confidence === "medium"
          ? ambiguousTie
            ? "Two answers fit this field equally well."
            : "Possible match — the wording differs."
          : "No answer clearly fits this field.";

    return {
      fieldId: field.id,
      candidateKey,
      value: candidateKey ? best.candidate.value : null,
      confidence,
      status: statusForConfidence(candidateKey, confidence),
      reason,
      question: candidateKey ? null : questionFor(field),
      guidance: guidanceFor(field),
    };
  });
}
