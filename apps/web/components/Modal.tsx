"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/**
 * Centered modal dialog rendered in a portal. Closes on backdrop click or Escape,
 * and locks body scroll while open. Provide the form/content as children — the
 * header (eyebrow, title, description, close button) is supplied here.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-[var(--color-ink)]/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${SIZE_CLASS[size]} my-6 sm:my-10 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] shadow-[var(--shadow-lifted)]`}
        style={{ animation: "fadeIn 0.15s ease-out" }}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-accent)] font-medium mb-1">
                {eyebrow}
              </div>
            )}
            <h2 className="font-display text-[18px] font-semibold text-[var(--color-ink)]">{title}</h2>
            {description && (
              <p className="text-[12px] text-[var(--color-ink-soft)] mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 shrink-0 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] flex items-center justify-center transition-colors"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Right-aligned Cancel/Submit footer for modal forms. */
export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 pt-2">{children}</div>;
}
