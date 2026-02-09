"use client";

import { useEffect, useState } from "react";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function PushManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    setSubscription(sub);

    // Si ya hay suscripción, nos aseguramos de que el servidor la tenga actualizada
    if (sub) {
      await saveSubscription(sub);
    }
  }

  async function subscribe() {
    if (!publicVapidKey) {
      console.warn("VAPID Public Key no encontrada en variables de entorno.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Solicitar permiso si no lo tenemos
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Permiso de notificaciones denegado.");
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      setSubscription(sub);
      await saveSubscription(sub);
      console.log("Suscrito a notificaciones push!");
    } catch (error) {
      console.error("Error al suscribirse:", error);
    }
  }

  async function saveSubscription(sub: PushSubscription) {
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify({ subscription: sub }),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  if (!isSupported) return null;

  // Si no está suscrito, mostramos un pequeño banner o botón
  // En un entorno profesional, esto se haría con un toggle en Configuración,
  // pero para WOW factor, podemos mostrarlo si el usuario acaba de entrar
  if (!subscription) {
    return (
      <div className="fixed top-20 left-4 right-4 z-[60] animate-in slide-in-from-top-4 duration-500">
        <div className="v-panel p-4 bg-v-red/10 border-v-red/30 backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-v-red flex items-center justify-center animate-pulse">
              <span className="text-white text-lg">🔔</span>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-white">Activar Alertas</p>
              <p className="text-[10px] text-v-white/70">Recibe avisos de mercado y resultados en tiempo real.</p>
            </div>
          </div>
          <button 
            onClick={subscribe}
            className="w-full py-2 bg-v-red hover:bg-v-red/80 text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-sm"
          >
            Suscribirme Ahora
          </button>
        </div>
      </div>
    );
  }

  return null;
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
