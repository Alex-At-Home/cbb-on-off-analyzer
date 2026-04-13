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
import React from "react";
import { OverlayTrigger } from "react-bootstrap";
import { TableDisplayUtils } from "./TableDisplayUtils";
import { ImpactTableDefs } from "./ImpactTableDefs";

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

  /** Roster-stats-table specific translation from the sort field to the table display */
  static readonly rosterStatsSortField = (sortField: string) => {
    if (_.startsWith(sortField, "desc:off_team_poss")) {
      return undefined;
    } else {
      const sortFieldDecomp = sortField.split(":");
      return sortFieldDecomp[1];
    }
  };

  /** Player-leaderboard-table specific translation from the sort field to the table display */
  static readonly leaderboardStatsSortField = (sortFieldDecompStr: string) => {
    const sortFieldDecomp = sortFieldDecompStr.split(":");
    const sortField = sortFieldDecomp[1];
    if (sortField == "diff_adj_rapm") {
      return "off_adj_rapm_margin";
    } else if (sortField == "diff_adj_rapm_prod") {
      return "off_adj_rapm_prod_margin";
    } else {
      return sortField;
    }
  };

  /** Indiv-table specific handling of clicking on a column header to manage sorting */
  static readonly buildSortCallback = (
    rowMode: OffDefDualMixed,
    sortBy: string,
    sortOptions: { label: string; value: string }[],
    setSortMenuState: (newState: TableSortPopupMenuState) => void,
    leaderboardMode: boolean,
  ) => {
    return CommonTableDefs.buildSortCallback(
      leaderboardMode ? "Dual" : rowMode, //(in leaderboard mode we always use the full "dual" set)
      (headerKeyIn: string) => {
        return leaderboardMode
          ? headerKeyIn
              .replace("_margin", "")
              .substring(rowMode == "Mixed" ? 4 : 0) //(remove the off_/def_)
          : headerKeyIn;
      },
      sortBy,
      sortOptions,
      setSortMenuState,
    );
  };

  //////////////////////////////////////////////////////

  // Table Defs: Individual Table

  /** To build a less wordy set of header text for the repeating headers (roster view) */
  static repeatingIndivHeaderFields: Record<string, string> = {
    "Box Rtg": "Box",
    "Box oRtg": "Box",
    "Adj+ Rtg": "Adj+",
    "Adj+ oRtg": "oAdj+",
    "Adj+ Prod": "Adj+",
    "Adj+ oPrd": "oAdj+",
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
    /** Def really only useful as a library of the tiny subset of purely defensive fields)
     * (it's a caller bug if a call has this undefined when rowMode == "Mixed")
     */
    mixedMode?: "Off" | "Def",
  ): Record<string, GenericTableColProps> => {
    const expandedView = rowMode == "Dual";
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
        expandedView ? "Box Rtg" : "Box oRtg",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " rating in selected lineups (box-score derived)",
        CommonTableDefs.picker(...CbbColors.pp100, rowMode, mixedMode),
      ),
      usage: GenericTableOps.addDataCol(
        expandedView ? <div>Usg{lineSep} Pos</div> : "Usg",
        expandedView
          ? "% of team possessions used in selected lineups, plus the position category for this player"
          : "% of team possessions used in selected lineups",
        CommonTableDefs.offOnlyPicker(...CbbColors.usg, rowMode, mixedMode),
        GenericTableOps.percentOrHtmlFormatter,
      ), //TODO needs to be steeper
      adj_rtg: GenericTableOps.addPtsCol(
        expandedView ? "Adj+ Rtg" : "Adj+ oRtg",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " rating vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CommonTableDefs.picker(
          ...CbbColors.diff10_p100_redGreen,
          rowMode,
          mixedMode,
        ),
      ),
      adj_prod: GenericTableOps.addPtsCol(
        expandedView ? "Adj+ Prod" : "Adj+ oPrd",
        (expandedView ? "Offensive/Defensive" : "Offensive") +
          " production (ratings * mins%) vs average in selected lineups adjusted for SoS and (for ORtg) the player's usage",
        CommonTableDefs.picker(
          ...CbbColors.diff10_p100_redGreen,
          rowMode,
          mixedMode,
        ),
      ),

      // 2 of these 4 are always omitted by individualTableBuilder, the other 2 we just make empty-ish so that auto-gen of table sort works
      adj_rapm_margin: expandedView
        ? { colName: undefined }
        : GenericTableOps.addDataCol(
            "RAPM net",
            "Adjusted Plus-Minus vs D1 average (Off-Def margin)",
            CommonTableDefs.picker(
              ...CbbColors.diff10_p100_redGreen,
              rowMode,
              mixedMode,
            ),
            GenericTableOps.pointsOrHtmlFormatter,
          ),
      adj_rapm_prod_margin: expandedView
        ? { colName: undefined }
        : GenericTableOps.addDataCol(
            "RAPM Prod",
            "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average (Off-Def margin)",
            CommonTableDefs.picker(
              ...CbbColors.diff10_p100_redGreen,
              rowMode,
              mixedMode,
            ),
            GenericTableOps.pointsOrHtmlFormatter,
          ),
      adj_rapm: expandedView
        ? GenericTableOps.addDataCol(
            "RAPM",
            "Adjusted Plus-Minus vs D1 average",
            CommonTableDefs.picker(
              ...CbbColors.diff10_p100_redGreen,
              rowMode,
              mixedMode,
            ),
            GenericTableOps.pointsOrHtmlFormatter,
          )
        : { colName: undefined },
      adj_rapm_prod: expandedView
        ? GenericTableOps.addDataCol(
            "RAPM Prod",
            "Adjusted Plus-Minus production (pts/100 * mins%) vs D1 average",
            CommonTableDefs.picker(
              ...CbbColors.diff10_p100_redGreen,
              rowMode,
              mixedMode,
            ),
            GenericTableOps.pointsOrHtmlFormatter,
          )
        : { colName: undefined },

      sep1: GenericTableOps.addColSeparator(),
      efg: GenericTableOps.addDataCol(
        "eFG%",
        "Effective field goal% (3 pointers count 1.5x as much) in selected lineups",
        CommonTableDefs.offOnlyPicker(...CbbColors.eFG, rowMode, mixedMode),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      assist: GenericTableOps.addDataCol(
        "A%",
        "Assist % for player in selected lineups",
        CommonTableDefs.offOnlyPicker(...CbbColors.p_ast, rowMode, mixedMode),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      to: GenericTableOps.addPctCol(
        expandedView ? <div>TO%{lineSep} Stl%</div> : "TO%",
        expandedView
          ? "Turnover % / Steal % in selected lineups"
          : "Turnover % in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_tOver, rowMode, mixedMode),
      ),
      orb: expandedView
        ? GenericTableOps.addPctCol(
            "RB%",
            "Offensive/Defensive rebounding % in selected lineups",
            CommonTableDefs.picker(...CbbColors.p_oReb, rowMode, mixedMode),
          )
        : GenericTableOps.addPctCol(
            "OR%",
            "Offensive rebounding % in selected lineups",
            CommonTableDefs.picker(...CbbColors.p_oReb, rowMode, mixedMode),
          ),
      drb: GenericTableOps.addPctCol(
        "DR%",
        "Defensive rebounding % in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_dReb, rowMode, mixedMode),
      ),
      ftr: GenericTableOps.addPctCol(
        expandedView ? <div>FTR{lineSep} F/50</div> : "FTR",
        expandedView
          ? "Free throw rate (off) and Fouls called/50 possessions (def) in selected lineups"
          : "Free throw rate in selected lineups",
        CommonTableDefs.picker(...CbbColors.p_ftr, rowMode, mixedMode),
      ),
      sep_off_ast: expandedView
        ? GenericTableOps.addSpecialColSeparator("__off_ast__")
        : GenericTableOps.addColSeparator(),
      "3pr": GenericTableOps.addDataCol(
        "3PR",
        `Percentage of 3 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CommonTableDefs.offOnlyPicker(...CbbColors.fgr, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      "2pmidr": GenericTableOps.addDataCol(
        "2PR mid",
        `Percentage of mid range 2 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CommonTableDefs.offOnlyPicker(...CbbColors.fgr, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      "2primr": GenericTableOps.addDataCol(
        "2PR rim",
        `Percentage of layup/dunk/etc 2 pointers taken against all field goals${
          expandedView ? " (assisted% below)" : ""
        }`,
        CommonTableDefs.offOnlyPicker(...CbbColors.fgr, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.fgr_offDef),
      ),
      sep3: GenericTableOps.addSpecialColSeparator("__ft__"),
      "3p": GenericTableOps.addDataCol(
        expandedView ? <div>3P%{lineSep} FT%</div> : "3P%",
        expandedView
          ? "3 point field goal percentage / FT% in lower row"
          : "3 point field goal percentage",
        CommonTableDefs.offOnlyPicker(...CbbColors.fg3P, rowMode, mixedMode),
        GenericTableOps.dualRowPercentFormatter(CbbColors.off_FT),
      ),
      "2p": GenericTableOps.addPctCol(
        "2P%",
        "2 point field goal percentage",
        CommonTableDefs.picker(...CbbColors.fg2P, rowMode, mixedMode),
      ),
      "2pmid": GenericTableOps.addPctCol(
        "2P% mid",
        "2 point field goal percentage (mid range)",
        CommonTableDefs.picker(...CbbColors.fg2P_mid, rowMode, mixedMode),
      ),
      "2prim": GenericTableOps.addPctCol(
        expandedView ? <div>Rim%{lineSep} Blk%</div> : "2P% rim",
        expandedView
          ? "2 point field goal percentage (off) and Block% (def)"
          : "2 point field goal percentage (layup/dunk/etc)",
        CommonTableDefs.picker(...CbbColors.p_fg2P_rim, rowMode, mixedMode),
      ),
      sep4: GenericTableOps.addColSeparator(),
      adj_opp: GenericTableOps.addPtsCol(
        "SoS",
        "Weighted average of the offensive or defensive efficiencies of the player's opponents",
        GenericTableOps.defaultColorPicker,
      ),
    } as Record<string, GenericTableColProps>;
    return CommonTableDefs.buildMixedColSet(cols, rowMode, mixedMode);
  };

  /** Specific fields required for an instance of a roster stats table */
  static readonly individualTableBuilder = (
    scaleType: "P%" | "T%",
    possAsPct: boolean,
    includeRapm: boolean,
    rowMode: OffDefDualMixed,
  ): Record<string, GenericTableColProps> => {
    const expandedView = rowMode == "Dual";
    const factorMins = scaleType == "T%"; //TODO: handle /G
    return _.omit(
      IndivTableDefs.mainIndivTableFields(
        rowMode,
        rowMode == "Mixed" ? "Off" : undefined,
      ),
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
      ]).map((k) => (rowMode == "Mixed" ? `off_${k}` : k)),
    ) as Record<string, GenericTableColProps>;
  };

  //////////////////////////////////////////////////////

  /** Single row player leaderboard table with On/Off styling - TODO not currently in use, an experiment for very long columns */
  static readonly singleRowPlayerLeaderboardOnOffStyle = (
    factorMins: boolean,
    useRapm: boolean,
    gender: string,
    year: string,
    isT100: boolean,
    isConfOnly: boolean,
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
        },
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
          },
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
                posBreakdown,
              )}
            >
              <small>
                <span style={{ whiteSpace: "nowrap" }}>{posString}</span>
              </small>
            </OverlayTrigger>
          );
        },
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
          CbbColors.diff10_p100_redGreen[0],
        ),
        GenericTableOps.pointsOrHtmlFormatter,
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
        GenericTableOps.pointsOrHtmlFormatter,
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
        GenericTableOps.pointsOrHtmlFormatter,
      ),
      sep0_6: GenericTableOps.addColSeparator(),
      // Shooting percentage columns - Higher is better -> Red, Green (use index [1] then [0])
      off_efg: GenericTableOps.addDataCol(
        "eFG%",
        "Effective field goal% (3 pointers count 1.5x as much)",
        CbbColors.picker(CbbColors.eFG[1], CbbColors.eFG[0]),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      off_2p: GenericTableOps.addPctCol(
        "2P%",
        "2 point field goal percentage",
        CbbColors.picker(CbbColors.fg2P[1], CbbColors.fg2P[0]),
      ),
      off_3p: GenericTableOps.addPctCol(
        "3P%",
        "3 point field goal percentage",
        CbbColors.picker(CbbColors.fg3P[1], CbbColors.fg3P[0]),
      ),
      off_2pmid: GenericTableOps.addPctCol(
        "Mid%",
        "2 point field goal percentage (mid range)",
        CbbColors.picker(CbbColors.fg2P_mid[1], CbbColors.fg2P_mid[0]),
      ),
      off_2prim: GenericTableOps.addPctCol(
        "Rim%",
        "2 point field goal percentage (layup/dunk/etc)",
        CbbColors.picker(CbbColors.fg2P_rim[1], CbbColors.fg2P_rim[0]),
      ),
      sep2: GenericTableOps.addColSeparator(),
      // Shooting rates columns - Neutral/Frequency -> Blue, Orange (use index [0] then [1] or custom)
      off_3pr: GenericTableOps.addDataCol(
        "3PR",
        "Percentage of 3 pointers taken against all field goals",
        CbbColors.picker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      off_2pmidr: GenericTableOps.addDataCol(
        "MidR",
        "Percentage of mid range 2 pointers taken against all field goals",
        CbbColors.picker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      off_2primr: GenericTableOps.addDataCol(
        "RimR",
        "Percentage of layup/dunk/etc 2 pointers taken against all field goals",
        CbbColors.picker(...CbbColors.fgr),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      off_ftr: GenericTableOps.addPctCol(
        "FTR",
        "Free Throw Rate (FTA/FGA)",
        CbbColors.picker(...CbbColors.fgr),
      ),
      sep3: GenericTableOps.addColSeparator(),
      // Other stats columns
      off_usage: GenericTableOps.addDataCol(
        "Usg",
        "% of team possessions used in selected lineups",
        CbbColors.picker(...CbbColors.usg),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      off_assist: GenericTableOps.addDataCol(
        "A%",
        "Assist % for player in selected lineups",
        CbbColors.picker(...CbbColors.p_ast),
        GenericTableOps.percentOrHtmlFormatter,
      ),
      off_to: GenericTableOps.addPctCol(
        "TO%",
        "Turnover % in selected lineups",
        CbbColors.picker(CbbColors.p_tOver[1], CbbColors.p_tOver[0]),
      ),
      // Rebounding columns - Higher is better -> Red, Green
      off_orb: GenericTableOps.addPctCol(
        "OR%",
        "Offensive rebounding % in selected lineups",
        CbbColors.picker(CbbColors.p_oReb[1], CbbColors.p_oReb[0]),
      ),
      def_orb: GenericTableOps.addPctCol(
        "DR%",
        "Defensive rebounding % in selected lineups",
        CbbColors.picker(CbbColors.p_dReb[1], CbbColors.p_dReb[0]),
      ),
      def_stl: GenericTableOps.addPctCol(
        "Stl%",
        "Steal % in selected lineups",
        CbbColors.picker(CbbColors.p_def_TO, CbbColors.p_def_TO),
      ),
      def_blk: GenericTableOps.addPctCol(
        "Blk%",
        "Block % in selected lineups",
        CbbColors.picker(CbbColors.p_def_2P_rim, CbbColors.p_def_2P_rim),
      ),
      // Added Poss%
      team_poss_pct: GenericTableOps.addPctCol(
        "Poss%",
        "% of team possessions player was on the floor for",
        GenericTableOps.defaultColorPicker,
      ),
    } as Record<string, GenericTableColProps>;
  };

  //////////////////////////////////////////////////////

  // Table Defs: On/Off Table (Mixed/Dual/On/Off format for presets)

  static readonly onOffReport = (
    rowMode: OffDefDualMixed,
    /** (it's a caller bug if a call has this undefined when rowMode == "Mixed") */
    mixedMode?: "Off" | "Def",
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

  /** The classic "dual-row" view */
  static readonly detailedViewName = "Detailed";

  /** Dev preset: impact decomposition columns keyed as `*_netpts_*` (see ImpactTableDefs). */
  static readonly netPtsImpactPresetName = "NetPtsImpact";

  static isNetPtsImpactTableSelected(
    tablePreset: string | undefined,
    tableConfigExtraCols?: string[],
  ): boolean {
    return (
      tablePreset === IndivTableDefs.netPtsImpactPresetName ||
      Boolean(
        _.find(tableConfigExtraCols || [], (k) =>
          _.startsWith(k, `${IndivTableDefs.netPtsImpactPresetName}.`),
        ),
      )
    );
  }

  static readonly indivExtraColSet = _.memoize(
    (
      scaleType: "P%" | "T%",
      possAsPct: boolean,
      includeRapm: boolean,
      devMode: boolean = false,
    ): Record<string, ExtraColSet & { rowMode: OffDefDualMixed }> => {
      return {
        Default: {
          isPreset: false, //(because it's default)
          rowMode: "Mixed", //(We treat both off/def fields as off for legacy reasons)
          name: "Default",
          description: "Single-row view of key offensive and defensive stats",
          colSet: IndivTableDefs.individualTableBuilder(
            scaleType,
            possAsPct,
            includeRapm,
            "Mixed", //(we force it to be Mixed/Off)
          ),
        },
        /** Contains the def_xxx fields used in dual row for extra (mostly offensive) fields */
        Extra: {
          isPreset: false,
          isLibrary: true,
          rowMode: "Mixed",
          name: "Extra",
          description: "Additional stats for the single-row player table",
          colSet: {
            //TODO: add off/def adj rapm + rapm + prod
            //TODO: need to fix consistency of prod/per-game
            def_to: GenericTableOps.addPctCol(
              "Stl%",
              "Steal%",
              CommonTableDefs.picker(
                CbbColors.applyThemedBackground,
                CbbColors.p_tOver[1],
                "Mixed",
                "Def",
              ),
            ),
            def_2prim: GenericTableOps.addPctCol(
              "Blk%",
              "Block%",
              CommonTableDefs.picker(
                CbbColors.applyThemedBackground,
                CbbColors.p_fg2P_rim[1],
                "Mixed",
                "Def",
              ),
            ),
            off_ft: GenericTableOps.addDataCol(
              "FT%",
              "Free Throw%",
              CbbColors.applyThemedBackground,
              GenericTableOps.shadowPercentFormatter(CbbColors.off_FT),
            ),
            off_3p_ast: GenericTableOps.addDataCol(
              "3PA%",
              "The % of 3P makes that were assisted",
              CbbColors.applyThemedBackground,
              GenericTableOps.shadowPercentFormatter(CbbColors.fgr_offDef),
            ),
            off_2pmid_ast: GenericTableOps.addDataCol(
              "MidA%",
              "The % of mid-range 2P makes that were assisted",
              CbbColors.applyThemedBackground,
              GenericTableOps.shadowPercentFormatter(CbbColors.fgr_offDef),
            ),
            off_2prim_ast: GenericTableOps.addDataCol(
              "RimA%",
              "The % of 2P at the rim makes that were assisted",
              CbbColors.applyThemedBackground,
              GenericTableOps.shadowPercentFormatter(CbbColors.fgr_offDef),
            ),
          },
        },
        [IndivTableDefs.detailedViewName]: {
          isPreset: true,
          rowMode: "Dual",
          name: "Detailed",
          description:
            "Dual-row view of important offensive and defensive stats",
          colSet: IndivTableDefs.individualTableBuilder(
            scaleType,
            possAsPct,
            includeRapm,
            "Dual",
          ),
        },
        ...(devMode
          ? {
              [IndivTableDefs.netPtsImpactPresetName]: {
                isPreset: true,
                rowMode: "Mixed" as const,
                name: "Net Points",
                description:
                  "Decomposition of a player's impact into various categories (Net Points)",
                colSet: {
                  ...ImpactTableDefs.buildIndivNetPtsImpactColSet(possAsPct),
                  ...(possAsPct
                    ? {}
                    : {
                        off_team_poss: GenericTableOps.addDataCol(
                          "Poss",
                          "Total number of team possessions for selected lineups",
                          GenericTableOps.defaultColorPicker,
                          GenericTableOps.offHighlightFormatter(
                            GenericTableOps.intFormatter,
                          ),
                        ),
                      }),
                },
              },
            }
          : {}),
      };
    },
    (scaleType, possAsPct, includeRapm, devMode) =>
      `${scaleType}_${possAsPct}_${includeRapm}_${devMode ?? false}`,
  );
}
