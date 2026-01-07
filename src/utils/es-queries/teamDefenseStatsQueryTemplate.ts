import _ from "lodash";

import { commonRuntimeMappings } from "./commonRuntimeMappings";
import { commonTeamQuery } from "./commonTeamQuery";
import { commonOnOffBaseQuery } from "./commonOnOffBaseQuery";
import {
  commonLineupAggregations,
  commonAggregations,
} from "./commonLineupAggregations";
import { GameFilterParams } from "../FilterModels";

/** Set this here and in teamDefenseStatsQueryTemplate+MatchupPreviewAnalyzer to check we get approx the
 * same number when looking at season averages and average across all games
 */
const seasonVsGameAverageDebugMode = false;

export const teamDefenseStatsQuery = function (
  params: GameFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  avgEfficiency: number,
  hca: number
) {
  // For checking conf results:
  //params.team = "*";

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
              ..._.pick(
                commonAggregations(
                  "team_stats",
                  "off",
                  publicEfficiency,
                  lookup,
                  avgEfficiency,
                  hca
                ),
                [
                  // These are needed for play style analysis
                  "off_poss",
                  "total_off_poss",
                  "total_off_fga",
                  "total_off_fta",
                  "total_off_to",
                  "total_off_orb",
                  "total_off_assist",
                  "total_off_scramble_to",
                  "total_off_trans_to",
                ]
              ),
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
    ), //(look for opponent instead of team)
  };
};
