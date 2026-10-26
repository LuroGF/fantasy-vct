"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Save } from "lucide-react";
import {
  sendTestNotification,
  updateNotificationPreferences,
} from "@/lib/actions/notifications";

type Preferences = {
  push_enabled: boolean;
  market_enabled: boolean;
  gameweek_enabled: boolean;
  social_enabled: boolean;
  daily_reward_enabled: boolean;
};

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function NotificationSettings({ initial }: { initial: Preferences }) {
  const [preferences, setPreferences] = useState(initial);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const canPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(canPush);
    if (!canPush) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => setSubscribed(false));
  }, []);

  async function persist(next: Preferences) {
    setSaving(true);
    const result = await updateNotificationPreferences(next);
    setSaving(false);
    if (!result.success) {
      setMessage(result.error || "No se han podido guardar las preferencias.");
      return false;
    }
    setPreferences(next);
    setMessage("Preferencias guardadas.");
    setTimeout(() => setMessage(null), 2500);
    return true;
  }

  async function enablePush() {
    if (!supported || !publicVapidKey) {
      setMessage("Las notificaciones push todavía no están configuradas en este entorno.");
      return;
    }

    setSaving(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("El navegador no ha concedido permiso para las notificaciones.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      if (!response.ok) throw new Error("No se ha podido registrar este dispositivo.");

      const next = { ...preferences, push_enabled: true };
      const result = await updateNotificationPreferences(next);
      if (!result.success) throw new Error(result.error || "No se han podido activar los avisos.");

      setPreferences(next);
      setSubscribed(true);
      setMessage("Notificaciones push activadas en este dispositivo.");
    } catch (error) {
      setMessage(getPushRegistrationError(error));
    } finally {
      setSaving(false);
    }
  }

  async function disablePush() {
    setSaving(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      const next = { ...preferences, push_enabled: false };
      await updateNotificationPreferences(next);
      setPreferences(next);
      setSubscribed(false);
      setMessage("Notificaciones push desactivadas en este dispositivo.");
    } finally {
      setSaving(false);
    }
  }

  async function testPush() {
    setTesting(true);
    setMessage("Enviando notificación de prueba...");
    const result = await sendTestNotification();
    setTesting(false);

    if (!result.success) {
      setMessage(result.error || "No se ha podido enviar la prueba.");
      return;
    }

    setMessage(
      result.pushStatus === "sent"
        ? "Prueba enviada. Deberías recibirla en este dispositivo."
        : "El aviso interno se creó, pero este dispositivo todavía no está recibiendo push.",
    );
  }

  const categories = [
    ["market_enabled", "Mercado", "Fichajes, cláusulas, pujas y ofertas"],
    ["gameweek_enabled", "Jornadas", "Inicio de jornada y revisión del quinteto"],
    ["social_enabled", "Social", "Solicitudes y actividad de amigos"],
    ["daily_reward_enabled", "Recompensa diaria", "Recordatorio del bono de 500.000 €"],
  ] as const;

  return (
    <section className="v-panel p-5 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase italic">Notificaciones push</h2>
          <p className="mt-1 text-xs text-v-white/50">
            Recibe avisos en este móvil u ordenador aunque no tengas la aplicación abierta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {subscribed && preferences.push_enabled && (
            <button
              type="button"
              disabled={saving || testing}
              onClick={testPush}
              className="border border-v-red/40 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-v-red transition-colors hover:bg-v-red/10 disabled:opacity-40"
            >
              {testing ? "Enviando..." : "Enviar prueba"}
            </button>
          )}
          <button
            type="button"
            disabled={saving || !supported}
            onClick={subscribed && preferences.push_enabled ? disablePush : enablePush}
            className="v-btn-primary !px-4 !py-2 !text-[10px] disabled:opacity-40"
          >
            {subscribed && preferences.push_enabled ? (
              <span className="flex items-center gap-2"><BellOff size={14} /> Desactivar</span>
            ) : (
              <span className="flex items-center gap-2"><BellRing size={14} /> Activar push</span>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {categories.map(([key, label, description]) => (
          <label key={key} className="flex cursor-pointer gap-3 border border-white/5 bg-white/[0.02] p-3">
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })}
              className="mt-0.5 accent-v-red"
            />
            <span>
              <span className="block text-[11px] font-black uppercase">{label}</span>
              <span className="mt-1 block text-[10px] leading-relaxed text-v-white/40">{description}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] text-v-white/50">
          {message || (!supported ? "Este navegador no admite notificaciones push." : "Los avisos internos siempre seguirán disponibles.")}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => persist(preferences)}
          className="flex shrink-0 items-center gap-2 text-[10px] font-black uppercase tracking-wider text-v-red disabled:opacity-40"
        >
          <Save size={13} /> Guardar
        </button>
      </div>
    </section>
  );
}

function getPushRegistrationError(error: unknown) {
  const fallback = "No se han podido activar los avisos.";
  const detail = error instanceof Error ? error.message : fallback;
  const normalized = detail.toLowerCase();

  if (!window.isSecureContext) {
    return "Las notificaciones push necesitan HTTPS o ejecutarse desde localhost.";
  }

  if (Notification.permission === "denied") {
    return "Las notificaciones están bloqueadas para esta web. Permítelas en los ajustes del sitio y vuelve a intentarlo.";
  }

  if ("brave" in navigator && normalized.includes("push service error")) {
    return "Brave no tiene disponible el servicio push. Activa «Usar los servicios de Google para mensajes push» en Ajustes > Privacidad y seguridad, reinicia Brave y vuelve a intentarlo.";
  }

  return detail;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}
