"use client";

import { useEffect, useState } from "react";
import { getUnreadCount } from "@/lib/actions/notifications";

export function NotificationBadge({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      const unread = await getUnreadCount();
      setCount(unread);
    }
    fetchCount();
    
    // Optional: Poll every 30 seconds for "real-time" feel without Supabase Realtime complexity
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  if (variant === "row") {
    return (
      <span
        className="inline-flex min-w-6 items-center justify-center rounded-full bg-v-red px-1.5 py-1 text-[9px] font-black leading-none text-white shadow-[0_0_14px_rgba(255,70,85,0.35)]"
        aria-label={`${count} notificaciones sin leer`}
      >
        {count > 99 ? "99+" : count}
      </span>
    );
  }

  return (
    <div className="absolute -top-1 -right-1 w-4 h-4 bg-v-red rounded-full flex items-center justify-center border-2 border-v-navy animate-pulse pointer-events-none z-20">
      <span className="text-[8px] font-black text-white">{count > 9 ? "9+" : count}</span>
    </div>
  );
}
