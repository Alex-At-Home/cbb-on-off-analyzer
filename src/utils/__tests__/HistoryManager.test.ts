
import { HistoryManager } from "../HistoryManager"
import { GameFilterParams, LineupFilterParams, TeamReportFilterParams } from "../utils/FilterModels";

describe("HistoryManager", () => {
  test("HistoryManager - getHistory/addParamsToHistory", () => {
    HistoryManager.addParamsToHistory("game-year=2019/20&gender=Men");
    HistoryManager.addParamsToHistory("lineup-year=2018/9&gender=Women");
    expect(HistoryManager.getHistory()).toEqual(
      [
        ["lineup-", { year: "2018/9", gender: "Women" }],
        ["game-", { year: "2019/20", gender: "Men" }],
      ]
    )
    HistoryManager.addParamsToHistory("game-year=2019/20&gender=Men");
    expect(HistoryManager.getHistory()).toEqual(
      [
        ["game-", { year: "2019/20", gender: "Men" }],
        ["lineup-", { year: "2018/9", gender: "Women" }],
      ]
    )
  });
  test("HistoryManager - gameFilterSummary", () => {
    const game1: GameFilterParams = {
      team: "test"
    };
    expect(HistoryManager.gameFilterSummary(game1)).toBe(
      `On/Off: 2019/20 test (M): on:'', auto-off, base:''`
    );
    const game2: GameFilterParams = {
      team: "test",
      year: "2019/20", gender: "Men",
      minRank: "1", maxRank: "150",
      onQuery: "testOn", baseQuery: "testBase",
      offQuery: "testOff", autoOffQuery: "false",
    };
    expect(HistoryManager.filterSummary("game-", game2)).toBe(
      `On/Off: 2019/20 test (M) [1:150]: on:'testOn', off:'testOff', base:'testBase'`
    );
  });
  test("HistoryManager - lineupFilterSummary", () => {
    const lineup1: LineupFilterParams = {
    };
    expect(HistoryManager.lineupFilterSummary(lineup1)).toBe(
      `Lineups: 2019/20  (M): query:'' (max:50, min-poss:5, sort:desc:off_poss)`
    );
    const lineup2: LineupFilterParams = {
      team: "team2",
      year: "2018/19", gender: "Women",
      lineupQuery: "test ''", maxTableSize: 11,
      minRank: "1", maxRank: "370",
      minPoss: 10, sortBy: "test-sort"
    };
    expect(HistoryManager.filterSummary("lineup-", lineup2)).toBe(
      `Lineups: 2018/19 team2 (W): query:'test ""' (max:11, min-poss:10, sort:test-sort)`
    );
  });
  test("HistoryManager - teamReportFilterSummary", () => {
    const report1: TeamReportFilterParams = {
    };
    expect(HistoryManager.teamReportFilterSummary(report1)).toBe(
      `On/Off Report: 2019/20  (M): query:'' (filter:'', sort:desc:off_poss)`
    );
    const report2: TeamReportFilterParams = {
      team: "team3",
      year: "2018/19", gender: "Women",
      baseQuery: "test ''",
      minRank: "10", maxRank: "370",
      sortBy: "test-sort",
      players: [ "ignore1", "ignore2" ]
    };
    expect(HistoryManager.teamReportFilterSummary(report2)).toBe(
      `On/Off Report: 2018/19 team3 (W) [10:370]: query:'test ""' (filter:'', sort:test-sort)`
    );
  });
});
