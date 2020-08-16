export const samplePlayerQueryRequest =           {
         "_source": {
            "includes": [],
            "excludes": []
         },
         "size": 0,
         "aggregations": {
            "tri_filter": {
               "filters": {
                  "filters": {
                     "off": {
                        "query_string": {
                           "query": "(players.id:(off)) AND (players.id:(base))"
                        }
                     },
                     "on": {
                        "query_string": {
                           "query": "(players.id:(on)) AND (players.id:(base))"
                        }
                     },
                     "baseline": {
                        "query_string": {
                           "query": "players.id:(base)"
                        }
                     }
                  }
               },
               "aggregations": {
                  "player": {
                     "terms": {
                        "field": "player.id.keyword",
                        "size": 100
                     },
                     "aggregations": {
                        "team_total_off_poss": {
                           "sum": {
                              "field": "team_stats.num_possessions"
                           }
                        },
                        "team_total_off_to": {
                           "sum": {
                              "field": "team_stats.to.total"
                           }
                        },
                        "team_total_off_fgm": {
                           "sum": {
                              "field": "team_stats.fg.made.total"
                           }
                        },
                        "team_total_off_foul": {
                          "sum": {
                            "field": "team_stats.foul.total",
                          },
                        },
                        "team_total_off_fga": {
                           "sum": {
                              "field": "team_stats.fg.attempts.total"
                           }
                        },
                        "team_total_off_3p_made": {
                           "sum": {
                              "field": "team_stats.fg_3p.made.total"
                           }
                        },
                        "team_total_off_ftm": {
                           "sum": {
                              "field": "team_stats.ft.made.total"
                           }
                        },
                        "team_total_off_fta": {
                           "sum": {
                              "field": "team_stats.ft.attempts.total"
                           }
                        },
                        "team_total_off_orb": {
                           "sum": {
                              "field": "team_stats.orb.total"
                           }
                        },
                        "team_total_off_drb": {
                           "sum": {
                              "field": "team_stats.drb.total"
                           }
                        },
                        "team_total_off_assist": {
                           "sum": {
                              "field": "team_stats.assist.total"
                           }
                        },
                        "team_total_off_blk": {
                          "sum": {
                            "field": "team_stats.blk.total",
                           },
                         },
                        "team_total_off_pts": {
                           "sum": {
                              "field": "team_stats.pts"
                           }
                        },
                       "team_total_off_stl": {
                         "sum": {
                           "field": "team_stats.stl.total",
                          },
                        },
                        "oppo_total_def_poss": {
                           "sum": {
                              "field": "opponent_stats.num_possessions"
                           }
                        },
                        "oppo_total_def_2p_attempts": {
                           "sum": {
                              "field": "opponent_stats.fg_2p.attempts.total"
                           }
                        },
                        "oppo_total_def_3p_attempts": {
                           "sum": {
                              "field": "opponent_stats.fg_3p.attempts.total"
                           }
                        },
                        "oppo_total_def_3p_made": {
                           "sum": {
                              "field": "opponent_stats.fg_3p.made.total"
                           }
                        },
                        "oppo_total_def_drb": {
                           "sum": {
                              "field": "opponent_stats.drb.total"
                           }
                        },
                       "oppo_total_def_fga": {
                         "sum": {
                           "field": "opponent_stats.fg.attempts.total",
                         },
                       },
                       "oppo_total_def_fgm": {
                         "sum": {
                           "field": "opponent_stats.fg.made.total",
                         },
                       },
                       "oppo_total_def_fta": {
                         "sum": {
                           "field": "opponent_stats.ft.attempts.total",
                         },
                       },
                       "oppo_total_def_ftm": {
                         "sum": {
                           "field": "opponent_stats.ft.made.total",
                         },
                       },
                        "oppo_total_def_orb": {
                           "sum": {
                              "field": "opponent_stats.orb.total"
                           }
                        },
                        "total_off_poss": {
                           "sum": {
                              "field": "player_stats.num_possessions"
                           }
                        },
                       "oppo_total_def_pts": {
                         "sum": {
                           "field": "opponent_stats.pts",
                         },
                       },
                       "oppo_total_def_to": {
                         "sum": {
                           "field": "opponent_stats.to.total",
                         },
                       },
                       "total_off_pts": {
                           "sum": {
                              "field": "player_stats.pts"
                           }
                        },
                        "total_off_to": {
                           "sum": {
                              "field": "player_stats.to.total"
                           }
                        },
                        "total_off_stl": {
                           "sum": {
                              "field": "player_stats.stl.total"
                           }
                        },
                        "total_off_blk": {
                           "sum": {
                              "field": "player_stats.blk.total"
                           }
                        },
                        "total_off_assist": {
                           "sum": {
                              "field": "player_stats.assist.total"
                           }
                        },
                        "total_off_foul": {
                           "sum": {
                              "field": "player_stats.foul.total"
                           }
                        },
                        "total_off_2p_attempts": {
                           "sum": {
                              "field": "player_stats.fg_2p.attempts.total"
                           }
                        },
                        "total_off_2p_made": {
                           "sum": {
                              "field": "player_stats.fg_2p.made.total"
                           }
                        },
                        "total_off_3p_attempts": {
                           "sum": {
                              "field": "player_stats.fg_3p.attempts.total"
                           }
                        },
                        "total_off_3p_made": {
                           "sum": {
                              "field": "player_stats.fg_3p.made.total"
                           }
                        },
                        "total_off_2prim_attempts": {
                           "sum": {
                              "field": "player_stats.fg_rim.attempts.total"
                           }
                        },
                        "total_off_2prim_made": {
                           "sum": {
                              "field": "player_stats.fg_rim.made.total"
                           }
                        },
                        "total_off_2pmid_attempts": {
                           "sum": {
                              "field": "player_stats.fg_mid.attempts.total"
                           }
                        },
                        "total_off_2pmid_made": {
                           "sum": {
                              "field": "player_stats.fg_mid.made.total"
                           }
                        },
                        "total_off_fga": {
                           "sum": {
                              "field": "player_stats.fg.attempts.total"
                           }
                        },
                        "total_off_fgm": {
                           "sum": {
                              "field": "player_stats.fg.made.total"
                           }
                        },
                        "total_off_fta": {
                           "sum": {
                              "field": "player_stats.ft.attempts.total"
                           }
                        },
                        "total_off_ftm": {
                           "sum": {
                              "field": "player_stats.ft.made.total"
                           }
                        },
                        "total_off_orb": {
                           "sum": {
                              "field": "player_stats.orb.total"
                           }
                        },
                        "total_off_drb": {
                           "sum": {
                              "field": "player_stats.drb.total"
                           }
                        },
                        // Assists
                        "total_off_ast_3p": {
                          "sum": {
                             "field": "player_stats.ast_3p.counts.total"
                          }
                        },
                        "total_off_ast_mid": {
                          "sum": {
                             "field": "player_stats.ast_mid.counts.total"
                          }
                        },
                        "total_off_ast_rim": {
                          "sum": {
                             "field": "player_stats.ast_rim.counts.total"
                          }
                        },
                        "total_off_2p_ast": {
                          "sum": {
                             "field": "player_stats.fg_2p.ast.total"
                          }
                        },
                        "total_off_3p_ast": {
                          "sum": {
                             "field": "player_stats.fg_3p.ast.total"
                          }
                        },
                        "total_off_2pmid_ast": {
                          "sum": {
                             "field": "player_stats.fg_mid.ast.total"
                          }
                        },
                        "total_off_2prim_ast": {
                          "sum": {
                             "field": "player_stats.fg_rim.ast.total"
                          }
                        },
                        "off_ast_3p": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_ast_3p",
                                "my_var2": "total_off_assist"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_ast_mid": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_ast_mid",
                                "my_var2": "total_off_assist"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_ast_rim": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_ast_rim",
                                "my_var2": "total_off_assist"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_3p_ast": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_3p_ast",
                                "my_var2": "total_off_3p_made"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_2p_ast": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_2p_ast",
                                "my_var2": "total_off_2p_made"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_2pmid_ast": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_2pmid_ast",
                                "my_var2": "total_off_2pmid_made"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_2prim_ast": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_2prim_ast",
                                "my_var2": "total_off_2prim_made"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        //(end assists)
                        "off_2p": {
                           "bucket_script": {
                              "buckets_path": {
                                "my_var1": "total_off_2p_made",
                                "my_var2": "total_off_2p_attempts"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_3p": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_3p_attempts",
                                 "my_var1": "total_off_3p_made"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_2prim": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_2prim_attempts",
                                 "my_var1": "total_off_2prim_made"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_2pmid": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_2pmid_attempts",
                                 "my_var1": "total_off_2pmid_made"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_ft": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_fta",
                                 "my_var1": "total_off_ftm"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_ftr": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_fga",
                                 "my_var1": "total_off_fta"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_2primr": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_fga",
                                 "my_var1": "total_off_2prim_attempts"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_2pmidr": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_fga",
                                 "my_var1": "total_off_2pmid_attempts"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_3pr": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_var2": "total_off_fga",
                                 "my_var1": "total_off_3p_attempts"
                              },
                              "script": "(params.my_var1 > 0) ? 1*params.my_var1 / params.my_var2 : 0"
                           }
                        },
                        "off_efg": {
                           "bucket_script": {
                              "buckets_path": {
                                 "my_varFG": "total_off_fga",
                                 "my_var2": "total_off_2p_made",
                                 "my_var3": "total_off_3p_made"
                              },
                              "script": "(params.my_varFG > 0) ? (1.0*params.my_var2 + 1.5*params.my_var3) / params.my_varFG : 0"
                           }
                        },
                        "oppo_def_3p_opp": {
                           "weighted_avg": {
                              "weight": {
                                 "field": "opponent_stats.fg_3p.attempts.total"
                              },
                              "value": {
                                 "script": {
                                    "source": "\n  def kp_name = params.pbp_to_kp[doc[\"opponent.team.keyword\"].value];\n  if (kp_name == null) {\n     kp_name = doc[\"opponent.team.keyword\"].value;\n  } else {\n     kp_name = kp_name.pbp_kp_team;\n  }\n  def oppo = params.kp_3p[kp_name];\n  def sos_3p = null;\n  if (oppo != null) {\n     sos_3p = oppo['stats.off._3p_pct.value'];\n  }\n  \nreturn sos_3p;",
                                    "lang": "painless",
                                    "params": {
                                       "pbp_to_kp": {
                                          "name1": "name1b"
                                       },
                                       "kp_3p": {
                                          "team": {
                                             "stats": 0
                                          }
                                       }
                                    }
                                 }
                              }
                           }
                        },
                        "off_adj_opp": {
                           "weighted_avg": {
                              "weight": {
                                 "field": "opponent_stats.num_possessions"
                              },
                              "value": {
                                 "script": {
                                    "source": "\n  def hca = 0.0;\n  if (doc[\"location_type.keyword\"].value == \"Home\") {\n    hca = params.off_hca;\n  } else if (doc[\"location_type.keyword\"].value == \"Away\") {\n    hca = -params.off_hca;\n  }\n  def kp_name = params.pbp_to_kp[doc[\"opponent.team.keyword\"].value];\n  if (kp_name == null) {\n     kp_name = doc[\"opponent.team.keyword\"].value;\n  } else {\n     kp_name = kp_name.pbp_kp_team;\n  }\n  def oppo = params.kp_off[kp_name];\n  def adj_sos = null;\n  if (oppo != null) {\n     adj_sos = oppo['stats.adj_off.value'] - hca;\n  }\n  \nreturn adj_sos;",
                                    "lang": "painless",
                                    "params": {
                                       "avgEff": 100,
                                       "pbp_to_kp": {
                                          "name1": "name1b"
                                       },
                                       "kp_off": {
                                          "team": {
                                             "stats": 0
                                          }
                                       },
                                       "off_hca": 1.5,
                                       "def_hca": -1.5
                                    }
                                 }
                              }
                           }
                        },
                        "off_poss": {
                           "sum": {
                              "script": "\n              def team_fga = doc[\"team_stats.fg.attempts.total\"].value;\n              def team_fgm = doc[\"team_stats.fg.made.total\"].value;\n              def team_fgM = team_fga - team_fgm;\n              def team_orb =doc[\"team_stats.orb.total\"].value;\n              team_orb = team_orb > team_fgM ? team_fgM : team_orb;\n              def rebound_pct = team_fgM > 0 ? 1.0*team_orb/team_fgM : 0.0;\n\n              def fga = doc[\"player_stats.fg.attempts.total\"].value;\n              def fgm = doc[\"player_stats.fg.made.total\"].value;\n              def fgM = fga - fgm;\n              def fta = doc[\"player_stats.ft.attempts.total\"].value;\n              def to = doc[\"player_stats.to.total\"].value;\n              return fgm + (1.0 - rebound_pct)*fgM + 0.475*fta + to;\n            "
                           }
                        },
                        "off_team_poss": {
                           "bucket_script": {
                              "buckets_path": {
                                 "team_poss": "team_total_off_poss"
                              },
                              "script": "params.team_poss"
                           }
                        },
                        "off_assist": {
                           "bucket_script": {
                              "buckets_path": {
                                 "ast": "total_off_assist",
                                 "team_fgm": "team_total_off_fgm",
                                 "fgm": "total_off_fgm"
                              },
                              "script": "(params.team_fgm - params.fgm) > 0 ? 1.0*params.ast/(params.team_fgm - params.fgm) : 0.0"
                           }
                        },
                        "off_to": {
                           "bucket_script": {
                              "buckets_path": {
                                 "to": "total_off_to",
                                 "poss": "off_poss"
                              },
                              "script": "params.poss > 0 ? 1.0*params.to/params.poss : 0.0"
                           }
                        },
                        "off_orb": {
                           "bucket_script": {
                              "buckets_path": {
                                 "orb": "total_off_orb",
                                 "team_orb": "team_total_off_orb",
                                 "oppo_drb": "oppo_total_def_drb"
                              },
                              "script": "params.team_orb > 0 || params.oppo_drb > 0 ? 1.0*params.orb/(params.team_orb + params.oppo_drb) : 0.0"
                           }
                        },
                        "off_usage": {
                           "bucket_script": {
                              "buckets_path": {
                                 "off_poss": "off_poss",
                                 "team_poss": "team_total_off_poss"
                              },
                              "script": "params.team_poss > 0 ? params.off_poss/params.team_poss : 0.0"
                           }
                        },
                        "def_team_poss": {
                           "bucket_script": {
                              "buckets_path": {
                                 "team_poss": "oppo_total_def_poss"
                              },
                              "script": "params.team_poss"
                           }
                        },
                        "def_orb": {
                           "bucket_script": {
                              "buckets_path": {
                                 "drb": "total_off_drb",
                                 "oppo_orb": "oppo_total_def_orb",
                                 "team_drb": "team_total_off_drb"
                              },
                              "script": "params.oppo_orb > 0 || params.team_drb > 0 ? 1.0*params.drb/(params.oppo_orb + params.team_drb) : 0.0"
                           }
                        },
                        "def_ftr": {
                           "bucket_script": {
                              "buckets_path": {
                                 "fouls": "total_off_foul",
                                 "poss": "oppo_total_def_poss"
                              },
                              "script": "params.poss > 0 ? 0.7*params.fouls/params.poss : 0.0"
                           }
                        },
                        "def_to": {
                           "bucket_script": {
                              "buckets_path": {
                                 "stl": "total_off_stl",
                                 "poss": "oppo_total_def_poss"
                              },
                              "script": "params.poss > 0 ? 1.0*params.stl/params.poss : 0.0"
                           }
                        },
                        "def_2prim": {
                           "bucket_script": {
                              "buckets_path": {
                                 "blk": "total_off_blk",
                                 "fg2pa": "oppo_total_def_2p_attempts"
                              },
                              "script": "params.fg2pa > 0 ? 1.0*params.blk/params.fg2pa : 0.0"
                           }
                        },
                        "def_adj_opp": {
                           "weighted_avg": {
                              "weight": {
                                 "field": "opponent_stats.num_possessions"
                              },
                              "value": {
                                 "script": {
                                    "source": "\n  def hca = 0.0;\n  if (doc[\"location_type.keyword\"].value == \"Home\") {\n    hca = params.def_hca;\n  } else if (doc[\"location_type.keyword\"].value == \"Away\") {\n    hca = -params.def_hca;\n  }\n  def kp_name = params.pbp_to_kp[doc[\"opponent.team.keyword\"].value];\n  if (kp_name == null) {\n     kp_name = doc[\"opponent.team.keyword\"].value;\n  } else {\n     kp_name = kp_name.pbp_kp_team;\n  }\n  def oppo = params.kp_def[kp_name];\n  def adj_sos = null;\n  if (oppo != null) {\n     adj_sos = oppo['stats.adj_def.value'] - hca;\n  }\n  \nreturn adj_sos;",
                                    "lang": "painless",
                                    "params": {
                                       "avgEff": 100,
                                       "pbp_to_kp": {
                                          "name1": "name1b"
                                       },
                                       "kp_def": {
                                          "team": {
                                             "stats": 0
                                          }
                                       },
                                       "off_hca": 1.5,
                                       "def_hca": -1.5
                                    }
                                 }
                              }
                           }
                        }
                     }
                  }
               }
            }
         },
         "query": {
            "bool": {
               "filter": [],
               "must_not": [],
               "should": [],
               "minimum_should_match": 0,
               "must": [
                  {
                     "term": {
                        "team.team.keyword": "TestTeam"
                     }
                  },
                  {
                     "script": {
                        "script": {
                           "source": "\n                  if (params.kp_opp.isEmpty()) return true;\n                  def kp_name = params.pbp_to_kp[doc[\"opponent.team.keyword\"].value];\n                  if (kp_name == null) {\n                     kp_name = doc[\"opponent.team.keyword\"].value;\n                  } else {\n                     kp_name = kp_name.pbp_kp_team;\n                  }\n                  def oppo = params.kp_opp[kp_name];\n                  if (oppo != null) {\n                     def kp_rank = oppo[\"stats.adj_margin.rank\"];\n                     def game_filter = params.game_filter;\n                     def oppo_conf = oppo[\"conf\"];\n                     def conf_allowed = true;\n                     if (!game_filter.conf.isEmpty()) {\n                        conf_allowed = game_filter.conf.equals(oppo_conf);\n                     }\n                     return conf_allowed && (kp_rank >= game_filter.min_kp) && (kp_rank <= game_filter.max_kp);\n                  } else {\n                      return false;\n                  }\n                 ",
                           "lang": "painless",
                           "params": {
                              "pbp_to_kp": {
                                 "name1": "name1b"
                              },
                              "kp_opp": {
                                 "team": {
                                    "stats": 0
                                 }
                              },
                              "game_filter": {
                                 "min_kp": 10,
                                 "max_kp": 100,
                                 "conf": ""
                              }
                           }
                        }
                     }
                  }
               ]
            }
         }
      };
