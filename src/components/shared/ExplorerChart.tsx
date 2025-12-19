// React imports:
import React, { useRef } from "react";

// Lodash:
import _ from "lodash";

// Recharts imports:
//@ts-ignore
import {
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Label,
  Cell,
} from "recharts";

// Utils
import { ScatterChartUtils } from "../../utils/charts/ScatterChartUtils";
import { decompAxis } from "../../utils/ExplorerChartUtils";
import { useTheme } from "next-themes";

export type ExplorerChartProps = {
  // Data (already filtered)
  filteredData: any[];
  highlightData: any[] | undefined;

  // Custom tooltip component
  CustomTooltip: React.ComponentType<any>;

  // Chart configuration
  xAxis: string;
  yAxis: string;
  dotColor: string;
  dotSize: string;
  dotColorMap: string;

  // Labels
  labelStrategy: string;
  pointMarkerType: string;
  labelBuilder: (dataObj: any) => string;

  // Conference/query filtering (for visual highlighting)
  confFilter?: (dataObj: any) => boolean;

  // Presets and options
  axisPresets: Array<[string, string]>;
  colorMapOptions: Record<string, any>;
  contrastForegroundBuilder: (val: number) => string;

  // Screen dimensions
  screenHeight: number;
  screenWidth: number;
  height: number;

  // Player/Team toggle state and handler
  toggledEntities: Record<string, boolean>;
  onEntityToggle: (entityKey: string) => void;
  entityType: string;

  // For players, we can weight stats by minute
  incWeightedSummary?: boolean;
};

const ExplorerChart: React.FunctionComponent<ExplorerChartProps> = ({
  filteredData,
  highlightData,
  CustomTooltip,
  xAxis,
  yAxis,
  dotColor,
  dotSize,
  dotColorMap,
  labelStrategy,
  pointMarkerType,
  labelBuilder,
  confFilter,
  axisPresets,
  colorMapOptions,
  contrastForegroundBuilder,
  screenHeight,
  screenWidth,
  height,
  toggledEntities,
  onEntityToggle,
  entityType,
  incWeightedSummary,
}) => {
  const { resolvedTheme } = useTheme();

  const globalScatterChartRef = useRef<any>();

  const extractTitle = (fieldDef: string) => {
    const decomp = decompAxis(fieldDef);
    return (
      decomp.label ||
      axisPresets.find((kv) => kv[1] == decomp.linq)?.[0] ||
      decomp.linq
    );
  };

  const subChart =
    _.isNil(confFilter) && !highlightData
      ? undefined
      : _.chain(highlightData || filteredData)
          .filter((p) => !confFilter || confFilter(p))
          .map((p) => {
            return {
              x: p.x,
              y: p.y,
              z: p.z ?? 10, //(arbitrary number just to avoid being undefined)
              label: labelBuilder(p),
              showTooltips: true,
              colorRgb: p.colorRgb,
              p: p,
            };
          })
          .value();

  var minColor = Number.MAX_SAFE_INTEGER;
  var maxColor = -Number.MAX_SAFE_INTEGER;
  const mainChart = _.chain(filteredData)
    .map((p) => {
      if ((p.color || 0) < minColor) minColor = p.color || 0;
      if ((p.color || 0) > maxColor) maxColor = p.color || 0;
      return {
        x: p.x,
        y: p.y,
        z: p.z ?? 10, //(arbitrary number just to avoid being undefined)
        label: labelBuilder(p),
        showTooltips: subChart == undefined,
        colorRgb: p.colorRgb,
        p: p,
      };
    })
    .value();

  // Labelling logic
  const [maxLabels, topAndBottom]: [number, boolean] = _.thru(
    labelStrategy,
    () => {
      if (labelStrategy == "None") return [0, true];
      else {
        return [
          parseInt(labelStrategy.replace(/^[^0-9]*([0-9]+)$/, "$1")),
          labelStrategy.indexOf("Bottom") >= 0,
        ];
      }
    }
  );

  const chartToUseForLabels = subChart || mainChart;
  const dataPointsToLabelPhase1 =
    maxLabels > 0
      ? (_.thru(topAndBottom, () => {
          if (topAndBottom) {
            if (2 * maxLabels > _.size(chartToUseForLabels)) {
              return chartToUseForLabels;
            } else {
              return _.take(chartToUseForLabels, maxLabels).concat(
                _.takeRight(chartToUseForLabels, maxLabels)
              );
            }
          } else {
            return _.take(chartToUseForLabels, maxLabels);
          }
        }) as any[])
      : undefined;

  const dataPointsToLabel = _.isEmpty(toggledEntities)
    ? dataPointsToLabelPhase1
    : (dataPointsToLabelPhase1 || []).concat(
        mainChart.filter((p) => toggledEntities[labelBuilder(p.p)])
      );

  // (Some util logic associated with building averages and limits)
  const mutAvgState = {
    avgX: 0,
    avgY: 0,
    weightAvgX: 0,
    weightAvgY: 0,
    varX: 0,
    varY: 0,
    weightVarX: 0,
    weightVarY: 0,
    avgCount: 0,
    avgWeightX: 0,
    avgWeightY: 0,
  };
  const xHasNext = xAxis.indexOf("next_") >= 0;
  const yHasNext = yAxis.indexOf("next_") >= 0;
  const updateAvgState = (p: any) => {
    mutAvgState.avgX += p.x || 0;
    mutAvgState.avgY += p.y || 0;
    mutAvgState.varX += (p.x || 0) * (p.x || 0);
    mutAvgState.varY += (p.y || 0) * (p.y || 0);
    const weightX = xHasNext
      ? p.p?.actualResults?.off_team_poss_pct?.value || 0
      : p.p?.orig?.off_team_poss_pct?.value || 0;
    const weightY = yHasNext
      ? p.p?.actualResults?.off_team_poss_pct?.value || 0
      : p.p?.orig?.off_team_poss_pct?.value || 0;
    mutAvgState.weightAvgX += (p.x || 0) * weightX;
    mutAvgState.weightAvgY += (p.y || 0) * weightY;
    mutAvgState.weightVarX += (p.x || 0) * (p.x || 0) * weightX;
    mutAvgState.weightVarY += (p.y || 0) * (p.y || 0) * weightY;
    mutAvgState.avgWeightX += weightX;
    mutAvgState.avgWeightY += weightY;
    mutAvgState.avgCount += 1;
  };
  const completeAvgState = () => {
    mutAvgState.avgX = mutAvgState.avgX / (mutAvgState.avgCount || 1);
    mutAvgState.avgY = mutAvgState.avgY / (mutAvgState.avgCount || 1);
    const avgX2 = mutAvgState.varX / (mutAvgState.avgCount || 1);
    const avgY2 = mutAvgState.varY / (mutAvgState.avgCount || 1);
    mutAvgState.varX = Math.sqrt(
      Math.abs(avgX2 - mutAvgState.avgX * mutAvgState.avgX)
    );
    mutAvgState.varY = Math.sqrt(
      Math.abs(avgY2 - mutAvgState.avgY * mutAvgState.avgY)
    );
    const avgWeightX2 = mutAvgState.weightVarX / (mutAvgState.avgWeightX || 1);
    const avgWeightY2 = mutAvgState.weightVarY / (mutAvgState.avgWeightY || 1);
    mutAvgState.weightAvgX =
      mutAvgState.weightAvgX / (mutAvgState.avgWeightX || 1);
    mutAvgState.weightAvgY =
      mutAvgState.weightAvgY / (mutAvgState.avgWeightY || 1);
    mutAvgState.weightVarX = Math.sqrt(
      Math.abs(avgWeightX2 - mutAvgState.weightAvgX * mutAvgState.weightAvgX)
    );
    mutAvgState.weightVarY = Math.sqrt(
      Math.abs(avgWeightY2 - mutAvgState.weightAvgY * mutAvgState.weightAvgY)
    );
  };
  if (subChart) {
    subChart.forEach((el) => updateAvgState(el));
  } else {
    mainChart.forEach((el) => updateAvgState(el));
  }
  completeAvgState();

  const renderAvgState = () => {
    return (
      <div>
        Average: [({mutAvgState.avgX.toFixed(2)}, {mutAvgState.avgY.toFixed(2)}
        )]&nbsp; (std: [{mutAvgState.varX.toFixed(2)}], [
        {mutAvgState.varY.toFixed(2)}])
        {incWeightedSummary ? (
          <span>
            &nbsp;//&nbsp; Weighted: [(
            {mutAvgState.weightAvgX.toFixed(2)},{" "}
            {mutAvgState.weightAvgY.toFixed(2)}
            )]&nbsp; (std: [{mutAvgState.weightVarX.toFixed(2)}], [
            {mutAvgState.weightVarY.toFixed(2)}])
          </span>
        ) : undefined}{" "}
        //&nbsp; sample count=[
        {mutAvgState.avgCount}]
      </div>
    );
  };

  const colorMapPicker =
    colorMapOptions[dotColorMap] || contrastForegroundBuilder;
  const isAutoColorMap = dotColorMap.indexOf("Auto") >= 0;
  const deltaColorInv = 1 / (maxColor - minColor || 1);
  const colorMapTransformer = (n: number) => {
    if (isAutoColorMap) {
      return (n - minColor) * deltaColorInv;
    } else return n;
  };

  const handleEntityToggle = (entityKey: string) => {
    globalScatterChartRef.current.handleItemMouseLeave();
    onEntityToggle(entityKey);
  };

  const labelState = ScatterChartUtils.buildEmptyLabelState();
  const xAxisDecom = decompAxis(xAxis);
  const yAxisDecom = decompAxis(yAxis);

  const maybeIconSquareSize = (mult: number = 1.0) => {
    if (pointMarkerType == "Team Logo (large)") {
      return 40 * mult;
    } else if (pointMarkerType == "Team Logo (small)") {
      return 20 * mult;
    } else {
      return undefined;
    }
  };

  const CustomPngPoint = (props: any) => {
    const { color, cx, cy, payload } = props;
    const entityObj = payload.p;

    const imageSize = maybeIconSquareSize() ?? 16;

    // cx, cy are the calculated center coordinates from Recharts
    // Adjust x and y to center the image on the data point
    const x = cx - imageSize / 2;
    const y = cy - imageSize / 2;
    const opacity = _.isNumber(props.opacity || 1)
      ? props.opacity || 1
      : 0.01 * parseInt(props.opacity || 1);

    return (
      <svg
        x={x}
        y={y}
        width={imageSize}
        height={imageSize}
        opacity={opacity}
        overflow="visible"
        onClick={(e) => handleEntityToggle(payload.label)}
      >
        <image
          href={`logos/${resolvedTheme == "dark" ? "dark" : "normal"}/${
            entityObj?.team_name || entityObj?.actualResults?.team || "Unknown"
          }.png`} // Use the imageUrl from your data
          width={imageSize}
          height={imageSize}
        />
      </svg>
    );
  };

  return (
    <div>
      <ResponsiveContainer width={"100%"} height={0.75 * height}>
        <ScatterChart
          onMouseLeave={() =>
            globalScatterChartRef.current.handleItemMouseLeave()
          }
          ref={globalScatterChartRef}
          margin={{ top: 0, bottom: 20 }}
        >
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="x"
            ticks={xAxisDecom.ticks}
            domain={xAxisDecom.limits || ["auto", "auto"]}
            reversed={xAxisDecom.invert || false}
            allowDataOverflow={!_.isNil(xAxisDecom.limits)}
          >
            <Label
              value={extractTitle(xAxis)}
              position="inside"
              style={{ textAnchor: "middle" }}
              dy={20}
              fill={resolvedTheme == "dark" ? "#CCC" : undefined}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            ticks={yAxisDecom.ticks}
            domain={yAxisDecom.limits || ["auto", "auto"]}
            reversed={yAxisDecom.invert || false}
            allowDataOverflow={!_.isNil(yAxisDecom.limits)}
          >
            <Label
              angle={-90}
              value={extractTitle(yAxis)}
              position="insideLeft"
              style={{ textAnchor: "middle" }}
              fill={resolvedTheme == "dark" ? "#CCC" : undefined}
            />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[10, 100]} />
          <Scatter
            data={mainChart}
            fill="green"
            opacity={subChart ? 0.25 : 1.0}
            shape={
              !subChart && pointMarkerType.startsWith("Team") ? (
                <CustomPngPoint />
              ) : undefined
            }
          >
            {subChart
              ? undefined
              : ScatterChartUtils.buildLabelColliders("mainChart", {
                  maxHeight: screenHeight,
                  maxWidth: screenWidth,
                  chartRef: globalScatterChartRef,
                  iconHeightOverride: maybeIconSquareSize(),
                  iconWidthOverride: maybeIconSquareSize(),
                  mutableState: labelState,
                  dataKey: "label",
                  series: mainChart,
                })}
            {mainChart.map((p, index) => {
              p.colorRgb = colorMapPicker(colorMapTransformer(p.p.color));
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={p.colorRgb}
                  onClick={(e) => handleEntityToggle(p.label)}
                />
              );
            })}
            ;
          </Scatter>
          {subChart ? (
            <Scatter
              data={subChart}
              fill="green"
              shape={
                pointMarkerType.startsWith("Team") ? (
                  <CustomPngPoint />
                ) : undefined
              }
            >
              {ScatterChartUtils.buildLabelColliders("subChart", {
                maxHeight: screenHeight,
                maxWidth: screenWidth,
                chartRef: globalScatterChartRef,
                iconHeightOverride: maybeIconSquareSize(),
                iconWidthOverride: maybeIconSquareSize(),
                mutableState: labelState,
                dataKey: "label",
                series: subChart,
              })}

              {subChart.map((p, index) => {
                p.colorRgb = colorMapPicker(colorMapTransformer(p.p.color));
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorMapPicker(colorMapTransformer(p.p.color))}
                    onClick={(e) => handleEntityToggle(p.label)}
                  />
                );
              })}
            </Scatter>
          ) : null}
          ;
          {dataPointsToLabel ? (
            <Scatter data={dataPointsToLabel} fill="green">
              {ScatterChartUtils.buildTidiedLabelList({
                maxHeight: screenHeight,
                maxWidth: screenWidth,
                chartRef: globalScatterChartRef,
                iconHeightOverride: maybeIconSquareSize(),
                iconWidthOverride: maybeIconSquareSize(),
                mutableState: labelState,
                dataKey: "label",
                series: dataPointsToLabel,
              })}

              {dataPointsToLabel.map((p, index) => {
                return <Cell key={`cell-${index}`} opacity={0} />;
              })}
            </Scatter>
          ) : null}
          ;
          {/* Repeat the label subset again, to ensure that the labels get rendered, see buildTidiedLabelList docs */}
          {dataPointsToLabel ? (
            <Scatter
              data={dataPointsToLabel}
              fill="green"
              shape={
                pointMarkerType.startsWith("Team") ? (
                  <CustomPngPoint />
                ) : undefined
              }
            >
              {ScatterChartUtils.buildTidiedLabelList({
                maxHeight: screenHeight,
                maxWidth: screenWidth,
                chartRef: globalScatterChartRef,
                iconHeightOverride: maybeIconSquareSize(),
                iconWidthOverride: maybeIconSquareSize(),
                mutableState: labelState,
                dataKey: "label",
                series: dataPointsToLabel,
                underlinedLabels: toggledEntities,
              })}

              {dataPointsToLabel.map((p, index) => {
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorMapPicker(colorMapTransformer(p.p.color))}
                    onClick={(e) => handleEntityToggle(p.label)}
                  />
                );
              })}
            </Scatter>
          ) : null}
          ;
          <RechartTooltip
            content={<CustomTooltip />}
            wrapperStyle={{ opacity: "0.9", zIndex: 1000 }}
            allowEscapeViewBox={{ x: true, y: false }}
            itemSorter={(item: any) => item.value}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <i>
        <small>
          <p>
            {renderAvgState()}
            {_.isEmpty(toggledEntities) ? null : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onEntityToggle(""); // Clear all selections - parent will handle this
                }}
              >
                [{_.size(toggledEntities)}] {entityType}(s) manually selected.
                Click to clear selection
              </a>
            )}
          </p>
        </small>
      </i>
    </div>
  );
};

export default ExplorerChart;
