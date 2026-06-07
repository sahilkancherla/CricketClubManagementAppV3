import type { Config } from 'tailwindcss';
import { COLORS } from '@cricket/shared';

// Brand colors come from packages/shared/src/colors.ts — edit there, not here.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,
        secondary: COLORS.secondary,
        accent: {
          DEFAULT: 'var(--color-accent)',
          rich: 'var(--color-accent-rich)',
          ink: 'var(--color-accent-ink)',
          deep: 'var(--color-accent-deep)',
          leaf: 'var(--color-accent-leaf)',
          bright: 'var(--color-accent-bright)',
          soft: 'var(--color-accent-soft)',
          tint: 'var(--color-accent-tint)',
          wash: 'var(--color-accent-wash)',
          rule: 'var(--color-accent-rule)',
          'rule-strong': 'var(--color-accent-rule-strong)',
        },
      },
    },
  },
};

export default config;
