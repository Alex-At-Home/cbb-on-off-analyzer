// React imports:
import React, { useState, useEffect } from "react";

import _ from "lodash";

// Utils
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { ShotChartAvgs_Men_2024 } from "../../utils/internal-data/ShotChartAvgs_Men_2024";
import { ShotChartAvgs_Women_2024 } from "../../utils/internal-data/ShotChartAvgs_Women_2024";
import { ShotChartZones_Men_2024 } from "../../utils/internal-data/ShotChartZones_Men_2024";
import { ShotChartZones_Women_2024 } from "../../utils/internal-data/ShotChartZones_Women_2024";

const HEX_HEIGHT = 400;
const HEX_WIDTH = 520;

import { CompressedHexZone } from "../../utils/StatModels";
import HexMap from "../shared/HexMap";
import { ShotChartUtils } from "../../utils/stats/ShotChartUtils";
import ToggleButtonGroup from "../shared/ToggleButtonGroup";
import { UserChartOpts, ShotChartViewMode } from "./ShotChartDiagView";
import { useTheme } from "next-themes";

///////////////////// UI element + control

type Props = {
  title?: string;
  gender: "Men" | "Women";
  off: CompressedHexZone;
  onChangeChartOpts?: (opts: UserChartOpts) => void;
  chartOpts?: UserChartOpts;
};

const ShotZoneChartDiagView: React.FunctionComponent<Props> = ({
  title,
  gender,
  off,
  onChangeChartOpts,
  chartOpts,
}) => {
  const [viewMode, setViewMode] = useState<ShotChartViewMode>(
    chartOpts?.viewMode ?? "zones",
  );
  const [useEfg, setUseEfg] = useState<boolean>(chartOpts?.useEfg ?? false);
  const [showFreqAsNumber, setShowFreqAsNumber] = useState<boolean>(
    chartOpts?.showFreqAsNumber ?? false,
  );
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (chartOpts) {
      setViewMode(chartOpts?.viewMode ?? "zones");
      setUseEfg(chartOpts?.useEfg ?? false);
      setShowFreqAsNumber(chartOpts?.showFreqAsNumber ?? false);
    }
  }, [chartOpts]);
  const diffDataSet =
    gender == "Men" ? ShotChartAvgs_Men_2024 : ShotChartAvgs_Women_2024;

  const d1Zones =
    gender == "Men" ? ShotChartZones_Men_2024 : ShotChartZones_Women_2024;

  const offZones = ShotChartUtils.decompressHexZones(off);
  const offRegionData =
    viewMode === "regions"
      ? ShotChartUtils.zonesToRegions(offZones, d1Zones)
      : null;

  return (
    <Container>
      <Row>
        <Col xs={12} className="text-center" style={{ minWidth: HEX_WIDTH }}>
          <Container>
            <Row>
              <Col xs={12} className="text-center">
                <b>Player Shot Zones:</b>
              </Col>
            </Row>
            <Row>
              <Col xs={12} style={{ position: "relative" }}>
                <HexMap
                  data={[]}
                  zones={offZones}
                  d1Zones={d1Zones}
                  isDef={false}
                  diffDataSet={diffDataSet}
                  width={HEX_WIDTH}
                  height={HEX_HEIGHT}
                  buildZones={true}
                  useEfg={useEfg}
                  regionZones={
                    viewMode === "regions"
                      ? offRegionData?.regionZones
                      : undefined
                  }
                  d1RegionZones={
                    viewMode === "regions"
                      ? offRegionData?.d1RegionZones
                      : undefined
                  }
                  zoneToRegion={
                    viewMode === "regions"
                      ? offRegionData?.zoneToRegion
                      : undefined
                  }
                  firstZoneIndexPerRegion={
                    viewMode === "regions"
                      ? offRegionData?.firstZoneIndexPerRegion
                      : undefined
                  }
                  showFreqAsNumber={showFreqAsNumber}
                />
                {onChangeChartOpts ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 1000,
                      backgroundColor:
                        resolvedTheme === "dark"
                          ? "rgba(39, 43, 48, 0.25)"
                          : "rgba(255, 255, 255, 0.25)",
                      borderRadius: "4px",
                      padding: "4px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    <ToggleButtonGroup
                      items={[
                        {
                          items: [
                            {
                              label: "Regions",
                              tooltip: "Regions: Show large court regions",
                              toggled: viewMode === "regions",
                              onClick: () => {
                                onChangeChartOpts?.({
                                  viewMode: "regions",
                                  useEfg: useEfg,
                                  showFreqAsNumber: showFreqAsNumber,
                                });
                                setViewMode("regions");
                              },
                            },
                            {
                              label: "Zones",
                              tooltip: "Zones: Show court zones",
                              toggled: viewMode === "zones",
                              onClick: () => {
                                onChangeChartOpts?.({
                                  viewMode: "zones",
                                  useEfg: useEfg,
                                  showFreqAsNumber: showFreqAsNumber,
                                });
                                setViewMode("zones");
                              },
                            },
                          ],
                        },
                        {
                          label: " | ",
                          isLabelOnly: true,
                          toggled: false,
                          onClick: () => null,
                        },
                        {
                          items: [
                            {
                              label: "FG%",
                              tooltip: "Show regular field goal percentage",
                              toggled: !useEfg,
                              onClick: () => {
                                onChangeChartOpts?.({
                                  viewMode: viewMode,
                                  useEfg: false,
                                  showFreqAsNumber: showFreqAsNumber,
                                });
                                setUseEfg(false);
                              },
                            },
                            {
                              label: "eFG%",
                              tooltip:
                                "Show effective field goal percentage (3-pointers weighted 1.5x)",
                              toggled: useEfg,
                              onClick: () => {
                                onChangeChartOpts?.({
                                  viewMode: viewMode,
                                  useEfg: true,
                                  showFreqAsNumber: showFreqAsNumber,
                                });
                                setUseEfg(true);
                              },
                            },
                          ],
                        },
                        {
                          label: " | ",
                          isLabelOnly: true,
                          toggled: false,
                          onClick: () => null,
                        },
                        {
                          items: [
                            {
                              label: "FG",
                              tooltip:
                                "FG: Background = frequency, circle = efficiency, number = FG%/eFG%",
                              toggled: !showFreqAsNumber,
                              onClick: () => {
                                onChangeChartOpts?.({
                                  viewMode: viewMode,
                                  useEfg: useEfg,
                                  showFreqAsNumber: false,
                                });
                                setShowFreqAsNumber(false);
                              },
                            },
                            {
                              label: "Freq",
                              tooltip:
                                "Freq: Background = efficiency, circle = frequency, number = frequency %",
                              toggled: showFreqAsNumber,
                              onClick: () => {
                                onChangeChartOpts?.({
                                  viewMode: viewMode,
                                  useEfg: useEfg,
                                  showFreqAsNumber: true,
                                });
                                setShowFreqAsNumber(true);
                              },
                            },
                          ],
                        },
                      ]}
                    />
                  </div>
                ) : undefined}
              </Col>
            </Row>
          </Container>
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="small text-center pt-1">
          <p>
            {showFreqAsNumber ? (
              <>
                Background color is efficiency relative to D1 average in that{" "}
                {viewMode === "regions" ? "region" : "zone"}. The circle color
                is shot frequency relative to D1. The number in the circle is
                frequency %.
              </>
            ) : (
              <>
                Each circle shows the {useEfg ? "eFG%" : "FG%"}
                {useEfg ? " (FG% where 3pt shots count more)" : ""}, colored by
                their efficiency relative to D1 average in that{" "}
                {viewMode === "regions" ? "region" : "zone"}. The color of the{" "}
                {viewMode === "regions" ? "region" : "zone"} is the shot
                frequency relative to the D1 average.
              </>
            )}
          </p>
        </Col>
      </Row>
    </Container>
  );
};
export default ShotZoneChartDiagView;
