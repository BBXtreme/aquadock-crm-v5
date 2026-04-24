"use client";

import { useEffect, useState } from "react";

/**
 * Returns a platform-accurate label for opening the command palette (Meta+K vs Ctrl+K).
 * Defaults to `Ctrl+K` on first paint (matches most SSR / Windows), then corrects after mount
 * (same idea as `CompanyHeader` shortcut label).
 */
export function useCommandPaletteModLabel() {
  const [label, setLabel] = useState("Ctrl+K");

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    if (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setLabel("⌘K");
    } else {
      setLabel("Ctrl+K");
    }
  }, []);

  return label;
}
