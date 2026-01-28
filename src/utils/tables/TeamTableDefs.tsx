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
export class TeamTableDefs {
  ////////////////////////////////////////////

  // Sort utils

  /** Builds the representation of a menu dropdown with all available sort options */
  static readonly sortBuilder = (
    rowMode: OffDefDualMixed,
    allowedFields: _.CollectionChain<[string, GenericTableColProps]>
  ): { label: string; value: string }[] => {
    return CommonTableDefs.sortBuilder(
      rowMode,
      (sortType: string, key: string) => {
        if (sortType == "diff" && key == "net") {
          //diff of adj/raw makes no sense
          return true;
        } else if (
          key.startsWith("net_") &&
          sortType != rowMode.toLowerCase()
        ) {
          //net_adj / net_raw
          return true;
        } else {
          return false;
        }
      },
      (k: string) => k,
      {},
      allowedFields
    );
  };

  /** Lineup-table specific translation from the sort field to the table display */
  static readonly sortField = (
    sortField: string,
    defaultSortConfig: string
  ) => {
    if (sortField == defaultSortConfig) {
      return undefined;
    } else {
      const sortFieldDecomp = sortField.split(":");
      if (sortFieldDecomp[1] == "diff_adj_ppp") {
        //(nicer visuals)
        return "off_net";
      } else if (sortFieldDecomp[1] == "diff_ppp") {
        //(nicer visuals)
        return "def_net";
      } else {
        return sortFieldDecomp[1];
      }
    }
  };

  /** Lineup-table specific handling of clicking on a column header to manage sorting */
  static readonly buildSortCallback = (
    rowMode: OffDefDualMixed,
    sortBy: string,
    sortOptions: { label: string; value: string }[],
    setSortMenuState: (newState: TableSortPopupMenuState) => void
  ) => {
    return CommonTableDefs.buildSortCallback(
      rowMode,
      (headerKeyIn: string) => {
        return headerKeyIn;
      },
      sortBy,
      sortOptions,
      setSortMenuState
    );
  };

  /** Fix sort names for non-off/def columns */
  static sortColNameOverrides = {
    off_net: (o: string) => `Adj Rtg (${o} / Net)`,
    def_net: (o: string) => `Raw Rtg (${o} / Net)`,
  } as Record<string, (o: string) => string | undefined>;

  ////////////////////////////////////////////

  // Table Defs:

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
      GenericTableOps.dualRowPointsFormatter(
        CbbColors.off_diff35_p100_redGreen,
        false
      )
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
}
