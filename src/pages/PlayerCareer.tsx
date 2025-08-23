// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
import Router, { useRouter } from "next/router";

// Next imports:
import { NextPage } from "next";
import dynamic from "next/dynamic";

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
} from "../utils/FilterModels";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// ES search
//@ts-ignore
import { ApiProxyConnector } from "@elastic/search-ui-elasticsearch-connector/api-proxy";
//@ts-ignore
import { SearchProvider, SearchBox, Results } from "@elastic/react-search-ui";

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
import { DebouncedSearchBox } from "../components/shared/DebouncedSearchBox";

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

  const connector = new ApiProxyConnector({
    basePath: "/api",
  });

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

  const onPlayerCareerParamsChange = (rawParams: PlayerCareerParams) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        !rawParams.t100 ? ["t100"] : [],
        !rawParams.conf ? ["conf"] : [],
        !rawParams.filter ? ["filter"] : [],
        !rawParams.conf ? ["conf"] : [],

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

        !rawParams.showInfoSubHeader ? ["showInfoSubHeader"] : [],

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

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <PlayerCareerTable
        playerSeasons={dataEvent}
        playerCareerParams={playerCareerParamsRef.current || {}}
      />
    );
  }, [dataEvent]);

  const playerFinder = (
    <SearchProvider
      config={{
        apiConnector: connector,
        autocompleteQuery: {
          results: {
            resultsPerPage: 100,
            result_fields: {
              key: {},
              team: {},
              year: {},
              "roster.ncaa_id": {},
            },
            // override the default query
            search_fields: {
              key: {
                // Search UI will expand this into multi_match bool_prefix
                weight: 1,
              },
            },
          },
        },
      }}
    >
      <DebouncedSearchBox minChars={3} debounceMs={300}>
        {(onChangeHandler) => (
          <SearchBox
            inputProps={{
              placeholder:
                dataEvent.length > 0
                  ? "Find another player..."
                  : "Search for players...",
            }}
            autocompleteMinimumCharacters={3}
            autocompleteView={({ autocompletedResults, getItemProps }) => {
              // group by ncaa_id
              const grouped: Record<string, typeof autocompletedResults> = {};

              autocompletedResults.forEach((r) => {
                const esIndex = r._meta?.rawHit?._index;
                const gender = _.startsWith(esIndex, "hoopexp_women_")
                  ? "Women"
                  : "Men";
                if (
                  dataEvent.length == 0 ||
                  gender ==
                    (playerCareerParamsRef.current?.gender ||
                      ParamDefaults.defaultGender)
                ) {
                  const id = r.roster?.raw?.ncaa_id;
                  if (!id) return;
                  grouped[id] = grouped[id] || [];
                  grouped[id].push(r);
                }
              });

              return (
                <div className="sui-search-box__autocomplete-container">
                  {_.chain(grouped)
                    .values()
                    .sortBy((gs) => {
                      const maxVal =
                        _.maxBy(
                          gs,
                          (g: any) => (g._meta?.rawHit?._score || 1) as number
                        )?._meta?.rawHit?._score || 1;
                      return -(maxVal * 5 + gs.length);
                    })
                    .map((group, i) => {
                      const result = group[0]; // pick first as representative
                      const teams = Array.from(
                        new Set(group.map((r) => r.team?.raw))
                      );
                      const years = group
                        .map((r) => r.year?.raw)
                        .filter(Boolean)
                        .map(Number);
                      const minYear = Math.min(...years);
                      const maxYear = Math.max(...years);
                      const yearStr =
                        minYear == maxYear ? minYear : `${minYear}-${maxYear}`;

                      return (
                        <div
                          {...getItemProps({
                            index: i,
                            key: result.id?.raw,
                            item: result,
                          })}
                          className="flex cursor-pointer p-2 hover:bg-gray-100"
                          onClick={() => {
                            const esIndex = result._meta?.rawHit?._index;
                            const gender = _.startsWith(
                              esIndex,
                              "hoopexp_women_"
                            )
                              ? "Women"
                              : "Men";
                            onPlayerCareerParamsChange({
                              ...(playerCareerParamsRef.current || {}),
                              ncaaId: result.roster?.raw?.ncaa_id,
                              gender,
                            });
                          }}
                        >
                          {result.key?.raw} ({teams.join("; ")}) [{yearStr}]
                        </div>
                      );
                    })
                    .take(10)
                    .value()}
                </div>
              );
            }}
            autocompleteResults={{
              titleField: "key", // shows the player name
              urlField: "", // no link
              shouldTrackClickThrough: false,
            }}
          />
        )}
      </DebouncedSearchBox>{" "}
    </SearchProvider>
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
        >
          {table}
        </GenericCollapsibleCard>
      </Row>
      <Row>
        <GenericCollapsibleCard
          minimizeMargin={false}
          title={`Similar Players${currPlayer ? `: [${currPlayer}]` : ""}`}
        >
          Coming Soon!
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
