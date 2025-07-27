// React imports:
import _ from "lodash";
import React, { useState, useEffect } from "react";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import ThemedSelect from "./shared/ThemedSelect";
import { useTheme } from "next-themes";

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

  // Model

  const commonParams = getCommonFilterParams(startingState);
  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  // Luck:
  const [adjustForLuck, setAdjustForLuck] = useState(
    _.isNil(startingState.onOffLuck)
      ? ParamDefaults.defaultOnOffLuckAdjust
      : startingState.onOffLuck
  );
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(startingState.luck)
      ? ParamDefaults.defaultLuckConfig
      : startingState.luck
  );

  const [posClasses, setPosClasses] = useState(startingState.posClasses || "");
  const buildPosClassSet = (classes: string): Set<string> | undefined => {
    return classes
      ? new Set(
          _.flatMap(
            (classes || "").split(","),
            (c) => PositionUtils.expandedPosClasses[c] || [c]
          )
        )
      : undefined;
  };

  const [showTeam, setShowTeam] = useState<boolean>(
    _.isNil(startingState.showTeam) ? true : startingState.showTeam
  );
  const [showOppo, setShowOppo] = useState<boolean>(
    _.isNil(startingState.showOppo) ? true : startingState.showOppo
  );
  const [factorMins, setFactorMins] = useState<boolean>(
    _.isNil(startingState.factorMins) ? true : startingState.factorMins
  );
  const [lockAspect, setLockAspect] = useState<boolean>(
    _.isNil(startingState.lockAspect)
      ? ParamDefaults.defaultMatchupAnalysisAspectLock
      : startingState.lockAspect
  );

  // Viewport management

  const { theme } = useTheme();
  const teamAColor = theme == "dark" ? "#ccc" : "black";
  const teamBColor = theme == "dark" ? "hotpink" : "purple";
  const themedColorBuilder =
    theme == "dark"
      ? CbbColors.off_diff10_p100_redGreen_darkMode
      : CbbColors.off_diff10_p100_redBlackGreen;

  const [iconType, setIconType] = useState<"icon" | "pos" | "jersey">(
    (startingState.iconType || ParamDefaults.defaultMatchupAnalysisIconType) as
      | "icon"
      | "pos"
      | "jersey"
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
      Math.max(0.5 * window.innerWidth, 400)
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
      lockAspect,
      iconType,
    });
  }, [posClasses, showTeam, showOppo, factorMins, lockAspect, iconType]);

  // RAPM building

  const [cachedStats, setCachedStats] = useState<{ ab: any[] }>({ ab: [] });
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
        posClassSet
      );
      const bStats = buildStats(
        opponent,
        teamBColor,
        lineupStatsB,
        teamStatsB,
        rosterStatsB,
        posClassSet
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
    team?: string
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
          }
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
    posClassSet: Set<string> | undefined
  ) => {
    const totalGames = seasonStats
      ? _.size(
          LineupUtils.isGameInfoStatSet(teamStats.baseline?.game_info || {})
            ? LineupUtils.getGameInfo(teamStats.baseline?.game_info || {})
            : teamStats.baseline?.game_info
        ) || 1
      : 1;

    return _.thru(
      GameAnalysisUtils.buildGameRapmStats(
        team,
        commonParams,
        lineupStats,
        teamStats,
        rosterStats,
        adjustForLuck,
        luckConfig,
        avgEfficiency
      ),
      ({ playerInfo, positionInfo, rapmInfo }) => {
        return _.chain(rapmInfo?.enrichedPlayers || [])
          .flatMap((p) => {
            const statObj = playerInfo[p.playerId];
            const offPoss = statObj.off_team_poss_pct?.value || 0;
            const defPoss = statObj.def_team_poss_pct?.value || 0;
            const playerGames = seasonStats
              ? _.size(
                  LineupUtils.isGameInfoStatSet(statObj.game_info)
                    ? LineupUtils.getGameInfo(statObj.game_info || {})
                    : statObj.game_info
                ) || 1
              : 1;

            const missingGameAdjustment = totalGames / playerGames;

            const offRapmProd =
              (p.rapm?.off_adj_ppp?.value || 0) *
              (factorMins ? offPoss : 1.0) *
              missingGameAdjustment;
            const defRapmProd =
              (p.rapm?.def_adj_ppp?.value || 0) *
              (factorMins ? defPoss : 1.0) *
              missingGameAdjustment;

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
                      Math.max(-graphLimit, defRapmProd)
                    ),
                    z: offPoss * missingGameAdjustment,
                    color: offRapmProd - defRapmProd,
                    name: GameAnalysisUtils.namePrettifier(p.playerCode),
                    posInfo: positionInfo[p.playerId],
                    stats: statObj,
                    onOffStats: p,
                    missingGameAdj: missingGameAdjustment,
                    filteredOut: isFilteredCachedAb(
                      { posInfo: positionInfo[p.playerId] },
                      posClassSet,
                      team
                    ),
                  },
                ];
          })
          .value();
      }
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
              theme == "dark"
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
              data.missingGameAdj
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
    [1000, -1000, 1000, -1000]
  );

  const calcGraphLimit = (min: number, max: number) => {
    const factor = _.find(
      [0.6, 0.8],
      (factor) => min > -factor * graphLimit && max < factor * graphLimit
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
              PositionUtils.nicknameToPosClass[posClass] || posClass
            )
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

  function stringToOption(s: string) {
    return { label: s, value: s };
  }
  const labelState = ScatterChartUtils.buildEmptyLabelState();
  return _.isEmpty(cachedStats.ab) ? (
    <Col className="text-center w-100">
      <i>(No Data)</i>
    </Col>
  ) : (
    <Container>
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
                tooltip: `Toggle through team icon / jersey number / positional role`,
                toggled: false,
                onClick: () => {
                  switch (iconType) {
                    case "icon":
                      setIconType("pos");
                      return;
                    case "pos":
                      setIconType("jersey");
                      return;
                    default:
                      setIconType("icon");
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
                label: "* Mins%",
                tooltip: `Whether to incorporate % of minutes played into adjusted ratings (ie turns it into 'production per team 100 possessions')`,
                toggled: factorMins,
                onClick: () => {
                  setFactorMins(!factorMins);
                  setCachedStats({ ab: [] });
                },
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
              stringToOption(r)
            )}
            onChange={(optionsIn: any) => {
              const options = optionsIn as Array<any>;
              const selection = (options || []).map(
                (option) => (option as any)?.value || ""
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
        <Col>
          <ResponsiveContainer width={screenWidth} height={screenHeight}>
            <ScatterChart>
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

              <Legend verticalAlign="bottom" align="center" iconSize={8} />
              <XAxis
                type="number"
                dataKey="x"
                domain={[-graphLimitX, graphLimitX]}
                axisLine={{ stroke: "url(#xAxisGradient)", strokeWidth: 3 }}
              >
                <Label
                  value={
                    isSmallScreen
                      ? "Off. Impact (pts)"
                      : "Offensive Impact (pts)"
                  }
                  position="top"
                  style={{ textAnchor: "middle" }}
                />
              </XAxis>
              <YAxis
                type="number"
                dataKey="y"
                domain={[-graphLimitY, graphLimitY]}
                axisLine={{ stroke: "url(#yAxisGradient)", strokeWidth: 3 }}
                tickFormatter={(s) => `-${s}`.replace("--", "")}
              >
                <Label
                  angle={-90}
                  value={"Defensive Impact (pts)"}
                  position="insideLeft"
                  style={{ textAnchor: "middle" }}
                />
              </YAxis>
              {seasonStats ? (
                <ZAxis type="number" dataKey="z" range={[10, 100]} />
              ) : undefined}
              <CartesianGrid strokeDasharray="4" />

              <Scatter
                data={cachedStats.ab}
                fill={teamAColor}
                fillOpacity={iconType == "icon" ? "100%" : "0%"}
                shape="triangle"
                name={commonParams.team!}
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
                fillOpacity={iconType == "icon" ? "100%" : "0%"}
                shape="circle"
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
        </Col>
      </Row>
    </Container>
  );
};
export default PlayerImpactChart;
