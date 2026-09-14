import { createContext, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useAppStore } from "@/store/useAppStore";
import { INSTITUTIONS } from "@/config/institutions";
import { fullRegionName } from "@/lib/institutionRows";
import { api } from "@/lib/api";
import { voiceApi } from "./VoiceService";
import { InsecureContextError, MicPermissionDeniedError, VoiceRecorder } from "./VoiceRecorder";
import { VOICE_ERROR } from "./VoiceCommands";
import { normalizeTranscript, tokens } from "./VoiceNormalizer";
import { extractEntities } from "./VoiceEntityExtractor";
import { EXECUTE_THRESHOLD, predictIntents, type IntentPrediction } from "./VoiceIntentPredictor";
import { buildSuggestions, type VoiceSuggestion } from "./VoiceSuggestionEngine";
import { executeIntent, type ExecutorDeps } from "./VoiceExecutor";
import { speakResponse } from "./VoiceResponseService";
import { loadHistory, pushHistory, clearHistory as clearHistoryStore, type VoiceHistoryEntry } from "./VoiceHistory";

export type VoiceStatus = "idle" | "listening" | "recognizing" | "executing" | "completed" | "suggesting" | "error";

export interface VoiceContextValue {
  status: VoiceStatus;
  recognizedText: string;
  feedbackText: string;
  errorMessage: string | null;
  confidence: number;
  suggestions: VoiceSuggestion[];
  history: VoiceHistoryEntry[];
  startListening: () => void;
  stopListening: () => void;
  cancelListening: () => void;
  chooseSuggestion: (s: VoiceSuggestion) => void;
  replay: (entry: VoiceHistoryEntry) => void;
  clearHistory: () => void;
}

const noop = () => {};

export const VoiceContext = createContext<VoiceContextValue>({
  status: "idle",
  recognizedText: "",
  feedbackText: "",
  errorMessage: null,
  confidence: 0,
  suggestions: [],
  history: [],
  startListening: noop,
  stopListening: noop,
  cancelListening: noop,
  chooseSuggestion: noop,
  replay: noop,
  clearHistory: noop,
});

interface State {
  status: VoiceStatus;
  recognizedText: string;
  feedbackText: string;
  errorMessage: string | null;
  confidence: number;
  suggestions: VoiceSuggestion[];
}

type Action =
  | { type: "LISTEN_START" }
  | { type: "LISTEN_STOP" }
  | { type: "RECOGNIZED"; text: string }
  | { type: "EXECUTED"; feedback: string; confidence: number }
  | { type: "SUGGEST"; suggestions: VoiceSuggestion[] }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

const INITIAL_STATE: State = {
  status: "idle",
  recognizedText: "",
  feedbackText: "",
  errorMessage: null,
  confidence: 0,
  suggestions: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LISTEN_START":
      return { ...INITIAL_STATE, status: "listening" };
    case "LISTEN_STOP":
      return { ...state, status: "recognizing" };
    case "RECOGNIZED":
      return { ...state, recognizedText: action.text, status: "executing" };
    case "EXECUTED":
      return { ...state, status: "completed", feedbackText: action.feedback, confidence: action.confidence, suggestions: [] };
    case "SUGGEST":
      return { ...state, status: "suggesting", suggestions: action.suggestions };
    case "ERROR":
      return { ...state, status: "error", errorMessage: action.message };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

/** Ovozli buyruq taniydigan hududlar — HAQIQIY muassasalar hududlaridan. */
const VOICE_REGIONS: { name: string }[] = [...new Set(INSTITUTIONS.map((i) => fullRegionName(i.region)))].map(
  (name) => ({ name })
);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [history, setHistory] = useState<VoiceHistoryEntry[]>([]);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const statusRef = useRef<VoiceStatus>("idle");
  statusRef.current = state.status;

  /* ⚠️ **MOCK RO'YXAT OLIB TASHLANDI** (2026-09-05): ovozli buyruq
     ilgari `useGetTechnikums()` bergan 645 generatsiya qilingan
     texnikumdan qidirardi — ularning birortasi ham haqiqiy emas edi va
     "TATU ni ochib ber" desa mos kelmasdi. Endi manba bitta va haqiqiy:
     `config/institutions.ts` (kuzatuvdagi obyektlar). */

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    return () => {
      recorderRef.current?.dispose();
      requestAbortRef.current?.abort();
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  function getRecorder(): VoiceRecorder {
    if (!recorderRef.current) recorderRef.current = new VoiceRecorder();
    return recorderRef.current;
  }

  function scheduleReset(ms: number) {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => dispatch({ type: "RESET" }), ms);
  }

  /** Store'dan har chaqiruvda yangi qiymatlar bilan executor bog'lamlari. */
  function buildDeps(): ExecutorDeps {
    const s = useAppStore.getState();
    return {
      activePage: s.activePage,
      selectedTeknikum: s.selectedTeknikum,
      texnikums: INSTITUTIONS,
      regions: VOICE_REGIONS,
      setActivePage: s.setActivePage,
      setSelectedTeknikum: s.setSelectedTeknikum,
      setVoiceRegionTarget: s.setVoiceRegionTarget,
      setVoiceMapAction: s.setVoiceMapAction,
      setVoiceCameraCommand: s.setVoiceCameraCommand,
      setVoiceEventFilter: s.setVoiceEventFilter,
      setVoicePersonSearch: s.setVoicePersonSearch,
    };
  }

  function record(entry: VoiceHistoryEntry) {
    setHistory(pushHistory(entry));
  }

  function runPrediction(transcript: string, prediction: IntentPrediction) {
    const res = executeIntent(prediction, buildDeps());
    dispatch({ type: "EXECUTED", feedback: res.message, confidence: prediction.confidence });
    void speakResponse(res.message);
    record({
      transcript,
      intentId: prediction.id,
      label: prediction.command.title,
      confidence: prediction.confidence,
      success: res.ok,
      at: Date.now(),
    });
    scheduleReset(3500);
  }

  /** Ismga o'xshash kiritishda takliflar uchun shaxslarni tez qidirib olamiz. */
  async function fetchPersonSuggestions(query: string): Promise<{ full_name: string; person_type: string }[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    try {
      const res = await api.listPersons({ search: q, page_size: 4 });
      return res.items.map((p) => ({ full_name: p.full_name, person_type: p.person_type }));
    } catch {
      return [];
    }
  }

  /** STT natijasidan keyingi butun aqlli quvur (replay ham shu yerdan foydalanadi). */
  async function processTranscript(text: string) {
    dispatch({ type: "RECOGNIZED", text });
    const normalized = normalizeTranscript(text);
    const entities = extractEntities(normalized);
    const predictions = predictIntents(normalized, entities);
    const top = predictions[0];

    if (top && top.confidence >= EXECUTE_THRESHOLD && !top.incomplete) {
      runPrediction(text, top);
      return;
    }

    // Ishonch past yoki buyruq to'liqsiz — takliflar
    const nameQuery = entities.personName ?? tokens(normalized).slice(0, 2).join(" ");
    const persons = await fetchPersonSuggestions(nameQuery);
    const suggestions = buildSuggestions(normalized, entities, predictions, {
      teknikums: INSTITUTIONS,
      persons,
    });

    if (suggestions.length === 0) {
      dispatch({ type: "EXECUTED", feedback: "Buyruq tushunilmadi.", confidence: top?.confidence ?? 0 });
      record({ transcript: text, intentId: null, label: "Tushunilmadi", confidence: top?.confidence ?? 0, success: false, at: Date.now() });
      scheduleReset(3500);
      return;
    }

    dispatch({ type: "SUGGEST", suggestions });
  }

  async function stopListening() {
    if (statusRef.current !== "listening") return;
    dispatch({ type: "LISTEN_STOP" });

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;

    try {
      const blob = await getRecorder().stop();
      if (!blob) throw new Error(VOICE_ERROR.emptyResult);
      const text = await voiceApi.speechToText(blob, controller.signal);
      await processTranscript(text);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : VOICE_ERROR.serviceOffline;
      dispatch({ type: "ERROR", message });
      scheduleReset(3500);
    }
  }

  function startListening() {
    const s = statusRef.current;
    if (s === "listening" || s === "recognizing" || s === "executing") return;
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    dispatch({ type: "LISTEN_START" });
    getRecorder()
      .start()
      .catch((err: unknown) => {
        const message =
          err instanceof InsecureContextError
            ? VOICE_ERROR.insecureContext
            : err instanceof MicPermissionDeniedError
              ? VOICE_ERROR.micDenied
              : VOICE_ERROR.serviceOffline;
        dispatch({ type: "ERROR", message });
        scheduleReset(3500);
      });
  }

  function cancelListening() {
    if (statusRef.current !== "listening") return;
    getRecorder().cancel();
    dispatch({ type: "RESET" });
  }

  function chooseSuggestion(s: VoiceSuggestion) {
    runPrediction(state.recognizedText || s.label, s.prediction);
  }

  function replay(entry: VoiceHistoryEntry) {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    void processTranscript(entry.transcript);
  }

  function clearHistory() {
    clearHistoryStore();
    setHistory([]);
  }

  const value: VoiceContextValue = {
    ...state,
    history,
    startListening,
    stopListening,
    cancelListening,
    chooseSuggestion,
    replay,
    clearHistory,
  };
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}
