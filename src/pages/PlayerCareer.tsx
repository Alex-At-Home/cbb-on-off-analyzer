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
  PlayerCareerParams,
  DefaultSimilarityConfig,
} from "../utils/FilterModels";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import Head from "next/head";
import { DateUtils } from "../utils/DateUtils";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";
import GenericCollapsibleCard from "../components/shared/GenericCollapsibleCard";
import { RequestUtils } from "../utils/RequestUtils";
import fetchBuilder from "fetch-retry-ts";
import fetch from "isomorphic-unfetch";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import PlayerCareerTable from "../components/PlayerCareerTable";
import { IndivCareerStatSet } from "../utils/StatModels";
import PlayerFinderTextBox from "../components/shared/PlayerFinderTextBox";
import { FeatureFlags } from "../utils/stats/FeatureFlags";

const fetchRetryOptions = {
  retries: 5,
  retryDelay: 500,
  retryOn: [419, 502, 503, 504],
};
const fetchWithRetry = fetchBuilder(fetch, fetchRetryOptions);

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const PlayerCareer: NextPage<Props> = ({ testMode }) => {
  const isServer = () => typeof window === `undefined`;
  if (isServer() && !testMode) return null; //(don't render server-side)

  const isDebug = process.env.NODE_ENV !== "production";

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
  const [dataEvent, setDataEvent] = useState<Array<IndivCareerStatSet>>([]);
  const [currGender, setCurrGender] = useState("");
  const [currPlayer, setCurrPlayer] = useState<undefined | string>(undefined);
  const [ncaaId, setNcaaId] = useState("");

  // Game filter

  function getRootUrl(params: PlayerCareerParams) {
    return UrlRouting.getPlayerCareer(params);
  }

  const [playerCareerParams, setPlayerCareerParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as PlayerCareerParams
  );
  const playerCareerParamsRef = useRef<PlayerCareerParams>();
  playerCareerParamsRef.current = playerCareerParams;

  const removeSimilarityDefaultsFromConfig = (
    config: PlayerCareerParams["similarityConfig"]
  ) => {
    if (!config) return undefined;

    const cleanedConfig = _.pickBy(
      config,
      (value, key) =>
        value !==
        DefaultSimilarityConfig[key as keyof typeof DefaultSimilarityConfig]
    );

    return _.isEmpty(cleanedConfig)
      ? undefined
      : (cleanedConfig as PlayerCareerParams["similarityConfig"]);
  };

  const removeDefaultsFromParams = (rawParams: PlayerCareerParams) => {
    const cleanedRawParams = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        rawParams.d1 ? ["d1"] : [],
        !rawParams.t100 ? ["t100"] : [],
        !rawParams.conf ? ["conf"] : [],
        !rawParams.yearsToShow ? ["yearsToShow"] : [],
        !rawParams.showNextYear ? ["showNextYear"] : [],

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

        !rawParams.showPlayerPlayTypes ? ["showPlayerPlayTypes"] : [],
        rawParams.showPlayerPlayTypesAdjPpp ?? true
          ? ["showPlayerPlayTypesAdjPpp"]
          : [],
        rawParams.showPlayerPlayTypesPlayType ==
        ParamDefaults.defaultPlayerShowPlayTypesPlayType
          ? ["showPlayerPlayTypesPlayType"]
          : [],
        !rawParams.playerShotCharts ? ["playerShotCharts"] : [],
        rawParams.playerShotChartsShowZones ==
        ParamDefaults.defaultShotChartShowZones
          ? ["playerShotChartsShowZones"]
          : [],
        !rawParams.playerShotChartsUseEfg ? ["playerShotChartsUseEfg"] : [],
        !rawParams.playerShotChartQuickSwitch
          ? ["playerShotChartQuickSwitch"]
          : [],

        !rawParams.showInfoSubHeader ? ["showInfoSubHeader"] : [],
        rawParams.stickyQuickToggle ? ["stickyQuickToggle"] : [],

        !_.isEmpty(rawParams.similarityParams) ? [] : ["similarityParams"],

        //not used but maybe later:
        !rawParams.filter ? ["filter"] : [],
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

    // Clean similarityConfig by removing default values
    const cleanedParams = { ...cleanedRawParams };
    cleanedParams.similarityConfig = removeSimilarityDefaultsFromConfig(
      rawParams.similarityConfig
    );

    return cleanedParams;
  };

  const onPlayerCareerParamsChange = (
    rawParams: PlayerCareerParams,
    similarityMode: boolean = false
  ) => {
    const newParams = removeDefaultsFromParams(rawParams);
    const params = similarityMode
      ? removeDefaultsFromParams({
          ...(playerCareerParamsRef.current || {}),
          similarityParams: _.omit(newParams, [
            "similarityParams",
            "similarityConfig",
            "gender",
          ]),
          similarityConfig: newParams.similarityConfig,
        })
      : newParams;

    if (!_.isEqual(params, playerCareerParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);

      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setPlayerCareerParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    const gender = playerCareerParams.gender || ParamDefaults.defaultGender;
    if (playerCareerParams.ncaaId != ncaaId || gender != currGender) {
      setNcaaId(playerCareerParams.ncaaId || "");
      setCurrGender(gender);

      const currentJsonEpoch =
        dataLastUpdated[`${gender}_${DateUtils.coreYears[0]}`] || -1;

      if (playerCareerParams.ncaaId) {
        const allPromises = Promise.all(
          RequestUtils.requestHandlingLogic(
            { gender, ncaaId: playerCareerParams.ncaaId },
            ParamPrefixes.playerCareer,
            [],
            (url: string, force: boolean) => {
              return fetchWithRetry(url).then(
                (response: fetch.IsomorphicResponse) => {
                  return response
                    .json()
                    .then((json: any) => [json, response.ok, response]);
                }
              );
            },
            currentJsonEpoch,
            isDebug
          )
        );
        allPromises.then((jsons) => {
          const playerJsons = (jsons?.[0]?.responses?.[0]?.hits?.hits || [])
            .map((p: any) => {
              const source = p._source || {};
              source._id = p._id;
              return source;
            })
            .filter((p: any) => !_.isEmpty(p));

          // The key should be the same everywhere so we'll pick the first one
          const key = playerJsons?.[0]?.key;
          if (key) {
            setCurrPlayer(key);
          }
          setDataEvent(playerJsons);
        });
      }
    }
  }, [playerCareerParams]);

  // View

  function maybeShowPlayerDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2025/09/individual-stats-table-explanation.html";
    } else {
      return undefined;
    }
  }

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <PlayerCareerTable
        playerSeasons={dataEvent}
        playerCareerParams={playerCareerParamsRef.current || {}}
        onPlayerCareerParamsChange={onPlayerCareerParamsChange}
      />
    );
  }, [dataEvent]);

  /** Only rebuild the table if the data changes */
  const similarityTable = React.useMemo(() => {
    return (
      <PlayerCareerTable
        playerSeasons={dataEvent}
        playerCareerParams={{
          ...(playerCareerParamsRef.current?.similarityParams || {}),
          gender:
            playerCareerParamsRef.current?.gender ||
            ParamDefaults.defaultGender,
          similarityConfig: playerCareerParamsRef.current?.similarityConfig,
        }}
        onPlayerCareerParamsChange={(params: PlayerCareerParams) =>
          onPlayerCareerParamsChange(params, true)
        }
        playerSimilarityMode={true}
      />
    );
  }, [dataEvent]);

  const playerFinder = (
    <PlayerFinderTextBox
      currGender={playerCareerParamsRef.current?.gender}
      playerCurrSelected={dataEvent.length > 0}
      onSelectPlayer={(ncaaId: string, gender: string) => {
        setDataEvent([]);
        onPlayerCareerParamsChange({
          ...(playerCareerParamsRef.current || {}),
          similarityParams: {},
          yearsToShow: undefined,
          ncaaId,
          gender,
        });
      }}
    />
  );

  const thumbnailUrl = `${
    server != "localhost" ? `https://${server}` : "http://localhost:3000"
  }/thumbnails/player_leaderboard_thumbnail.png`;
  return (
    <Container className="medium_screen">
      <SiteModeDropdown />
      <Head>
        <meta property="og:image" content={thumbnailUrl} />
        <meta name="twitter:image" content={thumbnailUrl} />
      </Head>
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Player Career Page</h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: currGender,
            year: DateUtils.coreYears[0],
          }}
          thisPage={`${ParamPrefixes.player}_leaderboard`}
        />
      </Row>
      <Row className="mt-3"></Row>
      <Row className="mt-3">
        <GenericCollapsibleCard
          screenSize="medium_screen"
          minimizeMargin={false}
          title={`Yearly Stats${currPlayer ? `: [${currPlayer}]` : ""}`}
          extraElement={playerFinder}
          helpLink={maybeShowPlayerDocs()}
        >
          {table}
        </GenericCollapsibleCard>
      </Row>
      <Row>
        <GenericCollapsibleCard
          screenSize="medium_screen"
          minimizeMargin={false}
          title={`Similar Players${currPlayer ? ` to: [${currPlayer}]` : ""}`}
          helpLink={maybeShowPlayerDocs()}
        >
          {FeatureFlags.isActiveWindow(FeatureFlags.playerSimilarityScoring) ? (
            similarityTable
          ) : (
            <span>Coming Soon!</span>
          )}
        </GenericCollapsibleCard>
      </Row>
      <Footer
        year={playerCareerParams.year}
        gender={playerCareerParams.gender}
        server={server}
      />
    </Container>
  );
};
export default PlayerCareer;
