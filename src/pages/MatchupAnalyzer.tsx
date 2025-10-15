// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
import Router from "next/router";

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
  MatchupFilterParams,
  ParamDefaults,
} from "../utils/FilterModels";
import { TeamStatsModel } from "../components/TeamStatsTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { LineupStatsModel } from "../components/LineupStatsTable";
import GenericCollapsibleCard from "../components/shared/GenericCollapsibleCard";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import { StatModels } from "../utils/StatModels";
import { UrlRouting } from "../utils/UrlRouting";
import { HistoryManager } from "../utils/HistoryManager";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import MatchupFilter from "../components/MatchupFilter";
import PlayerImpactChart from "../components/PlayerImpactChart";
import { buildOppoFilter } from "../components/MatchupFilter";
import LineupStintsChart from "../components/LineupStintsChart";
import { LineupStintInfo, ShotStats } from "../utils/StatModels";
import {
  DivisionStatsCache,
  GradeTableUtils,
} from "../utils/tables/GradeTableUtils";
import { PlayTypeDiagUtils } from "../utils/tables/PlayTypeDiagUtils";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import InternalNavBarInRow from "../components/shared/InternalNavBarInRow";
import { DateUtils } from "../utils/DateUtils";
import ShotChartDiagView from "../components/diags/ShotChartDiagView";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";

const MatchupAnalyzerPage: NextPage<{}> = () => {
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
    teamStatsA: {
      on: StatModels.emptyTeam(),
      off: StatModels.emptyTeam(),
      baseline: StatModels.emptyTeam(),
      global: StatModels.emptyTeam(),
    } as TeamStatsModel,
    rosterStatsA: {
      on: [],
      off: [],
      other: [],
      baseline: [],
      global: [],
    } as RosterStatsModel,
    lineupStatsA: { lineups: [] } as LineupStatsModel,

    teamStatsB: {
      on: StatModels.emptyTeam(),
      off: StatModels.emptyTeam(),
      baseline: StatModels.emptyTeam(),
      global: StatModels.emptyTeam(),
    } as TeamStatsModel,
    rosterStatsB: {
      on: [],
      off: [],
      other: [],
      baseline: [],
      global: [],
    } as RosterStatsModel,
    lineupStatsB: { lineups: [] } as LineupStatsModel,
    lineupStintsA: [] as LineupStintInfo[],
    lineupStintsB: [] as LineupStintInfo[],
    shotChartInfo: undefined as
      | undefined
      | {
          game: {
            off: ShotStats;
            def: ShotStats;
          };
          seasonA: {
            off: ShotStats;
            def: ShotStats;
          };
          seasonB: {
            off: ShotStats;
            def: ShotStats;
          };
        },
  });

  const injectStats = (
    lineupStatsA: LineupStatsModel,
    teamStatsA: TeamStatsModel,
    rosterStatsA: RosterStatsModel,
    lineupStatsB: LineupStatsModel,
    teamStatsB: TeamStatsModel,
    rosterStatsB: RosterStatsModel,
    lineupStintsA: LineupStintInfo[],
    lineupStintsB: LineupStintInfo[],
    shotChartInfo?: {
      game: {
        off: ShotStats;
        def: ShotStats;
      };
      seasonA: {
        off: ShotStats;
        def: ShotStats;
      };
      seasonB: {
        off: ShotStats;
        def: ShotStats;
      };
    }
  ) => {
    setDataEvent({
      teamStatsA,
      rosterStatsA,
      lineupStatsA,
      rosterStatsB,
      teamStatsB,
      lineupStatsB,
      lineupStintsA,
      lineupStintsB,
      shotChartInfo,
    });
  };

  const [csvData, setCsvData] = useState<object[]>([]);

  // Experimental JSON mode

  const jsonMode =
    typeof window === `undefined`
      ? false
      : window.location.search.indexOf("jsonMode=true") >= 0;

  // Game and Lineup filters

  const allParams =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? ""
      : window.location.search;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // Some cache management easter eggs, for development:
  if (allParams.indexOf("__clear_cache__") >= 0) {
    console.log("CLEAR CACHE");
    ClientRequestCache.clearCache();
  }
  if (allParams.indexOf("__clear_history__") >= 0) {
    console.log("CLEAR HISTORY");
    HistoryManager.clearHistory();
  }

  const startingMatchupFilterParams = UrlRouting.removedSavedKeys(
    allParams
  ) as MatchupFilterParams; //(only used to init a couple of useStates)
  const [matchupFilterParams, setMatchupFilterParams] = useState(
    startingMatchupFilterParams
  );
  const matchupFilterParamsRef = useRef<MatchupFilterParams>();
  matchupFilterParamsRef.current = matchupFilterParams;

  const showShotCharts =
    !matchupFilterParams.year ||
    matchupFilterParams.year >= DateUtils.firstYearWithShotChartData;

  const [shotChartsShowZones, setShotChartsShowZones] = useState(
    _.isNil(startingMatchupFilterParams.shotChartsShowZones)
      ? ParamDefaults.defaultShotChartShowZones
      : startingMatchupFilterParams.shotChartsShowZones
  );

  function getRootUrl(params: MatchupFilterParams) {
    return UrlRouting.getMatchupUrl(params);
  }

  const onMatchupFilterParamsChange = (rawParams: MatchupFilterParams) => {
    // Omit all the defaults
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        !rawParams.oppoTeam ? ["oppoTeam"] : [],
        _.isNil(rawParams.showTeam) || rawParams.showTeam ? ["showTeam"] : [],
        _.isNil(rawParams.showOppo) || rawParams.showOppo ? ["showOppo"] : [],
        _.isNil(rawParams.factorMins) || rawParams.factorMins
          ? ["factorMins"]
          : [],
        !rawParams.posClasses ? ["posClasses"] : [],
        (rawParams.lockAspect || false) ==
        ParamDefaults.defaultMatchupAnalysisAspectLock
          ? ["lockAspect"]
          : [],
        (rawParams.showUsage || false) ==
        ParamDefaults.defaultMatchupAnalysisShowUsage
          ? ["showUsage"]
          : [],
        (rawParams.showPpp || false) ==
        ParamDefaults.defaultMatchupAnalysisShowPpp
          ? ["showPpp"]
          : [],
        (rawParams.showLabels || false) ==
        ParamDefaults.defaultMatchupAnalysisShowLabels
          ? ["showLabels"]
          : [],
        (rawParams.labelToShow || "") ==
        ParamDefaults.defaultMatchupAnalysisLabelToShow
          ? ["labelToShow"]
          : [],
        (rawParams.iconType || "") ==
        ParamDefaults.defaultMatchupAnalysisIconType
          ? ["iconType"]
          : [],
        rawParams.shotChartsShowZones ? ["shotChartsShowZones"] : [],
      ])
    );
    if (!_.isEqual(params, matchupFilterParamsRef.current)) {
      //(to avoid recursion)

      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setMatchupFilterParams(params); //(to ensure the new params are included in links)
    }
  };

  // Load team grades, needed for play recap view

  const [divisionStatsCache, setDivisionStatsCache] = useState(
    {} as DivisionStatsCache
  );

  // Events that trigger building or rebuilding the division stats cache
  useEffect(() => {
    if (
      matchupFilterParams.year != divisionStatsCache.year ||
      matchupFilterParams.gender != divisionStatsCache.gender ||
      _.isEmpty(divisionStatsCache)
    ) {
      if (!_.isEmpty(divisionStatsCache)) setDivisionStatsCache({}); //unset if set
      GradeTableUtils.populateTeamDivisionStatsCache(
        matchupFilterParams,
        setDivisionStatsCache
      );
    }
  }, [matchupFilterParams]);

  // Update URL when dynamic (non-submit fields change)
  useEffect(() => {
    onMatchupFilterParamsChange({
      ...matchupFilterParamsRef.current,
      shotChartsShowZones: shotChartsShowZones,
    });
  }, [shotChartsShowZones]);

  // View

  function maybeShowDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2020/03/understanding-team-report-onoff-page.html#RAPM";
    } else {
      return undefined;
    }
  }

  // Quick navigation to the different sections
  const topRef = useRef<HTMLDivElement>(null);
  const playTypesRef = useRef<HTMLDivElement>(null);
  const playerImpactRef = useRef<HTMLDivElement>(null);
  const timelineViewRef = useRef<HTMLDivElement>(null);
  const shotChartsRef = useRef<HTMLDivElement>(null);
  const navigationRefs = {
    Top: { ref: topRef },
    "Player Impact": { ref: playerImpactRef },
    Timeline: { ref: timelineViewRef },
    "Play Types": { ref: playTypesRef },
    "Shot Charts": showShotCharts ? { ref: shotChartsRef } : { skip: true },
  };

  /** Only rebuild the chart if the data changes, or if one of the filter params changes */

  /** Only rebuild the table if the data changes */
  const chart = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        title="Player Impact Chart"
        helpLink={maybeShowDocs()}
      >
        <Col
          xs={12}
          className="w-100 text-center d-flex justify-content-center"
        >
          <PlayerImpactChart
            startingState={matchupFilterParamsRef.current || {}}
            opponent={
              buildOppoFilter(matchupFilterParams.oppoTeam || "")?.team || ""
            }
            dataEvent={dataEvent}
            onChangeState={onMatchupFilterParamsChange}
          />
        </Col>
      </GenericCollapsibleCard>
    );
  }, [dataEvent]);
  const lineupStintTable = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        title="Timeline View"
        helpLink={maybeShowDocs()}
      >
        {dataEvent.teamStatsA.baseline.off_poss?.value ? (
          <Col
            xs={12}
            className="w-100 text-center d-flex justify-content-center"
          >
            <LineupStintsChart
              startingState={matchupFilterParamsRef.current || {}}
              opponent={
                buildOppoFilter(matchupFilterParams.oppoTeam || "")?.team || ""
              }
              dataEvent={dataEvent}
              onChangeState={onMatchupFilterParamsChange}
            />
          </Col>
        ) : (
          <Container>
            <Row>
              <Col xs={12} className="text-center">
                <span>
                  <i>(No Data)</i>
                </span>
              </Col>
            </Row>
          </Container>
        )}
      </GenericCollapsibleCard>
    );
  }, [dataEvent]);

  const playStyleChart = React.useMemo(() => {
    const genderYearLookup = `${
      matchupFilterParams.gender || ParamDefaults.defaultGender
    }_${matchupFilterParams.year || ParamDefaults.defaultYear}`;
    const avgEfficiency =
      efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

    return jsonMode ? (
      <span>
        {dataEvent.teamStatsA.baseline.off_poss?.value &&
        !_.isEmpty(divisionStatsCache)
          ? PlayTypeDiagUtils.buildTeamStyleBreakdown(
              matchupFilterParams.team || "Unknown",
              dataEvent.rosterStatsA,
              dataEvent.teamStatsA,
              avgEfficiency,
              divisionStatsCache,
              showHelp,
              true,
              undefined,
              jsonMode
            )
          : `Loading Data... ${dataEvent.teamStatsA.baseline.off_poss?.value}`}
      </span>
    ) : (
      <GenericCollapsibleCard
        minimizeMargin={true}
        title="Play Type Breakdown"
        helpLink={maybeShowDocs()}
      >
        {dataEvent.teamStatsA.baseline.off_poss?.value ? (
          <Container>
            <Row>
              <Col xs={12}>
                {_.isEmpty(divisionStatsCache) ? (
                  <span>
                    <i>(Loading data...)</i>
                  </span>
                ) : (
                  PlayTypeDiagUtils.buildTeamStyleBreakdown(
                    matchupFilterParams.team || "Unknown",
                    dataEvent.rosterStatsA,
                    dataEvent.teamStatsA,
                    avgEfficiency,
                    divisionStatsCache,
                    showHelp,
                    true
                  )
                )}
              </Col>
            </Row>
            <Row className="mt-2">
              <Col xs={12}>
                {_.isEmpty(divisionStatsCache) ? (
                  <span></span>
                ) : (
                  PlayTypeDiagUtils.buildTeamStyleBreakdown(
                    buildOppoFilter(matchupFilterParams.oppoTeam || "")?.team ||
                      "Unknown",
                    dataEvent.rosterStatsB,
                    dataEvent.teamStatsB,
                    avgEfficiency,
                    divisionStatsCache,
                    showHelp,
                    true
                  )
                )}
              </Col>
            </Row>
          </Container>
        ) : (
          <Container>
            <Row>
              <Col xs={12} className="text-center">
                <span>
                  <i>(No Data)</i>
                </span>
              </Col>
            </Row>
          </Container>
        )}
      </GenericCollapsibleCard>
    );
  }, [dataEvent, divisionStatsCache, csvData]);

  const shotChart = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        title="Game Shot Charts"
        helpLink={maybeShowDocs()}
      >
        {dataEvent.teamStatsA.baseline.off_poss?.value &&
        dataEvent.shotChartInfo ? (
          <Container>
            <Row>
              <Col xs={12} className="text-center small">
                <ShotChartDiagView
                  off={dataEvent.shotChartInfo.game.off}
                  def={dataEvent.shotChartInfo.game.def}
                  gender={matchupFilterParams.gender as "Men" | "Women"}
                  title={`Game Shot Charts`}
                  quickSwitchOptions={[
                    {
                      title: `${matchupFilterParams.team} season`,
                      off: dataEvent.shotChartInfo.seasonA.off,
                      def: dataEvent.shotChartInfo.seasonA.def,
                      gender: matchupFilterParams.gender as "Men" | "Women",
                      labelOverrides: [
                        `${matchupFilterParams.team} offense:`,
                        `Opponents' offense:`,
                      ],
                    },
                    {
                      title: `${
                        buildOppoFilter(matchupFilterParams.oppoTeam || "")
                          ?.team
                      } season`,
                      off: dataEvent.shotChartInfo.seasonB.def,
                      def: dataEvent.shotChartInfo.seasonB.off,
                      labelOverrides: [
                        `Opponents' offense:`,
                        `${
                          buildOppoFilter(matchupFilterParams.oppoTeam || "")
                            ?.team
                        } offense:`,
                      ],
                      gender: matchupFilterParams.gender as "Men" | "Women",
                    },
                  ]}
                  chartOpts={{ buildZones: shotChartsShowZones }}
                  onChangeChartOpts={(newOpts) => {
                    setShotChartsShowZones(newOpts.buildZones || false);
                  }}
                  labelOverrides={[
                    `${matchupFilterParams.team} Shots:`,
                    `${
                      buildOppoFilter(matchupFilterParams.oppoTeam || "")?.team
                    } Shots:`,
                  ]}
                  offDefOverrides={[false, false]}
                />
              </Col>
            </Row>
          </Container>
        ) : (
          <Container>
            <Row>
              <Col xs={12} className="text-center pt-2">
                <span>
                  <i>(No Data)</i>
                </span>
              </Col>
            </Row>
          </Container>
        )}
      </GenericCollapsibleCard>
    );
  }, [dataEvent, shotChartsShowZones]);

  /** In JSON mode display the view until the request is submitted and data has returned */
  const jsonModeAndAllDataLoaded =
    jsonMode &&
    dataEvent.teamStatsA.baseline.off_poss?.value &&
    !_.isEmpty(divisionStatsCache);

  return jsonModeAndAllDataLoaded ? (
    <text id="jsonOutput">
      WORK IN PROGRESS "playStyleBreakdown": {playStyleChart}
    </text>
  ) : (
    <Container>
      <SiteModeDropdown />
      <Row ref={topRef} className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Match-up Analysis Tool</h3>
        </Col>
      </Row>
      <Row>
        <HeaderBar
          common={matchupFilterParams}
          thisPage={`${ParamPrefixes.gameInfo}_review`}
        />
      </Row>
      <Row>
        <GenericCollapsibleCard
          minimizeMargin={false}
          title="Team and Game Filter"
          summary={HistoryManager.gameReportFilterSummary(matchupFilterParams)}
        >
          <MatchupFilter
            onStats={injectStats}
            startingState={matchupFilterParams}
            onChangeState={onMatchupFilterParamsChange}
          />
        </GenericCollapsibleCard>
      </Row>
      <InternalNavBarInRow refs={navigationRefs} />
      <Row ref={playerImpactRef}>{chart}</Row>
      <Row ref={timelineViewRef}>{lineupStintTable}</Row>
      <Row ref={playTypesRef}>{playStyleChart}</Row>
      {showShotCharts ? <Row ref={shotChartsRef}>{shotChart}</Row> : undefined}
      <Footer
        year={matchupFilterParams.year}
        gender={matchupFilterParams.gender}
        server={server}
      />
    </Container>
  );
};
export default MatchupAnalyzerPage;
