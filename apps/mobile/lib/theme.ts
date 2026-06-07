/**
 * Design tokens matching the web app's CSS variable system.
 * Use these for non-NativeWind contexts (tab bar, status bar, etc.)
 * For NativeWind, use the matching Tailwind utility classes defined in tailwind.config.js.
 */

export const colors = {
  // Surfaces
  bgBase: '#f7f9f6',
  bgCard: '#ffffff',
  bgSoft: '#eef3ed',
  bgSunken: '#eef2ec',
  bgTinted: '#f0f7f1',

  // Ink
  ink: '#0a0a0a',
  inkStrong: '#18181b',
  inkSoft: '#52525b',
  inkMuted: '#a1a1aa',
  inkFaint: '#d4d4d8',

  // Rules / borders
  rule: '#e6ece6',
  ruleStrong: '#cdd6cd',
  ruleFocus: '#047857',

  // Accent — emerald
  accent: '#047857',
  accentRich: '#059669',
  accentInk: '#064e3b',
  accentDeep: '#022c22',
  accentLeaf: '#10b981',
  accentBright: '#22c55e',
  accentSoft: '#ecfdf5',
  accentTint: '#d1fae5',
  accentWash: '#f3faf4',
  accentRule: '#a7f3d0',
  accentRuleStrong: '#6ee7b7',

  // Semantic
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
  warn: '#b45309',
  warnSoft: '#fffbeb',
  info: '#0369a1',
  infoSoft: '#f0f9ff',
} as const;
