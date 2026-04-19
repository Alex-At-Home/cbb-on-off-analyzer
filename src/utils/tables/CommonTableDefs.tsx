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
import { TableSortPopupMenuState } from "../../components/shared/TableSortPopupMenu";

export const lineSep = (
  <hr
    style={{
      border: "none",
      height: "1px",
      padding: 0,
      marginTop: "2px",
      marginBottom: 0,
      backgroundColor: "#aaa",
    }}
  />
);

/** The 4 standard rows (Dual is 2 rows one off, one def; Mixed On/Off has off and def in the same row) */
export type OffDefDualMixed = "Off" | "Def" | "Dual" | "Mixed";

/** Holds all the different column definitions for the similar tables used throughout this SPA */
export class CommonTableDefs {
  // Handy utilities

  static offPrefixFn = (key: string) => "off_" + key;
  static offCellMetaFn = (key: string, val: any) => "off";
  static defPrefixFn = (key: string) => "def_" + key;
  /** Fetches the off version of title since that's typically where it's stored in the data object */
  static defPrefixFnPlusTitle = (key: string) =>
    key == "title" ? "off_title" : "def_" + key;
  static defCellMetaFn = (key: string, val: any) => "def";
  static mixedPrefixFn = (key: string) => key;
  static mixedCellMetaFn = (key: string, val: any) => "";

  static picker(
    offScale: (val: number) => string | undefined,
    defScale: (val: number) => string | undefined,
    rowMode?: OffDefDualMixed,
    mixedMode?: "Off" | "Def",
  ) {
    return (val: any, valMeta: string) => {
      const num = _.isNil(val.colorOverride)
        ? (val.value as number)
        : (val.colorOverride as number);
      if (!rowMode || rowMode == "Dual") {
        return _.isNil(num)
          ? CbbColors.malformedDataColor //(we'll use this color to indicate malformed data)
          : "off" == valMeta
            ? offScale(num)
            : defScale(num);
      } else if (rowMode == "Off" || mixedMode == "Off") {
        return _.isNil(num)
          ? CbbColors.malformedDataColor //(we'll use this color to indicate malformed data)
          : offScale(num);
      } else if (rowMode == "Def" || mixedMode == "Def") {
        return _.isNil(num)
          ? CbbColors.malformedDataColor //(we'll use this color to indicate malformed data)
          : defScale(num);
      } else {
        //(shouldn't be possible)
        return CbbColors.malformedDataColor;
      }
    };
  }
  static offOnlyPicker(
    offScale: (val: number) => string | undefined,
    defScale: (val: number) => string | undefined,
    rowMode: OffDefDualMixed,
    mixedMode?: "Off" | "Def",
  ) {
    if (rowMode == "Dual") {
      return CbbColors.offOnlyPicker(offScale, defScale);
    } else if (rowMode == "Off" || mixedMode == "Off") {
      return CommonTableDefs.picker(offScale, offScale);
    } else {
      return (val: number) => undefined;
    }
  }
  /** TODO: not compatible with row modes */
  static singleLinePicker(offScale: (val: number) => string) {
    return (val: any, valMeta: string) => {
      if ("off" == valMeta) {
        return CommonTableDefs.picker(offScale, offScale);
      } else {
        return undefined;
      }
    };
  }

  static rowSpanCalculator(cellMeta: string) {
    switch (cellMeta) {
      case "off":
        return 2;
      case "def":
        return 0;
      default:
        return 1;
    }
  }
  static singleLineRowSpanCalculator(cellMeta: string) {
    switch (cellMeta) {
      case "off":
        return 1;
      case "def":
        return 0;
      default:
        return 1;
    }
  }
  static fixedSizeRowSpanCalculator(cellMeta: string) {
    return 1;
  }

  // Some handy utils for managing different table configs

  //we end up with cellMeta => "off"/"def" or "off-or-def"

  /** One string for off/def mode, one for dual */
  static readonly specialMixedHeader = (
    mixedMode: "Off" | "Def" | undefined,
    mixedOffOrDef: string,
    dualOrOffDef: string,
  ) => {
    return _.isNil(mixedMode)
      ? dualOrOffDef
      : `${mixedMode || "Off"} ` + mixedOffOrDef;
  };

  /** One string for all modes */
  static readonly simpleHeader = (
    mixedMode: "Off" | "Def" | undefined,
    all: string,
  ) => {
    return _.isNil(mixedMode) ? all : `${mixedMode || "Off"} ` + all;
  };

  /** Shows either off/def (single row), off+def (dual row) or nothing (mixed) */
  static readonly offDefSeparatorPicker = (
    rowMode: OffDefDualMixed,
    width?: number,
  ) => {
    if (rowMode == "Dual") {
      return GenericTableOps.addSpecialColSeparator("__off_def__");
    } else if (rowMode == "Off") {
      return GenericTableOps.addSpecialColSeparator("__off__");
    } else if (rowMode == "Def") {
      return GenericTableOps.addSpecialColSeparator("__def__");
    } else {
      //(Mixed)
      return GenericTableOps.addColSeparator(width);
    }
  };

  /** Picks the available col-sets
   * strictMode: if true won't include non-row-mode-matching presets
   * eg use to get sortable fields
   */
  static readonly extraColSetPicker = (
    extraColSets: Record<string, ExtraColSet & { rowMode: OffDefDualMixed }>,
    rowMode: OffDefDualMixed,
    strictMode: boolean = false,
  ) =>
    _.pickBy(
      _.mapValues(extraColSets, (colSet) => ({
        ...colSet,
        isLibrary: colSet.rowMode == rowMode && (colSet.isLibrary ?? true),
      })),
      (colSet) => (colSet.isPreset && !strictMode) || colSet.rowMode == rowMode,
    );

  /** Utility to build the right mix of off/def columns based on the row mode */
  static readonly buildMixedColSet = (
    cols: Record<string, GenericTableColProps>,
    rowMode: OffDefDualMixed,
    mixedMode: "Off" | "Def" | undefined,
  ) => {
    if (rowMode != "Mixed") {
      return cols;
    } else {
      return _.mapKeys(cols, (colObj, colKey) => {
        if (mixedMode == "Def") {
          return colKey.startsWith("off_") || colKey.startsWith("def_")
            ? colKey
            : `def_${colKey}`;
        } else if (mixedMode == "Off") {
          return colKey.startsWith("off_") || colKey.startsWith("def_")
            ? colKey
            : `off_${colKey}`;
        } else {
          //In this case assume the fields are already prefixed
          return colKey;
        }
      }) as Record<string, GenericTableColProps>;
    }
  };

  // ON/OFF - INDIVIDUAL

  /** Utility to put a faint colored backing to text */
  static readonly getTextShadow = (
    stat: { value?: number },
    colorMapper: (val: number) => string | undefined,
    radius: string = "15px",
    strength = 3,
  ) => {
    //(move this but just to avoid initially changing the code everywhere)
    //(TODO: change the code everywhere to use GenericTableOps!)
    return GenericTableOps.getTextShadow(stat, colorMapper, radius, strength);
  };

  /** Map of fields to descriptions, TODO: start usng this in the tables below */
  static individualDescriptions = {
    off_assist: ["A%", "Assist % for player in selected lineups"],
    off_to: ["TO%", "Turnover % in selected lineups"],
    def_to: ["Stl%", "Steal % in selected lineups"],
    off_3pr: ["3PR", "Percentage of 3 pointers taken against all field goals"],
    off_2pmidr: [
      "2PR mid",
      "Percentage of mid range 2 pointers taken against all field goals",
    ],
    off_2primr: [
      "2PR rim",
      "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
    ],
    def_2prim: ["Blk%", "Block % in selected lineups"],
    off_ftr: ["FTR", "Free throw rate in selected lineups"],
    def_ftr: ["F/50", "Fouls called/50 possessions in selected lineups"],
    off_orb: ["OR%", "Offensive rebounding % in selected lineups"],
    off_drb: ["DR%", "Defensive rebounding % in selected lineups"],
    def_orb: ["DR%", "Defensive rebounding % in selected lineups"],
  } as Record<string, any>;

  /** Handles switching between single row fields and dual row fields
   * (has to be done whenever switching, super hacky, need to come up with an alternative at some point)
   */
  static sortByTransforms = (sortField: string, isExpanded: boolean) => {
    //TODO: RAPM/prod, ORB/DEB
    const comps = sortField.split(":");
    if (isExpanded) {
      switch (comps[1]) {
        case "off_adj_rapm_margin":
          comps[1] = "diff_adj_rapm";
          break;
        case "off_adj_rapm_prod_margin":
          comps[1] = "diff_adj_rapm_prod";
          break;
        case "off_drb":
          comps[1] = "def_orb";
          break;
        default:
          break;
      }
    } else {
      switch (comps[1]) {
        case "diff_adj_rapm":
          comps[1] = "off_adj_rapm_margin";
          break;
        case "diff_adj_rapm_prod":
          comps[1] = "off_adj_rapm_prod_margin";
          break;
        case "def_orb":
          comps[1] = "off_drb";
          break;
        default:
          break;
      }
    }
    return comps.join(":");
  };

  /** All stats that could possibly be used in the roster stats table */
  static onOffIndividualTableAllFields = (expandedView: boolean) => {
    return {
      //accessors vs column metadata
      title: expandedView
        ? GenericTableOps.addTitle(
            "",
            "",
            CommonTableDefs.rowSpanCalculator,
            "small",
            GenericTableOps.htmlFormatter,
          )
        : GenericTableOps.addTitle(
            "",
            "",
            CommonTableDefs.singleLineRowSpanCalculator,
            "small",
            GenericTableOps.htmlFormatter,
          ),
      sep_off_def: expandedView
        ? GenericTableOps.addSpecialColSeparator("__off_def__")
        : GenericTableOps.addColSeparator(),
      team_poss: GenericTableOps.addDataCol(
        "Poss",
        "Total number of team possessions for selected lineups",
        GenericTableOps.defaultColorPicker,
        GenericTableOps.offHighlightFormatter(GenericTableOps.intFormatter),
      ),
      team_poss_pct: GenericTableOps.addDataCol(
        "Poss%",
        "% of team possessions in selected lineups that player was on the floor",
        GenericTableOps.defaultColorPicker,
        GenericTableOps.offHighlightFormatter(GenericTableOps.percentFormatter),
      ),
      rtg: GenericTableOps.addPtsCol(
        "Box Rtg",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " rating in selected lineups (box-score derived)",
        CbbColors.picker(...CbbColors.pp100),
      ),
      usage: GenericTableOps.addDataCol(
        expandedView ? <div>Usg{lineSep} Pos</div> : "Usg",
        expandedView
          ? "% of team possessions used in selected lineups, plus the position category for this player"
          : "% of team possessions used in selected lineups",
        CbbColors.offOnlyPicker(...CbbColors.usg),
        GenericTableOps.percentOrHtmlFormatter,
      ), //TODO needs to be steeper
      adj_rtg: GenericTableOps.addPtsCol(
        expandedView ? "Adj+ Rtg" : "Adj+ oRtg",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " rating vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CbbColors.picker(...CbbColors.diff10_p100_redGreen),
      ),
      adj_prod: GenericTableOps.addPtsCol(
        expandedView ? "Adj+ Prod" : "Adj+ oPrd",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " production (ratings * mins%) vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CbbColors.picker(...CbbColors.diff10_p100_redGreen),
      ),

      // 2 of these 4 are always omitted by onOffIndividualTable, the other 2 we just make empty-ish so that auto-gen of table sort works
      adj_rapm_margin: expandedView
        ? { colName: undefined }
        : GenericTableOps.addDataCol(
            "RAPM net",
            "Adjusted Plus-Minus vs D1 average (Off-Def margin)",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter,
          ),
      adj_rapm_prod_margin: expandedView
        ? { colName: undefined }
        : GenericTableOps.addDataCol(
            "RAPM Prod",
            "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average (Off-Def margin)",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter,
          ),
      adj_rapm: expandedView
        ? GenericTableOps.addDataCol(
            "RAPM",
            "Adjusted Plus-Minus vs D1 average",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter,
          )
        : { colName: undefined },
      adj_rapm_prod: expandedView
        ? GenericTableOps.addDataCol(
            "RAPM Prod",
            "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter,
          )
        : { colName: undefined },

      sep1: GenericTableOps.addColSeparator(),
      efg: GenericTableOps.addDataCol(
        "eFG%",
        "Effective field goal% (3 pointers count 1.5x as much) in selected lineups",
        CbbColors.offOnlyPicker(...CbbColors.eFG),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      assist: GenericTableOps.addDataCol(
        "A%",
        "Assist % for player in selected lineups",
        CbbColors.offOnlyPicker(...CbbColors.p_ast),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      to: GenericTableOps.addPctCol(
        expandedView ? <div>TO%{lineSep} Stl%</div> : "TO%",
        expandedView
          ? "Turnover % / Steal % in selected lineups"
          : "Turnover % in selected lineups",
        CbbColors.picker(...CbbColors.p_tOver),
      ),
      orb: expandedView
        ? GenericTableOps.addPctCol(
            "RB%",
            "Offensive/Defensive rebounding % in selected lineups",
            CbbColors.picker(...CbbColors.p_oReb),
          )
        : GenericTableOps.addPctCol(
            "OR%",
            "Offensive rebounding % in selected lineups",
            CbbColors.picker(...CbbColors.p_oReb),
          ),
      drb: GenericTableOps.addPctCol(
        "DR%",
        "Defensive rebounding % in selected lineups",
        CbbColors.picker(...CbbColors.p_dReb),
      ),
      ftr: GenericTableOps.addPctCol(
        expandedView ? <div>FTR{lineSep} F/50</div> : "FTR",
        expandedView
          ? "Free throw rate (off) and Fouls called/50 possessions (def) in selected lineups"
          : "Free throw rate in selected lineups",
        CbbColors.picker(...CbbColors.p_ftr),
      ),
      sep_off_ast: expandedView
        ? GenericTableOps.addSpecialColSeparator("__off_ast__")
        : GenericTableOps.addColSeparator(),
      "3pr": GenericTableOps.addDataCol(
        "3PR",
        `Percentage of 3 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CbbColors.offOnlyPicker(...CbbColors.fgr),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      "2pmidr": GenericTableOps.addDataCol(
        "2PR mid",
        `Percentage of mid range 2 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CbbColors.offOnlyPicker(...CbbColors.fgr),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      "2primr": GenericTableOps.addDataCol(
        "2PR rim",
        `Percentage of layup/dunk/etc 2 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CbbColors.offOnlyPicker(...CbbColors.fgr),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      sep3: GenericTableOps.addSpecialColSeparator("__ft__"),
      "3p": GenericTableOps.addDataCol(
        expandedView ? <div>3P%{lineSep} FT%</div> : "3P%",
        expandedView
          ? "3 point field goal percentage / FT% in lower row"
          : "3 point field goal percentage",
        CbbColors.offOnlyPicker(...CbbColors.fg3P),
        GenericTableOps.dualRowPercentFormatter(CbbColors.off_FT),
      ),
      "2p": GenericTableOps.addPctCol(
        "2P%",
        "2 point field goal percentage",
        CbbColors.picker(...CbbColors.fg2P),
      ),
      "2pmid": GenericTableOps.addPctCol(
        "2P% mid",
        "2 point field goal percentage (mid range)",
        CbbColors.picker(...CbbColors.fg2P_mid),
      ),
      "2prim": GenericTableOps.addPctCol(
        expandedView ? <div>Rim%{lineSep} Blk%</div> : "2P% rim",
        expandedView
          ? "2 point field goal percentage (off) and Block% (def)"
          : "2 point field goal percentage (layup/dunk/etc)",
        CbbColors.picker(...CbbColors.p_fg2P_rim),
      ),
      sep4: GenericTableOps.addColSeparator(),
      adj_opp: GenericTableOps.addPtsCol(
        "SoS",
        "Weighted average of the offensive or defensive efficiencies of the player's opponents",
        GenericTableOps.defaultColorPicker,
      ),
    };
  };

  /** Specific fields required for an instance of a roster stats table */
  static readonly onOffIndividualTable = (
    expandedView: boolean,
    possAsPct: boolean,
    factorMins: boolean,
    includeRapm: boolean,
  ) => {
    return _.omit(
      CommonTableDefs.onOffIndividualTableAllFields(expandedView),
      _.flatten([
        expandedView ? ["drb"] : ["adj_opp", "sep4"],
        [possAsPct ? "team_poss" : "team_poss_pct"],
        [factorMins ? "adj_rtg" : "adj_prod"],
        includeRapm
          ? factorMins
            ? ["adj_rapm", "adj_rapm_margin"].concat(
                expandedView ? ["adj_rapm_prod_margin"] : ["adj_rapm_prod"],
              )
            : ["adj_rapm_prod", "adj_rapm_prod_margin"].concat(
                expandedView ? ["adj_rapm_margin"] : ["adj_rapm"],
              )
          : [
              "adj_rapm",
              "adj_rapm_prod",
              "adj_rapm_margin",
              "adj_rapm_prod_margin",
            ], //(all RAPM)
      ]),
    ) as Record<string, GenericTableColProps>;
  };

  // ON/OFF REPORT

  static readonly onOffReport = {
    title: GenericTableOps.addTitle(
      "",
      "",
      CommonTableDefs.rowSpanCalculator,
      "small",
    ),
    sep_off_def: GenericTableOps.addSpecialColSeparator("__off_def__"),
    ppp: GenericTableOps.addPtsCol(
      "P/100",
      "Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.pp100),
    ),
    adj_ppp: GenericTableOps.addPtsCol(
      "Adj P/100",
      "Approximate schedule-adjusted Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.pp100),
    ),
    sep1: GenericTableOps.addColSeparator(),
    efg: GenericTableOps.addPctCol(
      "eFG%",
      "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
      CommonTableDefs.picker(...CbbColors.eFG),
    ),
    to: GenericTableOps.addPctCol(
      "TO%",
      "Turnover % for selected lineups",
      CommonTableDefs.picker(...CbbColors.tOver),
    ),
    orb: GenericTableOps.addPctCol(
      "OR%",
      "Offensive rebounding % for selected lineups",
      CommonTableDefs.picker(...CbbColors.oReb),
    ),
    ftr: GenericTableOps.addPctCol(
      "FTR",
      "Free throw rate for selected lineups",
      CommonTableDefs.picker(...CbbColors.ftr),
    ),
    sep2a: GenericTableOps.addColSeparator(),
    assist: GenericTableOps.addPctCol(
      "A%",
      "Assist % for selected lineups",
      CommonTableDefs.picker(...CbbColors.ast),
    ),
    sep2b: GenericTableOps.addColSeparator(0.05),
    "3pr": GenericTableOps.addPctCol(
      "3PR",
      "Percentage of 3 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr),
    ),
    "2pmidr": GenericTableOps.addPctCol(
      "2PR mid",
      "Percentage of mid range 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr),
    ),
    "2primr": GenericTableOps.addPctCol(
      "2PR rim",
      "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr),
    ),
    sep3: GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol(
      "3P%",
      "3 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.fg3P),
    ),
    "2p": GenericTableOps.addPctCol(
      "2P%",
      "2 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.fg2P),
    ),
    "2pmid": GenericTableOps.addPctCol(
      "2P% mid",
      "2 point field goal percentage (mid range)",
      CommonTableDefs.picker(...CbbColors.fg2P_mid),
    ),
    "2prim": GenericTableOps.addPctCol(
      "2P% rim",
      "2 point field goal percentage (layup/dunk/etc)",
      CommonTableDefs.picker(...CbbColors.fg2P_rim),
    ),
    sep4: GenericTableOps.addColSeparator(),
    poss: GenericTableOps.addIntCol(
      "Poss",
      "Total number of possessions for selected lineups",
      GenericTableOps.defaultColorPicker,
    ),
    adj_opp: GenericTableOps.addPtsCol(
      "SoS",
      "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
      GenericTableOps.defaultColorPicker,
    ),
  };

  /** Same as onOffReport except with generic HTML for the row "title" */
  static readonly onOffReportWithFormattedTitle = _.chain(
    CommonTableDefs.onOffReport,
  )
    .toPairs()
    .map((kv) => {
      if (kv[0] == "title") {
        return [
          kv[0],
          GenericTableOps.addTitle(
            "",
            "",
            CommonTableDefs.rowSpanCalculator,
            "small",
            GenericTableOps.htmlFormatter,
          ),
        ];
      } else return kv;
    })
    .fromPairs()
    .value();

  /** Same as onOffReport except the colorscales are centered around 0 */
  static readonly onOffReportReplacement = {
    title: GenericTableOps.addTitle(
      "",
      "",
      CommonTableDefs.rowSpanCalculator,
      "small",
      GenericTableOps.htmlFormatter,
    ),
    sep0: GenericTableOps.addColSeparator(),
    ppp: GenericTableOps.addPtsCol(
      "P/100",
      "Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.diff10_p100_redGreen),
    ),
    adj_ppp: GenericTableOps.addPtsCol(
      "Adj P/100",
      "Approximate schedule-adjusted Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.diff10_p100_redGreen),
    ),
    sep1: GenericTableOps.addColSeparator(),
    efg: GenericTableOps.addPctCol(
      "eFG%",
      "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen),
    ),
    to: GenericTableOps.addPctCol(
      "TO%",
      "Turnover % for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_greenRed),
    ),
    orb: GenericTableOps.addPctCol(
      "OR%",
      "Offensive rebounding % for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen),
    ),
    ftr: GenericTableOps.addPctCol(
      "FTR",
      "Free throw rate for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen),
    ),
    "sep2-1": GenericTableOps.addColSeparator(),
    assist: GenericTableOps.addPctCol(
      "A%",
      "Assist % for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange),
    ),
    "sep2-2": GenericTableOps.addColSeparator(),
    "3pr": GenericTableOps.addPctCol(
      "3PR",
      "Percentage of 3 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange),
    ),
    "2pmidr": GenericTableOps.addPctCol(
      "2PR mid",
      "Percentage of mid range 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange),
    ),
    "2primr": GenericTableOps.addPctCol(
      "2PR rim",
      "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange),
    ),
    sep3: GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol(
      "3P%",
      "3 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen),
    ),
    "2p": GenericTableOps.addPctCol(
      "2P%",
      "2 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen),
    ),
    "2pmid": GenericTableOps.addPctCol(
      "2P% mid",
      "2 point field goal percentage (mid range)",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen),
    ),
    "2prim": GenericTableOps.addPctCol(
      "2P% rim",
      "2 point field goal percentage (layup/dunk/etc)",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen),
    ),
    sep4: GenericTableOps.addColSeparator(),
    poss: GenericTableOps.addIntCol(
      "Poss",
      "Total number of possessions for selected lineups",
      GenericTableOps.defaultColorPicker,
    ),
    adj_opp: GenericTableOps.addPtsCol(
      "SoS",
      "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
      GenericTableOps.defaultColorPicker,
    ),
  };

  // PLAY TYPE

  /** Play type card table */
  static readonly playTypeCardTable = {
    title: GenericTableOps.addTitle(
      "",
      "Play type",
      GenericTableOps.defaultRowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter,
    ),
    pts: GenericTableOps.addDataCol(
      "Pts",
      "Points per 100 plays (a possession can be multiple plays separated by off. rebounds)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    pts_pct: GenericTableOps.addDataCol(
      <span>Pts%</span>,
      "Percent of points from this play type",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    ppp: GenericTableOps.addDataCol(
      "PPP",
      "Points per play (raw or adj depending on Raw/Adj toggle)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    freq: GenericTableOps.addDataCol(
      "Freq%",
      "Frequency (% of possessions; player or team depending on P% / T% toggle)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
  };

  /** Play type card table - comparison between two samples */
  static readonly compPlayTypeCardTable = {
    title: GenericTableOps.addTitle(
      "",
      "Play type",
      GenericTableOps.defaultRowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter,
    ),
    pts: GenericTableOps.addDataCol(
      "Pts",
      "Points per 100 plays (a possession can be multiple plays separated by off. rebounds)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    vs_pts: GenericTableOps.addDataCol(
      "vs",
      "Comparison dataset - Points per 100 plays (a possession can be multiple plays separated by off. rebounds)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep1: GenericTableOps.addColSeparator(),
    pts_pct: GenericTableOps.addDataCol(
      <span>Pts%</span>,
      "Percent of points from this play type",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    vs_pts_pct: GenericTableOps.addDataCol(
      "vs",
      "Comparison dataset - Percent of points from this play type",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep2: GenericTableOps.addColSeparator(),
    ppp: GenericTableOps.addDataCol(
      "PPP",
      "Points per play (raw or adj depending on Raw/Adj toggle)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    vs_ppp: GenericTableOps.addDataCol(
      "vs",
      "Comparison dataset - Points per play (raw or adj depending on Raw/Adj toggle)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep3: GenericTableOps.addColSeparator(),
    freq: GenericTableOps.addDataCol(
      "Freq%",
      "Frequency (% of possessions; player or team depending on P% / T% toggle)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    vs_freq: GenericTableOps.addDataCol(
      "vs",
      "Comparison dataset - Frequency (% of possessions; player or team depending on P% / T% toggle)",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.pointsOrHtmlFormatter,
    ),
  };

  //////////////////////////

  // Generic Sort Utils

  /** Builds the representation of a menu dropdown with all available sort options */
  static readonly sortBuilder = (
    rowMode: OffDefDualMixed,
    sortKeyFilter: (sortType: string, key: string) => boolean,
    keyTransformer: (inKey: string) => string | undefined,
    labelTransforms: Record<string, (o: string) => string | undefined>,
    allowedFields: _.CollectionChain<[string, GenericTableColProps]>,
  ): { label: string; value: string }[] => {
    return _.flatten(
      allowedFields
        .filter((keycol) =>
          Boolean(
            keycol[1].colName &&
            keycol[1].colName != "" &&
            (!_.isString(keycol[1].colName) ||
              !_.startsWith(keycol[1].colName, "__")),
          ),
        )
        .map((keycol) => {
          return rowMode == "Mixed"
            ? ["desc", "asc"].flatMap((combo) => {
                const ascOrDesc = (s: string) => {
                  switch (s) {
                    case "asc":
                      return "Asc.";
                    case "desc":
                      return "Desc.";
                    default:
                      return "N/A";
                  }
                };
                const labelOverrideFn = labelTransforms[keycol[0]];
                const ascOrDescLabel = ascOrDesc(combo);
                const label =
                  labelOverrideFn?.(ascOrDescLabel) ||
                  `${keycol[1].colName} (${ascOrDescLabel})`;
                return [
                  {
                    label,
                    value: `${combo}:${keycol[0]}`,
                  },
                ];
              })
            : [
                ["desc", "off"],
                ["asc", "off"],
                ["desc", "def"],
                ["asc", "def"],
                ["desc", "diff"],
                ["asc", "diff"],
              ].flatMap((combo) => {
                if (sortKeyFilter(combo[1], keycol[0])) {
                  return [];
                }

                const ascOrDesc = (s: string) => {
                  switch (s) {
                    case "asc":
                      return "Asc.";
                    case "desc":
                      return "Desc.";
                    default:
                      return "N/A";
                  }
                };
                const offOrDef = (s: string) => {
                  switch (s) {
                    case "off":
                      return "Offensive";
                    case "def":
                      return "Defensive";
                    case "diff":
                      return "Net";
                    default:
                      return "";
                  }
                };
                const labelOverrideFn =
                  labelTransforms[`${combo[1]}_${keycol[0]}`];
                const ascOrDescLabel = ascOrDesc(combo[0]);
                const offOrDefLabel = offOrDef(combo[1]);
                const label =
                  labelOverrideFn?.(ascOrDescLabel) ||
                  `${keycol[1].colName} (${ascOrDescLabel} / ${offOrDefLabel})`;
                const keyToUse =
                  keyTransformer(keycol[0]) || `${combo[1]}_${keycol[0]}`;
                return [
                  {
                    label,
                    value: `${combo[0]}:${keyToUse}`,
                  },
                ];
              });
        })
        .value(),
    );
  };

  /** Lineup-table specific handling of clicking on a column header to manage sorting
   * Works on the assumption that in mixed mode, you get the rows with off_ / def_ included
   * and therefore the sortOptions likewise
   * in other modes both sortOptions and headerKey are "raw"
   * If you deviate from this (see PlayerLeaderboardTable), you have to hand adjust both fields, otherwise
   * you run into trouble with "diff_"
   */
  static readonly buildSortCallback = (
    rowMode: OffDefDualMixed,
    tableFieldTransformer: (headerKey: string) => string,
    sortBy: string,
    sortOptions: { label: string; value: string }[],
    setSortMenuState: (newState: TableSortPopupMenuState) => void,
  ) => {
    return (headerKeyIn: string, ev: any) => {
      const headerKey = tableFieldTransformer(headerKeyIn);
      const matchingOptions: {
        value: string;
        label: string;
      }[] = sortOptions.filter((opt: { value: string; label: string }) => {
        const field = opt.value.split(":")[1] || opt.value;
        const rawFieldIndex = field.indexOf("_");
        const rawField =
          rawFieldIndex > 0 && rowMode != "Mixed"
            ? field.substring(rawFieldIndex + 1)
            : field;

        return rawField == headerKey;
      });

      if (matchingOptions.length > 1) {
        // Multiple options - show popup
        setSortMenuState({
          columnKey: headerKey,
          options: matchingOptions.concat([{ label: "Clear", value: "" }]),
          anchorEl: ev.currentTarget as HTMLElement,
          currentSortValue: sortBy,
        });
      }
    };
  };
}
