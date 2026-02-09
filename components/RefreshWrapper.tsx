"use client";

import { useRouter } from 'next/navigation';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { haptic } from '@/lib/utils/haptics';

interface RefreshWrapperProps {
  children: React.ReactNode;
}

export default function RefreshWrapper({ children }: RefreshWrapperProps) {
  const router = useRouter();

  const handleRefresh = async () => {
    haptic.light(); // Vibrate on pull start
    router.refresh();
    await new Promise(resolve => setTimeout(resolve, 500)); // Min refresh time for UX
    haptic.success(); // Vibrate on complete
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-8 h-8 border-2 border-v-red border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-v-white/40 mt-2 font-black uppercase tracking-widest">Actualizando...</p>
        </div>
      }
      refreshingContent={
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-8 h-8 border-2 border-v-red border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-v-red mt-2 font-black uppercase tracking-widest">Cargando...</p>
        </div>
      }
      resistance={2}
      maxPullDownDistance={80}
      pullDownThreshold={60}
    >
      {children}
    </PullToRefresh>
  );
}
