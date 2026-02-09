"use client";

import { useEffect, useState } from "react";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function PushManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed this in current session
    const isDismissed = sessionStorage.getItem('push-prompt-dismissed');
    if (isDismissed) setDismissed(true);

    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      if (sub) await saveSubscription(sub);
    } catch (e) {
      console.error("Error checking subscription:", e);
    }
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('push-prompt-dismissed', 'true');
  };

  async function subscribe() {
    if (!publicVapidKey) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        handleDismiss();
        return;
      }
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
      setSubscription(sub);
      await saveSubscription(sub);
      handleDismiss();
    } catch (error) {
      console.error("Error al suscribirse:", error);
    }
  }

  async function saveSubscription(sub: PushSubscription) {
    try {
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: sub }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("Error saving subscription:", e);
    }
  }

  if (!isSupported || dismissed || subscription) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-4 duration-500">
      <div className="v-panel p-4 bg-v-navy/90 border-v-red/50 backdrop-blur-xl flex flex-col gap-3 relative overflow-hidden shadow-[0_-10px_40px_-15px_rgba(255,70,85,0.3)]">
        {/* Progress accent */}
        <div className="absolute top-0 left-0 h-[2px] bg-v-red w-full opacity-50" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-v-white/20 hover:text-v-white transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-v-red flex items-center justify-center animate-pulse shrink-0 shadow-lg shadow-v-red/40">
            <span className="text-white text-xl">🔔</span>
          </div>
          <div className="pr-6">
            <p className="text-[10px] font-black uppercase text-white tracking-widest">Protocolo de Alertas</p>
            <p className="text-[9px] text-v-white/60 leading-tight mt-1">Recibe actualizaciones críticas de mercado y resultados en tiempo real.</p>
          </div>
        </div>
        <button 
          onClick={subscribe}
          className="w-full py-2.5 bg-v-red hover:bg-v-red/80 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-sm shadow-lg shadow-v-red/20 active:scale-[0.98]"
        >
          Activar Enlace de Datos
        </button>
      </div>
    </div>
  );
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
