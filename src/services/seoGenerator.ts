/**
 * SEO data generation module.
 * Generates SEO meta tags by analyzing HTML content.
 */

import { chatCompletion, getAIConfig } from "./aiClient";
import { extractJsonFromAiResponse } from "./jsonParser";

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

    const parsed = extractJsonFromAiResponse(text) as Record<
      string,
      unknown
    > | null;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Failed to parse SEO data.");
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
