/**
 * Layout replication service barrel re-export.
 * This file re-exports all functions from the split modules
 * and keeps only the layout replication functions unique to this module.
 *
 * Enhanced with screenshot-to-code inspired pipeline:
 * - Multi-step generation (generate → refine)
 * - Tech stack-aware prompts
 * - URL screenshot capture integration
 */

// Re-export types
export type {
  ReplicationResult,
  DesignTokens,
  SceneCategory,
  ImageSceneClassification,
} from "./types";

// Re-export AI client functions
export {
  ACTIVE_PROVIDER,
  DEFAULT_BASE,
  ALT_PUBLIC_MIMO_BASE,
  extractUpstreamErrorDetail,
  getMimoConfig,
  getAIConfig,
  setAIConfigOverride,
  getAIConfigOverride,
  PROVIDER_DEFAULTS,
  messageContentToString,
  isVisionRoutingFailure,
  isRetryableAiError,
  chatCompletion,
  streamChatCompletion,
  uniqueVisionAttempts,
  visionChatWithRetries,
} from "./aiClient";

// Re-export JSON parsing functions
export {
  fixJsonStringEscapes,
  extractJsonFromAiResponse,
  parseReplicationJson,
  normalizeReplicationResult,
} from "./jsonParser";

// Re-export scene classification functions
export {
  SCENE_KEYS,
  parseClassificationJson,
  defaultLabelZh,
  classifyImageScene,
} from "./sceneClassifier";

// Re-export SEO generation
export { generateSEOData } from "./seoGenerator";

// Re-export template detection
export { detectTemplateVariablesWithAI } from "./templateDetector";

// Re-export vision pipeline
export {
  analyzeImageInDetail,
  replicateWithVisionPipeline,
  type VisionPipelineOptions,
} from "./visionPipeline";

// Re-export component extraction
export { extractComponents } from "./componentExtractor";

// Layout replication functions (unique to this module)
import { getAIConfig, chatCompletion, visionChatWithRetries } from "./aiClient";
import { parseReplicationJson } from "./jsonParser";
import type { ReplicationResult } from "./types";
import type { ExportFormat } from "@/lib/types";
import {
  SYSTEM_PROMPT,
  buildGenerationPrompt,
  buildRefinementPrompt,
  buildSkeletonPrompt,
  buildTextPrompt,
} from "@/lib/prompts";
import {
  replicateWithVisionPipeline,
  type VisionPipelineOptions,
} from "./visionPipeline";

/**
 * Pipeline: URL → Screenshot → AI Generate → (optional) AI Refine
 * The primary URL-to-Code pipeline inspired by screenshot-to-code.
 *
 * Steps:
 * 1. Call /api/pipeline/url-to-code to capture screenshot + extract skeleton
 * 2. If screenshot available → use vision model for pixel-perfect replication
 * 3. If screenshot fails → fallback to skeleton-based generation
 * 4. Optional refinement pass for production-grade quality
 */
export async function replicateFromUrl(
  url: string,
  brandKitContext?: string,
  stack: ExportFormat = "html",
  enableRefinement: boolean = true,
): Promise<ReplicationResult> {
  try {
    // Step 1: Get screenshot and skeleton from server
    const pipelineRes = await fetch("/api/pipeline/url-to-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        stack,
        brandKit: brandKitContext,
        refine: enableRefinement,
      }),
    });
    const pipelineData = await pipelineRes.json();
    if (pipelineData.error) throw new Error(pipelineData.error);

    let result: ReplicationResult;

    // Step 2: Use screenshot + vision model (best quality)
    if (pipelineData.screenshot?.base64) {
      const { base64, mimeType } = pipelineData.screenshot;

      // Build context from skeleton if available
      const skeletonContext = pipelineData.skeleton
        ? `\n=== SITE STRUCTURE ANALYSIS ===\nThe following structural skeleton was extracted from the page:\n${pipelineData.skeleton}\n=== END STRUCTURE ===\nUse this to supplement your visual analysis of the screenshot.`
        : "";

      result = await replicateLayoutWithStack(
        base64,
        mimeType,
        stack,
        brandKitContext,
        undefined,
        skeletonContext,
        { enableRefinement },
      );
    } else if (pipelineData.skeleton) {
      // Fallback: skeleton-based generation
      result = await replicateFromSkeleton(
        pipelineData.skeleton,
        brandKitContext,
        stack,
      );
    } else {
      throw new Error(
        "Could not capture screenshot or extract page structure from the URL.",
      );
    }

    return result;
  } catch (error) {
    console.error("URL replication error:", error);
    throw error;
  }
}

/**
 * Legacy URL replication using fetch-url (backward compatibility).
 * Fetches HTML content, extracts skeleton, generates code.
 */
export async function replicateFromUrlLegacy(
  url: string,
  brandKitContext?: string,
): Promise<ReplicationResult> {
  try {
    const response = await fetch(
      `/api/fetch-url?url=${encodeURIComponent(url)}`,
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const replicationResult = data.skeleton
      ? await replicateFromSkeleton(data.skeleton, brandKitContext)
      : await replicateFromText(data.content, brandKitContext);

    return replicationResult;
  } catch (error) {
    console.error("URL replication error:", error);
    throw error;
  }
}

/**
 * Replicate layout from text description.
 * Uses centralized, production-grade prompts.
 */
export async function replicateFromText(
  content: string,
  brandKitContext?: string,
  stack: ExportFormat = "html",
): Promise<ReplicationResult> {
  const { modelText } = getAIConfig();
  const prompt = buildTextPrompt(stack, content, brandKitContext);

  const text = await chatCompletion({
    model: modelText,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  return parseReplicationJson(text);
}

/**
 * Replicate layout from screenshot image (legacy API — defaults to HTML stack).
 * For stack-aware generation, use `replicateLayoutWithStack`.
 */
export async function replicateLayout(
  base64Image: string,
  mimeType: string,
  brandKitContext?: string,
  pixelLayoutContext?: string,
): Promise<ReplicationResult> {
  return replicateLayoutWithStack(
    base64Image,
    mimeType,
    "html",
    brandKitContext,
    pixelLayoutContext,
  );
}

/**
 * Stack-aware layout replication from screenshot image.
 * Uses the multi-pass vision pipeline for maximum accuracy:
 *   Pass 1: Detailed visual analysis (colors, spacing, typography, content)
 *   Pass 2: Code generation with analysis context (pixel-perfect output)
 *   Pass 3: Optional refinement pass
 *
 * Falls back to single-pass generation if the pipeline fails.
 */
export async function replicateLayoutWithStack(
  base64Image: string,
  mimeType: string,
  stack: ExportFormat = "html",
  brandKitContext?: string,
  pixelLayoutContext?: string,
  extraContext?: string,
  options?: VisionPipelineOptions,
): Promise<ReplicationResult> {
  try {
    return await replicateWithVisionPipeline(
      base64Image,
      mimeType,
      stack,
      brandKitContext,
      pixelLayoutContext,
      extraContext,
      options,
    );
  } catch (error: unknown) {
    console.error("Layout replication error:", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to replicate the layout from the screenshot.");
  }
}

/**
 * Refine an existing layout based on instruction.
 * Uses centralized refinement prompts for consistent, high-quality results.
 */
export async function refineLayout(
  html: string,
  css: string,
  instruction: string,
  chatHistory?: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
  stack: ExportFormat = "html",
): Promise<ReplicationResult> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const { modelText } = getAIConfig();
  const refinementPrompt = buildRefinementPrompt(stack, html, css, instruction);

  const historyBlock = chatHistory
    ? chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")
    : "";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(historyBlock ? [{ role: "user", content: historyBlock }] : []),
    { role: "user", content: refinementPrompt },
  ];

  const text = await chatCompletion({
    model: modelText,
    messages,
    maxCompletionTokens: 8192,
  });
  return parseReplicationJson(text);
}

/**
 * Replicate layout from a skeleton structure.
 * Uses centralized prompts with tech stack support.
 */
export async function replicateFromSkeleton(
  skeleton: string,
  brandKitContext?: string,
  stack: ExportFormat = "html",
): Promise<ReplicationResult> {
  const { modelText } = getAIConfig();
  const prompt = buildSkeletonPrompt(stack, skeleton, brandKitContext);

  const text = await chatCompletion({
    model: modelText,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    maxCompletionTokens: 8192,
  });

  return parseReplicationJson(text);
}
