"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X, type LucideIcon } from "lucide-react";
import { TOAST_DURATION_MS } from "@/lib/constants";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  leaving: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastKind, { bg: string; text: string; icon: LucideIcon }> = {
  success: { bg: "bg-brand-green-light", text: "text-brand-green", icon: CheckCircle2 },
  error: { bg: "bg-brand-orange-light", text: "text-brand-orange", icon: XCircle },
  info: { bg: "bg-brand-surface-3", text: "text-brand-text-2", icon: Info },
};

// Must match the exit animation's `duration-*` class below — the item stays
// in the array (marked `leaving`, playing the exit animation) for exactly
// this long before it's actually removed.
const EXIT_ANIMATION_MS = 200;

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, kind, message, leaving: false }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const style = STYLES[t.kind];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg duration-200 ${style.bg} ${style.text} ${
                t.leaving
                  ? "animate-out fade-out-0 slide-out-to-bottom-2"
                  : "animate-in fade-in-0 slide-in-from-bottom-2"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
