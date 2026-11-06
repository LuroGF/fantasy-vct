"use client";

import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function OfflinePage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-v-navy text-v-white">
      <div className="w-20 h-20 bg-v-red/10 rounded-full flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-v-red animate-pulse" />
      </div>
      
      <h1 className="text-4xl font-black uppercase italic mb-2 tracking-tighter">
        {t("system.offline")}
      </h1>
      
      <p className="text-v-white/60 text-sm max-w-[280px] mb-8 font-medium">
        {t("system.offlineDescription")}
      </p>
      
      <div className="space-y-4 w-full max-w-xs">
        <button 
          onClick={() => window.location.reload()}
          className="v-btn-primary w-full py-4 text-xs font-black uppercase italic"
        >
          {t("system.retryConnection")}
        </button>
        
        <Link 
          href="/dashboard"
          className="block w-full py-4 text-[10px] font-black uppercase italic text-v-white/40 border border-white/5 hover:bg-white/5 transition-all"
        >
          {t("system.cachedHome")}
        </Link>
      </div>
      
      <div className="mt-12">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-v-white/20">
          {t("system.offlineMode")}
        </p>
      </div>
    </div>
  );
}
