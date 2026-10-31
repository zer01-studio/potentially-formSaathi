import type { Metadata } from "next";
import { CheckCheck, Layers, Lock, Mic } from "lucide-react";
import { AttachPanel } from "@/components/forms/attach-panel";
import { RecentForms } from "@/components/forms/recent-forms";
import { ServiceStatusCard } from "@/components/workspace/service-status-card";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

const EXPECTATIONS = [
  {
    icon: Layers,
    title: "One question at a time",
    body: "Plain language first, with the original wording one tap away.",
  },
  {
    icon: CheckCheck,
    title: "Checked as you go",
    body: "Dates, emails, phone numbers, and required answers get a kind second look.",
  },
  {
    icon: Mic,
    title: "Voice comes later",
    body: "Type for now; spoken questions and answers arrive in Phase 4.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "Uploads are deleted after reading, and nothing is shared without you.",
  },
];

export default function WorkspacePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Workspace
        </p>
        <h1 className="mt-5 font-display text-[2.2rem] font-medium leading-[1.03] tracking-[-0.03em] text-foreground sm:text-[2.8rem]">
          Let’s make this form{" "}
          <span className="italic text-accent-strong">feel simple.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Attach a form — a link, photo, or PDF. We’ll read it, turn each
          question into plain language, and walk you through one answer at a
          time.
        </p>
      </div>

      <div className="mt-9 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          <AttachPanel
            maxUploadMb={env.MAX_UPLOAD_MB}
            maxPdfPages={env.MAX_PDF_PAGES}
          />
          <RecentForms />
        </div>

        <aside className="space-y-5">
          <ServiceStatusCard />

          <section className="rounded-[26px] border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-[1.1rem] font-medium text-foreground">
              What to expect
            </h2>
            <ul className="mt-4 space-y-4">
              {EXPECTATIONS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 text-primary">
                    <Icon className="size-3.5" strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-foreground">{title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
