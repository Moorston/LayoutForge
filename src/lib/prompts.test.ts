import { describe, it, expect } from "vitest";
import {
  SYSTEM_PROMPT,
  buildGenerationPrompt,
  buildRefinementPrompt,
  buildSkeletonPrompt,
  buildTextPrompt,
} from "./prompts";

describe("prompts module", () => {
  describe("SYSTEM_PROMPT", () => {
    it("should be a non-empty string", () => {
      expect(SYSTEM_PROMPT).toBeTruthy();
      expect(typeof SYSTEM_PROMPT).toBe("string");
    });

    it("should mention frontend engineer expertise", () => {
      expect(SYSTEM_PROMPT.toLowerCase()).toContain("frontend");
    });

    it("should mention JSON output requirement", () => {
      expect(SYSTEM_PROMPT.toLowerCase()).toContain("json");
    });
  });

  describe("buildGenerationPrompt", () => {
    it("should generate a prompt for html stack", () => {
      const prompt = buildGenerationPrompt("html");
      expect(prompt).toBeTruthy();
      expect(prompt).toContain("HTML + Tailwind CSS");
      expect(prompt).toContain("PIXEL-PERFECT FIDELITY");
      expect(prompt).toContain("RESPONSIVE DESIGN");
      expect(prompt).toContain("SEMANTIC HTML");
      expect(prompt).toContain("ACCESSIBILITY");
    });

    it("should generate a prompt for react-tailwind stack", () => {
      const prompt = buildGenerationPrompt("react-tailwind");
      expect(prompt).toContain("React + Tailwind CSS");
      expect(prompt).toContain("JSX");
      expect(prompt).toContain("TypeScript");
    });

    it("should generate a prompt for vue stack", () => {
      const prompt = buildGenerationPrompt("vue");
      expect(prompt).toContain("Vue 3");
      expect(prompt).toContain("Composition API");
    });

    it("should include brand kit context when provided", () => {
      const prompt = buildGenerationPrompt("html", "Primary: #ff0000");
      expect(prompt).toContain("BRAND KIT");
      expect(prompt).toContain("#ff0000");
    });

    it("should include pixel layout context when provided", () => {
      const prompt = buildGenerationPrompt(
        "html",
        undefined,
        "Grid: 3 columns",
      );
      expect(prompt).toContain("PIXEL LAYOUT ANALYSIS");
      expect(prompt).toContain("3 columns");
    });

    it("should include extra context when provided", () => {
      const prompt = buildGenerationPrompt(
        "html",
        undefined,
        undefined,
        "Dark theme",
      );
      expect(prompt).toContain("ADDITIONAL CONTEXT");
      expect(prompt).toContain("Dark theme");
    });

    it("should not include brand kit section when not provided", () => {
      const prompt = buildGenerationPrompt("html");
      expect(prompt).not.toContain("BRAND KIT");
    });

    it("should include JSON output format specification", () => {
      const prompt = buildGenerationPrompt("html");
      expect(prompt).toContain('"html"');
      expect(prompt).toContain('"css"');
      expect(prompt).toContain('"explanation"');
    });

    it("should include detectedImages and detectedCharts in output format", () => {
      const prompt = buildGenerationPrompt("html");
      expect(prompt).toContain("detectedImages");
      expect(prompt).toContain("detectedCharts");
    });
  });

  describe("buildRefinementPrompt", () => {
    it("should include current HTML and CSS", () => {
      const prompt = buildRefinementPrompt(
        "html",
        "<div>test</div>",
        ".test { color: red }",
      );
      expect(prompt).toContain("<div>test</div>");
      expect(prompt).toContain(".test { color: red }");
    });

    it("should include refinement goals", () => {
      const prompt = buildRefinementPrompt("html", "<div/>", "");
      expect(prompt).toContain("LAYOUT PRECISION");
      expect(prompt).toContain("TYPOGRAPHY POLISH");
      expect(prompt).toContain("COLOR & CONTRAST");
      expect(prompt).toContain("RESPONSIVE QUALITY");
      expect(prompt).toContain("SPACING RHYTHM");
    });

    it("should include original description when provided", () => {
      const prompt = buildRefinementPrompt(
        "html",
        "<div/>",
        "",
        "A landing page",
      );
      expect(prompt).toContain("A landing page");
    });

    it("should specify JSON output format", () => {
      const prompt = buildRefinementPrompt("html", "<div/>", "");
      expect(prompt).toContain('"html"');
      expect(prompt).toContain('"css"');
      expect(prompt).toContain('"explanation"');
    });
  });

  describe("buildSkeletonPrompt", () => {
    it("should include the skeleton structure", () => {
      const skeleton = "- Hero section\n- Feature cards\n- Footer";
      const prompt = buildSkeletonPrompt("html", skeleton);
      expect(prompt).toContain(skeleton);
    });

    it("should include brand kit when provided", () => {
      const prompt = buildSkeletonPrompt(
        "html",
        "skeleton",
        "Brand: Acme Corp",
      );
      expect(prompt).toContain("BRAND KIT");
      expect(prompt).toContain("Acme Corp");
    });

    it("should include stack-specific instructions", () => {
      const prompt = buildSkeletonPrompt("react-tailwind", "skeleton");
      expect(prompt).toContain("React + Tailwind CSS");
    });
  });

  describe("buildTextPrompt", () => {
    it("should include the content text", () => {
      const prompt = buildTextPrompt("html", "A modern SaaS landing page");
      expect(prompt).toContain("A modern SaaS landing page");
    });

    it("should include brand kit when provided", () => {
      const prompt = buildTextPrompt("html", "content", "Colors: blue, white");
      expect(prompt).toContain("BRAND KIT");
      expect(prompt).toContain("blue, white");
    });

    it("should include stack-specific instructions", () => {
      const prompt = buildTextPrompt("vue", "content");
      expect(prompt).toContain("Vue 3");
    });
  });
});
