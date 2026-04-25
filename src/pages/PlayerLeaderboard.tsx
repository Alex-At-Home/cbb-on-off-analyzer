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
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";
import OffseasonPredictionWarning from "../components/shared/OffseasonPredictionWarning";
import { IndivTableDefs } from "../utils/tables/IndivTableDefs";

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
    FeatureFlags.expandedPlayerLeaderboard,
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
  const [currIncLowVol, setCurrIncLowVol] = useState<boolean | undefined>(
    undefined,
  );
  const [currTransferStr, setCurrTransferStr] = useState("");

  // Game filter

  function getRootUrl(params: PlayerLeaderboardParams) {
    return UrlRouting.getPlayerLeaderboardUrl(params);
  }

  const [playerLeaderboardParams, setPlayerLeaderboardParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as PlayerLeaderboardParams,
  );
  const playerLeaderboardParamsRef = useRef<PlayerLeaderboardParams>();
  playerLeaderboardParamsRef.current = playerLeaderboardParams;

  const onPlayerLeaderboardParamsChange = (
    rawParams: PlayerLeaderboardParams,
  ) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        !rawParams.t100 ? ["t100"] : [],
        !rawParams.confOnly ? ["confOnly"] : [],
        !rawParams.incLowVol ? ["incLowVol"] : [],
        !rawParams.filter ? ["filter"] : [],
        !rawParams.advancedFilter ? ["advancedFilter"] : [],
        !rawParams.conf ? ["conf"] : [],
        !rawParams.posClasses ? ["posClasses"] : [],
        ["showExpanded"], // (show expanded has been replaced by tablePreset, we keep it for bwc)

        rawParams.useRapm == ParamDefaults.defaultPlayerLboardUseRapm
          ? ["useRapm"]
          : [],
        rawParams.factorMins == ParamDefaults.defaultPlayerLboardFactorMins
          ? ["factorMins"]
          : [],
        rawParams.possAsPct == ParamDefaults.defaultPlayerLboardPossAsPct
          ? ["possAsPct"]
          : [],
        rawParams.showGrades == ParamDefaults.defaultEnabledGrade
          ? ["showGrades"]
          : [],

        !rawParams.shotCharts ? ["shotCharts"] : [],
        !rawParams.shotChartsUseEfg ? ["shotChartsUseEfg"] : [],
        rawParams.shotChartsViewMode == ParamDefaults.defaultShotChartViewMode
          ? ["shotChartsViewMode"]
          : [],
        (rawParams.shotChartsShowFreqAsNumber ??
          ParamDefaults.defaultShotChartsShowFreqAsNumber) ==
        ParamDefaults.defaultShotChartsShowFreqAsNumber
          ? ["shotChartsShowFreqAsNumber"]
          : [],
        !rawParams.showPlayerPlayTypes ? ["showPlayerPlayTypes"] : [],
        (rawParams.showPlayerPlayTypesAdjPpp ?? true)
          ? ["showPlayerPlayTypesAdjPpp"]
          : [],
        rawParams.showPlayerPlayTypesPlayType ==
        ParamDefaults.defaultPlayerShowPlayTypesPlayType
          ? ["showPlayerPlayTypesPlayType"]
          : [],
        rawParams.showPlayerPlayTypesCardView ==
        ParamDefaults.defaultPlayerShowPlayTypesCardView
          ? ["showPlayerPlayTypesCardView"]
          : [],

        !rawParams.showInfoSubHeader ? ["showInfoSubHeader"] : [],
        rawParams.stickyQuickToggle ? ["stickyQuickToggle"] : [],
        !rawParams.hideAdvFilterBuilder ? ["hideAdvFilterBuilder"] : [],

        // Table configuration:
        !rawParams.tablePreset ? ["tablePreset"] : [],
        _.isEmpty(rawParams.tableConfigExtraCols)
          ? ["tableConfigExtraCols"]
          : [],
        _.isNil(rawParams.tableConfigDisabledCols)
          ? ["tableConfigDisabledCols"]
          : [],

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
            : rawParams.factorMins,
        )
          ? ["sortBy"]
          : [],
      ]),
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
    const incLowVol = paramObj.incLowVol ?? false;
    const transferStr = paramObj.transferMode?.toString() || "";

    const nextYear = DateUtils.getNextYear(fullYear);
    const transferMode =
      transferModeUrlParam ||
      nextYear <= DateUtils.yearWithActiveTransferPortal;

    const needsTeamStats = (
      playerLeaderboardParams.advancedFilter || ""
    ).includes("team_stats.");

    //TODO: need to incorporate this into the fetch
    const needExtraPlayerStats =
      FeatureFlags.isActiveWindow(FeatureFlags.netPointsOngoingWork) &&
      IndivTableDefs.isNetPtsImpactTableSelected(
        paramObj.tablePreset,
        paramObj.tableConfigExtraCols,
      );

    if (
      currYear != fullYear ||
      currGender != gender ||
      currTier != tier ||
      currIncLowVol != incLowVol ||
      (!currNeedTeamStats && needsTeamStats) || //(currNeedTeamStats is a latch)
      transferStr != currTransferStr
    ) {
      //TODO: tidy this up
      setDataEvent(dataEventInit); //(clear saved sub-events)

      setCurrYear(fullYear);
      setCurrGender(gender);
      setCurrTier(tier);
      setCurrTransferStr(transferStr);
      setCurrIncLowVol(incLowVol);
      setCurrNeedTeamStats(needsTeamStats);

      const transferYearStrSplit = transferStr.split(":");
      const transferYearStr =
        transferYearStrSplit[0] == "true"
          ? (
              DateUtils.getOffseasonOfYear(DateUtils.offseasonYear) || ""
            ).substring(0, 4) //(default, means most recent year)
          : transferYearStrSplit[0] || nextYear.substring(0, 4); //(else whatever is specified)

      const transferYearIn =
        transferMode && transferYearStr ? [transferYearStr] : [];

      const fetchAll = LeaderboardUtils.getMultiYearPlayerLboards(
        dataSubEventKey == "all" && paramObj.incLowVol
          ? "all-lowvol"
          : dataSubEventKey,
        gender,
        fullYear,
        tier,
        transferYearIn,
        [],
      );

      const fetchExtraAll = needExtraPlayerStats
        ? LeaderboardUtils.getMultiYearPlayerLboards(
            dataSubEventKey == "all" && paramObj.incLowVol
              ? "all-lowvol"
              : dataSubEventKey,
            gender,
            fullYear,
            tier,
            transferYearIn,
            [],
            true,
          )
        : Promise.resolve([]);

      const teamStatsPromise = needsTeamStats
        ? LeaderboardUtils.getMultiYearTeamDetails(
            "all", //(too restrictive to force team queries to be the same as player filter)
            gender,
            fullYear,
            tier,
            [],
          )
        : Promise.resolve([]);

      Promise.all([fetchAll, fetchExtraAll, teamStatsPromise]).then(
        (fetchResults) => {
          const [jsonsIn, extraJsonsIn, teamStats] = fetchResults;
          const jsons = _.dropRight(jsonsIn, transferMode ? 1 : 0);

          setDataSubEvent({
            players: _.chain(jsons)
              .map(
                (d) =>
                  (d.players || []).map((p: any) => {
                    p.tier = d.tier;
                    return p;
                  }) || [],
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
            transfers: (transferMode ? _.last(jsonsIn) : undefined) as Record<
              string,
              Array<TransferModel>
            >,
          });
        },
      );
    }
  }, [
    playerLeaderboardParams,
    currYear,
    currGender,
    currTier,
    currIncLowVol,
    currNeedTeamStats,
    currTransferStr,
  ]);

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

  const transferModeStr =
    playerLeaderboardParams.transferMode?.toString() || "";
  const transferPredictionMode =
    transferModeStr.split(":")[1] === "predictions";

  return (
    <Container className={isWideScreen ? "wide_screen" : "medium_screen"}>
      <SiteModeDropdown />
      <Head>
        <meta property="og:image" content={thumbnailUrl} />
        <meta name="twitter:image" content={thumbnailUrl} />
      </Head>
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>
            {transferPredictionMode
              ? "Portal Leaderboard"
              : "Player Leaderboard"}
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
      {transferPredictionMode ? (
        <Row className="mt-2">
          <Col xs={12} className="text-center">
            <OffseasonPredictionWarning
              year={
                playerLeaderboardParams.year ||
                ParamDefaults.defaultLeaderboardYear
              }
              gender={
                playerLeaderboardParams.gender || ParamDefaults.defaultGender
              }
            />
          </Col>
        </Row>
      ) : null}
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
