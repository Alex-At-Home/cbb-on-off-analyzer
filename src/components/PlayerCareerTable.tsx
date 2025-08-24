// React imports:
import React, { useState, useEffect, ReactNode } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";
import { IndivCareerInfo, IndivCareerStatSet } from "../utils/StatModels";
import ToggleButtonGroup, {
  ToggleButtonItem,
} from "./shared/ToggleButtonGroup";
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
import { Container, OverlayTrigger, Row } from "react-bootstrap";

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

  /** T100 and conf */
  const [showAll, setShowAll] = useState(
    _.isNil(playerCareerParams.d1) ? true : playerCareerParams.d1
  );
  const [showT100, setShowT100] = useState(playerCareerParams.t100 || false);
  const [showConf, setShowConf] = useState(playerCareerParams.conf || false);

  const [yearsToShow, setYearsToShow] = useState(new Set<string>());

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
    topYear: boolean,
    titleOverride?: string,
    titleSuffix?: string
  ) => {
    // Title

    player.off_title =
      titleOverride ||
      `${player.year} | ${player.key} | ${player.team}${
        titleSuffix ? `\n${titleSuffix}` : ""
      }`;

    // Misc stats

    player.off_drb = player.def_orb; //(just for display, all processing should use def_orb)
    TableDisplayUtils.injectPlayTypeInfo(player, true, true, teamSeasonLookup);

    // Positional Info

    //(they are in format {pg,sg,sf,pf,c} from this index so we can use them for searching)
    const posFreqs = ["pg", "sg", "sf", "pf", "c"].map(
      (pos) => (player.posFreqs as unknown as Record<string, number>)[pos] || 0
    );
    const posBreakdown =
      _.size(posFreqs) >= 5
        ? _.flatMap(["PG", "SG", "SF", "PF", "C"], (pos, index) => {
            const freqOfPos = (posFreqs[index] || 0) * 100;
            return freqOfPos >= 10 ? [`${pos}: ${freqOfPos.toFixed(0)}%`] : [];
          }).join(", ")
        : undefined;
    const withNonBreakingHyphen = (s: string) => {
      return <span style={{ whiteSpace: "nowrap" }}>{s}</span>;
    };
    player.def_usage = (
      <OverlayTrigger
        placement="auto"
        overlay={TableDisplayUtils.buildPositionTooltip(
          player.posClass || "G?",
          "season",
          true,
          posBreakdown
        )}
      >
        <small>
          {withNonBreakingHyphen(player.posClass || "G?")}
          {posBreakdown ? <sup>*</sup> : undefined}
        </small>
      </OverlayTrigger>
    );

    // Add roster metadata (top-line only):

    if (!titleOverride) {
      const height = player.roster?.height;
      const yearClass = player.roster?.year_class;
      const rosterNum = player.roster?.number;
      const rosterInfoText = `${height && height != "-" ? height : ""} ${
        yearClass ? yearClass : ""
      }${rosterNum ? ` / #${rosterNum}` : ""}`;

      if (rosterInfoText.length > 2) {
        player.def_efg = (
          <small>
            <i className="text-secondary">{rosterInfoText}</i>
          </small>
        );
      }
    } else {
      player.def_efg = undefined;
    }

    // Finally build rows

    const multipleRowsPerYear =
      (showAll && (showT100 || showConf)) || (showT100 && showConf);
    const extraCharts = false;
    const showEveryYear = multipleRowsPerYear || extraCharts;

    return _.flatten([
      !topYear && showEveryYear
        ? [
            GenericTableOps.buildHeaderRepeatRow(
              CommonTableDefs.repeatingOnOffIndivHeaderFields,
              "small"
            ),
          ]
        : [],
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

  const tableData = _.chain(playerSeasonInfo)
    .filter((info) => _.isEmpty(yearsToShow) || yearsToShow.has(info[0]))
    .flatMap(([year, playerCareerInfo], index) => {
      const topYear = index == 0;
      const seasonRows = showAll
        ? playerRowBuilder(playerCareerInfo.season, topYear)
        : [];
      const confRows =
        playerCareerInfo.conf && showConf
          ? playerRowBuilder(
              playerCareerInfo.conf,
              topYear || showAll,
              showAll ? "Conf Stats" : undefined,
              "Conf Stats"
            )
          : [];
      const t100Rows =
        playerCareerInfo.t100 && showT100
          ? playerRowBuilder(
              playerCareerInfo.t100,
              topYear || showAll || showConf,
              showAll || showConf ? "vs T100" : undefined,
              "vs T100"
            )
          : [];
      return _.flatten([seasonRows, confRows, t100Rows]);
    })
    .value();

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
      items={playerSeasonInfo
        .map(
          (y) =>
            ({
              label: y[0],
              tooltip: "Show / hide data for this year",
              toggled: _.isEmpty(yearsToShow) || yearsToShow.has(y[0]),
              onClick: () => {
                const newYearSet = _.isEmpty(yearsToShow)
                  ? new Set<string>(playerSeasonInfo.map((y) => y[0]))
                  : new Set(yearsToShow);
                const currHasYear = newYearSet.has(y[0]);
                if (currHasYear) {
                  newYearSet.delete(y[0]);
                } else {
                  newYearSet.add(y[0]);
                }
                setYearsToShow(newYearSet);
              },
            } as ToggleButtonItem)
        )
        .concat([
          {
            label: " | ",
            isLabelOnly: true,
            toggled: false,
            onClick: () => null,
          },
          {
            label: "All",
            tooltip: "Show data for the player's stats vs all opposition",
            toggled: showAll,
            disabled: !showConf && !showT100,
            onClick: () => {
              if (showConf || showT100) {
                setShowAll(!showAll);
              }
            },
          },
          {
            label: "Conf",
            tooltip:
              "Show data for the player's stats vs Conference opposition",
            toggled: showConf,
            onClick: () => {
              if (!showAll && !showT100 && showConf) {
                //revert back to showAll
                setShowAll(true);
              }
              setShowConf(!showConf);
            },
          },
          {
            label: "T100",
            tooltip: "Show data for the player's stats vs T100",
            toggled: showT100,
            onClick: () => {
              if (!showAll && !showConf && showT100) {
                //revert back to showAll
                setShowAll(true);
              }
              setShowT100(!showT100);
            },
          },
          {
            label: " | ",
            isLabelOnly: true,
            toggled: true,
            onClick: () => null,
          },
          {
            label: "Grades",
            tooltip: showGrades
              ? "Hide player ranks/percentiles"
              : "Show player ranks/percentiles",
            toggled: showGrades != "",
            onClick: () =>
              setShowGrades(
                showGrades ? "" : ParamDefaults.defaultEnabledGrade
              ),
          },
          {
            label: "Style",
            toggled: false,
            onClick: () => null,
          },
          {
            label: "Shots",
            toggled: false,
            onClick: () => null,
          },
          {
            label: " | ",
            isLabelOnly: true,
            toggled: true,
            onClick: () => null,
          },
          {
            label: "Poss%",
            tooltip: possAsPct
              ? "Show possessions as count"
              : "Show possessions as percentage",
            toggled: possAsPct,
            onClick: () => setPossAsPct(!possAsPct),
          },
          {
            label: "+ Info",
            tooltip: showInfoSubHeader
              ? "Hide extra info sub-header"
              : "Show extra info sub-header",
            toggled: showInfoSubHeader,
            onClick: () => setShowInfoSubHeader(!showInfoSubHeader),
          },
        ])}
    />
  );

  const optionsDropdown = <GenericTogglingMenu></GenericTogglingMenu>;

  return (
    <Container fluid>
      <Row className="mb-2">{quickToggleBar}</Row>
      <Row>{table}</Row>
    </Container>
  );
};

export default PlayerCareerTable;
