import { commonAggregations, timeAnalysis } from "./commonLineupAggregations";

import _ from "lodash";

export const commonPlayerAggregations = function (
  publicEfficiency: any,
  lookup: any,
  avgEff: number,
  hca: number
) {
  /** Build all the combos of assist networks */
  const buildAssistNetworks = () => {
    return _.fromPairs(
      ["3p", "mid", "rim"].flatMap((key) => {
        return ["target", "source"].map((loc) => {
          return [
            `off_ast_${key}_${loc}`,
            {
              scripted_metric: {
                init_script: "state.codes = [:]",
                map_script: `
                try {
                  def code_array = doc['player_stats.ast_${key}.${loc}.player_code.keyword'];
                  def count_array = doc['player_stats.ast_${key}.${loc}.count.total'];
                  for (def i = 0; i < code_array.length; ++i) {
                    def code = code_array[i];
                    def inc = count_array[i];
                    def curr_val = state.codes[code];
                    state.codes[code] = curr_val != null ? (curr_val + inc) : inc;
                  }
                } catch (Exception e) {}
              `,
                combine_script: "state.codes",
                reduce_script: `
                def toCombine = states.size();
                def end_state = toCombine > 0 ? states[0] : [:];
                for (def i = 1; i < toCombine; ++i) {
                  def state = states[i];
                  for (code in state.keySet()) {
                    def new_val = state[code];
                    def curr_val = end_state[code];
                    end_state[code] = curr_val != null ? (curr_val + new_val) : new_val;
                  }
                }
                return end_state;
              `,
              },
            },
          ];
        });
      })
    );
  };

  return {
    // Team based stats
    ..._.chain(
      commonAggregations(
        "team_stats",
        "off",
        publicEfficiency,
        lookup,
        avgEff,
        hca
      )
    )
      .pick([
        "total_off_poss",
        "total_off_to",
        "total_off_fgm",
        "total_off_fga",
        "total_off_3p_made",
        "total_off_ftm",
        "total_off_fta",
        "total_off_orb",
        "total_off_drb",
        "total_off_assist",
        "total_off_pts",
        // For DRtg:
        "total_off_stl",
        "total_off_blk",
        "total_off_foul",
      ])
      .mergeWith({
        //(nothing yet, see list above)
      })
      .mapKeys((value, key) => {
        return `team_${key}`;
      })
      .value(),
    ..._.chain(
      commonAggregations(
        "opponent_stats",
        "def",
        publicEfficiency,
        lookup,
        avgEff,
        hca
      )
    )
      .pick(
        [
          "total_def_poss",
          "total_def_2p_attempts",
          "total_def_drb",
          "total_def_orb",
          // For DRtg:
          "total_def_fgm",
          "total_def_fga",
          "total_def_ftm",
          "total_def_fta",
          "total_def_to",
          "total_def_pts",
          // For luck adjustment in DRtg:
          "def_3p_opp",
          "total_def_3p_attempts",
          "total_def_3p_made",
        ] //TODO: need to build my own def_3p :(
      )
      .mergeWith({
        //(nothing yet, see list above)
      })
      .mapKeys((value, key) => {
        return `oppo_${key}`;
      })
      .value(),
    // Player based stats
    // The bulk are offensive:
    ..._.chain(
      commonAggregations(
        "player_stats",
        "off",
        publicEfficiency,
        lookup,
        avgEff,
        hca
      )
    )
      .omit([
        "off_poss",
        "off_ppp",
        "off_to",
        "off_orb",
        "off_adj_ppp",
        "off_assist",
        //TODO: handle scramble and transition breakdowns better
        "total_off_trans_poss",
        "off_trans_ppp",
        "off_trans_to",
        "total_off_scramble_poss",
        "off_scramble_ppp",
        "off_scramble_to",
      ])
      .mergeWith({
        // Offensive fields

        off_poss: {
          // fgm + (approx-unrebounded) fgM + 0.475*fta + to
          sum: {
            script: `
              def team_fga = doc["team_stats.fg.attempts.total"].value;
              def team_fgm = doc["team_stats.fg.made.total"].value;
              def team_fgM = team_fga - team_fgm;
              def maybe_team_orb = doc["team_stats.orb.total"];
              def team_orb = (0 != maybe_team_orb.size()) ? maybe_team_orb.value : 0.0;
              team_orb = team_orb > team_fgM ? team_fgM : team_orb;
              def rebound_pct = team_fgM > 0 ? 1.0*team_orb/team_fgM : 0.0;

              def fga = doc["player_stats.fg.attempts.total"].value;
              def fgm = doc["player_stats.fg.made.total"].value;
              def fgM = fga - fgm;
              def fta = doc["player_stats.ft.attempts.total"].value;
              def to = doc["player_stats.to.total"].value;
              return fgm + (1.0 - rebound_pct)*fgM + 0.475*fta + to;
            `,
          },
        },
        off_team_poss: {
          //total_off_pos
          bucket_script: {
            buckets_path: {
              team_poss: "team_total_off_poss",
            },
            script: "params.team_poss",
          },
        },
        off_assist: {
          //assists ... player_assists / (team_fgm - fgm)
          bucket_script: {
            buckets_path: {
              ast: "total_off_assist",
              team_fgm: "team_total_off_fgm",
              fgm: "total_off_fgm",
            },
            script:
              "(params.team_fgm - params.fgm) > 0 ? 1.0*params.ast/(params.team_fgm - params.fgm) : 0.0",
          },
        },
        off_to: {
          // player_to/player_off_poss
          bucket_script: {
            buckets_path: {
              to: "total_off_to",
              poss: "off_poss",
            },
            script: "params.poss > 0 ? 1.0*params.to/params.poss : 0.0",
          },
        },
        off_orb: {
          // player_orb/(team_orb + oppo_drb)
          bucket_script: {
            buckets_path: {
              orb: "total_off_orb",
              team_orb: "team_total_off_orb",
              oppo_drb: "oppo_total_def_drb",
            },
            script:
              "params.team_orb > 0 || params.oppo_drb > 0 ? 1.0*params.orb/(params.team_orb + params.oppo_drb) : 0.0",
          },
        },
        off_usage: {
          //off_pos/(team_fga + team_to + 0.44*team_ft)
          bucket_script: {
            buckets_path: {
              off_poss: "off_poss",
              team_poss: "team_total_off_poss",
            },
            script:
              "params.team_poss > 0 ? params.off_poss/params.team_poss : 0.0",
          },
        },

        // Defensive fields

        def_team_poss: {
          //total_off_pos
          bucket_script: {
            buckets_path: {
              team_poss: "oppo_total_def_poss",
            },
            script: "params.team_poss",
          },
        },

        def_orb: {
          // player_drb/(team_drb + oppo_orb)
          bucket_script: {
            buckets_path: {
              drb: "total_off_drb",
              oppo_orb: "oppo_total_def_orb",
              team_drb: "team_total_off_drb",
            },
            script:
              "params.oppo_orb > 0 || params.team_drb > 0 ? 1.0*params.drb/(params.oppo_orb + params.team_drb) : 0.0",
          },
        },
        def_ftr: {
          //FC/70 (expressed as % hence 0.7 vs 70)
          bucket_script: {
            buckets_path: {
              fouls: "total_off_foul",
              poss: "oppo_total_def_poss",
            },
            script: "params.poss > 0 ? 0.7*params.fouls/params.poss : 0.0",
          },
        },
        def_to: {
          //steals ... player_stl / opponent_poss
          bucket_script: {
            buckets_path: {
              stl: "total_off_stl",
              poss: "oppo_total_def_poss",
            },
            script: "params.poss > 0 ? 1.0*params.stl/params.poss : 0.0",
          },
        },
        def_2prim: {
          //blocks ... player_blk / opponent_2p_attempts
          bucket_script: {
            buckets_path: {
              blk: "total_off_blk",
              fg2pa: "oppo_total_def_2p_attempts",
            },
            script: "params.fg2pa > 0 ? 1.0*params.blk/params.fg2pa : 0.0",
          },
        },

        // Assist network building
        ...buildAssistNetworks(),
      })
      .value(),
    // Plus a few defensive ones
    ..._.chain(
      commonAggregations(
        "player_stats",
        "def",
        publicEfficiency,
        lookup,
        avgEff,
        hca
      )
    )
      .pick(["def_adj_opp"])
      .value(),
    //(common time analysis)
    ...timeAnalysis(),
  };
};
