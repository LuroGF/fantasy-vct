import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateFantasyPoints } from "../lib/logic/scoring.ts";

describe("calculateFantasyPoints", () => {
  it("applies the complete scoring formula", () => {
    const points = calculateFantasyPoints({
      kills: 20,
      deaths: 10,
      assists: 8,
      clutches: 1,
      fb: 3,
      fd: 2,
      acs: 305,
      mvp: true,
    });

    assert.equal(points, 55);
  });

  it("applies every ACS boundary", () => {
    const pointsAt = (acs: number | null) =>
      calculateFantasyPoints({ kills: 0, deaths: 0, assists: 0, acs });

    assert.equal(pointsAt(300), 5);
    assert.equal(pointsAt(299), 3);
    assert.equal(pointsAt(250), 3);
    assert.equal(pointsAt(249), 1);
    assert.equal(pointsAt(200), 1);
    assert.equal(pointsAt(199), 0);
    assert.equal(pointsAt(150), 0);
    assert.equal(pointsAt(149), -1);
    assert.equal(pointsAt(null), 0);
  });

  it("treats missing optional statistics as zero", () => {
    assert.equal(
      calculateFantasyPoints({ kills: 12, deaths: 9, assists: 6 }),
      21,
    );
  });
});
