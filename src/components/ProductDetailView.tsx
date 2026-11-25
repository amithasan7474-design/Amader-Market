import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Heart,
  KeyRound,
  MessageCircle,
  Package,
  Share2,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { normalizeExternalUrl } from '../utils/imageUpload';
import type {
  HouseItem,
  LangCode,
  OrderItem,
  ProductVariation,
  SiteSettings,
  UserProfile,
} from '../types/marketplace';
import {
  buildProductShareText,
  formatBDT,
  formatDateShort,
  getAllImages,
  getDisplayOwnerName,
  getEffectivePrice,
  getOriginalPrice,
  getParsedReviews,
  getStoreLogoUrl,
  getTelecomCategoryLabel,
  getYouTubeEmbed,
  isCampaign11Active,
  isFlashActive,
  isTelecomDriveProduct,
  openExternalUrl,
  shareMarketplaceUrl,
  tr,
} from '../utils/i18n';
import { RoleBadge } from './RoleBadge';

interface ProductDetailViewProps {
  house: HouseItem;
  siteSettings: SiteSettings;
  users: UserProfile[];
  orders: OrderItem[];
  currentUserUid?: string | null;
  isAdminOrPartner: boolean;
  isMainSuperAdmin?: boolean;
  lang: LangCode;
  isWishlisted: boolean;
  onBack: () => void;
  onOpenStore: (sellerId: string) => void;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (house: HouseItem, variation: ProductVariation | null) => void;
  onOrderNow: (house: HouseItem, variation: ProductVariation | null, qty: number) => void;
  onChatWithSeller: (sellerId: string) => void;
  onSubmitReview: (houseId: string, rating: number, comment: string) => Promise<void>;
  onDeleteReview: (houseId: string, reviewId: string | number) => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  house,
  siteSettings,
  users,
  orders,
  currentUserUid,
  isAdminOrPartner,
  isMainSuperAdmin = false,
  lang,
  isWishlisted,
  onBack,
  onOpenStore,
  onToggleWishlist,
  onAddToCart,
  onOrderNow,
  onChatWithSeller,
  onSubmitReview,
  onDeleteReview,
  onNotify,
}) => {
  const images = getAllImages(house);
  const variations = house.data.variations || [];
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [selectedVarIdx, setSelectedVarIdx] = useState(0);
  const [qty, setQty] = useState(Number(house.data.moq) || 1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const activeVariation = variations.length > 0 ? variations[selectedVarIdx] ?? variations[0] : null;
  const handleSelectVariation = (idx: number) => {
    setSelectedVarIdx(idx);
    const chosen = variations[idx];
    if (chosen?.image) {
      const foundIdx = images.indexOf(chosen.image);
      if (foundIdx >= 0) setActiveImgIdx(foundIdx);
    }
  };
  const now = Date.now();
  const effectivePrice = getEffectivePrice(house, siteSettings, selectedVarIdx, now);
  const originalPrice = getOriginalPrice(house, selectedVarIdx);
  const oldPrice = Number(house.data.oldPrice) || (effectivePrice < originalPrice ? originalPrice : 0);

  const sellerId = house.ownerId || house.data.ownerId || 'admin';
  const sellerUser = users.find((u) => u.uid === sellerId);
  const sellerName = getDisplayOwnerName(house, users);
  const sellerLogo = getStoreLogoUrl(house, users);
  const reviews = getParsedReviews(house);
  const videoEmbeds = (house.data.videoLinks || [])
    .map((v) => ({ title: v.title, embed: getYouTubeEmbed(v.url) }))
    .filter((v) => Boolean(v.embed));

  const isDigital = house.data.productType === 'digital';
  const hasPurchased = Boolean(
    currentUserUid &&
      orders.some(
        (o) =>
          o.userId === currentUserUid &&
          o.status === 'Delivered' &&
          (o.houseId === house.id || o.cartItems?.some((c) => c.id === house.id))
      )
  );
  const isProductOwner = Boolean(
    currentUserUid && (house.ownerId === currentUserUid || house.data?.ownerId === currentUserUid)
  );
  const canSeeDigitalSecret = Boolean(isMainSuperAdmin || isProductOwner || hasPurchased);

  const handleShare = () => {
    const { url, bodyText, fullCopyText } = buildProductShareText(
      house,
      siteSettings,
      users,
      lang
    );
    shareMarketplaceUrl({
      url,
      title: house.data.title,
      text: bodyText,
      copyText: fullCopyText,
      onCopied: () =>
        onNotify(
          lang === 'bn'
            ? 'প্রোডাক্টের বিস্তারিত ও শর্ট লিংক কপি হয়েছে!'
            : 'Product details & short link copied!',
          'success'
        ),
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    setSubmittingReview(true);
    try {
      await onSubmitReview(house.id, reviewRating, reviewText.trim());
      setReviewText('');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-8">
      {/* Top Action Strip */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{tr(lang, 'back')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleWishlist(house.id)}
            className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 ${
              isWishlisted
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white dark:bg-[#0d1f1d] border-slate-200 dark:border-emerald-950'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            <span>{lang === 'bn' ? 'সেভ' : 'Save'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'bn' ? 'শেয়ার' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Contiguous Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Gallery */}
        <div className="lg:col-span-6 space-y-3">
          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 flex items-center justify-center">
            {images[activeImgIdx] ? (
              <img
                src={images[activeImgIdx]}
                alt={house.data.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-8">
                <Package className="w-14 h-14 mb-2 opacity-40" />
                <span className="text-xs">{house.data.category}</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {images.map((src, idx) => {
                const matchedVarIdx = variations.findIndex((v) => v.image === src);
                const matchedVar = matchedVarIdx >= 0 ? variations[matchedVarIdx] : null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImgIdx(idx);
                      if (matchedVarIdx >= 0) setSelectedVarIdx(matchedVarIdx);
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-white dark:bg-[#071312] ${
                      idx === activeImgIdx
                        ? 'border-emerald-700 dark:border-amber-400 ring-2 ring-emerald-500/30 dark:ring-amber-400/30'
                        : 'border-slate-200 dark:border-emerald-950 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt={matchedVar?.label || ''} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    {matchedVar?.label && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/65 text-white text-[9px] font-bold px-1 py-0.5 truncate text-center">
                        {matchedVar.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-6 bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 sm:p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{house.data.category}</span>
              {house.data.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{house.data.location}</span>
                </>
              )}
              {(isCampaign11Active(house, siteSettings, now) || isFlashActive(house, now)) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {isCampaign11Active(house, siteSettings, now) ? '11.11 Campaign' : 'Flash Sale'}
                  </span>
                </>
              )}
              {house.data.telecomCompany && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 font-semibold">
                    {getTelecomCategoryLabel(house.data.telecomCompany, lang)}
                  </span>
                </>
              )}
              {house.data.offerValidity && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold">
                    {lang === 'bn' ? 'মেয়াদ:' : 'Validity:'} {house.data.offerValidity}
                  </span>
                </>
              )}
            </div>

            <h1 className="mt-1.5 font-display text-xl sm:text-2xl font-bold leading-snug">
              {house.data.title}
            </h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-800 dark:text-amber-400 tabular-nums">
                {formatBDT(effectivePrice)}
              </span>
              {oldPrice > effectivePrice && (
                <span className="text-sm text-slate-400 line-through tabular-nums">
                  {formatBDT(oldPrice)}
                </span>
              )}
            </div>

            {house.data.promoCode?.code && Number(house.data.promoCode.discount) > 0 && (
              <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                  <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    {lang === 'bn' ? 'স্পেশাল কুপন কোড:' : 'Promo Code:'}{' '}
                    <strong className="font-mono-num">{house.data.promoCode.code}</strong> (
                    {house.data.promoCode.discount}
                    {house.data.promoCode.type === 'percent' ? '%' : '৳'} {lang === 'bn' ? 'ছাড়' : 'OFF'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(house.data.promoCode!.code);
                    onNotify(lang === 'bn' ? 'কুপন কোড কপি হয়েছে!' : 'Coupon copied!', 'success');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0"
                >
                  {lang === 'bn' ? 'কপি' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Variations (with optional Size / Weight Photo Preview) */}
          {variations.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {house.data.productType === 'clothing_size'
                  ? lang === 'bn'
                    ? 'সাইজ / কালার নির্বাচন করুন'
                    : 'Select Size / Variant'
                  : house.data.productType === 'liquid_weight'
                  ? lang === 'bn'
                    ? 'পরিমাণ / ওজন নির্বাচন করুন'
                    : 'Select Weight / Volume'
                  : lang === 'bn'
                  ? 'ভ্যারিয়েশন নির্বাচন করুন'
                  : 'Select Option'}
              </div>
              <div className="flex flex-wrap gap-2">
                {variations.map((v, idx) => {
                  const selected = idx === selectedVarIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectVariation(idx)}
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-all ${
                        selected
                          ? 'bg-emerald-800 text-white border-emerald-800 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-[#071312] border-slate-200 dark:border-emerald-900 hover:border-emerald-600/50'
                      }`}
                    >
                      {v.image && (
                        <img
                          src={v.image}
                          alt={v.label}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg object-cover border border-white/40 shrink-0"
                        />
                      )}
                      <span>
                        {v.label} · {formatBDT(v.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery & MOQ Summary (shown for physical & VIP SIM; hidden for digital & no-address telecom offers) */}
          {!isDigital && !isTelecomDriveProduct(house) && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <Truck className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>{tr(lang, 'delivery')}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400 font-mono-num">
                <span>
                  {tr(lang, 'inside_dhaka')}: {formatBDT(house.data.deliveryChargeDhaka || 0)}
                </span>
                <span>
                  {tr(lang, 'outside_dhaka')}: {formatBDT(house.data.deliveryChargeOutside || 0)}
                </span>
              </div>
              {Number(house.data.moq) > 1 && (
                <div className="text-amber-700 dark:text-amber-400 font-medium">
                  {lang === 'bn'
                    ? `সর্বনিম্ন অর্ডার: ${house.data.moq} পিস`
                    : `Minimum order: ${house.data.moq} pcs`}
                </div>
              )}
            </div>
          )}

          {/* Quantity & Action Buttons */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                {lang === 'bn' ? 'পরিমাণ:' : 'Qty:'}
              </span>
              <input
                type="number"
                min={Number(house.data.moq) || 1}
                value={qty}
                onChange={(e) => setQty(Math.max(Number(house.data.moq) || 1, Number(e.target.value) || 1))}
                className="w-24 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onOrderNow(house, activeVariation, qty)}
                className="min-h-[48px] px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{tr(lang, 'order_now')}</span>
              </button>

              <button
                type="button"
                onClick={() => onAddToCart(house, activeVariation)}
                className="min-h-[48px] px-5 rounded-xl border border-emerald-800 dark:border-amber-400 text-emerald-800 dark:text-amber-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{tr(lang, 'add_cart')}</span>
              </button>
            </div>
          </div>

          {/* Seller / Store Card */}
          <div className="pt-4 border-t border-slate-200 dark:border-emerald-950 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenStore(sellerId)}
              className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
            >
              {sellerLogo ? (
                <img
                  src={sellerLogo}
                  alt={sellerName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-emerald-900 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-800 dark:text-amber-300 shrink-0">
                  <Store className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{sellerName}</span>
                  {sellerUser && (
                    <RoleBadge
                      role={sellerUser.role || 'seller'}
                      email={sellerUser.email}
                      lang={lang}
                    />
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'স্টোর ভিজিট করুন' : 'Visit Store'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChatWithSeller(sellerId)}
              className="min-h-[40px] px-3.5 rounded-xl bg-slate-100 dark:bg-emerald-950/70 hover:bg-slate-200 dark:hover:bg-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{tr(lang, 'chat_seller')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Digital Unlocked Content (for Buyers / Admins) */}
      {isDigital &&
        canSeeDigitalSecret &&
        (() => {
          const allLinksRaw = [
            ...(house.adminHiddenData?.digitalLinks || []),
            ...(house.data.digitalLinks || []),
          ];
          const seenUrls = new Set<string>();
          const allLinks = allLinksRaw.filter((dl) => {
            const u = (dl.url || '').trim();
            if (!u || seenUrls.has(u)) return false;
            seenUrls.add(u);
            return true;
          });

          const allTextsRaw = [
            ...(house.adminHiddenData?.digitalTexts || []),
            ...(Array.isArray(house.data.digitalTexts) ? house.data.digitalTexts : []),
          ];
          const allTexts = allTextsRaw
            .map((t) =>
              typeof t === 'string'
                ? { title: '', text: t }
                : { title: t.title || '', text: t.text || '' }
            )
            .filter((t) => t.text.trim());

          const secretStr = (
            house.adminHiddenData?.digitalSecret ||
            house.data.secretInfo ||
            ''
          ).trim();

          if (allLinks.length === 0 && allTexts.length === 0 && !secretStr) {
            return null;
          }

          const secretIsUrl = /^https?:\/\//i.test(secretStr);

          return (
            <section className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-5 space-y-3">
              <div className="flex items-center gap-2 font-display font-bold text-base text-emerald-900 dark:text-amber-300">
                <KeyRound className="w-5 h-5" />
                <span>
                  {lang === 'bn' ? 'আনলক করা ডিজিটাল কন্টেন্ট' : 'Unlocked Digital Content'}
                </span>
              </div>

              {allLinks.length > 0 && (
                <div className="space-y-2">
                  {allLinks.map((dl, idx) => {
                    const linkName =
                      (dl.title || dl.label || '').trim() ||
                      (lang === 'bn'
                        ? `ডাউনলোড / অ্যাক্সেস লিংক #${idx + 1}`
                        : `Open Link #${idx + 1}`);
                    const targetUrl = normalizeExternalUrl(dl.url);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#071312] border border-emerald-200 dark:border-emerald-900 hover:border-emerald-600 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => openExternalUrl(targetUrl)}
                          className="flex-1 min-w-0 flex items-center justify-between gap-3 px-2 py-1 text-left text-sm font-bold text-emerald-800 dark:text-amber-300 hover:underline"
                        >
                          <span className="truncate">{linkName}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold shrink-0 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                            <Download className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'প্রবেশ করুন' : 'Open'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(dl.url);
                            onNotify(lang === 'bn' ? 'লিংক কপি হয়েছে!' : 'Link copied!', 'success');
                          }}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-emerald-950 text-slate-600 dark:text-slate-300 shrink-0"
                          title="Copy URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {allTexts.length > 0 && (
                <div className="space-y-2">
                  {allTexts.map((dt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#071312] border border-sky-200 dark:border-sky-900/60"
                    >
                      <div className="min-w-0">
                        {dt.title && (
                          <div className="text-[11px] font-semibold text-slate-500">
                            {dt.title}
                          </div>
                        )}
                        <code className="text-xs font-mono-num break-all font-bold text-slate-800 dark:text-amber-300">
                          {dt.text}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(dt.text);
                          onNotify(lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!', 'success');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'কপি' : 'Copy'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {secretStr && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#071312] border border-emerald-200 dark:border-emerald-900">
                  {secretIsUrl ? (
                    <button
                      type="button"
                      onClick={() => openExternalUrl(secretStr)}
                      className="text-left text-xs font-semibold text-emerald-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1.5 break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>{secretStr}</span>
                    </button>
                  ) : (
                    <code className="text-xs font-mono-num break-all">{secretStr}</code>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(secretStr);
                      onNotify(lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!', 'success');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'কপি' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </section>
          );
        })()}

      {/* Description & Video Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">
            {lang === 'bn' ? 'বিস্তারিত বিবরণ' : 'Product Description'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
            {house.data.description || (lang === 'bn' ? 'কোনো বিবরণ যুক্ত করা হয়নি।' : 'No description provided.')}
          </p>

          {videoEmbeds.map((v, i) => (
            <div key={i} className="pt-3">
              {v.title && <div className="text-xs font-semibold mb-2">{v.title}</div>}
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={v.embed}
                  title={v.title || 'Video Review'}
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ))}
        </section>

        {/* Reviews */}
        <section className="lg:col-span-5 bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">
            {lang === 'bn' ? `কাস্টমার রিভিউ (${reviews.length})` : `Customer Reviews (${reviews.length})`}
          </h2>

          <form onSubmit={handleReviewSubmit} className="space-y-2.5 pb-4 border-b border-slate-200 dark:border-emerald-950">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= reviewRating
                        ? 'text-amber-500 fill-current'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={lang === 'bn' ? 'আপনার মতামত লিখুন...' : 'Write your review...'}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
            />
            <button
              type="submit"
              disabled={submittingReview || !reviewText.trim()}
              className="min-h-[40px] px-4 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold disabled:opacity-50"
            >
              {lang === 'bn' ? 'রিভিউ জমা দিন' : 'Submit Review'}
            </button>
          </form>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'এখনো কোনো রিভিউ নেই।' : 'No reviews yet.'}
              </p>
            ) : (
              reviews.map((rev, idx) => (
                <div
                  key={rev.reviewId ?? idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/70 dark:border-emerald-950"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">{rev.userName || 'Customer'}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-500 font-mono-num">
                        ★ {rev.rating || 5}
                      </span>
                      {(isAdminOrPartner || (currentUserUid && rev.userId === currentUserUid)) &&
                        rev.reviewId !== undefined && (
                          <button
                            type="button"
                            onClick={() => onDeleteReview(house.id, rev.reviewId!)}
                            className="text-rose-600 hover:opacity-80"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{rev.comment}</p>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {formatDateShort(rev.date, lang)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
