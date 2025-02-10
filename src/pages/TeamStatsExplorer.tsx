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
import {
  ParamPrefixes,
  TeamStatsExplorerParams,
  ParamDefaults,
} from "../utils/FilterModels";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import Head from "next/head";
import { DateUtils } from "../utils/DateUtils";
import { LeaderboardUtils } from "../utils/LeaderboardUtils";
import TeamStatsExplorerTable, {
  TeamStatsExplorerModel,
} from "../components/TeamStatsExplorerTable";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const TeamStatsExplorerPage: NextPage<Props> = ({ testMode }) => {
  const isServer = () => typeof window === `undefined`;
  if (isServer() && !testMode) return null; //(don't render server-side)

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

  const allParams =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? ""
      : window.location.search;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  // Team Stats interface

  const [gaInited, setGaInited] = useState(false);
  const [dataSubEvent, setDataSubEvent] = useState({
    confs: [],
    teams: [],
    bubbleOffenses: {},
    bubbleDefenses: {},
    lastUpdated: 0,
  } as TeamStatsExplorerModel);
  const [currYear, setCurrYear] = useState("");
  const [currGender, setCurrGender] = useState("");

  // Game filter

  function getRootUrl(params: TeamStatsExplorerParams) {
    return UrlRouting.getTeamStatsExplorer(params);
  }

  const [teamStatsExplorerParams, setTeamStatsExplorerParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as TeamStatsExplorerParams
  );
  const teamStatsExplorerParamsRef = useRef<TeamStatsExplorerParams>();
  teamStatsExplorerParamsRef.current = teamStatsExplorerParams;

  const teamStatsExplorerParamsChange = (
    rawParams: TeamStatsExplorerParams
  ) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        !rawParams.confs ? ["confs"] : [],
        !rawParams.queryFilters ? ["queryFilters"] : [],
        rawParams.sortBy == "net" ? ["sortBy"] : [],
        rawParams.maxTableSize == ParamDefaults.defaultTeamExplorerMaxTableSize
          ? ["maxTableSize"]
          : [],
        !rawParams.showExtraInfo ? ["showExtraInfo"] : [],
        !rawParams.showPlayStyles ? ["showPlayStyles"] : [],
        !rawParams.showGrades ? ["showGrades"] : [],
        _.isNil(rawParams.showAdvancedFilter) || rawParams.showAdvancedFilter
          ? ["showAdvancedFilter"]
          : [], //(true by default)
      ])
    );
    if (!_.isEqual(params, teamStatsExplorerParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setTeamStatsExplorerParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    // Process data selection change
    const paramObj = teamStatsExplorerParams;

    const gender = paramObj.gender || ParamDefaults.defaultGender;
    const fullYear = paramObj.year || DateUtils.mostRecentYearWithLboardData;

    if (fullYear != currYear || gender != currGender) {
      // Only need to do this if the data source has changed
      setCurrYear(fullYear);
      setCurrGender(gender);

      const fetchTeamStats = LeaderboardUtils.getMultiYearTeamDetails(
        gender,
        fullYear, //(can be All)
        "All",
        []
      );

      fetchTeamStats.then((seasons: any[]) => {
        setDataSubEvent({
          bubbleOffenses: _.chain(seasons)
            .flatMap((season) => {
              const year = season.teams?.[0]?.year;
              return year ? [[year, season.bubbleOffense]] : [];
            })
            .fromPairs()
            .value(),
          bubbleDefenses: _.chain(seasons)
            .flatMap((season) => {
              const year = season.teams?.[0]?.year;
              return year ? [[year, season.bubbleDefense]] : [];
            })
            .fromPairs()
            .value(),
          confs: _.chain(seasons)
            .map((d) => d.confs || [])
            .flatten()
            .uniq()
            .value(),
          teams: _.chain(seasons)
            .flatMap((d) => d.teams || [])
            .flatten()
            .value(),
          lastUpdated: _.maxBy(seasons, (seasons) => seasons.lastUpdated || 0),
        });
      });
    }
  }, [teamStatsExplorerParams]);

  // View

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <TeamStatsExplorerTable
        startingState={teamStatsExplorerParams}
        dataEvent={dataSubEvent}
        onChangeState={teamStatsExplorerParamsChange}
      />
    );
  }, [dataSubEvent]);

  const gender = teamStatsExplorerParams.gender || ParamDefaults.defaultGender;
  const year =
    teamStatsExplorerParams.year || DateUtils.mostRecentYearWithLboardData;

  const thumbnailUrl = `${
    server != "localhost" ? `https://${server}` : "http://localhost:3000"
  }/thumbnails/player_leaderboard_thumbnail.png`;
  return (
    <Container>
      <Head>
        <meta property="og:image" content={thumbnailUrl} />
        <meta name="twitter:image" content={thumbnailUrl} />
      </Head>
      <Row>
        <Col xs={12} className="text-center">
          <h3>
            Team Stats Explorer{" "}
            <span className="badge badge-pill badge-info">IN DEV!</span>
          </h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: currGender,
            year: DateUtils.getLastSeasonWithDataFrom(currYear),
          }}
          thisPage={`${ParamPrefixes.team}_statsExplorer`}
        />
      </Row>
      <Row className="mt-3">{table}</Row>
      <Footer year={year} gender={gender} server={server} />
    </Container>
  );
};
export default TeamStatsExplorerPage;
