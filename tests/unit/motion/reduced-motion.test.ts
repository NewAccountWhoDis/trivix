import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

describe('prefersReducedMotion', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when matchMedia is undefined (SSR)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce matches', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when no preference', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(prefersReducedMotion()).toBe(false);
  });
});
