"use client";

import { useEffect } from 'react';

export default function PWAInstaller() {
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

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Detect iOS and show install prompt
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIos && !isInStandaloneMode) {
      // Show iOS install instructions after 5 seconds
      setTimeout(() => {
        const shouldShow = !localStorage.getItem('ios-install-dismissed');
        if (shouldShow) {
          // You can show a custom banner here
          console.log('iOS user - show install banner');
        }
      }, 5000);
    }

    // Handle Android install prompt
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button after 10 seconds
      setTimeout(() => {
        const shouldShow = !localStorage.getItem('pwa-install-dismissed');
        if (shouldShow && deferredPrompt) {
          // You can trigger the install prompt here
          // deferredPrompt.prompt();
          console.log('Android user - ready to install');
        }
      }, 10000);
    });

    // Track if app was installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      localStorage.setItem('pwa-installed', 'true');
    });

  }, []);

  return null; // This component doesn't render anything
}
