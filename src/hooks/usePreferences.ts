/**
 * Hook for user preferences: brand kit, output stack, and refinement toggle.
 */

import { useState, useEffect, useMemo } from "react";
import type { ExportFormat, BrandKit, GenerationMode } from "@/lib/types";
import {
  loadBrandKit,
  saveBrandKit,
  buildBrandKitPromptContext,
} from "@/lib/brandKit";

export function usePreferences() {
  const [brandKit, setBrandKit] = useState<BrandKit>(loadBrandKit());
  const [selectedStack, setSelectedStack] = useState<ExportFormat>("html");
  const [enableRefinement, setEnableRefinement] = useState(true);
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>("replicate");

  // Persist brand kit changes
  useEffect(() => {
    saveBrandKit(brandKit);
  }, [brandKit]);

  // Derived: only build context when company name has been customized
  const brandKitContext = useMemo(
    () =>
      brandKit.companyName !== "My Company"
        ? buildBrandKitPromptContext(brandKit)
        : undefined,
    [brandKit],
  );

  return {
    brandKit,
    setBrandKit,
    selectedStack,
    setSelectedStack,
    enableRefinement,
    setEnableRefinement,
    generationMode,
    setGenerationMode,
    brandKitContext,
  } as const;
}
