import type { Metadata } from "next";
import { FormRunner } from "@/components/forms/form-runner";

export const metadata: Metadata = {
  title: "Your form",
  robots: { index: false, follow: false },
};

export default async function FormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <FormRunner formId={formId} />;
}
