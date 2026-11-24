import React, { useState } from 'react';
import { CheckCircle2, Crown, Loader2, Lock, Palette, Plus, RotateCcw, Save, Smartphone, Trash2, Upload } from 'lucide-react';
import { db, ref, set } from '../services/firebase';
import type { Coupon, LangCode, SiteSettings, ThemeMode } from '../types/marketplace';
import { DEFAULT_TELECOM_CATEGORIES, getTelecomCategoryLabel, THEME_PRESETS } from '../utils/i18n';
import { uploadImageFile } from '../utils/imageUpload';
import { useConfirm } from './ConfirmProvider';

interface SiteSettingsControlProps {
  siteSettings: SiteSettings;
  isMainSuperAdmin: boolean;
  lang: LangCode;
  onPreviewTheme?: (theme: ThemeMode) => void;
  onThemeSaved?: (theme: ThemeMode) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CRITICAL_SWITCHES: (keyof SiteSettings)[] = [
  'maintenance',
  'registration',
  'enableWallet',
  'enableStaffSuperAdminChat',
  'showHeroCard',
  'enableDedicatedStore',
  'showFooter',
  'showFloatingWhatsapp',
];

export const SiteSettingsControl: React.FC<SiteSettingsControlProps> = ({
  siteSettings,
  isMainSuperAdmin,
  lang,
  onPreviewTheme,
  onThemeSaved,
  onNotify,
}) => {
  const confirm = useConfirm();
  const [form, setForm] = useState<SiteSettings>({ ...siteSettings });
  const [newCat, setNewCat] = useState('');
  const [newTelecomCat, setNewTelecomCat] = useState('');
  const [newAdImg, setNewAdImg] = useState('');
  const [newAdLink, setNewAdLink] = useState('');
  const [newCoupon, setNewCoupon] = useState<Coupon>({
    code: '',
    discount: 10,
    type: 'percent',
    minAmount: 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<'logo' | 'footerLogo' | 'banner' | null>(null);

  const handleSettingsImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'footerLogo' | 'banner'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTarget(target);
    try {
      const res = await uploadImageFile(file, form.imgbbApiKey);
      if (target === 'logo') {
        setForm((prev) => ({ ...prev, logo: res.url }));
      } else if (target === 'footerLogo') {
        setForm((prev) => ({ ...prev, footerLogo: res.url, footerCustomized: true }));
      } else {
        setNewAdImg(res.url);
      }
      onNotify(lang === 'bn' ? 'ছবি আপলোড হয়েছে (সেভ করুন)!' : 'Image uploaded!', 'success');
    } catch {
      onNotify(lang === 'bn' ? 'ছবি আপলোড ব্যর্থ।' : 'Upload failed.', 'error');
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const toggle = async (key: keyof SiteSettings) => {
    if (CRITICAL_SWITCHES.includes(key) && !isMainSuperAdmin) {
      onNotify(
        lang === 'bn'
          ? 'এই বিশেষ সেটিংস শুধুমাত্র মেইন সুপার এডমিন পরিবর্তন করতে পারবেন!'
          : 'Only Main Super Admin can change critical settings!',
        'error'
      );
      return;
    }
    if (CRITICAL_SWITCHES.includes(key)) {
      const ok = await confirm({
        title: lang === 'bn' ? 'গুরুত্বপূর্ণ সিস্টেম সুইচ' : 'Critical System Switch',
        message:
          lang === 'bn'
            ? `আপনি কি "${String(key)}" সেটিংসটি পরিবর্তন করতে চান?`
            : `Are you sure you want to toggle "${String(key)}"?`,
        tone: 'warning',
      });
      if (!ok) return;
    }
    if (
      key === 'enableStaffSuperAdminChat' ||
      key === 'showHeroCard' ||
      key === 'enableDedicatedStore' ||
      key === 'showFooter' ||
      key === 'showFloatingWhatsapp'
    ) {
      const nextVal = form[key] === false;
      setForm((prev) => ({ ...prev, [key]: nextVal }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveAll = async () => {
    const ok = await confirm({
      title: lang === 'bn' ? 'সেটিংস সেভ কনফার্মেশন' : 'Save Website Settings?',
      message:
        lang === 'bn'
          ? 'আপনি কি ওয়েবসাইটের সব পরিবর্তিত সেটিংস লাইভে সেভ ও কার্যকর করতে চান?'
          : 'Are you sure you want to save and apply all website settings to the live site?',
      tone: 'primary',
    });
    if (!ok) return;
    setSaving(true);
    try {
      // Protect critical fields if saved by Assistant Super Admin
      const payloadToSave: SiteSettings = isMainSuperAdmin
        ? { ...form, footerCustomized: true }
        : {
            ...form,
            maintenance: siteSettings.maintenance,
            registration: siteSettings.registration,
            enableWallet: siteSettings.enableWallet,
            enableStaffSuperAdminChat: siteSettings.enableStaffSuperAdminChat,
            showHeroCard: siteSettings.showHeroCard,
            enableDedicatedStore: siteSettings.enableDedicatedStore,
            advanceBkash: siteSettings.advanceBkash,
            advanceBkashType: siteSettings.advanceBkashType,
            advanceNagad: siteSettings.advanceNagad,
            advanceNagadType: siteSettings.advanceNagadType,
            storeBkash: siteSettings.storeBkash,
            storeBkashType: siteSettings.storeBkashType,
            storeNagad: siteSettings.storeNagad,
            storeNagadType: siteSettings.storeNagadType,
            mainSuperAdminSupportPhone: siteSettings.mainSuperAdminSupportPhone,
            imgbbApiKey: siteSettings.imgbbApiKey,
            storeActivationFee: siteSettings.storeActivationFee,
            telecomCategories: siteSettings.telecomCategories,
            defaultTheme: siteSettings.defaultTheme,
            footerLogo: siteSettings.footerLogo,
            footerTitle: siteSettings.footerTitle,
            footerSubtitle: siteSettings.footerSubtitle,
            footerDesc: siteSettings.footerDesc,
            facebook: siteSettings.facebook,
            youtube: siteSettings.youtube,
            contactEmail: siteSettings.contactEmail,
            contactPhone: siteSettings.contactPhone,
            adminWaNumber: siteSettings.adminWaNumber,
            footerCopyright: siteSettings.footerCopyright,
            footerCredit: siteSettings.footerCredit,
            showFooter: siteSettings.showFooter,
            showFloatingWhatsapp: siteSettings.showFloatingWhatsapp,
            footerCustomized: siteSettings.footerCustomized,
            logo: siteSettings.logo,
            appName: siteSettings.appName,
          };

      await set(ref(db, 'settings'), payloadToSave);
      if (isMainSuperAdmin && payloadToSave.defaultTheme) {
        onThemeSaved?.(payloadToSave.defaultTheme);
      }
      onNotify(
        lang === 'bn'
          ? 'ওয়েবসাইটের সকল সেটিংস সফলভাবে আপডেট হয়েছে!'
          : 'All live website settings saved!',
        'success'
      );
    } catch {
      onNotify(lang === 'bn' ? 'সেভ করতে সমস্যা হয়েছে।' : 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">
            {lang === 'bn' ? 'গ্লোবাল ওয়েবসাইট সেটিংস (লাইভ কন্ট্রোল)' : 'Global Website Control'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn'
              ? 'এখান থেকে করা প্রতিটি পরিবর্তন সরাসরি লাইভ ওয়েবসাইটে কার্যকর হবে।'
              : 'Every change saved here updates the live website in real time.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="min-h-[44px] px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>
            {saving
              ? lang === 'bn'
                ? 'সেভ হচ্ছে...'
                : 'Saving...'
              : lang === 'bn'
              ? 'সব সেটিংস সেভ করুন'
              : 'Save All Changes'}
          </span>
        </button>
      </div>

      {!isMainSuperAdmin && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-900/60 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            {lang === 'bn'
              ? 'সহকারী সুপার এডমিন মোড: সাধারণ সেটিংস, ব্যানার, ক্যাটাগরি ও কুপন পরিবর্তন করতে পারবেন। গুরুত্বপূর্ণ সিস্টেম, চ্যাট সুইচ ও পেমেন্ট সেটিংস শুধুমাত্র মেইন সুপার এডমিনের জন্য সংরক্ষিত।'
              : 'Assistant Super Admin mode: General settings, banners, categories & coupons are editable. Critical switches & payment numbers are locked to Main Super Admin only.'}
          </span>
        </div>
      )}

      {/* Main Super Admin Exclusive Critical Controls */}
      <div className="bg-white dark:bg-[#0d1f1d] border border-amber-300/60 dark:border-amber-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display font-bold text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Crown className="w-4 h-4" />
            <span>
              {lang === 'bn'
                ? 'বিশেষ সিস্টেম কন্ট্রোল (শুধুমাত্র মেইন সুপার এডমিন)'
                : 'Critical System Controls (Main Super Admin Only)'}
            </span>
          </h3>
          {!isMainSuperAdmin && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লক করা' : 'Locked'}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(
            [
              ['showHeroCard', lang === 'bn' ? 'হোম হিরো কার্ড (ওয়েলকাম ব্যানার)' : 'Home Hero Welcome Card'],
              ['enableDedicatedStore', lang === 'bn' ? 'স্টোর অ্যাক্টিভেশন সিস্টেম' : 'Store Activation System'],
              ['maintenance', lang === 'bn' ? 'মেইনটেনেন্স মোড' : 'Maintenance Mode'],
              ['registration', lang === 'bn' ? 'ইউজার রেজিস্ট্রেশন' : 'Registration Open'],
              ['enableWallet', lang === 'bn' ? 'ওয়ালেট সিস্টেম' : 'Wallet System'],
              [
                'enableStaffSuperAdminChat',
                lang === 'bn'
                  ? 'স্টাফ → সুপার এডমিন ডিরেক্ট মেসেজ'
                  : 'Staff-to-Super-Admin Direct Chat',
              ],
              [
                'showFloatingWhatsapp',
                lang === 'bn'
                  ? 'ভাসমান WhatsApp কল বাটন'
                  : 'Floating WhatsApp Call Button',
              ],
            ] as [keyof SiteSettings, string][]
          ).map(([key, label]) => {
            const active =
              key === 'enableStaffSuperAdminChat' ||
              key === 'showHeroCard' ||
              key === 'enableDedicatedStore' ||
              key === 'showFloatingWhatsapp'
                ? form[key] !== false
                : Boolean(form[key]);
            return (
              <button
                key={key}
                type="button"
                disabled={!isMainSuperAdmin}
                onClick={() => toggle(key)}
                className={`min-h-[46px] px-3 py-2 rounded-xl border text-xs font-semibold text-left flex items-center justify-between gap-2 transition-colors disabled:opacity-55 ${
                  active
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 dark:bg-emerald-950/60 dark:border-amber-400 dark:text-amber-300'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#071312] dark:border-emerald-950'
                }`}
              >
                <span className="truncate">{label}</span>
                <span className="font-mono-num text-[11px] shrink-0">
                  {active ? 'ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Super Admin Default Website Theme Preset Selector */}
      <div className="bg-white dark:bg-[#0d1f1d] border border-amber-300/60 dark:border-amber-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-sm flex items-center gap-2 text-emerald-900 dark:text-amber-300">
              <Palette className="w-4 h-4" />
              <span>
                {lang === 'bn'
                  ? 'ডিফল্ট ওয়েবসাইট থিম সেটিংস (মেইন সুপার এডমিন)'
                  : 'Default Website Theme (Main Super Admin Only)'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'নতুন ইউজার ও যারা ফ্রন্ট থেকে থিম বদলায়নি তারা এই থিমটি দেখবে। ইউজার নিজ হাতে ফ্রন্টের ২টি থিম (লাইট/ডার্ক) বদলালে সেটিই স্থায়ী থাকবে।'
                : 'Applies to all visitors & users who have not manually switched via the 2-theme front switcher.'}
            </p>
          </div>
          {!isMainSuperAdmin && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লক করা' : 'Locked'}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isSelected = (form.defaultTheme || 'dark') === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!isMainSuperAdmin}
                onClick={() => {
                  setForm((prev) => ({ ...prev, defaultTheme: preset.id }));
                  onPreviewTheme?.(preset.id);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all disabled:opacity-55 ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-50/80 dark:border-amber-400 dark:bg-emerald-950/60 ring-2 ring-emerald-600/30 dark:ring-amber-400/35'
                    : 'border-slate-200 dark:border-emerald-950 bg-slate-50 dark:bg-[#071312] hover:border-emerald-600/50'
                }`}
              >
                {/* Mini Website UI Preview Card */}
                <div
                  className="w-12 h-12 rounded-xl border border-black/15 dark:border-white/15 shrink-0 p-1.5 flex flex-col justify-between overflow-hidden shadow-xs"
                  style={{ backgroundColor: preset.swatchBg }}
                >
                  <div
                    className="h-2.5 w-full rounded-sm flex items-center justify-between px-1"
                    style={{ backgroundColor: preset.swatchCard }}
                  >
                    <span
                      className="w-2.5 h-1 rounded-full"
                      style={{ backgroundColor: preset.swatchAccent }}
                    />
                    <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                  </div>
                  <div className="flex items-end justify-between gap-1">
                    <div
                      className="h-4 flex-1 rounded-sm"
                      style={{ backgroundColor: preset.swatchCard }}
                    />
                    <span
                      className="w-4 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: preset.swatchAccent }}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">
                    {lang === 'bn' ? preset.labelBn : preset.labelEn}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {lang === 'bn' ? preset.descBn : preset.descEn}
                  </div>
                  {preset.isAdminExtra && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                      {lang === 'bn' ? 'নতুন থিম' : 'New Preset'}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* General Feature Toggles */}
      <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5">
        <h3 className="font-display font-bold text-sm mb-3">
          {lang === 'bn' ? 'সাধারণ ফিচার ও ক্যাম্পেইন সুইচ' : 'General Feature Switches'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {(
            [
              ['enableCOD', lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Global COD'],
              ['enableAdvance', lang === 'bn' ? 'অগ্রিম পেমেন্ট' : 'Global Advance'],
              ['enableFlashSale', lang === 'bn' ? 'ফ্ল্যাশ সেল' : 'Flash Sale'],
              ['enableCampaign11', lang === 'bn' ? '১১.১১ ক্যাম্পেইন' : '11.11 Campaign'],
              ['enableTelecomSection', lang === 'bn' ? 'টেলিকম সেকশন' : 'Telecom Section'],
              ['noticeActive', lang === 'bn' ? 'নোটিশ টিকার' : 'Notice Ticker'],
              ['topSloganActive', lang === 'bn' ? 'টপ স্লোগান' : 'Top Slogan'],
              ['autoShuffleActive', lang === 'bn' ? 'অটো শাফল' : 'Auto Shuffle'],
            ] as [keyof SiteSettings, string][]
          ).map(([key, label]) => {
            const active =
              key === 'enableStaffSuperAdminChat'
                ? form.enableStaffSuperAdminChat !== false
                : key === 'autoShuffleActive'
                ? form.autoShuffleActive !== false
                : Boolean(form[key]);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold text-left flex items-center justify-between gap-2 transition-colors ${
                  active
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 dark:bg-emerald-950/60 dark:border-amber-400 dark:text-amber-300'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#071312] dark:border-emerald-950'
                }`}
              >
                <span className="truncate">{label}</span>
                <span className="font-mono-num text-[11px]">{active ? 'ON' : 'OFF'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* App Identity & Notice */}
      <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'অ্যাপ / ওয়েবসাইটের নাম' : 'App / Website Name'}
          </label>
          <input
            type="text"
            value={form.appName || ''}
            onChange={(e) => setForm({ ...form, appName: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'টপ স্লোগান' : 'Top Slogan'}
          </label>
          <input
            type="text"
            value={form.topSloganText || ''}
            onChange={(e) => setForm({ ...form, topSloganText: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'নোটিশ টিকার টেক্সট' : 'Notice Ticker Text'}
          </label>
          <input
            type="text"
            value={form.noticeText || ''}
            onChange={(e) => setForm({ ...form, noticeText: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? '১১.১১ ক্যাম্পেইন শিরোনাম' : '11.11 Campaign Title'}
          </label>
          <input
            type="text"
            value={form.campaign11Title || ''}
            onChange={(e) => setForm({ ...form, campaign11Title: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'কত সেকেন্ড পরপর প্রোডাক্ট অটো-চেঞ্জ হবে?' : 'Product Auto-Rotate Interval'}
          </label>
            <select
            value={Number(form.autoShuffleSeconds) || 15}
            disabled={form.autoShuffleActive === false}
            onChange={(e) => setForm({ ...form, autoShuffleSeconds: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-semibold disabled:opacity-50"
          >
            <option value={10}>{lang === 'bn' ? '১০ সেকেন্ড পরপর (10s)' : 'Every 10 Seconds'}</option>
            <option value={15}>{lang === 'bn' ? '১৫ সেকেন্ড পরপর (15s)' : 'Every 15 Seconds'}</option>
            <option value={30}>{lang === 'bn' ? '৩০ সেকেন্ড পরপর (30s)' : 'Every 30 Seconds'}</option>
            <option value={60}>{lang === 'bn' ? '৬০ সেকেন্ড পরপর (60s)' : 'Every 60 Seconds'}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? '১১.১১ ক্যাম্পেইন সময়সীমা (ঘণ্টা)' : '11.11 Campaign Duration (Hours)'}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={form.campaign11DurationHours ?? 48}
              onChange={(e) => setForm({ ...form, campaign11DurationHours: Number(e.target.value) })}
              className="flex-1 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
            />
            <button
              type="button"
              onClick={async () => {
                const hrs = Number(form.campaign11DurationHours) || 48;
                const ok = await confirm({
                  title: lang === 'bn' ? 'টাইমার রিসেট করবেন?' : 'Reset 11.11 Timer?',
                  message:
                    lang === 'bn'
                      ? `আপনি কি ১১.১১ ক্যাম্পেইন টাইমার ${hrs} ঘণ্টার জন্য রিসেট করতে চান?`
                      : `Reset the 11.11 campaign timer to ${hrs} hours from now?`,
                  tone: 'warning',
                });
                if (!ok) return;
                setForm({ ...form, campaign11EndTime: Date.now() + hrs * 3600000 });
                onNotify(
                  lang === 'bn'
                    ? `${hrs} ঘণ্টার জন্য ১১.১১ টাইমার সেট হয়েছে (সেভ করুন)`
                    : `11.11 timer set for ${hrs}h (click Save)`,
                  'info'
                );
              }}
              className="px-3 h-10 rounded-xl bg-amber-500 text-slate-950 text-xs font-semibold whitespace-nowrap"
            >
              {lang === 'bn' ? 'টাইমার রিসেট' : 'Set Timer'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'স্টোর অ্যাক্টিভেশন ফি (৳)' : 'Store Activation Fee (৳)'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="text"
            disabled={!isMainSuperAdmin}
            value={form.storeActivationFee ?? ''}
            onChange={(e) => setForm({ ...form, storeActivationFee: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'অ্যাপ লোগো (লিংক বা আপলোড)' : 'App Logo (URL or Upload)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={form.logo || ''}
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
              className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
            />
            <label className="h-10 px-3 rounded-xl bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0">
              {uploadingTarget === 'logo' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{lang === 'bn' ? 'আপলোড' : 'Upload'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSettingsImageUpload(e, 'logo')}
                className="hidden"
              />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn'
              ? 'ImgBB Image Upload API Key (মেইন সুপার এডমিন)'
              : 'ImgBB Image Upload API Key (Main Super Admin)'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="text"
            disabled={!isMainSuperAdmin}
            value={form.imgbbApiKey || ''}
            onChange={(e) => setForm({ ...form, imgbbApiKey: e.target.value })}
            placeholder="Optional ImgBB API Key"
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono disabled:opacity-55"
          />
        </div>
      </div>

      {/* Payment Numbers (Protected to Main Super Admin) */}
      <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'এডমিন বিকাশ নাম্বার' : 'Admin bKash Number'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="text"
            disabled={!isMainSuperAdmin}
            value={form.advanceBkash || ''}
            onChange={(e) => setForm({ ...form, advanceBkash: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'বিকাশ ধরন (Personal/Agent/Merchant)' : 'bKash Type'}
          </label>
          <select
            disabled={!isMainSuperAdmin}
            value={form.advanceBkashType || 'Personal'}
            onChange={(e) => setForm({ ...form, advanceBkashType: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
          >
            <option value="Personal">Personal</option>
            <option value="Agent">Agent</option>
            <option value="Merchant">Merchant</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'এডমিন নগদ নাম্বার' : 'Admin Nagad Number'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="text"
            disabled={!isMainSuperAdmin}
            value={form.advanceNagad || ''}
            onChange={(e) => setForm({ ...form, advanceNagad: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'নগদ ধরন' : 'Nagad Type'}
          </label>
          <select
            disabled={!isMainSuperAdmin}
            value={form.advanceNagadType || 'Personal'}
            onChange={(e) => setForm({ ...form, advanceNagadType: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
          >
            <option value="Personal">Personal</option>
            <option value="Agent">Agent</option>
            <option value="Merchant">Merchant</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'স্টোর অ্যাক্টিভেশন বিকাশ (ঐচ্ছিক)' : 'Store Activation bKash (Optional)'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="text"
            disabled={!isMainSuperAdmin}
            value={form.storeBkash || ''}
            placeholder={form.advanceBkash || (lang === 'bn' ? 'খালি থাকলে উপরের নাম্বার চলবে' : 'Defaults to Admin bKash')}
            onChange={(e) => setForm({ ...form, storeBkash: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'স্টোর বিকাশ ধরন' : 'Store bKash Type'}
          </label>
          <select
            disabled={!isMainSuperAdmin}
            value={form.storeBkashType || 'Personal'}
            onChange={(e) => setForm({ ...form, storeBkashType: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
          >
            <option value="Personal">Personal</option>
            <option value="Agent">Agent</option>
            <option value="Merchant">Merchant</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'স্টোর অ্যাক্টিভেশন নগদ (ঐচ্ছিক)' : 'Store Activation Nagad (Optional)'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="text"
            disabled={!isMainSuperAdmin}
            value={form.storeNagad || ''}
            placeholder={form.advanceNagad || (lang === 'bn' ? 'খালি থাকলে উপরের নাম্বার চলবে' : 'Defaults to Admin Nagad')}
            onChange={(e) => setForm({ ...form, storeNagad: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'স্টোর নগদ ধরন' : 'Store Nagad Type'}
          </label>
          <select
            disabled={!isMainSuperAdmin}
            value={form.storeNagadType || 'Personal'}
            onChange={(e) => setForm({ ...form, storeNagadType: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
          >
            <option value="Personal">Personal</option>
            <option value="Agent">Agent</option>
            <option value="Merchant">Merchant</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn' ? 'যোগাযোগের ফোন' : 'Contact Phone'}
          </label>
          <input
            type="text"
            value={form.contactPhone || ''}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn'
              ? 'এডমিন হোয়াটসঅ্যাপ নাম্বার (কল/চ্যাট বাটন)'
              : 'Admin WhatsApp Number (Call/Chat Button)'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="tel"
            disabled={!isMainSuperAdmin}
            value={form.adminWaNumber || ''}
            onChange={(e) => setForm({ ...form, adminWaNumber: e.target.value })}
            placeholder="01XXXXXXXXX / +8801XXXXXXXXX"
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn'
              ? 'মেইন সুপার এডমিনের সাপোর্ট নাম্বার (চ্যাটে শো করবে)'
              : 'Main Super Admin Support Number'}
            {!isMainSuperAdmin && ' 🔒'}
          </label>
          <input
            type="tel"
            disabled={!isMainSuperAdmin}
            value={form.mainSuperAdminSupportPhone || ''}
            onChange={(e) => setForm({ ...form, mainSuperAdminSupportPhone: e.target.value })}
            placeholder="01XXXXXXXXX"
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            {lang === 'bn'
              ? 'সহকারী সুপার এডমিনের সাপোর্ট নাম্বার (চ্যাটে শো করবে)'
              : 'Assistant Super Admin Support Number'}
          </label>
          <input
            type="tel"
            value={form.assistantSuperAdminSupportPhone || ''}
            onChange={(e) => setForm({ ...form, assistantSuperAdminSupportPhone: e.target.value })}
            placeholder="01XXXXXXXXX"
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
          />
        </div>
      </div>

      {/* Footer, Logo, Social Links & Credit Control (Main Super Admin Only) */}
      <div
        id="footer-settings-card"
        className="bg-white dark:bg-[#0d1f1d] border border-amber-300/60 dark:border-amber-500/30 rounded-2xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-sm flex items-center gap-2 text-emerald-900 dark:text-amber-300">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>
                {lang === 'bn'
                  ? 'ওয়েবসাইট ফুটার, লোগো, সোশ্যাল লিংক ও ক্রেডিট (শুধুমাত্র মেইন সুপার এডমিন)'
                  : 'Website Footer, Logo, Social & Credit Control (Main Super Admin Only)'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'ওয়েবসাইটের একদম নিচের লোগো, বিবরণ, ফেসবুক/ইউটিউব/ইমেইল/ফোন, কপিরাইট ও ক্রেডিট এখান থেকে পরিবর্তন করুন। প্রত্যেকটি থিমের সাথে রঙ অটো ম্যাচ হবে।'
                : 'Customize the bottom footer logo, company title, tagline, social links, copyright and credit. Colors auto-adapt to every theme.'}
            </p>
          </div>
          {!isMainSuperAdmin && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লক করা' : 'Locked'}</span>
            </span>
          )}
        </div>

        {/* Footer visibility & Floating WhatsApp ON/OFF + Number (Main Super Admin Only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(
            [
              ['showFooter', lang === 'bn' ? 'ওয়েবসাইট ফুটার চালু রাখুন' : 'Show Website Footer'],
              [
                'showFloatingWhatsapp',
                lang === 'bn' ? 'ভাসমান WhatsApp কল/চ্যাট বাটন' : 'Floating WhatsApp Button',
              ],
            ] as [keyof SiteSettings, string][]
          ).map(([key, label]) => {
            const active = form[key] !== false;
            return (
              <button
                key={key}
                type="button"
                disabled={!isMainSuperAdmin}
                onClick={() => toggle(key)}
                className={`min-h-[48px] px-3.5 py-2 rounded-xl border text-xs font-semibold text-left flex items-center justify-between gap-2 transition-colors disabled:opacity-55 ${
                  active
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 dark:bg-emerald-950/60 dark:border-amber-400 dark:text-amber-300'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#071312] dark:border-emerald-950'
                }`}
              >
                <span className="truncate">{label}</span>
                <span className="inline-flex items-center gap-2 shrink-0">
                  <span
                    className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                      active ? 'bg-emerald-600 dark:bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </span>
                  <span className="font-mono-num text-[11px] w-6 text-right">
                    {active ? 'ON' : 'OFF'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Dedicated WhatsApp Number Control (Main Super Admin Only) */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {lang === 'bn'
                ? 'WhatsApp কল বাটনের নাম্বার (শুধুমাত্র মেইন সুপার এডমিন)'
                : 'Floating WhatsApp Number (Main Super Admin Only)'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-amber-300">
              {form.showFloatingWhatsapp !== false
                ? lang === 'bn'
                  ? 'স্ট্যাটাস: চালু (ON)'
                  : 'Status: ON'
                : lang === 'bn'
                ? 'স্ট্যাটাস: বন্ধ (OFF)'
                : 'Status: OFF'}
            </span>
          </div>
          <input
            type="tel"
            disabled={!isMainSuperAdmin}
            value={form.adminWaNumber || ''}
            onChange={(e) => setForm({ ...form, adminWaNumber: e.target.value })}
            placeholder="01XXXXXXXXX বা +8801XXXXXXXXX"
            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#071312] border border-emerald-300 dark:border-emerald-800 text-sm font-mono-num disabled:opacity-55"
          />
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {lang === 'bn'
              ? 'ইউজার চাইলে WhatsApp আইকনটি হাত দিয়ে টেনে (Drag করে) স্ক্রিনের যেকোনো জায়গায় রাখতে পারবে। সুইচ বন্ধ করলে পুরো সাইট থেকে বাটনটি হাইড হয়ে যাবে।'
              : 'Users can freely drag and place the floating WhatsApp icon anywhere on screen. Switching OFF hides it across the entire site.'}
          </p>
        </div>

        {/* Footer Logo preview & upload */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 flex flex-wrap items-center gap-3">
          <img
            src={form.footerLogo || '/app-logo.png'}
            alt="Footer Logo Preview"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith('/app-logo.png')) {
                e.currentTarget.src = '/app-logo.png';
              }
            }}
            className="w-14 h-14 rounded-full object-cover border-2 border-emerald-600/40 bg-white shrink-0"
          />
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="block text-xs font-semibold">
              {lang === 'bn'
                ? 'ফুটার গোল লোগো (ডিফল্ট: অ্যাপ লোগো / কাস্টম URL বা আপলোড)'
                : 'Footer Circle Logo (Default: App Logo / URL or Upload)'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                disabled={!isMainSuperAdmin}
                value={form.footerLogo || ''}
                onChange={(e) =>
                  setForm({ ...form, footerLogo: e.target.value, footerCustomized: true })
                }
                placeholder="/app-logo.png"
                className="flex-1 min-w-[160px] h-9 px-3 rounded-lg bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-900 text-xs disabled:opacity-55"
              />
              <label
                className={`h-9 px-3 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1 shrink-0 ${
                  isMainSuperAdmin ? 'cursor-pointer' : 'opacity-50 pointer-events-none'
                }`}
              >
                {uploadingTarget === 'footerLogo' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{lang === 'bn' ? 'আপলোড' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!isMainSuperAdmin}
                  onChange={(e) => handleSettingsImageUpload(e, 'footerLogo')}
                  className="hidden"
                />
              </label>
              {isMainSuperAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, footerLogo: '/app-logo.png', footerCustomized: true })
                  }
                  className="h-9 px-2.5 rounded-lg border border-slate-300 dark:border-emerald-800 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'bn' ? 'ডিফল্ট লোগো' : 'App Logo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'ফুটার ব্র্যান্ড শিরোনাম' : 'Footer Brand Title'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="text"
              disabled={!isMainSuperAdmin}
              value={form.footerTitle ?? form.appName ?? ''}
              onChange={(e) =>
                setForm({ ...form, footerTitle: e.target.value, footerCustomized: true })
              }
              placeholder="Amader Market"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'ফুটার কোম্পানি / সাবটাইটেল' : 'Footer Company / Subtitle'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="text"
              disabled={!isMainSuperAdmin}
              value={form.footerSubtitle || ''}
              onChange={(e) =>
                setForm({ ...form, footerSubtitle: e.target.value, footerCustomized: true })
              }
              placeholder="At Technology Ltd"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'ফুটার বিবরণ / নোটিশ লাইন' : 'Footer Notice / Description Line'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="text"
              disabled={!isMainSuperAdmin}
              value={form.footerDesc || ''}
              onChange={(e) =>
                setForm({ ...form, footerDesc: e.target.value, footerCustomized: true })
              }
              placeholder="⏳ সীমিত সংখ্যক সেলার এডমিন নেওয়া হবে — দেরি না করে এখনই আবেদন করুন!"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'Facebook পেজ লিংক' : 'Facebook Page URL'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="url"
              disabled={!isMainSuperAdmin}
              value={form.facebook || ''}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'YouTube চ্যানেল লিংক' : 'YouTube Channel URL'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="url"
              disabled={!isMainSuperAdmin}
              value={form.youtube || ''}
              onChange={(e) => setForm({ ...form, youtube: e.target.value })}
              placeholder="https://youtube.com/..."
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'সাপোর্ট ইমেইল' : 'Support Email'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="email"
              disabled={!isMainSuperAdmin}
              value={form.contactEmail || ''}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              placeholder="support@example.com"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'ফুটার ফোন নাম্বার (কল বাটন)' : 'Footer Phone Number'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="tel"
              disabled={!isMainSuperAdmin}
              value={form.contactPhone || ''}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              placeholder="01XXXXXXXXX"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'কপিরাইট লাইন' : 'Copyright Text'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="text"
              disabled={!isMainSuperAdmin}
              value={form.footerCopyright || ''}
              onChange={(e) =>
                setForm({ ...form, footerCopyright: e.target.value, footerCustomized: true })
              }
              placeholder="© 07-03-2026 Amader Market. All Rights Reserved."
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'ক্রেডিট / ডেভেলপার লাইন' : 'Credit / Built With Line'}
              {!isMainSuperAdmin && ' 🔒'}
            </label>
            <input
              type="text"
              disabled={!isMainSuperAdmin}
              value={form.footerCredit || ''}
              onChange={(e) =>
                setForm({ ...form, footerCredit: e.target.value, footerCustomized: true })
              }
              placeholder="Built with ❤️ by Amader Market By Amit Hasan"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm disabled:opacity-55"
            />
          </div>
        </div>

        {isMainSuperAdmin && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="min-h-[42px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? lang === 'bn'
                    ? 'সেভ হচ্ছে...'
                    : 'Saving...'
                  : lang === 'bn'
                  ? 'হোয়াটসঅ্যাপ ও ফুটার সেটিংস সেভ করুন'
                  : 'Save WhatsApp & Footer Settings'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Categories & Banners & Coupons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 space-y-3">
          <h3 className="font-display font-bold text-sm">
            {lang === 'bn' ? 'ক্যাটাগরি ম্যানেজার' : 'Categories'}
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder={lang === 'bn' ? 'নতুন ক্যাটাগরি...' : 'New category...'}
              className="flex-1 h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!newCat.trim()) return;
                setForm({
                  ...form,
                  categories: [...(form.categories || []), newCat.trim()],
                });
                setNewCat('');
              }}
              className="w-9 h-9 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(form.categories || []).map((c, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#071312] text-xs"
              >
                <span className="truncate">{c}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: lang === 'bn' ? 'ক্যাটাগরি ডিলিট?' : 'Delete Category?',
                      message:
                        lang === 'bn'
                          ? `আপনি কি "${c}" ক্যাটাগরিটি সরাতে চান?`
                          : `Remove category "${c}"?`,
                      tone: 'danger',
                    });
                    if (!ok) return;
                    setForm({
                      ...form,
                      categories: (form.categories || []).filter((_, i) => i !== idx),
                    });
                  }}
                  className="text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Telecom / Offer / VIP SIM Categories (Main Super Admin Only) */}
        <div className="bg-white dark:bg-[#0d1f1d] border border-sky-300/60 dark:border-sky-700/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'bn'
                  ? 'টেলিকম / অফার / সিম ক্যাটাগরি'
                  : 'Telecom / Offer / SIM Categories'}
              </span>
            </h3>
            {isMainSuperAdmin ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: lang === 'bn' ? 'ডিফল্ট অপারেটর রিসেট?' : 'Reset Telecom Operators?',
                    message:
                      lang === 'bn'
                        ? 'ডিফল্ট ৬টি অপারেটর (রবি, সার্কেল, গ্রামীণফোন, বাংলালিংক, এয়ারটেল, টেলিটক) ফিরিয়ে আনবেন?'
                        : 'Restore default 6 telecom operators?',
                    tone: 'warning',
                  });
                  if (!ok) return;
                  setForm({ ...form, telecomCategories: [...DEFAULT_TELECOM_CATEGORIES] });
                }}
                title={lang === 'bn' ? 'ডিফল্ট ফিরিয়ে আনুন' : 'Reset Defaults'}
                className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 inline-flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'bn' ? 'ডিফল্ট' : 'Reset'}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Lock className="w-3 h-3" />
                <span>{lang === 'bn' ? 'মেইন এডমিন' : 'Locked'}</span>
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              disabled={!isMainSuperAdmin}
              value={newTelecomCat}
              onChange={(e) => setNewTelecomCat(e.target.value)}
              placeholder={
                isMainSuperAdmin
                  ? lang === 'bn'
                    ? 'নতুন অপারেটর / প্যাকেজ ক্যাটাগরি...'
                    : 'New telecom / SIM category...'
                  : lang === 'bn'
                  ? 'শুধুমাত্র মেইন সুপার এডমিন'
                  : 'Main Super Admin only'
              }
              className="flex-1 h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs disabled:opacity-55"
            />
            <button
              type="button"
              disabled={!isMainSuperAdmin}
              onClick={() => {
                if (!isMainSuperAdmin || !newTelecomCat.trim()) return;
                const currentList =
                  form.telecomCategories && form.telecomCategories.length > 0
                    ? form.telecomCategories
                    : [...DEFAULT_TELECOM_CATEGORIES];
                const trimmed = newTelecomCat.trim();
                if (currentList.some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
                  onNotify(
                    lang === 'bn' ? 'এই ক্যাটাগরি ইতিমধ্যে আছে!' : 'Category already exists!',
                    'info'
                  );
                  return;
                }
                setForm({
                  ...form,
                  telecomCategories: [...currentList, trimmed],
                });
                setNewTelecomCat('');
              }}
              className="w-9 h-9 rounded-lg bg-sky-700 hover:bg-sky-800 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(form.telecomCategories && form.telecomCategories.length > 0
              ? form.telecomCategories
              : DEFAULT_TELECOM_CATEGORIES
            ).map((tc, idx, arr) => (
              <div
                key={`${tc}-${idx}`}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-sky-50/70 dark:bg-[#071312] text-xs"
              >
                <span className="truncate font-medium">{getTelecomCategoryLabel(tc, lang)}</span>
                {isMainSuperAdmin && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: lang === 'bn' ? 'অপারেটর ক্যাটাগরি ডিলিট?' : 'Delete Telecom Category?',
                        message:
                          lang === 'bn'
                            ? `আপনি কি "${getTelecomCategoryLabel(tc, lang)}" সরাতে চান?`
                            : `Remove "${tc}"?`,
                        tone: 'danger',
                      });
                      if (!ok) return;
                      setForm({
                        ...form,
                        telecomCategories: arr.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ad Banners */}
        <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 space-y-3">
          <h3 className="font-display font-bold text-sm">
            {lang === 'bn' ? 'ব্যানার বিজ্ঞাপন' : 'Ad Banners'}
          </h3>
          <div className="flex gap-2">
            <input
              type="url"
              value={newAdImg}
              onChange={(e) => setNewAdImg(e.target.value)}
              placeholder={lang === 'bn' ? 'ব্যানার ছবির URL' : 'Banner Image URL'}
              className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs"
            />
            <label className="h-9 px-2.5 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0">
              {uploadingTarget === 'banner' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSettingsImageUpload(e, 'banner')}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={newAdLink}
              onChange={(e) => setNewAdLink(e.target.value)}
              placeholder={lang === 'bn' ? 'টার্গেট লিংক (ঐচ্ছিক)' : 'Target Link (optional)'}
              className="flex-1 h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!newAdImg.trim()) return;
                setForm({
                  ...form,
                  ads: [...(form.ads || []), { image: newAdImg.trim(), link: newAdLink.trim(), active: true }],
                });
                setNewAdImg('');
                setNewAdLink('');
              }}
              className="w-9 h-9 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {(form.ads || []).map((ad, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#071312] text-xs"
              >
                <span className="truncate">{ad.image}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: lang === 'bn' ? 'ব্যানার ডিলিট?' : 'Delete Banner?',
                      message:
                        lang === 'bn'
                          ? 'আপনি কি এই ব্যানার বিজ্ঞাপনটি মুছে ফেলতে চান?'
                          : 'Remove this banner ad?',
                      tone: 'danger',
                    });
                    if (!ok) return;
                    setForm({
                      ...form,
                      ads: (form.ads || []).filter((_, i) => i !== idx),
                    });
                  }}
                  className="text-rose-500 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Coupons */}
        <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-2xl p-4 space-y-2.5">
          <h3 className="font-display font-bold text-sm">
            {lang === 'bn' ? 'কুপন কোড' : 'Promo Coupons'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              placeholder={lang === 'bn' ? 'কোড' : 'CODE'}
              className="h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs"
            />
            <input
              type="number"
              value={newCoupon.discount || ''}
              onChange={(e) =>
                setNewCoupon({
                  ...newCoupon,
                  discount: e.target.value === '' ? 0 : Number(e.target.value),
                })
              }
              placeholder={lang === 'bn' ? 'ছাড়' : 'Discount'}
              className="h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs font-mono-num"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={newCoupon.type}
              onChange={(e) =>
                setNewCoupon({ ...newCoupon, type: e.target.value as 'percent' | 'fixed' })
              }
              className="flex-1 h-9 px-2 rounded-lg bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-xs"
            >
              <option value="percent">% Percent</option>
              <option value="fixed">৳ Fixed</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (!newCoupon.code.trim()) return;
                setForm({
                  ...form,
                  coupons: [...(form.coupons || []), { ...newCoupon }],
                });
                setNewCoupon({ code: '', discount: 10, type: 'percent', minAmount: 0 });
              }}
              className="px-3 h-9 rounded-lg bg-emerald-800 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold"
            >
              {lang === 'bn' ? 'যোগ' : 'Add'}
            </button>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {(form.coupons || []).map((cp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#071312] text-xs font-mono-num"
              >
                <span>
                  {cp.code} · {cp.discount}
                  {cp.type === 'percent' ? '%' : '৳'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: lang === 'bn' ? 'কুপন ডিলিট?' : 'Delete Coupon?',
                      message:
                        lang === 'bn'
                          ? `আপনি কি "${cp.code}" কুপনটি ডিলিট করতে চান?`
                          : `Remove coupon "${cp.code}"?`,
                      tone: 'danger',
                    });
                    if (!ok) return;
                    setForm({
                      ...form,
                      coupons: (form.coupons || []).filter((_, i) => i !== idx),
                    });
                  }}
                  className="text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
