export interface ReplicationResult {
  html: string;
  css: string;
  explanation: string;
  detectedImages: Array<{
    description: string;
    coordinates?: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
    dataUrl?: string;
  }>;
  detectedCharts?: Array<{
    type: "bar" | "line" | "pie" | "area";
    title: string;
    description: string;
    data: Array<Record<string, unknown>>;
    coordinates: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
  }>;
}

/** Active AI provider — read from env (set by vite.config.ts at build time) */
const ACTIVE_PROVIDER: string =
  (process.env.AI_PROVIDER ?? "mimo").trim() || "mimo";

// Legacy MiMo constants kept for backward compatibility
const DEFAULT_BASE = "https://token-plan-cn.xiaomimimo.com/v1";
const ALT_PUBLIC_MIMO_BASE = "https://token-plan-cn.xiaomimimo.com/v1";

function extractUpstreamErrorDetail(rawBody: string): string {
  const t = rawBody.trim();
  if (!t) {
    return "(empty body — wrong gateway or model route; set AI_API_BASE_URL in .env.local or check the provider console)";
  }
  try {
    const j = JSON.parse(t) as {
      error?: string | { message?: string; code?: string; type?: string };
      message?: string;
    };
    if (typeof j.error === "string" && j.error.length) return j.error;
    if (j.error && typeof j.error === "object") {
      const parts = [j.error.message, j.error.code, j.error.type].filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      );
      if (parts.length) return parts.join(" · ");
    }
    if (typeof j.message === "string" && j.message.length) return j.message;
    return t.slice(0, 600);
  } catch {
    return t.slice(0, 600);
  }
}

export type SceneCategory =
  | "portrait"
  | "scenery"
  | "animal"
  | "object"
  | "abstract"
  | "other";

export interface ImageSceneClassification {
  category: SceneCategory;
  labelZh: string;
  brief: string;
}

function getMimoConfig() {
  const baseUrl = (
    (process.env.AI_API_BASE_URL ?? "").trim() ||
    (process.env.MIMO_API_BASE_URL ?? "").trim() ||
    DEFAULT_BASE
  ).replace(/\/$/, "");
  const explicitVisionBase = (process.env.MIMO_VISION_BASE_URL ?? "").trim();
  const visionBaseUrl = (
    explicitVisionBase ||
    (baseUrl.includes("token-plan-cn") ? DEFAULT_BASE : baseUrl)
  ).replace(/\/$/, "");
  const modelText =
    (process.env.AI_MODEL_TEXT ?? "").trim() ||
    (process.env.MIMO_MODEL_TEXT ?? "").trim() ||
    "mimo-v2.5";
  const modelVision =
    (process.env.AI_MODEL_VISION ?? "").trim() ||
    (process.env.MIMO_MODEL_VISION ?? "").trim() ||
    "mimo-v2.5";
  return { baseUrl, visionBaseUrl, modelText, modelVision };
}

/** Static default models per provider (avoids circular import) */
const PROVIDER_DEFAULTS: Record<string, { text: string; vision: string }> = {
  openai: { text: "gpt-4o", vision: "gpt-4o" },
  anthropic: {
    text: "claude-3-5-sonnet-20241022",
    vision: "claude-3-5-sonnet-20241022",
  },
  google: { text: "gemini-2.0-flash", vision: "gemini-2.0-flash" },
  deepseek: { text: "deepseek-chat", vision: "deepseek-vision" },
  qwen: { text: "qwen-turbo-latest", vision: "qwen-vl-max-latest" },
  zhipu: { text: "glm-4-flash", vision: "glm-4v-plus" },
  groq: {
    text: "llama-3.3-70b-versatile",
    vision: "meta-llama/llama-4-scout-17b-16e-instruct",
  },
  mimo: { text: "mimo-v2.5", vision: "mimo-v2.5" },
  custom: { text: "custom-model", vision: "custom-model" },
};

/** Get active provider + model names from env */
function getAIConfig() {
  const provider = ACTIVE_PROVIDER;
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.mimo;

  // Legacy MiMo overrides take priority for 'mimo' provider
  if (provider === "mimo") {
    const mimoConfig = getMimoConfig();
    return {
      provider,
      modelText:
        (process.env.AI_MODEL_TEXT ?? "").trim() || mimoConfig.modelText,
      modelVision:
        (process.env.AI_MODEL_VISION ?? "").trim() || mimoConfig.modelVision,
    };
  }

  return {
    provider,
    modelText: (process.env.AI_MODEL_TEXT ?? "").trim() || defaults.text,
    modelVision: (process.env.AI_MODEL_VISION ?? "").trim() || defaults.vision,
  };
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function isVisionRoutingFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("image input") ||
    m.includes("no endpoints found") ||
    (m.includes("404") && m.includes("mimo api"))
  );
}

async function chatCompletion(params: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  /** Override provider (defaults to ACTIVE_PROVIDER from env). */
  provider?: string;
  /** Kept for backward-compat — ignored when provider is not 'mimo'. */
  baseUrl?: string;
  maxCompletionTokens?: number;
}): Promise<string> {
  const provider = params.provider ?? ACTIVE_PROVIDER;

  const res = await fetch("/api/ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      _provider: provider,
      // Legacy field for backward compat when provider=mimo and custom base is needed
      ...(provider === "mimo" && params.baseUrl
        ? { _mimoBaseUrl: params.baseUrl }
        : {}),
      model: params.model,
      messages: params.messages,
      max_completion_tokens: params.maxCompletionTokens ?? 8192,
      temperature: 0.7,
      top_p: 0.95,
      stream: false,
    }),
  });

  const rawBody = await res.text();

  if (!res.ok) {
    const detail = extractUpstreamErrorDetail(rawBody);
    if (res.status === 401 || res.status === 403) {
      const err = new Error(`AI API ${res.status}: ${detail}`);
      (err as Error & { authFailure?: boolean }).authFailure = true;
      throw err;
    }
    throw new Error(`AI API ${res.status}: ${detail}`);
  }

  let data: { choices?: Array<{ message?: { content?: unknown } }> };
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  const text = messageContentToString(data.choices?.[0]?.message?.content);
  if (!text.trim()) {
    const model = (data as Record<string, unknown>).model ?? params.model;
    const choice = data.choices?.[0] as Record<string, unknown> | undefined;
    const finishReason = choice?.finish_reason ?? "unknown";
    throw new Error(
      `AI returned an empty response (model=${model}, finish_reason=${finishReason}). ` +
        `Check that your API key has access to this model and the base URL is correct.`,
    );
  }
  return text;
}

/**
 * Streaming variant: calls `/api/ai/chat/completions/stream`, reads the SSE
 * response chunk-by-chunk, extracts `delta.content` from each event, and
 * returns the fully accumulated text. Calls `onChunk` for every incremental piece.
 */
async function streamChatCompletion(params: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  provider?: string;
  /** Backward compat: custom mimo base URL */
  baseUrl?: string;
  maxCompletionTokens?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}): Promise<string> {
  const provider = params.provider ?? ACTIVE_PROVIDER;

  const res = await fetch("/api/ai/chat/completions/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      _provider: provider,
      ...(provider === "mimo" && params.baseUrl
        ? { _mimoBaseUrl: params.baseUrl }
        : {}),
      model: params.model,
      messages: params.messages,
      max_completion_tokens: params.maxCompletionTokens ?? 8192,
      temperature: 0.7,
      top_p: 0.95,
      stream: true, // Required for OpenAI-compatible streaming endpoints
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const rawBody = await res.text();
    const detail = extractUpstreamErrorDetail(rawBody);
    const err = new Error(`AI API ${res.status}: ${detail}`);
    if (res.status === 401 || res.status === 403) {
      (err as Error & { authFailure?: boolean }).authFailure = true;
    }
    throw err;
  }

  if (!res.body) {
    throw new Error("No response body from streaming endpoint.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            accumulated += content;
            params.onChunk?.(content);
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }

    // Process any remaining content in buffer after loop
    if (buffer.trim().startsWith("data:")) {
      const data = buffer.trim().slice(5).trim();
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            accumulated += content;
            params.onChunk?.(content);
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Process any remaining content in buffer after loop
  if (buffer.trim().startsWith("data:")) {
    const data = buffer.trim().slice(5).trim();
    if (data !== "[DONE]") {
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const content = parsed.choices?.[0]?.delta?.content ?? "";
        if (content) {
          accumulated += content;
          params.onChunk?.(content);
        }
      } catch {
        // Ignore malformed SSE chunks
      }
    }
  }

  if (!accumulated.trim()) {
    throw new Error("MiMo returned an empty streaming response.");
  }
  return accumulated;
}

function parseReplicationJson(text: string): ReplicationResult {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as Partial<ReplicationResult>;
    return normalizeReplicationResult(parsed);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch =
      trimmed.match(/```json\s*\n([\s\S]*?)\n\s*```/) ||
      trimmed.match(/```\s*json\s*\n([\s\S]*?)\n\s*```/) ||
      trimmed.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch?.[1]) {
      try {
        const parsed = JSON.parse(
          jsonMatch[1].trim(),
        ) as Partial<ReplicationResult>;
        return normalizeReplicationResult(parsed);
      } catch (e) {
        console.error("Failed to parse extracted JSON:", e);
        throw new Error("Failed to parse extracted JSON from MiMo response.");
      }
    }
    // If no JSON found, try to extract key-value pairs from the text
    const result: Partial<ReplicationResult> = {};
    const htmlMatch = trimmed.match(/html:\s*"([\s\S]*?)"/);
    const cssMatch = trimmed.match(/css:\s*"([\s\S]*?)"/);
    const explanationMatch = trimmed.match(/explanation:\s*"([\s\S]*?)"/);

    if (htmlMatch) result.html = htmlMatch[1];
    if (cssMatch) result.css = cssMatch[1];
    if (explanationMatch) result.explanation = explanationMatch[1];

    if (result.html || result.css || result.explanation) {
      return normalizeReplicationResult(result);
    }

    throw new Error("Failed to parse layout replication data.");
  }
}

function normalizeReplicationResult(
  parsed: Partial<ReplicationResult>,
): ReplicationResult {
  return {
    html: parsed.html ?? "",
    css: parsed.css ?? "",
    explanation: parsed.explanation ?? "",
    detectedImages: Array.isArray(parsed.detectedImages)
      ? parsed.detectedImages
      : [],
    detectedCharts: Array.isArray(parsed.detectedCharts)
      ? parsed.detectedCharts
      : undefined,
  };
}

export async function replicateFromUrl(
  _url: string,
): Promise<ReplicationResult> {
  throw new Error("replicateFromUrl is not implemented yet.");
  // TODO: Implement URL-based layout replication
  // return {
  //   html: "",
  //   explanation: "",
  //   css: "",
  //   detectedImages: [],
  //   detectedCharts: [],
  // };
}

export async function replicateFromText(
  content: string,
  brandKitContext?: string,
): Promise<ReplicationResult> {
  const { modelText } = getAIConfig();
  const brandKitSection = brandKitContext
    ? `\nBrand Kit Context (apply these brand guidelines to the output):\n${brandKitContext}\n`
    : "";
  const prompt = `
You are an expert Frontend Developer. Based on the following markdown/text description of a website, replicate its layout, style, and content structure using clean HTML and Tailwind CSS.
${brandKitSection}
Content:
${content}

Rules:
1. Use ONLY Tailwind utility classes for styling.
2. Ensure the layout is responsive (mobile markers etc).
3. Use Lucide-React icon names where appropriate in descriptions (e.g., <div aria-label="home icon"></div>).
4. Reply with ONLY a single valid JSON object (no markdown fences, no prose). Shape:
   {"html": string, "css": string, "explanation": string}
`;

  const text = await chatCompletion({
    model: modelText,
    messages: [
      {
        role: "system",
        content:
          "You are MiMo. Output valid JSON only when the user requests structured output.",
      },
      { role: "user", content: prompt },
    ],
  });

  return parseReplicationJson(text);
}

function uniqueVisionAttempts(
  pairs: Array<[string, string]>,
): Array<[string, string]> {
  const seen = new Set<string>();
  return pairs.filter(([b, m]) => {
    const k = `${b}|${m}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function visionChatWithRetries(
  messages: Array<{ role: string; content: unknown }>,
  options?: { maxCompletionTokens?: number },
): Promise<string> {
  const { modelVision } = getAIConfig();

  // For MiMo: try multiple base URLs as some gateways lack vision support.
  // For all other providers: single attempt.
  if (ACTIVE_PROVIDER === "mimo") {
    const { visionBaseUrl, baseUrl } = getMimoConfig();
    const attempts = uniqueVisionAttempts([
      [visionBaseUrl, modelVision],
      [visionBaseUrl, "mimo-v2.5"],
      [DEFAULT_BASE, "mimo-v2.5"],
      [baseUrl, "mimo-v2.5"],
      [ALT_PUBLIC_MIMO_BASE, "mimo-v2.5"],
    ]);
    let lastError: unknown;
    for (const [tryBase, tryModel] of attempts) {
      try {
        return await chatCompletion({
          model: tryModel,
          messages,
          baseUrl: tryBase,
          maxCompletionTokens: options?.maxCompletionTokens ?? 8192,
        });
      } catch (e) {
        lastError = e;
        if ((e as Error & { authFailure?: boolean }).authFailure) throw e;
        if (!isVisionRoutingFailure(e instanceof Error ? e.message : String(e)))
          throw e;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Vision request failed.");
  }

  // Non-MiMo providers: single call, trust the provider supports vision.
  return chatCompletion({
    model: modelVision,
    messages,
    maxCompletionTokens: options?.maxCompletionTokens ?? 8192,
  });
}

const SCENE_KEYS = new Set<string>([
  "portrait",
  "scenery",
  "animal",
  "object",
  "abstract",
  "other",
]);

function parseClassificationJson(text: string): ImageSceneClassification {
  const trimmed = text.trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const jsonMatch =
      trimmed.match(/```json\n([\s\S]*?)\n```/) ||
      trimmed.match(/```\n([\s\S]*?)\n```/);
    if (!jsonMatch?.[1]) {
      throw new Error("Failed to parse scene classification.");
    }
    parsed = JSON.parse(jsonMatch[1].trim()) as Record<string, unknown>;
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

function defaultLabelZh(category: SceneCategory): string {
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

export async function replicateLayout(
  base64Image: string,
  mimeType: string,
  brandKitContext?: string,
  /** Pixel layout analysis description from analyzePixelLayout() */
  pixelLayoutContext?: string,
): Promise<ReplicationResult> {
  try {
    const brandKitSection = brandKitContext
      ? `\nBrand Kit Context (apply these brand guidelines to the replicated layout):\n${brandKitContext}\n`
      : "";
    const pixelSection = pixelLayoutContext ? `\n${pixelLayoutContext}\n` : "";
    const prompt = `
You are an expert Frontend Engineer and Designer.
Analyze the provided screenshot and replicate its layout and content perfectly using modern HTML and Tailwind CSS.
${brandKitSection}${pixelSection}
Requirements:
1. Use clean, semantic HTML5 (e.g., <header>, <main>, <footer>, <section>, <nav>).
2. Use Tailwind CSS utility classes for ALL styling. Do not use custom CSS unless absolutely necessary (if so, include it in the 'css' field).
3. Extract all visible text accurately.
4. Maintain the visual hierarchy, spacing, typography, and color palette of the original.
5. Accessibility:
   - Use appropriate ARIA attributes (e.g., aria-label, aria-hidden) where needed for clarity.
   - Ensure proper heading levels (h1-h6) and document structure.
   - Ensure interactive elements are keyboard accessible (e.g., using <button> for clickable items).
   - Provide descriptive alt text for images.
6. For any images or icons seen in the screenshot:
   - If it's a common icon (like home, menu, user), use a placeholder <div> with an aria-label.
   - For content images, provide a description and normalized coordinates [ymin, xmin, ymax, xmax] (0-1000).
7. For any statistical charts (Bar, Line, Pie, Area) seen in the screenshot:
   - Extract approximate data values/labels. Represent with <div aria-label="[Chart Title]" class="w-full h-64"></div> in html.
   - Add entry to detectedCharts with type, title, description, data, coordinates.
8. FLOWCHARTS / PROCESS DIAGRAMS / ORG CHARTS / MIND MAPS / NODE-LINK DIAGRAMS — CRITICAL RULES:
   - ALWAYS render these using inline SVG. NEVER use HTML divs with position:absolute or position:fixed for diagram nodes.
   - SVG wrapper: <svg viewBox="0 0 800 500" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
   - Define arrowhead: <defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/></marker></defs>
   - Nodes: <rect rx="8"> for rectangles, <ellipse> for ovals, <polygon> for diamond/decision shapes.
   - Edges: <path d="M x1,y1 C cx1,cy1 cx2,cy2 x2,y2" stroke="#64748b" stroke-width="1.5" fill="none" marker-end="url(#arrow)">
   - Labels: <text text-anchor="middle" dominant-baseline="middle"> or <foreignObject> for long text.
   - Map the original visual layout proportionally into SVG coordinates.
   - Match original node colors, border-radius, and font sizes using SVG fill/stroke/font-size attributes.
9. LAYOUT STABILITY — apply to all content:
   - Avoid fixed pixel widths/heights on outer containers; use w-full, max-w-*, min-h-*.
   - If position:absolute is needed for overlays, ensure parent has position:relative and overflow:hidden.
   - For grids/kanban/timelines: use CSS Grid or Flexbox with connecting lines via pseudo-elements in the css field.
10. Reply with ONLY a single valid JSON object (no markdown fences, no prose). Keys: html, css, explanation, detectedImages, detectedCharts. Use [] for empty arrays.

JSON shape:
{
  "html": string,
  "css": string,
  "explanation": string,
  "detectedImages": [{"description": string, "coordinates"?: {"ymin","xmin","ymax","xmax"}}],
  "detectedCharts": [{"type":"bar"|"line"|"pie"|"area","title","description","data":[],"coordinates":{"ymin","xmin","ymax","xmax"}}]
}
`;

    const messages: Array<{ role: string; content: unknown }> = [
      {
        role: "system",
        content:
          "You are MiMo. Follow user instructions exactly. When asked for JSON, output JSON only.",
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
      maxCompletionTokens: 8192,
    });
    return parseReplicationJson(text);
  } catch (error: unknown) {
    console.error("MiMo API Error:", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to replicate the layout.");
  }
}

// ── New exported functions ────────────────────────────────────────────────────

/**
 * Refine an existing HTML/CSS layout via a user instruction.
 * Uses the streaming endpoint and accumulates the full response before parsing.
 *
 * @param html            Current HTML of the layout
 * @param css             Current CSS of the layout
 * @param instruction     What the user wants changed
 * @param chatHistory     Optional prior turns to maintain context
 * @param signal          Optional AbortSignal to cancel the request
 */
export async function refineLayout(
  html: string,
  css: string,
  instruction: string,
  chatHistory?: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
): Promise<ReplicationResult> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const { modelText } = getAIConfig();

  const userMessage =
    `Instruction: ${instruction}\n\n` +
    `Current HTML:\n${html}\n\n` +
    `Current CSS:\n${css}\n\n` +
    `Return ONLY a valid JSON object with keys "html", "css", "explanation". No markdown fences.`;

  const messages: Array<{ role: string; content: unknown }> = [
    {
      role: "system",
      content:
        "You are an expert frontend developer. When given HTML/CSS and an instruction, return a JSON object with the updated html, css, and explanation fields only. No markdown fences. JSON only.",
    },
    ...(chatHistory ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const text = await streamChatCompletion({
    model: modelText,
    messages,
    signal,
    maxCompletionTokens: 8192,
  });

  return parseReplicationJson(text);
}

/**
 * Generate SEO meta-tag data by analysing the provided HTML.
 * Returns a best-effort object; falls back to empty strings on parse failure.
 */
export async function generateSEOData(
  html: string,
  companyName?: string,
  pageTitle?: string,
): Promise<{
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  twitterCard: "summary" | "summary_large_image";
  author?: string;
  robots: string;
}> {
  const { modelText } = getAIConfig();

  const contextLines: string[] = [];
  if (companyName) contextLines.push(`Company Name: ${companyName}`);
  if (pageTitle) contextLines.push(`Page Title: ${pageTitle}`);
  const contextBlock =
    contextLines.length > 0 ? `\n${contextLines.join("\n")}\n` : "";

  const prompt =
    `Analyze this HTML and generate optimal SEO meta tags.${contextBlock}\n` +
    `Return ONLY a JSON object (no markdown):\n` +
    `{"title":"","description":"","keywords":[],"ogTitle":"","ogDescription":"","twitterCard":"summary_large_image","author":"","robots":"index, follow"}\n\n` +
    `HTML:\n${html.slice(0, 8000)}`;

  try {
    const text = await chatCompletion({
      model: modelText,
      messages: [
        { role: "system", content: "You are an SEO expert. Return JSON only." },
        { role: "user", content: prompt },
      ],
      maxCompletionTokens: 512,
    });

    const trimmed = text.trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      const m =
        trimmed.match(/```json\n([\s\S]*?)\n```/) ||
        trimmed.match(/```\n([\s\S]*?)\n```/);
      parsed = m ? (JSON.parse(m[1].trim()) as Record<string, unknown>) : {};
    }

    const tc = String(parsed.twitterCard ?? "summary_large_image");
    return {
      title: String(parsed.title ?? ""),
      description: String(parsed.description ?? ""),
      keywords: Array.isArray(parsed.keywords)
        ? (parsed.keywords as unknown[]).map(String)
        : [],
      ogTitle: String(parsed.ogTitle ?? ""),
      ogDescription: String(parsed.ogDescription ?? ""),
      twitterCard:
        tc === "summary" || tc === "summary_large_image"
          ? tc
          : "summary_large_image",
      author:
        parsed.author && String(parsed.author).trim()
          ? String(parsed.author)
          : undefined,
      robots: String(parsed.robots ?? "index, follow"),
    };
  } catch {
    // Graceful degradation on any failure
    return {
      title: "",
      description: "",
      keywords: [],
      ogTitle: "",
      ogDescription: "",
      twitterCard: "summary_large_image",
      robots: "index, follow",
    };
  }
}

/**
 * Ask the model to identify all dynamic/placeholder text in the HTML that a
 * user would want to customise (company name, hero title, CTA copy, etc.).
 * Returns an empty array on any failure.
 */
export async function detectTemplateVariablesWithAI(html: string): Promise<
  Array<{
    key: string;
    label: string;
    value: string;
    type: string;
    placeholder?: string;
  }>
> {
  const { modelText } = getAIConfig();

  const prompt =
    `Analyze this HTML. Identify text content that should be customizable ` +
    `(company name, tagline, hero title, CTA text, descriptions, contact info, etc.).\n` +
    `Return a JSON array (max 20 items, no markdown):\n` +
    `[{"key":"snake_case_key","label":"Human Label","value":"current text in HTML","type":"text|url|email|textarea|color","placeholder":"hint"}]\n\n` +
    `HTML:\n${html.slice(0, 8000)}`;

  try {
    const text = await chatCompletion({
      model: modelText,
      messages: [
        {
          role: "system",
          content: "You are a frontend developer assistant. Return JSON only.",
        },
        { role: "user", content: prompt },
      ],
      maxCompletionTokens: 2048,
    });

    const trimmed = text.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const m =
        trimmed.match(/```json\n([\s\S]*?)\n```/) ||
        trimmed.match(/```\n([\s\S]*?)\n```/);
      parsed = m ? JSON.parse(m[1].trim()) : [];
    }

    if (!Array.isArray(parsed)) return [];

    return (parsed as Array<Record<string, unknown>>)
      .slice(0, 20)
      .map((item) => ({
        key: String(item.key ?? ""),
        label: String(item.label ?? ""),
        value: String(item.value ?? ""),
        type: String(item.type ?? "text"),
        placeholder:
          item.placeholder !== undefined ? String(item.placeholder) : undefined,
      }))
      .filter((item) => Boolean(item.key) && Boolean(item.label));
  } catch {
    return [];
  }
}

/**
 * Split the provided HTML into named, reusable UI components.
 * Returns up to 8 components. Returns an empty array on any failure.
 */
export async function extractComponents(
  html: string,
  css?: string,
): Promise<Array<{ name: string; description: string; html: string }>> {
  const { modelText } = getAIConfig();

  const cssBlock = css ? `\nCSS:\n${css.slice(0, 2000)}` : "";
  const prompt =
    `Split the following HTML into semantic, reusable UI components ` +
    `(Navbar, Hero, Features, Testimonials, Footer, etc.). ` +
    `For each, extract the relevant HTML snippet.\n` +
    `Return a JSON array (max 8 components, no markdown):\n` +
    `[{"name":"ComponentName","description":"Brief desc","html":"<snippet>"}]\n\n` +
    `HTML:\n${html.slice(0, 8000)}${cssBlock}`;

  try {
    const text = await chatCompletion({
      model: modelText,
      messages: [
        {
          role: "system",
          content: "You are a frontend architect. Return JSON only.",
        },
        { role: "user", content: prompt },
      ],
      maxCompletionTokens: 4096,
    });

    const trimmed = text.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const m =
        trimmed.match(/```json\n([\s\S]*?)\n```/) ||
        trimmed.match(/```\n([\s\S]*?)\n```/);
      parsed = m ? JSON.parse(m[1].trim()) : [];
    }

    if (!Array.isArray(parsed)) return [];

    return (parsed as Array<Record<string, unknown>>)
      .slice(0, 8)
      .map((item) => ({
        name: String(item.name ?? ""),
        description: String(item.description ?? ""),
        html: String(item.html ?? ""),
      }))
      .filter((item) => Boolean(item.name) && Boolean(item.html));
  } catch {
    return [];
  }
}

/**
 * Create a FRESH, ORIGINAL template inspired by a URL's layout skeleton.
 * Does NOT copy real content — uses {{variable}} placeholders and generic
 * creative content. The result has the same structural pattern as the
 * original site but is completely rebranded and customisable.
 *
 * @param skeleton   Layout skeleton description from the server
 * @param brandKitContext  Optional brand kit prompt context
 */
export async function replicateFromSkeleton(
  skeleton: string,
  brandKitContext?: string,
): Promise<ReplicationResult> {
  const { modelText } = getAIConfig();

  const brandSection = brandKitContext
    ? `\n=== BRAND KIT (apply to all generated content) ===\n${brandKitContext}\n=== END BRAND KIT ===\n`
    : "";

  const prompt = `
You are a professional UI/UX designer and frontend engineer.
Create a FRESH, ORIGINAL website template INSPIRED BY the layout structure below.
${brandSection}
=== LAYOUT SKELETON TO REPLICATE ===
${skeleton}
=== END SKELETON ===

CRITICAL RULES:
1. DO NOT copy any real text, brand names, logos, or specific content from any website.
2. Use {{variable_name}} placeholders for ALL customisable text:
   - {{company_name}}, {{hero_title}}, {{hero_subtitle}}, {{cta_primary}}, {{cta_secondary}}
   - {{feature_1_title}}, {{feature_1_desc}}, {{feature_2_title}}, etc.
   - {{section_title}}, {{footer_tagline}}, {{contact_email}}, {{copyright_year}}
3. Match the STRUCTURE exactly: same number of sections, same column counts, same component types.
4. Use Tailwind CSS v4 utility classes for ALL styling.
5. Make it look modern, professional, and polished — not a skeleton or wireframe.
6. Use clean, semantic HTML5 with proper ARIA attributes.
7. For icon placeholders, use <span aria-label="[icon name]" class="...">icon</span>.
8. Ensure fully responsive design (mobile-first).
9. For sections with cards/grid items: generate 3-4 representative placeholder items.
10. DO NOT use position:absolute for layout — use Flexbox/Grid.

Return ONLY a single valid JSON object (no markdown fences):
{"html": string, "css": string, "explanation": string, "detectedImages": [], "detectedCharts": []}
`;

  const text = await chatCompletion({
    model: modelText,
    messages: [
      {
        role: "system",
        content:
          "You are MiMo. You are a professional UI designer creating fresh templates. Return JSON only when asked.",
      },
      { role: "user", content: prompt },
    ],
    maxCompletionTokens: 8192,
  });

  return parseReplicationJson(text);
}
