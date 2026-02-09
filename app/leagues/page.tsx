"use client";
import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { createLeague, joinLeague, getUserLeagues } from "@/lib/actions/leagues";
import { getSession } from "@/lib/actions/auth";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import LeagueDetails from "@/components/LeagueDetails";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
      const data = await getUserLeagues(session.user.id);
      setLeagues(data);
      setLoading(false);
    }
    init();
  }, [router]);

  async function loadLeagues() {
    if (!userId) return;
    setLoading(true);
    const data = await getUserLeagues(userId);
    setLeagues(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newLeagueName || !userId) return;
    const res = await createLeague(newLeagueName, userId);
    if (res.success) {
      setStatus({ type: "success", message: "¡Liga creada con éxito!" });
      setNewLeagueName("");
      setShowCreate(false);
      loadLeagues();
    } else {
      setStatus({ type: "error", message: "Error al crear la liga" });
    }
  }

  async function handleJoin() {
    if (!inviteCode || !userId) return;
    const res = await joinLeague(inviteCode, userId);
    if (res.success) {
      setStatus({ type: "success", message: "¡Te has unido a la liga!" });
      setInviteCode("");
      setShowJoin(false);
      loadLeagues();
    } else {
      setStatus({ type: "error", message: typeof res.error === 'string' ? res.error : "Error al unirse" });
    }
  }

  return (
    <ClientRefreshWrapper>
      <div className="flex flex-col gap-6 animate-in fade-in duration-700">
        <div className="flex items-end justify-between px-1 shrink-0">
          <div>
            <h1 className="text-4xl leading-none italic uppercase">Ligas</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red mt-1">Gestión de Divisiones VCF</p>
          </div>
          <StatusBadge label="S3-ACTIVE" variant="red" />
        </div>

        {selectedLeagueId ? (
          <LeagueDetails 
              leagueId={selectedLeagueId} 
              onBack={() => setSelectedLeagueId(null)} 
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <button 
                onClick={() => { setShowCreate(true); setShowJoin(false); }}
                className="v-btn-primary py-4 text-[10px] shadow-lg shadow-v-red/10 active:scale-95 transition-all"
              >
                Crear División
              </button>
              <button 
                onClick={() => { setShowJoin(true); setShowCreate(false); }}
                className="v-btn-secondary py-4 text-[10px] active:scale-95 transition-all"
              >
                Unirse a Código
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showCreate && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="v-panel p-4 space-y-4 border-v-red">
                    <h3 className="text-xl italic">Fundar Nueva Liga</h3>
                    <input 
                      type="text" 
                      placeholder="NOMBRE DE LA LIGA..."
                      value={newLeagueName}
                      onChange={(e) => setNewLeagueName(e.target.value)}
                      className="w-full bg-v-navy border border-white/10 px-4 py-3 text-[10px] font-black tracking-widest focus:border-v-red outline-none transition-colors"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleCreate} className="v-btn-primary flex-1 py-2 text-[10px]">Confirmar Fundación</button>
                      <button onClick={() => setShowCreate(false)} className="v-btn-secondary px-4 text-[10px]">X</button>
                    </div>
                  </div>
                </motion.div>
              )}

              {showJoin && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="v-panel p-4 space-y-4 border-v-red">
                    <h3 className="text-xl italic">Introducir Código de Invitación</h3>
                    <input 
                      type="text" 
                      placeholder="EJ: XJ92LK..."
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full bg-v-navy border border-white/10 px-4 py-3 text-[10px] font-black tracking-widest focus:border-v-red outline-none transition-colors uppercase"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleJoin} className="v-btn-primary flex-1 py-2 text-[10px]">Sincronizar Acceso</button>
                      <button onClick={() => setShowJoin(false)} className="v-btn-secondary px-4 text-[10px]">X</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {status.message && (
              <div className={`text-[10px] font-black uppercase text-center p-2 tracking-widest animate-pulse ${status.type === 'error' ? 'text-v-red' : 'text-v-white'}`}>
                 {">>>"} {status.message}
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-2xl italic tracking-tighter px-1">Tus Divisiones Operativas</h2>
              
              {loading ? (
                <div className="p-12 text-center opacity-20 animate-pulse">
                  <p className="text-[10px] font-black tracking-[0.5em] uppercase">Cargando Datos...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {leagues.map((ul: any) => (
                    <div 
                      key={ul.leagues.id} 
                      onClick={() => setSelectedLeagueId(ul.leagues.id)}
                      className="v-panel relative overflow-hidden group hover:border-v-red transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <div className="absolute top-0 right-0 w-24 h-full bg-linear-to-l from-v-red/5 to-transparent pointer-events-none" />
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl italic tracking-tighter group-hover:text-v-red transition-colors">{ul.leagues.name}</h3>
                          <p className="text-[10px] font-black uppercase text-v-white/30 tracking-widest mt-1">CÓDIGO: {ul.leagues.invite_code}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-black uppercase text-v-white/20">Posición</p>
                           <p className="text-lg font-black italic">RANK #--</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-v-white/30">Puntos</p>
                          <p className="text-lg font-black italic">{ul.total_points}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-v-white/30">Créditos</p>
                          <p className="text-lg font-black italic border-b border-v-red/20 w-fit">${(ul.current_budget / 1000000).toFixed(1)}M</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {leagues.length === 0 && (
                    <div className="v-panel border-white/5 text-center py-12 opacity-40 italic">
                      No perteneces a ninguna liga todavía. 
                      <br /><span className="text-[8px] uppercase font-black not-italic mt-2 block">Inicia una nueva operación arriba</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ClientRefreshWrapper>
  );
}
