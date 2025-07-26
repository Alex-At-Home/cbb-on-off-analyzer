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
  OffseasonLeaderboardParams,
  ParamDefaults,
} from "../utils/FilterModels";
import { TeamEditorStatsModel } from "../components/TeamEditorTable";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import Head from "next/head";
import { LeaderboardUtils, TransferModel } from "../utils/LeaderboardUtils";
import OffSeasonLeaderboardTable from "../components/OffseasonLeaderboardTable";
import { DateUtils } from "../utils/DateUtils";
import LandingPageIcon from "../components/shared/LandingPageIcon";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const OffseasonLeaderboardPage: NextPage<Props> = ({ testMode }) => {
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
    players: [],
    confs: [],
    lastUpdated: 0,
  } as TeamEditorStatsModel);
  const [currYear, setCurrYear] = useState("");
  const [currGender, setCurrGender] = useState("");
  const [currEvalMode, setCurrEvalMode] = useState(false);

  // Game filter

  function getRootUrl(params: OffseasonLeaderboardParams) {
    return UrlRouting.getOffseasonLeaderboard(params);
  }

  const [offseasonLeaderboardParams, setOffseasonLeaderboardParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as OffseasonLeaderboardParams
  );
  const offseasonLeaderboardParamsRef = useRef<OffseasonLeaderboardParams>();
  offseasonLeaderboardParamsRef.current = offseasonLeaderboardParams;

  const onOffseasonLeaderboardParamsChange = (
    rawParams: OffseasonLeaderboardParams
  ) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults

        !rawParams.transferInOutMode ? ["transferInOutMode"] : [],
        !rawParams.showAllTeams ? ["showAllTeams"] : [],
        !rawParams.evalMode ? ["evalMode"] : [],
        !rawParams.teamView ? ["teamView"] : [],
        !rawParams.enableNil ? ["enableNil"] : [],
        !rawParams.confs ? ["confs"] : [],
        !rawParams.queryFilters ? ["queryFilters"] : [],
        rawParams.sortBy == "net" ? ["sortBy"] : [],
      ])
    );
    if (!_.isEqual(params, offseasonLeaderboardParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setOffseasonLeaderboardParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    // Process data selection change
    const paramObj = offseasonLeaderboardParams;

    const gender = paramObj.gender || ParamDefaults.defaultGender;
    const fullYear = paramObj.evalMode
      ? paramObj.year || DateUtils.offseasonYear //(first year we can do a review)
      : paramObj.year || DateUtils.offseasonPredictionYear;
    const prevYear = DateUtils.getPrevYear(fullYear);

    const transferYear = fullYear.substring(0, 4);
    const transferYearPrev = prevYear.substring(0, 4);

    const yearWithStats = prevYear;
    const prevYearWithStats = DateUtils.getPrevYear(yearWithStats);
    const transferYears = [transferYear, transferYearPrev];

    if (
      fullYear != currYear ||
      gender != currGender ||
      paramObj.evalMode != currEvalMode
    ) {
      // Only need to do this if the data source has changed
      setCurrYear(fullYear);
      setCurrGender(gender);
      setCurrEvalMode(paramObj.evalMode || false);

      const fetchPlayers = LeaderboardUtils.getMultiYearPlayerLboards(
        "all-lowvol",
        gender,
        yearWithStats,
        "All",
        transferYears,
        paramObj.evalMode ? [fullYear, prevYearWithStats] : [prevYearWithStats]
      );
      const fetchTeamStats = LeaderboardUtils.getMultiYearTeamStats(
        gender,
        yearWithStats,
        "All",
        paramObj.evalMode ? [fullYear] : []
      );
      const fetchAll = Promise.all([fetchPlayers, fetchTeamStats]);

      fetchAll.then((playersTeams: [any[], any[]]) => {
        const jsonsIn = playersTeams[0];
        const teamsIn = playersTeams[1];
        const jsons = _.dropRight(jsonsIn, _.size(transferYears));
        setDataSubEvent({
          players: _.chain(jsons)
            .map(
              (d) =>
                (d.players || []).map((p: any) => {
                  p.tier = d.tier;
                  return p;
                }) || []
            )
            .flatten()
            .value(),
          confs: _.chain(jsons)
            .map((d) => d.confs || [])
            .flatten()
            .uniq()
            .value(),
          teamStats: _.chain(teamsIn)
            .flatMap((d) => d.teams || [])
            .flatten()
            .value(),
          transfers: _.drop(jsonsIn, _.size(jsons)) as Record<
            string,
            Array<TransferModel>
          >[],
          lastUpdated: 0, //TODO use max?
        });
      });
    }
  }, [offseasonLeaderboardParams]);

  // View

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <OffSeasonLeaderboardTable
        startingState={offseasonLeaderboardParamsRef.current || {}}
        dataEvent={dataSubEvent}
        onChangeState={onOffseasonLeaderboardParamsChange}
      />
    );
  }, [dataSubEvent]);

  const gender =
    offseasonLeaderboardParams.gender || ParamDefaults.defaultGender;
  const year =
    offseasonLeaderboardParams.year || DateUtils.mostRecentYearWithLboardData;

  const thumbnailUrl = `${
    server != "localhost" ? `https://${server}` : "http://localhost:3000"
  }/thumbnails/player_leaderboard_thumbnail.png`;
  return (
    <Container>
      <Head>
        <meta property="og:image" content={thumbnailUrl} />
        <meta name="twitter:image" content={thumbnailUrl} />
      </Head>
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Off-Season Leaderboard</h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: currGender,
            year: DateUtils.getLastSeasonWithDataFrom(currYear),
          }}
          thisPage={`${ParamPrefixes.team}_leaderboard`}
        />
      </Row>
      <Row className="mt-3">{table}</Row>
      <Footer year={year} gender={gender} server={server} />
    </Container>
  );
};
export default OffseasonLeaderboardPage;
