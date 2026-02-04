import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 60;

export type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: { time: string; teams: string; event: string; id: string }[];
  scoring: { label: string; value: string }[];
};

const fallbackData: VlrPayload = {
  stats: [
    { label: "Active leagues", value: "128" },
    { label: "Weekly managers", value: "4.2k" },
    { label: "Matches tracked", value: "312" },
  ],
  upcomingMatches: [
    { time: "14:00", teams: "FNATIC vs NAVI", event: "VCT EMEA", id: "1" },
    { time: "17:30", teams: "LOUD vs LEV", event: "VCT Americas", id: "2" },
    { time: "20:00", teams: "PRX vs DRX", event: "VCT Pacific", id: "3" },
  ],
  scoring: [
    { label: "Kill", value: "+2" },
    { label: "Assist", value: "+1" },
    { label: "First blood", value: "+3" },
    { label: "Clutch round", value: "+4" },
    { label: "Match win", value: "+5" },
    { label: "Series MVP", value: "+6" },
  ],
};

const VLR_MATCHES_URL = "https://www.vlr.gg/matches";

// Mapeo manual de alias de equipos para mejorar el matching con la DB
const TEAM_ALIASES: Record<string, string> = {
  "FNATIC": "FNC",
  "TEAM VITALITY": "VIT",
  "TEAM HERETICS": "TH",
  "KARMINE CORP": "KC",
  "NAVI": "NAVI",
  "NATUS VINCERE": "NAVI",
  "BBL ESPORTS": "BBL",
  "FUT ESPORTS": "FUT",
  "GIANTX": "GX",
  "KOI": "KOI",
  "TEAM LIQUID": "TL",
  "GENTLE MATES": "M8",
};

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function parseUpcomingMatches(html: string) {
  const $ = cheerio.load(html);
  const results: VlrPayload["upcomingMatches"] = [];

  $(".match-item").each((_, element) => {
    const card = $(element);
    const id = card.attr("href")?.split("/")[1] || "";
    const time = cleanText(card.find(".match-item-time").first().text());
    const event = cleanText(card.find(".match-item-event").first().text());
    
    const teams = card
      .find(".match-item-vs-team-name")
      .map((__, team) => cleanText($(team).text()))
      .get()
      .filter(Boolean);

    const teamsLabel =
      teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : teams[0] ?? "";

    // Filtro mucho más estricto: Solo VCT EMEA
    const isEmeaS1 = event.toUpperCase().includes("EMEA") && (event.toUpperCase().includes("CHAMPIONS TOUR") || event.toUpperCase().includes("STAGE"));

    if (teamsLabel && event && isEmeaS1) {
      results.push({
        time: time || "LIVE",
        teams: teamsLabel,
        event,
        id,
      });
    }
  });

  if (results.length === 0) {
    $(".match-item").slice(0, 6).each((_, element) => {
        const card = $(element);
        const id = card.attr("href")?.split("/")[1] || "";
        const time = cleanText(card.find(".match-item-time").first().text());
        const event = cleanText(card.find(".match-item-event").first().text());
        const teams = card.find(".match-item-vs-team-name").map((__, team) => cleanText($(team).text())).get();
        if (teams.length >= 2) {
            results.push({
                time: time || "LIVE",
                teams: `${teams[0]} vs ${teams[1]}`,
                event,
                id
            });
        }
    });
  }

  return results.slice(0, 10);
}

async function loadVlrData(): Promise<VlrPayload> {
  const response = await fetch(VLR_MATCHES_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; FantasyVCT/1.0; +https://fantasy-vct.local)",
      Accept: "text/html",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`VLR fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const upcomingMatches = parseUpcomingMatches(html);

  return {
    stats: fallbackData.stats,
    upcomingMatches: upcomingMatches.length
      ? upcomingMatches
      : fallbackData.upcomingMatches,
    scoring: fallbackData.scoring,
  };
}

async function scrapeMatchDetails(matchId: string) {
  const url = `https://www.vlr.gg/${matchId}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) return null;

  const html = await response.text();
  const $ = cheerio.load(html);
  const stats: any[] = [];

  // Buscamos las tablas de estadísticas (suele haber una por mapa + global)
  // La clase .wf-table-container suele envolver los stats
  $(".wf-table-container").first().find("tbody tr").each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length < 5) return;

    const playerLink = $(cols[0]).find("a").attr("href") || "";
    const playerId = playerLink.split("/")[2] || "";
    const nickname = cleanText($(cols[0]).find(".mod-player").text());
    
    // Kills / Deaths / Assists
    const kdaRaw = cleanText($(cols[2]).find(".mod-vlr-kills").text());
    const dRaw = cleanText($(cols[3]).find(".mod-vlr-deaths").text());
    const aRaw = cleanText($(cols[4]).find(".mod-vlr-assists").text());

    // FB (First Bloods) y FD (First Deaths) suelen estar en columnas específicas o calculados
    // NOTA: VLR a veces cambia las columnas. Intentamos pillar los básicos primero.
    
    stats.push({
      vlr_player_id: playerId,
      nickname,
      kills: parseInt(kdaRaw) || 0,
      deaths: parseInt(dRaw.replace("/", "")) || 0,
      assists: parseInt(aRaw) || 0,
      // FB y Clutches requieren selectores más específicos dependiendo de la vista
    });
  });

  return stats;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("id");

  // Si nos pasan un ID, scrapeamos ese partido específico
  if (matchId) {
    try {
      const details = await scrapeMatchDetails(matchId);
      return NextResponse.json(details);
    } catch (error) {
      return NextResponse.json({ error: "Failed to scrape match details" }, { status: 500 });
    }
  }

  // Si no, flujo normal de partidos próximos
  try {
    const data = await loadVlrData();
    
    // Sincronización con DB
    const { data: teamsData } = await supabase.from('pro_teams').select('id, name, tag');
    const teamMap = new Map<string, string>();
    
    (teamsData as any[])?.forEach((t: { name: string; tag: string; id: string }) => {
      if (t.name) teamMap.set(t.name.toUpperCase(), t.id);
      if (t.tag) teamMap.set(t.tag.toUpperCase(), t.id);
    });

    const matchUpserts = data.upcomingMatches.map(m => {
      const parts = m.teams.split(" vs ");
      let nameA = parts[0]?.toUpperCase();
      let nameB = parts[1]?.toUpperCase();
      
      // Intentar resolver por alias si no hay match directo
      const tagA = TEAM_ALIASES[nameA] || nameA;
      const tagB = TEAM_ALIASES[nameB] || nameB;
      
      const teamAId = teamMap.get(nameA) || teamMap.get(tagA);
      const teamBId = teamMap.get(nameB) || teamMap.get(tagB);
      
      if (!teamAId || !teamBId) {
         console.log(`Sync: Saltando partido ${m.teams} - Equipos no encontrados en DB: ${nameA}(${teamAId ? 'OK':'MISSING'}) vs ${nameB}(${teamBId ? 'OK':'MISSING'})`);
      }

      return {
        vlr_id: m.id,
        team_a: teamAId,
        team_b: teamBId,
        status: m.time.toLowerCase().includes("live") ? 'live' : 'upcoming',
      };
    }).filter(m => m.team_a && m.team_b);

    if (matchUpserts.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from('matches').upsert(matchUpserts, { onConflict: 'vlr_id' });
      if (upsertError) console.error("Sync: Error upserting matches:", upsertError);
      else console.log(`Sync: ${matchUpserts.length} partidos sincronizados correctamente.`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("VLR scrape failed", error);
    return NextResponse.json(fallbackData);
  }
}
