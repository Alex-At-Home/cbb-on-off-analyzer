// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
import Router, { useRouter } from "next/router";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// App components:
import GameFilter from "../components/GameFilter";
import {
  ParamDefaults,
  ParamPrefixes,
  GameFilterParams,
} from "../utils/FilterModels";
import TeamStatsTable, { TeamStatsModel } from "../components/TeamStatsTable";
import RosterStatsTable, {
  RosterStatsModel,
} from "../components/RosterStatsTable";
import { LineupStatsModel } from "../components/LineupStatsTable";
import RosterCompareTable, {
  RosterCompareModel,
} from "../components/RosterCompareTable";
import GenericCollapsibleCard from "../components/shared/GenericCollapsibleCard";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import {
  StatModels,
  ShotStatsModel,
  PlayerShotStatsModel,
} from "../utils/StatModels";
import { UrlRouting } from "../utils/UrlRouting";
import { HistoryManager } from "../utils/HistoryManager";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import InternalNavBarInRow from "../components/shared/InternalNavBarInRow";
import { sk } from "date-fns/locale";
import { screen } from "@testing-library/react";
import { FilterPresetUtils } from "../utils/FilterPresetUtils";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";

const OnOffAnalyzerPage: NextPage<{}> = () => {
  useEffect(() => {
    // Set up GA
    if (process.env.NODE_ENV === "production" && typeof window !== undefined) {
      if (!gaInited) {
        initGA();
        setGaInited(true);
      }
      logPageView();
    }
  }); //(on any change to the DOM)

  // Quick navigation to the different sections
  const topRef = useRef<HTMLDivElement>(null);
  const teamAnalysisRef = useRef<HTMLDivElement>(null);
  const teamAnalysisRefA = useRef<HTMLTableRowElement>(null);
  const teamAnalysisRefB = useRef<HTMLTableRowElement>(null);
  const teamAnalysisOtherRefs = _.range(20).map(() =>
    useRef<HTMLTableRowElement>(null)
  );
  const teamAnalysisRefBase = useRef<HTMLTableRowElement>(null);
  const teamAnalysisRefDiffs = useRef<HTMLTableRowElement>(null);
  const indivAnalysisRef = useRef<HTMLDivElement>(null);
  const lineupComparisonRef = useRef<HTMLDivElement>(null);
  const simpleNavigationsRefs = {
    Top: { ref: topRef },
    Teams: { ref: teamAnalysisRef },
    Players: { ref: indivAnalysisRef },
    "Roster Comp.": { ref: lineupComparisonRef },
  };
  const complexNavigationsRefs = (params: GameFilterParams) => {
    const shortRowPhrases = _.zip(
      gameFilterParams.splitPhrases || [],
      FilterPresetUtils.getPresetPhrase(gameFilterParams.presetSplit || "??") ||
        []
    ).map((options) => options?.[0] || options?.[1]);
    const filterPhrase = FilterPresetUtils.getPresetFilterPhrase(
      gameFilterParams.presetMode || "??"
    );
    const onOffMode = params.autoOffQuery && !_.isEmpty(params.otherQueries);
    const onKey = shortRowPhrases?.[0] || (onOffMode ? "On" : "A");
    const offKey = shortRowPhrases?.[1] || (onOffMode ? "Off" : "B");

    // Check if a dataset is hidden based on diffsHideDatasets
    const isDatasetHidden = (datasetKey: string): boolean => {
      const diffsHideDatasets = params.diffsHideDatasets;
      if (!params.teamDiffs || !diffsHideDatasets) {
        return false; // No filtering, dataset is visible
      }
      // Parse multi mode
      const isMultiMode = diffsHideDatasets.startsWith("multi:");
      const enabledKeys: string[] = isMultiMode
        ? diffsHideDatasets.slice("multi:".length).split(",").filter(Boolean)
        : [diffsHideDatasets];
      return !enabledKeys.includes(datasetKey);
    };

    return {
      Top: { ref: topRef },
      Teams: { ref: teamAnalysisRef },
      ": [ ": { isLabel: true },
      [onKey]: {
        ref: teamAnalysisRefA,
        offset: 125,
        skip: isDatasetHidden("on"),
      },
      [offKey]: {
        ref: teamAnalysisRefB,
        offset: 75,
        skip:
          isDatasetHidden("off") ||
          (_.isEmpty(params.offQuery) &&
            !params.autoOffQuery &&
            _.isEmpty(params.offQueryFilters)),
      },
      ..._.chain(params.otherQueries || [])
        .map((_, idx) => [
          shortRowPhrases?.[2 + idx] || `${String.fromCharCode(67 + idx)}`,
          {
            ref: teamAnalysisOtherRefs[idx]!,
            offset: 75,
            skip: isDatasetHidden(`extra${idx}`),
          },
        ])
        .fromPairs()
        .value(),
      Diffs: params.teamDiffs
        ? { ref: teamAnalysisRefDiffs, offset: 75 }
        : { skip: true },
      [filterPhrase ? `Base (${filterPhrase})` : "Base"]: {
        ref: teamAnalysisRefBase,
        offset: 75,
        skip: isDatasetHidden("base"),
      },
      " ] | ": { isLabel: true },
      Players: { ref: indivAnalysisRef },
      "Roster Comp.": { ref: lineupComparisonRef },
    };
  };
  const navigationRefs = (params: GameFilterParams) => {
    if (
      (params.teamShotCharts || // Showing extra charts
        params.showTeamPlayTypes ||
        params.showGameInfo ||
        params.showRoster ||
        params.showExtraInfo) &&
      (!_.isEmpty(params.onQuery) || // Have multiple queries
        !_.isEmpty(params.offQuery) ||
        !_.isEmpty(params.onQueryFilters) ||
        !_.isEmpty(params.offQueryFilters) ||
        !_.isEmpty(params.otherQueries))
    ) {
      return complexNavigationsRefs(params);
    } else {
      return simpleNavigationsRefs;
    }
  };

  // Team Stats interface

  const [gaInited, setGaInited] = useState(false);
  const [dataEvent, setDataEvent] = useState({
    teamStats: {
      on: StatModels.emptyTeam(),
      off: StatModels.emptyTeam(),
      baseline: StatModels.emptyTeam(),
      global: StatModels.emptyTeam(),
    } as TeamStatsModel,
    rosterStats: {
      on: [],
      off: [],
      other: [],
      baseline: [],
      global: [],
    } as RosterStatsModel,
    shotStats: {
      on: { off: {}, def: {} },
      off: { off: {}, def: {} },
      baseline: { off: {}, def: {} },
    } as ShotStatsModel,
    lineupStats: [] as LineupStatsModel[],
    playerShotStats: {
      on: {},
      off: {},
      baseline: {},
      other: [],
    } as PlayerShotStatsModel,
  });
  const [rosterCompareStats, setRosterCompareStats] = useState({
    on: {},
    off: {},
    baseline: {},
  } as RosterCompareModel);

  const injectStats = (
    teamStats: TeamStatsModel,
    rosterCompareStats: RosterCompareModel,
    rosterStats: RosterStatsModel,
    shotStats: ShotStatsModel,
    lineupStats: LineupStatsModel[],
    playerShotStats: PlayerShotStatsModel
  ) => {
    setDataEvent({
      teamStats,
      rosterStats,
      shotStats,
      lineupStats,
      playerShotStats,
    });
    setRosterCompareStats(rosterCompareStats);
  };

  // Game and Lineup filters

  const allParams =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? ""
      : window.location.search;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  // Some cache management easter eggs, for development:
  if (allParams.indexOf("__clear_cache__") >= 0) {
    console.log("CLEAR CACHE");
    ClientRequestCache.clearCache();
  }
  if (allParams.indexOf("__clear_history__") >= 0) {
    console.log("CLEAR HISTORY");
    HistoryManager.clearHistory();
  }

  const [gameFilterParams, setGameFilterParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as GameFilterParams
  );
  const gameFilterParamsRef = useRef<GameFilterParams>();
  gameFilterParamsRef.current = gameFilterParams;

  function getRootUrl(params: GameFilterParams) {
    return UrlRouting.getGameUrl(params, {});
  }
  const [shouldForceReload, setShouldForceReload] = useState(0 as number);
  const [shouldReinitFilter, setShouldReinitFilter] = useState(0 as number);
  const [shouldReloadTableParams, setShouldReloadTableParams] = useState(
    0 as number
  );

  const onGameFilterParamsChangeFromTeamStatsTable = (
    rawParams: GameFilterParams
  ) => {
    onGameFilterParamsChange(rawParams, "TeamStatsTable");
  };

  const onGameFilterParamsChangeFromRosterStatsTable = (
    rawParams: GameFilterParams
  ) => {
    onGameFilterParamsChange(rawParams, "RosterStatsTable");
  };

  const onGameFilterParamsChange = (
    rawParams: GameFilterParams,
    source?: "RosterStatsTable" | "TeamStatsTable"
  ) => {
    /** We're going to want to remove the manual options if the year changes */
    const yearTeamGenderChange = (
      rawParams: GameFilterParams,
      currParams: GameFilterParams
    ) => {
      return (
        rawParams.year != currParams.year ||
        rawParams.gender != currParams.gender ||
        rawParams.team != currParams.team
      );
    };

    // Omit all the defaults
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        // TeamStatsTable
        //(manual overrides is an array so is always missing if empty, but we do reset it if the year/team/gender changes)
        yearTeamGenderChange(rawParams, gameFilterParamsRef.current || {})
          ? ["manual"]
          : [],
        _.isEmpty(rawParams.otherQueries || []) ? ["otherQueries"] : [],
        _.isEmpty(rawParams.manual || []) ? ["manual"] : [],
        _.isEqual(rawParams.luck, ParamDefaults.defaultLuckConfig)
          ? ["luck"]
          : [],
        !rawParams.presetMode ||
        rawParams.presetMode == ParamDefaults.defaultPresetMode
          ? ["presetMode"]
          : [],
        !rawParams.presetSplit ||
        rawParams.presetSplit == ParamDefaults.defaultPresetSplit
          ? ["presetSplit"]
          : [],
        !rawParams.advancedMode ? ["advancedMode"] : [],
        !rawParams.onOffLuck ? ["onOffLuck"] : [],
        rawParams.showPlayerOnOffLuckDiags ==
        ParamDefaults.defaultOnOffLuckDiagMode
          ? ["showPlayerOnOffLuckDiags"]
          : [],
        rawParams.showOnOffLuckDiags == ParamDefaults.defaultOnOffLuckDiagMode
          ? ["showOnOffLuckDiags"]
          : [],
        rawParams.teamDiffs == false ? ["teamDiffs"] : [],
        !rawParams.diffsHideDatasets ? ["diffsHideDatasets"] : [],
        !rawParams.diffsCompare ? ["diffsCompare"] : [],
        rawParams.playerDiffs == false ? ["playerDiffs"] : [],
        !rawParams.playerDiffsHideDatasets ? ["playerDiffsHideDatasets"] : [],
        !rawParams.playerDiffsCompare ? ["playerDiffsCompare"] : [],
        !rawParams.diffLock ? ["diffLock"] : [],
        rawParams.showTeamPlayTypes == ParamDefaults.defaultTeamShowPlayTypes
          ? ["showTeamPlayTypes"]
          : [],
        rawParams.teamPlayTypeConfig == ParamDefaults.defaultTeamPlayTypeConfig
          ? ["teamPlayTypeConfig"]
          : [],
        rawParams.teamPlayStyleConfig ==
        ParamDefaults.defaultTeamPlayStyleConfig
          ? ["teamPlayStyleConfig"]
          : [],
        rawParams.showExtraInfo == false ? ["showExtraInfo"] : [],
        rawParams.showRoster == ParamDefaults.defaultTeamShowRoster
          ? ["showRoster"]
          : [],
        rawParams.showGameInfo == ParamDefaults.defaultTeamShowGameInfo
          ? ["showGameInfo"]
          : [],
        !rawParams.teamShotCharts ? ["teamShotCharts"] : [],
        rawParams.teamShotChartsShowZones ==
        ParamDefaults.defaultShotChartShowZones
          ? ["teamShotChartsShowZones"]
          : [],
        !rawParams.teamShotChartsUseEfg ? ["teamShotChartsUseEfg"] : [],
        !rawParams.playerShotCharts ? ["playerShotCharts"] : [],
        rawParams.playerShotChartsShowZones ==
        ParamDefaults.defaultShotChartShowZones
          ? ["playerShotChartsShowZones"]
          : [],
        !rawParams.playerShotChartsUseEfg ? ["playerShotChartsUseEfg"] : [],
        rawParams.showGrades == ParamDefaults.defaultEnabledGrade
          ? ["showGrades"]
          : [],
        // RosterStatsTable
        rawParams.showPlayerGrades == ParamDefaults.defaultEnabledGrade
          ? ["showPlayerGrades"]
          : [],
        rawParams.sortBy == ParamDefaults.defaultPlayerSortBy ? ["sortBy"] : [],
        rawParams.filter == ParamDefaults.defaultPlayerFilter ? ["filter"] : [],
        rawParams.showBase == ParamDefaults.defaultPlayerShowBase
          ? ["showBase"]
          : [],
        rawParams.showExpanded == ParamDefaults.defaultPlayerShowExpanded
          ? ["showExpanded"]
          : [],
        rawParams.stickyQuickToggle ? ["stickyQuickToggle"] : [],
        rawParams.showDiag == ParamDefaults.defaultPlayerDiagMode
          ? ["showDiag"]
          : [],
        rawParams.possAsPct == ParamDefaults.defaultPlayerPossAsPct
          ? ["possAsPct"]
          : [],
        rawParams.factorMins == ParamDefaults.defaultPlayerFactorMins
          ? ["factorMins"]
          : [],
        rawParams.showPosDiag == ParamDefaults.defaultPlayerPosDiagMode
          ? ["showPosDiag"]
          : [],
        rawParams.showPlayerPlayTypes ==
        ParamDefaults.defaultPlayerShowPlayTypes
          ? ["showPlayerPlayTypes"]
          : [],
        rawParams.showPlayerPlayTypesAdjPpp ?? true
          ? ["showPlayerPlayTypesAdjPpp"]
          : [],
        rawParams.showPlayerPlayTypesPlayType ==
        ParamDefaults.defaultPlayerShowPlayTypesPlayType
          ? ["showPlayerPlayTypesPlayType"]
          : [],
        rawParams.showPlayerManual == false ? ["showPlayerManual"] : [],
        rawParams.showOnBallConfig == false ? ["showOnBallConfig"] : [],
        rawParams.calcRapm == ParamDefaults.defaultPlayerCalcRapm
          ? ["calcRapm"]
          : [],
        rawParams.rapmPriorMode == ParamDefaults.defaultTeamReportRapmPriorMode
          ? ["rapmPriorMode"]
          : [],
        rawParams.rapmRegressMode ==
        ParamDefaults.defaultTeamReportRapmRegressMode
          ? ["rapmRegressMode"]
          : [],
        !rawParams.showInfoSubHeader ? ["showInfoSubHeader"] : [],
        // Row display
        !rawParams.basePhrase ? ["basePhrase"] : [],
        !rawParams.baseText ? ["baseText"] : [],
        !rawParams.splitPhrases ? ["splitPhrases"] : [],
        !rawParams.splitText ? ["splitText"] : [],
      ])
    );

    // Because of the clunky way params are handled in the filters / tables, need some complex logic
    // to decide what actually to update:

    const urlUpdateOnlyFieldsFromTeamStats = [
      // Team info:
      "showExtraInfo",
      //(_not_ showTeamPlayTypes because it needs to trigger an update to the GameFilter dropdown)
      "teamPlayTypeConfig",
      //(not showRoster, updates the query)
      //(not showGameInfo, updates the query)
      "showGrades",
      //(not teamShotCharts, updates the query)
      "teamShotChartsShowZones",
      "teamShotChartsUseEfg",
      "showOnOffLuckDiags",
    ].concat(
      params.diffLock
        ? []
        : [
            //(if diffLock is enabled then these need to trigger a change)
            "teamDiffs",
            "diffsHideDatasets",
            "diffsCompare",
          ]
    );
    const urlUpdateOnlyFieldsFromPlayerStats = [
      // Player info:
      "showPlayerGrades",
      //(_not_ manual because it needs to update team stats table)
      "showPlayerManual",
      "showOnBallConfig",
      "showPlayerOnOffLuckDiags",
      //(not showPlayerPlayTypes, because it needs to trigger an update to the GameFilter dropdown)
      "showPlayerPlayTypesPlayType",
      "showPlayerPlayTypesAdjPpp",
      "showInfoSubHeader",
      "filter",
      "sortBy",
      "showBase",
      "showExpanded",
      "showDiags",
      "possAsPct",
      "factorMins",
      "showPosDiag",
      "rapmPriorMode",
      "rapmRegressMode",
      "playerShotChartsShowZones",
      "playerShotChartsUseEfg",
    ].concat(
      params.diffLock
        ? []
        : [
            //(if diffLock is enabled then these need to trigger a change)
            "playerDiffs",
            "playerDiffsHideDatasets",
            "playerDiffsCompare",
          ]
    );
    //(all other luck params are shared)

    // These fields don't trigger a data change or a common param change
    // between the various tables
    const urlUpdateOnlyFields = [
      "advancedMode",
      "presetMode",
      "presetSplit",
      //(note we need to treat changes to splitPhrases, basePhrase etc as triggers, or the rows don't get updated)
    ]
      .concat(urlUpdateOnlyFieldsFromTeamStats)
      .concat(urlUpdateOnlyFieldsFromPlayerStats);

    const removeFieldsToIgnore = (obj: any) => {
      const updatedObj = _.omit(obj, urlUpdateOnlyFields);
      return JSON.parse(JSON.stringify(updatedObj));
    };
    const checkUrlUpdateFields = (obj: any) => {
      const updatedObj = _.pick(obj, urlUpdateOnlyFields);
      return JSON.parse(JSON.stringify(updatedObj));
    };

    // Copy current "URL only" data from other table into new params
    // (since the tables' params are not kept in sync unless a "triggering" change happens)
    if (source == "TeamStatsTable") {
      urlUpdateOnlyFieldsFromPlayerStats.forEach((playerParam) => {
        (params as any)[playerParam] = (gameFilterParamsRef.current as any)?.[
          playerParam
        ];
      });
    }
    if (source == "RosterStatsTable") {
      urlUpdateOnlyFieldsFromTeamStats.forEach((teamParam) => {
        (params as any)[teamParam] = (gameFilterParamsRef.current as any)?.[
          teamParam
        ];
      });
    }

    const cleanedNewParams = removeFieldsToIgnore(params);
    const cleanedCurrParams = removeFieldsToIgnore(gameFilterParamsRef.current);

    // DIAGNOSTICS:
    const isDebug = false;
    if (isDebug) {
      _.keys(removeFieldsToIgnore(params)).forEach((p) => {
        const isEqual = _.isEqual(
          { [p]: (params as any)[p] },
          { [p]: (gameFilterParamsRef.current as any)[p] }
        );
        if (!isEqual)
          console.log(
            `params: ${p}: [${isEqual}] [${(params as any)[p]}] [${
              (gameFilterParamsRef.current as any)[p]
            }]`
          );
      });
      _.keys(removeFieldsToIgnore(gameFilterParamsRef.current)).forEach((p) => {
        const isEqual = _.isEqual(
          { [p]: (params as any)[p] },
          { [p]: (gameFilterParamsRef.current as any)[p] }
        );
        if (!isEqual)
          console.log(
            `gameFilterParamsRef: ${p}: [${isEqual}] [${(params as any)[p]}] [${
              (gameFilterParamsRef.current as any)[p]
            }]`
          );
      });
    }
    if (!_.isEqual(cleanedNewParams, cleanedCurrParams)) {
      //(to avoid recursion)
      // Currently: game info requires an extra possibly expensive query component so we make it on demand only
      if (params.calcRapm != gameFilterParamsRef.current?.calcRapm) {
        setShouldForceReload((t) => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      if (params.showRoster != gameFilterParamsRef.current?.showRoster) {
        setShouldForceReload((t) => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      if (params.showGameInfo != gameFilterParamsRef.current?.showGameInfo) {
        setShouldForceReload((t) => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      if (
        params.teamShotCharts != gameFilterParamsRef.current?.teamShotCharts
      ) {
        setShouldForceReload((t) => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      if (
        params.playerShotCharts != gameFilterParamsRef.current?.playerShotCharts
      ) {
        setShouldForceReload((t) => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      // Force reload when adding defensive stats (requires expensive query)
      if (
        params.teamPlayStyleConfig?.includes("def") &&
        !gameFilterParamsRef.current?.teamPlayStyleConfig?.includes("def")
      ) {
        setShouldForceReload((t) => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }

      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setGameFilterParams(params); //(to ensure the new params are included in links)

      // Because changing the params in one table merges that table's params with the last set
      // when the other table's memo was refreshed, currently we always refresh the memo on both
      // tables whenever any memo changes
      // (note this has to happen _after_ setGameFilterParams to ensure the right properties get set)
      setShouldReloadTableParams((oneUp) => oneUp + 1);
    } else if (
      !_.isEqual(
        checkUrlUpdateFields(params),
        checkUrlUpdateFields(gameFilterParamsRef.current)
      )
    ) {
      // In this case all I want to do is update the URL to save the params

      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setGameFilterParams(params); //(to ensure the new params are included in links)
    }
  };

  // View

  // const indivCardSize = gameFilterParams.showExpanded
  //   ? "medium_screen"
  //   : "wide_screen";
  // (For now just make everything medium screen)
  const indivCardSize = "medium_screen";
  const otherCardSize = "medium_screen";

  function maybeShowQueryDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2020/01/basic-and-advanced-queries-in-hoop.html";
    } else {
      return undefined;
    }
  }
  function maybeShowTeamDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2025/08/team-lineup-stats-table-explanation.html";
    } else {
      return undefined;
    }
  }
  function maybeShowPlayerDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2025/09/individual-stats-table-explanation.html";
    } else {
      return undefined;
    }
  }

  /** Only rebuild the table if the data changes, or if luck changes (see above) */
  const teamStatsTable = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        screenSize={otherCardSize}
        title="Team Analysis"
        helpLink={maybeShowTeamDocs()}
      >
        <TeamStatsTable
          key={shouldReloadTableParams}
          gameFilterParams={gameFilterParams}
          dataEvent={dataEvent}
          onChangeState={onGameFilterParamsChangeFromTeamStatsTable}
          navigationRefs={{
            refA: teamAnalysisRefA,
            refB: teamAnalysisRefB,
            otherRefs: teamAnalysisOtherRefs,
            refBase: teamAnalysisRefBase,
            refDiffs: teamAnalysisRefDiffs,
          }}
        />
      </GenericCollapsibleCard>
    );
  }, [dataEvent, shouldReinitFilter, shouldReloadTableParams]);

  /** Only rebuild the table if the data changes, or if luck changes (see above) */
  const rosterStatsTable = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        screenSize={otherCardSize}
        title="Individual Analysis"
        helpLink={maybeShowPlayerDocs()}
      >
        <RosterStatsTable
          key={shouldReloadTableParams}
          gameFilterParams={gameFilterParams}
          dataEvent={dataEvent}
          onChangeState={onGameFilterParamsChangeFromRosterStatsTable}
        />
      </GenericCollapsibleCard>
    );
  }, [dataEvent, shouldReinitFilter, shouldReloadTableParams]);

  return (
    <Container className={indivCardSize}>
      <SiteModeDropdown />
      <Row ref={topRef} className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Team / Roster Analysis Tool</h3>
        </Col>
      </Row>
      <Row>
        <HeaderBar common={gameFilterParams} thisPage={ParamPrefixes.game} />
      </Row>
      <Row>
        <GenericCollapsibleCard
          minimizeMargin={false}
          screenSize={otherCardSize}
          title="Team and Game Filter"
          summary={HistoryManager.gameFilterSummary(gameFilterParams)}
          helpLink={maybeShowQueryDocs()}
        >
          <GameFilter
            key={shouldReinitFilter}
            propKey={shouldReinitFilter}
            onStats={injectStats}
            startingState={gameFilterParams}
            onChangeState={onGameFilterParamsChange}
            forceReload1Up={shouldForceReload}
            onSwitchToAdvancedMode={(newParams) => {
              // (force reload the state into both GameFilter and CommonFilter)
              setGameFilterParams({
                ...newParams,
              });
              setShouldReinitFilter((t) => t + 1);
            }}
          />
        </GenericCollapsibleCard>
      </Row>
      <InternalNavBarInRow
        refs={navigationRefs(gameFilterParamsRef.current)}
        showAnnotations={true}
      />
      <Row
        style={{
          breakBefore: "page",
        }}
      >
        {teamStatsTable}
      </Row>
      <Row
        style={{
          breakBefore: "page",
        }}
        ref={indivAnalysisRef}
      >
        {rosterStatsTable}
      </Row>
      <Row
        style={{
          breakBefore: "page",
        }}
        ref={lineupComparisonRef}
      >
        <GenericCollapsibleCard
          screenSize={otherCardSize}
          minimizeMargin={false}
          title="Lineup Comparison"
        >
          <RosterCompareTable
            gameFilterParams={gameFilterParams}
            rosterCompareStats={rosterCompareStats}
          />
        </GenericCollapsibleCard>
      </Row>
      <Footer
        year={gameFilterParams.year}
        gender={gameFilterParams.gender}
        server={server}
      />
    </Container>
  );
};
export default OnOffAnalyzerPage;
