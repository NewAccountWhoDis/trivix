// Motion tokens. No magic numbers in components — pull from here.

export const durations = {
  instant: 0,
  fast: 0.15,
  base: 0.28,
  slow: 0.48,
  scene: 0.8,
} as const;

export const easings = {
  standard: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
  emphasized: [0.2, 0.0, 0, 1] as [number, number, number, number],
  springy: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  decel: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
  accel: [0.4, 0.0, 1, 1] as [number, number, number, number],
} as const;

export const springs = {
  soft: { type: "spring" as const, stiffness: 140, damping: 18, mass: 0.9 },
  snappy: { type: "spring" as const, stiffness: 260, damping: 22, mass: 0.8 },
  bouncy: { type: "spring" as const, stiffness: 320, damping: 14, mass: 0.9 },
  heavy: { type: "spring" as const, stiffness: 90, damping: 22, mass: 1.4 },
};

export const stagger = {
  tight: 0.03,
  base: 0.06,
  loose: 0.12,
} as const;

export type MotionDuration = keyof typeof durations;
export type MotionEasing = keyof typeof easings;
export type MotionSpring = keyof typeof springs;
