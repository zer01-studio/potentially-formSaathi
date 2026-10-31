import type { FormFieldDto } from "./types";
import { MAX_ANSWER_LENGTH } from "./types";

export type AnswerValidationResult =
  | { ok: true; normalizedValue: string }
  | { ok: false; message: string };

function requiredMessage(field: FormFieldDto): string {
  const text = `${field.question} ${field.plainQuestion}`.toLowerCase();
  if (/\b(e-?mail)\b/.test(text)) return "Enter your email address to continue.";
  if (/\b(phone|mobile|telephone)\b/.test(text)) return "Enter a phone number to continue.";
  if (/\b(date|birth)\b/.test(text)) return "Enter a date to continue.";
  if (/\b(name)\b/.test(text)) return "Enter your name to continue.";
  if (field.type === "number") return "Enter a number to continue.";
  if (field.type === "choice") return "Choose an option to continue.";
  return "This question is needed to finish the form.";
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateDate(value: string): boolean {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return isRealDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const dayFirstMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirstMatch) {
    return isRealDate(
      Number(dayFirstMatch[3]),
      Number(dayFirstMatch[2]),
      Number(dayFirstMatch[1]),
    );
  }

  return false;
}

export function validateAnswerValue(
  field: FormFieldDto,
  rawValue: string,
): AnswerValidationResult {
  const value = rawValue.trim();

  if (!value) {
    return field.required ? { ok: false, message: requiredMessage(field) } : { ok: true, normalizedValue: "" };
  }

  const limit = Math.min(field.maxLength ?? MAX_ANSWER_LENGTH, MAX_ANSWER_LENGTH);
  if (value.length > limit) {
    return {
      ok: false,
      message: `This answer is too long. Keep it under ${limit.toLocaleString("en-IN")} characters.`,
    };
  }

  switch (field.type) {
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return {
          ok: false,
          message: "That email address doesn’t look right. Check for a missing @ or a typo.",
        };
      }
      return { ok: true, normalizedValue: value.toLowerCase() };
    }

    case "phone": {
      const digits = value.replace(/\D/g, "");
      if (!/^[+()\-\s\d]+$/.test(value) || digits.length < 7 || digits.length > 15) {
        return {
          ok: false,
          message: "Enter a phone number with 7 to 15 digits. Spaces, +, and dashes are okay.",
        };
      }
      return { ok: true, normalizedValue: value };
    }

    case "date": {
      if (!validateDate(value)) {
        return {
          ok: false,
          message: "Use a real date, like 12/03/1996 or 1996-03-12.",
        };
      }
      return { ok: true, normalizedValue: value };
    }

    case "number": {
      const numeric = value.replace(/[,\s]/g, "");
      if (!/^-?\d{1,12}(\.\d{1,2})?$/.test(numeric)) {
        return { ok: false, message: "Enter numbers only — no letters or symbols." };
      }
      return { ok: true, normalizedValue: numeric };
    }

    case "choice": {
      const match = field.options?.find(
        (option) => option.toLowerCase() === value.toLowerCase(),
      );
      if (!match) {
        return { ok: false, message: "Choose one of the listed options." };
      }
      return { ok: true, normalizedValue: match };
    }

    default:
      return { ok: true, normalizedValue: value };
  }
}
