"use client";

import { useState, useEffect, useRef } from "react";
import { payReleaseClause } from "@/lib/actions/market";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "next/navigation";
import { getLeagueClassification } from "@/lib/actions/leagues";
import { getTeamLogo } from "@/lib/vlr-shared";
import { sileo } from "sileo";
import Image from "next/image";
import { useLocale } from "@/components/LocaleProvider";
import { translatePlayerRole } from "@/lib/i18n/player";

interface RankingViewProps {
  initialStandings: any[];
  initialLocks: string[];
  profileId: string;
  initialLeagues: any[];
  initialLeagueId: string;
}

export function RankingView({
  initialStandings,
  initialLocks,
  profileId,
  initialLeagues,
  initialLeagueId,
}: RankingViewProps) {
  const { locale, t } = useLocale();
  const numberLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "es-ES";
  const money = (value: number) => new Intl.NumberFormat(numberLocale, {
    style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1,
  }).format(value);
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagueId);
  const [standings, setStandings] = useState(initialStandings);
  const [activeLocks, setActiveLocks] = useState(initialLocks);

  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmPay, setConfirmPay] = useState<{ player: any } | null>(null);
  const router = useRouter();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    async function loadClassification() {
      setLoading(true);
      try {
        const { standings: newStandings, activeLocks: newLocks } =
          await getLeagueClassification(activeLeagueId);
        setStandings(newStandings);
        setActiveLocks(newLocks);
      } catch (error) {
        console.error("Error loading classification:", error);
        sileo.error({
          title: t("ranking.loadingError"),
          description: t("ranking.updateError"),
        });
      }
      setLoading(false);
    }

    loadClassification();
  }, [activeLeagueId, t]);

  const isPlayerLocked = (playerId: string) => {
    return activeLocks.includes(playerId);
  };

  const handlePayClause = async (player: any) => {
    if (!activeLeagueId || !profileId || !selectedTeam) return;

    setConfirmPay(null);
    setLoading(true);

    try {
      const res = await sileo.promise(
        payReleaseClause(player.roster_id, profileId),
        {
          loading: {
            title: t("ranking.executing"),
          },
          success: (res) => {
            if (!res.success) {
              throw new Error(res.error || t("ranking.clauseError"));
            }

            return {
              title: t("ranking.clauseDone"),
              description: t("ranking.signed", { player: player.nickname }),
            };
          },
          error: (err) => {
            haptic.error();
            return {
              title: t("ranking.clauseError"),
              description:
                err instanceof Error ? err.message : t("ranking.unexpectedError"),
            };
          },
        },
      );

      if (!res.success) return;

      haptic.success();
      setSelectedTeam(null);

      const { standings: newStandings, activeLocks: newLocks } =
        await getLeagueClassification(activeLeagueId);

      setStandings(newStandings);
      setActiveLocks(newLocks);

      router.refresh();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6">
      {/* League Selector */}
      <div className="v-panel p-4 space-y-2">
        <label className="text-[8px] font-black uppercase text-v-white/40 ml-1 tracking-[0.2em]">
          {t("ranking.viewingLeague")}:
        </label>
        <select
          value={activeLeagueId}
          onChange={(e) => setActiveLeagueId(e.target.value)}
          className="w-full bg-v-navy/50 border border-white/10 px-4 py-2 text-xs font-black italic focus:border-v-red outline-none transition-colors"
        >
          {initialLeagues.map((l) => (
            <option
              key={l.league_id || l.leagues?.id}
              value={l.league_id || l.leagues?.id}
            >
              {l.leagues?.name || l.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`v-panel p-4 transition-opacity duration-300 ${
          loading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-v-white/50">
            {t("ranking.liveStandings")}
          </span>
          <div className="h-2 w-2 rounded-full bg-v-red animate-pulse" />
        </div>
        <div className="grid gap-2">
          {standings.map((row: any, index: number) => (
            <div
              key={row.profile_id}
              onClick={() =>
                row.profile_id !== profileId && setSelectedTeam(row)
              }
              className={`flex items-center justify-between p-3 border-l-2 transition-all cursor-pointer ${
                index === 0
                  ? "bg-v-red/10 border-v-red hover:bg-v-red/20"
                  : "bg-v-white/5 border-v-white/10 hover:bg-v-white/10"
              } ${row.profile_id === profileId ? "ring-1 ring-inset ring-v-white/20" : ""}`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`text-xl font-black italic ${
                    index === 0 ? "text-v-red" : "text-v-white/40"
                  }`}
                >
                  #{(index + 1).toString().padStart(2, "0")}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-black uppercase tracking-wider italic ${
                        row.profile_id === profileId
                          ? "text-v-red"
                          : "text-v-white"
                      }`}
                    >
                      {row.profiles.username}
                      {row.profile_id === profileId && ` (${t("ranking.you")})`}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1 overflow-hidden">
                    {row.roster?.slice(0, 5).map((p: any) => {
                      const locked = isPlayerLocked(p.id);
                      return (
                        <span
                          key={p.id}
                          className={`text-[7px] px-1.5 py-0.5 font-black uppercase italic border ${
                            locked
                              ? "border-v-red/50 bg-v-red/10 text-v-red"
                              : "border-v-white/10 bg-v-white/5 text-v-white/40"
                          } rounded-sm whitespace-nowrap pr-2`}
                        >
                          {locked && "🛡️ "}
                          {p.nickname}
                        </span>
                      );
                    })}
                    {row.roster?.length > 5 && (
                      <span className="text-[7px] text-v-white/20 font-black flex items-center">
                        +{row.roster.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black italic">
                  {row.total_points}
                </span>
                <span className="text-[10px] font-black uppercase text-v-white/20 ml-1 italic">
                  {t("ranking.points")}
                </span>
              </div>
            </div>
          ))}
          {standings.length === 0 && (
            <div className="py-10 text-center opacity-30 italic text-xs font-black uppercase">
              {t("ranking.noParticipants")}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Escuadra */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="v-panel max-w-lg w-full max-h-[80vh] overflow-y-auto flex flex-col p-6 gap-6 scrollbar-hide">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic uppercase leading-none">
                  {t("ranking.teamOf", { coach: selectedTeam.profiles.username })}
                </h2>
                <p className="text-[8px] uppercase tracking-widest text-v-red font-black mt-1">
                  {t("ranking.marketIntel")}
                </p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="v-btn-secondary px-3 py-1 text-[8px]"
              >
                {t("ranking.close")}
              </button>
            </div>

            <div className="grid gap-2">
              {selectedTeam.roster?.map((player: any) => {
                const locked = isPlayerLocked(player.id);
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 border-l-2 transition-all ${
                      locked
                        ? "bg-v-red/5 border-v-red/40"
                        : "bg-v-white/5 border-v-white/10"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase italic tracking-wider flex items-center gap-2 pr-2">
                        {player.nickname}
                        {locked && (
                          <span className="text-[8px] bg-v-red text-v-white px-1 leading-tight py-0.5 shrink-0">
                            🛡️ {t("ranking.protected")}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        {(() => {
                          const logo = getTeamLogo(player.pro_teams?.tag);
                          return logo ? (
                            <Image
                              src={logo}
                              alt={player.pro_teams?.tag || ""}
                              width={16}
                              height={16}
                              className="w-4 h-4 object-contain"
                            />
                          ) : null;
                        })()}
                        <span className="text-[9px] text-v-white/40 font-bold uppercase tracking-widest leading-none">
                          {translatePlayerRole(player.role, t)} {"//"} {player.pro_teams?.tag || "FA"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="shrink-0">
                        <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest">
                          {t("ranking.releaseClause")}
                        </p>
                        <p className="text-sm font-black italic text-v-white">
                          {money(Number(player.release_clause || 0))}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmPay({ player })}
                        disabled={loading || locked}
                        className={`px-4 py-2 text-[10px] font-black uppercase italic tracking-wider transition-all ${
                          locked
                            ? "bg-v-white/5 text-v-white/20 cursor-not-allowed"
                            : "bg-v-white text-v-navy hover:bg-v-red hover:text-v-white"
                        }`}
                      >
                        {locked ? t("ranking.protected") : t("ranking.sign")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de Pago */}
      {confirmPay && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="v-panel max-w-xs w-full p-6 text-center space-y-6 border-t-4 border-v-red">
            <div className="space-y-2 text-center">
              <p className="text-[10px] font-black uppercase text-v-red tracking-[0.3em]">
                {t("ranking.confirmation")}
              </p>
              <h3 className="text-xl font-black italic uppercase leading-tight">
                {t("ranking.executeClause")}
              </h3>
              <p className="text-xs text-v-white/60">
                {t("ranking.payClause", {
                  amount: money(Number(confirmPay.player.release_clause || 0)),
                  player: confirmPay.player.nickname,
                })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handlePayClause(confirmPay.player)}
                disabled={loading}
                className="w-full cursor-pointer py-4 bg-v-white text-v-navy text-[10px] font-black uppercase tracking-[0.2em] hover:bg-v-red hover:text-v-white transition-all italic shadow-xl shadow-v-red/10"
              >
                {t("ranking.authorizePayment")}
              </button>
              <button
                onClick={() => setConfirmPay(null)}
                className="w-full py-2 text-[8px] cursor-pointer font-black uppercase text-v-white/20 hover:text-v-white transition-colors tracking-widest"
              >
                {t("ranking.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
