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
  TeamEditorParams,
  ParamDefaults,
} from "../utils/FilterModels";
import TeamEditorTable, {
  TeamEditorStatsModel,
} from "../components/TeamEditorTable";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import Head from "next/head";
import { LeaderboardUtils, TransferModel } from "../utils/LeaderboardUtils";
import { DateUtils } from "../utils/DateUtils";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const TeamEditorPage: NextPage<Props> = ({ testMode }) => {
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
  const [currEvalMode, setCurrEvalMode] = useState(
    undefined as undefined | boolean
  );
  const [currOffSeasonMode, setCurrOffSeasonMode] = useState(
    undefined as undefined | boolean
  );

  // Game filter

  function getRootUrl(params: TeamEditorParams) {
    return UrlRouting.getTeamEditorUrl(params);
  }

  const [teamEditorParams, setTeamEditorParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as TeamEditorParams
  );
  const teamEditorParamsRef = useRef<TeamEditorParams>();
  teamEditorParamsRef.current = teamEditorParams;

  const onTeamEditorParamsChange = (rawParams: TeamEditorParams) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults

        // Team Editor params

        _.isNil(rawParams.offSeason) || rawParams.offSeason
          ? ["offSeason"]
          : [],
        !rawParams.evalMode ? ["evalMode"] : [],
        !rawParams.showPrevSeasons ? ["showPrevSeasons"] : [],
        !rawParams.factorMins ? ["factorMins"] : [],
        !rawParams.alwaysShowBench ? ["alwaysShowBench"] : [],
        !rawParams.superSeniorsBack ? ["superSeniorsBack"] : [],
        !rawParams.enableNil ? ["enableNil"] : [],
        !rawParams.showGrades ? ["showGrades"] : [],

        !rawParams.allEditOpen ? ["allEditOpen"] : [],
        //(currently not used anywhere - will leave for now and decided whether to remove after more play testing)

        !rawParams.deletedPlayers ? ["deletedPlayers"] : [],
        !rawParams.disabledPlayers ? ["disabledPlayers"] : [],
        !rawParams.addedPlayers ? ["addedPlayers"] : [],
        !rawParams.editOpen ? ["editOpen"] : [],
        !rawParams.overrides ? ["overrides"] : [],

        // Controls which players are visible in the "Add To Players"
        _.isNil(rawParams.showOnlyCurrentYear) || rawParams.showOnlyCurrentYear
          ? ["showOnlyCurrentYear"]
          : [],
        _.isNil(rawParams.showOnlyTransfers) || rawParams.showOnlyTransfers
          ? ["showOnlyTransfers"]
          : [],

        // "Add players from leaderboard" params

        rawParams.tier == "All" ? ["tier"] : [],
        !rawParams.filter ? ["filter"] : [],
        !rawParams.advancedFilter ? ["advancedFilter"] : [],
        !rawParams.conf ? ["conf"] : [], //(unused now)
        !rawParams.posClasses ? ["posClasses"] : [],

        //These aren't plumbed in:
        !rawParams.t100 ? ["t100"] : [], //(TODO these 2 don't work)
        !rawParams.confOnly ? ["confOnly"] : [],
        !rawParams.shotCharts ? ["shotCharts"] : [],

        rawParams.useRapm == ParamDefaults.defaultPlayerLboardUseRapm
          ? ["useRapm"]
          : [],
        rawParams.factorMins == ParamDefaults.defaultPlayerLboardFactorMins
          ? ["factorMins"]
          : [],
        rawParams.possAsPct == ParamDefaults.defaultPlayerLboardPossAsPct
          ? ["possAsPct"]
          : [],

        !rawParams.showInfoSubHeader ? ["showInfoSubHeader"] : [],
        rawParams.stickyQuickToggle ? ["stickyQuickToggle"] : [],

        rawParams.minPoss == ParamDefaults.defaultPlayerLboardMinPos
          ? ["minPoss"]
          : [],
        rawParams.maxTableSize == ParamDefaults.defaultPlayerLboardMaxTableSize
          ? ["maxTableSize"]
          : [],
        rawParams.sortBy ==
        ParamDefaults.defaultPlayerLboardSortBy(
          _.isNil(rawParams.useRapm)
            ? ParamDefaults.defaultPlayerLboardUseRapm
            : rawParams.useRapm,
          _.isNil(rawParams.factorMins)
            ? ParamDefaults.defaultPlayerLboardFactorMins
            : rawParams.factorMins
        )
          ? ["sortBy"]
          : [],
      ])
    );
    if (!_.isEqual(params, teamEditorParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setTeamEditorParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    // Process data selection change
    const paramObj = teamEditorParams;

    const gender = paramObj.gender || ParamDefaults.defaultGender;
    const fullYear = paramObj.year || DateUtils.offseasonPredictionYear;
    const prevYear = DateUtils.getPrevYear(fullYear);
    const evalMode = paramObj.evalMode || false;
    const offSeasonMode = _.isNil(paramObj.offSeason)
      ? true
      : paramObj.offSeason;

    const transferYear = offSeasonMode
      ? fullYear.substring(0, 4)
      : DateUtils.getOffseasonOfYear(fullYear) || "";
    const transferYearPrev = offSeasonMode
      ? prevYear.substring(0, 4)
      : DateUtils.getOffseasonOfYear(prevYear) || "";

    const yearWithStats = offSeasonMode ? prevYear : fullYear;
    const prevYearWithStats = DateUtils.getPrevYear(yearWithStats);
    const transferYears = [transferYear, transferYearPrev];

    if (
      fullYear != currYear ||
      gender != currGender ||
      evalMode != currEvalMode ||
      offSeasonMode != currOffSeasonMode
    ) {
      // Only need to do this if the data source has changed
      setCurrYear(fullYear);
      setCurrGender(gender);
      setCurrEvalMode(evalMode);
      setCurrOffSeasonMode(offSeasonMode);

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
          teamStats: _.chain(teamsIn)
            .flatMap((d) => d.teams || [])
            .flatten()
            .value(),
          confs: _.chain(jsons)
            .map((d) => d.confs || [])
            .flatten()
            .uniq()
            .value(),
          transfers: _.drop(jsonsIn, _.size(jsons)) as Record<
            string,
            Array<TransferModel>
          >[],
          lastUpdated: _.chain(jsons)
            .map((d) => d.lastUpdated)
            .max()
            .value(),
        });
      });
    }
  }, [teamEditorParams]);

  // View

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <TeamEditorTable
        startingState={teamEditorParamsRef.current || {}}
        dataEvent={dataSubEvent}
        onChangeState={onTeamEditorParamsChange}
      />
    );
  }, [dataSubEvent]);

  const thumbnailUrl = `${
    server != "localhost" ? `https://${server}` : "http://localhost:3000"
  }/thumbnails/player_leaderboard_thumbnail.png`;
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
          <h3>Off-Season Team Builder</h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: currGender,
            year: DateUtils.getLastSeasonWithDataFrom(currYear),
          }}
          thisPage={`${ParamPrefixes.team}_editor`}
        />
      </Row>
      <Row className="mt-3">{table}</Row>
      <Footer
        dateOverride={dataSubEvent.lastUpdated}
        year={teamEditorParams.year}
        gender={teamEditorParams.gender}
        server={server}
      />
    </Container>
  );
};
export default TeamEditorPage;
