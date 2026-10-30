"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { sileo } from "sileo";

import { runVlrSync } from "@/lib/actions/admin-operations";

type SyncKind = "matches" | "stats";

export function SyncControls() {
  const router = useRouter();
  const [pendingKind, setPendingKind] = useState<SyncKind | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(kind: SyncKind) {
    setPendingKind(kind);
    startTransition(async () => {
      const result = await runVlrSync(kind);
      if (result.success) {
        sileo.success({ title: result.message || "Sincronización completada" });
        router.refresh();
      } else {
        sileo.error({
          title: "No se pudo sincronizar",
          description: result.error || "Inténtalo de nuevo.",
        });
      }
      setPendingKind(null);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => run("matches")}
        className="v-btn-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-40"
      >
        <RefreshCw className={`h-4 w-4 ${pendingKind === "matches" ? "animate-spin" : ""}`} />
        {pendingKind === "matches" ? "Sincronizando…" : "Reintentar partidos"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run("stats")}
        className="v-btn-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-40"
      >
        <RefreshCw className={`h-4 w-4 ${pendingKind === "stats" ? "animate-spin" : ""}`} />
        {pendingKind === "stats" ? "Sincronizando…" : "Reintentar estadísticas"}
      </button>
    </div>
  );
}
