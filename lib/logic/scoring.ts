"use server";

export interface PlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  clutches?: number;
  fb?: number; // First Bloods
  fd?: number; // First Deaths
}

/**
 * Calculates fantasy points following the project rules:
 * Kill: +2
 * Assist: +1
 * First Blood: +3
 * First Death: -2 (Penalty)
 * Clutch Round: +4
 * Death: -1.5 (Penalty)
 * Negative KDA: -5 (Bonus penalty if Kills + Assists < Deaths)
 */
export function calculateFantasyPoints(stats: PlayerStats): number {
  let points = 0;
  
  // Sumas
  const totalKills = stats.kills || 0;
  const totalAssists = stats.assists || 0;
  const totalDeaths = stats.deaths || 0;

  points += totalKills * 2;
  points += totalAssists * 1;
  points += (stats.fb || 0) * 3;
  points += (stats.clutches || 0) * 4;
  
  // Restas (Penalizaciones)
  points -= totalDeaths * 1.5;
  points -= (stats.fd || 0) * 2;

  // Penalización por KDA Negativo (Eficiencia)
  if (totalKills + totalAssists < totalDeaths) {
    points -= 5;
  }

  return Math.round(points);
}
