import React, { useState } from 'react';
import { Check, Heart, Package, Share2, ShoppingBag, Star } from 'lucide-react';
import type { HouseItem, LangCode, SiteSettings, UserProfile } from '../types/marketplace';
import {
  buildProductShareText,
  formatBDT,
  getDisplayOwnerName,
  getEffectivePrice,
  getOriginalPrice,
  getParsedReviews,
  getSafeImage,
  isCampaign11Active,
  isFlashActive,
  shareMarketplaceUrl,
} from '../utils/i18n';

interface ProductCardProps {
  house: HouseItem;
  siteSettings: SiteSettings;
  users: UserProfile[];
  lang: LangCode;
  isWishlisted: boolean;
  onSelect: (house: HouseItem) => void;
  onAddToCart: (house: HouseItem) => void;
  onToggleWishlist: (houseId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  house,
  siteSettings,
  users,
  lang,
  isWishlisted,
  onSelect,
  onAddToCart,
  onToggleWishlist,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const imgUrl = getSafeImage(house);
  const now = Date.now();
  const effectivePrice = getEffectivePrice(house, siteSettings, 0, now);
  const originalPrice = getOriginalPrice(house, 0);
  const oldPrice = Number(house.data.oldPrice) || (effectivePrice < originalPrice ? originalPrice : 0);
  const flash = isFlashActive(house, now);
  const c11 = isCampaign11Active(house, siteSettings, now);
  const reviews = getParsedReviews(house);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
      : null;
  const sellerName = getDisplayOwnerName(house, users);

  return (
    <article
      onClick={() => onSelect(house)}
      className="group flex flex-col bg-white dark:bg-[#0d1f1d] border border-slate-200/80 dark:border-emerald-950 rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-[#071514] overflow-hidden">
        {imgUrl && !imgFailed ? (
          <img
            src={imgUrl}
            alt={house.data.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-[#0a2320] dark:to-[#071514] text-emerald-700/50 dark:text-emerald-300/40 p-4 text-center">
            <Package className="w-9 h-9 mb-2" />
            <span className="text-xs font-medium line-clamp-1">{house.data.category || 'Amader Market'}</span>
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(house.id);
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
              isWishlisted
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white/85 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            aria-label={lang === 'bn' ? 'প্রোডাক্ট শেয়ার করুন' : 'Share product'}
            onClick={(e) => {
              e.stopPropagation();
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
                onCopied: () => {
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 1800);
                },
              });
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md bg-white/85 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-white transition-colors"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>

        {(c11 || flash) && (
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500 text-slate-950 shadow-sm">
            {c11 ? '11.11 Deal' : 'Flash Deal'}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-3.5 sm:p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
          <span className="truncate">{house.data.category || 'Marketplace'}</span>
          {house.data.location && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{house.data.location}</span>
            </>
          )}
        </div>

        <h3 className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-700 dark:group-hover:text-amber-300 transition-colors">
          {house.data.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">{sellerName}</span>
          {avgRating && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                <Star className="w-3 h-3 fill-current" />
                {avgRating}
              </span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-base sm:text-lg font-bold text-emerald-800 dark:text-amber-400 tabular-nums leading-none">
              {formatBDT(effectivePrice)}
            </div>
            {oldPrice > effectivePrice && (
              <div className="mt-1 text-xs text-slate-400 line-through tabular-nums">
                {formatBDT(oldPrice)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(house);
            }}
            className="min-h-[40px] min-w-[40px] px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'bn' ? 'যোগ' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
