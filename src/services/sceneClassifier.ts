/**
 * Image scene classification module.
 * Classifies images into categories like portrait, scenery, animal, etc.
 */

import type { SceneCategory, ImageSceneClassification } from "./types";
import { extractJsonFromAiResponse } from "./jsonParser";
import {
  chatCompletion,
  isRetryableAiError,
  getAIConfig,
  getMimoConfig,
  DEFAULT_BASE,
  ALT_PUBLIC_MIMO_BASE,
  ACTIVE_PROVIDER,
  uniqueVisionAttempts,
  visionChatWithRetries,
} from "./aiClient";

export const SCENE_KEYS = new Set<string>([
  "portrait",
  "scenery",
  "animal",
  "object",
  "abstract",
  "other",
]);

export function parseClassificationJson(
  text: string,
): ImageSceneClassification {
  const parsed = extractJsonFromAiResponse(text) as Record<
    string,
    unknown
  > | null;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Failed to parse scene classification.");
  }

  const raw = String(parsed.category ?? "other").toLowerCase();
  const category: SceneCategory = SCENE_KEYS.has(raw)
    ? (raw as SceneCategory)
    : "other";

  return {
    category,
    labelZh: String(parsed.labelZh ?? "").trim() || defaultLabelZh(category),
    brief: String(parsed.brief ?? "")
      .trim()
      .slice(0, 80),
  };
}

export function defaultLabelZh(category: SceneCategory): string {
  switch (category) {
    case "portrait":
      return "人像";
    case "scenery":
      return "景象";
    case "animal":
      return "动物";
    case "object":
      return "物体";
    case "abstract":
      return "抽象";
    default:
      return "其他";
  }
}

/** Vision-only: classify image into portrait / scenery / animal / etc. */
export async function classifyImageScene(
  base64Image: string,
  mimeType: string,
): Promise<ImageSceneClassification> {
  const prompt = `Look at the image. Pick exactly ONE main category:
- portrait — human face or body is the clear subject (人像)
- scenery — landscape, cityscape, sky, sea, mountains, buildings as environment (景象)
- animal — animals are the main subject (动物)
- object — food, product, still life, screenshot/UI without dominant person-animal-landscape (物体)
- abstract — patterns, textures, non-representational art (抽象)
- other — none of the above (其他)

Reply with ONLY JSON (no markdown):
{"category":"portrait|scenery|animal|object|abstract|other","labelZh":"2-6 Chinese characters","brief":"short Chinese caption max 24 chars"}`;

  const messages: Array<{ role: string; content: unknown }> = [
    {
      role: "system",
      content:
        "You are MiMo. Answer with compact JSON only when classifying images.",
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

  const text = await visionChatWithRetries(messages, {
    maxCompletionTokens: 320,
  });
  return parseClassificationJson(text);
}
