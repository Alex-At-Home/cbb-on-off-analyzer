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
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";

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
  const [shouldReinitFilter, setShouldReinitFilter] = useState(0 as number);
  const [shouldReloadTableParams, setShouldReloadTableParams] = useState(
    0 as number
  );

  const onLineupFilterParamsChange = (rawParams: LineupFilterParams) => {
    const params: LineupFilterParams = _.chain(rawParams)
      .omitBy(_.isNil) //(handles weirdness between null/undefined/missing in isEquals below)
      .omit(
        _.flatten([
          // omit all defaults
          rawParams.sortBy == ParamDefaults.defaultLineupSortBy
            ? ["sortBy"]
            : [],
          rawParams.decorate == ParamDefaults.defaultLineupDecorate
            ? ["decorate"]
            : [],
          rawParams.lineupFontSize == ParamDefaults.defaultLineupFontSize
            ? ["lineupFontSize"]
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
          rawParams.showLineupLuckDiags ==
          ParamDefaults.defaultOnOffLuckDiagMode
            ? ["showLineupLuckDiags"]
            : [],
          rawParams.aggByPos == ParamDefaults.defaultLineupAggByPos
            ? ["aggByPos"]
            : [],
          rawParams.showGameInfo == ParamDefaults.defaultLineupShowGameInfo
            ? ["showGameInfo"]
            : [],
          !rawParams.onOffPlayerSel ? ["onOffPlayerSel"] : [],
          !rawParams.wowyPlayerSel ? ["wowyPlayerSel"] : [],
          rawParams.presetMode == ParamDefaults.defaultPresetMode
            ? ["presetMode"]
            : [],
          !rawParams.presetGroup ||
          rawParams.presetGroup == ParamDefaults.defaultPresetGroup
            ? ["presetGroup"]
            : [],
          !rawParams.tablePreset ? ["tablePreset"] : [],
          !rawParams.tableConfigExtraCols ||
          _.isEmpty(rawParams.tableConfigExtraCols)
            ? ["tableConfigExtraCols"]
            : [],
          !rawParams.tableConfigDisabledCols ||
          _.isEmpty(rawParams.tableConfigDisabledCols)
            ? ["tableConfigDisabledCols"]
            : [],
          !rawParams.advancedMode ? ["advancedMode"] : [],
          rawParams.stickyQuickToggle ? ["stickyQuickToggle"] : [],
        ])
      )
      .value();
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

      // Updates the table to ensure its internal state is updated, if preset group changing
      setShouldReloadTableParams((oneUp) => oneUp + 1);
    }
  };

  function startingLineupLinks(params: LineupFilterParams): React.ReactNode[] {
    const playersToUseFromOnOff = (params.onOffPlayerSel || "").split(";");
    const playersManuallySpecified =
      playersToUseFromOnOff.length > 1 && params.aggByPos == "On-Off";
    const startedComboLineupTooltip = playersManuallySpecified ? (
      <Tooltip id="showLineups">
        Show in a new tab a detailed analysis view of the lineup sets comprised
        of: all off the players specified, exactly one less, exactly two less
        etc.
      </Tooltip>
    ) : (
      <Tooltip id="showLineups">
        Show in a new tab a detailed analysis view of the lineup sets comprised
        of: all 5 players from the most common lineup, exactly 4 of the 5,
        exactly 3 of the 5, and exactly 2 of the 5. Use the On/Off Combo
        selector for more granular control over the players to use.
      </Tooltip>
    );
    const playersToUse = playersManuallySpecified
      ? playersToUseFromOnOff
      : _.thru(dataEvent.lineupStats?.lineups || [], (maybeLineups) => {
          if (maybeLineups?.[0]) {
            return LineupTableUtils.buildCodesAndIds(maybeLineups[0]).map(
              (codeId) => `"${codeId.id}"`
            );
          } else {
            return [];
          }
        });

    const wowyPlayers =
      params.aggByPos == "WOWY"
        ? _.map(
            (params.wowyPlayerSel || "").split("|").filter((str) => str != ""),
            (maybeOnOffSelStr) => {
              const onOffFrags = maybeOnOffSelStr.split("^");
              const onSelSet = onOffFrags[0]
                .split(";")
                .filter((str) => str != "");
              const offSelSet = (onOffFrags[1] || "")
                .split(";")
                .filter((str) => str != "");
              return [onSelSet, offSelSet];
            }
          )
        : [];
    const wowyTooltop = (
      <Tooltip id="wowyLink">
        Show in a new tab a detailed analysis view of each of the lineup combos
        added to the table. Note this can get slow, if you only care about one
        of the lineup combos, just click on that instead.
      </Tooltip>
    );

    const buildCodeToIdLookupMap = () => {
      const mutAllPlayersToMap: Record<string, string> = _.chain(
        playersToUseFromOnOff.concat(_.flatten(_.flatten(wowyPlayers)))
      )
        .map((p) => [p, ""])
        .filter((codeId) => Boolean(codeId[0]))
        .fromPairs()
        .value();

      const resReport = _.chain(dataEvent.lineupStats?.lineups || [])
        .map((l) => LineupTableUtils.buildCodesAndIds(l))
        .transform((acc, v) => {
          v.forEach((p) => {
            if (p.code && mutAllPlayersToMap.hasOwnProperty(p.code)) {
              mutAllPlayersToMap[p.code] = p.id;
              acc[p.code] = true;
            }
          });
          if (_.size(acc) == _.size(mutAllPlayersToMap)) {
            // matched all codes
            return false;
          }
        }, {} as Record<string, boolean>)
        .value();

      if (_.size(resReport) == _.size(mutAllPlayersToMap)) {
        return mutAllPlayersToMap;
      } else {
        return {};
      }
    };

    return [
      <OverlayTrigger placement="auto" overlay={startedComboLineupTooltip}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (playersToUse.length < 3) {
              alert(
                "Need either 3+ players specified in the On/Off selector in On/Off mode, or a non-empty lineup set"
              );
            } else {
              const codeIdLookup = playersManuallySpecified
                ? buildCodeToIdLookupMap()
                : {};
              const baseLinkParams = getCommonFilterParams(params);
              const playersManuallySpecifiedAndNoLookup =
                playersManuallySpecified && _.isEmpty(codeIdLookup);
              const basePlayerStr = `${
                playersManuallySpecifiedAndNoLookup ? `players.code:` : ``
              }{${playersToUse
                .map((p) => {
                  if (
                    playersManuallySpecifiedAndNoLookup ||
                    !playersManuallySpecified
                  ) {
                    return p;
                  } else {
                    return codeIdLookup[p]
                      ? `"${codeIdLookup[p]}"`
                      : `players.code:${p}`;
                  }
                })
                .join(";")}}`;
              const linkParams = {
                ...baseLinkParams,
                splitPhrases: playersToUse.map(
                  (p, pIndex) =>
                    `${playersToUse.length - pIndex}_of_T${playersToUse.length}`
                ),
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
          {_.range(
            playersToUse.length,
            playersToUse.length <= 3 ? 0 : 1,
            -1
          ).join("/")}{" "}
          {playersManuallySpecified ? "Player" : "Starter"} Analysis
        </a>
      </OverlayTrigger>,
    ].concat(
      wowyPlayers.length > 0
        ? [
            <OverlayTrigger placement="auto" overlay={wowyTooltop}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const codeIdLookup = buildCodeToIdLookupMap();
                  const baseLinkParams = getCommonFilterParams(params);
                  const queryStrs = wowyPlayers.map(([on, off]) => {
                    if (_.isEmpty(codeIdLookup)) {
                      const positive =
                        on.length > 0
                          ? `players.code:{${on.join(";")}}=${on.length}`
                          : "";
                      const negative =
                        off.length > 0
                          ? `NOT players.code:{${off.join(";")}}~1`
                          : "";
                      return `${positive} ${
                        positive && negative ? "AND" : ""
                      } ${negative}`;
                    } else {
                      const positive =
                        on.length > 0
                          ? `{${on
                              .map((p) =>
                                codeIdLookup[p]
                                  ? `"${codeIdLookup[p]}"`
                                  : `players.code:${p}`
                              )
                              .join(";")}}=${on.length}`
                          : "";
                      const negative =
                        off.length > 0
                          ? `NOT {${off
                              .map((p) =>
                                codeIdLookup[p]
                                  ? `"${codeIdLookup[p]}"`
                                  : `players.code:${p}`
                              )
                              .join(";")}}~1`
                          : "";
                      return `${positive} ${
                        positive && negative ? "AND" : ""
                      } ${negative}`;
                    }
                  });
                  const linkParams = {
                    ...baseLinkParams,
                    splitPhrases: wowyPlayers.map(
                      (val, valIndex) => `LUp_${valIndex + 1}`
                    ),
                    splitText: wowyPlayers
                      .map((val: string[][]) =>
                        TableDisplayUtils.splitTextBuilder(
                          val?.[0] || [],
                          val?.[1] || []
                        )
                      )
                      .concat(wowyPlayers.length == 1 ? [""] : []),
                    onQuery: queryStrs[0],
                    offQuery: queryStrs?.[1],
                    otherQueries: _.range(0, queryStrs.length - 2).map(
                      (index) => {
                        return {
                          query: queryStrs[index + 2],
                        };
                      }
                    ),
                    autoOffQuery: false,
                    showRoster: true,
                    calcRapm: true,
                    showExpanded: true,
                  };
                  window.open(UrlRouting.getGameUrl(linkParams, {}), "_blank");
                }}
              >
                WOWY Analysis
              </a>
            </OverlayTrigger>,
          ]
        : []
    );
  }

  // View

  function maybeShowLineupDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html";
    } else {
      return undefined;
    }
  }

  function maybeShowQueryDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2020/01/basic-and-advanced-queries-in-hoop.html";
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
        helpLink={maybeShowLineupDocs()}
      >
        <LineupStatsTable
          key={shouldReloadTableParams}
          startingState={lineupFilterParamsRef.current || {}}
          dataEvent={dataEvent}
          onChangeState={onLineupFilterParamsChange}
        />
      </GenericCollapsibleCard>
    );
  }, [dataEvent, shouldReinitFilter, shouldReloadTableParams]);

  return (
    <Container className="medium_screen">
      <SiteModeDropdown />
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Lineup Analysis Tool</h3>
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
          helpLink={maybeShowQueryDocs()}
        >
          <LineupFilter
            onStats={injectStats}
            startingState={lineupFilterParams}
            onChangeState={onLineupFilterParamsChange}
            startingLineupLinks={startingLineupLinks}
            forceReload1Up={shouldForceReload}
            key={shouldReinitFilter}
            propKey={shouldReinitFilter}
            onSwitchToAdvancedMode={(newParams) => {
              // (force reload the state into both LineupFilter and CommonFilter)
              setLineupFilterParams({
                ...newParams,
              });
              setShouldReinitFilter((t) => t + 1);
            }}
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
