'use client';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'default' | 'elevated' | 'neon' | 'quad-r' | 'quad-b' | 'quad-y' | 'quad-g';

const variants: Record<Variant, string> = {
  default:  'bg-brand-ink border border-brand-line',
  elevated: 'bg-brand-ink border border-brand-line shadow-soft',
  neon:     'bg-brand-ink border border-brand-red shadow-glow-red',
  'quad-r': 'bg-brand-ink border border-game-red shadow-glow-quad-r',
  'quad-b': 'bg-brand-ink border border-game-blue shadow-glow-quad-b',
  'quad-y': 'bg-brand-ink border border-game-yellow shadow-glow-quad-y',
  'quad-g': 'bg-brand-ink border border-game-green shadow-glow-quad-g',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg p-5',
        variants[variant],
        interactive && 'transition hover:-translate-y-0.5 hover:shadow-soft cursor-pointer',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';
