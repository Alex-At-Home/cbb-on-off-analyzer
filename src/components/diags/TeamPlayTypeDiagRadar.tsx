// React imports:
import React, { useState } from "react";

import _ from "lodash";

// Bootstrap imports:
import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Utils
import {
  PlayTypeUtils,
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

export type Props = {
  title?: string;
  players: Array<IndivStatSet>;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: Props[];
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
  playCountToUse?: number;
  quickSwitchOverride: string | undefined;
  defensiveOverride?: TopLevelPlayAnalysis;
  startWithRaw?: boolean;
};
const TeamPlayTypeDiagRadar: React.FunctionComponent<Props> = ({
  title,
  players: playersIn,
  rosterStatsByCode,
  teamStats: teamStatsIn,
  avgEfficiency,
  quickSwitchOptions,
  showGrades,
  grades,
  showHelp,
  playCountToUse,
  defensiveOverride,
  quickSwitchOverride,
  startWithRaw,
}) => {
  const [adjustForSos, setAdjustForSos] = useState<boolean>(
    !(startWithRaw || false)
  );

  const [quickSwitch, setQuickSwitch] = useState<string | undefined>(undefined);
  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);
  const players =
    (quickSwitch
      ? _.find(quickSwitchOptions || [], (opt) => opt.title == quickSwitch)
          ?.players
      : playersIn) || [];
  const teamStats =
    (quickSwitch
      ? _.find(quickSwitchOptions || [], (opt) => opt.title == quickSwitch)
          ?.teamStats
      : teamStatsIn) || StatModels.emptyTeam();

  const sosAdjustment =
    avgEfficiency /
    ((defensiveOverride
      ? teamStats.off_adj_opp?.value
      : teamStats.def_adj_opp?.value) || avgEfficiency);

  const topLevelPlayTypeStyles =
    defensiveOverride ||
    PlayTypeUtils.buildTopLevelPlayStyles(
      players,
      rosterStatsByCode,
      teamStats
    );

  const { tierToUse } = GradeTableUtils.buildTeamTierInfo(showGrades, {
    comboTier: grades?.Combo,
    highTier: grades?.High,
    mediumTier: grades?.Medium,
    lowTier: grades?.Low,
  });
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
        style={{ fontWeight: "bold" }}
      >
        {payload.value}
      </Text>
    );
  };

  const CustomLabelledWidthBar = (props: any) => {
    const { fill, x, y, width, height, rawPct, rawPts, pct, pts } = props;

    // Bar:

    // We adjust width according to rawPct
    // It's 0.1 at 0, and 1.0 at 0.10+

    const widthToUse =
      width * (0.1 + 0.9 * Math.max(0, Math.min(1.0, 10 * rawPct)));
    const xAdj = 0.5 * (width - widthToUse);

    // Text:
    //(incorporate the label along with the bar to workaround animation bug: https://github.com/recharts/recharts/issues/829#issuecomment-647998463)
    const textHeight = 10;

    // Outline .. starting from 10% we go from width 1 to 3 (at 25%+)
    const outlineWidth =
      1 + Math.min(3, Math.max(0, (rawPct - 0.1) * (3 / 0.15)));

    //Blob showing true efficiency
    const radius = 0.4 * (widthToUse / 2);
    const adjustment = adjustForSos ? sosAdjustment : 1.0;
    const rawColor = CbbColors.off_diff10_p100_redBlackGreen(
      (defensiveOverride ? -1 : 1) * (rawPts - 0.89) * 100 * adjustment
    );

    return (
      <g>
        <text
          x={x + width / 2}
          y={y - textHeight + 3}
          fill="#000000"
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
          stroke="#000000"
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

  const CustomTooltip: React.FunctionComponent<any> = (props: any) => {
    const { active, payload, label } = props;
    if (active) {
      const data = payload?.[0].payload || {};
      return (
        <div
          className="custom-tooltip"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
          }}
        >
          <p className="label pl-1 pr-1">
            <b>{`${PlayTypeDiagUtils.getPlayTypeName(data.playType)}`}</b>
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
            Adj Efficiency: [<b>{(data.rawPts * sosAdjustment).toFixed(2)}</b>]
            pts/play
            <br />
            {defensiveOverride ? (
              <span>
                {adjustForSos ? "Adj " : ""}Efficiency Pctile: [
                <b>{(100 - data.pts).toFixed(1)}%</b>]
              </span>
            ) : (
              <span>
                {adjustForSos ? "Adj " : ""}Efficiency Pctile: [
                <b>{data.pts.toFixed(1)}%</b>]
              </span>
            )}
            <br />
            (Average D1 play is approx [<b>0.89</b>] pts)
            {defensiveOverride ? <br /> : undefined}
            {defensiveOverride ? <br /> : undefined}
            {defensiveOverride ? (
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

  /** Shows the JSON at the bottom if enabled */
  const debugView = false;

  return React.useMemo(() => {
    const topLevelPlayTypeStylesPctile = tierToUse
      ? GradeUtils.getPlayStyleStats(
          topLevelPlayTypeStyles,
          tierToUse,
          sosAdjustment,
          true
        )
      : undefined;

    const data = topLevelPlayTypeStylesPctile
      ? _.map(topLevelPlayTypeStylesPctile, (stat, playType) => {
          const rawVal = (
            topLevelPlayTypeStyles as Record<
              string,
              { possPct: Statistic; pts: Statistic }
            >
          )[playType];

          const rawPct = rawVal?.possPct?.value || 0;

          return {
            name: PlayTypeDiagUtils.getPlayTypeName(playType).replace(
              "-",
              " - "
            ),
            playType: playType,
            pct:
              rawPct == 0 ? 0 : Math.min(100, (stat.possPct.value || 0) * 100),
            pts: Math.min(100, (stat.pts.value || 0) * 100),
            rawPct,
            rawPts: rawVal?.pts?.value || 0,
          };
        })
      : [];

    return (
      <span>
        {
          //(Note this isn't used in the team views (we inherit the one in TeamPlayTypeDiagView), only the game views)
          title
            ? PlayTypeDiagUtils.buildQuickSwitchOptions(
                title,
                quickSwitch,
                quickSwitchOptions,
                setQuickSwitch,
                quickSwitchTimer,
                setQuickSwitchTimer
              )
            : undefined
        }
        <Container>
          <Row>
            <Col>
              {PlayTypeDiagUtils.buildAdjustedVsRawControls(
                sosAdjustment,
                adjustForSos,
                setAdjustForSos
              )}
            </Col>
          </Row>
          {topLevelPlayTypeStylesPctile ? (
            <Row>
              <Col xs={10}>
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
                      interval={0}
                      tick={<CustomizedAxisTick />}
                    />
                    <YAxis
                      type="number"
                      domain={[0, 100]}
                      ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    >
                      <Label
                        angle={-90}
                        value={`Frequency %ile in D1`}
                        position="insideLeft"
                        style={{ textAnchor: "middle", fontWeight: "bold" }}
                      />
                    </YAxis>
                    <RechartTooltip
                      content={<CustomTooltip />}
                      wrapperStyle={{
                        background: "rgba(255, 255, 255, 0.9)",
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
                            key={`cell-${index}`}
                            stroke="#000000"
                            fill={(defensiveOverride
                              ? CbbColors.def_pctile_qual
                              : CbbColors.off_pctile_qual)(
                              p.pts *
                                0.01 *
                                (adjustForSos ? sosAdjustment : 1.0)
                            )}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Col>
            </Row>
          ) : undefined}
          {debugView ? (
            <Row>
              <Col xs={10}>
                {_.toPairs(topLevelPlayTypeStylesPctile || {}).map((o) => (
                  <span>
                    {JSON.stringify(o, tidyNumbers)}
                    <br />
                  </span>
                ))}
                {_.toPairs(topLevelPlayTypeStyles || {}).map((o) => (
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
    players,
    grades,
    showGrades,
    teamStats,
    quickSwitch,
    quickSwitchTimer,
    quickSwitchOverride,
    defensiveOverride,
    adjustForSos,
  ]);
};
export default TeamPlayTypeDiagRadar;

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

const topLevelPlayTypeDescriptions: Record<TopLevelPlayType, React.ReactNode> =
  {
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
    "Backdoor Cut": (
      <i>
        A perimeter player cuts to the basket
        <br />
        eg via a backdoor cut
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
