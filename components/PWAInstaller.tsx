"use client";

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/utils/haptics';

export default function PWAInstaller() {
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Check platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    
    if (isIos) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    // Handle Android install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isInstalled = localStorage.getItem('pwa-installed') === 'true';
      const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
      
      if (!isInstalled && !isDismissed) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Check (Safari doesn't support beforeinstallprompt)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    if (isIos && !isInStandaloneMode) {
      const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
      if (!isDismissed) {
        setTimeout(() => setShowBanner(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    haptic.medium();
    if (platform === 'android' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true');
        setShowBanner(false);
      }
    } else if (platform === 'ios') {
      // Show iOS specific instructions in an alert or modal
      alert('Para instalar: Toca el icono de "Compartir" y selecciona "Añadir a pantalla de inicio"');
    }
  };

  const handleDismiss = () => {
    haptic.light();
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-100"
        >
          <div className="bg-v-navy/95 backdrop-blur-xl border border-v-red/30 p-4 rounded-lg shadow-[0_0_30px_rgba(255,70,85,0.2)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-v-red rounded flex items-center justify-center shrink-0">
                <Download className="text-v-white w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase italic text-v-white">Instalar VFantasy</h4>
                <p className="text-[10px] text-v-white/60 uppercase tracking-tighter">Acceso rápido y mejor experiencia</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleInstall}
                className="bg-v-red text-v-white px-4 py-2 text-[10px] font-black uppercase italic rounded active:scale-95 transition-transform"
              >
                Instalar
              </button>
              <button 
                onClick={handleDismiss}
                aria-label="Cerrar"
                className="p-2 text-v-white/40 hover:text-v-white active:scale-90 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
