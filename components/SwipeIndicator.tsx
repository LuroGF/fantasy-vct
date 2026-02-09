"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Navigation order for swipe indicator
const NAV_ORDER = [
  { path: '/leaderboard', label: 'Ranking', icon: '🏆' },
  { path: '/team', label: 'Equipo', icon: '⚔️' },
  { path: '/dashboard', label: 'Inicio', icon: '🏠' },
  { path: '/stats', label: 'Estadísticas', icon: '📊' },
  { path: '/market', label: 'Mercado', icon: '💰' },
  { path: '/shop', label: 'Tienda', icon: '🛒' }
];

export default function SwipeIndicator() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  const currentIndex = NAV_ORDER.findIndex(nav => nav.path === pathname);

  useEffect(() => {
    // Show indicator briefly on page load
    setShow(true);
    const timer = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (currentIndex === -1) return null;

  return (
    <div 
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-1 bg-v-navy/90 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
        {NAV_ORDER.map((nav, index) => (
          <div
            key={nav.path}
            className={`transition-all duration-200 ${
              index === currentIndex 
                ? 'w-6 h-1.5 bg-v-red rounded-full' 
                : 'w-1.5 h-1.5 bg-white/20 rounded-full'
            }`}
          />
        ))}
      </div>
      
      {/* Swipe hint text */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <p className="text-[8px] text-white/40 font-black uppercase tracking-widest">
          ← Desliza para navegar →
        </p>
      </div>
    </div>
  );
}
