import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  auth,
  db,
  onAuthStateChanged,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  signOut,
  update,
  type User,
} from './services/firebase';
import {
  cacheSet,
  clearOfflineCache,
  getCachedImageCount,
  loadFullCacheSnapshot,
  prewarmImageCache,
} from './services/offlineCache';
import type {
  AdminActionRequest,
  AppView,
  CartItem,
  ChatThread,
  ControlTab,
  Coupon,
  HouseItem,
  LangCode,
  OrderItem,
  PartnerRequest,
  ProductVariation,
  SiteSettings,
  StoreRequest,
  ThemeMode,
  UserProfile,
  UserRole,
  WithdrawalItem,
} from './types/marketplace';
import {
  DEFAULT_SITE_SETTINGS,
  getEffectivePrice,
  getParsedReviews,
  getProductShortParam,
  getSafeImage,
  getStoreShortParam,
  isDarkThemePreset,
  isDrivePackageCategory,
  isMainSuperAdminAccount,
  isModeratorOrAbove,
  isSuperAdminAccount,
  normalizeFooterSettings,
  sortHousesNewestFirst,
  SUPER_ADMIN_EMAIL,
} from './utils/i18n';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { SplashLoader } from './components/SplashLoader';
import { NavigationShell } from './components/NavigationShell';
import { HomeView } from './components/HomeView';
import { ShopView } from './components/ShopView';
import { ProductDetailView } from './components/ProductDetailView';
import { StoreView } from './components/StoreView';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ChatModal } from './components/ChatModal';
import { AuthView } from './components/AuthView';
import { AccountView, OrdersView } from './components/OrdersAndAccountView';
import { ControlCenterView } from './components/ControlCenterView';
import { ProductCard } from './components/ProductCard';
import { ConfirmProvider, useConfirm } from './components/ConfirmProvider';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface NavSnapshot {
  view: AppView;
  selectedHouse: HouseItem | null;
  currentStoreId: string;
  selectedCategory: string;
}

export default function App() {
  const [lang, setLang] = useState<LangCode>(() => {
    const saved = localStorage.getItem('appLang');
    return saved === 'en' ? 'en' : 'bn';
  });

  return (
    <ConfirmProvider lang={lang}>
      <AppContent lang={lang} setLang={setLang} />
    </ConfirmProvider>
  );
}

function AppContent({
  lang,
  setLang,
}: {
  lang: LangCode;
  setLang: React.Dispatch<React.SetStateAction<LangCode>>;
}) {
  const confirm = useConfirm();
  const isOnline = useOnlineStatus();

  const [userThemeOverride, setUserThemeOverride] = useState<'light' | 'dark' | null>(() => {
    const saved = localStorage.getItem('amader_user_theme_choice');
    if (saved === 'light' || saved === 'dark') return saved;
    return null;
  });
  const [adminPreviewTheme, setAdminPreviewTheme] = useState<ThemeMode | null>(null);

  const [booting, setBooting] = useState(true);
  const [bootStage, setBootStage] = useState('ক্যাশ পরীক্ষা করা হচ্ছে...');
  const [bootProgress, setBootProgress] = useState(18);
  const [isSyncing, setIsSyncing] = useState(false);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [houses, setHouses] = useState<HouseItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [storeRequests, setStoreRequests] = useState<StoreRequest[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);
  const [adminActionRequests, setAdminActionRequests] = useState<AdminActionRequest[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>(undefined);
  const [cachedImagesCount, setCachedImagesCount] = useState(0);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('guest');

  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedHouse, setSelectedHouse] = useState<HouseItem | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('myCart');
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('myWishlist');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<Coupon | null>(null);
  const [cartDiscount, setCartDiscount] = useState(0);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isCartCheckout, setIsCartCheckout] = useState(false);
  const [checkoutVariation, setCheckoutVariation] = useState<ProductVariation | null>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);

  const [chatOpen, setChatOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatTargetName, setChatTargetName] = useState('');
  const [rawChats, setRawChats] = useState<
    Record<string, { meta?: { lastMessage?: string; lastSender?: string; lastTimestamp?: number; unread?: number } }>
  >({});
  const [controlTabReq, setControlTabReq] = useState<{ tab: ControlTab; seq: number }>({
    tab: 'overview',
    seq: 0,
  });
  const [seenSellerOrdersAt, setSeenSellerOrdersAt] = useState<number>(0);
  const [seenBuyerOrdersAt, setSeenBuyerOrdersAt] = useState<number>(0);
  const [seenReviewsAt, setSeenReviewsAt] = useState<number>(0);
  const [seenUsersAt, setSeenUsersAt] = useState<number>(0);
  const [seenProductsAt, setSeenProductsAt] = useState<number>(0);
  const [seenWalletAt, setSeenWalletAt] = useState<number>(0);
  const [seenChatMap, setSeenChatMap] = useState<Record<string, number>>({});

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const activeTheme: ThemeMode =
    adminPreviewTheme ?? userThemeOverride ?? siteSettings.defaultTheme ?? 'dark';
  const isDarkTheme = isDarkThemePreset(activeTheme);

  const handleSelectFrontTheme = useCallback(
    (next?: 'light' | 'dark') => {
      const target: 'light' | 'dark' = next ?? (isDarkTheme ? 'light' : 'dark');
      setAdminPreviewTheme(null);
      setUserThemeOverride(target);
      localStorage.setItem('amader_user_theme_choice', target);
    },
    [isDarkTheme]
  );

  useEffect(() => {
    if (activeView !== 'control' && adminPreviewTheme) {
      setAdminPreviewTheme(null);
    }
  }, [activeView, adminPreviewTheme]);

  // Sync theme class & data-theme attribute on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', activeTheme);
  }, [activeTheme, isDarkTheme]);

  useEffect(() => {
    localStorage.setItem('appLang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('myCart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('myWishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const withoutDriveCategory = (s: SiteSettings): SiteSettings => {
    const rawCats: string[] =
      s.categories && s.categories.length > 0
        ? s.categories
        : DEFAULT_SITE_SETTINGS.categories || ['অন্যান্য'];
    const filtered = rawCats.filter((c) => !isDrivePackageCategory(c));
    return normalizeFooterSettings({
      ...s,
      categories: filtered.length > 0 ? filtered : ['অন্যান্য'],
    });
  };

  const initialDeepLinkRef = useRef<{ product: string | null; store: string | null } | null>(null);
  if (initialDeepLinkRef.current === null && typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search);
    initialDeepLinkRef.current = {
      product: p.get('p') || p.get('product'),
      store: p.get('s') || p.get('store'),
    };
  }
  const deepLinkAppliedRef = useRef(false);

  // 1. Instant IndexedDB Cache Hydration + Background Live Firebase Sync
  useEffect(() => {
    let mounted = true;
    let firstLoadTimer: ReturnType<typeof setTimeout> | null = null;
    let latestHouses: HouseItem[] = [];
    let latestUsers: UserProfile[] = [];
    let housesLoaded = false;
    let usersLoaded = false;

    const applyDeepLinkIfNeeded = (
      list: HouseItem[],
      userList: UserProfile[] = [],
      finalizeIfMissing = false
    ) => {
      if (deepLinkAppliedRef.current) return;
      const dl = initialDeepLinkRef.current;
      if (!dl || (!dl.product && !dl.store)) {
        deepLinkAppliedRef.current = true;
        return;
      }
      if (dl.product) {
        const prodParam = dl.product.trim();
        const codePart = prodParam.includes('~')
          ? prodParam.split('~').pop() || prodParam
          : prodParam.split('_').pop() || prodParam;
        const target =
          list.find((x) => x.id === prodParam) ||
          list.find((x) => x.id === codePart) ||
          list.find((x) => x.id.endsWith(codePart));
        if (target) {
          setSelectedHouse(target);
          setActiveView('details');
          deepLinkAppliedRef.current = true;
          return;
        }
      } else if (dl.store) {
        const storeParam = dl.store.trim();
        const storeCode = storeParam.includes('~')
          ? storeParam.split('~').pop() || storeParam
          : storeParam.split('_').pop() || storeParam;
        const matchedUser =
          userList.find((u) => u.uid === storeParam || u.uid === storeCode || u.uid.endsWith(storeCode)) ||
          undefined;
        const matchedHouse = list.find(
          (h) =>
            h.ownerId === storeParam ||
            h.data?.ownerId === storeParam ||
            h.ownerId?.endsWith(storeCode) ||
            h.data?.ownerId?.endsWith(storeCode)
        );
        const resolvedUid = matchedUser?.uid || matchedHouse?.ownerId || matchedHouse?.data?.ownerId;
        if (resolvedUid) {
          setCurrentStoreId(resolvedUid);
          setActiveView('store');
          deepLinkAppliedRef.current = true;
          return;
        } else if (finalizeIfMissing && !storeParam.includes('~')) {
          setCurrentStoreId(storeCode);
          setActiveView('store');
          deepLinkAppliedRef.current = true;
          return;
        }
      }
      if (finalizeIfMissing) {
        deepLinkAppliedRef.current = true;
      }
    };

    const init = async () => {
      const snap = await loadFullCacheSnapshot();
      if (!mounted) return;

      const hasCachedCatalog = Boolean(snap.houses && snap.houses.length > 0);
      if (snap.siteSettings) {
        setSiteSettings(withoutDriveCategory({ ...DEFAULT_SITE_SETTINGS, ...snap.siteSettings }));
      }
      if (snap.users) {
        latestUsers = snap.users;
        setUsers(snap.users);
      }
      if (snap.houses) {
        const sortedCached = sortHousesNewestFirst(snap.houses);
        latestHouses = sortedCached;
        setHouses(sortedCached);
        applyDeepLinkIfNeeded(sortedCached, snap.users || [], false);
      }
      if (snap.orders) setOrders(snap.orders);
      if (snap.withdrawals) setWithdrawals(snap.withdrawals);
      if (snap.storeRequests) setStoreRequests(snap.storeRequests);
      if (snap.partnerRequests) setPartnerRequests(snap.partnerRequests);
      if (snap.adminActionRequests) setAdminActionRequests(snap.adminActionRequests);
      if (snap.lastSyncAt) setLastSyncAt(snap.lastSyncAt);

      getCachedImageCount().then((c) => mounted && setCachedImagesCount(c));

      if (hasCachedCatalog) {
        // Already cached -> instant zero-wait boot
        setBootProgress(100);
        setBooting(false);
      } else {
        setBootStage(
          lang === 'bn'
            ? 'লাইভ মার্কেটপ্লেস থেকে সব ডাটা প্রথমবার লোড হচ্ছে...'
            : 'Preloading live marketplace catalog...'
        );
        setBootProgress(42);
        firstLoadTimer = setTimeout(() => {
          if (mounted) setBooting(false);
        }, 5500);
      }
    };

    init();

    // Attach real-time Firebase listeners
    const unsubSettings = onValue(ref(db, 'settings'), (s) => {
      const val = s.val();
      if (val && mounted) {
        const merged = withoutDriveCategory({ ...DEFAULT_SITE_SETTINGS, ...val });
        setSiteSettings(merged);
        cacheSet('siteSettings', merged);
        setBootProgress((p) => Math.max(p, 70));
      }
    });

    const unsubHouses = onValue(ref(db, 'houses'), (s) => {
      if (!mounted) return;
      const val = s.val();
      const rawList: HouseItem[] = val
        ? Object.keys(val).map((k) => ({
            id: k,
            ownerId: val[k].ownerId,
            createdAt: val[k].createdAt,
            data: val[k].data || {},
            adminHiddenData: val[k].adminHiddenData || {},
          }))
        : [];
      const list = sortHousesNewestFirst(rawList);
      latestHouses = list;
      housesLoaded = true;
      setHouses(list);
      const now = Date.now();
      setLastSyncAt(now);
      cacheSet('houses', list);
      cacheSet('lastSyncAt', now);

      setBootStage(
        lang === 'bn' ? 'প্রোডাক্ট ক্যাশ প্রস্তুত সম্পন্ন!' : 'Marketplace cache ready!'
      );
      setBootProgress(100);
      setTimeout(() => {
        if (mounted) setBooting(false);
      }, 220);

      // Deep link support (?p=slug~code, ?s=slug~code, ?product=..., ?store=...)
      const dl = initialDeepLinkRef.current;
      const canFinalize = dl?.store ? usersLoaded : true;
      applyDeepLinkIfNeeded(list, latestUsers, canFinalize);

      // Silently pre-warm product thumbnails in Cache Storage for offline use
      const imgUrls = list.map((h) => getSafeImage(h)).filter(Boolean);
      prewarmImageCache(imgUrls, 45).then(() => {
        getCachedImageCount().then((c) => mounted && setCachedImagesCount(c));
      });
    });

    const unsubOrders = onValue(ref(db, 'orders'), (s) => {
      if (!mounted) return;
      const val = s.val();
      const list: OrderItem[] = val
        ? Object.keys(val)
            .map((k) => ({ orderId: k, ...val[k] }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        : [];
      setOrders(list);
      cacheSet('orders', list);
    });

    const unsubUsers = onValue(ref(db, 'users'), (s) => {
      if (!mounted) return;
      const val = s.val();
      const list: UserProfile[] = val
        ? Object.keys(val).map((k) => ({ uid: k, ...val[k] }))
        : [];
      latestUsers = list;
      usersLoaded = true;
      setUsers(list);
      cacheSet('users', list);
      applyDeepLinkIfNeeded(latestHouses, list, housesLoaded);
    });

    const unsubWithdrawals = onValue(ref(db, 'withdrawals'), (s) => {
      if (!mounted) return;
      const val = s.val();
      const list: WithdrawalItem[] = val
        ? Object.keys(val)
            .map((k) => ({ id: k, ...val[k] }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];
      setWithdrawals(list);
      cacheSet('withdrawals', list);
    });

    const unsubStoreReq = onValue(ref(db, 'store_requests'), (s) => {
      if (!mounted) return;
      const val = s.val();
      const list: StoreRequest[] = val
        ? Object.keys(val)
            .map((k) => ({ id: k, ...val[k] }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];
      setStoreRequests(list);
      cacheSet('storeRequests', list);
    });

    const unsubPartnerReq = onValue(ref(db, 'partner_requests'), (s) => {
      if (!mounted) return;
      const val = s.val();
      const list: PartnerRequest[] = val
        ? Object.keys(val)
            .map((k) => ({ id: k, ...val[k] }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];
      setPartnerRequests(list);
      cacheSet('partnerRequests', list);
    });

    const unsubAdminActionReq = onValue(ref(db, 'admin_action_requests'), (s) => {
      if (!mounted) return;
      const val = s.val();
      const list: AdminActionRequest[] = val
        ? Object.keys(val)
            .map((k) => ({ id: k, ...val[k] }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];
      setAdminActionRequests(list);
      cacheSet('adminActionRequests', list);
    });

    const unsubChats = onValue(ref(db, 'chats'), (s) => {
      if (!mounted) return;
      setRawChats(s.val() || {});
    });

    return () => {
      mounted = false;
      if (firstLoadTimer) clearTimeout(firstLoadTimer);
      unsubSettings();
      unsubHouses();
      unsubOrders();
      unsubUsers();
      unsubWithdrawals();
      unsubStoreReq();
      unsubPartnerReq();
      unsubAdminActionReq();
      unsubChats();
    };
  }, [lang]);

  // 2. Auth & Real-Time Presence Listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubConn: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      if (unsubProfile) unsubProfile();
      if (unsubConn) unsubConn();

      if (!u) {
        setUserProfile(null);
        setRole('guest');
        return;
      }

      const uRef = ref(db, `users/${u.uid}`);
      unsubProfile = onValue(uRef, (snap) => {
        const val = snap.val() as UserProfile | null;
        if (val) {
          setUserProfile({ ...val, uid: u.uid });
          const isSA = isSuperAdminAccount(u.email, val.role);
          setRole(isSA ? 'super_admin' : val.role || 'user');
          if (Array.isArray(val.wishlist)) {
            setWishlist(val.wishlist);
          }
        } else {
          const isSA = isSuperAdminAccount(u.email, null);
          setRole(isSA ? 'super_admin' : 'user');
        }
      });

      const connRef = ref(db, '.info/connected');
      unsubConn = onValue(connRef, (snap) => {
        if (snap.val() === true) {
          onDisconnect(uRef).update({ isOnline: false, lastActive: Date.now() });
          update(uRef, { isOnline: true, lastLogin: Date.now(), lastActive: Date.now() });
        }
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubConn) unsubConn();
    };
  }, []);

  const isMainSuperAdmin = Boolean(authUser && isMainSuperAdminAccount(authUser.email));
  const isSuperAdmin = Boolean(
    authUser && isSuperAdminAccount(authUser.email, userProfile?.role || role)
  );
  const isAssistantSuperAdmin = isSuperAdmin && !isMainSuperAdmin;
  const isAdminOrPartner =
    isSuperAdmin ||
    role === 'admin' ||
    role === 'partner' ||
    role === 'manager' ||
    role === 'moderator';
  const isMaintenanceBlocked = Boolean(
    siteSettings.maintenance && !isAdminOrPartner
  );

  const mainSAUid = useMemo(
    () => users.find((u) => isMainSuperAdminAccount(u.email))?.uid || '',
    [users]
  );

  // Hydrate per-user seen notification timestamps when user logs in
  useEffect(() => {
    if (!authUser?.uid) {
      setSeenSellerOrdersAt(0);
      setSeenBuyerOrdersAt(0);
      setSeenReviewsAt(0);
      setSeenUsersAt(0);
      setSeenProductsAt(0);
      setSeenWalletAt(0);
      setSeenChatMap({});
      return;
    }
    const getOrInitTs = (key: string): number => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) return parsed;
      }
      const now = Date.now();
      localStorage.setItem(key, String(now));
      return now;
    };
    try {
      const sOrders = Number(
        localStorage.getItem(`amader_seen_seller_orders_${authUser.uid}`) || '0'
      );
      const bOrders = Number(
        localStorage.getItem(`amader_seen_buyer_orders_${authUser.uid}`) || '0'
      );
      const chatsRaw = localStorage.getItem(`amader_seen_chats_${authUser.uid}`);
      setSeenSellerOrdersAt(Number.isFinite(sOrders) ? sOrders : 0);
      setSeenBuyerOrdersAt(Number.isFinite(bOrders) ? bOrders : 0);
      setSeenReviewsAt(getOrInitTs(`amader_seen_reviews_${authUser.uid}`));
      setSeenUsersAt(getOrInitTs(`amader_seen_users_${authUser.uid}`));
      setSeenProductsAt(getOrInitTs(`amader_seen_products_${authUser.uid}`));
      setSeenWalletAt(getOrInitTs(`amader_seen_wallet_${authUser.uid}`));
      setSeenChatMap(chatsRaw ? (JSON.parse(chatsRaw) as Record<string, number>) : {});
    } catch {
      setSeenSellerOrdersAt(0);
      setSeenBuyerOrdersAt(0);
      setSeenReviewsAt(Date.now());
      setSeenUsersAt(Date.now());
      setSeenProductsAt(Date.now());
      setSeenWalletAt(Date.now());
      setSeenChatMap({});
    }
  }, [authUser?.uid]);

  const markSellerOrdersSeen = useCallback(() => {
    if (!authUser?.uid) return;
    const now = Date.now();
    setSeenSellerOrdersAt(now);
    try {
      localStorage.setItem(`amader_seen_seller_orders_${authUser.uid}`, String(now));
    } catch {
      // ignore storage quota
    }
  }, [authUser?.uid]);

  const markBuyerOrdersSeen = useCallback(() => {
    if (!authUser?.uid) return;
    const now = Date.now();
    setSeenBuyerOrdersAt(now);
    try {
      localStorage.setItem(`amader_seen_buyer_orders_${authUser.uid}`, String(now));
    } catch {
      // ignore storage quota
    }
  }, [authUser?.uid]);

  const markReviewsSeen = useCallback(() => {
    if (!authUser?.uid) return;
    const now = Date.now();
    setSeenReviewsAt(now);
    try {
      localStorage.setItem(`amader_seen_reviews_${authUser.uid}`, String(now));
    } catch {
      // ignore storage quota
    }
  }, [authUser?.uid]);

  const markUsersSeen = useCallback(() => {
    if (!authUser?.uid) return;
    const now = Date.now();
    setSeenUsersAt(now);
    try {
      localStorage.setItem(`amader_seen_users_${authUser.uid}`, String(now));
    } catch {
      // ignore storage quota
    }
  }, [authUser?.uid]);

  const markProductsSeen = useCallback(() => {
    if (!authUser?.uid) return;
    const now = Date.now();
    setSeenProductsAt(now);
    try {
      localStorage.setItem(`amader_seen_products_${authUser.uid}`, String(now));
    } catch {
      // ignore storage quota
    }
  }, [authUser?.uid]);

  const markWalletSeen = useCallback(() => {
    if (!authUser?.uid) return;
    const now = Date.now();
    setSeenWalletAt(now);
    try {
      localStorage.setItem(`amader_seen_wallet_${authUser.uid}`, String(now));
    } catch {
      // ignore storage quota
    }
  }, [authUser?.uid]);

  const markChatSeen = useCallback(
    (chatId: string) => {
      if (!authUser?.uid || !chatId) return;
      const now = Date.now();
      const threadTs = rawChats[chatId]?.meta?.lastTimestamp || 0;
      const targetTs = Math.max(now, threadTs);
      setSeenChatMap((prev) => {
        if ((prev[chatId] || 0) >= Math.max(threadTs, now - 500)) {
          return prev;
        }
        const next = { ...prev, [chatId]: targetTs };
        try {
          localStorage.setItem(`amader_seen_chats_${authUser.uid}`, JSON.stringify(next));
        } catch {
          // ignore storage quota
        }
        return next;
      });
    },
    [authUser?.uid, rawChats]
  );

  useEffect(() => {
    if (activeView === 'orders' && authUser?.uid) {
      markBuyerOrdersSeen();
    }
  }, [activeView, authUser?.uid, orders.length, markBuyerOrdersSeen]);

  const chatThreads = useMemo<ChatThread[]>(() => {
    if (!authUser?.uid || !rawChats) return [];
    const list: ChatThread[] = [];
    Object.keys(rawChats).forEach((cid) => {
      const parts = cid.split('_');
      const isSharedSupport = Boolean(
        isAssistantSuperAdmin && mainSAUid && parts.includes(mainSAUid)
      );
      if (!isMainSuperAdmin && !isSharedSupport && !parts.includes(authUser.uid)) return;
      const otherUid =
        parts.find((p) => (isSharedSupport ? p !== mainSAUid : p !== authUser.uid)) || parts[0];
      const otherUser = users.find((u) => u.uid === otherUid);
      const meta = rawChats[cid]?.meta || {};
      list.push({
        chatId: cid,
        otherUid,
        otherName: otherUser?.storeName || otherUser?.name || otherUser?.email || otherUid,
        otherPic: otherUser?.profilePic || otherUser?.storeLogo,
        lastMessage: meta.lastMessage || '',
        lastSender: meta.lastSender || '',
        lastTimestamp: meta.lastTimestamp || 0,
        unread: meta.unread || 0,
        isSupport: Boolean(mainSAUid && parts.includes(mainSAUid)),
      });
    });
    list.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    return list;
  }, [rawChats, authUser?.uid, isMainSuperAdmin, isAssistantSuperAdmin, mainSAUid, users]);

  const unseenSellerOrdersCount = useMemo(() => {
    if (!authUser?.uid) return 0;
    return orders.filter((o) => {
      if (o.hiddenFromAdmin) return false;
      const isMine = isMainSuperAdmin
        ? true
        : o.sellerId === authUser.uid ||
          Boolean(
            o.houseId &&
              houses.some(
                (h) =>
                  h.id === o.houseId &&
                  (h.ownerId === authUser.uid || h.data?.ownerId === authUser.uid)
              )
          ) ||
          Boolean(o.cartItems?.some((c) => c.sellerId === authUser.uid));
      return isMine && o.status === 'Pending' && (o.createdAt || 0) > seenSellerOrdersAt;
    }).length;
  }, [orders, houses, authUser?.uid, isMainSuperAdmin, seenSellerOrdersAt]);

  const unreadInboxCount = useMemo(() => {
    if (!authUser?.uid) return 0;
    return chatThreads.filter(
      (th) =>
        (th.lastTimestamp || 0) > (seenChatMap[th.chatId] || 0) &&
        th.lastSender !== authUser.uid &&
        th.lastSender !== 'amader_assistant_bot'
    ).length;
  }, [chatThreads, seenChatMap, authUser?.uid]);

  const unseenBuyerOrdersCount = useMemo(() => {
    if (!authUser?.uid) return 0;
    return orders.filter((o) => {
      if (o.userId !== authUser.uid) return false;
      const activityTs = (o as OrderItem & { updatedAt?: number }).updatedAt || o.createdAt || 0;
      return activityTs > seenBuyerOrdersAt;
    }).length;
  }, [orders, authUser?.uid, seenBuyerOrdersAt]);

  const isModeratorLevel = Boolean(
    authUser && isModeratorOrAbove(authUser.email, userProfile?.role || role)
  );

  const pendingApprovalsCount = useMemo(() => {
    if (!authUser?.uid || !isModeratorLevel) return 0;
    const pendingAct = isMainSuperAdmin
      ? adminActionRequests.filter((r) => r.status === 'Pending').length
      : 0;
    const pendingProds = houses.filter(
      (h) =>
        h.data?.status === 'pending' &&
        (isMainSuperAdmin ||
          h.data?.productType !== 'digital' ||
          h.ownerId === authUser.uid ||
          h.data?.ownerId === authUser.uid)
    ).length;
    const pendingStores = storeRequests.filter((r) => r.status === 'Pending').length;
    const pendingPartners =
      isSuperAdmin || role === 'admin' || role === 'partner'
        ? partnerRequests.filter((r) => r.status === 'Pending').length
        : 0;
    return pendingAct + pendingProds + pendingStores + pendingPartners;
  }, [
    authUser?.uid,
    isModeratorLevel,
    isMainSuperAdmin,
    isSuperAdmin,
    role,
    adminActionRequests,
    houses,
    storeRequests,
    partnerRequests,
  ]);

  const pendingWithdrawalsCount = useMemo(() => {
    if (!authUser?.uid) return 0;
    if (isMainSuperAdmin) {
      return withdrawals.filter((w) => w.status === 'Pending').length;
    }
    return withdrawals.filter((w) => {
      if (w.uid !== authUser.uid) return false;
      const upd = (w as WithdrawalItem & { updatedAt?: number }).updatedAt || 0;
      return upd > seenWalletAt;
    }).length;
  }, [withdrawals, authUser?.uid, isMainSuperAdmin, seenWalletAt]);

  const unseenReviewsCount = useMemo(() => {
    if (!authUser?.uid || !seenReviewsAt) return 0;
    let count = 0;
    houses.forEach((h) => {
      const isMine =
        isMainSuperAdmin || h.ownerId === authUser.uid || h.data?.ownerId === authUser.uid;
      if (!isMine) return;
      getParsedReviews(h).forEach((r) => {
        if ((r.date || 0) > seenReviewsAt) count += 1;
      });
    });
    return count;
  }, [houses, authUser?.uid, isMainSuperAdmin, seenReviewsAt]);

  const unseenUsersCount = useMemo(() => {
    if (!authUser?.uid || !isSuperAdmin || !seenUsersAt) return 0;
    return users.filter(
      (u) => u.uid !== authUser.uid && (u.createdAt || 0) > seenUsersAt
    ).length;
  }, [users, authUser?.uid, isSuperAdmin, seenUsersAt]);

  const unseenProductUpdatesCount = useMemo(() => {
    if (!authUser?.uid || isMainSuperAdmin || !seenProductsAt) return 0;
    return houses.filter((h) => {
      const isMine = h.ownerId === authUser.uid || h.data?.ownerId === authUser.uid;
      const upd = (h.data as { statusUpdatedAt?: number })?.statusUpdatedAt || 0;
      return isMine && upd > seenProductsAt;
    }).length;
  }, [houses, authUser?.uid, isMainSuperAdmin, seenProductsAt]);

  const controlBadgeCount =
    unseenSellerOrdersCount +
    unreadInboxCount +
    pendingApprovalsCount +
    pendingWithdrawalsCount +
    unseenReviewsCount +
    unseenUsersCount +
    unseenProductUpdatesCount;
  const accountBadgeCount = controlBadgeCount;

  const navStackRef = useRef<NavSnapshot[]>([]);

  const navigateTo = useCallback(
    (next: {
      view: AppView;
      selectedHouse?: HouseItem | null;
      currentStoreId?: string;
      selectedCategory?: string;
    }) => {
      const sameView =
        next.view === activeView &&
        (next.selectedHouse === undefined || next.selectedHouse?.id === selectedHouse?.id) &&
        (next.currentStoreId === undefined || next.currentStoreId === currentStoreId) &&
        (next.selectedCategory === undefined || next.selectedCategory === selectedCategory);

      if (!sameView) {
        if (next.view === 'home') {
          navStackRef.current = [];
        } else {
          navStackRef.current.push({
            view: activeView,
            selectedHouse,
            currentStoreId,
            selectedCategory,
          });
          if (navStackRef.current.length > 30) {
            navStackRef.current.shift();
          }
        }
        try {
          window.history.pushState({ amaderNav: true }, '');
        } catch {
          // ignore
        }
      }

      if (next.selectedHouse !== undefined) setSelectedHouse(next.selectedHouse);
      if (next.currentStoreId !== undefined) setCurrentStoreId(next.currentStoreId);
      if (next.selectedCategory !== undefined) setSelectedCategory(next.selectedCategory);
      setActiveView(next.view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeView, selectedHouse, currentStoreId, selectedCategory]
  );

  const handleBackNavigation = useCallback((): boolean => {
    // 1. Close topmost open modal/drawer first
    if (checkoutOpen) {
      setCheckoutOpen(false);
      return true;
    }
    if (cartOpen) {
      setCartOpen(false);
      return true;
    }
    if (chatOpen) {
      setChatOpen(false);
      return true;
    }
    const w = window as unknown as { __amaderCloseShellOverlay?: () => boolean };
    if (w.__amaderCloseShellOverlay && w.__amaderCloseShellOverlay()) {
      return true;
    }

    // 2. Pop previous view from in-app navigation stack
    const prev = navStackRef.current.pop();
    if (prev) {
      setSelectedHouse(prev.selectedHouse);
      setCurrentStoreId(prev.currentStoreId);
      setSelectedCategory(prev.selectedCategory);
      setActiveView(prev.view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }

    // 3. Fall back to Home if currently on another tab/view
    if (activeView !== 'home') {
      setActiveView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }

    return false;
  }, [checkoutOpen, cartOpen, chatOpen, activeView]);

  useEffect(() => {
    const w = window as unknown as { __amaderHandleBack?: () => boolean };
    w.__amaderHandleBack = handleBackNavigation;

    const onPopState = () => {
      handleBackNavigation();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (w.__amaderHandleBack === handleBackNavigation) {
        delete w.__amaderHandleBack;
      }
    };
  }, [handleBackNavigation]);

  // Keep URL query synced cleanly with short ?p=title~code / ?s=store~code
  useEffect(() => {
    if (
      !deepLinkAppliedRef.current &&
      (initialDeepLinkRef.current?.product || initialDeepLinkRef.current?.store)
    ) {
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('product');
      url.searchParams.delete('store');
      if (activeView === 'details' && selectedHouse?.id) {
        url.searchParams.delete('s');
        url.searchParams.set('p', getProductShortParam(selectedHouse.id, selectedHouse.data?.title));
      } else if (activeView === 'store' && currentStoreId) {
        url.searchParams.delete('p');
        const stUser = users.find((u) => u.uid === currentStoreId);
        url.searchParams.set(
          's',
          getStoreShortParam(currentStoreId, stUser?.storeName || stUser?.name)
        );
      } else {
        url.searchParams.delete('p');
        url.searchParams.delete('s');
      }
      const nextUrl = url.pathname + url.search + url.hash;
      const curUrl = window.location.pathname + window.location.search + window.location.hash;
      if (nextUrl !== curUrl) {
        window.history.replaceState(window.history.state, '', nextUrl);
      }
    } catch {
      // ignore
    }
  }, [activeView, selectedHouse?.id, selectedHouse?.data?.title, currentStoreId, users]);

  // Actions
  const handleSelectProduct = (h: HouseItem) => {
    navigateTo({ view: 'details', selectedHouse: h });
  };

  const handleToggleWishlist = async (houseId: string) => {
    const exists = wishlist.includes(houseId);
    const next = exists ? wishlist.filter((id) => id !== houseId) : [...wishlist, houseId];
    setWishlist(next);
    if (authUser) {
      await update(ref(db, `users/${authUser.uid}`), { wishlist: next });
    }
    notify(
      exists
        ? lang === 'bn'
          ? 'উইশলিস্ট থেকে সরানো হয়েছে'
          : 'Removed from wishlist'
        : lang === 'bn'
        ? 'উইশলিস্টে সেভ হয়েছে'
        : 'Saved to wishlist',
      'info'
    );
  };

  const handleAddToCart = (h: HouseItem, variation: ProductVariation | null = null) => {
    const v = variation ?? (h.data.variations && h.data.variations.length > 0 ? h.data.variations[0] : null);
    const unitPrice = v ? Number(v.price) : getEffectivePrice(h, siteSettings);
    const newItem: CartItem = {
      id: h.id,
      title: h.data.title,
      image: getSafeImage(h),
      price: unitPrice,
      quantity: 1,
      variation: v,
      sellerId: h.ownerId || h.data.ownerId || 'admin',
    };
    setCart((prev) => {
      const idx = prev.findIndex(
        (x) => x.id === newItem.id && JSON.stringify(x.variation) === JSON.stringify(newItem.variation)
      );
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], quantity: clone[idx].quantity + 1 };
        return clone;
      }
      return [...prev, newItem];
    });
    notify(lang === 'bn' ? 'কার্টে যোগ করা হয়েছে!' : 'Added to cart!', 'success');
    setCartOpen(true);
  };

  const handleApplyCartPromo = (code: string) => {
    if (!code.trim()) return;
    const found = (siteSettings.coupons || []).find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase()
    );
    if (!found) {
      notify(lang === 'bn' ? 'সঠিক প্রোমো কোড নয়!' : 'Invalid promo code!', 'error');
      return;
    }
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (subtotal < Number(found.minAmount || 0)) {
      notify(`Minimum order ৳${found.minAmount} required.`, 'error');
      return;
    }
    const disc =
      found.type === 'percent'
        ? Math.round((subtotal * Number(found.discount)) / 100)
        : Number(found.discount);
    setAppliedPromo(found);
    setCartDiscount(disc);
    notify(lang === 'bn' ? 'প্রোমো কোড প্রয়োগ হয়েছে!' : 'Promo applied!', 'success');
  };

  const handleOrderNow = (h: HouseItem, variation: ProductVariation | null, qty: number) => {
    if (h.data.productType === 'digital' && !authUser) {
      notify(
        siteSettings.digitalLoginWarning ||
          (lang === 'bn' ? 'ডিজিটাল প্রোডাক্ট কিনতে লগইন করুন!' : 'Please login for digital products.'),
        'error'
      );
      setActiveView('auth');
      return;
    }
    setSelectedHouse(h);
    setIsCartCheckout(false);
    setCheckoutVariation(variation);
    setCheckoutQty(qty);
    setCheckoutOpen(true);
  };

  const handleSubmitOrder = async (payload: {
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
  }) => {
    const orderDoc: Record<string, unknown> = {
      userId: authUser ? authUser.uid : 'guest',
      userEmail: authUser ? authUser.email : 'guest@example.com',
      name: payload.name,
      phone: payload.phone,
      message: payload.message,
      reference: payload.reference,
      paymentMethod: payload.paymentMethod,
      paymentProvider: payload.paymentProvider,
      trxId: payload.trxId,
      senderNumber: payload.senderNumber,
      status: 'Pending',
      createdAt: Date.now(),
      totalPrice: payload.totalPrice,
      productTotal: payload.productTotal,
      profit: payload.profit,
    };

    if (payload.offerTargetNumber) {
      orderDoc.offerTargetNumber = payload.offerTargetNumber;
    }
    if (payload.isTelecomOffer) {
      orderDoc.isTelecomOffer = true;
    }
    const finalPromoCode = isCartCheckout ? appliedPromo?.code : payload.appliedPromoCode;
    const finalPromoDisc = isCartCheckout ? cartDiscount : payload.promoDiscount;
    if (finalPromoCode) {
      orderDoc.appliedPromoCode = finalPromoCode;
    }
    if (finalPromoDisc && finalPromoDisc > 0) {
      orderDoc.promoDiscount = finalPromoDisc;
    }

    if (isCartCheckout) {
      orderDoc.isCart = true;
      orderDoc.cartItems = [...cart];
      orderDoc.sellerId = cart[0]?.sellerId || 'admin';
    } else if (selectedHouse) {
      orderDoc.houseId = selectedHouse.id;
      orderDoc.sellerId = selectedHouse.ownerId || selectedHouse.data.ownerId || 'admin';
      orderDoc.quantity = payload.quantity;
      orderDoc.selectedVariation = payload.selectedVariation;
    }

    const newRef = await push(ref(db, 'orders'), orderDoc);
    if (newRef.key) {
      await update(ref(db, `orders/${newRef.key}`), { orderId: newRef.key });
    }

    if (isCartCheckout) {
      setCart([]);
      setCartDiscount(0);
      setAppliedPromo(null);
    }

    setCheckoutOpen(false);
    notify(
      lang === 'bn' ? 'আপনার অর্ডার সফলভাবে সম্পন্ন হয়েছে!' : 'Order placed successfully!',
      'success'
    );
    if (authUser) setActiveView('orders');
  };

  const handleOpenSellerChat = (sellerId: string) => {
    if (!authUser) {
      notify(lang === 'bn' ? 'চ্যাট করতে লগইন করুন।' : 'Sign in to chat.', 'info');
      setActiveView('auth');
      return;
    }
    if (sellerId === authUser.uid) {
      notify(lang === 'bn' ? 'নিজের সাথে চ্যাট করা যাবে না।' : 'Cannot chat with yourself.', 'error');
      return;
    }
    const targetUser = users.find((u) => u.uid === sellerId);
    setActiveChatId(`${authUser.uid}_${sellerId}`);
    setChatTargetName(targetUser?.storeName || targetUser?.name || 'Seller');
    setChatOpen(true);
  };

  const handleOpenAdminChat = () => {
    if (!authUser) {
      notify(lang === 'bn' ? 'এডমিনের সাথে চ্যাট করতে লগইন করুন।' : 'Sign in to chat with Admin.', 'info');
      setActiveView('auth');
      return;
    }
    const sa = users.find((u) => (u.email || '').toLowerCase() === SUPER_ADMIN_EMAIL);
    if (!sa) {
      notify('Admin is currently unavailable.', 'error');
      return;
    }
    if (sa.uid === authUser.uid) {
      setActiveView('control');
      return;
    }
    setActiveChatId(`${authUser.uid}_${sa.uid}`);
    setChatTargetName('Amader Market Admin');
    setChatOpen(true);
  };

  const handleForceSync = async () => {
    if (!isOnline) {
      notify(lang === 'bn' ? 'ইন্টারনেট সংযোগ নেই।' : 'You are offline.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const imgUrls = houses.map((h) => getSafeImage(h)).filter(Boolean);
      await prewarmImageCache(imgUrls, 60);
      const count = await getCachedImageCount();
      setCachedImagesCount(count);
      const now = Date.now();
      setLastSyncAt(now);
      await cacheSet('lastSyncAt', now);
      notify(lang === 'bn' ? 'সব ডাটা ও ছবি ক্যাশে সিঙ্ক হয়েছে!' : 'Cache synced!', 'success');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    const ok = await confirm({
      title: lang === 'bn' ? 'ক্যাশ ক্লিয়ার করবেন?' : 'Clear Offline Cache?',
      message:
        lang === 'bn'
          ? 'আপনি কি সত্যিই সেভ করা সব অফলাইন ডাটা ও ক্যাশড ছবি মুছে ফেলতে চান?'
          : 'Are you sure you want to clear all cached marketplace data and images?',
      tone: 'warning',
    });
    if (!ok) return;
    await clearOfflineCache();
    setCachedImagesCount(0);
    notify(lang === 'bn' ? 'অফলাইন ক্যাশ পরিষ্কার করা হয়েছে।' : 'Offline cache cleared.', 'info');
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: lang === 'bn' ? 'লগআউট কনফার্মেশন' : 'Confirm Logout',
      message:
        lang === 'bn'
          ? 'আপনি কি আপনার একাউন্ট থেকে লগআউট করতে চান?'
          : 'Are you sure you want to sign out of your account?',
      tone: 'warning',
    });
    if (!ok) return;
    if (authUser) {
      await update(ref(db, `users/${authUser.uid}`), {
        isOnline: false,
        lastActive: Date.now(),
      });
    }
    await signOut(auth);
    setActiveView('home');
    notify(lang === 'bn' ? 'লগআউট সম্পন্ন হয়েছে।' : 'Signed out.', 'info');
  };

  const wishlistedHouses = useMemo(
    () => houses.filter((h) => wishlist.includes(h.id)),
    [houses, wishlist]
  );

  if (booting) {
    return <SplashLoader stage={bootStage} progress={bootProgress} lang={lang} />;
  }

  return (
    <>
      <NavigationShell
        activeView={activeView}
        onNavigate={(v) => {
          navigateTo({ view: v });
        }}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'bn' ? 'en' : 'bn'))}
        theme={isDarkTheme ? 'dark' : 'light'}
        onToggleTheme={handleSelectFrontTheme}
        siteSettings={siteSettings}
        userEmail={authUser?.email}
        userProfile={userProfile}
        role={role}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        wishlistCount={wishlist.length}
        onOpenCart={() => setCartOpen(true)}
        onOpenAdminChat={handleOpenAdminChat}
        isMainSuperAdmin={isMainSuperAdmin}
        onOpenFooterSettings={() => {
          setControlTabReq((p) => ({ tab: 'site_settings', seq: p.seq + 1 }));
          navigateTo({ view: 'control' });
          setTimeout(() => {
            document.getElementById('footer-settings-card')?.scrollIntoView({ behavior: 'smooth' });
          }, 250);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOnline={isOnline}
        lastSyncAt={lastSyncAt}
        cachedCount={houses.length}
        isSyncing={isSyncing}
        onForceSync={handleForceSync}
        ordersBadgeCount={unseenBuyerOrdersCount}
        controlBadgeCount={controlBadgeCount}
        accountBadgeCount={accountBadgeCount}
      >
        {isMaintenanceBlocked && activeView !== 'auth' ? (
          <div className="max-w-lg mx-auto px-4 py-16 text-center">
            <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-3xl p-8 space-y-4">
              <img
                src="/pwa-192x192.png"
                alt="Amader Market"
                className="w-20 h-20 rounded-2xl mx-auto object-cover"
              />
              <h1 className="font-display text-2xl font-bold">
                {lang === 'bn' ? 'মেইনটেনেন্স চলছে' : 'Maintenance in Progress'}
              </h1>
              <p className="text-sm text-slate-500">
                {lang === 'bn'
                  ? 'সাময়িক আপডেটের জন্য সাইট বন্ধ আছে। এডমিন হলে লগইন করে কন্ট্রোল করতে পারবেন।'
                  : 'Site is temporarily under maintenance. Admins can sign in below.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveView('auth')}
                className="min-h-[44px] px-6 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold"
              >
                {lang === 'bn' ? 'এডমিন লগইন' : 'Admin Sign In'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeView === 'home' && (
              <HomeView
                houses={houses}
                siteSettings={siteSettings}
                users={users}
                lang={lang}
                wishlist={wishlist}
                searchQuery={searchQuery}
                onSelectProduct={handleSelectProduct}
                onAddToCart={(h) => handleAddToCart(h)}
                onToggleWishlist={handleToggleWishlist}
                onSelectCategory={(cat) => {
                  navigateTo({ view: 'shop', selectedCategory: cat });
                }}
                onOpenShop={() => {
                  navigateTo({ view: 'shop', selectedCategory: '' });
                }}
              />
            )}

            {activeView === 'shop' && (
              <ShopView
                houses={houses}
                siteSettings={siteSettings}
                users={users}
                lang={lang}
                wishlist={wishlist}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onSelectProduct={handleSelectProduct}
                onAddToCart={(h) => handleAddToCart(h)}
                onToggleWishlist={handleToggleWishlist}
              />
            )}

            {activeView === 'details' && selectedHouse && (
              <ProductDetailView
                house={
                  houses.find((h) => h.id === selectedHouse.id) || selectedHouse
                }
                siteSettings={siteSettings}
                users={users}
                orders={orders}
                currentUserUid={authUser?.uid}
                isAdminOrPartner={isAdminOrPartner}
                isMainSuperAdmin={isMainSuperAdmin}
                lang={lang}
                isWishlisted={wishlist.includes(selectedHouse.id)}
                onBack={() => handleBackNavigation()}
                onOpenStore={(sellerId) => {
                  navigateTo({ view: 'store', currentStoreId: sellerId });
                }}
                onToggleWishlist={handleToggleWishlist}
                onAddToCart={handleAddToCart}
                onOrderNow={handleOrderNow}
                onChatWithSeller={handleOpenSellerChat}
                onSubmitReview={async (houseId, rating, comment) => {
                  await push(ref(db, `houses/${houseId}/data/reviews`), {
                    userId: authUser?.uid || 'guest',
                    userName: userProfile?.name || authUser?.email?.split('@')[0] || 'Guest',
                    rating,
                    comment,
                    date: Date.now(),
                  });
                  notify(lang === 'bn' ? 'রিভিউ যোগ হয়েছে!' : 'Review submitted!', 'success');
                }}
                onDeleteReview={async (houseId, reviewId) => {
                  const houseObj = houses.find((h) => h.id === houseId);
                  const ok = await confirm({
                    title: lang === 'bn' ? 'রিভিউ ডিলিট কনফার্মেশন' : 'Confirm Delete Review',
                    message:
                      !isMainSuperAdmin && isAdminOrPartner
                        ? lang === 'bn'
                          ? 'আপনি কি এই রিভিউটি ডিলিট করার রিকোয়েস্ট মেইন সুপার এডমিনের কাছে পাঠাতে চান?'
                          : 'Send a request to Main Super Admin to delete this review?'
                        : lang === 'bn'
                        ? 'আপনি কি সত্যিই এই কাস্টমার রিভিউটি ডিলিট করতে চান?'
                        : 'Are you sure you want to delete this review?',
                    detail: houseObj?.data?.title,
                    tone: 'danger',
                  });
                  if (!ok) return;
                  if (!isMainSuperAdmin && isAdminOrPartner) {
                    await push(ref(db, 'admin_action_requests'), {
                      actionType: 'delete_review',
                      targetId: houseId,
                      reviewId,
                      targetTitle: `Review on ${houseObj?.data?.title || 'Product'}`,
                      requestedByUid: authUser?.uid || 'unknown',
                      requestedByName: userProfile?.name || authUser?.email || 'Admin',
                      requestedByEmail: authUser?.email || '',
                      requestedByRole: role,
                      status: 'Pending',
                      timestamp: Date.now(),
                    });
                    notify(
                      lang === 'bn'
                        ? 'রিভিউ ডিলিট রিকোয়েস্ট মেইন সুপার এডমিনের কাছে পাঠানো হয়েছে।'
                        : 'Review delete request sent to Main Super Admin for approval.',
                      'info'
                    );
                    return;
                  }
                  await remove(ref(db, `houses/${houseId}/data/reviews/${reviewId}`));
                  notify(lang === 'bn' ? 'রিভিউ মুছে ফেলা হয়েছে।' : 'Review deleted.', 'info');
                }}
                onNotify={notify}
              />
            )}

            {activeView === 'store' && (
              <StoreView
                sellerId={currentStoreId}
                houses={houses}
                users={users}
                siteSettings={siteSettings}
                lang={lang}
                wishlist={wishlist}
                onBack={() => handleBackNavigation()}
                onSelectProduct={handleSelectProduct}
                onAddToCart={(h) => handleAddToCart(h)}
                onToggleWishlist={handleToggleWishlist}
                onChatWithSeller={handleOpenSellerChat}
                onNotify={notify}
              />
            )}

            {activeView === 'orders' && (
              <OrdersView
                orders={orders}
                houses={houses}
                currentUserUid={authUser?.uid}
                lang={lang}
                onOpenProduct={handleSelectProduct}
                onGoLogin={() => setActiveView('auth')}
              />
            )}

            {activeView === 'wishlist' && (
              <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-5 space-y-5">
                <h1 className="font-display text-xl sm:text-2xl font-bold">
                  {lang === 'bn' ? 'পছন্দের তালিকা (Wishlist)' : 'Saved Wishlist'}
                </h1>
                {wishlistedHouses.length === 0 ? (
                  <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
                    {lang === 'bn' ? 'কোনো পণ্য সেভ করা নেই।' : 'No saved items yet.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                    {wishlistedHouses.map((h) => (
                      <ProductCard
                        key={h.id}
                        house={h}
                        siteSettings={siteSettings}
                        users={users}
                        lang={lang}
                        isWishlisted
                        onSelect={handleSelectProduct}
                        onAddToCart={(item) => handleAddToCart(item)}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeView === 'account' &&
              (authUser ? (
                <AccountView
                  userEmail={authUser.email || ''}
                  userUid={authUser.uid}
                  role={role}
                  userProfile={userProfile}
                  siteSettings={siteSettings}
                  storeRequests={storeRequests}
                  lang={lang}
                  cachedProductsCount={houses.length}
                  cachedImagesCount={cachedImagesCount}
                  lastSyncAt={lastSyncAt}
                  onForceSync={handleForceSync}
                  onClearCache={handleClearCache}
                  onLogout={handleLogout}
                  onOpenControl={() => navigateTo({ view: 'control' })}
                  onOpenControlOrders={() => {
                    markSellerOrdersSeen();
                    setControlTabReq((p) => ({ tab: 'orders', seq: p.seq + 1 }));
                    navigateTo({ view: 'control' });
                  }}
                  onOpenControlInbox={() => {
                    setControlTabReq((p) => ({ tab: 'inbox', seq: p.seq + 1 }));
                    navigateTo({ view: 'control' });
                  }}
                  onOpenControlTab={(targetTab) => {
                    if (targetTab === 'orders') markSellerOrdersSeen();
                    if (targetTab === 'reviews') markReviewsSeen();
                    if (targetTab === 'users') markUsersSeen();
                    if (targetTab === 'products') markProductsSeen();
                    if (targetTab === 'wallet') markWalletSeen();
                    setControlTabReq((p) => ({ tab: targetTab, seq: p.seq + 1 }));
                    navigateTo({ view: 'control' });
                  }}
                  unseenSellerOrdersCount={unseenSellerOrdersCount}
                  unreadInboxCount={unreadInboxCount}
                  pendingApprovalsCount={pendingApprovalsCount}
                  pendingWithdrawalsCount={pendingWithdrawalsCount}
                  unseenReviewsCount={unseenReviewsCount}
                  unseenUsersCount={unseenUsersCount}
                  unseenProductUpdatesCount={unseenProductUpdatesCount}
                  onNotify={notify}
                />
              ) : (
                <AuthView
                  lang={lang}
                  siteSettings={siteSettings}
                  onSuccess={() => setActiveView('home')}
                  onNotify={notify}
                />
              ))}

            {activeView === 'control' && (
              <ControlCenterView
                lang={lang}
                userUid={authUser?.uid}
                userEmail={authUser?.email}
                role={role}
                userProfile={userProfile}
                houses={houses}
                allOrders={orders}
                users={users}
                withdrawals={withdrawals}
                storeRequests={storeRequests}
                partnerRequests={partnerRequests}
                adminActionRequests={adminActionRequests}
                siteSettings={siteSettings}
                initialTab={controlTabReq.tab}
                initialTabSeq={controlTabReq.seq}
                externalChatThreads={chatThreads}
                seenChatMap={seenChatMap}
                unseenSellerOrdersCount={unseenSellerOrdersCount}
                unreadInboxCount={unreadInboxCount}
                pendingWithdrawalsCount={pendingWithdrawalsCount}
                unseenReviewsCount={unseenReviewsCount}
                unseenUsersCount={unseenUsersCount}
                unseenProductUpdatesCount={unseenProductUpdatesCount}
                onMarkSellerOrdersSeen={markSellerOrdersSeen}
                onMarkChatSeen={markChatSeen}
                onMarkReviewsSeen={markReviewsSeen}
                onMarkUsersSeen={markUsersSeen}
                onMarkProductsSeen={markProductsSeen}
                onMarkWalletSeen={markWalletSeen}
                onGoLogin={() => setActiveView('auth')}
                onGoAccount={() => setActiveView('account')}
                onOpenChat={(cid, name) => {
                  markChatSeen(cid);
                  setActiveChatId(cid);
                  setChatTargetName(name);
                  setChatOpen(true);
                }}
                onPreviewTheme={(t) => setAdminPreviewTheme(t)}
                onThemeSaved={() => {
                  setAdminPreviewTheme(null);
                  setUserThemeOverride(null);
                  localStorage.removeItem('amader_user_theme_choice');
                }}
                onNotify={notify}
              />
            )}

            {activeView === 'auth' && (
              <AuthView
                lang={lang}
                siteSettings={siteSettings}
                onSuccess={() => setActiveView('home')}
                onNotify={notify}
              />
            )}
          </>
        )}
      </NavigationShell>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        lang={lang}
        siteSettings={siteSettings}
        appliedPromo={appliedPromo}
        discountAmount={cartDiscount}
        onUpdateQty={(idx, delta) => {
          setCart((prev) => {
            const clone = [...prev];
            clone[idx] = { ...clone[idx], quantity: Math.max(1, clone[idx].quantity + delta) };
            return clone;
          });
        }}
        onRemoveItem={(idx) => {
          setCart((prev) => prev.filter((_, i) => i !== idx));
        }}
        onApplyPromo={handleApplyCartPromo}
        onCheckout={() => {
          setCartOpen(false);
          setIsCartCheckout(true);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        isCartCheckout={isCartCheckout}
        selectedHouse={selectedHouse}
        selectedVariation={checkoutVariation}
        initialQty={checkoutQty}
        cart={cart}
        cartDiscount={cartDiscount}
        siteSettings={siteSettings}
        userProfile={userProfile}
        lang={lang}
        onNotify={notify}
        onSubmitOrder={handleSubmitOrder}
      />

      {authUser && (
        <ChatModal
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          chatId={activeChatId}
          targetName={chatTargetName}
          currentUid={authUser.uid}
          currentName={userProfile?.name || authUser.email?.split('@')[0] || 'User'}
          currentEmail={authUser.email || ''}
          currentRole={isSuperAdmin ? 'super_admin' : role}
          lang={lang}
          siteSettings={siteSettings}
          users={users}
          isMainSuperAdmin={isMainSuperAdmin}
          isAssistantSuperAdmin={isAssistantSuperAdmin}
          isSupportChat={Boolean(
            activeChatId && mainSAUid && activeChatId.split('_').includes(mainSAUid)
          )}
          onMarkSeen={markChatSeen}
          onNotify={notify}
        />
      )}

      {/* Toast Stack */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-xs pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg pointer-events-auto ${
              t.type === 'error'
                ? 'bg-rose-600'
                : t.type === 'success'
                ? 'bg-emerald-700'
                : 'bg-slate-800'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
