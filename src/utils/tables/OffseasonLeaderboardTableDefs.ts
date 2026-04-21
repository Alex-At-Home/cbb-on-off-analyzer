// Lodash:
import _ from "lodash";

// Component imports
import {
  GenericTableOps,
  GenericTableColProps,
} from "../../components/GenericTable";

// Util imports
import { CbbColors } from "../CbbColors";
import { CommonTableDefs } from "./CommonTableDefs";

/**
 * Column definitions, sort metadata, and helpers for offseason leaderboard tables.
 *
 * Sorting is **descending only** (larger / “better” metric first): `buildAllTeamStats`
 * uses negated iteratees with lodash `sortBy` ascending order.
 *
 * Header clicks map each column to one canonical `sortBy` key (same behavior for every
 * sortable column: one click applies that descending sort).
 */
export class OffseasonLeaderboardTableDefs {
  /** Dropdown options (each corresponds to a descending sort in OffseasonLeaderboardUtils). */
  static readonly SORT_BY_OPTIONS: { label: string; value: string }[] = [
    { label: "Net Rating", value: "net" },
    { label: "Total offseason net", value: "offseason_net" },
    { label: "Total in - out", value: "total_io" },
    { label: "Transfer in - out", value: "txfer_io" },
    { label: "Transfers in", value: "txfer_in" },
    { label: "Transfers out", value: "txfer_out" },
    { label: "Staying Production", value: "stay_production" },
    { label: "Freshmen in", value: "fr_net" },
    { label: "Returning improvement", value: "dev_in" },
    { label: "Declared", value: "nba_out" },
    { label: "Aged out", value: "sr_out" },
  ];

  /**
   * Maps `sortBy` URL/dropdown value → GenericTable row field key for bold highlighting.
   * Composite sorts may omit a column (`undefined`).
   */
  static readonly sortByToTableField: Record<string, string | undefined> = {
    net: "net",
    offseason_net: undefined,
    total_io: "inout_margin",
    txfer_io: "inout_margin",
    txfer_in: "in_margin",
    txfer_out: "out_margin",
    stay_production: "stay_margin",
    dev_in: "dev_margin",
    nba_out: "nba_margin",
    sr_out: "sr_margin",
  };

  /**
   * Canonical descending sort applied when the user clicks that column header (one sort per column).
   */
  static readonly tableHeaderKeyToSortBy: Record<string, string> = {
    net: "net",
    net_grade: "net",
    dev_margin: "dev_in",
    inout_margin: "total_io",
    in_margin: "txfer_in",
    stay_margin: "stay_production",
    out_margin: "txfer_out",
    fr_margin: "fr_net",
    nba_margin: "nba_out",
    sr_margin: "sr_out",
  };

  /** Builds the table definition for the off-season leaderboard */
  static offseasonLeaderboardTable(
    evalMode: boolean,
    transferInOutMode: boolean,
  ): Record<string, GenericTableColProps> {
    return _.omit(
      {
        title: GenericTableOps.addTitle(
          "",
          "",
          CommonTableDefs.rowSpanCalculator,
          "small",
          GenericTableOps.htmlFormatter,
          10,
        ),
        conf: GenericTableOps.addDataCol(
          "Conf",
          "The team's conference",
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter,
        ),
        sep0: GenericTableOps.addColSeparator(),

        net: GenericTableOps.addPtsCol(
          "Net",
          "Net Adjusted Pts/100 above an average D1 team, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.off_diff35_p100_redGreen),
        ),
        net_grade: GenericTableOps.addDataCol(
          "Rank",
          "Net Adjusted Pts/100 ranking, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter,
        ),
        actual_grade: GenericTableOps.addDataCol(
          "Act.",
          "Ranking based on the team's actual Net Adjusted Pts/100 above an average D1 team",
          CbbColors.varPicker(CbbColors.net_guess),
          GenericTableOps.gradeOrHtmlFormatter,
        ),

        // Txfer in/out
        sepInOut1: GenericTableOps.addColSeparator(),
        dev_margin: GenericTableOps.addDataCol(
          "Dev",
          "For efficiency margin, expected increase in production from returning players",
          CbbColors.picker(...CbbColors.diff10_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter,
        ),
        inout_margin: GenericTableOps.addDataCol(
          "I-O",
          "For efficiency margin, in-from-transfers minus out-from-transfers/NBA/Sr (using projected production for 'in')",
          CbbColors.picker(...CbbColors.diff35_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter,
        ),
        "sepInOut1.5": GenericTableOps.addColSeparator(0.25),
        in_margin: GenericTableOps.addDataCol(
          "TxIn",
          "For efficiency margin, projected production from incoming transfers",
          CbbColors.picker(...CbbColors.diff10_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter,
        ),
        stay_margin: GenericTableOps.addDataCol(
          "Stay",
          "How much production from last year is staying for the next season",
          CbbColors.picker(...CbbColors.diff35_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter,
        ),
        out_margin: GenericTableOps.addDataCol(
          "TxOut",
          "For efficiency margin, lost production from last season due to transfers",
          CbbColors.picker(...CbbColors.diff10_p100_redGreen),
          GenericTableOps.pointsOrHtmlFormatter,
        ),
        "sepInOut1.6": GenericTableOps.addColSeparator(0.25),
        fr_margin: GenericTableOps.addDataCol(
          "FrIn",
          "For efficiency margin, projected production from Freshmen",
          CbbColors.picker(...CbbColors.diff10_p100_greenRed),
          GenericTableOps.pointsOrHtmlFormatter,
        ),
        nba_margin: GenericTableOps.addDataCol(
          "NBA",
          "For efficiency margin, lost production from last season due to early NBA (or other pro) departures",
          CbbColors.picker(...CbbColors.diff10_p100_redGreen),
          GenericTableOps.pointsOrHtmlFormatter,
        ),
        sr_margin: GenericTableOps.addDataCol(
          "SrOut",
          "For efficiency margin, lost production from last season due to graduation",
          CbbColors.picker(...CbbColors.diff35_p100_redGreen),
          GenericTableOps.pointsOrHtmlFormatter,
        ),

        sep1: GenericTableOps.addColSeparator(),

        off: GenericTableOps.addPtsCol(
          "Off",
          "Offensive Adjusted Pts/100 above an average D1 team, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.off_pp100),
        ),
        off_grade: GenericTableOps.addDataCol(
          "Rank",
          "Offensive Adjusted Pts/100 ranking, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter,
        ),

        sep2: GenericTableOps.addColSeparator(),

        def: GenericTableOps.addPtsCol(
          "Def",
          "Defensive Adjusted Pts/100 above an average D1 team, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.def_pp100),
        ),
        def_grade: GenericTableOps.addDataCol(
          "Rank",
          "Defensive Adjusted Pts/100 ranking, for 'Balanced' projections",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter,
        ),

        sep3: GenericTableOps.addColSeparator(),

        high_grade: GenericTableOps.addDataCol(
          "Good",
          "Optimistic net ranking",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter,
        ),
        low_grade: GenericTableOps.addDataCol(
          "Bad",
          "Pessimistic net ranking",
          CbbColors.varPicker(CbbColors.high_pctile_qual),
          GenericTableOps.gradeOrHtmlFormatter,
        ),

        sep4: GenericTableOps.addColSeparator(),

        roster: GenericTableOps.addDataCol(
          "Roster",
          "Projected of (high major) Superstars / Stars / Starters / Rotation players on the team",
          CbbColors.applyThemedBackground,
          GenericTableOps.htmlFormatter,
        ),

        sep5: GenericTableOps.addColSeparator(),

        edit: GenericTableOps.addDataCol(
          "",
          "Edit the team projections",
          CbbColors.applyThemedBackground,
          GenericTableOps.htmlFormatter,
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
                "stay_margin",
                "out_margin",
                "nba_margin",
                "fr_margin",
                "sr_margin",
              ],
        ),
    ) as Record<string, GenericTableColProps>;
  }

  /** Tournament-path columns (national rank goals / upside swings). */
  static offseasonLeaderboardCategoryPathTable(
    evalMode: boolean,
  ): Record<string, GenericTableColProps> {
    return _.omit(
      {
        title: GenericTableOps.addTitle(
          "",
          "",
          CommonTableDefs.rowSpanCalculator,
          "small",
          GenericTableOps.htmlFormatter,
          8,
        ),
        conf: GenericTableOps.addDataCol(
          "Conf",
          "The team's conference",
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter,
        ),
        sepCat0: GenericTableOps.addColSeparator(0.25),
        path_goal: new GenericTableColProps(
          "Goal",
          "The goal this team can realistically be chasing",
          3,
          false,
          GenericTableOps.htmlFormatter,
          CbbColors.applyThemedBackground,
          GenericTableOps.defaultRowSpanCalculator,
          undefined,
          "",
        ),
        path_else: new GenericTableColProps(
          "Else",
          "If the team misses their goal, but no bad luck, this is a likely outcome (FF=Final Four, T25=Top 25, S6-9=1-digit seed, Bub=Bubble, >T60=outside top 60).",
          2,
          false,
          GenericTableOps.htmlFormatter,
          CbbColors.applyThemedBackground,
          GenericTableOps.defaultRowSpanCalculator,
          undefined,
          "",
        ),
        path_whats_needed: new GenericTableColProps(
          "What's needed for goal",
          "Player-level upside vs ok projection needed to reach the Goal tier net threshold (when not already there).",
          18,
          false,
          GenericTableOps.htmlFormatter,
          CbbColors.applyThemedBackground,
          GenericTableOps.defaultRowSpanCalculator,
          undefined,
          "",
        ),
        path_pctle: new GenericTableColProps(
          "%ile",
          "Percentile within the goal grouping of teams",
          2,
          false,
          GenericTableOps.htmlFormatter,
          CbbColors.applyThemedBackground,
          GenericTableOps.defaultRowSpanCalculator,
          undefined,
          "",
        ),
        sepCat1: GenericTableOps.addColSeparator(0.25),
        actual_grade: GenericTableOps.addDataCol(
          "Act.",
          "Ranking based on the team's actual Net Adjusted Pts/100 above an average D1 team",
          CbbColors.varPicker(CbbColors.net_guess),
          GenericTableOps.gradeOrHtmlFormatter,
        ),
        sepCat2: GenericTableOps.addColSeparator(0.25),
        roster: GenericTableOps.addDataCol(
          "Roster",
          "Projected of (high major) Superstars / Stars / Starters / Rotation players on the team",
          CbbColors.applyThemedBackground,
          GenericTableOps.htmlFormatter,
        ),
        sepCat3: GenericTableOps.addColSeparator(),
        edit: GenericTableOps.addDataCol(
          "",
          "Edit the team projections",
          CbbColors.applyThemedBackground,
          GenericTableOps.htmlFormatter,
        ),
      },
      evalMode ? [] : ["actual_grade"],
    ) as Record<string, GenericTableColProps>;
  }
}
