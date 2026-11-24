import React, { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { RefreshCw, Radio, SlidersHorizontal, X } from 'lucide-react';
import type { HouseItem, LangCode, SiteSettings, UserProfile } from '../types/marketplace';
import {
  DEFAULT_TELECOM_CATEGORIES,
  getTelecomCategoryLabel,
  isDrivePackageCategory,
  isTelecomDriveProduct,
  shuffleWithSeed,
  tr,
} from '../utils/i18n';
import { ProductCard } from './ProductCard';

interface ShopViewProps {
  houses: HouseItem[];
  siteSettings: SiteSettings;
  users: UserProfile[];
  lang: LangCode;
  wishlist: string[];
  searchQuery: string;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onSelectProduct: (h: HouseItem) => void;
  onAddToCart: (h: HouseItem) => void;
  onToggleWishlist: (id: string) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  houses,
  siteSettings,
  users,
  lang,
  wishlist,
  searchQuery,
  selectedCategory,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
}) => {
  const [sortBy, setSortBy] = useState<'default' | 'priceLow' | 'priceHigh'>('default');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [telecomOp, setTelecomOp] = useState<string>('ALL');
  const [shuffleTick, setShuffleTick] = useState(0);

  const rotateSeconds = Math.max(5, Number(siteSettings.autoShuffleSeconds) || 15);
  const autoRotateEnabled = siteSettings.autoShuffleActive !== false;

  const isDriveOrTelecomCat =
    isDrivePackageCategory(selectedCategory) ||
    /(টেলিকম|telecom)/i.test((selectedCategory || '').trim());

  useEffect(() => {
    if (!isDriveOrTelecomCat) {
      setTelecomOp('ALL');
    }
  }, [isDriveOrTelecomCat, selectedCategory]);

  useEffect(() => {
    if (!autoRotateEnabled) {
      setShuffleTick(0);
      return;
    }
    const timer = setInterval(() => {
      setShuffleTick((t) => t + 1);
    }, rotateSeconds * 1000);
    return () => clearInterval(timer);
  }, [autoRotateEnabled, rotateSeconds]);

  const categories = siteSettings.categories || [];
  const telecomOperators =
    siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
      ? siteSettings.telecomCategories
      : DEFAULT_TELECOM_CATEGORIES;

  const filtered = useMemo(() => {
    let list = houses.filter((h) => h.data?.status === 'approved');

    if (searchQuery.trim()) {
      const fuse = new Fuse(list, {
        keys: ['data.title', 'data.category', 'data.telecomCompany', 'data.location', 'data.description'],
        threshold: 0.4,
        ignoreLocation: true,
      });
      list = fuse.search(searchQuery.trim()).map((r) => r.item);
    }

    if (selectedCategory) {
      if (isDriveOrTelecomCat) {
        list = list.filter(
          (h) =>
            h.data?.category === selectedCategory ||
            h.data?.productType === 'data_package' ||
            h.data?.productType === 'telecom' ||
            h.data?.productType === 'vip_sim' ||
            isTelecomDriveProduct(h)
        );
      } else {
        list = list.filter((h) => h.data?.category === selectedCategory);
      }
    }

    if (isDriveOrTelecomCat && telecomOp !== 'ALL') {
      const opLower = telecomOp.trim().toLowerCase();
      list = list.filter((h) => {
        const tc = (h.data?.telecomCompany || '').trim().toLowerCase();
        const cat = (h.data?.category || '').trim().toLowerCase();
        return tc === opLower || cat === opLower || tc.includes(opLower);
      });
    }

    if (minPrice) {
      list = list.filter((h) => Number(h.data?.rent || 0) >= Number(minPrice));
    }
    if (maxPrice) {
      list = list.filter((h) => Number(h.data?.rent || 0) <= Number(maxPrice));
    }

    if (sortBy === 'priceLow') {
      list = [...list].sort((a, b) => Number(a.data?.rent || 0) - Number(b.data?.rent || 0));
    } else if (sortBy === 'priceHigh') {
      list = [...list].sort((a, b) => Number(b.data?.rent || 0) - Number(a.data?.rent || 0));
    } else if (autoRotateEnabled && list.length > 1 && shuffleTick > 0 && !searchQuery.trim()) {
      list = shuffleWithSeed(list, shuffleTick * 17 + 7);
    }
    return list;
  }, [
    houses,
    searchQuery,
    selectedCategory,
    isDriveOrTelecomCat,
    telecomOp,
    minPrice,
    maxPrice,
    sortBy,
    autoRotateEnabled,
    shuffleTick,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">
            {selectedCategory || tr(lang, 'all_products')}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
            <span>
              {filtered.length} {lang === 'bn' ? 'টি প্রোডাক্ট পাওয়া গেছে' : 'products available'}
            </span>
            {autoRotateEnabled && sortBy === 'default' && !searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setShuffleTick((t) => t + 1)}
                className="inline-flex items-center gap-1 text-emerald-700 dark:text-amber-400 font-semibold hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{rotateSeconds}s</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'default' | 'priceLow' | 'priceHigh')}
            className="h-10 px-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-xs font-medium"
          >
            <option value="default">{lang === 'bn' ? 'সাজান: ডিফল্ট' : 'Sort: Default'}</option>
            <option value="priceLow">{lang === 'bn' ? 'দাম: কম থেকে বেশি' : 'Price: Low to High'}</option>
            <option value="priceHigh">{lang === 'bn' ? 'দাম: বেশি থেকে কম' : 'Price: High to Low'}</option>
          </select>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="h-10 px-3.5 rounded-xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{lang === 'bn' ? 'ফিল্টার' : 'Filter'}</span>
          </button>
        </div>
      </div>

      {/* Category Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => onSelectCategory('')}
          className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            selectedCategory === ''
              ? 'bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950'
              : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-slate-700 dark:text-slate-300'
          }`}
        >
          {lang === 'bn' ? 'সকল' : 'All'}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950'
                : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-slate-700 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Telecom / Drive Operator Sub-Filter Bar */}
      {isDriveOrTelecomCat && (
        <div className="p-3 rounded-2xl bg-sky-50/75 dark:bg-sky-950/25 border border-sky-200 dark:border-sky-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 dark:text-sky-300 shrink-0 pr-1">
            <Radio className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'অপারেটর:' : 'Operator:'}</span>
          </span>
          <button
            type="button"
            onClick={() => setTelecomOp('ALL')}
            className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
              telecomOp === 'ALL'
                ? 'bg-sky-700 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'bg-white dark:bg-[#071312] border border-sky-200 dark:border-sky-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            {lang === 'bn' ? 'সবগুলো' : 'All'}
          </button>
          {telecomOperators.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setTelecomOp(op)}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                telecomOp === op
                  ? 'bg-sky-700 text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'bg-white dark:bg-[#071312] border border-sky-200 dark:border-sky-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {getTelecomCategoryLabel(op, lang)}
            </button>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 flex flex-wrap items-end gap-3">
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lang === 'bn' ? 'সর্বনিম্ন মূল্য (৳)' : 'Min Price (৳)'}
            </label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lang === 'bn' ? 'সর্বোচ্চ মূল্য (৳)' : 'Max Price (৳)'}
            </label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
            />
          </div>
          {(minPrice || maxPrice || selectedCategory) && (
            <button
              type="button"
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
                onSelectCategory('');
              }}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-12 text-center text-sm text-slate-500">
          {tr(lang, 'no_prod')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((h) => (
            <ProductCard
              key={h.id}
              house={h}
              siteSettings={siteSettings}
              users={users}
              lang={lang}
              isWishlisted={wishlist.includes(h.id)}
              onSelect={onSelectProduct}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  );
};
