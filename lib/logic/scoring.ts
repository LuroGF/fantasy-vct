export interface PlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  clutches?: number;
  fb?: number;
  fd?: number;
  acs?: number | null;
  mvp?: boolean;
}

/**
 * Client/server mirror of the V1 database trigger.
 * The database remains the authoritative calculator for stored performances.
 */
export function calculateFantasyPoints(stats: PlayerStats): number {
  const acs = stats.acs;
  let acsBonus = 0;

  if (acs !== null && acs !== undefined) {
    if (acs >= 300) acsBonus = 5;
    else if (acs >= 250) acsBonus = 3;
    else if (acs >= 200) acsBonus = 1;
    else if (acs < 150) acsBonus = -1;
  }

  return (
    (stats.kills || 0) * 2
    - (stats.deaths || 0)
    + (stats.assists || 0)
    + (stats.clutches || 0) * 3
    + (stats.fb || 0) * 2
    - (stats.fd || 0)
    + acsBonus
    + (stats.mvp ? 5 : 0)
  );
}
