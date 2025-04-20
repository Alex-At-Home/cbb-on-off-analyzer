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
import { StatModels, ShotStatsModel } from "../utils/StatModels";
import { UrlRouting } from "../utils/UrlRouting";
import { HistoryManager } from "../utils/HistoryManager";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import InternalNavBarInRow from "../components/shared/InternalNavBarInRow";
import { sk } from "date-fns/locale";
import { screen } from "@testing-library/react";

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
    const onOffMode = params.autoOffQuery && !_.isEmpty(params.otherQueries);
    const onKey = onOffMode ? "On" : "A";
    const offKey = onOffMode ? "Off" : "B";
    return {
      Top: { ref: topRef },
      Teams: { ref: teamAnalysisRef },
      ": [ ": { isLabel: true },
      [onKey]: { ref: teamAnalysisRefA, offset: 125 },
      [offKey]: {
        ref: teamAnalysisRefB,
        offset: 75,
        skip:
          _.isEmpty(params.offQuery) &&
          !params.autoOffQuery &&
          _.isEmpty(params.offQueryFilters),
      },
      ..._.chain(params.otherQueries || [])
        .map((_, idx) => [
          `${String.fromCharCode(67 + idx)}`,
          {
            ref: teamAnalysisOtherRefs[idx]!,
            offset: 75,
          },
        ])
        .fromPairs()
        .value(),
      Diffs: params.teamDiffs
        ? { ref: teamAnalysisRefDiffs, offset: 75 }
        : { skip: true },
      Base: { ref: teamAnalysisRefBase, offset: 75 },
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
    lineupStats: LineupStatsModel[]
  ) => {
    setDataEvent({ teamStats, rosterStats, shotStats, lineupStats });
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

  const onGameFilterParamsChange = (rawParams: GameFilterParams) => {
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
        _.isEqual(rawParams.luck, ParamDefaults.defaultLuckConfig)
          ? ["luck"]
          : [],
        !rawParams.onOffLuck ? ["onOffLuck"] : [],
        rawParams.showPlayerOnOffLuckDiags ==
        ParamDefaults.defaultOnOffLuckDiagMode
          ? ["showPlayerOnOffLuckDiags"]
          : [],
        rawParams.showOnOffLuckDiags == ParamDefaults.defaultOnOffLuckDiagMode
          ? ["showOnOffLuckDiags"]
          : [],
        rawParams.teamDiffs == false ? ["teamDiffs"] : [],
        rawParams.showTeamPlayTypes == ParamDefaults.defaultTeamShowPlayTypes
          ? ["showTeamPlayTypes"]
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
        rawParams.showGrades == "" ? ["showGrades"] : [],
        // RosterStatsTable
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
      ])
    );
    if (!_.isEqual(params, gameFilterParamsRef.current)) {
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
      // Because changing the params in one table merges that table's params with the last set
      // when the other table's memo was refreshed, currently we to always refresh the memo on both
      // tables whenever any memo changes
      // TODO: of course this can be done much more elegantly/efficiently
      setDataEvent((d) => {
        return { ...d };
      }); //(leave data unchanged but fool the useMemo below)

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

  function maybeShowDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2019/11/fun-with-college-basketball-onoff.html";
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
        helpLink={maybeShowDocs()}
      >
        <TeamStatsTable
          gameFilterParams={gameFilterParams}
          dataEvent={dataEvent}
          onChangeState={onGameFilterParamsChange}
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
  }, [dataEvent]);

  /** Only rebuild the table if the data changes, or if luck changes (see above) */
  const rosterStatsTable = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        screenSize={otherCardSize}
        title="Individual Analysis"
        helpLink={maybeShowDocs()}
      >
        <RosterStatsTable
          gameFilterParams={gameFilterParams}
          dataEvent={dataEvent}
          onChangeState={onGameFilterParamsChange}
        />
      </GenericCollapsibleCard>
    );
  }, [dataEvent]);

  return (
    <Container className={indivCardSize}>
      <Row ref={topRef}>
        <Col xs={12} className="text-center">
          <h3>
            CBB On/Off Analysis Tool{" "}
            <span className="badge badge-pill badge-info">BETA!</span>
          </h3>
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
        >
          <GameFilter
            onStats={injectStats}
            startingState={gameFilterParams}
            onChangeState={onGameFilterParamsChange}
            forceReload1Up={shouldForceReload}
          />
        </GenericCollapsibleCard>
      </Row>
      <InternalNavBarInRow refs={navigationRefs(gameFilterParamsRef.current)} />
      <Row ref={teamAnalysisRef}>{teamStatsTable}</Row>
      <Row ref={indivAnalysisRef}>{rosterStatsTable}</Row>
      <Row ref={lineupComparisonRef}>
        <GenericCollapsibleCard
          screenSize={otherCardSize}
          minimizeMargin={false}
          title="Lineup Comparison"
          helpLink={maybeShowDocs()}
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
