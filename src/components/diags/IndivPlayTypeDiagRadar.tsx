// React imports:
import React, { useEffect, useState } from "react";

import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Utils
import {
  PlayTypeUtils,
  TopLevelIndivPlayType,
  TopLevelPlayAnalysis,
  TopLevelPlayType,
} from "../../utils/stats/PlayTypeUtils";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { IndivTableDefs } from "../../utils/tables/IndivTableDefs";
import { CbbColors } from "../../utils/CbbColors";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../GenericTable";
import {
  Statistic,
  IndivStatSet,
  TeamStatSet,
  RosterStatsByCode,
  StatModels,
} from "../../utils/StatModels";

import {
  Text,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { GradeUtils } from "../../utils/stats/GradeUtils";
import {
  GradeTableUtils,
  DivisionStatsCache,
} from "../../utils/tables/GradeTableUtils";
import { PlayTypeDiagUtils } from "../../utils/tables/PlayTypeDiagUtils";
import QuickSwitchBar, {
  quickSwitchDelim,
  QuickSwitchMode,
  QuickSwitchSource,
} from "../shared/QuickSwitchBar";
import { useTheme } from "next-themes";
import { ParamDefaults } from "../../utils/FilterModels";

export type PlayerStyleOpts = {
  rawPpp?: boolean;
  playType?: string;
  quickSwitch?: string;
};

export type Props = {
  title?: string;
  player: IndivStatSet;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: Props[];
  onChangeChartOpts?: (opts: PlayerStyleOpts) => void; //(needs to be optional for quick switch options)
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
  userOpts?: PlayerStyleOpts;
  playCountToUse?: number;
  defensiveOverride?: TopLevelPlayAnalysis;
  compressedPlayTypeStats?: [number, number, number, number][];
  navigationLinkOverride?: React.ReactElement;
  dynamicQuickSwitch?: boolean; //(only use if there's just one play style chart visible)
  quickSwitchModesOverride?: QuickSwitchMode[];
  quickSwitchAtBottom?: boolean;
};
const IndivPlayTypeDiagRadar: React.FunctionComponent<Props> = ({
  title,
  player: playerIn,
  rosterStatsByCode,
  teamStats: teamStatsIn,
  avgEfficiency,
  quickSwitchOptions,
  onChangeChartOpts,
  showGrades,
  grades,
  showHelp,
  playCountToUse,
  defensiveOverride: defensiveOverrideIn,
  userOpts,
  compressedPlayTypeStats,
  navigationLinkOverride,
  dynamicQuickSwitch,
  quickSwitchModesOverride,
  quickSwitchAtBottom,
}) => {
  const { resolvedTheme } = useTheme();
  const highlightColor = resolvedTheme == "dark" ? "#ffFFff" : "#000000";

  /** TODO: plumb CSV export */
  const [csvData, setCsvData] = useState<object[]>([]);

  // At some point calculate medians for display purposes
  // if (grades && grades.Combo) {
  //   console.log(
  //     "RESULTS",
  //     GradeUtils.getMedianIndivPlayTypeValue(
  //       PlayTypeUtils.topLevelIndivPlayTypes,
  //       grades.Combo
  //     )
  //   );
  // }

  // Configurable settings:
  const [adjustForSos, setAdjustForSos] = useState<boolean>(
    !(userOpts?.rawPpp ?? false),
  );
  const [possFreqType, setPossFreqType] = useState<
    "P%le" | "T%le" | "P%" | "T%"
  >(
    (userOpts?.playType ?? ParamDefaults.defaultPlayerShowPlayTypesPlayType) as
      | "P%le"
      | "T%le"
      | "P%"
      | "T%",
  );

  const [quickSwitch, setQuickSwitch] = useState<string | undefined>(
    userOpts?.quickSwitch,
  );

  const [cardView, setCardView] = useState<boolean>(false);

  useEffect(() => {
    setAdjustForSos(!(userOpts?.rawPpp ?? false));
    setPossFreqType(
      (userOpts?.playType ??
        ParamDefaults.defaultPlayerShowPlayTypesPlayType) as
        | "P%le"
        | "T%le"
        | "P%"
        | "T%",
    );
    // Quick switch by default isn't safely dynamically changeable (lots of charts), but if it _is_:
    if (dynamicQuickSwitch) {
      setQuickSwitch(userOpts?.quickSwitch);
    }
  }, [userOpts]);

  // Internal user config state

  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);
  const quickSwitchBase = quickSwitch
    ? quickSwitch.split(quickSwitchDelim)[0]
    : undefined;
  const quickSwitchExtra: "extra" | "diff" | undefined = (
    quickSwitch ? quickSwitch.split(quickSwitchDelim)[1] : undefined
  ) as "extra" | "diff" | undefined;

  // --- MAIN/BASE/EXTRA CHART DATA LOGIC ---
  // Compute the 'main' chart data (always from default props)
  const mainPlayer = playerIn;
  const mainTeamStats = teamStatsIn;
  const mainDefensiveOverride = defensiveOverrideIn;
  const mainSosAdjustment =
    avgEfficiency /
    ((mainDefensiveOverride
      ? mainPlayer.off_adj_opp?.value
      : mainPlayer.def_adj_opp?.value) || avgEfficiency);

  const getPlayTypeName = (name: string) => {
    if (name == "Put-Back") {
      return "Reb. & Scramble";
    } else if (name == "Backdoor Cut") {
      return "Perimeter Cut";
    } else if (name == "Post & Kick") {
      return "Inside Out";
    } else {
      return name;
    }
  };

  const { tierToUse: mainTierToUse } = GradeTableUtils.buildTeamTierInfo(
    showGrades,
    {
      comboTier: grades?.Combo,
      highTier: grades?.High,
      mediumTier: grades?.Medium,
      lowTier: grades?.Low,
    },
  );
  const possFactor = _.isNumber(playCountToUse) ? playCountToUse / 100 : 1.0;
  const showingRawFreq = possFreqType == "P%" || possFreqType == "T%";

  const CustomizedAxisTick: React.FunctionComponent<any> = (props) => {
    const { x, y, payload } = props;
    return (
      <Text
        x={x}
        y={y}
        width={40}
        textAnchor="middle"
        verticalAnchor="start"
        fill={resolvedTheme == "dark" ? "#CCC" : undefined}
      >
        {payload.value}
      </Text>
    );
  };

  //TODO: is mainDefensiveOveride correct here, or should this be the defOverride passed into renderBarChartRow
  const CustomLabelledWidthBar = (props: any) => {
    const { fill, x, y, width, height, rawPct, rawPts, pct, pts, pctile } =
      props;

    // Bar:

    // We adjust width according to rawPct
    // It's 0.1 at 0, and 1.0 at 0.10+

    const rawPctUsageFactor =
      possFreqType == "T%le" || possFreqType == "T%" ? 3.0 : 1.0;
    const widthToUse =
      width *
      (0.1 + 0.9 * Math.max(0, Math.min(1.0, 10 * rawPct * rawPctUsageFactor)));
    const xAdj = 0.5 * (width - widthToUse);

    // Text:
    //(incorporate the label along with the bar to workaround animation bug: https://github.com/recharts/recharts/issues/829#issuecomment-647998463)
    const textHeight = 10;

    // Outline .. starting from 10% we go from width 1 to 3 (at 25%+)
    const outlineWidth =
      1 +
      Math.min(3, Math.max(0, (rawPct * rawPctUsageFactor - 0.1) * (3 / 0.15)));

    //Blob showing true efficiency
    const radius = 0.4 * (widthToUse / 2);
    const adjustment = adjustForSos ? mainSosAdjustment : 1.0;
    const themedRawColorBuilder =
      resolvedTheme == "dark"
        ? CbbColors.off_diff10_p100_redGreen_darkMode
        : CbbColors.off_diff10_p100_redBlackGreen;
    const rawColor = themedRawColorBuilder(
      (mainDefensiveOverride ? -1 : 1) * (rawPts - 0.89) * 100 * adjustment,
    );
    const contrastingColor = pts <= 25 || pts >= 75 ? "white" : "black";
    const selectedBarColor = resolvedTheme == "dark" ? "#666666" : "#aaaaaa";

    const showCircleInBar = height > 1.1 * width;
    const extraTextSpace = showCircleInBar ? 0 : width;

    return rawPct >= 0.001 ? (
      <g>
        <path
          stroke={highlightColor}
          strokeWidth={outlineWidth}
          fill={fill}
          className="recharts-rectangle"
          d={`M ${
            x + xAdj
          },${y} h ${widthToUse} v ${height} h ${-widthToUse} Z`}
        />
        <rect
          x={x - 5}
          y={y - 4 * textHeight - extraTextSpace + 1}
          width={width + 10}
          height={4 * textHeight - 2}
          fill={resolvedTheme == "dark" ? "#222222" : "#dddddd"}
          opacity={0.5}
        />
        <text
          x={x + width / 2}
          y={y - 2 * textHeight - 4 - extraTextSpace}
          fill={highlightColor}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {rawPct > 0 ? (
            <tspan fill={rawColor}>
              {((rawPts || 0) * adjustment).toFixed(2)}
            </tspan>
          ) : undefined}
          <tspan> ppp</tspan>
        </text>
        <text
          x={x + width / 2}
          y={y - textHeight + 3 - extraTextSpace}
          fill={highlightColor}
          fontSize={"smaller"}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan>
            {(mainDefensiveOverride ? 100 - (pts || 0) : pts || 0).toFixed(1)}
            <tspan fontSize="smaller">%ile</tspan>
          </tspan>
        </text>
        {
          <circle
            cx={x + width / 2}
            cy={showCircleInBar ? y + height / 2 : y - width / 2}
            r={width / 2}
            fill={showCircleInBar ? fill : selectedBarColor}
            stroke={showCircleInBar ? contrastingColor : highlightColor}
            opacity={showCircleInBar ? 1.0 : 0.33}
            strokeWidth={showCircleInBar ? outlineWidth : 0.5}
          />
        }
        {showingRawFreq && (
          <text
            x={x + width / 2}
            y={showCircleInBar ? y + height / 2 - 2 : y - width / 2 - 2}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {(pctile || 0).toFixed(1)}
          </text>
        )}
        {showingRawFreq && (
          <text
            x={x + width / 2}
            y={
              showCircleInBar
                ? y + height / 2 + textHeight + 2
                : y - width / 2 + textHeight + 2
            }
            fontSize={"60%"}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            &#402; %ile
          </text>
        )}
        {!showingRawFreq && (
          <text
            x={x + width / 2}
            y={showCircleInBar ? y + height / 2 - 2 : y - width / 2 - 2}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {(100 * (rawPct || 0)).toFixed(1)}
          </text>
        )}
        {!showingRawFreq && (
          <text
            x={x + width / 2}
            y={
              showCircleInBar
                ? y + height / 2 + textHeight + 2
                : y - width / 2 + textHeight + 2
            }
            fontSize={"60%"}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            &#402;/100
          </text>
        )}
      </g>
    ) : (
      <div />
    );
  };

  //TODO: is mainDefensiveOveride correct here, or should this be the defOverride passed into renderBarChartRow
  const CustomTooltip: React.FunctionComponent<any> = (props: any) => {
    const { active, payload, label, coordinate } = props;
    if (active) {
      const data = payload?.[0].payload || {};

      // Avoid the labels going off the end:
      const tooltipOffset = _.thru(label, (playName) => {
        switch (playName) {
          case "Transition":
            return 300;
          case "Reb. & Scramble":
            return 300;
          case "High - Low":
            return 300;
          case "Pick & Pop":
            return 300;
          case "Inside Out":
            return 300;
          default:
            return 0;
        }
      });

      return (
        <div
          className="custom-tooltip"
          style={{
            position: "absolute",
            left: coordinate.x - tooltipOffset,
            width: 300,
            background:
              resolvedTheme == "dark"
                ? "rgba(0, 0, 0, 0.9)"
                : "rgba(238, 238, 238, 0.9)",
          }}
        >
          <p className="label pl-1 pr-1">
            <b>{`${getPlayTypeName(data.playType)}`}</b>
          </p>
          <p className="desc pl-1 pr-1">
            {topLevelPlayTypeDescriptions[data.playType as TopLevelPlayType]}
          </p>
          <p className="desc pl-1 pr-1">
            Frequency: [<b>{(100 * data.rawPct).toFixed(1)}</b>] / 100&nbsp;
            plays
            <br />
            Frequency Pctile: [<b>{data.pctile.toFixed(1)}%</b>]
            {_.isNumber(playCountToUse) ? <br /> : null}
            {_.isNumber(playCountToUse) ? (
              <span>
                [<b>{(playCountToUse * data.rawPct).toFixed(1)}</b>] plays in
                this game ([{playCountToUse}] plays)
              </span>
            ) : null}
          </p>
          <p className="desc pl-1 pr-1">
            Efficiency: [<b>{data.rawPts.toFixed(2)}</b>] pts/play
            <br />
            Adj Efficiency: [
            <b>{(data.rawPts * mainSosAdjustment).toFixed(2)}</b>] pts/play
            <br />
            {mainDefensiveOverride ? (
              <span>
                Efficiency Pctile: [<b>{(100 - data.pts).toFixed(1)}%</b>]
              </span>
            ) : (
              <span>
                Efficiency Pctile: [<b>{data.pts.toFixed(1)}%</b>]
              </span>
            )}
            <br />
            (Average D1 play is approx [<b>0.89</b>] pts)
            {mainDefensiveOverride ? <br /> : undefined}
            {mainDefensiveOverride ? <br /> : undefined}
            {mainDefensiveOverride ? (
              <i>
                (NOTE: Pctiles shown are currently based on
                <br />
                offensive stats, a temporary limitation)
              </i>
            ) : undefined}
          </p>
        </div>
      );
    }
    return null;
  };

  // Helper to render a BarChart Row
  const renderBarChartRow = (
    data: any[],
    pctile: any,
    defOverride: any,
    sosAdj: number,
    maxRawFreq: number | undefined,
    ticksToUse: number | undefined,
    rowTitle?: string,
    cellKeyPrefix: string = "cell-",
  ) =>
    pctile ? (
      <Row className="recharts-container">
        <Col xs={12}>
          {rowTitle ? (
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>
              {rowTitle}
            </div>
          ) : null}
          <ResponsiveContainer minWidth={800} width="100%" height={400}>
            <BarChart
              height={410}
              data={data}
              margin={{
                top: 35,
                right: 30,
                left: 20,
                bottom: 30,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                stroke={resolvedTheme == "dark" ? "#CCC" : undefined}
                interval={0}
                tick={<CustomizedAxisTick />}
              />
              <YAxis
                type="number"
                stroke={resolvedTheme == "dark" ? "#CCC" : undefined}
                domain={
                  showingRawFreq
                    ? maxRawFreq
                      ? [0, Math.round(maxRawFreq)]
                      : undefined
                    : [0, 100]
                }
                tickCount={ticksToUse}
                ticks={
                  showingRawFreq
                    ? maxRawFreq && ticksToUse
                      ? _.range(0, maxRawFreq + 1, maxRawFreq / ticksToUse)
                      : undefined
                    : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
                }
              >
                <Label
                  angle={-90}
                  value={
                    possFreqType == "P%" || possFreqType == "T%"
                      ? `Frequency %`
                      : `Frequency %ile in D1`
                  }
                  position="insideLeft"
                  fill={resolvedTheme == "dark" ? "#CCC" : undefined}
                  style={{ textAnchor: "middle", fontWeight: "bold" }}
                />
              </YAxis>
              <RechartTooltip
                content={<CustomTooltip />}
                wrapperStyle={{
                  background:
                    resolvedTheme == "dark"
                      ? "rgba(0, 0, 0, 1.0)"
                      : "rgba(238, 238, 238, 1.0)",
                  zIndex: 1000,
                }}
                allowEscapeViewBox={{ x: true, y: false }}
              />
              <Bar
                dataKey="pct"
                fill="#8884d8"
                shape={<CustomLabelledWidthBar />}
                isAnimationActive={true}
              >
                {data.map((p, index) => {
                  return (
                    <Cell
                      key={`${cellKeyPrefix}${index}`}
                      stroke="#000000"
                      fill={(defOverride
                        ? CbbColors.def_pctile_qual
                        : CbbColors.off_pctile_qual)(
                        p.pts * 0.01 * (adjustForSos ? sosAdj : 1.0),
                      )}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Col>
      </Row>
    ) : undefined;

  /** Shows the JSON at the bottom if enabled */
  const debugView = false;

  return React.useMemo(() => {
    const mainTopLevelPlayTypeStyles = compressedPlayTypeStats
      ? PlayTypeUtils.decompressIndivPlayType(compressedPlayTypeStats)
      : mainDefensiveOverride ||
        PlayTypeUtils.buildTopLevelIndivPlayStyles(
          mainPlayer,
          rosterStatsByCode,
          mainTeamStats,
        );

    const mainTopLevelPlayTypeStylesPctile = mainTierToUse
      ? GradeUtils.getIndivPlayStyleStats(
          mainTopLevelPlayTypeStyles,
          mainTierToUse,
          adjustForSos ? mainSosAdjustment : undefined,
          possFreqType == "T%le" || possFreqType == "T%",
          true,
        )
      : undefined;

    // In this case we just use the raw freq, but we do want the efficiency %s
    if (showingRawFreq) {
      _.forEach(mainTopLevelPlayTypeStyles, (val, key) => {
        const toAdjust =
          mainTopLevelPlayTypeStylesPctile?.[key as TopLevelIndivPlayType];
        if (toAdjust) {
          const pctle = toAdjust.possPct?.value || 0;
          //(this is always the %ile, coming from either raw possPct or possPctUsg)
          toAdjust.possPct = val.possPct;
          if (toAdjust.possPct) {
            toAdjust.possPct.old_value = pctle;
          }
          toAdjust.possPctUsg = val.possPctUsg;
        }
      });
    }

    const mainData = mainTopLevelPlayTypeStylesPctile
      ? _.map(mainTopLevelPlayTypeStylesPctile, (stat, playType) => {
          const rawVal = (
            mainTopLevelPlayTypeStyles as Record<
              string,
              { possPct: Statistic; pts: Statistic; possPctUsg: Statistic }
            >
          )[playType];

          const rawPct =
            possFreqType == "T%le" || possFreqType == "T%"
              ? rawVal?.possPctUsg?.value || 0
              : rawVal?.possPct?.value || 0;

          return {
            name: getPlayTypeName(playType).replace("-", " - "),
            playType: playType,
            pct:
              //(the height of the bar chart, %ile or raw value)
              rawPct == 0
                ? 0
                : Math.min(
                    100,
                    (possFreqType == "T%"
                      ? stat.possPctUsg?.value || 0
                      : //(this only exists as a raw value, when a %tle it's ALWAYS called possPct)
                        stat.possPct.value || 0) * 100,
                  ),
            pctile:
              //(always the %ile)
              showingRawFreq
                ? Math.min(100, (stat.possPct?.old_value || 0) * 100)
                : Math.min(100, (stat.possPct?.value || 0) * 100),
            pts: Math.min(
              100,
              (adjustForSos
                ? stat.adj_pts?.value || stat.pts.value || 0
                : stat.pts.value || 0) * 100,
            ),
            rawPct,
            rawPts: rawVal?.pts?.value || 0,
          };
        })
      : [];

    // Compute the 'extra' (was 'base') chart data (from quickSwitchBase)
    let extraTopLevelPlayTypeStylesPctile: any = undefined;
    let extraTopLevelPlayTypeStyles: TopLevelPlayAnalysis | undefined =
      undefined;
    let extraData: {
      name: string;
      playType: string;
      pct: number;
      pts: number;
      rawPct: number;
      pctile: number;
      rawPts: number;
    }[] = [];
    let extraDefOverride: any = undefined;
    let extraSosAdjustment: number | undefined = undefined;
    if (quickSwitchBase && quickSwitchOptions) {
      const extraOpt = _.find(
        quickSwitchOptions,
        (opt) => opt.title == quickSwitchBase,
      );
      if (extraOpt) {
        const extraTeamStats = extraOpt.teamStats || StatModels.emptyTeam();
        const extraPlayer = extraOpt.player;
        const extraCompressedPlayTypeStats = extraOpt.compressedPlayTypeStats;
        extraDefOverride = extraOpt.defensiveOverride;
        extraSosAdjustment =
          avgEfficiency /
          ((extraDefOverride
            ? extraPlayer.off_adj_opp?.value
            : extraPlayer.def_adj_opp?.value) || avgEfficiency);
        extraTopLevelPlayTypeStyles = extraCompressedPlayTypeStats
          ? PlayTypeUtils.decompressIndivPlayType(extraCompressedPlayTypeStats)
          : extraDefOverride ||
            (extraTeamStats.style as TopLevelPlayAnalysis) ||
            PlayTypeUtils.buildTopLevelIndivPlayStyles(
              extraPlayer,
              rosterStatsByCode,
              extraTeamStats,
            );

        extraTopLevelPlayTypeStylesPctile = mainTierToUse
          ? GradeUtils.getIndivPlayStyleStats(
              extraTopLevelPlayTypeStyles!,
              mainTierToUse,
              extraSosAdjustment,
              possFreqType == "T%le" || possFreqType == "T%",
              true,
            )
          : undefined;

        // In this case we just use the raw freq, but we do want the efficiency %s
        if (showingRawFreq) {
          _.forEach(extraTopLevelPlayTypeStyles, (val, key) => {
            const toAdjust =
              extraTopLevelPlayTypeStylesPctile?.[key as TopLevelIndivPlayType];
            if (toAdjust) {
              const pctle = toAdjust.possPct?.value || 0;
              //(this is always the %ile, coming from either raw possPct or possPctUsg)
              toAdjust.possPct = val.possPct;
              if (toAdjust.possPct) {
                toAdjust.possPct.old_value = pctle;
              }
              toAdjust.possPctUsg = val.possPctUsg;
            }
          });
        }

        extraData = extraTopLevelPlayTypeStylesPctile
          ? _.map(extraTopLevelPlayTypeStylesPctile, (stat, playType) => {
              const rawVal = (
                extraTopLevelPlayTypeStyles as Record<
                  string,
                  { possPct: Statistic; pts: Statistic; possPctUsg: Statistic }
                >
              )[playType];
              const rawPct =
                possFreqType == "T%le" || possFreqType == "T%"
                  ? rawVal?.possPctUsg?.value || 0
                  : rawVal?.possPct?.value || 0;

              return {
                name: PlayTypeDiagUtils.getPlayTypeName(playType).replace(
                  "-",
                  " - ",
                ),
                playType: playType,
                pct:
                  //(the height of the bar chart, %ile or raw value)
                  rawPct == 0
                    ? 0
                    : Math.min(
                        100,
                        (possFreqType == "T%"
                          ? stat.possPctUsg?.value || 0
                          : //(this only exists as a raw value, when a %tle it's ALWAYS called possPct)
                            stat.possPct.value || 0) * 100,
                      ),
                pts: Math.min(100, (stat.pts.value || 0) * 100),
                rawPct,
                pctile:
                  //(always the %ile)
                  showingRawFreq
                    ? Math.min(100, (stat.possPct?.old_value || 0) * 100)
                    : Math.min(100, (stat.possPct?.value || 0) * 100),
                rawPts: rawVal?.pts?.value || 0,
              };
            })
          : [];
      }
    }

    // --- TOP/BOTTOM CHART LOGIC ---
    // Top chart: show mainData if !quickSwitchBase or quickSwitchExtra === 'extra', otherwise show extraData
    const showMainOnTop = !quickSwitchBase || quickSwitchExtra === "extra";
    const topData = showMainOnTop ? mainData : extraData;
    const topPctile = showMainOnTop
      ? mainTopLevelPlayTypeStylesPctile
      : extraTopLevelPlayTypeStylesPctile;
    const topDefOverride = showMainOnTop
      ? mainDefensiveOverride
      : extraDefOverride;
    const topSosAdjustment = showMainOnTop
      ? mainSosAdjustment
      : (extraSosAdjustment ?? 1.0);
    const topTitle = undefined; // never show a title for the top chart
    const topCellPrefix = showMainOnTop ? "cell-" : "cell-extra-";

    // Bottom chart: only if quickSwitchExtra === 'extra', always show extraData
    const showBottom =
      quickSwitchExtra === "extra" && quickSwitchBase && quickSwitchOptions;

    // Calculate the tick strategy if showing raw numbers
    let commonMaxBetweenMainAndExtra: number | undefined;
    let commonNumTicksToUse: number | undefined = undefined;
    if (showingRawFreq) {
      const tmpMax =
        100 *
        _.chain([
          _.values(mainTopLevelPlayTypeStyles),
          extraTopLevelPlayTypeStyles
            ? _.values(extraTopLevelPlayTypeStyles)
            : [],
        ])
          .flatten()
          .map((playTypeStat) => {
            return (
              (possFreqType == "P%"
                ? playTypeStat.possPct?.value
                : playTypeStat.possPctUsg?.value) || 0
            );
          })
          .max()
          .value();

      const smallestNumTicks =
        tmpMax < 7 ? [Math.ceil(Math.max(4, tmpMax))] : [];
      //(for indiv players they might not be doing much so handle low freq charts sensibly)

      commonNumTicksToUse =
        _.minBy(smallestNumTicks.concat([10, 9, 8]), (ticks) =>
          Math.abs(tmpMax - ticks * Math.ceil(tmpMax / ticks)),
        ) || 10;

      commonMaxBetweenMainAndExtra =
        commonNumTicksToUse * Math.ceil(tmpMax / commonNumTicksToUse);
    }

    // Card view: Pts = (PPP × Freq) × 100 (points per 100 poss)
    const sumPlayTypePoints = _.sumBy(topData, (row) => {
      const ppp = adjustForSos ? row.rawPts * topSosAdjustment : row.rawPts;
      return ppp * row.rawPct * 100;
    });
    const sumPlayTypeUsage = _.sumBy(topData, (row) => {
      return row.rawPct * 100;
    });
    const identityPrefix = (k: string) => k;
    const noCellMeta = () => "";
    const cardTableRows = _.chain(topData)
      .map((row) => {
        const ppp = adjustForSos ? row.rawPts * topSosAdjustment : row.rawPts;
        const pts = ppp * row.rawPct * 100;
        return GenericTableOps.buildDataRow(
          {
            title: row.name,
            pts: { value: pts },
            pts_pct: (
              <div>
                {sumPlayTypePoints > 0
                  ? ((100 * pts) / sumPlayTypePoints).toFixed(1)
                  : 0}
                %
              </div>
            ),
            // {
            //   value: sumPlayTypePoints > 0 ? pts / sumPlayTypePoints : 0,
            // },
            ppp: (
              <div
                style={{
                  ...CommonTableDefs.getTextShadow(
                    { value: row.pts * 0.01 },
                    resolvedTheme == "dark"
                      ? CbbColors.percentile_greenBlackRed
                      : CbbColors.off_pctile_qual,
                  ),
                }}
              >
                {ppp.toFixed(2)} <sup>{row.pts.toFixed(0)}%</sup>
              </div>
            ),
            freq: (
              <div
                style={{
                  ...CommonTableDefs.getTextShadow(
                    { value: row.pctile * 0.01 },
                    resolvedTheme == "dark"
                      ? CbbColors.percentile_blueBlackOrange
                      : CbbColors.all_pctile_freq,
                  ),
                }}
              >
                {(row.rawPct * 100).toFixed(1)}%{" "}
                <sup>{row.pctile.toFixed(0)}%</sup>
              </div>
            ),
          },
          identityPrefix,
          noCellMeta,
        );
      })
      .concat([
        GenericTableOps.buildDataRow(
          {
            title: "Total",
            pts: { value: sumPlayTypePoints },
            ppp: { value: null },
            freq:
              possFreqType == "T%" || possFreqType == "T%le" ? (
                <div>{sumPlayTypeUsage.toFixed(1)}%</div>
              ) : undefined,
            pts_pct: { value: null },
          },
          identityPrefix,
          noCellMeta,
        ),
      ])
      .value();

    const maybeQuickSwitchBar = //(Note this isn't used in the team views (we inherit the one in TeamPlayTypeDiagView), only the game views)
      title ? (
        <QuickSwitchBar
          title={title}
          quickSwitch={quickSwitchBase}
          quickSwitchExtra={quickSwitchExtra}
          quickSwitchOptions={quickSwitchOptions}
          updateQuickSwitch={(
            newQuickSwitch: string | undefined,
            newTitle: string | undefined,
            source: QuickSwitchSource,
            fromTimer: boolean,
          ) => {
            if (fromTimer) {
              setQuickSwitch((curr) => (curr ? undefined : newQuickSwitch));
            } else {
              onChangeChartOpts?.({
                rawPpp: !adjustForSos,
                playType: possFreqType,
                quickSwitch: newQuickSwitch,
              });
              setQuickSwitch(newQuickSwitch);
            }
          }}
          quickSwitchTimer={quickSwitchTimer}
          setQuickSwitchTimer={setQuickSwitchTimer}
          modes={quickSwitchModesOverride || ["link", "timer", "extra_down"]}
          theme={resolvedTheme}
        />
      ) : undefined;

    return (
      <span>
        {!quickSwitchAtBottom ? maybeQuickSwitchBar : undefined}
        <Container>
          <Row className="text-center">
            <Col xs={6} lg={2}>
              {PlayTypeDiagUtils.buildLegend("[LEGEND]")}
              {/* TODO: duplicate CSV feature from PlayTypeDiagUtils.buildCsvDownload / PlayTypeDiagUtils.buildTeamStyleBreakdownData */}
            </Col>
            <Col xs={6} lg={7}>
              {PlayTypeDiagUtils.buildAdjustedVsRawControls(
                mainSosAdjustment,
                adjustForSos,
                (useAdjusted) => {
                  setAdjustForSos(useAdjusted);
                  onChangeChartOpts?.({
                    rawPpp: !useAdjusted,
                    playType: possFreqType,
                    quickSwitch,
                  });
                },
              )}
              {" | "}
              {PlayTypeDiagUtils.buildIndivFreqType(
                possFreqType,
                (newPossFreqType) => {
                  setPossFreqType(newPossFreqType);
                  onChangeChartOpts?.({
                    rawPpp: !adjustForSos,
                    playType: newPossFreqType,
                    quickSwitch,
                  });
                },
              )}
              {" | "}
              {PlayTypeDiagUtils.buildViewModeToggle(cardView, setCardView)}
              {navigationLinkOverride ? " | " : null}
              {navigationLinkOverride}
            </Col>
          </Row>
          {cardView ? (
            <Row>
              <Col xs={{ span: 7, offset: 2 }} className="pt-1">
                <GenericTable
                  growsToFit={false}
                  tableCopyId="indivPlayTypeCard"
                  tableFields={IndivTableDefs.playTypeCardTable}
                  tableData={cardTableRows}
                />
              </Col>
            </Row>
          ) : (
            <>
              {renderBarChartRow(
                topData,
                topPctile,
                topDefOverride,
                topSosAdjustment,
                commonMaxBetweenMainAndExtra,
                commonNumTicksToUse,
                topTitle,
                topCellPrefix,
              )}
              {showBottom
                ? renderBarChartRow(
                    extraData,
                    extraTopLevelPlayTypeStylesPctile,
                    extraDefOverride,
                    extraSosAdjustment ?? 1.0,
                    commonMaxBetweenMainAndExtra,
                    commonNumTicksToUse,
                    `Compare vs [${quickSwitchBase}]`,
                    "cell-extra-",
                  )
                : null}
            </>
          )}
          {debugView ? (
            <Row>
              <Col xs={10}>
                {_.toPairs(mainTopLevelPlayTypeStylesPctile || {}).map((o) => (
                  <span>
                    {JSON.stringify(o, tidyNumbers)}
                    <br />
                  </span>
                ))}
                {_.toPairs(mainTopLevelPlayTypeStyles || {}).map((o) => (
                  <span>
                    {JSON.stringify(o, tidyNumbers)}
                    <br />
                  </span>
                ))}
              </Col>
            </Row>
          ) : undefined}
        </Container>
        {quickSwitchAtBottom ? maybeQuickSwitchBar : undefined}
      </span>
    );
  }, [
    playerIn,
    grades,
    showGrades,
    teamStatsIn,
    quickSwitch,
    quickSwitchTimer,
    userOpts,
    defensiveOverrideIn,
    csvData,
    adjustForSos,
    possFreqType,
    cardView,
    resolvedTheme,
  ]);
};
export default IndivPlayTypeDiagRadar;

/** Util for console log */
const tidyNumbers = (k: string, v: any) => {
  if (_.isNumber(v)) {
    const numStr = v.toFixed(3);
    if (_.endsWith(numStr, ".000")) {
      return numStr.split(".")[0];
    } else {
      return parseFloat(numStr);
    }
  } else {
    return v;
  }
};

const topLevelPlayTypeDescriptions: Record<
  TopLevelIndivPlayType, //(note the "extra types" like "Perimiter Sniper (Post-Up)" aren't currently used in practice
  React.ReactNode
> = {
  "Rim Attack": (
    <i>
      Drives and slashes to the rim from the perimeter.
      <br />
      Includes pull-ups and floaters
    </i>
  ),
  "Attack & Kick": (
    <i>
      Ball-handler passes to the perimeter for 3P,
      <br />
      usually after the defense collapses on a drive
    </i>
  ),
  "Perimeter Sniper": (
    <i>
      A perimeter shot assisted by (typically) a driving guard
      <br />
      or a big posting out of a double team.
    </i>
  ),
  "Perimeter Sniper (Post-Up)": (
    <i>
      A perimeter shot assisted by (typically) a driving guard
      <br />
      or a big posting out of a double team.
    </i>
  ),
  "Perimeter Sniper (Rim Attack)": (
    <i>
      A perimeter shot assisted by (typically) a driving guard
      <br />
      or a big posting out of a double team.
    </i>
  ),
  "Dribble Jumper": (
    <i>
      3P shots off the dribble, eg off ISOs
      <br />
      or defenders going under screens
    </i>
  ),
  "Mid-Range": (
    <i>
      The offense finds space in the mid-range,
      <br />
      from backcourt/wing passes or sagging defenders
    </i>
  ),
  "Hits Cutter": (
    <i>
      A pass to a cutting perimeter player
      <br />
      eg via a backdoor cut
    </i>
  ),
  "Backdoor Cut": (
    <i>
      A perimeter player cuts to the basket
      <br />
      eg via a backdoor cut
    </i>
  ),
  "PnR Passer": (
    <i>
      A pass to a frontcourt player cutting to the basket,
      <br />
      Usually after a screen, eg in PnR
      <br />
      (or spotting up after screening, eg Pick and Pop)
    </i>
  ),
  "PnR Passer (Big Cut & Roll)": (
    <i>
      A pass to a frontcourt player cutting to the basket,
      <br />
      Usually after a screen, eg in PnR
    </i>
  ),
  "PnR Passer (Pick & Pop)": (
    <i>
      A pass to a frontcourt player spotting up,
      <br />
      Usually after a screen, eg a PnP
    </i>
  ),
  "Big Cut & Roll": (
    <i>
      A frontcourt player cuts to the basket,
      <br />
      Usually after a screen, eg in PnR
    </i>
  ),
  "Post-Up": (
    <i>
      A frontcourt player backs his defender
      <br />
      down to the rim
    </i>
  ),
  "Post & Kick": (
    <i>
      A frontcourt player is doubled (usually),
      <br />
      but finds an open shooter on the perimeter or mid-range
    </i>
  ),
  "Pick & Pop": (
    <i>
      An assisted 3P from a frontcourt player,
      <br />
      Sometimes after setting a screen
    </i>
  ),
  "High-Low": <i>Two bigs connect for a shot at the rim</i>,
  Transition: <i>Rim-to-rim, off turnovers, etc</i>,
  "Put-Back": (
    <i>
      Shots taken directly off a rebound
      <br />
      (can include a kick-out for 3P)
    </i>
  ),
  Misc: <i></i>,
};
