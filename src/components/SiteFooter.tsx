import React from 'react';
import { Mail, Phone, Settings } from 'lucide-react';
import type { LangCode, SiteSettings } from '../types/marketplace';
import { getWhatsAppUrl, openExternalUrl } from '../utils/i18n';

interface SiteFooterProps {
  siteSettings: SiteSettings;
  lang: LangCode;
  isMainSuperAdmin?: boolean;
  onOpenAdminChat: () => void;
  onEditFooter?: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  siteSettings,
  lang,
  isMainSuperAdmin = false,
  onOpenAdminChat,
  onEditFooter,
}) => {
  if (siteSettings.showFooter === false) {
    return null;
  }

  const logoSrc = (siteSettings.footerLogo || '/app-logo.png').trim() || '/app-logo.png';
  const title = (siteSettings.footerTitle || siteSettings.appName || 'Amader Market').trim();
  const subtitle = (
    siteSettings.footerSubtitle ||
    siteSettings.adminName ||
    'At Technology Ltd'
  ).trim();
  const description = (
    siteSettings.footerDesc ||
    '⏳ সীমিত সংখ্যক সেলার এডমিন নেওয়া হবে — দেরি না করে এখনই আবেদন করুন!'
  ).trim();
  const copyrightText = (
    siteSettings.footerCopyright ||
    `© 07-03-${siteSettings.copyrightYear || '2026'} ${siteSettings.appName || 'Amader Market'}. All Rights Reserved.`
  ).trim();
  const creditText = (
    siteSettings.footerCredit || 'Built with ❤️ by Amader Market By Amit Hasan'
  ).trim();

  const fbUrl = (siteSettings.facebook || '').trim();
  const ytUrl = (siteSettings.youtube || '').trim();
  const emailAddr = (siteSettings.contactEmail || '').trim();
  const phoneNum = (
    siteSettings.contactPhone ||
    siteSettings.mainSuperAdminSupportPhone ||
    siteSettings.adminWaNumber ||
    ''
  ).trim();

  return (
    <footer className="amader-site-footer w-full mt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 text-center">
        {/* Centered Round App Logo with Theme-Matched Ring */}
        <div className="flex justify-center">
          <div className="amader-site-footer-logo-wrap w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 shadow-lg overflow-hidden flex items-center justify-center">
            <img
              src={logoSrc}
              alt={title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith('/app-logo.png')) {
                  img.src = '/app-logo.png';
                }
              }}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Brand Title & Company Subtitle */}
        <h2 className="amader-site-footer-title mt-4 font-display text-xl sm:text-2xl font-bold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="amader-site-footer-subtitle mt-1 text-sm sm:text-base font-bold tracking-wide">
            {subtitle}
          </p>
        )}

        {/* Notice / Tagline */}
        {description && (
          <p className="amader-site-footer-desc mt-3 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>
        )}

        {/* Social & Direct Contact Icons */}
        <div className="mt-6 flex items-center justify-center gap-6 sm:gap-8">
          <button
            type="button"
            aria-label="Facebook"
            title={fbUrl || (lang === 'bn' ? 'Facebook পেজ' : 'Facebook Page')}
            onClick={() => (fbUrl ? openExternalUrl(fbUrl) : onOpenAdminChat())}
            className="amader-site-footer-icon min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.987C18.343 21.128 22 16.991 22 12z" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="YouTube"
            title={ytUrl || (lang === 'bn' ? 'YouTube চ্যানেল' : 'YouTube Channel')}
            onClick={() => (ytUrl ? openExternalUrl(ytUrl) : onOpenAdminChat())}
            className="amader-site-footer-icon min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Email"
            title={emailAddr || (lang === 'bn' ? 'ইমেইল সাপোর্ট' : 'Email Support')}
            onClick={() => {
              if (emailAddr) {
                window.location.href = `mailto:${emailAddr}`;
              } else {
                onOpenAdminChat();
              }
            }}
            className="amader-site-footer-icon min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors"
          >
            <Mail className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="Phone"
            title={phoneNum || (lang === 'bn' ? 'সরাসরি কল / সাপোর্ট' : 'Phone Support')}
            onClick={() => {
              if (phoneNum) {
                window.location.href = `tel:${phoneNum.replace(/\s+/g, '')}`;
              } else {
                onOpenAdminChat();
              }
            }}
            className="amader-site-footer-icon min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>

        {/* Divider + Copyright + Developer Credit */}
        <div className="mt-7 pt-5 border-t amader-site-footer-divider space-y-1.5">
          {copyrightText && (
            <p className="amader-site-footer-muted text-xs sm:text-sm">{copyrightText}</p>
          )}
          {creditText && (
            <p className="amader-site-footer-title text-xs sm:text-sm font-bold tracking-wide">
              {creditText}
            </p>
          )}

          {isMainSuperAdmin && onEditFooter && (
            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={onEditFooter}
                className="amader-site-footer-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-opacity hover:opacity-85"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>
                  {lang === 'bn'
                    ? 'ফুটার লোগো ও তথ্য এডিট (সুপার এডমিন)'
                    : 'Edit Footer (Main Super Admin)'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

interface FloatingWhatsappProps {
  siteSettings: SiteSettings;
  lang: LangCode;
  isKeyboardOpen?: boolean;
  onFallbackChat: () => void;
}

const WHATSAPP_POS_STORAGE_KEY = 'amader_whatsapp_pos';
const WHATSAPP_BTN_SIZE = 48;
const WHATSAPP_VIEWPORT_PAD = 8;

function clampWhatsappPos(x: number, y: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 16, y: 16 };
  const maxX = Math.max(WHATSAPP_VIEWPORT_PAD, window.innerWidth - WHATSAPP_BTN_SIZE - WHATSAPP_VIEWPORT_PAD);
  const maxY = Math.max(WHATSAPP_VIEWPORT_PAD, window.innerHeight - WHATSAPP_BTN_SIZE - WHATSAPP_VIEWPORT_PAD);
  return {
    x: Math.round(Math.min(Math.max(WHATSAPP_VIEWPORT_PAD, x), maxX)),
    y: Math.round(Math.min(Math.max(WHATSAPP_VIEWPORT_PAD, y), maxY)),
  };
}

function getInitialWhatsappPos(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 16, y: 16 };
  try {
    const saved = localStorage.getItem(WHATSAPP_POS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { x?: unknown; y?: unknown };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number' && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        return clampWhatsappPos(parsed.x, parsed.y);
      }
    }
  } catch {
    // ignore storage errors
  }
  const isDesktop = window.innerWidth >= 1024;
  return clampWhatsappPos(
    window.innerWidth - WHATSAPP_BTN_SIZE - (isDesktop ? 24 : 14),
    window.innerHeight - WHATSAPP_BTN_SIZE - (isDesktop ? 24 : 72)
  );
}

export const FloatingWhatsappButton: React.FC<FloatingWhatsappProps> = ({
  siteSettings,
  lang,
  isKeyboardOpen = false,
  onFallbackChat,
}) => {
  const [pos, setPos] = React.useState<{ x: number; y: number }>(() => getInitialWhatsappPos());
  const [isDragging, setIsDragging] = React.useState(false);
  const posRef = React.useRef(pos);
  posRef.current = pos;

  const dragRef = React.useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    moved: false,
  });
  const suppressClickRef = React.useRef(false);

  React.useEffect(() => {
    const onResize = () => {
      setPos((prev) => clampWhatsappPos(prev.x, prev.y));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (isKeyboardOpen || siteSettings.showFloatingWhatsapp === false) return null;

  const waRaw = (
    siteSettings.adminWaNumber ||
    siteSettings.mainSuperAdminSupportPhone ||
    siteSettings.contactPhone ||
    ''
  ).trim();
  const waUrl = getWhatsAppUrl(
    waRaw,
    lang === 'bn'
      ? `আসসালামু আলাইকুম, ${siteSettings.appName || 'Amader Market'} সম্পর্কে জানতে চাই।`
      : `Hello, I need help with ${siteSettings.appName || 'Amader Market'}.`
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
      moved: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture is unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > 6) {
      drag.moved = true;
      setIsDragging(true);
    }
    if (drag.moved) {
      const clamped = clampWhatsappPos(drag.origX + dx, drag.origY + dy);
      posRef.current = clamped;
      setPos(clamped);
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    if (drag.moved) {
      suppressClickRef.current = true;
      try {
        localStorage.setItem(WHATSAPP_POS_STORAGE_KEY, JSON.stringify(posRef.current));
      } catch {
        // ignore storage quota errors
      }
    }
    drag.active = false;
    drag.pointerId = -1;
    setIsDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore release errors
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (waUrl) {
      openExternalUrl(waUrl);
    } else {
      onFallbackChat();
    }
  };

  return (
    <button
      type="button"
      aria-label="WhatsApp Support"
      title={
        lang === 'bn'
          ? 'সরাসরি WhatsApp কল/চ্যাট (টেনে যেকোনো জায়গায় রাখুন)'
          : 'WhatsApp Support (Drag to move anywhere)'
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClick={handleClick}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`group fixed z-[35] w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-xl flex items-center justify-center ring-2 ring-white/85 dark:ring-black/35 select-none ${
        isDragging ? 'cursor-grabbing shadow-2xl ring-4 ring-white' : 'cursor-grab'
      }`}
    >
      <span
        className={`flex items-center justify-center transition-transform ${
          isDragging ? 'scale-110' : 'group-active:scale-95'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
          <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.391a9.92 9.92 0 0 0 4.75 1.203h.005c5.511 0 9.964-4.453 9.964-9.968S17.547 2 12.031 2zm5.802 14.125c-.245.688-1.438 1.312-1.99 1.391-.505.073-1.146.104-1.849-.12-.432-.14-.984-.323-1.693-.63-2.979-1.286-4.922-4.297-5.073-4.495-.146-.198-1.208-1.609-1.208-3.068 0-1.458.76-2.177 1.031-2.474.271-.297.594-.37.792-.37.198 0 .396.005.568.01.182.01.427-.068.667.51.245.594.839 2.047.911 2.193.073.146.12.318.026.516-.099.198-.146.318-.292.49-.146.172-.307.385-.438.516-.146.146-.297.302-.125.599.172.297.76 1.255 1.63 2.031 1.12 1 2.063 1.307 2.359 1.453.297.146.469.125.646-.073.172-.198.74-.865.938-1.161.198-.297.396-.245.667-.146.271.099 1.714.807 2.01.953.297.146.495.219.568.344.073.125.073.724-.172 1.411z" />
        </svg>
      </span>
    </button>
  );
};
