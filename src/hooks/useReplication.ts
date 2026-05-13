import { useCallback, useRef } from "react";
import { useAppState } from "./useAppState";
import { useAppStore } from "@/stores/appStore";
import {
  replicateLayoutWithStack,
  replicateFromSkeleton,
  classifyImageScene,
  setAIConfigOverride,
} from "@/services/mimoService";
import { analyzePixelLayout } from "@/lib/pixelPaint";
import { prepareImageForVision } from "@/lib/imageUtils";
import type { PipelineStep } from "@/components/ProcessingState";

export function useReplication() {
  const { state, dispatch, abortControllerRef } = useAppState();
  const selectedStack = useAppStore((s) => s.selectedStack);
  const brandKitContext = useAppStore((s) => s.brandKitContext);
  const enableRefinement = useAppStore((s) => s.enableRefinement);
  const generationMode = useAppStore((s) => s.generationMode);

  const initAIConfigFn = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/config");
      if (res.ok) {
        const data = (await res.json()) as {
          activeProvider: string;
          textModel: string | null;
          visionModel: string | null;
        };
        if (data.activeProvider) {
          setAIConfigOverride({
            provider: data.activeProvider,
            modelText: data.textModel || "",
            modelVision: data.visionModel || "",
          });
        }
      }
    } catch {
      // server not ready — use env defaults
    }
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      dispatch({ type: "START_IMAGE_PROCESSING" });
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        dispatch({ type: "SET_ORIGINAL_IMAGE", image: dataUrl });

        try {
          dispatch({ type: "SET_PROCESSING_STEP", step: "preparing-image" });
          const prepared = await prepareImageForVision(dataUrl).catch(() => ({
            base64: dataUrl.split(",")[1],
            mimeType: file.type,
            width: 0,
            height: 0,
          }));

          if (controller.signal.aborted) return;

          dispatch({ type: "SET_PROCESSING_STEP", step: "analyzing-layout" });
          const [pixelAnalysis, scene] = await Promise.allSettled([
            analyzePixelLayout(dataUrl),
            classifyImageScene(prepared.base64, prepared.mimeType),
          ]);

          const pixelLayoutContext =
            pixelAnalysis.status === "fulfilled"
              ? pixelAnalysis.value.description
              : undefined;

          const replicationResult = await replicateLayoutWithStack(
            prepared.base64,
            prepared.mimeType,
            selectedStack,
            brandKitContext,
            pixelLayoutContext,
            undefined,
            {
              enableRefinement,
              generationMode,
              signal: controller.signal,
              onProgress: (step) => {
                dispatch({
                  type: "SET_PROCESSING_STEP",
                  step: step as PipelineStep,
                });
              },
            },
          );

          if (controller.signal.aborted) return;

          if (!replicationResult.html || !replicationResult.html.trim()) {
            throw new Error(
              "AI returned empty HTML. Try again or switch to a different model.",
            );
          }

          dispatch({
            type: "SET_RESULT",
            result: replicationResult,
            scene: scene.status === "fulfilled" ? scene.value : null,
          });
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          console.error(err);
          dispatch({
            type: "SET_ERROR",
            error:
              err instanceof Error
                ? err.message
                : "An unexpected error occurred",
          });
        }
      };
      reader.readAsDataURL(file);
    },
    [dispatch, abortControllerRef, selectedStack, brandKitContext, enableRefinement, generationMode],
  );

  const handleUrlReplicate = useCallback(
    async (urlInput: string) => {
      if (!urlInput) return;
      dispatch({ type: "START_URL_PROCESSING", url: urlInput });
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const pipelineRes = await fetch("/api/pipeline/url-to-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: urlInput,
            stack: selectedStack,
            brandKit: brandKitContext,
            refine: enableRefinement,
          }),
        });
        const pipelineData = await pipelineRes.json();
        if (pipelineData.error) throw new Error(pipelineData.error);

        if (pipelineData.screenshot?.base64) {
          dispatch({
            type: "SET_ORIGINAL_IMAGE",
            image: `data:${pipelineData.screenshot.mimeType};base64,${pipelineData.screenshot.base64}`,
          });
        }

        if (controller.signal.aborted) return;

        let result;
        if (pipelineData.screenshot?.base64) {
          const { base64, mimeType } = pipelineData.screenshot;
          const skeletonContext = pipelineData.skeleton
            ? `\n=== SITE STRUCTURE ANALYSIS ===\n${pipelineData.skeleton}\n=== END STRUCTURE ===\n`
            : "";

          result = await replicateLayoutWithStack(
            base64,
            mimeType,
            selectedStack,
            brandKitContext,
            undefined,
            skeletonContext,
            {
              enableRefinement,
              generationMode,
              signal: controller.signal,
              onProgress: (step) => {
                dispatch({
                  type: "SET_PROCESSING_STEP",
                  step: step as PipelineStep,
                });
              },
            },
          );
        } else if (pipelineData.skeleton) {
          dispatch({ type: "SET_PROCESSING_STEP", step: "generating-code" });
          result = await replicateFromSkeleton(
            pipelineData.skeleton,
            brandKitContext,
            selectedStack,
          );
        } else {
          throw new Error(
            "Could not capture screenshot or extract page structure from the URL.",
          );
        }

        if (controller.signal.aborted) return;

        if (!result.html || !result.html.trim()) {
          throw new Error(
            "AI returned empty HTML. The URL may be too complex or the model may be overloaded.",
          );
        }

        dispatch({ type: "SET_RESULT", result });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        dispatch({
          type: "SET_ERROR",
          error:
            err instanceof Error
              ? err.message
              : "Failed to replicate from URL",
        });
      }
    },
    [dispatch, abortControllerRef, selectedStack, brandKitContext, enableRefinement, generationMode],
  );

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  }, [abortControllerRef, dispatch]);

  const handleReset = useCallback(() => dispatch({ type: "RESET" }), [dispatch]);

  return {
    state,
    dispatch,
    abortControllerRef,
    initAIConfig: initAIConfigFn,
    handleUpload,
    handleUrlReplicate,
    handleCancel,
    handleReset,
  };
}
