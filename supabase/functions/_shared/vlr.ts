export type VlrMatchStatus = "upcoming" | "live" | "finished" | "completed";

export type VlrMatch = {
  vlrId: string;
  teamA: { name: string };
  teamB: { name: string };
  matchDate: string | null;
  status: VlrMatchStatus;
  teamAScore: number | null;
  teamBScore: number | null;
};

export type VlrMapPlayer = {
  name: string;
  agent: string | null;
  acs: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  fk: number | null;
  fd: number | null;
};

export type VlrMatchDetails = {
  status: string;
  teams: Array<{ id: string; name: string; score: number | null }>;
  maps: Array<{
    mapName: string;
    players: { team1: VlrMapPlayer[]; team2: VlrMapPlayer[] };
  }>;
};

export type VlrTeamRosterPlayer = {
  vlrId: string;
  alias: string;
  status: "active" | "benched" | "former";
};

type RawMatch = {
  team1?: string;
  team2?: string;
  score1?: string | number;
  score2?: string | number;
  unix_timestamp?: string;
  match_page?: string;
  match_series?: string;
  match_event?: string;
  tournament_name?: string;
};

type RawPlayer = {
  name?: string;
  agent?: string;
  acs?: string | number;
  kills?: string | number;
  deaths?: string | number;
  assists?: string | number;
  fk?: string | number;
  fd?: string | number;
};

function nullableNumber(value: string | number | null | undefined) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchId(matchPage?: string) {
  if (!matchPage) return null;
  return (
    matchPage.match(/vlr\.gg\/(\d+)/) ?? matchPage.match(/^\/?(\d+)/)
  )?.[1] ?? null;
}

function matchDate(raw?: string) {
  if (!raw) return null;
  const value = raw.trim();
  const date = /^\d+$/.test(value)
    ? new Date(Number(value) * (value.length >= 13 ? 1 : 1_000))
    : new Date(
        /Z$/i.test(value) || /[+-]\d{2}:\d{2}$/.test(value)
          ? value
          : `${value.replace(" ", "T")}Z`,
      );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isVctEvent(raw: RawMatch) {
  const normalized = [raw.match_event, raw.tournament_name, raw.match_series]
    .map((value) => (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " "))
    .filter(Boolean);
  const combined = normalized.join(" ");

  if (/\b(game\s*changers?|gc|challengers?|ascension|threshold|off\s*season|showmatch)\b/.test(combined)) {
    return false;
  }

  return normalized.some(
    (title) =>
      /^(?:vct|valorant champions tour)\s+(?:20\d{2}\s+)?(?:americas|emea|pacific|china|cn|masters|champions|lock\s+in)\b/.test(title) ||
      /^(?:valorant\s+)?champions\s+20\d{2}\b/.test(title) ||
      /^(?:valorant\s+)?masters\s+(?:20\d{2}|[a-z]+\s+20\d{2})\b/.test(title),
  );
}

async function matchGroup(baseUrl: string, query: string) {
  const response = await fetch(`${baseUrl}/v2/match?q=${query}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`VLR API ${query} error ${response.status}`);
  const json = await response.json();
  return (json?.data?.segments ?? []) as RawMatch[];
}

export async function getVlrMatches(baseUrl: string): Promise<VlrMatch[]> {
  const [upcoming, live, results] = await Promise.all([
    matchGroup(baseUrl, "upcoming"),
    matchGroup(baseUrl, "live_score"),
    matchGroup(baseUrl, "results"),
  ]);
  const rows: VlrMatch[] = [];

  for (const group of [
    { rows: upcoming, status: "upcoming" as const },
    { rows: live, status: "live" as const },
    { rows: results, status: "completed" as const },
  ]) {
    for (const raw of group.rows) {
      if (!isVctEvent(raw)) continue;
      const id = matchId(raw.match_page);
      const date = matchDate(raw.unix_timestamp);
      if (!id || !raw.team1 || !raw.team2) continue;
      if (group.status !== "completed" && !date) continue;
      rows.push({
        vlrId: id,
        teamA: { name: raw.team1 },
        teamB: { name: raw.team2 },
        matchDate: date,
        status: group.status,
        teamAScore: group.status === "upcoming" ? null : nullableNumber(raw.score1),
        teamBScore: group.status === "upcoming" ? null : nullableNumber(raw.score2),
      });
    }
  }

  return Array.from(new Map(rows.map((row) => [row.vlrId, row])).values());
}

function normalizePlayer(player: RawPlayer): VlrMapPlayer {
  return {
    name: player.name ?? "",
    agent: player.agent?.trim() || null,
    acs: nullableNumber(player.acs),
    kills: nullableNumber(player.kills),
    deaths: nullableNumber(player.deaths),
    assists: nullableNumber(player.assists),
    fk: nullableNumber(player.fk),
    fd: nullableNumber(player.fd),
  };
}

export async function getVlrMatchDetails(
  baseUrl: string,
  id: string,
): Promise<VlrMatchDetails | null> {
  const response = await fetch(
    `${baseUrl}/v2/match/details?match_id=${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`VLR match details error ${response.status} for ${id}`);
  const json = await response.json();
  const segment = json?.data?.segments?.[0];
  if (!segment || (segment.teams?.length ?? 0) < 2) return null;

  return {
    status: segment.status ?? "upcoming",
    teams: segment.teams.map((team: Record<string, unknown>) => ({
      id: String(team.id ?? ""),
      name: String(team.name ?? ""),
      score: nullableNumber(team.score as string | number | undefined),
    })),
    maps: (segment.maps ?? []).map((map: Record<string, unknown>) => {
      const players = (map.players ?? {}) as Record<string, RawPlayer[]>;
      return {
        mapName: String(map.map_name ?? "TBD"),
        players: {
          team1: (players.team1 ?? []).map(normalizePlayer),
          team2: (players.team2 ?? []).map(normalizePlayer),
        },
      };
    }),
  };
}

export async function getVlrTeamRoster(
  baseUrl: string,
  teamId: string,
): Promise<VlrTeamRosterPlayer[]> {
  const response = await fetch(
    `${baseUrl}/v2/team?id=${encodeURIComponent(teamId)}&q=roster`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`VLR team roster error ${response.status} for ${teamId}`);
  const json = await response.json();
  const segment = json?.data?.segments?.[0];
  if (!segment) return [];

  return ([
    ["active", segment.active ?? []],
    ["benched", segment.benched ?? []],
    ["former", segment.former ?? []],
  ] as const).flatMap(([status, players]) =>
    players.flatMap((player: Record<string, unknown>) => {
      const vlrId = String(player.id ?? "").trim();
      const alias = String(player.alias ?? "").trim();
      if (!vlrId || !alias || player.is_staff) return [];
      return [{ vlrId, alias, status }];
    }),
  );
}
