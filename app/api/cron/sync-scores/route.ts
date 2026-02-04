import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateGameweekScores } from "@/lib/actions/scoring";
import { Database } from "@/types/supabase";

export async function GET(request: Request) {
  try {
    const now = new Date();
    console.log("Cron: Iniciando sincronización de jornada y puntuaciones...");

    // 1. Obtener la jornada activa
    const { data: activeGw, error: gwError } = await (supabaseAdmin
      .from('gameweeks')
      .select('*')
      .eq('is_active', true) as any)
      .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };

    if (gwError) throw gwError;

    if (!activeGw) {
      console.log("Cron: No hay jornada activa. Intentando activar la próxima disponible...");
      const { data: upcoming } = await (supabaseAdmin
        .from('gameweeks')
        .select('*')
        .gte('start_date', now.toISOString())
        .order('start_date', { ascending: true })
        .limit(1) as any)
        .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };

      if (upcoming) {
          await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true }).eq('id', upcoming.id);
          return NextResponse.json({ message: `Jornada ${upcoming.name} activada` });
      }
      return NextResponse.json({ message: "No hay jornadas futuras para activar" });
    }

    // --- A. AUTO-LOCK ---
    const startTime = new Date(activeGw.start_date).getTime();
    const lockTime = startTime - (24 * 60 * 60 * 1000); 
    
    if (now.getTime() >= lockTime && !activeGw.is_locked) {
      console.log(`Cron: Bloqueando mercado para la jornada ${activeGw.name}`);
      await (supabaseAdmin.from('gameweeks') as any).update({ is_locked: true }).eq('id', activeGw.id);
      (activeGw as any).is_locked = true;
    }

    // --- B. VINCULAR PARTIDOS ---
    console.log(`Cron: Vinculando partidos a la jornada ${activeGw.name}...`);
    await (supabaseAdmin
      .from('matches') as any)
      .update({ gameweek_id: activeGw.id })
      .is('gameweek_id', null)
      .gte('match_date', activeGw.start_date)
      .lte('match_date', activeGw.end_date);

    // --- C. SINCRONIZAR ESTADÍSTICAS ---
    const { data: matches, error: matchError } = await (supabaseAdmin
      .from('matches')
      .select('id, vlr_id, status, match_date')
      .eq('gameweek_id', activeGw.id)
      .neq('status', 'finished') as any);

    if (matchError) throw matchError;

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    for (const match of (matches as any[]) || []) {
      if (!match.vlr_id) continue;
      
      const matchTime = match.match_date ? new Date(match.match_date).getTime() : 0;
      if (now.getTime() < matchTime - (30 * 60 * 1000)) continue; 

      try {
        const syncRes = await fetch(`${baseUrl}/api/vlr?id=${match.vlr_id}`);
        const syncData = await syncRes.json();
        
        if (syncData.success) {
            console.log(`Cron: Partido ${match.vlr_id} sincronizado.`);
        }
      } catch (err) {
        console.error(`Cron: Error sincronizando partido ${match.vlr_id}:`, err);
      }
    }

    // --- D. CALCULAR PUNTUACIONES ---
    console.log(`Cron: Recalculando puntuaciones de la jornada ${activeGw.id}...`);
    const scoreResult = await calculateGameweekScores(activeGw.id);

    // --- E. AUTO-NEXT JORNADA ---
    const { data: pendingMatches } = await (supabaseAdmin
        .from('matches')
        .select('id')
        .eq('gameweek_id', activeGw.id)
        .neq('status', 'finished') as any);

    if ((pendingMatches as any[])?.length === 0 && now > new Date(activeGw.end_date)) {
        console.log("Cron: Jornada finalizada. Rotando a la siguiente...");
        
        await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false, is_locked: false }).eq('id', activeGw.id);
        
        const { data: nextGw } = await (supabaseAdmin
            .from('gameweeks')
            .select('*')
            .gt('start_date', activeGw.start_date)
            .order('start_date', { ascending: true })
            .limit(1) as any)
            .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };
        
        if (nextGw) {
            await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true, is_locked: false }).eq('id', nextGw.id);
            console.log(`Cron: Siguiente jornada activada: ${nextGw.name}`);
        }
    }

    return NextResponse.json({
      success: true,
      gameweek: activeGw.name,
      locked: activeGw.is_locked,
      scoringDetails: scoreResult
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
