"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Share2 } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

type League = {
  id: string;
  name: string;
  inviteCode: string;
};

export default function InviteView({ leagues }: { leagues: League[] }) {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState(leagues[0]?.id || "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedId) || leagues[0] || null,
    [leagues, selectedId],
  );

  async function copyCode() {
    if (!selectedLeague) return;
    try {
      await navigator.clipboard.writeText(selectedLeague.inviteCode);
      setError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setError(t("community.copyFailed"));
    }
  }

  async function shareCode() {
    if (!selectedLeague) return;
    const text = t("community.shareText", {
      league: selectedLeague.name,
      code: selectedLeague.inviteCode,
    });

    if (navigator.share) {
      try {
        await navigator.share({ title: selectedLeague.name, text });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }

    await copyCode();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-6 sm:max-w-xl sm:px-6 lg:max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2">
        <Link href="/more" className="text-v-white/20 transition-colors hover:text-v-white" aria-label={t("community.backMore")}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-4xl leading-none italic uppercase">{t("community.inviteTitle")}</h1>
      </div>

      {selectedLeague ? (
        <div className="v-panel space-y-6 p-6 sm:p-8">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{t("community.inviteHeading")}</h2>
            <p className="mt-2 text-xs leading-relaxed text-v-white/50">{t("community.inviteDescription")}</p>
          </div>

          {leagues.length > 1 && (
            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-v-white/40">{t("community.selectLeague")}</span>
              <select
                value={selectedLeague.id}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setCopied(false);
                  setError(null);
                }}
                className="h-12 w-full border border-white/10 bg-v-gray/40 px-4 text-xs font-black uppercase outline-none focus:border-v-red/50"
              >
                {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </label>
          )}

          <div className="border border-white/10 bg-v-black/30 p-5 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-v-white/35">{t("community.invitationCode")}</p>
            <p className="mt-3 break-all text-2xl font-black italic uppercase tracking-[0.18em] text-v-red">{selectedLeague.inviteCode}</p>
            <p className="mt-2 truncate text-[10px] font-black uppercase text-v-white/40">{selectedLeague.name}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={copyCode} className="v-btn-primary flex items-center justify-center gap-2 py-4 text-[10px]">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? t("community.copied") : t("community.copyCode")}
            </button>
            <button type="button" onClick={shareCode} className="v-btn-secondary flex items-center justify-center gap-2 py-4 text-[10px]">
              <Share2 size={15} /> {t("community.share")}
            </button>
          </div>

          {copied && <p role="status" className="text-center text-[10px] text-emerald-400">{t("community.copiedDescription", { code: selectedLeague.inviteCode })}</p>}
          {error && <p role="alert" className="text-center text-[10px] text-v-red">{error}</p>}
        </div>
      ) : (
        <div className="v-panel p-8 text-center">
          <p className="text-sm text-v-white/50">{t("community.noLeagues")}</p>
          <Link href="/leagues" className="v-btn-primary mt-6 inline-flex px-6 py-3 text-[10px]">{t("community.createLeague")}</Link>
        </div>
      )}
    </div>
  );
}
