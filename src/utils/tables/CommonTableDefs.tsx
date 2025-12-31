// React imports:
import React from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../../components/GenericTable";

// Util imports
import { CbbColors } from "../CbbColors";
import { TableDisplayUtils } from "./TableDisplayUtils"; // Import needed for tooltips/links if used

// Lodash:
import _ from "lodash";

const lineSep = (
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

/** Holds all the different column definitions for the similar tables used throughout this SPA */
export class CommonTableDefs {
  // Handy utilities

  static offPrefixFn = (key: string) => "off_" + key;
  static offCellMetaFn = (key: string, val: any) => "off";
  static defPrefixFn = (key: string) => "def_" + key;
  static defCellMetaFn = (key: string, val: any) => "def";

  static picker(
    offScale: (val: number) => string | undefined,
    defScale: (val: number) => string | undefined
  ) {
    return (val: any, valMeta: string) => {
      const num = _.isNil(val.colorOverride)
        ? (val.value as number)
        : (val.colorOverride as number);
      return _.isNil(num)
        ? CbbColors.malformedDataColor //(we'll use this color to indicate malformed data)
        : "off" == valMeta
        ? offScale(num)
        : defScale(num);
    };
  }

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

  //TODO: add others, find generic descriptions etc

  // ON/OFF - TEAM

  /** To build a less wordy set of header text for the repeating headers (team on/off) */
  static repeatingOnOffHeaderFields: Record<string, string> = {
    "Net Rtg": "Net",
    "Adj P/100": "Adj",
    "2PR mid": "MidR",
    "2PR rim": "RimR",
    "2P% mid": "Mid%",
    "2P% rim": "Rim%",
  };

  static readonly onOffTable = () => ({
    //accessors vs column metadata
    title: GenericTableOps.addTitle(
      "",
      "",
      CommonTableDefs.rowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter
    ),
    sep_adj_raw: GenericTableOps.addSpecialColSeparator("__adj_raw__"),
    net: GenericTableOps.addDataCol(
      "Net Rtg",
      "The margin between the adjusted offensive and defensive efficiencies (lower number is raw margin)",
      CbbColors.offOnlyPicker(...CbbColors.diff35_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter
    ),
    sep_off_def: GenericTableOps.addSpecialColSeparator("__off_def__"),
    ppp: GenericTableOps.addPtsCol(
      "P/100",
      "Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.pp100)
    ),
    adj_ppp: GenericTableOps.addPtsCol(
      "Adj P/100",
      "Approximate schedule-adjusted Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.pp100)
    ),
    sep1: GenericTableOps.addColSeparator(),
    efg: GenericTableOps.addPctCol(
      "eFG%",
      "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
      CommonTableDefs.picker(...CbbColors.eFG)
    ),
    to: GenericTableOps.addPctCol(
      "TO%",
      "Turnover % for selected lineups",
      CommonTableDefs.picker(...CbbColors.tOver)
    ),
    orb: GenericTableOps.addPctCol(
      "OR%",
      "Offensive rebounding % for selected lineups",
      CommonTableDefs.picker(...CbbColors.oReb)
    ),
    ftr: GenericTableOps.addPctCol(
      "FTR",
      "Free throw rate for selected lineups",
      CommonTableDefs.picker(...CbbColors.ftr)
    ),
    sep2a: GenericTableOps.addColSeparator(),
    assist: GenericTableOps.addPctCol(
      "A%",
      "Assist % for selected lineups",
      CommonTableDefs.picker(...CbbColors.ast)
    ),
    sep2b: GenericTableOps.addColSeparator(0.05),
    "3pr": GenericTableOps.addPctCol(
      "3PR",
      "Percentage of 3 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr)
    ),
    "2pmidr": GenericTableOps.addPctCol(
      "2PR mid",
      "Percentage of mid range 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr)
    ),
    "2primr": GenericTableOps.addPctCol(
      "2PR rim",
      "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr)
    ),
    sep3: GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol(
      "3P%",
      "3 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.fg3P)
    ),
    "2p": GenericTableOps.addPctCol(
      "2P%",
      "2 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.fg2P)
    ),
    "2pmid": GenericTableOps.addPctCol(
      "2P% mid",
      "2 point field goal percentage (mid range)",
      CommonTableDefs.picker(...CbbColors.fg2P_mid)
    ),
    "2prim": GenericTableOps.addPctCol(
      "2P% rim",
      "2 point field goal percentage (layup/dunk/etc)",
      CommonTableDefs.picker(...CbbColors.fg2P_rim)
    ),
    sep4: GenericTableOps.addColSeparator(),
    poss: GenericTableOps.addIntCol(
      "Poss",
      "Total number of possessions for selected lineups",
      GenericTableOps.defaultColorPicker
    ),
    adj_opp: GenericTableOps.addPtsCol(
      "SoS",
      "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
      GenericTableOps.defaultColorPicker
    ),
  });

  // ON/OFF - INDIVIDUAL

  /** Utility to put a faint colored backing to text */
  static readonly getTextShadow = (
    stat: { value?: number },
    colorMapper: (val: number) => string | undefined,
    radius: string = "15px",
    strength = 3
  ) => {
    const shadow = _.range(0, strength)
      .map((__) => `0px 0px ${radius} ${colorMapper(stat?.value || 0) || ""}`)
      .join(",");
    return {
      textShadow: shadow,
    };
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
    off_2prim: (o: string) => `2P% rim (${o} / Offensive)`,
    def_2prim: (o: string) => `Blk% (${o} / Defensive)`,
    diff_2prim: (o: string) => undefined,
    //(also nothing to be done about def OR% because it's both RB and OR)
    off_drb: (o: string) => `DR% (${o} / Defensive)`,
    def_drb: (o: string) => undefined,
  } as Record<string, (o: string) => string | undefined>;

  /** To build a less wordy set of header text for the repeating headers (roster view) */
  static repeatingOnOffIndivHeaderFields: Record<string, string> = {
    "Box Rtg": "Box",
    "Adj+ Rtg": "Adj+",
    "Adj+ Prod": "Adj+",
    "RAPM net": "RAPM",

    "Usg Pos": "Usg",
    "TO% Stl%": "TO%",
    "FTR F/50": "FTR",
    "Rim% Blk%": "Rim%",

    "2PR mid": "MidR",
    "2PR rim": "RimR",
    "2P% mid": "Mid%",
    "2P% rim": "Rim%",
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
            GenericTableOps.htmlFormatter
          )
        : GenericTableOps.addTitle(
            "",
            "",
            CommonTableDefs.singleLineRowSpanCalculator,
            "small",
            GenericTableOps.htmlFormatter
          ),
      sep_off_def: expandedView
        ? GenericTableOps.addSpecialColSeparator("__off_def__")
        : GenericTableOps.addColSeparator(),
      team_poss: GenericTableOps.addDataCol(
        "Poss",
        "Total number of team possessions for selected lineups",
        GenericTableOps.defaultColorPicker,
        GenericTableOps.offHighlightFormatter(GenericTableOps.intFormatter)
      ),
      team_poss_pct: GenericTableOps.addDataCol(
        "Poss%",
        "% of team possessions in selected lineups that player was on the floor",
        GenericTableOps.defaultColorPicker,
        GenericTableOps.offHighlightFormatter(GenericTableOps.percentFormatter)
      ),
      rtg: GenericTableOps.addPtsCol(
        "Box Rtg",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " rating in selected lineups (box-score derived)",
        CbbColors.picker(...CbbColors.pp100)
      ),
      usage: GenericTableOps.addDataCol(
        expandedView ? <div>Usg{lineSep} Pos</div> : "Usg",
        expandedView
          ? "% of team possessions used in selected lineups, plus the position category for this player"
          : "% of team possessions used in selected lineups",
        CbbColors.offOnlyPicker(...CbbColors.usg),
        GenericTableOps.percentOrHtmlFormatter
      ), //TODO needs to be steeper
      adj_rtg: GenericTableOps.addPtsCol(
        "Adj+ Rtg",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " rating vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CbbColors.picker(...CbbColors.diff10_p100_redGreen)
      ),
      adj_prod: GenericTableOps.addPtsCol(
        "Adj+ Prod",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " production (ratings * mins%) vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CbbColors.picker(...CbbColors.diff10_p100_redGreen)
      ),

      // 2 of these 4 are always omitted by onOffIndividualTable, the other 2 we just make empty-ish so that auto-gen of table sort works
      adj_rapm_margin: expandedView
        ? { colName: undefined }
        : GenericTableOps.addDataCol(
            "RAPM net",
            "Adjusted Plus-Minus vs D1 average (Off-Def margin)",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter
          ),
      adj_rapm_prod_margin: expandedView
        ? { colName: undefined }
        : GenericTableOps.addDataCol(
            "RAPM Prod",
            "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average (Off-Def margin)",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter
          ),
      adj_rapm: expandedView
        ? GenericTableOps.addDataCol(
            "RAPM",
            "Adjusted Plus-Minus vs D1 average",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter
          )
        : { colName: undefined },
      adj_rapm_prod: expandedView
        ? GenericTableOps.addDataCol(
            "RAPM Prod",
            "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average",
            CbbColors.picker(...CbbColors.diff10_p100_redGreen),
            GenericTableOps.pointsOrHtmlFormatter
          )
        : { colName: undefined },

      sep1: GenericTableOps.addColSeparator(),
      efg: GenericTableOps.addDataCol(
        "eFG%",
        "Effective field goal% (3 pointers count 1.5x as much) in selected lineups",
        CbbColors.offOnlyPicker(...CbbColors.eFG),
        GenericTableOps.percentOrHtmlFormatter
      ),
      assist: GenericTableOps.addDataCol(
        "A%",
        "Assist % for player in selected lineups",
        CbbColors.offOnlyPicker(...CbbColors.p_ast),
        GenericTableOps.percentOrHtmlFormatter
      ),
      to: GenericTableOps.addPctCol(
        expandedView ? <div>TO%{lineSep} Stl%</div> : "TO%",
        expandedView
          ? "Turnover % / Steal % in selected lineups"
          : "Turnover % in selected lineups",
        CbbColors.picker(...CbbColors.p_tOver)
      ),
      orb: expandedView
        ? GenericTableOps.addPctCol(
            "RB%",
            "Offensive/Defensive rebounding % in selected lineups",
            CbbColors.picker(...CbbColors.p_oReb)
          )
        : GenericTableOps.addPctCol(
            "OR%",
            "Offensive rebounding % in selected lineups",
            CbbColors.picker(...CbbColors.p_oReb)
          ),
      drb: GenericTableOps.addPctCol(
        "DR%",
        "Defensive rebounding % in selected lineups",
        CbbColors.picker(...CbbColors.p_dReb)
      ),
      ftr: GenericTableOps.addPctCol(
        expandedView ? <div>FTR{lineSep} F/50</div> : "FTR",
        expandedView
          ? "Free throw rate (off) and Fouls called/50 possessions (def) in selected lineups"
          : "Free throw rate in selected lineups",
        CbbColors.picker(...CbbColors.p_ftr)
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
        GenericTableOps.percentOrHtmlFormatter
      ),
      "2pmidr": GenericTableOps.addDataCol(
        "2PR mid",
        `Percentage of mid range 2 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CbbColors.offOnlyPicker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter
      ),
      "2primr": GenericTableOps.addDataCol(
        "2PR rim",
        `Percentage of layup/dunk/etc 2 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CbbColors.offOnlyPicker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter
      ),
      sep3: GenericTableOps.addColSeparator(),
      "3p": GenericTableOps.addPctCol(
        "3P%",
        "3 point field goal percentage",
        CbbColors.picker(...CbbColors.fg3P)
      ),
      "2p": GenericTableOps.addPctCol(
        "2P%",
        "2 point field goal percentage",
        CbbColors.picker(...CbbColors.fg2P)
      ),
      "2pmid": GenericTableOps.addPctCol(
        "2P% mid",
        "2 point field goal percentage (mid range)",
        CbbColors.picker(...CbbColors.fg2P_mid)
      ),
      "2prim": GenericTableOps.addPctCol(
        expandedView ? <div>Rim%{lineSep} Blk%</div> : "2P% rim",
        expandedView
          ? "2 point field goal percentage (off) and Block% (def)"
          : "2 point field goal percentage (layup/dunk/etc)",
        CbbColors.picker(...CbbColors.p_fg2P_rim)
      ),
      sep4: GenericTableOps.addColSeparator(),
      adj_opp: GenericTableOps.addPtsCol(
        "SoS",
        "Weighted average of the offensive or defensive efficiencies of the player's opponents",
        GenericTableOps.defaultColorPicker
      ),
    };
  };

  /** Specific fields required for an instance of a roster stats table */
  static readonly onOffIndividualTable = (
    expandedView: boolean,
    possAsPct: boolean,
    factorMins: boolean,
    includeRapm: boolean
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
                expandedView ? ["adj_rapm_prod_margin"] : ["adj_rapm_prod"]
              )
            : ["adj_rapm_prod", "adj_rapm_prod_margin"].concat(
                expandedView ? ["adj_rapm_margin"] : ["adj_rapm"]
              )
          : [
              "adj_rapm",
              "adj_rapm_prod",
              "adj_rapm_margin",
              "adj_rapm_prod_margin",
            ], //(all RAPM)
      ])
    ) as Record<string, GenericTableColProps>;
  };

  /** Single row player leaderboard table with On/Off styling */
  static readonly singleRowPlayerLeaderboardOnOffStyle = (
    factorMins: boolean,
    useRapm: boolean,
    gender: string,
    year: string,
    isT100: boolean,
    isConfOnly: boolean
  ) => {
    return {
      // Player name column
      title: GenericTableOps.addTitle(
        "Player",
        "Player name",
        (_) => 1,
        "left",
        (val: any) => {
          let elementToRender: React.ReactNode;
          if (React.isValidElement(val)) {
            elementToRender = val;
          } else {
            elementToRender = val?.toString() || "-";
          }
          // Wrap the element in a div with left alignment and no wrapping
          return (
            <div style={{ textAlign: "left", whiteSpace: "nowrap" }}>
              {elementToRender}
            </div>
          );
        }
      ),
      // Team column
      team: {
        ...GenericTableOps.addDataCol(
          "Team",
          "Team name",
          GenericTableOps.defaultColorPicker,
          (val: any) => {
            if (React.isValidElement(val)) {
              return val;
            }
            // Add nowrap styling
            return (
              <span style={{ whiteSpace: "nowrap" }}>
                {val?.toString() || "-"}
              </span>
            );
          }
        ),
        //colWidth: 20
      },
      // Position column
      position: GenericTableOps.addDataCol(
        "Pos",
        "Player's position",
        GenericTableOps.defaultColorPicker,
        (val: any) => {
          if (!val) return "-";

          if (React.isValidElement(val)) {
            return val;
          }

          const posString = String(val);
          const posBreakdown = undefined;

          return (
            <OverlayTrigger
              placement="auto"
              overlay={TableDisplayUtils.buildPositionTooltip(
                posString,
                "season",
                true,
                posBreakdown
              )}
            >
              <small>
                <span style={{ whiteSpace: "nowrap" }}>{posString}</span>
              </small>
            </OverlayTrigger>
          );
        }
      ),
      sep0: GenericTableOps.addColSeparator(),
      sep0_5: GenericTableOps.addColSeparator(),
      // RAPM columns - Higher Off is better, Lower Def is better -> Red, Green
      off_adj_rapm: GenericTableOps.addDataCol(
        "Off",
        useRapm
          ? factorMins
            ? "Offensive RAPM production (RAPM * mins%)"
            : "Offensive RAPM"
          : factorMins
          ? "Offensive adjusted production (rating * mins%)"
          : "Offensive adjusted rating",
        CbbColors.picker(
          CbbColors.diff10_p100_redGreen[1],
          CbbColors.diff10_p100_redGreen[0]
        ),
        GenericTableOps.pointsOrHtmlFormatter
      ),
      def_adj_rapm: GenericTableOps.addDataCol(
        "Def",
        useRapm
          ? factorMins
            ? "Defensive RAPM production (RAPM * mins%)"
            : "Defensive RAPM"
          : factorMins
          ? "Defensive adjusted production (rating * mins%)"
          : "Defensive adjusted rating",
        CbbColors.picker(...CbbColors.diff10_p100_redGreen),
        GenericTableOps.pointsOrHtmlFormatter
      ),
      net_rapm: GenericTableOps.addDataCol(
        "Net",
        useRapm
          ? factorMins
            ? "Net RAPM production (Off - Def)"
            : "Net RAPM (Off - Def)"
          : factorMins
          ? "Net adjusted production (Off - Def)"
          : "Net adjusted rating (Off - Def)",
        CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
        GenericTableOps.pointsOrHtmlFormatter
      ),
      sep0_6: GenericTableOps.addColSeparator(),
      // Shooting percentage columns - Higher is better -> Red, Green (use index [1] then [0])
      off_efg: GenericTableOps.addDataCol(
        "eFG%",
        "Effective field goal% (3 pointers count 1.5x as much)",
        CbbColors.picker(CbbColors.eFG[1], CbbColors.eFG[0]),
        GenericTableOps.percentOrHtmlFormatter
      ),
      off_2p: GenericTableOps.addPctCol(
        "2P%",
        "2 point field goal percentage",
        CbbColors.picker(CbbColors.fg2P[1], CbbColors.fg2P[0])
      ),
      off_3p: GenericTableOps.addPctCol(
        "3P%",
        "3 point field goal percentage",
        CbbColors.picker(CbbColors.fg3P[1], CbbColors.fg3P[0])
      ),
      off_2pmid: GenericTableOps.addPctCol(
        "Mid%",
        "2 point field goal percentage (mid range)",
        CbbColors.picker(CbbColors.fg2P_mid[1], CbbColors.fg2P_mid[0])
      ),
      off_2prim: GenericTableOps.addPctCol(
        "Rim%",
        "2 point field goal percentage (layup/dunk/etc)",
        CbbColors.picker(CbbColors.fg2P_rim[1], CbbColors.fg2P_rim[0])
      ),
      sep2: GenericTableOps.addColSeparator(),
      // Shooting rates columns - Neutral/Frequency -> Blue, Orange (use index [0] then [1] or custom)
      off_3pr: GenericTableOps.addDataCol(
        "3PR",
        "Percentage of 3 pointers taken against all field goals",
        CbbColors.picker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter
      ),
      off_2pmidr: GenericTableOps.addDataCol(
        "MidR",
        "Percentage of mid range 2 pointers taken against all field goals",
        CbbColors.picker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter
      ),
      off_2primr: GenericTableOps.addDataCol(
        "RimR",
        "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
        CbbColors.picker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter
      ),
      off_ftr: GenericTableOps.addPctCol(
        "FTR",
        "Free Throw Rate (FTA/FGA)",
        CbbColors.picker(...CbbColors.fgr)
      ),
      sep3: GenericTableOps.addColSeparator(),
      // Other stats columns
      off_usage: GenericTableOps.addDataCol(
        "Usg",
        "% of team possessions used in selected lineups",
        CbbColors.picker(...CbbColors.usg),
        GenericTableOps.percentOrHtmlFormatter
      ),
      off_assist: GenericTableOps.addDataCol(
        "A%",
        "Assist % for player in selected lineups",
        CbbColors.picker(...CbbColors.p_ast),
        GenericTableOps.percentOrHtmlFormatter
      ),
      off_to: GenericTableOps.addPctCol(
        "TO%",
        "Turnover % in selected lineups",
        CbbColors.picker(CbbColors.p_tOver[1], CbbColors.p_tOver[0])
      ),
      // Rebounding columns - Higher is better -> Red, Green
      off_orb: GenericTableOps.addPctCol(
        "OR%",
        "Offensive rebounding % in selected lineups",
        CbbColors.picker(CbbColors.p_oReb[1], CbbColors.p_oReb[0])
      ),
      def_orb: GenericTableOps.addPctCol(
        "DR%",
        "Defensive rebounding % in selected lineups",
        CbbColors.picker(CbbColors.p_dReb[1], CbbColors.p_dReb[0])
      ),
      def_stl: GenericTableOps.addPctCol(
        "Stl%",
        "Steal % in selected lineups",
        CbbColors.picker(CbbColors.p_def_TO, CbbColors.p_def_TO)
      ),
      def_blk: GenericTableOps.addPctCol(
        "Blk%",
        "Block % in selected lineups",
        CbbColors.picker(CbbColors.p_def_2P_rim, CbbColors.p_def_2P_rim)
      ),
      // Added Poss%
      team_poss_pct: GenericTableOps.addPctCol(
        "Poss%",
        "% of team possessions player was on the floor for",
        GenericTableOps.defaultColorPicker
      ),
    } as Record<string, GenericTableColProps>;
  };

  // LINEUP:

  /** To build a less wordy set of header text for the repeating headers (team on/off) */
  static repeatingLineupHeaderFields: Record<string, string> = {
    "Net Rtg": "Net",
    "Adj P/100": "Adj",
    "2PR mid": "MidR",
    "2PR rim": "RimR",
    "2P% mid": "Mid%",
    "2P% rim": "Rim%",
  };

  static readonly lineupTable = (rawPts: boolean) =>
    _.omit(
      {
        //accessors vs column metadata
        title: GenericTableOps.addTitle(
          "",
          "",
          CommonTableDefs.rowSpanCalculator,
          "small",
          GenericTableOps.htmlFormatter,
          20
        ),
        sep_adj_net: GenericTableOps.addSpecialColSeparator("__adj_raw__"),
        net: GenericTableOps.addDataCol(
          "Net Rtg",
          "The margin between the adjusted offensive and defensive efficiencies (lower number is raw margin)",
          CbbColors.offOnlyPicker(...CbbColors.diff35_p100_redGreen),
          GenericTableOps.pointsOrHtmlFormatter
        ),
        sep_off_def: GenericTableOps.addSpecialColSeparator("__off_def__"),
        raw_pts: GenericTableOps.addDataCol(
          "Pts",
          "Points scored/conceded by this lineup",
          CbbColors.applyThemedBackground,
          GenericTableOps.pointsOrHtmlFormatter
        ),
        ppp: GenericTableOps.addPtsCol(
          "P/100",
          "Points per 100 possessions",
          CommonTableDefs.picker(...CbbColors.pp100)
        ),
        adj_ppp: GenericTableOps.addPtsCol(
          "Adj P/100",
          "Approximate schedule-adjusted Points per 100 possessions",
          CommonTableDefs.picker(...CbbColors.pp100)
        ),
        sep1: GenericTableOps.addColSeparator(0.05),
        efg: GenericTableOps.addPctCol(
          "eFG%",
          "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
          CommonTableDefs.picker(...CbbColors.eFG)
        ),
        to: GenericTableOps.addPctCol(
          "TO%",
          "Turnover % for selected lineups",
          CommonTableDefs.picker(...CbbColors.tOver)
        ),
        orb: GenericTableOps.addPctCol(
          "OR%",
          "Offensive rebounding % for selected lineups",
          CommonTableDefs.picker(...CbbColors.oReb)
        ),
        ftr: GenericTableOps.addPctCol(
          "FTR",
          "Free throw rate for selected lineups",
          CommonTableDefs.picker(...CbbColors.ftr)
        ),
        sep2a: GenericTableOps.addColSeparator(),
        assist: GenericTableOps.addPctCol(
          "A%",
          "Assist % for selected lineups",
          CommonTableDefs.picker(...CbbColors.ast)
        ),
        sep2b: GenericTableOps.addColSeparator(0.05),
        "3pr": GenericTableOps.addPctCol(
          "3PR",
          "Percentage of 3 pointers taken against all field goals",
          CommonTableDefs.picker(...CbbColors.fgr)
        ),
        "2pmidr": GenericTableOps.addPctCol(
          "2PR mid",
          "Percentage of mid range 2 pointers taken against all field goals",
          CommonTableDefs.picker(...CbbColors.fgr)
        ),
        "2primr": GenericTableOps.addPctCol(
          "2PR rim",
          "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
          CommonTableDefs.picker(...CbbColors.fgr)
        ),
        sep3: GenericTableOps.addColSeparator(0.05),
        "3p": GenericTableOps.addPctCol(
          "3P%",
          "3 point field goal percentage",
          CommonTableDefs.picker(...CbbColors.fg3P)
        ),
        "2p": GenericTableOps.addPctCol(
          "2P%",
          "2 point field goal percentage",
          CommonTableDefs.picker(...CbbColors.fg2P)
        ),
        "2pmid": GenericTableOps.addPctCol(
          "2P% mid",
          "2 point field goal percentage (mid range)",
          CommonTableDefs.picker(...CbbColors.fg2P_mid)
        ),
        "2prim": GenericTableOps.addPctCol(
          "2P% rim",
          "2 point field goal percentage (layup/dunk/etc)",
          CommonTableDefs.picker(...CbbColors.fg2P_rim)
        ),
        sep4: GenericTableOps.addColSeparator(0.05),
        poss: GenericTableOps.addIntCol(
          "Poss",
          "Total number of possessions for selected lineups",
          GenericTableOps.defaultColorPicker
        ),
        adj_opp: GenericTableOps.addPtsCol(
          "SoS",
          "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
          GenericTableOps.defaultColorPicker
        ),
      },
      rawPts ? ["ppp"] : ["raw_pts"]
    );

  // Extra lineup table presets:

  static readonly lineupsExtraColSet = (
    expanded: boolean,
    rawPts: boolean
  ) => ({
    "Extra Fields": {
      isPreset: false,
      description: "Useful additional fields",
      colSet: {
        raw_pts: GenericTableOps.addDataCol(
          "Pts",
          "Points scored/conceded by this lineup",
          CbbColors.applyThemedBackground,
          GenericTableOps.pointsOrHtmlFormatter
        ),
      },
    },
    "Mobile Friendly": {
      isPreset: true,
      description: "Mobile friendly view of basic off/def view",
      colSet: _.pick(CommonTableDefs.lineupTable(rawPts), [
        "title",
        "net",
        "raw_pts",
        "ppp",
        "3p",
        "poss",
      ]),
    },
  });

  // ON/OFF REPORT

  static readonly onOffReport = {
    title: GenericTableOps.addTitle(
      "",
      "",
      CommonTableDefs.rowSpanCalculator,
      "small"
    ),
    sep_off_def: GenericTableOps.addSpecialColSeparator("__off_def__"),
    ppp: GenericTableOps.addPtsCol(
      "P/100",
      "Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.pp100)
    ),
    adj_ppp: GenericTableOps.addPtsCol(
      "Adj P/100",
      "Approximate schedule-adjusted Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.pp100)
    ),
    sep1: GenericTableOps.addColSeparator(),
    efg: GenericTableOps.addPctCol(
      "eFG%",
      "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
      CommonTableDefs.picker(...CbbColors.eFG)
    ),
    to: GenericTableOps.addPctCol(
      "TO%",
      "Turnover % for selected lineups",
      CommonTableDefs.picker(...CbbColors.tOver)
    ),
    orb: GenericTableOps.addPctCol(
      "OR%",
      "Offensive rebounding % for selected lineups",
      CommonTableDefs.picker(...CbbColors.oReb)
    ),
    ftr: GenericTableOps.addPctCol(
      "FTR",
      "Free throw rate for selected lineups",
      CommonTableDefs.picker(...CbbColors.ftr)
    ),
    sep2a: GenericTableOps.addColSeparator(),
    assist: GenericTableOps.addPctCol(
      "A%",
      "Assist % for selected lineups",
      CommonTableDefs.picker(...CbbColors.ast)
    ),
    sep2b: GenericTableOps.addColSeparator(0.05),
    "3pr": GenericTableOps.addPctCol(
      "3PR",
      "Percentage of 3 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr)
    ),
    "2pmidr": GenericTableOps.addPctCol(
      "2PR mid",
      "Percentage of mid range 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr)
    ),
    "2primr": GenericTableOps.addPctCol(
      "2PR rim",
      "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.fgr)
    ),
    sep3: GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol(
      "3P%",
      "3 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.fg3P)
    ),
    "2p": GenericTableOps.addPctCol(
      "2P%",
      "2 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.fg2P)
    ),
    "2pmid": GenericTableOps.addPctCol(
      "2P% mid",
      "2 point field goal percentage (mid range)",
      CommonTableDefs.picker(...CbbColors.fg2P_mid)
    ),
    "2prim": GenericTableOps.addPctCol(
      "2P% rim",
      "2 point field goal percentage (layup/dunk/etc)",
      CommonTableDefs.picker(...CbbColors.fg2P_rim)
    ),
    sep4: GenericTableOps.addColSeparator(),
    poss: GenericTableOps.addIntCol(
      "Poss",
      "Total number of possessions for selected lineups",
      GenericTableOps.defaultColorPicker
    ),
    adj_opp: GenericTableOps.addPtsCol(
      "SoS",
      "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
      GenericTableOps.defaultColorPicker
    ),
  };

  /** Same as onOffReport except with generic HTML for the row "title" */
  static readonly onOffReportWithFormattedTitle = _.chain(
    CommonTableDefs.onOffReport
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
            GenericTableOps.htmlFormatter
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
      GenericTableOps.htmlFormatter
    ),
    sep0: GenericTableOps.addColSeparator(),
    ppp: GenericTableOps.addPtsCol(
      "P/100",
      "Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.diff10_p100_redGreen)
    ),
    adj_ppp: GenericTableOps.addPtsCol(
      "Adj P/100",
      "Approximate schedule-adjusted Points per 100 possessions",
      CommonTableDefs.picker(...CbbColors.diff10_p100_redGreen)
    ),
    sep1: GenericTableOps.addColSeparator(),
    efg: GenericTableOps.addPctCol(
      "eFG%",
      "Effective field goal% (3 pointers count 1.5x as much) for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen)
    ),
    to: GenericTableOps.addPctCol(
      "TO%",
      "Turnover % for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_greenRed)
    ),
    orb: GenericTableOps.addPctCol(
      "OR%",
      "Offensive rebounding % for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen)
    ),
    ftr: GenericTableOps.addPctCol(
      "FTR",
      "Free throw rate for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen)
    ),
    "sep2-1": GenericTableOps.addColSeparator(),
    assist: GenericTableOps.addPctCol(
      "A%",
      "Assist % for selected lineups",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange)
    ),
    "sep2-2": GenericTableOps.addColSeparator(),
    "3pr": GenericTableOps.addPctCol(
      "3PR",
      "Percentage of 3 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange)
    ),
    "2pmidr": GenericTableOps.addPctCol(
      "2PR mid",
      "Percentage of mid range 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange)
    ),
    "2primr": GenericTableOps.addPctCol(
      "2PR rim",
      "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
      CommonTableDefs.picker(...CbbColors.diff10_blueOrange)
    ),
    sep3: GenericTableOps.addColSeparator(),
    "3p": GenericTableOps.addPctCol(
      "3P%",
      "3 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen)
    ),
    "2p": GenericTableOps.addPctCol(
      "2P%",
      "2 point field goal percentage",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen)
    ),
    "2pmid": GenericTableOps.addPctCol(
      "2P% mid",
      "2 point field goal percentage (mid range)",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen)
    ),
    "2prim": GenericTableOps.addPctCol(
      "2P% rim",
      "2 point field goal percentage (layup/dunk/etc)",
      CommonTableDefs.picker(...CbbColors.diff10_redGreen)
    ),
    sep4: GenericTableOps.addColSeparator(),
    poss: GenericTableOps.addIntCol(
      "Poss",
      "Total number of possessions for selected lineups",
      GenericTableOps.defaultColorPicker
    ),
    adj_opp: GenericTableOps.addPtsCol(
      "SoS",
      "Weighted average of the offensive or defensive efficiencies of the lineups' opponents",
      GenericTableOps.defaultColorPicker
    ),
  };

  /** Builds the table definition for the off-season leaderboard */
  static readonly offseasonLeaderboardTable = (
    evalMode: boolean,
    transferInOutMode: boolean
  ) => {
    return _.omit(
      {
        title: GenericTableOps.addTitle(
          "",
          "",
          CommonTableDefs.rowSpanCalculator,
          "small",
          GenericTableOps.htmlFormatter,
          10
        ),
        conf: GenericTableOps.addDataCol(
          "Conf",
          "The team's conference",
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
        sep0: GenericTableOps.addColSeparator(),

        net: GenericTableOps.addPtsCol(
          "Net",
          "Net Adjusted Pts/100 above an average D1 team, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.off_diff35_p100_redGreen)
        ),
        net_grade: GenericTableOps.addDataCol(
          "Rank",
          "Net Adjusted Pts/100 ranking, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter
        ),
        actual_grade: GenericTableOps.addDataCol(
          "Act.",
          "Ranking based on the team's actual Net Adjusted Pts/100 above an average D1 team",
          CbbColors.varPicker(CbbColors.net_guess),
          GenericTableOps.gradeOrHtmlFormatter
        ),

        // Txfer in/out
        sepInOut1: GenericTableOps.addColSeparator(),
        dev_margin: GenericTableOps.addDataCol(
          "Dev",
          "For efficiency margin, expected increase in production from returning players",
          CbbColors.picker(...CbbColors.diff10_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter
        ),
        inout_margin: GenericTableOps.addDataCol(
          "I-O",
          "For efficiency margin, in-from-transfers minus out-from-transfers/NBA/Sr (using projected production for 'in')",
          CbbColors.picker(...CbbColors.diff35_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter
        ),
        "sepInOut1.5": GenericTableOps.addColSeparator(0.25),
        in_margin: GenericTableOps.addDataCol(
          "TxIn",
          "For efficiency margin, projected production from incoming transfers",
          CbbColors.picker(...CbbColors.diff10_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter
        ),
        out_margin: GenericTableOps.addDataCol(
          "TxOut",
          "For efficiency margin, lost production from last season due to transfers",
          CbbColors.picker(...CbbColors.diff10_p100_redGreen),
          GenericTableOps.pointsOrHtmlFormatter
        ),
        "sepInOut1.6": GenericTableOps.addColSeparator(0.25),
        fr_margin: GenericTableOps.addDataCol(
          "FrIn",
          "For efficiency margin, projected production from Freshmen",
          CbbColors.picker(...CbbColors.diff10_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter
        ),
        nba_margin: GenericTableOps.addDataCol(
          "NBA",
          "For efficiency margin, lost production from last season due to early NBA (or other pro) departures",
          CbbColors.picker(...CbbColors.diff10_p100_redGreen),
          GenericTableOps.pointsOrHtmlFormatter
        ),
        sr_margin: GenericTableOps.addDataCol(
          "SrOut",
          "For efficiency margin, lost production from last season due to graduation",
          CbbColors.picker(...CbbColors.diff35_p100_redGreen),
          GenericTableOps.pointsOrHtmlFormatter
        ),

        sep1: GenericTableOps.addColSeparator(),

        off: GenericTableOps.addPtsCol(
          "Off",
          "Offensive Adjusted Pts/100 above an average D1 team, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.off_pp100)
        ),
        off_grade: GenericTableOps.addDataCol(
          "Rank",
          "Offensive Adjusted Pts/100 ranking, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter
        ),

        sep2: GenericTableOps.addColSeparator(),

        def: GenericTableOps.addPtsCol(
          "Def",
          "Defensive Adjusted Pts/100 above an average D1 team, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.def_pp100)
        ),
        def_grade: GenericTableOps.addDataCol(
          "Rank",
          "Defensive Adjusted Pts/100 ranking, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter
        ),

        sep3: GenericTableOps.addColSeparator(),

        high_grade: GenericTableOps.addDataCol(
          "Good",
          "Optimistic net ranking",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter
        ),
        low_grade: GenericTableOps.addDataCol(
          "Bad",
          "Pessimistic net ranking",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter
        ),

        sep4: GenericTableOps.addColSeparator(),

        roster: GenericTableOps.addDataCol(
          "Roster",
          "Projected of (high major) Superstars / Stars / Starters / Rotation players on the team",
          CbbColors.applyThemedBackground,
          GenericTableOps.htmlFormatter
        ),

        sep5: GenericTableOps.addColSeparator(),

        edit: GenericTableOps.addDataCol(
          "",
          "Edit the team projections",
          CbbColors.applyThemedBackground,
          GenericTableOps.htmlFormatter
        ),
      },
      ([] as string[])
        .concat(evalMode ? [] : ["actual_grade"])
        .concat(
          transferInOutMode
            ? ["high_grade", "low_grade"]
            : [
                "sepInOut1",
                "dev_margin",
                "inout_margin",
                "sepInOut1.5",
                "sepInOut1.6",
                "in_margin",
                "out_margin",
                "nba_margin",
                "fr_margin",
                "sr_margin",
              ]
        )
    ) as Record<string, GenericTableColProps>;
  };
}
