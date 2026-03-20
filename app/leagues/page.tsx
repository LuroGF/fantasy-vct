"use client";
import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  createLeague,
  joinLeague,
  getUserLeagues,
} from "@/lib/actions/leagues";
import { getSession } from "@/lib/actions/auth";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/utils/haptics";
import LeagueDetails from "@/components/LeagueDetails";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";
import { sileo } from "sileo";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const router = useRouter();

  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

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

    setConfirmDialog({
      show: true,
      title: "Crear liga",
      message: `¿Confirmar creación de liga: ${newLeagueName}?`,
      onConfirm: async () => {
        setLoading(true);
        haptic.medium();

        const res = await createLeague(newLeagueName, userId);

        if (res.success) {
          haptic.success();
          sileo.success({
            title: "Liga creada",
            description: "¡La liga se ha creado con éxito!",
          });
          setNewLeagueName("");
          setShowCreate(false);
          await loadLeagues();
          document
            .querySelector("main")
            ?.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          haptic.error();
          sileo.error({
            title: "Error al crear la liga",
            description:
              typeof res.error === "string"
                ? res.error
                : "No se pudo crear la liga",
          });
        }

        setLoading(false);
      },
    });
  }

  async function handleJoin() {
    if (!inviteCode || !userId) return;

    setConfirmDialog({
      show: true,
      title: "Unirse a la liga",
      message: `¿Unirse a la liga con código: ${inviteCode}?`,
      onConfirm: async () => {
        setLoading(true);
        haptic.medium();

        const res = await joinLeague(inviteCode, userId);

        if (res.success) {
          haptic.success();
          sileo.success({
            title: "Te has unido a la liga",
            description: "Acceso concedido correctamente",
          });
          setInviteCode("");
          setShowJoin(false);
          await loadLeagues();
          document
            .querySelector("main")
            ?.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          haptic.error();
          sileo.error({
            title: "Error al unirse",
            description:
              typeof res.error === "string"
                ? res.error
                : "No se pudo unir a la liga",
          });
        }

        setLoading(false);
      },
    });
  }

  function closeConfirmDialog() {
    setConfirmDialog({
      show: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  }

  return (
    <ClientRefreshWrapper>
      <div
        className="
  mx-auto
  w-full
  max-w-md sm:max-w-xl lg:max-w-4xl
  px-4 sm:px-6
  flex flex-col gap-8
  animate-in fade-in slide-in-from-bottom-4 duration-700 py-6
"
      >
        <div className="flex items-end justify-between px-1 shrink-0">
          <div>
            <h1 className="text-4xl leading-none italic uppercase">Ligas</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red mt-1">
              Gestión de Ligas VCF
            </p>
          </div>
          <StatusBadge label="S3-ACTIVE" variant="red" />
        </div>

        {selectedLeagueId ? (
          <LeagueDetails
            leagueId={selectedLeagueId}
            inviteCode={
              leagues.find((l) => l.leagues.id === selectedLeagueId)?.leagues
                .invite_code || ""
            }
            leagueName={
              leagues.find((l) => l.leagues.id === selectedLeagueId)?.leagues
                .name || ""
            }
            onBack={() => setSelectedLeagueId(null)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <button
                onClick={() => {
                  setShowCreate(true);
                  setShowJoin(false);
                }}
                className="v-btn-primary py-4 text-[10px] cursor-pointer shadow-lg shadow-v-red/10 active:scale-95 transition-all"
              >
                Crear Liga
              </button>
              <button
                onClick={() => {
                  setShowJoin(true);
                  setShowCreate(false);
                }}
                className="v-btn-secondary py-4 text-[10px] cursor-pointer active:scale-95 transition-all"
              >
                Unirse con Código
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
                    <h3 className="text-xl italic">Crear Nueva Liga</h3>
                    <input
                      type="text"
                      placeholder="NOMBRE DE LA LIGA..."
                      value={newLeagueName}
                      onChange={(e) => setNewLeagueName(e.target.value)}
                      className="w-full bg-v-navy border border-white/10 px-4 py-3 text-[10px] font-black tracking-widest focus:border-v-red outline-none transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="v-btn-primary cursor-pointer flex-1 py-2 text-[10px] disabled:opacity-50"
                      >
                        Crear liga
                      </button>
                      <button
                        onClick={() => setShowCreate(false)}
                        disabled={loading}
                        className="v-btn-secondary px-4 text-[10px] disabled:opacity-50"
                      >
                        X
                      </button>
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
                    <h3 className="text-xl italic">
                      Introducir Código de Invitación
                    </h3>
                    <input
                      type="text"
                      placeholder="EJ: XJ92LK..."
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full bg-v-navy border border-white/10 px-4 py-3 text-[10px] font-black tracking-widest focus:border-v-red outline-none transition-colors uppercase"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleJoin}
                        disabled={loading}
                        className="v-btn-primary cursor-pointer flex-1 py-2 text-[10px] disabled:opacity-50"
                      >
                        Unirse a liga
                      </button>
                      <button
                        onClick={() => setShowJoin(false)}
                        disabled={loading}
                        className="v-btn-secondary cursor-pointer px-4 text-[10px] disabled:opacity-50"
                      >
                        X
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <h2 className="text-2xl italic tracking-tighter px-1">
                Tus ligas activas
              </h2>

              {loading ? (
                <div className="p-12 text-center opacity-20 animate-pulse">
                  <p className="text-[10px] font-black tracking-[0.5em] uppercase">
                    Cargando Datos...
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {leagues.map((ul: any) => (
                    <div
                      key={ul.leagues.id}
                      onClick={() => setSelectedLeagueId(ul.leagues.id)}
                      className="v-panel relative overflow-hidden group hover:border-v-red transition-all cursor-pointer active:scale-[0.98] select-none flex flex-col gap-4"
                    >
                      <div className="absolute top-0 right-0 w-48 h-full bg-linear-to-l from-v-red/5 to-transparent pointer-events-none" />
                      <div className="absolute -right-2 -bottom-4 text-7xl font-black text-white/5 italic select-none group-hover:text-v-red/5 transition-colors uppercase leading-none pointer-events-none">
                        {ul.leagues.name.substring(0, 3)}
                      </div>

                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[7px] font-black uppercase text-v-red tracking-[0.2em]">
                              Código de liga: {ul.leagues.invite_code}
                            </span>
                            <div className="h-px bg-v-red/20 flex-1" />
                          </div>
                          <h3 className="text-2xl italic tracking-tighter group-hover:text-v-red transition-colors truncate max-w-full">
                            {ul.leagues.name}
                          </h3>
                        </div>
                        <div className="shrink-0 flex flex-col items-end">
                          <div className="bg-v-red/10 border border-v-red/20 px-2 py-0.5">
                            <span className="text-[7px] font-black text-v-red uppercase tracking-widest italic">
                              Rank #--
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 relative z-10 group-hover:border-v-red/10 transition-colors">
                        <div>
                          <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-v-white/20" />
                            Puntos
                          </p>
                          <p className="text-xl font-black italic mt-1">
                            {ul.total_points}
                          </p>
                        </div>
                        <div className="text-right border-l border-white/5 pl-4">
                          <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest flex items-center justify-end gap-1.5">
                            Créditos
                            <span className="w-1 h-1 bg-v-red/40" />
                          </p>
                          <p className="text-xl font-black italic text-v-red mt-1">
                            {(ul.current_budget / 1000000).toFixed(1)}M VP
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {leagues.length === 0 && (
                    <div className="v-panel border-white/5 text-center py-12 opacity-40 italic">
                      No perteneces a ninguna liga todavía.
                      <br />
                      <span className="text-[8px] uppercase font-black not-italic mt-2 block">
                        Debes crear o unirte a una liga para ver tus ligas
                        activas
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmDialog.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-v-navy/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-xs p-6 space-y-6 border-t-4 border-v-white animate-in zoom-in-95 duration-200">
            <div className="space-y-2 text-center">
              <p className="text-[10px] font-black uppercase text-v-red tracking-[0.3em]">
                Confirmación
              </p>
              <h3 className="text-xl font-black italic uppercase leading-tight tracking-wider">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-v-white/60 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  if (confirmDialog.onConfirm) {
                    await confirmDialog.onConfirm();
                  }
                  closeConfirmDialog();
                }}
                disabled={loading}
                className="w-full py-4 cursor-pointer bg-v-white text-v-navy text-[10px] font-black uppercase tracking-[0.2em] hover:bg-v-red hover:text-v-white transition-all italic shadow-xl shadow-v-red/10 disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Realizar acción"}
              </button>

              <button
                onClick={closeConfirmDialog}
                disabled={loading}
                className="w-full py-2 cursor-pointer text-[8px] font-black uppercase text-v-white/20 hover:text-v-white transition-colors tracking-widest disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientRefreshWrapper>
  );
}
