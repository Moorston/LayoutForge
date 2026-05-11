import { describe, it, expect } from "vitest";
import {
  extractJsonFromAiResponse,
  fixJsonStringEscapes,
  parseReplicationJson,
} from "./jsonParser";

describe("jsonParser utility functions", () => {
  describe("fixJsonStringEscapes", () => {
    it("should escape unescaped quotes inside JSON strings", () => {
      const input = '{"text": "He said "hello" to me"}';
      const result = fixJsonStringEscapes(input);
      expect(result).toBe('{"text": "He said \\"hello\\" to me"}');
    });

    it("should handle already escaped quotes", () => {
      const input = '{"text": "He said \\"hello\\" to me"}';
      const result = fixJsonStringEscapes(input);
      expect(result).toBe('{"text": "He said \\"hello\\" to me"}');
    });

    it("should handle empty string", () => {
      const input = "";
      const result = fixJsonStringEscapes(input);
      expect(result).toBe("");
    });

    it("should escape unescaped quotes between adjacent strings", () => {
      const input = '{"outer": {"inner": "test" "value"}}';
      const result = fixJsonStringEscapes(input);
      // The quote between "test" and "value" is inside a string and not
      // followed by a structural char, so it gets escaped.
      expect(result).toContain('"test\\" \\"value"');
    });

    it("should handle arrays with adjacent strings", () => {
      const input = '["item1", "item2" "item3"]';
      const result = fixJsonStringEscapes(input);
      expect(result).toContain('"item2\\" \\"item3"');
    });
  });

  describe("extractJsonFromAiResponse", () => {
    it("should extract JSON from raw text", () => {
      const text =
        '{"html": "<div>test</div>", "css": ".test { color: red; }"}';
      const result = extractJsonFromAiResponse(text);
      expect(result).toEqual({
        html: "<div>test</div>",
        css: ".test { color: red; }",
      });
    });

    it("should extract JSON from markdown code fence", () => {
      const text = '```json\n{"html": "<div>test</div>"}\n```';
      const result = extractJsonFromAiResponse(text);
      expect(result).toEqual({
        html: "<div>test</div>",
      });
    });

    it("should extract JSON from generic code fence", () => {
      const text = '```\n{"html": "<div>test</div>"}\n```';
      const result = extractJsonFromAiResponse(text);
      expect(result).toEqual({
        html: "<div>test</div>",
      });
    });

    it("should handle truncated code fences", () => {
      const text = '```json\n{"html": "<div>test</div>"}';
      const result = extractJsonFromAiResponse(text);
      expect(result).toEqual({
        html: "<div>test</div>",
      });
    });

    it("should repair and parse broken JSON", () => {
      const text = '{"text": "He said "hello" to me", "other": "value"}';
      const result = extractJsonFromAiResponse(text);
      expect(result).toEqual({
        text: 'He said "hello" to me',
        other: "value",
      });
    });

    it("should handle arrays", () => {
      const text = "[1, 2, 3]";
      const result = extractJsonFromAiResponse(text);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should return null for invalid JSON", () => {
      const text = "This is not JSON at all";
      const result = extractJsonFromAiResponse(text);
      expect(result).toBeNull();
    });

    it("should handle mixed content with JSON", () => {
      const text =
        'Here is the result: {"html": "<div>test</div>"} and some more text';
      const result = extractJsonFromAiResponse(text);
      expect(result).toEqual({
        html: "<div>test</div>",
      });
    });
  });

  describe("parseReplicationJson", () => {
    it("should parse valid ReplicationResult JSON", () => {
      const text =
        '{"html": "<div>test</div>", "css": ".test { color: red; }", "explanation": "Test explanation"}';
      const result = parseReplicationJson(text);
      expect(result.html).toBe("<div>test</div>");
      expect(result.css).toBe(".test { color: red; }");
      expect(result.explanation).toBe("Test explanation");
      expect(result.detectedImages).toEqual([]);
    });

    it("should handle partial ReplicationResult", () => {
      const text = '{"html": "<div>test</div>"}';
      const result = parseReplicationJson(text);
      expect(result.html).toBe("<div>test</div>");
      expect(result.css).toBe("");
      expect(result.explanation).toBe("");
      expect(result.detectedImages).toEqual([]);
    });

    it("should handle detectedImages array", () => {
      const text = JSON.stringify({
        html: "<div>test</div>",
        detectedImages: [{ description: "test image" }],
      });
      const result = parseReplicationJson(text);
      expect(result.detectedImages).toHaveLength(1);
      expect(result.detectedImages[0].description).toBe("test image");
    });

    it("should throw error for invalid JSON", () => {
      const text = "This is not JSON at all";
      expect(() => parseReplicationJson(text)).toThrow(
        "Failed to parse layout replication data",
      );
    });

    it("should extract key-value pairs from text", () => {
      const text = 'html: "<div>test</div>" css: ".test { color: red; }"';
      const result = parseReplicationJson(text);
      expect(result.html).toBe("<div>test</div>");
      expect(result.css).toBe(".test { color: red; }");
    });

    it("should handle malformed JSON with unescaped quotes", () => {
      const text = '{"html": "<div class="test">content</div>"}';
      const result = parseReplicationJson(text);
      expect(result.html).toBe('<div class="test">content</div>');
    });
  });
});
