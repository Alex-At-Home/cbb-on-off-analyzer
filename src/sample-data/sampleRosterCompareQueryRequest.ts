export const sampleRosterCompareQueryRequest =                 {
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
                           "query": "(players.id:(NOT *)) AND (players.id:(base))"
                        }
                     },
                     "on": {
                        "query_string": {
                           "query": "(players.id:(NOT *)) AND (players.id:(base))"
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
                  "global_poss_count": {
                     "sum": {
                        "field": "team_stats.num_possessions"
                     }
                  },
                  "player": {
                     "terms": {
                        "field": "players.id.keyword",
                        "size": 100
                     },
                     "aggregations": {
                        "poss_count": {
                           "sum": {
                              "field": "team_stats.num_possessions"
                           }
                        },
                        "sort": {
                           "bucket_sort": {
                              "from": 0,
                              "sort": [
                                 {
                                    "poss_count": {
                                       "order": "desc"
                                    }
                                 }
                              ],
                              "size": 100
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
                           "source": "\n                  if (params.kp.isEmpty()) return true;\n                  def kp_name = params.pbp_to_kp[doc[\"opponent.team.keyword\"].value];\n                  if (kp_name == null) {\n                     kp_name = doc[\"opponent.team.keyword\"].value;\n                  } else {\n                     kp_name = kp_name.pbp_kp_team;\n                  }\n                  def oppo = params.kp[kp_name];\n                  if (oppo != null) {\n                     def kp_rank = oppo[\"stats.adj_margin.rank\"];\n                     def game_filter = params.game_filter;\n                     def oppo_conf = oppo[\"conf\"];\n                     def conf_allowed = true;\n                     if (!game_filter.conf.isEmpty()) {\n                        conf_allowed = game_filter.conf.equals(oppo_conf);\n                     }\n                     return conf_allowed && (kp_rank >= game_filter.min_kp) && (kp_rank <= game_filter.max_kp);\n                  } else {\n                      return false;\n                  }\n                 ",
                           "lang": "painless",
                           "params": {
                              "pbp_to_kp": {
                                 "name1": "name1b"
                              },
                              "kp": {
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