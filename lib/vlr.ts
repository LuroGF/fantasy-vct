export type VlrMatchStatus = "upcoming" | "live" | "finished" | "completed";

export interface VlrMatch {
  vlrId: string;

  eventName: string | null;
  eventSeries: string | null;

  teamA: {
    vlrId: string | null;
    name: string;
  };

  teamB: {
    vlrId: string | null;
    name: string;
  };

  matchDate: string | null;

  status: VlrMatchStatus;

  teamAScore: number | null;
  teamBScore: number | null;
}

type V2MatchSegment = {
  team1?: string;
  team2?: string;

  score1?: string | number;
  score2?: string | number;

  unix_timestamp?: string;

  match_page?: string;

  time_until_match?: string;
  time_completed?: string;

  match_series?: string;
  match_event?: string;

  round_info?: string;
  tournament_name?: string;
};

type V2MatchResponse = {
  status?: string;
  data?: {
    status?: number;
    segments?: V2MatchSegment[];
  };
};

function getMatchIdFromPage(matchPage?: string): string | null {
  if (!matchPage) {
    return null;
  }

  /*
   * Puede venir como:
   * https://www.vlr.gg/595657/...
   * /595657/...
   */

  const match =
    matchPage.match(/vlr\.gg\/(\d+)/) ?? matchPage.match(/^\/?(\d+)/);

  return match?.[1] ?? null;
}

function parseScore(value?: string | number): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMatchDate(raw?: string): string | null {
  if (!raw) {
    return null;
  }

  const value = raw.trim();

  /*
   * La API puede devolver:
   *
   * 1) Fecha UTC:
   *    2026-08-28 14:00:00
   *
   * 2) ISO:
   *    2026-08-28T14:00:00Z
   *
   * 3) Unix timestamp en segundos:
   *    1713996000
   *
   * 4) Unix timestamp en milisegundos:
   *    1713996000000
   */

  // Unix timestamp: segundos o milisegundos
  if (/^\d+$/.test(value)) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return null;
    }

    const milliseconds = value.length >= 13 ? numeric : numeric * 1000;

    const date = new Date(milliseconds);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  // ISO con timezone explícita
  if (/Z$/i.test(value) || /[+-]\d{2}:\d{2}$/.test(value)) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  // Formato UTC de vlrggapi:
  // YYYY-MM-DD HH:mm:ss
  const normalized = value.replace(" ", "T");

  const date = new Date(`${normalized}Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

async function fetchMatchGroup(
  query: "upcoming" | "live_score" | "results",
): Promise<V2MatchSegment[]> {
  const baseUrl = process.env.VLR_API_URL;

  if (!baseUrl) {
    throw new Error("VLR_API_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/v2/match?q=${query}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`VLR API ${query} error ${response.status}`);
  }

  const json = (await response.json()) as V2MatchResponse;

  return json.data?.segments ?? [];
}

/**
 * Alcance actual: ligas internacionales VCT, Masters, Champions y LOCK//IN.
 * Las etiquetas desconocidas se excluyen hasta incorporarlas al catalogo.
 * No basta con que un nombre contenga VCT: Game Changers y Challengers
 * tambien pueden llevar ese prefijo.
 */
export function isVctEvent(raw: {
  match_event?: string;
  tournament_name?: string;
  match_series?: string;
}): boolean {
  const labels = [raw.match_event, raw.tournament_name, raw.match_series]
    .map((value) => (value ?? '').trim())
    .filter(Boolean);
  const normalized = labels.map((value) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
  );
  const allLabels = normalized.join(' ');

  if (/\b(game\s*changers?|gc|challengers?|ascension|threshold|off\s*season|showmatch)\b/.test(allLabels)) {
    return false;
  }

  // Algunas respuestas solo proporcionan match_series como titulo del evento.
  return normalized.some((title) =>
    /^(?:vct|valorant champions tour)\s+(?:20\d{2}\s+)?(?:americas|emea|pacific|china|cn|masters|champions|lock\s+in)\b/.test(title) ||
    /^(?:valorant\s+)?champions\s+20\d{2}\b/.test(title) ||
    /^(?:valorant\s+)?masters\s+(?:20\d{2}|[a-z]+\s+20\d{2})\b/.test(title),
  );
}

export async function getVlrMatches(): Promise<VlrMatch[]> {
  const [upcoming, live, results] = await Promise.all([
    fetchMatchGroup('upcoming'),
    fetchMatchGroup('live_score'),
    fetchMatchGroup('results'),
  ]);

  const finalMatches: VlrMatch[] = [];
  const groups: Array<{ rows: V2MatchSegment[]; status: VlrMatchStatus }> = [
    { rows: upcoming, status: 'upcoming' },
    { rows: live, status: 'live' },
    { rows: results, status: 'completed' },
  ];

  for (const { rows, status } of groups) {
    for (const raw of rows) {
      if (!isVctEvent(raw)) continue;

      const vlrId = getMatchIdFromPage(raw.match_page);
      const matchDate = normalizeMatchDate(raw.unix_timestamp);

      if (!vlrId || !raw.team1 || !raw.team2) continue;
      // Conservar resultados sin fecha para recuperar match_date en la sincronizacion.
      if (status !== 'completed' && !matchDate) continue;

      finalMatches.push({
        vlrId,
        eventName: raw.match_event?.trim() || raw.tournament_name?.trim() || raw.match_series?.trim() || null,
        eventSeries: raw.match_series?.trim() || null,
        teamA: { vlrId: null, name: raw.team1 },
        teamB: { vlrId: null, name: raw.team2 },
        matchDate,
        status,
        teamAScore: status === 'upcoming' ? null : parseScore(raw.score1),
        teamBScore: status === 'upcoming' ? null : parseScore(raw.score2),
      });
    }
  }

  // El ultimo estado gana: results > live > upcoming.
  return Array.from(
    new Map(finalMatches.map((match) => [match.vlrId, match])).values(),
  );
}
export interface VlrMatchDetails {
  matchId: string;

  status: string;

  teams: Array<{
    id: string;
    name: string;
    score: number | null;
    logo: string | null;
  }>;

  maps: VlrMapDetails[];
}

export type VlrRosterStatus = "active" | "benched" | "former";

export interface VlrTeamRosterPlayer {
  vlrId: string;
  alias: string;
  realName: string | null;
  country: string | null;
  role: string | null;
  status: VlrRosterStatus;
}

export interface VlrMapPlayer {
  name: string;
  agent: string | null;

  rating: number | null;
  acs: number | null;

  kills: number | null;
  deaths: number | null;
  assists: number | null;

  fk: number | null;
  fd: number | null;
}

export interface VlrMapDetails {
  mapName: string;

  score: {
    team1: number;
    team2: number;
  };

  players: {
    team1: VlrMapPlayer[];
    team2: VlrMapPlayer[];
  };
}

type V2RawPlayer = {
  name?: string;

  agent?: string;

  rating?: string | number;
  acs?: string | number;

  kills?: string | number;
  deaths?: string | number;
  assists?: string | number;

  fk?: string | number;
  fd?: string | number;
};

type V2RawMap = {
  map_name?: string;

  score?: {
    team1?: string | number;
    team2?: string | number;
  };

  players?: {
    team1?: V2RawPlayer[];
    team2?: V2RawPlayer[];
  };
};

type V2MatchDetailsSegment = {
  match_id?: string;

  status?: string;

  teams?: Array<{
    id?: string | number;
    name?: string;
    score?: string | number;
    logo?: string;
  }>;

  maps?: V2RawMap[];
};

type V2MatchDetailsResponse = {
  status?: string;

  data?: {
    status?: number;

    segments?: V2MatchDetailsSegment[];
  };

  meta?: unknown;
  message?: string | null;
};

type V2TeamRosterPlayer = {
  id?: string | number;
  alias?: string;
  real_name?: string;
  country?: string;
  role?: string;
  is_staff?: boolean;
};

type V2TeamRosterSegment = {
  active?: V2TeamRosterPlayer[];
  benched?: V2TeamRosterPlayer[];
  former?: V2TeamRosterPlayer[];
};

type V2TeamRosterResponse = {
  data?: {
    segments?: V2TeamRosterSegment[];
  };
};

function nullableNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVlrMapPlayer(player: V2RawPlayer): VlrMapPlayer {
  return {
    name: player.name ?? "",

    agent: player.agent && player.agent.trim() !== "" ? player.agent : null,

    rating: nullableNumber(player.rating),

    acs: nullableNumber(player.acs),

    kills: nullableNumber(player.kills),

    deaths: nullableNumber(player.deaths),

    assists: nullableNumber(player.assists),

    fk: nullableNumber(player.fk),

    fd: nullableNumber(player.fd),
  };
}

export async function getVlrMatchDetails(
  matchId: string,
): Promise<VlrMatchDetails | null> {
  const baseUrl = process.env.VLR_API_URL;

  if (!baseUrl) {
    throw new Error("VLR_API_URL is not configured");
  }

  const response = await fetch(
    `${baseUrl}/v2/match/details?match_id=${encodeURIComponent(matchId)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `VLR match details error ${response.status} for match ${matchId}`,
    );
  }

  const json = (await response.json()) as V2MatchDetailsResponse;

  /*
   * La API devuelve:
   *
   * data.segments[0]
   *
   * y dentro están:
   * - teams
   * - maps
   * - match_id
   * - status
   */
  const segment = json.data?.segments?.[0];

  if (!segment) {
    return null;
  }

  const teams =
    segment.teams?.map((team) => ({
      id: String(team.id ?? ""),

      name: team.name ?? "",

      score: nullableNumber(team.score),

      logo: team.logo ?? null,
    })) ?? [];

  if (teams.length < 2) {
    return null;
  }

  const maps: VlrMapDetails[] = (segment.maps ?? []).map((map) => ({
    mapName: map.map_name ?? "TBD",

    score: {
      team1: nullableNumber(map.score?.team1) ?? 0,

      team2: nullableNumber(map.score?.team2) ?? 0,
    },

    players: {
      team1: (map.players?.team1 ?? []).map(normalizeVlrMapPlayer),

      team2: (map.players?.team2 ?? []).map(normalizeVlrMapPlayer),
    },
  }));

  return {
    matchId: segment.match_id ?? matchId,

    status: segment.status ?? "upcoming",

    teams,

    maps,
  };
}

export async function getVlrTeamRoster(
  teamId: string,
): Promise<VlrTeamRosterPlayer[]> {
  const baseUrl = process.env.VLR_API_URL;

  if (!baseUrl) {
    throw new Error("VLR_API_URL is not configured");
  }

  const response = await fetch(
    `${baseUrl}/v2/team?id=${encodeURIComponent(teamId)}&q=roster`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `VLR team roster error ${response.status} for team ${teamId}`,
    );
  }

  const json = (await response.json()) as V2TeamRosterResponse;
  const segment = json.data?.segments?.[0];

  if (!segment) {
    return [];
  }

  const groups: Array<{
    status: VlrRosterStatus;
    players: V2TeamRosterPlayer[];
  }> = [
    { status: "active", players: segment.active ?? [] },
    { status: "benched", players: segment.benched ?? [] },
    { status: "former", players: segment.former ?? [] },
  ];

  return groups.flatMap(({ status, players }) =>
    players.flatMap((player) => {
      const vlrId = String(player.id ?? "").trim();
      const alias = player.alias?.trim() ?? "";

      if (!vlrId || !alias || player.is_staff) {
        return [];
      }

      return [
        {
          vlrId,
          alias,
          realName: player.real_name?.trim() || null,
          country: player.country?.trim() || null,
          role: player.role?.trim() || null,
          status,
        },
      ];
    }),
  );
}
