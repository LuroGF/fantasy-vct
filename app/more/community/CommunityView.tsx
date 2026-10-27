"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Trophy } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  global_points: number | null;
}

interface CommunityViewProps {
  profiles: Profile[];
  loadFailed: boolean;
}

export default function CommunityView({ profiles, loadFailed }: CommunityViewProps) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("es").slice(0, 50);
  const filteredProfiles = useMemo(
    () => profiles.filter((profile) =>
      profile.username.toLocaleLowerCase("es").includes(normalizedSearch)),
    [normalizedSearch, profiles],
  );

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-4xl px-4 sm:px-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6 mb-20">
      <div className="flex items-center gap-2">
        <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors" aria-label="Volver a Más">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Comunidad</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Entrenadores</p>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-v-white/20 group-focus-within:text-v-red transition-colors" aria-hidden="true" />
        <label htmlFor="community-search" className="sr-only">Buscar entrenador</label>
        <input
          id="community-search"
          type="search"
          maxLength={50}
          autoComplete="off"
          placeholder="BUSCAR ENTRENADOR..."
          className="w-full bg-v-gray/40 border border-white/10 p-4 pl-12 text-sm font-black uppercase tracking-widest focus:outline-none focus:border-v-red/50 transition-all placeholder:text-v-white/10"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="v-panel p-2 space-y-1 bg-v-gray/40 min-h-[400px]">
        {loadFailed ? (
          <div className="p-20 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/30">
              No se ha podido cargar la comunidad. Inténtalo de nuevo.
            </p>
          </div>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile, index) => (
            <Link
              key={profile.id}
              href={`/more/profile/${profile.id}`}
              className="w-full flex items-center justify-between p-4 hover:bg-v-white/5 transition-colors group border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-8 h-8 shrink-0 flex items-center justify-center border border-white/10 text-[10px] font-black italic bg-v-black text-v-white/40">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black uppercase tracking-widest text-v-white/80 group-hover:text-v-white transition-colors">
                    {profile.username}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Trophy className="w-3 h-3 text-yellow-500/50" aria-hidden="true" />
                    <span className="text-[9px] font-black text-v-red uppercase tracking-wider">
                      {(profile.global_points ?? 0).toLocaleString("es-ES")} PTS
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="opacity-0 group-hover:opacity-100 text-[8px] font-black uppercase text-v-red tracking-widest transition-all translate-x-4 group-hover:translate-x-0">
                  Ver perfil
                </span>
                <span className="text-v-white/20 group-hover:text-v-red transition-colors text-xl font-bold italic" aria-hidden="true">
                  {"//"}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-20 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/20">No se encontraron entrenadores</p>
          </div>
        )}
      </div>
    </div>
  );
}
