import _, { at } from "lodash";
import Enumerable from "linq";
import { transition } from "d3";
import { DivisionStatistics, Statistic } from "./StatModels";
import { GradeUtils } from "./stats/GradeUtils";
import { DivisionStatsCache } from "./tables/GradeTableUtils";

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
  ];

  static readonly teamExplorerAutocomplete = AdvancedFilterUtils.operators
    .concat(
      _.flatten([
        AdvancedFilterUtils.teamExplorerGradedStats,
        AdvancedFilterUtils.teamExplorerGradedStats.map(
          (field) => `rank_${field}`
        ),
        AdvancedFilterUtils.teamExplorerGradedStats.map(
          (field) => `pctile_${field}`
        ),
      ])
    )
    .concat([
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
    ]);

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

  static readonly playerLeaderBoardAutocomplete =
    AdvancedFilterUtils.operators.concat([
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
    ]);

  static readonly playerLboardWithTeamStatsAutcomplete =
    AdvancedFilterUtils.playerLeaderBoardAutocomplete.concat(
      AdvancedFilterUtils.teamExplorerAutocomplete
        .filter(
          (field) => _.startsWith(field, "off_") || _.startsWith(field, "def_")
        )
        .map((field) => `team_stats.${field}`)
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

  static fixBoolOps(s: String) {
    return s.replace(/ AND /g, " && ").replace(/ OR /g, " || ");
  }
  static fieldReplacements(s: string) {
    return s
      .replace(/twop/g, "2p")
      .replace(/threep/g, "3p")
      .replace(/def_blk/g, "def_2prim")
      .replace(/def_stl/g, "def_to")
      .replace(/def_fc/g, "def_ftr")
      .replace(/(off|def)_poss/g, "$1_team_poss");
  }
  static singleYearfixObjectFormat(s: string) {
    return s
      .replace(/ALL/g, "($.player_code)")
      .replace(
        /((team_stats[.])?(?:off|def)_[0-9a-zA-Z_]+)/g,
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
      .replace(/(^| |[(!*+/-])(adj_[0-9a-zA-Z_]+)/g, "$1$.$2")
      .replace(/roster[.]height/g, "$.normht")
      .replace(/transfer_(src|dest)/g, "$.transfer_$1")
      .replace(/player_(name|code)/g, "$.player_$1")
      .replace(
        /(^| |[(!*+/-])(roster[.][a-z]+|pos[CF][a-z]+|tier|team|conf|year)/g,
        "$1$.p.$2"
      )
      .replace(/[$][.]p[.]def_ftr[?][.]value/g, "(100*$.p.def_ftr?.value)") //(fouls called/50)
      .replace(/roster[.]/g, "roster?.") //(roster not always present)
      .replace(/(off|def)_reb/g, "$1_orb"); //(nicer version of rebound name)
  }
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

  static teamFixObjectFormat(s: string) {
    return s
      .replace(
        /(team_name|conf_nick|conf|year|wins|losses|wab|wae|exp_wab|power)/g,
        "$.p.$1"
      )
      .replace(
        /(off|def)_style_([0-9a-zA-Z_]+)_(pct|ppp)/g,
        (substr: string, offDef: string, styleType: string, pctPpp: string) =>
          `$.p.style?.${AdvancedFilterUtils.styleFromAutocomplete(
            styleType,
            pctPpp
          )}?.value`
      )
      .replace(/((?:off|def)_[0-9a-zA-Z_]+)/g, "$.p.$1?.value")
      .replace(/adj_net/g, "$.p.off_net?.value")
      .replace(/raw_net/g, "$.p.off_raw_net?.value")
      .replace(/((?:off|def)_(?:scramble|trans))_pct/, "$1")
      .replace(/(^| |[(!*+/-])(adj_[0-9a-zA-Z_]+)/g, "$1$.$2")
      .replace(/(off|def)_reb/g, "$1_orb"); //(nicer version of rebound name)
  }

  static gradeConvert(s: string) {
    return s
      .replace(/rank_[$][.]p[.]/g, "$.rank.")
      .replace(/pctile_[$][.]p[.]/g, "$.pctile.");
  }

  static avoidAssigmentOperator(s: string) {
    return s.replace(/([^!<>])=[=]*/g, "$1==");
  }
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
        multiYear
          ? AdvancedFilterUtils.multiYearfixObjectFormat
          : AdvancedFilterUtils.singleYearfixObjectFormat,
        AdvancedFilterUtils.convertPositions,
        AdvancedFilterUtils.convertPercentages,
        AdvancedFilterUtils.normHeightInQuotes,
        AdvancedFilterUtils.removeAscDesc,
        _.trim,
      ])(s, multiYear);

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

  /** Builds a where/orderBy chain by interpreting the string either side of SORT_BY */
  static applyTeamExplorerFilter(
    inData: any[],
    filterStr: string,
    divStats: (year: string) => DivisionStatistics | undefined,
    extraParams: Record<string, string> = {}
  ): [any[], string | undefined] {
    /** Field manipulation to list the field info for which I need to calc rank/%ile */
    const [rankFields, styleRankFields] = AdvancedFilterUtils.buildGradeQueries(
      filterStr,
      "rank"
    );
    const [pctileFields, stylePctileFields] =
      AdvancedFilterUtils.buildGradeQueries(filterStr, "pctile");

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
      (p: any, index: number) => {
        const divStatsForYear = divStats ? divStats(p.year) : undefined;
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
        // More debugging:
        // if (index < 10 && divStats) {
        //   console.log(`extra: [${JSON.stringify(p.off_net)}]`);
        //   console.log(`pctile result: ${JSON.stringify(retVal.pctile)}`);
        //   console.log(`rank result: ${JSON.stringify(retVal.rank)}`);
        // }

        return retVal;
      }
    );
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
    const buildSingleYearRetVal = (p: any, index: number) => {
      const retVal = {
        p: p,
        player_name: p.key,
        player_code: p.code,
        transfer_src: p.transfer_src || "",
        transfer_dest: p.transfer_dest || "",
        // Normalize so can do height comparisons
        normht: AdvancedFilterUtils.normHeightString(p.roster?.height || ""),
        // These need to be derived
        adj_rapm_margin:
          (p.off_adj_rapm?.value || 0) - (p.def_adj_rapm?.value || 0),
        adj_rtg_margin:
          (p.off_adj_rtg?.value || 0) - (p.def_adj_rtg?.value || 0),
        adj_rapm_prod_margin:
          (p.off_adj_rapm?.value || 0) * (p.off_team_poss_pct?.value || 0) -
          (p.def_adj_rapm?.value || 0) * (p.def_team_poss_pct?.value || 0),
        adj_prod_margin:
          (p.off_adj_rtg?.value || 0) * (p.off_team_poss_pct?.value || 0) -
          (p.def_adj_rtg?.value || 0) * (p.def_team_poss_pct?.value || 0),
        // Already have these but makes the query formatting simpler
        adj_rapm_margin_rank: p.adj_rapm_margin_rank,
        adj_rtg_margin_rank: p.adj_rtg_margin_rank,
        adj_rapm_prod_margin_rank: p.adj_rapm_prod_margin_rank,
        adj_prod_margin_rank: p.adj_prod_margin_rank,
        adj_rapm_margin_pred:
          (p.off_adj_rapm_pred?.value || 0) - (p.def_adj_rapm_pred?.value || 0),
      };
      //DIAG:
      //if (index < 10) console.log(`OBJ ${JSON.stringify({ ...retVal, p: undefined })}`);
      return retVal;
    };
    const buildMultiYearRetVal = (p: any, index: number) => {
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

    return AdvancedFilterUtils.applyFilter(
      inData,
      filterStr,
      extraParams,
      multiYear,
      AdvancedFilterUtils.tidyPlayerClauses,
      buildRetVal
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
    //console.log(`?Q = ${wherePlusMaybeInsert} SORT_BY: ${sortingFrags.map(s => AdvancedFilterUtils.tidyClauses(s, multiYear))}`);

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

  // Grade query logic:

  /** Extracts the fields for which rank/pctil need to be calculated */
  private static buildGradeQueries = (
    filterStrIn: string,
    prefix: string
  ): [string[], string[]] => {
    const allGradeQueries =
      filterStrIn.match(
        new RegExp(`${prefix}_(?:off|def|adj|raw)_[a-zA-Z_0-9]+`, "g")
      ) || [];

    const gradeFieldsIncStyle = allGradeQueries.map((preField) =>
      // Converts to the field name in the input object
      AdvancedFilterUtils.tidyTeamExplorerClauses(
        preField.substring(prefix == "rank" ? 5 : 7),
        false
      ).replace(/[$][.]p[.](?:off_|def_)([a-zA-Z_0-9]+).*/, "$1")
    );

    const gradeFieldsNotStyle = gradeFieldsIncStyle.filter(
      (field) => !_.startsWith(field, "$.p.style")
    );
    const styleGradesFields = _.chain(gradeFieldsIncStyle)
      .filter((field) => _.startsWith(field, "$.p.style"))
      .map((field) =>
        field
          .replace(/[$][.]p[.]style.*["]([^"]+)["].*[.]possPct.*/, "$1|Pct")
          .replace(/[$][.]p[.]style.*["]([^"]+)["].*[.]pts.*/, "$1|Ppp")
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
    // Going to end with a format like this:
    // style: { "Dribble Jumper": { possPct|pts: { value: XXX } } }
    return divStatsForYear
      ? {
          style: _.chain(styleGrades)
            .map((styleField) => {
              const styleDecomp = styleField.split("|");
              const isPpp = styleDecomp[1] == "Ppp";
              const nestedField = isPpp ? "pts" : "possPct";
              const retVal = GradeUtils.getPercentile(
                divStatsForYear,
                styleField,
                p.style?.[styleDecomp[0]]?.[nestedField]?.value,
                false
              );
              return [
                styleDecomp[0],
                {
                  [nestedField]: convertToRank
                    ? AdvancedFilterUtils.pctileToRank(retVal)
                    : retVal,
                },
              ];
            })
            .fromPairs()
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
}
