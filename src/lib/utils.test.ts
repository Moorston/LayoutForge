import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", true && "conditional", false && "hidden");
    expect(result).toBe("base conditional");
  });

  it("should handle undefined and null classes", () => {
    const result = cn("base", undefined, null, "other");
    expect(result).toBe("base other");
  });

  it("should merge Tailwind classes properly", () => {
    const result = cn("px-4 py-2", "px-6");
    // Check that px-6 replaces px-4 and py-2 is preserved
    expect(result).toContain("px-6");
    expect(result).toContain("py-2");
    expect(result).not.toContain("px-4");
  });

  it("should handle conflicting Tailwind classes", () => {
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toBe("bg-blue-500");
  });

  it("should handle arrays of classes", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });

  it("should handle objects", () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe("foo baz");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle complex Tailwind merging", () => {
    const result = cn(
      "text-red-500 bg-blue-100",
      "text-green-500",
      "bg-red-100",
    );
    // Check that classes are merged correctly
    expect(result).toContain("text-green-500");
    expect(result).toContain("bg-red-100");
    expect(result).not.toContain("text-red-500");
    expect(result).not.toContain("bg-blue-100");
  });
});
