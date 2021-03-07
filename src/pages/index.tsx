// Google analytics:
import { initGA, logPageView } from '../utils/GoogleAnalytics';

// React imports:
import React, { useState, useEffect, useRef } from 'react';
import Router, { useRouter } from 'next/router';
import Link from 'next/link';

// Next imports:
import { NextPage } from 'next';

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// App components:
import GameFilter from '../components/GameFilter';
import { ParamDefaults, ParamPrefixes, GameFilterParams, LineupFilterParams } from '../utils/FilterModels';
import TeamStatsTable, { TeamStatsModel } from '../components/TeamStatsTable';
import RosterStatsTable, { RosterStatsModel } from '../components/RosterStatsTable';
import { LineupStatsModel } from '../components/LineupStatsTable';
import RosterCompareTable, { RosterCompareModel } from '../components/RosterCompareTable';
import GenericCollapsibleCard from '../components/shared/GenericCollapsibleCard';
import Footer from '../components/shared/Footer';
import HeaderBar from '../components/shared/HeaderBar';

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import { HistoryManager } from '../utils/HistoryManager';
import { ClientRequestCache } from '../utils/ClientRequestCache';

const OnOffAnalyzerPage: NextPage<{}> = () => {

  useEffect(() => { // Set up GA
    if ((process.env.NODE_ENV === 'production') && (typeof window !== undefined)) {
      if (!gaInited) {
        initGA();
        setGaInited(true);
      }
      logPageView();
    }
  }); //(on any change to the DOM)

  // Team Stats interface

  const [ gaInited, setGaInited ] = useState(false);
  const [ dataEvent, setDataEvent ] = useState({
    teamStats: {on: {}, off: {}, baseline: {}} as TeamStatsModel,
    rosterStats: {on: [], off: [], baseline: []} as RosterStatsModel,
    lineupStats: [] as LineupStatsModel[]
  });
  const [ rosterCompareStats, setRosterCompareStats ] = useState({on: {}, off: {}, baseline: {}} as RosterCompareModel);

  const injectStats = (
    teamStats: TeamStatsModel, rosterCompareStats: RosterCompareModel, rosterStats: RosterStatsModel, lineupStats: LineupStatsModel[]
  ) => {
    setDataEvent({teamStats, rosterStats, lineupStats});
    setRosterCompareStats(rosterCompareStats);
  }

  // Game and Lineup filters

  const allParams = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "" : window.location.search;

  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  // Some cache management easter eggs, for development:
  if (allParams.indexOf("__clear_cache__") >= 0) {
    console.log("CLEAR CACHE");
    ClientRequestCache.clearCache();
  }
  if (allParams.indexOf("__clear_history__") >= 0) {
    console.log("CLEAR HISTORY");
    HistoryManager.clearHistory();
  }

  const [ gameFilterParams, setGameFilterParams ] = useState(
    UrlRouting.removedSavedKeys(allParams) as GameFilterParams
  )
  const gameFilterParamsRef = useRef<GameFilterParams>();
  gameFilterParamsRef.current = gameFilterParams;

  function getRootUrl(params: GameFilterParams) {
    return UrlRouting.getGameUrl(params, {});
  }
  const [ shouldForceReload, setShouldForceReload ] = useState(0 as number);

  const onGameFilterParamsChange = (rawParams: GameFilterParams) => {
    /** We're going to want to remove the manual options if the year changes */
    const yearTeamGenderChange = (rawParams: GameFilterParams, currParams: GameFilterParams) => {
      return (rawParams.year != currParams.year) ||
              (rawParams.gender != currParams.gender) ||
              (rawParams.team != currParams.team);
    }

    // Omit all the defaults
    const params = _.omit(rawParams, _.flatten([ // omit all defaults
      // TeamStatsTable
      //(manual overrides is an array so is always missing if empty, but we do reset it if the year/team/gender changes)
      yearTeamGenderChange(rawParams, gameFilterParamsRef.current || {}) ? [ 'manual' ] : [],
      _.isEqual(rawParams.luck, ParamDefaults.defaultLuckConfig) ? [ 'luck' ] : [],
      !rawParams.onOffLuck ? [ 'onOffLuck' ] : [],
      (rawParams.showPlayerOnOffLuckDiags == ParamDefaults.defaultOnOffLuckDiagMode) ? [ 'showPlayerOnOffLuckDiags' ] : [],
      (rawParams.showOnOffLuckDiags == ParamDefaults.defaultOnOffLuckDiagMode) ? [ 'showOnOffLuckDiags' ] : [],
      (rawParams.teamDiffs == false) ? [ 'teamDiffs' ] : [],
      (rawParams.showTeamPlayTypes == ParamDefaults.defaultTeamShowPlayTypes) ? [ 'showTeamPlayTypes' ] : [],
      (rawParams.showLineups == ParamDefaults.defaultTeamShowLineups) ? [ 'showLineups' ] : [],
      // RosterStatsTable
      (rawParams.sortBy == ParamDefaults.defaultPlayerSortBy) ? [ 'sortBy' ] : [],
      (rawParams.filter == ParamDefaults.defaultPlayerFilter) ? [ 'filter' ] : [],
      (rawParams.showBase == ParamDefaults.defaultPlayerShowBase) ? [ 'showBase' ] : [],
      (rawParams.showExpanded == ParamDefaults.defaultPlayerShowExpanded) ? [ 'showExpanded' ] : [],
      (rawParams.showDiag == ParamDefaults.defaultPlayerDiagMode) ? [ 'showDiag' ] : [],
      (rawParams.possAsPct == ParamDefaults.defaultPlayerPossAsPct) ? [ 'possAsPct' ] : [],
      (rawParams.factorMins == ParamDefaults.defaultPlayerFactorMins) ? [ 'factorMins' ] : [],
      (rawParams.showPosDiag == ParamDefaults.defaultPlayerPosDiagMode) ? [ 'showPosDiag' ] : [],
      (rawParams.showPlayerPlayTypes == ParamDefaults.defaultPlayerShowPlayTypes) ? [ 'showPlayerPlayTypes' ] : [],
      (rawParams.showPlayerManual == false) ? [ 'showPlayerManual' ] : [],
      (rawParams.calcRapm == ParamDefaults.defaultPlayerCalcRapm) ? [ 'calcRapm' ] : [],
    ]));
    if (!_.isEqual(params, gameFilterParamsRef.current)) { //(to avoid recursion)
      // Currently: game info requires an extra possibly expensive query component so we make it on demand only
      if (params.calcRapm != gameFilterParamsRef.current?.calcRapm) {
        setShouldForceReload(t => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      if (params.showLineups != gameFilterParamsRef.current?.showLineups) {
        setShouldForceReload(t => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      // Because changing the params in one table merges that table's params with the last set
      // when the other table's memo was refreshed, currently we to always refresh the memo on both
      // tables whenever any memo changes
      // TODO: of course this can be done much more elegantly/efficiently
      setDataEvent(d => { return  { ...d } }); //(leave data unchanged but fool the useMemo below)

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
  }

  // View

  function maybeShowDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2019/11/fun-with-college-basketball-onoff.html";
    } else {
      return undefined;
    }
  }

  /** Only rebuild the table if the data changes, or if luck changes (see above) */
  const teamStatsTable = React.useMemo(() => {
    return <GenericCollapsibleCard minimizeMargin={true} title="Team Analysis" helpLink={maybeShowDocs()}>
      <TeamStatsTable
        gameFilterParams={gameFilterParams}
        dataEvent={dataEvent}
        onChangeState={onGameFilterParamsChange}
      />
    </GenericCollapsibleCard>
  }, [ dataEvent ]);

  /** Only rebuild the table if the data changes, or if luck changes (see above) */
  const rosterStatsTable = React.useMemo(() => {
    return  <GenericCollapsibleCard minimizeMargin={true} title="Individual Analysis" helpLink={maybeShowDocs()}>
      <RosterStatsTable
        gameFilterParams={gameFilterParams}
        dataEvent={dataEvent}
        onChangeState={onGameFilterParamsChange}
      />
    </GenericCollapsibleCard>
  }, [ dataEvent ]);

  return <Container>
    <Row>
      <Col xs={12} className="text-center">
        <h3>CBB On/Off Analysis Tool <span className="badge badge-pill badge-info">BETA!</span></h3>
      </Col>
    </Row>
    <Row>
      <HeaderBar
        common={gameFilterParams}
        thisPage={ParamPrefixes.game}
        />
    </Row>
    <Row>
      <GenericCollapsibleCard
        minimizeMargin={false}
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
    <Row>
      {teamStatsTable}
    </Row>
    <Row>
      {rosterStatsTable}
    </Row>
    <Row>
      <GenericCollapsibleCard minimizeMargin={false} title="Lineup Comparison" helpLink={maybeShowDocs()}>
        <RosterCompareTable
          gameFilterParams={gameFilterParams}
          rosterCompareStats={rosterCompareStats}
        />
      </GenericCollapsibleCard>
    </Row>
    <Footer year={gameFilterParams.year} gender={gameFilterParams.gender} server={server}/>
  </Container>;
}
export default OnOffAnalyzerPage;
