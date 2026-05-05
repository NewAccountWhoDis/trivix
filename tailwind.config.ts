import type { Config } from 'tailwindcss';
import { colors, radius, shadow, fontFamily } from './styles/theme';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors,
      borderRadius: radius,
      boxShadow: shadow,
      fontFamily,
      backgroundImage: {
        'grid-floor':
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px),' +
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
