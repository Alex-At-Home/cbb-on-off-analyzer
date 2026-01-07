// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";
import fetch from "isomorphic-unfetch";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import { RosterStatsModel } from "./RosterStatsTable";
import { LineupStatsModel } from "./LineupStatsTable";
import LuckConfigModal from "./shared/LuckConfigModal";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import StickyRow from "./shared/StickyRow";

// Util imports
import { ShotStatsModel, StatModels, TeamStatSet } from "../utils/StatModels";
import {
  GameFilterParams,
  ParamDefaults,
  LuckParams,
} from "../utils/FilterModels";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { CbbColors } from "../utils/CbbColors";

import {
  DivisionStatsCache,
  GradeTableUtils,
} from "../utils/tables/GradeTableUtils";
import {
  TeamStatsTableUtils,
  TeamStatsBreakdown,
} from "../utils/tables/TeamStatsTableUtils";
import { DateUtils } from "../utils/DateUtils";
import { UserChartOpts } from "./diags/ShotChartDiagView";
import { FeatureFlags } from "../utils/stats/FeatureFlags";

export type TeamStatsModel = {
  on: TeamStatSet;
  off: TeamStatSet;
  other?: TeamStatSet[];
  baseline: TeamStatSet;
  global: TeamStatSet;
} & {
  onOffMode?: boolean;
  error_code?: string;
};
type Props = {
  gameFilterParams: GameFilterParams;
  /** Ensures that all relevant data is received at the same time */
  dataEvent: {
    teamStats: TeamStatsModel;
    rosterStats: RosterStatsModel;
    shotStats: ShotStatsModel;
    lineupStats: LineupStatsModel[];
  };
  onChangeState: (newParams: GameFilterParams) => void;
  // Some refs for navigation:
  navigationRefs: {
    refA: React.RefObject<HTMLTableRowElement>;
    refB: React.RefObject<HTMLTableRowElement>;
    otherRefs: React.RefObject<HTMLTableRowElement>[];
    refBase: React.RefObject<HTMLTableRowElement>;
    refDiffs: React.RefObject<HTMLTableRowElement>;
  };
  testMode?: boolean; //(if set, the initial processing occurs synchronously)
};

const TeamStatsTable: React.FunctionComponent<Props> = ({
  gameFilterParams,
  dataEvent,
  onChangeState,
  navigationRefs,
  testMode,
}) => {
  const { teamStats, rosterStats, shotStats, lineupStats } = dataEvent;
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data Model

  const [adjustForLuck, setAdjustForLuck] = useState(
    _.isNil(gameFilterParams.onOffLuck)
      ? ParamDefaults.defaultOnOffLuckAdjust
      : gameFilterParams.onOffLuck
  );
  const [showLuckAdjDiags, setShowLuckAdjDiags] = useState(
    _.isNil(gameFilterParams.showOnOffLuckDiags)
      ? ParamDefaults.defaultOnOffLuckDiagMode
      : gameFilterParams.showOnOffLuckDiags
  );
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(gameFilterParams.luck)
      ? ParamDefaults.defaultLuckConfig
      : gameFilterParams.luck
  );

  const [showRoster, setShowRoster] = useState(
    _.isNil(gameFilterParams.showRoster)
      ? ParamDefaults.defaultTeamShowRoster
      : gameFilterParams.showRoster
  );

  const [showGameInfo, setShowGameInfo] = useState(
    _.isNil(gameFilterParams.showGameInfo)
      ? ParamDefaults.defaultTeamShowGameInfo
      : gameFilterParams.showGameInfo
  );

  const [showDiffs, setShowDiffs] = useState(
    (gameFilterParams.otherQueries?.length || 0) == 0
      ? _.isNil(gameFilterParams.teamDiffs)
        ? false
        : gameFilterParams.teamDiffs
      : false
  );

  const [showExtraInfo, setShowExtraInfo] = useState(
    _.isNil(gameFilterParams.showExtraInfo)
      ? false
      : gameFilterParams.showExtraInfo
  );

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(gameFilterParams.showGrades)
      ? ParamDefaults.defaultEnabledGrade
      : gameFilterParams.showGrades
  );
  const [hideGlobalGradeSettings, setHideGlobalGradeSettings] =
    useState<boolean>(true);
  const showStandaloneGrades =
    GradeTableUtils.showingStandaloneGrades(showGrades);

  /** Show team and individual grades */
  const [showShotCharts, setShowShotCharts] = useState<boolean>(
    _.isNil(gameFilterParams.teamShotCharts)
      ? false
      : gameFilterParams.teamShotCharts
  );

  /** (placeholder for positional info)*/
  const [showPlayTypes, setShowPlayTypes] = useState(
    _.isNil(gameFilterParams.showTeamPlayTypes)
      ? ParamDefaults.defaultTeamShowPlayTypes
      : gameFilterParams.showTeamPlayTypes
  );

  const [playTypeConfigStr, setPlayTypeConfigStr] = useState<string>(
    _.isNil(gameFilterParams.teamPlayTypeConfig)
      ? ParamDefaults.defaultTeamPlayTypeConfig
      : gameFilterParams.teamPlayTypeConfig
  );

  const [playStyleConfig, setPlayStyleConfig] = useState<string>(() => {
    const startConfig = _.isNil(gameFilterParams.teamPlayStyleConfig)
      ? ParamDefaults.defaultTeamPlayStyleConfig
      : gameFilterParams.teamPlayStyleConfig;
    // If defensive stats aren't supported for this query, strip "def" from config
    if (
      startConfig.includes("def") &&
      !TeamStatsTableUtils.isDefensiveStyleSupported(gameFilterParams).supported
    ) {
      return startConfig.replace("def", "");
    }
    return startConfig;
  });

  // Shot charts:
  const [shotChartConfig, setShotChartConfig] = useState<
    UserChartOpts | undefined
  >(
    _.isNil(gameFilterParams.teamShotChartsShowZones)
      ? undefined
      : {
          buildZones: gameFilterParams.teamShotChartsShowZones,
          useEfg: gameFilterParams.teamShotChartsUseEfg ?? false,
        }
  );

  /** Whether we are showing the luck config modal */
  const [showLuckConfig, setShowLuckConfig] = useState(false);

  /** Whether we are showing the defensive unsupported modal */
  const [showDefensiveUnsupportedModal, setShowDefensiveUnsupportedModal] =
    useState(false);

  /** Whether to make the quick toggle bar stick (default: on) */
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    _.isNil(gameFilterParams.stickyQuickToggle)
      ? true
      : gameFilterParams.stickyQuickToggle
  );

  useEffect(() => {
    //(keep luck and grades and other shared params up to date between the two views)
    setAdjustForLuck(
      _.isNil(gameFilterParams.onOffLuck)
        ? ParamDefaults.defaultOnOffLuckAdjust
        : gameFilterParams.onOffLuck
    );
    setLuckConfig(
      _.isNil(gameFilterParams.luck)
        ? ParamDefaults.defaultLuckConfig
        : gameFilterParams.luck
    );
    setStickyQuickToggle(
      _.isNil(gameFilterParams.stickyQuickToggle)
        ? true
        : gameFilterParams.stickyQuickToggle
    );
  }, [gameFilterParams]);

  // Team Grade and Division Stats logic
  //TODO: have stats logic separate from grade cache?

  const [divisionStatsCache, setDivisionStatsCache] = useState(
    {} as DivisionStatsCache
  );

  // Events that trigger building or rebuilding the division stats cache
  useEffect(() => {
    if (showGrades || showPlayTypes) {
      if (
        gameFilterParams.year != divisionStatsCache.year ||
        gameFilterParams.gender != divisionStatsCache.gender ||
        _.isEmpty(divisionStatsCache)
      ) {
        if (!_.isEmpty(divisionStatsCache)) setDivisionStatsCache({}); //unset if set
        GradeTableUtils.populateTeamDivisionStatsCache(
          gameFilterParams,
          setDivisionStatsCache
        );
      }
    }
  }, [gameFilterParams, showGrades, showPlayTypes]);

  // Generic page builder plumbing

  useEffect(() => {
    //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...gameFilterParams,
      teamDiffs: showDiffs,
      showTeamPlayTypes: showPlayTypes,
      showExtraInfo: showExtraInfo,
      luck: luckConfig,
      onOffLuck: adjustForLuck,
      showOnOffLuckDiags: showLuckAdjDiags,
      showRoster: showRoster,
      showGameInfo: showGameInfo,
      showGrades: showGrades,
      teamShotCharts: showShotCharts,
      teamShotChartsShowZones: shotChartConfig?.buildZones,
      teamShotChartsUseEfg: shotChartConfig?.useEfg,
      stickyQuickToggle,
      teamPlayTypeConfig: playTypeConfigStr,
      teamPlayStyleConfig: playStyleConfig,
    };
    onChangeState(newState);
  }, [
    luckConfig,
    adjustForLuck,
    showLuckAdjDiags,
    showDiffs,
    showExtraInfo,
    showPlayTypes,
    showRoster,
    showGameInfo,
    showGrades,
    showShotCharts,
    shotChartConfig,
    stickyQuickToggle,
    playTypeConfigStr,
    playStyleConfig,
  ]);

  const tableInfo = TeamStatsTableUtils.buildRows(
    gameFilterParams,
    teamStats,
    rosterStats,
    shotStats,
    lineupStats,

    // Page control
    {
      showPlayTypes,
      playTypeConfig: {
        off: playStyleConfig.includes("off"),
        def: playStyleConfig.includes("def"),
      },
      showRoster,
      adjustForLuck,
      showDiffs,
      showGameInfo,
      showShotCharts,
      shotChartConfig,
      showExtraInfo,
      showGrades,
      showStandaloneGrades,
      showLuckAdjDiags,
      showHelp,
      playStyleConfigStr: playTypeConfigStr,
    },
    {
      setShowGrades: (showGrades: string) => setShowGrades(showGrades),
      setShotChartConfig: (config: UserChartOpts) => setShotChartConfig(config),
      setPlayStyleConfigStr: (configStr: string) =>
        setPlayTypeConfigStr(configStr),
    },

    luckConfig,
    divisionStatsCache
  );

  const buildRows = (
    stats: TeamStatsBreakdown | undefined,
    naviationRef: React.RefObject<HTMLTableRowElement>,
    withSeparator: boolean
  ) => {
    if (stats) {
      stats.teamStatsRows[0].navigationRef = naviationRef;
    }
    return stats
      ? _.flatten([
          stats.teamStatsRows,
          stats.teamRosterRows,
          stats.teamDiagRows,
          withSeparator ? [GenericTableOps.buildRowSeparator()] : [],
        ])
      : [];
  };

  const tableData = React.useMemo(
    () =>
      _.flatten([
        buildRows(tableInfo.on, navigationRefs.refA, true),
        buildRows(tableInfo.off, navigationRefs.refB, true),
        (tableInfo.other || []).flatMap((other, idx) =>
          other ? buildRows(other, navigationRefs.otherRefs[idx]!, true) : []
        ),
        buildRows(tableInfo.baseline, navigationRefs.refBase, false),
        // Diffs if showing:
        showDiffs ? [GenericTableOps.buildRowSeparator()] : [],
        _.map(tableInfo.diffs, (row, idx) => {
          if (idx == 0) row.navigationRef = navigationRefs.refDiffs;
          return row;
        }),
      ]),
    [
      dataEvent,
      luckConfig,
      adjustForLuck,
      showLuckAdjDiags,
      showDiffs,
      showExtraInfo,
      showPlayTypes,
      showRoster,
      showGameInfo,
      divisionStatsCache,
      showGrades,
      showShotCharts,
      shotChartConfig, //(do need to re-render on this since is applied to on/off/baseline shot charts)
      stickyQuickToggle,
      playTypeConfigStr,
      playStyleConfig,
    ]
  );

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (teamStats.baseline.doc_count || 0) == 0;
  }

  // 4] View

  const topLevelGradeControls = _.thru(
    !hideGlobalGradeSettings,
    (buildTopLevelGradeControls) => {
      if (buildTopLevelGradeControls) {
        const divisionStatsCacheByYear: DivisionStatsCache = showGrades
          ? divisionStatsCache || {}
          : {};
        return GradeTableUtils.buildTeamGradeControlState(
          "",
          {
            config: showGrades,
            setConfig: (newConfig: string) => setShowGrades(newConfig),
            selectionType: "baseline",
            teamStats: {
              comboTier: divisionStatsCacheByYear.Combo,
              highTier: divisionStatsCacheByYear.High,
              mediumTier: divisionStatsCacheByYear.Medium,
              lowTier: divisionStatsCacheByYear.Low,
            },
            team: StatModels.emptyTeam(),
          },
          {
            countsAreExample: false,
            onHide: () => {
              setHideGlobalGradeSettings(true);
            },
          }
        );
      } else {
        return undefined;
      }
    }
  );

  const quickToggleBar = (
    <ToggleButtonGroup
      items={[
        {
          label: "Luck",
          tooltip: adjustForLuck
            ? "Remove luck adjustments"
            : "Adjust statistics for luck",
          toggled: adjustForLuck,
          onClick: () => setAdjustForLuck(!adjustForLuck),
        },
        {
          label: "Diffs",
          disabled: (gameFilterParams.otherQueries?.length || 0) > 0,
          tooltip: "Show hide diffs between A/B/Baseline stats",
          toggled: showDiffs,
          onClick: () => setShowDiffs(!showDiffs),
        },
        {
          label: "Extra",
          tooltip: showExtraInfo
            ? "Hide extra stats info"
            : "Show extra stats info",
          toggled: showExtraInfo,
          onClick: () => setShowExtraInfo(!showExtraInfo),
        },
        {
          label: "|",
          tooltip: "",
          toggled: true,
          onClick: () => {},
          isLabelOnly: true,
        },
        {
          label: "Style",
          tooltip: showPlayTypes
            ? "Hide play style breakdowns"
            : "Show play style breakdowns",
          toggled: showPlayTypes,
          onClick: () => {
            if (!showPlayTypes) {
              // Turning on: default to "off" only
              setPlayStyleConfig("off");
            }
            setShowPlayTypes(!showPlayTypes);
          },
        },
        {
          label: ":",
          tooltip: "",
          toggled: true,
          onClick: () => {},
          isLabelOnly: true,
        },
        {
          label: "Off",
          tooltip: showPlayTypes
            ? playStyleConfig.includes("off")
              ? "Hide offensive play style breakdowns"
              : "Show offensive play style breakdowns"
            : "(Select Style to enable)",
          toggled: showPlayTypes && playStyleConfig.includes("off"),
          onClick: () => {
            if (showPlayTypes) {
              const newVal = _.thru(playStyleConfig, (curr) => {
                if (curr.includes("off")) return curr.replace("off", "");
                else return "off" + curr;
              });
              setPlayStyleConfig(newVal);
            }
          },
        },
        {
          label: "Def",
          tooltip: showPlayTypes
            ? playStyleConfig.includes("def")
              ? "Hide defensive play style breakdowns"
              : "Show defensive play style breakdowns"
            : "(Select Style to enable)",
          toggled: showPlayTypes && playStyleConfig.includes("def"),
          onClick: () => {
            if (showPlayTypes) {
              const supportCheck =
                TeamStatsTableUtils.isDefensiveStyleSupported(gameFilterParams);
              if (!supportCheck.supported) {
                setShowDefensiveUnsupportedModal(true);
              } else {
                const newVal = _.thru(playStyleConfig, (curr) => {
                  if (curr.includes("def")) return curr.replace("def", "");
                  else return curr + "def";
                });
                setPlayStyleConfig(newVal);
              }
            }
          },
        },
        {
          label: "|",
          tooltip: "",
          toggled: true,
          onClick: () => {},
          isLabelOnly: true,
        },
        {
          label: "Roster",
          tooltip: showRoster
            ? "Hide roster/positional information"
            : "Show roster/positional information",
          toggled: showRoster,
          onClick: () => setShowRoster(!showRoster),
        },
        {
          label: "Games",
          tooltip: showGameInfo
            ? "Hide per-game graphs"
            : "Show per-game graphs",
          toggled: showGameInfo,
          onClick: () => setShowGameInfo(!showGameInfo),
        },
      ].concat(
        gameFilterParams.year ||
          DateUtils.mostRecentYearWithData >=
            DateUtils.firstYearWithShotChartData
          ? [
              {
                label: "Shots",
                tooltip: showShotCharts
                  ? "Hide shot chart"
                  : "Show shot charts",
                toggled: showShotCharts,
                onClick: () => setShowShotCharts(!showShotCharts),
              },
            ]
          : []
      )}
    />
  );

  const fullHelpDropdown = (
    <GenericTogglingMenu>
      <GenericTogglingMenuItem
        text="Show grade controls"
        truthVal={!hideGlobalGradeSettings}
        onSelect={() => setHideGlobalGradeSettings(!hideGlobalGradeSettings)}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text="Adjust for Luck"
        truthVal={adjustForLuck}
        onSelect={() => setAdjustForLuck(!adjustForLuck)}
        helpLink={
          showHelp
            ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html"
            : undefined
        }
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text="Configure Luck Adjustments..."
        truthVal={false}
        onSelect={() => setShowLuckConfig(true)}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text="Show Luck Adjustment Diagnostics"
        truthVal={showLuckAdjDiags}
        onSelect={() => setShowLuckAdjDiags(!showLuckAdjDiags)}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        className="d-none d-md-flex"
        text="'Quick Select' Bar Is Sticky"
        truthVal={stickyQuickToggle}
        onSelect={() => setStickyQuickToggle(!stickyQuickToggle)}
      />
      <GenericTogglingMenuItem
        className="d-md-none"
        disabled={true}
        text="Sticky 'Quick Select' Bar Disabled"
        truthVal={false}
        onSelect={() => {}}
      />
    </GenericTogglingMenu>
  );

  return typeof window !== `undefined` || testMode ? ( //(don't render as SSR)
    <Container fluid>
      <LoadingOverlay
        active={needToLoadQuery()}
        text={
          teamStats.error_code
            ? `Query Error: ${teamStats.error_code}`
            : "Press 'Submit' to view results"
        }
      >
        <LuckConfigModal
          show={showLuckConfig}
          onHide={() => setShowLuckConfig(false)}
          onSave={(l: LuckParams) => setLuckConfig(l)}
          luck={luckConfig}
          showHelp={showHelp}
        />
        <Modal
          show={showDefensiveUnsupportedModal}
          onHide={() => setShowDefensiveUnsupportedModal(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Defensive Style Not Supported</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Defensive style charts are only supported for certain query types:
            </p>
            <ul>
              <li>Season Stats (no splits)</li>
              <li>Date-based splits (Last 30 days, Split by Month)</li>
              <li>SoS-based splits (T100ish vs Weaker, Split by SoS band)</li>
              <li>Misc splits (Home vs Away, Wins vs Losses, First vs Second halves)</li>
            </ul>
            <p>
              <strong>Not supported:</strong> Advanced mode, Lineup splits (Top 5/6/7 players), 
              or On/Off player splits.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowDefensiveUnsupportedModal(false)}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
        <StickyRow
          className="pt-1"
          stickyEnabled={
            /** (for some reason, goes under the roster stats sticky bar when sticky, so disable that unless needed) */
            stickyQuickToggle && tableData.length > 2
          }
          topOffset="25px"
        >
          <Col sm="11">
            <Form.Row>
              <Col>{quickToggleBar}</Col>
            </Form.Row>
          </Col>
          <Form.Group as={Col} sm="1" className="mb-0">
            {fullHelpDropdown}
          </Form.Group>
          {topLevelGradeControls ? (
            <Col xs="12" className="pt-1">
              <div>{topLevelGradeControls}</div>
            </Col>
          ) : undefined}
        </StickyRow>
        <Row className="mt-2">
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
            <GenericTable
              showConfigureColumns={FeatureFlags.isActiveWindow(
                FeatureFlags.tableConfigOptions
              )}
              tableCopyId="teamStatsTable"
              tableFields={CommonTableDefs.onOffTable()}
              tableData={tableData}
              cellTooltipMode="none"
              integratedGrades={
                showGrades && !showStandaloneGrades
                  ? {
                      hybridMode:
                        GradeTableUtils.showingHybridOrStandaloneGrades(
                          showGrades
                        ),
                      exactRanks: true,
                      colorChooser: CbbColors.integratedColorsDefault,
                      customKeyMappings: {
                        def_net: "off_raw_net",
                      },
                      alwaysShow: {
                        off_net: true,
                        off_adj_ppp: true,
                        def_adj_ppp: true,
                      },
                    }
                  : undefined
              }
            />
          </Col>
        </Row>
      </LoadingOverlay>
    </Container>
  ) : null;
};

export default TeamStatsTable;
