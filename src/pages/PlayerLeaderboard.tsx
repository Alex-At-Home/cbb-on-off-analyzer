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
  PlayerLeaderboardParams,
  ParamDefaults,
} from "../utils/FilterModels";
import PlayerLeaderboardTable, {
  PlayerLeaderboardStatsModel,
} from "../components/PlayerLeaderboardTable";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import Head from "next/head";
import { LeaderboardUtils, TransferModel } from "../utils/LeaderboardUtils";
import { DateUtils } from "../utils/DateUtils";
import { LuckUtils } from "../utils/stats/LuckUtils";
import { FeatureFlags } from "../utils/stats/FeatureFlags";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const PlayLeaderboardPage: NextPage<Props> = ({ testMode }) => {
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

  const transferModeUrlParam =
    allParams.indexOf("transferMode=true") >= 0 ||
    allParams.indexOf("transferMode=20") >= 0;
  const transferInit = {} as Record<string, Array<TransferModel>>; //(start as empty list)

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  // Team Stats interface

  const dataEventInit = {
    all: {
      players: [] as any[],
      teams: {} as Record<string, any>,
      confs: [] as string[],
      transfers: transferInit,
      lastUpdated: 0,
    },
    t100: {
      players: [] as any[],
      teams: {} as Record<string, any>,
      confs: [] as string[],
      transfers: transferInit,
      lastUpdated: 0,
    },
    conf: {
      players: [] as any[],
      teams: {} as Record<string, any>,
      confs: [] as string[],
      transfers: transferInit,
      lastUpdated: 0,
    },
  };

  /** TODO experimentation, actually cue off showExpanded */
  const isWideScreen = FeatureFlags.isActiveWindow(
    FeatureFlags.expandedPlayerLeaderboard
  );
  const [gaInited, setGaInited] = useState(false);
  const [dataEvent, setDataEvent] = useState(dataEventInit);
  const [dataSubEvent, setDataSubEvent] = useState({
    players: [],
    teams: {},
    confs: [],
    lastUpdated: 0,
  } as PlayerLeaderboardStatsModel);
  const [currYear, setCurrYear] = useState("");
  const [currGender, setCurrGender] = useState("");
  const [currTier, setCurrTier] = useState("");
  const [currNeedTeamStats, setCurrNeedTeamStats] = useState(false);

  // Game filter

  function getRootUrl(params: PlayerLeaderboardParams) {
    return UrlRouting.getPlayerLeaderboardUrl(params);
  }

  const [playerLeaderboardParams, setPlayerLeaderboardParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as PlayerLeaderboardParams
  );
  const playerLeaderboardParamsRef = useRef<PlayerLeaderboardParams>();
  playerLeaderboardParamsRef.current = playerLeaderboardParams;

  const onPlayerLeaderboardParamsChange = (
    rawParams: PlayerLeaderboardParams
  ) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        !rawParams.t100 ? ["t100"] : [],
        !rawParams.confOnly ? ["confOnly"] : [],
        !rawParams.filter ? ["filter"] : [],
        !rawParams.advancedFilter ? ["advancedFilter"] : [],
        !rawParams.conf ? ["conf"] : [],
        !rawParams.posClasses ? ["posClasses"] : [],

        rawParams.useRapm == ParamDefaults.defaultPlayerLboardUseRapm
          ? ["useRapm"]
          : [],
        rawParams.factorMins == ParamDefaults.defaultPlayerLboardFactorMins
          ? ["factorMins"]
          : [],
        rawParams.possAsPct == ParamDefaults.defaultPlayerLboardPossAsPct
          ? ["possAsPct"]
          : [],
        rawParams.showGrades == "" ? ["showGrades"] : [],

        !rawParams.shotCharts ? ["shotCharts"] : [],

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
    if (!_.isEqual(params, playerLeaderboardParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setPlayerLeaderboardParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    // Process data selection change
    const paramObj = playerLeaderboardParams;
    const dataSubEventKey = paramObj.t100
      ? "t100"
      : paramObj.confOnly
      ? "conf"
      : "all";

    const gender = paramObj.gender || ParamDefaults.defaultGender;
    const fullYear = paramObj.year || ParamDefaults.defaultLeaderboardYear;
    const year = fullYear.substring(0, 4);
    const tier = paramObj.tier || ParamDefaults.defaultTier;

    const nextYear = DateUtils.getNextYear(fullYear);
    const transferMode =
      transferModeUrlParam ||
      nextYear <= DateUtils.yearWithActiveTransferPortal;

    const needsTeamStats = (
      playerLeaderboardParams.advancedFilter || ""
    ).includes("team_stats.");

    if (year == "All" || tier == "All" || transferModeUrlParam) {
      //TODO: why aren't I checking before re-fetching all the info here?
      //(note the transferModeUrlParam means we use this slightly less efficient construct with single tier transfers)

      //TODO: tidy this up
      setDataEvent(dataEventInit); //(clear saved sub-events)

      const transferYearStrSplit = (
        paramObj.transferMode?.toString() || ""
      ).split(":");
      const transferYearStr =
        transferYearStrSplit[0] == "true"
          ? (
              DateUtils.getOffseasonOfYear(DateUtils.offseasonYear) || ""
            ).substring(0, 4) //(default, means most recent year)
          : transferYearStrSplit[0] || nextYear.substring(0, 4); //(else whatever is specified)

      const transferYearIn =
        transferMode && transferYearStr ? [transferYearStr] : [];

      const fetchAll = LeaderboardUtils.getMultiYearPlayerLboards(
        dataSubEventKey,
        gender,
        fullYear,
        tier,
        transferYearIn,
        []
      );
      const teamStatsPromise =
        needsTeamStats && year != "All"
          ? LeaderboardUtils.getMultiYearTeamDetails(
              "all", //(too restrictive to force team queries to be the same as player filter)
              gender,
              fullYear,
              tier,
              [] //TODO: support "All"
            )
          : Promise.resolve([]);

      Promise.all([fetchAll, teamStatsPromise]).then((fetchResults) => {
        const [jsonsIn, teamStats] = fetchResults;
        const jsons = _.dropRight(jsonsIn, transferMode ? 1 : 0);

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
          teams: needsTeamStats
            ? _.chain(teamStats)
                .flatMap((d) => d.teams || [])
                .flatten()
                .map((t) => {
                  // Some processing that is needed in TeamStatsExplorerTable.phase1Processing
                  // (see there for details)
                  // TODO: should add this logic to a TableUtils
                  LuckUtils.injectLuck(t, undefined, undefined);
                  t.off_raw_net = {
                    value:
                      (t.off_ppp?.value || 100) - (t.def_ppp?.value || 100),
                  };
                  return [`${t.team_name}_${t.year}`, t];
                })
                .fromPairs()
                .value()
            : undefined,
          confs: _.chain(jsons)
            .map((d) => d.confs || [])
            .flatten()
            .uniq()
            .value(),
          transfers: (transferMode
            ? gender == "Men"
              ? _.last(jsonsIn)
              : { __NA__: [] }
            : undefined) as Record<string, Array<TransferModel>>,
        });
      });
    } else {
      if (
        !dataEvent[dataSubEventKey]?.players?.length ||
        currYear != fullYear ||
        currGender != gender ||
        currTier != tier ||
        (!currNeedTeamStats && needsTeamStats) //(currNeedTeamStats is a latch)
      ) {
        const oldCurrYear = currYear;
        setCurrYear(fullYear);
        setCurrGender(gender);
        setCurrTier(tier);
        setCurrNeedTeamStats(needsTeamStats);
        setDataSubEvent({ players: [], confs: [] }); //(set the spinner off)

        const playerLboardPromise = LeaderboardUtils.getSingleYearPlayerLboards(
          dataSubEventKey,
          gender,
          fullYear,
          tier
        );
        const teamStatsPromise = needsTeamStats
          ? LeaderboardUtils.getMultiYearTeamDetails(
              "all", //(too restrictive to force team queries to be the same as player filter)
              gender,
              fullYear,
              tier,
              [] //TODO: support "All"
            )
          : Promise.resolve([]);

        Promise.all([playerLboardPromise, teamStatsPromise]).then(
          (playerAndTeamJsons) => {
            const [playerJson, teamsJson] = playerAndTeamJsons;
            if (needsTeamStats) {
              playerJson.teams = _.chain(teamsJson)
                .flatMap((d) => d.teams || [])
                .flatten()
                .map((t) => [`${t.team_name}_${t.year}`, t])
                .fromPairs()
                .value();
            }
            //(if year has changed then clear saved data events)
            setDataEvent({
              ...(oldCurrYear != year ? dataEventInit : dataEvent),
              [dataSubEventKey]: playerJson,
            });
            setDataSubEvent(playerJson);
          }
        );
      } else if (dataSubEvent != dataEvent[dataSubEventKey]) {
        setDataSubEvent(dataEvent[dataSubEventKey]);
      }
    }
  }, [playerLeaderboardParams]);

  // View

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <PlayerLeaderboardTable
        startingState={playerLeaderboardParamsRef.current || {}}
        dataEvent={dataSubEvent}
        onChangeState={onPlayerLeaderboardParamsChange}
      />
    );
  }, [dataSubEvent]);

  const thumbnailUrl = `${
    server != "localhost" ? `https://${server}` : "http://localhost:3000"
  }/thumbnails/player_leaderboard_thumbnail.png`;
  return (
    <Container className={isWideScreen ? "wide_screen" : "medium_screen"}>
      <Head>
        <meta property="og:image" content={thumbnailUrl} />
        <meta name="twitter:image" content={thumbnailUrl} />
      </Head>
      <Row>
        <Col xs={12} className="text-center">
          <h3>
            CBB Player Leaderboard{" "}
            <span className="badge badge-pill badge-info">BETA!</span>
          </h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: currGender,
            year: DateUtils.getLastSeasonWithDataFrom(currYear),
          }}
          thisPage={`${ParamPrefixes.player}_leaderboard`}
        />
      </Row>
      <Row className="mt-3">{table}</Row>
      <Footer
        dateOverride={dataEvent.all?.lastUpdated}
        year={playerLeaderboardParams.year}
        gender={playerLeaderboardParams.gender}
        server={server}
      />
    </Container>
  );
};
export default PlayLeaderboardPage;
