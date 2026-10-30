"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/admin/access";

type SyncKind = "matches" | "stats";

async function requestOrigin() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "")
    .split(",")[0]
    .trim();
  const protocol = (requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https"))
    .split(",")[0]
    .trim();

  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || null;
}

export async function runVlrSync(kind: SyncKind) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return { success: false, error: "No tienes permisos para ejecutar esta operación." };
  }

  const secret = process.env.CRON_SECRET;
  const origin = await requestOrigin();
  if (!secret || !origin) {
    console.error("Manual VLR sync is missing CRON_SECRET or application origin");
    return { success: false, error: "La sincronización manual no está configurada." };
  }

  const path = kind === "matches" ? "sync-vlr-matches" : "sync-vlr-stats";

  try {
    const response = await fetch(`${origin}/api/admin/${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Manual VLR ${kind} sync failed with status ${response.status}`);
      return { success: false, error: "La sincronización no se ha podido completar." };
    }

    revalidatePath("/more/operations");
    return {
      success: true,
      message:
        kind === "matches"
          ? "Sincronización de partidos completada."
          : "Sincronización de estadísticas completada.",
    };
  } catch (error) {
    console.error(`Manual VLR ${kind} sync failed:`, error);
    return { success: false, error: "La sincronización no se ha podido completar." };
  }
}
