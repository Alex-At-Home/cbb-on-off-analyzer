// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
import Router, { useRouter } from "next/router";
import Link from "next/link";

// Next imports:
import { NextPage } from "next";
import Head from "next/head";
import fetch from "isomorphic-unfetch";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// App components:
import {
  ParamPrefixes,
  TeamLeaderboardParams,
  ParamDefaults,
  GameFilterParams,
  OffseasonLeaderboardParams,
} from "../utils/FilterModels";
import { HistoryManager } from "../utils/HistoryManager";
import TeamLeaderboardTable, {
  TeamLeaderboardStatsModel,
} from "../components/TeamLeaderboardTable";
import GenericCollapsibleCard from "../components/shared/GenericCollapsibleCard";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { LeaderboardUtils } from "../utils/LeaderboardUtils";
import { DateUtils } from "../utils/DateUtils";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const TeamLeaderboardPage: NextPage<Props> = ({ testMode }) => {
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

  // "/" used to be OnOffAnalyzer, but now it's team leaderboard ... handle redirecting old links
  if (allParams.indexOf("team=") >= 0) {
    console.log(`(redirecting old link [${allParams}]`);
    const newUrl = UrlRouting.getGameUrl(
      UrlRouting.removedSavedKeys(allParams) as GameFilterParams,
      {}
    );
    if (typeof window !== `undefined`) window.location.href = newUrl;
    return <span>(redirecting old link)</span>;
  }

  if (
    !testMode &&
    DateUtils.frontPageIsOffseasonLeaderboard && //(this is manually set/unset to give some latitude)
    (allParams.indexOf(
      `year=${DateUtils.offseasonPredictionYear.substring(0, 4)}`
    ) >= 0 ||
      allParams.indexOf("year=") < 0)
  ) {
    const newUrl = UrlRouting.getOffseasonLeaderboard(
      DateUtils.showOffseasonMetrics
        ? ({
            transferInOutMode: true,
          } as OffseasonLeaderboardParams)
        : {}
    );
    if (typeof window !== `undefined`) window.location.href = newUrl;

    return (
      <Container>
        <Row className="mt-3 mb-3">
          <Col xs={12} className="text-center">
            <span>
              <i>(Retrieving Offseason Predictions...)</i>
            </span>
          </Col>
        </Row>
      </Container>
    );
  }

  // Team Stats interface

  const dataEventInit = {
    all: { players: [] as any[], confs: [] as string[], lastUpdated: 0 },
    t100: { players: [] as any[], confs: [] as string[], lastUpdated: 0 },
    conf: { players: [] as any[], confs: [] as string[], lastUpdated: 0 },
  };

  const [gaInited, setGaInited] = useState(false);
  const [dataEvent, setDataEvent] = useState(dataEventInit);
  const [dataSubEvent, setDataSubEvent] = useState({
    teams: [],
    confs: [],
    lastUpdated: 0,
  } as TeamLeaderboardStatsModel);
  const [currYear, setCurrYear] = useState(
    ParamDefaults.defaultYear //(don't use leaderboard year, we have team info immediately)
  );
  const [currGender, setCurrGender] = useState("Men");

  // Game filter

  function getRootUrl(params: TeamLeaderboardParams) {
    return UrlRouting.getTeamLeaderboardUrl(params);
  }

  const [teamLeaderboardParams, setTeamLeaderboardParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as TeamLeaderboardParams
  );
  const TeamLeaderboardParamsRef = useRef<TeamLeaderboardParams>();
  TeamLeaderboardParamsRef.current = teamLeaderboardParams;

  const onTeamLeaderboardParamsChange = (rawParams: TeamLeaderboardParams) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        !rawParams.conf ? ["conf"] : [],

        rawParams.qualityWeight == ParamDefaults.defaultTeamLboardQualityWeight
          ? [`qualityWeight`]
          : [],
        rawParams.wabWeight == ParamDefaults.defaultTeamLboardWabWeight
          ? [`wabWeight`]
          : [],
        rawParams.waeWeight == ParamDefaults.defaultTeamLboardWaeWeight
          ? [`waeWeight`]
          : [],
        rawParams.domWeight == ParamDefaults.defaultTeamLboardDomWeight
          ? [`domWeight`]
          : [],
        rawParams.timeWeight == ParamDefaults.defaultTeamLboardTimeWeight
          ? [`timeWeight`]
          : [],

        rawParams.qualityWeight == rawParams.pinQualityWeight
          ? [`pinQualityWeight`]
          : [],
        rawParams.wabWeight == rawParams.pinWabWeight ? [`pinWabWeight`] : [],
        rawParams.waeWeight == rawParams.pinWaeWeight ? [`pinWaeWeight`] : [],
        rawParams.domWeight == rawParams.pinDomWeight ? [`pinDomWeight`] : [],
        rawParams.timeWeight == rawParams.pinTimeWeight
          ? [`pinTimeWeight`]
          : [],
      ])
    );

    if (
      rawParams.year == DateUtils.offseasonPredictionYear &&
      !DateUtils.seasonNotFinished[rawParams.year]
    ) {
      //Switch to off-season predictions
      const newUrl = UrlRouting.getOffseasonLeaderboard({});
      if (typeof window !== `undefined`) window.location.href = newUrl;
    } else if (!_.isEqual(params, TeamLeaderboardParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setTeamLeaderboardParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    // Process data selection change
    const paramObj = teamLeaderboardParams;
    const dataSubEventKey = "all";

    const gender = paramObj.gender || ParamDefaults.defaultGender;
    const fullYear = paramObj.year || ParamDefaults.defaultYear; //(get teams immediately, no need for full year)
    const year = fullYear.substring(0, 4);
    const tier: string = "All"; //(paramObj.tier || "All"); //(in this page, tier is really a diag param)

    if (year == "All" || tier == "All") {
      //TODO: tidy this up
      setDataEvent(dataEventInit); //(clear saved sub-events)

      const years = _.filter(
        DateUtils.coreYears,
        (inYear) => year == "All" || inYear == fullYear
      );
      const tiers = _.filter(
        ["High", "Medium", "Low"],
        (inTier) => tier == "All" || inTier == tier
      );

      const yearsAndTiers = _.flatMap(years, (inYear) =>
        tiers.map((inTier) => [inYear, inTier])
      );

      const fetchAll = Promise.all(
        yearsAndTiers.map(([inYear, inTier]) => {
          const subYear = inYear.substring(0, 4);
          return fetch(
            LeaderboardUtils.getTeamUrl(
              dataSubEventKey,
              gender,
              subYear,
              inTier
            )
          ).then((response: fetch.IsomorphicResponse) => {
            return response.ok
              ? response.json().then((j: any) => {
                  //(tag the tier in)
                  if (tier == "All") j.tier = inTier;
                  return j;
                })
              : Promise.resolve({ error: "No data available" });
          });
        })
      );
      fetchAll.then((jsons: any[]) => {
        setDataSubEvent({
          year: fullYear,
          gender: gender,
          teams: _.chain(jsons)
            .map((d) => d.teams || [])
            .flatten()
            .value(),
          confs: _.chain(jsons)
            .map((d) => d.confs || [])
            .flatten()
            .uniq()
            .value(),
          bubbleOffense: _.chain(jsons)
            .take(1)
            .map((d) => d.bubbleOffense || [])
            .flatten()
            .value(),
          bubbleDefense: _.chain(jsons)
            .take(1)
            .map((d) => d.bubbleDefense || [])
            .flatten()
            .value(),
          lastUpdated: _.chain(jsons)
            .map((d) => d.lastUpdated)
            .max()
            .value(),
        });
      });
    } else {
      if (
        !dataEvent[dataSubEventKey]?.players?.length ||
        currYear != fullYear ||
        currGender != gender
      ) {
        const oldCurrYear = currYear;
        const oldCurrGender = currGender;
        setCurrYear(fullYear);
        setCurrGender(gender);
        setDataSubEvent({ teams: [], confs: [], lastUpdated: 0 }); //(set the spinner off)
        fetch(
          LeaderboardUtils.getTeamUrl(dataSubEventKey, gender, year, tier)
        ).then((response: fetch.IsomorphicResponse) => {
          return (
            response.ok
              ? response.json()
              : Promise.resolve({ error: "No data available" })
          ).then((json: any) => {
            //(if year has changed then clear saved data events)
            setDataEvent({
              ...(oldCurrYear != year ? dataEventInit : dataEvent),
              [dataSubEventKey]: json,
            });
            setDataSubEvent(json);
          });
        });
      } else if (dataSubEvent != dataEvent[dataSubEventKey]) {
        setDataSubEvent(dataEvent[dataSubEventKey]);
      }
    }
  }, [teamLeaderboardParams]);

  // View

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <TeamLeaderboardTable
        startingState={TeamLeaderboardParamsRef.current || {}}
        dataEvent={dataSubEvent}
        onChangeState={onTeamLeaderboardParamsChange}
      />
    );
  }, [dataSubEvent]);

  const thumbnailUrl = `${
    server != "localhost" ? `https://${server}` : "http://localhost:3000"
  }/thumbnails/team_leaderboard_thumbnail.png`;
  return (
    <Container>
      <SiteModeDropdown />
      <Head>
        <meta property="og:image" content={thumbnailUrl} />
        <meta name="twitter:image" content={thumbnailUrl} />
      </Head>
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Build Your Own T25!</h3>
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
      <Footer
        dateOverride={dataEvent.all?.lastUpdated}
        year={teamLeaderboardParams.year}
        gender={teamLeaderboardParams.gender}
        server={server}
      />
    </Container>
  );
};
export default TeamLeaderboardPage;
