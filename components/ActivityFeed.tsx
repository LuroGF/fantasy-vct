"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowRightLeft,
  BadgeEuro,
  Gavel,
  LogIn,
  LogOut,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserRoundPlus,
} from "lucide-react";

import { useLocale } from "@/components/LocaleProvider";
import type { LeagueActivityEvent } from "@/lib/actions/activity";
import type { MessageKey } from "@/lib/i18n/messages";

type Filter = "all" | "league" | "market" | "transfers";

const leagueEvents = new Set(["league_created", "member_joined", "member_left"]);
const marketEvents = new Set(["player_sold", "market_operation"]);

function eventCategory(eventType: string): Exclude<Filter, "all"> {
  if (leagueEvents.has(eventType)) return "league";
  if (marketEvents.has(eventType)) return "market";
  return "transfers";
}

function eventStyle(eventType: string): {
  icon: ComponentType<{ className?: string }>;
  color: string;
} {
  switch (eventType) {
    case "league_created":
      return { icon: Trophy, color: "text-amber-300" };
    case "member_joined":
      return { icon: LogIn, color: "text-emerald-400" };
    case "member_left":
      return { icon: LogOut, color: "text-v-red" };
    case "release_clause":
      return { icon: BadgeEuro, color: "text-cyan-300" };
    case "trade":
    case "player_transfer":
      return { icon: ArrowRightLeft, color: "text-blue-300" };
    case "auction_won":
      return { icon: Gavel, color: "text-amber-300" };
    case "player_sold":
      return { icon: ShoppingBag, color: "text-v-red" };
    case "player_bought":
      return { icon: UserRoundPlus, color: "text-emerald-400" };
    default:
      return { icon: Sparkles, color: "text-v-white/50" };
  }
}

export function ActivityFeed({
  events,
  compact = false,
}: {
  events: LeagueActivityEvent[];
  compact?: boolean;
}) {
  const { locale, t } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");

  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }),
    [locale],
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  const visibleEvents = compact
    ? events
    : events.filter((event) => filter === "all" || eventCategory(event.eventType) === filter);

  function dateLabel(value: string) {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const key = date.toLocaleDateString("en-CA");
    if (key === today.toLocaleDateString("en-CA")) return t("activity.today");
    if (key === yesterday.toLocaleDateString("en-CA")) return t("activity.yesterday");
    return dateFormatter.format(date);
  }

  function eventMessage(event: LeagueActivityEvent) {
    const actor = event.actor?.username || t("activity.actorFallback");
    const target = event.target?.username || t("activity.actorFallback");
    const player = event.player?.nickname || t("activity.playerFallback");
    const amount = event.amount === null ? "—" : moneyFormatter.format(event.amount);
    let key: MessageKey;

    switch (event.eventType) {
      case "league_created": key = "activity.leagueCreated"; break;
      case "member_joined": key = "activity.memberJoined"; break;
      case "member_left": key = "activity.memberLeft"; break;
      case "player_bought": key = "activity.playerBought"; break;
      case "player_sold": key = "activity.playerSold"; break;
      case "release_clause": key = event.target ? "activity.releaseClauseFull" : "activity.releaseClause"; break;
      case "trade": key = event.target ? "activity.tradeFull" : "activity.trade"; break;
      case "auction_won": key = "activity.auctionWon"; break;
      case "player_transfer": key = event.target ? "activity.transferFull" : "activity.transfer"; break;
      default: key = "activity.marketOperation";
    }

    return t(key, { actor, target, player, amount });
  }

  const grouped = visibleEvents.reduce<Array<{ label: string; events: LeagueActivityEvent[] }>>(
    (groups, event) => {
      const label = dateLabel(event.createdAt);
      const last = groups.at(-1);
      if (last?.label === label) last.events.push(event);
      else groups.push({ label, events: [event] });
      return groups;
    },
    [],
  );

  return (
    <div className="space-y-5">
      {!compact ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "league", "market", "transfers"] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`shrink-0 border px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] transition ${
                filter === item
                  ? "border-v-red bg-v-red text-white"
                  : "border-white/10 bg-white/[0.03] text-v-white/40 hover:text-v-white"
              }`}
            >
              {t(`activity.filter${item[0].toUpperCase()}${item.slice(1)}` as MessageKey)}
            </button>
          ))}
        </div>
      ) : null}

      {visibleEvents.length === 0 ? (
        <div className="v-panel border-dashed py-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-v-white/30">
            {t("activity.empty")}
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.label} className="space-y-2">
            {!compact ? (
              <div className="flex items-center gap-3 px-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-v-white/35">
                  {group.label}
                </h2>
                <span className="h-px flex-1 bg-white/5" />
              </div>
            ) : null}

            <div className="space-y-2">
              {group.events.map((event) => {
                const style = eventStyle(event.eventType);
                const Icon = style.icon;
                const content = (
                  <>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center border border-white/5 bg-black/20 ${style.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-5 text-v-white/75 sm:text-sm">
                        {eventMessage(event)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.12em] text-v-white/25">
                        {event.player?.teamTag ? <span>{event.player.teamTag}</span> : null}
                        {event.player?.teamTag ? <span>·</span> : null}
                        <time dateTime={event.createdAt}>{timeFormatter.format(new Date(event.createdAt))}</time>
                      </div>
                    </div>
                  </>
                );

                return event.player ? (
                  <Link
                    key={event.id}
                    href={`/players/${event.player.id}?league=${event.leagueId}`}
                    aria-label={t("activity.viewPlayer", { player: event.player.nickname })}
                    className="v-panel flex items-center gap-3 p-3 transition hover:border-v-red/25 hover:bg-white/[0.04]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={event.id} className="v-panel flex items-center gap-3 p-3">
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
