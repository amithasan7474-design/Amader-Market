import React from 'react';
import {
  BadgeCheck,
  Briefcase,
  Crown,
  Gem,
  Shield,
  ShieldCheck,
  Store,
  Tag,
  User,
} from 'lucide-react';
import type { LangCode } from '../types/marketplace';
import { getRoleLabel, isMainSuperAdminAccount } from '../utils/i18n';

interface RoleStyle {
  badgeClass: string;
  avatarRingClass: string;
  avatarBgClass: string;
  icon: React.ReactNode;
}

function getRoleStyle(role?: string | null, email?: string | null): RoleStyle {
  if (isMainSuperAdminAccount(email)) {
    return {
      badgeClass:
        'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 border border-amber-300 shadow-sm shadow-amber-500/25 font-bold',
      avatarRingClass: 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0b1b19]',
      avatarBgClass: 'bg-gradient-to-br from-amber-500 to-emerald-900 text-white',
      icon: <Crown className="w-3 h-3 shrink-0" />,
    };
  }

  const r = (role || 'user').toLowerCase();
  switch (r) {
    case 'super_admin':
      return {
        badgeClass:
          'bg-gradient-to-r from-rose-600 to-amber-600 text-white border border-rose-400/50 shadow-sm font-bold',
        avatarRingClass: 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-[#0b1b19]',
        avatarBgClass: 'bg-gradient-to-br from-rose-600 to-amber-700 text-white',
        icon: <ShieldCheck className="w-3 h-3 shrink-0" />,
      };
    case 'admin':
      return {
        badgeClass:
          'bg-indigo-600 text-white border border-indigo-400/40 font-semibold',
        avatarRingClass: 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-[#0b1b19]',
        avatarBgClass: 'bg-indigo-600 text-white',
        icon: <Shield className="w-3 h-3 shrink-0" />,
      };
    case 'partner':
      return {
        badgeClass:
          'bg-violet-600 text-white border border-violet-400/40 font-semibold',
        avatarRingClass: 'ring-2 ring-violet-500 ring-offset-1 ring-offset-white dark:ring-offset-[#0b1b19]',
        avatarBgClass: 'bg-violet-600 text-white',
        icon: <Gem className="w-3 h-3 shrink-0" />,
      };
    case 'manager':
      return {
        badgeClass:
          'bg-teal-700 text-white border border-teal-500/40 font-semibold',
        avatarRingClass: 'ring-2 ring-teal-500 ring-offset-1 ring-offset-white dark:ring-offset-[#0b1b19]',
        avatarBgClass: 'bg-teal-700 text-white',
        icon: <Briefcase className="w-3 h-3 shrink-0" />,
      };
    case 'moderator':
      return {
        badgeClass:
          'bg-emerald-700 text-white border border-emerald-500/40 font-semibold',
        avatarRingClass: 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-white dark:ring-offset-[#0b1b19]',
        avatarBgClass: 'bg-emerald-700 text-white',
        icon: <BadgeCheck className="w-3 h-3 shrink-0" />,
      };
    case 'merchant':
      return {
        badgeClass:
          'bg-orange-600 text-white border border-orange-400/40 font-semibold',
        avatarRingClass: 'ring-2 ring-orange-500 ring-offset-1 ring-offset-white dark:ring-offset-[#0b1b19]',
        avatarBgClass: 'bg-orange-600 text-white',
        icon: <Store className="w-3 h-3 shrink-0" />,
      };
    case 'seller':
      return {
        badgeClass:
          'bg-sky-600 text-white border border-sky-400/40 font-semibold',
        avatarRingClass: 'ring-2 ring-sky-500 ring-offset-1 ring-offset-white dark:ring-offset-[#0b1b19]',
        avatarBgClass: 'bg-sky-600 text-white',
        icon: <Tag className="w-3 h-3 shrink-0" />,
      };
    default:
      return {
        badgeClass:
          'bg-slate-200 text-slate-700 dark:bg-emerald-950 dark:text-slate-300 border border-slate-300 dark:border-emerald-900 font-medium',
        avatarRingClass: 'ring-1 ring-slate-300 dark:ring-emerald-900',
        avatarBgClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-amber-300',
        icon: <User className="w-3 h-3 shrink-0" />,
      };
  }
}

interface RoleBadgeProps {
  role?: string | null;
  email?: string | null;
  lang: LangCode;
  size?: 'xs' | 'sm';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  email,
  lang,
  size = 'xs',
}) => {
  const style = getRoleStyle(role, email);
  const label = getRoleLabel(role, email, lang);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg whitespace-nowrap tracking-tight ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
      } ${style.badgeClass}`}
    >
      {style.icon}
      <span>{label}</span>
    </span>
  );
};

interface RoleAvatarProps {
  name?: string | null;
  email?: string | null;
  profilePic?: string | null;
  role?: string | null;
  sizeClass?: string;
}

export const RoleAvatar: React.FC<RoleAvatarProps> = ({
  name,
  email,
  profilePic,
  role,
  sizeClass = 'w-11 h-11',
}) => {
  const style = getRoleStyle(role, email);
  const initial = (name || email || 'U').trim().slice(0, 1).toUpperCase();

  return (
    <div className={`relative shrink-0 rounded-full ${style.avatarRingClass} ${sizeClass}`}>
      {profilePic ? (
        <img
          src={profilePic}
          alt={name || ''}
          referrerPolicy="no-referrer"
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full font-display font-bold flex items-center justify-center ${style.avatarBgClass}`}
        >
          {initial}
        </div>
      )}
    </div>
  );
};
