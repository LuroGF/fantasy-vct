"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Search, Trophy, User } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  global_points: number;
}

export default function CommunityPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, global_points")
        .order("global_points", { ascending: false });

      if (data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, [supabase]);

  const filteredProfiles = profiles.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-4xl px-4 sm:px-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6 mb-20">
      <div className="flex items-center gap-2">
        <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Comunidad</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Agentes del Sistema</p>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-v-white/20 group-focus-within:text-v-red transition-colors" />
        <input
          type="text"
          placeholder="BUSCAR AGENTE..."
          className="w-full bg-v-gray/40 border border-white/10 p-4 pl-12 text-sm font-black uppercase tracking-widest focus:outline-none focus:border-v-red/50 transition-all placeholder:text-v-white/10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="v-panel p-2 space-y-1 bg-v-gray/40 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-8 h-8 border-4 border-v-red border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-v-white/20">Sincronizando Base de Datos...</p>
          </div>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile, index) => (
            <Link
              key={profile.id}
              href={`/more/profile/${profile.id}`}
              className="w-full flex items-center justify-between p-4 hover:bg-v-white/5 transition-colors group border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center border border-white/10 text-[10px] font-black italic bg-v-black text-v-white/40">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-v-white/80 group-hover:text-v-white transition-colors">
                    {profile.username}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Trophy className="w-3 h-3 text-yellow-500/50" />
                    <span className="text-[9px] font-black text-v-red uppercase tracking-wider">
                      {profile.global_points?.toLocaleString() || 0} PTS
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-0 group-hover:opacity-100 text-[8px] font-black uppercase text-v-red tracking-widest transition-all translate-x-4 group-hover:translate-x-0">
                  VER PERFIL
                </span>
                <span className="text-v-white/20 group-hover:text-v-red transition-colors text-xl font-bold italic">
                   {"//"}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-20 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/20">No se encontraron agentes</p>
          </div>
        )}
      </div>
    </div>
  );
}
