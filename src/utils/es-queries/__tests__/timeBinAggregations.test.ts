import {
  weightedSumAggregation,
  timeBinTeamAggregations,
  timeBinPlayerAggregations,
  timeBinAggregations,
} from "../timeBinAggregations";

describe("timeBinAggregations", () => {
  describe("weightedSumAggregation", () => {
    test("builds sum aggregation with script", () => {
      const agg = weightedSumAggregation("team_stats.pts", 5, 6);

      expect(agg).toHaveProperty("sum");
      expect(agg.sum).toHaveProperty("script");
      expect(agg.sum.script).toHaveProperty("source");
      expect(agg.sum.script).toHaveProperty("params");
    });

    test("script params have correct bin boundaries", () => {
      const agg = weightedSumAggregation("team_stats.pts", 5, 6);

      expect(agg.sum.script.params.bin_start).toBe(5.0);
      expect(agg.sum.script.params.bin_end).toBe(6.0);
      expect(agg.sum.script.params.stat_path).toBe("team_stats.pts");
    });

    test("script source contains weight calculation", () => {
      const agg = weightedSumAggregation("team_stats.pts", 0, 1);
      const source = agg.sum.script.source;

      expect(source).toContain("overlap");
      expect(source).toContain("weight");
      expect(source).toContain("params.bin_start");
      expect(source).toContain("params.bin_end");
      expect(source).toContain("params.stat_path");
    });
  });

  describe("timeBinTeamAggregations", () => {
    test("builds aggregations for team_stats with off prefix", () => {
      const aggs = timeBinTeamAggregations("team_stats", "off", 0, 1);

      expect(aggs).toHaveProperty("off_num_possessions");
      expect(aggs).toHaveProperty("off_pts");
      expect(aggs).toHaveProperty("off_plus_minus");
      expect(aggs).toHaveProperty("off_to");
      expect(aggs).toHaveProperty("off_fg_3p_made");
    });

    test("builds aggregations for opponent_stats with def prefix", () => {
      const aggs = timeBinTeamAggregations("opponent_stats", "def", 0, 1);

      expect(aggs).toHaveProperty("def_num_possessions");
      expect(aggs).toHaveProperty("def_pts");
      expect(aggs).toHaveProperty("def_to");
    });

    test("uses correct stat paths", () => {
      const aggs = timeBinTeamAggregations("team_stats", "off", 0, 1);

      const ptsAgg = aggs.off_pts as any;
      expect(ptsAgg.sum.script.params.stat_path).toBe("team_stats.pts");

      const toAgg = aggs.off_to as any;
      expect(toAgg.sum.script.params.stat_path).toBe("team_stats.to.total");
    });
  });

  describe("timeBinPlayerAggregations", () => {
    test("wraps player stats in terms aggregation", () => {
      const aggs = timeBinPlayerAggregations(0, 1);

      expect(aggs).toHaveProperty("players");
      expect(aggs.players).toHaveProperty("terms");
      expect(aggs.players.terms.field).toBe("player.code.keyword");
      expect(aggs.players.terms.size).toBe(50);
    });

    test("builds player stat aggregations inside players bucket", () => {
      const aggs = timeBinPlayerAggregations(0, 1);
      const playerAggs = aggs.players.aggregations;

      // Player stats
      expect(playerAggs).toHaveProperty("num_possessions");
      expect(playerAggs).toHaveProperty("pts");
      expect(playerAggs).toHaveProperty("fg_3p_made");
      expect(playerAggs).toHaveProperty("fg_made");
    });

    test("includes team stats for usage calculation", () => {
      const aggs = timeBinPlayerAggregations(0, 1);
      const playerAggs = aggs.players.aggregations;

      expect(playerAggs).toHaveProperty("team_num_possessions");
      expect(playerAggs).toHaveProperty("team_plus_minus");
    });

    test("uses player_stats prefix for player stat paths", () => {
      const aggs = timeBinPlayerAggregations(0, 1);
      const playerAggs = aggs.players.aggregations;

      const ptsAgg = playerAggs.pts as any;
      expect(ptsAgg.sum.script.params.stat_path).toBe("player_stats.pts");
    });

    test("uses team_stats prefix for team stat paths", () => {
      const aggs = timeBinPlayerAggregations(0, 1);
      const playerAggs = aggs.players.aggregations;

      const teamPossAgg = playerAggs.team_num_possessions as any;
      expect(teamPossAgg.sum.script.params.stat_path).toBe(
        "team_stats.num_possessions"
      );
    });
  });

  describe("timeBinAggregations", () => {
    test("builds separate filter aggregation per bin", () => {
      const aggs = timeBinAggregations(3);

      expect(aggs).toHaveProperty("bin_0");
      expect(aggs).toHaveProperty("bin_1");
      expect(aggs).toHaveProperty("bin_2");
      expect(aggs).not.toHaveProperty("bin_3");
    });

    test("each bin has filter and aggregations", () => {
      const aggs = timeBinAggregations(3);

      expect(aggs.bin_0).toHaveProperty("filter");
      expect(aggs.bin_0).toHaveProperty("aggregations");
    });

    test("bin filters have correct boundaries", () => {
      const aggs = timeBinAggregations(3);

      expect(aggs.bin_0.filter).toEqual({
        bool: {
          must: [
            { range: { start_min: { lt: 1 } } },
            { range: { end_min: { gt: 0 } } },
          ],
        },
      });

      expect(aggs.bin_2.filter).toEqual({
        bool: {
          must: [
            { range: { start_min: { lt: 3 } } },
            { range: { end_min: { gt: 2 } } },
          ],
        },
      });
    });

    test("includes team aggregations at bin level", () => {
      const aggs = timeBinAggregations(3);
      const binAggs = aggs.bin_0.aggregations;

      // Team stats (off/def)
      expect(binAggs).toHaveProperty("off_pts");
      expect(binAggs).toHaveProperty("def_pts");
      expect(binAggs).toHaveProperty("off_num_possessions");
    });

    test("includes players terms aggregation with nested player stats", () => {
      const aggs = timeBinAggregations(3);
      const binAggs = aggs.bin_0.aggregations;

      // Players terms agg
      expect(binAggs).toHaveProperty("players");
      expect(binAggs.players).toHaveProperty("terms");
      expect(binAggs.players).toHaveProperty("aggregations");

      // Player stats inside players bucket
      expect(binAggs.players.aggregations).toHaveProperty("pts");
      expect(binAggs.players.aggregations).toHaveProperty("fg_made");
      expect(binAggs.players.aggregations).toHaveProperty("team_num_possessions");
    });

    test("does NOT include lineup aggregations", () => {
      const aggs = timeBinAggregations(3);
      const binAggs = aggs.bin_0.aggregations;

      expect(binAggs).not.toHaveProperty("lineups");
    });

    test("builds 40 bins by default", () => {
      const aggs = timeBinAggregations();
      expect(Object.keys(aggs).length).toBe(40);
      expect(aggs).toHaveProperty("bin_0");
      expect(aggs).toHaveProperty("bin_39");
    });
  });

  // Snapshot test for the full structure
  describe("snapshots", () => {
    test("timeBinAggregations structure for 3 bins", () => {
      expect.addSnapshotSerializer({
        test: (val: any) => true,
        print: (val: any) => JSON.stringify(val, null, 3),
      });

      const aggs = timeBinAggregations(3);
      expect(aggs).toMatchSnapshot();
    });
  });
});
