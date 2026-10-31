"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { csrfHeaders } from "@/lib/client/api";
import { useVoicePreferences } from "./voice-preferences-provider";

type VoiceNotice = {
  tone: "info" | "error";
  message: string;
};

export function useFormVoice({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const {
    voiceRepliesEnabled,
    ttsAvailable,
    sttAvailable,
    loading,
  } = useVoicePreferences();

  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<VoiceNotice | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const canSpeak = !loading && voiceRepliesEnabled && ttsAvailable;
  const canRecord = !loading && voiceRepliesEnabled && sttAvailable && !transcribing;

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!canSpeak || !text) return;

      try {
        const response = await fetch("/api/v1/voice/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders(),
          },
          body: JSON.stringify({ text }),
          credentials: "same-origin",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setVoiceNotice({
            tone: "error",
            message:
              payload?.error?.message ??
              "Voice couldn’t read that aloud. Questions stay in text.",
          });
          return;
        }

        const blob = await response.blob();
        if (!blob.size) throw new Error("empty audio");

        stopPlayback();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setVoiceNotice(null);
        setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => {
          setSpeaking(false);
          setVoiceNotice({
            tone: "error",
            message: "We couldn’t play the voice. Questions stay in text.",
          });
        };

        try {
          await audio.play();
        } catch {
          setVoiceNotice({
            tone: "info",
            message: "Tap the speaker button to hear this question aloud.",
          });
        }
      } catch {
        setVoiceNotice({
          tone: "error",
          message: "Voice is unavailable right now. Questions stay in text.",
        });
      }
    },
    [canSpeak, stopPlayback],
  );

  function clearRecordingTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function finishRecording(recorder: MediaRecorder) {
    clearRecordingTimer();
    setRecording(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;

    const blob = new Blob(chunksRef.current, {
      type: recorder.mimeType || "audio/webm",
    });
    chunksRef.current = [];

    if (!blob.size) {
      setVoiceError("We didn’t catch any audio. Try again, or type your answer.");
      return;
    }

    setTranscribing(true);
    setVoiceError(null);

    try {
      const formData = new FormData();
      formData.append("file", blob, "answer.webm");

      const response = await fetch("/api/v1/voice/transcribe", {
        method: "POST",
        headers: csrfHeaders(),
        body: formData,
        credentials: "same-origin",
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        data?: { text?: string };
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.ok) {
        setVoiceError(
          payload?.error?.message ??
            "We couldn’t transcribe that. Please type your answer.",
        );
        return;
      }

      const text = String(payload.data?.text ?? "").trim();
      if (!text) {
        setVoiceError("We couldn’t hear an answer. Try again, or type it.");
        return;
      }

      onTranscriptRef.current(text);
      setVoiceNotice({
        tone: "info",
        message: "Heard your answer. Check the text before saving.",
      });
    } catch {
      setVoiceError("We couldn’t transcribe that. Please type your answer.");
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    if (!canRecord || recording) return;

    setVoiceError(null);
    setVoiceNotice(null);

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceError(
        "Voice recording isn’t supported in this browser. Please type your answer.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const canUseWebm =
        typeof MediaRecorder.isTypeSupported !== "function" ||
        MediaRecorder.isTypeSupported("audio/webm");
      const recorder = new MediaRecorder(
        stream,
        canUseWebm ? { mimeType: "audio/webm" } : undefined,
      );

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finishRecording(recorder);
      };

      recorder.start();
      setRecording(true);
      timerRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 45_000);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setVoiceError(
        "Microphone access was denied or unavailable. You can type your answer instead.",
      );
    }
  }

  function stopRecording() {
    clearRecordingTimer();
    setRecording(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return {
    voiceRepliesEnabled,
    ttsAvailable,
    sttAvailable,
    canSpeak,
    canRecord,
    speaking,
    recording,
    transcribing,
    voiceNotice,
    voiceError,
    speak,
    startRecording,
    stopRecording,
    stopPlayback,
    clearVoiceError: () => setVoiceError(null),
  };
}
