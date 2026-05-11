/**
 * Hook for managing UI panel visibility states.
 */

import { useState } from "react";

export function usePanels() {
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  return {
    showBrandKit,
    setShowBrandKit,
    showBatch,
    setShowBatch,
    showModelSelector,
    setShowModelSelector,
  } as const;
}
