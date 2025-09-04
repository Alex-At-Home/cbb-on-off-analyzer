// React imports:
import React, { useState } from "react";

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
import { useTheme } from "next-themes";

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
}) => {
  const { resolvedTheme } = useTheme();
  const highlightColor = resolvedTheme == "dark" ? "#ffFFff" : "#000000";

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
  const [adjustForSos, setAdjustForSos] = useState<boolean>(true);
  const [possFreqType, setPossFreqType] = useState<
    "P%le" | "T%le" | "P%" | "T%"
  >("P%le");

  const [csvData, setCsvData] = useState<object[]>([]);

  const [quickSwitch, setQuickSwitch] = useState<string | undefined>(undefined);
  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);
  const quickSwichDelim = ":|:";
  const quickSwitchBase = quickSwitch
    ? quickSwitch.split(quickSwichDelim)[0]
    : undefined;
  const quickSwitchExtra: "extra" | "diff" | undefined = (
    quickSwitch ? quickSwitch.split(quickSwichDelim)[1] : undefined
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
    }
  );
  const possFactor = _.isNumber(playCountToUse) ? playCountToUse / 100 : 1.0;

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
    const { fill, x, y, width, height, rawPct, rawPts, pct, pts } = props;

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
      (mainDefensiveOverride ? -1 : 1) * (rawPts - 0.89) * 100 * adjustment
    );

    return (
      <g>
        <text
          x={x + width / 2}
          y={y - textHeight + 3}
          fill={highlightColor}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan>{(100 * (rawPct || 0) * possFactor).toFixed(1)}x </tspan>
          {rawPct > 0 ? (
            <tspan fill={rawColor}>
              {((rawPts || 0) * adjustment).toFixed(2)}
            </tspan>
          ) : undefined}
        </text>
        <path
          stroke={highlightColor}
          strokeWidth={outlineWidth}
          fill={fill}
          className="recharts-rectangle"
          d={`M ${
            x + xAdj
          },${y} h ${widthToUse} v ${height} h ${-widthToUse} Z`}
        />
      </g>
    );
  };

  //TODO: is mainDefensiveOveride correct here, or should this be the defOverride passed into renderBarChartRow
  const CustomTooltip: React.FunctionComponent<any> = (props: any) => {
    const { active, payload, label } = props;
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
            Frequency Pctile: [<b>{data.pct.toFixed(1)}%</b>]
            {_.isNumber(playCountToUse) ? <br /> : null}
            {_.isNumber(playCountToUse) ? (
              <span>(Label shows value for {playCountToUse} play game)</span>
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
    rowTitle?: string,
    cellKeyPrefix: string = "cell-"
  ) =>
    pctile ? (
      <Row>
        <Col xs={10}>
          {rowTitle ? (
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>
              {rowTitle}
            </div>
          ) : null}
          <ResponsiveContainer minWidth={800} width="100%" height={400}>
            <BarChart
              height={400}
              data={data}
              margin={{
                top: 20,
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
                  possFreqType == "P%" || possFreqType == "T%"
                    ? undefined
                    : [0, 100]
                }
                ticks={
                  possFreqType == "P%" || possFreqType == "T%"
                    ? undefined
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
                        p.pts * 0.01 * (adjustForSos ? sosAdj : 1.0)
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
          mainTeamStats
        );

    const mainTopLevelPlayTypeStylesPctile = mainTierToUse
      ? GradeUtils.getIndivPlayStyleStats(
          mainTopLevelPlayTypeStyles,
          mainTierToUse,
          mainSosAdjustment,
          possFreqType == "T%le",
          true
        )
      : undefined;

    // In this case we just use the raw freq, but we do want the efficiency %s
    if (possFreqType == "P%" || possFreqType == "T%") {
      _.forEach(mainTopLevelPlayTypeStyles, (val, key) => {
        const toAdjust =
          mainTopLevelPlayTypeStylesPctile?.[key as TopLevelIndivPlayType];
        if (toAdjust) {
          toAdjust.possPct = val.possPct;
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
              rawPct == 0
                ? 0
                : Math.min(
                    100,
                    (possFreqType == "T%"
                      ? stat.possPctUsg?.value || 0
                      : stat.possPct.value || 0) * 100
                  ),
            pts: Math.min(100, (stat.pts.value || 0) * 100),
            rawPct,
            rawPts: rawVal?.pts?.value || 0,
          };
        })
      : [];

    // Compute the 'extra' (was 'base') chart data (from quickSwitchBase)
    let extraTopLevelPlayTypeStylesPctile: any = undefined;
    let extraData: any[] = [];
    let extraDefOverride: any = undefined;
    let extraSosAdjustment: number | undefined = undefined;
    if (quickSwitchBase && quickSwitchOptions) {
      const extraOpt = _.find(
        quickSwitchOptions,
        (opt) => opt.title == quickSwitchBase
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
        const extraTopLevelPlayTypeStyles = extraCompressedPlayTypeStats
          ? PlayTypeUtils.decompressIndivPlayType(extraCompressedPlayTypeStats)
          : extraDefOverride ||
            (extraTeamStats.style as TopLevelPlayAnalysis) ||
            PlayTypeUtils.buildTopLevelIndivPlayStyles(
              extraPlayer,
              rosterStatsByCode,
              extraTeamStats
            );

        extraTopLevelPlayTypeStylesPctile = mainTierToUse
          ? GradeUtils.getIndivPlayStyleStats(
              extraTopLevelPlayTypeStyles,
              mainTierToUse,
              extraSosAdjustment,
              possFreqType == "T%le",
              true
            )
          : undefined;

        // In this case we just use the raw freq, but we do want the efficiency %s
        if (possFreqType == "P%" || possFreqType == "T%") {
          _.forEach(extraTopLevelPlayTypeStyles, (val, key) => {
            const toAdjust =
              extraTopLevelPlayTypeStylesPctile?.[key as TopLevelIndivPlayType];
            if (toAdjust) {
              toAdjust.possPct = val.possPct;
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
                  " - "
                ),
                playType: playType,
                pct:
                  rawPct == 0
                    ? 0
                    : Math.min(
                        100,
                        (possFreqType == "T%"
                          ? stat.possPctUsg?.value || 0
                          : stat.possPct.value || 0) * 100
                      ),
                pts: Math.min(100, (stat.pts.value || 0) * 100),
                rawPct,
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
      : extraSosAdjustment ?? 1.0;
    const topTitle = undefined; // never show a title for the top chart
    const topCellPrefix = showMainOnTop ? "cell-" : "cell-extra-";

    // Bottom chart: only if quickSwitchExtra === 'extra', always show extraData
    const showBottom =
      quickSwitchExtra === "extra" && quickSwitchBase && quickSwitchOptions;

    return (
      <span>
        {
          //(Note this isn't used in the team views (we inherit the one in TeamPlayTypeDiagView), only the game views)
          title
            ? PlayTypeDiagUtils.buildQuickSwitchOptions(
                title,
                quickSwitchBase,
                quickSwitchOptions,
                (newSetting, fromTimer) => {
                  if (fromTimer) {
                    setQuickSwitch((curr) => (curr ? undefined : newSetting));
                  } else {
                    onChangeChartOpts?.({
                      rawPpp: !adjustForSos,
                      playType: possFreqType,
                      quickSwitch: newSetting,
                    });
                    setQuickSwitch(newSetting);
                  }
                },
                quickSwitchTimer,
                setQuickSwitchTimer,
                quickSwitchExtra,
                ["extra"]
              )
            : undefined
        }
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
                setAdjustForSos //TODO
              )}
              {" | "}
              {PlayTypeDiagUtils.buildFrequencyType(
                possFreqType,
                setPossFreqType //TODO
              )}
              {navigationLinkOverride ? " | " : null}
              {navigationLinkOverride}
            </Col>
          </Row>
          {renderBarChartRow(
            topData,
            topPctile,
            topDefOverride,
            topSosAdjustment,
            topTitle,
            topCellPrefix
          )}
          {showBottom
            ? renderBarChartRow(
                extraData,
                extraTopLevelPlayTypeStylesPctile,
                extraDefOverride,
                extraSosAdjustment ?? 1.0,
                `Compare vs [${quickSwitchBase}]`,
                "cell-extra-"
              )
            : null}
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
