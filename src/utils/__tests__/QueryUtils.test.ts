import _ from "lodash";

import {
  CommonFilterType,
  CommonFilterTypeSimple,
  QueryUtils,
  CommonFilterCustomDate,
} from "../QueryUtils";
import { CommonFilterParams, GameFilterParams } from "../FilterModels";
import { LineupStatSet } from "../StatModels";
import { IndivPosInfo } from "../StatModels";
import { sampleLineupStatsResponse } from "../../sample-data/sampleLineupStatsResponse";
import { PositionUtils } from "../stats/PositionUtils";

describe("QueryUtils", () => {
  test("QueryUtils - parse/stringify", () => {
    //(just test lineupQuery/baseQuery handling)
    expect(
      QueryUtils.stringify({
        lineupQuery: "a",
        otherField: true,
      } as CommonFilterParams),
    ).toEqual("baseQuery=a&otherField=true");
    expect(
      QueryUtils.parse("lineupQuery=a&otherField=true&numField=1"),
    ).toEqual({ baseQuery: "a", otherField: true, numField: "1" });
    // query-string: single splitPhrases value is a string, not string[] (breaks zip / [0])
    expect(QueryUtils.parse("splitPhrases=foo").splitPhrases).toEqual(["foo"]);
    expect(
      QueryUtils.parse("splitPhrases=a&splitPhrases=").splitPhrases,
    ).toEqual(["a", ""]);
    expect(
      QueryUtils.parse("splitText=%3Cdiv%3E&splitText=").splitText,
    ).toEqual(["<div>", ""]);
    const spRound = QueryUtils.parse(
      QueryUtils.stringify({ splitPhrases: ["only"] } as CommonFilterParams),
    );
    expect(spRound.splitPhrases).toEqual(["only", ""]);
    // Check garbageFilter handling
    expect(
      QueryUtils.stringify({
        lineupQuery: "a",
        filterGarbage: true,
      } as CommonFilterParams),
    ).toEqual("baseQuery=a&filterGarbage=true");
    expect(
      QueryUtils.stringify({
        lineupQuery: "a",
        filterGarbage: false,
      } as CommonFilterParams),
    ).toEqual("baseQuery=a");
    // Check queryFilter handling
    expect(
      QueryUtils.stringify({
        lineupQuery: "a",
        queryFilters: "Conf,Nov-Dec",
      } as CommonFilterParams),
    ).toEqual("baseQuery=a&queryFilters=Conf%2CNov-Dec");
    expect(
      QueryUtils.stringify({
        lineupQuery: "a",
        queryFilters: "",
      } as CommonFilterParams),
    ).toEqual("baseQuery=a");
    // Test nested luck object handling
    expect(
      QueryUtils.stringify({
        lineupQuery: "a",
        luck: { base: "season" },
      } as CommonFilterParams),
    ).toEqual("baseQuery=a&luck.base=season");
    expect(
      QueryUtils.parse("lineupQuery=a&otherField=true&luck.base=baseline"),
    ).toEqual({ baseQuery: "a", otherField: true, luck: { base: "baseline" } });
    // Test bwc change to onOffLuck:
    expect(
      QueryUtils.parse("lineupQuery=a&onOffLuck=season&luck.base=baseline"),
    ).toEqual({ baseQuery: "a", onOffLuck: true, luck: { base: "season" } });
    // Test nested manual override object handling
    const testOverride1 = {
      filterGarbage: true,
      manual: [{ rowId: "test1", statName: "test2", newVal: 4, use: true }],
    } as CommonFilterParams;
    const testOverrideResult1 =
      "filterGarbage=true&manual.newVal=4&manual.rowId=test1&manual.statName=test2&manual.use=true";
    expect(QueryUtils.stringify(testOverride1)).toEqual(testOverrideResult1);
    expect(QueryUtils.parse(testOverrideResult1)).toEqual(testOverride1);

    const testOverride2 = {
      filterGarbage: true,
      manual: [
        { rowId: "test1", statName: "test2", newVal: 4, use: true },
        { rowId: "test3", statName: "test4", newVal: 2, use: false },
      ],
    } as CommonFilterParams;
    const testOverrideResult2 =
      "filterGarbage=true&manual.newVal=4&manual.newVal=2&manual.rowId=test1&manual.rowId=test3&manual.statName=test2&manual.statName=test4&manual.use=true&manual.use=false";
    expect(QueryUtils.stringify(testOverride2)).toEqual(testOverrideResult2);
    expect(QueryUtils.parse(testOverrideResult2)).toEqual(testOverride2);

    const testOtherQueries = {
      otherQueries: [
        { query: "test1a", queryFilters: "test1b" },
        { queryFilters: "test2b" },
        { query: "test3a" },
      ],
    } as CommonFilterParams;
    const testOtherQueriesResult =
      "otherQueries.0.query=test1a&otherQueries.0.queryFilters=test1b&otherQueries.1.queryFilters=test2b&otherQueries.2.query=test3a";
    expect(QueryUtils.stringify(testOtherQueries)).toEqual(
      testOtherQueriesResult,
    );
    expect(QueryUtils.parse(testOtherQueriesResult)).toEqual(testOtherQueries);
  });
  test("QueryUtils - extractAdvancedQuery", () => {
    const query1 = "test1";
    const query2 = "[test2]";
    const query3 = "NOT ([test3])";
    expect(QueryUtils.extractAdvancedQuery(query1)).toEqual([
      query1,
      undefined,
    ]);
    expect(QueryUtils.extractAdvancedQuery(query2)).toEqual([query2, "test2"]);
    expect(QueryUtils.extractAdvancedQuery(query3)).toEqual([
      query3,
      "NOT (test3)",
    ]);
  });
  test("QueryUtils - injectIntoQuery", () => {
    const query1 = "";
    const query2 = "test2";
    const query3 = "test3";
    expect(QueryUtils.injectIntoQuery("1", [query1, undefined])).toBe("1");
    expect(QueryUtils.injectIntoQuery("2", [query2, undefined])).toBe(
      "(2) AND (test2)",
    );
    expect(QueryUtils.injectIntoQuery("3", ["ignore3", query3])).toBe(
      "[players.id:(3) AND (test3)]",
    );
  });
  test("QueryUtils - basicOrAdvancedQuery/extractAdvancedQuery", () => {
    const query1 = ' [ test "]';
    const query2 = "te'st";
    const query3 = undefined;
    const query4 = ' NOT ([ test "] )';
    const query5 = '{"Cowan, Ant";Morsell;Ayala}~2';
    const query6 = '[players.id:{"Cowan, Ant";Morsell;Ayala}~2]';
    const query6b = '[players.id:{"Cowan, Ant";Morsell;Ayala}=2]';
    const query7 = "{Morsell;Ayala}=1";
    const query8 = "[players.id:{Cowan;Morsell;Ayala}=1]";

    expect(QueryUtils.basicOrAdvancedQuery(query1, "1")).toBe(' test "');
    expect(QueryUtils.basicOrAdvancedQuery(query2, "2")).toBe(
      "players.id:(te'st)",
    );
    expect(QueryUtils.basicOrAdvancedQuery(query3, 'NOT "*"')).toBe(
      'players.id:(NOT "*")',
    );
    expect(QueryUtils.basicOrAdvancedQuery(query4, "4")).toBe('NOT ( test ")');
    expect(QueryUtils.basicOrAdvancedQuery(query5, "fallback")).toBe(
      `players.id:((("Cowan, Ant" AND Morsell) OR ("Cowan, Ant" AND Ayala) OR (Morsell AND Ayala)))`,
    );
    expect(QueryUtils.basicOrAdvancedQuery(query6, "fallback")).toBe(
      `players.id:(("Cowan, Ant" AND Morsell) OR ("Cowan, Ant" AND Ayala) OR (Morsell AND Ayala))`,
    );
    expect(QueryUtils.basicOrAdvancedQuery(query6b, "fallback")).toBe(
      `players.id:((("Cowan, Ant" AND Morsell) AND NOT (Ayala)) OR (("Cowan, Ant" AND Ayala) AND NOT (Morsell)) OR ((Morsell AND Ayala) AND NOT ("Cowan, Ant")))`,
    );
    expect(QueryUtils.basicOrAdvancedQuery(query7, "fallback")).toBe(
      `players.id:((((Morsell) AND NOT (Ayala)) OR ((Ayala) AND NOT (Morsell))))`,
    );
    expect(QueryUtils.basicOrAdvancedQuery(query8, "fallback")).toBe(
      `players.id:(((Cowan) AND NOT (Morsell OR Ayala)) OR ((Morsell) AND NOT (Cowan OR Ayala)) OR ((Ayala) AND NOT (Cowan OR Morsell)))`,
    );

    // Whizzy home/away/neutral:
    const query9_ = "[opponent.team: Michigan]";
    const query9a = "[opponent.home: Michigan]";
    const query9b = "[(opponent.Home: Michigan)]";
    const query9c = '[opponent.away: "Michigan St."]';
    const query9d = '[opponent.Neutral: Michigan AND "blah"]';
    const query9e = '[opponent.neutral:(Michigan AND "blah")]';
    expect(QueryUtils.basicOrAdvancedQuery(query9_, "")).toBe(
      "opponent.team: Michigan",
    );
    expect(QueryUtils.basicOrAdvancedQuery(query9a, "")).toBe(
      "(location_type:Home AND (opponent.team:Michigan))",
    );
    expect(QueryUtils.basicOrAdvancedQuery(query9b, "")).toBe(
      "((location_type:Home AND (opponent.team:Michigan)))",
    );
    expect(QueryUtils.basicOrAdvancedQuery(query9c, "")).toBe(
      '(location_type:Away AND (opponent.team:"Michigan St."))',
    );
    expect(QueryUtils.basicOrAdvancedQuery(query9d, "")).toBe(
      '(location_type:Neutral AND (opponent.team:Michigan)) AND "blah"',
    );
    expect(QueryUtils.basicOrAdvancedQuery(query9e, "")).toBe(
      '(location_type:Neutral AND (opponent.team:(Michigan AND "blah")))',
    );
  });
  test("QueryUtils - getConference", () => {
    const lookup = {
      "A&M-Corpus Christi": {
        pbp_kp_team: "Texas A&M Corpus Chris",
      },
    };
    const efficiency = {
      "Texas A&M Corpus Chris": {
        "team_season.year": 2015,
        conf: "Southland Conference",
        "stats.adj_off.rank": 241,
        "stats.adj_off.value": 100.8,
        "stats.adj_def.rank": 198,
        "stats.adj_def.value": 105.9,
        "stats.adj_margin.rank": 227,
        "stats.adj_margin.value": -5.1000000000000085,
        "stats.adj_tempo.rank": 267,
        "stats.adj_tempo.value": 62.7,
        ncaa_seed: "",
        is_high_major: 0,
        good_md_comp: 0,
      },
    };
    expect(
      QueryUtils.getConference("A&M-Corpus Christi", efficiency, lookup),
    ).toEqual("Southland Conference");
    //(no lookup needed)
    expect(
      QueryUtils.getConference("Texas A&M Corpus Chris", efficiency, lookup),
    ).toEqual("Southland Conference");
    //(miss)
    expect(
      QueryUtils.getConference("Pretend Team", efficiency, lookup),
    ).toEqual("");
  });
  test("QueryUtils - parseFilter", () => {
    expect(QueryUtils.parseFilter("Conf ,Home, Nov-Dec", "2020")).toEqual([
      "Conf",
      "Home",
      "Nov-Dec",
    ]);
  });
  test("QueryUtils - parseFilter, custom dates", () => {
    expect(QueryUtils.parseFilter("Date:rabbit", "2020")).toEqual([]);
    expect(QueryUtils.parseFilter("Not-Home,Date:11.11-03.15", "2020")).toEqual(
      [
        "Not-Home",
        {
          kind: "Custom-Date",
          start: new Date("2020-11-11T05:00:00.000Z"),
          end: new Date("2021-03-15T04:00:00.000Z"),
        },
      ],
    );
    expect(QueryUtils.parseFilter("Date:11.11-12.01", "2020")).toEqual([
      {
        kind: "Custom-Date",
        start: new Date("2020-11-11T05:00:00.000Z"),
        end: new Date("2020-12-01T05:00:00.000Z"),
      },
    ]);
    expect(QueryUtils.parseFilter("Date:01.09-04.30", "2018")).toEqual([
      {
        kind: "Custom-Date",
        start: new Date("2019-01-09T05:00:00.000Z"),
        end: new Date("2019-04-30T04:00:00.000Z"),
      },
    ]);
  });
  test("QueryUtils - extractCustomDate", () => {
    const dateFilter = {
      kind: "Custom-Date",
      start: new Date("2019-01-09T05:00:00.000Z"),
      end: new Date("2019-04-30T04:00:00.000Z"),
    } as CommonFilterCustomDate;

    expect(QueryUtils.extractCustomDate(["Home", dateFilter])).toEqual(
      dateFilter,
    );
    expect(QueryUtils.extractCustomDate(["Home", "Conf"])).toEqual(undefined);
  });
  test("QueryUtils - setCustomDate", () => {
    const test1 = ["Conf", "Home"] as CommonFilterType[];
    const toSet1 = {
      kind: "Custom-Date",
      start: new Date("2019-01-09T05:00:00.000Z"),
      end: new Date("2019-04-30T04:00:00.000Z"),
    } as CommonFilterCustomDate;
    expect(QueryUtils.setCustomDate(test1, undefined)).toEqual(test1);
    expect(
      QueryUtils.buildFilterStr(QueryUtils.setCustomDate(test1, toSet1)),
    ).toEqual("Conf,Home,Date:01.09-04.30");

    const test2 = QueryUtils.parseFilter("Home,Conf,Date:11.11-12.01", "2020");
    expect(QueryUtils.setCustomDate(test2, undefined)).toEqual(test1);
    expect(
      QueryUtils.buildFilterStr(QueryUtils.setCustomDate(test2, toSet1)),
    ).toEqual("Conf,Home,Date:01.09-04.30");

    const test3 = QueryUtils.parseFilter("Conf,Last-30d", "2020");
    expect(
      QueryUtils.buildFilterStr(QueryUtils.setCustomDate(test3, toSet1)),
    ).toEqual("Conf,Date:01.09-04.30");
  });
  test("QueryUtils - buildFilterStr", () => {
    expect(QueryUtils.buildFilterStr(["Home"])).toEqual("Home");
    expect(
      QueryUtils.buildFilterStr([
        "Home",
        {
          kind: "Custom-Date",
          start: new Date("2020-11-11T05:00:00.000Z"),
          end: new Date("2020-12-01T05:00:00.000Z"),
        },
      ]),
    ).toEqual("Home,Date:11.11-12.01");
  });
  test("QueryUtils - filterWith/filterWithout/filterHas/toggleFilter", () => {
    [
      ["Conf"] as CommonFilterTypeSimple[],
      ["Home", "Away", "Not-Home"] as CommonFilterTypeSimple[],
      ["Nov-Dec", "Jan-Apr", "Last-30d"] as CommonFilterTypeSimple[],
    ].forEach((testSet) => {
      testSet.forEach((test) => {
        // Basic testing:
        expect(QueryUtils.toggleFilter([test], test)).toEqual([]);
        expect(QueryUtils.toggleFilter([], test)).toEqual([test]);
        // Check other options from same set are unset by toggle
        expect(
          QueryUtils.toggleFilter(
            _.filter(testSet, (nT) => nT != test),
            test,
          ),
        ).toEqual([test]);
        testSet.forEach((nonTest) => {
          if (nonTest != test) {
            expect(QueryUtils.toggleFilter([nonTest], test)).toEqual([test]);
          }
        });
      });
    });
    // Just check works with multiple
    expect(QueryUtils.toggleFilter(["Conf", "Nov-Dec"], "Away")).toEqual([
      "Away",
      "Conf",
      "Nov-Dec",
    ]);
    expect(
      QueryUtils.toggleFilter(["Conf", "Home", "Nov-Dec"], "Away"),
    ).toEqual(["Away", "Conf", "Nov-Dec"]);
    expect(
      QueryUtils.toggleFilter(["Conf", "Home", "Nov-Dec"], "Home"),
    ).toEqual(["Conf", "Nov-Dec"]);
  });
  test("QueryUtils - nonEmptyQueryObj/nonEmptyQueryStr", () => {
    // also tests nonEmptyQueryStr
    const emptyOnEmptyOff = {};
    const emptyOff1 = { onQuery: "test" };
    const emptyOff2 = { onQueryFilters: "test", offQuery: "" };
    const emptyOn1 = { offQuery: "test", onQueryFilters: "" };
    const emptyOn2 = { offQueryFilters: "test" };
    expect(QueryUtils.nonEmptyQueryObj(emptyOnEmptyOff, "on")).toBe(false);
    expect(QueryUtils.nonEmptyQueryObj(emptyOnEmptyOff, "off")).toBe(false);
    expect(QueryUtils.nonEmptyQueryObj(emptyOff1, "on")).toBe(true);
    expect(QueryUtils.nonEmptyQueryObj(emptyOff2, "on")).toBe(true);
    expect(QueryUtils.nonEmptyQueryObj(emptyOff1, "off")).toBe(false);
    expect(QueryUtils.nonEmptyQueryObj(emptyOff2, "off")).toBe(false);
    expect(QueryUtils.nonEmptyQueryObj(emptyOn1, "on")).toBe(false);
    expect(QueryUtils.nonEmptyQueryObj(emptyOn2, "on")).toBe(false);
    expect(QueryUtils.nonEmptyQueryObj(emptyOn1, "off")).toBe(true);
    expect(QueryUtils.nonEmptyQueryObj(emptyOn2, "off")).toBe(true);

    expect(QueryUtils.nonEmptyQuery("", ["Home"])).toBe(true);
    expect(QueryUtils.nonEmptyQuery(undefined, ["Home"])).toBe(true);
    expect(QueryUtils.nonEmptyQuery("Test", [])).toBe(true);
    expect(QueryUtils.nonEmptyQuery("Test", ["Conf"])).toBe(true);
    expect(QueryUtils.nonEmptyQuery("", [])).toBe(false);
    expect(QueryUtils.nonEmptyQuery(undefined, [])).toBe(false);
  });
  test("QueryUtils - autoOffAndFilters/autoOffAndFiltersObj", () => {
    expect(QueryUtils.autoOffAndFilters(true, [])).toEqual(false);
    expect(QueryUtils.autoOffAndFilters(false, ["Conf"])).toEqual(false);
    expect(QueryUtils.autoOffAndFilters(true, ["Conf"])).toEqual(true);

    expect(
      QueryUtils.autoOffAndFiltersObj({
        autoOffQuery: true,
        onQueryFilters: "",
      }),
    ).toEqual(false);
    expect(QueryUtils.autoOffAndFiltersObj({ autoOffQuery: true })).toEqual(
      false,
    );
    expect(
      QueryUtils.autoOffAndFiltersObj({
        autoOffQuery: false,
        onQueryFilters: "Conf",
      }),
    ).toEqual(false);
    expect(QueryUtils.autoOffAndFiltersObj({ onQueryFilters: "Conf" })).toEqual(
      false,
    );
    expect(
      QueryUtils.autoOffAndFiltersObj({
        autoOffQuery: true,
        onQueryFilters: "Conf",
      }),
    ).toEqual(true);
  });
  test("invertedQueryMode", () => {
    expect(QueryUtils.invertedQueryMode({})).toEqual(false);
    expect(
      QueryUtils.invertedQueryMode({
        invertBase: "",
        invertBaseQueryFilters: "",
      }),
    ).toEqual(false);
    expect(
      QueryUtils.invertedQueryMode({
        invertBase: "test",
        invertBaseQueryFilters: "test",
      }),
    ).toEqual(true);
    expect(QueryUtils.invertedQueryMode({ invertBase: "test" })).toEqual(true);
    expect(
      QueryUtils.invertedQueryMode({ invertBaseQueryFilters: "test" }),
    ).toEqual(true);
  });

  test("QueryUtils - buildGameFilterParamsByPlayerPositions (crafted single position, degenerate *)", () => {
    const teamSeasonLookup = "";
    const positionFromPlayerKey: Record<string, IndivPosInfo> = {
      idA: { posClass: "s-PG", posConfidences: [60, 40, 0, 0, 0] },
      idB: { posClass: "CG", posConfidences: [40, 60, 0, 0, 0] },
      idC: { posClass: "WF", posConfidences: [0, 0, 50, 50, 0] },
      idD: { posClass: "PF/C", posConfidences: [0, 0, 0, 50, 50] },
      idX: { posClass: "C", posConfidences: [0, 0, 0, 0, 100] },
    };
    const lineup1: LineupStatSet = {
      key: "codeA_codeB_codeC_codeD_codeX",
      doc_count: 10,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "codeA", id: "idA" },
                  { code: "codeB", id: "idB" },
                  { code: "codeC", id: "idC" },
                  { code: "codeD", id: "idD" },
                  { code: "codeX", id: "idX" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineups: LineupStatSet[] = [lineup1];
    const result = QueryUtils.buildGameFilterParamsByPlayerPositions(
      lineups,
      "idX",
      positionFromPlayerKey,
      teamSeasonLookup,
    );
    expect(result.onQuery).toBe("*");
    expect(result.offQuery).toBe("");
    expect(result.otherQueries).toEqual([]);
    expect(result.splitPhrases).toEqual(["cd=[5]", ""]);
    expect(result.splitText).toEqual([
      '<div><small class="d-xl-none">cd=[5]</small><small class="d-none d-xl-block">codeX=[5]</small></div>',
      "",
    ]);
    expect(result.autoOffQuery).toBe(false);
    const resultByCode = QueryUtils.buildGameFilterParamsByPlayerPositions(
      lineups,
      "codeX",
      positionFromPlayerKey,
      teamSeasonLookup,
    );
    expect(resultByCode.onQuery).toBe(result.onQuery);
    expect(resultByCode.splitPhrases).toEqual(["cd=[5]", ""]);
    expect(resultByCode.splitText).toEqual(result.splitText);
  });

  test("QueryUtils - buildGameFilterParamsByPlayerPositions pools from X-lineups only (no idT from other lineups)", () => {
    const teamSeasonLookup = "";
    const positionFromPlayerKey: Record<string, IndivPosInfo> = {
      idA: { posClass: "s-PG", posConfidences: [80, 20, 0, 0, 0] },
      idB: { posClass: "WG", posConfidences: [10, 80, 10, 0, 0] },
      idC: { posClass: "WF", posConfidences: [0, 0, 80, 20, 0] },
      idD: { posClass: "PF/C", posConfidences: [0, 0, 0, 50, 50] },
      idE: { posClass: "C", posConfidences: [0, 0, 0, 0, 100] },
      idX: { posClass: "PF/C", posConfidences: [0, 0, 0, 50, 50] },
      idT: { posClass: "C", posConfidences: [0, 0, 0, 0, 100] },
      idP: { posClass: "s-PG", posConfidences: [70, 30, 0, 0, 0] },
      idQ: { posClass: "WG", posConfidences: [20, 70, 10, 0, 0] },
      idR: { posClass: "WF", posConfidences: [0, 10, 70, 20, 0] },
      idS: { posClass: "PF/C", posConfidences: [0, 0, 10, 40, 50] },
    };
    const lineupWithX: LineupStatSet = {
      key: "codeA_codeB_codeC_codeD_codeX",
      doc_count: 10,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "codeA", id: "idA" },
                  { code: "codeB", id: "idB" },
                  { code: "codeC", id: "idC" },
                  { code: "codeD", id: "idD" },
                  { code: "codeX", id: "idX" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineupWithX2: LineupStatSet = {
      key: "codeA_codeB_codeC_codeX_codeE",
      doc_count: 5,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "codeA", id: "idA" },
                  { code: "codeB", id: "idB" },
                  { code: "codeC", id: "idC" },
                  { code: "codeX", id: "idX" },
                  { code: "codeE", id: "idE" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineupWithoutX: LineupStatSet = {
      key: "codeP_codeQ_codeR_codeS_codeT",
      doc_count: 99,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "codeP", id: "idP" },
                  { code: "codeQ", id: "idQ" },
                  { code: "codeR", id: "idR" },
                  { code: "codeS", id: "idS" },
                  { code: "codeT", id: "idT" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineups: LineupStatSet[] = [
      lineupWithX,
      lineupWithX2,
      lineupWithoutX,
    ];
    const result = QueryUtils.buildGameFilterParamsByPlayerPositions(
      lineups,
      "idX",
      positionFromPlayerKey,
      teamSeasonLookup,
    );
    expect(result.onQuery).toContain('"idX"');
    expect(result.onQuery).not.toContain("idT");
  });

  test("QueryUtils - buildGameFilterParamsByPlayerPositions (crafted two lineups)", () => {
    const teamSeasonLookup = "";
    const positionFromPlayerKey: Record<string, IndivPosInfo> = {
      idA: { posClass: "s-PG", posConfidences: [80, 20, 0, 0, 0] },
      idB: { posClass: "WG", posConfidences: [10, 80, 10, 0, 0] },
      idC: { posClass: "WF", posConfidences: [0, 0, 80, 20, 0] },
      idD: { posClass: "PF/C", posConfidences: [0, 0, 0, 50, 50] },
      idE: { posClass: "C", posConfidences: [0, 0, 0, 0, 100] },
      idX: { posClass: "PF/C", posConfidences: [0, 0, 0, 50, 50] },
    };
    const lineup1: LineupStatSet = {
      key: "codeA_codeB_codeC_codeD_codeX",
      doc_count: 10,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "codeA", id: "idA" },
                  { code: "codeB", id: "idB" },
                  { code: "codeC", id: "idC" },
                  { code: "codeD", id: "idD" },
                  { code: "codeX", id: "idX" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineup2: LineupStatSet = {
      key: "codeA_codeB_codeC_codeX_codeE",
      doc_count: 5,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "codeA", id: "idA" },
                  { code: "codeB", id: "idB" },
                  { code: "codeC", id: "idC" },
                  { code: "codeX", id: "idX" },
                  { code: "codeE", id: "idE" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineups: LineupStatSet[] = [lineup1, lineup2];
    const result = QueryUtils.buildGameFilterParamsByPlayerPositions(
      lineups,
      "idX",
      positionFromPlayerKey,
      teamSeasonLookup,
    );
    expect(result.onQuery).toMatch(/\*|=1/);
    expect(
      result.splitPhrases!.filter(Boolean).every((s) => /^cd=\[\d\]$/.test(s)),
    ).toBe(true);
    expect(result.autoOffQuery).toBe(false);
    if (result.splitPhrases!.filter(Boolean).length >= 2) {
      expect(result.offQuery).toMatch(/\*|=1/);
    }
  });

  test("QueryUtils - identifyHigherLowerSets clean vs corrupt partition", () => {
    const teamSeasonLookup = "";
    const pos: Record<string, IndivPosInfo> = {
      idA: { posClass: "s-PG", posConfidences: [80, 0, 0, 0, 0] },
      idB: { posClass: "WG", posConfidences: [0, 80, 0, 0, 0] },
      idC: { posClass: "WF", posConfidences: [0, 0, 80, 0, 0] },
      idD: { posClass: "PF/C", posConfidences: [0, 0, 0, 80, 0] },
      idE: { posClass: "C", posConfidences: [0, 0, 0, 0, 100] },
      idX: { posClass: "WF", posConfidences: [0, 0, 70, 0, 0] },
    };
    const resolved = { code: "codeX", id: "idX" };
    const cleanLineup: LineupStatSet = {
      key: "k1",
      doc_count: 1,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "a", id: "idA" },
                  { code: "b", id: "idB" },
                  { code: "x", id: "idX" },
                  { code: "d", id: "idD" },
                  { code: "e", id: "idE" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const clean = QueryUtils.identifyHigherLowerSets(
      [cleanLineup],
      resolved,
      pos,
      teamSeasonLookup,
    );
    expect(clean.isCorrupt).toBe(false);
    expect(clean.lowerIds.length).toBeGreaterThan(0);
    expect(clean.higherIds.length).toBeGreaterThan(0);
    const inter = _.intersection(clean.lowerIds, clean.higherIds);
    expect(inter.length).toBe(0);

    /** Same teammate can sit above or below X in different lineups; orderLineup is otherwise deterministic for fixed five. */
    const posCorrupt: Record<string, IndivPosInfo> = {
      ...pos,
      idP: { posClass: "PG", posConfidences: [100, 0, 0, 0, 0] },
      idQ: { posClass: "PF/C", posConfidences: [0, 0, 0, 90, 10] },
      idR: { posClass: "C", posConfidences: [0, 0, 0, 0, 100] },
    };
    const lineupXMid: LineupStatSet = {
      key: "k2",
      doc_count: 1,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "a", id: "idA" },
                  { code: "b", id: "idB" },
                  { code: "x", id: "idX" },
                  { code: "d", id: "idD" },
                  { code: "e", id: "idE" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineupCorruptSecond: LineupStatSet = {
      key: "k3",
      doc_count: 1,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "p", id: "idP" },
                  { code: "d", id: "idD" },
                  { code: "x", id: "idX" },
                  { code: "q", id: "idQ" },
                  { code: "r", id: "idR" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;

    const orderLineupOriginal = PositionUtils.orderLineup.bind(PositionUtils);
    const spy = jest.spyOn(PositionUtils, "orderLineup");
    spy.mockImplementation((codesAndIds, playersById, ts) => {
      if (codesAndIds.some((c) => c.id === "idP")) {
        return [
          { code: "p", id: "idP" },
          { code: "d", id: "idD" },
          { code: "x", id: "idX" },
          { code: "q", id: "idQ" },
          { code: "r", id: "idR" },
        ];
      }
      return orderLineupOriginal(codesAndIds, playersById, ts);
    });
    try {
      const corrupt = QueryUtils.identifyHigherLowerSets(
        [lineupXMid, lineupCorruptSecond],
        resolved,
        posCorrupt,
        teamSeasonLookup,
      );
      expect(corrupt.isCorrupt).toBe(true);
      expect(
        _.intersection(corrupt.lowerIds, corrupt.higherIds).length,
      ).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
    }
  });

  test("QueryUtils - buildPositionQueriesFromSets corrupt OR lineups", () => {
    const resolved = { code: "codeX", id: "idX" };
    const emptySlots: string[][] = [[], [], [], [], []];
    const ctx = {
      lowerIds: ["idA"],
      higherIds: ["idA"],
      isCorrupt: true,
      positionsPlayed: [3],
      teamSlotOccupants: emptySlots,
      lineupRows: [
        {
          lineupKey: "k1",
          sortedIds: ["idA", "idB", "idX", "idD", "idE"],
          xPosition: 3,
          lowerIds: ["idA", "idB"],
          higherIds: ["idD", "idE"],
        },
        {
          lineupKey: "k2",
          sortedIds: ["idP", "idQ", "idX", "idR", "idS"],
          xPosition: 3,
          lowerIds: ["idP", "idQ"],
          higherIds: ["idR", "idS"],
        },
      ],
    };
    const q = QueryUtils.buildPositionQueriesFromSets(resolved, [3], ctx);
    expect(q[3]).toContain(" OR ");
    expect(q[3]).toContain("=5");
    expect(q[3]).toContain('"idX"');
  });

  test("QueryUtils - compressPositionQueries is pass-through", () => {
    const raw = { 3: '{"idX"}=1 AND {h}=2' };
    const ctx = {
      lowerIds: [],
      higherIds: [],
      isCorrupt: false,
      positionsPlayed: [3],
      lineupRows: [],
      teamSlotOccupants: [[], [], [], [], []],
    };
    expect(QueryUtils.compressPositionQueries(raw, ctx)).toEqual(raw);
  });

  /** Normal path: pools are per-player unions from X-lineups only, not other 5-man lineups. */
  test("QueryUtils - normal position query pools exclude teammates from lineups without X", () => {
    const teamSeasonLookup = "";
    const pos: Record<string, IndivPosInfo> = {
      idA: { posClass: "s-PG", posConfidences: [80, 0, 0, 0, 0] },
      idB: { posClass: "WG", posConfidences: [0, 80, 0, 0, 0] },
      idC: { posClass: "WF", posConfidences: [0, 0, 80, 0, 0] },
      idD: { posClass: "PF/C", posConfidences: [0, 0, 0, 80, 0] },
      idE: { posClass: "C", posConfidences: [0, 0, 0, 0, 100] },
      idX: { posClass: "WF", posConfidences: [0, 0, 70, 0, 0] },
      idP: { posClass: "s-PG", posConfidences: [90, 0, 0, 0, 0] },
      idQ: { posClass: "WG", posConfidences: [0, 90, 0, 0, 0] },
    };
    const resolved = { code: "codeX", id: "idX" };
    const lineupXGayleSF: LineupStatSet = {
      key: "k_x_sf",
      doc_count: 1,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "a", id: "idA" },
                  { code: "b", id: "idB" },
                  { code: "x", id: "idX" },
                  { code: "d", id: "idD" },
                  { code: "e", id: "idE" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const lineupNoXOtherBackcourt: LineupStatSet = {
      key: "k_no_x",
      doc_count: 1,
      players_array: {
        hits: {
          hits: [
            {
              _source: {
                players: [
                  { code: "p", id: "idP" },
                  { code: "q", id: "idQ" },
                  { code: "c", id: "idC" },
                  { code: "d", id: "idD" },
                  { code: "e", id: "idE" },
                ],
              },
            },
          ],
        },
      },
    } as LineupStatSet;
    const ctx = QueryUtils.identifyHigherLowerSets(
      [lineupXGayleSF, lineupNoXOtherBackcourt],
      resolved,
      pos,
      teamSeasonLookup,
    );
    expect(ctx.isCorrupt).toBe(false);
    const q = QueryUtils.buildPositionQueriesFromSets(resolved, [3], ctx);
    expect(q[3]).toContain('"idA"');
    expect(q[3]).toContain('"idB"');
    expect(q[3]).not.toContain('"idP"');
    expect(q[3]).not.toContain('"idQ"');
  });

  test("QueryUtils - buildGameFilterParamsByPlayerPositions (sample data)", () => {
    const teamSeasonLookup = "Men_Maryland_2019/20";
    const buckets = sampleLineupStatsResponse.responses[0].aggregations.lineups
      .buckets as LineupStatSet[];
    const positionFromPlayerKey: Record<string, IndivPosInfo> = {
      "Wiggins, Aaron": {
        posConfidences: [10, 20, 50, 10, 0],
        posClass: "WG",
      },
      "Cowan, Anthony": {
        posConfidences: [60, 40, 10, 0, 0],
        posClass: "s-PG",
      },
      "Morsell, Darryl": {
        posConfidences: [10, 40, 50, 30, 10],
        posClass: "WG",
      },
      "Ayala, Eric": {
        posConfidences: [40, 60, 10, 0, 0],
        posClass: "CG",
      },
      "Smith, Jalen": {
        posConfidences: [0, 0, 0, 50, 50],
        posClass: "PF/C",
      },
      "Scott, Donta": {
        posConfidences: [10, 30, 50, 30, 10],
        posClass: "WG",
      },
    };
    const result = QueryUtils.buildGameFilterParamsByPlayerPositions(
      buckets,
      "ErAyala",
      positionFromPlayerKey,
      teamSeasonLookup,
    );
    expect(result.onQuery).toContain('"Ayala, Eric"');
    expect(result.onQuery).toContain("=1");
    expect(result.splitPhrases!.filter(Boolean).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      result.splitPhrases!.filter(Boolean).every((s) => /^EA=\[\d\]$/.test(s)),
    ).toBe(true);
    expect(result.autoOffQuery).toBe(false);

    const resultById = QueryUtils.buildGameFilterParamsByPlayerPositions(
      buckets,
      "Ayala, Eric",
      positionFromPlayerKey,
      teamSeasonLookup,
    );
    expect(resultById.onQuery).toBe(result.onQuery);
    expect(resultById.splitPhrases).toEqual(result.splitPhrases);
  });

  test("QueryUtils - buildGameFilterParamsByPlayerPositions (unknown player / empty)", () => {
    const lineup: LineupStatSet = {
      key: "a_b_c_d_x",
      doc_count: 1,
      players_array: {
        hits: { hits: [{ _source: { players: [] } }] },
      },
    } as LineupStatSet;
    const positionFromPlayerKey: Record<string, IndivPosInfo> = {};
    const result = QueryUtils.buildGameFilterParamsByPlayerPositions(
      [lineup],
      "nonexistent",
      positionFromPlayerKey,
      "",
    );
    expect(result.onQuery).toBe("");
    expect(result.offQuery).toBe("");
    expect(result.otherQueries).toEqual([]);
    expect(result.splitPhrases).toEqual([]);
    expect(result.autoOffQuery).toBe(false);
  });

  test("QueryUtils - queryDisplayStrs", () => {
    const test1: GameFilterParams = { onQuery: `OQ1`, autoOffQuery: true };
    expect(QueryUtils.queryDisplayStrs(test1)).toEqual({
      baseline: ``,
      off: `NOT [query: 'OQ1']`,
      on: `query: 'OQ1'`,
      other: [],
    });
    const test1b: GameFilterParams = {
      onQuery: `OQ1`,
      offQuery: "IGNORE ME",
      autoOffQuery: true,
    };
    expect(QueryUtils.queryDisplayStrs(test1b)).toEqual({
      baseline: ``,
      off: `NOT [query: 'OQ1']`,
      on: `query: 'OQ1'`,
      other: [],
    });
    const test1c: GameFilterParams = {
      onQuery: `OQ1`,
      offQuery: "IGNORE ME",
      offQueryFilters: "IGNORE ME 2",
      autoOffQuery: true,
    };
    expect(QueryUtils.queryDisplayStrs(test1c)).toEqual({
      baseline: ``,
      off: `NOT [query: 'OQ1']`,
      on: `query: 'OQ1'`,
      other: [],
    });
    const test1d: GameFilterParams = {
      onQueryFilters: `OF1`,
      offQuery: "IGNORE ME",
      offQueryFilters: "IGNORE ME 2",
      autoOffQuery: true,
    };
    expect(QueryUtils.queryDisplayStrs(test1c)).toEqual({
      baseline: ``,
      off: `NOT [query: 'OQ1']`,
      on: `query: 'OQ1'`,
      other: [],
    });
    const test1e: GameFilterParams = {
      onQuery: `OQ1`,
      onQueryFilters: `OF1`,
      autoOffQuery: true,
    };
    expect(QueryUtils.queryDisplayStrs(test1e)).toEqual({
      baseline: ``,
      off: `NOT [query: 'OQ1', filters: 'OF1']`,
      on: `query: 'OQ1', filters: 'OF1'`,
      other: [],
    });
    const test1f: GameFilterParams = {
      onQuery: `OQ1`,
      onQueryFilters: `OF1`,
      autoOffQuery: true,
      baseQuery: "BQ1",
    };
    expect(QueryUtils.queryDisplayStrs(test1f)).toEqual({
      baseline: `query: 'BQ1'`,
      off: `NOT [query: 'OQ1', filters: 'OF1']`,
      on: `query: 'OQ1', filters: 'OF1'`,
      other: [],
    });

    const test2: GameFilterParams = { onQuery: `OQ2`, offQuery: "OffQ2" };
    expect(QueryUtils.queryDisplayStrs(test2)).toEqual({
      baseline: ``,
      off: `query: 'OffQ2'`,
      on: `query: 'OQ2'`,
      other: [],
    });
    const test2a: GameFilterParams = {
      baseQuery: "BQ2",
      onQuery: `OQ2`,
      offQuery: "OffQ2",
    };
    expect(QueryUtils.queryDisplayStrs(test2a)).toEqual({
      baseline: `query: 'BQ2'`,
      off: `query: 'OffQ2'`,
      on: `query: 'OQ2'`,
      other: [],
    });
    const test2b: GameFilterParams = {
      queryFilters: "BF2",
      onQuery: `OQ2`,
      offQuery: "OffQ2",
    };
    expect(QueryUtils.queryDisplayStrs(test2b)).toEqual({
      baseline: `filters: 'BF2'`,
      off: `query: 'OffQ2'`,
      on: `query: 'OQ2'`,
      other: [],
    });
    const test2c: GameFilterParams = {
      baseQuery: "BQ2",
      queryFilters: "BF2",
      onQuery: `OQ2`,
      offQuery: "OffQ2",
    };
    expect(QueryUtils.queryDisplayStrs(test2c)).toEqual({
      baseline: `query: 'BQ2', filters: 'BF2'`,
      off: `query: 'OffQ2'`,
      on: `query: 'OQ2'`,
      other: [],
    });

    const test3: GameFilterParams = {
      onQueryFilters: `OF3`,
      offQueryFilters: "OffF3",
    };
    expect(QueryUtils.queryDisplayStrs(test3)).toEqual({
      baseline: ``,
      off: `filters: 'OffF3'`,
      on: `filters: 'OF3'`,
      other: [],
    });
    const test3b: GameFilterParams = {
      baseQuery: "BQ3",
      onQueryFilters: `OF3`,
      offQueryFilters: "OffF3",
    };
    expect(QueryUtils.queryDisplayStrs(test3b)).toEqual({
      baseline: `query: 'BQ3'`,
      off: `filters: 'OffF3'`,
      on: `filters: 'OF3'`,
      other: [],
    });

    const test4: GameFilterParams = {
      onQuery: "OQ4",
      onQueryFilters: `OF4`,
      offQuery: "OffQ4",
      offQueryFilters: "OffF4",
    };
    expect(QueryUtils.queryDisplayStrs(test4)).toEqual({
      baseline: ``,
      off: `query: 'OffQ4', filters: 'OffF4'`,
      on: `query: 'OQ4', filters: 'OF4'`,
      other: [],
    });
    const test4b: GameFilterParams = {
      baseQuery: "BQ4",
      queryFilters: "BF4",
      onQuery: "OQ4",
      onQueryFilters: `OF4`,
      offQuery: "OffQ4",
      offQueryFilters: "OffF4",
    };
    expect(QueryUtils.queryDisplayStrs(test4b)).toEqual({
      baseline: `query: 'BQ4', filters: 'BF4'`,
      off: `query: 'OffQ4', filters: 'OffF4'`,
      on: `query: 'OQ4', filters: 'OF4'`,
      other: [],
    });
  });
  const test5: GameFilterParams = {
    onQuery: "OQ5",
    onQueryFilters: `OF5`,
    offQuery: "OffQ5",
    offQueryFilters: "OffF5",
    otherQueries: [
      {
        query: "otherQ1",
        queryFilters: "otherQF1",
      },
      {
        query: "otherQ2",
      },
      {
        queryFilters: "otherQF3",
      },
    ],
  };
  expect(QueryUtils.queryDisplayStrs(test5)).toEqual({
    baseline: ``,
    off: `query: 'OffQ5', filters: 'OffF5'`,
    on: `query: 'OQ5', filters: 'OF5'`,
    other: [
      `query: 'otherQ1', filters: 'otherQF1'`,
      `query: 'otherQ2'`,
      `filters: 'otherQF3'`,
    ],
  });
});
