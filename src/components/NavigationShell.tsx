import React, { useEffect, useState } from 'react';
import {
  Download,
  ExternalLink,
  Heart,
  Home,
  Languages,
  LayoutGrid,
  LogIn,
  Menu,
  MessageCircle,
  Moon,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Sun,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { AppView, LangCode, SiteSettings, ThemeMode, UserProfile, UserRole } from '../types/marketplace';
import {
  getCurrentAppBaseUrl,
  getCurrentDisplayHost,
  getRoleLabel,
  openExternalUrl,
  shareMarketplaceUrl,
  tr,
} from '../utils/i18n';
import { RoleAvatar, RoleBadge } from './RoleBadge';
import { FloatingWhatsappButton, SiteFooter } from './SiteFooter';

interface NavigationShellProps {
  children: React.ReactNode;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  lang: LangCode;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: (next?: 'light' | 'dark') => void;
  siteSettings: SiteSettings;
  userEmail?: string | null;
  userProfile?: UserProfile | null;
  role: UserRole;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAdminChat: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  isOnline: boolean;
  lastSyncAt?: number;
  cachedCount: number;
  isSyncing: boolean;
  onForceSync: () => void;
  ordersBadgeCount?: number;
  controlBadgeCount?: number;
  accountBadgeCount?: number;
  isMainSuperAdmin?: boolean;
  onOpenFooterSettings?: () => void;
}

export const NavigationShell: React.FC<NavigationShellProps> = ({
  children,
  activeView,
  onNavigate,
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  siteSettings,
  userEmail,
  userProfile,
  role,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenAdminChat,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  isOnline,
  lastSyncAt,
  cachedCount,
  isSyncing,
  onForceSync,
  ordersBadgeCount = 0,
  controlBadgeCount = 0,
  accountBadgeCount = 0,
  isMainSuperAdmin = false,
  onOpenFooterSettings,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    const isTextField = (el: EventTarget | null): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const t = (el as HTMLInputElement).type.toLowerCase();
        return !['checkbox', 'radio', 'file', 'range', 'color', 'button', 'submit', 'reset'].includes(t);
      }
      return false;
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target)) {
        setIsKeyboardOpen(true);
        const target = e.target;
        setTimeout(() => {
          try {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
          } catch {
            // ignore
          }
        }, 200);
      }
    };

    const onFocusOut = () => {
      setTimeout(() => {
        if (!isTextField(document.activeElement)) {
          setIsKeyboardOpen(false);
        }
      }, 120);
    };

    const baselineHeight = window.innerHeight;
    const onViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      if (vv.height < baselineHeight * 0.78) {
        setIsKeyboardOpen(true);
      } else if (!isTextField(document.activeElement)) {
        setIsKeyboardOpen(false);
      }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', onViewportResize);

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, []);

  useEffect(() => {
    const w = window as unknown as { __amaderCloseShellOverlay?: () => boolean };
    w.__amaderCloseShellOverlay = () => {
      if (showIOSGuide) {
        setShowIOSGuide(false);
        return true;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (mobileSearchOpen) {
        setMobileSearchOpen(false);
        return true;
      }
      return false;
    };
    return () => {
      delete w.__amaderCloseShellOverlay;
    };
  }, [drawerOpen, mobileSearchOpen, showIOSGuide]);

  const categories = siteSettings.categories || [];

  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: tr(lang, 'home'), icon: <Home className="w-5 h-5" /> },
    { id: 'shop', label: tr(lang, 'shop'), icon: <Store className="w-5 h-5" /> },
    { id: 'orders', label: tr(lang, 'orders'), icon: <ShoppingBag className="w-5 h-5" />, badge: ordersBadgeCount },
    { id: 'control', label: tr(lang, 'control'), icon: <SlidersHorizontal className="w-5 h-5" />, badge: controlBadgeCount },
    {
      id: userEmail ? 'account' : 'auth',
      label: userEmail ? tr(lang, 'account') : tr(lang, 'login'),
      icon: <User className="w-5 h-5" />,
      badge: 0,
    },
  ];

  const handleCategoryPick = (cat: string) => {
    onSelectCategory(cat);
    onNavigate('shop');
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f6f8f7] dark:bg-[#071312] text-slate-900 dark:text-slate-100">
      {/* Desktop Left Navigation Rail */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-[#0b1b19] border-r border-slate-200 dark:border-emerald-950 z-30">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200/80 dark:border-emerald-950">
          <img
            src="/pwa-192x192.png"
            alt="Amader Market"
            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-amber-500/30"
          />
          <div className="min-w-0">
            <div className="font-display font-bold text-base tracking-tight text-emerald-950 dark:text-amber-300 truncate">
              {siteSettings.appName || 'Amader Market'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {getCurrentDisplayHost()}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = activeView === item.id;
            const badge = item.badge || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-800 text-white dark:bg-amber-500 dark:text-slate-950 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/60'
                }`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {badge > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onNavigate('wishlist')}
            className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === 'wishlist'
                ? 'bg-emerald-800 text-white dark:bg-amber-500 dark:text-slate-950 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/60'
            }`}
          >
            <span className="flex items-center gap-3">
              <Heart className="w-5 h-5" />
              <span>{tr(lang, 'wishlist')}</span>
            </span>
            {wishlistCount > 0 && (
              <span className="font-mono-num text-xs opacity-80">{wishlistCount}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenAdminChat}
            className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/60 transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{tr(lang, 'chat_admin')}</span>
          </button>

          <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-emerald-950">
            <div className="px-3.5 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              {lang === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleCategoryPick('')}
                className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-medium transition-colors truncate ${
                  selectedCategory === '' && activeView === 'shop'
                    ? 'text-emerald-800 dark:text-amber-300 bg-emerald-50 dark:bg-emerald-950/70'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-emerald-950/40'
                }`}
              >
                {tr(lang, 'all_products')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryPick(cat)}
                  className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-medium transition-colors truncate ${
                    selectedCategory === cat
                      ? 'text-emerald-800 dark:text-amber-300 bg-emerald-50 dark:bg-emerald-950/70'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-3.5 border-t border-slate-200/80 dark:border-emerald-950 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
            <span>
              {isOnline ? (lang === 'bn' ? 'ক্যাশ সক্রিয়' : 'Cached') : tr(lang, 'offline_banner')} ·{' '}
              <span className="font-mono-num">{cachedCount}</span>
            </span>
            <button
              type="button"
              onClick={onForceSync}
              disabled={isSyncing || !isOnline}
              className="inline-flex items-center gap-1 text-emerald-700 dark:text-amber-400 font-semibold hover:underline disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{lang === 'bn' ? 'সিঙ্ক' : 'Sync'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 grid grid-cols-2 p-0.5 rounded-xl border border-slate-200 dark:border-emerald-900 bg-slate-50 dark:bg-[#071312]">
              <button
                type="button"
                onClick={() => onToggleTheme('light')}
                className={`min-h-[36px] flex items-center justify-center gap-1 rounded-lg text-[11px] font-bold transition-colors ${
                  theme === 'light'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লাইট' : 'Light'}</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme('dark')}
                className={`min-h-[36px] flex items-center justify-center gap-1 rounded-lg text-[11px] font-bold transition-colors ${
                  theme !== 'light'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ডার্ক' : 'Dark'}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onToggleLang}
              className="px-3 min-h-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-900 hover:bg-slate-100 dark:hover:bg-emerald-950/60 font-semibold shrink-0"
            >
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>
          </div>

          {!isInstalled && (isInstallable || isIOS) && (
            <button
              type="button"
              onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
              className="w-full min-h-[42px] flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold"
            >
              <Download className="w-4 h-4" />
              <span>{tr(lang, 'install_app')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top App Bar (3-zone contract on desktop, compact 54px on mobile + safe-area top) */}
        <header className="sticky top-0 z-30 pt-safe bg-white/95 dark:bg-[#0b1b19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-emerald-950">
          <div className="h-[54px] lg:h-16 px-3 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <button
              type="button"
              aria-label="Open Menu"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden min-w-[40px] min-h-[40px] -ml-1 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
            >
              <img
                src="/pwa-192x192.png"
                alt="Amader Market"
                className="lg:hidden w-8 h-8 rounded-lg object-cover border border-amber-500/30"
              />
              <span className="font-display font-bold text-base sm:text-lg tracking-tight text-emerald-950 dark:text-amber-300 whitespace-nowrap">
                {siteSettings.appName || 'Amader Market'}
              </span>
            </button>
          </div>

          {/* Zone 2: Desktop Search Input */}
          <div className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeView !== 'shop' && activeView !== 'home') {
                    onNavigate('shop');
                  }
                }}
                placeholder={tr(lang, 'search_ph')}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 dark:focus:border-amber-400"
              />
            </div>
          </div>

          {/* Zone 3: Single Primary Action Cluster (1-Click Lang + Search on mobile + Cart + Control/Login) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleLang}
              aria-label="Switch Language"
              title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
              className="min-h-[38px] px-2.5 flex items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-emerald-900 text-xs font-bold transition-colors whitespace-nowrap"
            >
              <Languages className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
            </button>

            <button
              type="button"
              aria-label="Search"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Open Cart"
              className="relative min-w-[40px] min-h-[40px] px-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/70 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-emerald-900 transition-colors whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="font-mono-num text-xs font-bold">{cartCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(userEmail ? 'control' : 'auth')}
              className="hidden sm:inline-flex min-h-[40px] px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              {userEmail ? (
                <>
                  <Settings className="w-3.5 h-3.5" />
                  <span>{role !== 'user' && role !== 'guest' ? getRoleLabel(role, userEmail, lang) : tr(lang, 'control')}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{tr(lang, 'login')}</span>
                </>
              )}
            </button>
          </div>
          </div>
        </header>

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden bg-white dark:bg-[#0b1b19] border-b border-slate-200 dark:border-emerald-950 px-3 py-2.5">
            <div className="relative flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeView !== 'shop' && activeView !== 'home') {
                    onNavigate('shop');
                  }
                }}
                placeholder={tr(lang, 'search_ph')}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm focus:outline-none focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Honest Offline Status Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span className="truncate">{tr(lang, 'offline_banner')}</span>
            </div>
            {lastSyncAt && (
              <span className="font-mono-num text-[11px] opacity-90 shrink-0">
                {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {/* Notice Ticker from Website Settings */}
        {siteSettings.noticeActive && siteSettings.noticeText && (
          <div className="bg-emerald-900 dark:bg-[#0b2522] text-amber-200 text-xs py-1.5 overflow-hidden border-b border-emerald-800/40">
            <div className="animate-marquee">
              <span className="mx-8">{siteSettings.noticeText}</span>
              <span className="mx-8">{siteSettings.noticeText}</span>
              <span className="mx-8">{siteSettings.noticeText}</span>
            </div>
          </div>
        )}

        {/* Main Scrollable Viewport + Theme-Aware Site Footer */}
        <main className={`flex-1 flex flex-col ${isKeyboardOpen ? 'pb-4' : 'pb-[58px] lg:pb-0'}`}>
          <div className="flex-1">{children}</div>
          <SiteFooter
            siteSettings={siteSettings}
            lang={lang}
            isMainSuperAdmin={isMainSuperAdmin}
            onOpenAdminChat={onOpenAdminChat}
            onEditFooter={onOpenFooterSettings}
          />
        </main>
        <FloatingWhatsappButton
          siteSettings={siteSettings}
          lang={lang}
          isKeyboardOpen={isKeyboardOpen}
          onFallbackChat={onOpenAdminChat}
        />
      </div>

      {/* Mobile Bottom Navigation Bar (Auto-hides smoothly while typing on keyboard) */}
      {!isKeyboardOpen && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0b1b19]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-emerald-950 pb-safe">
          <div className="grid grid-cols-5 h-[58px] items-center">
            {navItems.map((item) => {
              const active = activeView === item.id;
              const badge = item.badge || 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex flex-col items-center justify-center min-h-[48px] transition-colors ${
                    active
                      ? 'text-emerald-800 dark:text-amber-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="relative inline-flex">
                    {item.icon}
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white font-mono-num text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Mobile Slide-Over Menu Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[86vw] bg-white dark:bg-[#0b1b19] h-full flex flex-col shadow-2xl z-10 overflow-y-auto pt-safe pb-safe">
            <div className="p-4 border-b border-slate-200 dark:border-emerald-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {userEmail ? (
                  <RoleAvatar
                    name={userProfile?.name}
                    email={userEmail}
                    profilePic={userProfile?.profilePic || userProfile?.storeLogo}
                    role={role}
                    sizeClass="w-11 h-11"
                  />
                ) : (
                  <img
                    src="/pwa-192x192.png"
                    alt="Amader Market"
                    className="w-11 h-11 rounded-xl object-cover border border-amber-500/30 shrink-0"
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <div className="font-display font-bold text-sm text-emerald-950 dark:text-amber-300 truncate">
                    {userProfile?.name || userEmail || siteSettings.appName || 'Amader Market'}
                  </div>
                  {userEmail ? (
                    <RoleBadge role={role} email={userEmail} lang={lang} size="xs" />
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {lang === 'bn' ? 'অতিথি ব্যবহারকারী' : 'Guest'}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close Menu"
                onClick={() => setDrawerOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-emerald-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate('control');
                  setDrawerOpen(false);
                }}
                className="w-full min-h-[46px] px-4 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>{tr(lang, 'control_center')}</span>
                </span>
                {controlBadgeCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono-num text-[11px] font-bold flex items-center justify-center">
                    {controlBadgeCount > 99 ? '99+' : controlBadgeCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('wishlist');
                  setDrawerOpen(false);
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl text-sm font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-emerald-950/60"
              >
                <span className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>{tr(lang, 'wishlist')}</span>
                </span>
                <span className="font-mono-num text-xs text-slate-500">{wishlistCount}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenAdminChat();
                  setDrawerOpen(false);
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-emerald-950/60"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>{tr(lang, 'chat_admin')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openExternalUrl(getCurrentAppBaseUrl());
                  setDrawerOpen(false);
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl text-sm font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200"
              >
                <span className="flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4" />
                  <span>{tr(lang, 'open_website')}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  shareMarketplaceUrl({
                    url: getCurrentAppBaseUrl(),
                    title: siteSettings.appName || 'Amader Market',
                    text: siteSettings.footerSubtitle || siteSettings.appName || 'Amader Market',
                  });
                  setDrawerOpen(false);
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200"
              >
                <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>{lang === 'bn' ? 'অ্যাপ / ওয়েবসাইট লিংক শেয়ার' : 'Share Website Link'}</span>
              </button>
            </div>

            <div className="px-4 py-3 border-t border-slate-200/80 dark:border-emerald-950">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryPick(cat)}
                    className="min-h-[40px] px-2.5 py-2 rounded-lg text-xs font-medium text-left bg-slate-100 dark:bg-[#071312] hover:bg-emerald-50 dark:hover:bg-emerald-950 truncate"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-slate-200/80 dark:border-emerald-950 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {lang === 'bn' ? 'অফলাইন ক্যাশ:' : 'Offline Cache:'}{' '}
                  <strong className="font-mono-num text-slate-800 dark:text-slate-200">{cachedCount}</strong>
                </span>
                <button
                  type="button"
                  onClick={onForceSync}
                  disabled={!isOnline || isSyncing}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-amber-400 disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{tr(lang, 'sync_now')}</span>
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 grid grid-cols-2 p-0.5 rounded-xl border border-slate-200 dark:border-emerald-900 bg-slate-50 dark:bg-[#071312]">
                  <button
                    type="button"
                    onClick={() => onToggleTheme('light')}
                    className={`min-h-[38px] rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-colors ${
                      theme === 'light'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'লাইট' : 'Light'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleTheme('dark')}
                    className={`min-h-[38px] rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-colors ${
                      theme !== 'light'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'ডার্ক' : 'Dark'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="px-3.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-emerald-900 flex items-center justify-center text-xs font-semibold shrink-0"
                >
                  {lang === 'bn' ? 'English' : 'বাংলা'}
                </button>
              </div>

              {!isInstalled && (isInstallable || isIOS) && (
                <button
                  type="button"
                  onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
                  className="w-full min-h-[44px] rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{tr(lang, 'install_app')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0b1b19] p-6 border border-slate-200 dark:border-emerald-900 shadow-2xl">
            <h3 className="font-display text-lg font-bold">
              {lang === 'bn' ? 'iPhone / iPad-এ ইনস্টল করুন' : 'Install on iPhone / iPad'}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? '১. Safari ব্রাউজারের Share বাটনে ট্যাপ করুন।\n২. নিচে স্ক্রল করে Add to Home Screen সিলেক্ট করুন।'
                : '1. Tap the Share button in Safari.\n2. Scroll down and tap Add to Home Screen.'}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold text-sm"
            >
              {lang === 'bn' ? 'বুঝেছি' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
