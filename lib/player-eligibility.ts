const MARKET_ROSTER_STATUSES = ["active", "substitute", "benched"] as const;

/**
 * Returns the players that may be acquired in the Fantasy market.
 *
 * The latest configured VCT season is the source of truth, including while it
 * is still in draft. This lets us test the 2027 fantasy with provisional
 * rosters without reopening the complete legacy catalogue. Active seasons
 * take precedence over draft seasons.
 */
export async function getMarketEligiblePlayerIds(
  supabase: any,
  playerIds?: readonly string[],
) {
  const requestedIds = playerIds
    ? Array.from(new Set(playerIds.filter(Boolean)))
    : null;

  if (requestedIds && requestedIds.length === 0) {
    return new Set<string>();
  }

  const { data: configuredSeasons, error: seasonError } = await supabase
    .from("vct_seasons")
    .select("year, status")
    .in("status", ["active", "draft"])
    .order("year", { ascending: false })
    .limit(10);

  const configuredSeason = (configuredSeasons || [])
    .sort((a: any, b: any) => {
      const statusPriority = (status: string) => (status === "active" ? 1 : 0);
      return statusPriority(b.status) - statusPriority(a.status) || b.year - a.year;
    })[0];

  // Compatibility fallback for installations created before the season model.
  if (seasonError || !configuredSeason) {
    let legacyQuery = supabase
      .from("pro_players")
      .select("id")
      .not("team_id", "is", null)
      .eq("is_legend", false);

    if (requestedIds) legacyQuery = legacyQuery.in("id", requestedIds);

    const { data, error } = await legacyQuery;
    if (error) {
      console.error("Error checking legacy player eligibility:", error);
      return new Set<string>();
    }

    return new Set<string>((data || []).map((player: any) => player.id));
  }

  let seasonalPlayersQuery = supabase
    .from("vct_season_players")
    .select("player_id, team_id, roster_status")
    .eq("season_year", configuredSeason.year)
    .eq("market_eligible", true)
    .in("roster_status", [...MARKET_ROSTER_STATUSES]);

  if (requestedIds) {
    seasonalPlayersQuery = seasonalPlayersQuery.in("player_id", requestedIds);
  }

  const { data: seasonalPlayers, error: playersError } =
    await seasonalPlayersQuery;

  if (playersError) {
    console.error("Error checking seasonal player eligibility:", playersError);
    return new Set<string>();
  }

  const teamIds = Array.from(
    new Set(
      (seasonalPlayers || [])
        .map((player: any) => player.team_id)
        .filter(Boolean),
    ),
  );

  if (teamIds.length === 0) return new Set<string>();

  const { data: eligibleTeams, error: teamsError } = await supabase
    .from("vct_season_teams")
    .select("team_id")
    .eq("season_year", configuredSeason.year)
    .eq("confirmation_status", "confirmed")
    .eq("fantasy_eligible", true)
    .in("team_id", teamIds);

  if (teamsError) {
    console.error("Error checking seasonal team eligibility:", teamsError);
    return new Set<string>();
  }

  const eligibleTeamIds = new Set<string>(
    (eligibleTeams || []).map((team: any) => team.team_id),
  );

  return new Set<string>(
    (seasonalPlayers || [])
      .filter((player: any) => eligibleTeamIds.has(player.team_id))
      .map((player: any) => player.player_id),
  );
}
