// React imports:
import _ from "lodash";
import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col } from "react-bootstrap";
//@ts-ignore
import Select, { components } from "react-select";
import {
  ReferenceLine,
  ReferenceArea,
  Legend,
  Tooltip as RechartTooltip,
  CartesianGrid,
  Cell,
  Label,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  LabelList,
} from "recharts";
import { CbbColors } from "../utils/CbbColors";
import { ScatterChartUtils } from "../utils/charts/ScatterChartUtils";

import {
  getCommonFilterParams,
  MatchupFilterParams,
  ParamDefaults,
} from "../utils/FilterModels";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import { LineupUtils } from "../utils/stats/LineupUtils";
import { GameAnalysisUtils } from "../utils/tables/GameAnalysisUtils";
import { LineupStatsModel } from "./LineupStatsTable";
import { RosterStatsModel } from "./RosterStatsTable";
import { TeamStatsModel } from "./TeamStatsTable";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import { PositionUtils } from "../utils/stats/PositionUtils";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { IndivPosInfo } from "../utils/StatModels";
import PlayerImpactBreakdownTable, {
  PlayerImpactPoint,
} from "./shared/PlayerImpactBreakdownTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faFilter } from "@fortawesome/free-solid-svg-icons";
import ThemedSelect from "./shared/ThemedSelect";
import { useTheme } from "next-themes";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import AsyncFormControl from "./shared/AsyncFormControl";
import InputGroup from "react-bootstrap/InputGroup";

type Props = {
  startingState: MatchupFilterParams;
  opponent: string;
  dataEvent: {
    lineupStatsA: LineupStatsModel;
    teamStatsA: TeamStatsModel;
    rosterStatsA: RosterStatsModel;
    lineupStatsB: LineupStatsModel;
    teamStatsB: TeamStatsModel;
    rosterStatsB: RosterStatsModel;
  };
  onChangeState: (newParams: MatchupFilterParams) => void;
  seasonStats?: Boolean; //(defaults to game mode)
};

const graphLimit = 10.0;

const PlayerImpactChart: React.FunctionComponent<Props> = ({
  startingState,
  opponent,
  dataEvent,
  onChangeState,
  seasonStats,
}) => {
  const {
    lineupStatsA,
    teamStatsA,
    rosterStatsA,
    lineupStatsB,
    teamStatsB,
    rosterStatsB,
  } = dataEvent;

  const globalScatterChartRef = useRef<any>();

  // Model

  const commonParams = getCommonFilterParams(startingState);
  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  // Luck:
  const [adjustForLuck, setAdjustForLuck] = useState(
    _.isNil(startingState.onOffLuck)
      ? ParamDefaults.defaultOnOffLuckAdjust
      : startingState.onOffLuck,
  );
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(startingState.luck)
      ? ParamDefaults.defaultLuckConfig
      : startingState.luck,
  );

  const [posClasses, setPosClasses] = useState(startingState.posClasses || "");
  const buildPosClassSet = (classes: string): Set<string> | undefined => {
    return classes
      ? new Set(
          _.flatMap(
            (classes || "").split(","),
            (c) => PositionUtils.expandedPosClasses[c] || [c],
          ),
        )
      : undefined;
  };

  const [showTeam, setShowTeam] = useState<boolean>(
    _.isNil(startingState.showTeam) ? true : startingState.showTeam,
  );
  const [showOppo, setShowOppo] = useState<boolean>(
    _.isNil(startingState.showOppo) ? true : startingState.showOppo,
  );
  const [factorMins, setFactorMins] = useState<boolean>(
    _.isNil(startingState.factorMins) ? true : startingState.factorMins,
  );
  const [impactPerGame, setImpactPerGame] = useState<boolean>(
    _.isNil(startingState.impactPerGame) ? false : startingState.impactPerGame,
  );
  const [lockAspect, setLockAspect] = useState<boolean>(
    _.isNil(startingState.lockAspect)
      ? ParamDefaults.defaultMatchupAnalysisAspectLock
      : startingState.lockAspect,
  );

  const [breakdownLayout, setBreakdownLayout] = useState<
    "side-by-side" | "separate" | "combined"
  >("side-by-side");

  const [adjBreakdownForSoS, setAdjBreakdownForSoS] = useState<boolean>(
    _.isNil(startingState.adjImpactStats)
      ? ParamDefaults.defaultAdjImpactStats
      : startingState.adjImpactStats,
  );
  const [showImpactBreakdown, setShowImpactBreakdown] = useState<boolean>(
    _.isNil(startingState.showImpactBreakdown)
      ? ParamDefaults.defaultShowImpactBreakdown
      : startingState.showImpactBreakdown,
  );
  const [breakdownShowFilter, setBreakdownShowFilter] = useState(false);
  const [breakdownFilterStr, setBreakdownFilterStr] = useState("");
  const [breakdownShowWalkOns, setBreakdownShowWalkOns] = useState(false);

  // Filter breakdown table points (walk-ons excluded by default; optional text filter)
  const fragmentDelimiter = breakdownFilterStr.includes(";") ? ";" : ",";
  const breakdownFilterFragments = breakdownFilterStr
    .split(fragmentDelimiter)
    .map((f: string) => _.trim(f))
    .filter(Boolean);
  const breakdownFilterPve = breakdownFilterFragments.filter(
    (f: string) => f[0] !== "-",
  );
  const breakdownFilterNve = breakdownFilterFragments
    .filter((f: string) => f[0] === "-")
    .map((f: string) => f.substring(1));

  const filterBreakdownPoints = (
    points: PlayerImpactPoint[],
  ): PlayerImpactPoint[] =>
    points.filter((point) => {
      const possPct = point.stats?.off_team_poss_pct?.value ?? 0;
      // Backend may store as decimal (0.016) or percentage (1.6); normalize to decimal
      const walkOnThresh = seasonStats ? 0.1 : 0.05;
      if (!breakdownShowWalkOns && possPct < walkOnThresh) return false;
      if (breakdownFilterPve.length === 0 && breakdownFilterNve.length === 0)
        return true;
      const fullName = (point.stats as any)?.key ?? point.name ?? "";
      const code =
        (point.stats as any)?.code ??
        point.onOffStats?.playerCode ??
        point.name ??
        "";
      const strToTest = `${fullName} ${code}`.toLowerCase();
      const matchesPve =
        breakdownFilterPve.length === 0 ||
        breakdownFilterPve.some((f: string) =>
          strToTest.includes(f.toLowerCase()),
        );
      const matchesNve = breakdownFilterNve.some((f: string) =>
        strToTest.includes(f.toLowerCase()),
      );
      return matchesPve && !matchesNve;
    });

  // Viewport management

  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setCachedStats({ ab: [] });
  }, [resolvedTheme]);

  const teamAColor = resolvedTheme == "dark" ? "#ccc" : "black";
  const teamBColor = resolvedTheme == "dark" ? "hotpink" : "purple";
  const themedColorBuilder =
    resolvedTheme == "dark"
      ? CbbColors.off_diff10_p100_redGreen_darkMode
      : CbbColors.off_diff10_p100_redBlackGreen;

  const [iconType, setIconType] = useState<"logo" | "icon" | "pos" | "jersey">(
    (startingState.iconType || ParamDefaults.defaultMatchupAnalysisIconType) as
      | "logo"
      | "icon"
      | "pos"
      | "jersey",
  );

  const [screenHeight, setScreenHeight] = useState(512);
  const [screenWidth, setScreenWidth] = useState(512);
  const isSmallScreen = screenWidth <= 800;

  //(would only need these if using dynamic sizing)
  // const latestScreenHeight = useRef(screenHeight);
  // const latestScreenWidth = useRef(screenWidth);
  const calcWidthHeight = (): [number, number] => {
    const baseHeight = Math.max(0.5 * window.innerHeight, 400);
    const baseWidth = Math.max(
      baseHeight,
      Math.max(0.5 * window.innerWidth, 400),
    );
    return [baseWidth, baseHeight];
  };
  // Comms with main page

  useEffect(() => {
    onChangeState({
      ...startingState,
      posClasses,
      showTeam,
      showOppo,
      factorMins,
      impactPerGame,
      lockAspect,
      iconType,
      adjImpactStats: adjBreakdownForSoS,
      showImpactBreakdown,
    });
  }, [
    posClasses,
    showTeam,
    showOppo,
    factorMins,
    impactPerGame,
    lockAspect,
    iconType,
    adjBreakdownForSoS,
    showImpactBreakdown,
  ]);

  // RAPM building

  const [cachedStats, setCachedStats] = useState<{ ab: any[] }>({ ab: [] });

  const breakdownPoints = (cachedStats.ab as PlayerImpactPoint[]).filter(
    (p): p is PlayerImpactPoint => !!p?.seriesId,
  );
  const filteredBreakdownPoints = filterBreakdownPoints(breakdownPoints);

  useEffect(() => {
    setCachedStats({ ab: [] });
  }, [dataEvent, adjustForLuck]);
  useEffect(() => {
    const posClassSet = buildPosClassSet(posClasses);

    if (_.isEmpty(cachedStats.ab) && !_.isEmpty(lineupStatsA.lineups)) {
      const aStats = buildStats(
        commonParams.team!,
        teamAColor,
        lineupStatsA,
        teamStatsA,
        rosterStatsA,
        posClassSet,
      );
      const bStats = buildStats(
        opponent,
        teamBColor,
        lineupStatsB,
        teamStatsB,
        rosterStatsB,
        posClassSet,
      );
      setCachedStats({
        ab: _.orderBy(aStats.concat(bStats), (p) => -(p.x * p.x + p.y * p.y)),
        // (render the players around the edge first, who are likely to be less congested)
      });
    }
  }, [cachedStats]);

  const isFilteredCachedAb = (
    p: any,
    posClassSet: Set<string> | undefined,
    team?: string,
  ) => {
    //return true to filter _out_
    const teamToUse = team || p.seriesId;
    return _.thru(_, (__) => {
      if (teamToUse == commonParams.team && !showTeam) {
        return true;
      } else if (teamToUse != commonParams.team && !showOppo) {
        return true;
      } else {
        // Pos stats:
        const posPass = _.thru(
          (p.posInfo as IndivPosInfo)?.posClass,
          (maybePosClass) => {
            if (maybePosClass) {
              return (
                !posClassSet || posClassSet.has(maybePosClass || "Unknown")
              );
            } else {
              return _.isUndefined(posClassSet); //(if don't know pos and pos filter defined then fail)
            }
          },
        );
        return !posPass;
      }
    });
  };
  useEffect(() => {
    const aspectLockedWidthAdj = 6; // (empirical!)

    const graphLimitRatio = graphLimitX / (graphLimitY || 1);

    function handleResize() {
      setTimeout(() => {
        const [baseWidth, baseHeight] = calcWidthHeight();
        setScreenHeight(baseHeight);
        if (lockAspect) {
          setScreenWidth(baseHeight * graphLimitRatio + aspectLockedWidthAdj);
        } else {
          setScreenWidth(baseWidth);
        }
      }, 250);
    }
    window.addEventListener("resize", handleResize);
    const [baseWidth, baseHeight] = calcWidthHeight();
    setScreenHeight(baseHeight);
    if (lockAspect) {
      setScreenWidth(baseHeight * graphLimitRatio + aspectLockedWidthAdj);
    } else {
      setScreenWidth(baseWidth);
    }
    return () => window.removeEventListener("resize", handleResize);
  }, [lockAspect, factorMins, cachedStats]);

  /** Recalculate filtering */
  useEffect(() => {
    const posClassSet = buildPosClassSet(posClasses);
    _.forEach(cachedStats.ab, (p) => {
      p.filteredOut = isFilteredCachedAb(p, posClassSet);
    });
    setCachedStats({
      ab: cachedStats.ab,
    });
  }, [showTeam, showOppo, posClasses]);

  // Calcs

  /** For a given lineup set, calculate RAPM as quickly as possible */
  const buildStats = (
    team: string,
    labelColor: string,
    lineupStats: LineupStatsModel,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel,
    posClassSet: Set<string> | undefined,
  ) => {
    const totalGames = seasonStats
      ? _.size(
          LineupUtils.isGameInfoStatSet(teamStats.baseline?.game_info || {})
            ? LineupUtils.getGameInfo(teamStats.baseline?.game_info || {})
            : teamStats.baseline?.game_info,
        ) || 1
      : 1;

    const { offPerGame, defPerGame } = impactPerGame
      ? {
          offPerGame:
            (0.01 * (teamStats.baseline.off_poss?.value || 0)) / totalGames,
          defPerGame:
            (0.01 * (teamStats.baseline.def_poss?.value || 0)) / totalGames,
        }
      : {
          offPerGame: 1,
          defPerGame: 1,
        };

    return _.thru(
      GameAnalysisUtils.buildGameRapmStats(
        team,
        commonParams,
        lineupStats,
        teamStats,
        rosterStats,
        adjustForLuck,
        luckConfig,
        avgEfficiency,
        !seasonStats,
      ),
      ({ playerInfo, positionInfo, rapmInfo }) => {
        return _.chain(rapmInfo?.enrichedPlayers || [])
          .flatMap((p) => {
            const statObj = playerInfo[p.playerId];
            if (!statObj) return []; //(can happen if the player stats are all missing but other stats are present)

            const offPoss = statObj.off_team_poss_pct?.value || 0;
            const defPoss = statObj.def_team_poss_pct?.value || 0;
            const playerGames = seasonStats
              ? _.size(
                  LineupUtils.isGameInfoStatSet(statObj.game_info)
                    ? LineupUtils.getGameInfo(statObj.game_info || {})
                    : statObj.game_info,
                ) || 1
              : 1;

            const missingGameAdjustmentImpact = totalGames / playerGames;
            //(this is only used for x/y so if not factoring in minutes (game or team min%) then ignore)
            const missingGameAdjustmentXy = factorMins
              ? missingGameAdjustmentImpact
              : 1.0;

            const offRapmProd =
              (p.rapm?.off_adj_ppp?.value || 0) *
              (factorMins ? offPoss : 1.0) *
              missingGameAdjustmentXy *
              offPerGame;
            const defRapmProd =
              (p.rapm?.def_adj_ppp?.value || 0) *
              (factorMins ? defPoss : 1.0) *
              missingGameAdjustmentXy *
              defPerGame;

            // (in season mode, remove sub 5mpg players, likely walk-ons)
            return seasonStats && offPoss < 0.12 && defPoss < 0.12
              ? []
              : [
                  {
                    seriesId: team,
                    labelColor,
                    x: Math.min(graphLimit, Math.max(-graphLimit, offRapmProd)),
                    y: -Math.min(
                      graphLimit,
                      Math.max(-graphLimit, defRapmProd),
                    ),
                    z: offPoss * missingGameAdjustmentXy,
                    color: offRapmProd - defRapmProd,
                    name: GameAnalysisUtils.namePrettifier(p.playerCode),
                    posInfo: positionInfo[p.playerId],
                    stats: statObj,
                    onOffStats: p,
                    perGamePoss: [offPerGame, defPerGame],
                    missingGameAdj: missingGameAdjustmentImpact,
                    filteredOut: isFilteredCachedAb(
                      { posInfo: positionInfo[p.playerId] },
                      posClassSet,
                      team,
                    ),
                  },
                ];
          })
          .value();
      },
    );
  };

  // Tooltip:

  type CustomTooltipProps = {
    active?: boolean;
    payload?: any;
    label?: string;
  };

  const CustomTooltip: React.FunctionComponent<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active) {
      const data = payload?.[0].payload || {};
      return (
        <div
          className="custom-tooltip"
          style={{
            background:
              resolvedTheme == "dark"
                ? "rgba(0, 0, 0, 0.9)"
                : "rgba(238, 238, 238, 0.9)",
          }}
        >
          <small>
            {GameAnalysisUtils.buildPlayerTooltipContents(
              data.seriesId,
              data.stats,
              data.onOffStats,
              data.posInfo,
              seasonStats || false,
              impactPerGame ? data.perGamePoss : undefined,
              data.missingGameAdj,
            )}
          </small>
        </div>
      );
    } else {
      return null;
    }
  };

  // Calculate the x/y limits:
  const [xMin, xMax, yMin, yMax] = _.transform(
    cachedStats.ab,
    (acc, v) => {
      acc[0] = Math.min(acc[0], v.x);
      acc[1] = Math.max(acc[1], v.x);
      acc[2] = Math.min(acc[2], v.y);
      acc[3] = Math.max(acc[3], v.y);
    },
    [1000, -1000, 1000, -1000],
  );

  const calcGraphLimit = (min: number, max: number) => {
    const factor = _.find(
      (impactPerGame ? [0.4] : []).concat([0.6, 0.8]),
      (factor) => min > -factor * graphLimit && max < factor * graphLimit,
    );
    return factor ? factor * graphLimit : graphLimit;
  };
  const graphLimitX = calcGraphLimit(xMin, xMax);
  const graphLimitY = calcGraphLimit(yMin, yMax);

  // Position filter
  //TODO: duplicated in PlayerLeaderboardTable - need to move to tables/PositionUtils

  function getCurrentPositionsOrPlaceholder() {
    return posClasses == ""
      ? { label: "All Positions" }
      : posClasses
          .split(",")
          .map((posClass: string) =>
            stringToOption(
              PositionUtils.nicknameToPosClass[posClass] || posClass,
            ),
          );
  }

  /** Slightly hacky code to render the position abbreviations */
  const PositionValueContainer = (props: any) => {
    const oldText = props.children[0];
    const fullPosition = oldText.props.children;
    const newText = {
      ...oldText,
      props: {
        ...oldText.props,
        children: [
          PositionUtils.posClassToNickname[fullPosition] || fullPosition,
        ],
      },
    };
    const newProps = {
      ...props,
      children: [newText, props.children[1]],
    };
    return <components.MultiValueContainer {...newProps} />;
  };

  // Chart:

  const maybeIconSquareSize = (mult: number = 1.0) => {
    if (iconType == "logo") {
      return 20 * mult;
    } else {
      return undefined;
    }
  };

  const CustomPngPoint = (props: any) => {
    const { color, seriesId, cx, cy, payload } = props;
    const imageSize = maybeIconSquareSize() || 20; // Adjust the size as needed

    // cx, cy are the calculated center coordinates from Recharts
    // Adjust x and y to center the image on the data point
    const x = cx - imageSize / 2;
    const y = cy - imageSize / 2;
    const opacity = _.isNumber(props.opacity || 0)
      ? props.opacity || 0
      : 0.01 * parseInt(props.opacity || 0);
    const fillOpacity = _.isNumber(props.fillOpacity || 0)
      ? props.fillOpacity || 0
      : 0.01 * parseInt(props.fillOpacity || 0);
    const totalOpacity = (props.opacity || 0) * (fillOpacity || 0);

    return (
      <svg
        x={x}
        y={y}
        width={imageSize}
        height={imageSize}
        opacity={totalOpacity}
        overflow="visible"
      >
        <image
          href={`logos/${
            resolvedTheme == "dark" ? "dark" : "normal"
          }/${seriesId}.png`} // Use the imageUrl from your data
          width={imageSize}
          height={imageSize}
        />
      </svg>
    );
  };

  function stringToOption(s: string) {
    return { label: s, value: s };
  }
  const labelState = ScatterChartUtils.buildEmptyLabelState();

  const renderCustomizedLegend = (props: any) => {
    const { payload } = props;
    return (
      <div>
        {payload.map((entry: any, index: number) => {
          return (
            <>
              <span
                className="pl-3"
                key={`item-${index}`}
                style={{ color: entry.color }}
              >
                <img
                  style={{ width: "16px", height: "16px" }}
                  src={`logos/${resolvedTheme == "dark" ? "dark" : "normal"}/${
                    entry.value || "Unknown"
                  }.png`} // Use the imageUrl from your data
                />{" "}
                {entry.value}
              </span>
            </>
          );
        })}
      </div>
    );
  };

  const scaleType = impactPerGame ? "/G" : factorMins ? "T%" : "P%";
  const wordForOffensive = isSmallScreen ? "Off." : "Offensive";
  const wordForImpact = impactPerGame ? "Impact /G" : "Impact";

  const chart = React.useMemo(
    () => (
      <ResponsiveContainer width={screenWidth} height={screenHeight}>
        <ScatterChart ref={globalScatterChartRef}>
          <defs>
            <linearGradient
              id="xAxisGradient"
              x1="0"
              y1="0"
              x2={screenWidth}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={themedColorBuilder(-10)} />
              <stop
                offset="100%"
                stopColor={themedColorBuilder(10)}
                stopOpacity={1}
              />
            </linearGradient>
            <linearGradient
              id="yAxisGradient"
              x1="0"
              y1="0"
              x2="0"
              y2={screenHeight}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={themedColorBuilder(10)} />
              <stop
                offset="100%"
                stopColor={themedColorBuilder(-10)}
                stopOpacity={1}
              />
            </linearGradient>
          </defs>

          <ReferenceLine y={0} strokeWidth={1} />
          <ReferenceLine x={0} strokeWidth={1} />

          <ReferenceArea
            x1={-graphLimitX}
            x2={0}
            y1={graphLimitY}
            y2={0}
            fillOpacity={0}
          >
            <Label
              position="insideTopLeft"
              value={isSmallScreen ? "Good D" : "Negative=Good D"}
            />
          </ReferenceArea>
          <ReferenceArea
            x1={0}
            x2={graphLimitX}
            y1={0}
            y2={-graphLimitY}
            fillOpacity={0}
          >
            <Label
              position="insideBottomRight"
              value={isSmallScreen ? "Good O" : "Positive=Good O"}
            />
          </ReferenceArea>

          <Legend
            verticalAlign="bottom"
            align="center"
            iconSize={8}
            content={iconType == "logo" ? renderCustomizedLegend : undefined}
          />
          <XAxis
            type="number"
            stroke={resolvedTheme == "dark" ? "#CCC" : undefined}
            dataKey="x"
            domain={[-graphLimitX, graphLimitX]}
            axisLine={{ stroke: "url(#xAxisGradient)", strokeWidth: 3 }}
          >
            <Label
              value={
                factorMins
                  ? `${wordForOffensive} ${wordForImpact} (pts)`
                  : `${wordForOffensive} RAPM (pts)`
              }
              position="top"
              style={{ textAnchor: "middle" }}
              fill={resolvedTheme == "dark" ? "#CCC" : undefined}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            stroke={resolvedTheme == "dark" ? "#CCC" : undefined}
            domain={[-graphLimitY, graphLimitY]}
            axisLine={{ stroke: "url(#yAxisGradient)", strokeWidth: 3 }}
            tickFormatter={(s) => `-${s}`.replace("--", "")}
          >
            <Label
              angle={-90}
              value={
                factorMins
                  ? `Defensive ${wordForImpact} (pts)`
                  : "Defensive RAPM (pts)"
              }
              position="insideLeft"
              style={{ textAnchor: "middle" }}
              fill={resolvedTheme == "dark" ? "#CCC" : undefined}
            />
          </YAxis>
          {seasonStats ? (
            <ZAxis type="number" dataKey="z" range={[10, 100]} />
          ) : undefined}
          <CartesianGrid strokeDasharray="4" />

          <Scatter
            data={cachedStats.ab}
            fill={teamAColor}
            fillOpacity={
              iconType == "icon" || iconType == "logo" ? "100%" : "0%"
            }
            name={commonParams.team!}
            shape={iconType == "logo" ? <CustomPngPoint /> : "triangle"}
            legendType="triangle"
          >
            {iconType == "pos" ? (
              <LabelList
                style={{ fontSize: "12px", pointerEvents: "none" }}
                valueAccessor={(p: any) => p.posInfo?.posClass || "??"}
              />
            ) : null}
            {iconType == "jersey" ? (
              <LabelList
                style={{ fontSize: "12px", pointerEvents: "none" }}
                valueAccessor={(p: any) =>
                  `#${p.stats?.roster?.number || "??"}`
                }
              />
            ) : null}
            {ScatterChartUtils.buildTidiedLabelList({
              maxHeight: screenHeight,
              maxWidth: screenWidth,
              chartRef: globalScatterChartRef,
              iconHeightOverride: maybeIconSquareSize(),
              iconWidthOverride: maybeIconSquareSize(),
              mutableState: labelState,
              dataKey: "name",
              series: cachedStats.ab,
            })}
            {_.values(cachedStats.ab).map((p, index) => {
              return p.seriesId == commonParams.team! ? (
                <Cell
                  key={`cellA-${index}`}
                  fill={themedColorBuilder(p.color)}
                  opacity={p.filteredOut ? 0.25 : 1}
                />
              ) : (
                <Cell key={`cellA-${index}`} opacity={0} />
              );
            })}
            ;
          </Scatter>
          <Scatter
            data={cachedStats.ab}
            fill={teamBColor}
            fillOpacity={
              iconType == "icon" || iconType == "logo" ? "100%" : "0%"
            }
            shape={iconType == "logo" ? <CustomPngPoint /> : "circle"}
            name={opponent}
            legendType="circle"
          >
            {iconType == "pos" ? (
              <LabelList
                style={{ fontSize: "12px", pointerEvents: "none" }}
                valueAccessor={(p: any) => p.posInfo?.posClass || "??"}
              />
            ) : null}
            {iconType == "jersey" ? (
              <LabelList
                style={{ fontSize: "12px", pointerEvents: "none" }}
                valueAccessor={(p: any) =>
                  `#${p.stats?.roster?.number || "??"}`
                }
              />
            ) : null}
            {ScatterChartUtils.buildTidiedLabelList({
              maxHeight: screenHeight,
              maxWidth: screenWidth,
              chartRef: globalScatterChartRef,
              iconHeightOverride: maybeIconSquareSize(),
              iconWidthOverride: maybeIconSquareSize(),
              mutableState: labelState,
              dataKey: "name",
              series: cachedStats.ab,
            })}
            {_.values(cachedStats.ab).map((p, index) => {
              return p.seriesId == opponent ? (
                <Cell
                  key={`cellB-${index}`}
                  fill={themedColorBuilder(p.color)}
                  opacity={p.filteredOut ? 0.25 : 1}
                />
              ) : (
                <Cell key={`cellB-${index}`} opacity={0} />
              );
            })}
            ;
          </Scatter>
          <RechartTooltip
            content={<CustomTooltip />}
            wrapperStyle={{ opacity: "0.9", zIndex: 1000 }}
            allowEscapeViewBox={{ x: true, y: false }}
            itemSorter={(item: any) => item.value}
          />
        </ScatterChart>
      </ResponsiveContainer>
    ),
    [
      cachedStats,
      screenWidth,
      screenHeight,
      posClasses,
      showTeam,
      showOppo,
      factorMins,
      impactPerGame,
      lockAspect,
      iconType,
      resolvedTheme,
      dataEvent,
    ],
  );

  return _.isEmpty(cachedStats.ab) ? (
    <Col className="text-center w-100">
      <i>(No Data)</i>
    </Col>
  ) : (
    <Container className="recharts-container">
      <Row className="text-left">
        <Col xs={12} md={12} lg={6} className="mb-1">
          <ToggleButtonGroup
            items={[
              {
                label: <span>&#9650;</span>,
                tooltip: `Show/fade players from ${startingState.team || "??"}`,
                toggled: showTeam,
                onClick: () => setShowTeam(!showTeam),
              },
              {
                label: <small>&#9679;</small>,
                tooltip: `Show/fade players from ${
                  startingState.oppoTeam || "??"
                }`,
                disabled: opponent == AvailableTeams.noOpponent,
                toggled: showOppo && opponent != AvailableTeams.noOpponent,
                onClick: () => setShowOppo(!showOppo),
              },
              {
                label: <FontAwesomeIcon icon={faLock} />,
                tooltip: `Lock/unlock fixed aspect ratio`,
                toggled: lockAspect,
                onClick: () => setLockAspect(!lockAspect),
              },
              {
                label: "| ",
                tooltip: "",
                toggled: true,
                onClick: () => {},
                isLabelOnly: true,
              },
              {
                label: _.thru(iconType, (__) => {
                  switch (iconType) {
                    case "logo":
                      return (
                        <img
                          style={{ width: "16px", height: "16px" }}
                          src={`logos/${
                            resolvedTheme == "dark" ? "dark" : "normal"
                          }/${startingState.team || "Unknown"}.png`} // Use the imageUrl from your data
                        />
                      );
                    case "icon":
                      return (
                        <small>
                          &#9650;<sup>&#9679;</sup>
                        </small>
                      );
                    case "pos":
                      return "PG";
                    default:
                      return "#00";
                  }
                }),
                tooltip: `Toggle through team logo / icon / jersey number / positional role`,
                toggled: false,
                onClick: () => {
                  switch (iconType) {
                    case "logo":
                      setIconType("icon");
                      return;
                    case "icon":
                      setIconType("pos");
                      return;
                    case "pos":
                      setIconType("jersey");
                      return;
                    default:
                      setIconType("logo");
                      return;
                  }
                },
              },
              {
                label: "| ",
                tooltip: "",
                toggled: true,
                onClick: () => {},
                isLabelOnly: true,
              },
              {
                items: [
                  {
                    label: (
                      <small>
                        P<sup>%</sup>
                      </small>
                    ),
                    tooltip: `P%: Player impact (pts above average) per 100 possessions when they are on the court`,
                    toggled: !factorMins && !impactPerGame,
                    onClick: () => {
                      setFactorMins(false);
                      setImpactPerGame(false);
                      setCachedStats({ ab: [] });
                    },
                  },
                  {
                    label: (
                      <small>
                        T<sup>%</sup>
                      </small>
                    ),
                    tooltip: `T%: Player impact (pts above average) per 100 team possessions (so factors in how many minutes they are on the court)`,
                    toggled: factorMins && !impactPerGame,
                    onClick: () => {
                      setFactorMins(true);
                      setImpactPerGame(false);
                      setCachedStats({ ab: [] });
                    },
                  },
                  {
                    label: (
                      <small>
                        <sup>/</sup>G
                      </small>
                    ),
                    tooltip: `/G: Player impact per game (pts above average)`,
                    toggled: impactPerGame,
                    onClick: () => {
                      setFactorMins(true);
                      setImpactPerGame(true);
                      setCachedStats({ ab: [] });
                    },
                  },
                ],
              },
            ]}
          />
        </Col>
        <Col xs={12} md={12} lg={5} className="text-left mb-1">
          <ThemedSelect
            isClearable={true}
            styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
            isMulti
            components={{ MultiValueContainer: PositionValueContainer }}
            value={getCurrentPositionsOrPlaceholder()}
            options={(PositionUtils.positionClasses || []).map((r) =>
              stringToOption(r),
            )}
            onChange={(optionsIn: any) => {
              const options = optionsIn as Array<any>;
              const selection = (options || []).map(
                (option) => (option as any)?.value || "",
              );
              const posClassStr = selection
                .filter((t: string) => t != "")
                .map((c: string) => PositionUtils.posClassToNickname[c] || c)
                .join(",");
              setPosClasses(posClassStr);
            }}
          />
        </Col>
      </Row>
      <Row>
        <Col>{chart}</Col>
      </Row>
      {FeatureFlags.showImpactBreakdown && !_.isEmpty(cachedStats.ab) ? (
        <>
          <Row className="mb-2">
            {showImpactBreakdown ? (
              <>
                <b>
                  {impactPerGame
                    ? "Impact /G Breakdown"
                    : !factorMins
                      ? "RAPM Breakdown"
                      : "Impact Breakdown"}
                </b>
                &nbsp;
                {"(Pts /average):"}
                &nbsp;
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowImpactBreakdown(false);
                  }}
                >
                  (hide)
                </a>
              </>
            ) : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowImpactBreakdown(true);
                }}
              >
                Click here to see a breakdown of player impact into shooting,
                ball-handling, rebounding, and defense
              </a>
            )}
          </Row>
          {showImpactBreakdown ? (
            <>
              <Row className="mb-2">
                <Col>
                  <ToggleButtonGroup
                    items={
                      opponent !== AvailableTeams.noOpponent &&
                      cachedStats.ab.some((p: any) => p.seriesId === opponent)
                        ? [
                            {
                              items: [
                                {
                                  label: "Side-Side",
                                  tooltip: "Side-Side:Two tables side by side",
                                  toggled: breakdownLayout === "side-by-side",
                                  onClick: () =>
                                    setBreakdownLayout("side-by-side"),
                                },
                                {
                                  label: "Separate",
                                  tooltip:
                                    "Separate: Two tables, one after the other",
                                  toggled: breakdownLayout === "separate",
                                  onClick: () => setBreakdownLayout("separate"),
                                },
                                {
                                  label: "Combined",
                                  tooltip:
                                    "Combined: Single table with players from both teams",
                                  toggled: breakdownLayout === "combined",
                                  onClick: () => setBreakdownLayout("combined"),
                                },
                              ],
                            },
                            {
                              label: "| ",
                              tooltip: "",
                              toggled: true,
                              onClick: () => {},
                              isLabelOnly: true,
                            },
                            {
                              label: "Adj",
                              tooltip:
                                "Include SoS adjustment in calcs (means total net won't sum to score differential)",
                              toggled: adjBreakdownForSoS,
                              onClick: () =>
                                setAdjBreakdownForSoS(!adjBreakdownForSoS),
                            },
                            {
                              label: "| ",
                              tooltip: "",
                              toggled: true,
                              onClick: () => {},
                              isLabelOnly: true,
                            },
                            {
                              items: [
                                {
                                  label: (
                                    <small>
                                      P<sup>%</sup>
                                    </small>
                                  ),
                                  tooltip: `P%: Player impact (pts above average) per 100 possessions when they are on the court`,
                                  toggled: !factorMins && !impactPerGame,
                                  onClick: () => {
                                    setFactorMins(false);
                                    setImpactPerGame(false);
                                    setCachedStats({ ab: [] });
                                  },
                                },
                                {
                                  label: (
                                    <small>
                                      T<sup>%</sup>
                                    </small>
                                  ),
                                  tooltip: `T%: Player impact (pts above average) per 100 team possessions (so factors in how many minutes they are on the court)`,
                                  toggled: factorMins && !impactPerGame,
                                  onClick: () => {
                                    setFactorMins(true);
                                    setImpactPerGame(false);
                                    setCachedStats({ ab: [] });
                                  },
                                },
                                {
                                  label: (
                                    <small>
                                      <sup>/</sup>G
                                    </small>
                                  ),
                                  tooltip: `/G: Player impact per game (pts above average)`,
                                  toggled: impactPerGame,
                                  onClick: () => {
                                    setFactorMins(true);
                                    setImpactPerGame(true);
                                    setCachedStats({ ab: [] });
                                  },
                                },
                              ],
                            },
                            {
                              label: "| ",
                              tooltip: "",
                              toggled: true,
                              onClick: () => {},
                              isLabelOnly: true,
                            },
                            {
                              label: <FontAwesomeIcon icon={faFilter} />,
                              tooltip: "Show/hide filter for breakdown table",
                              toggled: breakdownShowFilter,
                              onClick: () =>
                                setBreakdownShowFilter(!breakdownShowFilter),
                            },
                          ]
                        : [
                            {
                              label: "Adj",
                              tooltip:
                                "Include SoS adjustment in calcs (means total net won't sum to score differential)",
                              toggled: adjBreakdownForSoS,
                              onClick: () =>
                                setAdjBreakdownForSoS(!adjBreakdownForSoS),
                            },
                            {
                              label: "| ",
                              tooltip: "",
                              toggled: true,
                              onClick: () => {},
                              isLabelOnly: true,
                            },
                            {
                              items: [
                                {
                                  label: (
                                    <small>
                                      P<sup>%</sup>
                                    </small>
                                  ),
                                  tooltip: `P%: Player impact (pts above average) per 100 possessions when they are on the court`,
                                  toggled: !factorMins && !impactPerGame,
                                  onClick: () => {
                                    setFactorMins(false);
                                    setImpactPerGame(false);
                                    setCachedStats({ ab: [] });
                                  },
                                },
                                {
                                  label: (
                                    <small>
                                      T<sup>%</sup>
                                    </small>
                                  ),
                                  tooltip: `T%: Player impact (pts above average) per 100 team possessions (so factors in how many minutes they are on the court)`,
                                  toggled: factorMins && !impactPerGame,
                                  onClick: () => {
                                    setFactorMins(true);
                                    setImpactPerGame(false);
                                    setCachedStats({ ab: [] });
                                  },
                                },
                                {
                                  label: (
                                    <small>
                                      <sup>/</sup>G
                                    </small>
                                  ),
                                  tooltip: `/G: Player impact per game (pts above average)`,
                                  toggled: impactPerGame,
                                  onClick: () => {
                                    setFactorMins(true);
                                    setImpactPerGame(true);
                                    setCachedStats({ ab: [] });
                                  },
                                },
                              ],
                            },
                            {
                              label: "| ",
                              tooltip: "",
                              toggled: true,
                              onClick: () => {},
                              isLabelOnly: true,
                            },
                            {
                              label: <FontAwesomeIcon icon={faFilter} />,
                              tooltip: "Show/hide filter for breakdown table",
                              toggled: breakdownShowFilter,
                              onClick: () =>
                                setBreakdownShowFilter(!breakdownShowFilter),
                            },
                          ]
                    }
                  />
                </Col>
              </Row>
              {breakdownShowFilter && (
                <Row className="mb-2">
                  <Col xs={12} sm={9}>
                    <InputGroup size="sm" className="mb-1">
                      <InputGroup.Prepend>
                        <InputGroup.Text id="filter">Filter</InputGroup.Text>
                      </InputGroup.Prepend>
                      <AsyncFormControl
                        startingVal={breakdownFilterStr}
                        onChange={(t) => setBreakdownFilterStr(t)}
                        timeout={500}
                        placeholder="e.g. Player1Surname,Player2FirstName,-Player3Name"
                      />
                    </InputGroup>
                  </Col>
                  <Col xs={12} sm={3} className="pt-1">
                    <ToggleButtonGroup
                      labelOverride=" "
                      items={[
                        {
                          label: "Walk-Ons",
                          tooltip:
                            "Include players with <10% of possessions (filtered out by default)",
                          toggled: breakdownShowWalkOns,
                          onClick: () =>
                            setBreakdownShowWalkOns(!breakdownShowWalkOns),
                        },
                      ]}
                    />
                  </Col>
                </Row>
              )}
              {breakdownLayout === "combined" &&
              opponent !== AvailableTeams.noOpponent &&
              filteredBreakdownPoints.some(
                (p: PlayerImpactPoint) => p.seriesId === opponent,
              ) ? (
                <Row>
                  <Col xs={12}>
                    <PlayerImpactBreakdownTable
                      team={commonParams.team!}
                      playerPoints={filteredBreakdownPoints}
                      avgEfficiency={avgEfficiency}
                      seasonStats={!!seasonStats}
                      showTeamColumn={true}
                      adjBreakdownForSoS={adjBreakdownForSoS}
                      scaleType={scaleType}
                      teamDisplay={(teamId) => (
                        <img
                          style={{ width: 16, height: 16 }}
                          src={`logos/${
                            resolvedTheme === "dark" ? "dark" : "normal"
                          }/${teamId}.png`}
                          alt=""
                        />
                      )}
                    />
                  </Col>
                </Row>
              ) : breakdownLayout === "separate" &&
                opponent !== AvailableTeams.noOpponent &&
                filteredBreakdownPoints.some(
                  (p: PlayerImpactPoint) => p.seriesId === opponent,
                ) ? (
                <>
                  <Row>
                    <Col xs={12}>
                      <PlayerImpactBreakdownTable
                        team={commonParams.team!}
                        playerPoints={filteredBreakdownPoints.filter(
                          (p) => p.seriesId === commonParams.team,
                        )}
                        adjBreakdownForSoS={adjBreakdownForSoS}
                        scaleType={scaleType}
                        avgEfficiency={avgEfficiency}
                        seasonStats={!!seasonStats}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={12}>
                      <PlayerImpactBreakdownTable
                        team={opponent}
                        playerPoints={filteredBreakdownPoints.filter(
                          (p) => p.seriesId === opponent,
                        )}
                        adjBreakdownForSoS={adjBreakdownForSoS}
                        scaleType={scaleType}
                        avgEfficiency={avgEfficiency}
                        seasonStats={!!seasonStats}
                      />
                    </Col>
                  </Row>
                </>
              ) : (
                <Row>
                  <Col
                    xs={12}
                    md={
                      opponent !== AvailableTeams.noOpponent &&
                      filteredBreakdownPoints.some(
                        (p: PlayerImpactPoint) => p.seriesId === opponent,
                      )
                        ? 6
                        : 12
                    }
                  >
                    <PlayerImpactBreakdownTable
                      team={commonParams.team!}
                      playerPoints={filteredBreakdownPoints.filter(
                        (p) => p.seriesId === commonParams.team,
                      )}
                      adjBreakdownForSoS={adjBreakdownForSoS}
                      scaleType={scaleType}
                      avgEfficiency={avgEfficiency}
                      seasonStats={!!seasonStats}
                    />
                  </Col>
                  {opponent !== AvailableTeams.noOpponent &&
                  filteredBreakdownPoints.some(
                    (p: PlayerImpactPoint) => p.seriesId === opponent,
                  ) ? (
                    <Col xs={12} md={6}>
                      <PlayerImpactBreakdownTable
                        team={opponent}
                        playerPoints={filteredBreakdownPoints.filter(
                          (p) => p.seriesId === opponent,
                        )}
                        adjBreakdownForSoS={adjBreakdownForSoS}
                        scaleType={scaleType}
                        avgEfficiency={avgEfficiency}
                        seasonStats={!!seasonStats}
                      />
                    </Col>
                  ) : null}
                </Row>
              )}
            </>
          ) : null}
        </>
      ) : null}
    </Container>
  );
};
export default PlayerImpactChart;
