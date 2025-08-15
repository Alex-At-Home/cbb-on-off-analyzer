// React imports:
import React, { useState, useEffect, ReactNode } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";
import { IndivCareerInfo, IndivCareerStatSet } from "../utils/StatModels";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import {
  getCommonFilterParams,
  ParamDefaults,
  PlayerCareerParams,
} from "../utils/FilterModels";
import { useTheme } from "next-themes";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import { UserChartOpts } from "./diags/ShotChartDiagView";
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import GenericTable, { GenericTableOps } from "./GenericTable";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import { Container } from "react-bootstrap";

type Props = {
  playerSeasons: Array<IndivCareerStatSet>;
  playerCareerParams: PlayerCareerParams;
};

const PlayerCareerTable: React.FunctionComponent<Props> = ({
  playerSeasons,
  playerCareerParams,
}) => {
  // 1] Input state

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const { resolvedTheme } = useTheme();

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] State (some of these are phase 2+ and aren't plumbed in yet)

  const commonParams = getCommonFilterParams(playerCareerParams);
  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const teamSeasonLookup = `${commonParams.gender}_${commonParams.team}_${commonParams.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(playerCareerParams.showGrades) ? "" : playerCareerParams.showGrades
  );

  /** Shot chart config */
  const [showShotCharts, setShowShotCharts] = useState<boolean>(
    _.isNil(playerCareerParams.playerShotCharts)
      ? false
      : playerCareerParams.playerShotCharts
  );
  // Shot charts:
  const [shotChartConfig, setShotChartConfig] = useState<
    UserChartOpts | undefined
  >(
    _.isNil(playerCareerParams.playerShotChartsShowZones)
      ? undefined
      : { buildZones: playerCareerParams.playerShotChartsShowZones }
  );

  /** Splits out offensive and defensive metrics into separate rows */
  const [expandedView, setExpandedView] = useState(
    _.isNil(playerCareerParams.showExpanded)
      ? ParamDefaults.defaultPlayerShowExpanded
      : playerCareerParams.showExpanded
  );

  /** Show the number of possessions as a % of total team count */
  const [possAsPct, setPossAsPct] = useState(
    _.isNil(playerCareerParams.possAsPct)
      ? ParamDefaults.defaultPlayerPossAsPct
      : playerCareerParams.possAsPct
  );
  /** Show the number of possessions as a % of total team count */
  const [factorMins, setFactorMins] = useState(
    _.isNil(playerCareerParams.factorMins)
      ? ParamDefaults.defaultPlayerFactorMins
      : playerCareerParams.factorMins
  );

  /** Whether to show sub-header with extra info */
  const [showInfoSubHeader, setShowInfoSubHeader] = useState(
    playerCareerParams.showInfoSubHeader || false
  );

  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    true as boolean
  ); //(always defaults to on)

  /** Whether to make the quick toggle bar stick (default: on) */
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    _.isNil(playerCareerParams.stickyQuickToggle)
      ? true
      : playerCareerParams.stickyQuickToggle
  );

  // 2] Data Model

  const playerSeasonInfo = _.chain(playerSeasons)
    .transform((acc, v) => {
      const year = v.year;
      if (year) {
        const playerYear = acc[year] || {};
        const playerId: string = (v as any)._id;
        if (_.endsWith(playerId, "_all")) {
          playerYear.season = v;
        } else if (_.endsWith(playerId, "_conf")) {
          playerYear.conf = v;
        } else if (_.endsWith(playerId, "_t100")) {
          playerYear.t100 = v;
        }
        acc[year] = playerYear;
      }
    }, {} as Record<string, IndivCareerInfo>)
    .toPairs()
    .orderBy(([key, __]) => key, "desc")
    .value();

  // Table building:

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  /** Compresses number/height/year into 1 double-width column */
  const rosterInfoSpanCalculator = (key: string) =>
    key == "efg" ? 2 : key == "assist" ? 0 : 1;

  const playerRowBuilder = (
    player: IndivCareerStatSet,
    titleOverride?: string
  ) => {
    player.off_title =
      titleOverride || `${player.year} | ${player.key} | ${player.team}`;

    player.off_drb = player.def_orb; //(just for display, all processing should use def_orb)
    TableDisplayUtils.injectPlayTypeInfo(player, true, true, teamSeasonLookup);

    return _.flatten([
      [GenericTableOps.buildDataRow(player, offPrefixFn, offCellMetaFn)],
      [
        GenericTableOps.buildDataRow(
          player,
          defPrefixFn,
          defCellMetaFn,
          undefined,
          rosterInfoSpanCalculator
        ),
      ],
    ]);
  };

  const tableData = _.flatMap(playerSeasonInfo, ([year, playerCareerInfo]) => {
    const seasonRows = playerRowBuilder(playerCareerInfo.season);
    const confRows = playerCareerInfo.conf
      ? playerRowBuilder(playerCareerInfo.conf, "Conf Stats")
      : [];
    const t100Rows = playerCareerInfo.t100
      ? playerRowBuilder(playerCareerInfo.t100, "vs T100")
      : [];
    return _.flatten([seasonRows, confRows, t100Rows]);
  });

  /** The sub-header builder - Can show some handy context in between the header and data rows: */
  const maybeSubheaderRow = showInfoSubHeader
    ? RosterTableUtils.buildInformationalSubheader(
        true,
        true,
        resolvedTheme == "dark"
      )
    : [];

  const table = (
    <GenericTable
      tableCopyId="playerLeaderboardTable"
      tableFields={CommonTableDefs.onOffIndividualTable(
        true,
        possAsPct,
        factorMins,
        true
      )}
      tableData={maybeSubheaderRow.concat(tableData)}
      cellTooltipMode="none"
      extraInfoLookups={{
        //(see buildLeaderboards)
        PREPROCESSING_WARNING:
          "The leaderboard version of this stat has been improved with some pre-processing so may not be identical to the on-demand values eg in the On/Off pages",
      }}
    />
  );
  // 4] Views

  const quickToggleBar = (
    <ToggleButtonGroup
      items={[
        {
          label: "TODO",
          tooltip: "",
          toggled: false,
          onClick: () => null,
        },
      ]}
    />
  );

  const optionsDropdown = <GenericTogglingMenu></GenericTogglingMenu>;

  return <Container fluid>{table}</Container>;
};

export default PlayerCareerTable;
