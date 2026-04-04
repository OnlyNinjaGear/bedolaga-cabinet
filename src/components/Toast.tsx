/**
 * Toast.tsx — backwards-compatible wrapper around sonner.
 *
 * Existing callers use:
 *   const { showToast } = useToast();
 *   showToast({ type, message, title, duration, onClick });
 *
 * This module keeps that exact API intact by bridging to sonner's toast().
 * The actual <Toaster /> rendered in AppWithNavigator comes from
 * src/components/ui/sonner.tsx.
 */
import { type ReactNode } from 'react';
import { toast } from 'sonner';

// ─── Public types (unchanged, kept for import compatibility) ──────────────────

export interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  icon?: ReactNode;
  duration?: number;
  onClick?: () => void;
}

// ─── Standalone showToast helper ─────────────────────────────────────────────

function showToastFn(options: ToastOptions) {
  const { type = 'info', message, title, icon, duration = 5000, onClick } = options;

  const toastOptions = {
    description: title ? message : undefined,
    duration,
    icon: icon ?? undefined,
    action: onClick
      ? {
          label: '›',
          onClick,
        }
      : undefined,
  };

  const displayMessage = title ?? message;

  switch (type) {
    case 'success':
      toast.success(displayMessage, toastOptions);
      break;
    case 'error':
      toast.error(displayMessage, toastOptions);
      break;
    case 'warning':
      toast.warning(displayMessage, toastOptions);
      break;
    case 'info':
    default:
      toast.info(displayMessage, toastOptions);
      break;
  }
}

// ─── useToast hook (backwards-compatible) ────────────────────────────────────

/**
 * Drop-in replacement for the previous context-based useToast.
 * Returns { showToast } — no Provider required.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return { showToast: showToastFn };
}

// ─── ToastProvider (kept as no-op for backwards compat) ──────────────────────
// AppWithNavigator now renders <Toaster /> from src/components/ui/sonner.tsx.
// Any code that still wraps children in <ToastProvider> continues to work.

export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
