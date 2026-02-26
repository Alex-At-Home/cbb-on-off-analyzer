/**
 * Chart of per-game impact (e.g. Net RAPM) with game score differential as
 * background color. Used by Season Matchup Analyzer. Data model is separate
 * from GameInfoDiagView.
 */
import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { CbbColors } from "../../utils/CbbColors";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useTheme } from "next-themes";

export type GameImpactChartPoint = {
  gameLabel: string;
  value: number;
  scoreDiff: number;
};

const DEFAULT_CHART_HEIGHT = 140;
/** Bar interior opacity (0 = transparent, 1 = solid). Easy to change. */
const BAR_FILL_OPACITY = 0.3;

/** Format gameLabel like "@ UCLA (2026-02-21)" -> "UCLA 02-21" for x-axis. */
export function gameLabelToXAxisLabel(gameLabel: string): string {
  const dateMatch = gameLabel.match(/\((\d{4})-(\d{2})-(\d{2})\)/);
  const mmDd = dateMatch ? `${dateMatch[2]}-${dateMatch[3]}` : "";
  const opponent = gameLabel.replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, "").trim();
  return mmDd ? `${opponent} ${mmDd}` : gameLabel;
}

/** Rough px height needed for angled (-45°) x-axis labels from max label length (11px font). */
export function estimateXAxisLabelHeight(maxLabelLength: number): number {
  const pxPerChar = 2.5;
  return Math.min(95, 28 + maxLabelLength * pxPerChar);
}

type Props = {
  data: GameImpactChartPoint[];
  fieldLabel: string;
  /** Total chart height in px (plot area + label area). */
  height?: number;
  /** Height reserved for x-axis labels (axis drawn in bottom margin). */
  labelAreaHeight?: number;
  /** Extra px below axis before next content (e.g. table); default 8. */
  paddingBelowChart?: number;
};

/** Bar shape: transparent fill (configurable opacity), boundary 1px white, 2px row color, 1px white. */
function BarWithBorder(props: any) {
  const { x, y, width, height, payload } = props;
  const color = payload?.barColor ?? "#888";
  const opacity = BAR_FILL_OPACITY;
  if (height <= 0 || width <= 0) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  return (
    <g>
      {/* Outer 1px white */}
      <rect x={x0} y={y0} width={w} height={h} fill="none" stroke="white" strokeWidth={1} />
      {/* 2px row color */}
      <rect x={x0 + 1} y={y0 + 1} width={w - 2} height={h - 2} fill="none" stroke={color} strokeWidth={2} />
      {/* Inner 1px white then transparent fill */}
      <rect x={x0 + 3} y={y0 + 3} width={w - 6} height={h - 6} fill="white" fillOpacity={0} stroke="white" strokeWidth={1} />
      <rect x={x0 + 4} y={y0 + 4} width={Math.max(0, w - 8)} height={Math.max(0, h - 8)} fill={color} fillOpacity={opacity} />
    </g>
  );
}

const CustomTooltip: React.FunctionComponent<{
  active?: boolean;
  payload?: any;
}> = ({ active, payload }) => {
  const { resolvedTheme } = useTheme();
  if (active && payload?.[0]) {
    const p = payload[0].payload as GameImpactChartPoint;
    return (
      <div
        className="custom-tooltip"
        style={{
          background:
            resolvedTheme === "dark"
              ? "rgba(0, 0, 0, 0.9)"
              : "rgba(238, 238, 238, 0.9)",
          padding: "6px 10px",
        }}
      >
        <div>
          <b>{p.gameLabel}</b>
        </div>
        <div>
          {payload[0].name}: <b>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</b>
        </div>
        <div>
          Score diff: <b>{p.scoreDiff > 0 ? "+" : ""}{p.scoreDiff}</b>
        </div>
      </div>
    );
  }
  return null;
};

let chartInstanceId = 0;

const PADDING_BELOW_CHART = 8;

const GameImpactDiagView: React.FunctionComponent<Props> = ({
  data,
  fieldLabel,
  height = DEFAULT_CHART_HEIGHT,
  labelAreaHeight,
  paddingBelowChart = PADDING_BELOW_CHART,
}) => {
  const { resolvedTheme } = useTheme();
  const id = ++chartInstanceId;
  const numGames = data.length;
  const strokeColor = resolvedTheme === "dark" ? "#ccc" : "#333";
  // Only reserve padding below axis; label area is inside content (xAxis height uses it)
  const marginBottom = paddingBelowChart;

  if (data.length === 0) {
    return (
      <Container className="medium_screen">
        <Row>
          <Col>
            <p className="text-muted small">No game data to display.</p>
          </Col>
        </Row>
      </Container>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    max: 100,
    barColor: CbbColors.off_diff150_redGreen(d.scoreDiff),
    xAxisLabel: gameLabelToXAxisLabel(d.gameLabel),
  }));

  const xAxisHeight = labelAreaHeight ?? 70;
  const xAxisFontSize = 11;

  return (
    <Container className="medium_screen">
      <Row>
        <Col style={{ overflow: "visible" }}>
          <br />
          <ResponsiveContainer width="100%" height={height} style={{ overflow: "visible" }}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: marginBottom }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="xAxisLabel"
                stroke={strokeColor}
                tick={{ fontSize: xAxisFontSize }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={xAxisHeight}
              />
              <YAxis
                yAxisId="left"
                stroke={strokeColor}
                tick={{ fontSize: 11 }}
                label={{
                  value: fieldLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: strokeColor },
                }}
              />
              <YAxis
                yAxisId="right"
                domain={[0, 100]}
                orientation="right"
                tickFormatter={() => ""}
                width={0}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                yAxisId="left"
                y={0}
                stroke={strokeColor}
                strokeDasharray="2 2"
              />
              {numGames > 0 && (
                <defs>
                  <linearGradient
                    id={`gameImpactSplitColor${id}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    {chartData.map((point, i) => {
                      const color = CbbColors.off_diff150_redGreen(
                        point.scoreDiff
                      );
                      return (
                        <stop
                          key={i}
                          offset={
                            numGames === 1 ? 0.5 : i / (numGames - 1)
                          }
                          stopColor={color}
                          stopOpacity={1}
                        />
                      );
                    })}
                  </linearGradient>
                </defs>
              )}
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="max"
                stroke="none"
                fill={`url(#gameImpactSplitColor${id})`}
                fillOpacity={0.25}
                isAnimationActive={false}
              />
              <Bar
                yAxisId="left"
                dataKey="value"
                isAnimationActive={false}
                name={fieldLabel}
                shape={(props: any) => <BarWithBorder {...props} />}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Col>
      </Row>
    </Container>
  );
};

export default GameImpactDiagView;
