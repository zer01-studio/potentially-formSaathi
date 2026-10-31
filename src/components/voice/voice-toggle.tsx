"use client";

import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { useVoicePreferences } from "./voice-preferences-provider";
import { cn } from "@/lib/utils";

export function VoiceToggle() {
  const {
    voiceRepliesEnabled,
    ttsAvailable,
    sttAvailable,
    loading,
    setVoiceRepliesEnabled,
  } = useVoicePreferences();

  const available = ttsAvailable || sttAvailable;
  const unavailable = !loading && !available;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={voiceRepliesEnabled}
      aria-label="Voice replies"
      aria-disabled={loading || unavailable}
      disabled={loading || unavailable}
      title={
        available
          ? voiceRepliesEnabled
            ? "Voice replies are on"
            : "Turn on spoken questions and answers"
          : "ElevenLabs isn’t configured; voice is disabled for now"
      }
      onClick={() => void setVoiceRepliesEnabled(!voiceRepliesEnabled)}
      className={cn(
        "group inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card/70 px-2.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
        voiceRepliesEnabled && "border-primary/40 bg-primary/5",
      )}
    >
      <Volume2
        className={cn(
          "size-3.5 transition-colors",
          voiceRepliesEnabled ? "text-primary" : "text-muted-foreground",
        )}
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="text-[11px] font-medium text-foreground">
        <span className="sm:hidden">Voice</span>
        <span className="hidden sm:inline">Voice replies</span>
      </span>

      <span
        className={cn(
          "relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-300",
          voiceRepliesEnabled ? "bg-primary" : "bg-muted",
        )}
        aria-hidden="true"
      >
        {voiceRepliesEnabled ? (
          <motion.span
            layoutId="voice-toggle-glow"
            className="absolute inset-0 rounded-full bg-primary-foreground/15 blur-[3px]"
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
          />
        ) : null}
        <motion.span
          animate={{ x: voiceRepliesEnabled ? 16 : 0 }}
          whileTap={{ scaleX: 1.25 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
          className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        />
      </span>

      {!available ? (
        <span
          className="size-1.5 rounded-full bg-warning"
          aria-label="Voice unavailable"
          title="ElevenLabs isn’t configured"
        />
      ) : null}
    </button>
  );
}
