// React imports:
import React, { useRef, useEffect } from "react";

import _ from "lodash";

// Utils
import { CbbColors } from "../../utils/CbbColors";
/////////////////////// 2D Shot Chart

// D3

import * as d3 from "d3";
import { hexbin } from "d3-hexbin";
import { HexZone, HexData } from "../../utils/StatModels";
import { useTheme } from "next-themes";
import { ShotChartUtils } from "../../utils/stats/ShotChartUtils";

const MIN_Y = -5;
const MAX_Y = 35;
const MIN_X = -26;
const MAX_X = 26;

interface HexMapProps {
  data: HexData[];
  width: number;
  height: number;
  isDef?: boolean;
  showZones?: boolean;
  zones?: HexZone[];
  splitZones?: HexZone[];
  d1Zones?: HexZone[];
  /** diffDataSet are the d1 averages for each hex key */
  diffDataSet?: Record<
    string,
    { avg_freq: number; avg_ppp: number; loc: number[] }
  >;
  buildZones: boolean;
  useEfg?: boolean;
  /** When in regions mode: aggregated region stats and mapping */
  regionZones?: HexZone[];
  d1RegionZones?: HexZone[];
  zoneToRegion?: number[];
  firstZoneIndexPerRegion?: number[];
  /** When true (Freq mode): background = efficiency, circle = freq, number = freq%; when false (FG): current behavior */
  showFreqAsNumber?: boolean;
}
const HexMap: React.FC<HexMapProps> = ({
  data,
  width,
  height,
  isDef,
  diffDataSet,
  zones,
  splitZones,
  d1Zones,
  buildZones,
  useEfg = true,
  regionZones,
  d1RegionZones,
  zoneToRegion,
  firstZoneIndexPerRegion,
  showFreqAsNumber = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { resolvedTheme } = useTheme();
  const backgroundColor = resolvedTheme == "dark" ? "#272b30" : "#ffffff";
  const clusterStrokeColor = resolvedTheme == "dark" ? "#444" : "#ccc";
  const courtStrokeColor = resolvedTheme == "dark" ? "#fff" : "#000";

  // Define scales for x and y to map original coordinates to canvas
  const xScale = d3
    .scaleLinear()
    .domain([MIN_X, MAX_X]) // Original x range
    .range([width, 0]); // Canvas width range

  const yScale = d3
    .scaleLinear()
    .domain([MIN_Y, MAX_Y]) // Original y range
    .range([height, 0]); // Invert y scale to make top of canvas 0

  const widthScale = d3
    .scaleLinear()
    .domain([0, MAX_X - MIN_X]) // Original x range
    .range([0, width]); // Canvas width range

  const heightScale = d3
    .scaleLinear()
    .domain([0, MAX_Y - MIN_Y]) // Original y range
    .range([0, height]); // Invert y scale to make top of canvas 0

  /** Add some court lines into the SVG */
  const injectCourtLines = (
    svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
    phase: number,
  ) => {
    const courtXScale = d3 //(hacky - i used the wrong x when building the court lines so adjust back here)
      .scaleLinear()
      .domain([MIN_X, MAX_X]) // Original x range
      .range([0, width]); // Canvas width range

    const D = {
      //(these x and y are flipped relative to the output svg)
      half_court_x_px: 470.0,
      ft_per_px_x: 94.0 / 940.0,
      ft_per_px_y: 50.0 / 500.0,
      goal_left_x_px: 50.0,
      goal_y_px: 250.0,
    };
    const middleOfCourt = 250;
    const hoopDistFromBack = 50;
    // Transform function - includes flipping x and y
    const transformCoords = (x_flip: number, y_flip: number) => ({
      x: (D.goal_y_px - y_flip) * D.ft_per_px_y,
      y: (x_flip - D.goal_left_x_px) * D.ft_per_px_x,
    });
    if (phase == 0) {
      const halfPaintWidth = 60;
      const topOfPaint = 190;
      // Add paint:
      const rectCoords = transformCoords(
        topOfPaint,
        middleOfCourt + halfPaintWidth,
      );
      svg
        .append("rect")
        .attr("x", courtXScale(rectCoords.x))
        .attr("y", yScale(rectCoords.y))
        .attr("width", widthScale(2 * halfPaintWidth * D.ft_per_px_y))
        .attr("height", heightScale(topOfPaint * D.ft_per_px_x))
        .style("stroke", courtStrokeColor)
        .style("stroke-width", "1px")
        .style("fill", "none");

      // Add free throw arc
      const ftArcCoords = transformCoords(topOfPaint, middleOfCourt);
      const arcPath = d3.arc()({
        innerRadius: widthScale(halfPaintWidth * D.ft_per_px_y),
        outerRadius: widthScale(halfPaintWidth * D.ft_per_px_y),
        startAngle: -Math.PI / 2,
        endAngle: Math.PI / 2,
      });
      svg
        .append("path")
        .attr("d", arcPath)
        .attr(
          "transform",
          `translate(${courtXScale(ftArcCoords.x)}, ${yScale(ftArcCoords.y)})`,
        )
        .style("stroke", courtStrokeColor)
        .style("stroke-width", "1px")
        .style("fill", "none");

      const straightBitOf3ptHeight = 94.5 * D.ft_per_px_x;

      const left3PtLine = 455;
      const right3PtLine = 45;
      const threePtWidth = (left3PtLine - right3PtLine) * D.ft_per_px_y;

      // Add left 3pt line
      const left3ptCoords = transformCoords(0, left3PtLine);
      svg
        .append("line")
        .attr("x1", courtXScale(left3ptCoords.x))
        .attr("y1", yScale(left3ptCoords.y))
        .attr("x2", courtXScale(left3ptCoords.x))
        .attr(
          "y2",
          yScale(left3ptCoords.y) - heightScale(straightBitOf3ptHeight),
        )
        .style("stroke", courtStrokeColor)
        .style("stroke-width", "1px")
        .style("fill", "none");

      // Add right 3pt line
      const right3ptCoords = transformCoords(0, right3PtLine);
      svg
        .append("line")
        .attr("x1", courtXScale(right3ptCoords.x))
        .attr("y1", yScale(right3ptCoords.y))
        .attr("x2", courtXScale(right3ptCoords.x))
        .attr(
          "y2",
          yScale(right3ptCoords.y) - heightScale(straightBitOf3ptHeight),
        )
        .style("stroke", courtStrokeColor)
        .style("stroke-width", "1px")
        .style("fill", "none");

      // Add 3pt arc
      const threePtArcCoords = transformCoords(hoopDistFromBack, middleOfCourt);
      const threePtArcRadius = 210 * D.ft_per_px_x;
      const deltaAngle = Math.acos((0.5 * threePtWidth) / threePtArcRadius);
      const arcPath3pt = d3.arc()({
        innerRadius: widthScale(threePtArcRadius),
        outerRadius: widthScale(threePtArcRadius),
        startAngle: -0.5 * Math.PI + deltaAngle,
        endAngle: 0.5 * Math.PI - deltaAngle,
      });

      svg
        .append("path")
        .attr("d", arcPath3pt)
        .attr(
          "transform",
          `translate(${courtXScale(threePtArcCoords.x)}, ${yScale(
            threePtArcCoords.y,
          )})`,
        )
        .style("stroke", courtStrokeColor)
        .style("stroke-width", "1px")
        .style("fill", "none");
    }
    if (phase == 1) {
      const goalCoords = transformCoords(hoopDistFromBack, middleOfCourt);
      svg
        .append("circle")
        .attr("cx", courtXScale(goalCoords.x))
        .attr("cy", yScale(goalCoords.y))
        .attr("r", widthScale(9 * D.ft_per_px_x))
        .style("stroke", courtStrokeColor)
        .style("stroke-width", "1px")
        .style("fill", "none");
    }
  };

  const injectZoneAreas = (
    phase: number,
    svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
    zones: HexZone[],
    d1Zones: HexZone[],
    splitZones?: HexZone[],
  ) => {
    const numZones = d1Zones.length;
    const useRegionFill = !!(
      regionZones &&
      zoneToRegion &&
      zoneToRegion.length >= numZones &&
      d1RegionZones
    );
    const cbbEfficiencyScale = isDef
      ? CbbColors.diff_def_eFgShotChart
      : CbbColors.diff_eFgShotChart;

    (zones || []).forEach((__, zoneIndex) => {
      // Go backwards because that means we draw the 3P zones after the mid range ones
      // and the overlap looks right
      const zoneIdx = numZones - zoneIndex - 1;
      const zone = zones[zoneIdx]!;
      const d1Zone = d1Zones?.[zoneIdx] || zone;
      const splitZone = splitZones ? splitZones[zoneIdx] : undefined;

      const minAngle = zone.minAngle == 0 ? -90 : zone.minAngle;
      const maxAngle = zone.maxAngle == 180 ? 270 : zone.maxAngle;

      let fillColor: string;
      if (useRegionFill && regionZones && zoneToRegion && d1RegionZones) {
        const r = zoneToRegion[zoneIdx] ?? 0;
        const regionZone = regionZones[r];
        const d1RegionZone = d1RegionZones[r];
        const splitRegionZones =
          splitZones && regionZones
            ? ShotChartUtils.zonesToRegions(splitZones).regionZones
            : undefined;
        const splitRegionZone = splitRegionZones?.[r];

        if (showFreqAsNumber && d1RegionZone) {
          const ppp = regionZone.intensity / (regionZone.frequency || 1);
          const compPpp = splitRegionZone
            ? splitRegionZone.intensity / (splitRegionZone.frequency || 1)
            : d1RegionZone.intensity;
          fillColor = cbbEfficiencyScale((ppp - compPpp) * 0.5);
        } else {
          const freqDelt = splitRegionZone
            ? regionZone.frequency / (regionZone.total_freq || 1) -
              splitRegionZone.frequency / (splitRegionZone.total_freq || 1)
            : d1RegionZone
              ? regionZone.frequency / (regionZone.total_freq || 1) -
                d1RegionZone.frequency
              : 0;
          fillColor = CbbColors.diff10_blueOrange_offDef(freqDelt);
        }
      } else {
        // Zones mode: FG = bg by freq, Freq = bg by efficiency (same as regions)
        const freqDelt = splitZone
          ? zone.frequency / (zone.total_freq || 1) -
            splitZone.frequency / (splitZone.total_freq || 1)
          : d1Zone
            ? zone.frequency / (zone.total_freq || 1) - d1Zone.frequency
            : 0;
        if (showFreqAsNumber && (d1Zone || splitZone)) {
          const ppp = zone.intensity / (zone.frequency || 1);
          const compPpp = splitZone
            ? splitZone.intensity / (splitZone.frequency || 1)
            : d1Zone
              ? d1Zone.intensity
              : ppp;
          fillColor = cbbEfficiencyScale((ppp - compPpp) * 0.5);
        } else {
          fillColor = CbbColors.diff10_blueOrange_offDef(freqDelt);
        }
      }

      const innerRadius = widthScale(zone.minDist);
      const outerRadius = widthScale(Math.min(40, zone.maxDist));
      const startAngle = -(minAngle * Math.PI) / 180 + Math.PI / 2;
      const endAngle = -(maxAngle * Math.PI) / 180 + Math.PI / 2;

      const arcPath3pt_Area = d3.arc()({
        innerRadius,
        outerRadius: outerRadius * 0.9999, //(bizarrely without this some of the arc at the top is not filled!)
        startAngle,
        endAngle,
      });

      svg
        .append("path")
        .attr("d", arcPath3pt_Area)
        .attr("transform", `translate(${xScale(0)}, ${yScale(0)})`)
        .style("opacity", 0.25)
        .style("fill", fillColor);

      if (zone.maxDist > 20) {
        // Only lines
        const startInner = [
          zone.minDist * Math.cos((minAngle * Math.PI) / 180),
          zone.minDist * Math.sin((minAngle * Math.PI) / 180),
        ];
        const startOuter = [
          zone.maxDist * Math.cos((minAngle * Math.PI) / 180),
          zone.maxDist * Math.sin((minAngle * Math.PI) / 180),
        ];
        const endInner = [
          zone.minDist * Math.cos((maxAngle * Math.PI) / 180),
          zone.minDist * Math.sin((maxAngle * Math.PI) / 180),
        ];
        const endOuter = [
          zone.maxDist * Math.cos((maxAngle * Math.PI) / 180),
          zone.maxDist * Math.sin((maxAngle * Math.PI) / 180),
        ];

        svg
          .append("line")
          .attr("x1", xScale(startInner[0]))
          .attr("y1", yScale(startInner[1]))
          .attr("x2", xScale(startOuter[0]))
          .attr("y2", yScale(startOuter[1]))
          .style("stroke", "grey")
          .style("stroke-width", "0.5px");

        svg
          .append("line")
          .attr("x1", xScale(endInner[0]))
          .attr("y1", yScale(endInner[1]))
          .attr("x2", xScale(endOuter[0]))
          .attr("y2", yScale(endOuter[1]))
          .style("stroke", "grey")
          .style("stroke-width", "0.5px");
      }
      if (zone.minDist < 20) {
        const arcPath3pt_Lines = d3.arc()({
          innerRadius,
          outerRadius: zone.maxDist > 20 ? innerRadius : outerRadius,
          startAngle,
          endAngle,
        });

        svg
          .append("path")
          .attr("d", arcPath3pt_Lines)
          .attr("transform", `translate(${xScale(0)}, ${yScale(0)})`)
          .style("stroke", "grey")
          .style("stroke-width", "0.5px")
          .style("fill", "none");
      }
    });
  };

  const injectZoneInfo = (
    phase: number,
    svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
    zones: HexZone[],
    d1Zones: HexZone[],
    tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>,
    splitZones?: HexZone[],
  ) => {
    const cbbColorScale = isDef
      ? CbbColors.diff_def_eFgShotChart
      : CbbColors.diff_eFgShotChart;
    const useRegionCircles = !!(
      regionZones &&
      d1RegionZones &&
      zoneToRegion &&
      firstZoneIndexPerRegion &&
      firstZoneIndexPerRegion.length > 0
    );
    const splitRegionZones =
      splitZones && useRegionCircles
        ? ShotChartUtils.zonesToRegions(splitZones).regionZones
        : undefined;

    (zones || []).forEach((zone, zoneIndex) => {
      const showCircle = useRegionCircles
        ? _.includes(firstZoneIndexPerRegion!, zoneIndex)
        : true;
      if (!showCircle) return;

      const zoneCenter = (z: HexZone) => {
        const d = _.isNil(z.distCenter)
          ? 0.5 * (z.minDist + z.maxDist)
          : z.distCenter;
        const a = (z.angleOffset * Math.PI) / 90;
        return {
          cx: xScale(0) + widthScale(d * Math.sin(a)),
          cy: yScale(0) + widthScale(d * Math.cos(a)),
        };
      };

      const d1Zone = d1Zones?.[zoneIndex];
      const splitZone = splitZones ? splitZones[zoneIndex] : undefined;

      const r = useRegionCircles ? (zoneToRegion?.[zoneIndex] ?? 0) : 0;
      const regionZone = useRegionCircles ? regionZones?.[r] : undefined;
      const d1RegionZone = useRegionCircles ? d1RegionZones?.[r] : undefined;
      const splitRegionZone = splitRegionZones?.[r];

      const zoneForStats = regionZone ?? zone;
      const d1ForStats = d1RegionZone ?? d1Zone;
      const splitForStats = splitRegionZone ?? splitZone;

      // In regions mode, key circle (zone 2) is placed in the key (8 ft, straight up) so it stays in the key region and does not overlap at-rim
      const keyCircleDist = 7.5;
      const keyCircleAngle = (90 * Math.PI) / 90;
      const { cx, cy } =
        useRegionCircles && zoneIndex === 2
          ? {
              cx:
                xScale(0) +
                widthScale(keyCircleDist * Math.sin(keyCircleAngle)),
              cy:
                yScale(0) +
                widthScale(keyCircleDist * Math.cos(keyCircleAngle)),
            }
          : zoneCenter(zone);

      const ppp = zoneForStats.intensity / (zoneForStats.frequency || 1);
      const compPpp = splitForStats
        ? splitForStats.intensity / (splitForStats.frequency || 1)
        : d1ForStats
          ? d1ForStats.intensity
          : ppp;

      // Always calculate eFG for colors (to keep colors consistent)
      const efgPct = ppp * 50;
      const compEfgPct = compPpp * 50;

      // Calculate FG% based on zone distance (use zone geometry for 2pt vs 3pt)
      const isThreePointZone = zone.minDist >= 21;
      const pointValue = isThreePointZone ? 3 : 2;
      const fgPct = Math.min(100, (ppp / pointValue) * 100);
      const compFgPct = Math.min(100, (compPpp / pointValue) * 100);

      // Create display text based on useEfg / showFreqAsNumber
      const displayPct = useEfg ? efgPct : fgPct;
      const compDisplayPct = useEfg ? compEfgPct : compFgPct;

      const freqPct =
        100 * (zoneForStats.frequency / (zoneForStats.total_freq || 1));

      const maybeSplitText = splitForStats
        ? showFreqAsNumber
          ? `${(freqPct - 100 * (splitForStats.frequency / (splitForStats.total_freq || 1))).toFixed(0)}%`
          : `${displayPct > compDisplayPct ? "+" : ""}${(displayPct - compDisplayPct).toFixed(0)}%`
        : undefined;

      const displayText = showFreqAsNumber
        ? (maybeSplitText ?? `${freqPct.toFixed(0)}%`)
        : (maybeSplitText ?? `${displayPct.toFixed(0)}%`);

      const freqDeltForCircle = splitForStats
        ? zoneForStats.frequency / (zoneForStats.total_freq || 1) -
          splitForStats.frequency / (splitForStats.total_freq || 1)
        : d1ForStats
          ? zoneForStats.frequency / (zoneForStats.total_freq || 1) -
            d1ForStats.frequency
          : 0;
      const circleFill =
        showFreqAsNumber && (d1ForStats || splitForStats)
          ? CbbColors.diff10_blueOrange_offDef(freqDeltForCircle)
          : (d1ForStats || splitForStats) &&
              zoneForStats.frequency > 0 &&
              (!splitForStats || splitForStats.frequency > 0)
            ? cbbColorScale((ppp - compPpp) * 0.5)
            : "none";

      const toolTipTextBuilder = (zoneToUse: HexZone, isRegion: boolean) => {
        const shotsPercentage = (
          100 *
          (zoneToUse.frequency / (zoneToUse.total_freq || 1))
        ).toFixed(1);
        const pointsPerShot = zoneToUse.intensity / (zoneToUse.frequency || 1);
        const efgPctStr = (50 * pointsPerShot).toFixed(1);
        const fgPctStr = Math.min(
          100,
          (pointsPerShot / pointValue) * 100,
        ).toFixed(1);
        if (showFreqAsNumber) {
          const primary = useEfg
            ? `eFG=[${efgPctStr}]% (FG=[${fgPctStr}]%)`
            : `FG=[${fgPctStr}]% (eFG=[${efgPctStr}]%)`;
          return `[${zoneToUse.frequency}] shots, [${shotsPercentage}]% of total, ${primary}`;
        }
        if (useEfg) {
          return `[${zoneToUse.frequency}] shots, [${shotsPercentage}]% of total, [${zoneToUse.intensity}]pts, eFG=[${efgPctStr}]%`;
        } else {
          return `[${zoneToUse.frequency}] shots, [${shotsPercentage}]% of total, [${zoneToUse.intensity}]pts, FG=[${fgPctStr}]%`;
        }
      };
      const tooltipHandler = () => {
        const zoneTooltip = toolTipTextBuilder(zoneForStats, !!regionZone);
        const splitZoneTooltip = splitForStats
          ? `SPLITS: ${toolTipTextBuilder(splitForStats, !!splitRegionZone)}`
          : undefined;

        const d1Tooltip = d1ForStats
          ? `D1 averages: [${(d1ForStats.frequency * 100).toFixed(1)}]% of shots, ` +
            (useEfg
              ? `eFG=[${(d1ForStats.intensity * 50).toFixed(1)}]%`
              : `FG=[${Math.min(100, (d1ForStats.intensity / pointValue) * 100).toFixed(1)}]%`)
          : "(D1 averages no available)";

        tooltip
          .style("opacity", 1)
          .html(
            `<span>${zoneTooltip}${
              splitZoneTooltip ? `<br/>${splitZoneTooltip}` : ""
            }<br/><br/>${d1Tooltip}</span>`,
          );
      };

      svg
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 20)
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("fill", circleFill)
        .style("opacity", phase == 0 ? 0.8 : 0.5)
        .on("mouseover", () => {
          tooltipHandler();
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });

      svg
        .append("text")
        .attr("x", cx)
        .attr("y", cy)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "black")
        .text(
          zoneForStats.frequency > 0 &&
            (!splitForStats || splitForStats.frequency > 0)
            ? displayText
            : "-",
        )
        .on("mouseover", () => {
          tooltipHandler();
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });
    });
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // 500 pixels is approx 50 ft
    // at precision 15, hexagon is 0.9ft2

    const hexRadius = 15 * (height / 520); //(precision 14 empirically seems like radius is about 1.5)

    const maxFreq = 5.0; //(precision 14)

    //https://h3geo.org/docs/core-library/restable/

    // Define a scale for frequency -> hex size
    const sizeScale = d3.scaleSqrt().domain([0, maxFreq]).range([0.1, 1]); // Scale hex size from 10% to 100%

    const opacityScale = d3
      .scaleLinear()
      .domain([0, maxFreq])
      .range(buildZones ? [0.1, 0.2] : [0.5, 1]); // Scale opactiy from 50% to 100%

    // Define a color scale for intensity
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues) // Adjust color scheme as needed
      .domain([0, 1]);
    const cbbColorScale = diffDataSet
      ? isDef
        ? CbbColors.diff_def_eFgShotChart
        : CbbColors.diff_eFgShotChart
      : isDef
        ? CbbColors.def_eFgShotChart
        : CbbColors.off_eFgShotChart;

    // Set up the hexbin generator
    const hexbinGenerator = hexbin<number[]>()
      .radius(hexRadius)
      .extent([
        [0, 0],
        [width, height],
      ]);
    const points = data.map((d) => [xScale(d.y), yScale(d.x)]); // Flip x and y to match court orientation
    const dataMap = new Map(points.map((point, index) => [point, data[index]]));

    // Convert (x, y) positions to hexbin layout
    const hexes = hexbinGenerator(points);

    // Clear any previous hexes
    svg.selectAll("*").remove();

    // Create a tooltip div (invisible by default)
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("padding", "5px")
      .style("background", "#333")
      .style("color", "#fff")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0); // initially hidden

    svg
      .append("g")
      .selectAll("path")
      .data(hexes)
      .enter()
      .append("path")
      .attr("d", (d) => {
        return hexbinGenerator.hexagon(hexRadius);
      })
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .attr("fill", (d) => {
        return backgroundColor;
      })
      .attr("stroke", clusterStrokeColor)
      .attr("stroke-width", 0.5);

    injectCourtLines(svg, 0);
    if (buildZones) {
      injectZoneAreas(0, svg, zones || [], d1Zones || [], splitZones);
    }

    svg
      .append("g")
      .selectAll("path")
      .data(hexes)
      .enter()
      .append("path")
      .attr("d", (d) => {
        const hexData = dataMap.get(d[0]); // Get the original HexData for this point
        const hexFrequency = hexData ? hexData.frequency : 0;
        const hexPct = Math.min(sizeScale(hexFrequency), 1.0);
        const hexSize = hexRadius * hexPct;
        return hexbinGenerator.hexagon(hexSize);
      })
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .attr("fill", (d) => {
        const hexData = dataMap.get(d[0]);
        return hexData ? cbbColorScale(hexData.intensity * 0.5) : "#ccc";
      })
      .attr("opacity", (d) => {
        const hexData = dataMap.get(d[0]);
        const splitFactor = splitZones ? 0.5 : 1.0; //(just a visual indication of the diff)
        return hexData ? splitFactor * opacityScale(hexData.frequency) : 1;
      })
      .on("mouseover", (event, d) => {
        const hexData = dataMap.get(d[0]);
        if (hexData) {
          const d1Avg = diffDataSet?.[hexData.key];
          const d1AvgStr = d1Avg
            ? `D1 averages: [${(100 * d1Avg.avg_freq).toFixed(
                1,
              )}]% of shots, eFG=[${(50 * d1Avg.avg_ppp).toFixed(1)}]%`
            : "(D1 averages not available)";
          tooltip
            .style("opacity", 1)
            .html(`<span>${hexData.tooltip}<br/><br/>${d1AvgStr}</span>`);
        }
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0); // Hide tooltip on mouseout
      });

    svg
      .append("g")
      .selectAll("path")
      .data(hexes)
      .enter()
      .append("path")
      .attr("d", (d) => {
        const hexData = dataMap.get(d[0]); // Get the original HexData for this point
        const hexFrequency = hexData ? hexData.frequency : 0;
        const hexPct = Math.min(sizeScale(hexFrequency), 1.0);
        const hexSize = hexRadius * hexPct;
        return hexbinGenerator.hexagon(hexSize);
      })
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", splitZones ? 0.25 : 0.5);

    injectCourtLines(svg, 1);

    if (buildZones) {
      injectZoneInfo(0, svg, zones || [], d1Zones || [], tooltip, splitZones);
    }

    return () => {
      tooltip.remove(); // Clean up tooltip on unmount
    };
  }, [
    data,
    resolvedTheme,
    zones,
    splitZones,
    d1Zones,
    buildZones,
    regionZones,
    d1RegionZones,
    zoneToRegion,
    firstZoneIndexPerRegion,
    showFreqAsNumber,
    useEfg,
  ]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default HexMap;
