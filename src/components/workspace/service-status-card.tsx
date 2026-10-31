"use client";

import { useEffect, useState } from "react";
import { Activity, LoaderCircle } from "lucide-react";
import { apiRequest } from "@/lib/client/api";

type HealthResponse = {
  status: "ok" | "degraded";
  time: string;
  services: {
    gemma: "connected" | "demo";
    elevenlabs: "connected" | "demo";
    ocr: "connected" | "demo";
    database: "connected" | "unavailable";
  };
};

const LABELS: { key: keyof HealthResponse["services"]; label: string }[] = [
  { key: "gemma", label: "Gemma AI" },
  { key: "elevenlabs", label: "ElevenLabs" },
  { key: "ocr", label: "OCR" },
  { key: "database", label: "Database" },
];

function statusTone(status: string): { dot: string; text: string } {
  if (status === "connected") {
    return { dot: "bg-success", text: "Connected" };
  }
  if (status === "demo") {
    return { dot: "bg-warning", text: "Demo fallback" };
  }
  return { dot: "bg-danger", text: "Unavailable" };
}

export function ServiceStatusCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiRequest<HealthResponse>("/api/v1/health")
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-[26px] border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-[1.1rem] font-medium text-foreground">
          <Activity className="size-4 text-primary" aria-hidden="true" />
          Service status
        </h2>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
          /api/v1/health
        </span>
      </div>

      {!health && !failed ? (
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Checking services…
        </p>
      ) : null}

      {failed ? (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Status unavailable right now. The app still works in demo mode.
        </p>
      ) : null}

      {health ? (
        <ul className="mt-4 space-y-2.5">
          {LABELS.map(({ key, label }) => {
            const tone = statusTone(health.services[key]);
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-[12.5px]"
              >
                <span className="text-foreground/85">{label}</span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                  {tone.text}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
