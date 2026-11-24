import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import type { LangCode } from '../types/marketplace';

export type ConfirmTone = 'danger' | 'warning' | 'primary';

export interface ConfirmOptions {
  title?: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async () => true;
  }
  return ctx;
};

interface ActiveDialogState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export const ConfirmProvider: React.FC<{
  lang: LangCode;
  children: React.ReactNode;
}> = ({ lang, children }) => {
  const [dialog, setDialog] = useState<ActiveDialogState | null>(null);
  const queueRef = useRef<ActiveDialogState[]>([]);

  const showNext = useCallback(() => {
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setDialog(next);
    } else {
      setDialog(null);
    }
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      const entry: ActiveDialogState = { options, resolve };
      setDialog((prev) => {
        if (prev) {
          queueRef.current.push(entry);
          return prev;
        }
        return entry;
      });
    });
  }, []);

  const handleDecision = useCallback(
    (accepted: boolean) => {
      if (!dialog) return;
      dialog.resolve(accepted);
      showNext();
    },
    [dialog, showNext]
  );

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDecision(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, handleDecision]);

  const tone: ConfirmTone = dialog?.options.tone || 'warning';

  const defaultTitle =
    lang === 'bn' ? 'অ্যাকশন কনফার্মেশন' : 'Confirm Action';
  const defaultConfirm =
    tone === 'danger'
      ? lang === 'bn'
        ? 'হ্যাঁ, নিশ্চিত করুন'
        : 'Yes, Proceed'
      : lang === 'bn'
      ? 'হ্যাঁ, করতে চাই'
      : 'Yes, Confirm';
  const defaultCancel = lang === 'bn' ? 'না, বাতিল' : 'Cancel';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
          onClick={() => handleDecision(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tone === 'danger'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      : tone === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-amber-400'
                  }`}
                >
                  {tone === 'danger' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : tone === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {dialog.options.title || defaultTitle}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDecision(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-emerald-950 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-2">
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {dialog.options.message}
              </p>
              {dialog.options.detail && (
                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950 text-xs text-slate-600 dark:text-slate-300 break-words">
                  {dialog.options.detail}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => handleDecision(false)}
                  className="flex-1 min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-emerald-900 bg-slate-50 dark:bg-[#071312] text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-emerald-950/60 transition-colors"
                >
                  {dialog.options.cancelText || defaultCancel}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(true)}
                  className={`flex-1 min-h-[42px] px-4 rounded-xl text-xs font-bold transition-colors ${
                    tone === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : tone === 'warning'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950'
                  }`}
                >
                  {dialog.options.confirmText || defaultConfirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
