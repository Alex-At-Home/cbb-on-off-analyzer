import { commonTeamQuery } from "./commonTeamQuery";
import { commonOnOffBaseQuery } from "./commonOnOffBaseQuery";
import { commonLineupAggregations } from "./commonLineupAggregations";
import { QueryUtils } from "../QueryUtils";
import { LineupFilterParams } from "../FilterModels";

export const lineupStatsQuery = function(
  params: LineupFilterParams,
  lastDate: number, publicEfficiency: any, lookup: any, avgEfficiency: number
) {
  return {
     "_source": {
        "includes": [],
        "excludes": []
     },
     "size": 0,
     "aggregations": {
        "lineups": {
           "aggregations": {
             ...commonLineupAggregations(publicEfficiency, lookup, avgEfficiency),
             "players_array": {
                "top_hits": {
                  "size": 1,
                  "_source": {
                    "includes": "players"
                  }
                }
             },
             "filter_by_poss": {
               "bucket_selector": {
                 "buckets_path": {
                   "poss": "off_poss"
                 },
                 "script": "params.poss > 100"
               }
             },
             "get_margin": {
               "bucket_script": {
                 "buckets_path": {
                   "off": "off_adj_ppp",
                   "def": "def_adj_ppp",
                 },
                 "script": "params.off - params.def"
               }
             },
             "sort_by_poss": {
                "bucket_sort": {
                  "sort": [
                     {"get_margin": {"order": "desc"}},
//                      {"off_adj_ppp": {"order": "desc"}},
//                    {"def_adj_ppp": {"order": "asc"}},
                  ]
                }
             }
           },
           "composite": {
             "size": 10000,
             "after": params.after,
             "sources": [
               { "lineup_id": { "terms": {
                 "field": "lineup_id.keyword"
               } } },
               { "team_id": { "terms": {
                 "field": "team.team.keyword",
               } } }
             ]
           }
        }
     },
     "query": {
       "bool": {
          "filter": [],
          "must_not": [],
          "should": [],
          "must": [
             commonTeamQuery(params, lastDate, publicEfficiency, lookup),
             {
               "query_string": {
                  "query": `${QueryUtils.basicOrAdvancedQuery(params.baseQuery, '*')}`
               }
             }
          ]
        }
      }
  };
}
