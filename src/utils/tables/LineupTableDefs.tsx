// React imports:
import React from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
  ExtraColSet,
} from "../../components/GenericTable";

// Util imports
import { CbbColors } from "../CbbColors";
import { TableDisplayUtils } from "./TableDisplayUtils"; // Import needed for tooltips/links if used

// Lodash:
import _ from "lodash";
import { CommonTableDefs, OffDefDualMixed } from "./CommonTableDefs";

/** Holds all the different column definitions for the similar tables used throughout this SPA */
export class LineupTableDefs {
  /** "Overrides" of standard utils */
  static offPrefixFn = (key: string) => {
    if (key == "net_adj_rtg") {
      return "off_net";
    } else if (key == "net_raw_rtg") {
      return "def_net";
    } else {
      return CommonTableDefs.offPrefixFn(key);
    }
  };
  static defPrefixFn = (key: string) => {
    if (key == "net_adj_rtg") {
      return "off_net";
    } else if (key == "net_raw_rtg") {
      return "def_net";
    } else if (key == "title") {
      return "off_title";
    } else {
      return CommonTableDefs.defPrefixFn(key);
    }
  };

  /** All fields in the lineup table */
  static readonly mainLineupTableFields = (
    rowMode: OffDefDualMixed,
    mixedMode?: "Off" | "Def" //(bug if this is undefined when rowMode == "Mixed")
  ): Record<string, GenericTableColProps> => {
    const cols = {
      //accessors vs column metadata
      title: GenericTableOps.addTitle(
        "",
        "",
        rowMode == "Dual"
          ? CommonTableDefs.rowSpanCalculator
          : CommonTableDefs.fixedSizeRowSpanCalculator,
        "small",
        GenericTableOps.htmlFormatter,
        20
      ),
      // The "net" fields are different between the different modes:
      ...(rowMode == "Dual"
        ? {
            sep_adj_net: GenericTableOps.addSpecialColSeparator("__adj_raw__"),
            net: GenericTableOps.addDataCol(
              "Net Rtg",
              "The margin between the adjusted offensive and defensive efficiencies (lower number is raw margin)",
              CbbColors.offOnlyPicker(...CbbColors.diff35_p100_redGreen),
              GenericTableOps.pointsOrHtmlFormatter
            ),
          }
        : {}),
      ...(rowMode == "Off" || rowMode == "Def"
        ? {
            //TODO: how can I support def_net meaning adjusted here?
            sep_adj_net: GenericTableOps.addSpecialColSeparator("__net__"),
            net_adj_rtg: GenericTableOps.addDataCol(
              "Adj Rtg",
              "The margin between the adjusted offensive and defensive efficiencies",
              CbbColors.varPicker(CbbColors.off_diff35_p100_redGreen),
              GenericTableOps.pointsOrHtmlFormatter
            ),
            net_raw_rtg: GenericTableOps.addDataCol(
              "Raw Rtg",
              "The margin between the raw offensive and defensive efficiencies",
              CbbColors.applyThemedBackground,
              GenericTableOps.pointsOrHtmlFormatter
            ),
          }
        : {}),
      ...(rowMode == "Mixed"
        ? {
            sep_adj_net: GenericTableOps.addSpecialColSeparator("__net__"),
            off_net: GenericTableOps.addDataCol(
              "Adj Rtg",
              "The margin between the adjusted offensive and defensive efficiencies",
              CbbColors.varPicker(CbbColors.off_diff35_p100_redGreen),
              GenericTableOps.pointsOrHtmlFormatter
            ),
            def_net: GenericTableOps.addDataCol(
              "Net Rtg",
              "The margin between the raw offensive and defensive efficiencies",
              CbbColors.applyThemedBackground,
              GenericTableOps.pointsOrHtmlFormatter
            ),
          }
        : {}),
      sep_off_def: CommonTableDefs.offDefSeparatorPicker(rowMode),
      raw_pts: GenericTableOps.addDataCol(
        CommonTableDefs.simpleHeader(mixedMode, "Pts"),
        "Points scored/conceded by this lineup",
        CbbColors.applyThemedBackground,
        GenericTableOps.pointsOrHtmlFormatter
      ),
      ppp: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "P/100"),
        "Points per 100 possessions",
        CommonTableDefs.picker(...CbbColors.pp100, rowMode, mixedMode)
      ),
      adj_ppp: GenericTableOps.addPtsCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "Adj", "Adj P/100"),
        "Approximate schedule-adjusted Points per 100 possessions",
        CommonTableDefs.picker(...CbbColors.pp100, rowMode, mixedMode)
      ),
      sep1: GenericTableOps.addColSeparator(0.05),
      efg: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "eFG%"),
        "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
        CommonTableDefs.picker(...CbbColors.eFG, rowMode, mixedMode)
      ),
      to: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "TO%"),
        "Turnover % for selected lineups",
        CommonTableDefs.picker(...CbbColors.tOver, rowMode, mixedMode)
      ),
      orb: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "OR%"),
        "Offensive rebounding % for selected lineups",
        CommonTableDefs.picker(...CbbColors.oReb, rowMode, mixedMode)
      ),
      ftr: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "FTR"),
        "Free throw rate for selected lineups",
        CommonTableDefs.picker(...CbbColors.ftr, rowMode, mixedMode)
      ),
      sep2a: GenericTableOps.addColSeparator(),
      assist: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "A%"),
        "Assist % for selected lineups",
        CommonTableDefs.picker(...CbbColors.ast, rowMode, mixedMode)
      ),
      sep2b: GenericTableOps.addColSeparator(0.05),
      "3pr": GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "3PR"),
        "Percentage of 3 pointers taken against all field goals",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      "2pmidr": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "midR", "2PR mid"),
        "Percentage of mid range 2 pointers taken against all field goals",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      "2primr": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "rimR", "2PR rim"),
        "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      sep3: GenericTableOps.addColSeparator(0.05),
      "3p": GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "3P%"),
        "3 point field goal percentage",
        CommonTableDefs.picker(...CbbColors.fg3P, rowMode, mixedMode)
      ),
      "2p": GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "2P%"),
        "2 point field goal percentage",
        CommonTableDefs.picker(...CbbColors.fg2P, rowMode, mixedMode)
      ),
      "2pmid": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "mid%", "2P% mid"),
        "2 point field goal percentage (mid range)",
        CommonTableDefs.picker(...CbbColors.fg2P_mid, rowMode, mixedMode)
      ),
      "2prim": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "rim%", "2P% rim"),
        "2 point field goal percentage (layup/dunk/etc)",
        CommonTableDefs.picker(...CbbColors.fg2P_rim, rowMode, mixedMode)
      ),
      sep4: GenericTableOps.addColSeparator(0.05),
      poss: GenericTableOps.addIntCol(
        CommonTableDefs.simpleHeader(mixedMode, "Poss"),
        "Total number of possessions for selected lineups",
        GenericTableOps.defaultColorPicker
      ),
      adj_opp: GenericTableOps.addPtsCol(
        CommonTableDefs.simpleHeader(mixedMode, "SoS"),
        "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
        GenericTableOps.defaultColorPicker
      ),
    };
    return CommonTableDefs.buildMixedColSet(cols, rowMode, mixedMode);
  };

  // Other stats of interest:

  static readonly assistDetailsTable = (
    rowMode: OffDefDualMixed,
    mixedMode?: "Off" | "Def" //(bug if this is undefined when rowMode == "Mixed")
  ): Record<string, GenericTableColProps> => {
    const cols = {
      "3p_ast": GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "A-3P", "AST 3P"),
        "% of assists that are for 3P",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      mid_ast: GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "A-2M", "AST Mid"),
        "% of assists that are for mid-range 2P",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      rim_ast: GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "A-2R", "AST Rim"),
        "% of assists that are for 2PAs at the rim",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      sep2: GenericTableOps.addColSeparator(),
      ast_3p: GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "3P-A", "3P AST%"),
        "% of 3P that are assisted",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      ast_mid: GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "2M-A", "Mid AST%"),
        "% of mid-range 2P that are assisted",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
      ast_rim: GenericTableOps.addPctCol(
        CommonTableDefs.specialMixedHeader(mixedMode, "2R-A", "Rim AST%"),
        "% of 2PAs at the rim that are assisted",
        CommonTableDefs.picker(...CbbColors.fgr, rowMode, mixedMode)
      ),
    };
    return CommonTableDefs.buildMixedColSet(cols, rowMode, mixedMode);
  };

  static readonly miscDetailsTable = (
    rowMode: OffDefDualMixed,
    mixedMode?: "Off" | "Def" //(bug if this is undefined when rowMode == "Mixed")
  ): Record<string, GenericTableColProps> => {
    const cols = {
      ft: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "FT%"),
        "Free throw %",
        CommonTableDefs.picker(...CbbColors.ft, rowMode, mixedMode)
      ),
      sep2: GenericTableOps.addColSeparator(),
      stl: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "Stl%"),
        "Steal %",
        CommonTableDefs.picker(...CbbColors.TO_comp, rowMode, mixedMode)
      ),
      to_nonstl: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "Non-Stl%"),
        "Non-Steal TO%",
        CommonTableDefs.picker(...CbbColors.TO_comp, rowMode, mixedMode)
      ),
      blk: GenericTableOps.addPctCol(
        CommonTableDefs.simpleHeader(mixedMode, "Blk%"),
        "Block %",
        CommonTableDefs.picker(...CbbColors.TO_comp, rowMode, mixedMode)
      ),
    };
    return CommonTableDefs.buildMixedColSet(cols, rowMode, mixedMode);
  };

  /** Handles the app-level table viewing logic */
  static readonly rawPtsPicker = (
    rawPts: boolean,
    inColSet: Record<string, GenericTableColProps>
  ) => {
    return _.omit(
      inColSet,
      rawPts
        ? ["off_ppp", "def_ppp", "ppp"]
        : ["off_raw_pts", "def_raw_pts", "raw_pts"]
    );
  };

  static readonly allDualLineupFields =
    LineupTableDefs.mainLineupTableFields("Dual");
  static readonly allOffOnlyLineupFields =
    LineupTableDefs.mainLineupTableFields("Off");
  static readonly allDefOnlyLineupFields =
    LineupTableDefs.mainLineupTableFields("Def");
  static readonly allMixedOffLineupFields =
    LineupTableDefs.mainLineupTableFields("Mixed", "Off");
  static readonly allMixedDefLineupFields =
    LineupTableDefs.mainLineupTableFields("Mixed", "Def");

  // Extra lineup table presets:

  //TODO: memoize this?
  static readonly lineupsExtraColSet = _.memoize(
    (
      rawPts: boolean
    ): Record<string, ExtraColSet & { rowMode: OffDefDualMixed }> => ({
      Default: {
        isPreset: false,
        rowMode: "Dual",
        name: "Default",
        description: "Fields from the default Lineup table layout",
        colSet: CommonTableDefs.lineupTable(rawPts),
      },
      extraDual: {
        isPreset: false,
        rowMode: "Dual",
        name: "Extra Fields",
        description: "Useful additional fields",
        colSet: {
          raw_pts: GenericTableOps.addDataCol(
            "Pts",
            "Points scored/conceded by this lineup",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter
          ),
          ...LineupTableDefs.miscDetailsTable("Dual"),
          ...LineupTableDefs.assistDetailsTable("Dual"),
          //TODO others (here and in other spots): mins, play types, etc
        },
      },
      extraMixed: {
        isPreset: false,
        rowMode: "Mixed",
        description: "Useful additional fields",
        name: "Extra Fields",
        colSet: {
          off_raw_pts: GenericTableOps.addDataCol(
            "Off Pts",
            "Points scored by this lineup",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter
          ),
          def_raw_pts: GenericTableOps.addDataCol(
            "Def Pts",
            "Points conceded by this lineup",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter
          ),
          ...LineupTableDefs.miscDetailsTable("Mixed", "Off"),
          ...LineupTableDefs.miscDetailsTable("Mixed", "Def"),
          ...LineupTableDefs.assistDetailsTable("Mixed", "Off"),
          ...LineupTableDefs.assistDetailsTable("Mixed", "Def"),
        },
      },
      extraOff: {
        isPreset: false,
        rowMode: "Off",
        description: "Useful additional fields",
        name: "Extra Fields",
        colSet: {
          raw_pts: GenericTableOps.addDataCol(
            "Off Pts",
            "Points scored by this lineup",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter
          ),
          ...LineupTableDefs.miscDetailsTable("Off"),
          ...LineupTableDefs.assistDetailsTable("Off"),
        },
      },
      extraDef: {
        isPreset: false,
        rowMode: "Def",
        description: "Useful additional fields",
        name: "Extra Fields",
        colSet: {
          raw_pts: GenericTableOps.addDataCol(
            "Def Pts",
            "Points scored by this lineup",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter
          ),
          ...LineupTableDefs.miscDetailsTable("Def"),
          ...LineupTableDefs.assistDetailsTable("Def"),
        },
      },
      simpleMixed: {
        isPreset: true,
        rowMode: "Mixed",
        name: "Simple (Desktop)",
        description:
          "A simple single line view of the most important few stats",
        colSet: LineupTableDefs.rawPtsPicker(rawPts, {
          off_title: LineupTableDefs.allMixedOffLineupFields.off_title,
          sep1: GenericTableOps.addColSeparator(),
          off_net: LineupTableDefs.allMixedOffLineupFields.off_net,
          def_net: LineupTableDefs.allMixedDefLineupFields.def_net,
          off_adj_ppp: LineupTableDefs.allMixedOffLineupFields.off_adj_ppp,
          def_adj_ppp: LineupTableDefs.allMixedDefLineupFields.def_adj_ppp,
          sep2: GenericTableOps.addColSeparator(),
          off_3p: LineupTableDefs.allMixedOffLineupFields.off_3p,
          def_3p: LineupTableDefs.allMixedDefLineupFields.def_3p,
          off_poss: LineupTableDefs.allMixedOffLineupFields.off_poss,
        }),
      },
      simpleDual: {
        isPreset: true,
        rowMode: "Dual",
        name: "Simple (Mobile)",
        description: "Mobile friendly view of basic off/def view",
        colSet: _.pick(CommonTableDefs.lineupTable(rawPts), [
          "title",
          "sep_adj_net",
          "net",
          "sep_off_def",
          "adj_ppp",
          "3p",
          "poss",
        ]),
      },
      offenseSingleRow: {
        isPreset: true,
        rowMode: "Off",
        name: "Offense Only",
        description: "A single row showing all offensive stats",
        colSet: LineupTableDefs.rawPtsPicker(
          rawPts,
          LineupTableDefs.allOffOnlyLineupFields
        ),
      },
      defenseSingleRow: {
        isPreset: true,
        rowMode: "Def",
        name: "Defense Only",
        description: "A single row showing all defensive stats",
        colSet: LineupTableDefs.rawPtsPicker(
          rawPts,
          LineupTableDefs.allDefOnlyLineupFields
        ),
      },
      emptyDual: {
        isPreset: true,
        rowMode: "Dual",
        name: "Empty Table (dual row)",
        description:
          "An empty set of columns - pick whatever you want (top row offense, bottom row defense)",
        colSet: {
          title: LineupTableDefs.allDualLineupFields.title,
        } as Record<string, GenericTableColProps>,
      },
      emptySingle: {
        isPreset: true,
        rowMode: "Mixed",
        name: "Empty Table (single row)",
        description:
          "An empty set of columns - pick whatever you want (mixing offense and defense)",
        colSet: {
          off_title: LineupTableDefs.allMixedOffLineupFields.off_title,
        } as Record<string, GenericTableColProps>,
      },
      offenseOnlyMixed: {
        isPreset: false,
        name: "Offensive Stats",
        rowMode: "Mixed",
        description: "A collection of offensive stats",
        colSet: LineupTableDefs.allMixedOffLineupFields,
      },
      defenseOnlyMixed: {
        isPreset: false,
        rowMode: "Mixed",
        name: "Defensive Stats",
        description: "A collection of defensive stats",
        colSet: LineupTableDefs.allMixedDefLineupFields,
      },
    })
  );
}
