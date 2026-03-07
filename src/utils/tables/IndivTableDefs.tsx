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

  /** All fields in the lineup table */
  static readonly mainIndivTableFields = (
    rawPts: boolean,
    rowMode: OffDefDualMixed,
    mixedMode?: "Off" | "Def", //(bug if this is undefined when rowMode == "Mixed")
  ): Record<string, GenericTableColProps> => {
    const expandedView = rowMode !== "Dual";
    const cols = {
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
        "Adj+ Rtg",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " rating vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CbbColors.picker(...CbbColors.diff10_p100_redGreen),
      ),
      adj_prod: GenericTableOps.addPtsCol(
        "Adj+ Prod",
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
    } as Record<string, GenericTableColProps>;
    return cols;
  };

  //////////////////////////////////////////////////////

  // Table Defs: On/Off Table

  //////////////////////////////////////////////////////

  // PRESETS
}
