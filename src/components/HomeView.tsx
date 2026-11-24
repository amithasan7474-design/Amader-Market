import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, Flame, RefreshCw, Smartphone, Sparkles, Zap } from 'lucide-react';
import type { HouseItem, LangCode, SiteSettings, UserProfile } from '../types/marketplace';
import {
  DEFAULT_TELECOM_CATEGORIES,
  getTelecomCategoryLabel,
  isCampaign11Active,
  isFlashActive,
  shuffleWithSeed,
  tr,
} from '../utils/i18n';
import { ProductCard } from './ProductCard';

interface HomeViewProps {
  houses: HouseItem[];
  siteSettings: SiteSettings;
  users: UserProfile[];
  lang: LangCode;
  wishlist: string[];
  searchQuery: string;
  onSelectProduct: (h: HouseItem) => void;
  onAddToCart: (h: HouseItem) => void;
  onToggleWishlist: (id: string) => void;
  onSelectCategory: (cat: string) => void;
  onOpenShop: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  houses,
  siteSettings,
  users,
  lang,
  wishlist,
  searchQuery,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  onSelectCategory,
  onOpenShop,
}) => {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [telecomOp, setTelecomOp] = useState('ALL');
  const [shuffleTick, setShuffleTick] = useState(0);

  const rotateSeconds = Math.max(5, Number(siteSettings.autoShuffleSeconds) || 15);
  const autoRotateEnabled = siteSettings.autoShuffleActive !== false;

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

  const now = Date.now();
  const approvedHouses = useMemo(
    () => houses.filter((h) => h.data?.status === 'approved'),
    [houses]
  );

  const activeAds = useMemo(
    () => (siteSettings.ads || []).filter((a) => a.active !== false && a.image),
    [siteSettings.ads]
  );

  useEffect(() => {
    if (!siteSettings.autoScrollBanner || activeAds.length <= 1) return;
    const t = setInterval(() => {
      setBannerIndex((i) => (i + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(t);
  }, [siteSettings.autoScrollBanner, activeAds.length]);

  const rotateList = (items: HouseItem[], salt = 1) => {
    if (!autoRotateEnabled || items.length <= 1 || shuffleTick === 0) return items;
    return shuffleWithSeed(items, shuffleTick * 31 + salt);
  };

  const campaign11List = useMemo(
    () => rotateList(approvedHouses.filter((h) => isCampaign11Active(h, siteSettings, now)), 2).slice(0, 12),
    [approvedHouses, siteSettings, now, shuffleTick, autoRotateEnabled]
  );

  const flashList = useMemo(
    () =>
      siteSettings.enableFlashSale === false
        ? []
        : rotateList(approvedHouses.filter((h) => isFlashActive(h, now)), 3).slice(0, 12),
    [approvedHouses, siteSettings.enableFlashSale, now, shuffleTick, autoRotateEnabled]
  );

  const featuredList = useMemo(
    () => rotateList(approvedHouses.filter((h) => h.data.featured), 5).slice(0, 8),
    [approvedHouses, shuffleTick, autoRotateEnabled]
  );

  const telecomList = useMemo(() => {
    if (siteSettings.enableTelecomSection === false) return [];
    const telecomOps =
      siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
        ? siteSettings.telecomCategories
        : DEFAULT_TELECOM_CATEGORIES;

    const base = approvedHouses.filter(
      (h) =>
        h.data.productType === 'telecom' ||
        h.data.productType === 'vip_sim' ||
        h.data.productType === 'data_package' ||
        (h.data.telecomCompany && h.data.telecomCompany.trim().length > 0) ||
        (h.data.category &&
          (h.data.category.includes('Telecom') ||
            h.data.category.includes('SIM') ||
            h.data.category.includes('সিম') ||
            h.data.category.includes('টেলিকম') ||
            telecomOps.some((tc) => tc.toLowerCase() === h.data.category?.trim().toLowerCase())))
    );
    const filtered =
      telecomOp === 'ALL'
        ? base
        : base.filter((h) => {
            const comp = (h.data.telecomCompany || '').trim().toLowerCase();
            const cat = (h.data.category || '').trim().toLowerCase();
            const title = (h.data.title || '').toLowerCase();
            const op = telecomOp.toLowerCase();
            return (
              comp === op ||
              cat === op ||
              title.includes(op) ||
              (op === 'grameenphone' && (title.includes('gp') || title.includes('গ্রামীণ'))) ||
              (op === 'robi' && title.includes('রবি')) ||
              (op === 'circle' && (title.includes('সার্কেল') || title.includes('skitto'))) ||
              (op === 'banglalink' && (title.includes('বাংলালিংক') || title.includes('bl '))) ||
              (op === 'airtel' && title.includes('এয়ারটেল')) ||
              (op === 'teletalk' && title.includes('টেলিটক'))
            );
          });
    return rotateList(filtered, 7);
  }, [approvedHouses, siteSettings.enableTelecomSection, siteSettings.telecomCategories, telecomOp, shuffleTick, autoRotateEnabled]);

  const feedList = useMemo(() => {
    if (!searchQuery.trim()) return rotateList(approvedHouses, 11);
    const q = searchQuery.toLowerCase();
    return approvedHouses.filter(
      (h) =>
        h.data.title?.toLowerCase().includes(q) ||
        h.data.category?.toLowerCase().includes(q) ||
        h.data.location?.toLowerCase().includes(q)
    );
  }, [approvedHouses, searchQuery, shuffleTick, autoRotateEnabled]);

  const categories = siteSettings.categories || [];
  const currentAd = activeAds[bannerIndex % Math.max(1, activeAds.length)];
  const showHeroCard = siteSettings.showHeroCard !== false;

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-8">
      {/* Hero Showcase / Ad Banner */}
      {!searchQuery && (showHeroCard || currentAd) && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {showHeroCard && (
            <div className="lg:col-span-7 rounded-2xl bg-[#043934] text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="Amader Market"
                  className="w-12 h-12 rounded-xl object-cover border border-amber-400/40 shrink-0"
                />
                <div className="text-xs text-amber-200/90 font-medium">
                  {siteSettings.topSloganActive && siteSettings.topSloganText
                    ? siteSettings.topSloganText
                    : siteSettings.appName || 'Amader Market'}
                </div>
              </div>

              <div className="mt-5 max-w-xl">
                <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-balance leading-tight">
                  {lang === 'bn'
                    ? 'আমাদের মার্কেট — দ্রুত, সহজ ও অফলাইন রেডি অ্যাপ'
                    : 'Amader Market — Fast, Offline-Ready Storefront'}
                </h1>
                <p className="mt-2.5 text-sm sm:text-base text-teal-100/85 leading-relaxed">
                  {lang === 'bn'
                    ? `${approvedHouses.length}টি সক্রিয় প্রোডাক্ট ও স্টোর এখন আপনার হাতের মুঠোয়। একবার লোড হলেই কোনো অপেক্ষা ছাড়াই ব্রাউজ ও কন্ট্রোল করুন।`
                    : `${approvedHouses.length} live products and stores cached locally for instant browsing and full marketplace control.`}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenShop}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <span>{lang === 'bn' ? 'সকল প্রোডাক্ট দেখুন' : 'Explore Marketplace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div
            className={`${
              showHeroCard ? 'lg:col-span-5' : 'lg:col-span-12'
            } rounded-2xl overflow-hidden bg-slate-200 dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-950 min-h-[200px] relative flex items-center justify-center`}
          >
            {currentAd ? (
              <>
                <img
                  src={currentAd.image}
                  alt="Featured Banner"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${showHeroCard ? 'max-h-[290px]' : 'max-h-[360px]'}`}
                />
                {activeAds.length > 1 && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
                    {activeAds.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Banner ${idx + 1}`}
                        onClick={() => setBannerIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          idx === bannerIndex % activeAds.length ? 'bg-amber-400' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center flex flex-col items-center justify-center">
                <img
                  src="/pwa-512x512.png"
                  alt="Amader Market Emblem"
                  className="w-36 h-36 rounded-2xl object-cover shadow-md mb-3"
                />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {siteSettings.footerSubtitle || 'বাংলাদেশের বিশ্বস্ত অনলাইন মার্কেটপ্লেস'}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick Category Strip */}
      {!searchQuery && categories.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">
              {lang === 'bn' ? 'ক্যাটাগরি অনুযায়ী দেখুন' : 'Browse Categories'}
            </h2>
            <button
              type="button"
              onClick={onOpenShop}
              className="text-xs font-semibold text-emerald-800 dark:text-amber-400 inline-flex items-center gap-1 hover:underline"
            >
              <span>{lang === 'bn' ? 'সবগুলো' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 hover:border-emerald-700 dark:hover:border-amber-400 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 11.11 Campaign Section */}
      {!searchQuery && campaign11List.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-r from-rose-700 via-orange-600 to-amber-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-200" />
              <h2 className="font-display text-lg sm:text-xl font-bold">
                {siteSettings.campaign11Title || '১১.১১ মেগা ক্যাম্পেইন (11.11 Sale)'}
              </h2>
            </div>
            <span className="text-xs font-mono-num opacity-90">
              {campaign11List.length} {lang === 'bn' ? 'টি অফার' : 'deals'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 text-slate-900">
            {campaign11List.slice(0, 4).map((h) => (
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
        </section>
      )}

      {/* Flash Sale Section */}
      {!searchQuery && flashList.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>{tr(lang, 'flash_sale')}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {flashList.slice(0, 4).map((h) => (
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
        </section>
      )}

      {/* Featured Collection */}
      {!searchQuery && featuredList.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
              <span>{tr(lang, 'featured')}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {featuredList.map((h) => (
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
        </section>
      )}

      {/* Telecom & SIM Zone */}
      {!searchQuery && telecomList.length > 0 && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
            <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
              <span>{tr(lang, 'telecom_zone')}</span>
            </h2>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                'ALL',
                ...(siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
                  ? siteSettings.telecomCategories
                  : DEFAULT_TELECOM_CATEGORIES),
              ].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setTelecomOp(op)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    telecomOp === op
                      ? 'bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950'
                      : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {op === 'ALL'
                    ? lang === 'bn'
                      ? 'সবগুলো'
                      : 'ALL'
                    : getTelecomCategoryLabel(op, lang)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {telecomList.slice(0, 8).map((h) => (
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
        </section>
      )}

      {/* Main Product Feed with Live Auto-Rotate */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-display text-lg sm:text-xl font-bold">
            {searchQuery
              ? `${lang === 'bn' ? 'সার্চ রেজাল্ট' : 'Search Results'} (${feedList.length})`
              : tr(lang, 'all_products')}
          </h2>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
            {autoRotateEnabled && !searchQuery && (
              <button
                type="button"
                onClick={() => setShuffleTick((t) => t + 1)}
                title={lang === 'bn' ? 'এখনই প্রোডাক্ট রোটেশন করুন' : 'Rotate products now'}
                className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-amber-400 font-semibold hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {lang === 'bn' ? `অটো-চেঞ্জ: ${rotateSeconds}s` : `Auto-Rotate: ${rotateSeconds}s`}
                </span>
              </button>
            )}
            <span>
              {feedList.length} {lang === 'bn' ? 'টি পণ্য' : 'items'}
            </span>
          </div>
        </div>

        {feedList.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
            {tr(lang, 'no_prod')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {feedList.map((h) => (
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
      </section>
    </div>
  );
};
