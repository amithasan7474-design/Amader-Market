import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, ShieldCheck, Tag, X } from 'lucide-react';
import type {
  CartItem,
  HouseItem,
  LangCode,
  ProductVariation,
  SiteSettings,
  UserProfile,
} from '../types/marketplace';
import {
  formatBDT,
  getEffectivePrice,
  getTelecomCategoryLabel,
  isTelecomDriveProduct,
  isVipSimProduct,
  tr,
} from '../utils/i18n';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  isCartCheckout: boolean;
  selectedHouse: HouseItem | null;
  selectedVariation: ProductVariation | null;
  initialQty: number;
  cart: CartItem[];
  cartDiscount: number;
  siteSettings: SiteSettings;
  userProfile: UserProfile | null;
  lang: LangCode;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSubmitOrder: (payload: {
    name: string;
    phone: string;
    message: string;
    reference: string;
    paymentMethod: 'COD' | 'Advance';
    paymentProvider: string;
    trxId: string;
    senderNumber: string;
    quantity: number;
    deliveryArea: 'dhaka' | 'outside';
    totalPrice: number;
    productTotal: number;
    profit: number;
    selectedVariation: ProductVariation | null;
    offerTargetNumber?: string;
    isTelecomOffer?: boolean;
    appliedPromoCode?: string;
    promoDiscount?: number;
  }) => Promise<void>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onClose,
  isCartCheckout,
  selectedHouse,
  selectedVariation,
  initialQty,
  cart,
  cartDiscount,
  siteSettings,
  userProfile,
  lang,
  onNotify,
  onSubmitOrder,
}) => {
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [qty, setQty] = useState(initialQty || 1);
  const [deliveryArea, setDeliveryArea] = useState<'dhaka' | 'outside'>('dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Advance'>('COD');
  const [paymentProvider, setPaymentProvider] = useState<'bKash' | 'Nagad'>('bKash');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [offerTargetNumber, setOfferTargetNumber] = useState('');
  const [confirmOfferNumber, setConfirmOfferNumber] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedProductPromo, setAppliedProductPromo] = useState<{
    code: string;
    discount: number;
    type: 'percent' | 'fixed';
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isVipSim = !isCartCheckout && isVipSimProduct(selectedHouse);
  const isTelecomOffer = !isCartCheckout && !isVipSim && isTelecomDriveProduct(selectedHouse);
  const needsCourierArea =
    !isCartCheckout &&
    Boolean(selectedHouse) &&
    (isVipSim || (selectedHouse?.data.productType !== 'digital' && !isTelecomOffer));
  const needsDeliveryAddress = isCartCheckout || needsCourierArea;

  const canCOD = isCartCheckout
    ? siteSettings.enableCOD !== false
    : selectedHouse?.data.productType !== 'digital' &&
      selectedHouse?.data.productType !== 'data_package' &&
      siteSettings.enableCOD !== false &&
      (selectedHouse?.data.paymentSettings?.method || 'both') !== 'advance';

  const canAdvance = isCartCheckout
    ? siteSettings.enableAdvance !== false
    : selectedHouse?.data.productType === 'digital' ||
      selectedHouse?.data.productType === 'data_package' ||
      (siteSettings.enableAdvance !== false &&
        (selectedHouse?.data.paymentSettings?.method || 'both') !== 'cod');

  useEffect(() => {
    if (open) {
      setName(userProfile?.name || '');
      setPhone(userProfile?.phone || '');
      setQty(initialQty || 1);
      setOfferTargetNumber('');
      setConfirmOfferNumber('');
      setPromoInput('');
      setAppliedProductPromo(null);
      if (!canCOD && canAdvance) setPaymentMethod('Advance');
      else setPaymentMethod('COD');
    }
  }, [open, userProfile, initialQty, canCOD, canAdvance, selectedHouse?.id]);

  if (!open) return null;

  const activeBkash =
    (!isCartCheckout && selectedHouse?.data.paymentSettings?.bkash) || siteSettings.advanceBkash || '';
  const activeBkashType =
    (!isCartCheckout && selectedHouse?.data.paymentSettings?.bkashType) ||
    siteSettings.advanceBkashType ||
    'Personal';
  const activeNagad =
    (!isCartCheckout && selectedHouse?.data.paymentSettings?.nagad) || siteSettings.advanceNagad || '';
  const activeNagadType =
    (!isCartCheckout && selectedHouse?.data.paymentSettings?.nagadType) ||
    siteSettings.advanceNagadType ||
    'Personal';

  const unitPrice = !isCartCheckout && selectedHouse
    ? selectedVariation
      ? Number(selectedVariation.price)
      : getEffectivePrice(selectedHouse, siteSettings)
    : 0;

  const rawProductTotal = isCartCheckout
    ? cart.reduce((s, i) => s + i.price * i.quantity, 0)
    : unitPrice * qty;

  const singlePromoDiscount =
    !isCartCheckout && appliedProductPromo
      ? appliedProductPromo.type === 'percent'
        ? Math.round((rawProductTotal * appliedProductPromo.discount) / 100)
        : Math.min(rawProductTotal, appliedProductPromo.discount)
      : 0;

  const activeDiscount = isCartCheckout ? cartDiscount : singlePromoDiscount;
  const productTotal = Math.max(0, rawProductTotal - activeDiscount);

  let deliveryFee = 0;
  if (needsCourierArea && selectedHouse) {
    const minQty = Number(selectedHouse.data.freeDeliveryMinQty) || 0;
    const minAmt = Number(selectedHouse.data.freeDeliveryMinAmount) || 0;
    const freeByQty = minQty > 0 && qty >= minQty;
    const freeByAmt = minAmt > 0 && productTotal >= minAmt;
    if (!freeByQty && !freeByAmt) {
      deliveryFee =
        deliveryArea === 'dhaka'
          ? Number(selectedHouse.data.deliveryChargeDhaka) || 0
          : Number(selectedHouse.data.deliveryChargeOutside) || 0;
    }
  }

  const grandTotal = productTotal + deliveryFee;
  const wholesale = Number(selectedHouse?.adminHiddenData?.wholesalePrice) || 0;
  const profit = !isCartCheckout && wholesale > 0 ? Math.max(0, (unitPrice - wholesale) * qty) : 0;

  const currentPayNum = paymentProvider === 'bKash' ? activeBkash : activeNagad;
  const currentPayType = paymentProvider === 'bKash' ? activeBkashType : activeNagadType;

  const cleanOfferNum = offerTargetNumber.replace(/\D/g, '');
  const cleanConfirmNum = confirmOfferNumber.replace(/\D/g, '');
  const offerDigitsValid = /^01[3-9]\d{8}$/.test(cleanOfferNum);
  const offerNumbersMatch = Boolean(cleanOfferNum && cleanOfferNum === cleanConfirmNum);

  const handleApplyPromoCode = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    const postPromo = selectedHouse?.data.promoCode;
    if (
      !isCartCheckout &&
      postPromo?.code &&
      postPromo.code.trim().toUpperCase() === code &&
      Number(postPromo.discount) > 0
    ) {
      setAppliedProductPromo({
        code: postPromo.code.trim().toUpperCase(),
        discount: Number(postPromo.discount),
        type: postPromo.type === 'fixed' ? 'fixed' : 'percent',
      });
      onNotify(lang === 'bn' ? 'প্রোমো কোড প্রয়োগ হয়েছে!' : 'Promo applied!', 'success');
      return;
    }

    const globalPromo = (siteSettings.coupons || []).find(
      (c) => (c.code || '').trim().toUpperCase() === code
    );
    if (globalPromo) {
      if (rawProductTotal < Number(globalPromo.minAmount || 0)) {
        onNotify(
          lang === 'bn'
            ? `এই কুপনের জন্য ন্যূনতম ${formatBDT(globalPromo.minAmount)} অর্ডার প্রয়োজন।`
            : `Minimum order ${formatBDT(globalPromo.minAmount)} required.`,
          'error'
        );
        return;
      }
      setAppliedProductPromo({
        code: globalPromo.code.trim().toUpperCase(),
        discount: Number(globalPromo.discount) || 0,
        type: globalPromo.type === 'fixed' ? 'fixed' : 'percent',
      });
      onNotify(lang === 'bn' ? 'কুপন কোড প্রয়োগ হয়েছে!' : 'Coupon applied!', 'success');
      return;
    }

    onNotify(lang === 'bn' ? 'সঠিক প্রোমো / কুপন কোড নয়!' : 'Invalid promo code!', 'error');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      onNotify(lang === 'bn' ? 'নাম এবং মোবাইল নাম্বার আবশ্যক।' : 'Name and mobile number are required.', 'error');
      return;
    }
    if (isTelecomOffer) {
      if (!offerDigitsValid) {
        onNotify(
          lang === 'bn'
            ? 'সঠিক ১১ ডিজিটের অফার নেওয়ার মোবাইল নাম্বার লিখুন (যেমন: 017XXXXXXXX)।'
            : 'Enter a valid 11-digit recipient mobile number.',
          'error'
        );
        return;
      }
      if (!offerNumbersMatch) {
        onNotify(
          lang === 'bn'
            ? 'দুটি অফার নাম্বার এক নয়! অনুগ্রহ করে সঠিকভাবে মিলিয়ে লিখুন।'
            : 'Offer mobile numbers do not match.',
          'error'
        );
        return;
      }
    }
    if (needsDeliveryAddress && !address.trim()) {
      onNotify(
        lang === 'bn'
          ? 'ডেলিভারির জন্য আপনার পূর্ণ ঠিকানা লিখুন।'
          : 'Full delivery address is required.',
        'error'
      );
      return;
    }
    if (paymentMethod === 'Advance' && (!trxId.trim() || !senderNumber.trim())) {
      onNotify(
        lang === 'bn' ? 'অগ্রিম পেমেন্টের TrxID এবং সেন্ডার নাম্বার দিন।' : 'Enter TrxID and sender number.',
        'error'
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitOrder({
        name: name.trim(),
        phone: phone.trim(),
        message: address.trim(),
        reference: reference.trim(),
        paymentMethod,
        paymentProvider: paymentMethod === 'Advance' ? paymentProvider : '',
        trxId: trxId.trim(),
        senderNumber: senderNumber.trim(),
        quantity: qty,
        deliveryArea,
        totalPrice: grandTotal,
        productTotal,
        profit,
        selectedVariation,
        offerTargetNumber: isTelecomOffer ? cleanOfferNum : undefined,
        isTelecomOffer: isTelecomOffer || undefined,
        appliedPromoCode: appliedProductPromo?.code || undefined,
        promoDiscount: activeDiscount > 0 ? activeDiscount : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-950 shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-[#0b1b19] px-5 py-4 border-b border-slate-200 dark:border-emerald-950 flex items-center justify-between z-10">
          <h2 className="font-display text-lg font-bold">
            {lang === 'bn' ? 'অর্ডার কনফার্মেশন' : 'Order Checkout'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-emerald-950"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950 space-y-1.5 text-sm">
            <div className="font-semibold">
              {isCartCheckout
                ? `${cart.length} ${lang === 'bn' ? 'টি পণ্য (কার্ট)' : 'Cart Items'}`
                : selectedHouse?.data.title}
            </div>
            {!isCartCheckout && (selectedHouse?.data.telecomCompany || selectedHouse?.data.offerValidity) && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                {selectedHouse.data.telecomCompany && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60">
                    {getTelecomCategoryLabel(selectedHouse.data.telecomCompany, lang)}
                  </span>
                )}
                {selectedHouse.data.offerValidity && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    {lang === 'bn' ? 'মেয়াদ:' : 'Validity:'} {selectedHouse.data.offerValidity}
                  </span>
                )}
              </div>
            )}
            {!isCartCheckout && selectedVariation && (
              <div className="text-xs text-slate-500">{selectedVariation.label}</div>
            )}
            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>{lang === 'bn' ? 'পণ্যের মূল্য' : 'Product Total'}</span>
              <span className="font-mono-num">{formatBDT(rawProductTotal)}</span>
            </div>
            {activeDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 dark:text-amber-300 font-semibold">
                <span>
                  {lang === 'bn' ? 'কুপন / প্রোমো ছাড়' : 'Promo Discount'}
                  {appliedProductPromo?.code ? ` (${appliedProductPromo.code})` : ''}
                </span>
                <span className="font-mono-num">-{formatBDT(activeDiscount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>{tr(lang, 'delivery')}</span>
                <span className="font-mono-num">{formatBDT(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-display font-bold text-base pt-1.5 border-t border-slate-200 dark:border-emerald-950">
              <span>{lang === 'bn' ? 'সর্বমোট' : 'Grand Total'}</span>
              <span className="font-mono-num text-emerald-800 dark:text-amber-400">
                {formatBDT(grandTotal)}
              </span>
            </div>
          </div>

          {/* Dedicated Telecom / Drive Offer Target Number Section */}
          {isTelecomOffer && (
            <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border-2 border-sky-400/70 dark:border-sky-600/60 space-y-3">
              <div className="flex items-start gap-2 text-xs text-sky-950 dark:text-sky-100 leading-relaxed font-semibold">
                <AlertCircle className="w-4 h-4 text-sky-700 dark:text-sky-300 shrink-0 mt-0.5" />
                <span>
                  {lang === 'bn'
                    ? '⚠️ বিশেষ নির্দেশনা (ড্রাইভ / অফার অর্ডার): যে ১১ ডিজিটের মোবাইল নাম্বারে অফারটি নিতে চান সেটি নিচে দুইবার সঠিকভাবে লিখুন। ভুল নাম্বারে অফার চলে গেলে কর্তৃপক্ষ দায়ী থাকবে না।'
                    : '⚠️ Notice: Enter the exact 11-digit mobile number twice to receive this telecom drive/offer package.'}
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1 text-sky-900 dark:text-sky-200">
                    {lang === 'bn'
                      ? 'অফার নেওয়ার মোবাইল নাম্বার (১১ ডিজিট) *'
                      : 'Offer Recipient Number (11 Digits) *'}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={14}
                    value={offerTargetNumber}
                    onChange={(e) => setOfferTargetNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#071312] border border-sky-300 dark:border-sky-800 text-sm font-mono-num font-bold tracking-wide"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-sky-900 dark:text-sky-200">
                    {lang === 'bn'
                      ? 'নাম্বারটি পুনরায় লিখুন (নিশ্চিত করুন) *'
                      : 'Re-enter Offer Number (Confirm) *'}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={14}
                    value={confirmOfferNumber}
                    onChange={(e) => setConfirmOfferNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#071312] border border-sky-300 dark:border-sky-800 text-sm font-mono-num font-bold tracking-wide"
                  />
                </div>
                {cleanOfferNum.length > 0 && (
                  <div
                    className={`text-[11px] font-bold ${
                      offerDigitsValid && offerNumbersMatch
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {!offerDigitsValid
                      ? lang === 'bn'
                        ? 'সঠিক ১১ ডিজিটের নাম্বার দিন (যেমন: 01712345678)'
                        : 'Enter a valid 11-digit BD number'
                      : !offerNumbersMatch
                      ? lang === 'bn'
                        ? 'উপরের দুটি নাম্বার এখনো এক হয়নি!'
                        : 'Numbers do not match yet'
                      : lang === 'bn'
                      ? `✅ অফার নাম্বার নিশ্চিত হয়েছে: ${cleanOfferNum}`
                      : `✅ Confirmed number: ${cleanOfferNum}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Promo / Coupon Input for Single Product / Offer */}
          {!isCartCheckout && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === 'bn' ? 'প্রোমো / কুপন কোড (যদি থাকে)' : 'Promo / Coupon Code'}</span>
                </span>
                {selectedHouse?.data.promoCode?.code && !appliedProductPromo && (
                  <button
                    type="button"
                    onClick={() => setPromoInput(selectedHouse.data.promoCode!.code)}
                    className="text-[11px] font-mono-num font-bold text-emerald-700 dark:text-amber-300 underline"
                  >
                    {lang === 'bn' ? 'কোড:' : 'Code:'} {selectedHouse.data.promoCode.code}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={lang === 'bn' ? 'যেমন: DRIVE50' : 'Enter promo code'}
                  className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-xs font-mono-num uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyPromoCode}
                  className="h-9 px-3.5 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold shrink-0"
                >
                  {lang === 'bn' ? 'প্রয়োগ করুন' : 'Apply'}
                </button>
              </div>
            </div>
          )}

          {!isCartCheckout && (
            <div className={`grid gap-3 ${needsCourierArea ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {lang === 'bn' ? 'পরিমাণ' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min={selectedHouse?.data.moq || 1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(selectedHouse?.data.moq || 1, Number(e.target.value) || 1))}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                />
              </div>
              {needsCourierArea && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    {lang === 'bn' ? 'ডেলিভারি এরিয়া' : 'Delivery Area'}
                  </label>
                  <select
                    value={deliveryArea}
                    onChange={(e) => setDeliveryArea(e.target.value as 'dhaka' | 'outside')}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
                  >
                    <option value="dhaka">{tr(lang, 'inside_dhaka')}</option>
                    <option value="outside">{tr(lang, 'outside_dhaka')}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'bn' ? 'মোবাইল নাম্বার *' : 'Mobile Number *'}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
            </div>
          </div>

          {needsDeliveryAddress ? (
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'bn' ? 'পূর্ণ ডেলিভারি ঠিকানা *' : 'Full Delivery Address *'}
              </label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={
                  isVipSim
                    ? lang === 'bn'
                      ? 'সিম কুরিয়ারে পাঠানোর পূর্ণ ঠিকানা (বাড়ি, রোড, থানা, জেলা)...'
                      : 'Full courier address for SIM delivery...'
                    : lang === 'bn'
                    ? 'বাড়ি, রোড, এলাকা, জেলা লিখুন...'
                    : 'Full delivery address...'
                }
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              />
            </div>
          ) : (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
              {isTelecomOffer
                ? lang === 'bn'
                  ? '✓ এটি ড্রাইভ / ডাটা প্যাকেজ অফার — কোনো ডেলিভারি এড্রেস বা কুরিয়ার চার্জ লাগবে না।'
                  : '✓ Telecom / Data offer — no shipping address or courier charge required.'
                : lang === 'bn'
                ? '✓ এটি ডিজিটাল প্রোডাক্ট — ডেলিভারি এড্রেস বা কুরিয়ার চার্জ প্রযোজ্য নয়।'
                : '✓ Digital delivery — no physical address required.'}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              {lang === 'bn' ? 'রেফারেন্স (ঐচ্ছিক)' : 'Reference (Optional)'}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
            />
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-xs font-semibold mb-2">
              {lang === 'bn' ? 'পেমেন্ট মেথড নির্বাচন করুন' : 'Payment Method'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {canCOD && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`min-h-[48px] p-3 rounded-xl border text-left transition-colors ${
                    paymentMethod === 'COD'
                      ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:border-amber-400'
                      : 'border-slate-200 dark:border-emerald-900'
                  }`}
                >
                  <div className="text-xs font-bold">{tr(lang, 'cod')}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'bn' ? 'পণ্য হাতে পেয়ে টাকা দিন' : 'Pay on delivery'}
                  </div>
                </button>
              )}

              {canAdvance && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Advance')}
                  className={`min-h-[48px] p-3 rounded-xl border text-left transition-colors ${
                    paymentMethod === 'Advance'
                      ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:border-amber-400'
                      : 'border-slate-200 dark:border-emerald-900'
                  }`}
                >
                  <div className="text-xs font-bold">{lang === 'bn' ? 'অগ্রিম পেমেন্ট' : 'Advance Pay'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">bKash / Nagad</div>
                </button>
              )}
            </div>
          </div>

          {paymentMethod === 'Advance' && (
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
              <div className="flex gap-2">
                {(['bKash', 'Nagad'] as const).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setPaymentProvider(prov)}
                    className={`flex-1 h-10 rounded-lg text-xs font-bold border ${
                      paymentProvider === prov
                        ? 'bg-emerald-800 text-white border-emerald-800 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500'
                        : 'bg-white dark:bg-[#071312] border-slate-200 dark:border-emerald-900'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>

              {currentPayNum && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-[#071312] border border-slate-200 dark:border-emerald-900">
                  <div className="text-xs">
                    <div className="text-slate-500">
                      {paymentProvider} ({currentPayType})
                    </div>
                    <div className="font-mono-num font-bold text-sm">{currentPayNum}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentPayNum);
                      onNotify(lang === 'bn' ? 'নাম্বার কপি হয়েছে!' : 'Number copied!', 'success');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-emerald-950 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'কপি' : 'Copy'}</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder={lang === 'bn' ? 'সেন্ডার নাম্বার' : 'Sender Number'}
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                />
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="TrxID"
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <span>{lang === 'bn' ? 'অর্ডার জমা হচ্ছে...' : 'Submitting...'}</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{tr(lang, 'confirm_order')}</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {lang === 'bn'
                ? 'সরাসরি লাইভ মার্কেটপ্লেস সার্ভারে সংযুক্ত'
                : 'Synced directly with live marketplace server'}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
