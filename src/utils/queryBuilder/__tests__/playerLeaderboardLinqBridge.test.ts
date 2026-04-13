import {
  linqToQuery,
  queryToLinq,
  splitPlayerLeaderboardFilterSuffix,
  stripNonFilterLinqSuffixes,
} from "../playerLeaderboardLinqBridge";

describe("playerLeaderboardLinqBridge", () => {
  it("strips SORT_BY and LIMIT tails", () => {
    expect(
      stripNonFilterLinqSuffixes("off_efg > 0.5 SORT_BY off_adj_rapm LIMIT 50"),
    ).toBe("off_efg > 0.5");
  });

  it("splits filter core from SORT_BY suffix for round-trip preservation", () => {
    const s = "off_efg > 0.5 SORT_BY off_adj_rapm DESC";
    expect(splitPlayerLeaderboardFilterSuffix(s)).toEqual({
      core: "off_efg > 0.5",
      suffix: "SORT_BY off_adj_rapm DESC",
    });
  });

  it("parses a single comparison", () => {
    const q = linqToQuery("off_efg > 0.5");
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe("off_efg > 0.5");
  });

  it("round-trips && chain", () => {
    const src = "off_efg > 0.5 && pctile_off_to < 90";
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(src);
  });

  it("round-trips parenthesized OR inside AND", () => {
    const src = "off_efg > 0.5 && (def_adj_rapm < 0 || def_adj_rapm > 5)";
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(src);
  });

  it("returns null for unknown fields", () => {
    expect(linqToQuery("not_a_real_field > 3")).toBeNull();
  });

  it("parses quoted string values", () => {
    const src = `player_name = 'Smith'`;
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(`player_name = 'Smith'`);
  });
});
