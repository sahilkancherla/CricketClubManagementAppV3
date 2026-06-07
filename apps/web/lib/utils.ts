// Utility helpers for the web app.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Format cents as a currency string, e.g. 12345 -> "$123.45".
export function formatCurrency(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// Parse a dollar string (e.g. "123.45") into integer cents.
export function dollarsToCents(input: string): number {
  const n = parseFloat(String(input).replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// Today's date as a local ISO date (YYYY-MM-DD).
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Format an ISO date (YYYY-MM-DD) as "Sat, Jun 6, 2026".
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format a HH:MM(:SS) time string for display (e.g. "9:00 AM").
export function formatTime(hhmmss: string | null | undefined): string {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
}

// Convert a HH:MM:SS to HH:MM for <input type="time">.
export function toInputTime(hhmmss: string | null | undefined): string {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  return `${pad(parseInt(parts[0] || "0", 10))}:${pad(parseInt(parts[1] || "0", 10))}`;
}
