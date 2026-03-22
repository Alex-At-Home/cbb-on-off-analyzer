// Component imports
import {
  GenericTableOps,
  GenericTableColProps,
  ExtraColSet,
} from "../../components/GenericTable";

// Util imports
import { CbbColors } from "../CbbColors";
import type { CompressedNetPoints } from "../stats/RatingUtils";

// Lodash:
import _ from "lodash";
import { CommonTableDefs, OffDefDualMixed } from "./CommonTableDefs";
import { TableSortPopupMenuState } from "../../components/shared/TableSortPopupMenu";

/** Holds all the different column definitions for the similar tables used throughout this SPA */
export class ImpactTableDefs {
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
      (val: any) =>
        val?.value == null || val?.value === ""
          ? ""
          : GenericTableOps.percentFormatter(val),
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
      "Defensive Impact (-dRAPM, pts above average)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep2: GenericTableOps.addSpecialColSeparator("__off__"),
    off_net_3p: GenericTableOps.addDataCol(
      "3P",
      "3P Net Points",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_net_mid: GenericTableOps.addDataCol(
      "2P Mid",
      "Mid Range Net Points",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    off_net_rim: GenericTableOps.addDataCol(
      "2P Rim",
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
    def_net_team: GenericTableOps.addDataCol(
      "Team",
      "Defensive net points from team defense: shared contribution via stops and non-stl turnovers",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    def_net_stks: GenericTableOps.addDataCol(
      "Stks",
      "Defensive net points from steals + blocks (mouseover to see steal/block breakdown)",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    def_net_drb: GenericTableOps.addDataCol(
      "DRB",
      "Defensive net points from defensive rebounds",
      CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen),
      GenericTableOps.pointsOrHtmlFormatter,
    ),
    sep6: GenericTableOps.addColSeparator(),
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

  /** Match `team_*`, `off_*`, `def_*`, `diff_*` data keys; return `prefix_netpts_rest` or undefined for title/seps. */
  static renameImpactDecompKeyToNetPtsCol(key: string): string | undefined {
    if (key == "title") return "off_title";
    else {
      const m = /^(team|off|def|diff)_(.+)$/.exec(key);
      return m ? `${m[1]}_netpts_${m[2]}` : undefined;
    }
  }

  /** Column set for Player Career dev preset: same as impactDecompTable but keys renamed to `*_netpts_*`. */
  static buildIndivNetPtsImpactColSet(): typeof ImpactTableDefs.impactDecompTable {
    const src = ImpactTableDefs.impactDecompTable;
    return _.mapKeys(
      src,
      (_v, k) => ImpactTableDefs.renameImpactDecompKeyToNetPtsCol(k) ?? k,
    ) as typeof ImpactTableDefs.impactDecompTable;
  }

  /**
   * Flattens CompressedNetPoints onto row keys matching buildIndivNetPtsImpactColSet.
   * Semantics align with ImpactBreakdownUtils.buildOnePlayerGameRow.
   */
  static applyCompressedNetPtsToPlayerRow(
    player: Record<string, any>,
    netPts: CompressedNetPoints | undefined | null,
  ): void {
    if (!netPts) return;

    const v = (n: number) => ({ value: n });

    if (player.off_team_poss_pct != null) {
      player.team_netpts_poss_pct = player.off_team_poss_pct;
    }

    const { o, d, oSos, dSos } = netPts;
    player.diff_netpts_adj_rapm = v(o + d);
    player.diff_netpts_adj_rtg = v(o + d - netPts.oWowy - netPts.dWowy);
    player.diff_netpts_unadj_rapm = v(o + d - oSos - dSos);
    player.off_netpts_adj_rapm = v(o);
    player.def_netpts_adj_rapm = v(d);
    player.off_netpts_adj_rtg = v(o - netPts.oWowy);
    player.def_netpts_adj_rtg = v(d - netPts.dWowy);
    player.off_netpts_unadj_rapm = v(o - oSos);
    player.def_netpts_unadj_rapm = v(d - dSos);

    player.off_netpts_net_3p = v(netPts.o3P);
    player.off_netpts_net_mid = v(netPts.oMid);
    player.off_netpts_net_rim = v(netPts.oRim);
    player.off_netpts_net_ft = v(netPts.oFt);
    player.off_netpts_net_to = v(netPts.oTo);
    player.off_netpts_net_orb = v(netPts.oOrb);
    /** Combined AST — extraInfo matches ImpactBreakdownUtils.buildOnePlayerGameRow */
    player.off_netpts_net_ast = {
      value: netPts.oAst2 + netPts.oAst3,
      extraInfo: `2P Assists: [${netPts.oAst2.toFixed(2)}]pts, 3P Assists: [${netPts.oAst3.toFixed(2)}]pts`,
    };
    player.off_netpts_sos_bonus = v(netPts.oSos);
    /** WOWY + volume — extraInfo matches ImpactBreakdownUtils.buildOnePlayerGameRow */
    player.off_netpts_gravity_bonus = {
      value: netPts.oVolume + netPts.oWowy,
      extraInfo: `RAPM/WOWY bonus: [${netPts.oWowy.toFixed(2)}]pts, Shot volume bonus: [${netPts.oVolume.toFixed(2)}]pts`,
    };

    player.def_netpts_net_team = v(netPts.dTeam);
    /** Stl + Blk — extraInfo matches ImpactBreakdownUtils.buildOnePlayerGameRow */
    player.def_netpts_net_stks = {
      value: netPts.dStl + netPts.dBlk,
      extraInfo: `Stl: [${netPts.dStl.toFixed(2)}]pts, Blk: [${netPts.dBlk.toFixed(2)}]pts`,
    };
    player.def_netpts_net_drb = v(netPts.dReb);
    player.def_netpts_sos_bonus = v(netPts.dSos);
    player.def_netpts_gravity_bonus = v(netPts.dWowy);
  }

  /** Short header labels for repeating sub-header rows (ideally ≤4 chars). Keys match colName string or getNodeText(colName) for JSX. */
  static repeatingLineupHeaderFields: Record<string, string> = {
    "Poss%": "P%",
    Net: "Net",
    "Off. Net": "Off",
    "Def. Net": "Def",
    "3P": "3P",
    "2P Mid": "Mid",
    "2P Rim": "Rim",
    FT: "FT",
    AST: "AST",
    TO: "TO",
    ORB: "ORB",
    "Off. SoSΔ": "OΔ",
    "Off. GΔ": "OG",
    Team: "Team",
    Stks: "Stks",
    DRB: "DRB",
    "Def. SoSΔ": "DΔ",
    "Def. GΔ": "DG",
  };

  /** Sort options for impact breakdown table (data columns only, asc/desc each) */
  static readonly impactDecompSortOptions = ((): {
    label: string;
    value: string;
  }[] => {
    const table = ImpactTableDefs.impactDecompTable;
    const skipKeys = ["title", "sep1", "sep2", "sep3", "sep4", "sep5", "sep6"];
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
