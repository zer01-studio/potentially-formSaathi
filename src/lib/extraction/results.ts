import type { ExtractionMode, FormFieldDto } from "@/lib/forms/types";

export type CachedExtraction = {
  title: string;
  fields: FormFieldDto[];
  mode: Extract<ExtractionMode, "html" | "text" | "ocr">;
};

export type ExtractionOutcome = {
  title: string;
  fields: FormFieldDto[];
  mode: ExtractionMode;
  demoFallback: boolean;
  note?: string;
};
