'use client';
import * as ToastPrimitive from '@radix-ui/react-toast';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'default' | 'success' | 'error' | 'warn';

const tones: Record<Tone, string> = {
  default: 'border-brand-line',
  success: 'border-game-green',
  error:   'border-game-red',
  warn:    'border-game-yellow',
};

export interface ToastItemProps {
  title?: string;
  description?: string;
  tone?: Tone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToastItem({ title, description, tone = 'default', open, onOpenChange }: ToastItemProps) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={4000}
      className={cn(
        'bg-brand-ink border rounded-md p-4 shadow-soft text-text-primary',
        'data-[state=open]:animate-[slideIn_180ms_cubic-bezier(0.4,0,0.2,1)]',
        'data-[state=closed]:animate-[slideOut_180ms_cubic-bezier(0.4,0,1,1)]',
        tones[tone],
      )}
    >
      {title && <ToastPrimitive.Title className="font-semibold">{title}</ToastPrimitive.Title>}
      {description && (
        <ToastPrimitive.Description className="text-sm text-text-muted">
          {description}
        </ToastPrimitive.Description>
      )}
    </ToastPrimitive.Root>
  );
}
