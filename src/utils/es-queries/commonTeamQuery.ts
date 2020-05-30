
import { CommonFilterParams } from "../FilterModels";
import { CommonFilterType, QueryUtils } from "../QueryUtils";
import _ from 'lodash';

const garbageTimeFilter = [
  {
    "range": {
      "start_min": {
        "lt": 34.5 // (too early in the game)
      }
    }
  },
  {
    "range": {
      "end_min": {
        "gt": 40.0 // (will never filter OT)
      }
    }
  },
  {
    "script": {
      "script": { // see https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/40#issuecomment-576919670
        "source": `
        def diff = doc["score_info.start_diff"].value;
        def abs_diff = Math.abs(diff) - 0.5;
        def diff_to_sq = abs_diff >= 0.0 ? abs_diff : 0.0;
        def diff_sq = diff_to_sq*diff_to_sq;
        // (OT case filtered out)
        def remaining = (40.0 - doc["start_min"].value)*60.0;
        diff_sq <= remaining;
        `,
        "lang": "painless"
      }
    }
  }
];

const homeOrAwayFilter = (homeOrAway: "Home" | "Away") => {
  return { "term": {
    "location_type.keyword": `${homeOrAway}`
  }};
};

const dateFilter = (date: "Nov-Dec" | "Jan-Apr" | "Last-30d", year: string, lastDate: number) => {
  const operator = (date == "Nov-Dec") ? "lte" : "gt";
  const dateStr = (date == "Last-30d") ?
    `${lastDate*1000}||-30d/d` :
    `${year.substring(0, 4)}-12-31`;

  return { "range": {
    "date": {
      [operator]: dateStr
    }
  }};
};

export const commonTeamQuery = function(
  params: CommonFilterParams,
  lastDate: number, publicEfficiency: any, lookup: any
) {
  const queryFilters = QueryUtils.parseFilter(params.queryFilters || "");
  return {
     "bool": {
        "filter": [],
        "must_not": QueryUtils.filterHas(queryFilters, "Not-Home") ? [ homeOrAwayFilter("Home") ] : [],
        "should": params.filterGarbage ? garbageTimeFilter : [], //(has OR components so should not must)
        "minimum_should_match": params.filterGarbage ? 1 : 0,
        "must": _.flatten([
          /*
          [{
            "term": {
              "team.team.keyword": `${params.team}`
            }
          }],*/
          //TODO: don't need to run this unless min/max range is specified or conf/non-conf/high-major is requested
          [{
            "script": {
               "script": {
                 "source": `
                  if (params.kp.isEmpty()) return true;
                  def kp_name = params.pbp_to_kp[doc["opponent.team.keyword"].value];
                  if (kp_name == null) {
                     kp_name = doc["opponent.team.keyword"].value;
                  } else {
                     kp_name = kp_name.pbp_kp_team;
                  }
                  def oppo = params.kp[kp_name];
                  if (oppo != null) {
                     def kp_rank = oppo["stats.adj_margin.rank"];
                     def game_filter = params.game_filter;
                     def oppo_conf = oppo["conf"];
                     def conf_allowed = true;
                     if (!game_filter.conf.isEmpty()) {
                        conf_allowed = game_filter.conf.equals(oppo_conf);
                     }
                     return conf_allowed && (kp_rank >= game_filter.min_kp) && (kp_rank <= game_filter.max_kp);
                  } else {
                      return false;
                  }
                 `,
                  "lang": "painless",
                  "params": {
                     "pbp_to_kp": lookup,
                     "kp": publicEfficiency, //(if empty then the query auto-returns true)
                     "game_filter": {
                        "min_kp": Number(params.minRank),
                        "max_kp": Number(params.maxRank),
                        "conf": QueryUtils.filterHas(queryFilters, "Conf") ?
                            QueryUtils.getConference(params.team || "", publicEfficiency, lookup) :
                            ""
                     }
                  }
               }
            }
          }],
          _.flatMap([ "Home", "Away" ], (homeOrAway: "Home" | "Away") => {
            return QueryUtils.filterHas(queryFilters, homeOrAway) ? [ homeOrAwayFilter(homeOrAway) ] : [];
          }),
          _.flatMap([ "Nov-Dec", "Jan-Apr", "Last-30d"], (date: "Nov-Dec" | "Jan-Apr" | "Last-30d") => {
            return QueryUtils.filterHas(queryFilters, date) ? [ dateFilter(date, params.year || "2000", lastDate) ] : [];
          })
        ] as Array<Record<string, any>>)
     }
  };
}
