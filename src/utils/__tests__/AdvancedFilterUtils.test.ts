import { sampleTeamDetails } from "../../sample-data/sampleTeamDetails";
import { AdvancedFilterUtils } from "../AdvancedFilterUtils";
import _ from "lodash";
import { LuckUtils } from "../stats/LuckUtils";
import { samplePlayerLeaderboard } from "../../sample-data/samplePlayerLeaderboard";

describe("AdvancedFilterUtils", () => {
  test("fixBoolOps should replace AND/OR with &&/||", () => {
    const input = "A AND B OR C";
    const expectedOutput = "A && B || C";
    const result = AdvancedFilterUtils.fixBoolOps(input);
    expect(result).toEqual(expectedOutput);
  });

  test("fieldReplacements should replace field names correctly", () => {
    const input = "twop threep";
    const expectedOutput = "2p 3p";
    const result = AdvancedFilterUtils.fieldReplacements(input);
    expect(result).toEqual(expectedOutput);
  });

  test("playerSpecificFieldReplacements should replace field names correctly", () => {
    const input = "def_blk def_stl def_fc off_poss";
    const expectedOutput = "def_2prim def_to def_ftr off_team_poss";
    const result = AdvancedFilterUtils.playerSpecificFieldReplacements(input);
    expect(result).toEqual(expectedOutput);
  });

  test("singleYearfixObjectFormat should format off/def team_stats object correctly", () => {
    const input = "team_stats.off_ppp";
    const expectedOutput = "$.p.team_stats.off_ppp?.value";
    const result = AdvancedFilterUtils.singleYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("singleYearfixObjectFormat should format off/def player object correctly", () => {
    const input = "def_ppp";
    const expectedOutput = "$.p.def_ppp?.value";
    const result = AdvancedFilterUtils.singleYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("singleYearfixObjectFormat should format adj/raw team_stats object correctly", () => {
    const input = "team_stats.adj_net";
    const expectedOutput = "$.p.team_stats.off_net?.value";
    const result = AdvancedFilterUtils.singleYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("singleYearfixObjectFormat should format adj player object correctly", () => {
    const input = "adj_rtg";
    const expectedOutput = "$.adj_rtg";
    const result = AdvancedFilterUtils.singleYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("singleYearfixObjectFormat should format adj player object correctly (prev)", () => {
    const input = "prev_adj_rtg";
    const expectedOutput = "$.prev_adj_rtg";
    const result = AdvancedFilterUtils.singleYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("singleYearfixObjectFormat should format height correctly", () => {
    const input = "roster.height";
    const expectedOutput = "$.normht";
    const result = AdvancedFilterUtils.singleYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("singleYearfixObjectFormat should format height correctly (prev)", () => {
    const input = "prev_roster.height";
    const expectedOutput = "prev_$.normht";
    const result = AdvancedFilterUtils.singleYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });

  test("multiYearfixObjectFormat should format object correctly", () => {
    const input = "prev_off_ppp";
    const expectedOutput = "$.prev?.p.off_ppp?.value";
    const result = AdvancedFilterUtils.multiYearfixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("teamFixObjectFormat should format off style object correctly", () => {
    const input = "off_style_rim_attack_ppp";
    const expectedOutput = '$.p.style?.["Rim Attack"]?.pts?.value';
    const result = AdvancedFilterUtils.teamFixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });
  test("teamFixObjectFormat should format def style object correctly", () => {
    const input = "def_style_rim_attack_pct";
    const expectedOutput = `$.p.style_def?.["Rim Attack"]?.possPct?.value`;
    const result = AdvancedFilterUtils.teamFixObjectFormat(input);
    expect(result).toEqual(expectedOutput);
  });

  test("gradeConvert should convert grade strings correctly", () => {
    const input = "rank_$.p.team_stats.off_ppp";
    const expectedOutput = "$.rank_team_stats.off_ppp";
    const result = AdvancedFilterUtils.gradeConvert(input);
    expect(result).toEqual(expectedOutput);
  });
  test("gradeConvert should convert grade % strings correctly", () => {
    const input = "rank_(100*$.p.team_stats.off_ppp";
    const expectedOutput = "(100*$.rank.team_stats.off_ppp";
    const result = AdvancedFilterUtils.gradeConvert(input);
    expect(result).toEqual(expectedOutput);
  });

  test("gradeConvert should convert grade strings correctly (%ile)", () => {
    const input = "pctile_$.p.team_stats.off_ppp";
    const expectedOutput = "$.pctile_team_stats.off_ppp";
    const result = AdvancedFilterUtils.gradeConvert(input);
    expect(result).toEqual(expectedOutput);
  });

  test("prevYearConvert should convert prev year string correct (normht)", () => {
    const input = "prev_$.normht";
    const expectedOutput = "$.prev_normht";
    const result = AdvancedFilterUtils.prevYearConvert(input);
    expect(result).toEqual(expectedOutput);
  });
  test("prevYearConvert should convert prev year string correct", () => {
    const input = "prev_$.p.off_rtg";
    const expectedOutput = "$.p.prevYear?.off_rtg";
    const result = AdvancedFilterUtils.prevYearConvert(input);
    expect(result).toEqual(expectedOutput);
  });
  test("prevYearConvert should convert grade % strings correctly", () => {
    const input = "prev_(100*$.p.def_rtg";
    const expectedOutput = "(100*$.p.prevYear?.def_rtg";
    const result = AdvancedFilterUtils.prevYearConvert(input);
    expect(result).toEqual(expectedOutput);
  });

  test("avoidAssigmentOperator should replace = with ==", () => {
    const input = "a = b";
    const expectedOutput = "a == b";
    const result = AdvancedFilterUtils.avoidAssigmentOperator(input);
    expect(result).toEqual(expectedOutput);
  });

  test("convertPositions should convert positions correctly", () => {
    const input = "[_PG_] [_SG_] [_SF_] [_PF_] [_C_]";
    const expectedOutput = "[0] [1] [2] [3] [4]";
    const result = AdvancedFilterUtils.convertPositions(input);
    expect(result).toEqual(expectedOutput);
  });

  test("convertPercentages should convert percentages correctly", () => {
    const input = "50%";
    const expectedOutput = "((50)*0.01)";
    const result = AdvancedFilterUtils.convertPercentages(input);
    expect(result).toEqual(expectedOutput);
  });

  test("normHeightInQuotes should normalize height in quotes", () => {
    const input = "'5-9'";
    const expectedOutput = "'5-09'";
    const result = AdvancedFilterUtils.normHeightInQuotes(input);
    expect(result).toEqual(expectedOutput);
  });

  test("normHeightString should normalize height string", () => {
    const input = "5-9";
    const expectedOutput = "5-09";
    const result = AdvancedFilterUtils.normHeightString(input);
    expect(result).toEqual(expectedOutput);
  });

  test("removeAscDesc should remove ASC/DESC", () => {
    const input = "field ASC";
    const expectedOutput = "field ";
    const result = AdvancedFilterUtils.removeAscDesc(input);
    expect(result).toEqual(expectedOutput);
  });

  test("convertRegionalBounds should convert regional bounds", () => {
    const input = "hs_region_dmv";
    const expectedOutput =
      "(roster.lat >= 38.3201 && roster.lat <= 39.6395 && roster.lon >= -78.5330 && roster.lon <= -75.4816)";
    const result = AdvancedFilterUtils.convertRegionalBounds(input);
    expect(result).toEqual(expectedOutput);
  });

  test("tidyPlayerClauses should tidy player clauses", () => {
    const input = "A AND B";
    const expectedOutput = "A && B";
    const result = AdvancedFilterUtils.tidyPlayerClauses(input, false);
    expect(result).toEqual(expectedOutput);
  });

  test("tidyTeamExplorerClauses should tidy team explorer clauses", () => {
    const input = "A AND B";
    const expectedOutput = "A && B";
    const result = AdvancedFilterUtils.tidyTeamExplorerClauses(input, false);
    expect(result).toEqual(expectedOutput);
  });

  test("applyTeamExplorerFilter should apply team explorer filter", () => {
    const inData = [{ year: "2025" }];
    const filterStr = "year == 2025";
    const divStats = (year: string) => undefined;
    const [result, error] = AdvancedFilterUtils.applyTeamExplorerFilter(
      inData.concat([{ year: "2024" }]),
      filterStr,
      divStats
    );
    expect(result).toEqual(inData);
    expect(error).toBeUndefined();
  });

  test("applyPlayerFilter should apply player filter", () => {
    const inData = [{ year: "2025" }];
    const filterStr = "year == 2025";
    const playerDivStats = (year: string) => undefined;
    const teamDivStats = (year: string) => undefined;
    const [result, error] = AdvancedFilterUtils.applyPlayerFilter(
      inData.concat([{ year: "2024" }]),
      filterStr,
      playerDivStats,
      teamDivStats
    );
    expect(result).toEqual(inData);
    expect(error).toBeUndefined();
  });

  test("generateTeamExplorerCsv should generate CSV", () => {
    const inData = _.cloneDeep(sampleTeamDetails.teams);
    //(these are generated in pre-processing)
    inData[0].conf_nick = "B1G";
    inData[0].wins = 21;
    inData[0].losses = 7;
    inData[0].wab = 0.9788000000000003;
    inData[0].wae = 0;
    inData[0].exp_wab = 10.636831602629515;
    inData[0].power = 5.807815801314757;
    LuckUtils.injectLuck(inData[0], undefined, undefined);
    inData[0].off_raw_net = { value: 22.639399999999995 };

    const [header, rows] = AdvancedFilterUtils.generateTeamExplorerCsv(inData);
    expect(header).toEqual(
      "team_name,conf,conf_nick,year,wins,losses,wab,wae,exp_wab,power,off_adj_ppp,def_adj_ppp,off_ppp,def_ppp,raw_net,adj_net,def_3p_opp,off_adj_opp,def_adj_opp,off_efg,off_to,off_ftr,off_orb,def_efg,def_to,def_ftr,def_orb,off_assist,off_ast_rim,off_ast_mid,off_ast_threep,off_twoprimr,off_twopmidr,off_threepr,def_assist,def_ast_rim,def_ast_mid,def_ast_threep,def_twoprimr,def_twopmidr,def_threepr,off_threep,off_twop,off_twopmid,off_twoprim,off_ft,off_threep_ast,off_twop_ast,off_twopmid_ast,off_twoprim_ast,def_threep,def_twop,def_twopmid,def_twoprim,def_ft,def_threep_ast,def_twop_ast,def_twopmid_ast,def_twoprim_ast,def_stl,def_blk,def_to_nonstl,def_stk,off_scramble_pct,off_scramble_ppp,off_scramble_delta_ppp,off_scramble_per_orb,off_scramble_efg,off_scramble_twop,off_scramble_twop_ast,off_scramble_threep,off_scramble_threep_ast,off_scramble_twoprim,off_scramble_twoprim_ast,off_scramble_twopmid,off_scramble_twopmid_ast,off_scramble_ft,off_scramble_ftr,off_scramble_twoprimr,off_scramble_twopmidr,off_scramble_threepr,off_scramble_assist,def_scramble_pct,def_scramble_ppp,def_scramble_delta_ppp,def_scramble_per_orb,def_scramble_efg,def_scramble_twop,def_scramble_twop_ast,def_scramble_threep,def_scramble_threep_ast,def_scramble_twoprim,def_scramble_twoprim_ast,def_scramble_twopmid,def_scramble_twopmid_ast,def_scramble_ft,def_scramble_ftr,def_scramble_twoprimr,def_scramble_twopmidr,def_scramble_threepr,def_scramble_assist,off_trans_pct,off_trans_ppp,off_trans_delta_ppp,off_trans_efg,off_trans_twop,off_trans_twop_ast,off_trans_threep,off_trans_threep_ast,off_trans_twoprim,off_trans_twoprim_ast,off_trans_twopmid,off_trans_twopmid_ast,off_trans_ft,off_trans_ftr,off_trans_twoprimr,off_trans_twopmidr,off_trans_threepr,off_trans_assist,def_trans_pct,def_trans_ppp,def_trans_delta_ppp,def_trans_efg,def_trans_twop,def_trans_twop_ast,def_trans_threep,def_trans_threep_ast,def_trans_twoprim,def_trans_twoprim_ast,def_trans_twopmid,def_trans_twopmid_ast,def_trans_ft,def_trans_ftr,def_trans_twoprimr,def_trans_twopmidr,def_trans_threepr,def_trans_assist,off_style_rim_attack_pct,off_style_rim_attack_ppp,off_style_attack_kick_pct,off_style_attack_kick_ppp,off_style_dribble_jumper_pct,off_style_dribble_jumper_ppp,off_style_mid_range_pct,off_style_mid_range_ppp,off_style_perimeter_cut_pct,off_style_perimeter_cut_ppp,off_style_big_cut_roll_pct,off_style_big_cut_roll_ppp,off_style_post_up_pct,off_style_post_up_ppp,off_style_post_kick_pct,off_style_post_kick_ppp,off_style_pick_pop_pct,off_style_pick_pop_ppp,off_style_high_low_pct,off_style_high_low_ppp,off_style_reb_scramble_pct,off_style_reb_scramble_ppp,off_style_transition_pct,off_style_transition_ppp,def_style_rim_attack_pct,def_style_rim_attack_ppp,def_style_attack_kick_pct,def_style_attack_kick_ppp,def_style_dribble_jumper_pct,def_style_dribble_jumper_ppp,def_style_mid_range_pct,def_style_mid_range_ppp,def_style_perimeter_cut_pct,def_style_perimeter_cut_ppp,def_style_big_cut_roll_pct,def_style_big_cut_roll_ppp,def_style_post_up_pct,def_style_post_up_ppp,def_style_post_kick_pct,def_style_post_kick_ppp,def_style_pick_pop_pct,def_style_pick_pop_ppp,def_style_high_low_pct,def_style_high_low_ppp,def_style_reb_scramble_pct,def_style_reb_scramble_ppp,def_style_transition_pct,def_style_transition_ppp"
    );
    expect(rows).toEqual([
      '"Maryland","Big Ten Conference","B1G","2024/25",21,7,0.9788000000000003,0,10.636831602629515,5.807815801314757,121.4204,91.767,118.3027,95.6633,22.639399999999995,29.6534,34.5407,111.6404,104.8289,0.549,0.1518,0.3268,0.3127,0.4724,0.2005,0.2618,0.2606,0.4952,0.4903,0.1044,0.4053,0.3894,0.253,0.3575,0.4789,0.462,0.0942,0.4438,0.3709,0.2673,0.3618,0.3701,0.5456,0.3945,0.6438,0.7496,0.7325,0,0.25,0.4676,0.3099,0.4767,0.356,0.5637,0.7315,0.7892,0,0.1975,0.4406,0.1005,0.06,0.1,0.1605,0.0985,123.0301,4.7274,0.6464,0.5786,0.621,0,0.2857,0.8,0.6867,0.1228,0.4878,0.1,0.7162,0.4654,0.522,0.2579,0.2201,0.1954,0.0858,118.9146,23.2513,0.6347,0.5786,0.5676,0,0.4138,0.8333,0.6479,0.1304,0.425,0.1176,0.6909,0.3929,0.5071,0.2857,0.2071,0.24,0.2178,126.266,7.9633,0.6433,0.6927,0,0.3675,0.814,0.7135,0.5827,0.6,0.4583,0.8045,0.397,0.5313,0.1194,0.3493,0.6186,0.1506,112.1333,16.47,0.5911,0.5833,0,0.4022,0.7568,0.5984,0.589,0.5,0.0909,0.7027,0.3136,0.5169,0.0932,0.3898,0.595,0.1555,0.8898,0.1053,1.0868,0.0625,1.0697,0.0415,0.7194,0.0341,1.06,0.0751,1.1715,0.1572,0.8726,0.0405,1.04,0.0142,0.6652,0.0105,0.9876,0.0941,1.1852,0.2055,1.2953,0.2274,0.8347,0.1238,0.7816,0.0447,0.9003,0.0706,0.6264,0.0805,0.9034,0.042,0.8879,0.0813,0.7331,0.0534,0.5553,0.0292,0.624,0.0086,0.5505,0.0837,1.1322,0.146,1.1996',
    ]);
  });

  //TODO: grab a couple of samples fromt the data, get copilot to generate the JSON
  // that would produce it and make these tests representative

  test("generatePlayerLeaderboardCsv should generate CSV", () => {
    const inData = _.cloneDeep(samplePlayerLeaderboard.players);
    //(these are generated in pre-processing)
    inData[0].tier = "High";
    inData[0].team_stats = {
      off_adj_ppp: { value: 113.5119 },
    };
    const filterStr = "team_stats.off_adj_ppp";
    const [header, rows] = AdvancedFilterUtils.generatePlayerLeaderboardCsv(
      filterStr,
      inData,
      false
    );
    expect(header).toEqual(
      "conf,team,year,player_name,player_code,posClass,roster.number,roster.height,roster.year_class,roster.pos,roster.origin,tier,transfer_src,transfer_dest,off_adj_opp,def_adj_opp,off_poss,off_team_poss_pct,def_poss,def_team_poss_pct,off_efg,off_to,off_ftr,adj_rtg_margin,adj_prod_margin,adj_rapm_margin,adj_rapm_prod_margin,adj_rtg_margin_rank,adj_prod_margin_rank,adj_rapm_margin_rank,adj_rapm_prod_margin_rank,off_rtg,off_adj_rtg,off_adj_prod,off_adj_rapm,off_adj_rapm_prod,off_adj_rtg_rank,off_adj_prod_rank,off_adj_rapm_rank,off_adj_rapm_prod_rank,def_rtg,def_adj_rtg,def_adj_prod,def_adj_rapm,def_adj_prod_rapm,def_adj_rtg_rank,def_adj_prod_rank,def_adj_rapm_rank,def_adj_rapm_prod_rank,off_usage,off_assist,off_ast_rim,off_ast_mid,off_ast_threep,off_twoprimr,off_twopmidr,off_threepr,off_threep,off_twop,off_twopmid,off_twoprim,off_ft,off_threep_ast,off_twop_ast,off_twopmid_ast,off_twoprim_ast,off_scramble_twop,off_scramble_twop_ast,off_scramble_threep,off_scramble_threep_ast,off_scramble_twoprim,off_scramble_twoprim_ast,off_scramble_twopmid,off_scramble_twopmid_ast,off_scramble_ft,off_scramble_ftr,off_scramble_twoprimr,off_scramble_twopmidr,off_scramble_threepr,off_scramble_assist,off_trans_twop,off_trans_twop_ast,off_trans_threep,off_trans_threep_ast,off_trans_twoprim,off_trans_twoprim_ast,off_trans_twopmid,off_trans_twopmid_ast,off_trans_ft,off_trans_ftr,off_trans_twoprimr,off_trans_twopmidr,off_trans_threepr,off_trans_assist,off_orb,def_orb,off_reb,def_reb,def_stl,def_blk,def_fc,off_adj_rapm_pred,def_adj_rapm_pred,off_rtg_pred,off_usage_pred,adj_rapm_margin_pred,off_style_rim_attack_pct,off_style_rim_attack_usg,off_style_rim_attack_ppp,off_style_attack_kick_pct,off_style_attack_kick_usg,off_style_attack_kick_ppp,off_style_perimeter_sniper_pct,off_style_perimeter_sniper_usg,off_style_perimeter_sniper_ppp,off_style_dribble_jumper_pct,off_style_dribble_jumper_usg,off_style_dribble_jumper_ppp,off_style_mid_range_pct,off_style_mid_range_usg,off_style_mid_range_ppp,off_style_hits_cutter_pct,off_style_hits_cutter_usg,off_style_hits_cutter_ppp,off_style_perimeter_cut_pct,off_style_perimeter_cut_usg,off_style_perimeter_cut_ppp,off_style_pnr_passer_pct,off_style_pnr_passer_usg,off_style_pnr_passer_ppp,off_style_big_cut_roll_pct,off_style_big_cut_roll_usg,off_style_big_cut_roll_ppp,off_style_post_up_pct,off_style_post_up_usg,off_style_post_up_ppp,off_style_post_kick_pct,off_style_post_kick_usg,off_style_post_kick_ppp,off_style_pick_pop_pct,off_style_pick_pop_usg,off_style_pick_pop_ppp,off_style_high_low_pct,off_style_high_low_usg,off_style_high_low_ppp,off_style_reb_scramble_pct,off_style_reb_scramble_usg,off_style_reb_scramble_ppp,off_style_transition_pct,off_style_transition_usg,off_style_transition_ppp,posConfidences[_PG_],posConfidences[_SG_],posConfidences[_SF_],posConfidences[_PF_],posConfidences[_C_],posFreqs[_PG_],posFreqs[_SG_],posFreqs[_SF_],posFreqs[_PF_],posFreqs[_C_],team_stats.off_adj_ppp"
    );
    expect(rows).toEqual([
      '"Atlantic Coast Conference","Duke","2024/25","Flagg, Cooper","CoFlagg","WF","2","6-09","Fr","F","Newport, ME","High","","",113.5119,103.3944,1440,0.7886,1421,0.7752,0.5429,0.1414,0.4504,12.139700000000001,9.50791646,12.278,9.612029880000001,2,1,1,1,125.0372,7.2553,5.7216,7.0242,5.5433,8,6,8,6,87.7243,-4.8844,-3.7865,-5.2538,null,2,1,7,2,0.306,0.2568,0.4211,0.0175,0.5614,0.3941,0.3271,0.2788,0.375,0.5353,0.4262,0.6259,0.8214,0.8718,0,0.3269,0.3043,0.5517,0,0.5714,1,0.6667,0.375,0.4706,0.125,1,0.1944,0.3333,0.4722,0.1944,0.25,0.7436,0,0.7,1,0.8571,0.2917,0.4545,0.2,0.7895,0.7755,0.5714,0.2245,0.2041,0.5278,0.0552,0.2127,0.0552,0.2127,0.0303,0.0366,2.76,null,null,null,null,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0309,0.263,0.4538,0.2519,0.0003,0,0,0.2076,0.7882,0.0042,113.5119',
    ]);
  });
  test("generatePlayerLeaderboardCsv should generate CSV (including prev year)", () => {
    const inData = _.cloneDeep(samplePlayerLeaderboard.players);
    //(these are generated in pre-processing)
    inData[0].tier = "High";
    inData[0].team_stats = {
      off_adj_ppp: { value: 113.5119 },
    };
    inData[0].prevYear = _.cloneDeep(inData[0]);

    const filterStr = "team_stats.off_adj_ppp";
    const [header, rows] = AdvancedFilterUtils.generatePlayerLeaderboardCsv(
      filterStr,
      inData,
      true
    );
    expect(header).toEqual(
      "conf,team,year,player_name,player_code,posClass,roster.number,roster.height,roster.year_class,roster.pos,roster.origin,tier,transfer_src,transfer_dest,off_adj_opp,def_adj_opp,off_poss,off_team_poss_pct,def_poss,def_team_poss_pct,off_efg,off_to,off_ftr,adj_rtg_margin,adj_prod_margin,adj_rapm_margin,adj_rapm_prod_margin,adj_rtg_margin_rank,adj_prod_margin_rank,adj_rapm_margin_rank,adj_rapm_prod_margin_rank,off_rtg,off_adj_rtg,off_adj_prod,off_adj_rapm,off_adj_rapm_prod,off_adj_rtg_rank,off_adj_prod_rank,off_adj_rapm_rank,off_adj_rapm_prod_rank,def_rtg,def_adj_rtg,def_adj_prod,def_adj_rapm,def_adj_prod_rapm,def_adj_rtg_rank,def_adj_prod_rank,def_adj_rapm_rank,def_adj_rapm_prod_rank,off_usage,off_assist,off_ast_rim,off_ast_mid,off_ast_threep,off_twoprimr,off_twopmidr,off_threepr,off_threep,off_twop,off_twopmid,off_twoprim,off_ft,off_threep_ast,off_twop_ast,off_twopmid_ast,off_twoprim_ast,off_scramble_twop,off_scramble_twop_ast,off_scramble_threep,off_scramble_threep_ast,off_scramble_twoprim,off_scramble_twoprim_ast,off_scramble_twopmid,off_scramble_twopmid_ast,off_scramble_ft,off_scramble_ftr,off_scramble_twoprimr,off_scramble_twopmidr,off_scramble_threepr,off_scramble_assist,off_trans_twop,off_trans_twop_ast,off_trans_threep,off_trans_threep_ast,off_trans_twoprim,off_trans_twoprim_ast,off_trans_twopmid,off_trans_twopmid_ast,off_trans_ft,off_trans_ftr,off_trans_twoprimr,off_trans_twopmidr,off_trans_threepr,off_trans_assist,off_orb,def_orb,off_reb,def_reb,def_stl,def_blk,def_fc,off_adj_rapm_pred,def_adj_rapm_pred,off_rtg_pred,off_usage_pred,adj_rapm_margin_pred,off_style_rim_attack_pct,off_style_rim_attack_usg,off_style_rim_attack_ppp,off_style_attack_kick_pct,off_style_attack_kick_usg,off_style_attack_kick_ppp,off_style_perimeter_sniper_pct,off_style_perimeter_sniper_usg,off_style_perimeter_sniper_ppp,off_style_dribble_jumper_pct,off_style_dribble_jumper_usg,off_style_dribble_jumper_ppp,off_style_mid_range_pct,off_style_mid_range_usg,off_style_mid_range_ppp,off_style_hits_cutter_pct,off_style_hits_cutter_usg,off_style_hits_cutter_ppp,off_style_perimeter_cut_pct,off_style_perimeter_cut_usg,off_style_perimeter_cut_ppp,off_style_pnr_passer_pct,off_style_pnr_passer_usg,off_style_pnr_passer_ppp,off_style_big_cut_roll_pct,off_style_big_cut_roll_usg,off_style_big_cut_roll_ppp,off_style_post_up_pct,off_style_post_up_usg,off_style_post_up_ppp,off_style_post_kick_pct,off_style_post_kick_usg,off_style_post_kick_ppp,off_style_pick_pop_pct,off_style_pick_pop_usg,off_style_pick_pop_ppp,off_style_high_low_pct,off_style_high_low_usg,off_style_high_low_ppp,off_style_reb_scramble_pct,off_style_reb_scramble_usg,off_style_reb_scramble_ppp,off_style_transition_pct,off_style_transition_usg,off_style_transition_ppp,posConfidences[_PG_],posConfidences[_SG_],posConfidences[_SF_],posConfidences[_PF_],posConfidences[_C_],posFreqs[_PG_],posFreqs[_SG_],posFreqs[_SF_],posFreqs[_PF_],posFreqs[_C_],prev_conf,prev_team,prev_year,prev_posClass,prev_roster.number,prev_roster.height,prev_roster.year_class,prev_roster.pos,prev_roster.origin,prev_tier,prev_off_adj_opp,prev_def_adj_opp,prev_off_poss,prev_off_team_poss_pct,prev_def_poss,prev_def_team_poss_pct,prev_off_efg,prev_off_to,prev_off_ftr,prev_adj_rtg_margin,prev_adj_prod_margin,prev_adj_rapm_margin,prev_adj_rapm_prod_margin,prev_adj_rtg_margin_rank,prev_adj_prod_margin_rank,prev_adj_rapm_margin_rank,prev_adj_rapm_prod_margin_rank,prev_off_rtg,prev_off_adj_rtg,prev_off_adj_prod,prev_off_adj_rapm,prev_off_adj_rapm_prod,prev_off_adj_rtg_rank,prev_off_adj_prod_rank,prev_off_adj_rapm_rank,prev_off_adj_rapm_prod_rank,prev_def_rtg,prev_def_adj_rtg,prev_def_adj_prod,prev_def_adj_rapm,prev_def_adj_prod_rapm,prev_def_adj_rtg_rank,prev_def_adj_prod_rank,prev_def_adj_rapm_rank,prev_def_adj_rapm_prod_rank,prev_off_usage,prev_off_assist,prev_off_ast_rim,prev_off_ast_mid,prev_off_ast_threep,prev_off_twoprimr,prev_off_twopmidr,prev_off_threepr,prev_off_threep,prev_off_twop,prev_off_twopmid,prev_off_twoprim,prev_off_ft,prev_off_threep_ast,prev_off_twop_ast,prev_off_twopmid_ast,prev_off_twoprim_ast,prev_off_scramble_twop,prev_off_scramble_twop_ast,prev_off_scramble_threep,prev_off_scramble_threep_ast,prev_off_scramble_twoprim,prev_off_scramble_twoprim_ast,prev_off_scramble_twopmid,prev_off_scramble_twopmid_ast,prev_off_scramble_ft,prev_off_scramble_ftr,prev_off_scramble_twoprimr,prev_off_scramble_twopmidr,prev_off_scramble_threepr,prev_off_scramble_assist,prev_off_trans_twop,prev_off_trans_twop_ast,prev_off_trans_threep,prev_off_trans_threep_ast,prev_off_trans_twoprim,prev_off_trans_twoprim_ast,prev_off_trans_twopmid,prev_off_trans_twopmid_ast,prev_off_trans_ft,prev_off_trans_ftr,prev_off_trans_twoprimr,prev_off_trans_twopmidr,prev_off_trans_threepr,prev_off_trans_assist,prev_off_orb,prev_def_orb,prev_off_reb,prev_def_reb,prev_def_stl,prev_def_blk,prev_def_fc,prev_off_adj_rapm_pred,prev_def_adj_rapm_pred,prev_off_rtg_pred,prev_off_usage_pred,prev_adj_rapm_margin_pred,prev_posConfidences[_PG_],prev_posConfidences[_SG_],prev_posConfidences[_SF_],prev_posConfidences[_PF_],prev_posConfidences[_C_],prev_posFreqs[_PG_],prev_posFreqs[_SG_],prev_posFreqs[_SF_],prev_posFreqs[_PF_],prev_posFreqs[_C_],team_stats.off_adj_ppp"
    );
    expect(rows).toEqual([
      '"Atlantic Coast Conference","Duke","2024/25","Flagg, Cooper","CoFlagg","WF","2","6-09","Fr","F","Newport, ME","High","","",113.5119,103.3944,1440,0.7886,1421,0.7752,0.5429,0.1414,0.4504,12.139700000000001,9.50791646,12.278,9.612029880000001,2,1,1,1,125.0372,7.2553,5.7216,7.0242,5.5433,8,6,8,6,87.7243,-4.8844,-3.7865,-5.2538,null,2,1,7,2,0.306,0.2568,0.4211,0.0175,0.5614,0.3941,0.3271,0.2788,0.375,0.5353,0.4262,0.6259,0.8214,0.8718,0,0.3269,0.3043,0.5517,0,0.5714,1,0.6667,0.375,0.4706,0.125,1,0.1944,0.3333,0.4722,0.1944,0.25,0.7436,0,0.7,1,0.8571,0.2917,0.4545,0.2,0.7895,0.7755,0.5714,0.2245,0.2041,0.5278,0.0552,0.2127,0.0552,0.2127,0.0303,0.0366,2.76,null,null,null,null,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0309,0.263,0.4538,0.2519,0.0003,0,0,0.2076,0.7882,0.0042,"Atlantic Coast Conference","Duke","2024/25","WF","2","6-09","Fr","F","Newport, ME","High",113.5119,103.3944,1440,0.7886,1421,0.7752,0.5429,0.1414,0.4504,12.139700000000001,9.50791646,12.278,9.612029880000001,2,1,1,1,125.0372,7.2553,5.7216,7.0242,5.5433,8,6,8,6,87.7243,-4.8844,-3.7865,-5.2538,null,2,1,7,2,0.306,0.2568,0.4211,0.0175,0.5614,0.3941,0.3271,0.2788,0.375,0.5353,0.4262,0.6259,0.8214,0.8718,0,0.3269,0.3043,0.5517,0,0.5714,1,0.6667,0.375,0.4706,0.125,1,0.1944,0.3333,0.4722,0.1944,0.25,0.7436,0,0.7,1,0.8571,0.2917,0.4545,0.2,0.7895,0.7755,0.5714,0.2245,0.2041,0.5278,0.0552,0.2127,0.0552,0.2127,0.0303,0.0366,2.76,null,null,null,null,0,0.0309,0.263,0.4538,0.2519,0.0003,0,0,0.2076,0.7882,0.0042,113.5119',
    ]);
  });
  //TODO: ideally would also hand with rank_ set but a bit tricky without messing with complex division stats caches, so leave for now
});
