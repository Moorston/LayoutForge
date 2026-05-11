/**
 * Component extraction module.
 * Splits HTML into semantic, reusable UI components.
 */

import { chatCompletion, getAIConfig } from "./aiClient";
import { extractJsonFromAiResponse } from "./jsonParser";

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

    const parsed = extractJsonFromAiResponse(text);

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
