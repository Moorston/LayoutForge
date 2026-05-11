import { describe, it, expect } from "vitest";
import { exportCode } from "./codeExporter";

describe("codeExporter utility functions", () => {
  const testHtml = '<div class="p-4"><h1>Hello World</h1></div>';
  const testCss = ".custom { color: red; }";

  describe("HTML export", () => {
    it("should generate valid HTML with DOCTYPE", () => {
      const result = exportCode("html", testHtml, testCss);
      expect(result.format).toBe("html");
      expect(result.filename).toBe("MyLayout.html");
      expect(result.language).toBe("html");
      expect(result.content).toContain("<!DOCTYPE html>");
      expect(result.content).toContain('<html lang="en">');
      expect(result.content).toContain("<head>");
      expect(result.content).toContain("<body>");
      expect(result.content).toContain(testHtml);
      expect(result.content).toContain(testCss);
    });

    it("should include Tailwind CDN script", () => {
      const result = exportCode("html", testHtml, testCss);
      expect(result.content).toContain("unpkg.com/@tailwindcss/browser@4");
    });

    it("should use custom page name", () => {
      const result = exportCode("html", testHtml, testCss, "About");
      expect(result.filename).toBe("About.html");
      expect(result.content).toContain("<title>About</title>");
    });
  });

  describe("Vue export", () => {
    it("should generate valid Vue SFC", () => {
      const result = exportCode("vue", testHtml, testCss);
      expect(result.format).toBe("vue");
      expect(result.filename).toBe("Mylayout.vue");
      expect(result.language).toBe("vue");
      expect(result.content).toContain("<template>");
      expect(result.content).toContain("</template>");
      expect(result.content).toContain('<script setup lang="ts">');
      expect(result.content).toContain("</script>");
      expect(result.content).toContain("<style scoped>");
      expect(result.content).toContain("</style>");
    });

    it("should include component name", () => {
      const result = exportCode("vue", testHtml, testCss);
      expect(result.content).toContain("defineOptions({ name: 'Mylayout' })");
    });

    it("should skip style section if no CSS", () => {
      const result = exportCode("vue", testHtml, "");
      expect(result.content).not.toContain("<style scoped>");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty HTML", () => {
      const result = exportCode("html", "", "");
      expect(result.content).toContain("<!DOCTYPE html>");
      expect(result.content).toContain("<body>");
    });

    it("should handle special characters in HTML", () => {
      const htmlWithSpecialChars =
        '<div data-test="value & <other>">Content</div>';
      const result = exportCode("html", htmlWithSpecialChars, "");
      expect(result.content).toContain(htmlWithSpecialChars);
    });

    it("should default to HTML format for unknown format", () => {
      // @ts-ignore - testing invalid format
      const result = exportCode("invalid", testHtml, testCss);
      expect(result.format).toBe("html");
    });
  });
});
