import React from 'react';
import { CheckCircle2, Copy, Package, Printer, X } from 'lucide-react';
import type { HouseItem, LangCode, OrderItem, SiteSettings } from '../types/marketplace';
import { formatBDT, formatDateShort, getSafeImage } from '../utils/i18n';

export interface ResolvedOrderLineItem {
  title: string;
  image: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  category?: string;
}

export function resolveOrderItems(order: OrderItem, houses: HouseItem[]): ResolvedOrderLineItem[] {
  if (order.isCart && order.cartItems && order.cartItems.length > 0) {
    return order.cartItems.map((c) => {
      const h = houses.find((x) => x.id === c.id);
      const img = c.variation?.image || c.image || (h ? getSafeImage(h) : '') || '';
      const qty = Number(c.quantity) || 1;
      const unit = Number(c.price) || 0;
      return {
        title: c.title || h?.data?.title || 'Product',
        image: img,
        variantLabel: c.variation?.label || '',
        quantity: qty,
        unitPrice: unit,
        lineTotal: unit * qty,
        category: h?.data?.category || '',
      };
    });
  }

  const product = order.houseId ? houses.find((h) => h.id === order.houseId) : undefined;
  const img =
    order.selectedVariation?.image ||
    order.productImage ||
    (product ? getSafeImage(product) : '') ||
    '';
  const title =
    order.productTitle ||
    product?.data?.title ||
    (order.isCart ? `${order.cartItems?.length || 0} Cart Items` : 'Order Product');
  const qty = Number(order.quantity) || 1;
  const unit = Number(order.selectedVariation?.price) || (Number(order.productTotal || order.totalPrice) / qty) || 0;
  return [
    {
      title,
      image: img,
      variantLabel: order.selectedVariation?.label || '',
      quantity: qty,
      unitPrice: Math.round(unit),
      lineTotal: Number(order.productTotal) || Math.round(unit * qty),
      category: order.productCategory || product?.data?.category || '',
    },
  ];
}

export function buildOrderFullCopyText(
  order: OrderItem,
  houses: HouseItem[],
  lang: LangCode = 'bn'
): string {
  const items = resolveOrderItems(order, houses);
  const lines: string[] = [];
  lines.push(`🧾 ORDER #${order.orderId}`);
  lines.push(`📅 ${formatDateShort(order.createdAt, lang)} | 📌 Status: ${order.status}`);
  lines.push('────────────────────────');
  items.forEach((it, idx) => {
    const varPart = it.variantLabel ? ` [${it.variantLabel}]` : '';
    lines.push(
      `${items.length > 1 ? `${idx + 1}. ` : '📦 '}${it.title}${varPart} × ${it.quantity} — ৳${it.lineTotal}`
    );
    if (it.image) {
      lines.push(`🖼️ Photo: ${it.image}`);
    }
  });
  lines.push('────────────────────────');
  lines.push(`👤 Name: ${order.name}`);
  lines.push(`📞 Phone: ${order.phone}`);
  if (order.offerTargetNumber) {
    lines.push(`📡 Offer Number: ${order.offerTargetNumber}`);
  }
  if (order.message) {
    lines.push(`📍 Address: ${order.message}`);
  }
  if (order.reference) {
    lines.push(`🔖 Reference: ${order.reference}`);
  }
  lines.push(
    `💳 Payment: ${order.paymentMethod}${order.paymentProvider ? ` (${order.paymentProvider})` : ''}${
      order.senderNumber ? ` | Sender: ${order.senderNumber}` : ''
    }${order.trxId ? ` | TrxID: ${order.trxId}` : ''}`
  );
  if (order.deliveryFee && order.deliveryFee > 0) {
    lines.push(`🚚 Delivery Fee: ৳${order.deliveryFee}`);
  }
  if (order.promoDiscount && order.promoDiscount > 0) {
    lines.push(
      `🏷️ Discount${order.appliedPromoCode ? ` (${order.appliedPromoCode})` : ''}: -৳${order.promoDiscount}`
    );
  }
  lines.push(`💰 Grand Total: ৳${order.totalPrice}`);
  return lines.join('\n');
}

interface OrderPrintModalProps {
  order: OrderItem | null;
  houses: HouseItem[];
  siteSettings: SiteSettings;
  lang: LangCode;
  onClose: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrderPrintModal: React.FC<OrderPrintModalProps> = ({
  order,
  houses,
  siteSettings,
  lang,
  onClose,
  onNotify,
}) => {
  if (!order) return null;

  const items = resolveOrderItems(order, houses);
  const fullText = buildOrderFullCopyText(order, houses, lang);
  const subtotal = Number(order.productTotal) || items.reduce((s, i) => s + i.lineTotal, 0);
  const deliveryFee =
    typeof order.deliveryFee === 'number'
      ? order.deliveryFee
      : Math.max(0, Number(order.totalPrice) - subtotal + (Number(order.promoDiscount) || 0));

  const copyField = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      onNotify(
        lang === 'bn' ? `${label} কপি হয়েছে!` : `${label} copied!`,
        'success'
      );
    } catch {
      onNotify(lang === 'bn' ? 'কপি করা যায়নি।' : 'Copy failed.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5">
      <div className="printable-order-slip w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0b1b19] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-emerald-900 shadow-2xl">
        {/* Top Action Bar (hidden during print) */}
        <div className="no-print sticky top-0 z-10 px-4 sm:px-6 py-3.5 bg-slate-50/95 dark:bg-[#071312]/95 border-b border-slate-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span className="font-display font-bold text-sm">
              {lang === 'bn' ? 'স্মার্ট অর্ডার স্লিপ ও ডেমো প্রিন্ট' : 'Smart Order Invoice & Demo Print'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyField(fullText, lang === 'bn' ? 'অর্ডারের সব ডিটেলস' : 'Full order details')}
              className="h-9 px-3 rounded-xl bg-slate-200/80 dark:bg-emerald-950 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সব কপি' : 'Copy All'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-3.5 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-emerald-900 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Content */}
        <div className="p-5 sm:p-7 space-y-5">
          {/* Store Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-slate-300 dark:border-emerald-800 pb-4">
            <div className="flex items-center gap-3">
              <img
                src="/pwa-192x192.png"
                alt={siteSettings.appName || 'Amader Market'}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-emerald-900 shrink-0"
              />
              <div>
                <h2 className="font-display font-bold text-lg leading-tight">
                  {siteSettings.appName || 'Amader Market'}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {siteSettings.footerSubtitle || 'At Technology Ltd'}
                  {siteSettings.contactPhone ? ` · ${siteSettings.contactPhone}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-amber-300">
                <span>{order.status}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs font-mono-num font-bold">
                <span>#{order.orderId}</span>
                <button
                  type="button"
                  onClick={() => copyField(order.orderId, 'Order ID')}
                  className="no-print p-1 rounded hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-500"
                  title="Copy Order ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                {formatDateShort(order.createdAt, lang)}
              </div>
            </div>
          </div>

          {/* Customer & Shipping Box with Individual Copy Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'গ্রাহকের তথ্য' : 'Customer Info'}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>
                  <strong>{lang === 'bn' ? 'নাম:' : 'Name:'}</strong> {order.name}
                </span>
                <button
                  type="button"
                  onClick={() => copyField(order.name, lang === 'bn' ? 'নাম' : 'Name')}
                  className="no-print p-1 rounded hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-500 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-num">
                  <strong>{lang === 'bn' ? 'মোবাইল:' : 'Phone:'}</strong> {order.phone}
                </span>
                <button
                  type="button"
                  onClick={() => copyField(order.phone, lang === 'bn' ? 'মোবাইল নাম্বার' : 'Phone')}
                  className="no-print p-1 rounded hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-500 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              {order.offerTargetNumber && (
                <div className="flex items-center justify-between gap-2 text-sky-700 dark:text-sky-300 font-semibold">
                  <span className="font-mono-num">
                    <strong>{lang === 'bn' ? 'অফার নাম্বার:' : 'Offer No:'}</strong>{' '}
                    {order.offerTargetNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyField(
                        order.offerTargetNumber!,
                        lang === 'bn' ? 'অফার নাম্বার' : 'Offer Number'
                      )
                    }
                    className="no-print p-1 rounded hover:bg-slate-200 dark:hover:bg-emerald-900 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
              {order.message && (
                <div className="flex items-start justify-between gap-2">
                  <span>
                    <strong>{lang === 'bn' ? 'ঠিকানা:' : 'Address:'}</strong> {order.message}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyField(order.message!, lang === 'bn' ? 'ঠিকানা' : 'Address')}
                    className="no-print p-1 rounded hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-500 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'পেমেন্ট ও ডেলিভারি' : 'Payment & Delivery'}
              </div>
              <div>
                <strong>{lang === 'bn' ? 'মেথড:' : 'Method:'}</strong> {order.paymentMethod}
                {order.paymentProvider ? ` (${order.paymentProvider})` : ''}
              </div>
              {order.senderNumber && (
                <div className="flex items-center justify-between gap-2 font-mono-num">
                  <span>
                    <strong>{lang === 'bn' ? 'সেন্ডার:' : 'Sender:'}</strong> {order.senderNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyField(order.senderNumber!, 'Sender Number')}
                    className="no-print p-1 rounded hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-500 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
              {order.trxId && (
                <div className="flex items-center justify-between gap-2 font-mono-num">
                  <span>
                    <strong>TrxID:</strong> {order.trxId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyField(order.trxId!, 'TrxID')}
                    className="no-print p-1 rounded hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-500 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
              {order.deliveryArea && (
                <div>
                  <strong>{lang === 'bn' ? 'এরিয়া:' : 'Area:'}</strong>{' '}
                  {order.deliveryArea === 'dhaka'
                    ? lang === 'bn'
                      ? 'ঢাকার ভেতরে'
                      : 'Inside Dhaka'
                    : lang === 'bn'
                    ? 'ঢাকার বাহিরে'
                    : 'Outside Dhaka'}
                </div>
              )}
              {order.reference && (
                <div>
                  <strong>{lang === 'bn' ? 'রেফারেন্স:' : 'Reference:'}</strong> {order.reference}
                </div>
              )}
            </div>
          </div>

          {/* Ordered Products Table with Photos & Sizes */}
          <div className="rounded-xl border border-slate-200 dark:border-emerald-900 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-emerald-950/60 text-xs font-bold flex items-center justify-between">
              <span>{lang === 'bn' ? 'অর্ডারকৃত পণ্যের বিবরণ (ছবি ও সাইজসহ)' : 'Ordered Items (With Photo & Variant)'}</span>
              <span>{items.length} {lang === 'bn' ? 'আইটেম' : 'item(s)'}</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-emerald-950">
              {items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-snug">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {item.variantLabel && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-amber-300 font-bold">
                          {lang === 'bn' ? 'সাইজ/প্যাক:' : 'Size/Pack:'} {item.variantLabel}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-slate-500">{item.category}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono-num">
                      {formatBDT(item.unitPrice)} × {item.quantity}
                    </div>
                  </div>
                  <div className="text-right font-display font-bold text-sm font-mono-num shrink-0">
                    {formatBDT(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>{lang === 'bn' ? 'পণ্যের মূল্য' : 'Subtotal'}</span>
              <span className="font-mono-num">{formatBDT(subtotal)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{lang === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span>
                <span className="font-mono-num">{formatBDT(deliveryFee)}</span>
              </div>
            )}
            {order.promoDiscount && order.promoDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-amber-300 font-semibold">
                <span>
                  {lang === 'bn' ? 'প্রোমো ছাড়' : 'Promo Discount'}
                  {order.appliedPromoCode ? ` (${order.appliedPromoCode})` : ''}
                </span>
                <span className="font-mono-num">-{formatBDT(order.promoDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-emerald-900 font-display font-bold text-base">
              <span>{lang === 'bn' ? 'সর্বমোট বিল' : 'Grand Total'}</span>
              <span className="font-mono-num text-emerald-800 dark:text-amber-400">
                {formatBDT(order.totalPrice)}
              </span>
            </div>
          </div>

          {order.status === 'Delivered' && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'bn'
                  ? 'অর্ডার সফলভাবে ডেলিভারি সম্পন্ন হয়েছে ✅'
                  : 'Order delivered successfully ✅'}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-dashed border-slate-300 dark:border-emerald-800 text-center text-[11px] text-slate-500">
            {siteSettings.footerCredit || 'Amader Market Official Invoice'} · {lang === 'bn' ? 'ধন্যবাদ আমাদের সাথে থাকার জন্য' : 'Thank you for shopping with us'}
          </div>
        </div>
      </div>
    </div>
  );
};
