import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectMotionTier } from '@/lib/motion/tier';

function setup(opts: {
  reduced?: boolean;
  coarse?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  battery?: { level: number; charging: boolean } | null;
}) {
  const matchMedia = (q: string) => ({
    matches:
      (q.includes('reduced-motion') && !!opts.reduced) ||
      (q.includes('pointer: coarse') && !!opts.coarse),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('navigator', {
    deviceMemory: opts.deviceMemory ?? 8,
    hardwareConcurrency: opts.hardwareConcurrency ?? 8,
    getBattery: opts.battery
      ? async () => ({ level: opts.battery!.level, charging: opts.battery!.charging })
      : undefined,
  });
}

describe('detectMotionTier', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('returns "off" when reduced-motion is set', async () => {
    setup({ reduced: true });
    expect(await detectMotionTier()).toBe('off');
  });

  it('returns "light" on coarse pointer (mobile)', async () => {
    setup({ coarse: true });
    expect(await detectMotionTier()).toBe('light');
  });

  it('returns "light" on low memory', async () => {
    setup({ deviceMemory: 2 });
    expect(await detectMotionTier()).toBe('light');
  });

  it('returns "light" on low CPU concurrency', async () => {
    setup({ hardwareConcurrency: 2 });
    expect(await detectMotionTier()).toBe('light');
  });

  it('returns "light" on low battery not charging', async () => {
    setup({ battery: { level: 0.1, charging: false } });
    expect(await detectMotionTier()).toBe('light');
  });

  it('returns "full" otherwise', async () => {
    setup({});
    expect(await detectMotionTier()).toBe('full');
  });

  it('returns "off" in SSR (no window)', async () => {
    vi.stubGlobal('window', undefined);
    expect(await detectMotionTier()).toBe('off');
  });
});
