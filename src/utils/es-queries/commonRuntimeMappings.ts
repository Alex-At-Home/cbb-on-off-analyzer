import _ from "lodash";

import { CommonFilterParams } from "../FilterModels";
import { QueryUtils } from "../QueryUtils";

export const commonRuntimeMappings = function (
  params: CommonFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  opponentMode: boolean = false
) {
  return {
    runtime_mappings: {
      vs_high_major: {
        type: "boolean",
        script: {
          source: `if (0 != doc['common_lookup'].size()) emit((doc['common_lookup'].value & 1) > 0)`,
        },
      },
      in_conf: {
        type: "boolean",
        script: {
          source: `if (0 != doc['common_lookup'].size()) emit((doc['common_lookup'].value & 2) > 0)`,
        },
      },
      vs_rank: {
        type: "long",
        script: {
          source: `if (0 != doc['common_lookup'].size()) emit((doc['common_lookup'].value >> 2) & 511)`,
        },
      },
      vs_3p: {
        type: "double",
        script: {
          //(don't have 3P% for women so add an extra guard here)
          source: `if (0 != doc['common_lookup'].size()) {
            def _3p = (doc['common_lookup'].value >> 11)  & 1023;
            if (_3p > 0) emit(0.1*_3p);
          }`,
        },
      },
      vs_adj_off: {
        type: "double",
        script: {
          source: `if (0 != doc['common_lookup'].size()) emit(0.1*((doc['common_lookup'].value >> 21) & 2047))`,
        },
      },
      vs_adj_def: {
        type: "double",
        script: {
          source: `if (0 != doc['common_lookup'].size()) emit(0.1*((doc['common_lookup'].value >> 32) & 2047))`,
        },
      },
      common_lookup: {
        type: "long",
        script: {
          source: `
            if (!params.kp_info.isEmpty()) {
              def raw_name = doc[params.field_name].value;
              def kp_name = params.pbp_to_kp[raw_name];
              if (kp_name == null) {
                 kp_name = raw_name;
              } else {
                 kp_name = kp_name.pbp_kp_team;
              }
              def oppo = params.kp_info[kp_name];
              if (oppo != null) {
                def vs_high_major = oppo["is_high_major"] ?: 1;
                if (vs_high_major instanceof String) {
                  vs_high_major = 0;
                }
                def oppo_conf = oppo["conf"];
                def team_conf = params.conf;
                if (team_conf == "*") {      
                  def raw_team_name = doc["team.team.keyword"].value; 
                  def team_kp_name = params.pbp_to_kp[raw_team_name];
                  if (team_kp_name == null) {
                    team_kp_name = raw_team_name;
                  } else {
                    team_kp_name = team_kp_name.pbp_kp_team;
                  }
                  def team_kp = params.kp_info[team_kp_name];
                  if (team_kp != null) {
                    team_conf = team_kp["conf"];
                  }
                }
                def in_conf = team_conf.equals(oppo_conf);
                def hca = 0;
                if (doc["location_type.keyword"].size() > 0) {
                  if (doc["location_type.keyword"].value == "Neutral") {
                    hca = 25;
                  } else if (doc["location_type.keyword"].value == "Away") {
                    hca = 50;
                  }
                }
                def margin_rank = Math.max(1, (oppo["stats.adj_margin.rank"] ?: 0) - hca);

                def _3p = oppo["stats.off._3p_pct.value"] ?: 0.0;
                _3p = (_3p * 10).longValue() & 1023;

                def adj_off = oppo["stats.adj_off.value"] ?: 0;
                adj_off = (adj_off * 10).longValue() & 2047;

                def adj_def = oppo["stats.adj_def.value"] ?: 0;
                adj_def = (adj_def * 10).longValue() & 2047;

                long returnVal = 0L | (vs_high_major << 0)
                  | ((in_conf ? 1 : 0) << 1)
                  | ((margin_rank.longValue() & 511) << 2)
                  | (_3p.longValue() << 11)
                  | (adj_off.longValue() << 21)
                  | (adj_def.longValue() << 32)
                  ;
                emit(returnVal);
              }
            }
          `,
          lang: "painless",
          params: {
            pbp_to_kp: lookup,
            field_name: opponentMode
              ? "team.team.keyword"
              : "opponent.team.keyword",
            kp_info: publicEfficiency, //(if empty then the query auto-returns true)
            conf:
              params.team == "*"
                ? "*"
                : QueryUtils.getConference(
                    params.team || "",
                    publicEfficiency,
                    lookup
                  ) || "",
          },
        },
      },
    },
  };
};
