"use client";

import { useState } from "react";
import Image from "next/image";
import { updateProfile } from "@/lib/actions/profile";
import { X, Save, Palette, Type, Users } from "lucide-react";

interface ProfileCustomizerProps {
  profile: any;
  teams: any[];
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: "Radiant Red", value: "#ff4655" },
  { name: "Deep Navy", value: "#0f1923" },
  { name: "Emerald", value: "#3fb0ac" },
  { name: "Violet", value: "#7b2cbf" },
  { name: "Amber", value: "#ffb703" },
  { name: "Cyber Blue", value: "#00b4d8" },
];

const PRESET_TITLES = [
  "Entrenador novato",
  "Estratega",
  "Caza-Cláusulas",
  "Ojeador Maestro",
  "Magnate del E-sport",
  "Referente del Fantasy",
];

export function ProfileCustomizer({ profile, teams, onClose }: ProfileCustomizerProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: profile.username || "",
    bio: profile.bio || "",
    banner_color: profile.banner_color || "#ff4655",
    fav_team_id: profile.fav_team_id || "",
    title:
      profile.title === "Manager Novato"
        ? "Entrenador novato"
        : profile.title || "Entrenador novato",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateProfile(formData);
    if (res.success) {
      onClose();
    } else {
      alert("Error al guardar: " + res.error);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-v-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="v-panel w-full max-w-xl bg-v-navy overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-v-gray/20">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-v-red" />
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Personalizar Perfil</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto">
          {/* Banner & Color */}
          <section className="space-y-4">
            <label className="text-[10px] font-black uppercase text-v-white/40 tracking-[0.2em] flex items-center gap-2">
              <Palette className="w-3 h-3" /> Color de Identificación
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, banner_color: color.value })}
                  className={`h-12 border-2 transition-all ${
                    formData.banner_color === color.value ? "border-v-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </section>

          {/* Title Selector */}
          <section className="space-y-4">
            <label className="text-[10px] font-black uppercase text-v-white/40 tracking-[0.2em] flex items-center gap-2">
              <Type className="w-3 h-3" /> Título del entrenador
            </label>
            <select
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-v-gray/40 border border-white/10 p-4 text-sm font-black uppercase tracking-widest focus:outline-none focus:border-v-red/50 appearance-none"
            >
              {PRESET_TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </section>

          {/* Favorite Team */}
          <section className="space-y-4">
            <label className="text-[10px] font-black uppercase text-v-white/40 tracking-[0.2em] flex items-center gap-2">
              <Users className="w-3 h-3" /> Equipo Favorito
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, fav_team_id: "" })}
                className={`p-3 border text-[10px] font-black uppercase tracking-widest transition-all ${
                  formData.fav_team_id === "" ? "border-v-red bg-v-red/10" : "border-white/5 bg-v-white/5"
                }`}
              >
                NINGUNO
              </button>
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, fav_team_id: team.id })}
                  className={`p-3 border flex items-center gap-3 transition-all ${
                    formData.fav_team_id === team.id ? "border-v-red bg-v-red/10" : "border-white/5 bg-v-white/5"
                  }`}
                >
                  {team.logo_url && <Image src={team.logo_url} width={20} height={20} className="w-5 h-5 object-contain" alt="" />}
                  <span className="text-[10px] font-black uppercase tracking-widest truncate">{team.tag}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Bio */}
          <section className="space-y-4">
            <label className="text-[10px] font-black uppercase text-v-white/40 tracking-[0.2em] flex items-center gap-2">
              <Type className="w-3 h-3" /> Biografía / Descripción
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="CUÉNTALES QUIÉN ERES..."
              maxLength={150}
              className="w-full bg-v-gray/40 border border-white/10 p-4 text-sm font-black uppercase tracking-widest focus:outline-none focus:border-v-red/50 min-h-[100px] resize-none"
            />
            <p className="text-right text-[8px] font-black text-v-white/20 uppercase">{formData.bio.length} / 150</p>
          </section>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="v-btn-secondary flex-1 py-4 text-[11px]"
          >
            CANCELAR
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="v-btn-primary flex-1 py-4 text-[11px] flex items-center justify-center gap-2"
          >
            {loading ? "GUARDANDO..." : <><Save className="w-4 h-4" /> GUARDAR</>}
          </button>
        </div>
      </div>
    </div>
  );
}
