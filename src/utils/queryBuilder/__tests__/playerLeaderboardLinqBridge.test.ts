import {
  composePlayerLeaderboardFilterString,
  formatRuleValue,
  linqToQuery,
  parsePlayerLeaderboardFilterParts,
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

  it("serializes RQB placeholder operator + empty value as bare field", () => {
    const q = linqToQuery("team");
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe("team");
  });

  it("round-trips bare field with && chain", () => {
    const src = "team && off_efg > 0.5";
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(src);
  });

  it("parses legacy team ~ empty string as bare field", () => {
    const q = linqToQuery(`team ~ ""`);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe("team");
  });

  it("parses quoted string values", () => {
    const src = `player_name = 'Smith'`;
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(`player_name = 'Smith'`);
  });

  it("round-trips percentage literal without quotes", () => {
    const src = "off_efg > 20%";
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(src);
  });

  it("formatRuleValue emits unquoted numeric percent", () => {
    expect(formatRuleValue("20%")).toBe("20%");
    expect(formatRuleValue("3.5%")).toBe("3.5%");
  });

  it("parsePlayerLeaderboardFilterParts splits where, sorts, and limit", () => {
    const s =
      "off_efg > 0.5 SORT_BY off_adj_rapm ASC SORT_BY def_adj_rapm DESC LIMIT 25";
    expect(parsePlayerLeaderboardFilterParts(s)).toEqual({
      whereCore: "off_efg > 0.5",
      sortRows: [
        { id: "sort-0", expression: "off_adj_rapm", ascending: true },
        { id: "sort-1", expression: "def_adj_rapm", ascending: false },
      ],
      limit: 25,
    });
  });

  it("composePlayerLeaderboardFilterString round-trips parse parts", () => {
    const parts = parsePlayerLeaderboardFilterParts(
      "a && b SORT_BY x ASC LIMIT 10",
    );
    expect(
      composePlayerLeaderboardFilterString(
        parts.whereCore,
        parts.sortRows,
        parts.limit,
      ),
    ).toBe("a && b SORT_BY x ASC LIMIT 10");
  });
});
