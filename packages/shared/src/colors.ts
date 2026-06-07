/**
 * Brand colors — SINGLE SOURCE OF TRUTH for the entire app.
 *
 * Change a hex value here and it will propagate to:
 *   - apps/web   (via apps/web/tailwind.config.ts → globals.css `@config`)
 *   - apps/mobile (via apps/mobile/tailwind.config.js → NativeWind)
 *
 * After editing, run: `npm run build:shared`
 *
 * Use in components as Tailwind classes:
 *   bg-primary, text-primary, border-primary
 *   bg-secondary, text-secondary, border-secondary
 */
export const COLORS = {
  primary: '#166534',   // green-800 — dark green for primary buttons, headings
  secondary: '#22c55e', // green-500 — light green for accent links, highlights
} as const;

export type ColorName = keyof typeof COLORS;
