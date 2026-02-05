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
};

export type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: VlrMatch[];
  scoring: { label: string; value: string }[];
};

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
  "PCIFIC ESPORTS": "PCF",
  "TEAM LIQUID": "TL",
  "GENTLE MATES": "M8",
  "ULF ESPORTS": "ULF",
};

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function parseVlrDate(vlrDate: string, vlrTime: string) {
  try {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    // El formato suele ser "Weekday, Month Day, Year" o "Today, Month Day"
    // O incluso "Yesterday, Month Day"
    const parts = vlrDate.split(',').map(p => p.trim());
    if (parts.length < 2) {
      if (parts[0].toLowerCase().includes("today") || parts[0].toLowerCase().includes("yesterday") || parts[0].toLowerCase().includes("tomorrow")) {
         // Si es Today/Yesterday, a veces no viene el mes en el label principal o viene distinto
         // Pero VLR suele poner "Weekday, Month Day"
      }
      return null;
    }

    // Buscamos el bloque que contiene el mes (ej: "February 5")
    const monthDayPart = parts[1].trim().split(/\s+/);
    const monthName = monthDayPart[0];
    const day = parseInt(monthDayPart[1]);
    const month = months[monthName];

    if (month === undefined || isNaN(day)) return null;

    const now = new Date();
    let year = now.getFullYear();

    // Si el tercer fragmento es un año, lo usamos
    if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
        year = parseInt(parts[2]);
    } else if (now.getMonth() === 11 && month === 0) {
        year++; // Si estamos en Dic y el partido es en Enero
    } else if (now.getMonth() === 0 && month === 11) {
        year--; // Si estamos en Enero y el partido fue en Dic
    }

    const date = new Date(year, month, day);
    
    if (vlrTime && vlrTime.toLowerCase() !== 'live' && !vlrTime.includes('h')) {
        const timeMatch = vlrTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            date.setHours(hours, minutes, 0, 0);
        } else if (vlrTime.includes(":")) {
          // Formato 24h: "14:30"
          const [h, m] = vlrTime.split(":").map(Number);
          if (!isNaN(h) && !isNaN(m)) date.setHours(h, m, 0, 0);
        }
    }
    return date.toISOString();
  } catch (e) {
    return null;
  }
}

export async function fetchVlrMatches(): Promise<VlrPayload> {
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

  const [upcomingHtml, resultsHtml] = await Promise.all([
    fetchPage(VLR_MATCHES_URL),
    fetchPage("https://www.vlr.gg/matches/results")
  ]);

  if (!upcomingHtml) throw new Error("VLR upcoming fetch failed");
  
  const parseMatches = (html: string) => {
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
          const event = cleanText(card.find(".match-item-event").first().text());
          const teams = card.find(".match-item-vs-team-name").map((__, team) => cleanText($(team).text())).get().filter(Boolean);
          const teamsLabel = teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : teams[0] ?? "";
          
          const eventUpper = event.toUpperCase();
          const isVctEmea = eventUpper.includes("VCT") && eventUpper.includes("EMEA") && !eventUpper.includes("GAME CHANGERS") && !eventUpper.includes("CHALLENGERS");

          if (teamsLabel && event) {
            const parsedDate = parseVlrDate(rawDate, time);
            results.push({ 
              time: time || "LIVE", 
              teams: teamsLabel, 
              event, 
              id, 
              date: parsedDate || undefined, // Solo ISO o undefined
              rawDate: rawDate,
              isVctEmea 
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

  const upcomingResults = parseMatches(upcomingHtml);
  const finishedResults = resultsHtml ? parseMatches(resultsHtml) : [];
  
  // MERGE results and dedup
  const allMatchesMap = new Map();
  [...upcomingResults, ...finishedResults].forEach(m => {
    if (!allMatchesMap.has(m.id)) allMatchesMap.set(m.id, m);
  });
  
  const results = Array.from(allMatchesMap.values());
  const emeaMatches = results.filter((m) => m.isVctEmea);
  
  // Ordenar: primero los Live, luego los del futuro cercano, luego los pasados
  emeaMatches.sort((a: any, b: any) => {
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

    if (isFutureA && isFutureB) return dateA - dateB; // Nearest future first
    return dateB - dateA; // Newest past first
  });

  const finalMatches = emeaMatches.length > 0 ? emeaMatches.slice(0, 20) : results.slice(0, 10);


  // Sync with DB in background
  syncMatchesToDb(finalMatches).catch(console.error);

  return {
    stats: [],
    upcomingMatches: finalMatches,
    scoring: [
        { label: "Kill", value: "+2" },
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

  // Si no hay rol, usar sistema estándar (legacy)
  if (!role) {
    points += stats.kills * 2;
    points += stats.assists * 1;
    points += stats.fb * 3;
    points += stats.clutches * 4;
    if (stats.kills < stats.deaths) points -= 1;
    return Math.round(points);
  }

  // Sistema por roles
  switch (role) {
    case 'Duelista':
      points += stats.kills * 1;
      points += stats.assists * 0.5;
      points += stats.fb * 5;
      points += stats.fd * -3;
      points += stats.deaths * -1;
      if (stats.kills >= 45) points += 10;
      if (stats.mvp) points += 5;
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
      if (stats.assists >= 20) {
        points += 10;
      } else {
        points -= 5;
      }
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

    // Crear si no existe
    console.log(`  🆕 Creando equipo faltante: ${name} (${tag})`);
    const { data: created, error } = await (supabaseAdmin
        .from('pro_teams')
        .insert({
            name: name,
            tag: tag,
            region: 'EMEA' // Default para este proyecto
        } as any) as any)
        .select('id')
        .single();
    
    if (error) {
        console.error(`  ❌ Error creando equipo ${name}:`, error);
        return null;
    }
    return (created as any).id;
}

export async function scrapeMatchDetails(matchId: string) {
    const url = `https://www.vlr.gg/${matchId}`;
    
    try {
      const response = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    
      if (!response.ok) {
        console.error(`VLR fetch failed for ${matchId}: ${response.status} ${response.statusText}`);
        return null;
      }
    
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // We look for all stats tables
      const tables = $("table.wf-table-inset.mod-overview");
      
      if (!tables.length) {
        console.error(`VLR stats table not found for ${matchId}. The match might not have started or stats are not yet available.`);
        return null;
      }
      
      const statsMap = new Map<string, any>();
    
      tables.each((i, table) => {
        const rows = $(table).find("tr");
        const headerRow = rows.first();
        const dataRows = rows.slice(1);
        
        // Dynamic column detection
        const headers = headerRow.find("th").map((_, th) => $(th).text().trim().toUpperCase()).get();
        if (headers.length === 0) return;

        const findIdx = (names: string[]) => headers.findIndex(h => names.includes(h));
        
        const idx = {
          k: findIdx(["K", "KILL", "KILLS"]),
          d: findIdx(["D", "DEATH", "DEATHS"]),
          a: findIdx(["A", "ASSIST", "ASSISTS"]),
          fk: findIdx(["FK", "FIRST KILLS"]),
          fd: findIdx(["FD", "FIRST DEATHS"]),
          acs: findIdx(["ACS", "AVERAGE COMBAT SCORE"]),
        };

        // If we can't find basic K/D/A, this table might not be what we want
        if (idx.k === -1 || idx.d === -1) {
            // console.log(`Table ${i} in ${matchId} skipped: missing K/D headers`);
            return;
        }

        dataRows.each((__, row) => {
          const cols = $(row).find("td");
          if (cols.length < headers.length) return;

          const playerCell = $(cols[0]);
          const playerLink = playerCell.find("a").attr("href") || "";
          const playerId = playerLink.split("/")[2] || "";
          
          // Better nickname and team tag extraction: VLR sometimes wraps in .mod-player, sometimes not
          const playerInfo = playerCell.find(".mod-player");
          
          let nickname = playerCell.find(".text-of").text().trim();
          if (!nickname && playerInfo.length) {
              nickname = playerInfo.text().trim().split("\n")[0].trim();
          }
          if (!nickname) {
              nickname = playerCell.text().trim().split("\n")[0].trim();
          }

          let teamTag = playerCell.find(".ge-text-light").text().trim();
          if (!teamTag && playerInfo.length) {
              teamTag = playerInfo.find(".ge-text-light").text().trim();
          }
          
          if (!nickname || !playerId || nickname.toLowerCase().includes("team")) return;

          const getStat = (colIdx: number) => {
              if (colIdx === -1) return 0;
              const col = $(cols[colIdx]);
              // Prefer .mod-both (total) if it exists, otherwise use raw text
              const val = col.find(".mod-both").first().text().trim() || col.text().trim();
              // Clean up any weird characters and parse
              return parseInt(val.replace(/[^\d]/g, "")) || 0;
          };
          
          const currentStats = {
            vlr_id: playerId,
            nickname,
            teamTag,
            kills: getStat(idx.k),
            deaths: getStat(idx.d),
            assists: getStat(idx.a),
            fb: getStat(idx.fk),
            fd: getStat(idx.fd),
            acs: getStat(idx.acs),
            clutches: 0
          };

          // If we find the same player in multiple tables, prefer the one with more kills (usually "All Maps")
          const existing = statsMap.get(playerId);
          if (!existing || currentStats.kills > existing.kills) {
            statsMap.set(playerId, currentStats);
          }
        });
      });
    
      const result = Array.from(statsMap.values());
      if (result.length === 0) {
          console.warn(`VLR: Found tables but extracted 0 players for match ${matchId}`);
      }
      return result;
    } catch (error) {
      console.error(`Exception scraping match ${matchId}:`, error);
      return null;
    }
}

async function getOrCreateGameweekByDate(dateStr: string) {
    const date = new Date(dateStr);
    // Calcular Lunes 00:00 y Domingo 23:59
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
    
    // De esta forma protegemos los partidos finalizados de ser sobreescritos por error
    const { data: existingMatches } = await (supabaseAdmin.from('matches').select('vlr_id, status') as any);
    const finishedIds = new Set((existingMatches as any[])?.filter((m: any) => m.status === 'finished').map((m: any) => m.vlr_id) || []);

    const teamMap = new Map<string, string>();
    (teamsData as any[])?.forEach((t: any) => {
      if (t.name) teamMap.set(t.name.toUpperCase(), t.id);
      if (t.tag) teamMap.set(t.tag.toUpperCase(), t.id);
    });

    const matchUpserts = [];

    for (const m of matches) {
        if (finishedIds.has(m.id)) continue;

        const parts = m.teams.split(" vs ");
        if (parts.length < 2) continue;

        let nameA = parts[0]?.toUpperCase() || "";
        let nameB = parts[1]?.toUpperCase() || "";
        
        const tagA = TEAM_ALIASES[nameA] || nameA;
        const tagB = TEAM_ALIASES[nameB] || nameB;
        
        let teamAId = teamMap.get(nameA) || teamMap.get(tagA);
        let teamBId = teamMap.get(nameB) || teamMap.get(tagB);
        
        if (!teamAId) teamAId = await getOrCreateTeam(parts[0]);
        if (!teamBId) teamBId = await getOrCreateTeam(parts[1]);
        
        if (!teamAId || !teamBId) {
            console.log(`Sync Skip: teams not found and could not create [${nameA} vs ${nameB}]`);
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
