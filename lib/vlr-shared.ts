export const TEAM_ALIASES: Record<string, string> = {
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
  "PCI": "PCIFIC",
  "ETE": "EternalFire",
  "ETERNAL FIRE": "EternalFire"
};

export function getTeamLogo(name: string | undefined | null) {
    if (!name) return null;
    const upper = name.toUpperCase();
    const logoName = TEAM_ALIASES[upper];
    if (logoName) return `/equipos/${logoName}.png`;
    return null; 
}

export function getTeamTag(name: string | undefined | null) {
    if (!name) return "???";
    const upper = name.toUpperCase();
    return TEAM_ALIASES[upper] || name.substring(0, 3).toUpperCase();
}

export function normalizeTeamName(name: string) {
  const clean = name.toUpperCase()
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
