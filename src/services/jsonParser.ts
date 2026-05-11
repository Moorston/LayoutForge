/**
 * JSON parsing utilities for AI-generated responses.
 * These are pure utility functions with no AI dependencies.
 */

import type { ReplicationResult } from "./types";

/**
 * Repair unescaped double quotes inside JSON string values.
 * Walks through the text character-by-character tracking JSON string state.
 * When a `"` is found inside a JSON string but is NOT followed by a JSON
 * structural character (, } ] : or whitespace+structural), it is escaped.
 */
export function fixJsonStringEscapes(json: string): string {
  const out: string[] = [];
  let inStr = false;
  let i = 0;
  while (i < json.length) {
    const ch = json[i];
    // Pass through escaped characters verbatim
    if (ch === "\\" && inStr && i + 1 < json.length) {
      out.push("\\", json[i + 1]);
      i += 2;
      continue;
    }
    if (ch === '\"') {
      if (inStr) {
        // Peek ahead past whitespace to decide if this closes the string
        let j = i + 1;
        while (j < json.length && /\s/.test(json[j])) j++;
        const next = json[j] || "";
        if (next === "," || next === "}" || next === "]" || next === ":") {
          // Structural char → legitimate end-of-string quote
          inStr = false;
          out.push('\"');
        } else {
          // Not structural → unescaped quote inside the string → escape it
          out.push("\\", '\"');
        }
      } else {
        // Opening quote of a new string
        inStr = true;
        out.push('\"');
      }
    } else {
      out.push(ch);
    }
    i++;
  }
  return out.join("");
}

/**
 * Extract a JSON object or array from AI-generated text.
 * Handles: raw JSON, ```json fenced blocks, ``` fenced blocks, and
 * text with embedded JSON objects. Also repairs unescaped quotes in
 * JSON string values (a very common AI output issue).
 */
export function extractJsonFromAiResponse(text: string): unknown | null {
  const trimmed = text.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }

  // 2. Try code-fence extraction.
  //    Use indexOf for open fence, lastIndexOf for close fence.
  //    If no close fence found (truncated response), use remainder.
  const fenceOpen = trimmed.indexOf("```");
  if (fenceOpen !== -1) {
    let contentStart = fenceOpen + 3;
    while (
      contentStart < trimmed.length &&
      trimmed[contentStart] !== "\n" &&
      trimmed[contentStart] !== "\r"
    ) {
      contentStart++;
    }
    while (
      contentStart < trimmed.length &&
      (trimmed[contentStart] === "\n" ||
        trimmed[contentStart] === "\r" ||
        trimmed[contentStart] === " ")
    ) {
      contentStart++;
    }
    // Use lastIndexOf for closing fence — but if it points before contentStart
    // (or returns the open fence position), the response is likely truncated.
    let fenceClose = trimmed.lastIndexOf("```");
    if (fenceClose <= contentStart) {
      fenceClose = trimmed.length; // truncated: use everything
    }
    const content = trimmed.slice(contentStart, fenceClose).trimEnd();
    // Try raw parse
    try {
      return JSON.parse(content);
    } catch {
      /* continue */
    }
    // Try repair + parse
    try {
      return JSON.parse(fixJsonStringEscapes(content));
    } catch {
      /* fall through to brace matching */
    }
  }

  // 3. Brace-matching with repair
  //    First repair the whole text, then find balanced {…} or […]
  const repaired = fixJsonStringEscapes(trimmed);
  for (const openChar of ["{", "["]) {
    const startIdx = repaired.indexOf(openChar);
    if (startIdx === -1) continue;
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    let inStr2 = false;
    let esc = false;
    for (let i = startIdx; i < repaired.length; i++) {
      const c = repaired[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '\"') {
        inStr2 = !inStr2;
        continue;
      }
      if (inStr2) continue;
      if (c === openChar) depth++;
      if (c === closeChar) depth--;
      if (depth === 0) {
        try {
          return JSON.parse(repaired.slice(startIdx, i + 1));
        } catch {
          break;
        }
      }
    }
  }

  return null;
}

/**
 * Extract partial result from truncated or malformed JSON responses.
 *
 * When the AI response is truncated (token limit), the JSON is incomplete
 * and can't be parsed normally. This function tries to salvage what it can
 * by directly extracting the "html" and "css" values using a state machine
 * that handles unescaped quotes (common in HTML content).
 */
function extractPartialResult(text: string): Partial<ReplicationResult> {
  const result: Partial<ReplicationResult> = {};

  // Try to extract each field using a state-machine string extractor
  for (const key of ["html", "css", "explanation"]) {
    const value = extractJsonStringValue(text, key);
    if (value !== null) {
      (result as Record<string, string>)[key] = value;
    }
  }

  return result;
}

/**
 * Extract a string value from a (potentially malformed) JSON text.
 * Handles unescaped quotes inside string values (very common in HTML)
 * and truncated responses where the closing quote is missing.
 *
 * Strategy: find the key, then use a character-by-character state machine
 * to extract the string value, properly handling escape sequences.
 */
function extractJsonStringValue(text: string, key: string): string | null {
  // Find the key pattern: "key": "
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`);
  const keyMatch = keyPattern.exec(text);
  if (!keyMatch) return null;

  const startIdx = keyMatch.index + keyMatch[0].length;
  let result = "";
  let i = startIdx;
  let escaped = false;

  while (i < text.length) {
    const ch = text[i];

    if (escaped) {
      // Handle escape sequences
      switch (ch) {
        case '"':
          result += '"';
          break;
        case "\\":
          result += "\\";
          break;
        case "n":
          result += "\n";
          break;
        case "t":
          result += "\t";
          break;
        case "r":
          result += "\r";
          break;
        case "/":
          result += "/";
          break;
        case "u":
          // Unicode escape: \uXXXX
          const hex = text.slice(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            result += String.fromCharCode(parseInt(hex, 16));
            i += 4;
          } else {
            result += "\\u";
          }
          break;
        default:
          result += "\\" + ch;
          break;
      }
      escaped = false;
      i++;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      i++;
      continue;
    }

    if (ch === '"') {
      // Possible closing quote — peek ahead
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      const next = text[j] || "";
      if (next === "," || next === "}" || next === "]") {
        // Structural char after quote = legitimate end-of-string
        return result;
      }
      // Not structural = unescaped quote inside the string (common in HTML)
      result += '"';
      i++;
      continue;
    }

    result += ch;
    i++;
  }

  // Reached end of text without finding closing quote (truncated)
  // Return whatever we have — better partial HTML than nothing
  return result.length > 0 ? result : null;
}

/**
 * Parse a JSON response for layout replication.
 * Handles various edge cases and malformed JSON from AI responses.
 */
export function parseReplicationJson(text: string): ReplicationResult {
  const parsed = extractJsonFromAiResponse(text);
  if (parsed && typeof parsed === "object") {
    return normalizeReplicationResult(parsed as Partial<ReplicationResult>);
  }

  // Last resort: try to extract key-value pairs from the text
  const trimmed = text.trim();
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

  // Last resort: try to extract HTML directly from truncated/malformed responses
  const extracted = extractPartialResult(trimmed);
  if (extracted.html) {
    console.warn(
      "[parseReplicationJson] Used fallback extraction for truncated response.",
    );
    return normalizeReplicationResult(extracted);
  }

  // Provide diagnostic info for debugging
  const preview =
    trimmed.length > 200 ? trimmed.slice(0, 200) + "\u2026" : trimmed;
  console.error(
    "[parseReplicationJson] Could not extract JSON from response:",
    preview,
  );
  throw new Error(
    `Failed to parse layout replication data. AI response starts with: ${preview.slice(0, 100)}`,
  );
}

/**
 * Normalize a partial ReplicationResult object to ensure all required fields exist.
 */
export function normalizeReplicationResult(
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
    designTokens: parsed.designTokens ?? undefined,
    isTemplate: parsed.isTemplate ?? undefined,
  };
}
