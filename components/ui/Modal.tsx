"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const CLOSE_ANIMATION_MS = 150;

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Overrides the panel's max-width class (default `max-w-md`). */
  panelClassName?: string;
}

/**
 * The shared modal shell: animated backdrop + panel (fade+zoom in on mount,
 * fade+zoom out before actually unmounting), closable via the X button,
 * Escape, or clicking the backdrop.
 *
 * Parents still control mounting the usual way (`{open && <Modal .../>}`) —
 * this component intercepts every close trigger and delays calling the real
 * `onClose` until the exit animation finishes, so the parent's unmount
 * doesn't cut the animation short.
 */
export function Modal({ title, onClose, children, panelClassName = "max-w-md" }: ModalProps): JSX.Element {
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose is stable enough for this local escape-key listener
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 duration-150 ${
        closing ? "animate-out fade-out-0" : "animate-in fade-in-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`w-full rounded-2xl bg-brand-surface p-6 shadow-xl duration-150 ${panelClassName} ${
          closing ? "animate-out fade-out-0 zoom-out-95" : "animate-in fade-in-0 zoom-in-95"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">{title}</h2>
          <button
            onClick={handleClose}
            className="rounded-md text-brand-text-2 transition-colors hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
