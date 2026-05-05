import { prefersReducedMotion } from './reduced-motion';

export type MotionTier = 'full' | 'light' | 'off';

interface NavigatorWithExtras extends Navigator {
  deviceMemory?: number;
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
}

export async function detectMotionTier(): Promise<MotionTier> {
  if (typeof window === 'undefined') return 'off';

  if (prefersReducedMotion()) return 'off';

  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (coarse) return 'light';

  const nav = navigator as NavigatorWithExtras;
  if ((nav.deviceMemory ?? 8) < 4) return 'light';
  if ((nav.hardwareConcurrency ?? 8) < 4) return 'light';

  if (typeof nav.getBattery === 'function') {
    try {
      const battery = await nav.getBattery();
      if (battery.level < 0.2 && !battery.charging) return 'light';
    } catch {
      // battery API failure → ignore, fall through
    }
  }

  return 'full';
}
