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
import TeamReportFilter from '../components/TeamReportFilter';
import { TeamReportFilterParams } from '../utils/FilterModels';
import { HistoryManager } from '../utils/HistoryManager';
import TeamReportStatsTable, { TeamReportStatsModel } from '../components/TeamReportStatsTable';
import GenericCollapsibleCard from '../components/GenericCollapsibleCard';

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import Footer from '../components/Footer';

const TeamReportPage: NextPage<{}> = () => {

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
  const [ teamReportStats, setTeamReportStats ] = useState({} as TeamReportStatsModel);

  const injectStats = (teamReportStats: TeamReportStatsModel) => {
    setTeamReportStats(teamReportStats);
  }

  // Game filter

  const allParams = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "" : window.location.search;

  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  const [ teamReportFilterParams, setTeamReportFilterParams ] = useState(
    UrlRouting.removedSavedKeys(allParams) as TeamReportFilterParams
  )

  function getRootUrl(params: TeamReportFilterParams) {
    return UrlRouting.getTeamReportUrl(params);
  }

  const onTeamReportFilterParamsChange = (params: TeamReportFilterParams) => {
    const href = getRootUrl(params);
    const as = href;
    Router.push(href, as, { shallow: true });
    setTeamReportFilterParams(params); // (to ensure the new params are included in links)
  }

  // View

  function maybeShowBlog() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return <span className="float-right">
        <a href="https://hoop-explorer.blogspot.com" target="_new">Blog</a>
      </span>;
    }
  }
  //TODO: get referer?
  //TODO: summary

  return <Container>
    <Row>
    <Col xs={8}>
      <h3>CBB Lineup Analysis Tool <span className="badge badge-pill badge-info">BETA!</span></h3>
    </Col>
    <Col xs={1}>
      { maybeShowBlog() }
    </Col>
    <Col>
      <span className="float-right">
        <Link href={"#"}><a>Back to On/Off Analysis</a></Link>
      </span>
    </Col>
    </Row>
    <Row>
      <GenericCollapsibleCard
        title="Team Report Filter"
        summary={HistoryManager.lineupFilterSummary({})}
      >
        <TeamReportFilter
          onStats={injectStats}
          startingState={teamReportFilterParams}
          onChangeState={onTeamReportFilterParamsChange}
        />
      </GenericCollapsibleCard>
    </Row>
    <Row>
      <GenericCollapsibleCard title="Team Analysis">
        <TeamReportStatsTable
          teamReport={teamReportStats}
          startingState={teamReportFilterParams}
          onChangeState={onTeamReportFilterParamsChange}
        />
      </GenericCollapsibleCard>
    </Row>
    <Footer year={teamReportFilterParams.year} gender={teamReportFilterParams.gender} server={server}/>
  </Container>;
}
export default TeamReportPage;
