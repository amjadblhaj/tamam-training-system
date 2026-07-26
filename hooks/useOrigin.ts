"use client";

import { useEffect, useState } from "react";

/**
 * The page's origin, available only once mounted (there's no `window` during
 * SSR). Returns `""` until then so the server-rendered markup matches the
 * client's first render — pages that build absolute URLs client-side (e.g.
 * to show a shareable link) would otherwise hit a hydration mismatch.
 */
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return origin;
}
