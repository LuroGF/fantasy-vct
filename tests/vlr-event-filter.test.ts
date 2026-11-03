import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isVctEvent as isNextVctEvent } from "../lib/vlr.ts";
import { isVctEvent as isEdgeVctEvent } from "../supabase/functions/_shared/vlr.ts";

const cases = [
  { label: "VCT 2027 EMEA Kickoff", expected: true },
  { label: "Valorant Champions 2027", expected: true },
  { label: "VCT 2027 Game Changers EMEA", expected: false },
  { label: "Valorant Challengers 2027 Spain", expected: false },
] as const;

describe("VLR event filtering parity", () => {
  for (const testCase of cases) {
    it(`classifies ${testCase.label}`, () => {
      const input = { match_event: testCase.label };
      assert.equal(isNextVctEvent(input), testCase.expected);
      assert.equal(isEdgeVctEvent(input), testCase.expected);
    });
  }
});
