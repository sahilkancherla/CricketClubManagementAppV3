"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Column-aligned, paginated list of per-member assignments (used by the
 * expandable rows on the expenses and payments ledgers). Fixed-width columns
 * keep the amount / status / action aligned across rows regardless of content,
 * and large lists page instead of growing unbounded.
 */
export function AssignmentList({
  items,
  pageSize = 8,
  renderName,
  showShare = false,
  formatShare,
  renderStatus,
  renderAction,
}: {
  items: any[];
  pageSize?: number;
  renderName: (a: any) => string;
  showShare?: boolean;
  formatShare?: (a: any) => string;
  renderStatus: (a: any) => React.ReactNode;
  renderAction: (a: any) => React.ReactNode;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return (
    <div className="space-y-2">
      <ul className="flex flex-col gap-1.5">
        {pageItems.map((a) => (
          <li
            key={a.id ?? a.user_id}
            className="flex items-center gap-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] px-3 py-2"
          >
            <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] truncate">
              {renderName(a)}
            </span>
            {showShare && (
              <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-[var(--color-ink)] shrink-0">
                {formatShare?.(a)}
              </span>
            )}
            <span className="w-24 flex justify-center shrink-0">{renderStatus(a)}</span>
            <div className="w-28 flex items-center justify-end shrink-0">{renderAction(a)}</div>
          </li>
        ))}
      </ul>

      {items.length > pageSize && (
        <div className="flex items-center justify-between pt-1 text-[12px] text-[var(--color-ink-soft)]">
          <span className="tabular-nums">
            {start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <span className="px-1 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
