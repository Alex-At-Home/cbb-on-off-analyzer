import _ from "lodash";
import { commonRuntimeMappings } from "./commonRuntimeMappings";
import { commonTeamQuery, buildQueryFiltersBoolArray } from "./commonTeamQuery";
import { commonLineupAggregations } from "./commonLineupAggregations";
import { buildOtherQueryFilters } from "./commonOnOffBaseQuery";
import { QueryUtils } from "../QueryUtils";
import { LineupFilterParams } from "../FilterModels";

/** Builds a list of opponents - there's some chance they could spill across 2 buckets
   though the -10 TZ should mostly avoid. You could try to coalesce them, though there's a small
   chance you could combine same opponent on consecutive days (have a low bound for poss for doing?)
*/
export const buildGameInfoRequest = function (
  infoType: "game_aggs" | "final_scores",
  extraStats: boolean = false,
) {
  /** For lineups, some stats to display */
  const getGameInfo = () => {
    return {
      aggs: {
        num_off_poss: {
          sum: { field: "team_stats.num_possessions" },
        },
        num_def_poss: {
          sum: { field: "opponent_stats.num_possessions" },
        },
        num_pts_for: {
          sum: { field: "team_stats.pts" },
        },
        num_pts_against: {
          sum: { field: "opponent_stats.pts" },
        },
      },
    };
  };
  /** For games, get the final score and some useful aggregations */
  const getFinalScore = () => {
    return {
      aggs: {
        off_poss: {
          sum: { field: "team_stats.num_possessions" },
        },
        def_poss: {
          sum: { field: "opponent_stats.num_possessions" },
        },
        ...(extraStats
          ? {
              off_2pmid_attempts: {
                sum: { field: "team_stats.fg_mid.attempts.total" },
              },
              off_2prim_attempts: {
                sum: { field: "team_stats.fg_rim.attempts.total" },
              },
              off_3p_attempts: {
                sum: { field: "team_stats.fg_3p.attempts.total" },
              },
              off_2pmid_made: {
                sum: { field: "team_stats.fg_mid.made.total" },
              },
              off_2prim_made: {
                sum: { field: "team_stats.fg_rim.made.total" },
              },
              off_3p_made: {
                sum: { field: "team_stats.fg_3p.made.total" },
              },
              off_ft_attempt: {
                sum: { field: "team_stats.ft.attempts.total" },
              },
              off_to: {
                sum: { field: "team_stats.to.total" },
              },
              def_2pmid_attempts: {
                sum: { field: "opponent_stats.fg_mid.attempts.total" },
              },
              def_2prim_attempts: {
                sum: { field: "opponent_stats.fg_rim.attempts.total" },
              },
              def_3p_attempts: {
                sum: { field: "opponent_stats.fg_3p.attempts.total" },
              },
              def_2pmid_made: {
                sum: { field: "opponent_stats.fg_mid.made.total" },
              },
              def_2prim_made: {
                sum: { field: "opponent_stats.fg_rim.made.total" },
              },
              def_3p_made: {
                sum: { field: "opponent_stats.fg_3p.made.total" },
              },
              def_ft_attempt: {
                sum: { field: "opponent_stats.ft.attempts.total" },
              },
              def_to: {
                sum: { field: "opponent_stats.to.total" },
              },
              off_orb: {
                sum: { field: "team_stats.orb.total" },
              },
              def_orb: {
                sum: { field: "opponent_stats.orb.total" },
              },
            }
          : {}),
        avg_lead: {
          sum: {
            script: `
              def retVal = 0;
              if (doc["score_info.end_diff"].size() > 0) {
                retVal = 0.5*(doc["score_info.end_diff"].value + doc["score_info.start_diff"].value)
              }
              def offPoss = (doc["team_stats.num_possessions"].size() > 0) ? doc["team_stats.num_possessions"].value : 0;
              def defPoss = (doc["opponent_stats.num_possessions"].size() > 0) ? doc["opponent_stats.num_possessions"].value : 0;
              retVal*0.5*(offPoss + defPoss)
            `,
          },
        },
        end_of_game: {
          top_hits: {
            sort: [
              {
                end_min: { order: "desc" },
              },
            ],
            size: 1,
            _source: {
              includes: [
                "opponent.team",
                "score_info.end",
                "location_type",
                "date",
                "end_min",
              ],
            },
          },
        },
      },
    };
  };

  return {
    game_info: {
      terms: {
        size: 100,
        script:
          "doc['location_type.keyword'][0].charAt(0) + ':' + doc['opponent.team.keyword'][0]",
      },
      aggs: {
        game_info: {
          date_histogram: {
            field: "date",
            fixed_interval: "12h",
            time_zone: "-10:00",
          },
          ...(infoType == "game_aggs" ? getGameInfo() : getFinalScore()),
        },
      },
    },
  };
};

export const lineupStatsQuery = function (
  params: LineupFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  avgEfficiency: number,
  hca: number,
) {
  const lineupAggs = {
    ...(params.showGameInfo ? buildGameInfoRequest("game_aggs") : {}),
    ...commonLineupAggregations(
      publicEfficiency,
      lookup,
      avgEfficiency,
      hca,
      true,
    ),
    players_array: {
      top_hits: {
        size: 1,
        _source: {
          includes: "players",
        },
      },
    },
    sort_by_poss: {
      bucket_sort: {
        sort: [{ off_poss: { order: "desc" } }],
      },
    },
  };

  const otherQueryFilters = buildOtherQueryFilters(
    undefined,
    params,
    params.otherQueries,
    lastDate,
    false,
  );
  const otherQueryAggs = _.isEmpty(params.otherQueries || [])
    ? {}
    : {
        other_queries: {
          filters: {
            filters: otherQueryFilters,
          },
          aggregations: {
            lineups: {
              terms: {
                field: "lineup_id.keyword",
                size: 1000,
              },
              aggregations: lineupAggs,
            },
          },
        },
      };

  return {
    ...commonRuntimeMappings(params, lastDate, publicEfficiency, lookup),
    _source: {
      includes: [],
      excludes: [],
    },
    size: 0,
    aggregations: {
      lineups: {
        aggregations: lineupAggs,
        terms: {
          field: "lineup_id.keyword",
          size: 1000,
        },
      },
      ...otherQueryAggs,
    },
    query: {
      bool: {
        filter: [],
        minimum_should_match: QueryUtils.invertedQueryMode(params) ? 1 : 0,
        //(special internal invert mode for getting linueps for on/off)
        should: QueryUtils.invertedQueryMode(params)
          ? buildQueryFiltersBoolArray(
              params.invertBaseQueryFilters,
              params.gender,
              params.year,
              lastDate,
            )
              .map((clause) => {
                return {
                  bool: {
                    must_not: [clause],
                  },
                };
              })
              .concat([
                {
                  query_string: {
                    query: `NOT (${QueryUtils.basicOrAdvancedQuery(
                      params.invertBase,
                      "NOT *",
                    )})`,
                  },
                },
              ] as any[])
          : [],
        must_not: [],
        must: [
          commonTeamQuery(params, lastDate, publicEfficiency, lookup),
          {
            query_string: {
              query: `${QueryUtils.basicOrAdvancedQuery(
                params.baseQuery,
                "*",
              )}`,
            },
          },
        ],
      },
    },
  };
};
