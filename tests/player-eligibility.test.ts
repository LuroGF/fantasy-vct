import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterEligibleSeasonPlayerIds,
  MARKET_ROSTER_STATUSES,
  selectConfiguredSeason,
} from "../lib/player-eligibility.ts";

describe("VCT season eligibility", () => {
  it("prioritizes an active season over a newer draft", () => {
    assert.deepEqual(
      selectConfiguredSeason([
        { year: 2028, status: "draft" },
        { year: 2027, status: "active" },
        { year: 2026, status: "active" },
      ]),
      { year: 2027, status: "active" },
    );
  });

  it("uses the newest draft when there is no active season", () => {
    assert.deepEqual(
      selectConfiguredSeason([
        { year: 2026, status: "draft" },
        { year: 2027, status: "draft" },
      ]),
      { year: 2027, status: "draft" },
    );
  });

  it("keeps active, substitute and benched players market-queryable", () => {
    assert.deepEqual(MARKET_ROSTER_STATUSES, [
      "active",
      "substitute",
      "benched",
    ]);
  });

  it("excludes players without a confirmed eligible team", () => {
    const eligibleIds = filterEligibleSeasonPlayerIds(
      [
        { player_id: "active-player", team_id: "team-a" },
        { player_id: "wrong-team", team_id: "team-b" },
        { player_id: "free-agent", team_id: null },
      ],
      new Set(["team-a"]),
    );

    assert.deepEqual([...eligibleIds], ["active-player"]);
  });
});
