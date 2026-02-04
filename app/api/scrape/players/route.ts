import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// URL con estadísticas de EMEA (últimos 180 días para pillar a todos)
const VLR_STATS_URL = "https://www.vlr.gg/stats/?event_group_id=all&event_id=all&region=eu&country=all&min_rounds=100&min_rating=0&agent_id=all&timespan=180d";

// Lista ampliada de tags de EMEA Tier 1 para ser más robustos con lo que devuelve VLR
const EMEA_TIER1_TEAMS = [
  "FNC", "VIT", "TH", "KC", "NAVI", "BBL", "FUT", "GX", "GIA", "KOI", "TL", "M8", "GENTLE MATES", "HERETICS", "GIANTX"
];

interface ScrapedPlayer {
  nickname: string;
  teamTag: string;
  rating: number;
  role: string;
  market_value: number;
}

export async function GET() {
  try {
    const response = await fetch(VLR_STATS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) throw new Error("Fallo al conectar con VLR.gg");

    const html = await response.text();
    const $ = cheerio.load(html);
    const players: ScrapedPlayer[] = [];

    // Buscamos las filas de la tabla de estadísticas
    $(".wf-table tbody tr").each((i, el) => {
      const row = $(el);
      
      const nickname = row.find(".text-of").first().text().trim();
      const teamTag = row.find(".stats-player-country").first().text().trim().toUpperCase();
      const rating = parseFloat(row.find("td.mod-color-sq").first().text().trim()) || 0;
      
      // Intentar inferir rol por el agente más jugado (está en una imagen pequeña)
      const topAgentImg = row.find(".mod-agents img").first().attr("src") || "";
      let role = "Duelista"; // Default
      if (topAgentImg.includes("omen") || topAgentImg.includes("brimstone") || topAgentImg.includes("astra") || topAgentImg.includes("viper") || topAgentImg.includes("clove")) role = "Controlador";
      if (topAgentImg.includes("sage") || topAgentImg.includes("cypher") || topAgentImg.includes("killjoy") || topAgentImg.includes("deadlock")|| topAgentImg.includes("veto") || topAgentImg.includes("vyse")) role = "Centinela";
      if (topAgentImg.includes("sova") || topAgentImg.includes("breach") || topAgentImg.includes("skye") || topAgentImg.includes("kayo") || topAgentImg.includes("gekko") || topAgentImg.includes("fade")) role = "Iniciador";

      if (nickname && teamTag && nickname !== "" && EMEA_TIER1_TEAMS.includes(teamTag)) {
        players.push({
          nickname,
          teamTag,
          rating,
          role,
          // Precio basado en el rating (ej: rating 1.20 = 24M)
          market_value: Math.floor(rating * 20) * 1000000
        });
      }
    });

    console.log(`Scraper: Encontrados ${players.length} jugadores después de filtrar por EMEA Tier 1.`);

    if (players.length === 0) {
      return NextResponse.json({ 
        success: true, 
        count: 0,
        message: "No se encontraron jugadores de EMEA Tier 1. Revisa los filtros o la URL." 
      });
    }

    // 1. Procesar Equipos Únicos
    const uniqueTeamTags = Array.from(new Set(players.map(p => p.teamTag)));
    const teamUpserts = uniqueTeamTags.map(tag => ({ name: tag, tag }));
    
    const { error: teamError } = await supabase
      .from('pro_teams')
      .upsert(teamUpserts as any, { onConflict: 'tag' });
    
    if (teamError) throw teamError;

    // Obtenemos los IDs de los equipos para relacionarlos
    const { data: teamsData } = await supabase.from('pro_teams').select('id, tag').returns<{ id: string; tag: string }[]>();
    const teamMap = new Map(teamsData?.map(t => [t.tag, t.id]));

    // 2. Procesar Jugadores (Deduplicar por nickname)
    const uniquePlayersMap = new Map();
    for (const p of players) {
      if (!uniquePlayersMap.has(p.nickname) || p.rating > uniquePlayersMap.get(p.nickname).rating) {
        uniquePlayersMap.set(p.nickname, p);
      }
    }

    const playerRows = Array.from(uniquePlayersMap.values());
    const playerUpserts = playerRows.map(p => ({
      nickname: p.nickname,
      team_id: teamMap.get(p.teamTag),
      role: p.role,
      market_value: p.market_value
    })).filter(p => p.team_id !== undefined); // Solo insertar si el equipo existe

    console.log(`Scraper: Preparados ${playerUpserts.length} jugadores para upsert.`);

    const { error: playerError } = await supabase
      .from('pro_players')
      .upsert(playerUpserts as any, { onConflict: 'nickname' });

    if (playerError) throw playerError;

    return NextResponse.json({ 
      success: true, 
      count: playerUpserts.length,
      message: `${playerUpserts.length} jugadores de EMEA Tier 1 actualizados correctamente.` 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Scraper Error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
