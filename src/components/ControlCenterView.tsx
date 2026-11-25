import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  Flame,
  ImagePlus,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Printer,
  Radio,
  Send,
  Settings,
  Shield,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { db, get, onValue, push, ref, remove, update } from '../services/firebase';
import type {
  AdminActionRequest,
  ChatThread,
  ControlTab,
  DigitalLink,
  DigitalTextItem,
  HouseAdminHiddenData,
  HouseData,
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
} from '../types/marketplace';
import {
  DEFAULT_TELECOM_CATEGORIES,
  formatBDT,
  formatDateShort,
  formatTimeAgo,
  getParsedReviews,
  getRoleLabel,
  getSafeImage,
  getTelecomCategoryLabel,
  getWaLink,
  isClothingCategory,
  isDrivePackageCategory,
  isLiquidWeightCategory,
  isMainSuperAdminAccount,
  isModeratorOrAbove,
  isSuperAdminAccount,
  isUserOnline,
  MAIN_SUPER_ADMIN_EMAIL,
  openExternalUrl,
  ROLE_HIERARCHY,
  TARGET_WEBSITE_URL,
} from '../utils/i18n';
import { normalizeExternalUrl, uploadImageFile } from '../utils/imageUpload';
import { RoleAvatar, RoleBadge } from './RoleBadge';
import { SiteSettingsControl } from './SiteSettingsControl';
import { useConfirm } from './ConfirmProvider';
import { buildOrderFullCopyText, OrderPrintModal, resolveOrderItems } from './OrderPrintModal';

interface ControlCenterViewProps {
  lang: LangCode;
  userUid?: string | null;
  userEmail?: string | null;
  role: UserRole;
  userProfile: UserProfile | null;
  houses: HouseItem[];
  allOrders: OrderItem[];
  users: UserProfile[];
  withdrawals: WithdrawalItem[];
  storeRequests: StoreRequest[];
  partnerRequests: PartnerRequest[];
  adminActionRequests: AdminActionRequest[];
  siteSettings: SiteSettings;
  initialTab?: ControlTab;
  initialTabSeq?: number;
  externalChatThreads?: ChatThread[];
  seenChatMap?: Record<string, number>;
  unseenSellerOrdersCount?: number;
  unreadInboxCount?: number;
  pendingWithdrawalsCount?: number;
  unseenReviewsCount?: number;
  unseenUsersCount?: number;
  unseenProductUpdatesCount?: number;
  onMarkSellerOrdersSeen?: () => void;
  onMarkChatSeen?: (chatId: string) => void;
  onMarkReviewsSeen?: () => void;
  onMarkUsersSeen?: () => void;
  onMarkProductsSeen?: () => void;
  onMarkWalletSeen?: () => void;
  onGoLogin: () => void;
  onGoAccount?: () => void;
  onOpenChat: (chatId: string, targetName: string) => void;
  onPreviewTheme?: (theme: ThemeMode) => void;
  onThemeSaved?: (theme: ThemeMode) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const EMPTY_HOUSE_DATA: HouseData = {
  title: '',
  category: 'অন্যান্য',
  location: '',
  description: '',
  rent: 0,
  oldPrice: 0,
  stock: 15,
  status: 'approved',
  featured: false,
  productType: 'physical',
  telecomCompany: '',
  offerValidity: '',
  saleType: 'regular',
  flashPrice: 0,
  flashDuration: 24,
  moq: 1,
  deliveryChargeDhaka: 60,
  deliveryChargeOutside: 120,
  variations: [],
  imageLinks: [],
  videoLinks: [],
  digitalLinks: [],
  secretInfo: '',
  campaign11: {
    active: false,
    discount: 0,
    type: 'percent',
  },
  paymentSettings: {
    method: 'both',
    bkash: '',
    bkashType: 'Personal',
    nagad: '',
    nagadType: 'Personal',
  },
};

export const ControlCenterView: React.FC<ControlCenterViewProps> = ({
  lang,
  userUid,
  userEmail,
  role,
  userProfile,
  houses,
  allOrders,
  users,
  withdrawals,
  storeRequests,
  partnerRequests,
  adminActionRequests,
  siteSettings,
  initialTab,
  initialTabSeq,
  externalChatThreads,
  seenChatMap = {},
  unseenSellerOrdersCount = 0,
  unreadInboxCount = 0,
  pendingWithdrawalsCount = 0,
  unseenReviewsCount = 0,
  unseenUsersCount = 0,
  unseenProductUpdatesCount = 0,
  onMarkSellerOrdersSeen,
  onMarkChatSeen,
  onMarkReviewsSeen,
  onMarkUsersSeen,
  onMarkProductsSeen,
  onMarkWalletSeen,
  onGoLogin,
  onGoAccount,
  onOpenChat,
  onPreviewTheme,
  onThemeSaved,
  onNotify,
}) => {
  const confirm = useConfirm();
  const [tab, setTab] = useState<ControlTab>(initialTab || 'overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HouseData>({ ...EMPTY_HOUSE_DATA });
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [digitalSecret, setDigitalSecret] = useState('');
  const [digitalLinks, setDigitalLinks] = useState<DigitalLink[]>([]);
  const [digitalTexts, setDigitalTexts] = useState<DigitalTextItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVarIdx, setUploadingVarIdx] = useState<number | null>(null);
  const [imgText, setImgText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderOwnerFilter, setOrderOwnerFilter] = useState<'ALL' | 'MINE' | 'OTHERS'>('ALL');
  const [printingOrder, setPrintingOrder] = useState<OrderItem | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'online' | 'admin' | 'seller' | 'user'>('ALL');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [withdrawAcct, setWithdrawAcct] = useState('');
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);

  const isMainSuperAdmin = isMainSuperAdminAccount(userEmail);
  const isAnySuperAdmin = isSuperAdminAccount(userEmail, userProfile?.role || role);
  const isAssistantSuperAdmin = !isMainSuperAdmin && isAnySuperAdmin;
  const isModeratorLevel = isModeratorOrAbove(userEmail, userProfile?.role || role);
  const isAdmin = isMainSuperAdmin || isAssistantSuperAdmin || role === 'admin';
  const staffChatEnabled = siteSettings.enableStaffSuperAdminChat !== false;

  const mainSuperAdminUser = useMemo(
    () => users.find((u) => isMainSuperAdminAccount(u.email)),
    [users]
  );

  const openDirectChatWithUser = (targetUid: string, targetName: string) => {
    if (!userUid || !targetUid) return;
    if (targetUid === userUid) {
      onNotify(lang === 'bn' ? 'নিজের সাথে চ্যাট করা যাবে না।' : 'Cannot message yourself.', 'info');
      return;
    }
    onOpenChat(`${userUid}_${targetUid}`, targetName);
  };

  const handleMessageMainSuperAdmin = () => {
    if (!staffChatEnabled && !isMainSuperAdmin) {
      onNotify(
        lang === 'bn'
          ? 'মেইন সুপার এডমিনের ডিরেক্ট মেসেজিং বর্তমানে বন্ধ রাখা হয়েছে।'
          : 'Direct messaging to Main Super Admin is currently disabled.',
        'error'
      );
      return;
    }
    if (!mainSuperAdminUser) {
      onNotify(
        lang === 'bn' ? 'মেইন সুপার এডমিন এখন পাওয়া যাচ্ছে না।' : 'Main Super Admin unavailable.',
        'error'
      );
      return;
    }
    openDirectChatWithUser(
      mainSuperAdminUser.uid,
      mainSuperAdminUser.name || (lang === 'bn' ? 'মেইন সুপার এডমিন' : 'Main Super Admin')
    );
  };

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab, initialTabSeq]);

  useEffect(() => {
    if (tab === 'orders' && onMarkSellerOrdersSeen) {
      onMarkSellerOrdersSeen();
    } else if (tab === 'reviews' && onMarkReviewsSeen) {
      onMarkReviewsSeen();
    } else if (tab === 'users' && onMarkUsersSeen) {
      onMarkUsersSeen();
    } else if (tab === 'products' && onMarkProductsSeen) {
      onMarkProductsSeen();
    } else if (tab === 'wallet' && onMarkWalletSeen) {
      onMarkWalletSeen();
    }
  }, [
    tab,
    onMarkSellerOrdersSeen,
    onMarkReviewsSeen,
    onMarkUsersSeen,
    onMarkProductsSeen,
    onMarkWalletSeen,
    allOrders.length,
    houses.length,
    users.length,
    withdrawals.length,
  ]);

  useEffect(() => {
    if (!userUid || externalChatThreads) return;
    const chatsRef = ref(db, 'chats');
    const unsub = onValue(chatsRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setChatThreads([]);
        return;
      }
      const saUid = mainSuperAdminUser?.uid;
      const list: ChatThread[] = [];
      Object.keys(val).forEach((cid) => {
        const parts = cid.split('_');
        const isSharedSupport = Boolean(isAssistantSuperAdmin && saUid && parts.includes(saUid));
        if (!isMainSuperAdmin && !isSharedSupport && !parts.includes(userUid)) return;
        const otherUid =
          parts.find((p) => (isSharedSupport ? p !== saUid : p !== userUid)) || parts[0];
        const otherUser = users.find((u) => u.uid === otherUid);
        const meta = val[cid]?.meta || {};
        list.push({
          chatId: cid,
          otherUid,
          otherName: otherUser?.storeName || otherUser?.name || otherUser?.email || otherUid,
          otherPic: otherUser?.profilePic || otherUser?.storeLogo,
          lastMessage: meta.lastMessage || '',
          lastSender: meta.lastSender || '',
          lastTimestamp: meta.lastTimestamp || 0,
          unread: meta.unread || 0,
          isSupport: Boolean(saUid && parts.includes(saUid)),
        });
      });
      list.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
      setChatThreads(list);
    });
    return () => unsub();
  }, [userUid, externalChatThreads, isMainSuperAdmin, isAssistantSuperAdmin, mainSuperAdminUser?.uid, users]);

  const effectiveChatThreads = externalChatThreads ?? chatThreads;

  const isOwnProduct = (h: HouseItem): boolean =>
    Boolean(userUid && (h.ownerId === userUid || h.data?.ownerId === userUid));

  const myHouses = useMemo(() => {
    if (!userUid) return [];
    if (isMainSuperAdmin) return houses;
    if (isAssistantSuperAdmin || role === 'admin' || role === 'partner') {
      return houses.filter((h) => isOwnProduct(h) || h.data?.productType !== 'digital');
    }
    return houses.filter((h) => isOwnProduct(h));
  }, [houses, userUid, isMainSuperAdmin, isAssistantSuperAdmin, role]);

  const pendingHouses = useMemo(
    () =>
      houses.filter(
        (h) =>
          h.data?.status === 'pending' &&
          (isMainSuperAdmin || h.data?.productType !== 'digital' || isOwnProduct(h))
      ),
    [houses, isMainSuperAdmin, userUid]
  );

  const pendingActionReqs = useMemo(
    () => adminActionRequests.filter((r) => r.status === 'Pending'),
    [adminActionRequests]
  );

  const pendingStoreReqs = useMemo(
    () => storeRequests.filter((r) => r.status === 'Pending'),
    [storeRequests]
  );

  const pendingPartnerReqs = useMemo(
    () => partnerRequests.filter((r) => r.status === 'Pending'),
    [partnerRequests]
  );

  // Per-post order attribution:
  // - Main Super Admin sees ALL orders across every seller/admin/assistant SA
  // - Every other seller/admin/assistant SA receives orders ONLY for their own posts
  const isOrderMine = (o: OrderItem): boolean => {
    if (!userUid) return false;
    if (o.sellerId === userUid) return true;
    if (o.houseId) {
      const prod = houses.find((h) => h.id === o.houseId);
      if (prod && (prod.ownerId === userUid || prod.data?.ownerId === userUid)) return true;
    }
    if (o.cartItems?.some((c) => c.sellerId === userUid)) return true;
    return false;
  };

  const reportOrdersBase = useMemo(() => {
    if (!userUid) return [];
    let base = isMainSuperAdmin ? allOrders : allOrders.filter((o) => isOrderMine(o));
    if (isMainSuperAdmin) {
      if (orderOwnerFilter === 'MINE') base = base.filter((o) => isOrderMine(o));
      if (orderOwnerFilter === 'OTHERS') base = base.filter((o) => !isOrderMine(o));
    }
    return base;
  }, [allOrders, houses, userUid, isMainSuperAdmin, orderOwnerFilter]);

  const adminVisibleOrdersCount = useMemo(
    () => allOrders.filter((o) => !o.hiddenFromAdmin).length,
    [allOrders]
  );

  const visibleOrders = useMemo(() => {
    const adminVisible = reportOrdersBase.filter((o) => !o.hiddenFromAdmin);
    if (orderStatusFilter === 'ALL') return adminVisible;
    return adminVisible.filter((o) => o.status === orderStatusFilter);
  }, [reportOrdersBase, orderStatusFilter]);

  const deliveredSales = useMemo(
    () =>
      reportOrdersBase
        .filter((o) => o.status === 'Delivered')
        .reduce((s, o) => s + (Number(o.productTotal) || Number(o.totalPrice) || 0), 0),
    [reportOrdersBase]
  );

  const deliveredProfit = useMemo(
    () =>
      reportOrdersBase
        .filter((o) => o.status === 'Delivered')
        .reduce((s, o) => s + (Number(o.profit) || 0), 0),
    [reportOrdersBase]
  );

  const walletBalance = Number(userProfile?.walletBalance) || 0;

  // User Management Dashboard computed lists
  const onlineUsersCount = useMemo(
    () => users.filter((u) => isUserOnline(u)).length,
    [users]
  );

  const groupedUsers = useMemo(() => {
    const groups: {
      role: string;
      title: string;
      accent: string;
      users: UserProfile[];
    }[] = [
      {
        role: 'main_super_admin',
        title: lang === 'bn' ? 'মেইন সুপার এডমিন' : 'Main Super Admin',
        accent: 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950',
        users: [],
      },
      {
        role: 'super_admin',
        title: lang === 'bn' ? 'সহকারী সুপার এডমিন' : 'Assistant Super Admins',
        accent: 'bg-rose-700 text-white',
        users: [],
      },
      {
        role: 'admin',
        title: lang === 'bn' ? 'এডমিন' : 'Admins',
        accent: 'bg-indigo-700 text-white',
        users: [],
      },
      {
        role: 'partner',
        title: lang === 'bn' ? 'পার্টনার' : 'Partners',
        accent: 'bg-violet-700 text-white',
        users: [],
      },
      {
        role: 'manager',
        title: lang === 'bn' ? 'ম্যানেজার' : 'Managers',
        accent: 'bg-teal-700 text-white',
        users: [],
      },
      {
        role: 'moderator',
        title: lang === 'bn' ? 'মডারেটর' : 'Moderators',
        accent: 'bg-emerald-700 text-white',
        users: [],
      },
      {
        role: 'merchant',
        title: lang === 'bn' ? 'মার্চেন্ট' : 'Merchants',
        accent: 'bg-orange-700 text-white',
        users: [],
      },
      {
        role: 'seller',
        title: lang === 'bn' ? 'সেলার' : 'Sellers',
        accent: 'bg-sky-700 text-white',
        users: [],
      },
      {
        role: 'user',
        title: lang === 'bn' ? 'কাস্টমার' : 'Customers',
        accent: 'bg-emerald-900 text-white',
        users: [],
      },
    ];

    const q = userSearch.trim().toLowerCase();
    const sorted = [...users]
      .filter((u) => {
        if (!q) return true;
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.lastActive || b.createdAt || 0) - (a.lastActive || a.createdAt || 0));

    sorted.forEach((u) => {
      const effectiveRole = isMainSuperAdminAccount(u.email)
        ? 'main_super_admin'
        : u.role === 'super_admin'
        ? 'super_admin'
        : u.role || 'user';
      if (userRoleFilter === 'online' && !isUserOnline(u)) return;
      if (
        userRoleFilter === 'admin' &&
        !['main_super_admin', 'super_admin', 'admin', 'partner', 'manager', 'moderator'].includes(
          effectiveRole
        )
      ) {
        return;
      }
      if (userRoleFilter === 'seller' && !['seller', 'merchant'].includes(effectiveRole)) {
        return;
      }
      if (userRoleFilter === 'user' && effectiveRole !== 'user') return;

      const g = groups.find((grp) => grp.role === effectiveRole) || groups[groups.length - 1];
      g.users.push(u);
    });

    return groups.filter((g) => g.users.length > 0);
  }, [users, userSearch, userRoleFilter, lang]);

  const previewCampaign11Price = useMemo(() => {
    let base = Number(formData.rent) || 0;
    if (
      ['liquid_weight', 'clothing_size', 'telecom', 'vip_sim'].includes(
        formData.productType || ''
      ) &&
      formData.variations &&
      formData.variations.length > 0
    ) {
      base = Number(formData.variations[0].price) || base;
    }
    const c11 = formData.campaign11;
    if (!c11 || !c11.active || !c11.discount) return base;
    const disc = Number(c11.discount) || 0;
    if (c11.type === 'percent') return Math.max(0, Math.round(base - (base * disc) / 100));
    return Math.max(0, base - disc);
  }, [formData.rent, formData.productType, formData.variations, formData.campaign11]);

  if (!userUid) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-8 space-y-4">
          <Shield className="w-12 h-12 mx-auto text-emerald-700 dark:text-amber-400 opacity-75" />
          <h1 className="font-display text-xl font-bold">
            {lang === 'bn' ? 'ওয়েবসাইট কন্ট্রোল সেন্টার' : 'Website Control Center'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === 'bn'
              ? 'প্রোডাক্ট, অর্ডার, চ্যাট, ইউজার ও ওয়েবসাইটের সকল সেটিংস কন্ট্রোল করতে আপনার একাউন্টে লগইন করুন।'
              : 'Sign in with your seller, partner, or super admin account to control the marketplace.'}
          </p>
          <button
            type="button"
            onClick={onGoLogin}
            className="min-h-[44px] px-6 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold text-sm"
          >
            {lang === 'bn' ? 'এখনই লগইন করুন' : 'Sign In Now'}
          </button>
        </div>
      </div>
    );
  }

  const startNewProduct = () => {
    setEditingId(null);
    setEditingOwnerId(userUid || null);
    setFormData({
      ...EMPTY_HOUSE_DATA,
      rent: 0,
      oldPrice: 0,
      stock: undefined,
      flashPrice: 0,
      flashDuration: undefined,
      deliveryChargeDhaka: undefined,
      deliveryChargeOutside: undefined,
      category:
        (siteSettings.categories || []).find((c) => !isDrivePackageCategory(c)) || 'অন্যান্য',
      telecomCompany: '',
      offerValidity: '',
      status: isAnySuperAdmin ? 'approved' : 'pending',
      campaign11: { active: false, discount: 0, type: 'percent' },
      promoCode: { code: '', discount: 0, type: 'percent' },
    });
    setWholesalePrice(0);
    setOwnerPhone(userProfile?.phone || '');
    setDigitalSecret('');
    setDigitalLinks([]);
    setDigitalTexts([]);
    setImgText('');
    setVideoUrl('');
    setTab('editor');
  };

  const startEditProduct = (h: HouseItem) => {
    const prodOwnerId = h.ownerId || h.data?.ownerId || '';
    const ownsThisProduct = Boolean(userUid && prodOwnerId === userUid);
    if (h.data?.productType === 'digital' && !isMainSuperAdmin && !ownsThisProduct) {
      return;
    }

    const canLoadDigitalSecrets = isMainSuperAdmin || ownsThisProduct;
    setEditingId(h.id);
    setEditingOwnerId(prodOwnerId || null);
    setFormData({
      ...EMPTY_HOUSE_DATA,
      ...h.data,
      digitalExpiryHours: canLoadDigitalSecrets ? h.data.digitalExpiryHours : '',
      campaign11: h.data.campaign11
        ? {
            active: Boolean(h.data.campaign11.active),
            discount: Number(h.data.campaign11.discount) || 0,
            type: h.data.campaign11.type || 'percent',
          }
        : { active: false, discount: 0, type: 'percent' },
      promoCode: h.data.promoCode
        ? {
            code: h.data.promoCode.code || '',
            discount: Number(h.data.promoCode.discount) || 0,
            type: h.data.promoCode.type === 'fixed' ? 'fixed' : 'percent',
          }
        : { code: '', discount: 0, type: 'percent' },
    });
    setWholesalePrice(Number(h.adminHiddenData?.wholesalePrice) || 0);
    setOwnerPhone(h.adminHiddenData?.ownerPhone || h.data.ownerPhone || '');

    if (canLoadDigitalSecrets) {
      setDigitalSecret(h.adminHiddenData?.digitalSecret || h.data.secretInfo || '');

      const rawLinks = h.adminHiddenData?.digitalLinks?.length
        ? h.adminHiddenData.digitalLinks
        : h.data.digitalLinks || [];
      setDigitalLinks(
        rawLinks.map((d) => ({
          title: d.title || d.label || '',
          label: d.label || d.title || '',
          url: d.url || '',
        }))
      );

      const rawTexts = h.adminHiddenData?.digitalTexts?.length
        ? h.adminHiddenData.digitalTexts
        : Array.isArray(h.data.digitalTexts)
        ? h.data.digitalTexts.map((t) =>
            typeof t === 'string' ? { title: '', text: t } : { title: t.title || '', text: t.text || '' }
          )
        : [];
      setDigitalTexts(rawTexts);
    } else {
      setDigitalSecret('');
      setDigitalLinks([]);
      setDigitalTexts([]);
    }

    setImgText((h.data.imageLinks || []).join('\n'));
    setVideoUrl(h.data.videoLinks?.[0]?.url || '');
    setTab('editor');
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const res = await uploadImageFile(file, siteSettings.imgbbApiKey);
        if (res.url) uploadedUrls.push(res.url);
      }
      if (uploadedUrls.length > 0) {
        setImgText((prev) => {
          const existing = prev.trim();
          return existing ? `${existing}\n${uploadedUrls.join('\n')}` : uploadedUrls.join('\n');
        });
        onNotify(
          lang === 'bn'
            ? `${uploadedUrls.length}টি ছবি সফলভাবে আপলোড হয়েছে!`
            : `${uploadedUrls.length} image(s) uploaded!`,
          'success'
        );
      }
    } catch {
      onNotify(lang === 'bn' ? 'ছবি আপলোড করতে সমস্যা হয়েছে।' : 'Image upload failed.', 'error');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleVariationImageUpload = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVarIdx(idx);
    try {
      const res = await uploadImageFile(file, siteSettings.imgbbApiKey);
      if (res.url) {
        setFormData((prev) => {
          const next = [...(prev.variations || [])];
          if (next[idx]) {
            next[idx] = { ...next[idx], image: res.url };
          }
          return { ...prev, variations: next };
        });
        onNotify(
          lang === 'bn' ? 'সাইজ/প্যাকের ছবি আপলোড হয়েছে!' : 'Variant image uploaded!',
          'success'
        );
      }
    } catch {
      onNotify(lang === 'bn' ? 'ছবি আপলোড ব্যর্থ।' : 'Upload failed.', 'error');
    } finally {
      setUploadingVarIdx(null);
      e.target.value = '';
    }
  };

  const submitAdminActionRequest = async (
    req: Omit<AdminActionRequest, 'id' | 'status' | 'timestamp'>
  ) => {
    await push(ref(db, 'admin_action_requests'), {
      ...req,
      status: 'Pending',
      timestamp: Date.now(),
    });
    onNotify(
      lang === 'bn'
        ? 'রিকোয়েস্টটি সুপার এডমিনের অ্যাপ্রুভালের জন্য পাঠানো হয়েছে! সুপার এডমিন অ্যাপ্রুভ করলে এটি কার্যকর হবে।'
        : 'Request sent to Super Admin for approval!',
      'info'
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      onNotify(lang === 'bn' ? 'প্রোডাক্টের নাম দিন।' : 'Enter product title.', 'error');
      return;
    }

    const origHouse = editingId ? houses.find((x) => x.id === editingId) : undefined;
    const origOwnerId = origHouse?.ownerId || origHouse?.data?.ownerId || editingOwnerId || '';
    const ownsExisting = Boolean(userUid && origOwnerId === userUid);
    if (editingId && origHouse?.data?.productType === 'digital' && !isMainSuperAdmin && !ownsExisting) {
      setTab('products');
      return;
    }

    const canWriteDigitalFields = !editingId || isMainSuperAdmin || ownsExisting;
    const effectiveProductType =
      formData.productType === 'digital' && !canWriteDigitalFields
        ? origHouse?.data?.productType || 'physical'
        : formData.productType;

    const imgs = imgText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const isDigital = effectiveProductType === 'digital' && canWriteDigitalFields;
    const cleanedLinks: DigitalLink[] = isDigital
      ? digitalLinks
          .filter((d) => d.url.trim())
          .map((d) => ({
            title: (d.title || d.label || '').trim(),
            label: (d.title || d.label || '').trim(),
            url: d.url.trim(),
          }))
      : [];
    const cleanedTexts: DigitalTextItem[] = isDigital
      ? digitalTexts
          .filter((t) => t.text.trim())
          .map((t) => ({
            title: (t.title || '').trim(),
            text: t.text.trim(),
          }))
      : [];

    const preservedOwnerId = editingId ? origOwnerId || userUid : userUid;
    const preservedOwnerName = editingId
      ? origHouse?.data?.ownerName ||
        userProfile?.storeName ||
        userProfile?.name ||
        userEmail?.split('@')[0] ||
        'Seller'
      : userProfile?.storeName || userProfile?.name || userEmail?.split('@')[0] || 'Seller';

    const availableTelecomCats =
      siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
        ? siteSettings.telecomCategories
        : DEFAULT_TELECOM_CATEGORIES;
    const normalizedProductType = effectiveProductType;
    const isTelecomOrSimType =
      normalizedProductType === 'telecom' ||
      normalizedProductType === 'vip_sim' ||
      normalizedProductType === 'data_package';
    const isOfferNoAddressType =
      normalizedProductType === 'telecom' ||
      normalizedProductType === 'data_package';
    const resolvedTelecomCat = isTelecomOrSimType
      ? (formData.telecomCompany || availableTelecomCats[0] || '').trim()
      : '';
    const resolvedCategory =
      normalizedProductType === 'vip_sim'
        ? resolvedTelecomCat || 'VIP SIM'
        : isTelecomOrSimType
        ? resolvedTelecomCat || 'টেলিকম ও সিম'
        : formData.category;

    const cleanedVariations: ProductVariation[] = (formData.variations || [])
      .filter((v) => (v.label || '').trim() || (v.image || '').trim())
      .map((v) => {
        const clean: ProductVariation = {
          label: (v.label || '').trim() || 'Option',
          price: Number(v.price) || Number(formData.rent) || 0,
        };
        if (v.image && v.image.trim()) clean.image = v.image.trim();
        if (v.unitAmount && v.unitAmount.trim()) clean.unitAmount = v.unitAmount.trim();
        if (v.unitType && v.unitType.trim()) clean.unitType = v.unitType.trim();
        if (v.vipNumbers && v.vipNumbers.length > 0) clean.vipNumbers = v.vipNumbers;
        return clean;
      });

    const payload: HouseData = {
      ...formData,
      category: resolvedCategory,
      telecomCompany: resolvedTelecomCat,
      offerValidity: isTelecomOrSimType ? (formData.offerValidity || '').trim() : '',
      location: isOfferNoAddressType || isDigital ? '' : (formData.location || '').trim(),
      rent: Number(formData.rent) || 0,
      oldPrice: Number(formData.oldPrice) || 0,
      stock: formData.stock === undefined ? 15 : Number(formData.stock),
      flashPrice: Number(formData.flashPrice) || 0,
      flashDuration: formData.flashDuration === undefined ? 24 : Number(formData.flashDuration),
      deliveryChargeDhaka:
        isOfferNoAddressType || isDigital
          ? 0
          : formData.deliveryChargeDhaka === undefined
          ? 60
          : Number(formData.deliveryChargeDhaka),
      deliveryChargeOutside:
        isOfferNoAddressType || isDigital
          ? 0
          : formData.deliveryChargeOutside === undefined
          ? 120
          : Number(formData.deliveryChargeOutside),
      productType: normalizedProductType,
      variations: cleanedVariations,
      imageLinks: imgs,
      videoLinks: videoUrl.trim() ? [{ title: 'Video Review', url: videoUrl.trim() }] : [],
      digitalLinks: canWriteDigitalFields ? cleanedLinks : origHouse?.data?.digitalLinks || [],
      digitalTexts: canWriteDigitalFields ? cleanedTexts : origHouse?.data?.digitalTexts || [],
      secretInfo: canWriteDigitalFields
        ? isDigital
          ? digitalSecret.trim()
          : ''
        : origHouse?.data?.secretInfo || '',
      ownerId: preservedOwnerId,
      ownerName: preservedOwnerName,
      storeName: editingId ? origHouse?.data?.storeName ?? '' : userProfile?.storeName || '',
      storeLogo: editingId ? origHouse?.data?.storeLogo ?? '' : userProfile?.storeLogo || '',
    };

    if (formData.promoCode?.code?.trim() && Number(formData.promoCode?.discount) > 0) {
      payload.promoCode = {
        code: formData.promoCode.code.trim().toUpperCase(),
        discount: Number(formData.promoCode.discount),
        type: formData.promoCode.type === 'fixed' ? 'fixed' : 'percent',
      };
    } else {
      delete payload.promoCode;
    }

    const hiddenPayload: HouseAdminHiddenData = {
      wholesalePrice,
      ownerPhone: ownerPhone.trim(),
      digitalSecret: canWriteDigitalFields
        ? isDigital
          ? digitalSecret.trim()
          : ''
        : origHouse?.adminHiddenData?.digitalSecret || '',
      digitalLinks: canWriteDigitalFields ? cleanedLinks : origHouse?.adminHiddenData?.digitalLinks || [],
      digitalTexts: canWriteDigitalFields ? cleanedTexts : origHouse?.adminHiddenData?.digitalTexts || [],
    };

    if (payload.saleType === 'flash' && Number(payload.flashDuration) > 0) {
      payload.flashEndTime = Date.now() + Number(payload.flashDuration) * 3600000;
    }

    const confirmSave = await confirm({
      title: editingId
        ? !isMainSuperAdmin
          ? lang === 'bn'
            ? 'এডিট রিকোয়েস্ট পাঠাবেন?'
            : 'Send Edit Request?'
          : lang === 'bn'
          ? 'প্রোডাক্ট আপডেট কনফার্মেশন'
          : 'Confirm Product Update'
        : lang === 'bn'
        ? 'নতুন প্রোডাক্ট প্রকাশ করবেন?'
        : 'Publish New Product?',
      message: editingId
        ? !isMainSuperAdmin
          ? lang === 'bn'
            ? `"${payload.title}" প্রোডাক্টটি এডিট করার রিকোয়েস্ট মেইন সুপার এডমিনের কাছে পাঠাতে চান?`
            : `Send edit request for "${payload.title}" to Main Super Admin?`
          : lang === 'bn'
          ? `আপনি কি "${payload.title}" প্রোডাক্টের পরিবর্তনগুলো সেভ করতে চান?`
          : `Save updates to "${payload.title}"?`
        : lang === 'bn'
        ? `আপনি কি "${payload.title}" নতুন প্রোডাক্ট হিসেবে মার্কেটপ্লেসে প্রকাশ করতে চান?`
        : `Publish "${payload.title}" to the marketplace?`,
      tone: 'primary',
    });
    if (!confirmSave) return;

    try {
      if (editingId) {
        if (!isMainSuperAdmin) {
          await submitAdminActionRequest({
            actionType: 'edit_product',
            targetId: editingId,
            targetTitle: payload.title,
            productData: payload,
            wholesalePrice,
            adminHiddenData: hiddenPayload,
            requestedByUid: userUid,
            requestedByName: userProfile?.name || userEmail || 'Admin',
            requestedByEmail: userEmail || '',
            requestedByRole: role,
          });
          setTab('products');
          return;
        }
        await update(ref(db, `houses/${editingId}`), {
          data: payload,
          adminHiddenData: hiddenPayload,
          ownerId: preservedOwnerId,
        });
        onNotify(lang === 'bn' ? 'প্রোডাক্ট আপডেট হয়েছে!' : 'Product updated!', 'success');
      } else {
        await push(ref(db, 'houses'), {
          data: payload,
          adminHiddenData: hiddenPayload,
          ownerId: userUid,
          createdAt: Date.now(),
        });
        onNotify(lang === 'bn' ? 'নতুন প্রোডাক্ট প্রকাশিত হয়েছে!' : 'Product published!', 'success');
      }
      setTab('products');
    } catch {
      onNotify(lang === 'bn' ? 'সংরক্ষণে সমস্যা হয়েছে।' : 'Failed to save product.', 'error');
    }
  };

  const handleDeleteProduct = async (h: HouseItem) => {
    if (h.data?.productType === 'digital' && !isMainSuperAdmin && !isOwnProduct(h)) {
      return;
    }
    const ok = await confirm({
      title: lang === 'bn' ? 'প্রোডাক্ট ডিলিট কনফার্মেশন' : 'Confirm Delete Product',
      message: !isMainSuperAdmin
        ? lang === 'bn'
          ? `আপনি কি "${h.data.title}" ডিলিট করার রিকোয়েস্ট মেইন সুপার এডমিনের কাছে পাঠাতে চান?`
          : `Send request to delete "${h.data.title}"?`
        : lang === 'bn'
        ? `আপনি কি সত্যিই "${h.data.title}" প্রোডাক্টটি স্থায়ীভাবে ডিলিট করতে চান?`
        : `Are you sure you want to permanently delete "${h.data.title}"?`,
      tone: 'danger',
    });
    if (!ok) return;
    if (!isMainSuperAdmin) {
      await submitAdminActionRequest({
        actionType: 'delete_product',
        targetId: h.id,
        targetTitle: h.data.title,
        requestedByUid: userUid,
        requestedByName: userProfile?.name || userEmail || 'Admin',
        requestedByEmail: userEmail || '',
        requestedByRole: role,
      });
      return;
    }
    await remove(ref(db, `houses/${h.id}`));
    onNotify(lang === 'bn' ? 'প্রোডাক্ট ডিলিট করা হয়েছে।' : 'Product deleted.', 'info');
  };

  const handleDeleteOrder = async (o: OrderItem) => {
    const ok = await confirm({
      title: lang === 'bn' ? 'অর্ডার তালিকা থেকে সরাবেন?' : 'Remove Order from Admin List?',
      message: !isMainSuperAdmin
        ? lang === 'bn'
          ? `আপনি কি অর্ডার #${o.orderId} (${o.name}) এডমিন তালিকা থেকে ডিলিট করার রিকোয়েস্ট পাঠাতে চান? (গ্রাহকের হিস্ট্রি ও রিপোর্ট নিরাপদ থাকবে)`
          : `Send request to remove Order #${o.orderId} from Admin list? (Customer record & reports remain intact)`
        : lang === 'bn'
        ? `অর্ডার #${o.orderId} (${o.name}) এডমিন তালিকা থেকে সরাতে চান? গ্রাহকের কাছে ডেলিভারি হিস্ট্রি ও মোট বিক্রয় রিপোর্ট সংরক্ষিত থাকবে।`
        : `Remove Order #${o.orderId} (${o.name}) from Admin list? Buyer delivery history & sales reports remain intact.`,
      tone: 'danger',
    });
    if (!ok) return;
    if (!isMainSuperAdmin) {
      await submitAdminActionRequest({
        actionType: 'delete_order',
        targetId: o.orderId,
        targetTitle: `Order #${o.orderId} (${o.name})`,
        requestedByUid: userUid,
        requestedByName: userProfile?.name || userEmail || 'Admin',
        requestedByEmail: userEmail || '',
        requestedByRole: role,
      });
      return;
    }
    await update(ref(db, `orders/${o.orderId}`), {
      hiddenFromAdmin: true,
      adminDeletedAt: Date.now(),
    });
    onNotify(
      lang === 'bn'
        ? 'এডমিন তালিকা থেকে সরানো হয়েছে (গ্রাহক ও রিপোর্ট নিরাপদ)।'
        : 'Removed from Admin list (customer history & reports kept).',
      'info'
    );
  };

  const handleDeleteReview = async (
    houseId: string,
    houseTitle: string,
    reviewId: string | number
  ) => {
    const ok = await confirm({
      title: lang === 'bn' ? 'রিভিউ ডিলিট কনফার্মেশন' : 'Confirm Delete Review',
      message: !isMainSuperAdmin
        ? lang === 'bn'
          ? `"${houseTitle}" এর রিভিউ ডিলিট রিকোয়েস্ট পাঠাতে চান?`
          : `Send request to delete review on "${houseTitle}"?`
        : lang === 'bn'
        ? `আপনি কি সত্যিই "${houseTitle}" এর এই রিভিউটি ডিলিট করতে চান?`
        : `Are you sure you want to delete this review on "${houseTitle}"?`,
      tone: 'danger',
    });
    if (!ok) return;
    if (!isMainSuperAdmin) {
      await submitAdminActionRequest({
        actionType: 'delete_review',
        targetId: houseId,
        targetTitle: `Review on ${houseTitle}`,
        reviewId,
        requestedByUid: userUid,
        requestedByName: userProfile?.name || userEmail || 'Admin',
        requestedByEmail: userEmail || '',
        requestedByRole: role,
      });
      return;
    }
    await remove(ref(db, `houses/${houseId}/data/reviews/${reviewId}`));
    onNotify(lang === 'bn' ? 'রিভিউ ডিলিট করা হয়েছে।' : 'Review deleted.', 'info');
  };

  const handleApproveAdminAction = async (req: AdminActionRequest) => {
    if (!isMainSuperAdmin) return;
    const ok = await confirm({
      title: lang === 'bn' ? 'রিকোয়েস্ট অ্যাপ্রুভ ও কার্যকর?' : 'Approve & Execute Request?',
      message:
        lang === 'bn'
          ? `আপনি কি "${req.targetTitle}" এর উপর (${req.actionType.replace('_', ' ')}) রিকোয়েস্টটি অ্যাপ্রুভ ও কার্যকর করতে চান?`
          : `Are you sure you want to approve and execute "${req.targetTitle}" (${req.actionType.replace('_', ' ')})?`,
      detail: `${lang === 'bn' ? 'আবেদনকারী:' : 'Requested by:'} ${req.requestedByName}`,
      tone: req.actionType.startsWith('delete') ? 'danger' : 'warning',
    });
    if (!ok) return;
    try {
      if (req.actionType === 'delete_product') {
        await remove(ref(db, `houses/${req.targetId}`));
      } else if (req.actionType === 'edit_product' && req.productData) {
        await update(ref(db, `houses/${req.targetId}`), {
          data: req.productData,
          adminHiddenData: req.adminHiddenData || { wholesalePrice: req.wholesalePrice || 0 },
        });
      } else if (req.actionType === 'delete_order') {
        await update(ref(db, `orders/${req.targetId}`), {
          hiddenFromAdmin: true,
          adminDeletedAt: Date.now(),
        });
      } else if (req.actionType === 'delete_review' && req.reviewId !== undefined) {
        await remove(ref(db, `houses/${req.targetId}/data/reviews/${req.reviewId}`));
      } else if (req.actionType === 'delete_user') {
        const targetU = users.find((x) => x.uid === req.targetId);
        if (targetU && isMainSuperAdminAccount(targetU.email)) {
          onNotify(
            lang === 'bn' ? 'মেইন সুপার এডমিনকে ডিলিট করা অসম্ভব!' : 'Main Super Admin cannot be deleted!',
            'error'
          );
          return;
        }
        await remove(ref(db, `users/${req.targetId}`));
      }
      await remove(ref(db, `admin_action_requests/${req.id}`));
      onNotify(
        lang === 'bn' ? 'রিকোয়েস্ট অ্যাপ্রুভ ও কার্যকর করা হয়েছে!' : 'Request approved and executed!',
        'success'
      );
    } catch {
      onNotify(lang === 'bn' ? 'কার্যকর করতে সমস্যা হয়েছে।' : 'Failed to execute action.', 'error');
    }
  };

  const handleRejectAdminAction = async (req: AdminActionRequest) => {
    if (!isMainSuperAdmin) return;
    const ok = await confirm({
      title: lang === 'bn' ? 'রিকোয়েস্ট বাতিল করবেন?' : 'Reject Request?',
      message:
        lang === 'bn'
          ? `আপনি কি "${req.targetTitle}" এর রিকোয়েস্টটি বাতিল ও রিমুভ করতে চান?`
          : `Are you sure you want to reject "${req.targetTitle}"?`,
      tone: 'danger',
    });
    if (!ok) return;
    await remove(ref(db, `admin_action_requests/${req.id}`));
    onNotify(lang === 'bn' ? 'রিকোয়েস্ট বাতিল ও রিমুভ করা হয়েছে।' : 'Request rejected.', 'info');
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    const hObj = houses.find((x) => x.id === id);
    const ok = await confirm({
      title:
        status === 'approved'
          ? lang === 'bn'
            ? 'পোস্ট অ্যাপ্রুভ করবেন?'
            : 'Approve Product?'
          : lang === 'bn'
          ? 'পোস্ট রিজেক্ট করবেন?'
          : 'Reject Product?',
      message:
        lang === 'bn'
          ? `আপনি কি "${hObj?.data?.title || id}" পোস্টটি ${
              status === 'approved' ? 'অ্যাপ্রুভ' : 'রিজেক্ট'
            } করতে চান?`
          : `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} "${hObj?.data?.title || id}"?`,
      tone: status === 'rejected' ? 'danger' : 'primary',
    });
    if (!ok) return;
    await update(ref(db, `houses/${id}/data`), { status, statusUpdatedAt: Date.now() });
    onNotify(`Product ${status}!`, 'success');
  };

  const handleOrderStatus = async (order: OrderItem, status: string) => {
    if (status === order.status) return;
    const ok = await confirm({
      title: lang === 'bn' ? 'অর্ডার স্ট্যাটাস পরিবর্তন' : 'Change Order Status?',
      message:
        lang === 'bn'
          ? `অর্ডার #${order.orderId} (${order.name}) এর স্ট্যাটাস "${order.status}" থেকে "${status}" করতে চান?`
          : `Change Order #${order.orderId} status from "${order.status}" to "${status}"?`,
      tone: status === 'Cancelled' ? 'danger' : 'warning',
    });
    if (!ok) return;
    await update(ref(db, `orders/${order.orderId}`), { status, updatedAt: Date.now() });
    if (status === 'Delivered' && order.status !== 'Delivered') {
      const profit = Number(order.profit) || 0;
      if (profit > 0 && order.sellerId && order.sellerId !== 'admin') {
        const sRef = ref(db, `users/${order.sellerId}`);
        const snap = await get(sRef);
        const curr = Number(snap.val()?.walletBalance) || 0;
        await update(sRef, { walletBalance: curr + profit });
      }
      await update(ref(db, 'settings'), {
        totalDeliveredOrders: (siteSettings.totalDeliveredOrders || 0) + 1,
        totalSalesAmount: (siteSettings.totalSalesAmount || 0) + (Number(order.totalPrice) || 0),
        totalProfitAmount: (siteSettings.totalProfitAmount || 0) + profit,
      });
    }
    onNotify(`Order marked as ${status}`, 'success');
  };

  const handleRequestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmt);
    if (amt < 100 || amt > walletBalance) {
      onNotify(
        lang === 'bn' ? 'সর্বনিম্ন ১০০৳ এবং ব্যালেন্সের মধ্যে দিন।' : 'Enter valid amount (min 100).',
        'error'
      );
      return;
    }
    if (!withdrawAcct.trim()) {
      onNotify(lang === 'bn' ? 'একাউন্ট নাম্বার দিন।' : 'Enter account number.', 'error');
      return;
    }
    const ok = await confirm({
      title: lang === 'bn' ? 'উইথড্র রিকোয়েস্ট কনফার্মেশন' : 'Confirm Withdrawal Request',
      message:
        lang === 'bn'
          ? `আপনি কি ${withdrawMethod} (${withdrawAcct.trim()}) নাম্বারে ${formatBDT(amt)} টাকা উত্তোলনের রিকোয়েস্ট পাঠাতে চান?`
          : `Request withdrawal of ${formatBDT(amt)} to ${withdrawMethod} (${withdrawAcct.trim()})?`,
      tone: 'primary',
    });
    if (!ok) return;
    await push(ref(db, 'withdrawals'), {
      uid: userUid,
      userName: userProfile?.name || userEmail,
      amount: amt,
      method: withdrawMethod,
      type: 'Personal',
      account: withdrawAcct.trim(),
      status: 'Pending',
      timestamp: Date.now(),
    });
    await update(ref(db, `users/${userUid}`), { walletBalance: walletBalance - amt });
    setWithdrawAmt('');
    setWithdrawAcct('');
    onNotify(lang === 'bn' ? 'উইথড্র রিকোয়েস্ট পাঠানো হয়েছে!' : 'Withdrawal requested!', 'success');
  };

  const handleAdminWithdrawal = async (w: WithdrawalItem, status: 'Sent' | 'Rejected') => {
    const ok = await confirm({
      title: lang === 'bn' ? 'উইথড্র অ্যাকশন কনফার্মেশন' : 'Confirm Withdrawal Action',
      message:
        lang === 'bn'
          ? `আপনি কি ${w.userName} এর ${formatBDT(w.amount)} (${w.method}: ${w.account}) রিকোয়েস্টটি "${
              status === 'Sent' ? 'পেমেন্ট সম্পন্ন' : 'রিজেক্ট'
            }" করতে চান?`
          : `Mark ${w.userName}'s ${formatBDT(w.amount)} withdrawal as "${status}"?`,
      tone: status === 'Rejected' ? 'danger' : 'primary',
    });
    if (!ok) return;
    await update(ref(db, `withdrawals/${w.id}`), { status, updatedAt: Date.now() });
    if (status === 'Rejected') {
      const uRef = ref(db, `users/${w.uid}`);
      const snap = await get(uRef);
      const curr = Number(snap.val()?.walletBalance) || 0;
      await update(uRef, { walletBalance: curr + Number(w.amount) });
    }
    onNotify(`Withdrawal ${status}`, 'success');
  };

  const changeUserRole = async (targetUser: UserProfile, nextRole: UserRole) => {
    if ((targetUser.role || 'user') === nextRole) return;
    if (isMainSuperAdminAccount(targetUser.email)) {
      onNotify(
        lang === 'bn'
          ? 'মেইন সুপার এডমিনের রোল কেউ পরিবর্তন করতে পারবে না!'
          : 'Main Super Admin role is permanently protected!',
        'error'
      );
      return;
    }
    if (!isMainSuperAdmin && (nextRole === 'super_admin' || targetUser.role === 'super_admin')) {
      onNotify(
        lang === 'bn'
          ? 'সহকারী সুপার এডমিন নিয়োগ বা রোল পরিবর্তন শুধুমাত্র মেইন সুপার এডমিন করতে পারবেন।'
          : 'Only Main Super Admin can appoint or modify Assistant Super Admins.',
        'error'
      );
      return;
    }
    const targetName = targetUser.name || targetUser.email || targetUser.uid;
    const prevLabel = getRoleLabel(targetUser.role || 'user', targetUser.email, lang);
    const nextLabel = getRoleLabel(nextRole, targetUser.email, lang);
    const ok = await confirm({
      title: lang === 'bn' ? 'ইউজার রোল পরিবর্তন করবেন?' : 'Change User Role?',
      message:
        lang === 'bn'
          ? `আপনি কি "${targetName}" এর রোল "${prevLabel}" থেকে পরিবর্তন করে "${nextLabel}" করতে চান?`
          : `Change role of "${targetName}" from "${prevLabel}" to "${nextLabel}"?`,
      tone: 'warning',
    });
    if (!ok) return;
    await update(ref(db, `users/${targetUser.uid}`), { role: nextRole });
    onNotify(
      lang === 'bn'
        ? `ইউজারের রোল "${getRoleLabel(nextRole, targetUser.email, 'bn')}" করা হয়েছে!`
        : `Role updated to ${getRoleLabel(nextRole, targetUser.email, 'en')}`,
      'success'
    );
  };

  const promoteOrDemoteUser = async (u: UserProfile, dir: 1 | -1) => {
    if (isMainSuperAdminAccount(u.email)) return;
    const allowedHierarchy = isMainSuperAdmin
      ? ROLE_HIERARCHY
      : ROLE_HIERARCHY.filter((r) => r !== 'super_admin');
    const currRole = (u.role || 'user') as UserRole;
    const idx = allowedHierarchy.indexOf(currRole);
    const safeIdx = idx === -1 ? 0 : idx;
    const nextIdx = Math.min(allowedHierarchy.length - 1, Math.max(0, safeIdx + dir));
    if (nextIdx === safeIdx) return;
    await changeUserRole(u, allowedHierarchy[nextIdx]);
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (isMainSuperAdminAccount(u.email)) {
      onNotify(
        lang === 'bn'
          ? 'মেইন সুপার এডমিনকে কখনোই ডিলিট করা যাবে না!'
          : 'Main Super Admin can never be deleted!',
        'error'
      );
      return;
    }
    const targetName = u.name || u.email || u.uid;
    const ok = await confirm({
      title: lang === 'bn' ? 'ইউজার ডিলিট কনফার্মেশন' : 'Confirm Delete User',
      message: !isMainSuperAdmin
        ? lang === 'bn'
          ? `আপনি কি "${targetName}" ইউজারটিকে ডিলিট করার রিকোয়েস্ট মেইন সুপার এডমিনের কাছে পাঠাতে চান?`
          : `Send request to Main Super Admin to delete user "${targetName}"?`
        : lang === 'bn'
        ? `আপনি কি সত্যিই "${targetName}" ইউজারটিকে স্থায়ীভাবে ডিলিট করতে চান?`
        : `Are you sure you want to permanently delete user "${targetName}"?`,
      detail: u.email,
      tone: 'danger',
    });
    if (!ok) return;
    if (!isMainSuperAdmin) {
      await submitAdminActionRequest({
        actionType: 'delete_user',
        targetId: u.uid,
        targetTitle: `User: ${u.name || u.email || u.uid}`,
        requestedByUid: userUid,
        requestedByName: userProfile?.name || userEmail || 'Admin',
        requestedByEmail: userEmail || '',
        requestedByRole: role,
      });
      return;
    }
    await remove(ref(db, `users/${u.uid}`));
    onNotify(lang === 'bn' ? 'ইউজার ডিলিট হয়েছে।' : 'User deleted.', 'info');
  };

  const pendingStoreCount = pendingStoreReqs.length;
  const pendingPartnerCount = pendingPartnerReqs.length;
  const totalPendingCount =
    (isMainSuperAdmin ? pendingActionReqs.length : 0) +
    pendingHouses.length +
    pendingStoreCount +
    (isAnySuperAdmin || role === 'admin' || role === 'partner' ? pendingPartnerCount : 0);

  const canAccessDigitalEditor =
    !editingId || isMainSuperAdmin || Boolean(userUid && editingOwnerId === userUid);

  const tabs: { id: ControlTab; label: string; show: boolean; badge?: number }[] = [
    { id: 'overview', label: lang === 'bn' ? 'ড্যাশবোর্ড' : 'Overview', show: true },
    {
      id: 'products',
      label: lang === 'bn' ? 'প্রোডাক্টস' : 'Products',
      show: true,
      badge: unseenProductUpdatesCount,
    },
    { id: 'editor', label: lang === 'bn' ? 'নতুন / এডিট পোস্ট' : 'Post Editor', show: true },
    {
      id: 'orders',
      label: lang === 'bn' ? 'অর্ডার সমূহ' : 'Orders',
      show: true,
      badge: unseenSellerOrdersCount,
    },
    {
      id: 'inbox',
      label: lang === 'bn' ? 'মেসেজ ইনবক্স' : 'Inbox',
      show: true,
      badge: unreadInboxCount,
    },
    {
      id: 'wallet',
      label: lang === 'bn' ? 'ওয়ালেট' : 'Wallet',
      show: siteSettings.enableWallet !== false,
      badge: pendingWithdrawalsCount,
    },
    {
      id: 'approvals',
      label: isMainSuperAdmin
        ? lang === 'bn'
          ? `সুপার অ্যাপ্রুভাল`
          : `Super Approvals`
        : lang === 'bn'
        ? `রিকোয়েস্ট ও অ্যাপ্রুভাল`
        : `Requests`,
      show: isModeratorLevel,
      badge: totalPendingCount,
    },
    {
      id: 'users',
      label: lang === 'bn' ? `ইউজার ম্যানেজমেন্ট (${users.length})` : `User Management (${users.length})`,
      show: isAnySuperAdmin,
      badge: unseenUsersCount,
    },
    {
      id: 'reviews',
      label: lang === 'bn' ? 'রিভিউ' : 'Reviews',
      show: true,
      badge: unseenReviewsCount,
    },
    {
      id: 'site_settings',
      label: lang === 'bn' ? 'ওয়েবসাইট সেটিংস' : 'Site Control',
      show: isAnySuperAdmin,
    },
  ];

  const allReviewsList = useMemo(() => {
    const target = isMainSuperAdmin ? houses : myHouses;
    const list: {
      houseId: string;
      houseTitle: string;
      reviewId: string | number;
      userName?: string;
      rating: number;
      comment: string;
      date: number;
    }[] = [];
    target.forEach((h) => {
      getParsedReviews(h).forEach((r) => {
        if (r.reviewId !== undefined) {
          list.push({
            houseId: h.id,
            houseTitle: h.data.title,
            reviewId: r.reviewId,
            userName: r.userName,
            rating: r.rating,
            comment: r.comment,
            date: r.date,
          });
        }
      });
    });
    return list.sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [houses, myHouses, isMainSuperAdmin]);

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-5 space-y-6">
      {/* Header with Highlighted Profile Avatar + Gorgeous Role Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <RoleAvatar
            name={userProfile?.name}
            email={userEmail}
            profilePic={userProfile?.profilePic || userProfile?.storeLogo}
            role={role}
            sizeClass="w-12 h-12"
          />
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-lg sm:text-xl font-bold truncate">
              {isMainSuperAdmin
                ? lang === 'bn'
                  ? 'মেইন সুপার এডমিন ড্যাশবোর্ড'
                  : 'Main Super Admin Dashboard'
                : isAssistantSuperAdmin
                ? lang === 'bn'
                  ? 'সহকারী সুপার এডমিন কন্ট্রোল'
                  : 'Assistant Super Admin Panel'
                : lang === 'bn'
                ? 'ওয়েবসাইট কন্ট্রোল সেন্টার'
                : 'Website Control Center'}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={role} email={userEmail} lang={lang} size="sm" />
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isMainSuperAdmin && staffChatEnabled && (
            <button
              type="button"
              onClick={handleMessageMainSuperAdmin}
              className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সুপার এডমিনকে মেসেজ দিন' : 'Message Super Admin'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={startNewProduct}
            className="min-h-[40px] px-4 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? 'নতুন প্রোডাক্ট' : 'Add Product'}</span>
          </button>
          <button
            type="button"
            onClick={() => openExternalUrl(TARGET_WEBSITE_URL)}
            className="min-h-[40px] px-3.5 rounded-xl bg-slate-100 dark:bg-[#071312] border border-slate-200 dark:border-emerald-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'bn' ? 'লাইভ সাইট' : 'Live Site'}</span>
          </button>
        </div>
      </div>

      {/* Policy Notice for Assistant Super Admin / Admins / Sellers */}
      {!isMainSuperAdmin && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <span>
            {lang === 'bn'
              ? 'নিরাপত্তা নীতি: কোনো পোস্ট, অর্ডার, রিভিউ বা ইউজার ডিলিট কিংবা পুরনো পোস্ট এডিট করলে তা সরাসরি পরিবর্তনের আগে মেইন সুপার এডমিনের অ্যাপ্রুভালের জন্য যাবে।'
              : 'Policy: Deletions or edits to existing posts require Main Super Admin approval before taking effect.'}
          </span>
          {!staffChatEnabled && (
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {lang === 'bn'
                ? '(সুপার এডমিন চ্যাট সাময়িক বন্ধ)'
                : '(Super Admin direct chat paused)'}
            </span>
          )}
        </div>
      )}

      {/* Horizontal Tab Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id === 'editor') {
                  startNewProduct();
                } else {
                  setTab(t.id);
                  if (t.id === 'orders' && onMarkSellerOrdersSeen) {
                    onMarkSellerOrdersSeen();
                  }
                }
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors inline-flex items-center gap-1.5 ${
                tab === t.id
                  ? 'bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{t.label}</span>
              {Boolean(t.badge && t.badge > 0) && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {t.badge! > 99 ? '99+' : t.badge}
                </span>
              )}
            </button>
          ))}
      </div>

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Store Activation Banner (Controlled by Main Super Admin ON/OFF Switch) */}
          {!isMainSuperAdmin &&
            siteSettings.enableDedicatedStore !== false &&
            userProfile?.isStoreActive !== true && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/35 dark:to-emerald-950/40 border border-amber-300/80 dark:border-amber-500/40 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="font-display font-bold text-sm sm:text-base text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? 'আপনার স্টোরটি অ্যাক্টিভেশন করা লাগবে'
                        : 'Your store requires activation'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {Number(siteSettings.storeActivationFee) > 0
                      ? lang === 'bn'
                        ? `মেইন সুপার এডমিন নির্ধারিত ফি ${formatBDT(siteSettings.storeActivationFee)} পাঠিয়ে TrxID সহ অ্যাক্টিভেশন রিকোয়েস্ট দিন।`
                        : `Send activation fee ${formatBDT(siteSettings.storeActivationFee)} to Main Super Admin and submit TrxID.`
                      : lang === 'bn'
                      ? 'আপনার নিজস্ব ডেডিকেটেড স্টোর চালু করতে স্টোর অ্যাক্টিভেশন রিকোয়েস্ট পাঠান।'
                      : 'Submit a store activation request to launch your dedicated store.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(siteSettings.storeBkash || siteSettings.advanceBkash) && (
                      <button
                        type="button"
                        onClick={() => {
                          const num = siteSettings.storeBkash || siteSettings.advanceBkash || '';
                          navigator.clipboard.writeText(num);
                          onNotify(
                            lang === 'bn' ? `বিকাশ নাম্বার কপি হয়েছে: ${num}` : `Copied: ${num}`,
                            'success'
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#071312] border border-amber-300 dark:border-amber-700 text-[11px] font-mono-num font-bold inline-flex items-center gap-1.5"
                      >
                        <span>bKash: {siteSettings.storeBkash || siteSettings.advanceBkash}</span>
                        <Copy className="w-3 h-3 text-emerald-700 dark:text-amber-300" />
                      </button>
                    )}
                    {(siteSettings.storeNagad || siteSettings.advanceNagad) && (
                      <button
                        type="button"
                        onClick={() => {
                          const num = siteSettings.storeNagad || siteSettings.advanceNagad || '';
                          navigator.clipboard.writeText(num);
                          onNotify(
                            lang === 'bn' ? `নগদ নাম্বার কপি হয়েছে: ${num}` : `Copied: ${num}`,
                            'success'
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#071312] border border-amber-300 dark:border-amber-700 text-[11px] font-mono-num font-bold inline-flex items-center gap-1.5"
                      >
                        <span>Nagad: {siteSettings.storeNagad || siteSettings.advanceNagad}</span>
                        <Copy className="w-3 h-3 text-emerald-700 dark:text-amber-300" />
                      </button>
                    )}
                  </div>
                </div>
                {onGoAccount && (
                  <button
                    type="button"
                    onClick={onGoAccount}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Store className="w-4 h-4" />
                    <span>
                      {lang === 'bn' ? 'অ্যাক্টিভেশন ও TrxID দিন' : 'Activate Store Now'}
                    </span>
                  </button>
                )}
              </div>
            )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              type="button"
              onClick={() => setTab('products')}
              className="relative bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 hover:border-emerald-700 dark:hover:border-amber-400 rounded-2xl p-4 text-left transition-colors"
            >
              {unseenProductUpdatesCount > 0 && (
                <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold flex items-center justify-center">
                  {unseenProductUpdatesCount}
                </span>
              )}
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>{lang === 'bn' ? 'মোট প্রোডাক্ট' : 'Products'}</span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold font-mono-num">
                {myHouses.length}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab('orders')}
              className="relative bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 hover:border-emerald-700 dark:hover:border-amber-400 rounded-2xl p-4 text-left transition-colors"
            >
              {unseenSellerOrdersCount > 0 && (
                <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold flex items-center justify-center">
                  {unseenSellerOrdersCount}
                </span>
              )}
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>
                  {isMainSuperAdmin
                    ? lang === 'bn'
                      ? 'সবার মোট অর্ডার'
                      : 'All Orders'
                    : lang === 'bn'
                    ? 'আমার পোস্টের অর্ডার'
                    : 'My Post Orders'}
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold font-mono-num">
                {visibleOrders.length}
              </div>
            </button>

            <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>{lang === 'bn' ? 'মোট বিক্রয়' : 'Delivered Sales'}</span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold font-mono-num text-emerald-800 dark:text-amber-400">
                {formatBDT(deliveredSales)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTab('wallet')}
              className="relative bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 hover:border-emerald-700 dark:hover:border-amber-400 rounded-2xl p-4 text-left transition-colors"
            >
              {pendingWithdrawalsCount > 0 && (
                <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold flex items-center justify-center">
                  {pendingWithdrawalsCount}
                </span>
              )}
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>{lang === 'bn' ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}</span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold font-mono-num">
                {formatBDT(walletBalance)}
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={startNewProduct}
              className="p-5 rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-left hover:border-emerald-700 dark:hover:border-amber-400 transition-colors"
            >
              <Plus className="w-5 h-5 text-emerald-700 dark:text-amber-400 mb-2" />
              <div className="font-display font-bold text-base">
                {lang === 'bn' ? 'নতুন প্রোডাক্ট যোগ করুন' : 'Publish New Product'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {lang === 'bn'
                  ? '১১.১১ ক্যাম্পেইন, ছবি, দাম ও ডেলিভারি চার্জ সেট করুন'
                  : 'Add images, 11.11 deals, pricing & variations'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab('inbox')}
              className="relative p-5 rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-left hover:border-emerald-700 dark:hover:border-amber-400 transition-colors"
            >
              {unreadInboxCount > 0 && (
                <span className="absolute top-4 right-4 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center">
                  {unreadInboxCount}
                </span>
              )}
              <MessageCircle className="w-5 h-5 text-emerald-700 dark:text-amber-400 mb-2" />
              <div className="font-display font-bold text-base">
                {lang === 'bn' ? 'মেসেজ ইনবক্স' : 'Message Inbox'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {lang === 'bn'
                  ? `${effectiveChatThreads.length}টি চ্যাট · সরাসরি কাস্টমার ও সাপোর্ট মেসেজ`
                  : `${effectiveChatThreads.length} threads · Live customer & support chats`}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab('reviews')}
              className="relative p-5 rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-left hover:border-emerald-700 dark:hover:border-amber-400 transition-colors"
            >
              {unseenReviewsCount > 0 && (
                <span className="absolute top-4 right-4 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center">
                  {unseenReviewsCount}
                </span>
              )}
              <Star className="w-5 h-5 text-amber-500 mb-2" />
              <div className="font-display font-bold text-base">
                {lang === 'bn' ? 'কাস্টমার রিভিউ' : 'Customer Reviews'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {lang === 'bn'
                  ? 'প্রোডাক্টের সব রেটিং ও রিভিউ দেখুন'
                  : 'Inspect latest customer ratings & feedback'}
              </div>
            </button>

            {isAnySuperAdmin && (
              <button
                type="button"
                onClick={() => setTab('users')}
                className="relative p-5 rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-left hover:border-emerald-700 dark:hover:border-amber-400 transition-colors"
              >
                {unseenUsersCount > 0 && (
                  <span className="absolute top-4 right-4 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center">
                    +{unseenUsersCount}
                  </span>
                )}
                <Users className="w-5 h-5 text-emerald-700 dark:text-amber-400 mb-2" />
                <div className="font-display font-bold text-base">
                  {lang === 'bn' ? 'ইউজার ও রোল ড্যাশবোর্ড' : 'User Management Dashboard'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {lang === 'bn'
                    ? `মোট ${users.length} জন ইউজার · রোল ব্যাজ ও সরাসরি মেসেজ`
                    : `${users.length} users · Role badges & direct messaging`}
                </div>
              </button>
            )}

            {isModeratorLevel && (
              <button
                type="button"
                onClick={() => setTab('approvals')}
                className="relative p-5 rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-left hover:border-emerald-700 dark:hover:border-amber-400 transition-colors"
              >
                {totalPendingCount > 0 && (
                  <span className="absolute top-4 right-4 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center">
                    {totalPendingCount}
                  </span>
                )}
                <Shield className="w-5 h-5 text-rose-600 dark:text-amber-400 mb-2" />
                <div className="font-display font-bold text-base">
                  {isMainSuperAdmin
                    ? lang === 'bn'
                      ? `সুপার এডমিন অ্যাপ্রুভাল (${totalPendingCount})`
                      : `Super Approvals (${totalPendingCount})`
                    : lang === 'bn'
                    ? `ইউজার/সেলার রিকোয়েস্ট (${totalPendingCount})`
                    : `Pending Requests (${totalPendingCount})`}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isMainSuperAdmin
                    ? lang === 'bn'
                      ? 'এডমিন ও সহকারী সুপার এডমিনের ডিলিট/এডিট ও পোস্ট অনুমোদন'
                      : 'Approve staff delete/edit requests & pending posts'
                    : lang === 'bn'
                    ? 'ইউজার ও সেলারদের পেন্ডিং পোস্ট ও স্টোর রিকোয়েস্ট দেখুন'
                    : 'Review user/seller posts & store activation requests'}
                </div>
              </button>
            )}

            {isAnySuperAdmin && (
              <button
                type="button"
                onClick={() => setTab('site_settings')}
                className="p-5 rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-left hover:border-emerald-700 dark:hover:border-amber-400 transition-colors"
              >
                <Settings className="w-5 h-5 text-emerald-700 dark:text-amber-400 mb-2" />
                <div className="font-display font-bold text-base">
                  {lang === 'bn' ? 'সম্পূর্ণ ওয়েবসাইট সেটিংস' : 'Global Website Control'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {lang === 'bn'
                    ? 'অটো-রোটেশন (10s/15s/30s), ১১.১১ ক্যাম্পেইন ও চ্যাট কন্ট্রোল'
                    : 'Auto-rotate, 11.11 campaign, banners & permissions'}
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS LIST */}
      {tab === 'products' && (
        <div className="space-y-3">
          {myHouses.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
              {lang === 'bn' ? 'কোনো প্রোডাক্ট পাওয়া যায়নি।' : 'No products found.'}
            </div>
          ) : (
            myHouses.map((h) => (
              <div
                key={h.id}
                className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-[#071312] overflow-hidden shrink-0">
                    {getSafeImage(h) ? (
                      <img src={getSafeImage(h)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{h.data.title}</div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 mt-0.5">
                      <span>{h.data.category}</span>
                      <span>·</span>
                      <span className="font-mono-num text-emerald-800 dark:text-amber-400 font-semibold">
                        {formatBDT(h.data.rent)}
                      </span>
                      {h.data.campaign11?.active && (
                        <>
                          <span>·</span>
                          <span className="text-rose-600 font-semibold">
                            11.11 (-{h.data.campaign11.discount}
                            {h.data.campaign11.type === 'percent' ? '%' : '৳'})
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className={h.data.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}>
                        {h.data.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditProduct(h)}
                    className="min-h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-emerald-950/70 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'এডিট / ১১.১১' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(h)}
                    className="min-h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: PRODUCT EDITOR (INCLUDES 11.11 CAMPAIGN FOR NEW & OLD POSTS) */}
      {tab === 'editor' && (
        <form
          onSubmit={handleSaveProduct}
          className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {editingId
                ? lang === 'bn'
                  ? 'পুরনো পোস্ট এডিট ও ১১.১১ ক্যাম্পেইন সেট করুন'
                  : 'Edit Post & 11.11 Campaign'
                : lang === 'bn'
                ? 'নতুন প্রোডাক্ট প্রকাশ করুন'
                : 'Publish New Product'}
            </h2>
            <button
              type="button"
              onClick={() => setTab('products')}
              className="text-xs font-semibold text-slate-500 hover:underline"
            >
              {lang === 'bn' ? 'তালিকায় ফিরুন' : 'Back to list'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'প্রোডাক্ট / অফারের নাম *' : 'Product / Offer Title *'}
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={
                  lang === 'bn'
                    ? 'যেমন: রবি ৩০ জিবি + ৫০০ মিনিট বান্ডেল অথবা শাড়ি / মোবাইল'
                    : 'Enter product or offer title...'
                }
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'প্রোডাক্টের ধরন *' : 'Product Type *'}
              </label>
              <select
                value={formData.productType || 'physical'}
                onChange={(e) => {
                  const nextType = e.target.value as HouseData['productType'];
                  const defaultOps =
                    siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
                      ? siteSettings.telecomCategories
                      : DEFAULT_TELECOM_CATEGORIES;
                  const isTelecomNext =
                    nextType === 'telecom' || nextType === 'vip_sim' || nextType === 'data_package';
                  setFormData({
                    ...formData,
                    productType: nextType,
                    telecomCompany: isTelecomNext
                      ? formData.telecomCompany || defaultOps[0] || 'Robi'
                      : '',
                    offerValidity: isTelecomNext ? formData.offerValidity || '' : '',
                  });
                }}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-medium"
              >
                <option value="physical">Physical Product / Service</option>
                {canAccessDigitalEditor && <option value="digital">Digital Product</option>}
                <option value="liquid_weight">Liquid / Weight</option>
                <option value="clothing_size">Clothing Size</option>
                <option value="telecom">Telecom / Bundle</option>
                <option value="vip_sim">VIP SIM</option>
                <option value="data_package">Data Package</option>
              </select>
            </div>

            {/* Dedicated Offer / SIM Category Box (STRICTLY ONLY for Telecom / VIP SIM / Data Package) */}
            {(formData.productType === 'telecom' ||
              formData.productType === 'vip_sim' ||
              formData.productType === 'data_package') && (
              <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-sky-50/85 dark:bg-sky-950/30 border-2 border-sky-400/75 dark:border-sky-600/60 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-display font-bold text-sm text-sky-900 dark:text-sky-200">
                    <Smartphone className="w-4 h-4 text-sky-700 dark:text-sky-300 shrink-0" />
                    <span>
                      {formData.productType === 'vip_sim'
                        ? lang === 'bn'
                          ? 'ভিআইপি সিম অপারেটর ও ক্যাটাগরি'
                          : 'VIP SIM Operator & Category'
                        : lang === 'bn'
                        ? 'টেলিকম / ড্রাইভ প্যাকেজ অপারেটর'
                        : 'Telecom / Drive Package Operator'}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      formData.productType === 'vip_sim'
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {formData.productType === 'vip_sim'
                      ? lang === 'bn'
                        ? 'কুরিয়ার পণ্য: ডেলিভারি এড্রেস ও চার্জ চালু থাকবে'
                        : 'Courier Item: Address & Fee Active'
                      : lang === 'bn'
                      ? 'ড্রাইভ অফার: ডেলিভারি এড্রেস ও চার্জ লাগবে না'
                      : 'Drive Offer: No Address Needed'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2 text-sky-900 dark:text-sky-200">
                    {lang === 'bn'
                      ? 'অপারেটর / প্যাকেজ ক্যাটাগরি নির্বাচন করুন *'
                      : 'Select Operator / Package Category *'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
                      ? siteSettings.telecomCategories
                      : DEFAULT_TELECOM_CATEGORIES
                    ).map((op) => {
                      const activeOp = (formData.telecomCompany || '') === op;
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setFormData({ ...formData, telecomCompany: op })}
                          className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            activeOp
                              ? 'bg-sky-700 text-white border-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:border-sky-500 shadow-xs'
                              : 'bg-white dark:bg-[#071312] border-sky-200 dark:border-sky-800 text-slate-700 dark:text-slate-200 hover:border-sky-500'
                          }`}
                        >
                          {getTelecomCategoryLabel(op, lang)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-sky-900 dark:text-sky-200">
                      {lang === 'bn' ? 'অপারেটর / ক্যাটাগরি' : 'Operator Category'}
                    </label>
                    <select
                      value={
                        formData.telecomCompany ||
                        (siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
                          ? siteSettings.telecomCategories[0]
                          : DEFAULT_TELECOM_CATEGORIES[0])
                      }
                      onChange={(e) => setFormData({ ...formData, telecomCompany: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-sky-200 dark:border-sky-800 text-sm font-medium"
                    >
                      {(siteSettings.telecomCategories && siteSettings.telecomCategories.length > 0
                        ? siteSettings.telecomCategories
                        : DEFAULT_TELECOM_CATEGORIES
                      ).map((op) => (
                        <option key={op} value={op}>
                          {getTelecomCategoryLabel(op, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-sky-900 dark:text-sky-200">
                      {lang === 'bn' ? 'অফারের মেয়াদ / বিবরণ (ঐচ্ছিক)' : 'Validity / Pack Note (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.offerValidity || ''}
                      onChange={(e) => setFormData({ ...formData, offerValidity: e.target.value })}
                      placeholder={lang === 'bn' ? 'যেমন: ৩০ দিন / আনলিমিটেড / অফিসিয়াল' : 'e.g. 30 Days'}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-sky-200 dark:border-sky-800 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* General Category (Hidden automatically when Telecom / VIP SIM / Data Package is selected) */}
            {!(
              formData.productType === 'telecom' ||
              formData.productType === 'vip_sim' ||
              formData.productType === 'data_package'
            ) && (
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </label>
                <select
                  value={
                    isDrivePackageCategory(formData.category)
                      ? (siteSettings.categories || []).find((c) => !isDrivePackageCategory(c)) ||
                        'অন্যান্য'
                      : formData.category
                  }
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
                >
                  {((siteSettings.categories || ['অন্যান্য']).filter(
                    (cat) => !isDrivePackageCategory(cat)
                  ).length > 0
                    ? (siteSettings.categories || ['অন্যান্য']).filter(
                        (cat) => !isDrivePackageCategory(cat)
                      )
                    : ['অন্যান্য']
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'বিক্রয় মূল্য (৳) *' : 'Price (৳) *'}
              </label>
              <input
                type="number"
                required
                value={formData.rent ? formData.rent : ''}
                onChange={(e) =>
                  setFormData({ ...formData, rent: e.target.value === '' ? 0 : Number(e.target.value) })
                }
                placeholder={lang === 'bn' ? 'দাম লিখুন' : 'Enter price'}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'পূর্বের মূল্য (৳)' : 'Old Price (৳)'}
              </label>
              <input
                type="number"
                value={formData.oldPrice ? formData.oldPrice : ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    oldPrice: e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                placeholder={lang === 'bn' ? 'ঐচ্ছিক' : 'Optional'}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'হোলসেল / কেনা দাম (৳)' : 'Wholesale Cost (৳)'}
              </label>
              <input
                type="number"
                value={wholesalePrice ? wholesalePrice : ''}
                onChange={(e) =>
                  setWholesalePrice(e.target.value === '' ? 0 : Number(e.target.value))
                }
                placeholder={lang === 'bn' ? 'ঐচ্ছিক' : 'Optional'}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'স্টক পরিমাণ' : 'Stock Qty'}
              </label>
              <input
                type="number"
                value={formData.stock ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stock: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                placeholder="15"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'বিক্রয়ের ধরন' : 'Sale Type'}
              </label>
              <select
                value={formData.saleType || 'regular'}
                onChange={(e) =>
                  setFormData({ ...formData, saleType: e.target.value as 'regular' | 'flash' })
                }
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              >
                <option value="regular">Regular Sale</option>
                <option value="flash">Flash Sale</option>
              </select>
            </div>

            {formData.saleType === 'flash' && (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1">Flash Price (৳)</label>
                  <input
                    type="number"
                    value={formData.flashPrice ? formData.flashPrice : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        flashPrice: e.target.value === '' ? 0 : Number(e.target.value),
                      })
                    }
                    placeholder={lang === 'bn' ? 'দাম লিখুন' : 'Flash price'}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    value={formData.flashDuration ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        flashDuration: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="24"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                  />
                </div>
              </>
            )}

            {/* Physical & VIP SIM Shipping Fields (Hidden for Digital & No-Address Drive/Data Package) */}
            {formData.productType !== 'digital' &&
              formData.productType !== 'telecom' &&
              formData.productType !== 'data_package' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {lang === 'bn' ? 'এলাকা / লোকেশন' : 'Location'}
                    </label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Delivery Dhaka (৳)</label>
                    <input
                      type="number"
                      value={formData.deliveryChargeDhaka ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryChargeDhaka:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="60"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Delivery Outside (৳)</label>
                    <input
                      type="number"
                      value={formData.deliveryChargeOutside ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryChargeOutside:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="120"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                    />
                  </div>
                </>
              )}

            {isAnySuperAdmin && (
              <div className="flex items-center gap-4 pt-5">
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.featured)}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  />
                  <span>{lang === 'bn' ? 'ফিচার্ড প্রোডাক্ট' : 'Featured Product'}</span>
                </label>
              </div>
            )}
          </div>

          {/* 11.11 MEGA CAMPAIGN DISCOUNT SECTION (ALWAYS AVAILABLE ON CREATE & EDIT) */}
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-display font-bold text-sm text-rose-700 dark:text-rose-300">
                <Flame className="w-4 h-4" />
                <span>
                  {siteSettings.campaign11Title || '১১.১১ মেগা ক্যাম্পেইন (11.11 Campaign)'} —{' '}
                  {lang === 'bn' ? 'ডিসকাউন্ট অফার' : 'Discount Offer'}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    campaign11: {
                      active: !formData.campaign11?.active,
                      discount: formData.campaign11?.discount || 0,
                      type: formData.campaign11?.type || 'percent',
                    },
                  })
                }
                className={`min-h-[36px] px-4 rounded-xl text-xs font-bold transition-colors ${
                  formData.campaign11?.active
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-[#071312] border border-rose-200 dark:border-rose-900 text-slate-600 dark:text-slate-300'
                }`}
              >
                {formData.campaign11?.active
                  ? lang === 'bn'
                    ? 'চালু আছে (ON)'
                    : 'Active (ON)'
                  : lang === 'bn'
                  ? 'বন্ধ আছে (OFF)'
                  : 'Off'}
              </button>
            </div>

            {formData.campaign11?.active && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'bn' ? 'ডিসকাউন্টের ধরন' : 'Discount Type'}
                  </label>
                  <select
                    value={formData.campaign11.type === 'percent' ? 'percent' : 'flat'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        campaign11: {
                          ...formData.campaign11!,
                          type: e.target.value as 'percent' | 'flat',
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-rose-200 dark:border-rose-900 text-xs font-semibold"
                  >
                    <option value="percent">পার্সেন্টেজ ছাড় (% OFF)</option>
                    <option value="flat">ফিক্সড টাকা ছাড় (৳ OFF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'bn'
                      ? `কত ডিসকাউন্ট (${formData.campaign11.type === 'percent' ? '%' : '৳'})`
                      : `Discount Amount (${formData.campaign11.type === 'percent' ? '%' : '৳'})`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.campaign11.discount ? formData.campaign11.discount : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        campaign11: {
                          ...formData.campaign11!,
                          discount: e.target.value === '' ? 0 : Number(e.target.value),
                        },
                      })
                    }
                    placeholder={lang === 'bn' ? 'ছাড় লিখুন' : 'Amount'}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-rose-200 dark:border-rose-900 text-sm font-mono-num font-bold text-rose-700 dark:text-rose-300"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 text-white text-center">
                  <div className="text-[10px] opacity-90">
                    {lang === 'bn' ? '১১.১১ স্পেশাল দাম' : '11.11 Final Price'}
                  </div>
                  <div className="font-display font-bold text-lg font-mono-num">
                    {formatBDT(previewCampaign11Price)}
                  </div>
                </div>
              </div>
            )}

            {!siteSettings.enableCampaign11 && (
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                {lang === 'bn'
                  ? 'টিপস: হোমপেজে ১১.১১ সেকশন দেখাতে ওয়েবসাইট সেটিংস থেকে "১১.১১ ক্যাম্পেইন" সুইচ অন রাখুন।'
                  : 'Tip: Enable 11.11 Campaign in Site Control to display this section on Home.'}
              </p>
            )}
          </div>

          {/* Product / Drive Offer Coupon Code (Optional) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-amber-800 dark:text-amber-300">
              <Tag className="w-4 h-4" />
              <span>
                {lang === 'bn'
                  ? 'প্রোডাক্ট / অফার প্রোমো কুপন কোড (ঐচ্ছিক)'
                  : 'Product / Offer Promo Coupon Code (Optional)'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {lang === 'bn' ? 'কুপন কোড (যেমন: DRIVE50)' : 'Coupon Code'}
                </label>
                <input
                  type="text"
                  value={formData.promoCode?.code || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      promoCode: {
                        code: e.target.value.toUpperCase(),
                        discount: formData.promoCode?.discount || 0,
                        type: formData.promoCode?.type === 'fixed' ? 'fixed' : 'percent',
                      },
                    })
                  }
                  placeholder="DRIVE50"
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-amber-200 dark:border-amber-900 text-xs font-mono-num uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {lang === 'bn' ? 'ছাড়ের ধরন' : 'Discount Type'}
                </label>
                <select
                  value={formData.promoCode?.type === 'fixed' ? 'fixed' : 'percent'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      promoCode: {
                        code: formData.promoCode?.code || '',
                        discount: formData.promoCode?.discount || 0,
                        type: e.target.value as 'percent' | 'fixed',
                      },
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-amber-200 dark:border-amber-900 text-xs font-semibold"
                >
                  <option value="percent">% Percent OFF</option>
                  <option value="fixed">৳ Fixed Taka OFF</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {lang === 'bn'
                    ? `ছাড়ের পরিমাণ (${formData.promoCode?.type === 'fixed' ? '৳' : '%'})`
                    : 'Discount Amount'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.promoCode?.discount ? formData.promoCode.discount : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      promoCode: {
                        code: formData.promoCode?.code || '',
                        discount: e.target.value === '' ? 0 : Number(e.target.value) || 0,
                        type: formData.promoCode?.type === 'fixed' ? 'fixed' : 'percent',
                      },
                    })
                  }
                  placeholder={lang === 'bn' ? 'ছাড়ের পরিমাণ' : 'Discount'}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-amber-200 dark:border-amber-900 text-sm font-mono-num"
                />
              </div>
            </div>
          </div>

          {/* SMART VARIATIONS STUDIO (Adapts specifically to Clothing Sizes vs Liquid/Weight vs Other Types) */}
          {(() => {
            const isClothingMode =
              formData.productType === 'clothing_size' || isClothingCategory(formData.category);
            const isLiquidMode =
              !isClothingMode &&
              (formData.productType === 'liquid_weight' ||
                isLiquidWeightCategory(formData.category));
            const CLOTHING_QUICK_SIZES = [
              'XS',
              'S',
              'M',
              'L',
              'XL',
              'XXL',
              '3XL',
              'Free Size',
              '28',
              '30',
              '32',
              '34',
              '36',
            ];
            const LIQUID_WEIGHT_PRESETS = [
              { amount: '100', unit: 'গ্রাম', label: '100 গ্রাম' },
              { amount: '250', unit: 'গ্রাম', label: '250 গ্রাম' },
              { amount: '500', unit: 'গ্রাম', label: '500 গ্রাম' },
              { amount: '1', unit: 'কেজি', label: '1 কেজি' },
              { amount: '2', unit: 'কেজি', label: '2 কেজি' },
              { amount: '5', unit: 'কেজি', label: '5 কেজি' },
              { amount: '100', unit: 'ml', label: '100 ml' },
              { amount: '250', unit: 'ml', label: '250 ml' },
              { amount: '500', unit: 'ml', label: '500 ml' },
              { amount: '1', unit: 'লিটার', label: '1 লিটার' },
              { amount: '2', unit: 'লিটার', label: '2 লিটার' },
              { amount: '5', unit: 'লিটার', label: '5 লিটার' },
            ];
            const UNIT_OPTIONS = [
              { value: 'গ্রাম', label: lang === 'bn' ? 'গ্রাম (Gram)' : 'Gram (g)' },
              { value: 'কেজি', label: lang === 'bn' ? 'কেজি (KG)' : 'KG' },
              { value: 'ml', label: lang === 'bn' ? 'মিলি (ml)' : 'ml' },
              { value: 'লিটার', label: lang === 'bn' ? 'লিটার (Liter)' : 'Liter' },
              { value: 'পিস', label: lang === 'bn' ? 'পিস (Pcs)' : 'Pcs' },
            ];

            return (
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isClothingMode
                    ? 'bg-violet-50/75 dark:bg-violet-950/20 border-violet-300 dark:border-violet-800/70'
                    : isLiquidMode
                    ? 'bg-cyan-50/75 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800/70'
                    : 'bg-slate-50 dark:bg-[#071312] border-slate-200 dark:border-emerald-950'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold block">
                      {isClothingMode
                        ? lang === 'bn'
                          ? '👕 জামা-কাপড়ের সাইজ ও আলাদা ছবির স্টুডিও'
                          : '👕 Clothing Size & Per-Size Photo Studio'
                        : isLiquidMode
                        ? lang === 'bn'
                          ? '🧴 লিকুইড / ওজন (কেজি, গ্রাম, লিটার, মিলি) ও ছবির স্টুডিও'
                          : '🧴 Liquid / Weight (KG, Gram, Liter, ml) & Photo Studio'
                        : lang === 'bn'
                        ? 'ভ্যারিয়েশন ও আলাদা ছবি (ঐচ্ছিক)'
                        : 'Product Variants & Photos (Optional)'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isClothingMode
                        ? lang === 'bn'
                          ? 'পছন্দের সাইজ ট্যাপ করুন এবং প্রতিটি সাইজের পাশে আলাদা ছবি আপলোড করুন।'
                          : 'Tap sizes and upload a dedicated photo next to each size/color.'
                        : isLiquidMode
                        ? lang === 'bn'
                          ? 'কত কেজি / গ্রাম / লিটার / মিলি নির্বাচন করুন এবং পাশে আলাদা ছবি ও দাম দিন।'
                          : 'Specify exact KG / Gram / Liter / ml with price and per-pack photo.'
                        : lang === 'bn'
                        ? 'প্রতিটি অপশনের পাশে আলাদা দাম ও ছবি যুক্ত করতে পারবেন।'
                        : 'Add optional size/pack label, price, and variant photo.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        variations: [
                          ...(formData.variations || []),
                          isLiquidMode
                            ? {
                                label: '500 গ্রাম',
                                unitAmount: '500',
                                unitType: 'গ্রাম',
                                price: formData.rent || 0,
                                image: '',
                              }
                            : {
                                label: '',
                                price: formData.rent || 0,
                                image: '',
                              },
                        ],
                      })
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {isClothingMode
                        ? lang === 'bn'
                          ? 'নতুন সাইজ'
                          : 'Add Size'
                        : isLiquidMode
                        ? lang === 'bn'
                          ? 'নতুন প্যাক/ওজন'
                          : 'Add Pack'
                        : lang === 'bn'
                        ? 'যোগ করুন'
                        : 'Add'}
                    </span>
                  </button>
                </div>

                {/* Clothing-only quick preset sizes */}
                {isClothingMode && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-violet-900 dark:text-violet-300">
                      {lang === 'bn'
                        ? 'কুইক সাইজ (ট্যাপ করলেই লিস্টে যোগ হবে):'
                        : 'Quick Sizes (Tap to add):'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CLOTHING_QUICK_SIZES.map((sz) => {
                        const exists = (formData.variations || []).some(
                          (v) => v.label.trim().toUpperCase() === sz.toUpperCase()
                        );
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                variations: [
                                  ...(formData.variations || []),
                                  { label: sz, price: formData.rent || 0, image: '' },
                                ],
                              })
                            }
                            className={`h-8 px-2.5 rounded-lg text-xs font-bold border transition-colors ${
                              exists
                                ? 'bg-violet-700 text-white border-violet-700 dark:bg-violet-500 dark:text-slate-950'
                                : 'bg-white dark:bg-[#0b1b19] border-violet-200 dark:border-violet-800 text-slate-700 dark:text-slate-200 hover:border-violet-500'
                            }`}
                          >
                            + {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Liquid / Weight-only quick preset weights & volumes */}
                {isLiquidMode && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-cyan-900 dark:text-cyan-300">
                      {lang === 'bn'
                        ? 'দ্রুত ওজন / পরিমাণ সিলেক্ট (গ্রাম / কেজি / মিলি / লিটার):'
                        : 'Quick Weight / Volume Presets:'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {LIQUID_WEIGHT_PRESETS.map((preset) => {
                        const exists = (formData.variations || []).some(
                          (v) => v.label.trim() === preset.label
                        );
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                variations: [
                                  ...(formData.variations || []),
                                  {
                                    label: preset.label,
                                    unitAmount: preset.amount,
                                    unitType: preset.unit,
                                    price: formData.rent || 0,
                                    image: '',
                                  },
                                ],
                              })
                            }
                            className={`h-8 px-2.5 rounded-lg text-xs font-bold border transition-colors ${
                              exists
                                ? 'bg-cyan-700 text-white border-cyan-700 dark:bg-cyan-500 dark:text-slate-950'
                                : 'bg-white dark:bg-[#0b1b19] border-cyan-200 dark:border-cyan-800 text-slate-700 dark:text-slate-200 hover:border-cyan-500'
                            }`}
                          >
                            + {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Variation Rows with Per-Row Photo Upload */}
                <div className="space-y-2.5">
                  {(formData.variations || []).map((v: ProductVariation, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Per-Variant Image Preview + Direct Upload Button right next to Size */}
                        <div className="flex items-center gap-2 shrink-0">
                          {v.image ? (
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-emerald-800 shrink-0">
                              <img
                                src={v.image}
                                alt={v.label || 'Variant'}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(formData.variations || [])];
                                  next[idx] = { ...next[idx], image: '' };
                                  setFormData({ ...formData, variations: next });
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center"
                                title="Remove photo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : null}

                          <label
                            className={`h-9 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 ${
                              uploadingVarIdx === idx ? 'opacity-60 pointer-events-none' : ''
                            }`}
                          >
                            {uploadingVarIdx === idx ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ImagePlus className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {uploadingVarIdx === idx
                                ? '...'
                                : v.image
                                ? lang === 'bn'
                                  ? 'বদলান'
                                  : 'Change'
                                : lang === 'bn'
                                ? 'ছবি দিন'
                                : 'Photo'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleVariationImageUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Smart Liquid/Weight Amount + Unit inputs OR Standard/Clothing Size input */}
                        {isLiquidMode ? (
                          <>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={v.unitAmount ?? ''}
                              onChange={(e) => {
                                const amt = e.target.value;
                                const unit = v.unitType || 'গ্রাম';
                                const next = [...(formData.variations || [])];
                                next[idx] = {
                                  ...next[idx],
                                  unitAmount: amt,
                                  unitType: unit,
                                  label: amt.trim() ? `${amt.trim()} ${unit}` : next[idx].label,
                                };
                                setFormData({ ...formData, variations: next });
                              }}
                              placeholder={lang === 'bn' ? 'কত? (যেমন 500)' : 'Qty (500)'}
                              className="w-24 h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-mono-num font-bold"
                            />
                            <select
                              value={v.unitType || 'গ্রাম'}
                              onChange={(e) => {
                                const unit = e.target.value;
                                const amt = (v.unitAmount || '').trim();
                                const next = [...(formData.variations || [])];
                                next[idx] = {
                                  ...next[idx],
                                  unitType: unit,
                                  label: amt ? `${amt} ${unit}` : next[idx].label,
                                };
                                setFormData({ ...formData, variations: next });
                              }}
                              className="h-9 px-2 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-semibold"
                            >
                              {UNIT_OPTIONS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={v.label}
                              onChange={(e) => {
                                const next = [...(formData.variations || [])];
                                next[idx] = { ...next[idx], label: e.target.value };
                                setFormData({ ...formData, variations: next });
                              }}
                              placeholder={lang === 'bn' ? 'প্রদর্শিত নাম (যেমন: ৫০০ গ্রাম বোতল)' : 'Display label'}
                              className="flex-1 min-w-[130px] h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs"
                            />
                          </>
                        ) : (
                          <input
                            type="text"
                            value={v.label}
                            onChange={(e) => {
                              const next = [...(formData.variations || [])];
                              next[idx] = { ...next[idx], label: e.target.value };
                              setFormData({ ...formData, variations: next });
                            }}
                            placeholder={
                              isClothingMode
                                ? lang === 'bn'
                                  ? 'সাইজ / কালার (যেমন: XL - Black Hoodie)'
                                  : 'Size / Color (e.g. XL - Black)'
                                : lang === 'bn'
                                ? 'অপশন নাম (যেমন: 1 KG, XL)'
                                : 'Label (e.g. 1 KG, XL)'
                            }
                            className="flex-1 min-w-[140px] h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-semibold"
                          />
                        )}

                        <input
                          type="number"
                          value={v.price ? v.price : ''}
                          onChange={(e) => {
                            const next = [...(formData.variations || [])];
                            next[idx] = {
                              ...next[idx],
                              price: e.target.value === '' ? 0 : Number(e.target.value),
                            };
                            setFormData({ ...formData, variations: next });
                          }}
                          placeholder={lang === 'bn' ? 'দাম (৳)' : 'Price'}
                          className="w-24 h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-mono-num font-bold"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              variations: (formData.variations || []).filter((_, i) => i !== idx),
                            })
                          }
                          className="w-9 h-9 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="url"
                        value={v.image || ''}
                        onChange={(e) => {
                          const next = [...(formData.variations || [])];
                          next[idx] = { ...next[idx], image: e.target.value };
                          setFormData({ ...formData, variations: next });
                        }}
                        placeholder={
                          lang === 'bn'
                            ? 'অথবা এই সাইজ/প্যাকের ছবির লিংক পেস্ট করুন (ঐচ্ছিক)...'
                            : 'Or paste image URL for this variant (optional)...'
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-50/70 dark:bg-[#071312] border border-slate-200/70 dark:border-emerald-950 text-[11px] font-mono text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* IMAGE UPLOAD API + IMAGE URLS + PREVIEW STRIP */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold">
                {lang === 'bn'
                  ? 'প্রোডাক্টের ছবি আপলোড / লিংক (প্রতি লাইনে একটি)'
                  : 'Product Images (Upload or URLs)'}
              </label>
              <label
                className={`min-h-[36px] px-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  uploadingImages ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {uploadingImages ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                <span>
                  {uploadingImages
                    ? lang === 'bn'
                      ? 'আপলোড হচ্ছে...'
                      : 'Uploading...'
                    : lang === 'bn'
                    ? 'ছবি আপলোড করুন'
                    : 'Upload Images'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProductImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={3}
              value={imgText}
              onChange={(e) => setImgText(e.target.value)}
              placeholder="https://... (অথবা উপরের বাটনে ক্লিক করে গ্যালারি থেকে ছবি আপলোড করুন)"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-mono"
            />

            {imgText.trim() && (
              <div className="flex flex-wrap gap-2 pt-1">
                {imgText
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((url, idx) => (
                    <div
                      key={`${idx}-${url.slice(0, 24)}`}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-emerald-900 bg-slate-100 dark:bg-[#071312]"
                    >
                      <img
                        src={url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const lines = imgText
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .filter((_, i) => i !== idx);
                          setImgText(lines.join('\n'));
                        }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">YouTube Video Review URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtu.be/..."
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'সেলার / ওনার ফোন (WhatsApp)' : 'Owner Phone (WhatsApp)'}
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
            </div>
          </div>

          {/* DIGITAL PRODUCT ONLY: LINKS (WITH CLICKABLE LINK NAME) & SECRET TEXTS */}
          {formData.productType === 'digital' && canAccessDigitalEditor && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-display font-bold text-sm text-emerald-900 dark:text-amber-300">
                  <Lock className="w-4 h-4" />
                  <span>
                    {lang === 'bn'
                      ? 'ডিজিটাল প্রোডাক্ট লিংক ও সিক্রেট কন্টেন্ট (শুধুমাত্র ডিজিটাল প্রোডাক্টের জন্য)'
                      : 'Digital Product Links & Secret Content (Unlocked After Purchase)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {lang === 'bn' ? 'মেয়াদ (ঘণ্টা):' : 'Expiry (hrs):'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={formData.digitalExpiryHours ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, digitalExpiryHours: e.target.value })
                    }
                    placeholder="Lifetime"
                    className="w-24 h-8 px-2.5 rounded-lg bg-white dark:bg-[#071312] border border-emerald-300 dark:border-emerald-800 text-xs font-mono-num"
                  />
                </div>
              </div>

              {/* 1. Digital Links with Custom Link Name */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'bn'
                        ? 'ডিজিটাল ডাউনলোড / অ্যাক্সেস লিংক (নামে ক্লিক করলে লিংকে ঢুকবে)'
                        : 'Secret Links (Clicking the Link Name opens the URL)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDigitalLinks([...digitalLinks, { title: '', label: '', url: '' }])
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'নতুন লিংক যোগ' : 'Add Link'}</span>
                  </button>
                </div>

                {digitalLinks.length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-white/60 dark:bg-[#071312]/60 rounded-xl px-3 py-2.5">
                    {lang === 'bn'
                      ? 'কোনো ডিজিটাল লিংক যোগ করা হয়নি। "+ নতুন লিংক যোগ" বাটনে ক্লিক করে লিংকের নাম ও URL দিন।'
                      : 'No digital links yet. Click "+ Add Link" to add a named URL.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {digitalLinks.map((dl, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white dark:bg-[#071312] p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900"
                      >
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={dl.title ?? dl.label ?? ''}
                            onChange={(e) => {
                              const next = [...digitalLinks];
                              next[idx] = {
                                ...next[idx],
                                title: e.target.value,
                                label: e.target.value,
                              };
                              setDigitalLinks(next);
                            }}
                            placeholder={
                              lang === 'bn'
                                ? 'লিংকের নাম (যেমন: Download File)'
                                : 'Link Name (e.g. Download App)'
                            }
                            className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-xs font-semibold"
                          />
                        </div>
                        <div className="sm:col-span-6">
                          <input
                            type="url"
                            value={dl.url}
                            onChange={(e) => {
                              const next = [...digitalLinks];
                              next[idx] = { ...next[idx], url: e.target.value };
                              setDigitalLinks(next);
                            }}
                            placeholder="https://drive.google.com/..."
                            className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                          {dl.url.trim() && (
                            <button
                              type="button"
                              onClick={() => openExternalUrl(normalizeExternalUrl(dl.url))}
                              title={dl.title || dl.label || 'Open Link'}
                              className="h-9 px-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{dl.title?.trim() ? (lang === 'bn' ? 'প্রবেশ' : 'Open') : (lang === 'bn' ? 'টেস্ট' : 'Test')}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setDigitalLinks(digitalLinks.filter((_, i) => i !== idx))
                            }
                            className="w-9 h-9 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Digital Secret Texts / License Keys */}
              <div className="space-y-2.5 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'bn'
                        ? 'সিক্রেট টেক্সট / লাইসেন্স কী (একাউন্ট বা কোড)'
                        : 'Secret Texts / License Keys'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDigitalTexts([...digitalTexts, { title: '', text: '' }])}
                    className="px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'নতুন টেক্সট যোগ' : 'Add Text'}</span>
                  </button>
                </div>

                {digitalTexts.map((dt, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white dark:bg-[#071312] p-2.5 rounded-xl border border-sky-200 dark:border-sky-900/60"
                  >
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={dt.title || ''}
                        onChange={(e) => {
                          const next = [...digitalTexts];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setDigitalTexts(next);
                        }}
                        placeholder={lang === 'bn' ? 'শিরোনাম (যেমন: License Key)' : 'Title'}
                        className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-xs font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <input
                        type="text"
                        value={dt.text}
                        onChange={(e) => {
                          const next = [...digitalTexts];
                          next[idx] = { ...next[idx], text: e.target.value };
                          setDigitalTexts(next);
                        }}
                        placeholder={lang === 'bn' ? 'সিক্রেট টেক্সট / কোড' : 'Secret value / key'}
                        className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDigitalTexts(digitalTexts.filter((_, i) => i !== idx))}
                        className="w-9 h-9 rounded-lg text-rose-600 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'bn'
                      ? 'অতিরিক্ত সিক্রেট নোট / সরাসরি লিংক (ঐচ্ছিক)'
                      : 'Quick Secret Info / Fallback Link (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={digitalSecret}
                    onChange={(e) => setDigitalSecret(e.target.value)}
                    placeholder="Key / Password / Link"
                    className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#071312] border border-emerald-200 dark:border-emerald-900 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'বিস্তারিত বিবরণ' : 'Description'}
            </label>
            <textarea
              rows={4}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
            />
          </div>

          <button
            type="submit"
            className="min-h-[46px] px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm"
          >
            {editingId
              ? isMainSuperAdmin
                ? lang === 'bn'
                  ? 'পরিবর্তন সেভ করুন'
                  : 'Save Changes'
                : lang === 'bn'
                ? 'এডিট রিকোয়েস্ট পাঠান (মেইন সুপার এডমিন)'
                : 'Request Edit Approval (Main Super Admin)'
              : lang === 'bn'
              ? 'প্রকাশ করুন'
              : 'Publish Product'}
          </button>
        </form>
      )}

      {/* TAB: ORDERS MANAGEMENT */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {isMainSuperAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['ALL', lang === 'bn' ? `সবার অর্ডার (${adminVisibleOrdersCount})` : `All Orders (${adminVisibleOrdersCount})`],
                  ['OTHERS', lang === 'bn' ? 'অন্য এডমিন / সেলারের অর্ডার' : 'Other Admins / Sellers'],
                  ['MINE', lang === 'bn' ? 'আমার নিজের পোস্টের অর্ডার' : 'My Own Post Orders'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOrderOwnerFilter(k)}
                  className={`min-h-[34px] px-3.5 rounded-xl text-xs font-semibold ${
                    orderOwnerFilter === k
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['ALL', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(st)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    orderStatusFilter === st
                      ? 'bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950'
                      : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="text-xs font-mono-num text-slate-500">
              {lang === 'bn' ? 'লাভ:' : 'Profit:'} {formatBDT(deliveredProfit)}
            </div>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
              {lang === 'bn' ? 'কোনো অর্ডার নেই।' : 'No orders found.'}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map((o) => {
                const orderProduct = o.houseId ? houses.find((h) => h.id === o.houseId) : undefined;
                const resolvedItems = resolveOrderItems(o, houses);
                const primaryItem = resolvedItems[0];
                const ownerUid =
                  o.sellerId && o.sellerId !== 'admin'
                    ? o.sellerId
                    : orderProduct?.ownerId || orderProduct?.data?.ownerId || '';
                const ownerUser = ownerUid ? users.find((u) => u.uid === ownerUid) : undefined;
                const ownerDisplay =
                  ownerUser?.storeName ||
                  ownerUser?.name ||
                  orderProduct?.data?.ownerName ||
                  (o.sellerId === 'admin' ? (lang === 'bn' ? 'অ্যাডমিন পোস্ট' : 'Admin Post') : 'Seller');
                const productTitle =
                  o.productTitle ||
                  orderProduct?.data?.title ||
                  (o.isCart ? `${o.cartItems?.length || 0} Cart Items` : 'Order');

                const copyOneField = async (val: string, label: string) => {
                  if (!val) return;
                  try {
                    await navigator.clipboard.writeText(val);
                    onNotify(lang === 'bn' ? `${label} কপি হয়েছে!` : `${label} copied!`, 'success');
                  } catch {
                    onNotify(lang === 'bn' ? 'কপি করা যায়নি।' : 'Copy failed.', 'error');
                  }
                };

                const productSummaryText = resolvedItems
                  .map(
                    (it) =>
                      `${it.title}${it.variantLabel ? ` [${it.variantLabel}]` : ''} × ${it.quantity} (৳${it.lineTotal})`
                  )
                  .join(' | ');

                return (
                  <div
                    key={o.orderId}
                    className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 space-y-3"
                  >
                    {/* Main Super Admin Post Owner Monitor Strip */}
                    {isMainSuperAdmin && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-900/60">
                        <div className="flex flex-wrap items-center gap-2 min-w-0 text-xs">
                          <span className="text-slate-500">
                            {lang === 'bn' ? 'পোস্ট ওনার:' : 'Post Owner:'}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {ownerDisplay}
                          </span>
                          {ownerUser && (
                            <RoleBadge
                              role={ownerUser.role || 'seller'}
                              email={ownerUser.email}
                              lang={lang}
                            />
                          )}
                          {o.status === 'Pending' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              PENDING
                            </span>
                          )}
                        </div>
                        {ownerUser && ownerUser.uid !== userUid && (
                          <button
                            type="button"
                            onClick={() => openDirectChatWithUser(ownerUser.uid, ownerDisplay)}
                            className="h-8 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'সেলার/এডমিনকে SMS' : 'Direct SMS Owner'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Top Ordered Product With Picture, Variant & Price */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 overflow-hidden shrink-0 flex items-center justify-center">
                          {primaryItem?.image ? (
                            <img
                              src={primaryItem.image}
                              alt={productTitle}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-7 h-7 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-slate-100 dark:bg-emerald-950 text-slate-600 dark:text-slate-300 font-bold">
                              #{o.orderId}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyOneField(o.orderId, 'Order ID')}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-400 hover:text-emerald-700"
                              title="Copy Order ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <span className="text-[11px] text-slate-400">
                              {formatDateShort(o.createdAt, lang)}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-emerald-800 dark:text-amber-300 leading-snug">
                            {productTitle}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {o.selectedVariation?.label && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-amber-300 font-bold">
                                {lang === 'bn' ? 'সাইজ/প্যাক:' : 'Variant:'} {o.selectedVariation.label}
                              </span>
                            )}
                            {!o.isCart && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#071312] font-mono-num font-semibold">
                                × {o.quantity || 1}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                copyOneField(
                                  productSummaryText,
                                  lang === 'bn' ? 'প্রোডাক্ট ও সাইজ' : 'Product Info'
                                )
                              }
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-emerald-950/70 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{lang === 'bn' ? 'প্রোডাক্ট কপি' : 'Copy Item'}</span>
                            </button>
                          </div>

                          {o.appliedPromoCode && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                              <Tag className="w-3 h-3" />
                              <span>
                                Coupon: {o.appliedPromoCode}
                                {o.promoDiscount ? ` (-${formatBDT(o.promoDiscount)})` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-lg text-emerald-800 dark:text-amber-400 font-mono-num">
                          {formatBDT(o.totalPrice)}
                        </div>
                        <div
                          className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            o.status === 'Delivered'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : o.status === 'Cancelled'
                              ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {o.status}
                        </div>
                      </div>
                    </div>

                    {/* Multi-item Cart Breakdown with Individual Thumbnails & Sizes */}
                    {o.isCart && resolvedItems.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950">
                        {resolvedItems.map((ci, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-[#0b1b19] border border-slate-200/70 dark:border-emerald-900"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#071312] shrink-0 flex items-center justify-center">
                              {ci.image ? (
                                <img
                                  src={ci.image}
                                  alt={ci.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 text-xs">
                              <div className="font-semibold truncate">{ci.title}</div>
                              <div className="text-[11px] text-slate-500">
                                {ci.variantLabel ? `${ci.variantLabel} · ` : ''}
                                <span className="font-mono-num">
                                  ×{ci.quantity} · {formatBDT(ci.lineTotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Clean Customer, Address & Payment Card with Per-Field Copy Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          <strong className="text-slate-500">
                            {lang === 'bn' ? 'নাম:' : 'Name:'}
                          </strong>{' '}
                          <span className="font-semibold">{o.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyOneField(o.name, lang === 'bn' ? 'গ্রাহকের নাম' : 'Name')}
                          className="p-1.5 rounded-lg bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-slate-500 hover:text-emerald-700 shrink-0"
                          title="Copy Name"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-num truncate">
                          <strong className="text-slate-500">
                            {lang === 'bn' ? 'ফোন:' : 'Phone:'}
                          </strong>{' '}
                          <span className="font-bold">{o.phone}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyOneField(o.phone, lang === 'bn' ? 'মোবাইল নাম্বার' : 'Phone')
                          }
                          className="p-1.5 rounded-lg bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-slate-500 hover:text-emerald-700 shrink-0"
                          title="Copy Phone"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      {o.message && (
                        <div className="sm:col-span-2 flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-emerald-950">
                          <span className="leading-relaxed">
                            <strong className="text-slate-500">
                              {lang === 'bn' ? 'ঠিকানা:' : 'Address:'}
                            </strong>{' '}
                            {o.message}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyOneField(o.message!, lang === 'bn' ? 'ঠিকানা' : 'Address')
                            }
                            className="p-1.5 rounded-lg bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-slate-500 hover:text-emerald-700 shrink-0"
                            title="Copy Address"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-emerald-950">
                        <span>
                          <strong className="text-slate-500">
                            {lang === 'bn' ? 'পেমেন্ট:' : 'Payment:'}
                          </strong>{' '}
                          <span className="font-semibold">
                            {o.paymentMethod}
                            {o.paymentProvider ? ` (${o.paymentProvider})` : ''}
                          </span>
                          {o.senderNumber ? ` · Sender: ${o.senderNumber}` : ''}
                          {o.trxId ? ` · TrxID: ${o.trxId}` : ''}
                          {o.deliveryArea
                            ? ` · ${
                                o.deliveryArea === 'dhaka'
                                  ? lang === 'bn'
                                    ? 'ঢাকার ভেতরে'
                                    : 'Inside Dhaka'
                                  : lang === 'bn'
                                  ? 'ঢাকার বাহিরে'
                                  : 'Outside Dhaka'
                              }`
                            : ''}
                        </span>
                        {o.trxId && (
                          <button
                            type="button"
                            onClick={() => copyOneField(o.trxId!, 'TrxID')}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>TrxID</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {o.offerTargetNumber && (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/35 border border-sky-300 dark:border-sky-700/70">
                        <div>
                          <div className="text-[11px] font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5" />
                            <span>
                              {lang === 'bn'
                                ? 'অফার হিট নাম্বার (Telecom / Drive Number)'
                                : 'Offer Target Number (Drive / Telecom)'}
                            </span>
                          </div>
                          <div className="font-mono-num font-bold text-lg sm:text-xl text-slate-900 dark:text-white tracking-wider mt-0.5">
                            {o.offerTargetNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyOneField(
                              o.offerTargetNumber!,
                              lang === 'bn' ? 'অফার নাম্বার' : 'Offer number'
                            )
                          }
                          className="min-h-[40px] px-4 rounded-xl bg-sky-700 hover:bg-sky-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                          <span>{lang === 'bn' ? 'অফার নাম্বার কপি' : 'Copy Offer Number'}</span>
                        </button>
                      </div>
                    )}

                    {/* Action Toolbar: Status + Call + WhatsApp + Copy All + Demo Print + Delete */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-emerald-950">
                      <select
                        value={o.status}
                        onChange={(e) => handleOrderStatus(o, e.target.value)}
                        className="h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-semibold"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                      <a
                        href={`tel:${o.phone}`}
                        className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-emerald-950/70 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'কল' : 'Call'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => openExternalUrl(getWaLink(o.phone))}
                        className="h-9 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-amber-300 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          copyOneField(
                            buildOrderFullCopyText(o, houses, lang),
                            lang === 'bn' ? 'সম্পূর্ণ অর্ডার ডিটেলস' : 'Full order details'
                          )
                        }
                        className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-emerald-950/70 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'সব ডিটেলস কপি' : 'Copy All'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintingOrder(o)}
                        className="h-9 px-3 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'ডেমো প্রিন্ট / রসিদ' : 'Demo Print'}</span>
                      </button>
                      {(isAnySuperAdmin || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(o)}
                          className="h-9 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: CHAT INBOX */}
      {tab === 'inbox' && (
        <div className="space-y-3">
          {!isMainSuperAdmin && staffChatEnabled && (
            <div className="rounded-2xl bg-[#043934] text-white p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display font-bold text-sm">
                  {lang === 'bn' ? 'মেইন সুপার এডমিনের সাথে সরাসরি কথা বলুন' : 'Direct Line to Main Super Admin'}
                </div>
                <div className="text-xs text-teal-100/80">
                  {lang === 'bn'
                    ? 'কোনো সমস্যা, অ্যাপ্রুভাল বা অর্ডারের বিষয়ে সরাসরি মেসেজ পাঠান।'
                    : 'Send a direct message for urgent approvals or order support.'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleMessageMainSuperAdmin}
                className="min-h-[40px] px-4 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'এখনি মেসেজ দিন' : 'Message Now'}</span>
              </button>
            </div>
          )}

          {effectiveChatThreads.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
              {lang === 'bn' ? 'কোনো মেসেজ নেই।' : 'No chat conversations yet.'}
            </div>
          ) : (
            effectiveChatThreads.map((th) => {
              const isThreadUnread =
                (th.lastTimestamp || 0) > (seenChatMap[th.chatId] || 0) &&
                th.lastSender !== userUid &&
                th.lastSender !== 'amader_assistant_bot';
              return (
                <div
                  key={th.chatId}
                  className={`w-full bg-white dark:bg-[#0d1f1d] border rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2.5 transition-colors ${
                    isThreadUnread
                      ? 'border-amber-400 dark:border-amber-500 bg-amber-50/30 dark:bg-amber-950/15'
                      : 'border-slate-200 dark:border-emerald-950 hover:border-emerald-700 dark:hover:border-amber-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onMarkChatSeen?.(th.chatId);
                      onOpenChat(th.chatId, th.otherName);
                    }}
                    className="flex-1 min-w-0 text-left flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-800 dark:text-amber-300 shrink-0">
                        <MessageCircle className="w-5 h-5" />
                        {isThreadUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-600 ring-2 ring-white dark:ring-[#0d1f1d]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{th.otherName}</span>
                          {th.isSupport && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-amber-300 text-[10px] font-bold">
                              {lang === 'bn' ? 'সাপোর্ট চ্যাট' : 'Support'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {th.lastMessage || (lang === 'bn' ? 'কথোপকথন খুলুন' : 'Open conversation')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-slate-400">
                        {th.lastTimestamp ? formatTimeAgo(th.lastTimestamp, lang) : ''}
                      </div>
                      {isThreadUnread && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                          {lang === 'bn' ? 'নতুন মেসেজ' : 'New'}
                        </span>
                      )}
                    </div>
                  </button>
                  {isMainSuperAdmin && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await confirm({
                          title: lang === 'bn' ? 'এসএমএস থ্রেড ডিলিট?' : 'Delete SMS Thread?',
                          message:
                            lang === 'bn'
                              ? `আপনি কি "${th.otherName}" এর সম্পূর্ণ কথোপকথন ও সব এসএমএস ডিলিট করতে চান?`
                              : `Are you sure you want to delete the entire chat with "${th.otherName}"?`,
                          tone: 'danger',
                        });
                        if (!ok) return;
                        await remove(ref(db, `chats/${th.chatId}`));
                        onNotify(
                          lang === 'bn' ? 'এসএমএস থ্রেড ডিলিট করা হয়েছে।' : 'Conversation deleted.',
                          'info'
                        );
                      }}
                      title={lang === 'bn' ? 'এই এসএমএস ডিলিট করুন (মেইন এডমিন)' : 'Delete SMS thread'}
                      className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB: WALLET & WITHDRAWALS */}
      {tab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 space-y-4">
            <div>
              <div className="text-xs text-slate-500">{lang === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Available Balance'}</div>
              <div className="font-display text-3xl font-bold font-mono-num text-emerald-800 dark:text-amber-400 mt-1">
                {formatBDT(walletBalance)}
              </div>
            </div>

            <form onSubmit={handleRequestWithdraw} className="space-y-3 pt-3 border-t border-slate-200 dark:border-emerald-950">
              <div className="font-semibold text-sm">
                {lang === 'bn' ? 'টাকা উত্তোলনের রিকোয়েস্ট' : 'Request Withdrawal'}
              </div>
              <input
                type="number"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                placeholder={lang === 'bn' ? 'পরিমাণ (সর্বনিম্ন ১০০৳)' : 'Amount (min 100)'}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value as 'bKash' | 'Nagad')}
                  className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
                >
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                </select>
                <input
                  type="text"
                  value={withdrawAcct}
                  onChange={(e) => setWithdrawAcct(e.target.value)}
                  placeholder="Account Number"
                  className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[42px] rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold"
              >
                {lang === 'bn' ? 'উইথড্র রিকোয়েস্ট পাঠান' : 'Submit Request'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 space-y-3">
            <h3 className="font-display font-bold text-base">
              {isMainSuperAdmin
                ? lang === 'bn'
                  ? 'সকল উইথড্র রিকোয়েস্ট'
                  : 'All Withdrawal Requests'
                : lang === 'bn'
                ? 'আমার উইথড্র ইতিহাস'
                : 'My Withdrawal History'}
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {(isMainSuperAdmin ? withdrawals : withdrawals.filter((w) => w.uid === userUid)).map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200/80 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {w.userName} · <span className="font-mono-num">{formatBDT(w.amount)}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {w.method} ({w.account}) · {w.status} · {formatDateShort(w.timestamp, lang)}
                    </div>
                  </div>
                  {isMainSuperAdmin && w.status === 'Pending' && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAdminWithdrawal(w, 'Sent')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'পেমেন্ট সম্পন্ন' : 'Mark Sent'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminWithdrawal(w, 'Rejected')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'রিজেক্ট' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: APPROVALS & REQUESTS (MULTI-TIER ROUTING) */}
      {tab === 'approvals' && isModeratorLevel && (
        <div className="space-y-6">
          {/* 1. Staff Delete / Edit Approval Requests (Main Super Admin Exclusive) */}
          {isMainSuperAdmin && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base flex items-center gap-2 text-rose-700 dark:text-amber-400">
                  <Crown className="w-4 h-4" />
                  <span>
                    {lang === 'bn'
                      ? `এডমিন ও সহকারী সুপার এডমিন ডিলিট/এডিট রিকোয়েস্ট (${pendingActionReqs.length})`
                      : `Staff Delete & Edit Approval Queue (${pendingActionReqs.length})`}
                  </span>
                  {pendingActionReqs.length > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold inline-flex items-center justify-center">
                      {pendingActionReqs.length}
                    </span>
                  )}
                </h2>
              </div>

              {pendingActionReqs.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-6 text-xs text-slate-500">
                  {lang === 'bn' ? 'কোনো ডিলিট বা এডিট রিকোয়েস্ট নেই।' : 'No pending admin action requests.'}
                </div>
              ) : (
                pendingActionReqs.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase text-rose-600 dark:text-amber-400">
                        {req.actionType.replace('_', ' ')}
                      </div>
                      <div className="font-semibold text-sm">{req.targetTitle}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {lang === 'bn' ? 'আবেদনকারী:' : 'Requested by:'}{' '}
                          <strong>{req.requestedByName}</strong>
                        </span>
                        <RoleBadge
                          role={req.requestedByRole}
                          email={req.requestedByEmail}
                          lang={lang}
                        />
                        <span>· {formatDateShort(req.timestamp, lang)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveAdminAction(req)}
                        className="min-h-[38px] px-4 rounded-xl bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'অ্যাপ্রুভ ও কার্যকর করুন' : 'Approve & Execute'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectAdminAction(req)}
                        className="min-h-[38px] px-4 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

          {/* 2. Pending Products from Users & Sellers (Visible to Moderator -> Main Super Admin) */}
          <section className="space-y-3">
            <h2 className="font-display font-bold text-base flex items-center gap-2">
              <span>
                {lang === 'bn'
                  ? `ইউজার / সেলারদের পেন্ডিং প্রোডাক্ট (${pendingHouses.length})`
                  : `Pending User & Seller Products (${pendingHouses.length})`}
              </span>
              {pendingHouses.length > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold inline-flex items-center justify-center">
                  {pendingHouses.length}
                </span>
              )}
            </h2>
            {pendingHouses.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-6 text-xs text-slate-500">
                {lang === 'bn' ? 'কোনো পেন্ডিং প্রোডাক্ট নেই।' : 'No pending products.'}
              </div>
            ) : (
              pendingHouses.map((h) => (
                <div
                  key={h.id}
                  className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-sm">{h.data.title}</div>
                    <div className="text-xs text-slate-500">
                      {h.data.category} · {formatBDT(h.data.rent)} · {h.data.ownerName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproval(h.id, 'approved')}
                      className="min-h-[38px] px-3.5 rounded-xl bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'অ্যাপ্রুভ' : 'Approve'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproval(h.id, 'rejected')}
                      className="min-h-[38px] px-3.5 rounded-xl bg-amber-600 text-white text-xs font-semibold"
                    >
                      {lang === 'bn' ? 'রিজেক্ট' : 'Reject'}
                    </button>
                    {isMainSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(h)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'ডিলিট' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* 3. Store Activation Requests (Moderator -> Main Super Admin) */}
          <section className="space-y-3">
            <h2 className="font-display font-bold text-base flex items-center gap-2">
              <span>
                {lang === 'bn'
                  ? `স্টোর অ্যাক্টিভেশন রিকোয়েস্ট (${pendingStoreCount})`
                  : `Store Activation Requests (${pendingStoreCount})`}
              </span>
              {pendingStoreCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold inline-flex items-center justify-center">
                  {pendingStoreCount}
                </span>
              )}
            </h2>
            {pendingStoreReqs.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-6 text-xs text-slate-500">
                {lang === 'bn' ? 'কোনো স্টোর রিকোয়েস্ট নেই।' : 'No store requests.'}
              </div>
            ) : (
              pendingStoreReqs.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-emerald-700" />
                      <span>{req.storeName}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {req.userName} · TrxID: {req.trxId || 'N/A'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: lang === 'bn' ? 'স্টোর অ্যাপ্রুভ করবেন?' : 'Approve Store?',
                          message:
                            lang === 'bn'
                              ? `আপনি কি "${req.storeName}" স্টোরটি অ্যাক্টিভ ও অ্যাপ্রুভ করতে চান?`
                              : `Approve and activate store "${req.storeName}"?`,
                          detail: req.trxId ? `TrxID: ${req.trxId}` : undefined,
                          tone: 'primary',
                        });
                        if (!ok) return;
                        const updatesPayload: Record<string, unknown> = {
                          storeName: req.storeName,
                          isStoreActive: true,
                        };
                        if (req.storeLogo) {
                          updatesPayload.storeLogo = req.storeLogo;
                        }
                        await update(ref(db, `users/${req.uid}`), updatesPayload);
                        await remove(ref(db, `store_requests/${req.id}`));
                        onNotify(lang === 'bn' ? 'স্টোর অ্যাপ্রুভ হয়েছে!' : 'Store Approved!', 'success');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
                    >
                      {lang === 'bn' ? 'স্টোর অ্যাপ্রুভ করুন' : 'Approve Store'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: lang === 'bn' ? 'স্টোর রিকোয়েস্ট বাতিল?' : 'Reject Store Request?',
                          message:
                            lang === 'bn'
                              ? `আপনি কি "${req.storeName}" এর স্টোর অ্যাক্টিভেশন রিকোয়েস্ট বাতিল করতে চান?`
                              : `Reject store activation request for "${req.storeName}"?`,
                          tone: 'danger',
                        });
                        if (!ok) return;
                        await remove(ref(db, `store_requests/${req.id}`));
                        onNotify(lang === 'bn' ? 'স্টোর রিকোয়েস্ট বাতিল হয়েছে।' : 'Store request rejected.', 'info');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                    >
                      {lang === 'bn' ? 'রিজেক্ট' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* 4. Partner Requests (Partner / Admin / Super Admin) */}
          {(isAnySuperAdmin || role === 'admin' || role === 'partner') &&
            pendingPartnerReqs.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display font-bold text-base flex items-center gap-2">
                  <span>{lang === 'bn' ? 'পার্টনার রিকোয়েস্ট' : 'Partner Requests'}</span>
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold inline-flex items-center justify-center">
                    {pendingPartnerReqs.length}
                  </span>
                </h2>
                {pendingPartnerReqs.map((pr) => (
                  <div
                    key={pr.id}
                    className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="text-sm">
                      <span className="font-semibold">{pr.name || pr.email}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: lang === 'bn' ? 'পার্টনার অ্যাপ্রুভ?' : 'Approve Partner?',
                            message:
                              lang === 'bn'
                                ? `আপনি কি "${pr.name || pr.email}" কে পার্টনার হিসেবে অ্যাপ্রুভ করতে চান?`
                                : `Approve "${pr.name || pr.email}" as partner?`,
                            tone: 'primary',
                          });
                          if (!ok) return;
                          await remove(ref(db, `partner_requests/${pr.id}`));
                          onNotify(lang === 'bn' ? 'অ্যাপ্রুভ করা হয়েছে!' : 'Approved!', 'success');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'অ্যাপ্রুভ' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: lang === 'bn' ? 'পার্টনার রিকোয়েস্ট বাতিল?' : 'Reject Partner Request?',
                            message:
                              lang === 'bn'
                                ? `আপনি কি "${pr.name || pr.email}" এর পার্টনার রিকোয়েস্টটি রিজেক্ট করতে চান?`
                                : `Reject partner request from "${pr.name || pr.email}"?`,
                            tone: 'danger',
                          });
                          if (!ok) return;
                          await remove(ref(db, `partner_requests/${pr.id}`));
                          onNotify(lang === 'bn' ? 'রিজেক্ট করা হয়েছে।' : 'Rejected.', 'info');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'রিজেক্ট' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
        </div>
      )}

      {/* TAB: USER MANAGEMENT DASHBOARD (MAIN + ASSISTANT SUPER ADMIN) */}
      {tab === 'users' && isAnySuperAdmin && (
        <div className="space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4">
              <div className="text-xs text-slate-500">{lang === 'bn' ? 'মোট ইউজার' : 'Total Users'}</div>
              <div className="mt-1 font-display text-2xl font-bold font-mono-num">{users.length}</div>
            </div>
            <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4">
              <div className="text-xs text-slate-500">{lang === 'bn' ? 'এখন অনলাইনে' : 'Live Online'}</div>
              <div className="mt-1 font-display text-2xl font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                {onlineUsersCount}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4">
              <div className="text-xs text-slate-500">{lang === 'bn' ? 'স্টাফ ও এডমিন' : 'Admins & Staff'}</div>
              <div className="mt-1 font-display text-2xl font-bold font-mono-num">
                {
                  users.filter((u) =>
                    ['super_admin', 'admin', 'partner', 'manager', 'moderator'].includes(
                      isSuperAdminAccount(u.email, u.role) ? 'super_admin' : u.role || 'user'
                    )
                  ).length
                }
              </div>
            </div>
            <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4">
              <div className="text-xs text-slate-500">{lang === 'bn' ? 'সেলার ও মার্চেন্ট' : 'Sellers & Merchants'}</div>
              <div className="mt-1 font-display text-2xl font-bold font-mono-num">
                {users.filter((u) => ['seller', 'merchant'].includes(u.role || '')).length}
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  ['ALL', lang === 'bn' ? `সবাই (${users.length})` : `All (${users.length})`],
                  ['online', lang === 'bn' ? `অনলাইন (${onlineUsersCount})` : `Online (${onlineUsersCount})`],
                  ['admin', lang === 'bn' ? 'এডমিন ও স্টাফ' : 'Admins & Staff'],
                  ['seller', lang === 'bn' ? 'সেলার ও মার্চেন্ট' : 'Sellers & Merchants'],
                  ['user', lang === 'bn' ? 'কাস্টমার' : 'Customers'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setUserRoleFilter(key)}
                  className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                    userRoleFilter === key
                      ? 'bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950'
                      : 'bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={lang === 'bn' ? 'নাম, ইমেইল বা ফোন দিয়ে খুঁজুন...' : 'Search by name, email, phone...'}
              className="w-full sm:w-72 h-10 px-3.5 rounded-xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 text-sm"
            />
          </div>

          {/* Grouped Role Dashboard */}
          {groupedUsers.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
              {lang === 'bn' ? 'কোনো ইউজার পাওয়া যায়নি।' : 'No matching users found.'}
            </div>
          ) : (
            groupedUsers.map((group) => (
              <section key={group.role} className="space-y-3">
                <div className={`px-4 py-2.5 rounded-xl flex items-center justify-between ${group.accent}`}>
                  <div className="flex items-center gap-2 font-display font-bold text-sm">
                    <UserCheck className="w-4 h-4" />
                    <span>{group.title}</span>
                  </div>
                  <span className="font-mono-num text-xs font-bold">{group.users.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {group.users.map((u) => {
                    const online = isUserOnline(u);
                    const isMainTarget = isMainSuperAdminAccount(u.email);
                    const isTargetSuper = isSuperAdminAccount(u.email, u.role);
                    const currRole = (u.role || 'user') as UserRole;
                    const allowedList = isMainSuperAdmin
                      ? ROLE_HIERARCHY
                      : ROLE_HIERARCHY.filter((r) => r !== 'super_admin');
                    const roleIdx = allowedList.indexOf(currRole);
                    const canModifyTargetRole =
                      !isMainTarget && (isMainSuperAdmin || !isTargetSuper);

                    return (
                      <div
                        key={u.uid}
                        className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 flex flex-col justify-between gap-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <RoleAvatar
                              name={u.name}
                              email={u.email}
                              profilePic={u.profilePic || u.storeLogo}
                              role={currRole}
                              sizeClass="w-11 h-11"
                            />
                            <div className="min-w-0 space-y-1">
                              <div className="font-semibold text-sm truncate">
                                {u.name || u.email || u.uid}
                              </div>
                              <RoleBadge role={currRole} email={u.email} lang={lang} />
                              <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                              {u.phone && (
                                <div className="text-[11px] font-mono-num text-slate-400">
                                  {u.phone}
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-[11px] font-semibold shrink-0 ${
                              online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            {online ? (lang === 'bn' ? 'অনলাইন' : 'Online') : formatTimeAgo(u.lastActive || u.lastLogin, lang)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-emerald-950 pt-2.5">
                          <span>
                            {lang === 'bn' ? 'ওয়ালেট:' : 'Wallet:'}{' '}
                            <strong className="font-mono-num text-slate-800 dark:text-slate-200">
                              {formatBDT(u.walletBalance || 0)}
                            </strong>
                          </span>
                          <div className="flex items-center gap-2">
                            {u.storeName && <span className="truncate max-w-[110px]">{u.storeName}</span>}
                            {u.uid !== userUid && (!isMainTarget || staffChatEnabled) && (
                              <button
                                type="button"
                                onClick={() =>
                                  openDirectChatWithUser(u.uid, u.storeName || u.name || u.email || 'User')
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-[10px] font-bold inline-flex items-center gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{lang === 'bn' ? 'মেসেজ' : 'SMS'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {isMainTarget ? (
                          <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5">
                            <Crown className="w-3.5 h-3.5" />
                            <span>
                              {lang === 'bn'
                                ? 'সুরক্ষিত মেইন সুপার এডমিন একাউন্ট'
                                : 'Protected Main Super Admin'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {canModifyTargetRole && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={roleIdx >= allowedList.length - 1}
                                  onClick={() => promoteOrDemoteUser(u, 1)}
                                  title={lang === 'bn' ? 'প্রমোট করুন' : 'Promote'}
                                  className="flex-1 h-9 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                  <span>{lang === 'bn' ? 'প্রমোট' : 'Promote'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={roleIdx <= 0}
                                  onClick={() => promoteOrDemoteUser(u, -1)}
                                  title={lang === 'bn' ? 'ডিমোট করুন' : 'Demote'}
                                  className="flex-1 h-9 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                  <span>{lang === 'bn' ? 'ডিমোট' : 'Demote'}</span>
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              {canModifyTargetRole ? (
                                <select
                                  value={currRole}
                                  onChange={(e) => changeUserRole(u, e.target.value as UserRole)}
                                  className="flex-1 h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-semibold"
                                >
                                  <option value="user">{getRoleLabel('user', null, lang)}</option>
                                  <option value="merchant">{getRoleLabel('merchant', null, lang)}</option>
                                  <option value="seller">{getRoleLabel('seller', null, lang)}</option>
                                  <option value="moderator">{getRoleLabel('moderator', null, lang)}</option>
                                  <option value="manager">{getRoleLabel('manager', null, lang)}</option>
                                  <option value="partner">{getRoleLabel('partner', null, lang)}</option>
                                  <option value="admin">{getRoleLabel('admin', null, lang)}</option>
                                  {isMainSuperAdmin && (
                                    <option value="super_admin">
                                      {getRoleLabel('super_admin', null, lang)}
                                    </option>
                                  )}
                                </select>
                              ) : (
                                <div className="flex-1 text-[11px] font-semibold text-rose-500">
                                  {lang === 'bn'
                                    ? 'সহকারী সুপার এডমিন (মেইন এডমিন নিয়ন্ত্রিত)'
                                    : 'Assistant Super Admin'}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  const nextState = u.isStoreActive === false;
                                  const ok = await confirm({
                                    title: lang === 'bn' ? 'স্টোর স্ট্যাটাস পরিবর্তন' : 'Toggle User Store?',
                                    message:
                                      lang === 'bn'
                                        ? `আপনি কি "${u.name || u.email}" এর স্টোরটি ${
                                            nextState ? 'অ্যাক্টিভ (চালু)' : 'বন্ধ (অফ)'
                                          } করতে চান?`
                                        : `Turn ${nextState ? 'ON' : 'OFF'} store for "${u.name || u.email}"?`,
                                    tone: 'warning',
                                  });
                                  if (!ok) return;
                                  await update(ref(db, `users/${u.uid}`), {
                                    isStoreActive: nextState,
                                  });
                                  onNotify(
                                    lang === 'bn' ? 'স্টোর স্ট্যাটাস আপডেট হয়েছে' : 'Store status toggled',
                                    'info'
                                  );
                                }}
                                className="h-9 px-2.5 rounded-lg bg-slate-100 dark:bg-emerald-950/70 text-xs font-semibold"
                              >
                                {u.isStoreActive === false
                                  ? lang === 'bn'
                                    ? 'স্টোর অফ'
                                    : 'Store Off'
                                  : lang === 'bn'
                                  ? 'স্টোর অন'
                                  : 'Store On'}
                              </button>

                              {(u.email || '').toLowerCase() !== MAIN_SUPER_ADMIN_EMAIL &&
                                u.uid !== userUid && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    title={
                                      isMainSuperAdmin
                                        ? lang === 'bn'
                                          ? 'ইউজার ডিলিট'
                                          : 'Delete User'
                                        : lang === 'bn'
                                        ? 'ডিলিট রিকোয়েস্ট পাঠান'
                                        : 'Request Delete'
                                    }
                                    className="h-9 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* TAB: REVIEWS */}
      {tab === 'reviews' && (
        <div className="space-y-2.5">
          {allReviewsList.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
              {lang === 'bn' ? 'কোনো রিভিউ পাওয়া যায়নি।' : 'No reviews found.'}
            </div>
          ) : (
            allReviewsList.map((r, i) => (
              <div
                key={`${r.houseId}-${r.reviewId}-${i}`}
                className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-xs text-slate-500">{r.houseTitle}</div>
                  <div className="font-semibold text-sm flex items-center gap-2 mt-0.5">
                    <span>{r.userName || 'Customer'}</span>
                    <span className="text-amber-500 inline-flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 fill-current" />
                      {r.rating}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.comment}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteReview(r.houseId, r.houseTitle, r.reviewId)}
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: SITE SETTINGS (MAIN & ASSISTANT SUPER ADMIN, CRITICAL LOCKED) */}
      {tab === 'site_settings' && isAnySuperAdmin && (
        <SiteSettingsControl
          siteSettings={siteSettings}
          isMainSuperAdmin={isMainSuperAdmin}
          lang={lang}
          onPreviewTheme={onPreviewTheme}
          onThemeSaved={onThemeSaved}
          onNotify={onNotify}
        />
      )}

      <OrderPrintModal
        order={printingOrder}
        houses={houses}
        siteSettings={siteSettings}
        lang={lang}
        onClose={() => setPrintingOrder(null)}
        onNotify={onNotify}
      />
    </div>
  );
};
