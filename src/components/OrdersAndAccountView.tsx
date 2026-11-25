import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Printer,
  RefreshCw,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import { auth, db, push, ref, update, updatePassword } from '../services/firebase';
import type {
  ControlTab,
  HouseItem,
  LangCode,
  OrderItem,
  SiteSettings,
  StoreRequest,
  UserProfile,
  UserRole,
} from '../types/marketplace';
import { formatBDT, formatDateShort, getSafeImage, isMainSuperAdminAccount } from '../utils/i18n';
import { uploadImageFile } from '../utils/imageUpload';
import { RoleAvatar, RoleBadge } from './RoleBadge';
import { useConfirm } from './ConfirmProvider';
import { OrderPrintModal } from './OrderPrintModal';

interface OrdersViewProps {
  orders: OrderItem[];
  houses: HouseItem[];
  siteSettings?: SiteSettings;
  currentUserUid?: string | null;
  lang: LangCode;
  onOpenProduct: (h: HouseItem) => void;
  onGoLogin: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  houses,
  siteSettings,
  currentUserUid,
  lang,
  onOpenProduct,
  onGoLogin,
  onNotify,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  if (!currentUserUid) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-8 space-y-4">
          <ShoppingBag className="w-12 h-12 mx-auto text-emerald-700 dark:text-amber-400 opacity-70" />
          <h2 className="font-display text-xl font-bold">
            {lang === 'bn' ? 'আপনার অর্ডার দেখতে লগইন করুন' : 'Sign in to view your orders'}
          </h2>
          <button
            type="button"
            onClick={onGoLogin}
            className="min-h-[44px] px-6 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold text-sm"
          >
            {lang === 'bn' ? 'লগইন করুন' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  const myOrders = orders.filter((o) => o.userId === currentUserUid);

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">
            {lang === 'bn' ? 'আমার অর্ডার ও কেনাকাটা' : 'My Orders & Purchases'}
          </h1>
          <p className="text-xs text-slate-500 font-mono-num">
            {myOrders.length} {lang === 'bn' ? 'টি অর্ডার' : 'orders'}
          </p>
        </div>
      </div>

      {myOrders.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 p-10 text-center text-sm text-slate-500">
          {lang === 'bn' ? 'আপনি এখনো কোনো অর্ডার করেননি।' : 'You have no orders yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.map((o) => {
            const product = o.houseId ? houses.find((h) => h.id === o.houseId) : undefined;
            const img =
              o.selectedVariation?.image ||
              o.productImage ||
              (product ? getSafeImage(product) : o.cartItems?.[0]?.image || '');
            const title =
              o.productTitle ||
              product?.data?.title ||
              (o.isCart ? `${o.cartItems?.length || 0} Cart Items` : 'Order');
            const isDelivered = o.status === 'Delivered';

            return (
              <div
                key={o.orderId}
                className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-[#071312] overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{title}</div>
                      {o.selectedVariation?.label && (
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-amber-300 mt-0.5">
                          {o.selectedVariation.label} · ×{o.quantity || 1}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isDelivered
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              : o.status === 'Cancelled'
                              ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {isDelivered ? (lang === 'bn' ? 'ডেলিভারি সম্পন্ন ✅' : 'Delivered ✅') : o.status}
                        </span>
                        <span>·</span>
                        <span>{o.paymentMethod}</span>
                        <span>·</span>
                        <span>{formatDateShort(o.createdAt, lang)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-display font-bold text-base text-emerald-800 dark:text-amber-400 tabular-nums">
                      {formatBDT(o.totalPrice)}
                    </div>
                    {product && (
                      <button
                        type="button"
                        onClick={() => onOpenProduct(product)}
                        className="min-h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-emerald-950/70 text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'দেখুন' : 'View'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-emerald-900 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'রসিদ' : 'Receipt'}</span>
                    </button>
                  </div>
                </div>

                {(o.offerTargetNumber || isDelivered) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-900/60 text-xs">
                    {o.offerTargetNumber && (
                      <div className="font-mono-num font-bold text-sky-800 dark:text-sky-300">
                        {lang === 'bn' ? 'অফার নাম্বার:' : 'Offer Number:'} {o.offerTargetNumber}
                      </div>
                    )}
                    {isDelivered && (
                      <div className="text-emerald-800 dark:text-emerald-300 font-medium inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {lang === 'bn'
                            ? 'আপনার অর্ডার সফলভাবে ডেলিভারি হয়েছে ✅ (সংরক্ষিত রেকর্ড)'
                            : 'Order delivered successfully ✅ (Permanent record)'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <OrderPrintModal
        order={selectedOrder}
        houses={houses}
        siteSettings={siteSettings || { appName: 'Amader Market' }}
        lang={lang}
        onClose={() => setSelectedOrder(null)}
        onNotify={(m, t) => onNotify?.(m, t)}
      />
    </div>
  );
};

interface AccountViewProps {
  userEmail: string;
  userUid: string;
  role: UserRole;
  userProfile: UserProfile | null;
  siteSettings: SiteSettings;
  storeRequests?: StoreRequest[];
  lang: LangCode;
  cachedProductsCount: number;
  cachedImagesCount: number;
  lastSyncAt?: number;
  onForceSync: () => void;
  onClearCache: () => void;
  onLogout: () => void;
  onOpenControl: () => void;
  onOpenControlOrders?: () => void;
  onOpenControlInbox?: () => void;
  onOpenControlTab?: (tab: ControlTab) => void;
  unseenSellerOrdersCount?: number;
  unreadInboxCount?: number;
  pendingApprovalsCount?: number;
  pendingWithdrawalsCount?: number;
  unseenReviewsCount?: number;
  unseenUsersCount?: number;
  unseenProductUpdatesCount?: number;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  userEmail,
  userUid,
  role,
  userProfile,
  siteSettings,
  storeRequests = [],
  lang,
  cachedProductsCount,
  cachedImagesCount,
  lastSyncAt,
  onForceSync,
  onClearCache,
  onLogout,
  onOpenControl,
  onOpenControlOrders,
  onOpenControlInbox,
  onOpenControlTab,
  unseenSellerOrdersCount = 0,
  unreadInboxCount = 0,
  pendingApprovalsCount = 0,
  pendingWithdrawalsCount = 0,
  unseenReviewsCount = 0,
  unseenUsersCount = 0,
  unseenProductUpdatesCount = 0,
  onNotify,
}) => {
  const confirm = useConfirm();
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [profilePic, setProfilePic] = useState(userProfile?.profilePic || '');
  const [storeName, setStoreName] = useState(userProfile?.storeName || '');
  const [storeLogo, setStoreLogo] = useState(userProfile?.storeLogo || '');
  const [newPass, setNewPass] = useState('');
  const [storePayMethod, setStorePayMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [storePayTrx, setStorePayTrx] = useState('');
  const [storePaySender, setStorePaySender] = useState('');
  const [uploadingPic, setUploadingPic] = useState<'profile' | 'store' | null>(null);
  const [copiedStoreNum, setCopiedStoreNum] = useState(false);

  const handleAccountImgUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'profile' | 'store'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(target);
    try {
      const res = await uploadImageFile(file, siteSettings.imgbbApiKey);
      if (target === 'profile') setProfilePic(res.url);
      else setStoreLogo(res.url);
      onNotify(lang === 'bn' ? 'ছবি আপলোড সম্পন্ন!' : 'Image uploaded!', 'success');
    } catch {
      onNotify(lang === 'bn' ? 'ছবি আপলোড ব্যর্থ হয়েছে।' : 'Upload failed.', 'error');
    } finally {
      setUploadingPic(null);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: lang === 'bn' ? 'প্রোফাইল আপডেট করবেন?' : 'Update Profile?',
      message:
        lang === 'bn'
          ? 'আপনি কি প্রোফাইল ও স্টোরের তথ্য সেভ করতে চান?'
          : 'Are you sure you want to save your profile and store info?',
      tone: 'primary',
    });
    if (!ok) return;
    await update(ref(db, `users/${userUid}`), {
      name: name.trim(),
      phone: phone.trim(),
      profilePic: profilePic.trim(),
      storeName: storeName.trim(),
      storeLogo: storeLogo.trim(),
    });
    onNotify(lang === 'bn' ? 'প্রোফাইল আপডেট হয়েছে!' : 'Profile updated!', 'success');
  };

  const handlePassChange = async () => {
    if (newPass.length < 6 || !auth.currentUser) {
      onNotify(lang === 'bn' ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।' : 'Minimum 6 characters required.', 'error');
      return;
    }
    const ok = await confirm({
      title: lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন?' : 'Change Password?',
      message:
        lang === 'bn'
          ? 'আপনি কি সত্যিই আপনার একাউন্টের পাসওয়ার্ড পরিবর্তন করতে চান?'
          : 'Are you sure you want to change your account password?',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      await updatePassword(auth.currentUser, newPass);
      setNewPass('');
      onNotify(lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন সফল!' : 'Password changed!', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update password', 'error');
    }
  };

  const isMainSA = isMainSuperAdminAccount(userEmail);
  const storeFee = Number(siteSettings.storeActivationFee) || 0;
  const storeBkashNum = siteSettings.storeBkash || siteSettings.advanceBkash || '';
  const storeBkashType = siteSettings.storeBkashType || siteSettings.advanceBkashType || 'Personal';
  const storeNagadNum = siteSettings.storeNagad || siteSettings.advanceNagad || '';
  const storeNagadType = siteSettings.storeNagadType || siteSettings.advanceNagadType || 'Personal';
  const activeStorePayNum = storePayMethod === 'bKash' ? storeBkashNum : storeNagadNum;
  const activeStorePayType = storePayMethod === 'bKash' ? storeBkashType : storeNagadType;
  const pendingStoreReq = storeRequests.find(
    (r) => r.uid === userUid && r.status === 'Pending'
  );

  const handleStoreRequest = async () => {
    if (!storeName.trim()) {
      onNotify(lang === 'bn' ? 'আপনার স্টোরের নাম লিখুন।' : 'Enter your store name.', 'error');
      return;
    }
    if (storeFee > 0 && (!storePaySender.trim() || !storePayTrx.trim())) {
      onNotify(
        lang === 'bn'
          ? 'পেমেন্ট করার পর সেন্ডার নাম্বার এবং TrxID সঠিকভাবে দিন।'
          : 'Please enter Sender Number and TrxID.',
        'error'
      );
      return;
    }
    const ok = await confirm({
      title: lang === 'bn' ? 'স্টোর অ্যাক্টিভেশন রিকোয়েস্ট' : 'Submit Store Activation?',
      message:
        lang === 'bn'
          ? `"${storeName.trim()}" স্টোর অ্যাক্টিভেশন রিকোয়েস্ট মেইন সুপার এডমিনের কাছে পাঠাতে চান?`
          : `Submit store activation request for "${storeName.trim()}"?`,
      detail: storePayTrx.trim() ? `TrxID: ${storePayTrx.trim()}` : undefined,
      tone: 'primary',
    });
    if (!ok) return;
    await push(ref(db, 'store_requests'), {
      uid: userUid,
      userName: name || userEmail,
      storeName: storeName.trim(),
      storeLogo: storeLogo.trim(),
      phone,
      method: storePayMethod,
      trxId: storePayTrx.trim(),
      senderNumber: storePaySender.trim(),
      amount: storeFee,
      status: 'Pending',
      timestamp: Date.now(),
    });
    setStorePayTrx('');
    setStorePaySender('');
    onNotify(
      lang === 'bn'
        ? 'স্টোর অ্যাক্টিভেশন রিকোয়েস্ট পাঠানো হয়েছে! মেইন সুপার এডমিন যাচাই করে অ্যাক্টিভ করবেন।'
        : 'Store activation request submitted!',
      'success'
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-5 space-y-6">
      <div className="rounded-2xl bg-[#043934] text-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <RoleAvatar
            name={name}
            email={userEmail}
            profilePic={profilePic}
            role={role}
            sizeClass="w-16 h-16"
          />
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-xl font-bold truncate">{name || userEmail}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={role} email={userEmail} lang={lang} size="sm" />
              <span className="text-xs text-teal-100/80 truncate">{userEmail}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenControl}
            className="min-h-[42px] px-4 rounded-xl bg-amber-400 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span>{lang === 'bn' ? 'কন্ট্রোল প্যানেল' : 'Open Control Panel'}</span>
            {unseenSellerOrdersCount +
              unreadInboxCount +
              pendingApprovalsCount +
              pendingWithdrawalsCount +
              unseenReviewsCount +
              unseenUsersCount +
              unseenProductUpdatesCount >
              0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold flex items-center justify-center">
                {unseenSellerOrdersCount +
                  unreadInboxCount +
                  pendingApprovalsCount +
                  pendingWithdrawalsCount +
                  unseenReviewsCount +
                  unseenUsersCount +
                  unseenProductUpdatesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* Live Multi-Section Notifications for Every User/Merchant/Admin */}
      {unseenSellerOrdersCount +
        unreadInboxCount +
        pendingApprovalsCount +
        pendingWithdrawalsCount +
        unseenReviewsCount +
        unseenUsersCount +
        unseenProductUpdatesCount >
        0 && (
        <section className="rounded-2xl bg-rose-50 dark:bg-rose-950/25 border border-rose-300/80 dark:border-rose-800/60 p-4 space-y-3">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-rose-800 dark:text-rose-300">
            <Bell className="w-4 h-4 shrink-0" />
            <span>
              {lang === 'bn'
                ? 'প্রত্যেক সেকশনের নতুন নোটিফিকেশন!'
                : 'New Live Notifications Across Sections!'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {unseenSellerOrdersCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOpenControlTab
                    ? onOpenControlTab('orders')
                    : onOpenControlOrders
                    ? onOpenControlOrders()
                    : onOpenControl()
                }
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-rose-200 dark:border-rose-900 text-left hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {lang === 'bn'
                        ? `${unseenSellerOrdersCount}টি নতুন অর্ডার এসেছে`
                        : `${unseenSellerOrdersCount} New Order(s)`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lang === 'bn' ? 'অর্ডার সেকশন খুলুন' : 'Open Orders'}
                    </div>
                  </div>
                </div>
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0">
                  {unseenSellerOrdersCount}
                </span>
              </button>
            )}
            {unreadInboxCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOpenControlTab
                    ? onOpenControlTab('inbox')
                    : onOpenControlInbox
                    ? onOpenControlInbox()
                    : onOpenControl()
                }
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-rose-200 dark:border-rose-900 text-left hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-700 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {lang === 'bn'
                        ? `${unreadInboxCount}টি নতুন এসএমএস এসেছে`
                        : `${unreadInboxCount} Unread Message(s)`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lang === 'bn' ? 'ইনবক্সে রিপ্লাই দিন' : 'Open Inbox'}
                    </div>
                  </div>
                </div>
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0">
                  {unreadInboxCount}
                </span>
              </button>
            )}
            {pendingApprovalsCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOpenControlTab ? onOpenControlTab('approvals') : onOpenControl()
                }
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-rose-200 dark:border-rose-900 text-left hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {lang === 'bn'
                        ? `${pendingApprovalsCount}টি অ্যাপ্রুভাল / রিকোয়েস্ট`
                        : `${pendingApprovalsCount} Pending Approval(s)`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lang === 'bn' ? 'অ্যাপ্রুভাল ট্যাবে যান' : 'Open Approvals'}
                    </div>
                  </div>
                </div>
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0">
                  {pendingApprovalsCount}
                </span>
              </button>
            )}
            {pendingWithdrawalsCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOpenControlTab ? onOpenControlTab('wallet') : onOpenControl()
                }
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-rose-200 dark:border-rose-900 text-left hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {lang === 'bn'
                        ? `${pendingWithdrawalsCount}টি ওয়ালেট / উইথড্র`
                        : `${pendingWithdrawalsCount} Wallet Notification(s)`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lang === 'bn' ? 'ওয়ালেট সেকশন খুলুন' : 'Open Wallet'}
                    </div>
                  </div>
                </div>
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0">
                  {pendingWithdrawalsCount}
                </span>
              </button>
            )}
            {unseenReviewsCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOpenControlTab ? onOpenControlTab('reviews') : onOpenControl()
                }
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-rose-200 dark:border-rose-900 text-left hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {lang === 'bn'
                        ? `${unseenReviewsCount}টি নতুন রিভিউ এসেছে`
                        : `${unseenReviewsCount} New Review(s)`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lang === 'bn' ? 'রিভিউ ট্যাবে যান' : 'Open Reviews'}
                    </div>
                  </div>
                </div>
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0">
                  {unseenReviewsCount}
                </span>
              </button>
            )}
            {unseenUsersCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOpenControlTab ? onOpenControlTab('users') : onOpenControl()
                }
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-rose-200 dark:border-rose-900 text-left hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {lang === 'bn'
                        ? `${unseenUsersCount}জন নতুন ইউজার`
                        : `${unseenUsersCount} New User(s)`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lang === 'bn' ? 'ইউজার ট্যাবে যান' : 'Open Users'}
                    </div>
                  </div>
                </div>
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0">
                  {unseenUsersCount}
                </span>
              </button>
            )}
            {unseenProductUpdatesCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOpenControlTab ? onOpenControlTab('products') : onOpenControl()
                }
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0d1f1d] border border-rose-200 dark:border-rose-900 text-left hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {lang === 'bn'
                        ? `${unseenProductUpdatesCount}টি প্রোডাক্ট আপডেট`
                        : `${unseenProductUpdatesCount} Product Update(s)`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lang === 'bn' ? 'প্রোডাক্টস ট্যাবে যান' : 'Open Products'}
                    </div>
                  </div>
                </div>
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0">
                  {unseenProductUpdatesCount}
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Offline Cache Manager Card */}
      <section className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-display font-bold text-base">
            <Database className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span>{lang === 'bn' ? 'অফলাইন ক্যাশ ও স্পিড স্ট্যাটাস' : 'Offline Cache & Sync'}</span>
          </div>
          {lastSyncAt && (
            <span className="text-xs text-slate-500 inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDateShort(lastSyncAt, lang)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071312]">
            <div className="text-xs text-slate-500">{lang === 'bn' ? 'ক্যাশড প্রোডাক্ট' : 'Cached Products'}</div>
            <div className="font-display font-bold text-lg font-mono-num">{cachedProductsCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071312]">
            <div className="text-xs text-slate-500">{lang === 'bn' ? 'ক্যাশড ছবি' : 'Cached Images'}</div>
            <div className="font-display font-bold text-lg font-mono-num">{cachedImagesCount}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onForceSync}
            className="min-h-[40px] px-4 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সব ডাটা পুনরায় সিঙ্ক করুন' : 'Force Sync Now'}</span>
          </button>
          <button
            type="button"
            onClick={onClearCache}
            className="min-h-[40px] px-4 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ক্যাশ ক্লিয়ার করুন' : 'Clear Cache'}</span>
          </button>
        </div>
      </section>

      {/* Profile & Store Settings */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 space-y-4"
      >
        <h2 className="font-display text-lg font-bold">
          {lang === 'bn' ? 'প্রোফাইল ও স্টোর তথ্য' : 'Profile & Store Info'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1">{lang === 'bn' ? 'নাম' : 'Name'}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">{lang === 'bn' ? 'মোবাইল' : 'Phone'}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'প্রোফাইল ছবি (লিংক বা আপলোড)' : 'Profile Picture (URL or Upload)'}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={profilePic}
                onChange={(e) => setProfilePic(e.target.value)}
                placeholder="https://..."
                className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              />
              <label className="h-10 px-3 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0">
                {uploadingPic === 'profile' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{lang === 'bn' ? 'আপলোড' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAccountImgUpload(e, 'profile')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'স্টোরের নাম' : 'Store Name'}
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'স্টোর লোগো (লিংক বা আপলোড)' : 'Store Logo (URL or Upload)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={storeLogo}
                onChange={(e) => setStoreLogo(e.target.value)}
                placeholder="https://..."
                className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              />
              <label className="h-10 px-3 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0">
                {uploadingPic === 'store' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{lang === 'bn' ? 'আপলোড' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAccountImgUpload(e, 'store')}
                  className="hidden"
                />
              </label>
              {storeLogo && (
                <img
                  src={storeLogo}
                  alt="Store Logo"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-emerald-900 shrink-0"
                />
              )}
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="min-h-[42px] px-5 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{lang === 'bn' ? 'প্রোফাইল সেভ করুন' : 'Save Profile'}</span>
        </button>
      </form>

      {/* Store Activation Request + Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {siteSettings.enableDedicatedStore !== false && (
          <div className="bg-white dark:bg-[#0d1f1d] border border-amber-300/70 dark:border-amber-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-display font-bold text-base">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-emerald-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div>{lang === 'bn' ? 'নিজস্ব স্টোর অ্যাক্টিভেশন' : 'Store Activation'}</div>
                  <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {lang === 'bn'
                      ? 'সহজ ৩ ধাপে আপনার নিজস্ব ব্র্যান্ডেড স্টোর চালু করুন'
                      : 'Launch your dedicated store in 3 quick steps'}
                  </div>
                </div>
              </div>
              {isMainSA || userProfile?.isStoreActive ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                  {lang === 'bn' ? 'সক্রিয় ✅' : 'Active ✅'}
                </span>
              ) : pendingStoreReq ? (
                <span className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[11px] font-bold shrink-0">
                  {lang === 'bn' ? 'অপেক্ষমান ⏳' : 'Pending ⏳'}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold shrink-0">
                  {lang === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
                </span>
              )}
            </div>

            {isMainSA || userProfile?.isStoreActive ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {userProfile?.storeName
                      ? `${userProfile.storeName} — ${lang === 'bn' ? 'অ্যাক্টিভ রয়েছে' : 'Store Active'}`
                      : lang === 'bn'
                      ? 'আপনার নিজস্ব ডেডিকেটেড স্টোর সক্রিয় রয়েছে!'
                      : 'Your dedicated store is live!'}
                  </span>
                </div>
                <p className="opacity-85">
                  {lang === 'bn'
                    ? 'আপনার প্রকাশিত সব প্রোডাক্ট ও অফার সরাসরি আপনার স্টোরের নামে কাস্টমাররা দেখতে ও অর্ডার করতে পারছেন।'
                    : 'All your approved posts are showcased under your branded store page.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {pendingStoreReq && (
                  <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/35 border border-sky-300/70 dark:border-sky-800/60 space-y-1 text-xs text-sky-900 dark:text-sky-100">
                    <div className="font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-600 dark:text-sky-300 shrink-0" />
                      <span>
                        {lang === 'bn'
                          ? 'আপনার স্টোর অ্যাক্টিভেশন আবেদন রিভিউ হচ্ছে'
                          : 'Activation Request Under Review'}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-90">
                      {lang === 'bn' ? 'স্টোর:' : 'Store:'} <strong>{pendingStoreReq.storeName}</strong>
                      {pendingStoreReq.method ? ` · ${pendingStoreReq.method}` : ''}
                      {pendingStoreReq.trxId ? ` · TrxID: ${pendingStoreReq.trxId}` : ''}
                    </div>
                  </div>
                )}

                {/* Step 1: Fee & One-Tap Payment Number */}
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-300/70 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono-num text-[11px] font-extrabold inline-flex items-center justify-center">
                        1
                      </span>
                      <span>
                        {storeFee > 0
                          ? lang === 'bn'
                            ? 'অ্যাক্টিভেশন ফি পেমেন্ট করুন'
                            : 'Pay Activation Fee'
                          : lang === 'bn'
                          ? 'ফ্রি স্টোর অ্যাক্টিভেশন (কোনো ফি নেই)'
                          : 'Free Store Activation'}
                      </span>
                    </span>
                    <span className="font-mono-num font-extrabold text-sm text-emerald-800 dark:text-amber-300">
                      {storeFee > 0 ? formatBDT(storeFee) : lang === 'bn' ? 'ফ্রি' : 'FREE'}
                    </span>
                  </div>

                  {storeFee > 0 && (storeBkashNum || storeNagadNum) && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {(['bKash', 'Nagad'] as const).map((prov) => (
                          <button
                            key={prov}
                            type="button"
                            onClick={() => {
                              setStorePayMethod(prov);
                              setCopiedStoreNum(false);
                            }}
                            className={`h-9 rounded-lg text-xs font-bold border transition-colors ${
                              storePayMethod === prov
                                ? 'bg-emerald-800 text-white border-emerald-800 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500'
                                : 'bg-white dark:bg-[#071312] border-slate-200 dark:border-emerald-900'
                            }`}
                          >
                            {prov}
                          </button>
                        ))}
                      </div>

                      {activeStorePayNum ? (
                        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#071312] border border-amber-200 dark:border-emerald-900">
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">
                              {lang === 'bn' ? 'মেইন সুপার এডমিন' : 'Main Admin'} · {storePayMethod} ({activeStorePayType})
                            </div>
                            <div className="font-mono-num font-bold text-base text-emerald-800 dark:text-amber-300 tracking-wide">
                              {activeStorePayNum}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(activeStorePayNum);
                              setCopiedStoreNum(true);
                              setTimeout(() => setCopiedStoreNum(false), 2500);
                              onNotify(
                                lang === 'bn'
                                  ? `নাম্বার কপি হয়েছে: ${activeStorePayNum}`
                                  : 'Payment number copied!',
                                'success'
                              );
                            }}
                            className={`min-h-[36px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                              copiedStoreNum
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950'
                            }`}
                          >
                            {copiedStoreNum ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{lang === 'bn' ? 'নাম্বার কপি' : 'Copy'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 italic">
                          {lang === 'bn'
                            ? `${storePayMethod} নাম্বার সেট করা নেই, অন্য পেমেন্ট মেথড বেছে নিন।`
                            : `${storePayMethod} number not set.`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 2: Store Details & Logo */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-950 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 font-mono-num text-[11px] font-extrabold inline-flex items-center justify-center">
                      2
                    </span>
                    <span>
                      {lang === 'bn' ? 'স্টোর ও পেমেন্ট তথ্য দিন' : 'Enter Store & Payment Info'}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder={lang === 'bn' ? 'আপনার স্টোরের নাম লিখুন *' : 'Your Store Name *'}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-sm"
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={storeLogo}
                      onChange={(e) => setStoreLogo(e.target.value)}
                      placeholder={lang === 'bn' ? 'স্টোর লোগো URL (ঐচ্ছিক)' : 'Store Logo URL (Optional)'}
                      className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-xs"
                    />
                    <label className="h-10 px-3 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                      {uploadingPic === 'store' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{lang === 'bn' ? 'লোগো' : 'Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAccountImgUpload(e, 'store')}
                        className="hidden"
                      />
                    </label>
                    {storeLogo && (
                      <img
                        src={storeLogo}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-emerald-900 shrink-0"
                      />
                    )}
                  </div>

                  {storeFee > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={storePaySender}
                        onChange={(e) => setStorePaySender(e.target.value)}
                        placeholder={lang === 'bn' ? 'সেন্ডার নাম্বার *' : 'Sender Number *'}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                      />
                      <input
                        type="text"
                        value={storePayTrx}
                        onChange={(e) => setStorePayTrx(e.target.value)}
                        placeholder={lang === 'bn' ? 'ট্রানজেকশন আইডি (TrxID) *' : 'Transaction ID *'}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#0b1b19] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                      />
                    </div>
                  )}
                </div>

                {/* Step 3: Submit CTA */}
                <button
                  type="button"
                  onClick={handleStoreRequest}
                  className="w-full min-h-[44px] rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {pendingStoreReq
                      ? lang === 'bn'
                        ? 'তথ্য আপডেট করে পুনরায় পাঠান'
                        : 'Resubmit Store Request'
                      : lang === 'bn'
                      ? 'স্টোর অ্যাক্টিভেশন আবেদন পাঠান'
                      : 'Submit Store Activation'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 space-y-3">
          <h3 className="font-display font-bold text-base">
            {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
          </h3>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New password (min 6 chars)'}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
          />
          <button
            type="button"
            onClick={handlePassChange}
            className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-emerald-900 text-xs font-semibold"
          >
            {lang === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
};
