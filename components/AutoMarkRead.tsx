"use client";

import { useEffect } from "react";
import { markAllAsRead } from "@/lib/actions/notifications";

export function AutoMarkRead() {
  useEffect(() => {
    // We wait a bit to ensure the user actually "saw" the list
    const timer = setTimeout(async () => {
      await markAllAsRead();
    }, 2000); 

    return () => clearTimeout(timer);
  }, []);

  return null;
}
