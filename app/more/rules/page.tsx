"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Role = "Duelista" | "Centinela" | "Iniciador" | "Controlador";

export default function RulesPage() {
  const [selectedRole, setSelectedRole] = useState<Role>("Duelista");

  // Reglas por rol (las del switch)
  const roleRules: Record<Role, { label: string; points: string }[]> = {
    Duelista: [
      { label: "Por cada kill", points: "+1 pt" },
      { label: "Por cada asistencia", points: "+0.5 pts" },
      { label: "Por cada Primera Sangre (FB)", points: "+5 pts" },
      { label: "Por cada Primera Muerte (FD)", points: "-3 pts" },
      { label: "Por cada muerte", points: "-1 pt" },
      { label: "Si kills ≥ 45", points: "+10 pts extra" },
      { label: "Si es MVP", points: "+5 pts" },
    ],
    Centinela: [
      { label: "Por cada kill", points: "+2 pts" },
      { label: "Por cada asistencia", points: "+0.5 pts" },
      { label: "Por cada Primera Sangre (FB)", points: "+6 pts" },
      { label: "Por cada Primera Muerte (FD)", points: "-4 pts" },
      { label: "Por cada muerte", points: "-1 pt" },
      { label: "Si es MVP", points: "+5 pts" },
    ],
    Iniciador: [
      { label: "Por cada kill", points: "+1.5 pts" },
      { label: "Por cada asistencia", points: "+2 pts" },
      { label: "Por cada Primera Sangre (FB)", points: "+3 pts" },
      { label: "Por cada Primera Muerte (FD)", points: "-2 pts" },
      { label: "Por cada muerte", points: "-1 pt" },
      { label: "Si asistencias ≥ 20", points: "+10 pts" },
      { label: "Si asistencias < 20", points: "-5 pts" },
      { label: "Si es MVP", points: "+5 pts" },
    ],
    Controlador: [
      { label: "Por cada kill", points: "+1.5 pts" },
      { label: "Por cada asistencia", points: "+2 pts" },
      { label: "Por cada Primera Sangre (FB)", points: "+3 pts" },
      { label: "Por cada Primera Muerte (FD)", points: "-2 pts" },
      { label: "Por cada muerte", points: "-1 pt" },
      { label: "Si asistencias ≥ 20", points: "+10 pts" },
      { label: "Si asistencias < 20", points: "-5 pts" },
      { label: "Si es MVP", points: "+5 pts" },
    ],
  };

  const roles: Role[] = useMemo(
    () => ["Duelista", "Centinela", "Iniciador", "Controlador"],
    []
  );

  const rulesForSelectedRole = roleRules[selectedRole];

  return (
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
      <div className="flex items-center gap-2">
        <Link
          href="/more"
          className="text-v-white/20 hover:text-v-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-4xl leading-none italic uppercase">Reglas</h1>
      </div>

      <div className="v-panel p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl italic tracking-tighter uppercase border-b border-v-red w-fit">
            Protocolo de Puntuación
          </h2>
          <p className="text-xs text-v-white/60 leading-relaxed italic">
            El sistema calcula automáticamente el rendimiento de combate de cada
            agente basándose en los datos oficiales de VLR.gg.
          </p>
        </div>

        {/* Botones por rol */}
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => {
            const active = role === selectedRole;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={[
                  "px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                  "border-l-2",
                  active
                    ? "bg-v-red/20 border-v-red text-v-white"
                    : "bg-v-navy/40 border-v-white/10 text-v-white/60 hover:text-v-white hover:border-v-red",
                ].join(" ")}
              >
                {role}
              </button>
            );
          })}
        </div>

        {/* Listado dinámico según rol */}
        <div className="grid gap-2">
          {rulesForSelectedRole.map((rule) => (
            <div
              key={rule.label}
              className="bg-v-navy/50 p-3 flex justify-between items-center border-l-2 border-v-white/10 hover:border-v-red transition-all"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                {rule.label}
              </span>
              <span className="text-sm font-black italic text-v-red">
                {rule.points}
              </span>
            </div>
          ))}
        </div>

        <div className="v-panel border-white/5 bg-v-white/5 p-4 mt-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-v-red mb-2">
            Aviso de Operación
          </p>
          <p className="text-[10px] text-v-white/40 leading-relaxed italic">
            Los puntos se actualizan cada 30 minutos mientras los partidos están
            en vivo. Los resultados finales se confirman al terminar la serie.
          </p>
        </div>
      </div>
    </div>
  );
}
