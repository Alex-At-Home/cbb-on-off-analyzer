// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
import Router, { useRouter } from "next/router";
import Link from "next/link";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// App components:
import LineupFilter from "../components/LineupFilter";
import {
  getCommonFilterParams,
  ParamPrefixes,
  GameFilterParams,
  LineupFilterParams,
  ParamDefaults,
} from "../utils/FilterModels";
import { HistoryManager } from "../utils/HistoryManager";
import LineupStatsTable, {
  LineupStatsModel,
} from "../components/LineupStatsTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { TeamStatsModel } from "../components/TeamStatsTable";
import GenericCollapsibleCard from "../components/shared/GenericCollapsibleCard";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import {
  StatModels,
  OnOffBaselineEnum,
  OnOffBaselineGlobalEnum,
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  TeamStatSet,
  LineupStatSet,
} from "../utils/StatModels";
import { UrlRouting } from "../utils/UrlRouting";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";

const LineupAnalyzerPage: NextPage<{}> = () => {
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

  // Team Stats interface

  const [gaInited, setGaInited] = useState(false);
  const [dataEvent, setDataEvent] = useState({
    lineupStats: {} as LineupStatsModel,
    teamStats: {
      on: StatModels.emptyTeam(),
      off: StatModels.emptyTeam(),
      baseline: StatModels.emptyTeam(),
      global: StatModels.emptyTeam(),
    } as TeamStatsModel,
    rosterStats: {
      on: [],
      off: [],
      other: [],
      baseline: [],
      global: [],
    } as RosterStatsModel,
  });

  const injectStats = (
    lineupStats: LineupStatsModel,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel
  ) => {
    setDataEvent({ lineupStats, teamStats, rosterStats });
  };

  // Game filter

  const allParams =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? ""
      : window.location.search;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const [lineupFilterParams, setLineupFilterParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as LineupFilterParams
  );
  const lineupFilterParamsRef = useRef<LineupFilterParams>();
  lineupFilterParamsRef.current = lineupFilterParams;

  function getRootUrl(params: LineupFilterParams) {
    return UrlRouting.getLineupUrl(params, {});
  }
  const [shouldForceReload, setShouldForceReload] = useState(0 as number);

  const onLineupFilterParamsChange = (rawParams: LineupFilterParams) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        rawParams.decorate == ParamDefaults.defaultLineupDecorate
          ? ["decorate"]
          : [],
        rawParams.showTotal == ParamDefaults.defaultLineupShowTotal
          ? ["showTotal"]
          : [],
        rawParams.showOff == ParamDefaults.defaultLineupShowDropped
          ? ["showOff"]
          : [],
        !rawParams.showRawPts ? ["showRawPts"] : [],
        _.isEqual(rawParams.luck, ParamDefaults.defaultLuckConfig)
          ? ["luck"]
          : [],
        !rawParams.lineupLuck ? ["lineupLuck"] : [],
        rawParams.showLineupLuckDiags == ParamDefaults.defaultOnOffLuckDiagMode
          ? ["showLineupLuckDiags"]
          : [],
        rawParams.aggByPos == ParamDefaults.defaultLineupAggByPos
          ? ["aggByPos"]
          : [],
        rawParams.showGameInfo == ParamDefaults.defaultLineupShowGameInfo
          ? ["showGameInfo"]
          : [],
        !rawParams.onOffPlayerSel ? ["onOffPlayerSel"] : [],
        rawParams.presetMode == ParamDefaults.defaultPresetMode
          ? ["presetMode"]
          : [],
        !rawParams.presetGroup ||
        rawParams.presetGroup == ParamDefaults.defaultPresetGroup
          ? ["presetGroup"]
          : [],
        !rawParams.advancedMode ? ["advancedMode"] : [],
      ])
    );
    if (!_.isEqual(params, lineupFilterParamsRef.current)) {
      //(to avoid recursion)

      // Currently: game info requires an extra possibly expensive query component so we make it on demand only
      if (params.showGameInfo != lineupFilterParamsRef.current?.showGameInfo) {
        setShouldForceReload((t) => t + 1); //(note this sets an intermediate param, NOT the one in CommonFilter)
      }
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setLineupFilterParams(params); // (to ensure the new params are included in links)
    }
  };

  function startingLineupLinks(params: LineupFilterParams): React.ReactNode[] {
    const tooltip = (
      <Tooltip id="showLineups">
        Show in a new tab a detailed analysis view of the lineup sets comprised
        of: all 5 players from the most common lineup, exactly 4 of the 5,
        exactly 3 of the 5, and exactly 2 of the 5. Use the On/Off Combo
        selector for more granular control over the players to use.
      </Tooltip>
    );
    const playersToUseFromOnOff = (params.onOffPlayerSel || "").split(";");
    const playersToUse =
      playersToUseFromOnOff.length > 1
        ? playersToUseFromOnOff.map((code) => `players.code:"${code}"`)
        : _.thru(dataEvent.lineupStats?.lineups || [], (maybeLineups) => {
            if (maybeLineups?.[0]) {
              return LineupTableUtils.buildCodesAndIds(maybeLineups[0]).map(
                (codeId) => `"${codeId.id}"`
              );
            } else {
              return [];
            }
          });
    return [
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (playersToUse.length < 3) {
              alert(
                "Need either 3+ players specified in the On/Off selector in On/Off mode, or a non-empty lineup set"
              );
            } else {
              const baseLinkParams = getCommonFilterParams(params);
              const basePlayerStr = `{${playersToUse.join(";")}}`;
              const linkParams = {
                ...baseLinkParams,
                onQuery: `${basePlayerStr}=${playersToUse.length}`,
                offQuery: `${basePlayerStr}=${playersToUse.length - 1}`,
                otherQueries: _.range(0, playersToUse.length <= 3 ? 1 : 2).map(
                  (index) => {
                    return {
                      query: `${basePlayerStr}=${
                        playersToUse.length - 2 - index
                      }`,
                    };
                  }
                ),
                autoOffQuery: false,
                showRoster: true,
                calcRapm: true,
                showExpanded: true,
              };
              window.open(UrlRouting.getGameUrl(linkParams, {}), "_blank");
            }
          }}
        >
          5/4/3/2 "Starter" Analysis
        </a>
      </OverlayTrigger>,
    ];
  }

  // View

  function maybeShowDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html";
    } else {
      return undefined;
    }
  }

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        screenSize="medium_screen"
        title="Lineup Analysis"
        helpLink={maybeShowDocs()}
      >
        <LineupStatsTable
          startingState={lineupFilterParamsRef.current || {}}
          dataEvent={dataEvent}
          onChangeState={onLineupFilterParamsChange}
        />
      </GenericCollapsibleCard>
    );
  }, [dataEvent]);

  return (
    <Container className="medium_screen">
      <Row>
        <Col xs={12} className="text-center">
          <h3>
            CBB Lineup Analysis Tool{" "}
            <span className="badge badge-pill badge-info">BETA!</span>
          </h3>
        </Col>
      </Row>
      <Row>
        <HeaderBar
          common={lineupFilterParams}
          thisPage={ParamPrefixes.lineup}
        />
      </Row>
      <Row>
        <GenericCollapsibleCard
          minimizeMargin={false}
          screenSize="medium_screen"
          title="Team and Game Filter"
          summary={HistoryManager.lineupFilterSummary(lineupFilterParams)}
        >
          <LineupFilter
            onStats={injectStats}
            startingState={lineupFilterParams}
            onChangeState={onLineupFilterParamsChange}
            startingLineupLinks={startingLineupLinks}
            forceReload1Up={shouldForceReload}
          />
        </GenericCollapsibleCard>
      </Row>
      <Row>{table}</Row>
      <Footer
        year={lineupFilterParams.year}
        gender={lineupFilterParams.gender}
        server={server}
      />
    </Container>
  );
};
export default LineupAnalyzerPage;
