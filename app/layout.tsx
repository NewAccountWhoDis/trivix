import type { Metadata } from "next";
import { fontVariableClassName } from "@/styles/fonts";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { BrandScene } from "@/components/three/BrandScene";
import "./globals.css";

const siteUrl = new URL("https://trivix.app");
const description = "High-energy trivia for hosts, players, and team captains.";

export const metadata: Metadata = {
  title: "Trivix",
  description,
  metadataBase: siteUrl,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Trivix",
    description,
    url: "/",
    siteName: "Trivix",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Trivix live trivia app",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trivix",
    description,
    images: ["/og.png"],
  },
  icons: {
    icon: "/trivix-mark.svg",
    shortcut: "/trivix-mark.svg",
    apple: "/trivix-mark.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
