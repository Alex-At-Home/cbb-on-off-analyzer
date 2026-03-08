// Component imports
import {
  GenericTableOps,
  GenericTableColProps,
  ExtraColSet,
} from "../../components/GenericTable";

// Util imports
import { CbbColors } from "../CbbColors";

// Lodash:
import _ from "lodash";
import { CommonTableDefs, OffDefDualMixed, lineSep } from "./CommonTableDefs";
import { TableSortPopupMenuState } from "../../components/shared/TableSortPopupMenu";

/** Holds all the different column definitions for the similar tables used for Player tables */
export class IndivTableDefs {
  //////////////////////////////////////////////////////

  // Indiv Table Sort Info

  /** For any HTML titles */
  static indivColNameOverrides = {
    off_usage: (o: string) => `Usage (${o} / Offensive)`,
    def_usage: (o: string) => undefined,
    diff_usage: (o: string) => undefined,
    off_to: (o: string) => `TO% (${o} / Offensive)`,
    def_to: (o: string) => `Stl% (${o} / Defensive)`,
    diff_to: (o: string) => undefined,
    off_ftr: (o: string) => `FTR (${o} / Offensive)`,
    def_ftr: (o: string) => `FC/50 (${o} / Defensive)`,
    diff_ftr: (o: string) => undefined,
    off_3p: (o: string) => `3P% (${o} / Offensive)`,
    def_3p: (o: string) => `FT% (${o} / Offensive)`,
    off_2prim: (o: string) => `2P% rim (${o} / Offensive)`,
    def_2prim: (o: string) => `Blk% (${o} / Defensive)`,
    diff_2prim: (o: string) => undefined,
    //Assisted%
    def_3pr: (o: string) => `3P Assisted% (${o} / Offensive)`,
    def_2pmidr: (o: string) => `2P Mid Assisted% (${o} / Offensive)`,
    def_2primr: (o: string) => `2P Mid Assisted% (${o} / Offensive)`,
    //(Margins:)
    off_adj_rapm_margin: (o: string) => `RAPM (${o} / Net)`,
    off_adj_rapm_prod_margin: (o: string) => `RAPM Prod (${o} / Net)`,
    //(also nothing to be done about def OR% because it's both RB and OR)
    off_drb: (o: string) => `DR% (${o} / Defensive)`,
    def_drb: (o: string) => undefined,
  } as Record<string, (o: string) => string | undefined>;

  //////////////////////////////////////////////////////

  // Table Defs: Individual Table

  /** To build a less wordy set of header text for the repeating headers (roster view) */
  static repeatingIndivHeaderFields: Record<string, string> = {
    "Box Rtg": "Box",
    "Adj+ Rtg": "Adj+",
    "Adj+ Prod": "Adj+",
    "RAPM net": "RAPM",
    "RAPM Prod": "RAPM",

    "Usg Pos": "Usg",
    "TO% Stl%": "TO%",
    "FTR F/50": "FTR",
    "Rim% Blk%": "Rim%",

    "2PR mid": "MidR",
    "2PR rim": "RimR",
    "3P% FT%": "3P%",
    "2P% mid": "Mid%",
    "2P% rim": "Rim%",
  };

  /** All fields in the individual/roster table (Mixed/Dual/On/Off format for presets) */
  static readonly mainIndivTableFields = (
    rowMode: OffDefDualMixed,
    mixedMode?: "Off" | "Def", //(bug if this is undefined when rowMode == "Mixed")
  ): Record<string, GenericTableColProps> => {
    const cols = {
      //accessors vs column metadata
      title: GenericTableOps.addTitle(
        "",
        "",
        rowMode == "Dual"
          ? CommonTableDefs.singleLineRowSpanCalculator
          : CommonTableDefs.rowSpanCalculator,
        "small",
        GenericTableOps.htmlFormatter,
      ),
      sep_off_def: CommonTableDefs.offDefSeparatorPicker(rowMode),
      team_poss: GenericTableOps.addDataCol(
        CommonTableDefs.simpleHeader(mixedMode, "Poss"),
        "Total number of team possessions for selected lineups",
        GenericTableOps.defaultColorPicker,
        GenericTableOps.offHighlightFormatter(GenericTableOps.intFormatter),
      ),
      team_poss_pct: GenericTableOps.addDataCol(
        CommonTableDefs.simpleHeader(mixedMode, "Poss%"),
        "% of team possessions in selected lineups that player was on the floor",
        GenericTableOps.defaultColorPicker,
        GenericTableOps.offHighlightFormatter(GenericTableOps.percentFormatter),
      ),
      rtg: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "Box Rtg"),
        "Offensive/Defensive rating in selected lineups (box-score derived)",
        CommonTableDefs.picker(...CbbColors.pp100, rowMode, mixedMode),
      ),
      usage: GenericTableOps.addDataCol(
        CommonTableDefs.simpleHeader(mixedMode, "Usg"),
        "% of team possessions used in selected lineups, plus the position category for this player",
        CommonTableDefs.picker(...CbbColors.usg, rowMode, mixedMode),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      adj_rtg: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "Adj+ Rtg"),
        "Offensive/Defensive rating vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CommonTableDefs.picker(
          ...CbbColors.diff10_p100_redGreen,
          rowMode,
          mixedMode,
        ),
      ),
      adj_prod: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "Adj+ Prod"),
        "Offensive/Defensive production (ratings * mins%) vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CommonTableDefs.picker(
          ...CbbColors.diff10_p100_redGreen,
          rowMode,
          mixedMode,
        ),
      ),

      // Dual shows margin columns; Off/Def/Mixed show per-side RAPM
      ...(rowMode == "Dual"
        ? {
            adj_rapm_margin: GenericTableOps.addDataCol(
              "RAPM net",
              "Adjusted Plus-Minus vs D1 average (Off-Def margin)",
              CommonTableDefs.picker(
                ...CbbColors.diff10_p100_redGreen,
                rowMode,
                mixedMode,
              ),
              GenericTableOps.pointsOrHtmlFormatter,
            ),
            adj_rapm_prod_margin: GenericTableOps.addDataCol(
              "RAPM Prod",
              "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average (Off-Def margin)",
              CommonTableDefs.picker(
                ...CbbColors.diff10_p100_redGreen,
                rowMode,
                mixedMode,
              ),
              GenericTableOps.pointsOrHtmlFormatter,
            ),
          }
        : {}),
      ...(rowMode != "Dual"
        ? {
            adj_rapm: GenericTableOps.addDataCol(
              CommonTableDefs.simpleHeader(mixedMode, "RAPM"),
              "Adjusted Plus-Minus vs D1 average",
              CommonTableDefs.picker(
                ...CbbColors.diff10_p100_redGreen,
                rowMode,
                mixedMode,
              ),
              GenericTableOps.pointsOrHtmlFormatter,
            ),
            adj_rapm_prod: GenericTableOps.addDataCol(
              CommonTableDefs.simpleHeader(mixedMode, "RAPM Prod"),
              "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average",
              CommonTableDefs.picker(
                ...CbbColors.diff10_p100_redGreen,
                rowMode,
                mixedMode,
              ),
              GenericTableOps.pointsOrHtmlFormatter,
            ),
          }
        : {}),

      sep1: GenericTableOps.addColSeparator(),
      efg: GenericTableOps.addDataCol(
        CommonTableDefs.simpleHeader(mixedMode, "eFG%"),
        "Effective field goal% (3 pointers count 1.5x as much) in selected lineups",
        CommonTableDefs.picker(...CbbColors.eFG, rowMode, mixedMode),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      assist: GenericTableOps.addDataCol(
        CommonTableDefs.simpleHeader(mixedMode, "A%"),
        "Assist % for player in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_ast, rowMode, mixedMode),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      to: GenericTableOps.addPctCol(
        mixedMode === undefined
          ? "TO% Stl%"
          : mixedMode === "Def"
            ? "Def Stl%"
            : "Off TO%",
        "Turnover % / Steal % in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_tOver, rowMode, mixedMode),
      ),
      orb: GenericTableOps.addPctCol(
        mixedMode === undefined
          ? "RB%"
          : mixedMode === "Def"
            ? "Def DR%"
            : "Off OR%",
        "Offensive/Defensive rebounding % in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_oReb, rowMode, mixedMode),
      ),
      drb: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "DR%"),
        "Defensive rebounding % in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_dReb, rowMode, mixedMode),
      ),
      ftr: GenericTableOps.addPctCol(
        mixedMode === undefined
          ? "FTR F/50"
          : mixedMode === "Def"
            ? "Def FC/50"
            : "Off FTR",
        "Free throw rate (off) and Fouls called/50 possessions (def) in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_ftr, rowMode, mixedMode),
      ),
      sep_off_ast:
        rowMode == "Dual"
          ? GenericTableOps.addColSeparator()
          : GenericTableOps.addSpecialColSeparator("__off_ast__"),
      "3pr": GenericTableOps.addDataCol(
        CommonTableDefs.simpleHeader(mixedMode, "3PR"),
        "Percentage of 3 pointers taken against all field goals (assisted% below)",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      "2pmidr": GenericTableOps.addDataCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "midR", "2PR mid"),
        "Percentage of mid range 2 pointers taken against all field goals (assisted% below)",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      "2primr": GenericTableOps.addDataCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "rimR", "2PR rim"),
        "Percentage of layup/dunk/etc 2 pointers taken against all field goals (assisted% below)",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      sep3: GenericTableOps.addSpecialColSeparator("__ft__"),
      "3p": GenericTableOps.addDataCol(
        mixedMode === undefined
          ? "3P% FT%"
          : mixedMode === "Def"
            ? "Def FT%"
            : "Off 3P%",
        "3 point field goal percentage / FT% in lower row",
        CommonTableDefs.picker(...CbbColors.fg3P, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.off_FT),
      ),
      "2p": GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "2P%"),
        "2 point field goal percentage",
        CommonTableDefs.picker(...CbbColors.fg2P, rowMode, mixedMode),
      ),
      "2pmid": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "mid%", "2P% mid"),
        "2 point field goal percentage (mid range)",
        CommonTableDefs.picker(...CbbColors.fg2P_mid, rowMode, mixedMode),
      ),
      "2prim": GenericTableOps.addPctCol(
        mixedMode === undefined
          ? "Rim% Blk%"
          : mixedMode === "Def"
            ? "Def Blk%"
            : "Off Rim%",
        "2 point field goal percentage (off) and Block% (def)",
        CommonTableDefs.picker(...CbbColors.p_fg2P_rim, rowMode, mixedMode),
      ),
      sep4: GenericTableOps.addColSeparator(),
      adj_opp: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "SoS"),
        "Weighted average of the offensive or defensive efficiencies of the player's opponents",
        GenericTableOps.defaultColorPicker,
      ),
    } as Record<string, GenericTableColProps>;
    return CommonTableDefs.buildMixedColSet(cols, rowMode, mixedMode);
  };

  //////////////////////////////////////////////////////

  // Table Defs: On/Off Table (Mixed/Dual/On/Off format for presets)

  static readonly onOffReport = (
    rowMode: OffDefDualMixed,
    mixedMode?: "Off" | "Def", //(bug if this is undefined when rowMode == "Mixed")
  ): Record<string, GenericTableColProps> => {
    const cols = {
      title: GenericTableOps.addTitle(
        "",
        "",
        rowMode == "Dual"
          ? CommonTableDefs.rowSpanCalculator
          : CommonTableDefs.fixedSizeRowSpanCalculator,
        "small",
      ),
      sep_off_def: CommonTableDefs.offDefSeparatorPicker(rowMode),
      ppp: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "P/100"),
        "Points per 100 possessions",
        CommonTableDefs.picker(...CbbColors.pp100, rowMode, mixedMode),
      ),
      adj_ppp: GenericTableOps.addPtsCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "Adj", "Adj P/100"),
        "Approximate schedule-adjusted Points per 100 possessions",
        CommonTableDefs.picker(...CbbColors.pp100, rowMode, mixedMode),
      ),
      sep1: GenericTableOps.addColSeparator(),
      efg: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "eFG%"),
        "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
        CommonTableDefs.picker(...CbbColors.eFG, rowMode, mixedMode),
      ),
      to: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "TO%"),
        "Turnover % for selected lineups",
        CommonTableDefs.picker(...CbbColors.tOver, rowMode, mixedMode),
      ),
      orb: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "OR%"),
        "Offensive rebounding % for selected lineups",
        CommonTableDefs.picker(...CbbColors.oReb, rowMode, mixedMode),
      ),
      ftr: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "FTR"),
        "Free throw rate for selected lineups",
        CommonTableDefs.picker(...CbbColors.ftr, rowMode, mixedMode),
      ),
      sep2a: GenericTableOps.addColSeparator(),
      assist: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "A%"),
        "Assist % for selected lineups",
        CommonTableDefs.picker(...CbbColors.ast, rowMode, mixedMode),
      ),
      sep2b: GenericTableOps.addColSeparator(0.05),
      "3pr": GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "3PR"),
        "Percentage of 3 pointers taken against all field goals",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode),
      ),
      "2pmidr": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "midR", "2PR mid"),
        "Percentage of mid range 2 pointers taken against all field goals",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode),
      ),
      "2primr": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "rimR", "2PR rim"),
        "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode),
      ),
      sep3: GenericTableOps.addColSeparator(),
      "3p": GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "3P%"),
        "3 point field goal percentage",
        CommonTableDefs.picker(...CbbColors.fg3P, rowMode, mixedMode),
      ),
      "2p": GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "2P%"),
        "2 point field goal percentage",
        CommonTableDefs.picker(...CbbColors.fg2P, rowMode, mixedMode),
      ),
      "2pmid": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "mid%", "2P% mid"),
        "2 point field goal percentage (mid range)",
        CommonTableDefs.picker(...CbbColors.fg2P_mid, rowMode, mixedMode),
      ),
      "2prim": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "rim%", "2P% rim"),
        "2 point field goal percentage (layup/dunk/etc)",
        CommonTableDefs.picker(...CbbColors.fg2P_rim, rowMode, mixedMode),
      ),
      sep4: GenericTableOps.addColSeparator(),
      poss: GenericTableOps.addIntCol(
        CommonTableDefs.simpleHeader(mixedMode, "Poss"),
        "Total number of possessions for selected lineups",
        GenericTableOps.defaultColorPicker,
      ),
      adj_opp: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "SoS"),
        "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
        GenericTableOps.defaultColorPicker,
      ),
    };
    return CommonTableDefs.buildMixedColSet(cols, rowMode, mixedMode);
  };

  //////////////////////////////////////////////////////

  // PRESETS
}
