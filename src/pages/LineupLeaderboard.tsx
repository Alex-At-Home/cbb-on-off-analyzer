// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
import Router, { useRouter } from "next/router";

// Next imports:
import { NextPage } from "next";
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
  LineupLeaderboardParams,
  ParamDefaults,
} from "../utils/FilterModels";
import LineupLeaderboardTable, {
  LineupLeaderboardStatsModel,
} from "../components/LineupLeaderboardTable";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { UrlRouting } from "../utils/UrlRouting";
import { LeaderboardUtils } from "../utils/LeaderboardUtils";
import { DateUtils } from "../utils/DateUtils";
import LandingPageIcon from "../components/shared/LandingPageIcon";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const LineupLeaderboardPage: NextPage<Props> = ({ testMode }) => {
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

  const dataEventInit = {
    all: { lineups: [] as any[], confs: [] as string[], lastUpdated: 0 },
    t100: { lineups: [] as any[], confs: [] as string[], lastUpdated: 0 },
    conf: { lineups: [] as any[], confs: [] as string[], lastUpdated: 0 },
  };

  const [gaInited, setGaInited] = useState(false);
  const [dataEvent, setDataEvent] = useState(dataEventInit);
  const [dataSubEvent, setDataSubEvent] = useState({
    lineups: [],
    confs: [],
    lastUpdated: 0,
  } as LineupLeaderboardStatsModel);
  const [currYear, setCurrYear] = useState("");
  const [currGender, setCurrGender] = useState("");
  const [currTier, setCurrTier] = useState("");

  // Game filter

  function getRootUrl(params: LineupLeaderboardParams) {
    return UrlRouting.getLineupLeaderboardUrl(params);
  }

  const [lineupLeaderboardParams, setLineupLeaderboardParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as LineupLeaderboardParams
  );
  const lineupLeaderboardParamsRef = useRef<LineupLeaderboardParams>();
  lineupLeaderboardParamsRef.current = lineupLeaderboardParams;

  const onLineupLeaderboardParamsChange = (
    rawParams: LineupLeaderboardParams
  ) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        !rawParams.t100 ? ["t100"] : [],
        !rawParams.confOnly ? ["confOnly"] : [],
        !rawParams.filter ? ["filter"] : [],
        !rawParams.conf ? ["conf"] : [],
        !rawParams.lineupFilters ? ["lineupFilters"] : [],

        rawParams.minPoss == ParamDefaults.defaultLineupLboardMinPos
          ? ["minPoss"]
          : [],
        rawParams.maxTableSize == ParamDefaults.defaultLineupLboardMaxTableSize
          ? ["maxTableSize"]
          : [],
        rawParams.sortBy == ParamDefaults.defaultLineupLboardSortBy
          ? ["sortBy"]
          : [],

        rawParams.showLineupLuckDiags ==
        ParamDefaults.defaultLineupLboardLuckDiagMode
          ? ["showLineupLuckDiags"]
          : [],
      ])
    );
    if (!_.isEqual(params, lineupLeaderboardParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setLineupLeaderboardParams(params); // (to ensure the new params are included in links)
    }
  };

  useEffect(() => {
    // Process data selection change
    const paramObj = lineupLeaderboardParams;
    const dataSubEventKey = paramObj.t100
      ? "t100"
      : paramObj.confOnly
      ? "conf"
      : "all";

    const gender = paramObj.gender || ParamDefaults.defaultGender;
    const fullYear = paramObj.year || ParamDefaults.defaultLeaderboardYear;
    const year = fullYear.substring(0, 4);
    const tier = paramObj.tier || ParamDefaults.defaultTier;

    if (
      !dataEvent[dataSubEventKey]?.lineups?.length ||
      currYear != fullYear ||
      currTier != tier ||
      currGender != gender
    ) {
      const oldCurrYear = currYear;
      const oldCurrGender = currGender;
      setCurrYear(fullYear);
      setCurrGender(gender);
      setCurrTier(tier);
      setDataSubEvent({ lineups: [], confs: [], lastUpdated: 0 }); //(set the spinner off)

      const tiers = tier == "All" ? ["High", "Medium", "Low"] : [tier];
      const years = year == "All" ? DateUtils.lboardYearListWithExtra : [year];
      const yearTiers = _.flatMap(years, (year) => {
        return tiers.map((tier) => {
          return [year, tier];
        });
      });
      const fetchAll = Promise.all(
        yearTiers.map(([yearToUse, tierToUse]) => {
          return fetch(
            LeaderboardUtils.getLineupUrl(
              dataSubEventKey,
              gender,
              yearToUse.substring(0, 4),
              tierToUse
            )
          ).then((response: fetch.IsomorphicResponse) => {
            return response.ok
              ? response.json()
              : Promise.resolve({ error: "No data available" });
          });
        })
      );
      fetchAll.then((jsons: any[]) => {
        const subEvent = {
          lineups: _.chain(jsons)
            .map(
              (d, di) =>
                (d.lineups || []).map((l: any, li: number) => {
                  l.tier = tiers[di % 4] || "High";
                  return l;
                }) || []
            )
            .flatten()
            .value(),
          confs: _.chain(jsons)
            .map((d) => d.confs || [])
            .flatten()
            .uniq()
            .value(),
          lastUpdated: _.maxBy(jsons, (j) => j.lastUpdated || 0),
        };
        setDataEvent({
          ...(oldCurrYear != year || year == "All" ? dataEventInit : dataEvent),
          [dataSubEventKey]: subEvent,
        });
        setDataSubEvent(subEvent);
      });
    } else if (dataSubEvent != dataEvent[dataSubEventKey]) {
      setDataSubEvent(dataEvent[dataSubEventKey]);
    }
  }, [lineupLeaderboardParams]);

  // View

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <LineupLeaderboardTable
        startingState={lineupLeaderboardParamsRef.current || {}}
        dataEvent={dataSubEvent}
        onChangeState={onLineupLeaderboardParamsChange}
      />
    );
  }, [dataSubEvent]);

  return (
    <Container className="medium_screen">
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Lineup Leaderboard</h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: currGender,
            year: DateUtils.getLastSeasonWithDataFrom(currYear),
          }}
          thisPage={`${ParamPrefixes.lineup}_leaderboard`}
        />
      </Row>
      <Row className="mt-3">{table}</Row>
      <Footer
        dateOverride={dataEvent.all?.lastUpdated}
        year={lineupLeaderboardParams.year}
        gender={lineupLeaderboardParams.gender}
        server={server}
      />
    </Container>
  );
};
export default LineupLeaderboardPage;
