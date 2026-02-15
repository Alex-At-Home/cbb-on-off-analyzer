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
    sep2: GenericTableOps.addSpecialColSeparator("__off__"),
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
    sep3: GenericTableOps.addColSeparator(),
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
    sep4: GenericTableOps.addColSeparator(),
    off_sos_bonus: GenericTableOps.addDataCol(
      <span>Off. SoS&Delta;</span>,
      "Offensive Strength-Of-Schedule Bonus",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_gravity_bonus: GenericTableOps.addDataCol(
      <span>Off. G&Delta;</span>,
      "Offensive With-Or-Without-You bonus: did the team perform better when player was on court, taking into account their team-mates (RAPM)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep5: GenericTableOps.addSpecialColSeparator("__def__"),
    def_sos_bonus: GenericTableOps.addDataCol(
      <span>Def. SoS&Delta;</span>,
      "Defensive Strength-Of-Schedule Bonus",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    def_gravity_bonus: GenericTableOps.addDataCol(
      <span>Def. G&Delta;</span>,
      "Defensive With-Or-Without-You bonus: did the team perform better when player was on court, taking into account their team-mates (RAPM)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
  };

  /** Sort options for impact breakdown table (data columns only, asc/desc each) */
  static readonly impactDecompSortOptions = ((): {
    label: string;
    value: string;
  }[] => {
    const table = IndivTableDefs.impactDecompTable;
    const skipKeys = ["title", "sep1", "sep2", "sep3", "sep4", "sep5"];
    return _.flatMap(
      _.entries(table).filter(
        ([k, col]) =>
          !skipKeys.some((s) => k === s || k.startsWith("sep")) &&
          (col as GenericTableColProps).widthUnits > 0,
      ),
      ([key, col]) => {
        const name =
          typeof (col as GenericTableColProps).colName === "string"
            ? (col as GenericTableColProps).colName
            : "Impact";
        return [
          { label: `${name} (Desc.)`, value: `desc:${key}` },
          { label: `${name} (Asc.)`, value: `asc:${key}` },
        ];
      },
    );
  })();

  static readonly defaultImpactDecompSortBy = "desc:team_poss_pct";

  static readonly impactDecompSortField = (
    sortBy: string,
    defaultSort: string,
  ): string | undefined => {
    if (!sortBy || sortBy === defaultSort) return undefined;
    const parts = sortBy.split(":");
    return parts[1];
  };

  static readonly buildImpactDecompSortCallback = (
    sortBy: string,
    sortOptions: { label: string; value: string }[],
    setSortMenuState: (s: TableSortPopupMenuState | undefined) => void,
  ) => {
    return (headerKey: string, ev: any) => {
      const matchingOptions = sortOptions.filter((opt) => {
        const field = opt.value.split(":")[1] || "";
        return field === headerKey;
      });
      if (matchingOptions.length > 0) {
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
