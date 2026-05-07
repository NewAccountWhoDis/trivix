"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils/cn";

/**
 * Renders an SVG QR code for a URL string. Re-renders when `value` changes.
 * Uses dark/light defaults that look good on the brand-ink card surface.
 */
export function QrCode({
  value,
  size = 256,
  className,
  background = "#0d0e12",
  foreground = "#ffffff",
}: {
  value: string;
  size?: number;
  className?: string;
  background?: string;
  foreground?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: foreground, light: background },
    })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, background, foreground]);

  return (
    <div
      role="img"
      aria-label={`QR code for ${value}`}
      className={cn("inline-block", className)}
      style={{ width: size, height: size }}
      // SVG output from qrcode is trusted; we generated it.
      dangerouslySetInnerHTML={{ __html: svg ?? "" }}
    />
  );
}

/**
 * Pure helper used both at runtime and in tests. Builds the absolute URL
 * a QR scanner should land on.
 */
export function buildJoinUrl(origin: string, sessionCode: string): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/play?code=${encodeURIComponent(sessionCode)}`;
}
