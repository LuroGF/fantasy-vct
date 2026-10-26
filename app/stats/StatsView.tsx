"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Target, Trophy, Users } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type RelatedGameweek =
  | { name?: string | null }
  | { name?: string | null }[]
  | null;

type ScoreHistory = {
  gameweek_id: number;
  points_earned: number;
  rank_in_league?: number | null;
  gameweeks?: RelatedGameweek;
};

type LineupPlayer = {
  id: string;
  nickname: string;
  role?: string | null;
  photo_url?: string | null;
  gameweek_points: number;
  pro_teams?: { tag?: string | null; name?: string | null } | null;
};

type GameweekReward = {
  gameweek_id: number;
  rank_position: number;
  tied_participants: number;
  amount: number;
  paid_at: string;
  gameweeks?: RelatedGameweek;
};

type StatsViewProps = {
  selectedGameweek: { id: number; name: string; is_final: boolean } | null;
  scoreHistory: ScoreHistory[];
  lineup: LineupPlayer[];
  gameweekPoints: number;
  gameweekRank: number;
  totalPoints: number;
  totalRank: number;
  participantCount: number;
  leagueAverage: number;
  rewards: GameweekReward[];
};

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function relationName(value?: RelatedGameweek) {
  if (Array.isArray(value)) return value[0]?.name;
  return value?.name;
}

export default function StatsView({
  selectedGameweek,
  scoreHistory,
  lineup,
  gameweekPoints,
  gameweekRank,
  totalPoints,
  totalRank,
  participantCount,
  leagueAverage,
  rewards,
}: StatsViewProps) {
  const sortedLineup = useMemo(
    () => [...lineup].sort((a, b) => Number(b.gameweek_points) - Number(a.gameweek_points)),
    [lineup],
  );
  const bestPlayer = sortedLineup[0];
  const watchPlayer = sortedLineup.at(-1);
  const maxContribution = Math.max(
    1,
    ...sortedLineup.map((player) => Math.abs(Number(player.gameweek_points || 0))),
  );
  const currentHistoryIndex = scoreHistory.findIndex(
    (score) => score.gameweek_id === selectedGameweek?.id,
  );
  const previousPoints =
    currentHistoryIndex > 0
      ? Number(scoreHistory[currentHistoryIndex - 1]?.points_earned || 0)
      : null;
  const trend = previousPoints === null ? null : gameweekPoints - previousPoints;
  const averageDifference = gameweekPoints - leagueAverage;
  const totalRewards = rewards.reduce(
    (sum, reward) => sum + Number(reward.amount || 0),
    0,
  );

  const lineData = {
    labels: scoreHistory.map(
      (score) => relationName(score.gameweeks) || `J${score.gameweek_id}`,
    ),
    datasets: [
      {
        label: "Tus puntos",
        data: scoreHistory.map((score) => Number(score.points_earned || 0)),
        borderColor: "#D6B25E",
        backgroundColor: "rgba(214, 178, 94, 0.12)",
        tension: 0.3,
        pointBackgroundColor: "#0A0A0A",
        pointBorderColor: "#F0D58A",
        pointBorderWidth: 2,
        pointRadius: 4,
        fill: true,
      },
    ],
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "rgba(255,255,255,0.45)" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "rgba(255,255,255,0.45)", maxRotation: 0 },
      },
    },
    plugins: { legend: { display: false } },
  };

  const metrics = [
    {
      label: "Puntos de jornada",
      value: String(gameweekPoints),
      detail:
        trend === null
          ? selectedGameweek?.name || "Sin jornada"
          : `${trend >= 0 ? "+" : ""}${trend} respecto a la anterior`,
      icon: Target,
    },
    {
      label: "Posición de jornada",
      value: gameweekRank > 0 ? `#${gameweekRank}` : "—",
      detail: participantCount ? `de ${participantCount} entrenadores` : "Sin clasificación",
      icon: Trophy,
    },
    {
      label: "Media de la liga",
      value: leagueAverage.toFixed(1),
      detail: `${averageDifference >= 0 ? "+" : ""}${averageDifference.toFixed(1)} frente a la media`,
      icon: Users,
    },
    {
      label: "Clasificación total",
      value: totalRank > 0 ? `#${totalRank}` : "—",
      detail: `${totalPoints} puntos acumulados`,
      icon: Trophy,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="v-panel min-w-0 p-4">
            <div className="mb-4 flex items-center justify-between">
              <metric.icon size={16} className="text-v-red" />
              {metric.label === "Puntos de jornada" && trend !== null && (
                trend >= 0
                  ? <ArrowUpRight size={15} className="text-emerald-400" />
                  : <ArrowDownRight size={15} className="text-v-red" />
              )}
            </div>
            <p className="text-[9px] font-black uppercase tracking-wider text-v-white/35">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-black italic">{metric.value}</p>
            <p className="mt-2 truncate text-[9px] text-v-white/40">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="v-panel p-4 sm:p-5">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg uppercase">Evolución</h2>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-v-white/35">
              Puntos conseguidos en cada jornada
            </p>
          </div>
          <span className="text-[10px] font-black uppercase text-v-red">
            {scoreHistory.length} jornadas
          </span>
        </div>
        <div className="h-56 w-full">
          {scoreHistory.length > 0 ? (
            <Line data={lineData} options={lineOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-v-white/25">
              La gráfica aparecerá al terminar tu primera jornada.
            </div>
          )}
        </div>
      </section>

      <section className="v-panel p-4 sm:p-5">
        <div className="mb-5">
          <h2 className="text-lg uppercase">Aportación del quinteto</h2>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-v-white/35">
            Titulares guardados al comenzar {selectedGameweek?.name || "la jornada"}
          </p>
        </div>

        {sortedLineup.length > 0 ? (
          <div className="space-y-4">
            {sortedLineup.map((player, index) => {
              const points = Number(player.gameweek_points || 0);
              const width = Math.max(3, (Math.abs(points) / maxContribution) * 100);
              return (
                <div key={player.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center border border-white/10 text-[10px] font-black text-v-white/40">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black uppercase">{player.nickname}</p>
                        <p className="text-[9px] uppercase text-v-white/35">
                          {player.pro_teams?.tag || player.role || "Jugador"}
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden bg-white/5">
                      <div
                        className={`h-full ${points < 0 ? "bg-rose-500" : "bg-v-red"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                  <span className="min-w-12 text-right text-sm font-black italic text-v-red">
                    {points > 0 ? "+" : ""}{points}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-v-white/25">
            Todavía no existe un quinteto capturado para esta jornada.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="v-panel p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-v-white/35">
            Mejor aportación
          </p>
          <p className="mt-3 text-xl font-black uppercase italic">
            {bestPlayer?.nickname || "Sin datos"}
          </p>
          <p className="mt-2 text-sm font-black text-emerald-400">
            {bestPlayer ? `+${Number(bestPlayer.gameweek_points || 0)} puntos` : "—"}
          </p>
        </article>
        <article className="v-panel p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-v-white/35">
            Jugador a revisar
          </p>
          <p className="mt-3 text-xl font-black uppercase italic">
            {watchPlayer?.nickname || "Sin datos"}
          </p>
          <p className="mt-2 text-sm font-black text-v-red">
            {watchPlayer ? `${Number(watchPlayer.gameweek_points || 0)} puntos` : "—"}
          </p>
        </article>
      </section>

      <section className="v-panel p-4 sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg uppercase">Premios recibidos</h2>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-v-white/35">
              Ingresos por clasificación y participación
            </p>
          </div>
          <div className="flex items-center gap-2 text-v-red">
            <CircleDollarSign size={16} />
            <span className="text-sm font-black italic">{euroFormatter.format(totalRewards)}</span>
          </div>
        </div>

        {rewards.length > 0 ? (
          <div className="divide-y divide-white/5">
            {rewards.map((reward) => (
              <div key={`${reward.gameweek_id}-${reward.paid_at}`} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-[11px] font-black uppercase">
                    {relationName(reward.gameweeks) || `Jornada ${reward.gameweek_id}`}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-wider text-v-white/40">
                    {reward.rank_position <= 3
                      ? `${reward.rank_position}.º puesto${reward.tied_participants > 1 ? " · empate" : ""}`
                      : "Premio de participación"}
                  </p>
                </div>
                <span className="text-sm font-black text-v-red">
                  +{euroFormatter.format(Number(reward.amount))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-7 text-center text-xs text-v-white/25">
            Los premios aparecerán al liquidarse una jornada válida.
          </p>
        )}
      </section>
    </div>
  );
}
