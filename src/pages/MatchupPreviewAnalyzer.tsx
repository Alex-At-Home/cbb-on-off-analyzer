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
import ToggleButtonGroup, {
  ToggleButtonItem,
} from "../components/shared/ToggleButtonGroup";

// Utils:
import {
  IndivStatSet,
  ShotStats,
  StatModels,
  TeamStatSet,
} from "../utils/StatModels";
import { UrlRouting } from "../utils/UrlRouting";
import { HistoryManager } from "../utils/HistoryManager";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import PlayerImpactChart from "../components/PlayerImpactChart";
import { LineupStintInfo } from "../utils/StatModels";
import MatchupPreviewFilter from "../components/MatchupPreviewFilter";
import {
  DivisionStatsCache,
  GradeTableUtils,
} from "../utils/tables/GradeTableUtils";
import { PlayTypeDiagUtils } from "../utils/tables/PlayTypeDiagUtils";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { LeaderboardUtils } from "../utils/LeaderboardUtils";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import ShotChartDiagView from "../components/diags/ShotChartDiagView";
import { DateUtils } from "../utils/DateUtils";
import InternalNavBarInRow from "../components/shared/InternalNavBarInRow";
import { PlayTypeUtils } from "../utils/stats/PlayTypeUtils";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";

const MatchupPreviewAnalyzerPage: NextPage<{}> = () => {
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
    shotChartInfoA: {
      off: {} as ShotStats,
      def: {} as ShotStats,
    },
    shotChartInfoB: {
      off: {} as ShotStats,
      def: {} as ShotStats,
    },
    defensiveInfoA: {} as Record<
      string,
      { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
    >,
    defensiveInfoB: {} as Record<
      string,
      { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
    >,
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
    shotChartInfoA: {
      off: ShotStats;
      def: ShotStats;
    },
    shotChartInfoB: {
      off: ShotStats;
      def: ShotStats;
    },
    defensiveInfoA?: Record<
      string,
      { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
    >,
    defensiveInfoB?: Record<
      string,
      { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
    >
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
      shotChartInfoA,
      shotChartInfoB,
      defensiveInfoA: defensiveInfoA || {},
      defensiveInfoB: defensiveInfoB || {},
    });
  };

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

  const [breakdownView, setBreakdownView] = useState<string>(
    startingMatchupFilterParams.breakdownConfig ||
      ParamDefaults.defaultMatchupAnalysisBreakdownConfig
  );
  const breakdownViewArr = breakdownView.split(";");

  const showShotCharts =
    !matchupFilterParams.year ||
    matchupFilterParams.year >= DateUtils.firstYearWithShotChartData;

  const [shotChartsShowZones, setShotChartsShowZones] = useState(
    _.isNil(startingMatchupFilterParams.shotChartsShowZones)
      ? ParamDefaults.defaultShotChartShowZones
      : startingMatchupFilterParams.shotChartsShowZones
  );
  const [shotChartsUseEfg, setShotChartsUseEfg] = useState(
    startingMatchupFilterParams.shotChartsUseEfg ?? false
  );

  const [playStyleConfigStr, setPlayStyleConfigStr] = useState<string>(
    startingMatchupFilterParams.playStyleConfigStr ||
      ParamDefaults.defaultTeamPlayTypeConfig
  );

  const [csvData, setCsvData] = useState<object[]>([]);

  function getRootUrl(params: MatchupFilterParams) {
    return UrlRouting.getMatchupPreviewUrl(params);
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
        (rawParams.iconType || "") ==
        ParamDefaults.defaultMatchupAnalysisIconType
          ? ["iconType"]
          : [],
        rawParams.breakdownConfig ==
        ParamDefaults.defaultMatchupAnalysisBreakdownConfig
          ? ["breakdownConfig"]
          : [],
        rawParams.shotChartsShowZones ? ["shotChartsShowZones"] : [],
        !rawParams.shotChartsUseEfg ? ["shotChartsUseEfg"] : [],
        rawParams.playStyleConfigStr == ParamDefaults.defaultTeamPlayTypeConfig
          ? ["playStyleConfigStr"]
          : [],
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

  // Update URL when dynamic (non-submit fields change)
  useEffect(() => {
    onMatchupFilterParamsChange({
      ...matchupFilterParamsRef.current,
      breakdownConfig: breakdownView,
      shotChartsShowZones: shotChartsShowZones,
      shotChartsUseEfg: shotChartsUseEfg,
      playStyleConfigStr: playStyleConfigStr,
    });
  }, [
    breakdownView,
    shotChartsShowZones,
    shotChartsUseEfg,
    playStyleConfigStr,
  ]);

  // Load team grades, needed for play recap view

  const [divisionStatsCache, setDivisionStatsCache] = useState(
    {} as DivisionStatsCache
  );

  /** Set this here and in teamDefenseStatsQueryTemplate+teamPlayerDefenseStatsQueryTemplate to check we get approx the
   * same number when looking at season averages and average across all games
   */
  const seasonVsGameAverageDebugMode = false;

  const [allPlayerStatsCache, setAllPlayerStatsCache] = useState<
    Record<string, IndivStatSet[]>
  >({});

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

      // Also load all players into a separate cache, for defensive purposes
      // TODO: really should load them all into ES instead and then get only those I need
      // But this will do to prove the concept
      const fetchPlayers = LeaderboardUtils.getMultiYearPlayerLboards(
        "all",
        matchupFilterParams.gender || ParamDefaults.defaultGender,
        matchupFilterParams.year || ParamDefaults.defaultYear,
        "All",
        [],
        []
      );
      fetchPlayers.then((players) => {
        setAllPlayerStatsCache(
          _.groupBy(
            _.flatMap(
              players,
              (pp) => pp?.players || []
            ) as Array<IndivStatSet>,
            (p) => p.team
          )
        );
      });
    }
  }, [matchupFilterParams]);

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
  const shotChartsRef = useRef<HTMLDivElement>(null);
  const navigationRefs = {
    Top: { ref: topRef },
    "Play Types": { ref: playTypesRef },
    "Player Impact": { ref: playerImpactRef },
    "Shot Charts": showShotCharts ? { ref: shotChartsRef } : { skip: true },
  };

  /** Only rebuild the chart if the data changes, or if one of the filter params changes */
  const chart = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        title="Player Impact Chart"
        helpLink={maybeShowDocs()}
      >
        <Col
          xs={12}
          className="w-100 text-center d-flex justify-content-center recharts-container"
        >
          <PlayerImpactChart
            startingState={matchupFilterParamsRef.current || {}}
            opponent={matchupFilterParams.oppoTeam || ""}
            dataEvent={dataEvent}
            onChangeState={onMatchupFilterParamsChange}
            seasonStats={true}
          />
        </Col>
      </GenericCollapsibleCard>
    );
  }, [dataEvent]);

  /** Only rebuild the chart if the data changes, or if one of the filter params changes */
  const playStyleChart = React.useMemo(() => {
    const [defensiveBreakdownA, defensiveBreakdownB] = _.thru(null, () => {
      const showDefA =
        (breakdownViewArr?.[0] || "off") == "def" ||
        matchupFilterParams.oppoTeam == AvailableTeams.noOpponent;

      //DEBUG MODE:
      // This ensures we have the same roster stats for season average and average of games (see use below for more)
      const useExactPlayerSetInDebugMode = false;
      const globalRosterStats = seasonVsGameAverageDebugMode
        ? useExactPlayerSetInDebugMode
          ? _.values(
              RosterTableUtils.buildRosterTableByCode(
                dataEvent.rosterStatsA.global,
                dataEvent.teamStatsA.global.roster || {},
                true //(injects positional info into the player stats, needed for play style analysis below)
              )
            )
          : allPlayerStatsCache[matchupFilterParams.team || "??"] || []
        : [];

      const defA =
        !_.isEmpty(dataEvent.defensiveInfoA) && showDefA
          ? PlayTypeUtils.buildTeamDefenseBreakdown(
              dataEvent.defensiveInfoA,
              seasonVsGameAverageDebugMode
                ? _.mapValues(
                    allPlayerStatsCache, //(ie always returns this regardless of team faced, since with this debug flag...
                    (__) => globalRosterStats //... we are always looking at team's offense, not opponents')
                  )
                : allPlayerStatsCache
            )
          : undefined;

      const showDefB = (breakdownViewArr?.[1] || "off") == "def";
      const defB =
        !_.isEmpty(dataEvent.defensiveInfoA) && showDefB
          ? PlayTypeUtils.buildTeamDefenseBreakdown(
              dataEvent.defensiveInfoB,
              allPlayerStatsCache
            )
          : undefined;

      return [defA, defB];
    });

    const genderYearLookup = `${
      matchupFilterParams.gender || ParamDefaults.defaultGender
    }_${matchupFilterParams.year || ParamDefaults.defaultYear}`;
    const avgEfficiency =
      efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        title="Play Type Breakdown"
        helpLink={maybeShowDocs()}
      >
        {!_.isEmpty(divisionStatsCache) ? (
          <Container>
            <Row>
              <Col xs={12} className="text-center small">
                <ToggleButtonGroup
                  items={(matchupFilterParams.oppoTeam !=
                  AvailableTeams.noOpponent
                    ? [
                        {
                          label: "Off v Def",
                          tooltip:
                            "Show Top Team Offense vs Bottom Team Defense",
                          toggled: breakdownView == "off;def",
                          onClick: () => setBreakdownView("off;def"),
                        },
                        {
                          label: "Def v Off",
                          tooltip:
                            "Show Top Team Defense vs Bottom Team Offense",
                          toggled: breakdownView == "def;off",
                          onClick: () => setBreakdownView("def;off"),
                        },
                        {
                          label: "Off v Off",
                          tooltip:
                            "Show Top Team Offense vs Bottom Team Offense",
                          toggled: breakdownView == "off;off",
                          onClick: () => setBreakdownView("off;off"),
                        },
                        {
                          label: "Def v Def",
                          tooltip:
                            "Show Top Team Defense vs Bottom Team Defense",
                          toggled: breakdownView == "def;def",
                          onClick: () => setBreakdownView("def;def"),
                        },
                      ]
                    : ([] as Array<any>)
                  ).concat([
                    {
                      label:
                        matchupFilterParams.oppoTeam !=
                        AvailableTeams.noOpponent
                          ? "| LEGEND |"
                          : "LEGEND |",
                      tooltip: PlayTypeDiagUtils.buildLegendText,
                      toggled: true,
                      onClick: () => {},
                      isLabelOnly: true,
                    },
                    {
                      tooltip: null,
                      toggled: true,
                      onClick: () => {},
                      isLabelOnly: true,
                      label: PlayTypeDiagUtils.buildCsvDownload(
                        "CSV",
                        `${matchupFilterParams.team || "Unknown"} ${
                          matchupFilterParams.oppoTeam || ""
                        }`,
                        csvData,
                        () => {
                          const dataTeamA: object[] =
                            PlayTypeDiagUtils.buildTeamStyleBreakdownData(
                              `${matchupFilterParams.team || "Unknown"}${
                                breakdownViewArr?.[0] == "def" ? " Defense" : ""
                              }`,
                              true,
                              "", // (always unknown who the opponent is)
                              dataEvent.rosterStatsA,
                              dataEvent.teamStatsA,
                              avgEfficiency,
                              divisionStatsCache,
                              false,
                              breakdownViewArr?.[0] == "def"
                                ? defensiveBreakdownA
                                : undefined
                            );
                          const dataTeamB: object[] =
                            _.isEmpty(divisionStatsCache) ||
                            (_.isEmpty(dataEvent.rosterStatsB.global) &&
                              matchupFilterParams.oppoTeam ==
                                AvailableTeams.noOpponent &&
                              _.isEmpty(dataEvent.rosterStatsA.global))
                              ? []
                              : PlayTypeDiagUtils.buildTeamStyleBreakdownData(
                                  matchupFilterParams.oppoTeam ==
                                    AvailableTeams.noOpponent
                                    ? `${
                                        matchupFilterParams.team || "Unknown"
                                      } Defense`
                                    : `${
                                        matchupFilterParams.oppoTeam ||
                                        "Unknown"
                                      }${
                                        breakdownViewArr?.[1] == "def"
                                          ? " Defense"
                                          : ""
                                      }`,
                                  true,
                                  "", // (always unknown who the opponent is)
                                  dataEvent.rosterStatsB,
                                  matchupFilterParams.oppoTeam ==
                                    AvailableTeams.noOpponent
                                    ? dataEvent.teamStatsA //(contains the SoS info needed for adj defense)
                                    : dataEvent.teamStatsB,
                                  avgEfficiency,
                                  divisionStatsCache,
                                  false,
                                  matchupFilterParams.oppoTeam ==
                                    AvailableTeams.noOpponent
                                    ? defensiveBreakdownA
                                    : defensiveBreakdownB
                                );
                          setCsvData(dataTeamA.concat(dataTeamB));
                        }
                      ),
                    },
                  ])}
                />
              </Col>
            </Row>
          </Container>
        ) : undefined}
        {dataEvent.teamStatsA.baseline.off_poss?.value ? (
          <Container>
            <Row>
              <Col xs={12}>
                {_.isEmpty(divisionStatsCache) ||
                _.isEmpty(dataEvent.rosterStatsA.global) ? (
                  <span>
                    <i>(Loading data...)</i>
                  </span>
                ) : (
                  PlayTypeDiagUtils.buildTeamStyleBreakdown(
                    `${matchupFilterParams.team || "Unknown"}${
                      breakdownViewArr?.[0] == "def" ? " Defense" : ""
                    }`,
                    dataEvent.rosterStatsA,
                    dataEvent.teamStatsA,
                    avgEfficiency,
                    divisionStatsCache,
                    showHelp,
                    false,
                    breakdownViewArr?.[0] == "def"
                      ? defensiveBreakdownA
                      : undefined,
                    undefined,
                    playStyleConfigStr,
                    (newConfigStr: string) =>
                      setPlayStyleConfigStr(newConfigStr)
                  )
                )}
              </Col>
            </Row>
            <Row className="mt-2">
              <Col xs={12}>
                {_.isEmpty(divisionStatsCache) ||
                (_.isEmpty(dataEvent.rosterStatsB.global) &&
                  matchupFilterParams.oppoTeam == AvailableTeams.noOpponent &&
                  _.isEmpty(dataEvent.rosterStatsA.global)) ? (
                  <span></span>
                ) : (
                  PlayTypeDiagUtils.buildTeamStyleBreakdown(
                    matchupFilterParams.oppoTeam == AvailableTeams.noOpponent
                      ? `${matchupFilterParams.team || "Unknown"} Defense`
                      : `${matchupFilterParams.oppoTeam || "Unknown"}${
                          defensiveBreakdownB ? " Defense" : ""
                        }`,
                    dataEvent.rosterStatsB,
                    matchupFilterParams.oppoTeam == AvailableTeams.noOpponent
                      ? dataEvent.teamStatsA //(contains the SoS info needed for adj defense)
                      : dataEvent.teamStatsB,
                    avgEfficiency,
                    divisionStatsCache,
                    showHelp,
                    false,
                    matchupFilterParams.oppoTeam == AvailableTeams.noOpponent
                      ? defensiveBreakdownA
                      : defensiveBreakdownB,
                    undefined,
                    playStyleConfigStr,
                    (newConfigStr: string) =>
                      setPlayStyleConfigStr(newConfigStr)
                  )
                )}
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
  }, [
    dataEvent,
    divisionStatsCache,
    allPlayerStatsCache,
    breakdownView,
    csvData,
    playStyleConfigStr,
  ]);

  /** Only rebuild the chart if the data changes, or if one of the filter params changes */
  const shotChart = React.useMemo(() => {
    return (
      <GenericCollapsibleCard
        minimizeMargin={true}
        title="Team Shot Charts"
        helpLink={maybeShowDocs()}
      >
        {matchupFilterParams.oppoTeam != AvailableTeams.noOpponent ? (
          <Container>
            <Row>
              <Col xs={12} className="text-center small">
                <ToggleButtonGroup
                  items={[
                    {
                      label: "Off v Def",
                      tooltip: "Show Top Team Offense vs Bottom Team Defense",
                      toggled: breakdownView == "off;def",
                      onClick: () => setBreakdownView("off;def"),
                    },
                    {
                      label: "Def v Off",
                      tooltip: "Show Top Team Defense vs Bottom Team Offense",
                      toggled: breakdownView == "def;off",
                      onClick: () => setBreakdownView("def;off"),
                    },
                    {
                      label: "Off v Off",
                      tooltip: "Show Top Team Offense vs Bottom Team Offense",
                      toggled: breakdownView == "off;off",
                      onClick: () => setBreakdownView("off;off"),
                    },
                    {
                      label: "Def v Def",
                      tooltip: "Show Top Team Defense vs Bottom Team Defense",
                      toggled: breakdownView == "def;def",
                      onClick: () => setBreakdownView("def;def"),
                    },
                  ]}
                />
              </Col>
            </Row>
          </Container>
        ) : null}
        {dataEvent.teamStatsA.baseline.off_poss?.value ? (
          <Container>
            <Row>
              <Col xs={12} className="text-center small">
                <ShotChartDiagView
                  off={
                    breakdownViewArr?.[0] == "off"
                      ? dataEvent.shotChartInfoA.off
                      : dataEvent.shotChartInfoA.def
                  }
                  def={
                    matchupFilterParams.oppoTeam == AvailableTeams.noOpponent
                      ? dataEvent.shotChartInfoA.def
                      : breakdownViewArr?.[1] == "off"
                      ? dataEvent.shotChartInfoB.off
                      : dataEvent.shotChartInfoB.def
                  }
                  gender={matchupFilterParams.gender as "Men" | "Women"}
                  quickSwitchOptions={[]}
                  chartOpts={{
                    buildZones: shotChartsShowZones,
                    useEfg: shotChartsUseEfg,
                  }}
                  onChangeChartOpts={(newOpts) => {
                    setShotChartsShowZones(newOpts.buildZones || false);
                    setShotChartsUseEfg(newOpts.useEfg ?? false);
                  }}
                  labelOverrides={[
                    breakdownViewArr?.[0] == "off"
                      ? `${matchupFilterParams.team} Offense:`
                      : `${matchupFilterParams.team} Defense:`,
                    matchupFilterParams.oppoTeam == AvailableTeams.noOpponent
                      ? `${matchupFilterParams.team} Defense:`
                      : breakdownViewArr?.[1] == "off"
                      ? `${matchupFilterParams.oppoTeam} Offense:`
                      : `${matchupFilterParams.oppoTeam} Defense:`,
                  ]}
                  offDefOverrides={[
                    breakdownViewArr?.[0] != "off",
                    matchupFilterParams.oppoTeam == AvailableTeams.noOpponent ||
                      breakdownViewArr?.[1] != "off",
                  ]}
                />
              </Col>
            </Row>
            {matchupFilterParams.oppoTeam != AvailableTeams.noOpponent ? (
              <Row>
                <Col xs={12} className="text-center small">
                  <ShotChartDiagView
                    off={
                      breakdownViewArr?.[0] == "off"
                        ? dataEvent.shotChartInfoA.def
                        : dataEvent.shotChartInfoA.off
                    }
                    def={
                      breakdownViewArr?.[1] == "off"
                        ? dataEvent.shotChartInfoB.def
                        : dataEvent.shotChartInfoB.off
                    }
                    gender={matchupFilterParams.gender as "Men" | "Women"}
                    quickSwitchOptions={[]}
                    chartOpts={{
                      buildZones: shotChartsShowZones,
                      useEfg: shotChartsUseEfg,
                    }}
                    onChangeChartOpts={undefined}
                    labelOverrides={[
                      breakdownViewArr?.[0] == "off"
                        ? `${matchupFilterParams.team} Defense:`
                        : `${matchupFilterParams.team} Offense:`,
                      breakdownViewArr?.[1] == "off"
                        ? `${matchupFilterParams.oppoTeam} Defense:`
                        : `${matchupFilterParams.oppoTeam} Offense:`,
                    ]}
                    offDefOverrides={[
                      breakdownViewArr?.[0] == "off",
                      breakdownViewArr?.[1] == "off",
                    ]}
                    invertLeftRight={
                      breakdownViewArr?.[0] != breakdownViewArr?.[1]
                    }
                  />
                </Col>
              </Row>
            ) : undefined}
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
  }, [dataEvent, breakdownView, shotChartsShowZones, shotChartsUseEfg]);

  return (
    <Container>
      <SiteModeDropdown />
      <Row ref={topRef} className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Match-up Preview Tool</h3>
        </Col>
      </Row>
      <Row>
        <HeaderBar
          common={matchupFilterParams}
          thisPage={`${ParamPrefixes.gameInfo}_preview`}
        />
      </Row>
      <Row>
        <GenericCollapsibleCard
          minimizeMargin={false}
          title="Team and Game Filter"
          summary={HistoryManager.gameReportFilterSummary(matchupFilterParams)}
        >
          <MatchupPreviewFilter
            onStats={injectStats}
            startingState={matchupFilterParams}
            onChangeState={onMatchupFilterParamsChange}
            includeDefense={true}
          />
        </GenericCollapsibleCard>
      </Row>
      <InternalNavBarInRow refs={navigationRefs} showAnnotations={true} />
      <Row
        style={{
          breakBefore: "page",
        }}
        ref={playTypesRef}
      >
        {playStyleChart}
      </Row>
      <Row
        style={{
          breakBefore: "page",
        }}
        ref={playerImpactRef}
      >
        {chart}
      </Row>
      {showShotCharts ? (
        <Row
          style={{
            breakBefore: "page",
          }}
          ref={shotChartsRef}
        >
          {shotChart}
        </Row>
      ) : undefined}
      <Footer
        year={matchupFilterParams.year}
        gender={matchupFilterParams.gender}
        hasLogos={true}
        server={server}
      />
    </Container>
  );
};
export default MatchupPreviewAnalyzerPage;
