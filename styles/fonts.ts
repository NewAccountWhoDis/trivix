// styles/fonts.ts
import { Anton, Inter, JetBrains_Mono } from 'next/font/google';

export const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-anton',
});

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const fontVariableClassName = [anton.variable, inter.variable, jetbrains.variable].join(' ');
