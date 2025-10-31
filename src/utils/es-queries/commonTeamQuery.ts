import { CommonFilterParams, ParamDefaults } from "../FilterModels";
import { QueryUtils } from "../QueryUtils";
import { efficiencyAverages } from "../public-data/efficiencyAverages";
import { format } from "date-fns";
import _ from "lodash";

const garbageTimeFilter = [
  {
    range: {
      start_min: {
        lt: 34.5, // (too early in the game)
      },
    },
  },
  {
    range: {
      end_min: {
        gt: 40.0, // (will never filter OT)
      },
    },
  },
  {
    script: {
      script: {
        // see https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/40#issuecomment-576919670
        source: `
        def diff = doc["score_info.start_diff"].value;
        def abs_diff = Math.abs(diff) - 0.5;
        def diff_to_sq = abs_diff >= 0.0 ? abs_diff : 0.0;
        def diff_sq = diff_to_sq*diff_to_sq;
        // (OT case filtered out)
        def remaining = (40.0 - doc["start_min"].value)*60.0;
        diff_sq <= remaining;
        `,
        lang: "painless",
      },
    },
  },
];

const homeOrAwayFilter = (homeOrAway: "Home" | "Away" | "Not-Home") => {
  return homeOrAway == "Not-Home"
    ? [
        {
          query_string: {
            query: `location_type.keyword:(Away OR Neutral)`,
          },
        },
      ]
    : [
        {
          term: {
            "location_type.keyword": `${homeOrAway}`,
          },
        },
      ];
};

const timeOnClock = (clock: "1st-Half" | "2nd-Half" | "Stretch") => {
  switch (clock) {
    case "1st-Half":
      return [
        {
          query_string: {
            query: `end_min:<=20`,
          },
        },
      ];
    case "2nd-Half":
      return [
        {
          query_string: {
            query: `end_min:>20`,
          },
        },
      ];
    case "Stretch":
      return [
        {
          query_string: {
            query: `end_min:>=32`,
          },
        },
      ];
  }
};

const goodOffOrDefense = (
  offOrDef: "Good-Off" | "Good-Def",
  avgEff: number,
  deltaEff: number
) => {
  return offOrDef == "Good-Off"
    ? [
        {
          query_string: {
            query: `vs_adj_off:>${avgEff + deltaEff}`,
          },
        },
      ]
    : [
        {
          query_string: {
            query: `vs_adj_def:<${avgEff - deltaEff}`,
          },
        },
      ];
};

const dateFilter = (
  date: "Nov-Dec" | "Jan-Apr" | "Last-30d",
  year: string,
  lastDate: number
) => {
  const operator = date == "Nov-Dec" ? "lte" : "gt";
  const dateStr =
    date == "Last-30d"
      ? `${lastDate * 1000}||-30d/d`
      : `${year.substring(0, 4)}-12-31`;

  return {
    range: {
      date: {
        [operator]: dateStr,
      },
    },
  };
};

/** Common util for here + commonOnOffBaseQuery to handle pre-built filters */
export const buildQueryFiltersBoolArray = (
  queryFiltersStr: string | undefined,
  genderStr: string | undefined,
  yearStr: string | undefined,
  lastDate: number
) => {
  const queryFilters = QueryUtils.parseFilter(
    queryFiltersStr || "",
    yearStr || ParamDefaults.defaultYear
  );
  const customDate = QueryUtils.extractCustomDate(queryFilters);
  const gameSelector = QueryUtils.buildGameSelectionModel(queryFilters);

  const genderYear = `${genderStr || ""}_${yearStr || ""}`;
  const avgEff = efficiencyAverages[genderYear] || efficiencyAverages.fallback!;
  const deltaEff = genderStr == "Women" ? 6 : 4.5;

  return _.flatten([
    QueryUtils.filterHas(queryFilters, "Conf")
      ? [
          {
            query_string: {
              query: `in_conf:true`,
            },
          },
        ]
      : [],
    _.flatMap(
      ["Home", "Away", "Not-Home"],
      (homeOrAway: "Home" | "Away" | "Not-Home") => {
        return QueryUtils.filterHas(queryFilters, homeOrAway)
          ? homeOrAwayFilter(homeOrAway)
          : [];
      }
    ),
    _.flatMap(
      ["Nov-Dec", "Jan-Apr", "Last-30d"],
      (date: "Nov-Dec" | "Jan-Apr" | "Last-30d") => {
        return QueryUtils.filterHas(queryFilters, date)
          ? [dateFilter(date, yearStr || "2000", lastDate)]
          : [];
      }
    ),
    _.flatMap(["Good-Off", "Good-Def"], (offOrDef: "Good-Off" | "Good-Def") => {
      return QueryUtils.filterHas(queryFilters, offOrDef)
        ? goodOffOrDefense(offOrDef, avgEff, deltaEff)
        : [];
    }),
    _.flatMap(
      ["1st-Half", "2nd-Half", "Stretch"],
      (clock: "1st-Half" | "2nd-Half" | "Stretch") => {
        return QueryUtils.filterHas(queryFilters, clock)
          ? timeOnClock(clock)
          : [];
      }
    ),
    QueryUtils.filterHas(queryFilters, "Vs-Good")
      ? [
          {
            query_string: {
              query: `vs_rank:<=80`,
            },
          },
        ]
      : [],
    customDate
      ? [
          {
            query_string: {
              query: `date:[${format(
                customDate.start,
                "yyyy-MM-dd"
              )} TO ${format(customDate.end, "yyyy-MM-dd")}]`,
            },
          },
        ]
      : [],
    gameSelector && !_.isEmpty(gameSelector)
      ? [
          {
            query_string: {
              //(no "opponentMode" if we're using queryFilters)
              query: `${gameSelector
                .map(
                  (g) =>
                    `(date:(${g.date}) AND opponent.team.keyword:"${g.opponent}")`
                )
                .join(" OR ")}`,
            },
          },
        ]
      : [],
  ] as any[]);
};

export const commonTeamQuery = function (
  params: CommonFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  opponentMode: boolean = false
) {
  return {
    bool: {
      filter: [],
      must_not: [],
      should: params.filterGarbage ? garbageTimeFilter : [], //(has OR components so should not must)
      minimum_should_match: params.filterGarbage ? 1 : 0,
      must: _.flatten([
        params.team == "*"
          ? []
          : [
              {
                term: {
                  [opponentMode
                    ? "opponent.team.keyword"
                    : "team.team.keyword"]: `${params.team}`,
                },
              },
            ],
        _.isEmpty(publicEfficiency)
          ? []
          : [
              {
                query_string: {
                  query: `vs_rank:[${Number(params.minRank || 0)} TO ${Number(
                    params.maxRank || 400
                  )}]`,
                },
              },
            ],
        buildQueryFiltersBoolArray(
          params.queryFilters,
          params.gender,
          params.year,
          lastDate
        ),
      ] as Array<Record<string, any>>),
    },
  };
};
