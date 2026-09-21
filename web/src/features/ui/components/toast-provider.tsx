'use client';

import { useEffect, useState } from 'react';

type ToastVariant = 'error' | 'success';

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastListener = (toast: ToastItem) => void;

let listener: ToastListener | null = null;
let nextToastId = 0;

/** Use this utility from any client-side service or component. */
export const toast = {
  error(message: string) {
    publish(message, 'error');
  },
  success(message: string) {
    publish(message, 'success');
  },
};

function publish(message: string, variant: ToastVariant) {
  if (typeof window === 'undefined' || !message) return;

  listener?.({ id: ++nextToastId, message, variant });
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listener = (toast) => {
      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        setToasts((current) =>
          current.filter((item) => item.id !== toast.id),
        );
      }, 5_000);
    };

    return () => {
      listener = null;
    };
  }, []);

  return (
    <>
      {children}
      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((item) => (
          <div
            className={`pointer-events-auto flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition ${
              item.variant === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
            key={item.id}
            role="status"
          >
            <span>{item.message}</span>
            <button
              aria-label="Dismiss notification"
              className="-mr-1 shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
              onClick={() =>
                setToasts((current) =>
                  current.filter((toast) => toast.id !== item.id),
                )
              }
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
