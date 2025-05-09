// React imports:
import React, { useState } from "react";

// Next imports:
import { NextPage } from "next";

import _ from "lodash";

// Bootstrap imports:
import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { CbbColors } from "../../utils/CbbColors";
import { GameInfoStatSet } from "../../utils/StatModels";
// import Tooltip from 'react-bootstrap/Tooltip';
// import OverlayTrigger from 'react-bootstrap/OverlayTrigger';

//@ts-ignore
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Label,
} from "recharts";

// Utils

// Component imports

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
          background: "rgba(255, 255, 255, 0.9)",
        }}
      >
        <p className="label">
          <b>{`${data.date} ${label}`}</b>
        </p>
        <p className="desc">
          <span>
            [<b>{data.num_off_poss}</b>] off possessions
          </span>
          <br />
          <span>
            [<b>{data.num_def_poss}</b>] def possessions
          </span>
          <br />
          <span>
            [<b>{data.num_pts_for}</b>] pts scored
          </span>
          <br />
          <span>
            [<b>{data.num_pts_against}</b>] pts conceded
          </span>
          <br />
          {data.num_off_poss > 0 && data.num_def_poss > 0 ? (
            <span>
              +- [<b>{data.plusMinus}</b>]
            </span>
          ) : null}
        </p>
      </div>
    );
  }
  return null;
};

/** Was getting into weirdness with only 1 lineup defined, must be something to do with SVG + ids */
var oneUp_ = 0;

type Props = {
  oppoList: Array<GameInfoStatSet>;
  orderedOppoList: Record<string, any>;
  params: Record<string, any>;
  maxOffPoss: number;
};
const GameInfoDiagView: React.FunctionComponent<Props> = ({
  oppoList,
  orderedOppoList,
  params,
  maxOffPoss,
}) => {
  const currId = oneUp_;
  oneUp_++;

  const [zoomIn, setZoomIn] = useState((maxOffPoss < 0) as boolean);

  // Merge with the ordered oppo list
  oppoList.forEach((oppo, i) => {
    const plusMinus = (oppo.num_pts_for || 0) - (oppo.num_pts_against || 0);
    const marginalEff =
      (oppo.num_pts_for || 0) / (oppo.num_off_poss || 1) -
      (oppo.num_pts_against || 0) / (oppo.num_def_poss || 1);
    const maybeMin = (t: number) => (zoomIn ? t : Math.min(t, 100));
    orderedOppoList[`${oppo.date} ${oppo.opponent}`] = {
      ...oppo,
      plusMinus: plusMinus,
      marginalEff: marginalEff,
    };
  });
  const gameDates = _.values(orderedOppoList).map((o, i) => {
    return { max: 100, ...o };
  });
  const numGames = gameDates.length;

  return (
    <Container className="medium_screen">
      <Row>
        <Col>
          <br />
          <ResponsiveContainer width={"100%"} height={120}>
            <ComposedChart
              data={gameDates}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="opponent" />
              <YAxis
                yAxisId="left"
                domain={[0, zoomIn ? "auto" : maxOffPoss + 1]}
              >
                <Label
                  angle={-90}
                  value="# possessions"
                  position="insideLeft"
                  style={{ textAnchor: "middle" }}
                />
              </YAxis>
              <YAxis
                yAxisId="right"
                domain={[0, 100]}
                orientation="right"
                tickFormatter={(t: any) => ""}
              ></YAxis>
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ opacity: "0.9", zIndex: 1000 }}
                allowEscapeViewBox={{ x: true, y: true }}
                itemSorter={(item: any) => item.value}
              />
              <defs>
                <linearGradient
                  id={`splitColor${currId}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  {gameDates.flatMap((oppo, i) => {
                    const color = CbbColors.off_diff150_redGreen(
                      oppo.marginalEff
                    );
                    return [
                      <stop
                        offset={i / (numGames - 1)}
                        stopColor={color}
                        stopOpacity={1}
                      />,
                    ];
                  })}
                </linearGradient>
              </defs>
              <Area
                yAxisId="right"
                isAnimationActive={false}
                type="monotone"
                dataKey="max"
                stroke="#000"
                strokeWidth={0}
                dot={false}
                activeDot={false}
                fill={`url(#splitColor${currId})`}
                fillOpacity={0.25}
              />
              <Line
                yAxisId="left"
                type="monotone"
                isAnimationActive={false}
                dataKey="num_off_poss"
                stroke="#000"
                strokeWidth={1}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <b>Game breakdown for above lineup</b>
            &nbsp;
            {maxOffPoss < 0 ? null : (
              <div>
                (
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setZoomIn(!zoomIn);
                  }}
                >
                  {zoomIn ? "zoom out" : "zoom in"}
                </a>
                )
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};
export default GameInfoDiagView;
