import { lineupStintsByTimeQuery } from "../lineupStintsByTimeQueryTemplate";

describe("lineupStintsByTimeQuery", () => {
  test("lineupStintsByTimeQuery with 3 bins", () => {
    const test = lineupStintsByTimeQuery(
      {
        team: "TestTeam",
        year: "2019",
        minRank: "10",
        maxRank: "100",
        baseQuery: "base",
      },
      0,
      { team: { stats: 0 } },
      {
        name1: "name1b",
      },
      100.0,
      1.0,
      3 // Only 3 bins for a smaller snapshot
    );

    // Write the resulting object out in pure JS format in case we want to paste it into
    // the ES console
    expect.addSnapshotSerializer({
      test: (val: any) => true,
      print: (val: any) => JSON.stringify(val, null, 3),
    });
    expect(test).toMatchSnapshot();
  });

  test("lineupStintsByTimeQuery builds correct structure", () => {
    const result = lineupStintsByTimeQuery(
      {
        team: "Maryland",
        year: "2023",
        baseQuery: "*",
      },
      0,
      {},
      {},
      100.0,
      1.5,
      5
    );

    // Should have size 0 (aggregations only)
    expect(result.size).toBe(0);

    // Should have aggregations with per-bin filters
    expect(result.aggregations).toHaveProperty("bin_0");
    expect(result.aggregations).toHaveProperty("bin_1");
    expect(result.aggregations).toHaveProperty("bin_2");
    expect(result.aggregations).toHaveProperty("bin_3");
    expect(result.aggregations).toHaveProperty("bin_4");
    expect(result.aggregations).not.toHaveProperty("bin_5");

    // Each bin should have filter and aggregations
    expect(result.aggregations.bin_0).toHaveProperty("filter");
    expect(result.aggregations.bin_0).toHaveProperty("aggregations");
  });

  test("lineupStintsByTimeQuery includes team query", () => {
    const result = lineupStintsByTimeQuery(
      {
        team: "Duke",
        year: "2024",
      },
      0,
      {},
      {},
      100.0,
      1.5,
      3
    );

    // Should have the team filter in the query
    const mustClauses = result.query.bool.must;
    expect(mustClauses).toHaveLength(2);

    // First must clause should be the common team query
    const teamQuery = mustClauses[0] as any;
    expect(teamQuery.bool).toBeDefined();
  });

  test("lineupStintsByTimeQuery defaults to 40 bins", () => {
    const result = lineupStintsByTimeQuery(
      {
        team: "Maryland",
        year: "2023",
      },
      0,
      {},
      {},
      100.0,
      1.5
      // No numBins parameter - should default to 40
    );

    expect(Object.keys(result.aggregations).length).toBe(40);
    expect(result.aggregations).toHaveProperty("bin_0");
    expect(result.aggregations).toHaveProperty("bin_39");
  });

  test("lineupStintsByTimeQuery includes runtime mappings", () => {
    const result = lineupStintsByTimeQuery(
      {
        team: "Maryland",
        year: "2023",
      },
      0,
      { SomeTeam: { stats: {} } },
      { lookup: "value" },
      100.0,
      1.5,
      3
    );

    expect(result).toHaveProperty("runtime_mappings");
    expect(result.runtime_mappings).toHaveProperty("vs_rank");
    expect(result.runtime_mappings).toHaveProperty("vs_adj_off");
    expect(result.runtime_mappings).toHaveProperty("vs_adj_def");
  });
});
