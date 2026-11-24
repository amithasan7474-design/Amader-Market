import React, { useState } from 'react';
import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import {
  auth,
  createUserWithEmailAndPassword,
  db,
  ref,
  sendPasswordResetEmail,
  set,
  signInWithEmailAndPassword,
} from '../services/firebase';
import type { LangCode, SiteSettings } from '../types/marketplace';

interface AuthViewProps {
  lang: LangCode;
  siteSettings: SiteSettings;
  onSuccess: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  lang,
  siteSettings,
  onSuccess,
  onNotify,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const canRegister = siteSettings.registration !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        onNotify(
          lang === 'bn'
            ? 'পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে!'
            : 'Password reset email sent!',
          'success'
        );
        setMode('login');
      } else if (mode === 'register') {
        if (!canRegister) {
          onNotify(lang === 'bn' ? 'রেজিস্ট্রেশন সাময়িকভাবে বন্ধ আছে।' : 'Registration is closed.', 'error');
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await set(ref(db, `users/${cred.user.uid}`), {
          email: email.trim(),
          name: name.trim() || email.split('@')[0],
          phone: phone.trim(),
          role: 'user',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          lastActive: Date.now(),
          isOnline: true,
          isStoreActive: true,
        });
        onNotify(lang === 'bn' ? 'একাউন্ট তৈরি সফল হয়েছে!' : 'Account created!', 'success');
        onSuccess();
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onNotify(lang === 'bn' ? 'লগইন সফল হয়েছে!' : 'Logged in successfully!', 'success');
        onSuccess();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      onNotify(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white dark:bg-[#0d1f1d] border border-slate-200 dark:border-emerald-950 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/pwa-192x192.png"
            alt="Amader Market"
            className="w-16 h-16 rounded-2xl object-cover border border-amber-500/30 mb-3"
          />
          <h1 className="font-display text-2xl font-bold">
            {mode === 'login'
              ? lang === 'bn'
                ? 'একাউন্টে লগইন করুন'
                : 'Sign In to Amader Market'
              : mode === 'register'
              ? lang === 'bn'
                ? 'নতুন একাউন্ট খুলুন'
                : 'Create Account'
              : lang === 'bn'
              ? 'পাসওয়ার্ড রিসেট'
              : 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {siteSettings.appName || 'Amader Market'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {lang === 'bn' ? 'আপনার নাম' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {lang === 'bn' ? 'মোবাইল নাম্বার' : 'Mobile Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm font-mono-num"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              {lang === 'bn' ? 'ইমেইল' : 'Email'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#071312] border border-slate-200 dark:border-emerald-900 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[48px] rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {mode === 'login' && <LogIn className="w-4 h-4" />}
            {mode === 'register' && <UserPlus className="w-4 h-4" />}
            {mode === 'reset' && <Mail className="w-4 h-4" />}
            <span>
              {busy
                ? lang === 'bn'
                  ? 'অপেক্ষা করুন...'
                  : 'Please wait...'
                : mode === 'login'
                ? lang === 'bn'
                  ? 'লগইন করুন'
                  : 'Sign In'
                : mode === 'register'
                ? lang === 'bn'
                  ? 'রেজিস্টার করুন'
                  : 'Register'
                : lang === 'bn'
                ? 'রিসেট লিংক পাঠান'
                : 'Send Reset Link'}
            </span>
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-2 text-xs">
          {mode === 'login' ? (
            <>
              {canRegister && (
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-semibold text-emerald-800 dark:text-amber-400 hover:underline"
                >
                  {lang === 'bn' ? 'নতুন একাউন্ট খুলুন' : 'Create an account'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-slate-500 hover:underline inline-flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="font-semibold text-emerald-800 dark:text-amber-400 hover:underline"
            >
              {lang === 'bn' ? 'লগইন পেজে ফিরে যান' : 'Back to Sign In'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
