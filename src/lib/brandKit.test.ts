import { describe, it, expect } from "vitest";
import {
  buildBrandKitPromptContext,
  borderRadiusToTailwind,
  injectBrandCssVars,
} from "./brandKit";
import { DEFAULT_BRAND_KIT } from "./types";

describe("brandKit utility functions", () => {
  describe("buildBrandKitPromptContext", () => {
    it("should generate prompt text with brand kit information", () => {
      const kit = {
        ...DEFAULT_BRAND_KIT,
        companyName: "Test Company",
        tagline: "Test Tagline",
        website: "https://test.com",
        contactEmail: "test@example.com",
      };

      const result = buildBrandKitPromptContext(kit);

      expect(result).toContain(
        "=== BRAND KIT (apply these to ALL generated code) ===",
      );
      expect(result).toContain("Company: Test Company");
      expect(result).toContain("Tagline: Test Tagline");
      expect(result).toContain("Website: https://test.com");
      expect(result).toContain("Email: test@example.com");
      expect(result).toContain("=== END BRAND KIT ===");
    });

    it("should include color information", () => {
      const kit = {
        ...DEFAULT_BRAND_KIT,
        primaryColor: "#ff0000",
        secondaryColor: "#00ff00",
        accentColor: "#0000ff",
        backgroundColor: "#ffffff",
        textColor: "#000000",
      };

      const result = buildBrandKitPromptContext(kit);

      expect(result).toContain("Primary:    #ff0000");
      expect(result).toContain("Secondary:  #00ff00");
      expect(result).toContain("Accent:     #0000ff");
      expect(result).toContain("Background: #ffffff");
      expect(result).toContain("Text:       #000000");
    });

    it("should include typography information", () => {
      const kit = {
        ...DEFAULT_BRAND_KIT,
        headingFont: "Roboto",
        bodyFont: "Open Sans",
      };

      const result = buildBrandKitPromptContext(kit);

      expect(result).toContain('Heading font: "Roboto"');
      expect(result).toContain('Body font:    "Open Sans"');
    });

    it("should include border radius style", () => {
      const kit = {
        ...DEFAULT_BRAND_KIT,
        borderRadius: "xl" as const,
      };

      const result = buildBrandKitPromptContext(kit);

      expect(result).toContain('Border radius style: "xl"');
    });

    it("should handle missing optional fields", () => {
      const kit = {
        ...DEFAULT_BRAND_KIT,
        tagline: "",
        website: "",
        contactEmail: "",
        logoUrl: "",
      };

      const result = buildBrandKitPromptContext(kit);

      expect(result).not.toContain("Tagline:");
      expect(result).not.toContain("Website:");
      expect(result).not.toContain("Email:");
      expect(result).toContain("Logo: not provided");
    });

    it("should handle embedded logo", () => {
      const kit = {
        ...DEFAULT_BRAND_KIT,
        logoUrl: "data:image/png;base64,...",
        logoAlt: "Company Logo",
      };

      const result = buildBrandKitPromptContext(kit);

      expect(result).toContain("[embedded logo image provided]");
      expect(result).toContain('alt: "Company Logo"');
    });
  });

  describe("borderRadiusToTailwind", () => {
    it("should map border radius to Tailwind class", () => {
      expect(borderRadiusToTailwind("none")).toBe("rounded-none");
      expect(borderRadiusToTailwind("sm")).toBe("rounded-sm");
      expect(borderRadiusToTailwind("md")).toBe("rounded-md");
      expect(borderRadiusToTailwind("lg")).toBe("rounded-lg");
      expect(borderRadiusToTailwind("xl")).toBe("rounded-xl");
      expect(borderRadiusToTailwind("full")).toBe("rounded-full");
    });
  });

  describe("injectBrandCssVars", () => {
    it("should inject CSS custom properties into CSS string", () => {
      const css = "body { margin: 0; }";
      const kit = {
        ...DEFAULT_BRAND_KIT,
        primaryColor: "#ff0000",
        secondaryColor: "#00ff00",
        accentColor: "#0000ff",
        backgroundColor: "#ffffff",
        textColor: "#000000",
        headingFont: "Roboto",
        bodyFont: "Open Sans",
      };

      const result = injectBrandCssVars(css, kit);

      expect(result).toContain(":root {");
      expect(result).toContain("--color-primary: #ff0000;");
      expect(result).toContain("--color-secondary: #00ff00;");
      expect(result).toContain("--color-accent: #0000ff;");
      expect(result).toContain("--color-bg: #ffffff;");
      expect(result).toContain("--color-text: #000000;");
      expect(result).toContain("--font-heading: 'Roboto'");
      expect(result).toContain("--font-body: 'Open Sans'");
      expect(result).toContain(css);
    });

    it("should preserve existing CSS", () => {
      const css = ".custom { color: red; }";
      const kit = DEFAULT_BRAND_KIT;

      const result = injectBrandCssVars(css, kit);

      expect(result).toContain(css);
      expect(result.indexOf(":root {")).toBeLessThan(result.indexOf(css));
    });

    it("should handle empty CSS", () => {
      const css = "";
      const kit = DEFAULT_BRAND_KIT;

      const result = injectBrandCssVars(css, kit);

      expect(result).toContain(":root {");
      expect(result).toContain("--color-primary:");
    });
  });
});
