import type { HouseItem, LangCode, ProductReview, SiteSettings, ThemeMode, UserProfile, UserRole } from '../types/marketplace';

export const MAIN_SUPER_ADMIN_EMAIL = 'amithasanai7474@gmail.com';
export const SUPER_ADMIN_EMAIL = MAIN_SUPER_ADMIN_EMAIL;
export const CURRENT_APP_URL =
  'https://ais-pre-l3hl2xkkt3d7aaaqxavlta-185636082306.asia-southeast1.run.app';
export const TARGET_WEBSITE_URL = CURRENT_APP_URL;

export function getCurrentAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, origin } = window.location;
    if (
      /^https?:$/i.test(protocol) &&
      hostname &&
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.endsWith('.local')
    ) {
      return origin.replace(/\/$/, '');
    }
  }
  return CURRENT_APP_URL;
}

export function getCurrentDisplayHost(): string {
  try {
    return new URL(getCurrentAppBaseUrl()).hostname;
  } catch {
    return 'amader-market';
  }
}

export function buildShortSlug(rawText?: string | null, maxLen = 24): string {
  const cleaned = (rawText || '')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!cleaned) return 'item';
  return cleaned.slice(0, maxLen).replace(/-$/g, '') || 'item';
}

export function getShortEntityCode(fullId: string): string {
  const clean = (fullId || '').trim();
  if (clean.length <= 6) return clean;
  return clean.slice(-5);
}

export function getProductShortParam(houseId: string, title?: string): string {
  const slug = buildShortSlug(title, 22);
  const code = getShortEntityCode(houseId);
  return `${slug}~${code}`;
}

export function getProductShareUrl(houseId: string, title?: string): string {
  return `${getCurrentAppBaseUrl()}/?p=${getProductShortParam(houseId, title)}`;
}

export function getStoreShortParam(sellerId: string, storeName?: string): string {
  const slug = buildShortSlug(storeName, 18);
  const code = getShortEntityCode(sellerId);
  return `${slug}~${code}`;
}

export function getStoreShareUrl(sellerId: string, storeName?: string): string {
  return `${getCurrentAppBaseUrl()}/?s=${getStoreShortParam(sellerId, storeName)}`;
}

export function buildProductShareText(
  house: HouseItem,
  siteSettings: SiteSettings,
  users: UserProfile[],
  lang: LangCode = 'bn'
): { url: string; bodyText: string; fullCopyText: string } {
  const d = house.data || {};
  const url = getProductShareUrl(house.id, d.title);
  const sellerName = getDisplayOwnerName(house, users);
  const reviews = getParsedReviews(house);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
      : null;

  const now = Date.now();
  const flash = isFlashActive(house, now);
  const c11 = isCampaign11Active(house, siteSettings, now);

  const lines: string[] = [];
  lines.push(`🛍️ *${(d.title || 'Amader Market Product').trim()}*`);
  lines.push('━━━━━━━━━━━━━━━━━━');

  if (d.category) {
    lines.push(
      lang === 'bn' ? `📂 ক্যাটাগরি: ${d.category}` : `📂 Category: ${d.category}`
    );
  }
  if (d.telecomCompany) {
    lines.push(
      lang === 'bn'
        ? `📡 অপারেটর: ${getTelecomCategoryLabel(d.telecomCompany, lang)}`
        : `📡 Operator: ${getTelecomCategoryLabel(d.telecomCompany, lang)}`
    );
  }
  if (d.offerValidity) {
    lines.push(
      lang === 'bn' ? `⏳ মেয়াদ: ${d.offerValidity}` : `⏳ Validity: ${d.offerValidity}`
    );
  }
  if (d.location) {
    lines.push(
      lang === 'bn' ? `📍 লোকেশন: ${d.location}` : `📍 Location: ${d.location}`
    );
  }
  if (sellerName) {
    lines.push(lang === 'bn' ? `🏪 স্টোর: ${sellerName}` : `🏪 Store: ${sellerName}`);
  }
  if (avgRating) {
    lines.push(
      lang === 'bn'
        ? `⭐ রেটিং: ${avgRating} (${reviews.length}টি রিভিউ)`
        : `⭐ Rating: ${avgRating} (${reviews.length} reviews)`
    );
  }
  if (c11 || flash) {
    lines.push(
      c11
        ? lang === 'bn'
          ? '🔥 ১১.১১ বিশেষ অফার চলছে!'
          : '🔥 11.11 Mega Campaign Active!'
        : lang === 'bn'
        ? '⚡ ফ্ল্যাশ ডিল অফার চলছে!'
        : '⚡ Flash Deal Active!'
    );
  }
  if (d.stock !== undefined && Number(d.stock) > 0) {
    lines.push(
      lang === 'bn' ? `📦 স্টক: ${d.stock}টি এভেইলেবল` : `📦 Stock: ${d.stock} available`
    );
  }

  const desc = (d.description || '').trim();
  if (desc) {
    lines.push('');
    lines.push(lang === 'bn' ? '📝 বিস্তারিত বিবরণ:' : '📝 Product Details:');
    lines.push(desc);
  }

  lines.push('');
  lines.push(
    lang === 'bn'
      ? '✨ দাম জানতে ও অর্ডার করতে নিচের লিংকে ক্লিক করুন 👇'
      : '✨ Tap the link below to view the price & order 👇'
  );

  const bodyText = lines.join('\n');
  const fullCopyText = `${bodyText}\n🔗 ${url}`;
  return { url, bodyText, fullCopyText };
}

export async function shareMarketplaceUrl(opts: {
  url: string;
  title: string;
  text?: string;
  copyText?: string;
  onCopied?: () => void;
}): Promise<void> {
  const { url, title, text, copyText, onCopied } = opts;
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: text || title, url });
      return;
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(copyText || (text ? `${text}\n🔗 ${url}` : url));
    onCopied?.();
  } catch {
    // ignore clipboard restrictions
  }
}
export const ROLE_HIERARCHY: UserRole[] = [
  'user',
  'merchant',
  'seller',
  'moderator',
  'manager',
  'partner',
  'admin',
  'super_admin',
];

export function isMainSuperAdminAccount(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === MAIN_SUPER_ADMIN_EMAIL;
}

export function isAssistantSuperAdmin(email?: string | null, role?: string | null): boolean {
  return !isMainSuperAdminAccount(email) && role === 'super_admin';
}

export function isSuperAdminAccount(email?: string | null, role?: string | null): boolean {
  return isMainSuperAdminAccount(email) || role === 'super_admin';
}

export function isModeratorOrAbove(email?: string | null, role?: string | null): boolean {
  return (
    isSuperAdminAccount(email, role) ||
    ['admin', 'partner', 'manager', 'moderator'].includes((role || '').toLowerCase())
  );
}

export function getRoleLabel(
  role?: string | null,
  email?: string | null,
  lang: LangCode = 'bn'
): string {
  if (isMainSuperAdminAccount(email)) {
    return lang === 'bn' ? 'মেইন সুপার এডমিন' : 'Main Super Admin';
  }
  const r = (role || 'user').toLowerCase();
  const labels: Record<string, { bn: string; en: string }> = {
    super_admin: { bn: 'সহকারী সুপার এডমিন', en: 'Assistant Super Admin' },
    admin: { bn: 'এডমিন', en: 'Admin' },
    partner: { bn: 'পার্টনার', en: 'Partner' },
    manager: { bn: 'ম্যানেজার', en: 'Manager' },
    moderator: { bn: 'মডারেটর', en: 'Moderator' },
    merchant: { bn: 'মার্চেন্ট', en: 'Merchant' },
    seller: { bn: 'সেলার', en: 'Seller' },
    user: { bn: 'কাস্টমার', en: 'Customer' },
    guest: { bn: 'অতিথি', en: 'Guest' },
  };
  const found = labels[r] || labels.user;
  return found[lang];
}

export function openExternalUrl(rawUrl: string): void {
  const url = (rawUrl || '').trim();
  if (!url) return;
  const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const androidBridge = (
    window as unknown as { AmaderAndroid?: { openExternal?: (u: string) => void } }
  ).AmaderAndroid;
  if (androidBridge?.openExternal) {
    androidBridge.openExternal(full);
    return;
  }
  window.open(full, '_blank', 'noopener,noreferrer');
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  defaultTheme: 'dark',
  enableCampaign11: false,
  campaign11Title: '১১.১১ মেগা ক্যাম্পেইন (11.11 Sale)',
  campaign11DurationHours: 48,
  campaign11EndTime: 0,
  enableFlashSale: true,
  telecomAutoScroll: true,
  telecomScrollSpeed: 'normal',
  autoShuffleActive: true,
  autoShuffleSeconds: 15,
  enableDedicatedStore: true,
  storeActivationFee: '',
  enableOrderPreview: true,
  appName: 'Amader Market',
  loadingText: 'Amader Market',
  logo: '/app-logo.png',
  footerLogo: '/app-logo.png',
  footerTitle: 'Amader Market',
  footerSubtitle: 'At Technology Ltd',
  footerDesc: '⏳ সীমিত সংখ্যক সেলার এডমিন নেওয়া হবে — দেরি না করে এখনই আবেদন করুন!',
  facebook: '',
  youtube: '',
  contactEmail: '',
  contactPhone: '',
  adminName: 'At Technology Ltd',
  adminWaNumber: '',
  copyrightYear: '2026',
  footerCopyright: '© 07-03-2026 Amader Market. All Rights Reserved.',
  footerCredit: 'Built with ❤️ by Amader Market By Amit Hasan',
  showFooter: true,
  showFloatingWhatsapp: true,
  topSloganText: 'WORLD BEST SELL',
  topSloganActive: true,
  digitalLoginWarning: 'ডিজিটাল প্রোডাক্ট কিনতে অনুগ্রহ করে লগইন করুন।',
  noticeText: '',
  noticeActive: false,
  noticeSpeed: 'normal',
  enableCOD: true,
  enableAdvance: true,
  enableTelecomSection: true,
  enableDataPackageSelling: true,
  maintenance: false,
  registration: true,
  showClock: true,
  showSearch: true,
  advanceBkash: '',
  advanceBkashType: 'Personal',
  advanceNagad: '',
  advanceNagadType: 'Personal',
  storeBkash: '',
  storeBkashType: 'Personal',
  storeNagad: '',
  storeNagadType: 'Personal',
  enableLoyaltyReward: false,
  enableProductPromo: false,
  partnerStrictMode: true,
  managerBonusAmount: 50,
  managerMinOrderValue: 1000,
  enableLoadingAnim: true,
  enableOfflineOverlay: true,
  categories: ['বাসা', 'দোকান', 'গাড়ি', 'ইলেকট্রনিক্স', 'জমি', 'ফার্নিচার', 'টেলিকম ও সিম', 'অন্যান্য'],
  telecomCategories: ['Robi', 'Circle', 'Grameenphone', 'Banglalink', 'Airtel', 'Teletalk'],
  ads: [],
  coupons: [],
  globalFontSize: 16,
  enableWallet: true,
  autoScrollBanner: true,
  enableStaffSuperAdminChat: true,
  showHeroCard: true,
  mainSuperAdminSupportPhone: '',
  assistantSuperAdminSupportPhone: '',
};

const DICT: Record<LangCode, Record<string, string>> = {
  bn: {
    home: 'হোম',
    shop: 'শপ',
    orders: 'অর্ডার',
    control: 'কন্ট্রোল',
    account: 'একাউন্ট',
    wishlist: 'উইশলিস্ট',
    menu: 'মেনু',
    search_ph: 'যেকোনো প্রোডাক্ট, ক্যাটাগরি বা এলাকা খুঁজুন...',
    featured: 'ফিচার্ড কালেকশন',
    all_products: 'সকল প্রোডাক্ট',
    flash_sale: 'ফ্ল্যাশ সেল',
    telecom_zone: 'টেলিকম ও সিম জোন',
    no_prod: 'কোনো প্রোডাক্ট পাওয়া যায়নি।',
    load_more: 'আরও প্রোডাক্ট দেখুন',
    login: 'লগইন',
    logout: 'লগআউট',
    register: 'রেজিস্টার',
    cart: 'কার্ট',
    cart_empty: 'আপনার শপিং কার্ট খালি।',
    checkout: 'অর্ডার কনফার্ম করুন',
    order_now: 'এখনি অর্ডার করুন',
    add_cart: 'কার্টে যোগ করুন',
    chat_seller: 'সেলারের সাথে চ্যাট',
    chat_admin: 'এডমিনের সাথে চ্যাট',
    offline_banner: 'অফলাইন মোড — সংরক্ষিত ক্যাশ থেকে দেখানো হচ্ছে',
    sync_now: 'লাইভ সিঙ্ক করুন',
    synced_ok: 'লাইভ সিঙ্ক সম্পন্ন',
    open_website: 'মূল ওয়েবসাইট দেখুন',
    install_app: 'অ্যাপ ইনস্টল করুন',
    control_center: 'ওয়েবসাইট কন্ট্রোল সেন্টার',
    my_purchases: 'আমার কেনাকাটা',
    price: 'মূল্য',
    delivery: 'ডেলিভারি চার্জ',
    inside_dhaka: 'ঢাকার ভেতরে',
    outside_dhaka: 'ঢাকার বাহিরে',
    free_delivery: 'ফ্রি ডেলিভারি প্রযোজ্য',
    cod: 'ক্যাশ অন ডেলিভারি',
    advance: 'অগ্রিম পেমেন্ট (bKash / Nagad)',
    confirm_order: 'অর্ডার সম্পন্ন করুন',
    back: 'পেছনে',
    save: 'সেভ করুন',
    cancel: 'বাতিল',
    delete: 'ডিলিট',
    edit: 'এডিট',
    approve: 'অ্যাপ্রুভ',
    reject: 'রিজেক্ট',
  },
  en: {
    home: 'Home',
    shop: 'Shop',
    orders: 'Orders',
    control: 'Control',
    account: 'Account',
    wishlist: 'Wishlist',
    menu: 'Menu',
    search_ph: 'Search products, categories, or locations...',
    featured: 'Featured Collection',
    all_products: 'All Products',
    flash_sale: 'Flash Sale',
    telecom_zone: 'Telecom & SIM Zone',
    no_prod: 'No products matched your search.',
    load_more: 'Load More Products',
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    cart: 'Cart',
    cart_empty: 'Your shopping cart is empty.',
    checkout: 'Proceed to Checkout',
    order_now: 'Order Now',
    add_cart: 'Add to Cart',
    chat_seller: 'Chat with Seller',
    chat_admin: 'Chat with Admin',
    offline_banner: 'Offline Mode — Viewing locally cached marketplace data',
    sync_now: 'Sync Live',
    synced_ok: 'Live Synced',
    open_website: 'Open Live Website',
    install_app: 'Install App',
    control_center: 'Website Control Center',
    my_purchases: 'My Orders',
    price: 'Price',
    delivery: 'Delivery Charge',
    inside_dhaka: 'Inside Dhaka',
    outside_dhaka: 'Outside Dhaka',
    free_delivery: 'Free Delivery Eligible',
    cod: 'Cash On Delivery',
    advance: 'Advance Payment (bKash / Nagad)',
    confirm_order: 'Confirm Order',
    back: 'Back',
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    approve: 'Approve',
    reject: 'Reject',
  },
};

export function tr(lang: LangCode, key: string): string {
  return DICT[lang]?.[key] ?? DICT.bn[key] ?? key;
}

export function formatBDT(amount: number | string | undefined): string {
  const num = Number(amount) || 0;
  return `৳${num.toLocaleString('en-IN')}`;
}

export function getSafeImage(h?: HouseItem | null): string {
  const imgs = h?.data?.imageLinks;
  if (imgs && imgs.length > 0 && imgs[0] && !imgs[0].includes('via.placeholder.com')) {
    return imgs[0];
  }
  const varImg = (h?.data?.variations || []).find(
    (v) => v?.image && !v.image.includes('via.placeholder.com')
  )?.image;
  return varImg || '';
}

export function getAllImages(h?: HouseItem | null): string[] {
  const imgs = (h?.data?.imageLinks || []).filter(
    (u) => Boolean(u) && !u.includes('via.placeholder.com')
  );
  const varImgs = (h?.data?.variations || [])
    .map((v) => v?.image || '')
    .filter((u) => Boolean(u) && !u.includes('via.placeholder.com'));
  return Array.from(new Set([...imgs, ...varImgs]));
}

export function isFlashActive(h: HouseItem, now = Date.now()): boolean {
  if (!h?.data) return false;
  return (
    h.data.saleType === 'flash' &&
    Number(h.data.flashPrice) > 0 &&
    (!h.data.flashEndTime || Number(h.data.flashEndTime) > now)
  );
}

export function isCampaign11Active(
  h: HouseItem,
  settings: SiteSettings,
  now = Date.now()
): boolean {
  if (!settings.enableCampaign11) return false;
  if (settings.campaign11EndTime && Number(settings.campaign11EndTime) < now) return false;
  const c11 = h?.data?.campaign11;
  return Boolean(c11 && c11.active && Number(c11.discount) > 0);
}

export function getOriginalPrice(h: HouseItem, variationIdx = 0): number {
  const vars = h.data.variations;
  if (vars && vars.length > 0) {
    const v = vars[variationIdx] ?? vars[0];
    return Number(v?.price) || Number(h.data.rent) || 0;
  }
  return Number(h.data.rent) || 0;
}

export function getEffectivePrice(
  h: HouseItem,
  settings: SiteSettings,
  variationIdx = 0,
  now = Date.now()
): number {
  let base = getOriginalPrice(h, variationIdx);
  if (isFlashActive(h, now) && (!h.data.variations || h.data.variations.length === 0)) {
    base = Number(h.data.flashPrice) || base;
  }
  if (isCampaign11Active(h, settings, now)) {
    const c11 = h.data.campaign11!;
    const disc = Number(c11.discount) || 0;
    if (c11.type === 'percent') {
      return Math.max(0, Math.round(base - (base * disc) / 100));
    }
    return Math.max(0, base - disc);
  }
  return base;
}

export function getStockProgressPercent(h: HouseItem): number {
  const total = Number(h.data.campaign11?.stockTotal) || 100;
  const sold = Number(h.data.campaign11?.stockSold) || 0;
  return Math.min(100, Math.max(8, Math.round((sold / total) * 100)));
}

export function getDisplayOwnerName(h: HouseItem, users: UserProfile[]): string {
  const owner = users.find((u) => u.uid === (h.ownerId || h.data?.ownerId));
  if (owner?.storeName && owner.isStoreActive !== false) return owner.storeName;
  if (h.data?.storeName) return h.data.storeName;
  if (owner?.name) return owner.name;
  return h.data?.ownerName || 'Amader Market';
}

export function getStoreLogoUrl(h: HouseItem, users: UserProfile[]): string {
  const owner = users.find((u) => u.uid === (h.ownerId || h.data?.ownerId));
  if (owner?.storeLogo) return owner.storeLogo;
  if (owner?.profilePic) return owner.profilePic;
  if (h.data?.storeLogo) return h.data.storeLogo;
  return '';
}

export function getParsedReviews(h?: HouseItem | null): ProductReview[] {
  if (!h?.data?.reviews) return [];
  const raw = h.data.reviews;
  if (Array.isArray(raw)) {
    const items: ProductReview[] = [];
    raw.forEach((r, idx) => {
      if (r) items.push({ ...r, reviewId: idx });
    });
    return items.sort((a, b) => (b.date || 0) - (a.date || 0));
  }
  return Object.keys(raw)
    .map((key) => ({ ...raw[key], reviewId: key }))
    .sort((a, b) => (b.date || 0) - (a.date || 0));
}

export function getYouTubeEmbed(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?#\s]+)/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return '';
}

export function formatDateShort(ts?: number, lang: LangCode = 'bn'): string {
  if (!ts) return '—';
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeAgo(ts?: number, lang: LangCode = 'bn'): string {
  if (!ts) return lang === 'bn' ? 'অফলাইন' : 'Offline';
  const diffSec = Math.floor((Date.now() - Number(ts)) / 1000);
  if (diffSec < 60) return lang === 'bn' ? 'এইমাত্র অনলাইন' : 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === 'bn' ? `${diffMin} মিনিট আগে` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === 'bn' ? `${diffHr} ঘণ্টা আগে` : `${diffHr}h ago`;
  return formatDateShort(ts, lang);
}

export function isUserOnline(u: UserProfile): boolean {
  if (!u.isOnline) return false;
  const last = u.lastActive || u.lastLogin || 0;
  return Date.now() - last < 180000;
}

export function getWaLink(phone?: string): string {
  if (!phone) return '#';
  let p = phone.replace(/\D/g, '');
  if (!p.startsWith('88')) p = '88' + p;
  return 'https://wa.me/' + p;
}

export function sortHousesNewestFirst(list: HouseItem[]): HouseItem[] {
  return list
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const ca = Number(a.item.createdAt) || 0;
      const cb = Number(b.item.createdAt) || 0;
      if (ca > 0 && cb > 0 && ca !== cb) return cb - ca;
      if (a.item.id && b.item.id && a.item.id.startsWith('-') && b.item.id.startsWith('-') && a.item.id !== b.item.id) {
        return b.item.id.localeCompare(a.item.id);
      }
      return b.idx - a.idx;
    })
    .map((x) => x.item);
}

export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  if (items.length <= 1 || seed <= 0) return items;
  const arr = [...items];
  let s = (seed * 2654435761) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export const DEFAULT_TELECOM_CATEGORIES: string[] = [
  'Robi',
  'Circle',
  'Grameenphone',
  'Banglalink',
  'Airtel',
  'Teletalk',
];

export function getTelecomCategoryLabel(cat: string, lang: LangCode = 'bn'): string {
  const key = (cat || '').trim().toLowerCase();
  const map: Record<string, { bn: string; en: string }> = {
    robi: { bn: 'রবি (Robi)', en: 'Robi' },
    circle: { bn: 'সার্কেল (Circle)', en: 'Circle' },
    grameenphone: { bn: 'গ্রামীণফোন (GP)', en: 'Grameenphone' },
    banglalink: { bn: 'বাংলালিংক (BL)', en: 'Banglalink' },
    airtel: { bn: 'এয়ারটেল (Airtel)', en: 'Airtel' },
    teletalk: { bn: 'টেলিটক (Teletalk)', en: 'Teletalk' },
  };
  return map[key] ? map[key][lang] : cat;
}

export interface ThemePresetMeta {
  id: ThemeMode;
  labelBn: string;
  labelEn: string;
  descBn: string;
  descEn: string;
  isDark: boolean;
  swatchBg: string;
  swatchCard: string;
  swatchAccent: string;
  isAdminExtra?: boolean;
}

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: 'dark',
    labelBn: 'এমারেল্ড ডার্ক (ডিফল্ট)',
    labelEn: 'Emerald Dark',
    descBn: 'ডার্ক বেস',
    descEn: 'Dark Base',
    isDark: true,
    swatchBg: '#071312',
    swatchCard: '#0d1f1d',
    swatchAccent: '#f59e0b',
  },
  {
    id: 'light',
    labelBn: 'ক্লাসিক পার্ল (লাইট)',
    labelEn: 'Classic Pearl Light',
    descBn: 'লাইট বেস',
    descEn: 'Light Base',
    isDark: false,
    swatchBg: '#f6f8f7',
    swatchCard: '#ffffff',
    swatchAccent: '#065f46',
  },
  {
    id: 'cyber_violet',
    labelBn: 'রয়্যাল ভায়োলেট প্রো',
    labelEn: 'Royal Violet Pro',
    descBn: 'ডিপ পার্পল + নিওন ভায়োলেট',
    descEn: 'Deep Purple + Violet Neon',
    isDark: true,
    swatchBg: '#0d0718',
    swatchCard: '#171029',
    swatchAccent: '#a855f7',
    isAdminExtra: true,
  },
  {
    id: 'carbon_amber',
    labelBn: 'ব্ল্যাক গোল্ড লাক্সারি',
    labelEn: 'Carbon Gold Luxury',
    descBn: 'অনিক্স ব্ল্যাক + মেটালিক গোল্ড',
    descEn: 'Onyx Black + Metallic Gold',
    isDark: true,
    swatchBg: '#09090b',
    swatchCard: '#141418',
    swatchAccent: '#eab308',
    isAdminExtra: true,
  },
  {
    id: 'nordic_slate',
    labelBn: 'নর্ডিক কোবাল্ট নাইট',
    labelEn: 'Nordic Cobalt Night',
    descBn: 'মিডনাইট নেভি + ইলেকট্রিক সায়ান',
    descEn: 'Midnight Navy + Electric Cyan',
    isDark: true,
    swatchBg: '#091122',
    swatchCard: '#121d33',
    swatchAccent: '#06b6d4',
    isAdminExtra: true,
  },
  {
    id: 'sunset_coral',
    labelBn: 'কোরাল পিচ লাইট',
    labelEn: 'Sunset Coral Light',
    descBn: 'ওয়ার্ম পোর্সেলিন + কোরাল অরেঞ্জ',
    descEn: 'Warm Porcelain + Coral Accent',
    isDark: false,
    swatchBg: '#fff6f3',
    swatchCard: '#ffffff',
    swatchAccent: '#ea580c',
    isAdminExtra: true,
  },
  {
    id: 'royal_indigo',
    labelBn: 'মডার্ন ইন্ডিগো লাইট',
    labelEn: 'Modern Indigo Light',
    descBn: 'ক্রিস্প স্টুডিও + রয়্যাল ইন্ডিগো',
    descEn: 'Crisp Ice + Royal Indigo',
    isDark: false,
    swatchBg: '#eff4ff',
    swatchCard: '#ffffff',
    swatchAccent: '#4338ca',
    isAdminExtra: true,
  },
  {
    id: 'forest_jade',
    labelBn: 'বোটানিক্যাল জেড লাইট',
    labelEn: 'Botanical Jade Luxe',
    descBn: 'সফট সেজ আইভরি + জেড গ্রিন',
    descEn: 'Sage Ivory + Botanical Jade',
    isDark: false,
    swatchBg: '#edf6f0',
    swatchCard: '#ffffff',
    swatchAccent: '#0f766e',
    isAdminExtra: true,
  },
];

export function isDarkThemePreset(theme?: string | null): boolean {
  const found = THEME_PRESETS.find((t) => t.id === theme);
  if (found) return found.isDark;
  return !['light', 'sunset_coral', 'royal_indigo', 'forest_jade', 'mint_cream', 'warm_sand'].includes(
    (theme || '').toLowerCase()
  );
}

export function isDrivePackageCategory(cat?: string | null): boolean {
  return /(ড্রাইভ\s*প্যাকেজ|drive\s*pack)/i.test((cat || '').trim());
}

export function isClothingCategory(cat?: string | null): boolean {
  return /(পোশাক|কাপড়|কাপড়|বস্ত্র|জামা|টি-শার্ট|টিশার্ট|হুডি|পাঞ্জাবি|শাড়ি|শাড়ি|থ্রি-পিস|ফ্যাশন|লুঙ্গি|গেঞ্জি|প্যান্ট|cloth|fashion|apparel|shirt|hoodie|pant|dress|garment|panjabi|saree|lungi|jacket)/i.test(
    (cat || '').trim()
  );
}

export function isLiquidWeightCategory(cat?: string | null): boolean {
  return /(লিকুইড|তরল|তেল|ঘি|মধু|চাউল|চাল|ডাল|মাছ|মাংস|দুধ|পানি|ওজন|কেজি|গ্রাম|লিটার|মিলি|মশলা|liquid|oil|ghee|honey|grocery|weight|rice|milk|kg|gram|liter|ml)/i.test(
    (cat || '').trim()
  );
}

export function isVipSimProduct(h?: HouseItem | null): boolean {
  return h?.data?.productType === 'vip_sim';
}

export function isTelecomDriveProduct(h?: HouseItem | null): boolean {
  if (!h?.data) return false;
  const pType = h.data.productType;
  if (pType === 'vip_sim') return false;
  if (pType === 'telecom' || pType === 'data_package') {
    return true;
  }
  const cat = (h.data.category || '').trim();
  if (isDrivePackageCategory(cat)) {
    return true;
  }
  if (pType && ['physical', 'digital', 'liquid_weight', 'clothing_size'].includes(pType)) {
    return false;
  }
  const title = (h.data.title || '').trim();
  if (/(টেলিকম|ড্রাইভ|ডাটা|telecom|drive|data pack)/i.test(cat)) {
    return true;
  }
  return /(ড্রাইভ\s*অফার|ড্রাইভ\s*প্যাক|মিনিট\s*অফার|বান্ডেল\s*অফার|ইন্টারনেট\s*অফার|রিচার্জ\s*অফার|drive\s*offer|drive\s*pack)/i.test(
    title
  );
}

export function normalizeFooterSettings(s: SiteSettings): SiteSettings {
  const isLegacySubtitle =
    !s.footerSubtitle ||
    (!s.footerCustomized && s.footerSubtitle.trim() === 'বাংলাদেশের সেরা মার্কেটপ্লেস');
  const isLegacyDesc =
    !s.footerDesc || (!s.footerCustomized && s.footerDesc.trim() === 'নিরাপদ কেনাকাটা');
  const isLegacyLogo =
    !s.footerLogo || (!s.footerCustomized && s.footerLogo.trim() === '/pwa-192x192.png');

  return {
    ...s,
    logo: s.logo || '/app-logo.png',
    footerLogo: isLegacyLogo ? '/app-logo.png' : s.footerLogo,
    footerTitle: s.footerTitle || s.appName || 'Amader Market',
    footerSubtitle: isLegacySubtitle ? 'At Technology Ltd' : s.footerSubtitle,
    footerDesc: isLegacyDesc
      ? '⏳ সীমিত সংখ্যক সেলার এডমিন নেওয়া হবে — দেরি না করে এখনই আবেদন করুন!'
      : s.footerDesc,
    footerCopyright:
      s.footerCopyright || '© 07-03-2026 Amader Market. All Rights Reserved.',
    footerCredit: s.footerCredit || 'Built with ❤️ by Amader Market By Amit Hasan',
    showFooter: s.showFooter !== false,
    showFloatingWhatsapp: s.showFloatingWhatsapp !== false,
  };
}

export function getWhatsAppUrl(rawPhone?: string | null, text?: string): string {
  const digits = (rawPhone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  let normalized = digits;
  if (normalized.startsWith('01') && normalized.length === 11) {
    normalized = `88${normalized}`;
  } else if (normalized.startsWith('1') && normalized.length === 10) {
    normalized = `880${normalized}`;
  }
  const msg = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${normalized}${msg}`;
}


