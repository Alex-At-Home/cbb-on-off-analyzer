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
import {
  IndivStatSet,
  ShotStatsModel,
  StatModels,
  TeamStatSet,
} from "../utils/StatModels";
import {
  GameFilterParams,
  ParamDefaults,
  LuckParams,
} from "../utils/FilterModels";
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
import {
  configStrToTeamRadarConfig,
  teamRadarConfigToStr,
} from "./diags/TeamPlayTypeDiagRadar";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import { LeaderboardUtils } from "../utils/LeaderboardUtils";
import QuickSwitchBar, {
  quickSwitchDelim,
  QuickSwitchSource,
} from "./shared/QuickSwitchBar";
import { useTheme } from "next-themes";
import { FilterPresetUtils } from "../utils/FilterPresetUtils";
import { TeamTableDefs } from "../utils/tables/TeamTableDefs";

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

  const { resolvedTheme } = useTheme();

  // 1] Data Model

  const [adjustForLuck, setAdjustForLuck] = useState(
    _.isNil(gameFilterParams.onOffLuck)
      ? ParamDefaults.defaultOnOffLuckAdjust
      : gameFilterParams.onOffLuck,
  );
  const [showLuckAdjDiags, setShowLuckAdjDiags] = useState(
    _.isNil(gameFilterParams.showOnOffLuckDiags)
      ? ParamDefaults.defaultOnOffLuckDiagMode
      : gameFilterParams.showOnOffLuckDiags,
  );
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(gameFilterParams.luck)
      ? ParamDefaults.defaultLuckConfig
      : gameFilterParams.luck,
  );

  const [showRoster, setShowRoster] = useState(
    _.isNil(gameFilterParams.showRoster)
      ? ParamDefaults.defaultTeamShowRoster
      : gameFilterParams.showRoster,
  );

  const [showGameInfo, setShowGameInfo] = useState(
    _.isNil(gameFilterParams.showGameInfo)
      ? ParamDefaults.defaultTeamShowGameInfo
      : gameFilterParams.showGameInfo,
  );

  const [showDiffs, setShowDiffs] = useState(
    _.isNil(gameFilterParams.teamDiffs) ? false : gameFilterParams.teamDiffs,
  );

  // Diff mode state:
  const [diffsHideDatasets, setDiffsHideDatasets] = useState(
    gameFilterParams.diffsHideDatasets || "",
  );
  const [diffsCompare, setDiffsCompare] = useState(
    gameFilterParams.diffsCompare || "",
  );
  const [diffLock, setDiffLock] = useState(
    _.isNil(gameFilterParams.diffLock) ? false : gameFilterParams.diffLock,
  );

  const [showExtraInfo, setShowExtraInfo] = useState(
    _.isNil(gameFilterParams.showExtraInfo)
      ? false
      : gameFilterParams.showExtraInfo,
  );

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(gameFilterParams.showGrades)
      ? ParamDefaults.defaultEnabledGrade
      : gameFilterParams.showGrades,
  );
  const [hideGlobalGradeSettings, setHideGlobalGradeSettings] =
    useState<boolean>(true);
  const showStandaloneGrades =
    GradeTableUtils.showingStandaloneGrades(showGrades);

  /** Show team and individual grades */
  const [showShotCharts, setShowShotCharts] = useState<boolean>(
    _.isNil(gameFilterParams.teamShotCharts)
      ? false
      : gameFilterParams.teamShotCharts,
  );

  /** (placeholder for positional info)*/
  const [showPlayTypes, setShowPlayTypes] = useState(
    _.isNil(gameFilterParams.showTeamPlayTypes)
      ? ParamDefaults.defaultTeamShowPlayTypes
      : gameFilterParams.showTeamPlayTypes,
  );

  const [playTypeConfigStr, setPlayTypeConfigStr] = useState<string>(
    _.isNil(gameFilterParams.teamPlayTypeConfig)
      ? ParamDefaults.defaultTeamPlayTypeConfig
      : gameFilterParams.teamPlayTypeConfig,
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
          viewMode:
            (gameFilterParams.teamShotChartsViewMode as
              | "regions"
              | "zones"
              | "clusters"
              | undefined) ?? "zones",
          useEfg: gameFilterParams.teamShotChartsUseEfg ?? false,
          showFreqAsNumber:
            gameFilterParams.teamShotChartsShowFreqAsNumber ?? false,
        },
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
      : gameFilterParams.stickyQuickToggle,
  );

  /** Currently selected table preset */
  const [tablePreset, setTablePreset] = useState<string | undefined>(
    gameFilterParams.teamTablePreset,
  );
  /** Extra columns added to table */
  const [tableConfigExtraCols, setTableConfigExtraCols] = useState<string[]>(
    gameFilterParams.teamTableConfigExtraCols || [],
  );
  /** Disabled table columns */
  const [tableConfigDisabledCols, setTableConfigDisabledCols] = useState<
    string[] | undefined
  >(gameFilterParams.teamTableConfigDisabledCols);

  useEffect(() => {
    //(keep luck and grades and other shared params up to date between the two views)
    setAdjustForLuck(
      _.isNil(gameFilterParams.onOffLuck)
        ? ParamDefaults.defaultOnOffLuckAdjust
        : gameFilterParams.onOffLuck,
    );
    setLuckConfig(
      _.isNil(gameFilterParams.luck)
        ? ParamDefaults.defaultLuckConfig
        : gameFilterParams.luck,
    );
    setStickyQuickToggle(
      _.isNil(gameFilterParams.stickyQuickToggle)
        ? true
        : gameFilterParams.stickyQuickToggle,
    );
  }, [gameFilterParams]);

  // Team Grade and Division Stats logic
  //TODO: have stats logic separate from grade cache?

  const [divisionStatsCache, setDivisionStatsCache] = useState(
    {} as DivisionStatsCache,
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
          setDivisionStatsCache,
        );
      }
    }
  }, [gameFilterParams, showGrades, showPlayTypes]);

  // Player stats cache for defensive style analysis
  const [allPlayerStatsCache, setAllPlayerStatsCache] = useState<{
    cacheYear: string;
    cacheGender: string;
    cache: Record<string, IndivStatSet[]>;
  }>({
    cacheYear: gameFilterParams.year || ParamDefaults.defaultYear,
    cacheGender: gameFilterParams.gender || ParamDefaults.defaultGender,
    cache: {},
  });

  // Fetch player stats for opponents when defensive style is enabled
  useEffect(() => {
    const currentYear = gameFilterParams.year || ParamDefaults.defaultYear;
    const currentGender =
      gameFilterParams.gender || ParamDefaults.defaultGender;

    // Clear cache if year/gender changed
    if (
      allPlayerStatsCache.cacheYear !== currentYear ||
      allPlayerStatsCache.cacheGender !== currentGender
    ) {
      setAllPlayerStatsCache({
        cacheGender: currentGender,
        cacheYear: currentYear,
        cache: {},
      });
    }

    const showingDefStyle = showPlayTypes && playStyleConfig.includes("def");

    const allDefStats = [teamStats.baseline?.def_stats].filter(Boolean);
    const opponentTeams = showingDefStyle
      ? _.uniq(allDefStats.flatMap((ds) => _.keys(ds)))
      : [];

    if (showingDefStyle && opponentTeams.length > 0) {
      // Only fetch if we don't have all the teams we need
      const missingTeams = opponentTeams.filter(
        (team) => !allPlayerStatsCache.cache[team],
      );
      if (missingTeams.length > 0) {
        // Create a set of opponent teams for efficient lookup
        const opponentTeamsSet = new Set(opponentTeams);

        const fetchPlayers = LeaderboardUtils.getMultiYearPlayerLboards(
          "all",
          currentGender,
          currentYear,
          "All",
          [],
          [],
        );
        fetchPlayers.then((players) => {
          // Filter players to only those on opponent teams, then group
          const filteredPlayers = _.flatMap(
            players,
            (pp) => (pp.players || []) as Array<IndivStatSet>,
          ).filter(
            (p) =>
              opponentTeamsSet.has(p.team || "") &&
              !allPlayerStatsCache.cache[p.team || ""],
          );
          const filteredCache = _.groupBy(filteredPlayers, (p) => p.team);
          setAllPlayerStatsCache((curr) => {
            console.log(
              `(Defensive style info [${curr.cacheYear}][${
                curr.cacheGender
              }]: Added [${_.keys(filteredCache)}] to [${_.keys(
                curr.cache,
              )}], opponents=[${opponentTeams}])`,
            );
            _.forEach(curr.cache, (val, key) => (filteredCache[key] = val));
            return {
              ...curr,
              cache: filteredCache,
            };
          });
        });
      }
    }
  }, [
    showPlayTypes,
    playStyleConfig,
    teamStats,
    gameFilterParams.year,
    gameFilterParams.gender,
  ]);

  // Generic page builder plumbing

  useEffect(() => {
    //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...gameFilterParams,
      teamDiffs: showDiffs,
      diffsHideDatasets,
      diffsCompare,
      diffLock,
      // If diffLock is enabled, sync player diff settings
      ...(diffLock
        ? {
            playerDiffs: showDiffs,
            playerDiffsHideDatasets: diffsHideDatasets,
            playerDiffsCompare: diffsCompare,
          }
        : {}),
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
      teamShotChartsViewMode: shotChartConfig?.viewMode,
      teamShotChartsShowFreqAsNumber: shotChartConfig?.showFreqAsNumber,
      stickyQuickToggle,
      teamPlayTypeConfig: playTypeConfigStr,
      teamPlayStyleConfig: playStyleConfig,
      teamTablePreset: tablePreset,
      teamTableConfigExtraCols: tableConfigExtraCols,
      teamTableConfigDisabledCols: tableConfigDisabledCols,
    };
    onChangeState(newState);
  }, [
    luckConfig,
    adjustForLuck,
    showLuckAdjDiags,
    showDiffs,
    diffsHideDatasets,
    diffsCompare,
    diffLock,
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
    tablePreset,
    tableConfigExtraCols,
    tableConfigDisabledCols,
  ]);

  // Early computation of diff mode state (needed before tableInfo)
  // hasSplits: there must be at least one non-baseline dataset with data
  const hasSplits =
    (teamStats.on?.doc_count || 0) > 0 ||
    (teamStats.off?.doc_count || 0) > 0 ||
    (teamStats.other || []).some((o) => (o?.doc_count || 0) > 0);
  const showDiffModeUI = showDiffs && hasSplits;

  // Multi mode: diffsHideDatasets starts with "multi:" followed by comma-separated keys
  const isMultiMode = diffsHideDatasets.startsWith("multi:");
  const selectedDatasetKeys: string[] = isMultiMode
    ? diffsHideDatasets.slice("multi:".length).split(",").filter(Boolean)
    : diffsHideDatasets
      ? [diffsHideDatasets]
      : [];
  // For backwards compatibility, use first key as "the" selected key for single mode
  const selectedDatasetKey = selectedDatasetKeys[0] || "";

  // Build short form names for datasets using preset phrase logic (like GameFilter)
  const maybePresetPhrase = _.zip(
    gameFilterParams.splitPhrases || [],
    FilterPresetUtils.getPresetPhrase(gameFilterParams.presetSplit || "??") ||
      [],
  ).map((options) => options?.[0] || options?.[1]);

  const maybeFilterPhrase =
    gameFilterParams.basePhrase ||
    FilterPresetUtils.getPresetFilterPhrase(
      gameFilterParams.presetMode || "??",
    );

  // Available datasets with their short names (base goes at the end)
  const availableDatasets: {
    key: string;
    shortName: string;
    hasData: boolean;
  }[] = [
    {
      key: "on",
      shortName: maybePresetPhrase?.[0] || "A",
      hasData: (teamStats.on?.doc_count || 0) > 0,
    },
    {
      key: "off",
      shortName: maybePresetPhrase?.[1] || "B",
      hasData: (teamStats.off?.doc_count || 0) > 0,
    },
    ...(teamStats.other || []).map((other, idx) => ({
      key: `extra${idx}`,
      shortName: maybePresetPhrase?.[2 + idx] || String.fromCharCode(67 + idx), // C, D, E, ...
      hasData: (other?.doc_count || 0) > 0,
    })),
    {
      key: "base",
      shortName: maybeFilterPhrase || "Base",
      hasData: (teamStats.baseline?.doc_count || 0) > 0,
    },
  ].filter((d) => d.hasData);

  // Parse diffsCompare to get the quickSwitch state
  // Validate that the comparison dataset actually exists in availableDatasets
  const diffsCompareBaseParsed = diffsCompare
    ? diffsCompare.split(quickSwitchDelim)[0]
    : undefined;
  const diffsCompareBase =
    diffsCompareBaseParsed &&
    availableDatasets.some((d) => d.key === diffsCompareBaseParsed)
      ? diffsCompareBaseParsed
      : undefined;
  const diffsCompareExtra: "extra" | "diff" | undefined =
    diffsCompareBase && diffsCompare
      ? (diffsCompare.split(quickSwitchDelim)[1] as
          | "extra"
          | "diff"
          | undefined)
      : undefined;

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
      allPlayerStatsCache: allPlayerStatsCache.cache,
      diffState: showDiffModeUI
        ? {
            enabledDatasets: selectedDatasetKeys,
            // diffsCompareBase is now the dataset key directly (on/off/base/extra0/etc)
            compareDataset: diffsCompareBase || undefined,
            compareMode: diffsCompareExtra,
          }
        : undefined,
    },
    {
      setShowGrades: (showGrades: string) => setShowGrades(showGrades),
      setShotChartConfig: (config: UserChartOpts) => setShotChartConfig(config),
      setPlayStyleConfigStr: (configStr: string) =>
        setPlayTypeConfigStr(configStr),
      setDiffsCompare: (compare: string) => setDiffsCompare(compare),
    },

    luckConfig,
    divisionStatsCache,
  );

  const buildRows = (
    stats: TeamStatsBreakdown | undefined,
    naviationRef: React.RefObject<HTMLTableRowElement>,
    withSeparator: boolean,
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

  // Helper to check if a dataset should be shown based on diffsHideDatasets
  const shouldShowDataset = (key: string) => {
    // If no selection or feature flag not active, show all
    if (!showDiffModeUI || !diffsHideDatasets) {
      return true;
    }
    // In multi mode, check if key is in the list; in single mode, check exact match
    return selectedDatasetKeys.includes(key);
  };

  // Helper to get rows for a dataset key
  const getRowsForDataset = (key: string, isLast: boolean) => {
    if (!shouldShowDataset(key)) return [];
    if (key === "on") {
      return buildRows(tableInfo.on, navigationRefs.refA, !isLast);
    } else if (key === "off") {
      return buildRows(tableInfo.off, navigationRefs.refB, !isLast);
    } else if (key === "base") {
      return buildRows(tableInfo.baseline, navigationRefs.refBase, !isLast);
    } else if (key.startsWith("extra")) {
      const idx = parseInt(key.slice("extra".length), 10);
      const other = tableInfo.other?.[idx];
      return other
        ? buildRows(other, navigationRefs.otherRefs[idx]!, !isLast)
        : [];
    }
    return [];
  };

  // Default dataset order
  const defaultDatasetOrder = [
    "on",
    "off",
    ...(tableInfo.other || []).map((_, idx) => `extra${idx}`),
    "base",
  ];

  const tableData = React.useMemo(() => {
    // In multi-mode, use the order from selectedDatasetKeys
    // Otherwise use the default order
    const datasetOrder =
      isMultiMode && selectedDatasetKeys.length > 0
        ? selectedDatasetKeys
        : defaultDatasetOrder;

    const visibleDatasets = datasetOrder.filter((key) =>
      shouldShowDataset(key),
    );

    return _.flatten([
      // Build rows in the specified order
      ...visibleDatasets.map((key, idx) => {
        const isLast = idx === visibleDatasets.length - 1;
        return getRowsForDataset(key, isLast);
      }),
    ]);
  }, [
    dataEvent,
    luckConfig,
    adjustForLuck,
    showLuckAdjDiags,
    showDiffs,
    diffsHideDatasets,
    diffsCompare,
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
    allPlayerStatsCache,
    tablePreset,
  ]);

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (teamStats.baseline.doc_count || 0) == 0;
  }

  // Dataset options for QuickSwitchBar (exclude currently selected - in multi mode, exclude the first/top selected)
  // Include sourceKey so we can convert from shortName title to key format for diffsCompare
  const comparisonDatasetOptions = availableDatasets
    .filter((d) => d.key !== selectedDatasetKey)
    .map((d) => ({ title: d.shortName, sourceKey: d.key }));

  // Dataset selector toggle bar
  const datasetSelectorBar = showDiffModeUI ? (
    <ToggleButtonGroup
      labelOverride="Selected dataset:"
      items={[
        ...availableDatasets.map((dataset) => {
          // In multi-mode, show order number as superscript
          const orderIndex = isMultiMode
            ? selectedDatasetKeys.indexOf(dataset.key)
            : -1;
          const orderSuffix =
            orderIndex >= 0 ? <sup>{orderIndex + 1}</sup> : null;
          return {
            label: (
              <>
                {dataset.shortName}
                {orderSuffix}
              </>
            ),
            tooltip: `Focus on ${dataset.shortName} dataset`,
            toggled: selectedDatasetKeys.includes(dataset.key),
            onClick: () => {
              if (isMultiMode) {
                // Multi mode: toggle individual datasets
                const newKeys = selectedDatasetKeys.includes(dataset.key)
                  ? selectedDatasetKeys.filter((k) => k !== dataset.key)
                  : [...selectedDatasetKeys, dataset.key];
                setDiffsHideDatasets(
                  newKeys.length > 0 ? `multi:${newKeys.join(",")}` : "",
                );
              } else {
                // Single mode: clicking already-selected clears selection (show all)
                if (dataset.key === selectedDatasetKey) {
                  setDiffsHideDatasets("");
                } else {
                  setDiffsHideDatasets(dataset.key);
                }
              }
              // Clear comparison if it matches the new selection
              // diffsCompareBase is now the key, so compare directly with dataset.key
              if (diffsCompareBase === dataset.key) {
                setDiffsCompare("");
              }
            },
          };
        }),
        {
          label: "|",
          tooltip: "",
          toggled: true,
          onClick: () => {},
          isLabelOnly: true,
        },
        {
          label: "Multi",
          tooltip:
            "Allows multiple datasets to be viewed (the comparison mode only applies to the top dataset)",
          toggled: isMultiMode,
          onClick: () => {
            if (isMultiMode) {
              // Turning off multi mode: keep only the first selected key
              setDiffsHideDatasets(selectedDatasetKeys[0] || "");
            } else {
              // Turning on multi mode: convert current selection to multi format
              setDiffsHideDatasets(
                selectedDatasetKey
                  ? `multi:${selectedDatasetKey}`
                  : `multi:${availableDatasets[0]?.key || ""}`,
              );
            }
          },
        },
      ]}
    />
  ) : null;

  // Helper to get shortName from key for display in QuickSwitchBar
  const keyToShortName = (key: string | undefined) =>
    key ? availableDatasets.find((d) => d.key === key)?.shortName : undefined;

  // QuickSwitchBar for comparison selection
  const comparisonQuickSwitchBar = showDiffModeUI ? (
    <QuickSwitchBar
      title={""}
      titlePrefix={"Compare"}
      toggleText=": "
      quickSwitch={keyToShortName(diffsCompareBase)}
      quickSwitchExtra={diffsCompareExtra}
      quickSwitchOptions={comparisonDatasetOptions}
      updateQuickSwitch={(
        quickSwitch: string | undefined,
        newTitle: string | undefined,
        source: QuickSwitchSource,
        fromTimer: boolean,
      ) => {
        if (quickSwitch) {
          // Parse the title and mode from quickSwitch (format: "shortName:|:mode")
          const [title, mode] = quickSwitch.split(quickSwitchDelim);
          // Find the option by title (shortName) to get the sourceKey
          const matchingOpt = comparisonDatasetOptions.find(
            (opt) => opt.title === title,
          );
          if (matchingOpt?.sourceKey) {
            setDiffsCompare(
              `${matchingOpt.sourceKey}${quickSwitchDelim}${mode || "extra"}`,
            );
          }
        } else {
          // Clear diffsCompare and also clear quickSwitch in chart configs
          setDiffsCompare("");
          // Clear shot chart quickSwitch
          if (shotChartConfig?.quickSwitch) {
            setShotChartConfig({ ...shotChartConfig, quickSwitch: undefined });
          }
          // Clear play type config quickSwitch
          if (playTypeConfigStr) {
            const config = configStrToTeamRadarConfig(playTypeConfigStr, false);
            if (config.quickSwitch) {
              setPlayTypeConfigStr(
                teamRadarConfigToStr(
                  { ...config, quickSwitch: undefined },
                  false,
                ),
              );
            }
          }
        }
      }}
      quickSwitchTimer={undefined}
      setQuickSwitchTimer={() => {}}
      modes={["extra_down", "diff"]}
      theme={resolvedTheme}
    />
  ) : null;

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
          },
        );
      } else {
        return undefined;
      }
    },
  );

  const quickToggleBar = (
    <ToggleButtonGroup
      items={[
        {
          label: "Diffs...",
          tooltip: "Show hide diffs between A/B/Baseline stats",
          toggled: showDiffs && hasSplits,
          disabled: !hasSplits,
          onClick: () => setShowDiffs(!showDiffs),
        },
        {
          label: "|",
          tooltip: "",
          toggled: true,
          onClick: () => {},
          isLabelOnly: true,
        },
        {
          label: "Luck",
          tooltip: adjustForLuck
            ? "Remove luck adjustments"
            : "Adjust statistics for luck",
          toggled: adjustForLuck,
          onClick: () => setAdjustForLuck(!adjustForLuck),
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
            : `Show offensive play style breakdowns`,
          toggled: showPlayTypes,
          onClick: () => {
            if (!showPlayTypes) {
              // Turning on: default to "off" only
              setPlayStyleConfig("off");
            }
            setShowPlayTypes(!showPlayTypes);
          },
        },
      ]
        .concat([
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
              : "Show offensive play style breakdowns",
            toggled: showPlayTypes && playStyleConfig.includes("off"),
            onClick: () => {
              if (!showPlayTypes) {
                setShowPlayTypes(true);
                setPlayStyleConfig("off");
              } else {
                const newVal = _.thru(playStyleConfig, (curr) => {
                  if (curr.includes("off")) return curr.replace("off", "");
                  else return "off" + curr;
                });
                if (!newVal) {
                  setShowPlayTypes(false);
                }
                setPlayStyleConfig(newVal);
              }
            },
          },
          {
            label: "Def",
            tooltip: showPlayTypes
              ? playStyleConfig.includes("def")
                ? "Hide defensive play style breakdowns"
                : "Show defensive play style breakdowns (can be slow)"
              : "Show defensive play style breakdowns (can be slow)",
            toggled: showPlayTypes && playStyleConfig.includes("def"),
            onClick: () => {
              if (!showPlayTypes) {
                setShowPlayTypes(true);
                setPlayStyleConfig("def");
              } else {
                const supportCheck =
                  TeamStatsTableUtils.isDefensiveStyleSupported(
                    gameFilterParams,
                  );
                if (!supportCheck.supported) {
                  setShowDefensiveUnsupportedModal(true);
                } else {
                  const newVal = _.thru(playStyleConfig, (curr) => {
                    if (curr.includes("def")) return curr.replace("def", "");
                    else return curr + "def";
                  });
                  if (!newVal) {
                    setShowPlayTypes(false);
                  }
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
        ])
        .concat([
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
        ])
        .concat(
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
            : [],
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
      <GenericTogglingMenuItem
        text="Sync Team/Player Diffs"
        truthVal={diffLock}
        onSelect={() => setDiffLock(!diffLock)}
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
              <li>
                Misc splits (Home vs Away, Wins vs Losses, First vs Second
                halves)
              </li>
            </ul>
            <p>
              <strong>Not supported:</strong> Advanced mode, Lineup splits (Top
              5/6/7 players), or On/Off player splits.
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
          <>
            {/* Diff mode controls - dataset selector and comparison QuickSwitchBar */}
            {showDiffModeUI ? (
              <StickyRow
                stickyEnabled={stickyQuickToggle && tableData.length > 2}
                className="pt-1 pb-1"
                topOffset="3em"
              >
                <Col xs={12}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "0.5em 2em",
                    }}
                  >
                    <div>{datasetSelectorBar}</div>
                    <div>
                      <small>{comparisonQuickSwitchBar}</small>
                    </div>
                  </div>
                </Col>
              </StickyRow>
            ) : null}
          </>
        </StickyRow>

        <Row className="mt-2">
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
            <GenericTable
              showConfigureColumns={true}
              initialColumnConfig={{
                newCol: tableConfigExtraCols,
                disabledCols: tableConfigDisabledCols,
              }}
              onColumnConfigChange={(config) => {
                setTableConfigExtraCols(config.newCol);
                setTableConfigDisabledCols(config.disabledCols);
              }}
              onPresetChange={(preset) => {
                setTablePreset(preset);
                // Reset overrides:
                setTableConfigExtraCols([]);
                setTableConfigDisabledCols(undefined);
              }}
              presetOverride={tablePreset}
              tableCopyId="teamStatsTable"
              tableFields={TeamTableDefs.onOffTable()}
              tableData={tableData}
              cellTooltipMode="none"
              integratedGrades={
                showGrades && !showStandaloneGrades
                  ? {
                      hybridMode:
                        GradeTableUtils.showingHybridOrStandaloneGrades(
                          showGrades,
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
