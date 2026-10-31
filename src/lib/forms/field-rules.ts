import type { FieldType, FormFieldDto } from "./types";
import { MAX_FORM_FIELDS } from "./types";

const JARGON_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bplease\s+furnish\b/gi, "Please share"],
  [/\bfurnish\b/gi, "share"],
  [/\bkindly\b/gi, "please"],
  [/\binclusive\s+of\b/gi, "including"],
  [/\btelephonic\s+contact\s+number\b/gi, "phone number"],
  [/\btelephonic\b/gi, "phone"],
  [/\bresidential\s+address\b/gi, "home address"],
  [/\bmost\s+frequently\s+monitored\b/gi, "best"],
  [/\bd\.?o\.?b\.?\b/gi, "date of birth"],
  [/\bin\s+the\s+dd\/mm\/yyyy\s+format\b/gi, ""],
  [/\bin\s+dd\/mm\/yyyy\s+format\b/gi, ""],
  [/\bstate\s+the\s+full\s+postal\s+address\s+of\s+your\s+current\s+place\s+of\s+residence\b/gi, "your current home address"],
  [/\bprovide\b/gi, "share"],
  [/\benter\b/gi, "type"],
  [/\bselect\b/gi, "choose"],
  [/\bapplicant'?s?\b/gi, "your"],
  [/\bself\b/gi, "you"],
  [/\bhereby\b/gi, ""],
];

const QUESTION_OVERRIDES: Array<[RegExp, string]> = [
  [/\b(full\s+name|applicant\s+name|name\s+of\s+applicant|customer\s+name|your\s+name)\b/i, "What’s your full name?"],
  [/\b(date\s+of\s+birth|birth\s+date|born)\b/i, "When were you born?"],
  [/\b(e-?mail)\b/i, "What’s your email address?"],
  [/\b(phone|mobile|telephone|contact\s+number)\b/i, "What’s the best phone number to reach you?"],
  [/\b(address|residence|where\s+do\s+you\s+live)\b/i, "Where do you live?"],
  [/\b(annual\s+(household\s+)?income|yearly\s+income|salary|earnings)\b/i, "How much does your household earn each year?"],
  [/\bwhy\b.*\b(scholarship|grant|funding)\b/i, "Why do you need this scholarship?"],
  [/\bwhy\b/i, "Why is this important to you?"],
  [/\b(place\s+of\s+birth|birthplace)\b/i, "Where were you born?"],
  [/\b(nationality|citizenship)\b/i, "What’s your nationality?"],
  [/\bgender\b/i, "What’s your gender?"],
  [/\bmarital\s+status\b/i, "What’s your marital status?"],
  [/\boccupation|profession\b/i, "What do you do for work?"],
  [/\b(employer|company\s+name)\b/i, "Where do you work?"],
  [/\b(course|programme|program)\b/i, "Which course are you applying for?"],
  [/\b(school|college|university|institution)\b/i, "Which school or college do you attend?"],
  [/\b(pin\s*code|postal\s+code|zip)\b/i, "What’s your PIN or postal code?"],
  [/\bage\b/i, "How old are you?"],
  [/\b(parent|guardian|father|mother)\b/i, "What’s your parent or guardian’s name?"],
  [/\b(signature)\b/i, "Type your full name as a signature."],
];

const TYPE_KEYWORDS: Array<[RegExp, FieldType]> = [
  [/\b(e-?mail)\b/i, "email"],
  [/\b(phone|mobile|telephone|contact\s+number|whatsapp)\b/i, "phone"],
  [/\b(date|birth|dob|d\.o\.b)\b/i, "date"],
  [/\b(income|salary|amount|age|number\s+of|quantity|years?)\b/i, "number"],
  [/\b(address|reason|statement|description|details|why|remarks?|comments?)\b/i, "longtext"],
];

const REQUIRED_HINTS =
  /\b(full\s+name|name|date\s+of\s+birth|birth|e-?mail|phone|mobile|telephone|contact\s+number|address|pin\s*code|signature|income|salary|amount)\b/i;

const MAX_LENGTHS: Record<FieldType, number> = {
  text: 250,
  longtext: 2000,
  email: 254,
  phone: 25,
  date: 10,
  number: 20,
  choice: 100,
};

const HELP_TEXT: Partial<Record<FieldType, string>> = {
  email: "We’ll check that it looks like an email address.",
  phone: "7–15 digits. Spaces, +, and dashes are fine.",
  date: "Use a real date, like 12/03/1996 or 1996-03-12.",
  number: "Numbers only, please.",
  longtext: "Take your time — a few clear sentences is plenty.",
  choice: "Choose the option that fits best.",
};

export function cleanText(text: string, maxLength: number): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function stripLeadingNumbering(text: string): string {
  return text
    .replace(/^[\s•●▪◦*\-–—]+/, "")
    .replace(/^\s*(\d{1,2}|[a-zA-Z])[).:]\s+/, "")
    .replace(/^\s*\d{1,2}\s+/, "")
    .trim();
}

export function simplifyQuestion(original: string): string {
  let text = cleanText(original, 300);
  text = stripLeadingNumbering(text).replace(/[:：]\s*$/, "").trim();

  for (const [pattern, replacement] of JARGON_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = cleanText(text, 220).replace(/[:：]\s*$/, "");

  for (const [pattern, override] of QUESTION_OVERRIDES) {
    if (pattern.test(text) || pattern.test(original)) return override;
  }

  if (!text) return cleanText(original, 200) || "Please share this detail";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function inferFieldType(original: string, options?: string[]): FieldType {
  if (options && options.length > 0) return "choice";
  for (const [pattern, type] of TYPE_KEYWORDS) {
    if (pattern.test(original)) return type;
  }
  return "text";
}

export function inferRequired(original: string): boolean {
  if (/\boptional\b/i.test(original)) return false;
  if (/\*/.test(original)) return true;
  return REQUIRED_HINTS.test(original);
}

export function helpTextFor(type: FieldType): string | undefined {
  return HELP_TEXT[type];
}

export function maxLengthFor(type: FieldType): number {
  return MAX_LENGTHS[type];
}

export function slugifyFieldKey(input: string, fallbackIndex: number): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || `question-${fallbackIndex + 1}`;
}

export function buildFields(
  inputs: Array<{
    question: string;
    type?: FieldType;
    required?: boolean;
    options?: string[];
    maxLength?: number;
  }>,
): FormFieldDto[] {
  const usedKeys = new Set<string>();
  const fields: FormFieldDto[] = [];

  for (let index = 0; index < inputs.length && fields.length < MAX_FORM_FIELDS; index += 1) {
    const input = inputs[index];
    const question = cleanText(input.question, 300);
    if (!question) continue;

    const normalizedOptions = (input.options ?? [])
      .map((option) => cleanText(option, 100))
      .filter(Boolean)
      .slice(0, 12);

    let type = input.type ?? inferFieldType(question, normalizedOptions);
    if (type === "choice" && normalizedOptions.length === 0) type = "text";

    let key = slugifyFieldKey(question, index);
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${slugifyFieldKey(question, index).slice(0, 44)}-${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);

    fields.push({
      key,
      question,
      plainQuestion: simplifyQuestion(question),
      type,
      required: input.required ?? inferRequired(question),
      ...(normalizedOptions.length > 0 ? { options: normalizedOptions } : {}),
      helpText: helpTextFor(type),
      maxLength: Math.min(input.maxLength ?? maxLengthFor(type), 2000),
    });
  }

  return fields;
}

const QUESTION_STOPWORDS = /^(page|of)\b/i;

export function splitQuestionCandidates(text: string): string[] {
  const seen = new Set<string>();
  const questions: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    let line = cleanText(rawLine, 200);
    if (!line) continue;

    line = line.replace(/[☐□◻◼■▪]/g, "").trim();
    const withoutNumber = stripLeadingNumbering(line);
    if (!withoutNumber) continue;

    if (QUESTION_STOPWORDS.test(withoutNumber)) continue;
    if (/^\d+$/.test(withoutNumber)) continue;
    if (withoutNumber.length < 4 || withoutNumber.length > 160) continue;

    const endsLikeQuestion = /[:?]$/.test(withoutNumber);
    const hasKeyword =
      /\b(name|date|birth|dob|address|email|e-mail|phone|mobile|telephone|number|income|amount|age|gender|nationality|occupation|employer|signature|course|school|college|university|reason|statement|details|pin|postal|city|state|country|why|how|what|which|when|where)\b/i.test(
        withoutNumber,
      );
    const hasNumbering = /^\s*(\d{1,2}|[a-zA-Z])[).:]\s+/.test(line);

    if (!endsLikeQuestion && !hasKeyword && !hasNumbering) continue;

    const normalized = stripLeadingNumbering(withoutNumber)
      .replace(/[\s:]+$/, "")
      .trim();
    const dedupeKey = normalized.toLowerCase();
    if (!normalized || seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    questions.push(normalized.slice(0, 140));
    if (questions.length >= MAX_FORM_FIELDS) break;
  }

  return questions;
}

export function inferTitle(text: string, fallback: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanText(line, 140))
    .filter(Boolean);

  for (const line of lines.slice(0, 12)) {
    if (
      /\b(form|application|registration|enrolment|enrollment|questionnaire|declaration|request|record)\b/i.test(
        line,
      ) &&
      line.length >= 5 &&
      line.length <= 120 &&
      !line.endsWith(":")
    ) {
      return line.replace(/[:：]\s*$/, "");
    }
  }

  const firstUsable = lines.find(
    (line) => line.length >= 5 && line.length <= 100 && !line.endsWith(":"),
  );
  return firstUsable?.slice(0, 120) || fallback;
}
