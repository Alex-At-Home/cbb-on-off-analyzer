import _ from "lodash";

import { commonRuntimeMappings } from "./commonRuntimeMappings";
import { commonTeamQuery } from "./commonTeamQuery";
import { commonOnOffBaseQuery } from "./commonOnOffBaseQuery";
import {
  commonLineupAggregations,
  commonAggregations,
} from "./commonLineupAggregations";
import { buildGameInfoRequest } from "./lineupStatsQueryTemplate";
import { GameFilterParams } from "../FilterModels";

export const teamStatsQuery = function (
  params: GameFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  avgEfficiency: number,
  hca: number,
) {
  // For checking conf/D1 results:
  // see also CommonApiUtils.handleRequest to switch to D1
  //params.team = "*";

  return {
    ...commonRuntimeMappings(params, lastDate, publicEfficiency, lookup),
    _source: {
      includes: [],
      excludes: [],
    },
    size: 0,
    aggregations: {
      global: {
        global: {},
        aggregations: {
          only: {
            filters: {
              filters: {
                team: {
                  term: {
                    "team.team.keyword": `${params.team}`,
                  },
                },
              },
            },
            aggregations: {
              ..._.pick(
                commonAggregations(
                  "team_stats",
                  "off",
                  publicEfficiency,
                  lookup,
                  avgEfficiency,
                  hca,
                ),
                [
                  // I foget what this is needed for (3P luck maybe?)
                  "total_off_3p_attempts",
                  // These are needed for play style analysis
                  "total_off_fga",
                  "total_off_fta",
                  "total_off_to",
                  "total_off_assist",
                  "total_off_scramble_to",
                  "total_off_trans_to",
                  "off_adj_opp",
                ],
              ),
              ..._.pick(
                commonAggregations(
                  "opponent_stats",
                  "def",
                  publicEfficiency,
                  lookup,
                  avgEfficiency,
                  hca,
                ),
                [
                  "def_3p",
                  "def_poss",
                  "total_def_poss",
                  "total_def_3p_attempts",
                  "total_def_3p_made",
                  "def_3p_opp",
                  "def_adj_opp",
                ],
              ),
            },
          },
        },
      },
      tri_filter: {
        aggregations: {
          ...(params.getGames
            ? buildGameInfoRequest(
                "final_scores",
                Boolean(params.getGamesExtraInfo),
              )
            : {}),
          ...commonLineupAggregations(
            publicEfficiency,
            lookup,
            avgEfficiency,
            hca,
          ),
        },
        filters: commonOnOffBaseQuery(params, lastDate),
      },
    },
    query: commonTeamQuery(params, lastDate, publicEfficiency, lookup),
  };
};
