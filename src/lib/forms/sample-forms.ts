import { buildFields } from "./field-rules";
import type { FormFieldDto } from "./types";

type SampleDefinition = {
  title: string;
  fields: Array<{
    question: string;
    required?: boolean;
    options?: string[];
  }>;
};

const SAMPLES: SampleDefinition[] = [
  {
    title: "Scholarship application (sample)",
    fields: [
      { question: "Full name:", required: true },
      { question: "Date of birth (DD/MM/YYYY):", required: true },
      { question: "Email address:", required: true },
      { question: "Telephone number:", required: true },
      { question: "Residential address:", required: true },
      {
        question: "Which course are you applying for?",
        required: true,
        options: ["Undergraduate degree", "Postgraduate degree", "Diploma", "Certificate course"],
      },
      { question: "Annual household income:", required: true },
      { question: "Why do you need this scholarship?" },
    ],
  },
  {
    title: "Passport details (sample)",
    fields: [
      { question: "Full name:", required: true },
      { question: "Date of birth (DD/MM/YYYY):", required: true },
      { question: "Place of birth:", required: true },
      { question: "Nationality:", required: true },
      { question: "Home address:", required: true },
      { question: "PIN code:" },
      { question: "Email address:" },
      { question: "Phone number:", required: true },
    ],
  },
  {
    title: "Rental application (sample)",
    fields: [
      { question: "Full name:", required: true },
      { question: "Current home address:", required: true },
      { question: "Phone number:", required: true },
      { question: "Employer name:" },
      { question: "Monthly income:", required: true },
      { question: "Preferred move-in date:" },
      {
        question: "How many people will live in the home?",
        required: true,
        options: ["Just me", "2 people", "3 people", "4 or more"],
      },
    ],
  },
];

export type DemoForm = {
  title: string;
  fields: FormFieldDto[];
};

export function getDemoForm(seed: string): DemoForm {
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const sample = SAMPLES[total % SAMPLES.length];

  return {
    title: sample.title,
    fields: buildFields(sample.fields),
  };
}
