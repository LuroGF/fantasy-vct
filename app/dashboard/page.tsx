import Link from "next/link";
import { headers } from "next/headers";

type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: { time: string; teams: string; event: string }[];
  scoring: { label: string; value: string }[];
};

const fallbackData: VlrPayload = {
  stats: [
    { label: "Active leagues", value: "128" },
    { label: "Weekly managers", value: "4.2k" },
    { label: "Matches tracked", value: "312" },
  ],
  upcomingMatches: [
    { time: "14:00", teams: "FNATIC vs NAVI", event: "VCT EMEA" },
    { time: "17:30", teams: "LOUD vs LEV", event: "VCT Americas" },
    { time: "20:00", teams: "PRX vs DRX", event: "VCT Pacific" },
  ],
  scoring: [
    { label: "Kill", value: "+2" },
    { label: "Assist", value: "+1" },
    { label: "First blood", value: "+3" },
    { label: "Clutch round", value: "+4" },
    { label: "Match win", value: "+5" },
    { label: "Series MVP", value: "+6" },
  ],
};

import { supabase } from "@/lib/supabase";

async function getDashboardStats() {
  const { count: playerCount } = await supabase.from('pro_players').select('*', { count: 'exact', head: true });
  const { count: teamCount } = await supabase.from('pro_teams').select('*', { count: 'exact', head: true });

  return {
    playerCount: playerCount || 0,
    teamCount: teamCount || 0,
    leagueCount: 128 // Mock for now
  };
}

async function getVlrData(): Promise<VlrPayload> {
  try {
    const headersList = headers();
    const host = (await headersList).get("host");
    const protocol = (await headersList).get("x-forwarded-proto") ?? "http";
    const baseUrl = host !== null ? `${protocol}://${host}` : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/vlr`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) throw new Error("VLR API error");
    return (await response.json()) as VlrPayload;
  } catch (error) {
    return fallbackData;
  }
}

export default async function DashboardPage() {
  const data = await getVlrData();
  const stats = await getDashboardStats();
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-v-red animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/50">Sistema Operativo VCF</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest bg-v-white/5 px-2 py-0.5 border border-white/5">Versión 1.0.4-B</span>
      </div>

      {/* Real-time DB Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="v-panel p-2 py-3 border-l-v-white/20">
          <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1">Jugadores</p>
          <p className="text-xl font-black italic leading-none">{stats.playerCount}</p>
        </div>
        <div className="v-panel p-2 py-3 border-l-v-white/20">
          <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1">Equipos T1</p>
          <p className="text-xl font-black italic leading-none">{stats.teamCount}</p>
        </div>
        <div className="v-panel p-2 py-3 border-l-v-white/20">
          <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1">Ligas Activas</p>
          <p className="text-xl font-black italic leading-none">{stats.leagueCount}</p>
        </div>
      </div>

      {/* Main Stats / My Leagues */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h1 className="text-4xl leading-none">Mis Ligas</h1>
          <span className="text-[10px] font-black uppercase text-v-red italic">Temporada 2026</span>
        </div>
        
        <div className="v-panel relative overflow-hidden group hover:border-v-red transition-all cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-v-red/5 to-transparent pointer-events-none" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl italic tracking-tighter">Ministros</h3>
              <p className="text-[10px] font-black uppercase text-v-red tracking-widest">Liga Privada // Activa</p>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-v-white/5 border border-white/5 text-v-red font-black group-hover:bg-v-red group-hover:text-white transition-colors">+</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
            <div>
              <p className="text-[10px] font-black uppercase text-v-white/30">Puntos</p>
              <p className="text-lg font-black italic">1,240 <span className="text-v-red text-[8px] not-italic">#402 Global</span></p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-v-white/30">Presupuesto</p>
              <p className="text-lg font-black italic">$100.0M</p>
            </div>
          </div>
        </div>

        <Link href="/team" className="v-btn-primary w-full shadow-lg shadow-v-red/10">
          Gestionar Escuadra
        </Link>
      </div>

      {/* Upcoming Matches */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl italic tracking-tighter">Próximos Encuentros</h2>
          <Link href="/ranking" className="text-[10px] font-black uppercase text-v-red hover:underline mb-1">Ver Calendario</Link>
        </div>
        <div className="grid gap-3">
          {data.upcomingMatches.map((match) => (
            <div key={match.teams} className="bg-v-gray/50 border-l-2 border-v-red p-3 flex items-center justify-between group hover:bg-v-gray transition-colors">
              <div className="flex-1 text-sm font-black uppercase italic tracking-tighter">{match.teams.split(" vs ")[0]}</div>
              <div className="flex flex-col items-center px-4 border-x border-white/5 min-w-[80px]">
                <span className="text-xs font-black text-v-red">{match.time}</span>
                <span className="text-[8px] font-black uppercase text-v-white/30">HOY</span>
              </div>
              <div className="flex-1 text-sm font-black uppercase italic tracking-tighter text-right">{match.teams.split(" vs ")[1] ?? "TBD"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Promotions / Info */}
      <div className="grid gap-4">
        <div className="v-panel p-4 border-l-v-white/10 overflow-hidden relative group cursor-pointer">
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg width="100" height="100" viewBox="0 0 100 100"><path d="M10 90 L90 10 M50 90 L90 50" stroke="white" strokeWidth="2" fill="none" /></svg>
          </div>
          <h4 className="text-xl italic mb-2">Solo Yo</h4>
          <p className="text-xs text-v-white/40 leading-relaxed font-medium">
            Entra en el matchmaking global y compite contra los mejores estrategas del mundo en ligas públicas.
          </p>
        </div>
        <div className="v-panel p-4 border-l-v-white/10 overflow-hidden relative group cursor-pointer">
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity rotate-180">
            <svg width="100" height="100" viewBox="0 0 100 100"><path d="M10 90 L90 10 M50 90 L90 50" stroke="white" strokeWidth="2" fill="none" /></svg>
          </div>
          <h4 className="text-xl italic mb-2">Con Amigos</h4>
          <p className="text-xs text-v-white/40 leading-relaxed font-medium">
            La gloria es mejor compartida. Crea tu propia división y pon a prueba quién de tus amigos sabe más del VCT.
          </p>
        </div>
      </div>
    </div>

  );
}
