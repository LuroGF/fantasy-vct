"use client";

import { useState, useMemo } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { Search, Filter, TrendingUp, DollarSign, Award } from "lucide-react";

interface PlayersViewProps {
    initialPlayers: any[];
}

export default function PlayersView({ initialPlayers }: PlayersViewProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeRole, setActiveRole] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'points' | 'acs' | 'value'>('points');

    const roles = ["Duelista", "Iniciador", "Controlador", "Centinela", "Flex"];

    const filteredPlayers = useMemo(() => {
        let result = initialPlayers.filter(p => 
            p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.pro_teams?.tag.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (activeRole) {
            result = result.filter(p => p.role === activeRole);
        }

        return result.sort((a, b) => {
            if (sortBy === 'points') return (b.stats?.avgPoints || 0) - (a.stats?.avgPoints || 0);
            if (sortBy === 'acs') return (b.stats?.acs || 0) - (a.stats?.acs || 0);
            if (sortBy === 'value') return (b.market_value || 0) - (a.market_value || 0);
            return 0;
        });
    }, [initialPlayers, searchTerm, activeRole, sortBy]);

    return (
        <div className="p-4 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-4xl font-black italic uppercase text-v-white tracking-tighter">Terminal de Scouting</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-v-red">Base de datos global de agentes VCT</p>
            </div>

            {/* Filters & Search */}
            <div className="v-panel p-4 space-y-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-v-white/20 group-focus-within:text-v-red transition-colors" />
                    <input 
                        type="text"
                        placeholder="BUSCAR AGENTE O EQUIPO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-v-navy/50 border border-white/5 pl-10 pr-4 py-3 text-[10px] font-black uppercase italic tracking-widest focus:border-v-red focus:bg-v-red/5 outline-none transition-all placeholder:text-v-white/10"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => setActiveRole(null)}
                        className={`shrink-0 px-4 py-2 text-[8px] font-black uppercase border transition-all ${!activeRole ? 'border-v-red bg-v-red/10 text-v-red' : 'border-white/10 text-v-white/40'}`}
                    >
                        Todos
                    </button>
                    {roles.map(role => (
                        <button
                            key={role}
                            onClick={() => setActiveRole(role === activeRole ? null : role)}
                            className={`shrink-0 px-4 py-2 text-[8px] font-black uppercase border transition-all ${role === activeRole ? 'border-v-red bg-v-red/10 text-v-red' : 'border-white/10 text-v-white/40'}`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                <div className="flex bg-v-navy/80 p-1 border border-white/5 gap-1">
                    <button 
                        onClick={() => setSortBy('points')}
                        className={`flex-1 py-2 flex items-center justify-center gap-2 text-[8px] font-black uppercase italic transition-all ${sortBy === 'points' ? 'bg-v-white text-v-navy' : 'text-v-white/40 hover:text-v-white'}`}
                    >
                        <Award className="w-3 h-3" /> Puntos Avg
                    </button>
                    <button 
                        onClick={() => setSortBy('acs')}
                        className={`flex-1 py-2 flex items-center justify-center gap-2 text-[8px] font-black uppercase italic transition-all ${sortBy === 'acs' ? 'bg-v-white text-v-navy' : 'text-v-white/40 hover:text-v-white'}`}
                    >
                        <TrendingUp className="w-3 h-3" /> ACS Máx
                    </button>
                    <button 
                        onClick={() => setSortBy('value')}
                        className={`flex-1 py-2 flex items-center justify-center gap-2 text-[8px] font-black uppercase italic transition-all ${sortBy === 'value' ? 'bg-v-white text-v-navy' : 'text-v-white/40 hover:text-v-white'}`}
                    >
                        <DollarSign className="w-3 h-3" /> Valor Mercado
                    </button>
                </div>
            </div>

            {/* Players Grid */}
            <div className="grid gap-4">
                {filteredPlayers.map((player) => (
                    <PlayerCard 
                        key={player.id} 
                        player={player} 
                    />
                ))}
                
                {filteredPlayers.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-v-red/5 rounded-full flex items-center justify-center mx-auto">
                            <Search className="w-8 h-8 text-v-red/20" />
                        </div>
                        <p className="text-[10px] font-black uppercase italic text-v-white/20">No se encontraron agentes en la base de datos</p>
                    </div>
                )}
            </div>
        </div>
    );
}
