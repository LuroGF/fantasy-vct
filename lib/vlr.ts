import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/utils/supabase/admin";

const VLR_MATCHES_URL = "https://www.vlr.gg/matches";

export type VlrMatch = { 
  time: string; 
  teams: string; 
  event: string; 
  id: string; 
  date?: string; 
  rawDate?: string;
  isVctEmea?: boolean;
  eta?: string;
};

export interface PlayerStats {
  vlr_id: string;
  nickname: string;
  teamTag: string;
  map_name: string;
  agent_name: string;
  agent_role: string;
  kills: number;
  deaths: number;
  assists: number;
  fb: number;
  fd: number;
  acs: number;
  clutches: number;
  mvp?: boolean;
}

export type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: VlrMatch[];
  scoring: { label: string; value: string }[];
};

const TEAM_ALIASES: Record<string, string> = {
  "FNATIC": "FNATIC",
  "FNC": "FNATIC",
  "VITALITY": "Vitality",
  "VIT": "Vitality",
  "TEAM VITALITY": "Vitality",
  "HERETICS": "Heretics",
  "TH": "Heretics",
  "TEAM HERETICS": "Heretics",
  "KARMINE CORP": "KarmineCorp",
  "K-CORP": "KarmineCorp",
  "KC": "KarmineCorp",
  "NAVI": "NAVI",
  "NATUS VINCERE": "NAVI",
  "BBL": "BBL",
  "BBL ESPORTS": "BBL",
  "FUT": "FUT",
  "FUT ESPORTS": "FUT",
  "GIANTX": "Giantx",
  "GX": "Giantx",
  "GIANTS": "Giantx",
  "KOI": "KOI",
  "MOVISTAR KOI": "KOI",
  "LIQUID": "TeamLiquid",
  "TL": "TeamLiquid",
  "TEAM LIQUID": "TeamLiquid",
  "GENTLE MATES": "GentleMates",
  "M8": "GentleMates",
  "GENTLEMATES": "GentleMates",
  "PACIFIC": "PCIFIC",
  "PCIF": "PCIFIC",
  "ULF": "ULF"
};

export function getTeamLogo(name: string) {
    const upper = name.toUpperCase();
    const logoName = TEAM_ALIASES[upper];
    if (logoName) return `/equipos/${logoName}.png`;
    return null; // Don't return a path if we don't have a logo
}

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeTeamName(name: string) {
  let clean = name.toUpperCase()
    .replace(/^TEAM\s+/i, "")
    .replace(/\s+ESPORTS$/i, "")
    .replace(/\s+CLUB$/i, "")
    .trim();
  
  // Specific fixes
  if (clean === "VIT") return "VITALITY";
  if (clean === "TH") return "HERETICS";
  if (clean === "KC") return "KARMINE CORP";
  if (clean === "NAVI") return "Natus Vincere";
  
  return clean;
}

export function getTeamTag(name: string) {
    const upper = name.toUpperCase();
    return TEAM_ALIASES[upper] || name.substring(0, 3).toUpperCase();
}

function parseVlrDate(vlrDate: string, vlrTime: string): { date: Date, raw: boolean } | null {
  try {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const parts = vlrDate.split(',').map(p => p.trim());
    if (parts.length < 2) return null;

    const monthDayPart = parts[1].trim().split(/\s+/);
    const monthName = monthDayPart[0];
    const day = parseInt(monthDayPart[1]);
    const month = months[monthName];

    if (month === undefined || isNaN(day)) return null;

    const now = new Date();
    let year = now.getFullYear();

    if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
        year = parseInt(parts[2]);
    } else if (now.getMonth() === 11 && month === 0) {
        year++; 
    } else if (now.getMonth() === 0 && month === 11) {
        year--; 
    }

    // Fecha base UTC sin hora
    const date = new Date(Date.UTC(year, month, day));
    
    // Parsear hora (texto "10:00 AM" etc)
    if (vlrTime && vlrTime.toLowerCase() !== 'live' && !vlrTime.includes('h')) {
        const timeMatch = vlrTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            date.setUTCHours(hours, minutes, 0, 0);
        }
    }
    return { date, raw: true };
  } catch (e) {
    return null;
  }
}

export async function fetchVlrMatches(limitPages: number = 3): Promise<VlrPayload> {
  const upcomingPageCount = Math.min(Math.max(limitPages, 1), 3);

  const fetchPage = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return response.text();
  };

  const promises = [fetchPage(VLR_MATCHES_URL)];
  if (upcomingPageCount >= 2) promises.push(fetchPage(`${VLR_MATCHES_URL}/?page=2`));
  if (upcomingPageCount >= 3) promises.push(fetchPage(`${VLR_MATCHES_URL}/?page=3`));
  
  // Results pages
  promises.push(fetchPage("https://www.vlr.gg/matches/results"));
  promises.push(fetchPage("https://www.vlr.gg/matches/results/?page=2"));
  promises.push(fetchPage("https://www.vlr.gg/matches/results/?page=3"));

  const responses = await Promise.all(promises);
  
  // Upcoming matches are usually the first few pages (1 to 3)
  const upcomingHtmls = responses.slice(0, upcomingPageCount);
  const resultsHtmls = responses.slice(upcomingPageCount);

  if (upcomingHtmls.length === 0) throw new Error("VLR page 1 fetch failed");
  
  const parseMatches = (html: string | null) => {
    if (!html) return [];
    const $ = cheerio.load(html);
    const results: VlrMatch[] = [];

    $(".wf-label.mod-large").each((_, label) => {
      const rawDate = $(label).text().trim();
      let next = $(label).next();
      while (next.length && !next.hasClass("wf-label")) {
        const processItem = (item: any) => {
          const card = $(item);
          const id = card.attr("href")?.split("/")[1] || "";
          const time = cleanText(card.find(".match-item-time").first().text());
          const eta = cleanText(card.find(".match-item-eta").first().text());
          const event = cleanText(card.find(".match-item-event").first().text());
          const teams = card.find(".match-item-vs-team-name").map((__, team) => {
            const raw = cleanText($(team).text());
            return normalizeTeamName(raw);
          }).get().filter(Boolean);
          const teamsLabel = teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : teams[0] ?? "";
          
          const eventUpper = event.toUpperCase();
          const isVctEmea = eventUpper.includes("VCT") && 
                           eventUpper.includes("EMEA") && 
                           !eventUpper.includes("GAME CHANGERS") && 
                           !eventUpper.includes("CHALLENGERS") &&
                           !eventUpper.includes("ASCENSION");

          if (teamsLabel && event) {
            const parsed = parseVlrDate(rawDate, time); // Unadjusted
            
            results.push({ 
              time: time || "LIVE", 
              teams: teamsLabel, 
              event, 
              id, 
              date: parsed ? parsed.date.toISOString() : undefined, 
              rawDate: rawDate,
              isVctEmea,
              eta 
            });
          }
        };
        if (next.hasClass("match-item")) processItem(next);
        else next.find(".match-item").each((__, item) => processItem(item));
        next = next.next();
      }
    });
    return results;
  };

  const upcomingResults = upcomingHtmls.flatMap(html => parseMatches(html));
  const finishedResults = resultsHtmls.flatMap(html => parseMatches(html));
  
  // Use map to dedup
  const allMatchesMap = new Map();
  [...upcomingResults, ...finishedResults].forEach(m => {
    if (!allMatchesMap.has(m.id)) allMatchesMap.set(m.id, m);
  });
  
  let results = Array.from(allMatchesMap.values()) as VlrMatch[];

  // --- DYNAMIC TIMEZONE CORRECTION ---
  let offsetMs = 0;
  
  // Find a reference match: upcoming, with ETA in hours (e.g. "2h" or "2h 30m"), not days
  // ETA format examples: "2h 30m", "43m", "2d"
  const referenceMatch = upcomingResults.find(m => 
    m.eta && m.eta.includes('h') && !m.eta.includes('d') && !m.eta.includes('w') && m.date
  );

  if (referenceMatch && referenceMatch.date) {
    // Parse ETA
    // Parse ETA: support "2h 30m", "43m", "2h"
    const hoursMatch = referenceMatch.eta!.match(/(\d+)h/);
    const minsMatch = referenceMatch.eta!.match(/(\d+)m/);
    
    const h = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const m = minsMatch ? parseInt(minsMatch[1]) : 0;
    
    if (h > 0 || m > 0) {
        const etaMs = (h * 60 * 60 * 1000) + (m * 60 * 1000);
        
        const now = Date.now();
        const expectedUtc = now + etaMs; 
        const scrapedUtc = new Date(referenceMatch.date).getTime();
        
        // Offset = Expected - Scraped
        // Example: Exp=16:00, Scraped=10:00 -> Offset = +6h
        const diff = expectedUtc - scrapedUtc;
        
        // Round to nearest hour
        const diffHours = Math.round(diff / 3600000);
        offsetMs = diffHours * 3600000;
        
        console.log(`[VLR Sync] Calibrated Timezone Offset: ${diffHours}h (Ref: ${referenceMatch.teams} @ ${referenceMatch.time}, ETA: ${referenceMatch.eta})`);
    }
  } else {
     console.log(`[VLR Sync] Could not calibrate timezone (no suitable ETA found). Defaulting to 0h offset.`);
  }

  // Apply offset to ALL matches
  if (offsetMs !== 0) {
      results = results.map(m => {
          if (!m.date) return m;
          const d = new Date(new Date(m.date).getTime() + offsetMs);
          return { ...m, date: d.toISOString() };
      });
  }

  const emeaMatches = results.filter((m) => m.isVctEmea);
  
  emeaMatches.sort((a, b) => {
    const isLiveA = a.time === "LIVE";
    const isLiveB = b.time === "LIVE";
    if (isLiveA && !isLiveB) return -1;
    if (isLiveB && !isLiveA) return 1;

    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    const now = Date.now();

    const isFutureA = dateA > now;
    const isFutureB = dateB > now;

    if (isFutureA && !isFutureB) return -1;
    if (isFutureB && !isFutureA) return 1;

    if (isFutureA && isFutureB) return dateA - dateB;
    return dateB - dateA;
  });

  const finalMatches = emeaMatches.length > 0 ? emeaMatches.slice(0, 20) : results.slice(0, 10);

  // Sync with DB
  syncMatchesToDb(finalMatches).catch(console.error);

  return {
    stats: [],
    upcomingMatches: finalMatches,
    scoring: [
        { label: "Kill", value: "+2" }, // ... scores
        { label: "Assist", value: "+1" },
        { label: "First blood", value: "+3" },
        { label: "Clutch round", value: "+4" },
        { label: "Match win", value: "+5" },
        { label: "Series MVP", value: "+6" },
        { label: "Negative K/D", value: "-1" },
    ],
  };
}

export function calculateFantasyPoints(stats: { 
  kills: number; 
  deaths: number; 
  assists: number; 
  fb: number; 
  fd: number; 
  clutches: number;
  mvp?: boolean;
}, role?: 'Duelista' | 'Iniciador' | 'Controlador' | 'Centinela'): number {
  let points = 0;

  if (!role) {
    points += stats.kills * 2;
    points += stats.assists * 1;
    points += stats.fb * 3;
    points += stats.clutches * 4;
    if (stats.kills < stats.deaths) points -= 1;
    return Math.round(points);
  }

  switch (role) {
    case 'Duelista':
      points += stats.kills * 1;
      points += stats.assists * 0.5;
      points += stats.fb * 5;
      points += stats.fd * -3;
      points += stats.deaths * -1;
      if (stats.kills >= 45) points += 10;
      if (stats.mvp) points += 10;
      break;

    case 'Centinela':
      points += stats.kills * 2;
      points += stats.assists * 0.5;
      points += stats.fb * 6;
      points += stats.fd * -4;
      points += stats.deaths * -1;
      if (stats.mvp) points += 5;
      break;

    case 'Iniciador':
    case 'Controlador':
      points += stats.kills * 1.5;
      points += stats.assists * 2;
      points += stats.fb * 3;
      points += stats.fd * -2;
      points += stats.deaths * -1;
      if (stats.assists >= 20) points += 10;
      if (stats.mvp) points += 5;
      break;
  }

  return Math.round(points);
}

async function getOrCreateTeam(name: string) {
    const upperName = name.toUpperCase();
    const tag = TEAM_ALIASES[upperName] || upperName.substring(0, 4);
    
    // Buscar primero
    const { data: existing } = await (supabaseAdmin
        .from('pro_teams')
        .select('id')
        .or(`name.eq."${name}",tag.eq."${tag}"`) as any)
        .maybeSingle();
    
    if (existing) return (existing as any).id;

    console.log(`  🆕 Creando equipo faltante: ${name} (${tag})`);
    const { data: created, error } = await (supabaseAdmin
        .from('pro_teams')
        .insert({
            name: name,
            tag: tag,
            region: 'EMEA'
        } as any) as any)
        .select('id')
        .single();
    
    if (error) {
        console.error(`  ❌ Error creando equipo ${name}:`, error);
        return null;
    }
    return (created as any).id;
}

const AGENT_ROLES: Record<string, string> = {
  'jett': 'Duelista', 'raze': 'Duelista', 'phoenix': 'Duelista', 'reyna': 'Duelista', 'yoru': 'Duelista', 'neon': 'Duelista', 'iso': 'Duelista',
  'sova': 'Iniciador', 'breach': 'Iniciador', 'skye': 'Iniciador', 'kayo': 'Iniciador', 'fade': 'Iniciador', 'gekko': 'Iniciador',
  'brimstone': 'Controlador', 'omen': 'Controlador', 'viper': 'Controlador', 'astra': 'Controlador', 'harbor': 'Controlador', 'clove': 'Controlador',
  'killjoy': 'Centinela', 'cypher': 'Centinela', 'sage': 'Centinela', 'chamber': 'Centinela', 'deadlock': 'Centinela', 'vyse': 'Centinela'
};

export async function scrapeMatchDetails(matchId: string): Promise<{ stats: PlayerStats[], status: string } | null> {
    const url = `https://www.vlr.gg/${matchId}`;
    
    try {
      const response = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      });
    
      if (!response.ok) return null;
    
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Determine Status
      let status = 'upcoming';
      const headerStatus = $(".match-header-vs-score").text().trim().toLowerCase();
      if (headerStatus.includes("final") || /\d+/.test(headerStatus)) {
          status = 'finished';
      }
      const liveIndicator = $(".match-header-vs-note").text().toLowerCase();
      if (liveIndicator.includes("live") || liveIndicator.includes("map")) {
          status = 'live';
      }

      const allStats: any[] = [];
      const mapContainers = $(".vm-stats-container .vm-stats-game"); 

      if (!mapContainers.length) {
          const table = $("table.wf-table-inset.mod-overview");
          if (table.length) {
              const stats = processVlrTable($, table.first(), "Map 1");
              allStats.push(...stats);
          }
      } else {
        mapContainers.each((i, container) => {
            const mapName = $(container).find(".map-name").text().trim() || `Map ${i + 1}`;
            if (mapName.toLowerCase().includes("all maps")) return;

            const table = $(container).find("table.wf-table-inset.mod-overview");
            if (table.length) {
                const stats = processVlrTable($, table, mapName);
                allStats.push(...stats);
            }
        });
      }
    
      return { stats: allStats, status };
    } catch (error) {
      console.error(`Exception scraping match ${matchId}:`, error);
      return null;
    }
}

function processVlrTable($: any, table: any, mapName: string): PlayerStats[] {
    const results: PlayerStats[] = [];
    const rows = $(table).find("tr");
    const headerRow = rows.first();
    const dataRows = rows.slice(1);
    
    const headers = headerRow.find("th").map((_: any, th: any) => $(th).text().trim().toUpperCase()).get();
    const findIdx = (names: string[]) => headers.findIndex((h: string) => names.includes(h));
    
    // El agente suele no tener nombre en el header (th vacío), así que buscamos la columna 
    // que suele estar entre Player y Kills que contenga imágenes.
    let agentColIdx = 1; // Default
    
    const idx = {
      k: findIdx(["K", "KILL", "KILLS"]),
      d: findIdx(["D", "DEATH", "DEATHS"]),
      a: findIdx(["A", "ASSIST", "ASSISTS"]),
      fk: findIdx(["FK", "FIRST KILLS"]),
      fd: findIdx(["FD", "FIRST DEATHS"]),
      acs: findIdx(["ACS", "AVERAGE COMBAT SCORE"]),
      cl: findIdx(["CL", "CLUTCHES"]),
    };

    dataRows.each((__: any, row: any) => {
        const cols = $(row).find("td");
        if (cols.length < 5) return;

        const playerCell = $(cols[0]);
        const playerLink = playerCell.find("a").attr("href") || "";
        const playerId = playerLink.split("/")[2] || "";
        
        let nickname = playerCell.find(".text-of").text().trim();
        if (!nickname) {
            // Fallback: take the first text node (usually the nickname) and ignore children (like the tag)
            nickname = playerCell.contents().filter((_: any, el: any) => el.type === 'text').text().trim();
            if (!nickname) nickname = playerCell.text().trim().split("\n")[0].trim();
        }
        
        // Remove Tag from Nickname if it leaked in (e.g. "[FNC] Boaster" -> "Boaster")
        nickname = nickname.replace(/^\[.*?\]\s*/, "").replace(/\s+\[.*?\]$/, "").trim();

        const teamTag = playerCell.find(".ge-text-light").text().trim();
        if (!nickname || !playerId || nickname.toLowerCase().includes("team")) return;

        // MVP Detection: check for .mod-vlr-mvp class or "MVP" text
        const isMvp = playerCell.find(".mod-vlr-mvp").length > 0 || playerCell.text().includes("MVP");

        // Detección dinámica de agente: buscamos una imagen de agente en las primeras columnas
        let agentName = "";
        for (let i = 1; i <= 2; i++) {
           const img = $(cols[i]).find("img");
           if (img.length > 0) {
              const title = img.attr("title")?.toLowerCase();
              if (title && AGENT_ROLES[title]) {
                 agentName = title;
                 break;
              }
           }
        }
        
        const agentRole = AGENT_ROLES[agentName] || "";

        const getStat = (colIdx: number) => {
            if (colIdx === -1 || colIdx >= cols.length) return 0;
            const col = $(cols[colIdx]);
            const val = col.find(".mod-both").first().text().trim() || col.text().trim();
            // Limpiar texto para obtener solo números (ej: "20 / 10" -> 20)
            const cleanVal = val.split('/')[0].trim().replace(/[^\d]/g, "");
            return parseInt(cleanVal) || 0;
        };
        
        results.push({
            vlr_id: playerId,
            nickname,
            teamTag,
            map_name: mapName,
            agent_name: agentName,
            agent_role: agentRole,
            kills: getStat(idx.k),
            deaths: getStat(idx.d),
            assists: getStat(idx.a),
            fb: getStat(idx.fk),
            fd: getStat(idx.fd),
            acs: getStat(idx.acs),
            clutches: getStat(idx.cl),
            mvp: isMvp
        });
    });
    return results;
}



async function getOrCreateGameweekByDate(dateStr: string) {
    const date = new Date(dateStr);
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startStr = monday.toISOString();
    
    // Buscar si existe
    const { data: existing } = await (supabaseAdmin
        .from('gameweeks')
        .select('id')
        .eq('start_date', startStr)
        .order('id', { ascending: true })
        .limit(1) as any)
        .maybeSingle();
    
    if (existing) return (existing as any).id;

    // Crear nueva
    const weekLabel = monday.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    const { data: created, error } = await (supabaseAdmin
        .from('gameweeks')
        .insert({
            name: `Jornada ${weekLabel}`,
            start_date: startStr,
            end_date: sunday.toISOString(),
            is_active: false,
            is_locked: false
        } as any) as any)
        .select('id')
        .single();
    
    if (error) {
        console.error("Error creating gameweek:", error);
        return null;
    }
    return (created as any).id;
}

export async function syncMatchesToDb(matches: VlrMatch[]) {
    const { data: teamsData } = await (supabaseAdmin.from('pro_teams').select('id, name, tag') as any);
    
    const { data: existingMatches } = await (supabaseAdmin.from('matches').select('vlr_id, status') as any);
    const finishedIds = new Set((existingMatches as any[])?.filter((m: any) => m.status === 'finished').map((m: any) => m.vlr_id) || []);

    const teamMap = new Map<string, string>();
    (teamsData as any[])?.forEach((t: any) => {
      if (t.name) teamMap.set(t.name.toUpperCase(), t.id);
      if (t.tag) teamMap.set(t.tag.toUpperCase(), t.id);
    });

    const matchUpserts = [];

    for (const m of matches) {
        if (!m.isVctEmea) continue;
        if (finishedIds.has(m.id)) continue;

        const parts = m.teams.split(" vs ");
        if (parts.length < 2) continue;

        const rawNameA = parts[0].trim();
        const rawNameB = parts[1].trim();
        
        const nameA = normalizeTeamName(rawNameA);
        const nameB = normalizeTeamName(rawNameB);
        
        const tagA = TEAM_ALIASES[nameA.toUpperCase()] || nameA.substring(0, 4).toUpperCase();
        const tagB = TEAM_ALIASES[nameB.toUpperCase()] || nameB.substring(0, 4).toUpperCase();
        
        let teamAId = teamMap.get(nameA.toUpperCase()) || teamMap.get(tagA);
        let teamBId = teamMap.get(nameB.toUpperCase()) || teamMap.get(tagB);
        
        if (!teamAId) teamAId = await getOrCreateTeam(nameA);
        if (!teamBId) teamBId = await getOrCreateTeam(nameB);
        
        if (!teamAId || !teamBId) {
            continue;
        }

        const matchDate = m.date || null;
        let gwId = null;
        if (matchDate) {
            gwId = await getOrCreateGameweekByDate(matchDate);
        }

        let status = 'upcoming';
        const timeLower = m.time.toLowerCase();
        if (timeLower.includes("live")) {
            status = 'live';
        } else if (timeLower.includes("final") || timeLower.includes("completed") || /\d+-\d+/.test(m.time)) {
            status = 'finished';
        }

        matchUpserts.push({
          vlr_id: m.id,
          team_a: teamAId,
          team_b: teamBId,
          match_date: matchDate,
          status: status,
          gameweek_id: gwId,
        });
    }

    if (matchUpserts.length > 0) {
      console.log(`Syncing ${matchUpserts.length} matches to DB...`);
      const { error: upsertError } = await supabaseAdmin.from('matches').upsert(matchUpserts as any, { onConflict: 'vlr_id' });
      if (upsertError) console.error("Error upserting matches:", upsertError);
    }
}
