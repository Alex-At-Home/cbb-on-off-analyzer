// Google analytics:
import { initGA, logPageView } from '../utils/GoogleAnalytics';

// React imports:
import React, { useState, useEffect } from 'react';
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
import { GameFilterParams, LineupFilterParams } from '../utils/FilterModels';
import TeamStatsTable, { TeamStatsModel } from '../components/TeamStatsTable';
import RosterStatsTable from '../components/RosterStatsTable';
import RosterCompareTable, { RosterCompareModel } from '../components/RosterCompareTable';
import GenericCollapsibleCard from '../components/GenericCollapsibleCard';
import Footer from '../components/Footer';

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import { HistoryManager } from '../utils/HistoryManager';

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
  const [ teamStats, setTeamStats ] = useState({on: {}, off: {}, baseline: {}} as TeamStatsModel);
  const [ rosterCompareStats, setRosterCompareStats ] = useState({on: {}, off: {}, baseline: {}} as RosterCompareModel);

  const injectStats = (teamStats: TeamStatsModel, rosterCompareStats: RosterCompareModel) => {
    setTeamStats(teamStats);
    setRosterCompareStats(rosterCompareStats);
  }

  // Game and Lineup filters

  const allParams = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "" : window.location.search;

  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  const [ gameFilterParams, setGameFilterParams ] = useState(
    UrlRouting.removedSavedKeys(allParams) as GameFilterParams
  )

  const [ savedLineupFilterParams, setSavedLineupFilterParams ] = useState(
    UrlRouting.extractSavedKeys(allParams, UrlRouting.savedLineupSuffix) as LineupFilterParams
  )

  function getRootUrl(params: GameFilterParams) {
    return UrlRouting.getGameUrl(params, savedLineupFilterParams);
  }
  function getLineupUrl() {
    return UrlRouting.getLineupUrl(savedLineupFilterParams, gameFilterParams);
  }

  const onGameFilterParamsChange = (params: GameFilterParams) => {
    const href = getRootUrl(params);
    const as = href;
    Router.push(href, as, { shallow: true })
    UrlRouting.checkForCommonParamChange(params, gameFilterParams,
      [ (params: any) => setSavedLineupFilterParams(params as LineupFilterParams) ]
    );
    setGameFilterParams(params); //(to ensure the new params are included in links)
  }

  // View

  function maybeShowBlog() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return <span className="float-right">
        <a href="https://hoop-explorer.blogspot.com" target="_new">Blog</a>
      </span>;
    }
  }

  return <Container>
    <Row>
      <Col xs={8}>
        <h3>CBB On/Off Analysis Tool <span className="badge badge-pill badge-info">BETA!</span></h3>
      </Col>
      <Col xs={1}>
        { maybeShowBlog() }
      </Col>
      <Col>
        <span className="float-right">
          <span><b>Other Tools: </b></span>
          <Link href={getLineupUrl()}><a>Lineup Analysis</a></Link>
        </span>
      </Col>
    </Row>
    <Row>
      <GenericCollapsibleCard
        title="Team and Game Filter"
        summary={HistoryManager.gameFilterSummary(gameFilterParams)}
      >
        <GameFilter
          onStats={injectStats}
          startingState={gameFilterParams}
          onChangeState={onGameFilterParamsChange}
        />
      </GenericCollapsibleCard>
    </Row>
    <Row>
      <GenericCollapsibleCard title="Team Analysis">
        <TeamStatsTable teamStats={teamStats}/>
      </GenericCollapsibleCard>
    </Row>
    <Row>
      <GenericCollapsibleCard title="Lineup Comparison">
        <RosterCompareTable gameFilterParams={gameFilterParams} rosterCompareStats={rosterCompareStats}/>
      </GenericCollapsibleCard>
    </Row>
    <Row>
      <GenericCollapsibleCard title="Individual Analysis">
        <RosterStatsTable/>
      </GenericCollapsibleCard>
    </Row>
    <Footer year={gameFilterParams.year} gender={gameFilterParams.gender} server={server}/>
  </Container>;
}
export default OnOffAnalyzerPage;
