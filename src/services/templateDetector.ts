/**
 * Template variable detection module.
 * Identifies customizable text in HTML that users would want to modify.
 */

import { chatCompletion, getAIConfig } from "./aiClient";
import { extractJsonFromAiResponse } from "./jsonParser";

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

    const parsed = extractJsonFromAiResponse(text);

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
