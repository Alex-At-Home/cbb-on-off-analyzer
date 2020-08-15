
// Component imports
import GenericTable, { GenericTableOps, GenericTableColProps } from "../components/GenericTable";

// Util imports
import { CbbColors } from "./CbbColors";

// Lodash:
import _ from "lodash";

/** Holds all the different column definitions for the similar tables used throughout this SPA */
export class CommonTableDefs {

  // Handy utilities

  static offPrefixFn = (key: string) => "off_" + key;
  static offCellMetaFn = (key: string, val: any) => "off";
  static defPrefixFn = (key: string) => "def_" + key;
  static defCellMetaFn = (key: string, val: any) => "def";

  private static picker(offScale: (val: number) => string, defScale: (val: number) => string) {
    return (val: any, valMeta: string) => {
      const num = val.value as number;
      return _.isNil(num) ?
        CbbColors.malformedDataColor : //(we'll use this color to indicate malformed data)
        ("off" == valMeta) ? offScale(num) : defScale(num)
        ;
    };
  }

  private static singleLinePicker(offScale: (val: number) => string) {
    return (val: any, valMeta: string) => {
      if ("off" == valMeta) {
        return CommonTableDefs.picker(offScale, offScale);
      } else {
        return CbbColors.background;
      }
    };
  }

  private static rowSpanCalculator(cellMeta: string) {
    switch(cellMeta) {
      case "off": return 2;
      case "def": return 0;
      default: return 1;
    }
  }
  static singleLineRowSpanCalculator(cellMeta: string) {
    switch(cellMeta) {
      case "off": return 1;
      case "def": return 0;
      default: return 1;
    }
  }

  //TODO: add others, find generic descriptions etc

  // ON/OFF - TEAM

  static readonly onOffTable = { //accessors vs column metadata
    "title": GenericTableOps.addTitle("", ""),
    "sep0": GenericTableOps.addColSeparator(),
    "ppp": GenericTableOps.addPtsCol("P/100", "Points per 100 possessions", CommonTableDefs.picker(...CbbColors.pp100)),
    "adj_ppp": GenericTableOps.addPtsCol("Adj P/100", "Approximate schedule-adjusted Points per 100 possessions", CommonTableDefs.picker(...CbbColors.pp100)),
    "sep1": GenericTableOps.addColSeparator(),
    "efg": GenericTableOps.addPctCol("eFG%", "Effective field goal% (3 pointers count 1.5x as much) for selected lineups", CommonTableDefs.picker(...CbbColors.eFG)),
    "to": GenericTableOps.addPctCol("TO%", "Turnover % for selected lineups", CommonTableDefs.picker(...CbbColors.tOver)),
    "orb": GenericTableOps.addPctCol("ORB%", "Offensive rebounding % for selected lineups", CommonTableDefs.picker(...CbbColors.oReb)),
    "ftr": GenericTableOps.addPctCol("FTR", "Free throw rate for selected lineups", CommonTableDefs.picker(...CbbColors.ftr)),
    "sep2a": GenericTableOps.addColSeparator(),
    "assist": GenericTableOps.addPctCol("A%", "Assist % for selected lineups", CommonTableDefs.picker(...CbbColors.ast)),
    "sep2b": GenericTableOps.addColSeparator(0.05),
    "3pr": GenericTableOps.addPctCol("3PR", "Percentage of 3 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "2pmidr": GenericTableOps.addPctCol("2PR mid", "Percentage of mid range 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "2primr": GenericTableOps.addPctCol("2PR rim", "Percentage of layup/dunk/etc 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "sep3": GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol("3P%", "3 point field goal percentage", CommonTableDefs.picker(...CbbColors.fg3P)),
    "2p": GenericTableOps.addPctCol("2P%", "2 point field goal percentage", CommonTableDefs.picker(...CbbColors.fg2P)),
    "2pmid": GenericTableOps.addPctCol("2P% mid", "2 point field goal percentage (mid range)", CommonTableDefs.picker(...CbbColors.fg2P_mid)),
    "2prim": GenericTableOps.addPctCol("2P% rim", "2 point field goal percentage (layup/dunk/etc)", CommonTableDefs.picker(...CbbColors.fg2P_rim)),
    "sep4": GenericTableOps.addColSeparator(),
    "poss": GenericTableOps.addIntCol("Poss", "Total number of possessions for selected lineups", GenericTableOps.defaultColorPicker),
    "adj_opp": GenericTableOps.addPtsCol("SoS", "Weighted average of the offensive or defensive efficiencies of the lineups' opponents", GenericTableOps.defaultColorPicker),
  };

  // ON/OFF - INDIVIDUAL

  /** Utility to put a faint colored backing to text */
  static readonly getTextShadow = (stat: any, colorMapper: (val: number) => string) => {
    return {
      textShadow: `0px 0px 10px ${colorMapper(stat?.value || 0)}`
    };
  };

  /** Map of fields to descriptions, TODO: start usng this in the tables below */
  static individualDescriptions = {
    "off_assist": [ "A%", "Assist % for player in selected lineups" ],
    "off_to": [ "TO%", "Turnover % in selected lineups" ],
    "def_to": [ "Stl%", "Steal % in selected lineups" ],
    "off_3pr": [ "3PR", "Percentage of 3 pointers taken against all field goals" ],
    "off_2pmidr": [ "2PR mid", "Percentage of mid range 2 pointers taken against all field goals" ],
    "off_2primr": [ "2PR rim", "Percentage of layup/dunk/etc 2 pointers taken against all field goals" ],
    "def_2prim": [ "Blk%", "Block % in selected lineups" ],
    "off_ftr": [ "FTR", "Free throw rate in selected lineups" ],
    "def_ftr": [ "F/50", "Fouls called/50 possessions in selected lineups" ],
    "off_orb": [ "OR%", "Offensive rebounding % in selected lineups" ],
    "off_drb": [ "DR%", "Defensive rebounding % in selected lineups" ],
    "def_orb": [ "DR%", "Defensive rebounding % in selected lineups" ],
  } as Record<string, any>;

  /** All stats that could possibly be used in the roster stats table */
  static onOffIndividualTableAllFields = (expandedView: boolean) => { return { //accessors vs column metadata
    "title": expandedView ?
      GenericTableOps.addTitle("", "", CommonTableDefs.rowSpanCalculator, "small", GenericTableOps.htmlFormatter) :
      GenericTableOps.addTitle("", "", CommonTableDefs.singleLineRowSpanCalculator, "small", GenericTableOps.htmlFormatter)
    ,
    "sep0": GenericTableOps.addColSeparator(),
    "rtg": GenericTableOps.addPtsCol("Rtg", "Offensive/Defensive rating in selected lineups", CbbColors.picker(...CbbColors.pp100)),
    "usage": GenericTableOps.addDataCol(
      expandedView ? "Usg Pos" : "Usg",
      expandedView ? "% of team possessions used in selected lineups, plus the position category for this player": "% of team possessions used in selected lineups",
      CbbColors.offOnlyPicker(...CbbColors.usg), GenericTableOps.percentOrHtmlFormatter), //TODO needs to be steeper
    "adj_rtg": GenericTableOps.addPtsCol("Adj+ Rtg", "Offensive/Defensive rating vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage", CbbColors.picker(...CbbColors.diff10_p100_redGreen)),
    "sep1": GenericTableOps.addColSeparator(),
    "efg": GenericTableOps.addPctCol("eFG%", "Effective field goal% (3 pointers count 1.5x as much) in selected lineups", CbbColors.picker(...CbbColors.eFG)),
    "assist": GenericTableOps.addPctCol("A%", "Assist % for player in selected lineups", CbbColors.picker(...CbbColors.p_ast)),
    "to": GenericTableOps.addPctCol(
        expandedView ? "TO% Stl%" : "TO%",
        expandedView ? "Turnover % / Steal % in selected lineups" : "Turnover % in selected lineups",
        CbbColors.picker(...CbbColors.p_tOver)),
    "orb": expandedView ?
      GenericTableOps.addPctCol("RB%", "Offensive/Defensive rebounding % in selected lineups", CbbColors.picker(...CbbColors.p_oReb)) :
      GenericTableOps.addPctCol("OR%", "Offensive rebounding % in selected lineups", CbbColors.picker(...CbbColors.p_oReb))
      ,
    "drb": GenericTableOps.addPctCol("DR%", "Defensive rebounding % in selected lineups", CbbColors.picker(...CbbColors.p_dReb)),
    "ftr": GenericTableOps.addPctCol(
      expandedView ? "FTR F/50" : "FTR",
      expandedView ? "Free throw rate (off) and Fouls called/50 possessions (def) in selected lineups" : "Free throw rate in selected lineups",
      CbbColors.picker(...CbbColors.p_ftr)),
    "sep2": GenericTableOps.addColSeparator(),
    "3pr": GenericTableOps.addDataCol(
      "3PR", `Percentage of 3 pointers taken against all field goals${expandedView ? " (assisted% below)" : ""}`,
      CbbColors.offOnlyPicker(...CbbColors.fgr), GenericTableOps.percentOrHtmlFormatter),
    "2pmidr": GenericTableOps.addDataCol(
      "2PR mid", `Percentage of mid range 2 pointers taken against all field goals${expandedView ? " (assisted% below)" : ""}`,
      CbbColors.offOnlyPicker(...CbbColors.fgr), GenericTableOps.percentOrHtmlFormatter),
    "2primr": GenericTableOps.addDataCol(
      "2PR rim", `Percentage of layup/dunk/etc 2 pointers taken against all field goals${expandedView ? " (assisted% below)" : ""}`,
      CbbColors.offOnlyPicker(...CbbColors.fgr), GenericTableOps.percentOrHtmlFormatter),
    "sep3": GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol("3P%", "3 point field goal percentage", CbbColors.picker(...CbbColors.fg3P)),
    "2p": GenericTableOps.addPctCol("2P%", "2 point field goal percentage", CbbColors.picker(...CbbColors.fg2P)),
    "2pmid": GenericTableOps.addPctCol("2P% mid", "2 point field goal percentage (mid range)", CbbColors.picker(...CbbColors.fg2P_mid)),
    "2prim": GenericTableOps.addPctCol(
        expandedView ? "Rim% Blk%" : "2P% rim",
        expandedView ? "2 point field goal percentage (off) and Block% (def)" : "2 point field goal percentage (layup/dunk/etc)",
        CbbColors.picker(...CbbColors.p_fg2P_rim)),
    "sep4": GenericTableOps.addColSeparator(),
    "team_poss": GenericTableOps.addIntCol("Poss", "Total number of team possessions for selected lineups", GenericTableOps.defaultColorPicker),
    "team_poss_pct": GenericTableOps.addPctCol("Poss%", "% of team possessions in selected lineups that player was on the floor", GenericTableOps.defaultColorPicker),
    "adj_opp": GenericTableOps.addPtsCol("SoS", "Weighted average of the offensive or defensive efficiencies of the player's opponents", GenericTableOps.defaultColorPicker),
  }; };

  /** Specific fields required for an instance of a roster stats table */
  static readonly onOffIndividualTable = (expandedView: boolean, possAsPct: boolean) => {
    return _.omit(CommonTableDefs.onOffIndividualTableAllFields(expandedView),
      [
        expandedView ?  "drb"  : "adj_opp",
        possAsPct ? "team_poss" : "team_poss_pct",
      ]
    );
  };

  // LINEUP:

  static readonly lineupTable = { //accessors vs column metadata
    "title": GenericTableOps.addTitle("", "", CommonTableDefs.rowSpanCalculator, "small", GenericTableOps.htmlFormatter, 16),
    "sep0": GenericTableOps.addColSeparator(),
    "ppp": GenericTableOps.addPtsCol("P/100", "Points per 100 possessions", CommonTableDefs.picker(...CbbColors.pp100)),
    "adj_ppp": GenericTableOps.addPtsCol("Adj P/100", "Approximate schedule-adjusted Points per 100 possessions", CommonTableDefs.picker(...CbbColors.pp100)),
    "sep1": GenericTableOps.addColSeparator(),
    "efg": GenericTableOps.addPctCol("eFG%", "Effective field goal% (3 pointers count 1.5x as much) for selected lineups", CommonTableDefs.picker(...CbbColors.eFG)),
    "to": GenericTableOps.addPctCol("TO%", "Turnover % for selected lineups", CommonTableDefs.picker(...CbbColors.tOver)),
    "orb": GenericTableOps.addPctCol("OR%", "Offensive rebounding % for selected lineups", CommonTableDefs.picker(...CbbColors.oReb)),
    "ftr": GenericTableOps.addPctCol("FTR", "Free throw rate for selected lineups", CommonTableDefs.picker(...CbbColors.ftr)),
    "sep2a": GenericTableOps.addColSeparator(),
    "assist": GenericTableOps.addPctCol("A%", "Assist % for selected lineups", CommonTableDefs.picker(...CbbColors.ast)),
    "sep2b": GenericTableOps.addColSeparator(0.05),
    "3pr": GenericTableOps.addPctCol("3PR", "Percentage of 3 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "2pmidr": GenericTableOps.addPctCol("2PR mid", "Percentage of mid range 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "2primr": GenericTableOps.addPctCol("2PR rim", "Percentage of layup/dunk/etc 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "sep3": GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol("3P%", "3 point field goal percentage", CommonTableDefs.picker(...CbbColors.fg3P)),
    "2p": GenericTableOps.addPctCol("2P%", "2 point field goal percentage", CommonTableDefs.picker(...CbbColors.fg2P)),
    "2pmid": GenericTableOps.addPctCol("2P% mid", "2 point field goal percentage (mid range)", CommonTableDefs.picker(...CbbColors.fg2P_mid)),
    "2prim": GenericTableOps.addPctCol("2P% rim", "2 point field goal percentage (layup/dunk/etc)", CommonTableDefs.picker(...CbbColors.fg2P_rim)),
    "sep4": GenericTableOps.addColSeparator(0.05),
    "poss": GenericTableOps.addIntCol("Poss", "Total number of possessions for selected lineups", GenericTableOps.defaultColorPicker),
    "adj_opp": GenericTableOps.addPtsCol("SoS", "Weighted average of the offensive or defensive efficiencies of the lineups' opponents", GenericTableOps.defaultColorPicker),
  };

  // ON/OFF REPORT

  static readonly onOffReport = {
    "title": GenericTableOps.addTitle("", "", CommonTableDefs.rowSpanCalculator, "small"),
    "sep0": GenericTableOps.addColSeparator(),
    "ppp": GenericTableOps.addPtsCol("P/100", "Points per 100 possessions", CommonTableDefs.picker(...CbbColors.pp100)),
    "adj_ppp": GenericTableOps.addPtsCol("Adj P/100", "Approximate schedule-adjusted Points per 100 possessions", CommonTableDefs.picker(...CbbColors.pp100)),
    "sep1": GenericTableOps.addColSeparator(),
    "efg": GenericTableOps.addPctCol("eFG%", "Effective field goal% (3 pointers count 1.5x as much) for selected lineups", CommonTableDefs.picker(...CbbColors.eFG)),
    "to": GenericTableOps.addPctCol("TO%", "Turnover % for selected lineups", CommonTableDefs.picker(...CbbColors.tOver)),
    "orb": GenericTableOps.addPctCol("OR%", "Offensive rebounding % for selected lineups", CommonTableDefs.picker(...CbbColors.oReb)),
    "ftr": GenericTableOps.addPctCol("FTR", "Free throw rate for selected lineups", CommonTableDefs.picker(...CbbColors.ftr)),
    "sep2a": GenericTableOps.addColSeparator(),
    "assist": GenericTableOps.addPctCol("A%", "Assist % for selected lineups", CommonTableDefs.picker(...CbbColors.ast)),
    "sep2b": GenericTableOps.addColSeparator(0.05),
    "3pr": GenericTableOps.addPctCol("3PR", "Percentage of 3 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "2pmidr": GenericTableOps.addPctCol("2PR mid", "Percentage of mid range 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "2primr": GenericTableOps.addPctCol("2PR rim", "Percentage of layup/dunk/etc 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.fgr)),
    "sep3": GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol("3P%", "3 point field goal percentage", CommonTableDefs.picker(...CbbColors.fg3P)),
    "2p": GenericTableOps.addPctCol("2P%", "2 point field goal percentage", CommonTableDefs.picker(...CbbColors.fg2P)),
    "2pmid": GenericTableOps.addPctCol("2P% mid", "2 point field goal percentage (mid range)", CommonTableDefs.picker(...CbbColors.fg2P_mid)),
    "2prim": GenericTableOps.addPctCol("2P% rim", "2 point field goal percentage (layup/dunk/etc)", CommonTableDefs.picker(...CbbColors.fg2P_rim)),
    "sep4": GenericTableOps.addColSeparator(),
    "poss": GenericTableOps.addIntCol("Poss", "Total number of possessions for selected lineups", GenericTableOps.defaultColorPicker),
    "adj_opp": GenericTableOps.addPtsCol("SoS", "Weighted average of the offensive or defensive efficiencies of the lineups' opponents", GenericTableOps.defaultColorPicker),
  };

  /** Same as onOffReport except with generic HTML for the row "title" */
  static readonly onOffReportWithFormattedTitle = _.chain(CommonTableDefs.onOffReport).toPairs().map((kv) => {
    if (kv[0] == "title") {
      return [
        kv[0],
        GenericTableOps.addTitle("", "", CommonTableDefs.rowSpanCalculator, "small", GenericTableOps.htmlFormatter)
      ];
    } else return kv;
  }).fromPairs().value();

  /** Same as onOffReport except the colorscales are centered around 0 */
  static readonly onOffReportReplacement = {
    "title": GenericTableOps.addTitle("", "", CommonTableDefs.rowSpanCalculator, "small", GenericTableOps.htmlFormatter),
    "sep0": GenericTableOps.addColSeparator(),
    "ppp": GenericTableOps.addPtsCol("P/100", "Points per 100 possessions", CommonTableDefs.picker(...CbbColors.diff10_p100_redGreen)),
    "adj_ppp": GenericTableOps.addPtsCol("Adj P/100", "Approximate schedule-adjusted Points per 100 possessions", CommonTableDefs.picker(...CbbColors.diff10_p100_redGreen)),
    "sep1": GenericTableOps.addColSeparator(),
    "efg": GenericTableOps.addPctCol("eFG%", "Effective field goal% (3 pointers count 1.5x as much) for selected lineups", CommonTableDefs.picker(...CbbColors.diff10_redGreen)),
    "to": GenericTableOps.addPctCol("TO%", "Turnover % for selected lineups", CommonTableDefs.picker(...CbbColors.diff10_greenRed)),
    "orb": GenericTableOps.addPctCol("ORB%", "Offensive rebounding % for selected lineups", CommonTableDefs.picker(...CbbColors.diff10_redGreen)),
    "ftr": GenericTableOps.addPctCol("FTR", "Free throw rate for selected lineups", CommonTableDefs.picker(...CbbColors.diff10_redGreen)),
    "sep2-1": GenericTableOps.addColSeparator(),
    "assist": GenericTableOps.addPctCol("A%", "Assist % for selected lineups", CommonTableDefs.picker(...CbbColors.diff10_blueOrange)),
    "sep2-2": GenericTableOps.addColSeparator(),
    "3pr": GenericTableOps.addPctCol("3PR", "Percentage of 3 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.diff10_blueOrange)),
    "2pmidr": GenericTableOps.addPctCol("2PR mid", "Percentage of mid range 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.diff10_blueOrange)),
    "2primr": GenericTableOps.addPctCol("2PR rim", "Percentage of layup/dunk/etc 2 pointers taken against all field goals", CommonTableDefs.picker(...CbbColors.diff10_blueOrange)),
    "sep3": GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol("3P%", "3 point field goal percentage", CommonTableDefs.picker(...CbbColors.diff10_redGreen)),
    "2p": GenericTableOps.addPctCol("2P%", "2 point field goal percentage", CommonTableDefs.picker(...CbbColors.diff10_redGreen)),
    "2pmid": GenericTableOps.addPctCol("2P% mid", "2 point field goal percentage (mid range)", CommonTableDefs.picker(...CbbColors.diff10_redGreen)),
    "2prim": GenericTableOps.addPctCol("2P% rim", "2 point field goal percentage (layup/dunk/etc)", CommonTableDefs.picker(...CbbColors.diff10_redGreen)),
    "sep4": GenericTableOps.addColSeparator(),
    "poss": GenericTableOps.addIntCol("Poss", "Total number of possessions for selected lineups", GenericTableOps.defaultColorPicker),
    "adj_opp": GenericTableOps.addPtsCol("SoS", "Weighted average of the offensive or defensive efficiencies of the lineups' opponents", GenericTableOps.defaultColorPicker),
  };

}
