"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";

type VoicePreferencesState = {
  voiceRepliesEnabled: boolean;
  ttsAvailable: boolean;
  sttAvailable: boolean;
  loading: boolean;
  error: string | null;
};

type VoicePreferencesContextValue = VoicePreferencesState & {
  setVoiceRepliesEnabled: (enabled: boolean) => Promise<void>;
};

const VoicePreferencesContext =
  createContext<VoicePreferencesContextValue | null>(null);

type PreferencesResponse = {
  preferences: { voiceRepliesEnabled: boolean };
  voice: { ttsAvailable: boolean; sttAvailable: boolean };
};

export function VoicePreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<VoicePreferencesState>({
    voiceRepliesEnabled: false,
    ttsAvailable: false,
    sttAvailable: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    apiRequest<PreferencesResponse>("/api/v1/preferences", {
      signal: controller.signal,
    })
      .then((data) => {
        setState({
          voiceRepliesEnabled: data.preferences.voiceRepliesEnabled,
          ttsAvailable: data.voice.ttsAvailable,
          sttAvailable: data.voice.sttAvailable,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({
          ...previous,
          loading: false,
          error:
            error instanceof ApiClientError
              ? error.message
              : "Voice settings couldn’t be loaded.",
        }));
      });

    return () => controller.abort();
  }, []);

  const setVoiceRepliesEnabled = useCallback(async (enabled: boolean) => {
    setState((previous) => ({
      ...previous,
      voiceRepliesEnabled: enabled,
      error: null,
    }));

    try {
      const data = await apiRequest<PreferencesResponse>("/api/v1/preferences", {
        method: "PATCH",
        body: { voiceRepliesEnabled: enabled },
      });
      setState((previous) => ({
        ...previous,
        voiceRepliesEnabled: data.preferences.voiceRepliesEnabled,
        ttsAvailable: data.voice.ttsAvailable,
        sttAvailable: data.voice.sttAvailable,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        voiceRepliesEnabled: !enabled,
        error:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t save your voice preference.",
      }));
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, setVoiceRepliesEnabled }),
    [state, setVoiceRepliesEnabled],
  );

  return (
    <VoicePreferencesContext.Provider value={value}>
      {children}
    </VoicePreferencesContext.Provider>
  );
}

export function useVoicePreferences(): VoicePreferencesContextValue {
  const context = useContext(VoicePreferencesContext);
  if (!context) {
    throw new Error("useVoicePreferences must be used inside VoicePreferencesProvider");
  }
  return context;
}
