import React from 'react';
import { ArrowLeft, MessageCircle, Share2, Store } from 'lucide-react';
import type { HouseItem, LangCode, SiteSettings, UserProfile } from '../types/marketplace';
import { getStoreShareUrl, shareMarketplaceUrl } from '../utils/i18n';
import { ProductCard } from './ProductCard';
import { RoleBadge } from './RoleBadge';

interface StoreViewProps {
  sellerId: string;
  houses: HouseItem[];
  users: UserProfile[];
  siteSettings: SiteSettings;
  lang: LangCode;
  wishlist: string[];
  onBack: () => void;
  onSelectProduct: (h: HouseItem) => void;
  onAddToCart: (h: HouseItem) => void;
  onToggleWishlist: (id: string) => void;
  onChatWithSeller: (sellerId: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  sellerId,
  houses,
  users,
  siteSettings,
  lang,
  wishlist,
  onBack,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  onChatWithSeller,
  onNotify,
}) => {
  const storeUser = users.find((u) => u.uid === sellerId);
  const storeProducts = houses.filter(
    (h) => h.data?.status === 'approved' && (h.ownerId === sellerId || h.data?.ownerId === sellerId)
  );
  const storeName =
    storeUser?.storeName ||
    storeUser?.name ||
    storeProducts[0]?.data?.storeName ||
    storeProducts[0]?.data?.ownerName ||
    'Amader Market Store';
  const storeLogo = storeUser?.storeLogo || storeUser?.profilePic || storeProducts[0]?.data?.storeLogo;

  const copyStoreLink = () => {
    const shareUrl = getStoreShareUrl(sellerId, storeName);
    const storeText = [
      `🏪 *${storeName}*`,
      '━━━━━━━━━━━━━━━━━━',
      lang === 'bn'
        ? `📦 সক্রিয় প্রোডাক্ট: ${storeProducts.length}টি`
        : `📦 Active Products: ${storeProducts.length}`,
      '',
      lang === 'bn'
        ? '✨ স্টোরের সব প্রোডাক্ট দেখতে নিচের লিংকে ক্লিক করুন 👇'
        : '✨ Tap below to browse all store items 👇',
    ].join('\n');
    shareMarketplaceUrl({
      url: shareUrl,
      title: storeName,
      text: storeText,
      copyText: `${storeText}\n🔗 ${shareUrl}`,
      onCopied: () =>
        onNotify(lang === 'bn' ? 'স্টোর লিংক কপি হয়েছে!' : 'Store link copied!', 'success'),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-5 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-xs font-semibold inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
      </button>

      <div className="rounded-2xl bg-[#043934] text-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {storeLogo ? (
            <img
              src={storeLogo}
              alt={storeName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/50"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-800 flex items-center justify-center text-amber-300">
              <Store className="w-8 h-8" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold">{storeName}</h1>
              {storeUser && (
                <RoleBadge
                  role={storeUser.role || 'seller'}
                  email={storeUser.email}
                  lang={lang}
                  size="sm"
                />
              )}
            </div>
            <p className="text-xs text-teal-100/80 font-mono-num mt-0.5">
              {storeProducts.length} {lang === 'bn' ? 'টি সক্রিয় প্রোডাক্ট' : 'Active Products'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onChatWithSeller(sellerId)}
            className="min-h-[42px] px-4 rounded-xl bg-amber-400 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{lang === 'bn' ? 'চ্যাট করুন' : 'Chat'}</span>
          </button>
          <button
            type="button"
            onClick={copyStoreLink}
            className="min-h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'bn' ? 'লিংক' : 'Share'}</span>
          </button>
        </div>
      </div>

      {storeProducts.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
          {lang === 'bn' ? 'এই স্টোরে এখনো কোনো প্রোডাক্ট নেই।' : 'No products in this store yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {storeProducts.map((h) => (
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
