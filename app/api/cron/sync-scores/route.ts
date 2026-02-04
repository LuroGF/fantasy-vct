import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateGameweekScores } from "@/lib/actions/scoring";
import { Database } from "@/types/supabase";

export async function GET(request: Request) {
  try {
    console.log("Cron: Iniciando sincronización de puntuaciones...");

    // 1. Obtener la jornada activa
    const { data: activeGw, error: gwError } = await supabaseAdmin
      .from('gameweeks')
      .select('id')
      .eq('is_active', true)
      .single<Database['public']['Tables']['gameweeks']['Row']>();

    if (gwError || !activeGw) {
      return NextResponse.json({ message: "No hay jornada activa" }, { status: 200 });
    }

    // 2. Obtener partidos de esta jornada que no han sido procesados o están marcados como live/upcoming
    const { data: matches, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, vlr_id, status')
      .eq('gameweek_id', activeGw.id)
      .in('status', ['upcoming', 'live'])
      .returns<Database['public']['Tables']['matches']['Row'][]>();

    if (matchError) throw matchError;

    console.log(`Cron: Procesando ${matches?.length || 0} partidos...`);

    // 3. Para cada partido, intentar sincronizar estadísticas
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    for (const match of matches || []) {
      if (!match.vlr_id) continue;
      
      console.log(`Cron: Sincronizando partido VLR ID ${match.vlr_id}...`);
      try {
        const syncRes = await fetch(`${baseUrl}/api/vlr?id=${match.vlr_id}`);
        const syncData = await syncRes.json();
        
        if (syncData.success) {
            await (supabaseAdmin
                .from('matches') as any)
                .update({ status: 'finished' })
                .eq('id', (match as any).id);
            console.log(`Cron: Partido ${match.vlr_id} sincronizado y marcado como finalizado.`);
        }
      } catch (err) {
        console.error(`Cron: Error sincronizando partido ${match.vlr_id}:`, err);
      }
    }

    // 4. Recalcular puntuaciones totales de la jornada
    console.log(`Cron: Recalculando puntuaciones de la jornada ${activeGw.id}...`);
    const scoreResult = await calculateGameweekScores(activeGw.id);

    return NextResponse.json({
      success: true,
      gameweekId: activeGw.id,
      matchesChecked: matches?.length || 0,
      scoringDetails: scoreResult
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
