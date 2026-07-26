"use client";

import { useState } from "react";
import { COPY_FEEDBACK_MS } from "@/lib/constants";

interface UseCopyToClipboardResult {
  /** The key last copied, or null once the feedback window has elapsed. */
  copiedKey: string | null;
  /** Copies `text` and marks `key` as just-copied for COPY_FEEDBACK_MS. */
  copy: (key: string, text: string) => Promise<void>;
}

/**
 * Copies text to the clipboard and tracks which row/button triggered it, so
 * callers can render a "copied!" affordance next to that specific item.
 */
export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copy(key: string, text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), COPY_FEEDBACK_MS);
  }

  return { copiedKey, copy };
}
