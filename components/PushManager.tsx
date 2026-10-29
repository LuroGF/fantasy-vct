"use client";

import { useEffect } from "react";

export default function PushManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    async function syncExistingSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled && subscription) await saveSubscription(subscription);
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    }

    void syncExistingSubscription();
    return () => {
      cancelled = true;
    };
  }, []);

  // Always return null to remove the prompt as requested by the user
  return null;
}

async function saveSubscription(subscription: PushSubscription) {
  try {
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify({ subscription }),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving subscription:", error);
  }
}
