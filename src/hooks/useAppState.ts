/**
 * Central state machine for the app lifecycle.
 *
 * Replaces 8 individual useState calls with a single useReducer
 * that enforces valid state transitions:
 *   idle → processing → result | error
 *   result | error → idle
 */

import { useReducer, useRef } from "react";
import type { PipelineStep, PipelineStepDef } from "@/components/ProcessingState";
import { URL_PIPELINE_STEPS, IMAGE_PIPELINE_STEPS } from "@/components/ProcessingState";
import type { ReplicationResult, ImageSceneClassification } from "@/services/mimoService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppPhase = "idle" | "processing" | "result" | "error";

export interface AppState {
  phase: AppPhase;
  error: string | null;
  originalImage: string | null;
  result: ReplicationResult | null;
  sceneClassification: ImageSceneClassification | null;
  processingStep: PipelineStep;
  pipelineSteps: PipelineStepDef[];
  pipelineSourceUrl: string | undefined;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type AppAction =
  | { type: "START_IMAGE_PROCESSING" }
  | { type: "START_URL_PROCESSING"; url: string }
  | { type: "SET_PROCESSING_STEP"; step: PipelineStep }
  | {
      type: "SET_RESULT";
      result: ReplicationResult;
      scene?: ImageSceneClassification | null;
    }
  | { type: "SET_ORIGINAL_IMAGE"; image: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET" };

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: AppState = {
  phase: "idle",
  error: null,
  originalImage: null,
  result: null,
  sceneClassification: null,
  processingStep: "capturing-screenshot",
  pipelineSteps: URL_PIPELINE_STEPS,
  pipelineSourceUrl: undefined,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_IMAGE_PROCESSING":
      return {
        ...state,
        phase: "processing",
        error: null,
        sceneClassification: null,
        pipelineSteps: IMAGE_PIPELINE_STEPS,
        pipelineSourceUrl: undefined,
        processingStep: "analyzing-layout",
      };

    case "START_URL_PROCESSING":
      return {
        ...state,
        phase: "processing",
        error: null,
        originalImage: null,
        pipelineSteps: URL_PIPELINE_STEPS,
        pipelineSourceUrl: action.url,
        processingStep: "capturing-screenshot",
      };

    case "SET_PROCESSING_STEP":
      return { ...state, processingStep: action.step };

    case "SET_ORIGINAL_IMAGE":
      return { ...state, originalImage: action.image };

    case "SET_RESULT":
      return {
        ...state,
        phase: "result",
        processingStep: "done",
        result: action.result,
        sceneClassification: action.scene ?? state.sceneClassification,
      };

    case "SET_ERROR":
      return {
        ...state,
        phase: "error",
        error: action.error,
      };

    case "RESET":
      return {
        ...initialState,
        // Preserve user preferences across resets
        pipelineSteps: state.pipelineSteps,
      };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  return {
    state,
    dispatch,
    abortControllerRef,
  } as const;
}
