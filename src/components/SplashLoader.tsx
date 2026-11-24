import React from 'react';
import type { LangCode } from '../types/marketplace';

interface SplashLoaderProps {
  stage: string;
  progress: number;
  lang: LangCode;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ stage, progress, lang }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#032629] text-white px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-2xl border border-amber-400/25 bg-[#043934] flex items-center justify-center mb-6">
          <img
            src="/pwa-512x512.png"
            alt="Amader Market Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-amber-300">
          Amader Market
        </h1>
        <p className="mt-1.5 text-sm text-teal-100/80">
          {lang === 'bn'
            ? 'একবার লোড হলেই অফলাইন ও স্মুথ এক্সপেরিয়েন্স'
            : 'Preloading marketplace & offline cache'}
        </p>

        <div className="w-full mt-8">
          <div className="flex items-center justify-between text-xs text-teal-100/75 mb-2">
            <span className="truncate pr-3">{stage}</span>
            <span className="font-mono-num shrink-0">{Math.min(100, Math.round(progress))}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
