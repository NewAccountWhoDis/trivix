'use client';
import * as ToastPrimitive from '@radix-ui/react-toast';
import * as React from 'react';
import { ToastItem } from './Toast';

interface ToastInput {
  title?: string;
  description?: string;
  tone?: 'default' | 'success' | 'error' | 'warn';
}

interface ToastContextValue {
  push: (input: ToastInput) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

interface ToastEntry extends ToastInput {
  id: string;
  open: boolean;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);

  const push = React.useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev.slice(-2), { ...input, id, open: true }]);
  }, []);

  const setOpen = (id: string, open: boolean) => {
    setToasts((prev) => (open ? prev : prev.filter((t) => t.id !== id)));
  };

  return (
    <ToastContext.Provider value={{ push }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            title={t.title}
            description={t.description}
            tone={t.tone}
            open={t.open}
            onOpenChange={(open) => setOpen(t.id, open)}
          />
        ))}
        <ToastPrimitive.Viewport className="fixed top-4 right-4 flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)] z-[60] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
