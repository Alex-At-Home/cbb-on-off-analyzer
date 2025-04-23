import _ from "lodash";

import { commonRuntimeMappings } from "./commonRuntimeMappings";
import { commonTeamQuery } from "./commonTeamQuery";
import { commonOnOffBaseQuery } from "./commonOnOffBaseQuery";
import { GameFilterParams } from "../FilterModels";

export const playerShotStatsQuery = function (
  params: GameFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  avgEfficiency: number,
  hca: number
) {
  // For checking conf results:
  //params.team = "*";

  const adjustedParams = {
    ...params,
    baseQuery: params.baseQuery
      ? _.replace(params.baseQuery, /(start|end)_min/, "min")
      : `(${params.baseQuery || "*"}) AND is_off:true`, //(offense only for now at least)
    onQuery: params.onQuery
      ? _.replace(params.onQuery, /(start|end)_min/, "min")
      : params.onQuery,
    offQuery: params.offQuery
      ? _.replace(params.offQuery, /(start|end)_min/, "min")
      : params.offQuery,
    filterGarbage: false, //TODO: can actually implement this, just need to swap _min with "min"
  };

  return {
    ...commonRuntimeMappings(
      adjustedParams,
      lastDate,
      publicEfficiency,
      lookup
    ),
    _source: {
      includes: [],
      excludes: [],
    },
    size: 0,
    aggregations: {
      tri_filter: {
        filters: commonOnOffBaseQuery(adjustedParams, lastDate),
        aggregations: {
          player: {
            terms: {
              field: "player.id.keyword",
              size: 100,
            },
            aggregations: {
              shot_chart: {
                geohex_grid: {
                  field: "geo",
                  precision: 14,
                },
                aggs: {
                  center: {
                    cartesian_centroid: { field: "loc" },
                  },
                  avg_dist: {
                    avg: { field: "dist" },
                  },
                  total_pts: {
                    sum: { field: "pts" },
                  },
                  total_pts_ast: {
                    sum: {
                      script:
                        "(doc['is_ast'].size() > 0 && doc['is_ast'].value) ? doc['pts'].value : 0",
                    },
                  },
                  total_pts_trans: {
                    sum: {
                      script:
                        "(doc['is_trans'].size() > 0 && doc['is_trans'].value) ? doc['pts'].value : 0",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    query: commonTeamQuery(adjustedParams, lastDate, publicEfficiency, lookup),
  };
};
