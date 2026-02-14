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
import { CommonTableDefs, OffDefDualMixed } from "./CommonTableDefs";
import { TableSortPopupMenuState } from "../../components/shared/TableSortPopupMenu";

/** Holds all the different column definitions for the similar tables used throughout this SPA */
export class IndivTableDefs {
  ////////////////////////////////////////////
  // Sort utils
  ////////////////////////////////////////////
  // Table Defs:

  static readonly impactDecompTable = {
    title: GenericTableOps.addTitle(
      "",
      "",
      GenericTableOps.defaultRowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter,
    ),
    team_poss_pct: GenericTableOps.addDataCol(
      "Poss%",
      "% of team possessions in selected lineups that player was on the floor",
      GenericTableOps.defaultColorPicker,
      GenericTableOps.percentFormatter,
    ),
    diff_adj_rapm: GenericTableOps.addDataCol(
      "Net",
      "Impact Margin (oRAPM - dRAPM, pts above average)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep1: GenericTableOps.addColSeparator(),
    off_adj_rapm: GenericTableOps.addDataCol(
      "Off. Net",
      "Offensive Impact (oRAPM, pts above average)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    def_adj_rapm: GenericTableOps.addDataCol(
      "Def. Net",
      "Defensive Impact (dRAPM, pts above average)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep2: GenericTableOps.addColSeparator(),
    off_sos_bonus: GenericTableOps.addDataCol(
      <span>SoS&Delta;</span>,
      "Offensive Strength-Of-Schedule Bonus",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_rapm_bonus: GenericTableOps.addDataCol(
      <span>WOWY &Delta;</span>,
      "Offensive With-Or-Without-You bonus: did the team perform better when player was on court, taking into account their team-mates (RAPM)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    usg_bonus: GenericTableOps.addDataCol(
      <span>Vol &Delta;</span>,
      "Volume Adjustment - was the players volume a benefit (good volume/efficiency) or a detriment (low volume or low efficiency)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep3: GenericTableOps.addColSeparator(),
    off_net_3p: GenericTableOps.addDataCol(
      "3P%",
      "3P% Net Points",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_net_mid: GenericTableOps.addDataCol(
      "2P% Mid",
      "Mid Range Net Points",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_net_rim: GenericTableOps.addDataCol(
      "2P% Rim",
      "Rim Net Points",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_net_ft: GenericTableOps.addDataCol(
      "FT",
      "Net Points from FTs",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep4: GenericTableOps.addColSeparator(),
    off_net_ast: GenericTableOps.addDataCol(
      "AST",
      "Net Points from assists",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_net_to: GenericTableOps.addDataCol(
      "TO",
      "Net Points from turnovers",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_net_orb: GenericTableOps.addDataCol(
      "ORB",
      "Net Points from offensive rebounds",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep5: GenericTableOps.addColSeparator(),
    def_sos_bonus: GenericTableOps.addDataCol(
      <span>SoS&Delta;</span>,
      "Defensive Strength-Of-Schedule Bonus",
      CbbColors.varPicker(CbbColors.def_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    def_rapm_bonus: GenericTableOps.addDataCol(
      <span>WOWY &Delta;</span>,
      "Defensive With-Or-Without-You bonus: did the team perform better when player was on court, taking into account their team-mates (RAPM)",
      CbbColors.varPicker(CbbColors.def_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
  };
}
