/**
 * Multi-pass Vision Pipeline for high-fidelity layout replication.
 *
 * Pipeline:
 *   Pass 1: Detailed visual analysis — AI examines every element, color, spacing
 *   Pass 2: Code generation with analysis context — AI generates pixel-perfect code
 *   Pass 3: (Optional) Refinement pass — AI polishes the output
 *
 * This approach significantly improves replication accuracy compared to single-pass
 * generation because the model first builds a detailed mental model of the page,
 * then uses that model as explicit guidance when generating code.
 */

import {
  getAIConfig,
  chatCompletion,
  visionChatWithRetries,
  streamChatCompletion,
} from "./aiClient";
import { parseReplicationJson } from "./jsonParser";
import type { ReplicationResult } from "./types";
import type { ExportFormat } from "@/lib/types";
import {
  SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildGenerationWithAnalysisPrompt,
  buildGenerationPrompt,
  buildRefinementPrompt,
  buildStyleTemplatePrompt,
} from "@/lib/prompts";

// ─── Pass 1: Detailed Visual Analysis ─────────────────────────────────────────

/**
 * Analyze the image in extreme detail.
 * The Vision LLM examines every element, extracting exact colors, spacing,
 * typography, text content, and component structure.
 *
 * Returns a detailed text description that will be injected into the
 * generation prompt as explicit context.
 */
export async function analyzeImageInDetail(
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const { modelVision } = getAIConfig();
  const prompt = buildAnalysisPrompt();

  const messages: Array<{ role: string; content: unknown }> = [
    {
      role: "system",
      content:
        "You are an expert visual analyst specializing in web UI/UX design. " +
        "You analyze screenshots with extreme precision, identifying every element, " +
        "color (exact hex values), spacing (exact px values), and typography detail. " +
        "Output a structured, exhaustive text description only. No code generation.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];

  return visionChatWithRetries(messages, {
    maxCompletionTokens: 4096,
  });
}

// ─── Pass 2: Code Generation ──────────────────────────────────────────────────

/**
 * Generate code from the detailed analysis (non-streaming).
 * Uses both the analysis text and the original image for maximum accuracy.
 */
export async function generateCodeFromAnalysis(
  analysis: string,
  base64Image: string,
  mimeType: string,
  stack: ExportFormat,
  brandKitContext?: string,
  extraContext?: string,
): Promise<ReplicationResult> {
  const prompt = buildGenerationWithAnalysisPrompt(
    stack,
    analysis,
    brandKitContext,
    extraContext,
  );

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];

  const text = await visionChatWithRetries(messages, {
    maxCompletionTokens: 16384,
  });
  return parseReplicationJson(text);
}

/**
 * Generate code from the detailed analysis (streaming).
 * Calls onChunk for each incremental piece of the response.
 */
export async function generateCodeFromAnalysisStreaming(
  analysis: string,
  base64Image: string,
  mimeType: string,
  stack: ExportFormat,
  brandKitContext?: string,
  extraContext?: string,
  onChunk?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<ReplicationResult> {
  const { provider, modelVision } = getAIConfig();
  const prompt = buildGenerationWithAnalysisPrompt(
    stack,
    analysis,
    brandKitContext,
    extraContext,
  );

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];

  const text = await streamChatCompletion({
    model: modelVision,
    messages,
    provider,
    maxCompletionTokens: 16384,
    signal,
    onChunk,
  });
  return parseReplicationJson(text);
}

// ─── Pass 3: Refinement ───────────────────────────────────────────────────────

/**
 * Refine generated code using the original analysis as comparison reference.
 */
async function refineWithAnalysis(
  html: string,
  css: string,
  originalAnalysis: string,
  stack: ExportFormat,
): Promise<ReplicationResult> {
  const { modelText } = getAIConfig();
  const prompt = buildRefinementPrompt(stack, html, css, originalAnalysis);

  const text = await chatCompletion({
    model: modelText,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    maxCompletionTokens: 16384,
  });
  return parseReplicationJson(text);
}

// ─── Style Template Generation (Analysis → Template) ────────────────────────

/**
 * Generate a reusable style template from the detailed analysis.
 * Uses the analysis text + original image to extract design language
 * and generate an editable template with CSS custom properties.
 */
export async function generateStyleTemplate(
  analysis: string,
  base64Image: string,
  mimeType: string,
  stack: ExportFormat,
  brandKitContext?: string,
  extraContext?: string,
): Promise<ReplicationResult> {
  const prompt = buildStyleTemplatePrompt(
    stack,
    analysis,
    brandKitContext,
    extraContext,
  );

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];

  const text = await visionChatWithRetries(messages, {
    maxCompletionTokens: 16384,
  });
  const result = parseReplicationJson(text);
  result.isTemplate = true;
  return result;
}

/**
 * Generate a reusable style template (streaming).
 */
export async function generateStyleTemplateStreaming(
  analysis: string,
  base64Image: string,
  mimeType: string,
  stack: ExportFormat,
  brandKitContext?: string,
  extraContext?: string,
  onChunk?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<ReplicationResult> {
  const { provider, modelVision } = getAIConfig();
  const prompt = buildStyleTemplatePrompt(
    stack,
    analysis,
    brandKitContext,
    extraContext,
  );

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];

  const text = await streamChatCompletion({
    model: modelVision,
    messages,
    provider,
    maxCompletionTokens: 16384,
    signal,
    onChunk,
  });
  const result = parseReplicationJson(text);
  result.isTemplate = true;
  return result;
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

export interface VisionPipelineOptions {
  /** Enable the refinement pass (default: true) */
  enableRefinement?: boolean;
  /** Generation mode: 'replicate' for pixel-perfect copy, 'template' for reusable style template */
  generationMode?: "replicate" | "template";
  /** Callback for pipeline progress updates */
  onProgress?: (step: string) => void;
  /** Callback for streaming code generation chunks */
  onChunk?: (chunk: string) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Full multi-pass vision pipeline: Image → Analysis → Code → (Optional) Refine
 *
 * This is the primary entry point for high-fidelity layout replication.
 * The two-pass approach (analyze first, then generate) produces significantly
 * more accurate results than single-pass generation because:
 * 1. The model must explicitly identify every element before generating code
 * 2. The detailed analysis serves as a "blueprint" for code generation
 * 3. Specific hex colors and px spacing are extracted and referenced directly
 */
export async function replicateWithVisionPipeline(
  base64Image: string,
  mimeType: string,
  stack: ExportFormat = "html",
  brandKitContext?: string,
  pixelLayoutContext?: string,
  extraContext?: string,
  options?: VisionPipelineOptions,
): Promise<ReplicationResult> {
  const {
    enableRefinement = false,
    generationMode = "replicate",
    onProgress,
    onChunk,
    signal,
  } = options ?? {};

  // ── Pass 1: Detailed Visual Analysis ────────────────────────────────────
  onProgress?.("visual-analysis");

  let analysis: string;
  try {
    analysis = await analyzeImageInDetail(base64Image, mimeType);
  } catch (e) {
    // If analysis fails, fall back to single-pass generation
    console.warn(
      "[visionPipeline] Analysis pass failed, falling back to single-pass:",
      e,
    );
    onProgress?.("generating-code");
    return fallbackSinglePass(
      base64Image,
      mimeType,
      stack,
      brandKitContext,
      pixelLayoutContext,
      extraContext,
    );
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // Merge pixel layout context (quantitative) with AI analysis (qualitative)
  const fullContext = [
    pixelLayoutContext
      ? `\n=== PIXEL LAYOUT ANALYSIS ===\n${pixelLayoutContext}\n=== END PIXEL LAYOUT ANALYSIS ===\n`
      : "",
    `\n=== DETAILED VISUAL ANALYSIS ===\n${analysis}\n=== END DETAILED VISUAL ANALYSIS ===\n`,
  ].join("");

  // ── Pass 2: Code Generation (or Template Generation) ───────────────────
  onProgress?.("generating-code");

  let result: ReplicationResult;
  try {
    if (generationMode === "template") {
      // Template mode: generate reusable style template
      if (onChunk) {
        result = await generateStyleTemplateStreaming(
          fullContext,
          base64Image,
          mimeType,
          stack,
          brandKitContext,
          extraContext,
          onChunk,
          signal,
        );
      } else {
        result = await generateStyleTemplate(
          fullContext,
          base64Image,
          mimeType,
          stack,
          brandKitContext,
          extraContext,
        );
      }
    } else if (onChunk) {
      // Replicate mode: pixel-perfect replication
      result = await generateCodeFromAnalysisStreaming(
        fullContext,
        base64Image,
        mimeType,
        stack,
        brandKitContext,
        extraContext,
        onChunk,
        signal,
      );
    } else {
      result = await generateCodeFromAnalysis(
        fullContext,
        base64Image,
        mimeType,
        stack,
        brandKitContext,
        extraContext,
      );
    }
  } catch (e) {
    // If generation with analysis fails, try single-pass as fallback
    console.warn(
      "[visionPipeline] Analysis-aware generation failed, trying single-pass:",
      e,
    );
    result = await fallbackSinglePass(
      base64Image,
      mimeType,
      stack,
      brandKitContext,
      pixelLayoutContext,
      extraContext,
    );
  }

  // If the result has empty HTML, try single-pass as last resort
  if (!result.html || !result.html.trim()) {
    console.warn(
      "[visionPipeline] Generated HTML is empty, trying single-pass fallback.",
    );
    result = await fallbackSinglePass(
      base64Image,
      mimeType,
      stack,
      brandKitContext,
      pixelLayoutContext,
      extraContext,
    );
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // ── Pass 3: Optional Refinement ─────────────────────────────────────────
  if (enableRefinement && result.html) {
    onProgress?.("refining");
    try {
      result = await refineWithAnalysis(
        result.html,
        result.css,
        analysis,
        stack,
      );
    } catch (refineErr) {
      console.warn("[visionPipeline] Refinement pass failed:", refineErr);
    }
  }

  return result;
}

// ─── Fallback: Single-pass generation ─────────────────────────────────────────

/**
 * Single-pass generation fallback (legacy behavior).
 * Used when the multi-pass pipeline fails.
 */
async function fallbackSinglePass(
  base64Image: string,
  mimeType: string,
  stack: ExportFormat,
  brandKitContext?: string,
  pixelLayoutContext?: string,
  extraContext?: string,
): Promise<ReplicationResult> {
  const prompt = buildGenerationPrompt(
    stack,
    brandKitContext,
    pixelLayoutContext,
    extraContext,
  );

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];

  const text = await visionChatWithRetries(messages, {
    maxCompletionTokens: 16384,
  });
  return parseReplicationJson(text);
}
