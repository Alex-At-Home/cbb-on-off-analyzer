import _ from "lodash";

import { commonRuntimeMappings } from "./commonRuntimeMappings";
import { commonTeamQuery } from "./commonTeamQuery";
import { commonOnOffBaseQuery } from "./commonOnOffBaseQuery";
import { commonPlayerAggregations } from "./commonPlayerAggregations";
import { GameFilterParams } from "../FilterModels";

/** Set this here and in teamDefenseStatsQueryTemplate+MatchupPreviewAnalyzer to check we get approx the
 * same number when looking at season averages and average across all games
 */
const seasonVsGameAverageDebugMode = false;

export const teamDefensePlayerStatsQuery = function (
  params: GameFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  avgEfficiency: number,
  hca: number
) {
  return {
    ...commonRuntimeMappings(
      params,
      lastDate,
      publicEfficiency,
      lookup,
      !seasonVsGameAverageDebugMode
    ),
    _source: {
      includes: [],
      excludes: [],
    },
    size: 0,
    aggregations: {
      tri_filter: {
        filters: commonOnOffBaseQuery(
          params,
          lastDate,
          !seasonVsGameAverageDebugMode
        ),
        aggregations: {
          opponents: {
            terms: {
              size: 100,
              field: seasonVsGameAverageDebugMode
                ? "opponent.team.keyword"
                : "team.team.keyword",
            },
            aggregations: {
              player: {
                terms: {
                  field: "player.id.keyword",
                  size: 1000,
                },
                aggregations: {
                  ..._.pickBy(
                    commonPlayerAggregations(
                      publicEfficiency,
                      lookup,
                      avgEfficiency,
                      hca
                    ),
                    (val, key) =>
                      _.startsWith(key, "off_3p") ||
                      _.startsWith(key, "off_2prim") ||
                      _.startsWith(key, "off_2pmid") ||
                      _.startsWith(key, "total_off_") ||
                      _.startsWith(key, "off_ast_")
                  ),
                  player_array: {
                    top_hits: {
                      size: 1,
                      _source: {
                        includes: "player",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    query: commonTeamQuery(
      params,
      lastDate,
      publicEfficiency,
      lookup,
      !seasonVsGameAverageDebugMode
    ), //(opponent mode)
  };
};
