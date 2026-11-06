"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { sileo } from "sileo";

import { runVlrSync } from "@/lib/actions/admin-operations";
import { useLocale } from "@/components/LocaleProvider";

type SyncKind = "matches" | "stats";

export function SyncControls() {
  const { t } = useLocale();
  const router = useRouter();
  const [pendingKind, setPendingKind] = useState<SyncKind | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(kind: SyncKind) {
    setPendingKind(kind);
    startTransition(async () => {
      const result = await runVlrSync(kind);
      if (result.success) {
        sileo.success({ title: result.message || t("operations.syncComplete") });
        router.refresh();
      } else {
        sileo.error({
          title: t("operations.syncFailed"),
          description: result.error || t("operations.tryAgain"),
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
        {pendingKind === "matches" ? t("operations.syncing") : t("operations.retryMatches")}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run("stats")}
        className="v-btn-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-40"
      >
        <RefreshCw className={`h-4 w-4 ${pendingKind === "stats" ? "animate-spin" : ""}`} />
        {pendingKind === "stats" ? t("operations.syncing") : t("operations.retryStats")}
      </button>
    </div>
  );
}
