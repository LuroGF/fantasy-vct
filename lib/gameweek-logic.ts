
import { SupabaseClient } from "@supabase/supabase-js";


/**
 * Real-time check for market lock status.
 * Returns true if the market should be locked based on:
 * 1. Admin manual override
 * 2. Weekly cycle (Mon 23:59 or 5h before match)
 * 3. Match in progress or imminent
 * 4. Special rule: if prev GW ended Sunday, delay lock until 5h before next match
 */
export async function getMarketLockStatus(supabase: SupabaseClient, leagueId?: string) {
    const now = new Date();
    
    // Utility to get a Date object representing the time in Madrid as if it were UTC
    // (the "digits" match Madrid time). Useful for day/hour checks.
    const toMadridLocal = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
    
    const madridNow = toMadridLocal(now);

    // 1. Manual override in gameweeks table
    const { data: activeGw } = await supabase
        .from('gameweeks')
        .select('id, is_locked, start_date')
        .eq('is_active', true)
        .maybeSingle();

    if (!activeGw) {
        return { locked: false };
    }

    if (activeGw.is_locked) {
        return { locked: true, reason: "Mercado cerrado por la administración" };
    }

    // 2. Dynamic Match Lock
    const { data: matches } = await supabase
        .from('matches')
        .select('match_date, status')
        .eq('gameweek_id', activeGw.id)
        .order('match_date', { ascending: true });

    if (!matches || matches.length === 0) {
        // Fallback if no matches are found: standard Monday night lock
        const dayOfWeek = madridNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const isMondayNight = dayOfWeek === 1 && madridNow.getHours() >= 23 && madridNow.getMinutes() >= 59;
        const isMidWeek = dayOfWeek >= 2 && dayOfWeek <= 4;
        
        if (isMondayNight || isMidWeek) {
            return { locked: true, reason: "Ciclo semanal (Lunes-Jueves)" };
        }
        return { locked: false };
    }

    // 3. Re-open check: If all matches of the current GW are finished, market is OPEN
    const allFinished = matches.every(m => m.status === 'finished' || m.status === 'completed');
    if (allFinished) {
        return { locked: false };
    }

    // 4. Live match check
    const liveMatch = matches.find(m => m.status === 'live');
    if (liveMatch) {
        return { locked: true, reason: "Partido en curso" };
    }

    // 5. Imminent match check (5h before)
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    const nextMatch = matches.find(m => m.status === 'upcoming');
    if (nextMatch) {
        const startTime = new Date(nextMatch.match_date).getTime();
        if (startTime > now.getTime() && startTime - now.getTime() < fiveHoursMs) {
            return { locked: true, reason: "Partido inminente (menos de 5h)" };
        }
    }

    // 6. Calculate main Lock Time for the week
    const firstMatchDate = new Date(matches[0].match_date);
    const firstMatchMadrid = toMadridLocal(firstMatchDate);
    const firstDay = firstMatchMadrid.getDay();

    let lockTimeMs: number;

    if (firstDay === 1) {
        // Rule: If there's a match on Monday, lock 5h before that match
        // FIX Bug #9: Avoid double timezone conversion - calculate directly in ms
        lockTimeMs = firstMatchDate.getTime() - fiveHoursMs;
    } else {
        // No match on Monday? 
        // Check if previous GW ended on Sunday
        const { data: prevGw } = await supabase
            .from('gameweeks')
            .select('id')
            .lt('start_date', activeGw.start_date)
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        let prevEndedSunday = false;
        if (prevGw) {
            const { data: lastMatchPrev } = await supabase
                .from('matches')
                .select('match_date')
                .eq('gameweek_id', prevGw.id)
                .order('match_date', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (lastMatchPrev) {
                const lpMadrid = toMadridLocal(new Date(lastMatchPrev.match_date));
                if (lpMadrid.getDay() === 0) prevEndedSunday = true;
            }
        }

        if (prevEndedSunday) {
            // Rule: skip Monday night, lock 5h before next match
            lockTimeMs = firstMatchDate.getTime() - fiveHoursMs;
        } else {
            // Default rule: Lock Monday night (23:59) of the current week
            // find Monday of the week starting the GW
            const diff = firstDay === 0 ? 6 : firstDay - 1;
            const monday = new Date(firstMatchMadrid);
            monday.setDate(firstMatchMadrid.getDate() - diff);
            monday.setHours(23, 59, 59, 999);
            lockTimeMs = monday.getTime();
        }
    }

    if (madridNow.getTime() >= lockTimeMs) {
        return { locked: true, reason: "Mercado cerrado por inicio de jornada" };
    }

    return { locked: false };
}

/**
 * Ensures there are always future gameweeks available.
 * Usually run by CRON.
 */
export async function autoCreateMissingGameweeks(supabase: SupabaseClient) {
    const { data: latest } = await supabase
        .from('gameweeks')
        .select('name, end_date')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    const now = new Date();
    let startDate: Date;
    let nextNum = 1;

    if (latest) {
        startDate = new Date(latest.end_date);
        startDate.setSeconds(startDate.getSeconds() + 1); // Start right after
        const match = latest.name.match(/\d+/);
        if (match) nextNum = parseInt(match[0]) + 1;
    } else {
        // Start from last Monday if nothing exists
        startDate = new Date();
        const diff = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
        startDate.setDate(startDate.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
    }

    // If latest gameweek ends in less than 7 days, create 2 more
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    if (!latest || new Date(latest.end_date) < sevenDaysFromNow) {
        console.log("Gameweek Logic: Creando jornadas futuras...");
        for (let i = 0; i < 2; i++) {
            const end = new Date(startDate);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);

            await supabase.from('gameweeks').insert({
                name: `Jornada ${nextNum}`,
                start_date: startDate.toISOString(),
                end_date: end.toISOString(),
                is_active: false,
                is_locked: false
            } as any);

            startDate = new Date(end);
            startDate.setSeconds(startDate.getSeconds() + 1);
            nextNum++;
        }
    }
}

