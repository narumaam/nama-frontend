"use client";

/**
 * Tier 10A — Global Toast system.
 *
 * Usage from any client component:
 *   import { useToast } from '@/components/Toast'
 *   const toast = useToast()
 *   toast.success('Lead saved')
 *   toast.error('Could not send email')
 *   toast.info('AI is generating your itinerary…')
 *
 * Mounted once at the root via <ToastProvider> in dashboard/layout.tsx.
 * Toasts auto-dismiss after 4s; user can dismiss with X.
 *
 * Accessibility: each toast has role="status" + aria-live="polite" so
 * screen-readers announce them.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
  ttl: number;
}

interface ToastApi {
  success: (message: string, ttl?: number) => void;
  error: (message: string, ttl?: number) => void;
  info: (message: string, ttl?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail-open: if used outside provider, log + no-op so we never crash
    // a render. Devs see the warning in console.
    if (typeof window !== 'undefined') {
      console.warn('useToast called outside ToastProvider — no-op');
    }
    return {
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

let _nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, ttl: number = 4000) => {
      const id = _nextId++;
      setToasts((prev) => [...prev, { id, kind, message, ttl }]);
      window.setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  const api: ToastApi = {
    success: (m, ttl) => push('success', m, ttl ?? 4000),
    error: (m, ttl) => push('error', m, ttl ?? 6000), // errors stick longer
    info: (m, ttl) => push('info', m, ttl ?? 4000),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastEntry[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const t = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  const config = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      titleColor: 'text-emerald-900',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      border: 'border-red-200',
      bg: 'bg-red-50',
      titleColor: 'text-red-900',
    },
    info: {
      icon: Info,
      iconColor: 'text-[#14B8A6]',
      border: 'border-teal-200',
      bg: 'bg-teal-50',
      titleColor: 'text-slate-900',
    },
  }[toast.kind];

  const Icon = config.icon;

  return (
    <div
      role="status"
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border ${config.border} ${config.bg} transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <Icon size={18} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
      <p className={`text-sm font-medium ${config.titleColor} flex-1 leading-snug`}>
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
