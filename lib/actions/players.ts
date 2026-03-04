"use server";

import { createClient } from "@/utils/supabase/server";

export async function getScoutingPlayers() {
    const supabase = await createClient();
    
    // 1. Fetch all players with team data
    const { data: players, error: pError } = await supabase
        .from('pro_players')
        .select(`
            id,
            nickname,
            role,
            market_value,
            photo_url,
            pro_teams (
                id,
                tag,
                name
            )
        `)
        .order('nickname');

    if (pError) {
        console.error("Error fetching scouting players:", pError);
        return [];
    }

    // 2. Fetch performance aggregates
    const { data: performances, error: perfError } = await supabase
        .from('player_performances')
        .select('player_id, fantasy_points, acs, kills, deaths');

    if (perfError) {
        console.error("Error fetching performance aggregates:", perfError);
        return players.map((p: any) => ({ ...p, stats: { acs: 0, kd: 0, avgPoints: 0 } }));
    }

    // 3. Group and calculate stats
    const statsMap = new Map();
    performances.forEach((perf: any) => {
        if (!perf.player_id) return;
        const current = statsMap.get(perf.player_id) || { totalPoints: 0, totalAcs: 0, totalKills: 0, totalDeaths: 0, games: 0 };
        current.totalPoints += perf.fantasy_points || 0;
        current.totalAcs += perf.acs || 0;
        current.totalKills += perf.kills || 0;
        current.totalDeaths += perf.deaths || 0;
        current.games += 1;
        statsMap.set(perf.player_id, current);
    });

    return players.map((p: any) => {
        const s = statsMap.get(p.id);
        return {
            ...p,
            stats: s ? {
                avgPoints: Math.round(s.totalPoints / s.games),
                acs: Math.round(s.totalAcs / s.games),
                kd: s.totalDeaths > 0 ? Number((s.totalKills / s.totalDeaths).toFixed(2)) : s.totalKills,
                games: s.games
            } : {
                avgPoints: 0,
                acs: 0,
                kd: 0,
                games: 0
            }
        };
    });
}
