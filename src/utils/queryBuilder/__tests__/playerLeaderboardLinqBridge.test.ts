import {
  cascadingSlicesValueGroupsOnly,
  playerLeaderboardCascadingFieldSlices,
} from "../playerLeaderboard";
import {
  composePlayerLeaderboardFilterString,
  formatRuleValue,
  linqToQuery,
  normalizeLeaderboardSortExpression,
  parsePlayerLeaderboardFilterParts,
  parseWhereCoreToPlayerLeaderboardQuery,
  PLAYER_QB_CUSTOM_RULE_FIELD,
  queryToLinq,
  splitPlayerLeaderboardFilterSuffix,
  splitWhereOnTopLevelAnd,
  stripNonFilterLinqSuffixes,
} from "../playerLeaderboardLinqBridge";
import { teamLeaderboardCascadingFieldSlices } from "../teamLeaderboardRegistry";

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

  it("formatRuleValue emits unquoted true and false", () => {
    expect(formatRuleValue(true)).toBe("true");
    expect(formatRuleValue(false)).toBe("false");
    expect(formatRuleValue("true")).toBe("true");
    expect(formatRuleValue("false")).toBe("false");
  });

  it("round-trips boolean literals without quotes", () => {
    const src = "hs_region_dmv = true && off_efg > 0.5";
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(src);
  });

  it("parses bracketed posFreqs / posConfidences slots", () => {
    const src = "posFreqs[_PG_] > 0.01 && posConfidences[_C_] < 0.5";
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(src);
  });

  it("parses team_stats / rank_team_stats / pctile_team_stats prefixed fields", () => {
    const src =
      "team_stats.off_efg > 0.5 && rank_team_stats.def_adj_ppp < 50 && pctile_team_stats.off_adj_ppp > 10%";
    const q = linqToQuery(src);
    expect(q).not.toBeNull();
    expect(queryToLinq(q!)).toBe(src);
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

  it("parsePlayerLeaderboardFilterParts normalizes rank/pctile sort keys to raw value fields", () => {
    const s =
      "true SORT_BY pctile_off_efg DESC SORT_BY rank_team_stats.off_adj_ppp ASC";
    const { sortRows } = parsePlayerLeaderboardFilterParts(s);
    expect(sortRows[0]!.expression).toBe("off_efg");
    expect(sortRows[1]!.expression).toBe("team_stats.off_adj_ppp");
  });

  it("normalizeLeaderboardSortExpression leaves non-graded sort expressions unchanged", () => {
    expect(normalizeLeaderboardSortExpression("off_adj_rapm")).toBe(
      "off_adj_rapm",
    );
    expect(normalizeLeaderboardSortExpression("100 * off_efg")).toBe(
      "100 * off_efg",
    );
  });

  it("cascadingSlicesValueGroupsOnly drops rank and percentile groups", () => {
    const v = cascadingSlicesValueGroupsOnly(
      playerLeaderboardCascadingFieldSlices,
    );
    expect(v.every((s) => !s.id.endsWith("__rank"))).toBe(true);
    expect(v.every((s) => !s.id.endsWith("__pctile"))).toBe(true);
    expect(v.length).toBeLessThan(playerLeaderboardCascadingFieldSlices.length);
    const tv = cascadingSlicesValueGroupsOnly(
      teamLeaderboardCascadingFieldSlices,
    );
    expect(tv.every((s) => !s.id.endsWith("__rank"))).toBe(true);
    expect(tv.every((s) => !s.id.endsWith("__pctile"))).toBe(true);
    expect(tv.length).toBeLessThan(teamLeaderboardCascadingFieldSlices.length);
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

  it("splitWhereOnTopLevelAnd respects parentheses", () => {
    expect(splitWhereOnTopLevelAnd("a && (b && c)")).toEqual(["a", "(b && c)"]);
  });

  it("parseWhereCoreToPlayerLeaderboardQuery mixes player and unparsed segments", () => {
    const src =
      "off_threep > 40% && pctile_off_style_rim_attack_pct > pctile_off_style_rim_attack_usg";
    const q = parseWhereCoreToPlayerLeaderboardQuery(src);
    expect(q.rules).toHaveLength(2);
    const r1 = q.rules[0] as { field: string };
    const r2 = q.rules[1] as { field: string; value: string };
    expect(r1.field).toBe("off_threep");
    expect(r2.field).toBe(PLAYER_QB_CUSTOM_RULE_FIELD);
    expect(r2.value).toBe(
      "pctile_off_style_rim_attack_pct > pctile_off_style_rim_attack_usg",
    );
    expect(queryToLinq(q).trim()).toBe(src);
  });

  it("parseWhereCoreToPlayerLeaderboardQuery returns whole tree when fully parseable", () => {
    const src = "off_efg > 0.5 && pctile_off_to < 90";
    const q = parseWhereCoreToPlayerLeaderboardQuery(src);
    expect(queryToLinq(q)).toBe(src);
  });
});
