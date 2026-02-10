
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Real-time check for market lock status.
 * Returns true if the market should be locked based on:
 * 1. Weekly cycle (Mon 24h to Thu 24h)
 * 2. Matches starting in less than 5 hours or currently live
 * 3. Manual override in gameweeks table
 */
export async function getMarketLockStatus(supabase: SupabaseClient, leagueId?: string) {
    const now = new Date();
    
    // 1. Weekly Cycle (Madrid Time)
    const madridTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
    const dayOfWeek = madridTime.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const hour = madridTime.getHours();
    const minute = madridTime.getMinutes();

    // Lock from Monday 23:59 until end of Thursday
    // Mon (1) >= 23:59 OR Tue(2), Wed(3), Thu(4)
    const isMondayNight = dayOfWeek === 1 && (hour > 23 || (hour === 23 && minute >= 59));
    const isMidWeek = dayOfWeek >= 2 && dayOfWeek <= 4;
    
    if (isMondayNight || isMidWeek) {
        return { locked: true, reason: "Ciclo semanal de competición (Lunes-Jueves)" };
    }

    // 2. Dynamic Match Lock (5h before match)
    // Get active gameweek and its matches
    const { data: activeGw } = await supabase
        .from('gameweeks')
        .select('id, is_locked')
        .eq('is_active', true)
        .maybeSingle();

    if (activeGw?.is_locked) {
        return { locked: true, reason: "Mercado cerrado por la administración" };
    }

    if (activeGw) {
        const { data: matches } = await supabase
            .from('matches')
            .select('match_date, status')
            .eq('gameweek_id', activeGw.id);

        if (matches) {
            const nowMs = now.getTime();
            const fiveHoursMs = 5 * 60 * 60 * 1000;

            for (const m of matches) {
                if (m.status === 'live') {
                    return { locked: true, reason: "Partido en curso" };
                }
                if (m.status === 'upcoming' && m.match_date) {
                    const startTime = new Date(m.match_date).getTime();
                    if (startTime > nowMs && startTime - nowMs < fiveHoursMs) {
                        return { locked: true, reason: "Partido inminente (menos de 5h)" };
                    }
                }
            }
        }
    }

    return { locked: false };
}
