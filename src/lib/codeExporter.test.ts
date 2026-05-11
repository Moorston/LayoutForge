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

  describe("React export", () => {
    it("should generate valid React component", () => {
      const result = exportCode("react", testHtml, testCss);
      expect(result.format).toBe("react");
      expect(result.filename).toBe("Mylayout.tsx");
      expect(result.language).toBe("tsx");
      expect(result.content).toContain("import React from 'react';");
      expect(result.content).toContain("export function Mylayout");
      expect(result.content).toContain("return (");
      expect(result.content).toContain("<>");
      expect(result.content).toContain("</>");
    });

    it("should convert HTML to JSX", () => {
      const htmlWithAttributes =
        '<div class="foo" onclick="alert()"><img src="test.jpg"></div>';
      const result = exportCode("react", htmlWithAttributes, "");
      expect(result.content).toContain("className=");
      expect(result.content).toContain("onClick=");
      expect(result.content).toContain('<img src="test.jpg" />');
    });

    it("should include CSS as template literal", () => {
      const result = exportCode("react", testHtml, testCss);
      expect(result.content).toContain("const styles = `");
      expect(result.content).toContain(testCss);
    });

    it("should skip CSS section if empty", () => {
      const result = exportCode("react", testHtml, "");
      expect(result.content).not.toContain("const styles");
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

  describe("Next.js export", () => {
    it("should generate valid Next.js page", () => {
      const result = exportCode("nextjs", testHtml, testCss);
      expect(result.format).toBe("nextjs");
      expect(result.filename).toBe("mylayout/page.tsx");
      expect(result.language).toBe("tsx");
      expect(result.content).toContain("import type { Metadata } from 'next';");
      expect(result.content).toContain("export const metadata: Metadata");
      expect(result.content).toContain("export default function MylayoutPage");
      expect(result.content).toContain("return (");
    });

    it("should include CSS module import", () => {
      const result = exportCode("nextjs", testHtml, testCss);
      expect(result.content).toContain(
        "import styles from './mylayout.module.css'",
      );
      expect(result.content).toContain("/* mylayout.module.css */");
      expect(result.content).toContain(testCss);
    });

    it("should use custom page name", () => {
      const result = exportCode("nextjs", testHtml, testCss, "About");
      expect(result.filename).toBe("about/page.tsx");
      expect(result.content).toContain("export default function AboutPage");
      expect(result.content).toContain(
        "import styles from './about.module.css'",
      );
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
