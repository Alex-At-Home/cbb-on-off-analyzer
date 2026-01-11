const samplePlayerCareer = {
  took: 4,
  responses: [
    {
      took: 3,
      timed_out: false,
      _shards: {
        total: 8,
        successful: 8,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 6,
          relation: "eq",
        },
        max_score: 6.627663,
        hits: [
          {
            _index: "hoopexp_men_players_2019_lping",
            _id: "4066371_Men_2019_t100",
            _score: 6.627663,
            _source: {
              "@timestamp": "2025-09-20T21:40:40.168Z",
              off_trans_2prim: {
                value: 0.6087,
              },
              off_ast_mid: {
                value: 0.0727,
              },
              duration_mins: {
                value: 860.2017,
              },
              roster: {
                pos: "G",
                origin: "Bowie, MD",
                ncaa_id: "4066371",
                number: "01",
                height: "6-0",
                year_class: "Sr",
              },
              doc_count: 387,
              def_adj_rapm_prod: {
                value: -1.264,
                old_value: -1.4152,
                override: "Adjusted from Def 3P%",
              },
              def_team_poss_pct: {
                value: 0.8905,
              },
              def_to: {
                value: 0.0176,
              },
              off_adj_rapm: {
                old_value: 4.9475,
                value: 4.9475,
              },
              total_off_trans_fga: {
                value: 44,
              },
              off_adj_rtg: {
                value: 5.6396,
              },
              off_poss: {
                value: 367.5262,
              },
              off_2pmidr: {
                value: 0.1871,
              },
              adj_rtg_margin_rank: 44,
              def_adj_rapm: {
                old_value: -1.5892,
                value: -1.4194,
                override: "Adjusted from Def 3P%",
              },
              off_2p: {
                value: 0.4595,
              },
              adj_rapm_prod_margin_rank: 39,
              total_off_scramble_fga: {
                value: 20,
              },
              off_adj_rtg_rank: 37,
              off_3p_ast: {
                value: 0.587,
              },
              posClass: "s-PG",
              off_scramble_2pmidr: {
                value: 0.2,
              },
              off_ast_3p: {
                value: 0.4818,
              },
              def_team_poss: {
                value: 1423,
              },
              log: {
                offset: 708714,
                file: {
                  path: "/Users/alex/personal/github/cbb-data/cbb/men_playerproc_1758404434_t100.ndjson",
                },
              },
              off_trans_3pr: {
                value: 0.4318,
              },
              off_3p: {
                value: 0.3151,
              },
              agent: {
                hostname: "Alexs-MacBook-Pro.local",
                ephemeral_id: "1eb70fb5-04db-42bf-8304-86954c33ead3",
                id: "8545ea76-452d-4b24-8194-b0e7c449257b",
                name: "Alexs-MacBook-Pro.local",
                type: "filebeat",
                version: "7.13.2",
              },
              off_trans_2pmid_ast: {
                value: 0,
              },
              def_adj_rapm_rank: 353,
              off_adj_opp: {
                value: 110.7382,
              },
              off_scramble_2pmid: {
                value: 0.25,
              },
              off_trans_2pmid: {
                value: 0.5,
              },
              def_ftr: {
                value: 0.028,
              },
              off_scramble_2prim_ast: {
                value: 0,
              },
              posFreqs: {
                sf: 0,
                pf: 0,
                c: 0,
                pg: 1,
                sg: 0,
              },
              off_2primr: {
                value: 0.3163,
              },
              off_trans_2pmidr: {
                value: 0.0455,
              },
              off_2prim: {
                value: 0.5591,
              },
              off_scramble_2primr: {
                value: 0.2,
              },
              def_adj_prod: {
                value: -1.7331,
                old_value: -1.8077,
                override: "Luck adjusted",
              },
              def_adj_rapm_prod_rank: 215,
              total_off_3p_attempts: {
                value: 146,
              },
              off_trans_2p: {
                value: 0.6,
              },
              conf: "Big Ten Conference",
              off_trans_2p_ast: {
                value: 0,
              },
              off_efg: {
                value: 0.466,
              },
              off_trans_3p: {
                value: 0.3158,
              },
              code: "AnCowan",
              on: {
                def_3p_opp: {
                  value: 32.7538,
                },
                def_assist: {
                  value: 0.5385,
                },
                off_2p_ast: {
                  value: 0,
                },
                def_ft: {
                  value: 0.6994,
                },
                def_2pmid: {
                  value: 0.3255,
                },
                off_raw_net: {
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 6.9165,
                  old_value: 6.9413,
                },
                off_poss: {
                  value: 1428,
                },
                def_adj_opp: {
                  value: 94.1657,
                },
                off_ftr: {
                  value: 0.3636,
                },
                off_adj_opp: {
                  value: 110.7382,
                },
                def_ppp: {
                  value: 99.2711,
                  old_value: 98.7351,
                  override: "Adjusted from Def 3P%",
                },
                off_3p: {
                  value: 0.3158,
                  old_value: 0.3098,
                  override: "Luck adjusted",
                },
                def_2pmid_ast: {
                  value: 0.3306,
                },
                off_net: {
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 23.8572,
                  old_value: 23.6714,
                },
                off_2pmidr: {
                  value: 0.1944,
                },
                off_ppp: {
                  override: "Adjusted from Off 3P%",
                  value: 105.8545,
                  old_value: 105.112,
                },
                def_ast_rim: {
                  value: 0.3688,
                },
                def_poss: {
                  value: 1423,
                },
                def_2p: {
                  value: 0.4472,
                },
                def_ast_mid: {
                  value: 0.1454,
                },
                def_2prim_ast: {
                  value: 0.4483,
                },
                off_adj_ppp: {
                  override: "Adjusted from Off 3P%",
                  value: 115.1272,
                  old_value: 114.3055,
                },
                off_3pr: {
                  value: 0.451,
                },
                off_orb: {
                  value: 0.2977,
                },
                def_ast_3p: {
                  value: 0.4858,
                },
                def_3p: {
                  value: 0.3344,
                  old_value: 0.3298,
                  override: "Luck adjusted",
                },
                off_ast_rim: {
                  value: 0.4249,
                },
                off_2pmid_ast: {
                  value: 0.2239,
                },
                def_3p_ast: {
                  value: 0.8839,
                },
                def_efg: {
                  old_value: 0.4648,
                  override: "Adjusted from Def 3P%",
                  value: 0.4674,
                },
                def_2prim: {
                  value: 0.559,
                },
                off_efg: {
                  override: "Adjusted from Off 3P%",
                  value: 0.48,
                  old_value: 0.4759,
                },
                off_ft: {
                  value: 0.7551,
                },
                off_2pmid: {
                  value: 0.2815,
                },
                off_assist: {
                  value: 0.5386,
                },
                def_adj_ppp: {
                  value: 91.7207,
                  old_value: 91.2383,
                  override: "Adjusted from Def 3P%",
                },
                off_2primr: {
                  value: 0.3546,
                },
                def_2pmidr: {
                  value: 0.3009,
                },
                off_2prim: {
                  value: 0.5968,
                },
                def_2p_ast: {
                  value: 0,
                },
                off_2prim_ast: {
                  value: 0.4479,
                },
                off_ast_3p: {
                  value: 0.5201,
                },
                def_orb: {
                  value: 0.2866,
                },
                def_3pr: {
                  value: 0.3712,
                },
                off_3p_ast: {
                  value: 0.8304,
                },
                off_to: {
                  value: 0.1646,
                },
                def_ftr: {
                  value: 0.2575,
                },
                off_ast_mid: {
                  value: 0.0549,
                },
                def_2primr: {
                  value: 0.3278,
                },
                off_2p: {
                  value: 0.4851,
                },
                def_to: {
                  value: 0.1736,
                },
              },
              off_scramble_3p_ast: {
                value: 0.8333,
              },
              off_3pr: {
                value: 0.4966,
              },
              total_off_trans_to: {
                value: 16,
              },
              ecs: {
                version: "1.8.0",
              },
              total_off_2p_attempts: {
                value: 148,
              },
              off_scramble_3pr: {
                value: 0.6,
              },
              off_adj_prod: {
                value: 5.0555,
              },
              off: {
                def_2p_ast: {
                  value: 0,
                },
                off_efg: {
                  override: "Adjusted from Off 3P%",
                  value: 0.4676,
                  old_value: 0.4844,
                },
                off_raw_net: {
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 17.7949,
                  old_value: 23.0818,
                },
                off_ftr: {
                  value: 0.3438,
                },
                off_2pmid: {
                  value: 0.2222,
                },
                off_ast_mid: {
                  value: 0.0385,
                },
                def_2pmidr: {
                  value: 0.3289,
                },
                def_ast_rim: {
                  value: 0.4815,
                },
                def_adj_opp: {
                  value: 94.2552,
                },
                off_3p: {
                  override: "Luck adjusted",
                  value: 0.3314,
                  old_value: 0.36,
                },
                off_2p_ast: {
                  value: 0,
                },
                def_2primr: {
                  value: 0.3224,
                },
                off_orb: {
                  value: 0.2308,
                },
                def_ppp: {
                  value: 86.6626,
                  old_value: 84.5714,
                  override: "Adjusted from Def 3P%",
                },
                def_ast_3p: {
                  value: 0.4074,
                },
                off_ppp: {
                  value: 93.7763,
                  old_value: 95.7576,
                  override: "Adjusted from Off 3P%",
                },
                off_net: {
                  old_value: 37.5782,
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 32.731,
                },
                def_2pmid_ast: {
                  value: 0.2143,
                },
                def_2prim_ast: {
                  value: 0.5417,
                },
                def_2pmid: {
                  value: 0.28,
                },
                off_assist: {
                  value: 0.3721,
                },
                off_ast_3p: {
                  value: 0.5769,
                },
                def_2p: {
                  value: 0.3838,
                },
                off_poss: {
                  value: 165,
                },
                def_ftr: {
                  value: 0.2237,
                },
                off_2primr: {
                  value: 0.3984,
                },
                def_3pr: {
                  value: 0.3487,
                },
                def_efg: {
                  value: 0.4195,
                  old_value: 0.4079,
                  override: "Adjusted from Def 3P%",
                },
                def_ast_mid: {
                  value: 0.1111,
                },
                off_2p: {
                  value: 0.4487,
                },
                def_ft: {
                  value: 0.7059,
                },
                off_2pmid_ast: {
                  value: 0.1667,
                },
                def_adj_ppp: {
                  override: "Adjusted from Def 3P%",
                  value: 80.8262,
                  old_value: 78.9805,
                },
                def_3p_opp: {
                  value: 27.9073,
                },
                def_poss: {
                  value: 175,
                },
                off_3pr: {
                  value: 0.3906,
                },
                off_2pmidr: {
                  value: 0.2109,
                },
                off_ft: {
                  value: 0.7727,
                },
                off_adj_ppp: {
                  old_value: 104.3827,
                  override: "Adjusted from Off 3P%",
                  value: 102.2721,
                },
                off_2prim: {
                  value: 0.5686,
                },
                def_2prim: {
                  value: 0.4898,
                },
                off_2prim_ast: {
                  value: 0.3448,
                },
                off_adj_opp: {
                  value: 110.3091,
                },
                off_ast_rim: {
                  value: 0.3846,
                },
                def_3p_ast: {
                  value: 0.6875,
                },
                off_to: {
                  value: 0.2424,
                },
                def_to: {
                  value: 0.1657,
                },
                def_assist: {
                  value: 0.4704,
                },
                def_orb: {
                  value: 0.21,
                },
                def_3p: {
                  old_value: 0.3019,
                  override: "Luck adjusted",
                  value: 0.3241,
                },
                off_3p_ast: {
                  value: 0.8333,
                },
              },
              off_adj_rapm_prod: {
                value: 4.6035,
              },
              rapm: {
                def_poss: {
                  value: 1596,
                },
                def_2primr: {
                  value: 0.0068,
                },
                def_2prim: {
                  value: 0.0164,
                },
                off_3pr: {
                  value: 0.0582,
                },
                def_2pmid: {
                  value: 0.0026,
                },
                def_efg: {
                  old_value: 0.0183,
                  value: 0.0183,
                  override: "Adjusted from Def 3P%",
                },
                off_to: {
                  value: -0.0117,
                },
                def_to: {
                  value: 0.0053,
                },
                off_2pmidr: {
                  value: -0.0159,
                },
                off_assist: {
                  value: 0.0433,
                },
                off_3p: {
                  old_value: 0.0036,
                  value: 0.0036,
                  override: "Luck adjusted",
                },
                off_adj_ppp: {
                  value: 4.9475,
                  old_value: 4.9475,
                },
                def_ftr: {
                  value: -0.0075,
                },
                def_2pmidr: {
                  value: 0.0142,
                },
                off_2p: {
                  value: -0.0025,
                },
                def_orb: {
                  value: 0.0146,
                },
                off_ftr: {
                  value: 0.0289,
                },
                off_2pmid: {
                  value: -0.0105,
                },
                def_2p: {
                  value: 0.0134,
                },
                off_efg: {
                  value: -0.0014,
                  override: "Adjusted from Off 3P%",
                  old_value: -0.0014,
                },
                off_orb: {
                  value: 0.0018,
                },
                off_poss: {
                  value: 1591,
                },
                def_3pr: {
                  value: 0.0101,
                },
                off_2prim: {
                  value: -0.0072,
                },
                def_assist: {
                  value: 0.0226,
                },
                off_2primr: {
                  value: -0.0209,
                },
                def_adj_ppp: {
                  value: -1.4194,
                  override: "Adjusted from Def 3P%",
                  old_value: -1.5892,
                },
                def_3p: {
                  value: 0.0103,
                  override: "Luck adjusted",
                  old_value: 0.0103,
                },
              },
              adj_rapm_margin_rank: 69,
              off_ftr: {
                value: 0.5476,
              },
              off_scramble_2prim: {
                value: 0.75,
              },
              style: {
                Transition: {
                  possPct: {
                    value: 0.1404,
                  },
                  pts: {
                    value: 1.2881,
                  },
                  possPctUsg: {
                    value: 0.0531,
                  },
                  adj_pts: {
                    value: 1.4006,
                  },
                },
                "Hits Cutter": {
                  possPct: {
                    value: 0.0601,
                  },
                  pts: {
                    value: 1.1197,
                  },
                  possPctUsg: {
                    value: 0.0227,
                  },
                  adj_pts: {
                    value: 1.2174,
                  },
                },
                "Rim Attack": {
                  possPct: {
                    value: 0.2264,
                  },
                  pts: {
                    value: 0.8829,
                  },
                  possPctUsg: {
                    value: 0.0856,
                  },
                  adj_pts: {
                    value: 0.9599,
                  },
                },
                "Big Cut & Roll": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Post-Up": {
                  possPct: {
                    value: 0.0064,
                  },
                  pts: {
                    value: 0.474,
                  },
                  possPctUsg: {
                    value: 0.0024,
                  },
                  adj_pts: {
                    value: 0.5154,
                  },
                },
                "Post & Kick": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Pick & Pop": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Put-Back": {
                  adj_pts: {
                    value: 1.5475,
                  },
                  possPct: {
                    value: 0.0424,
                  },
                  pts: {
                    value: 1.4232,
                  },
                  possPctUsg: {
                    value: 0.016,
                  },
                },
                "Dribble Jumper": {
                  possPct: {
                    value: 0.0895,
                  },
                  pts: {
                    value: 0.798,
                  },
                  possPctUsg: {
                    value: 0.0338,
                  },
                  adj_pts: {
                    value: 0.8677,
                  },
                },
                "Backdoor Cut": {
                  possPct: {
                    value: 0.0368,
                  },
                  pts: {
                    value: 1.2854,
                  },
                  possPctUsg: {
                    value: 0.0139,
                  },
                  adj_pts: {
                    value: 1.3976,
                  },
                },
                "Mid-Range": {
                  possPctUsg: {
                    value: 0.0234,
                  },
                  adj_pts: {
                    value: 0.5875,
                  },
                  possPct: {
                    value: 0.0619,
                  },
                  pts: {
                    value: 0.5403,
                  },
                },
                "High-Low": {
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                  possPct: {
                    value: 0,
                  },
                },
                "Attack & Kick": {
                  adj_pts: {
                    value: 0.9766,
                  },
                  possPct: {
                    value: 0.1674,
                  },
                  pts: {
                    value: 0.8982,
                  },
                  possPctUsg: {
                    value: 0.0633,
                  },
                },
                "Perimeter Sniper": {
                  pts: {
                    value: 0.9138,
                  },
                  possPctUsg: {
                    value: 0.0374,
                  },
                  adj_pts: {
                    value: 0.9936,
                  },
                  possPct: {
                    value: 0.099,
                  },
                },
                "PnR Passer": {
                  possPctUsg: {
                    value: 0.0264,
                  },
                  adj_pts: {
                    value: 1.2865,
                  },
                  possPct: {
                    value: 0.0698,
                  },
                  pts: {
                    value: 1.1832,
                  },
                },
              },
              off_trans_assist: {
                value: 1.0476,
              },
              off_scramble_ftr: {
                value: 0.6,
              },
              off_assist: {
                value: 0.2872,
              },
              off_trans_efg: {
                value: 0.5455,
              },
              off_2prim_ast: {
                value: 0.2308,
              },
              def_adj_rtg: {
                value: -1.9462,
                old_value: -2.03,
                override: "Luck adjusted",
              },
              off_2pmid: {
                value: 0.2909,
              },
              off_scramble_efg: {
                value: 0.65,
              },
              def_2prim: {
                value: 0.005,
              },
              total_off_2pmid_attempts: {
                value: 55,
              },
              def_adj_opp: {
                value: 94.1786,
              },
              off_team_poss: {
                value: 1428,
              },
              off_scramble_3p: {
                value: 0.5,
              },
              off_to: {
                value: 0.1551,
              },
              off_trans_3p_ast: {
                value: 0.5,
              },
              off_scramble_2p_ast: {
                value: 0,
              },
              def_rtg: {
                value: 100.2148,
                old_value: 99.7616,
                override: "Luck adjusted",
              },
              def_orb: {
                value: 0.1014,
              },
              off_trans_ft: {
                value: 0.8333,
              },
              off_usage: {
                value: 0.2629,
              },
              year: "2019",
              def_adj_prod_rank: 79,
              posConfidences: {
                pf: 0,
                c: 0,
                pg: 1,
                sg: 0,
                sf: 0,
              },
              host: {
                name: "Alexs-MacBook-Pro.local",
              },
              off_scramble_ft: {
                value: 0.9167,
              },
              key: "Cowan, Anthony",
              off_ft: {
                value: 0.8075,
              },
              off_adj_rapm_prod_rank: 21,
              off_team_poss_pct: {
                value: 0.8964,
              },
              off_trans_ftr: {
                value: 1.3636,
              },
              total_off_scramble_to: {
                value: 1,
              },
              off_scramble_2p: {
                value: 0.5,
              },
              team: "Maryland",
              input: {
                type: "log",
              },
              sample_name: "t100",
              off_adj_prod_rank: 15,
              adj_prod_margin_rank: 17,
              off_rtg: {
                value: 112.2487,
              },
              off_trans_2prim_ast: {
                value: 0.2857,
              },
              total_off_2prim_attempts: {
                value: 93,
              },
              off_trans_2primr: {
                value: 0.5227,
              },
              off_2pmid_ast: {
                value: 0,
              },
              off_ast_rim: {
                value: 0.4455,
              },
              off_adj_rapm_rank: 42,
              def_adj_rtg_rank: 230,
              off_orb: {
                value: 0.0178,
              },
              off_2p_ast: {
                value: 0,
              },
              off_scramble_assist: {
                value: 0.7,
              },
              off_scramble_2pmid_ast: {
                value: 0,
              },
            },
          },
          {
            _index: "hoopexp_men_players_2019_lping",
            _id: "4066371_Men_2019_all",
            _score: 6.627663,
            _source: {
              "@timestamp": "2025-09-20T21:40:40.172Z",
              off_ast_mid: {
                value: 0.068,
              },
              ecs: {
                version: "1.8.0",
              },
              conf: "Big Ten Conference",
              off_scramble_ft: {
                value: 0.9167,
              },
              off_adj_rtg: {
                value: 5.4884,
              },
              off_trans_2pmidr: {
                value: 0.0364,
              },
              off_adj_prod: {
                value: 4.7617,
              },
              off_trans_ft: {
                value: 0.8235,
              },
              off_3p: {
                value: 0.3218,
              },
              off_to: {
                value: 0.1528,
              },
              off_2p_ast: {
                value: 0,
              },
              off_2prim: {
                value: 0.5556,
              },
              off_trans_efg: {
                value: 0.5455,
              },
              total_off_2p_attempts: {
                value: 182,
              },
              style: {
                "PnR Passer": {
                  possPct: {
                    value: 0.0689,
                  },
                  pts: {
                    value: 1.1653,
                  },
                  possPctUsg: {
                    value: 0.0252,
                  },
                  adj_pts: {
                    value: 1.2352,
                  },
                },
                "Attack & Kick": {
                  pts: {
                    value: 0.8596,
                  },
                  possPctUsg: {
                    value: 0.065,
                  },
                  adj_pts: {
                    value: 0.9112,
                  },
                  possPct: {
                    value: 0.1773,
                  },
                },
                "Pick & Pop": {
                  adj_pts: {
                    value: 0,
                  },
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                },
                "Rim Attack": {
                  possPct: {
                    value: 0.2216,
                  },
                  pts: {
                    value: 0.9064,
                  },
                  possPctUsg: {
                    value: 0.0812,
                  },
                  adj_pts: {
                    value: 0.9608,
                  },
                },
                "Backdoor Cut": {
                  pts: {
                    value: 1.2866,
                  },
                  possPctUsg: {
                    value: 0.0155,
                  },
                  adj_pts: {
                    value: 1.3639,
                  },
                  possPct: {
                    value: 0.0422,
                  },
                },
                "Post-Up": {
                  possPct: {
                    value: 0.0056,
                  },
                  pts: {
                    value: 0.5582,
                  },
                  possPctUsg: {
                    value: 0.002,
                  },
                  adj_pts: {
                    value: 0.5918,
                  },
                },
                "Put-Back": {
                  possPct: {
                    value: 0.0382,
                  },
                  pts: {
                    value: 1.3805,
                  },
                  possPctUsg: {
                    value: 0.014,
                  },
                  adj_pts: {
                    value: 1.4633,
                  },
                },
                Transition: {
                  adj_pts: {
                    value: 1.3781,
                  },
                  possPct: {
                    value: 0.1485,
                  },
                  pts: {
                    value: 1.3001,
                  },
                  possPctUsg: {
                    value: 0.0544,
                  },
                },
                "Perimeter Sniper": {
                  possPct: {
                    value: 0.1032,
                  },
                  pts: {
                    value: 0.9352,
                  },
                  possPctUsg: {
                    value: 0.0378,
                  },
                  adj_pts: {
                    value: 0.9913,
                  },
                },
                "Dribble Jumper": {
                  possPct: {
                    value: 0.0804,
                  },
                  pts: {
                    value: 0.817,
                  },
                  possPctUsg: {
                    value: 0.0294,
                  },
                  adj_pts: {
                    value: 0.8661,
                  },
                },
                "Post & Kick": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Big Cut & Roll": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Hits Cutter": {
                  pts: {
                    value: 1.1375,
                  },
                  possPctUsg: {
                    value: 0.0211,
                  },
                  adj_pts: {
                    value: 1.2058,
                  },
                  possPct: {
                    value: 0.0576,
                  },
                },
                "High-Low": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Mid-Range": {
                  possPctUsg: {
                    value: 0.0207,
                  },
                  adj_pts: {
                    value: 0.5766,
                  },
                  possPct: {
                    value: 0.0564,
                  },
                  pts: {
                    value: 0.5439,
                  },
                },
              },
              def_2prim: {
                value: 0.0051,
              },
              rapm: {
                def_2pmidr: {
                  value: 0.0154,
                },
                def_poss: {
                  value: 2078,
                },
                def_orb: {
                  value: 0.0117,
                },
                off_efg: {
                  value: -0.003,
                  override: "Adjusted from Off 3P%",
                  old_value: -0.003,
                },
                off_2prim: {
                  value: -0.0068,
                },
                def_to: {
                  value: 0.0045,
                },
                off_2p: {
                  value: -0.0078,
                },
                off_2pmid: {
                  value: -0.0139,
                },
                def_2prim: {
                  value: 0.0214,
                },
                def_adj_ppp: {
                  old_value: -1.3883,
                  value: -1.2921,
                  override: "Adjusted from Def 3P%",
                },
                off_orb: {
                  value: 0.0029,
                },
                off_3pr: {
                  value: 0.0548,
                },
                off_ftr: {
                  value: 0.0254,
                },
                off_2pmidr: {
                  value: -0.0144,
                },
                def_ftr: {
                  value: -0.0068,
                },
                def_2primr: {
                  value: 0.0061,
                },
                off_assist: {
                  value: 0.0462,
                },
                def_assist: {
                  value: 0.0218,
                },
                def_3pr: {
                  value: 0.0128,
                },
                def_2pmid: {
                  value: 0.0015,
                },
                off_3p: {
                  value: 0.0062,
                  override: "Luck adjusted",
                  old_value: 0.0062,
                },
                def_efg: {
                  override: "Adjusted from Def 3P%",
                  old_value: 0.0195,
                  value: 0.0195,
                },
                off_2primr: {
                  value: -0.0234,
                },
                off_to: {
                  value: -0.0089,
                },
                def_2p: {
                  value: 0.014,
                },
                off_adj_ppp: {
                  old_value: 4.8824,
                  value: 4.8824,
                },
                off_poss: {
                  value: 2071,
                },
                def_3p: {
                  override: "Luck adjusted",
                  old_value: 0.0087,
                  value: 0.0087,
                },
              },
              off_ft: {
                value: 0.8113,
              },
              input: {
                type: "log",
              },
              off_adj_opp: {
                value: 108.0397,
              },
              off_trans_2pmid_ast: {
                value: 0,
              },
              adj_rapm_margin_rank: 79,
              code: "AnCowan",
              total_off_scramble_fga: {
                value: 22,
              },
              off_trans_3p: {
                value: 0.3478,
              },
              off_trans_2prim: {
                value: 0.5667,
              },
              off_trans_ftr: {
                value: 1.5455,
              },
              off_scramble_3p: {
                value: 0.4615,
              },
              posClass: "s-PG",
              sample_name: "all",
              off_scramble_2pmidr: {
                value: 0.1818,
              },
              total_off_2pmid_attempts: {
                value: 65,
              },
              off_adj_rapm_prod: {
                value: 4.3258,
              },
              def_adj_rtg_rank: 389,
              def_adj_rapm_rank: 461,
              off_scramble_2prim: {
                value: 0.8,
              },
              off_team_poss_pct: {
                value: 0.8676,
              },
              posConfidences: {
                sg: 0,
                sf: 0,
                pf: 0,
                c: 0,
                pg: 1,
              },
              off_ftr: {
                value: 0.5955,
              },
              off_trans_2prim_ast: {
                value: 0.2941,
              },
              off_rtg: {
                value: 115.5847,
              },
              off_adj_rtg_rank: 31,
              off_scramble_2pmid: {
                value: 0.25,
              },
              off_efg: {
                value: 0.4691,
              },
              log: {
                file: {
                  path: "/Users/alex/personal/github/cbb-data/cbb/men_playerproc_1758404434_all.ndjson",
                },
                offset: 814170,
              },
              off_usage: {
                value: 0.2552,
              },
              duration_mins: {
                value: 1074.9617,
              },
              host: {
                name: "Alexs-MacBook-Pro.local",
              },
              def_adj_opp: {
                value: 96.6018,
              },
              off_scramble_assist: {
                value: 0.9091,
              },
              off_team_poss: {
                value: 1802,
              },
              off_2prim_ast: {
                value: 0.2615,
              },
              def_adj_prod: {
                override: "Luck adjusted",
                value: -1.4115,
                old_value: -1.4985,
              },
              def_team_poss_pct: {
                value: 0.8602,
              },
              off_2p: {
                value: 0.456,
              },
              total_off_trans_to: {
                value: 20,
              },
              agent: {
                id: "8545ea76-452d-4b24-8194-b0e7c449257b",
                name: "Alexs-MacBook-Pro.local",
                type: "filebeat",
                version: "7.13.2",
                hostname: "Alexs-MacBook-Pro.local",
                ephemeral_id: "1eb70fb5-04db-42bf-8304-86954c33ead3",
              },
              total_off_scramble_to: {
                value: 2,
              },
              off_2pmid: {
                value: 0.2769,
              },
              def_adj_rtg: {
                value: -1.6409,
                old_value: -1.7421,
                override: "Luck adjusted",
              },
              off_adj_rapm_prod_rank: 24,
              off_orb: {
                value: 0.0173,
              },
              posFreqs: {
                pf: 0,
                c: 0,
                pg: 1,
                sg: 0,
                sf: 0,
              },
              off_ast_rim: {
                value: 0.4558,
              },
              total_off_2prim_attempts: {
                value: 117,
              },
              off_scramble_2p: {
                value: 0.5556,
              },
              def_adj_rapm_prod: {
                old_value: -1.1942,
                override: "Adjusted from Def 3P%",
                value: -1.1114,
              },
              off_2pmidr: {
                value: 0.1826,
              },
              off_adj_prod_rank: 14,
              off_trans_2p: {
                value: 0.5625,
              },
              off_3p_ast: {
                value: 0.625,
              },
              off_scramble_efg: {
                value: 0.6364,
              },
              off_scramble_ftr: {
                value: 0.5455,
              },
              off_scramble_3pr: {
                value: 0.5909,
              },
              off: {
                off_orb: {
                  value: 0.291,
                },
                off_adj_opp: {
                  value: 104.7739,
                },
                def_ast_rim: {
                  value: 0.4314,
                },
                def_3p_ast: {
                  value: 0.7273,
                },
                def_2pmid_ast: {
                  value: 0.2273,
                },
                off_2prim: {
                  value: 0.6383,
                },
                def_to: {
                  value: 0.1753,
                },
                off_efg: {
                  value: 0.5017,
                  old_value: 0.5067,
                  override: "Adjusted from Off 3P%",
                },
                def_orb: {
                  value: 0.1899,
                },
                off_3pr: {
                  value: 0.3571,
                },
                def_2p: {
                  value: 0.4178,
                },
                def_adj_ppp: {
                  value: 86.5679,
                  old_value: 88.6919,
                  override: "Adjusted from Def 3P%",
                },
                def_3p_opp: {
                  value: 27.7277,
                },
                def_efg: {
                  old_value: 0.4547,
                  override: "Adjusted from Def 3P%",
                  value: 0.444,
                },
                off_poss: {
                  value: 275,
                },
                off_2pmid_ast: {
                  value: 0.25,
                },
                def_2pmidr: {
                  value: 0.3045,
                },
                def_ppp: {
                  override: "Adjusted from Def 3P%",
                  value: 87.9702,
                  old_value: 89.6907,
                },
                def_ftr: {
                  value: 0.2469,
                },
                def_2prim_ast: {
                  value: 0.5641,
                },
                off_3p_ast: {
                  value: 0.84,
                },
                def_2pmid: {
                  value: 0.2973,
                },
                def_assist: {
                  value: 0.5284,
                },
                def_3p: {
                  old_value: 0.3402,
                  override: "Luck adjusted",
                  value: 0.3222,
                },
                off_2pmidr: {
                  value: 0.2232,
                },
                off_to: {
                  value: 0.1927,
                },
                def_ft: {
                  value: 0.6667,
                },
                off_net: {
                  value: 29.7267,
                  old_value: 28.9217,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_ast_mid: {
                  value: 0.098,
                },
                off_raw_net: {
                  value: 26.4441,
                  old_value: 26.0438,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                off_ast_3p: {
                  value: 0.4375,
                },
                def_3pr: {
                  value: 0.3992,
                },
                off_2primr: {
                  value: 0.4196,
                },
                off_2p: {
                  value: 0.5278,
                },
                off_ppp: {
                  override: "Adjusted from Off 3P%",
                  value: 104.5761,
                  old_value: 105.0909,
                },
                off_adj_ppp: {
                  old_value: 108.2987,
                  override: "Adjusted from Off 3P%",
                  value: 107.6802,
                },
                off_2prim_ast: {
                  value: 0.3833,
                },
                def_2primr: {
                  value: 0.2963,
                },
                def_adj_opp: {
                  value: 99.1873,
                },
                off_ast_rim: {
                  value: 0.4792,
                },
                def_poss: {
                  value: 291,
                },
                off_3p: {
                  value: 0.3032,
                  old_value: 0.3125,
                  override: "Luck adjusted",
                },
                def_ast_3p: {
                  value: 0.4706,
                },
                off_ast_mid: {
                  value: 0.0833,
                },
                def_2prim: {
                  value: 0.5417,
                },
                off_ft: {
                  value: 0.6889,
                },
                off_2p_ast: {
                  value: 0,
                },
                off_2pmid: {
                  value: 0.32,
                },
                off_assist: {
                  value: 0.4058,
                },
                off_ftr: {
                  value: 0.4018,
                },
                def_2p_ast: {
                  value: 0,
                },
              },
              def_ftr: {
                value: 0.0246,
              },
              off_poss: {
                value: 451.4845,
              },
              off_scramble_2primr: {
                value: 0.2273,
              },
              team: "Maryland",
              def_to: {
                value: 0.0168,
              },
              adj_prod_margin_rank: 21,
              off_trans_2primr: {
                value: 0.5455,
              },
              def_adj_rapm: {
                value: -1.2921,
                override: "Adjusted from Def 3P%",
                old_value: -1.3883,
              },
              off_scramble_2p_ast: {
                value: 0,
              },
              doc_count: 486,
              off_3pr: {
                value: 0.4888,
              },
              off_assist: {
                value: 0.2917,
              },
              adj_rtg_margin_rank: 55,
              def_adj_rapm_prod_rank: 292,
              def_team_poss: {
                value: 1790,
              },
              def_rtg: {
                value: 99.3832,
                old_value: 98.8496,
                override: "Luck adjusted",
              },
              off_trans_2pmid: {
                value: 0.5,
              },
              def_adj_prod_rank: 169,
              on: {
                off_adj_ppp: {
                  value: 114.414,
                  old_value: 113.9948,
                  override: "Adjusted from Off 3P%",
                },
                off_ast_rim: {
                  value: 0.4321,
                },
                def_ft: {
                  value: 0.7031,
                },
                def_3pr: {
                  value: 0.3785,
                },
                off_2prim: {
                  value: 0.6121,
                },
                def_2pmid: {
                  value: 0.3082,
                },
                off_raw_net: {
                  value: 10.5162,
                  old_value: 10.8435,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_2pmidr: {
                  value: 0.3004,
                },
                def_ast_3p: {
                  value: 0.4871,
                },
                off_adj_opp: {
                  value: 108.0397,
                },
                off_ppp: {
                  override: "Adjusted from Off 3P%",
                  value: 107.8821,
                  old_value: 107.4917,
                },
                off_ast_3p: {
                  value: 0.5014,
                },
                def_efg: {
                  value: 0.4659,
                  old_value: 0.4622,
                  override: "Adjusted from Def 3P%",
                },
                def_ppp: {
                  old_value: 97.095,
                  override: "Adjusted from Def 3P%",
                  value: 97.7906,
                },
                off_poss: {
                  value: 1802,
                },
                def_2prim_ast: {
                  value: 0.4358,
                },
                def_2primr: {
                  value: 0.3212,
                },
                def_ast_mid: {
                  value: 0.1433,
                },
                def_adj_opp: {
                  value: 96.622,
                },
                def_to: {
                  value: 0.1743,
                },
                off_2pmidr: {
                  value: 0.1955,
                },
                def_ast_rim: {
                  value: 0.3696,
                },
                off_2p: {
                  value: 0.4971,
                },
                off_2primr: {
                  value: 0.3626,
                },
                off_2prim_ast: {
                  value: 0.4535,
                },
                off_to: {
                  value: 0.1659,
                },
                off_ast_mid: {
                  value: 0.0665,
                },
                off_3p: {
                  override: "Luck adjusted",
                  value: 0.3142,
                  old_value: 0.3109,
                },
                off_efg: {
                  value: 0.4857,
                  old_value: 0.4835,
                  override: "Adjusted from Off 3P%",
                },
                off_2pmid: {
                  value: 0.2838,
                },
                def_ftr: {
                  value: 0.2418,
                },
                def_adj_ppp: {
                  old_value: 92.0553,
                  override: "Adjusted from Def 3P%",
                  value: 92.6431,
                },
                def_orb: {
                  value: 0.274,
                },
                def_2prim: {
                  value: 0.5804,
                },
                off_3p_ast: {
                  value: 0.8498,
                },
                def_3p_opp: {
                  value: 32.3729,
                },
                off_2p_ast: {
                  value: 0,
                },
                off_3pr: {
                  value: 0.4419,
                },
                off_ft: {
                  value: 0.7565,
                },
                off_net: {
                  value: 22.2402,
                  old_value: 22.3985,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                off_assist: {
                  value: 0.5543,
                },
                def_3p_ast: {
                  value: 0.8763,
                },
                def_3p: {
                  old_value: 0.3228,
                  override: "Luck adjusted",
                  value: 0.3293,
                },
                off_orb: {
                  value: 0.315,
                },
                def_2pmid_ast: {
                  value: 0.3401,
                },
                def_poss: {
                  value: 1790,
                },
                off_2pmid_ast: {
                  value: 0.2791,
                },
                def_2p: {
                  value: 0.4488,
                },
                def_2p_ast: {
                  value: 0,
                },
                def_assist: {
                  value: 0.5351,
                },
                off_ftr: {
                  value: 0.3735,
                },
              },
              total_off_3p_attempts: {
                value: 174,
              },
              off_adj_rapm: {
                value: 4.8824,
                old_value: 4.8824,
              },
              total_off_trans_fga: {
                value: 55,
              },
              roster: {
                number: "01",
                height: "6-0",
                year_class: "Sr",
                pos: "G",
                origin: "Bowie, MD",
                ncaa_id: "4066371",
              },
              off_2primr: {
                value: 0.3287,
              },
              year: "2019",
              adj_rapm_prod_margin_rank: 46,
              key: "Cowan, Anthony",
              def_orb: {
                value: 0.096,
              },
              off_trans_3p_ast: {
                value: 0.625,
              },
              off_trans_2p_ast: {
                value: 0,
              },
              off_scramble_3p_ast: {
                value: 0.8333,
              },
              off_ast_3p: {
                value: 0.4762,
              },
              off_adj_rapm_rank: 41,
              off_trans_assist: {
                value: 1.4615,
              },
              off_scramble_2pmid_ast: {
                value: 0,
              },
              off_scramble_2prim_ast: {
                value: 0,
              },
              off_2pmid_ast: {
                value: 0,
              },
              off_trans_3pr: {
                value: 0.4182,
              },
            },
          },
          {
            _index: "hoopexp_men_players_2019_lping",
            _id: "4066371_Men_2019_conf",
            _score: 6.627663,
            _source: {
              "@timestamp": "2025-09-20T21:40:40.214Z",
              off_scramble_ftr: {
                value: 0.6923,
              },
              duration_mins: {
                value: 724.2567,
              },
              off: {
                def_ppp: {
                  old_value: 90.1515,
                  override: "Adjusted from Def 3P%",
                  value: 92.469,
                },
                def_efg: {
                  override: "Adjusted from Def 3P%",
                  value: 0.4415,
                  old_value: 0.4267,
                },
                off_2p_ast: {
                  value: 0,
                },
                def_orb: {
                  value: 0.2267,
                },
                def_2pmidr: {
                  value: 0.3103,
                },
                def_2p_ast: {
                  value: 0,
                },
                def_3pr: {
                  value: 0.3276,
                },
                off_adj_ppp: {
                  value: 106.6119,
                  old_value: 108.7029,
                  override: "Adjusted from Off 3P%",
                },
                off_3p_ast: {
                  value: 0.8,
                },
                off_efg: {
                  value: 0.4868,
                  old_value: 0.5051,
                  override: "Adjusted from Off 3P%",
                },
                off_2pmid: {
                  value: 0.3158,
                },
                off_ast_mid: {
                  value: 0.0455,
                },
                def_poss: {
                  value: 132,
                },
                off_2pmid_ast: {
                  value: 0.1667,
                },
                def_3p: {
                  old_value: 0.2895,
                  override: "Luck adjusted",
                  value: 0.3196,
                },
                def_adj_ppp: {
                  old_value: 83.8047,
                  override: "Adjusted from Def 3P%",
                  value: 85.7156,
                },
                off_orb: {
                  value: 0.2281,
                },
                off_3pr: {
                  value: 0.4184,
                },
                off_to: {
                  value: 0.24,
                },
                off_poss: {
                  value: 125,
                },
                off_2prim: {
                  value: 0.5526,
                },
                off_ft: {
                  value: 0.8571,
                },
                off_ppp: {
                  old_value: 98.4,
                  override: "Adjusted from Off 3P%",
                  value: 96.4655,
                },
                def_3p_ast: {
                  value: 0.7273,
                },
                off_adj_opp: {
                  value: 111.2364,
                },
                def_2primr: {
                  value: 0.3621,
                },
                off_ast_rim: {
                  value: 0.4091,
                },
                def_2pmid_ast: {
                  value: 0.3333,
                },
                def_assist: {
                  value: 0.5084,
                },
                def_adj_opp: {
                  value: 93.3512,
                },
                def_2pmid: {
                  value: 0.3333,
                },
                def_3p_opp: {
                  value: 28.94,
                },
                def_2prim_ast: {
                  value: 0.5714,
                },
                def_ft: {
                  value: 0.7692,
                },
                def_2prim: {
                  value: 0.5,
                },
                def_ast_rim: {
                  value: 0.5,
                },
                def_ftr: {
                  value: 0.2241,
                },
                def_ast_3p: {
                  value: 0.3333,
                },
                off_2pmidr: {
                  value: 0.1939,
                },
                off_ftr: {
                  value: 0.2857,
                },
                def_2p: {
                  value: 0.4231,
                },
                off_raw_net: {
                  old_value: 23.1953,
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 17.0663,
                },
                def_to: {
                  value: 0.1591,
                },
                def_ast_mid: {
                  value: 0.1667,
                },
                off_2prim_ast: {
                  value: 0.4286,
                },
                off_net: {
                  value: 34.1018,
                  old_value: 39.7067,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                off_2primr: {
                  value: 0.3878,
                },
                off_assist: {
                  value: 0.4477,
                },
                off_2p: {
                  value: 0.4737,
                },
                off_3p: {
                  value: 0.3367,
                  old_value: 0.3659,
                  override: "Luck adjusted",
                },
                off_ast_3p: {
                  value: 0.5455,
                },
              },
              total_off_3p_attempts: {
                value: 117,
              },
              posClass: "s-PG",
              code: "AnCowan",
              off_team_poss: {
                value: 1182,
              },
              key: "Cowan, Anthony",
              off_2pmid_ast: {
                value: 0,
              },
              roster: {
                height: "6-0",
                year_class: "Sr",
                pos: "G",
                origin: "Bowie, MD",
                ncaa_id: "4066371",
                number: "01",
              },
              off_scramble_efg: {
                value: 0.6538,
              },
              off_2pmidr: {
                value: 0.1861,
              },
              conf: "Big Ten Conference",
              off_scramble_2pmid_ast: {
                value: 0,
              },
              off_trans_ft: {
                value: 0.8182,
              },
              posFreqs: {
                pf: 0,
                c: 0,
                pg: 1,
                sg: 0,
                sf: 0,
              },
              team: "Maryland",
              def_adj_rapm_rank: 540,
              off_scramble_3p: {
                value: 0.5,
              },
              off_2prim: {
                value: 0.5634,
              },
              off_scramble_2p_ast: {
                value: 0,
              },
              adj_prod_margin_rank: 26,
              adj_rapm_prod_margin_rank: 52,
              off_2p: {
                value: 0.4649,
              },
              off_adj_prod: {
                value: 5.2474,
              },
              off_adj_rtg_rank: 40,
              style: {
                "Attack & Kick": {
                  pts: {
                    value: 0.8872,
                  },
                  possPctUsg: {
                    value: 0.0721,
                  },
                  adj_pts: {
                    value: 0.962,
                  },
                  possPct: {
                    value: 0.187,
                  },
                },
                "Hits Cutter": {
                  adj_pts: {
                    value: 1.1548,
                  },
                  possPct: {
                    value: 0.067,
                  },
                  pts: {
                    value: 1.0649,
                  },
                  possPctUsg: {
                    value: 0.0258,
                  },
                },
                "Put-Back": {
                  possPct: {
                    value: 0.0327,
                  },
                  pts: {
                    value: 1.4472,
                  },
                  possPctUsg: {
                    value: 0.0126,
                  },
                  adj_pts: {
                    value: 1.5693,
                  },
                },
                "Rim Attack": {
                  pts: {
                    value: 0.9564,
                  },
                  possPctUsg: {
                    value: 0.0868,
                  },
                  adj_pts: {
                    value: 1.0371,
                  },
                  possPct: {
                    value: 0.225,
                  },
                },
                "Post-Up": {
                  possPct: {
                    value: 0.0036,
                  },
                  pts: {
                    value: 0.6175,
                  },
                  possPctUsg: {
                    value: 0.0014,
                  },
                  adj_pts: {
                    value: 0.6696,
                  },
                },
                "PnR Passer": {
                  possPctUsg: {
                    value: 0.0298,
                  },
                  adj_pts: {
                    value: 1.3425,
                  },
                  possPct: {
                    value: 0.0773,
                  },
                  pts: {
                    value: 1.238,
                  },
                },
                "Backdoor Cut": {
                  pts: {
                    value: 1.3718,
                  },
                  possPctUsg: {
                    value: 0.0143,
                  },
                  adj_pts: {
                    value: 1.4875,
                  },
                  possPct: {
                    value: 0.037,
                  },
                },
                "Post & Kick": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Big Cut & Roll": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "High-Low": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Pick & Pop": {
                  adj_pts: {
                    value: 0,
                  },
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                },
                "Dribble Jumper": {
                  possPct: {
                    value: 0.0738,
                  },
                  pts: {
                    value: 0.6929,
                  },
                  possPctUsg: {
                    value: 0.0285,
                  },
                  adj_pts: {
                    value: 0.7514,
                  },
                },
                "Perimeter Sniper": {
                  pts: {
                    value: 0.8173,
                  },
                  possPctUsg: {
                    value: 0.0456,
                  },
                  adj_pts: {
                    value: 0.8863,
                  },
                  possPct: {
                    value: 0.1182,
                  },
                },
                "Mid-Range": {
                  adj_pts: {
                    value: 0.6753,
                  },
                  possPct: {
                    value: 0.0569,
                  },
                  pts: {
                    value: 0.6228,
                  },
                  possPctUsg: {
                    value: 0.022,
                  },
                },
                Transition: {
                  adj_pts: {
                    value: 1.4205,
                  },
                  possPct: {
                    value: 0.1215,
                  },
                  pts: {
                    value: 1.3099,
                  },
                  possPctUsg: {
                    value: 0.0469,
                  },
                },
              },
              def_to: {
                value: 0.0136,
              },
              year: "2019",
              ecs: {
                version: "1.8.0",
              },
              adj_rtg_margin_rank: 69,
              off_scramble_3pr: {
                value: 0.4615,
              },
              def_orb: {
                value: 0.1041,
              },
              off_trans_2p: {
                value: 0.4615,
              },
              off_2prim_ast: {
                value: 0.2,
              },
              off_rtg: {
                value: 113.503,
              },
              def_ftr: {
                value: 0.0257,
              },
              rapm: {
                def_2pmidr: {
                  value: 0.0064,
                },
                off_ftr: {
                  value: 0.0327,
                },
                off_2pmidr: {
                  value: -0.0159,
                },
                off_3p: {
                  old_value: -0.0051,
                  value: -0.0051,
                  override: "Luck adjusted",
                },
                def_2pmid: {
                  value: -0.0051,
                },
                def_3pr: {
                  value: 0,
                },
                off_poss: {
                  value: 1304,
                },
                def_orb: {
                  value: 0.0097,
                },
                off_assist: {
                  value: 0.0391,
                },
                off_2pmid: {
                  value: -0.0149,
                },
                def_2prim: {
                  value: 0.0074,
                },
                def_poss: {
                  value: 1303,
                },
                off_adj_ppp: {
                  value: 5.2572,
                  old_value: 5.2572,
                },
                def_2primr: {
                  value: 0.0032,
                },
                off_orb: {
                  value: -0.004,
                },
                def_adj_ppp: {
                  value: -0.5644,
                  override: "Adjusted from Def 3P%",
                  old_value: -0.6019,
                },
                off_2prim: {
                  value: 0.0015,
                },
                def_assist: {
                  value: 0.0085,
                },
                off_3pr: {
                  value: 0.0564,
                },
                off_2primr: {
                  value: -0.0196,
                },
                off_to: {
                  value: -0.0123,
                },
                def_efg: {
                  value: 0.0091,
                  override: "Adjusted from Def 3P%",
                  old_value: 0.0099,
                },
                off_2p: {
                  value: 0.0023,
                },
                def_3p: {
                  value: 0.0028,
                  override: "Luck adjusted",
                  old_value: 0.0033,
                },
                def_2p: {
                  value: 0.0052,
                },
                def_ftr: {
                  value: -0.0135,
                },
                off_efg: {
                  value: -0.0008,
                  override: "Adjusted from Off 3P%",
                  old_value: -0.0008,
                },
                def_to: {
                  value: -0.0044,
                },
              },
              def_2prim: {
                value: 0.0029,
              },
              off_trans_2prim: {
                value: 0.5,
              },
              total_off_2prim_attempts: {
                value: 71,
              },
              off_scramble_2pmid: {
                value: 0.3333,
              },
              off_ast_mid: {
                value: 0.0686,
              },
              off_scramble_2prim: {
                value: 0.75,
              },
              off_3p_ast: {
                value: 0.6471,
              },
              off_scramble_assist: {
                value: 1.1429,
              },
              off_adj_rapm: {
                old_value: 5.2572,
                value: 5.2572,
              },
              posConfidences: {
                pg: 1,
                sg: 0,
                sf: 0,
                pf: 0,
                c: 0,
              },
              off_trans_2primr: {
                value: 0.4615,
              },
              off_ast_rim: {
                value: 0.451,
              },
              doc_count: 319,
              def_adj_rtg: {
                value: -1.0835,
                old_value: -1.1612,
                override: "Luck adjusted",
              },
              off_3p: {
                value: 0.2906,
              },
              off_scramble_2p: {
                value: 0.5714,
              },
              off_trans_2prim_ast: {
                value: 0.1667,
              },
              total_off_2pmid_attempts: {
                value: 43,
              },
              off_trans_2p_ast: {
                value: 0,
              },
              off_team_poss_pct: {
                value: 0.9044,
              },
              off_scramble_3p_ast: {
                value: 0.6667,
              },
              off_scramble_2pmidr: {
                value: 0.2308,
              },
              off_scramble_2prim_ast: {
                value: 0,
              },
              off_assist: {
                value: 0.3129,
              },
              input: {
                type: "log",
              },
              host: {
                name: "Alexs-MacBook-Pro.local",
              },
              off_2primr: {
                value: 0.3074,
              },
              off_ft: {
                value: 0.8239,
              },
              off_trans_2pmid: {
                value: 0,
              },
              off_efg: {
                value: 0.4502,
              },
              def_adj_rapm_prod_rank: 453,
              agent: {
                name: "Alexs-MacBook-Pro.local",
                type: "filebeat",
                version: "7.13.2",
                hostname: "Alexs-MacBook-Pro.local",
                ephemeral_id: "1eb70fb5-04db-42bf-8304-86954c33ead3",
                id: "8545ea76-452d-4b24-8194-b0e7c449257b",
              },
              off_orb: {
                value: 0.0201,
              },
              off_scramble_ft: {
                value: 0.8889,
              },
              off_scramble_2primr: {
                value: 0.3077,
              },
              total_off_trans_to: {
                value: 12,
              },
              total_off_trans_fga: {
                value: 26,
              },
              off_trans_2pmidr: {
                value: 0.0385,
              },
              def_adj_opp: {
                value: 94.4333,
              },
              off_2p_ast: {
                value: 0,
              },
              off_to: {
                value: 0.1502,
              },
              total_off_scramble_fga: {
                value: 13,
              },
              off_trans_3p: {
                value: 0.3846,
              },
              off_usage: {
                value: 0.2615,
              },
              off_poss: {
                value: 299.6952,
              },
              off_3pr: {
                value: 0.5065,
              },
              sample_name: "conf",
              def_team_poss: {
                value: 1173,
              },
              def_adj_rapm: {
                override: "Adjusted from Def 3P%",
                old_value: -0.6019,
                value: -0.5644,
              },
              off_trans_2pmid_ast: {
                value: 0,
              },
              def_adj_prod_rank: 284,
              off_trans_3pr: {
                value: 0.5,
              },
              on: {
                def_3p: {
                  old_value: 0.3272,
                  override: "Luck adjusted",
                  value: 0.3314,
                },
                def_ft: {
                  value: 0.7256,
                },
                def_assist: {
                  value: 0.535,
                },
                def_2prim: {
                  value: 0.5831,
                },
                def_2pmidr: {
                  value: 0.2967,
                },
                def_adj_ppp: {
                  value: 95.5875,
                  old_value: 95.1298,
                  override: "Adjusted from Def 3P%",
                },
                def_3pr: {
                  value: 0.3587,
                },
                off_ast_rim: {
                  value: 0.4333,
                },
                def_3p_ast: {
                  value: 0.912,
                },
                def_2prim_ast: {
                  value: 0.4439,
                },
                off_orb: {
                  value: 0.287,
                },
                off_ppp: {
                  override: "Adjusted from Off 3P%",
                  value: 106.5757,
                  old_value: 105.8376,
                },
                off_ftr: {
                  value: 0.364,
                },
                off_net: {
                  value: 19.9681,
                  old_value: 19.7764,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_ast_3p: {
                  value: 0.4672,
                },
                off_assist: {
                  value: 0.564,
                },
                off_ast_mid: {
                  value: 0.0583,
                },
                off_2p: {
                  value: 0.4991,
                },
                off_2p_ast: {
                  value: 0,
                },
                def_2pmid: {
                  value: 0.3354,
                },
                def_to: {
                  value: 0.1577,
                },
                off_ft: {
                  value: 0.7663,
                },
                off_2primr: {
                  value: 0.3501,
                },
                off_to: {
                  value: 0.1574,
                },
                off_3pr: {
                  value: 0.4649,
                },
                def_ast_rim: {
                  value: 0.3893,
                },
                def_efg: {
                  old_value: 0.4765,
                  override: "Adjusted from Def 3P%",
                  value: 0.4788,
                },
                def_2p: {
                  value: 0.4685,
                },
                off_2pmid_ast: {
                  value: 0.2414,
                },
                def_adj_opp: {
                  value: 94.424,
                },
                off_2prim_ast: {
                  value: 0.4906,
                },
                off_raw_net: {
                  value: 2.8768,
                  old_value: 2.8854,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_ppp: {
                  old_value: 102.9838,
                  override: "Adjusted from Def 3P%",
                  value: 103.4852,
                },
                def_ast_mid: {
                  value: 0.1434,
                },
                off_3p_ast: {
                  value: 0.8531,
                },
                off_2prim: {
                  value: 0.5989,
                },
                def_2primr: {
                  value: 0.3446,
                },
                off_poss: {
                  value: 1182,
                },
                def_3p_opp: {
                  value: 32.5456,
                },
                def_orb: {
                  value: 0.291,
                },
                off_adj_ppp: {
                  old_value: 114.843,
                  override: "Adjusted from Off 3P%",
                  value: 115.6544,
                },
                def_poss: {
                  value: 1173,
                },
                off_adj_opp: {
                  value: 110.8066,
                },
                def_2p_ast: {
                  value: 0,
                },
                off_2pmid: {
                  value: 0.3102,
                },
                off_3p: {
                  old_value: 0.3043,
                  override: "Luck adjusted",
                  value: 0.3099,
                },
                off_2pmidr: {
                  value: 0.185,
                },
                def_2pmid_ast: {
                  value: 0.3302,
                },
                def_ftr: {
                  value: 0.2498,
                },
                off_efg: {
                  value: 0.4831,
                  old_value: 0.4792,
                  override: "Adjusted from Off 3P%",
                },
                off_ast_3p: {
                  value: 0.5083,
                },
              },
              off_adj_rapm_rank: 47,
              adj_rapm_margin_rank: 109,
              off_adj_rtg: {
                value: 5.8024,
              },
              off_trans_3p_ast: {
                value: 0.6,
              },
              off_adj_prod_rank: 17,
              total_off_scramble_to: {
                value: 0,
              },
              off_adj_opp: {
                value: 110.8066,
              },
              off_adj_rapm_prod: {
                value: 4.9204,
              },
              off_trans_efg: {
                value: 0.5192,
              },
              def_team_poss_pct: {
                value: 0.8989,
              },
              total_off_2p_attempts: {
                value: 114,
              },
              def_rtg: {
                value: 104.9445,
                old_value: 104.5238,
                override: "Luck adjusted",
              },
              off_2pmid: {
                value: 0.3023,
              },
              off_adj_rapm_prod_rank: 23,
              def_adj_rtg_rank: 461,
              def_adj_rapm_prod: {
                old_value: -0.541,
                override: "Adjusted from Def 3P%",
                value: -0.5073,
              },
              off_trans_ftr: {
                value: 2.1154,
              },
              log: {
                file: {
                  path: "/Users/alex/personal/github/cbb-data/cbb/men_playerproc_1758404434_conf.ndjson",
                },
                offset: 1124579,
              },
              def_adj_prod: {
                value: -0.9739,
                old_value: -1.0438,
                override: "Luck adjusted",
              },
              off_ast_3p: {
                value: 0.4804,
              },
              off_trans_assist: {
                value: 1.7273,
              },
              off_ftr: {
                value: 0.6147,
              },
            },
          },
          {
            _index: "hoopexp_men_players_2018_lping",
            _id: "4066371_Men_2018_conf",
            _score: 6.621976,
            _source: {
              "@timestamp": "2025-09-20T21:39:54.840Z",
              def_orb: {
                value: 0.0966,
              },
              agent: {
                name: "Alexs-MacBook-Pro.local",
                type: "filebeat",
                version: "7.13.2",
                hostname: "Alexs-MacBook-Pro.local",
                ephemeral_id: "d28f8520-798c-4bb8-97bd-a41fd0625c06",
                id: "8545ea76-452d-4b24-8194-b0e7c449257b",
              },
              off_scramble_2p_ast: {
                value: 0,
              },
              off_2p: {
                value: 0.4179,
              },
              roster: {
                pos: "G",
                origin: "Bowie, MD",
                ncaa_id: "4066371",
                number: "01",
                height: "6-0",
                year_class: "Jr",
              },
              def_team_poss: {
                value: 1194,
              },
              off_trans_ft: {
                value: 0.7241,
              },
              posFreqs: {
                sf: 0,
                pf: 0,
                c: 0,
                pg: 1,
                sg: 0,
              },
              total_off_2pmid_attempts: {
                value: 60,
              },
              off_adj_rapm_prod: {
                value: 3.8133,
              },
              off_trans_2p: {
                value: 0.52,
              },
              on: {
                off_2pmid_ast: {
                  value: 0.2152,
                },
                off_ast_3p: {
                  value: 0.4978,
                },
                def_2primr: {
                  value: 0.3201,
                },
                def_to: {
                  value: 0.1258,
                },
                off_2prim: {
                  value: 0.5674,
                },
                def_ast_mid: {
                  value: 0.1062,
                },
                off_2pmid: {
                  value: 0.3305,
                },
                def_adj_ppp: {
                  value: 94.7714,
                  old_value: 92.9386,
                  override: "Adjusted from Def 3P%",
                },
                off_adj_opp: {
                  value: 112.7064,
                },
                off_2pmidr: {
                  value: 0.2376,
                },
                off_3pr: {
                  value: 0.3787,
                },
                def_3p_ast: {
                  value: 0.7956,
                },
                off_2p: {
                  value: 0.4768,
                },
                def_2p: {
                  value: 0.4388,
                },
                def_ppp: {
                  old_value: 100.4195,
                  override: "Adjusted from Def 3P%",
                  value: 102.4077,
                },
                def_poss: {
                  value: 1192,
                },
                off_2p_ast: {
                  value: 0,
                },
                def_2p_ast: {
                  value: 0,
                },
                off_poss: {
                  value: 1198,
                },
                off_ast_mid: {
                  value: 0.0762,
                },
                off_adj_ppp: {
                  value: 115.6283,
                  old_value: 115.5504,
                  override: "Adjusted from Off 3P%",
                },
                off_to: {
                  value: 0.202,
                },
                def_ftr: {
                  value: 0.2832,
                },
                def_ft: {
                  value: 0.7166,
                },
                def_efg: {
                  value: 0.4633,
                  old_value: 0.4506,
                  override: "Adjusted from Def 3P%",
                },
                off_2primr: {
                  value: 0.3837,
                },
                off_ast_rim: {
                  value: 0.426,
                },
                def_2prim: {
                  value: 0.5677,
                },
                def_2pmid: {
                  value: 0.2886,
                },
                def_ast_3p: {
                  value: 0.4823,
                },
                def_3p: {
                  value: 0.3328,
                  old_value: 0.3121,
                  override: "Luck adjusted",
                },
                def_2pmid_ast: {
                  value: 0.2791,
                },
                def_3p_opp: {
                  value: 34.0453,
                },
                def_ast_rim: {
                  value: 0.4115,
                },
                off_net: {
                  value: 20.858,
                  old_value: 22.4956,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                off_efg: {
                  value: 0.4994,
                  old_value: 0.499,
                  override: "Adjusted from Off 3P%",
                },
                def_2pmidr: {
                  value: 0.2749,
                },
                def_3pr: {
                  value: 0.405,
                },
                def_orb: {
                  value: 0.2609,
                },
                off_3p: {
                  old_value: 0.357,
                  override: "Luck adjusted",
                  value: 0.3576,
                },
                off_3p_ast: {
                  value: 0.8162,
                },
                off_ft: {
                  value: 0.7761,
                },
                off_2prim_ast: {
                  value: 0.4338,
                },
                off_ftr: {
                  value: 0.3241,
                },
                off_orb: {
                  value: 0.324,
                },
                off_ppp: {
                  old_value: 104.9249,
                  override: "Adjusted from Off 3P%",
                  value: 104.9926,
                },
                def_adj_opp: {
                  value: 94.7181,
                },
                def_assist: {
                  value: 0.5308,
                },
                off_assist: {
                  value: 0.5016,
                },
                def_2prim_ast: {
                  value: 0.4721,
                },
                off_raw_net: {
                  value: 2.5683,
                  old_value: 4.3548,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
              },
              def_adj_rtg_rank: 310,
              off_scramble_2p: {
                value: 0,
              },
              def_adj_rapm_prod: {
                value: -1.7791,
                old_value: -2.1672,
                override: "Adjusted from Def 3P%",
              },
              off_2pmid: {
                value: 0.3167,
              },
              adj_prod_margin_rank: 76,
              off_scramble_assist: {
                value: 1,
              },
              off_to: {
                value: 0.1992,
              },
              off_trans_2prim: {
                value: 0.5556,
              },
              off_rtg: {
                value: 104.3876,
              },
              off_scramble_3pr: {
                value: 0.8235,
              },
              adj_rapm_prod_margin_rank: 59,
              off_scramble_ft: {
                value: 0.6,
              },
              off_scramble_2prim_ast: {
                value: 0,
              },
              off_3pr: {
                value: 0.4924,
              },
              off_3p_ast: {
                value: 0.6889,
              },
              off_efg: {
                value: 0.4678,
              },
              off_scramble_2primr: {
                value: 0.1176,
              },
              def_adj_rapm: {
                override: "Adjusted from Def 3P%",
                old_value: -2.4485,
                value: -2.0101,
              },
              off_trans_assist: {
                value: 1.6471,
              },
              off_2pmid_ast: {
                value: 0.1579,
              },
              off_adj_rtg: {
                value: 3.9792,
              },
              off_adj_prod_rank: 79,
              duration_mins: {
                value: 740.4333,
              },
              off_team_poss_pct: {
                value: 0.8882,
              },
              off_trans_3pr: {
                value: 0.3056,
              },
              off_scramble_ftr: {
                value: 0.2941,
              },
              off_scramble_3p_ast: {
                value: 1,
              },
              off_trans_efg: {
                value: 0.5278,
              },
              ecs: {
                version: "1.8.0",
              },
              off_scramble_2pmid: {
                value: 0,
              },
              def_rtg: {
                override: "Luck adjusted",
                value: 104.2907,
                old_value: 102.2693,
              },
              off_ast_3p: {
                value: 0.4333,
              },
              style: {
                "High-Low": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Mid-Range": {
                  possPct: {
                    value: 0.0668,
                  },
                  pts: {
                    value: 0.6251,
                  },
                  possPctUsg: {
                    value: 0.0243,
                  },
                  adj_pts: {
                    value: 0.6882,
                  },
                },
                "Post-Up": {
                  pts: {
                    value: 0.6231,
                  },
                  possPctUsg: {
                    value: 0.0033,
                  },
                  adj_pts: {
                    value: 0.686,
                  },
                  possPct: {
                    value: 0.0089,
                  },
                },
                "Dribble Jumper": {
                  pts: {
                    value: 0.9413,
                  },
                  possPctUsg: {
                    value: 0.0273,
                  },
                  adj_pts: {
                    value: 1.0363,
                  },
                  possPct: {
                    value: 0.075,
                  },
                },
                Transition: {
                  possPctUsg: {
                    value: 0.0484,
                  },
                  adj_pts: {
                    value: 1.2508,
                  },
                  possPct: {
                    value: 0.1329,
                  },
                  pts: {
                    value: 1.1361,
                  },
                },
                "Attack & Kick": {
                  adj_pts: {
                    value: 1.1699,
                  },
                  possPct: {
                    value: 0.1206,
                  },
                  pts: {
                    value: 1.0626,
                  },
                  possPctUsg: {
                    value: 0.0439,
                  },
                },
                "Post & Kick": {
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                  possPct: {
                    value: 0,
                  },
                },
                "Backdoor Cut": {
                  possPct: {
                    value: 0.037,
                  },
                  pts: {
                    value: 1.2601,
                  },
                  possPctUsg: {
                    value: 0.0135,
                  },
                  adj_pts: {
                    value: 1.3873,
                  },
                },
                "Perimeter Sniper": {
                  possPctUsg: {
                    value: 0.052,
                  },
                  adj_pts: {
                    value: 1.135,
                  },
                  possPct: {
                    value: 0.1426,
                  },
                  pts: {
                    value: 1.031,
                  },
                },
                "Pick & Pop": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "PnR Passer": {
                  possPct: {
                    value: 0.0829,
                  },
                  pts: {
                    value: 1.0119,
                  },
                  possPctUsg: {
                    value: 0.0302,
                  },
                  adj_pts: {
                    value: 1.1141,
                  },
                },
                "Rim Attack": {
                  possPct: {
                    value: 0.2446,
                  },
                  pts: {
                    value: 0.8398,
                  },
                  possPctUsg: {
                    value: 0.0891,
                  },
                  adj_pts: {
                    value: 0.9246,
                  },
                },
                "Hits Cutter": {
                  possPctUsg: {
                    value: 0.0185,
                  },
                  adj_pts: {
                    value: 1.0743,
                  },
                  possPct: {
                    value: 0.0508,
                  },
                  pts: {
                    value: 0.9758,
                  },
                },
                "Big Cut & Roll": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Put-Back": {
                  possPct: {
                    value: 0.038,
                  },
                  pts: {
                    value: 0.7742,
                  },
                  possPctUsg: {
                    value: 0.0138,
                  },
                  adj_pts: {
                    value: 0.8523,
                  },
                },
              },
              off_trans_2prim_ast: {
                value: 0.2,
              },
              off_trans_2pmid_ast: {
                value: 0,
              },
              total_off_3p_attempts: {
                value: 130,
              },
              total_off_trans_fga: {
                value: 36,
              },
              off_2p_ast: {
                value: 0,
              },
              off_usage: {
                value: 0.2674,
              },
              off_2primr: {
                value: 0.2803,
              },
              sample_name: "conf",
              total_off_scramble_to: {
                value: 0,
              },
              off_trans_2pmidr: {
                value: 0.1944,
              },
              off_2pmidr: {
                value: 0.2273,
              },
              total_off_scramble_fga: {
                value: 17,
              },
              def_adj_prod_rank: 156,
              off_scramble_2prim: {
                value: 0,
              },
              def_adj_rapm_prod_rank: 121,
              def_adj_rtg: {
                value: -1.5571,
                old_value: -1.9312,
                override: "Luck adjusted",
              },
              off_trans_2p_ast: {
                value: 0,
              },
              off_ft: {
                value: 0.8058,
              },
              off_adj_rtg_rank: 131,
              off_trans_3p_ast: {
                value: 0.5,
              },
              off_adj_rapm: {
                value: 4.2821,
                old_value: 4.2821,
              },
              total_off_2p_attempts: {
                value: 134,
              },
              def_adj_opp: {
                value: 94.7379,
              },
              off_trans_3p: {
                value: 0.3636,
              },
              off: {
                off_assist: {
                  value: 0.4823,
                },
                off_3p_ast: {
                  value: 0.8667,
                },
                off_2p_ast: {
                  value: 0,
                },
                off_2p: {
                  value: 0.4634,
                },
                def_2primr: {
                  value: 0.3731,
                },
                def_ast_mid: {
                  value: 0.0303,
                },
                def_orb: {
                  value: 0.1728,
                },
                def_efg: {
                  value: 0.5025,
                  old_value: 0.4963,
                  override: "Adjusted from Def 3P%",
                },
                off_ast_mid: {
                  value: 0.0714,
                },
                off_to: {
                  value: 0.2418,
                },
                def_3p_opp: {
                  value: 30.505,
                },
                def_ft: {
                  value: 0.6765,
                },
                off_raw_net: {
                  value: 2.506,
                  old_value: 4.3373,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_ast_3p: {
                  value: 0.4242,
                },
                def_2p: {
                  value: 0.5116,
                },
                def_3p: {
                  value: 0.324,
                  old_value: 0.3125,
                  override: "Luck adjusted",
                },
                def_2p_ast: {
                  value: 0,
                },
                def_poss: {
                  value: 157,
                },
                off_adj_opp: {
                  value: 110.1471,
                },
                def_2pmidr: {
                  value: 0.2687,
                },
                off_net: {
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 15.9835,
                  old_value: 17.8879,
                },
                def_assist: {
                  value: 0.5368,
                },
                off_2pmid: {
                  value: 0.3125,
                },
                off_3pr: {
                  value: 0.3167,
                },
                off_efg: {
                  value: 0.5002,
                  old_value: 0.5042,
                  override: "Adjusted from Off 3P%",
                },
                def_ppp: {
                  value: 100.3765,
                  old_value: 99.3631,
                  override: "Adjusted from Def 3P%",
                },
                off_2prim_ast: {
                  value: 0.4643,
                },
                off_ppp: {
                  override: "Adjusted from Off 3P%",
                  value: 94.3839,
                  old_value: 94.7712,
                },
                def_2pmid: {
                  value: 0.3056,
                },
                def_adj_opp: {
                  value: 94.7895,
                },
                def_ast_rim: {
                  value: 0.5455,
                },
                def_to: {
                  value: 0.1529,
                },
                def_adj_ppp: {
                  value: 96.2596,
                  old_value: 95.3379,
                  override: "Adjusted from Def 3P%",
                },
                off_ftr: {
                  value: 0.2833,
                },
                off_2primr: {
                  value: 0.4167,
                },
                off_2pmidr: {
                  value: 0.2667,
                },
                off_ast_3p: {
                  value: 0.4643,
                },
                def_ftr: {
                  value: 0.2537,
                },
                off_orb: {
                  value: 0.2468,
                },
                def_2pmid_ast: {
                  value: 0.0909,
                },
                off_ft: {
                  value: 0.7059,
                },
                off_ast_rim: {
                  value: 0.4643,
                },
                off_3p: {
                  value: 0.3864,
                  old_value: 0.3947,
                  override: "Luck adjusted",
                },
                def_2prim: {
                  value: 0.66,
                },
                def_2prim_ast: {
                  value: 0.5455,
                },
                off_2prim: {
                  value: 0.56,
                },
                def_3p_ast: {
                  value: 0.9333,
                },
                def_3pr: {
                  value: 0.3582,
                },
                off_2pmid_ast: {
                  value: 0.2,
                },
                off_poss: {
                  value: 153,
                },
                off_adj_ppp: {
                  old_value: 104.814,
                  override: "Adjusted from Off 3P%",
                  value: 104.2077,
                },
              },
              off_orb: {
                value: 0.0082,
              },
              off_scramble_3p: {
                value: 0.2857,
              },
              off_scramble_efg: {
                value: 0.3529,
              },
              def_ftr: {
                value: 0.0293,
              },
              off_team_poss: {
                value: 1200,
              },
              off_trans_ftr: {
                value: 0.8056,
              },
              off_scramble_2pmidr: {
                value: 0.0588,
              },
              off_trans_2pmid: {
                value: 0.4286,
              },
              off_ast_rim: {
                value: 0.5,
              },
              log: {
                offset: 853357,
                file: {
                  path: "/Users/alex/personal/github/cbb-data/cbb/men_playerproc_1758404389_conf.ndjson",
                },
              },
              off_scramble_2pmid_ast: {
                value: 0,
              },
              year: "2018",
              off_poss: {
                value: 311.2869,
              },
              adj_rapm_margin_rank: 83,
              def_2prim: {
                value: 0.0093,
              },
              def_team_poss_pct: {
                value: 0.8851,
              },
              off_adj_rapm_prod_rank: 60,
              off_2prim_ast: {
                value: 0.2162,
              },
              input: {
                type: "log",
              },
              posConfidences: {
                pg: 1,
                sg: 0,
                sf: 0,
                pf: 0,
                c: 0,
              },
              total_off_trans_to: {
                value: 18,
              },
              host: {
                name: "Alexs-MacBook-Pro.local",
              },
              off_assist: {
                value: 0.2703,
              },
              adj_rtg_margin_rank: 139,
              off_adj_opp: {
                value: 112.7034,
              },
              conf: "Big Ten Conference",
              def_adj_rapm_rank: 214,
              off_adj_rapm_rank: 83,
              off_ast_mid: {
                value: 0.0667,
              },
              off_ftr: {
                value: 0.3902,
              },
              rapm: {
                off_poss: {
                  value: 1349,
                },
                off_adj_ppp: {
                  old_value: 4.2821,
                  value: 4.2821,
                },
                def_2p: {
                  value: -0.0047,
                },
                off_3p: {
                  value: 0.0077,
                  override: "Luck adjusted",
                  old_value: 0.0077,
                },
                off_2p: {
                  value: -0.0049,
                },
                off_efg: {
                  value: 0.0011,
                  override: "Adjusted from Off 3P%",
                  old_value: 0.0011,
                },
                off_2primr: {
                  value: -0.0158,
                },
                def_efg: {
                  value: -0.0007,
                  override: "Adjusted from Def 3P%",
                  old_value: -0.0007,
                },
                off_assist: {
                  value: 0.0159,
                },
                def_adj_ppp: {
                  old_value: -2.4485,
                  value: -2.0101,
                  override: "Adjusted from Def 3P%",
                },
                def_3pr: {
                  value: 0.0082,
                },
                off_orb: {
                  value: 0.0037,
                },
                off_2pmidr: {
                  value: -0.0122,
                },
                off_2prim: {
                  value: -0.0142,
                },
                def_ftr: {
                  value: -0.0008,
                },
                def_assist: {
                  value: 0.0064,
                },
                def_orb: {
                  value: 0.0013,
                },
                off_to: {
                  value: -0.0015,
                },
                off_ftr: {
                  value: 0.0069,
                },
                off_3pr: {
                  value: 0.0423,
                },
                def_to: {
                  value: -0.0074,
                },
                off_2pmid: {
                  value: 0.0003,
                },
                def_2pmidr: {
                  value: 0.006,
                },
                def_3p: {
                  value: 0.0075,
                  override: "Luck adjusted",
                  old_value: 0.0075,
                },
                def_2pmid: {
                  value: -0.0072,
                },
                def_2primr: {
                  value: -0.0033,
                },
                def_poss: {
                  value: 1344,
                },
                def_2prim: {
                  value: -0.0024,
                },
              },
              posClass: "s-PG",
              off_3p: {
                value: 0.3462,
              },
              def_adj_prod: {
                value: -1.3782,
                old_value: -1.7093,
                override: "Luck adjusted",
              },
              team: "Maryland",
              off_2prim: {
                value: 0.5,
              },
              off_trans_2primr: {
                value: 0.5,
              },
              doc_count: 388,
              total_off_2prim_attempts: {
                value: 74,
              },
              key: "Cowan, Anthony",
              off_adj_prod: {
                value: 3.5344,
              },
              def_to: {
                value: 0.0151,
              },
              code: "AnCowan",
            },
          },
          {
            _index: "hoopexp_men_players_2018_lping",
            _id: "4066371_Men_2018_all",
            _score: 6.621976,
            _source: {
              "@timestamp": "2025-09-20T21:39:54.848Z",
              def_adj_prod_rank: 205,
              log: {
                offset: 1012354,
                file: {
                  path: "/Users/alex/personal/github/cbb-data/cbb/men_playerproc_1758404389_all.ndjson",
                },
              },
              off_assist: {
                value: 0.253,
              },
              off_adj_rapm: {
                value: 3.965,
                old_value: 3.965,
              },
              off_scramble_2p: {
                value: 0.2222,
              },
              off_scramble_ft: {
                value: 0.6,
              },
              on: {
                def_2p: {
                  value: 0.4425,
                },
                off_2p: {
                  value: 0.5143,
                },
                def_ftr: {
                  value: 0.2655,
                },
                def_adj_opp: {
                  value: 98.8056,
                },
                off_2p_ast: {
                  value: 0,
                },
                off_2pmid_ast: {
                  value: 0.2256,
                },
                off_raw_net: {
                  value: 10.049,
                  old_value: 11.5175,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_2pmid_ast: {
                  value: 0.2857,
                },
                off_net: {
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 21.8999,
                  old_value: 23.1869,
                },
                off_adj_opp: {
                  value: 110.3883,
                },
                off_2prim_ast: {
                  value: 0.4412,
                },
                off_3pr: {
                  value: 0.3757,
                },
                def_ft: {
                  value: 0.7338,
                },
                off_2pmidr: {
                  value: 0.2255,
                },
                off_3p: {
                  override: "Luck adjusted",
                  value: 0.349,
                  old_value: 0.3476,
                },
                off_to: {
                  value: 0.1875,
                },
                def_2pmid: {
                  value: 0.2854,
                },
                def_2primr: {
                  value: 0.3322,
                },
                off_ast_rim: {
                  value: 0.4557,
                },
                def_3p_ast: {
                  value: 0.7838,
                },
                def_orb: {
                  value: 0.2462,
                },
                off_orb: {
                  value: 0.3435,
                },
                def_2p_ast: {
                  value: 0,
                },
                def_3p: {
                  old_value: 0.319,
                  override: "Luck adjusted",
                  value: 0.337,
                },
                off_ast_3p: {
                  value: 0.4633,
                },
                off_ast_mid: {
                  value: 0.0759,
                },
                off_poss: {
                  value: 1963,
                },
                def_3pr: {
                  value: 0.4,
                },
                def_ast_rim: {
                  value: 0.4045,
                },
                def_ast_3p: {
                  value: 0.4888,
                },
                off_2pmid: {
                  value: 0.35,
                },
                def_efg: {
                  override: "Adjusted from Def 3P%",
                  value: 0.4677,
                  old_value: 0.4569,
                },
                def_3p_opp: {
                  value: 34.298,
                },
                off_3p_ast: {
                  value: 0.8364,
                },
                def_to: {
                  value: 0.1425,
                },
                def_2pmidr: {
                  value: 0.2678,
                },
                off_ppp: {
                  old_value: 110.1885,
                  override: "Adjusted from Off 3P%",
                  value: 110.3114,
                },
                off_2primr: {
                  value: 0.3988,
                },
                def_ppp: {
                  override: "Adjusted from Def 3P%",
                  value: 100.647,
                  old_value: 98.8724,
                },
                off_2prim: {
                  value: 0.6071,
                },
                def_ast_mid: {
                  value: 0.1067,
                },
                off_ft: {
                  value: 0.7513,
                },
                def_assist: {
                  value: 0.5093,
                },
                def_adj_ppp: {
                  override: "Adjusted from Def 3P%",
                  value: 94.9773,
                  old_value: 93.3584,
                },
                def_2prim_ast: {
                  value: 0.4377,
                },
                off_assist: {
                  value: 0.5184,
                },
                def_2prim: {
                  value: 0.5692,
                },
                off_adj_ppp: {
                  old_value: 116.3166,
                  override: "Adjusted from Off 3P%",
                  value: 116.4763,
                },
                off_ftr: {
                  value: 0.3341,
                },
                off_efg: {
                  old_value: 0.5169,
                  override: "Adjusted from Off 3P%",
                  value: 0.5177,
                },
                def_poss: {
                  value: 1951,
                },
              },
              off_adj_prod: {
                value: 3.0376,
              },
              off_trans_2p: {
                value: 0.5918,
              },
              off_2pmid_ast: {
                value: 0.1333,
              },
              off_3p: {
                value: 0.3382,
              },
              doc_count: 594,
              posFreqs: {
                sf: 0,
                pf: 0,
                c: 0,
                pg: 1,
                sg: 0,
              },
              off_trans_2prim_ast: {
                value: 0.1739,
              },
              adj_prod_margin_rank: 101,
              agent: {
                type: "filebeat",
                version: "7.13.2",
                hostname: "Alexs-MacBook-Pro.local",
                ephemeral_id: "d28f8520-798c-4bb8-97bd-a41fd0625c06",
                id: "8545ea76-452d-4b24-8194-b0e7c449257b",
                name: "Alexs-MacBook-Pro.local",
              },
              off_trans_2pmid: {
                value: 0.5,
              },
              def_to: {
                value: 0.0159,
              },
              total_off_trans_to: {
                value: 24,
              },
              off_ast_mid: {
                value: 0.0733,
              },
              def_adj_opp: {
                value: 98.7771,
              },
              off_team_poss: {
                value: 1965,
              },
              duration_mins: {
                value: 1180.55,
              },
              off_3pr: {
                value: 0.4848,
              },
              off_scramble_3p_ast: {
                value: 1,
              },
              off_2p: {
                value: 0.4455,
              },
              off_trans_3p: {
                value: 0.4167,
              },
              year: "2018",
              off_scramble_3pr: {
                value: 0.6667,
              },
              off_usage: {
                value: 0.2568,
              },
              off_trans_2primr: {
                value: 0.5068,
              },
              off_2p_ast: {
                value: 0,
              },
              off_trans_3p_ast: {
                value: 0.7,
              },
              def_adj_rapm_prod: {
                value: -1.8757,
                old_value: -2.2433,
                override: "Adjusted from Def 3P%",
              },
              def_adj_rapm: {
                value: -2.1542,
                override: "Adjusted from Def 3P%",
                old_value: -2.5764,
              },
              roster: {
                ncaa_id: "4066371",
                number: "01",
                height: "6-0",
                year_class: "Jr",
                pos: "G",
                origin: "Bowie, MD",
              },
              def_rtg: {
                value: 102.8277,
                old_value: 101.0865,
                override: "Luck adjusted",
              },
              off_ast_rim: {
                value: 0.4733,
              },
              off_scramble_ftr: {
                value: 0.1852,
              },
              def_orb: {
                value: 0.1007,
              },
              off_2primr: {
                value: 0.3021,
              },
              off_2pmidr: {
                value: 0.2131,
              },
              off_orb: {
                value: 0.0132,
              },
              total_off_2prim_attempts: {
                value: 129,
              },
              def_adj_rtg: {
                override: "Luck adjusted",
                value: -1.4288,
                old_value: -1.7578,
              },
              input: {
                type: "log",
              },
              adj_rtg_margin_rank: 170,
              off_trans_2pmid_ast: {
                value: 0.1667,
              },
              host: {
                name: "Alexs-MacBook-Pro.local",
              },
              total_off_2p_attempts: {
                value: 220,
              },
              def_adj_rapm_prod_rank: 110,
              off_scramble_efg: {
                value: 0.3519,
              },
              off_trans_2pmidr: {
                value: 0.1644,
              },
              off_adj_rtg: {
                value: 3.472,
              },
              def_adj_rtg_rank: 387,
              off_trans_assist: {
                value: 1.1795,
              },
              code: "AnCowan",
              off_trans_ft: {
                value: 0.7586,
              },
              total_off_3p_attempts: {
                value: 207,
              },
              off_to: {
                value: 0.1905,
              },
              off_scramble_2pmid: {
                value: 0,
              },
              off_ft: {
                value: 0.8065,
              },
              off_scramble_3p: {
                value: 0.2778,
              },
              off_trans_2prim: {
                value: 0.6216,
              },
              off_adj_opp: {
                value: 110.3888,
              },
              off_scramble_2pmid_ast: {
                value: 0,
              },
              off_adj_rtg_rank: 141,
              off_rtg: {
                value: 108.1142,
              },
              posConfidences: {
                pg: 1,
                sg: 0,
                sf: 0,
                pf: 0,
                c: 0,
              },
              off_scramble_assist: {
                value: 1.1429,
              },
              off: {
                off_ast_mid: {
                  value: 0.1346,
                },
                def_3p: {
                  override: "Luck adjusted",
                  value: 0.3316,
                  old_value: 0.3152,
                },
                off_ftr: {
                  value: 0.2883,
                },
                def_2p: {
                  value: 0.4765,
                },
                off_poss: {
                  value: 283,
                },
                def_2pmid: {
                  value: 0.2778,
                },
                off_assist: {
                  value: 0.4868,
                },
                off_adj_ppp: {
                  value: 98.342,
                  old_value: 98.603,
                  override: "Adjusted from Off 3P%",
                },
                off_ft: {
                  value: 0.6719,
                },
                def_2primr: {
                  value: 0.374,
                },
                off_2p_ast: {
                  value: 0,
                },
                def_2prim_ast: {
                  value: 0.4754,
                },
                off_2p: {
                  value: 0.4698,
                },
                off_to: {
                  value: 0.2509,
                },
                def_orb: {
                  value: 0.2422,
                },
                def_2pmidr: {
                  value: 0.2748,
                },
                off_efg: {
                  value: 0.4973,
                  old_value: 0.4977,
                  override: "Adjusted from Off 3P%",
                },
                def_3p_ast: {
                  value: 0.8276,
                },
                off_net: {
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 5.9358,
                  old_value: 7.4013,
                },
                def_efg: {
                  value: 0.4838,
                  old_value: 0.4752,
                  override: "Adjusted from Def 3P%",
                },
                def_ppp: {
                  value: 103.0236,
                  old_value: 101.3699,
                  override: "Adjusted from Def 3P%",
                },
                def_to: {
                  value: 0.1336,
                },
                def_3p_opp: {
                  value: 30.9003,
                },
                def_ft: {
                  value: 0.6528,
                },
                off_2pmid_ast: {
                  value: 0.3684,
                },
                def_ast_rim: {
                  value: 0.5,
                },
                off_3p_ast: {
                  value: 0.8148,
                },
                off_ast_rim: {
                  value: 0.4423,
                },
                off_2pmidr: {
                  value: 0.2658,
                },
                def_3pr: {
                  value: 0.3511,
                },
                def_adj_opp: {
                  value: 100.0678,
                },
                off_3p: {
                  override: "Luck adjusted",
                  value: 0.3689,
                  old_value: 0.3699,
                },
                def_2p_ast: {
                  value: 0,
                },
                off_ast_3p: {
                  value: 0.4231,
                },
                off_2pmid: {
                  value: 0.322,
                },
                off_2primr: {
                  value: 0.4054,
                },
                def_assist: {
                  value: 0.4967,
                },
                off_ppp: {
                  value: 93.8965,
                  old_value: 93.9929,
                  override: "Adjusted from Off 3P%",
                },
                off_orb: {
                  value: 0.2958,
                },
                off_2prim: {
                  value: 0.5667,
                },
                def_adj_ppp: {
                  old_value: 99.8436,
                  override: "Adjusted from Def 3P%",
                  value: 101.3852,
                },
                off_3pr: {
                  value: 0.3288,
                },
                off_raw_net: {
                  value: -0.3371,
                  old_value: 1.0825,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_2prim: {
                  value: 0.6224,
                },
                off_adj_opp: {
                  value: 107.2661,
                },
                off_2prim_ast: {
                  value: 0.451,
                },
                def_ftr: {
                  value: 0.2748,
                },
                def_2pmid_ast: {
                  value: 0.25,
                },
                def_ast_3p: {
                  value: 0.4138,
                },
                def_poss: {
                  value: 292,
                },
                def_ast_mid: {
                  value: 0.0862,
                },
              },
              def_adj_prod: {
                value: -1.2441,
                old_value: -1.5306,
                override: "Luck adjusted",
              },
              adj_rapm_margin_rank: 98,
              off_2prim_ast: {
                value: 0.2059,
              },
              total_off_scramble_fga: {
                value: 27,
              },
              off_trans_ftr: {
                value: 0.7945,
              },
              off_poss: {
                value: 493.3488,
              },
              off_scramble_2prim_ast: {
                value: 0,
              },
              off_2prim: {
                value: 0.5271,
              },
              off_trans_2p_ast: {
                value: 0,
              },
              def_2prim: {
                value: 0.0067,
              },
              off_adj_prod_rank: 84,
              total_off_2pmid_attempts: {
                value: 91,
              },
              total_off_trans_fga: {
                value: 73,
              },
              conf: "Big Ten Conference",
              off_scramble_2pmidr: {
                value: 0.037,
              },
              def_team_poss: {
                value: 1953,
              },
              off_efg: {
                value: 0.4754,
              },
              rapm: {
                off_ftr: {
                  value: 0.0033,
                },
                def_2pmidr: {
                  value: 0.0009,
                },
                off_adj_ppp: {
                  value: 3.965,
                  old_value: 3.965,
                },
                def_2p: {
                  value: -0.0073,
                },
                def_poss: {
                  value: 2228,
                },
                off_2p: {
                  value: -0.0026,
                },
                def_3pr: {
                  value: 0.0034,
                },
                off_efg: {
                  value: -0.0023,
                  override: "Adjusted from Off 3P%",
                  old_value: -0.0023,
                },
                off_3p: {
                  value: 0.0036,
                  override: "Luck adjusted",
                  old_value: 0.0036,
                },
                off_to: {
                  value: -0.0011,
                },
                def_orb: {
                  value: -0.0056,
                },
                def_to: {
                  value: -0.0049,
                },
                def_assist: {
                  value: -0.0017,
                },
                def_adj_ppp: {
                  old_value: -2.5764,
                  value: -2.1542,
                  override: "Adjusted from Def 3P%",
                },
                off_assist: {
                  value: 0.0159,
                },
                def_ftr: {
                  value: -0.0116,
                },
                off_2primr: {
                  value: -0.0139,
                },
                off_orb: {
                  value: 0.0071,
                },
                def_3p: {
                  value: 0.0008,
                  override: "Luck adjusted",
                  old_value: 0.001,
                },
                off_2prim: {
                  value: -0.0108,
                },
                def_2prim: {
                  value: -0.0068,
                },
                off_2pmid: {
                  value: 0.0039,
                },
                def_2primr: {
                  value: -0.0026,
                },
                def_efg: {
                  override: "Adjusted from Def 3P%",
                  old_value: -0.0042,
                  value: -0.004,
                },
                off_poss: {
                  value: 2235,
                },
                off_2pmidr: {
                  value: -0.0108,
                },
                def_2pmid: {
                  value: -0.0104,
                },
                off_3pr: {
                  value: 0.0364,
                },
              },
              team: "Maryland",
              total_off_scramble_to: {
                value: 2,
              },
              off_adj_rapm_rank: 93,
              off_ast_3p: {
                value: 0.4467,
              },
              off_team_poss_pct: {
                value: 0.8749,
              },
              style: {
                "Put-Back": {
                  adj_pts: {
                    value: 0.8077,
                  },
                  possPct: {
                    value: 0.0385,
                  },
                  pts: {
                    value: 0.7649,
                  },
                  possPctUsg: {
                    value: 0.0136,
                  },
                },
                "Attack & Kick": {
                  pts: {
                    value: 1.0556,
                  },
                  possPctUsg: {
                    value: 0.0453,
                  },
                  adj_pts: {
                    value: 1.1146,
                  },
                  possPct: {
                    value: 0.1285,
                  },
                },
                "Mid-Range": {
                  possPct: {
                    value: 0.058,
                  },
                  pts: {
                    value: 0.6443,
                  },
                  possPctUsg: {
                    value: 0.0204,
                  },
                  adj_pts: {
                    value: 0.6803,
                  },
                },
                "Hits Cutter": {
                  possPct: {
                    value: 0.0388,
                  },
                  pts: {
                    value: 1.0202,
                  },
                  possPctUsg: {
                    value: 0.0137,
                  },
                  adj_pts: {
                    value: 1.0773,
                  },
                },
                "PnR Passer": {
                  possPctUsg: {
                    value: 0.0326,
                  },
                  adj_pts: {
                    value: 1.0636,
                  },
                  possPct: {
                    value: 0.0924,
                  },
                  pts: {
                    value: 1.0073,
                  },
                },
                "Perimeter Sniper": {
                  adj_pts: {
                    value: 1.0384,
                  },
                  possPct: {
                    value: 0.1348,
                  },
                  pts: {
                    value: 0.9834,
                  },
                  possPctUsg: {
                    value: 0.0475,
                  },
                },
                "Post-Up": {
                  possPctUsg: {
                    value: 0.0043,
                  },
                  adj_pts: {
                    value: 0.6713,
                  },
                  possPct: {
                    value: 0.0123,
                  },
                  pts: {
                    value: 0.6358,
                  },
                },
                "Dribble Jumper": {
                  pts: {
                    value: 0.8902,
                  },
                  possPctUsg: {
                    value: 0.0277,
                  },
                  adj_pts: {
                    value: 0.94,
                  },
                  possPct: {
                    value: 0.0786,
                  },
                },
                "High-Low": {
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                  possPct: {
                    value: 0,
                  },
                },
                "Backdoor Cut": {
                  possPctUsg: {
                    value: 0.0125,
                  },
                  adj_pts: {
                    value: 1.304,
                  },
                  possPct: {
                    value: 0.0354,
                  },
                  pts: {
                    value: 1.2349,
                  },
                },
                "Big Cut & Roll": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Post & Kick": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                Transition: {
                  pts: {
                    value: 1.2525,
                  },
                  possPctUsg: {
                    value: 0.0538,
                  },
                  adj_pts: {
                    value: 1.3225,
                  },
                  possPct: {
                    value: 0.1529,
                  },
                },
                "Rim Attack": {
                  possPct: {
                    value: 0.2298,
                  },
                  pts: {
                    value: 0.8204,
                  },
                  possPctUsg: {
                    value: 0.0809,
                  },
                  adj_pts: {
                    value: 0.8663,
                  },
                },
                "Pick & Pop": {
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                  possPct: {
                    value: 0,
                  },
                },
              },
              off_3p_ast: {
                value: 0.6857,
              },
              off_adj_rapm_prod_rank: 59,
              off_adj_rapm_prod: {
                value: 3.4965,
              },
              posClass: "s-PG",
              off_trans_efg: {
                value: 0.6027,
              },
              off_scramble_2p_ast: {
                value: 0,
              },
              off_scramble_2prim: {
                value: 0.25,
              },
              adj_rapm_prod_margin_rank: 60,
              ecs: {
                version: "1.8.0",
              },
              off_scramble_2primr: {
                value: 0.2963,
              },
              def_ftr: {
                value: 0.028,
              },
              sample_name: "all",
              def_team_poss_pct: {
                value: 0.8707,
              },
              off_trans_3pr: {
                value: 0.3288,
              },
              off_ftr: {
                value: 0.363,
              },
              key: "Cowan, Anthony",
              def_adj_rapm_rank: 217,
              off_2pmid: {
                value: 0.3297,
              },
            },
          },
          {
            _index: "hoopexp_men_players_2018_lping",
            _id: "4066371_Men_2018_t100",
            _score: 6.621976,
            _source: {
              "@timestamp": "2025-09-20T21:39:54.881Z",
              off_adj_prod_rank: 112,
              adj_prod_margin_rank: 114,
              off_trans_2prim_ast: {
                value: 0.1333,
              },
              off_ast_3p: {
                value: 0.4464,
              },
              off_scramble_3p_ast: {
                value: 1,
              },
              off_trans_ftr: {
                value: 0.766,
              },
              def_to: {
                value: 0.016,
              },
              off_scramble_2pmid_ast: {
                value: 0,
              },
              posClass: "s-PG",
              def_adj_opp: {
                value: 95.8432,
              },
              off_trans_3p: {
                value: 0.375,
              },
              total_off_trans_to: {
                value: 20,
              },
              def_adj_rapm_prod: {
                override: "Adjusted from Def 3P%",
                value: -1.3547,
                old_value: -1.7003,
              },
              def_team_poss_pct: {
                value: 0.8921,
              },
              duration_mins: {
                value: 924.0133,
              },
              off_scramble_3p: {
                value: 0.2353,
              },
              adj_rapm_prod_margin_rank: 76,
              off_adj_rapm_prod: {
                value: 3.5472,
              },
              posFreqs: {
                pf: 0,
                c: 0,
                pg: 1,
                sg: 0,
                sf: 0,
              },
              total_off_3p_attempts: {
                value: 164,
              },
              off_3p_ast: {
                value: 0.6667,
              },
              def_adj_prod_rank: 223,
              off_2p_ast: {
                value: 0,
              },
              off_scramble_assist: {
                value: 1.4,
              },
              def_orb: {
                value: 0.0938,
              },
              def_team_poss: {
                value: 1497,
              },
              off_ftr: {
                value: 0.3505,
              },
              total_off_2pmid_attempts: {
                value: 72,
              },
              off_2pmid: {
                value: 0.2917,
              },
              off_adj_rtg: {
                value: 3.2821,
              },
              off_adj_rapm_prod_rank: 65,
              ecs: {
                version: "1.8.0",
              },
              off_trans_ft: {
                value: 0.6667,
              },
              def_rtg: {
                old_value: 104.7824,
                override: "Luck adjusted",
                value: 106.6918,
              },
              off_adj_opp: {
                value: 113.2101,
              },
              off_scramble_efg: {
                value: 0.3043,
              },
              off_trans_2p_ast: {
                value: 0,
              },
              adj_rapm_margin_rank: 111,
              off_to: {
                value: 0.1955,
              },
              off_scramble_ftr: {
                value: 0.2174,
              },
              def_adj_rapm_rank: 322,
              off_trans_2p: {
                value: 0.5806,
              },
              off_assist: {
                value: 0.2545,
              },
              off: {
                off_ppp: {
                  value: 90.6135,
                  old_value: 90.2174,
                  override: "Adjusted from Off 3P%",
                },
                def_2prim: {
                  value: 0.6102,
                },
                def_2pmidr: {
                  value: 0.2642,
                },
                def_3pr: {
                  value: 0.3648,
                },
                off_2pmid_ast: {
                  value: 0.1818,
                },
                off_raw_net: {
                  value: 1.3265,
                  old_value: 0.6072,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                def_ast_mid: {
                  value: 0.027,
                },
                off_2prim: {
                  value: 0.5469,
                },
                off_ftr: {
                  value: 0.25,
                },
                off_assist: {
                  value: 0.4334,
                },
                off_2p_ast: {
                  value: 0,
                },
                off_ast_rim: {
                  value: 0.5,
                },
                off_net: {
                  value: 15.2535,
                  old_value: 14.6678,
                  override: "Adjusted from Off 3P% and Def 3P%",
                },
                off_2p: {
                  value: 0.4381,
                },
                def_2p_ast: {
                  value: 0,
                },
                off_2prim_ast: {
                  value: 0.4286,
                },
                off_poss: {
                  value: 184,
                },
                def_orb: {
                  value: 0.1837,
                },
                def_ast_3p: {
                  value: 0.4595,
                },
                off_3p: {
                  value: 0.376,
                  old_value: 0.3721,
                  override: "Luck adjusted",
                },
                def_2primr: {
                  value: 0.3711,
                },
                def_3p_opp: {
                  value: 30.9264,
                },
                def_to: {
                  value: 0.1421,
                },
                off_3p_ast: {
                  value: 0.8125,
                },
                off_2primr: {
                  value: 0.4324,
                },
                off_orb: {
                  value: 0.2396,
                },
                def_efg: {
                  old_value: 0.4843,
                  override: "Adjusted from Def 3P%",
                  value: 0.4778,
                },
                def_assist: {
                  value: 0.5125,
                },
                off_2pmidr: {
                  value: 0.277,
                },
                off_efg: {
                  override: "Adjusted from Off 3P%",
                  value: 0.4747,
                  old_value: 0.473,
                },
                off_adj_opp: {
                  value: 111.1486,
                },
                def_3p: {
                  value: 0.333,
                  old_value: 0.3448,
                  override: "Luck adjusted",
                },
                def_adj_ppp: {
                  old_value: 93.8365,
                  override: "Adjusted from Def 3P%",
                  value: 92.9609,
                },
                off_2pmid: {
                  value: 0.2683,
                },
                off_to: {
                  value: 0.2337,
                },
                off_ast_mid: {
                  value: 0.0667,
                },
                def_2pmid_ast: {
                  value: 0.0909,
                },
                off_adj_ppp: {
                  override: "Adjusted from Off 3P%",
                  value: 99.8714,
                  old_value: 99.581,
                },
                def_2prim_ast: {
                  value: 0.5278,
                },
                def_ppp: {
                  old_value: 98.9071,
                  override: "Adjusted from Def 3P%",
                  value: 97.9339,
                },
                off_ast_3p: {
                  value: 0.4333,
                },
                off_3pr: {
                  value: 0.2905,
                },
                def_3p_ast: {
                  value: 0.85,
                },
                def_ast_rim: {
                  value: 0.5135,
                },
                def_2pmid: {
                  value: 0.2619,
                },
                def_2p: {
                  value: 0.4653,
                },
                def_ftr: {
                  value: 0.2516,
                },
                def_adj_opp: {
                  value: 95.1929,
                },
                def_ft: {
                  value: 0.675,
                },
                def_poss: {
                  value: 183,
                },
                off_ft: {
                  value: 0.7027,
                },
              },
              roster: {
                ncaa_id: "4066371",
                number: "01",
                height: "6-0",
                year_class: "Jr",
                pos: "G",
                origin: "Bowie, MD",
              },
              off_orb: {
                value: 0.013,
              },
              input: {
                type: "log",
              },
              sample_name: "t100",
              on: {
                off_2pmidr: {
                  value: 0.2262,
                },
                off_ftr: {
                  value: 0.3237,
                },
                def_2pmidr: {
                  value: 0.2629,
                },
                off_adj_opp: {
                  value: 113.2132,
                },
                def_ast_rim: {
                  value: 0.4199,
                },
                def_3p: {
                  value: 0.3375,
                  old_value: 0.3176,
                  override: "Luck adjusted",
                },
                off_ast_3p: {
                  value: 0.493,
                },
                off_2pmid_ast: {
                  value: 0.2292,
                },
                def_ppp: {
                  override: "Adjusted from Def 3P%",
                  value: 105.0424,
                  old_value: 103.0769,
                },
                off_3p_ast: {
                  value: 0.8198,
                },
                def_3p_opp: {
                  value: 34.4843,
                },
                def_2pmid_ast: {
                  value: 0.2842,
                },
                def_2p: {
                  value: 0.4511,
                },
                def_to: {
                  value: 0.1204,
                },
                off_2p_ast: {
                  value: 0,
                },
                def_2p_ast: {
                  value: 0,
                },
                def_adj_ppp: {
                  value: 96.772,
                  old_value: 94.9662,
                  override: "Adjusted from Def 3P%",
                },
                off_ppp: {
                  value: 107.366,
                  old_value: 107.348,
                  override: "Adjusted from Off 3P%",
                },
                off_adj_ppp: {
                  value: 116.896,
                  old_value: 116.8604,
                  override: "Adjusted from Off 3P%",
                },
                off_ft: {
                  value: 0.7446,
                },
                def_2prim: {
                  value: 0.5978,
                },
                off_to: {
                  value: 0.1924,
                },
                def_ast_mid: {
                  value: 0.0961,
                },
                off_ast_mid: {
                  value: 0.0769,
                },
                off_efg: {
                  old_value: 0.5062,
                  override: "Adjusted from Off 3P%",
                  value: 0.5062,
                },
                off_2pmid: {
                  value: 0.331,
                },
                off_2prim: {
                  value: 0.5876,
                },
                def_efg: {
                  old_value: 0.4613,
                  override: "Adjusted from Def 3P%",
                  value: 0.4735,
                },
                def_ast_3p: {
                  value: 0.484,
                },
                off_ast_rim: {
                  value: 0.4301,
                },
                off_poss: {
                  value: 1497,
                },
                off_2primr: {
                  value: 0.3916,
                },
                def_ftr: {
                  value: 0.2894,
                },
                off_3p: {
                  value: 0.351,
                  old_value: 0.351,
                  override: "Luck adjusted",
                },
                off_assist: {
                  value: 0.5035,
                },
                def_2primr: {
                  value: 0.3314,
                },
                def_2prim_ast: {
                  value: 0.4387,
                },
                def_orb: {
                  value: 0.2554,
                },
                off_orb: {
                  value: 0.3364,
                },
                def_3p_ast: {
                  value: 0.7771,
                },
                def_ft: {
                  value: 0.7328,
                },
                def_2pmid: {
                  value: 0.2661,
                },
                off_net: {
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 20.5702,
                  old_value: 22.306,
                },
                off_2p: {
                  value: 0.4937,
                },
                def_poss: {
                  value: 1495,
                },
                off_2prim_ast: {
                  value: 0.4169,
                },
                off_3pr: {
                  value: 0.3822,
                },
                def_3pr: {
                  value: 0.4057,
                },
                def_assist: {
                  value: 0.514,
                },
                def_adj_opp: {
                  value: 95.8071,
                },
                off_raw_net: {
                  old_value: 4.6743,
                  override: "Adjusted from Off 3P% and Def 3P%",
                  value: 2.7829,
                },
              },
              off_scramble_ft: {
                value: 0.6,
              },
              def_adj_rapm_prod_rank: 189,
              off_trans_assist: {
                value: 1.4167,
              },
              host: {
                name: "Alexs-MacBook-Pro.local",
              },
              off_adj_prod: {
                value: 2.9267,
              },
              adj_rtg_margin_rank: 200,
              off_trans_2primr: {
                value: 0.4894,
              },
              off_adj_rtg_rank: 176,
              def_adj_prod: {
                value: -1.0715,
                old_value: -1.3854,
                override: "Luck adjusted",
              },
              off_trans_3pr: {
                value: 0.3404,
              },
              off_2pmid_ast: {
                value: 0.1429,
              },
              off_scramble_2p_ast: {
                value: 0,
              },
              agent: {
                type: "filebeat",
                version: "7.13.2",
                hostname: "Alexs-MacBook-Pro.local",
                ephemeral_id: "d28f8520-798c-4bb8-97bd-a41fd0625c06",
                id: "8545ea76-452d-4b24-8194-b0e7c449257b",
                name: "Alexs-MacBook-Pro.local",
              },
              style: {
                "Hits Cutter": {
                  adj_pts: {
                    value: 1.0894,
                  },
                  possPct: {
                    value: 0.0403,
                  },
                  pts: {
                    value: 1.0011,
                  },
                  possPctUsg: {
                    value: 0.0143,
                  },
                },
                "Backdoor Cut": {
                  possPct: {
                    value: 0.0353,
                  },
                  pts: {
                    value: 1.2154,
                  },
                  possPctUsg: {
                    value: 0.0125,
                  },
                  adj_pts: {
                    value: 1.3226,
                  },
                },
                Transition: {
                  possPct: {
                    value: 0.1346,
                  },
                  pts: {
                    value: 1.1653,
                  },
                  possPctUsg: {
                    value: 0.0477,
                  },
                  adj_pts: {
                    value: 1.2681,
                  },
                },
                "High-Low": {
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                  possPct: {
                    value: 0,
                  },
                },
                "Attack & Kick": {
                  possPctUsg: {
                    value: 0.0417,
                  },
                  adj_pts: {
                    value: 1.1712,
                  },
                  possPct: {
                    value: 0.1177,
                  },
                  pts: {
                    value: 1.0763,
                  },
                },
                "Put-Back": {
                  pts: {
                    value: 0.6941,
                  },
                  possPctUsg: {
                    value: 0.0155,
                  },
                  adj_pts: {
                    value: 0.7553,
                  },
                  possPct: {
                    value: 0.0438,
                  },
                },
                "PnR Passer": {
                  pts: {
                    value: 1.002,
                  },
                  possPctUsg: {
                    value: 0.0343,
                  },
                  adj_pts: {
                    value: 1.0904,
                  },
                  possPct: {
                    value: 0.0966,
                  },
                },
                "Big Cut & Roll": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Pick & Pop": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
                "Perimeter Sniper": {
                  possPct: {
                    value: 0.1406,
                  },
                  pts: {
                    value: 0.9908,
                  },
                  possPctUsg: {
                    value: 0.0498,
                  },
                  adj_pts: {
                    value: 1.0783,
                  },
                },
                "Rim Attack": {
                  adj_pts: {
                    value: 0.8698,
                  },
                  possPct: {
                    value: 0.2388,
                  },
                  pts: {
                    value: 0.7992,
                  },
                  possPctUsg: {
                    value: 0.0847,
                  },
                },
                "Mid-Range": {
                  possPct: {
                    value: 0.0629,
                  },
                  pts: {
                    value: 0.6,
                  },
                  possPctUsg: {
                    value: 0.0223,
                  },
                  adj_pts: {
                    value: 0.653,
                  },
                },
                "Dribble Jumper": {
                  possPct: {
                    value: 0.0805,
                  },
                  pts: {
                    value: 0.8951,
                  },
                  possPctUsg: {
                    value: 0.0285,
                  },
                  adj_pts: {
                    value: 0.9741,
                  },
                },
                "Post-Up": {
                  possPct: {
                    value: 0.0089,
                  },
                  pts: {
                    value: 0.5941,
                  },
                  possPctUsg: {
                    value: 0.0031,
                  },
                  adj_pts: {
                    value: 0.6465,
                  },
                },
                "Post & Kick": {
                  possPct: {
                    value: 0,
                  },
                  pts: {
                    value: 0,
                  },
                  adj_pts: {
                    value: 0,
                  },
                },
              },
              def_2prim: {
                value: 0.0074,
              },
              def_adj_rtg: {
                value: -1.201,
                old_value: -1.5529,
                override: "Luck adjusted",
              },
              off_2prim: {
                value: 0.5053,
              },
              off_adj_rapm_rank: 92,
              off_ast_mid: {
                value: 0.0625,
              },
              def_adj_rtg_rank: 405,
              total_off_2prim_attempts: {
                value: 95,
              },
              off_3p: {
                value: 0.3293,
              },
              off_2p: {
                value: 0.4132,
              },
              off_trans_3p_ast: {
                value: 0.5,
              },
              off_2pmidr: {
                value: 0.2175,
              },
              off_team_poss: {
                value: 1499,
              },
              off_2prim_ast: {
                value: 0.1875,
              },
              off_scramble_3pr: {
                value: 0.7391,
              },
              off_rtg: {
                value: 103.3473,
              },
              off_adj_rapm: {
                value: 3.996,
                old_value: 3.996,
              },
              off_scramble_2pmidr: {
                value: 0.0435,
              },
              code: "AnCowan",
              def_adj_rapm: {
                old_value: -1.9059,
                value: -1.5185,
                override: "Adjusted from Def 3P%",
              },
              off_3pr: {
                value: 0.4955,
              },
              off_team_poss_pct: {
                value: 0.8917,
              },
              conf: "Big Ten Conference",
              off_usage: {
                value: 0.2606,
              },
              total_off_2p_attempts: {
                value: 167,
              },
              off_trans_2prim: {
                value: 0.6522,
              },
              off_scramble_2prim: {
                value: 0.2,
              },
              off_ft: {
                value: 0.7845,
              },
              off_scramble_2prim_ast: {
                value: 0,
              },
              off_efg: {
                value: 0.4532,
              },
              total_off_scramble_fga: {
                value: 23,
              },
              off_poss: {
                value: 378.5738,
              },
              total_off_scramble_to: {
                value: 2,
              },
              rapm: {
                def_to: {
                  value: -0.0075,
                },
                def_2p: {
                  value: 0.0003,
                },
                def_poss: {
                  value: 1673,
                },
                off_to: {
                  value: -0.0024,
                },
                def_2pmid: {
                  value: -0.0104,
                },
                off_efg: {
                  override: "Adjusted from Off 3P%",
                  old_value: -0.0011,
                  value: -0.0011,
                },
                off_2p: {
                  value: -0.004,
                },
                off_2prim: {
                  value: -0.014,
                },
                def_2primr: {
                  value: -0.0004,
                },
                def_2pmidr: {
                  value: 0.0045,
                },
                off_3p: {
                  override: "Luck adjusted",
                  old_value: 0.0064,
                  value: 0.0064,
                },
                def_ftr: {
                  value: 0.0008,
                },
                def_efg: {
                  old_value: 0.0025,
                  value: 0.0025,
                  override: "Adjusted from Def 3P%",
                },
                off_3pr: {
                  value: 0.0462,
                },
                off_2primr: {
                  value: -0.0175,
                },
                off_2pmidr: {
                  value: -0.0146,
                },
                def_adj_ppp: {
                  value: -1.5185,
                  override: "Adjusted from Def 3P%",
                  old_value: -1.9059,
                },
                off_assist: {
                  value: 0.018,
                },
                def_assist: {
                  value: 0.0045,
                },
                def_2prim: {
                  value: 0.0068,
                },
                off_poss: {
                  value: 1679,
                },
                def_3p: {
                  old_value: 0.0052,
                  value: 0.0052,
                  override: "Luck adjusted",
                },
                def_3pr: {
                  value: 0.0084,
                },
                off_orb: {
                  value: 0.0079,
                },
                off_2pmid: {
                  value: 0.0048,
                },
                def_orb: {
                  value: 0.0005,
                },
                off_adj_ppp: {
                  value: 3.996,
                  old_value: 3.996,
                },
                off_ftr: {
                  value: 0.0089,
                },
              },
              off_scramble_2primr: {
                value: 0.2174,
              },
              off_trans_efg: {
                value: 0.5745,
              },
              total_off_trans_fga: {
                value: 47,
              },
              off_2primr: {
                value: 0.287,
              },
              off_scramble_2pmid: {
                value: 0,
              },
              off_trans_2pmid: {
                value: 0.375,
              },
              team: "Maryland",
              log: {
                offset: 1146417,
                file: {
                  path: "/Users/alex/personal/github/cbb-data/cbb/men_playerproc_1758404389_t100.ndjson",
                },
              },
              year: "2018",
              posConfidences: {
                pg: 1,
                sg: 0,
                sf: 0,
                pf: 0,
                c: 0,
              },
              off_trans_2pmid_ast: {
                value: 0,
              },
              off_trans_2pmidr: {
                value: 0.1702,
              },
              doc_count: 463,
              off_ast_rim: {
                value: 0.4911,
              },
              off_scramble_2p: {
                value: 0.1667,
              },
              def_ftr: {
                value: 0.0313,
              },
              key: "Cowan, Anthony",
            },
          },
        ],
      },
      status: 200,
    },
  ],
};

export default samplePlayerCareer;
