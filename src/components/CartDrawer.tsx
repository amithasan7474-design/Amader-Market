import React, { useState } from 'react';
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import type { CartItem, Coupon, LangCode, SiteSettings } from '../types/marketplace';
import { formatBDT, tr } from '../utils/i18n';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  lang: LangCode;
  siteSettings: SiteSettings;
  appliedPromo: Coupon | null;
  discountAmount: number;
  onUpdateQty: (idx: number, delta: number) => void;
  onRemoveItem: (idx: number) => void;
  onApplyPromo: (code: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  cart,
  lang,
  appliedPromo,
  discountAmount,
  onUpdateQty,
  onRemoveItem,
  onApplyPromo,
  onCheckout,
}) => {
  const [promoCode, setPromoCode] = useState('');

  if (!open) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#0b1b19] h-full flex flex-col shadow-2xl z-10">
        <div className="h-16 px-5 border-b border-slate-200 dark:border-emerald-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold">
              {tr(lang, 'cart')} ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close Cart"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-emerald-950"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
              <ShoppingBag className="w-12 h-12 opacity-25 mb-3" />
              <p className="text-sm font-medium">{tr(lang, 'cart_empty')}</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-emerald-950 shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold line-clamp-1">{item.title}</div>
                  {item.variation && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.variation.label}
                    </div>
                  )}
                  <div className="mt-1 font-display font-bold text-sm text-emerald-800 dark:text-amber-400 tabular-nums">
                    {formatBDT(item.price)}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center border border-slate-200 dark:border-emerald-900 rounded-lg bg-white dark:bg-[#0b1b19]">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(idx, -1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono-num font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(idx, 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      aria-label="Remove item"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-emerald-950 space-y-3 bg-white dark:bg-[#0b1b19]">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder={lang === 'bn' ? 'প্রোমো কোড লিখুন' : 'Promo code'}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => onApplyPromo(promoCode)}
                className="px-4 h-10 rounded-xl bg-slate-900 dark:bg-emerald-900 text-white text-xs font-semibold"
              >
                {lang === 'bn' ? 'প্রয়োগ' : 'Apply'}
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                <span className="font-mono-num">{formatBDT(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-amber-400">
                  <span>
                    {lang === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}
                    {appliedPromo ? ` (${appliedPromo.code})` : ''}
                  </span>
                  <span className="font-mono-num">-{formatBDT(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-base font-bold pt-1 border-t border-slate-200 dark:border-emerald-950">
                <span>{lang === 'bn' ? 'সর্বমোট' : 'Total'}</span>
                <span className="font-mono-num text-emerald-800 dark:text-amber-400">
                  {formatBDT(total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="w-full min-h-[48px] rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm transition-colors"
            >
              {tr(lang, 'checkout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
