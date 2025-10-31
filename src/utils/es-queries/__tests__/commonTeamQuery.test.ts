import { commonTeamQuery } from "../commonTeamQuery";
import { CommonFilterType, QueryUtils } from "../../QueryUtils";
import _ from "lodash";

describe("commonTeamQuery", () => {
  test("commonTeamQuery (queryFilters)", () => {
    const efficiencyInfo = { TestTeam: { stats: 0, conf: "TestConf" } };
    const lookup = {};

    const queryWithFilters = (
      filters: CommonFilterType[],
      filterGarbage: boolean
    ) => {
      return _.assign(
        {
          team: "TestTeam",
          year: "2019/20",
          minRank: "10",
          maxRank: "100",
          baseQuery: "base",
          gender: "Men",
        },
        {
          filterGarbage: filterGarbage,
          queryFilters: QueryUtils.buildFilterStr(filters),
        }
      );
    };
    const womenQueryWithFilters = (
      filters: CommonFilterType[],
      filterGarbage: boolean
    ) => {
      return {
        ...queryWithFilters(filters, filterGarbage),
        gender: "Women",
      };
    };

    const test1 = commonTeamQuery(
      queryWithFilters(["Home", "Nov-Dec", "Conf", "Good-Off"], false),
      333,
      efficiencyInfo,
      lookup
    );

    const test2 = commonTeamQuery(
      queryWithFilters(["Away", "Jan-Apr"], true),
      333,
      efficiencyInfo,
      lookup
    );

    const test3 = commonTeamQuery(
      queryWithFilters(["Not-Home", "Last-30d", "Conf"], true),
      333,
      efficiencyInfo,
      lookup
    );

    const test4 = commonTeamQuery(
      womenQueryWithFilters(["Not-Home", "Last-30d", "Conf", "Good-Def"], true),
      333,
      {},
      {}
    ); //(ensure ignores the vs_rank clause)

    const test5CustomDate = QueryUtils.parseCustomDate("12.15-03.01", "2019")!;
    const test5 = commonTeamQuery(
      queryWithFilters(["Not-Home", test5CustomDate, "Conf"], true),
      333,
      efficiencyInfo,
      lookup
    );

    // Impossible query that just tests the time-based filters
    const test6 = commonTeamQuery(
      queryWithFilters(["1st-Half", "2nd-Half", "Stretch"], true),
      333,
      efficiencyInfo,
      lookup
    );

    // For testing:
    //console.log(JSON.stringify(test2, null, 3));

    // TEST1: Home / 2018 / Conf only / Good-Off

    expect(test1.bool.must_not).toEqual([]);
    expect(test1.bool.should).toEqual([]);
    expect(test1.bool.minimum_should_match).toEqual(0);
    expect(test1.bool.must.length).toEqual(6);
    expect(test1.bool?.must?.[2]).toEqual({
      query_string: {
        query: `in_conf:true`,
      },
    });
    expect(test1.bool?.must?.[3]).toEqual({
      term: {
        "location_type.keyword": "Home",
      },
    });
    expect(test1.bool?.must?.[4]).toEqual({
      range: {
        date: {
          lte: "2019-12-31",
        },
      },
    });
    expect(test1.bool?.must?.[5]).toEqual({
      query_string: {
        query: `vs_adj_off:>106.9`,
      },
    });

    // TEST2: Away / 2019 / Filter Garbage

    expect(test2.bool.must_not).toEqual([]);
    expect(test2.bool.should.length).toEqual(3);
    expect(test2.bool.minimum_should_match).toEqual(1);
    expect(test2.bool.must.length).toEqual(4);
    expect(test2.bool?.must?.[2]).toEqual({
      term: {
        "location_type.keyword": "Away",
      },
    });
    expect(test2.bool?.must?.[3]).toEqual({
      range: {
        date: {
          gt: "2019-12-31",
        },
      },
    });

    // TEST3: Not-Home, Last-30d / Conf / Filter Garbage

    expect(test3.bool.must_not).toEqual([]);
    expect(test3.bool.should.length).toEqual(3);
    expect(test3.bool.minimum_should_match).toEqual(1);
    expect(test3.bool.must.length).toEqual(5);
    expect(test3.bool?.must?.[2]).toEqual({
      query_string: {
        query: `in_conf:true`,
      },
    });
    expect(test3.bool?.must?.[3]).toEqual({
      query_string: {
        query: `location_type.keyword:(Away OR Neutral)`,
      },
    });
    expect(test3.bool?.must?.[4]).toEqual({
      range: {
        date: {
          gt: "333000||-30d/d",
        },
      },
    });

    // TEST4: Like test3 but no efficiency (+women's gender + adj def query)
    expect(test4.bool.should.length).toEqual(3);
    expect(test4.bool.minimum_should_match).toEqual(1);
    expect(test4.bool.must.length).toEqual(5); //(vs_rank disappeared)
    expect(test4.bool?.must?.[4]).toEqual({
      query_string: {
        query: `vs_adj_def:<85.93`,
      },
    });

    // TEST5: custom date
    expect(test5.bool.must_not).toEqual([]);
    expect(test5.bool.should.length).toEqual(3);
    expect(test5.bool.minimum_should_match).toEqual(1);
    expect(test5.bool.must.length).toEqual(5);
    expect(test5.bool?.must?.[4]).toEqual({
      query_string: {
        query: `date:[2019-12-15 TO 2020-03-01]`,
      },
    });

    // TEST6: 1st-Half, 2nd-Half, Stretch
    expect(test6.bool.must_not).toEqual([]);
    expect(test6.bool.should.length).toEqual(3);
    expect(test6.bool.minimum_should_match).toEqual(1);
    expect(test6.bool?.must.slice(2)).toEqual([
      {
        query_string: {
          query: `end_min:<=20`,
        },
      },
      {
        query_string: {
          query: `end_min:>20`,
        },
      },
      {
        query_string: {
          query: `end_min:>=32`,
        },
      },
    ]);
  });
});
