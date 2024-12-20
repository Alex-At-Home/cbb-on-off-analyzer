import { lineupStatsQuery } from "../lineupStatsQueryTemplate";

describe("lineupStatsQuery", () => {
  test("lineupStatsQuery", () => {
    const test = lineupStatsQuery(
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
      1.0
    );

    // Write the resulting object out in pure JS format in case we want to paste it into
    // the ES console
    expect.addSnapshotSerializer({
      test: (val: any) => true,
      print: (val: any) => JSON.stringify(val, null, 3),
    });
    expect(test).toMatchSnapshot();
  });
  test("lineupStatsQuery-game-info", () => {
    const test = lineupStatsQuery(
      {
        team: "TestTeam",
        year: "2019",
        minRank: "10",
        maxRank: "100",
        baseQuery: "base",
        showGameInfo: true,
      },
      0,
      { team: { stats: 0 } },
      {
        name1: "name1b",
      },
      100.0,
      1.0
    );

    // Write the resulting object out in pure JS format in case we want to paste it into
    // the ES console
    expect.addSnapshotSerializer({
      test: (val: any) => true,
      print: (val: any) => JSON.stringify(val, null, 3),
    });
    expect(test).toMatchSnapshot();
  });
  test("lineupStatsQuery-game-info-invertMode", () => {
    const test = lineupStatsQuery(
      {
        team: "TestTeam",
        year: "2019",
        minRank: "10",
        maxRank: "100",
        baseQuery: "base",
        showGameInfo: true,
        invertBase: "invert1",
        invertBaseQueryFilters: "Home",
      },
      0,
      { team: { stats: 0 } },
      {
        name1: "name1b",
      },
      100.0,
      1.0
    );

    // Write the resulting object out in pure JS format in case we want to paste it into
    // the ES console
    expect.addSnapshotSerializer({
      test: (val: any) => true,
      print: (val: any) => JSON.stringify(val, null, 3),
    });
    expect(test).toMatchSnapshot();
  });
});
