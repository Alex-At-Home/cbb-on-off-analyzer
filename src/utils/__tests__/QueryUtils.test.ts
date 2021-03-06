

import _ from 'lodash';

import { CommonFilterType, QueryUtils } from "../QueryUtils";
import { CommonFilterParams } from "../FilterModels";

describe("QueryUtils", () => {
  test("QueryUtils - parse/stringify", () => {
    //(just test lineupQuery/baseQuery handling)
    expect(QueryUtils.stringify({lineupQuery: "a", otherField: true} as CommonFilterParams)).toEqual(
      "baseQuery=a&otherField=true"
    );
    expect(QueryUtils.parse("lineupQuery=a&otherField=true&numField=1")).toEqual(
      {baseQuery: "a", otherField: true, numField: "1"}
    );
    // Check garbageFilter handling
    expect(QueryUtils.stringify({lineupQuery: "a", filterGarbage: true} as CommonFilterParams)).toEqual(
      "baseQuery=a&filterGarbage=true"
    );
    expect(QueryUtils.stringify({lineupQuery: "a", filterGarbage: false} as CommonFilterParams)).toEqual(
      "baseQuery=a"
    );
    // Check queryFilter handling
    expect(QueryUtils.stringify({lineupQuery: "a", queryFilters: "Conf,Nov-Dec"} as CommonFilterParams)).toEqual(
      "baseQuery=a&queryFilters=Conf%2CNov-Dec"
    );
    expect(QueryUtils.stringify({lineupQuery: "a", queryFilters: ""} as CommonFilterParams)).toEqual(
      "baseQuery=a"
    );
    // Test nested luck object handling
    expect(QueryUtils.stringify({lineupQuery: "a", luck: { base: "season" }} as CommonFilterParams)).toEqual(
      "baseQuery=a&luck.base=season"
    );
    expect(QueryUtils.parse("lineupQuery=a&otherField=true&luck.base=baseline")).toEqual(
      {baseQuery: "a", otherField: true, luck: { base: "baseline"} }
    );
    // Test bwc change to onOffLuck:
    expect(QueryUtils.parse("lineupQuery=a&onOffLuck=season&luck.base=baseline")).toEqual(
      {baseQuery: "a", onOffLuck: true, luck: { base: "season"} }
    );
    // Test nested manual override object handling
    const testOverride1 = {filterGarbage: true, manual: [
      { rowId: "test1", statName: "test2", newVal: 4, use: true }
    ]} as CommonFilterParams;
    const testOverrideResult1 = "filterGarbage=true&manual.newVal=4&manual.rowId=test1&manual.statName=test2&manual.use=true";
    expect(QueryUtils.stringify(testOverride1)).toEqual(testOverrideResult1);
    expect(QueryUtils.parse(testOverrideResult1)).toEqual(testOverride1);

    const testOverride2 = {filterGarbage: true, manual: [
      { rowId: "test1", statName: "test2", newVal: 4, use: true },
      { rowId: "test3", statName: "test4", newVal: 2, use: false },
    ]} as CommonFilterParams;
    const testOverrideResult2 = "filterGarbage=true&manual.newVal=4&manual.newVal=2&manual.rowId=test1&manual.rowId=test3&manual.statName=test2&manual.statName=test4&manual.use=true&manual.use=false";
    expect(QueryUtils.stringify(testOverride2)).toEqual(testOverrideResult2);
    expect(QueryUtils.parse(testOverrideResult2)).toEqual(testOverride2);
  });
  test("QueryUtils - extractAdvancedQuery", () => {
    const query1 = "test1";
    const query2 = "[test2]";
    const query3 = "NOT ([test3])";
    expect(QueryUtils.extractAdvancedQuery(query1)).toEqual([query1, undefined]);
    expect(QueryUtils.extractAdvancedQuery(query2)).toEqual([query2, "test2"]);
    expect(QueryUtils.extractAdvancedQuery(query3)).toEqual([query3, "NOT (test3)"]);
  });
  test("QueryUtils - injectIntoQuery", () => {
    const query1 = "";
    const query2 = "test2";
    const query3 = "test3";
    expect(QueryUtils.injectIntoQuery("1", [query1, undefined])).toBe("1");
    expect(QueryUtils.injectIntoQuery("2", [query2, undefined])).toBe("(2) AND (test2)");
    expect(QueryUtils.injectIntoQuery("3", ["ignore3", query3])).toBe("[players.id:(3) AND (test3)]");
  });
  test("QueryUtils - basicOrAdvancedQuery/extractAdvancedQuery", () => {

    const query1 = ' [ test "]';
    const query2 = "te'st";
    const query3 = undefined;
    const query4 = ' NOT ([ test "] )';
    const query5 = '{"Cowan, Ant";Morsell;Ayala}~2';
    const query6 = '[players.id:{"Cowan, Ant";Morsell;Ayala}~2]';
    const query6b = '[players.id:{"Cowan, Ant";Morsell;Ayala}=2]';
    const query7 = '{Morsell;Ayala}=1';
    const query8 = '[players.id:{Cowan;Morsell;Ayala}=1]';

    expect(QueryUtils.basicOrAdvancedQuery(query1, "1")).toBe(' test "');
    expect(QueryUtils.basicOrAdvancedQuery(query2, "2")).toBe("players.id:(te'st)");
    expect(QueryUtils.basicOrAdvancedQuery(query3, 'NOT "*"')).toBe('players.id:(NOT "*")');
    expect(QueryUtils.basicOrAdvancedQuery(query4, "4")).toBe('NOT ( test ")');
    expect(QueryUtils.basicOrAdvancedQuery(query5, "fallback")).toBe(
      `players.id:((("Cowan, Ant" AND Morsell) OR ("Cowan, Ant" AND Ayala) OR (Morsell AND Ayala)))`
    );
    expect(QueryUtils.basicOrAdvancedQuery(query6, "fallback")).toBe(
      `players.id:(("Cowan, Ant" AND Morsell) OR ("Cowan, Ant" AND Ayala) OR (Morsell AND Ayala))`
    );
    expect(QueryUtils.basicOrAdvancedQuery(query6b, "fallback")).toBe(
      `players.id:((("Cowan, Ant" AND Morsell) AND NOT (Ayala)) OR (("Cowan, Ant" AND Ayala) AND NOT (Morsell)) OR ((Morsell AND Ayala) AND NOT ("Cowan, Ant")))`
    );
    expect(QueryUtils.basicOrAdvancedQuery(query7, "fallback")).toBe(
      `players.id:((((Morsell) AND NOT (Ayala)) OR ((Ayala) AND NOT (Morsell))))`
    );
    expect(QueryUtils.basicOrAdvancedQuery(query8, "fallback")).toBe(
      `players.id:(((Cowan) AND NOT (Morsell OR Ayala)) OR ((Morsell) AND NOT (Cowan OR Ayala)) OR ((Ayala) AND NOT (Cowan OR Morsell)))`
    );

    // Whizzy home/away/neutral:
    const query9_ = '[opponent.team: Michigan]';
    const query9a = '[opponent.home: Michigan]';
    const query9b = '[(opponent.Home: Michigan)]';
    const query9c = '[opponent.away: "Michigan St."]';
    const query9d = '[opponent.Neutral: Michigan AND "blah"]';
    const query9e = '[opponent.neutral:(Michigan AND "blah")]';
    expect(QueryUtils.basicOrAdvancedQuery(query9_, "")).toBe('opponent.team: Michigan');
    expect(QueryUtils.basicOrAdvancedQuery(query9a, "")).toBe('(location_type:Home AND (opponent.team:Michigan))');
    expect(QueryUtils.basicOrAdvancedQuery(query9b, "")).toBe('((location_type:Home AND (opponent.team:Michigan)))');
    expect(QueryUtils.basicOrAdvancedQuery(query9c, "")).toBe('(location_type:Away AND (opponent.team:"Michigan St."))');
    expect(QueryUtils.basicOrAdvancedQuery(query9d, "")).toBe('(location_type:Neutral AND (opponent.team:Michigan)) AND "blah"');
    expect(QueryUtils.basicOrAdvancedQuery(query9e, "")).toBe('(location_type:Neutral AND (opponent.team:(Michigan AND "blah")))');
  });
  test("QueryUtils - parseFilter", () => {
    expect(QueryUtils.parseFilter("Conf ,Home, Nov-Dec")).toEqual([
      "Conf", "Home", "Nov-Dec"
    ]);
  });
  test("QueryUtils - filterWith/filterWithout/filterHas/toggleFilter", () => {
    [
      [ "Conf" ] as CommonFilterType[],
      [ "Home", "Away", "Not-Home"] as CommonFilterType[],
      [ "Nov-Dec", "Jan-Apr", "Last-30d"] as CommonFilterType[],
    ].forEach((testSet) => {
      testSet.forEach((test) => {
        // Basic testing:
        expect(QueryUtils.toggleFilter([test], test)).toEqual([]);
        expect(QueryUtils.toggleFilter([], test)).toEqual([test]);
        // Check other options from same set are unset by toggle
        expect(QueryUtils.toggleFilter(_.filter(testSet, (nT) => nT != test), test)).toEqual([test]);
        testSet.forEach((nonTest) => {
          if (nonTest != test) {
            expect(QueryUtils.toggleFilter([nonTest], test)).toEqual([test]);
          }
        });
      });
    });
    // Just check works with multiple
    expect(QueryUtils.toggleFilter(["Conf", "Nov-Dec"], "Away")).toEqual(["Away","Conf","Nov-Dec"]);
    expect(QueryUtils.toggleFilter(["Conf", "Home", "Nov-Dec"], "Away")).toEqual(["Away","Conf","Nov-Dec"]);
    expect(QueryUtils.toggleFilter(["Conf", "Home", "Nov-Dec"], "Home")).toEqual(["Conf","Nov-Dec"]);
  });
  test("QueryUtils - getConference", () => {
    const lookup = {
      "A&M-Corpus Christi": {
         "pbp_kp_team": "Texas A&M Corpus Chris"
      }
    }
    const efficiency = {
      "Texas A&M Corpus Chris": {
         "team_season.year": 2015,
         "conf": "Southland Conference",
         "stats.adj_off.rank": 241,
         "stats.adj_off.value": 100.8,
         "stats.adj_def.rank": 198,
         "stats.adj_def.value": 105.9,
         "stats.adj_margin.rank": 227,
         "stats.adj_margin.value": -5.1000000000000085,
         "stats.adj_tempo.rank": 267,
         "stats.adj_tempo.value": 62.7,
         "ncaa_seed": "",
         "is_high_major": 0,
         "good_md_comp": 0
      }
    }
    expect(QueryUtils.getConference("A&M-Corpus Christi", efficiency, lookup)).toEqual("Southland Conference");
    //(no lookup needed)
    expect(QueryUtils.getConference("Texas A&M Corpus Chris", efficiency, lookup)).toEqual("Southland Conference");
    //(miss)
    expect(QueryUtils.getConference("Pretend Team", efficiency, lookup)).toEqual("");
  });
});
