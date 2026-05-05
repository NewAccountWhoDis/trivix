import type { Metadata } from 'next';
import { fontVariableClassName } from '@/styles/fonts';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { BrandScene } from '@/components/three/BrandScene';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trivix',
  description: 'High-energy trivia for hosts, players, and team captains.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Trivix',
    description: 'High-energy trivia for hosts, players, and team captains.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariableClassName}>
      <body className="font-body antialiased min-h-screen">
        <ThemeProvider>
          <ToastProvider>
            <div className="relative min-h-screen overflow-hidden">
              <BrandScene />
              <div className="relative z-10">{children}</div>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
