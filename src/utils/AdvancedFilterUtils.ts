import _ from "lodash";
import Enumerable from "linq";
import { DivisionStatistics, Statistic } from "./StatModels";
import { GradeUtils } from "./stats/GradeUtils";
import { PlayTypeUtils } from "./stats/PlayTypeUtils";

/** Library accepts strings. but typescript extension doesn't */
type TypeScriptWorkaround1 = (element: any, index: number) => boolean;
type TypeScriptWorkaround2 = (element: any) => unknown;
type EnumToEnum = (
  e: Enumerable.IEnumerable<any>
) => Enumerable.IEnumerable<any>;

/** Utils to build LINQ filter/sort capabilities */
export class AdvancedFilterUtils {
  static readonly operators = [
    "&&",
    "||",
    "SORT_BY",
    "ASC",
    "DESC",
    "AND",
    "OR",
    "ALL",
  ];

  static readonly operatorsSet = new Set<string>(AdvancedFilterUtils.operators);

  static readonly lineupMetadata = [
    // Basic metadata:
    "team_name",
    "conf",
    "year",

    // Advanced metadata:
    "off_poss",
    "def_poss",
    "duration_mins",
    "team_stats.off_adj_ppp", //(actually team_off_adj_ppp)
    "team_stats.def_adj_ppp", //(actually team_def_adj_ppp)
  ];

  static readonly lineupPlayerStats = [
    // Metadata:
    "key",
    "height_in",
    "year_class",
    "code",
    "ncaa_id",
    "posClass",
    // Stats:
    "off_rtg",
    "off_usage",
    "def_orb",
    "off_adj_rtg",
    "def_adj_rtg",
    "off_3pr",
    "off_ftr",
    "off_assist",
  ];

  static readonly lineupStats = [
    // Efficiency:
    "off_adj_ppp",
    "def_adj_ppp",
    "off_ppp",
    "def_ppp",
    //TODO: add these when you get a moment
    // "raw_net",
    // "adj_net",
    "def_3p_opp",
    "off_adj_opp",
    "def_adj_opp",

    // Four factors
    "off_efg",
    "off_to",
    "off_ftr",
    "off_orb",
    "def_efg",
    "def_to",
    "def_ftr",
    "def_orb",

    // Shot creation
    "off_assist",
    "off_ast_rim",
    "off_ast_mid",
    "off_ast_threep",
    "off_twoprimr",
    "off_twopmidr",
    "off_threepr",
    "def_assist",
    "def_ast_rim",
    "def_ast_mid",
    "def_ast_threep",
    "def_twoprimr",
    "def_twopmidr",
    "def_threepr",

    // Shot-making
    "off_threep",
    "off_twop",
    "off_twopmid",
    "off_twoprim",
    "off_ft",
    "off_threep_ast",
    "off_twop_ast",
    "off_twopmid_ast",
    "off_twoprim_ast",
    "def_threep",
    "def_twop",
    "def_twopmid",
    "def_twoprim",
    "def_ft",
    "def_threep_ast",
    "def_twop_ast",
    "def_twopmid_ast",
    "def_twoprim_ast",

    // Scramble:
    //TODO add some thing back here
    //"off_scramble_pct",
    "off_scramble_ppp",
    //"off_scramble_delta_ppp",
    //"off_scramble_per_orb",
    "off_scramble_efg",
    "off_scramble_twop",
    "off_scramble_twop_ast",
    "off_scramble_threep",
    "off_scramble_threep_ast",
    "off_scramble_twoprim",
    "off_scramble_twoprim_ast",
    "off_scramble_twopmid",
    "off_scramble_twopmid_ast",
    "off_scramble_ft",
    "off_scramble_ftr",
    "off_scramble_twoprimr",
    "off_scramble_twopmidr",
    "off_scramble_threepr",
    "off_scramble_assist",
    //"def_scramble_pct",
    "def_scramble_ppp",
    //"def_scramble_delta_ppp",
    //"def_scramble_per_orb",
    "def_scramble_efg",
    "def_scramble_twop",
    "def_scramble_twop_ast",
    "def_scramble_threep",
    "def_scramble_threep_ast",
    "def_scramble_twoprim",
    "def_scramble_twoprim_ast",
    "def_scramble_twopmid",
    "def_scramble_twopmid_ast",
    "def_scramble_ft",
    "def_scramble_ftr",
    "def_scramble_twoprimr",
    "def_scramble_twopmidr",
    "def_scramble_threepr",
    "def_scramble_assist",

    // Transition:
    //TODO add some thing back here
    //"off_trans_pct",
    "off_trans_ppp",
    //"off_trans_delta_ppp",
    "off_trans_efg",
    "off_trans_twop",
    "off_trans_twop_ast",
    "off_trans_threep",
    "off_trans_threep_ast",
    "off_trans_twoprim",
    "off_trans_twoprim_ast",
    "off_trans_twopmid",
    "off_trans_twopmid_ast",
    "off_trans_ft",
    "off_trans_ftr",
    "off_trans_twoprimr",
    "off_trans_twopmidr",
    "off_trans_threepr",
    "off_trans_assist",
    //"def_trans_pct",
    "def_trans_ppp",
    //"def_trans_delta_ppp",
    "def_trans_efg",
    "def_trans_twop",
    "def_trans_twop_ast",
    "def_trans_threep",
    "def_trans_threep_ast",
    "def_trans_twoprim",
    "def_trans_twoprim_ast",
    "def_trans_twopmid",
    "def_trans_twopmid_ast",
    "def_trans_ft",
    "def_trans_ftr",
    "def_trans_twoprimr",
    "def_trans_twopmidr",
    "def_trans_threepr",
    "def_trans_assist",
  ];

  static readonly teamExplorerMetadata = [
    // Basic metadata:
    "team_name",
    "conf",
    "conf_nick",
    "year",
    "wins",
    "losses",

    // Advanced metadata:
    "wab",
    "wae",
    "exp_wab",
    "power",
  ];
  static readonly teamExplorerGradedStats = [
    // Efficiency:
    "off_adj_ppp",
    "def_adj_ppp",
    "off_ppp",
    "def_ppp",
    "raw_net",
    "adj_net",
    "def_3p_opp",
    "off_adj_opp",
    "def_adj_opp",

    // Four factors
    "off_efg",
    "off_to",
    "off_ftr",
    "off_orb",
    "def_efg",
    "def_to",
    "def_ftr",
    "def_orb",

    // Shot creation
    "off_assist",
    "off_ast_rim",
    "off_ast_mid",
    "off_ast_threep",
    "off_twoprimr",
    "off_twopmidr",
    "off_threepr",
    "def_assist",
    "def_ast_rim",
    "def_ast_mid",
    "def_ast_threep",
    "def_twoprimr",
    "def_twopmidr",
    "def_threepr",

    // Shot-making
    "off_threep",
    "off_twop",
    "off_twopmid",
    "off_twoprim",
    "off_ft",
    "off_threep_ast",
    "off_twop_ast",
    "off_twopmid_ast",
    "off_twoprim_ast",
    "def_threep",
    "def_twop",
    "def_twopmid",
    "def_twoprim",
    "def_ft",
    "def_threep_ast",
    "def_twop_ast",
    "def_twopmid_ast",
    "def_twoprim_ast",

    // Extra defensive info
    "def_stl",
    "def_blk",
    "def_to_nonstl",
    "def_stk",

    // Scramble:
    "off_scramble_pct",
    "off_scramble_ppp",
    "off_scramble_delta_ppp",
    "off_scramble_per_orb",
    "off_scramble_efg",
    "off_scramble_twop",
    "off_scramble_twop_ast",
    "off_scramble_threep",
    "off_scramble_threep_ast",
    "off_scramble_twoprim",
    "off_scramble_twoprim_ast",
    "off_scramble_twopmid",
    "off_scramble_twopmid_ast",
    "off_scramble_ft",
    "off_scramble_ftr",
    "off_scramble_twoprimr",
    "off_scramble_twopmidr",
    "off_scramble_threepr",
    "off_scramble_assist",
    "def_scramble_pct",
    "def_scramble_ppp",
    "def_scramble_delta_ppp",
    "def_scramble_per_orb",
    "def_scramble_efg",
    "def_scramble_twop",
    "def_scramble_twop_ast",
    "def_scramble_threep",
    "def_scramble_threep_ast",
    "def_scramble_twoprim",
    "def_scramble_twoprim_ast",
    "def_scramble_twopmid",
    "def_scramble_twopmid_ast",
    "def_scramble_ft",
    "def_scramble_ftr",
    "def_scramble_twoprimr",
    "def_scramble_twopmidr",
    "def_scramble_threepr",
    "def_scramble_assist",

    // Transition:
    "off_trans_pct",
    "off_trans_ppp",
    "off_trans_delta_ppp",
    "off_trans_efg",
    "off_trans_twop",
    "off_trans_twop_ast",
    "off_trans_threep",
    "off_trans_threep_ast",
    "off_trans_twoprim",
    "off_trans_twoprim_ast",
    "off_trans_twopmid",
    "off_trans_twopmid_ast",
    "off_trans_ft",
    "off_trans_ftr",
    "off_trans_twoprimr",
    "off_trans_twopmidr",
    "off_trans_threepr",
    "off_trans_assist",
    "def_trans_pct",
    "def_trans_ppp",
    "def_trans_delta_ppp",
    "def_trans_efg",
    "def_trans_twop",
    "def_trans_twop_ast",
    "def_trans_threep",
    "def_trans_threep_ast",
    "def_trans_twoprim",
    "def_trans_twoprim_ast",
    "def_trans_twopmid",
    "def_trans_twopmid_ast",
    "def_trans_ft",
    "def_trans_ftr",
    "def_trans_twoprimr",
    "def_trans_twopmidr",
    "def_trans_threepr",
    "def_trans_assist",

    //Play styles
    "off_style_rim_attack_pct",
    "off_style_rim_attack_ppp",
    "off_style_attack_kick_pct",
    "off_style_attack_kick_ppp",
    "off_style_dribble_jumper_pct",
    "off_style_dribble_jumper_ppp",
    "off_style_mid_range_pct",
    "off_style_mid_range_ppp",
    "off_style_perimeter_cut_pct",
    "off_style_perimeter_cut_ppp",
    "off_style_big_cut_roll_pct",
    "off_style_big_cut_roll_ppp",
    "off_style_post_up_pct",
    "off_style_post_up_ppp",
    "off_style_post_kick_pct",
    "off_style_post_kick_ppp",
    "off_style_pick_pop_pct",
    "off_style_pick_pop_ppp",
    "off_style_high_low_pct",
    "off_style_high_low_ppp",
    "off_style_reb_scramble_pct",
    "off_style_reb_scramble_ppp",
    "off_style_transition_pct",
    "off_style_transition_ppp",
    "def_style_rim_attack_pct",
    "def_style_rim_attack_ppp",
    "def_style_attack_kick_pct",
    "def_style_attack_kick_ppp",
    "def_style_dribble_jumper_pct",
    "def_style_dribble_jumper_ppp",
    "def_style_mid_range_pct",
    "def_style_mid_range_ppp",
    "def_style_perimeter_cut_pct",
    "def_style_perimeter_cut_ppp",
    "def_style_big_cut_roll_pct",
    "def_style_big_cut_roll_ppp",
    "def_style_post_up_pct",
    "def_style_post_up_ppp",
    "def_style_post_kick_pct",
    "def_style_post_kick_ppp",
    "def_style_pick_pop_pct",
    "def_style_pick_pop_ppp",
    "def_style_high_low_pct",
    "def_style_high_low_ppp",
    "def_style_reb_scramble_pct",
    "def_style_reb_scramble_ppp",
    "def_style_transition_pct",
    "def_style_transition_ppp",
  ];

  /** Some fields don't have ranks because I decided they weren't worth the mem usage: */
  static teamFieldHasRank(field: string): boolean {
    const missingRank =
      _.endsWith(field, "_ast_mid") ||
      _.endsWith(field, "_twop_ast") ||
      _.endsWith(field, "_twopmid_ast") ||
      _.endsWith(field, "_scramble_efg") ||
      _.endsWith(field, "_scramble_threep_ast") ||
      _.endsWith(field, "_scramble_twopmid_ast") ||
      _.endsWith(field, "_scramble_twoprim") ||
      _.endsWith(field, "_scramble_twoprim_ast") ||
      _.endsWith(field, "_scramble_twopmid") ||
      _.endsWith(field, "_scramble_twoprimr") ||
      _.endsWith(field, "_scramble_twopmidr") ||
      _.endsWith(field, "_scramble_assist") ||
      _.endsWith(field, "_trans_efg") ||
      _.endsWith(field, "_trans_threep_ast") ||
      _.endsWith(field, "_trans_twopmid_ast") ||
      _.endsWith(field, "_trans_twoprim") ||
      _.endsWith(field, "_trans_twoprim_ast") ||
      _.endsWith(field, "_trans_twopmid") ||
      _.endsWith(field, "_trans_twoprimr") ||
      _.endsWith(field, "_trans_twopmidr") ||
      _.endsWith(field, "_trans_assist") ||
      _.endsWith(field, "_ft");
    return !missingRank;
  }
  static readonly teamExplorerAutocomplete = AdvancedFilterUtils.operators
    .concat(AdvancedFilterUtils.teamExplorerMetadata)
    .concat(
      _.flatten([
        AdvancedFilterUtils.teamExplorerGradedStats,
        AdvancedFilterUtils.teamExplorerGradedStats
          .filter(AdvancedFilterUtils.teamFieldHasRank)
          .map((field) => `rank_${field}`),
        AdvancedFilterUtils.teamExplorerGradedStats
          .filter(AdvancedFilterUtils.teamFieldHasRank)
          .map((field) => `pctile_${field}`),
      ])
    );

  /** Auto-complete names to data model mapping */
  static readonly styleFromAutocompleteLut: Record<string, string> = {
    rim_attack: "Rim Attack",
    attack_kick: "Attack & Kick",
    dribble_jumper: "Dribble Jumper",
    mid_range: "Mid-Range",
    perimeter_cut: "Backdoor Cut",
    big_cut_roll: "Big Cut & Roll",
    post_up: "Post-Up",
    post_kick: "Post & Kick",
    pick_pop: "Pick & Pop",
    high_low: "High-Low",
    reb_scramble: "Put-Back",
    transition: "Transition",
  };
  /** Auto-complete names to data model mapping */
  static readonly playerStyleFromAutocompleteLut: Record<string, string> = {
    rim_attack: "Rim Attack",
    attack_kick: "Attack & Kick",
    dribble_jumper: "Dribble Jumper",
    mid_range: "Mid-Range",
    perimeter_cut: "Backdoor Cut",
    big_cut_roll: "Big Cut & Roll",
    post_up: "Post-Up",
    post_kick: "Post & Kick",
    pick_pop: "Pick & Pop",
    high_low: "High-Low",
    reb_scramble: "Put-Back",
    transition: "Transition",
    // Indiv only:
    perimeter_sniper: "Perimeter Sniper",
    hits_cutter: "Hits Cutter",
    pnr_passer: "PnR Passer",
  };

  /** The concat of the graded versions of these work slightly different */
  static readonly playerLeaderboardPlayStyles = [
    //Play styles
    "off_style_rim_attack_pct",
    "off_style_rim_attack_usg",
    "off_style_rim_attack_ppp",
    "off_style_attack_kick_pct",
    "off_style_attack_kick_usg",
    "off_style_attack_kick_ppp",
    "off_style_perimeter_sniper_pct",
    "off_style_perimeter_sniper_usg",
    "off_style_perimeter_sniper_ppp",
    "off_style_dribble_jumper_pct",
    "off_style_dribble_jumper_usg",
    "off_style_dribble_jumper_ppp",
    "off_style_mid_range_pct",
    "off_style_mid_range_usg",
    "off_style_mid_range_ppp",
    "off_style_hits_cutter_pct",
    "off_style_hits_cutter_usg",
    "off_style_hits_cutter_ppp",
    "off_style_perimeter_cut_pct",
    "off_style_perimeter_cut_usg",
    "off_style_perimeter_cut_ppp",
    "off_style_pnr_passer_pct",
    "off_style_pnr_passer_usg",
    "off_style_pnr_passer_ppp",
    "off_style_big_cut_roll_pct",
    "off_style_big_cut_roll_usg",
    "off_style_big_cut_roll_ppp",
    "off_style_post_up_pct",
    "off_style_post_up_usg",
    "off_style_post_up_ppp",
    "off_style_post_kick_pct",
    "off_style_post_kick_usg",
    "off_style_post_kick_ppp",
    "off_style_pick_pop_pct",
    "off_style_pick_pop_usg",
    "off_style_pick_pop_ppp",
    "off_style_high_low_pct",
    "off_style_high_low_usg",
    "off_style_high_low_ppp",
    "off_style_reb_scramble_pct",
    "off_style_reb_scramble_usg",
    "off_style_reb_scramble_ppp",
    "off_style_transition_pct",
    "off_style_transition_usg",
    "off_style_transition_ppp",
  ];

  static readonly playerLeaderBoardAutocomplete = AdvancedFilterUtils.operators
    .concat([
      // Basic metadata:
      "conf",
      "team",
      "year",
      "player_name",
      "player_code",

      // Advanced metadata:
      "posClass",
      "posConfidences",
      "posFreqs",
      "roster.number",
      "roster.height",
      "roster.year_class",
      "roster.pos",
      "roster.origin",
      "tier",
      "transfer_src",
      "transfer_dest",

      // Opposition strength
      "off_adj_opp",
      "def_adj_opp",

      // Possessions
      "off_poss",
      "off_team_poss_pct",
      "def_poss",
      "def_team_poss_pct",

      // Four factors
      "off_efg",
      "off_to",
      "off_ftr",

      // Overall:
      "adj_rtg_margin",
      "adj_prod_margin",
      "adj_rapm_margin",
      "adj_rapm_prod_margin",
      "adj_rtg_margin_rank",
      "adj_prod_margin_rank",
      "adj_rapm_margin_rank",
      "adj_rapm_prod_margin_rank",

      "off_rtg",
      "off_adj_rtg",
      "off_adj_prod",
      "off_adj_rapm",
      "off_adj_rapm_prod",
      "off_adj_rtg_rank",
      "off_adj_prod_rank",
      "off_adj_rapm_rank",
      "off_adj_rapm_prod_rank",

      "def_rtg",
      "def_adj_rtg",
      "def_adj_prod",
      "def_adj_rapm",
      "def_adj_prod_rapm",
      "def_adj_rtg_rank",
      "def_adj_prod_rank",
      "def_adj_rapm_rank",
      "def_adj_rapm_prod_rank",

      // Shot creation
      "off_usage",
      "off_assist",
      "off_ast_rim",
      "off_ast_mid",
      "off_ast_threep",
      "off_twoprimr",
      "off_twopmidr",
      "off_threepr",

      // Shot-making
      "off_threep",
      "off_twop",
      "off_twopmid",
      "off_twoprim",
      "off_ft",
      "off_threep_ast",
      "off_twop_ast",
      "off_twopmid_ast",
      "off_twoprim_ast",

      // Scramble:
      "off_scramble_twop",
      "off_scramble_twop_ast",
      "off_scramble_threep",
      "off_scramble_threep_ast",
      "off_scramble_twoprim",
      "off_scramble_twoprim_ast",
      "off_scramble_twopmid",
      "off_scramble_twopmid_ast",
      "off_scramble_ft",
      "off_scramble_ftr",
      "off_scramble_twoprimr",
      "off_scramble_twopmidr",
      "off_scramble_threepr",
      "off_scramble_assist",

      // Transition:
      "off_trans_twop",
      "off_trans_twop_ast",
      "off_trans_threep",
      "off_trans_threep_ast",
      "off_trans_twoprim",
      "off_trans_twoprim_ast",
      "off_trans_twopmid",
      "off_trans_twopmid_ast",
      "off_trans_ft",
      "off_trans_ftr",
      "off_trans_twoprimr",
      "off_trans_twopmidr",
      "off_trans_threepr",
      "off_trans_assist",

      // Other:
      "off_orb",
      "def_orb",
      "off_reb",
      "def_reb", //(last 2: nicer version of rebounding stats)

      // These need to be created by substitution:
      "def_stl",
      "def_blk", // (these don't exist: def_stl is def_2prim, def_blk is def_to)
      "def_fc", //(doesn't exist: def_ftr)

      // Transfers only, predicted:
      "off_adj_rapm_pred",
      "def_adj_rapm_pred",
      "off_rtg_pred",
      "off_usage_pred",
      "adj_rapm_margin_pred",

      // Regional views:
      "hs_region_dmv",
    ])
    .concat(AdvancedFilterUtils.playerLeaderboardPlayStyles)
    .concat(
      ["rank_", "pctile_"].flatMap((prefix) =>
        _.keys(GradeUtils.playerFields).map((field) => `${prefix}${field}`)
      )
    )
    .concat(
      ["rank_", "pctile_"].flatMap((prefix) =>
        AdvancedFilterUtils.playerLeaderboardPlayStyles.map(
          (field) => `${prefix}${field}`
        )
      )
    );

  static readonly playerLboardWithTeamStatsAutocomplete =
    AdvancedFilterUtils.playerLeaderBoardAutocomplete.concat(
      AdvancedFilterUtils.teamExplorerAutocomplete
        .filter(
          (field) =>
            _.startsWith(field, "off_") ||
            _.startsWith(field, "def_") ||
            _.startsWith(field, "adj_") ||
            _.startsWith(field, "raw_")
        )
        .flatMap((field) =>
          [`team_stats.${field}`].concat(
            AdvancedFilterUtils.teamFieldHasRank(field)
              ? [`rank_team_stats.${field}`, `pctile_team_stats.${field}`]
              : []
          )
        )
    );

  static playerSeasonComparisonAutocomplete = _.flatMap(
    ["prev_", "next_"],
    (prefix) => {
      return _.flatMap(
        AdvancedFilterUtils.playerLeaderBoardAutocomplete,
        (field) => {
          if (_.endsWith(field, "_pred")) {
            return []; //(prediction strings are different with the player season comparison)
          } else if (AdvancedFilterUtils.operatorsSet.has(field)) {
            return prefix == "prev_" ? [field] : []; //(return operators just once)
          } else if (_.startsWith(field, "player_")) {
            //(TODO: incorporate transfer info and do next/prev and orig)
            return prefix == "prev_" ? [field] : []; //(return player_name|code just once)
          } else if (_.startsWith(field, "transfer_")) {
            return prefix == "prev_" ? [field] : [`next_${field}`]; //(return transfer_X and next_transfer_X)
          } else if (
            _.startsWith(field, "rank_") ||
            _.startsWith(field, "pctile_")
          ) {
            return []; // Don't currently support rank/pctile for prev/next
          } else {
            return [`${prefix}${field}`];
          }
        }
      ).concat(
        _.flatMap(["pred_ok_", "pred_good_", "pred_bad_"], (prefix) => {
          //(a small subset of fields have good/bad/ok predictions for the following year)
          return [
            "off_rtg",
            "off_usage",
            "off_adj_rapm",
            "def_adj_rapm",
            "off_team_poss_pct",
            "adj_rapm_margin",
          ].map((field) => `${prefix}${field}`);
        })
      );
    }
  );

  /** Common boolean operations */
  static fixBoolOps(s: String) {
    return s.replace(/ AND /g, " && ").replace(/ OR /g, " || ");
  }
  /** Use words for digits for autocomplete reasons - turn them back */
  static fieldReplacements(s: string) {
    return s.replace(/twop/g, "2p").replace(/threep/g, "3p");
  }

  /** Use words for digits for autocomplete reasons - turn them back */
  static playerSpecificFieldReplacements(s: string) {
    return s
      .replace(/def_blk/g, "def_2prim")
      .replace(/def_stl/g, "def_to")
      .replace(/def_fc/g, "def_ftr")
      .replace(/(off|def)_poss/g, "$1_team_poss");
  }

  /** Misc transforms to map nice auto-complete-y terms to the ugly objects (normal mode, eg player leaderboard) */
  static singleYearfixObjectFormat(s: string) {
    return s
      .replace(/ALL/g, "($.player_code)")
      .replace(
        /(off|def)_style_([0-9a-zA-Z_]+)_(pct|ppp|usg)/g,
        (substr: string, offDef: string, styleType: string, pctPpp: string) =>
          `$.${
            offDef == "def" ? "style_def" : "style" //(have to reverse prefix to avoid colliding with def_ below)
          }?.${AdvancedFilterUtils.playerStyleFromAutocomplete(
            styleType,
            pctPpp
          )}?.value`
      )
      .replace(
        /((team_stats[.])?(?:off|def)_[0-9a-zA-Z_]+)/g, //(don't include adj, see below)
        (
          substr: string,
          ignoredCaptureGroup: string,
          maybeTeamStats: string | undefined
        ) => {
          return maybeTeamStats
            ? `$.p.team_stats.${AdvancedFilterUtils.teamFixObjectFormat(
                substr.substring(maybeTeamStats.length)
              ).substring(4)}` //(replace $.p. with team stats prefix)
            : `$.p.${substr}?.value`;
        }
      )
      .replace(
        /((team_stats[.])(?:adj|raw)_[0-9a-zA-Z_]+)/g, //adj and raw when team stats _is_ specified
        (
          substr: string,
          ignoredCaptureGroup: string,
          maybeTeamStats: string
        ) => {
          return `$.p.team_stats.${AdvancedFilterUtils.teamFixObjectFormat(
            substr.substring(maybeTeamStats.length)
          ).substring(4)}`; //(replace $.p. with team stats prefix)
        }
      )
      .replace(/(^| |[(!*+/-])(adj_[0-9a-zA-Z_]+)/g, "$1$.$2") //adj for players (team_stats above) .. note no rank
      .replace(/prev_(adj_[0-9a-zA-Z_]+)/g, "$.prev_$1") //adj for players (prev year only) .. note no rank
      .replace(/((?:off|def)_[a-z_]+_rank)[?][.]value/g, "$1") //(off|def_..._rank is just a number not a Statistic)
      .replace(/roster[.]height/g, "$.normht")
      .replace(/transfer_(src|dest)/g, "$.transfer_$1")
      .replace(/player_(name|code)/g, '$.player_$1.replace(/"/g, "\'")')
      .replace(
        /(^| |[(!*+/-]|prev_)(roster[.][a-z]+|pos[CF][a-z]+|tier|team|conf|year)/g,
        "$1$.p.$2"
      )
      .replace(/[$][.]p[.]def_ftr[?][.]value/g, "(100*$.p.def_ftr?.value)") //(fouls called/50)
      .replace(/roster[.]/g, "roster?.") //(roster not always present)
      .replace(/(off|def)_reb/g, "$1_orb"); //(nicer version of rebound name)
  }
  /** Misc transforms to map nice auto-complete-y terms to the ugly objects (multi-year, eg player season comparison mode) */
  static multiYearfixObjectFormat(s: string) {
    return s
      .replace(
        /(prev|next|pred_[a-z]+)_((?:off|def)_[0-9a-zA-Z_]+)/g,
        "$.$1?.p.$2?.value"
      )
      .replace(
        /(^| |[(!*+/-])(prev|next|pred_(?:[a-z]+))_(adj_[0-9a-zA-Z_]+)/g,
        "$1$.$2?.$3"
      )
      .replace(/(prev|next|pred_[a-z]+)_roster[.]height/g, "$.$1?.normht")
      .replace(/(^|[^_])transfer_(src|dest)/g, "$1$.transfer_$2")
      .replace(/(prev|next)_transfer_(src|dest)/g, "$.$1?.transfer_$2")
      .replace(/player_(name|code)/g, "$.player_$1")
      .replace(
        /(^| |[(!*+/-])(prev|next|pred_[a-z]+)_(roster[.][a-z]+|pos[CF][a-z]+|tier|team|conf|year)/g,
        "$1$.$2?.p.$3"
      )
      .replace(
        /[$][.](prev|next|pred_[a-z]+)[.]def_ftr[?][.]value/g,
        "(100*$.$1?.p.def_ftr?.value)"
      ) //(fouls called/50)
      .replace(/roster[.]/g, "roster?.") //(roster not always present)
      .replace(/ALL/g, "($.player_code)");
  }

  /** Creates an accessor into p.style for play type analysis */
  static readonly styleFromAutocomplete = (str: string, suffix: string) => {
    return `["${_.thru(
      str,
      (__) => AdvancedFilterUtils.styleFromAutocompleteLut[str] || "unknown"
    )}"]?.${suffix == "pct" ? "possPct" : "pts"}`;
  };

  /** Creates an accessor into p.style for play type analysis */
  static readonly playerStyleFromAutocomplete = (
    str: string,
    suffix: string
  ) => {
    return `["${_.thru(
      str,
      (__) =>
        AdvancedFilterUtils.playerStyleFromAutocompleteLut[str] || "unknown"
    )}"]?.${
      suffix == "pct" ? "possPct" : suffix == "usg" ? "possPctUsg" : "pts"
    }`;
  };

  /** Converts team stats explorer autocomplete terms to ugly object formats */
  static teamFixObjectFormat(s: string) {
    return s
      .replace(
        /(team_name|conf_nick|conf|year|wins|losses|wab|wae|exp_wab|power)/g,
        "$.p.$1"
      )
      .replace(
        /(off|def)_style_([0-9a-zA-Z_]+)_(pct|ppp)/g,
        (substr: string, offDef: string, styleType: string, pctPpp: string) =>
          `$.p.${
            offDef == "def" ? "style_def" : "style" //(have to reverse prefix to avoid colliding with def_ below)
          }?.${AdvancedFilterUtils.styleFromAutocomplete(
            styleType,
            pctPpp
          )}?.value`
      )
      .replace(/((?:off|def)_[0-9a-zA-Z_]+)/g, "$.p.$1?.value")
      .replace(/adj_net/g, "$.p.off_net?.value")
      .replace(/raw_net/g, "$.p.off_raw_net?.value")
      .replace(/((?:off|def)_(?:scramble|trans))_pct/g, "$1")
      .replace(/(^| |[(!*+/-])(adj_[0-9a-zA-Z_]+)/g, "$1$.$2")
      .replace(/(off|def)_reb/g, "$1_orb"); //(nicer version of rebound name)
  }

  /** Converts lineup leaderboard autocomplete terms to ugly object formats */
  static lineupFixObjectFormat(s: string) {
    return s
      .replace(/(^| |[(!])(key)/g, '$1$.p.$2.replace(/"/g, "\'")')
      .replace(/(^| |[(!])(team_name|conf_nick|conf|year)/g, "$1$.p.$2")
      .replace(
        /((team_stats[.]|player_stats\[[0-5]\][.])?(?:off|def)_[0-9a-zA-Z_]+)/g, //(don't include adj, see below)
        (
          substr: string,
          ignoredCaptureGroup: string,
          maybeTeamStats: string | undefined
        ) => {
          return maybeTeamStats
            ? `$.p.${
                maybeTeamStats.startsWith("team") ? "team_" : maybeTeamStats
              }${AdvancedFilterUtils.teamFixObjectFormat(
                substr.substring(maybeTeamStats.length)
              ).substring(4)}` //(replace $.p. with team stats prefix)
            : `$.p.${substr}?.value`;
        }
      )
      .replace(
        /(player_stats\[[0-5]\])[.](key|code)/g,
        '$.p.$1.$2.replace(/"/g, "\'")'
      )
      .replace(
        /(player_stats\[[0-5]\])[.](height_in|year_class|ncaa_id|posClass)/g,
        "$.p.$1.$2"
      )
      .replace(/duration_mins/g, "$.p.duration_mins?.value")
      .replace(/adj_net/g, "$.p.off_net?.value")
      .replace(/raw_net/g, "$.p.off_raw_net?.value")
      .replace(/((?:off|def)_(?:scramble|trans))_pct/g, "$1")
      .replace(/(^| |[(!*+/-])(adj_[0-9a-zA-Z_]+)/g, "$1$.$2")
      .replace(/(off|def)_reb/g, "$1_orb"); //(nicer version of rebound name)
  }
  /** A second phase of transforms to make rank_ and pctile_ terms point to the right place */
  static gradeConvert(s: string) {
    return (
      s
        .replace(/rank_[$][.]p[.]team_stats[.]/g, "$.rank_team_stats.")
        .replace(/pctile_[$][.]p[.]team_stats[.]/g, "$.pctile_team_stats.")
        .replace(/rank_[$][.]p[.]/g, "$.rank.")
        .replace(/pctile_[$][.]p[.]/g, "$.pctile.")
        // For play styles in player leaderboards - decompress style so sits in top level (so needs to be below the "rank_[$][.]p[.]" cases)
        .replace(/rank_[$][.]/g, "$.rank.")
        .replace(/pctile_[$][.]/g, "$.pctile.")
        // Special cases where for some reason the underlying value is transformed by *100 (but the grade is on the original)
        .replace(/rank_[(]100[*][$][.]p[.]/g, "(100*$.rank.")
        .replace(/pctile_[(]100[*][$][.]p[.]/g, "(100*$.pctile.")
    );
  }

  /** A second phase of transforms to make prev_ terms point to the right place */
  static prevYearConvert(s: string) {
    return s
      .replace(/prev_[$][.]normht/g, "$.prev_normht")
      .replace(/prev_[$][.]p[.]/g, "$.p.prevYear?.")
      .replace(/prev_[(]100[*][$][.]p[.]/g, "(100*$.p.prevYear?.");
  }

  /** Handle == operation */
  static avoidAssigmentOperator(s: string) {
    return s.replace(/([^!<>])=[=]*/g, "$1==");
  }
  /** Convert from nice position designators to their index */
  static convertPositions(s: string) {
    return s
      .replace(/\[(?:_PG_|_1_)\]/g, "[0]")
      .replace(/\[(?:_SG_|_2_)\]/g, "[1]")
      .replace(/\[(?:_SF_|_3_)\]/g, "[2]")
      .replace(/\[(?:_PF_|_4_)\]/g, "[3]")
      .replace(/\[(?:_C_|_5_)\]/g, "[4]");
  }
  static convertPercentages(s: string) {
    return s.replace(/([0-9.]+)[%]/g, "(($1)*0.01)");
  }
  static normHeightInQuotes(s: string) {
    return s.replace(/['"]([567])[-']([0-9])['"]/g, "'$1-0$2'");
  }
  static normHeightString(s: string) {
    return s.replace(/^([567])-([0-9])$/g, "$1-0$2");
  }
  static removeAscDesc(s: string) {
    return s.replace(/(ASC|DESC)/g, "");
  }
  /** Add HS regions you've mapped out here */
  static convertRegionalBounds(s: string) {
    return s.replace(
      "hs_region_dmv",
      "(roster.lat >= 38.3201 && roster.lat <= 39.6395 && roster.lon >= -78.5330 && roster.lon <= -75.4816)"
    );
  }

  /** The Linq to data model pipeline for player expressions */
  static readonly tidyPlayerClauses: (s: string, multiYear: boolean) => string =
    (s: string, multiYear: boolean) =>
      _.flow([
        AdvancedFilterUtils.convertRegionalBounds,
        AdvancedFilterUtils.fixBoolOps,
        AdvancedFilterUtils.avoidAssigmentOperator,
        AdvancedFilterUtils.fieldReplacements,
        AdvancedFilterUtils.playerSpecificFieldReplacements,
        multiYear
          ? AdvancedFilterUtils.multiYearfixObjectFormat
          : AdvancedFilterUtils.singleYearfixObjectFormat,
        AdvancedFilterUtils.gradeConvert,
        AdvancedFilterUtils.prevYearConvert,
        AdvancedFilterUtils.convertPositions,
        AdvancedFilterUtils.convertPercentages,
        AdvancedFilterUtils.normHeightInQuotes,
        AdvancedFilterUtils.removeAscDesc,
        _.trim,
      ])(s, multiYear);

  /** The Linq to data model pipeline for player expressions */
  static readonly tidyLineupClauses: (s: string) => string = (s: string) =>
    _.flow([
      AdvancedFilterUtils.fixBoolOps,
      AdvancedFilterUtils.avoidAssigmentOperator,
      AdvancedFilterUtils.fieldReplacements,
      AdvancedFilterUtils.lineupFixObjectFormat,
      AdvancedFilterUtils.convertPercentages,
      AdvancedFilterUtils.normHeightInQuotes,
      AdvancedFilterUtils.removeAscDesc,
      _.trim,
    ])(s, false);

  /** The Linq to data model pipeline for team explorer expressions */
  static readonly tidyTeamExplorerClauses: (
    s: string,
    multiYear: boolean
  ) => string = (s: string, multiYear: boolean) =>
    _.flow([
      AdvancedFilterUtils.fixBoolOps,
      AdvancedFilterUtils.avoidAssigmentOperator,
      AdvancedFilterUtils.fieldReplacements,
      AdvancedFilterUtils.teamFixObjectFormat,
      AdvancedFilterUtils.gradeConvert,
      AdvancedFilterUtils.convertPercentages,
      AdvancedFilterUtils.removeAscDesc,
      _.trim,
    ])(s, multiYear);

  /** A common accessor for both Linq filter/sort and CSV building */
  private static buildTeamExplorerRows(
    filterStr: string,
    divStats: (year: string) => DivisionStatistics | undefined
  ): (p: any, index: number) => any {
    /** Field manipulation to list the field info for which I need to calc rank/%ile */
    const [rankFields, styleRankFields] = AdvancedFilterUtils.buildGradeQueries(
      filterStr,
      "rank_",
      false
    );
    const [pctileFields, stylePctileFields] =
      AdvancedFilterUtils.buildGradeQueries(filterStr, "pctile_", false);

    //DIAG:
    // console.log(
    //   `fields [${filterStr}]: [${pctileFields}][${stylePctileFields}][${rankFields}][${styleRankFields}]`
    // );

    return (p: any, index: number) => {
      const divStatsForYear = divStats ? divStats(p.year) : undefined;
      p.style_def = p.def_style; // (ugly, need def_style to not collide with other def_* fields)
      const retVal: any = {
        p,
        pctile: AdvancedFilterUtils.buildGrades(
          p,
          divStatsForYear,
          pctileFields,
          stylePctileFields,
          false
        ),
        rank: AdvancedFilterUtils.buildGrades(
          p,
          divStatsForYear,
          rankFields,
          styleRankFields,
          true
        ),
      };
      //More debugging:
      // if (index < 10 && retVal) {
      //   console.log(
      //     `fields [${filterStr}]: [${pctileFields}][${stylePctileFields}][${rankFields}][${styleRankFields}]`
      //   );
      //   console.log(
      //     `extra: [${JSON.stringify(p.off_raw_net)}][${JSON.stringify(
      //       p.style_def
      //     )}]`
      //   );
      //   console.log(`pctile result: ${JSON.stringify(retVal.pctile)}`);
      //   console.log(`rank result: ${JSON.stringify(retVal.rank)}`);
      // }

      return retVal;
    };
  }

  /** Builds a where/orderBy chain by interpreting the string either side of SORT_BY */
  static applyTeamExplorerFilter(
    inData: any[],
    filterStr: string,
    divStats: (year: string) => DivisionStatistics | undefined,
    extraParams: Record<string, string> = {}
  ): [any[], string | undefined] {
    // Ranking / Pctile debug
    // console.log(`rank: ${JSON.stringify(rankFields)}`);
    // console.log(`style rank: ${JSON.stringify(styleRankFields)}`);
    // console.log(`pctile: ${JSON.stringify(pctileFields)}`);
    // console.log(`style pctile: ${JSON.stringify(stylePctileFields)}`);

    return AdvancedFilterUtils.applyFilter(
      inData,
      filterStr,
      extraParams,
      false, //(multi-year ... not supported for teams)
      AdvancedFilterUtils.tidyTeamExplorerClauses,
      AdvancedFilterUtils.buildTeamExplorerRows(filterStr, divStats)
    );
  }

  /** A common accessor for both Linq filter/sort and CSV building */
  private static buildLineupRows(
    filterStr: string,
    teamDivStats: (year: string) => DivisionStatistics | undefined
  ): (p: any, index: number) => any {
    return (p: any, index: number) => {
      p.style_def = p.def_style; // (ugly, need def_style to not collide with other def_* fields)
      const retVal: any = {
        p,
      };

      return retVal;
    };
  }

  /** A common accessor for both Linq filter/sort and CSV building */
  private static buildPlayerRows(
    filterStr: string,
    playerDivStats: (year: string) => DivisionStatistics | undefined,
    teamDivStats: (year: string) => DivisionStatistics | undefined,
    multiYear: boolean
  ): (p: any, index: number) => any {
    /** Field manipulation to list the field info for which I need to calc rank/%ile */
    const [rankFields, styleRankFields] = AdvancedFilterUtils.buildGradeQueries(
      filterStr,
      "rank_",
      true
    );
    const [teamRankFields, teamStyleRankFields] =
      AdvancedFilterUtils.buildGradeQueries(
        filterStr,
        "rank_team_stats[.]",
        true
      );
    const [pctileFields, stylePctileFields] =
      AdvancedFilterUtils.buildGradeQueries(filterStr, "pctile_", true);
    const [teamPctileFields, teamStylePctileFields] =
      AdvancedFilterUtils.buildGradeQueries(
        filterStr,
        "pctile_team_stats[.]",
        true
      );

    //DIAG:
    // console.log(
    //   `Special case terms (${filterStr}): [${rankFields}][${styleRankFields}][${teamRankFields}][${teamStyleRankFields}]/` +
    //     `[${pctileFields}][${stylePctileFields}][${teamPctileFields}][${teamStylePctileFields}]`
    // );

    const buildAdjStats = (p: any, prefix: string) => {
      return {
        [`${prefix}adj_rapm_margin`]:
          (p.off_adj_rapm?.value || 0) - (p.def_adj_rapm?.value || 0),
        [`${prefix}adj_rtg_margin`]:
          (p.off_adj_rtg?.value || 0) - (p.def_adj_rtg?.value || 0),
        [`${prefix}adj_rapm_prod_margin`]:
          (p.off_adj_rapm?.value || 0) * (p.off_team_poss_pct?.value || 0) -
          (p.def_adj_rapm?.value || 0) * (p.def_team_poss_pct?.value || 0),
        [`${prefix}adj_prod_margin`]:
          (p.off_adj_rtg?.value || 0) * (p.off_team_poss_pct?.value || 0) -
          (p.def_adj_rtg?.value || 0) * (p.def_team_poss_pct?.value || 0),
        // Already have these but makes the query formatting simpler
        [`${prefix}adj_rapm_margin_rank`]: p.adj_rapm_margin_rank,
        [`${prefix}adj_rtg_margin_rank`]: p.adj_rtg_margin_rank,
        [`${prefix}adj_rapm_prod_margin_rank`]: p.adj_rapm_prod_margin_rank,
        [`${prefix}adj_prod_margin_rank`]: p.adj_prod_margin_rank,
        [`${prefix}adj_rapm_margin_pred`]:
          (p.off_adj_rapm_pred?.value || 0) - (p.def_adj_rapm_pred?.value || 0),
      };
    };

    const buildSingleYearRetVal = (p: any, index: number) => {
      const divStatsForYear = playerDivStats
        ? playerDivStats(p.year)
        : undefined;
      const teamDivStatsForYear = teamDivStats
        ? teamDivStats(p.year)
        : undefined;
      const decompStyle = PlayTypeUtils.decompressIndivPlayType(p.style);
      const retVal = {
        p: p,
        style: decompStyle,
        player_name: p.key,
        player_code: p.code,
        transfer_src: p.transfer_src || "",
        transfer_dest: p.transfer_dest || "",
        // Normalize so can do height comparisons
        normht: AdvancedFilterUtils.normHeightString(p.roster?.height || ""),
        prev_normht: p.prevYear
          ? AdvancedFilterUtils.normHeightString(
              p.prevYear.roster?.height || ""
            )
          : undefined,
        // These need to be derived
        ...buildAdjStats(p, ""),
        ...(p.prevYear ? buildAdjStats(p.prevYear, "prev_") : {}),

        // Percentile and rank, including team stats:
        //TODO: need to handle prevYear
        pctile: AdvancedFilterUtils.buildPlayerGrades(
          { p: p, style: decompStyle },
          divStatsForYear,
          pctileFields,
          stylePctileFields,
          false
        ),
        rank: AdvancedFilterUtils.buildPlayerGrades(
          { p: p, style: decompStyle },
          divStatsForYear,
          rankFields,
          styleRankFields,
          true
        ),
        pctile_team_stats: AdvancedFilterUtils.buildGrades(
          p.team_stats,
          teamDivStatsForYear,
          teamPctileFields,
          teamStylePctileFields,
          false
        ),
        rank_team_stats: AdvancedFilterUtils.buildGrades(
          p.team_stats,
          teamDivStatsForYear,
          teamRankFields,
          teamStyleRankFields,
          true
        ),
      };
      //DIAG:
      //if (index < 10) console.log(`OBJ ${JSON.stringify({ ...retVal, p: undefined })}`);
      return retVal;
    };
    const buildMultiYearRetVal = (p: any, index: number) => {
      // (Doesn't currently support ranks)
      const retVal = {
        p: p,
        player_name: p.orig?.key || p.actualResults?.key,
        player_code: p.orig?.code || p.actualResults?.code,
        transfer_src:
          p.orig?.team != p.actualResults?.team ? p.orig?.team : undefined,
        transfer_dest:
          p.orig && p.orig.team != p.actualResults?.team
            ? p.actualResults?.team
            : undefined,
        pred_ok: p.ok ? buildSingleYearRetVal(p.ok, index) : undefined,
        pred_good: p.good ? buildSingleYearRetVal(p.good, index) : undefined,
        pred_bad: p.bad ? buildSingleYearRetVal(p.bad, index) : undefined,
        prev: p.orig ? buildSingleYearRetVal(p.orig, index) : undefined,
        next: p.actualResults
          ? buildSingleYearRetVal(p.actualResults, index)
          : undefined,
      };
      //DIAG:
      //if (index < 10) console.log(`OBJ ${JSON.stringify({ ...retVal, p: undefined })}`);
      return retVal;
    };

    const buildRetVal = (p: any, index: number) => {
      return multiYear
        ? buildMultiYearRetVal(p, index)
        : buildSingleYearRetVal(p, index);
    };

    return buildRetVal;
  }

  /** Builds a where/orderBy chain by interpreting the string either side of SORT_BY */
  static applyPlayerFilter(
    inData: any[],
    filterStr: string,
    playerDivStats: (year: string) => DivisionStatistics | undefined,
    teamDivStats: (year: string) => DivisionStatistics | undefined,
    extraParams: Record<string, string> = {},
    multiYear: boolean = false
  ): [any[], string | undefined] {
    return AdvancedFilterUtils.applyFilter(
      inData,
      filterStr,
      extraParams,
      multiYear,
      AdvancedFilterUtils.tidyPlayerClauses,
      AdvancedFilterUtils.buildPlayerRows(
        filterStr,
        playerDivStats,
        teamDivStats,
        multiYear
      )
    );
  }

  /** Builds a where/orderBy chain by interpreting the string either side of SORT_BY */
  static applyLineupFilter(
    inData: any[],
    filterStr: string,
    teamDivStats: (year: string) => DivisionStatistics | undefined,
    extraParams: Record<string, string> = {}
  ): [any[], string | undefined] {
    return AdvancedFilterUtils.applyFilter(
      inData,
      filterStr,
      extraParams,
      false,
      AdvancedFilterUtils.tidyPlayerClauses,
      AdvancedFilterUtils.buildLineupRows(filterStr, teamDivStats)
    );
  }

  /** Builds a where/orderBy chain by interpreting the string either side of SORT_BY */
  static applyFilter(
    inData: any[],
    filterStr: string,
    extraParams: Record<string, string> = {},
    multiYear: boolean = false,
    tidyClauses: (s: string, multiYear: boolean) => string,
    buildRetVal: (p: any, index: number) => any
  ): [any[], string | undefined] {
    const filterFrags = filterStr.split("SORT_BY");
    const where = tidyClauses(filterFrags[0], multiYear);

    //DEBUG
    //console.log(`applyFilter: [${filterStr}] -> [${where}]`);

    const wherePlusMaybeInsert = _.isEmpty(extraParams)
      ? where
      : (where ? `( ${where} ) && ` : "") + //(inject extra params into "p")
        _.chain(extraParams)
          .toPairs()
          .flatMap((kv) => {
            return kv[1]
              ? [`($.p.${kv[0]} = ( ${tidyClauses(kv[1], multiYear)} ))`]
              : [`(true)`];
          })
          .join(" && ")
          .value();

    const sortingFrags = _.drop(filterFrags, 1);

    //DIAG:
    // console.log(
    //   `?Q = ${wherePlusMaybeInsert} SORT_BY: ${sortingFrags.map((s) =>
    //     tidyClauses(s, multiYear)
    //   )}`
    // );

    const sortByFns: Array<EnumToEnum> = sortingFrags.map(
      (sortingFrag, index) => {
        const isAsc = sortingFrag.indexOf("ASC") >= 0;
        const sortBy = tidyClauses(sortingFrag, multiYear);

        if (index == 0) {
          return (enumerable: Enumerable.IEnumerable<any>) => {
            return isAsc
              ? enumerable.orderBy(sortBy as unknown as TypeScriptWorkaround2)
              : enumerable.orderByDescending(
                  sortBy as unknown as TypeScriptWorkaround2
                );
          };
        } else {
          return (enumerable: Enumerable.IEnumerable<any>) => {
            return isAsc
              ? (enumerable as Enumerable.IOrderedEnumerable<any>).thenBy(
                  sortBy as unknown as TypeScriptWorkaround2
                )
              : (
                  enumerable as Enumerable.IOrderedEnumerable<any>
                ).thenByDescending(sortBy as unknown as TypeScriptWorkaround2);
          };
        }
      }
    );

    try {
      const enumData = Enumerable.from(
        inData.map((p, index) => {
          return buildRetVal(p, index);
        })
      );
      const filteredData =
        wherePlusMaybeInsert.length > 0
          ? enumData.where(
              wherePlusMaybeInsert as unknown as TypeScriptWorkaround1
            )
          : enumData;
      const sortedData =
        sortByFns.length > 0
          ? _.flow(sortByFns)(filteredData)
              .thenBy((p: any) => {
                // (this is all player specific, but it "fails" harmlessly for teams)
                const sortPoss = multiYear
                  ? p.p?.actualResults?.off_team_poss?.value || 0
                  : p.p?.baseline?.off_team_poss?.value || 0;
                return sortPoss;
              })
              .thenBy((p: any) => p.p?.key) //(ensure player duplicates follow each other)
          : filteredData;
      return [sortedData.toArray().map((p: any) => p.p), undefined];
    } catch (err: unknown) {
      if (_.isEmpty(extraParams)) {
        return [
          inData,
          `${
            err instanceof Error ? err.message : err
          } in ${wherePlusMaybeInsert}`,
        ];
      } else {
        //for error parsing purposes, try without the extra params
        const [filteredSortedData, errorMessage] =
          AdvancedFilterUtils.applyFilter(
            inData,
            filterStr,
            {},
            multiYear,
            tidyClauses,
            buildRetVal
          );
        return [
          filteredSortedData,
          errorMessage ||
            `${
              err instanceof Error ? err.message : err
            } in ${wherePlusMaybeInsert}`,
        ];
      }
    }
  }

  ////////////////////////////////////////////////////////////

  // CSV export logic:

  /** Team explorer CSV logic */
  static generateTeamExplorerCsv = (
    inData: any[],
    divStats?: (year: string) => DivisionStatistics | undefined
  ): [string, string[]] => {
    const headerFields = divStats
      ? _.drop(
          AdvancedFilterUtils.teamExplorerAutocomplete,
          AdvancedFilterUtils.operators.length
        )
      : AdvancedFilterUtils.teamExplorerMetadata.concat(
          AdvancedFilterUtils.teamExplorerGradedStats
        );

    const rawExpressionString = headerFields.join(" , ");
    const expressionString = AdvancedFilterUtils.tidyTeamExplorerClauses(
      `JSON.stringify([ ${rawExpressionString} ])`,
      false
    );

    const divStatsWithFallback = divStats || ((y: string) => undefined);
    const rowBuilder = AdvancedFilterUtils.buildTeamExplorerRows(
      rawExpressionString,
      divStatsWithFallback
    );
    const enumData = Enumerable.from(inData.map(rowBuilder));
    const results = enumData
      .select(expressionString as unknown as TypeScriptWorkaround2)
      .toArray() as string[];

    return [
      headerFields.join(","),
      results.map((r) => r.substring(1, r.length - 1)),
    ];
  };

  /** Player leaderboard CSV logic */
  static generatePlayerLeaderboardCsv = (
    filterStr: string,
    inData: any[],
    includesPrevYear: boolean,
    playerDivStats?: (year: string) => DivisionStatistics | undefined,
    teamDivStats?: (year: string) => DivisionStatistics | undefined
  ): [string, string[]] => {
    const posGroups = ["_PG_", "_SG_", "_SF_", "_PF_", "_C_"];
    const headerFieldsPhase1 = _.drop(
      AdvancedFilterUtils.playerLeaderBoardAutocomplete,
      AdvancedFilterUtils.operators.length
    )
      .filter(
        (field) =>
          playerDivStats || //(remove rank/pctile fields if grades not being added)
          (!_.startsWith(field, "rank_") && !_.startsWith(field, "pctile_"))
      )
      .filter(
        (field) =>
          !_.startsWith(field, "hs_region") &&
          field != "posConfidences" &&
          field != "posFreqs"
      ) //(expand these into their arrays)
      .concat(posGroups.map((pos) => `posConfidences[${pos}]`))
      .concat(posGroups.map((pos) => `posFreqs[${pos}]`));
    const headerFields = headerFieldsPhase1
      .concat(
        includesPrevYear
          ? headerFieldsPhase1
              .filter(
                (field) =>
                  !_.startsWith(field, "off_style_") && //(don't generate prev_ for style)
                  !_.startsWith(field, "rank_") &&
                  !_.startsWith(field, "pctile_") && //(don't currently support prev_ ranks)
                  !_.startsWith(field, "player_") &&
                  !_.startsWith(field, "transfer_") //(didn't generate prev_ for theses)
              )
              .map((field) => `prev_${field}`)
          : []
      )
      .concat(
        // If the user includes team stats then we'll append these at the end:
        // (currently don't support this for "prev_" fields)
        filterStr.match(
          new RegExp(
            `(?:rank_|pctile_)?team_stats[.](?:off|def|adj|raw)_[a-zA-Z_0-9]+`,
            "g"
          )
        ) || []
      );

    const rawExpressionString = headerFields.join(" , ");
    const expressionString = AdvancedFilterUtils.tidyPlayerClauses(
      `JSON.stringify([ ${rawExpressionString} ])`,
      false
    );

    //DEBUG
    //console.log(`expressionString: ${expressionString}`);

    const playerDivStatsWithFallback =
      playerDivStats || ((y: string) => undefined);
    const teamDivStatsWithFallback = teamDivStats || ((y: string) => undefined);
    const rowBuilder = AdvancedFilterUtils.buildPlayerRows(
      rawExpressionString,
      playerDivStatsWithFallback,
      teamDivStatsWithFallback,
      false
    );
    const enumData = Enumerable.from(inData.map(rowBuilder));
    const results = enumData
      .select(expressionString as unknown as TypeScriptWorkaround2)
      .toArray() as string[];

    return [
      headerFields.join(","),
      results.map((r) => r.substring(1, r.length - 1)),
    ];
  };

  /** Lineup leaderboard CSV logic */
  static generateLineupLeaderboardCsv = (
    filterStr: string,
    inData: any[],
    teamDivStats?: (year: string) => DivisionStatistics | undefined
  ): [string, string[]] => {
    const posGroups = ["_PG_", "_SG_", "_SF_", "_PF_", "_C_"];
    const headerFieldsPhase1 = _.concat(
      AdvancedFilterUtils.lineupMetadata,
      AdvancedFilterUtils.lineupStats
    ).concat(
      _.flatMap(posGroups, (__, posIndex) =>
        AdvancedFilterUtils.lineupPlayerStats.map(
          (p) => `player_stats[${posIndex}].${p}`
        )
      )
    );
    const headerFields = headerFieldsPhase1.concat(
      // If the user includes team stats then we'll append these at the end:
      // (currently don't support this for "prev_" fields)
      filterStr.match(
        new RegExp(
          `(?:rank_|pctile_)?team_stats[.](?:off|def|adj|raw)_[a-zA-Z_0-9]+`,
          "g"
        )
      ) || []
    );

    const rawExpressionString = headerFields.join(" , ");
    const expressionString = AdvancedFilterUtils.tidyLineupClauses(
      `JSON.stringify([ ${rawExpressionString} ])`
    );

    //DEBUG
    //console.log(`expressionString: ${expressionString}`);

    const teamDivStatsWithFallback = teamDivStats || ((y: string) => undefined);
    const rowBuilder = AdvancedFilterUtils.buildLineupRows(
      rawExpressionString,
      teamDivStatsWithFallback
    );
    const enumData = Enumerable.from(inData.map(rowBuilder));

    //DEBUG
    // const results = [] as string[];
    // console.log(`HEADERS = [${headerFields.join(",")}]`);
    // console.log(`KEYS = [${_.keys(inData?.[0])}]`);
    // console.log(`KEYS = [${_.keys(inData?.[0]?.player_stats)}]`);

    const results = enumData
      .select(expressionString as unknown as TypeScriptWorkaround2)
      .toArray() as string[];

    return [
      headerFields.join(","),
      results.map((r) => r.substring(1, r.length - 1)),
    ];
  };

  ////////////////////////////////////////////////////////////

  // Grade query logic:

  /** Extracts the fields for which rank/pctil need to be calculated */
  private static buildGradeQueries = (
    filterStrIn: string,
    prefix: string,
    isPlayer: boolean
  ): [string[], string[]] => {
    const allGradeQueries =
      filterStrIn.match(
        new RegExp(`${prefix}(?:off|def|adj|raw)_[a-zA-Z_0-9]+`, "g")
      ) || [];

    const gradeFieldsIncStyle = isPlayer
      ? allGradeQueries.map((preField) =>
          // Converts to the field name in the input object
          AdvancedFilterUtils.tidyPlayerClauses(
            preField.substring(_.startsWith(prefix, "rank") ? 5 : 7),
            false
          )
            .replace(/[$][.]p[.](?:off_|def_)([a-zA-Z_0-9]+).*/, "$1")
            .replace(
              /[$][.]p[.]team_stats[.](?:off_|def_)([a-zA-Z_0-9]+).*/,
              "$1"
            )
        )
      : allGradeQueries.map((preField) =>
          // Converts to the field name in the input object
          AdvancedFilterUtils.tidyTeamExplorerClauses(
            preField.substring(_.startsWith(prefix, "rank") ? 5 : 7),
            false
          ).replace(/[$][.]p[.](?:off_|def_)([a-zA-Z_0-9]+).*/, "$1")
        );

    //DEBUG
    //console.log(`gradeFieldsIncStyle: ${JSON.stringify(gradeFieldsIncStyle)}`);

    const isStyleField = (field: string) =>
      _.startsWith(field, "$.p.style") ||
      _.startsWith(field, "$.p.style_def") ||
      _.startsWith(field, "$.style") || //(player play styles)
      _.startsWith(field, "$.style_def") ||
      _.startsWith(field, "$.p.team_stats.style") ||
      _.startsWith(field, "$.p.team_stats.style_def");

    const gradeFieldsNotStyle = gradeFieldsIncStyle.filter(
      (field) => !isStyleField(field)
    );
    const styleGradesFields = _.chain(gradeFieldsIncStyle)
      .filter(isStyleField)
      .map((field) =>
        field
          .replace(
            /[$][.]p[.]style_def.*["]([^"]+)["].*[.]possPct.*/,
            "$1|DefPct"
          )
          .replace(
            /[$][.]p[.]team_stats[.]style_def.*["]([^"]+)["].*[.]possPct.*/,
            "$1|DefPct"
          )
          .replace(/[$][.]p[.]style_def.*["]([^"]+)["].*[.]pts.*/, "$1|DefPpp")
          .replace(
            /[$][.]p[.]team_stats[.]style_def.*["]([^"]+)["].*[.]pts.*/,
            "$1|DefPpp"
          )
          .replace(/[$][.]p[.]style.*["]([^"]+)["].*[.]possPct.*/, "$1|Pct")
          .replace(/[$][.]style.*["]([^"]+)["].*[.]possPctUsg.*/, "$1|UsgPct") //(player play styles, off only)
          .replace(/[$][.]style.*["]([^"]+)["].*[.]possPct.*/, "$1|Pct") //(player play styles, off only)
          .replace(
            /[$][.]p[.]team_stats[.]style.*["]([^"]+)["].*[.]possPct.*/,
            "$1|Pct"
          )
          .replace(/[$][.]p[.]style.*["]([^"]+)["].*[.]pts.*/, "$1|Ppp")
          .replace(/[$][.]style.*["]([^"]+)["].*[.]pts.*/, "$1|Ppp") //(player play styles, off only)
          .replace(
            /[$][.]p[.]team_stats[.]style.*["]([^"]+)["].*[.]pts.*/,
            "$1|Ppp"
          )
      )
      .value();

    return [gradeFieldsNotStyle, styleGradesFields];
  };

  /** Quick util to switch from pctil that GradeUtils returns to rank */
  private static pctileToRank = (val: Statistic | undefined) => {
    if (val) {
      const pcile = val?.value || 0;
      const rank = 1 + Math.round((1 - pcile) * (val?.samples || 0)); //(+1, since 100% is rank==1)
      return { value: rank };
    } else {
      return undefined;
    }
  };

  /** Builds the style grades for Linq expressions */
  private static buildStyleGrades = (
    p: any,
    divStatsForYear: DivisionStatistics,
    styleGrades: string[],
    convertToRank: boolean = false
  ) => {
    const buildField = (
      styleField: string,
      offDef: "off" | "def"
    ): [string, Statistic | undefined] => {
      const styleDecomp = styleField.split("|");
      const isPpp = styleDecomp[1] == "Ppp" || styleDecomp[1] == "DefPpp";
      const isUsg = styleDecomp[1] == "UsgPct";
      const nestedField = isPpp ? "pts" : isUsg ? "possPctUsg" : "possPct";
      const styleKey = offDef == "off" ? "style" : "def_style";
      //(this is the pointer to the original object so is def_style ie the team_details field name
      // as opposed to the temp style_def I use internally to avoid collision with def_ regexes)

      const retVal = _.thru(
        GradeUtils.getPercentile(
          divStatsForYear,
          styleField,
          p[styleKey]?.[styleDecomp[0]]?.[nestedField]?.value,
          false
        ),
        (raw) =>
          _.isNil(raw)
            ? raw
            : offDef == "off" || !isPpp
            ? raw
            : {
                ...raw,
                value: 1 - (raw?.value || 0), //(for defense, switch the %ile around)
              }
      );
      return [
        styleDecomp[0],
        {
          [nestedField]: convertToRank
            ? AdvancedFilterUtils.pctileToRank(retVal)
            : retVal,
        },
      ];
    };
    // Going to end with a format like this:
    // style: { "Dribble Jumper": { possPct|possPctUsg|pts: { value: XXX } } }
    const [offStyleGrades, defStyleGrades] = _.partition(
      styleGrades,
      (field) => !field.includes("|Def")
    );
    return divStatsForYear
      ? {
          style: _.chain(offStyleGrades)
            .transform((acc, styleField) => {
              const [styleKey, styleVal] = buildField(styleField, "off");
              if (!acc[styleKey]) {
                acc[styleKey] = styleVal;
              } else {
                acc[styleKey] = {
                  ...acc[styleKey],
                  ...styleVal,
                };
              }
            }, {} as Record<string, any>)
            .value(),
          style_def: _.chain(defStyleGrades)
            .transform((acc, styleField) => {
              const [styleKey, styleVal] = buildField(
                styleField.replace("|Def", "|"),
                "def"
              );
              //(TODO: for now we'll continue to use the offensive grades to build the %iles
              // until I've had a chance to move them over everywhere)
              if (!acc[styleKey]) {
                acc[styleKey] = styleVal;
              } else {
                acc[styleKey] = {
                  ...acc[styleKey],
                  ...styleVal,
                };
              }
            }, {} as Record<string, any>)
            .value(),
        }
      : {};
  };

  /** Builds the rank / style grades for Linq expressions */
  private static buildGrades = (
    p: any,
    divStatsForYear: DivisionStatistics | undefined,
    statGrades: string[],
    styleGrades: string[],
    convertToRank: boolean = false
  ) => {
    return divStatsForYear
      ? _.merge(
          _.mapValues(
            GradeUtils.buildTeamPercentiles(
              divStatsForYear,
              p,
              statGrades,
              convertToRank
            ),
            (s) => (convertToRank ? AdvancedFilterUtils.pctileToRank(s) : s)
          ),
          AdvancedFilterUtils.buildStyleGrades(
            p,
            divStatsForYear,
            styleGrades,
            convertToRank
          )
        )
      : {};
  };

  /** Builds the rank / style grades for Linq expressions */
  private static buildPlayerGrades = (
    playerObj: { p: any; style: any },
    divStatsForYear: DivisionStatistics | undefined,
    statGrades: string[],
    styleGrades: string[],
    convertToRank: boolean = false
  ) => {
    return divStatsForYear
      ? _.merge(
          _.mapValues(
            GradeUtils.buildTeamPercentiles(
              divStatsForYear,
              playerObj.p,
              statGrades,
              convertToRank
            ),
            (s) => (convertToRank ? AdvancedFilterUtils.pctileToRank(s) : s)
          ),
          AdvancedFilterUtils.buildStyleGrades(
            playerObj, //(style under $.style for players)
            divStatsForYear,
            styleGrades,
            convertToRank
          )
        )
      : {};
  };
}
