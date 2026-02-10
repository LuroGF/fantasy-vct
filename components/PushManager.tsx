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

  // Always return null to remove the prompt as requested by the user
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
