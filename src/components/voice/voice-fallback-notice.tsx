"use client";

import { TriangleAlert } from "lucide-react";
import { useVoicePreferences } from "./voice-preferences-provider";

export function VoiceFallbackNotice() {
  const {
    voiceRepliesEnabled,
    ttsAvailable,
    sttAvailable,
    loading,
    error,
  } = useVoicePreferences();

  if (loading) return null;

  if (error) {
    return (
      <div className="border-b border-danger/20 bg-danger/10">
        <div className="mx-auto max-w-6xl px-5 py-2.5 text-[12px] text-danger sm:px-8">
          {error}
        </div>
      </div>
    );
  }

  if (!voiceRepliesEnabled || (ttsAvailable && sttAvailable)) return null;

  const message = !ttsAvailable
    ? sttAvailable
      ? "Voice replies is on, but ElevenLabs text-to-speech isn’t configured. Questions stay in text; spoken answers are still available."
      : "Voice replies is on, but ElevenLabs isn’t configured. Questions and answers stay in text."
    : "Voice replies is on, but spoken answers aren’t configured. You can still hear questions and type answers.";

  return (
    <div className="border-b border-warning/25 bg-warning/10">
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-5 py-2.5 text-[12px] leading-relaxed text-foreground/85 sm:items-center sm:px-8">
        <TriangleAlert
          className="mt-0.5 size-3.5 shrink-0 text-warning sm:mt-0"
          aria-hidden="true"
        />
        <span>{message}</span>
      </div>
    </div>
  );
}
