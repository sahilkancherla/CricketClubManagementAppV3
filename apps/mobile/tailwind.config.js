// Brand colors come from packages/shared/src/colors.ts — edit there, not here.
const { COLORS } = require('@cricket/shared');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,
        secondary: COLORS.secondary,

        // Surfaces — warm paper base with green undertone
        base: '#f7f9f6',
        card: '#ffffff',
        soft: '#eef3ed',
        sunken: '#eef2ec',
        tinted: '#f0f7f1',

        // Ink — neutral scale
        ink: '#0a0a0a',
        'ink-strong': '#18181b',
        'ink-soft': '#52525b',
        'ink-muted': '#a1a1aa',
        'ink-faint': '#d4d4d8',

        // Rules / borders
        rule: '#e6ece6',
        'rule-strong': '#cdd6cd',

        // Accent — emerald scale
        accent: '#047857',
        'accent-rich': '#059669',
        'accent-ink': '#064e3b',
        'accent-deep': '#022c22',
        'accent-leaf': '#10b981',
        'accent-bright': '#22c55e',
        'accent-soft': '#ecfdf5',
        'accent-tint': '#d1fae5',
        'accent-wash': '#f3faf4',
        'accent-rule': '#a7f3d0',

        // Semantic
        danger: '#b91c1c',
        'danger-soft': '#fef2f2',
        warn: '#b45309',
        'warn-soft': '#fffbeb',
      },
    },
  },
  plugins: [],
};
