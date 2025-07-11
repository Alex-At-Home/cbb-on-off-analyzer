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
  ParamDefaults,
  PlayerSeasonComparisonParams,
} from "../utils/FilterModels";
import { TeamEditorStatsModel } from "../components/TeamEditorTable";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import Head from "next/head";
import { LeaderboardUtils, TransferModel } from "../utils/LeaderboardUtils";
import { DateUtils } from "../utils/DateUtils";
import PlayerSeasonComparisonChart, {
  multiYearScenarios,
} from "../components/PlayerSeasonComparisonChart";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const PlayerSeasonComparison: NextPage<Props> = ({ testMode }) => {
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
  const [dataEvent, setDataEvent] = useState(
    {} as Record<string, TeamEditorStatsModel>
  );
  const [currYear, setCurrYear] = useState("");
  const [currGender, setCurrGender] = useState("");

  // Game filter

  function getRootUrl(params: PlayerSeasonComparisonParams) {
    return UrlRouting.getPlayerSeasonComparisonUrl(params);
  }

  const [playerSeasonComparisonParams, setPlayerSeasonComparisonParams] =
    useState(
      UrlRouting.removedSavedKeys(allParams) as PlayerSeasonComparisonParams
    );
  const playerSeasonComparisonParamsRef =
    useRef<PlayerSeasonComparisonParams>();
  playerSeasonComparisonParamsRef.current = playerSeasonComparisonParams;

  const onPlayerSeasonComparisonParamsChange = (
    rawParams: PlayerSeasonComparisonParams
  ) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults

        !rawParams.confs ? ["confs"] : [],
        !rawParams.queryFilters ? ["queryFilters"] : [],
        !rawParams.toggledPlayers ? ["toggledPlayers"] : [],
        !rawParams.showTable ? ["showTable"] : [],
        !rawParams.showPrevNextInTable ? ["showPrevNextInTable"] : [],
        _.isNil(rawParams.showOnlyHandSelectedInTable) ||
        rawParams.showOnlyHandSelectedInTable
          ? ["showOnlyHandSelectedInTable"]
          : [],
        //(all the other fields we'll just show their full value)

        // "Add players from leaderboard" params

        rawParams.tier == "All" ? ["tier"] : [],
        !rawParams.filter ? ["filter"] : [],
        !rawParams.advancedFilter ? ["advancedFilter"] : [],
        !rawParams.conf ? ["conf"] : [], //(unused now)
        !rawParams.posClasses ? ["posClasses"] : [],

        //These aren't plumbed in:
        !rawParams.t100 ? ["t100"] : [], //(these 2 don't work anyway in this view)
        !rawParams.confOnly ? ["confOnly"] : [],
        !rawParams.incLowVol ? ["incLowVol"] : [],

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
    if (!_.isEqual(params, playerSeasonComparisonParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setPlayerSeasonComparisonParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    // Process data selection change
    const paramObj = playerSeasonComparisonParams;

    const gender = paramObj.gender || ParamDefaults.defaultGender;
    const fullYear = paramObj.year || DateUtils.offseasonYear;

    if (fullYear != currYear || gender != currGender) {
      // Only need to do this if the data source has changed
      setCurrYear(fullYear);
      setCurrGender(gender);
      const tier = "All"; //(changing tier unsupported)

      const yearsToDo = multiYearScenarios[fullYear] || [fullYear];

      // Include the transfer info from the previous season:
      const offseasonTransferYearFull = _.thru(_.last(yearsToDo), (year) =>
        year ? DateUtils.getNextYear(year) : undefined
      );
      const offseasonTransferYear = offseasonTransferYearFull
        ? offseasonTransferYearFull.substring(0, 4)
        : undefined;
      const offseasonTransferPromise = offseasonTransferYear
        ? LeaderboardUtils.getTransferInfo([offseasonTransferYear])
        : [Promise.resolve({})];

      const { fetchAllPromise } = _.transform(
        yearsToDo,
        (acc, yearToDo) => {
          const prevYear = DateUtils.getPrevYear(yearToDo);

          const transferYear = yearToDo.substring(0, 4);
          const transferYearPrev = prevYear.substring(0, 4);

          const yearWithStats = prevYear;
          const prevYearWithStats = DateUtils.getPrevYear(yearWithStats);
          const transferYears = [transferYear, transferYearPrev];
          const fetchPlayers = LeaderboardUtils.getMultiYearPlayerLboards(
            paramObj.incLowVol ? "all-lowvol" : "all",
            gender,
            yearWithStats,
            tier,
            transferYears,
            [yearToDo, prevYearWithStats]
          );
          const fetchTeamStats = LeaderboardUtils.getMultiYearTeamStats(
            gender,
            yearWithStats,
            tier,
            [yearToDo]
          );
          acc.fetchAllPromise = acc.fetchAllPromise.concat([
            fetchPlayers,
            fetchTeamStats,
          ]);
        },
        { fetchAllPromise: [] as Promise<any[]>[] }
      );

      const fetchAllYears = Promise.all(fetchAllPromise);
      offseasonTransferPromise[0].then((offseasonTransfers) => {
        fetchAllYears.then((playersTeamPairs: any[][]) => {
          const dataEventToPublish: Record<string, TeamEditorStatsModel> =
            _.chain(playersTeamPairs)
              .chunk(2)
              .map((chunkedFetch, yearIndex) => {
                const yearToDo = yearsToDo[yearIndex]!; //(exists by construction)
                const jsonsIn = chunkedFetch[0] || [];
                const teamsIn = chunkedFetch[1] || [];
                const jsons = _.dropRight(jsonsIn, 2); //(2 years' of transfers, see transferYears above)

                const dataSubEvent: TeamEditorStatsModel = {
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
                  lastUpdated: _.chain(jsons)
                    .map((d) => d.lastUpdated)
                    .max()
                    .value(),
                  teamStats: _.chain(teamsIn)
                    .flatMap((d) => d.teams || [])
                    .flatten()
                    .value(),
                  transfers: _.drop(jsonsIn, _.size(jsons)) as Record<
                    string,
                    Array<TransferModel>
                  >[],
                };

                return [yearToDo, dataSubEvent];
              })
              .concat(
                //(if we are in an off-season situation, then create a dummy TeamEditorStatsModel with just the transfers)
                offseasonTransferYearFull
                  ? [
                      [
                        offseasonTransferYearFull,
                        {
                          transfers: [offseasonTransfers],
                        },
                      ],
                    ]
                  : []
              )
              .fromPairs()
              .value();

          setDataEvent(dataEventToPublish);
        });
      });
    }
  }, [playerSeasonComparisonParams]);

  // View

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <PlayerSeasonComparisonChart
        startingState={playerSeasonComparisonParamsRef.current || {}}
        dataEvent={dataEvent}
        onChangeState={onPlayerSeasonComparisonParamsChange}
      />
    );
  }, [dataEvent]);

  const gender =
    playerSeasonComparisonParams.gender || ParamDefaults.defaultGender;
  const year =
    playerSeasonComparisonParams.year || DateUtils.mostRecentYearWithLboardData;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

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
            Multi-Season Player Analysis&nbsp;
            {showHelp ? (
              <small>
                <a
                  target="_blank"
                  href="https://hoop-explorer.blogspot.com/2023/04/multi-season-player-analysis-chart.html"
                >
                  (?)
                </a>
                &nbsp;
              </small>
            ) : undefined}
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
          thisPage={`${ParamPrefixes.player}_chart`}
        />
      </Row>
      <Row className="mt-3">{table}</Row>
      <Footer
        dateOverride={_.chain(dataEvent)
          .values()
          .map((d) => d.lastUpdated)
          .max()
          .value()}
        year={year}
        gender={gender}
        server={server}
      />
    </Container>
  );
};
export default PlayerSeasonComparison;
