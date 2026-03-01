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

import QuickSwitchBar, {
  quickSwitchDelim,
  QuickSwitchMode,
  QuickSwitchSource,
} from "../shared/QuickSwitchBar";

const HEX_HEIGHT = 400;
const HEX_WIDTH = 520;

import { ShotStats } from "../../utils/StatModels";
import ToggleButtonGroup from "../shared/ToggleButtonGroup";
import HexMap from "../shared/HexMap";
import { ParamDefaults } from "../../utils/FilterModels";
import { ShotChartUtils } from "../../utils/stats/ShotChartUtils";
import { useTheme } from "next-themes";

///////////////////// UI element + control

export type ShotChartViewMode = "regions" | "zones" | "clusters";

export type UserChartOpts = {
  buildZones?: boolean;
  viewMode?: ShotChartViewMode;
  quickSwitch?: string;
  useEfg?: boolean;
  showFreqAsNumber?: boolean;
};

type Props = {
  title?: string;
  gender: "Men" | "Women";
  off: ShotStats;
  def: ShotStats;
  quickSwitchOptions?: Props[];
  onChangeChartOpts?: (opts: UserChartOpts) => void; //(needs to be optional for quick switch options)
  chartOpts?: UserChartOpts;
  labelOverrides?: [string, string];
  offDefOverrides?: [boolean, boolean];
  invertLeftRight?: boolean;
  dynamicQuickSwitch?: boolean; //(only use if there's just one play style chart visible)
  quickSwitchModesOverride?: QuickSwitchMode[];
  quickSwitchAtBottom?: boolean;
};

const ShotChartDiagView: React.FunctionComponent<Props> = ({
  title,
  gender,
  off,
  def,
  quickSwitchOptions,
  chartOpts,
  onChangeChartOpts,
  labelOverrides,
  offDefOverrides,
  invertLeftRight,
  dynamicQuickSwitch,
  quickSwitchModesOverride,
  quickSwitchAtBottom,
}) => {
  const { resolvedTheme } = useTheme();
  const [quickSwitch, setQuickSwitch] = useState<string | undefined>(
    chartOpts?.quickSwitch,
  );
  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);

  const viewModeFromOpts = (): ShotChartViewMode => {
    if (chartOpts?.viewMode) return chartOpts.viewMode;
    if (!chartOpts || _.isNil(chartOpts?.buildZones))
      return ParamDefaults.defaultShotChartShowZones ? "zones" : "clusters";
    return chartOpts.buildZones ? "zones" : "clusters";
  };
  const [viewMode, setViewMode] =
    useState<ShotChartViewMode>(viewModeFromOpts());
  const buildZones = viewMode !== "clusters";
  const [useEfg, setUseEfg] = useState<boolean>(chartOpts?.useEfg ?? false);
  const [showFreqAsNumber, setShowFreqAsNumber] = useState<boolean>(
    chartOpts?.showFreqAsNumber ?? false,
  );

  useEffect(() => {
    if (chartOpts) {
      const nextViewMode = chartOpts.viewMode
        ? chartOpts.viewMode
        : _.isNil(chartOpts.buildZones)
          ? ParamDefaults.defaultShotChartShowZones
            ? "zones"
            : "clusters"
          : chartOpts.buildZones
            ? "zones"
            : "clusters";
      setViewMode(nextViewMode);
      setUseEfg(chartOpts?.useEfg ?? false);
      setShowFreqAsNumber(chartOpts?.showFreqAsNumber ?? false);
    }
    if (dynamicQuickSwitch) {
      setQuickSwitch(chartOpts?.quickSwitch);
    }
  }, [chartOpts]);

  const diffDataSet =
    gender == "Men" ? ShotChartAvgs_Men_2024 : ShotChartAvgs_Women_2024;

  const d1Zones =
    gender == "Men" ? ShotChartZones_Men_2024 : ShotChartZones_Women_2024;

  //ENABLE TO RE-CALCULATE
  //   ShotChartUtils.buildAverageZones(diffDataSet || {}, "Men");
  //   ShotChartUtils.buildAverageZones(diffDataSet || {}, "Women");

  const quickSwitchBase = quickSwitch
    ? quickSwitch.split(quickSwitchDelim)[0]
    : undefined;
  const quickSwitchExtra: "extra" | "diff" | undefined = (
    quickSwitch ? quickSwitch.split(quickSwitchDelim)[1] : undefined
  ) as "extra" | "diff" | undefined;

  const hasDefensiveData = (def?.doc_count || 0) > 0;

  const {
    selectedOff,
    selectedDef,
    extraRowOff,
    extraRowDef,
    extraRowLabelOverrides,
    extraRowOffDefOverrides,
    selOffDefOverrides,
    selLabelOverrides,
  } = _.thru(quickSwitchExtra, (__) => {
    if (quickSwitchExtra == "extra" && hasDefensiveData) {
      const selOffDefOverrides = (quickSwitch
        ? _.find(
            quickSwitchOptions || [],
            (opt) => opt.title == quickSwitchBase,
          )?.offDefOverrides
        : offDefOverrides) ||
        offDefOverrides || [false, true];

      const selLabelOverrides =
        (quickSwitch
          ? _.find(
              quickSwitchOptions || [],
              (opt) => opt.title == quickSwitchBase,
            )?.labelOverrides
          : labelOverrides) ||
        labelOverrides ||
        [];

      return {
        selectedOff: off,
        selectedDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.off
            : off) || off,
        extraRowOff: def,
        extraRowDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.def
            : def) || def,
        selLabelOverrides: [
          labelOverrides?.[0] || "Offense:",
          `Compare vs: [${(
            selLabelOverrides?.[0] ||
            quickSwitchBase ||
            ""
          ).replace(":", "")}]`,
        ],
        extraRowLabelOverrides: [
          labelOverrides?.[1] || "Defense:",
          `Compare vs: [${(
            selLabelOverrides?.[1] ||
            quickSwitchBase ||
            ""
          ).replace(":", "")}]`,
        ],
        selOffDefOverrides: [selOffDefOverrides[0], selOffDefOverrides[0]],
        extraRowOffDefOverrides: [selOffDefOverrides[1], selOffDefOverrides[1]],
      };
    } else if (quickSwitchExtra == "extra") {
      return {
        selectedOff: off,
        selectedDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.off
            : off) || off,

        selOffDefOverrides: [false, false],
        selLabelOverrides: [
          labelOverrides?.[0] || "Offense:",
          `Compare vs: [${quickSwitchBase}]`,
        ],
      };
    } else if (quickSwitchExtra == "diff") {
      return {
        selectedOff: off,
        selectedDef: def,
        extraRowOff:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.off
            : off) || off,
        extraRowDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.def
            : def) || def,
        selOffDefOverrides: offDefOverrides,
        selLabelOverrides: (labelOverrides || ["Offense:", "Defense:"]).map(
          (l) => `(Delta: [${quickSwitchBase}]) ${l}`,
        ),
      };
    } else {
      return {
        selectedOff:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.off
            : off) || off,
        selectedDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.def
            : def) || def,
        selOffDefOverrides:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.offDefOverrides
            : offDefOverrides) || offDefOverrides,
        selLabelOverrides:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase,
              )?.labelOverrides
            : labelOverrides) || labelOverrides,
      };
    }
  });

  const {
    data: offData,
    zones: offZones,
    splitZones: splitOffZones,
  } = ShotChartUtils.shotStatsToHexData(
    selectedOff,
    diffDataSet,
    quickSwitchExtra == "diff" ? extraRowOff : undefined,
  );
  const {
    data: defData,
    zones: defZones,
    splitZones: splitDefZones,
  } = ShotChartUtils.shotStatsToHexData(
    selectedDef,
    diffDataSet,
    quickSwitchExtra == "diff" ? extraRowDef : undefined,
  );
  const { data: extraRowOffData, zones: extraRowOffZones } = extraRowOff
    ? ShotChartUtils.shotStatsToHexData(extraRowOff, diffDataSet)
    : { data: [], zones: [] };
  const { data: extraRowDefData, zones: extraRowDefZones } = extraRowDef
    ? ShotChartUtils.shotStatsToHexData(extraRowDef, diffDataSet)
    : { data: [], zones: [] };

  const leftIndex = invertLeftRight ? 1 : 0;
  const rightIndex = invertLeftRight ? 0 : 1;

  const offRegionData =
    viewMode === "regions"
      ? ShotChartUtils.zonesToRegions(offZones, d1Zones)
      : null;
  const defRegionData =
    viewMode === "regions"
      ? ShotChartUtils.zonesToRegions(defZones, d1Zones)
      : null;
  const extraRowOffRegionData =
    viewMode === "regions" && extraRowOffZones.length > 0
      ? ShotChartUtils.zonesToRegions(extraRowOffZones, d1Zones)
      : null;
  const extraRowDefRegionData =
    viewMode === "regions" && extraRowDefZones.length > 0
      ? ShotChartUtils.zonesToRegions(extraRowDefZones, d1Zones)
      : null;

  const maybeQuickSwitchBar = title ? (
    <Row className="pt-2 pb-2">
      <Col xs={12}>
        <QuickSwitchBar
          title={title}
          titlePrefix="Shot Chart Analysis:"
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
                buildZones: buildZones,
                viewMode: viewMode,
                quickSwitch: newQuickSwitch,
                useEfg: useEfg,
                showFreqAsNumber: showFreqAsNumber,
              });
              setQuickSwitch(newQuickSwitch);
            }
          }}
          quickSwitchTimer={quickSwitchTimer}
          setQuickSwitchTimer={setQuickSwitchTimer}
          modes={
            quickSwitchModesOverride || ["link", "timer", "extra_right", "diff"]
          }
          theme={resolvedTheme}
        />
      </Col>
    </Row>
  ) : undefined;

  return off?.doc_count || def?.doc_count ? (
    <Container>
      {!quickSwitchAtBottom ? maybeQuickSwitchBar : undefined}
      <Row>
        <Col xs={6} className="text-center" style={{ minWidth: HEX_WIDTH }}>
          <Container>
            <Row>
              <Col xs={12} className="text-center">
                {selLabelOverrides ? (
                  <b>{selLabelOverrides[leftIndex]}</b>
                ) : (
                  <b>Offense:</b>
                )}
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <HexMap
                  data={invertLeftRight ? defData : offData}
                  zones={invertLeftRight ? defZones : offZones}
                  d1Zones={d1Zones}
                  splitZones={invertLeftRight ? splitDefZones : splitOffZones}
                  isDef={
                    selOffDefOverrides ? selOffDefOverrides[leftIndex] : false
                  }
                  diffDataSet={diffDataSet}
                  width={HEX_WIDTH}
                  height={HEX_HEIGHT}
                  buildZones={buildZones}
                  useEfg={useEfg}
                  regionZones={
                    viewMode === "regions"
                      ? (invertLeftRight ? defRegionData : offRegionData)
                          ?.regionZones
                      : undefined
                  }
                  d1RegionZones={
                    viewMode === "regions"
                      ? (invertLeftRight ? defRegionData : offRegionData)
                          ?.d1RegionZones
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
              </Col>
            </Row>
          </Container>
        </Col>
        <Col xs={6} className="text-center" style={{ minWidth: HEX_WIDTH }}>
          {defData.length > 0 ? (
            <Container>
              <Row>
                <Col xs={12} className="text-center">
                  {selLabelOverrides ? (
                    <b>{selLabelOverrides[rightIndex]}</b>
                  ) : (
                    <b>Defense:</b>
                  )}
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <HexMap
                    data={invertLeftRight ? offData : defData}
                    zones={invertLeftRight ? offZones : defZones}
                    d1Zones={d1Zones}
                    splitZones={invertLeftRight ? splitOffZones : splitDefZones}
                    isDef={
                      selOffDefOverrides
                        ? selOffDefOverrides[rightIndex]
                        : invertLeftRight != true
                    }
                    diffDataSet={diffDataSet}
                    width={HEX_WIDTH}
                    height={HEX_HEIGHT}
                    buildZones={buildZones}
                    useEfg={useEfg}
                    regionZones={
                      viewMode === "regions"
                        ? (invertLeftRight ? offRegionData : defRegionData)
                            ?.regionZones
                        : undefined
                    }
                    d1RegionZones={
                      viewMode === "regions"
                        ? (invertLeftRight ? offRegionData : defRegionData)
                            ?.d1RegionZones
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
                </Col>
              </Row>
            </Container>
          ) : null}
        </Col>
      </Row>
      {quickSwitchExtra != "diff" && extraRowOff ? (
        <Row className="pt-3">
          <Col xs={6} className="text-center" style={{ minWidth: HEX_WIDTH }}>
            <Container>
              <Row>
                <Col xs={12} className="text-center">
                  {extraRowLabelOverrides ? (
                    <b>{extraRowLabelOverrides[leftIndex]}</b>
                  ) : (
                    <b>Offense:</b>
                  )}
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <HexMap
                    data={invertLeftRight ? extraRowDefData : extraRowOffData}
                    zones={
                      invertLeftRight ? extraRowDefZones : extraRowOffZones
                    }
                    d1Zones={d1Zones}
                    isDef={
                      extraRowOffDefOverrides
                        ? extraRowOffDefOverrides[leftIndex]
                        : false
                    }
                    diffDataSet={diffDataSet}
                    width={HEX_WIDTH}
                    height={HEX_HEIGHT}
                    buildZones={buildZones}
                    useEfg={useEfg}
                    regionZones={
                      viewMode === "regions"
                        ? (invertLeftRight
                            ? extraRowDefRegionData
                            : extraRowOffRegionData
                          )?.regionZones
                        : undefined
                    }
                    d1RegionZones={
                      viewMode === "regions"
                        ? (invertLeftRight
                            ? extraRowDefRegionData
                            : extraRowOffRegionData
                          )?.d1RegionZones
                        : undefined
                    }
                    zoneToRegion={
                      viewMode === "regions"
                        ? extraRowOffRegionData?.zoneToRegion
                        : undefined
                    }
                    firstZoneIndexPerRegion={
                      viewMode === "regions"
                        ? extraRowOffRegionData?.firstZoneIndexPerRegion
                        : undefined
                    }
                    showFreqAsNumber={showFreqAsNumber}
                  />
                </Col>
              </Row>
            </Container>
          </Col>
          <Col xs={6} className="text-center" style={{ minWidth: HEX_WIDTH }}>
            {defData.length > 0 ? (
              <Container>
                <Row>
                  <Col xs={12} className="text-center">
                    {extraRowLabelOverrides ? (
                      <b>{extraRowLabelOverrides[rightIndex]}</b>
                    ) : (
                      <b>Defense:</b>
                    )}
                  </Col>
                </Row>
                <Row>
                  <Col xs={12}>
                    <HexMap
                      data={invertLeftRight ? extraRowOffData : extraRowDefData}
                      zones={
                        invertLeftRight ? extraRowOffZones : extraRowDefZones
                      }
                      d1Zones={d1Zones}
                      isDef={
                        extraRowOffDefOverrides
                          ? extraRowOffDefOverrides[rightIndex]
                          : invertLeftRight != true
                      }
                      diffDataSet={diffDataSet}
                      width={HEX_WIDTH}
                      height={HEX_HEIGHT}
                      buildZones={buildZones}
                      useEfg={useEfg}
                      regionZones={
                        viewMode === "regions"
                          ? (invertLeftRight
                              ? extraRowOffRegionData
                              : extraRowDefRegionData
                            )?.regionZones
                          : undefined
                      }
                      d1RegionZones={
                        viewMode === "regions"
                          ? (invertLeftRight
                              ? extraRowOffRegionData
                              : extraRowDefRegionData
                            )?.d1RegionZones
                          : undefined
                      }
                      zoneToRegion={
                        viewMode === "regions"
                          ? extraRowOffRegionData?.zoneToRegion
                          : undefined
                      }
                      firstZoneIndexPerRegion={
                        viewMode === "regions"
                          ? extraRowOffRegionData?.firstZoneIndexPerRegion
                          : undefined
                      }
                      showFreqAsNumber={showFreqAsNumber}
                    />
                  </Col>
                </Row>
              </Container>
            ) : null}
          </Col>
        </Row>
      ) : undefined}
      <Row>
        <Col xs={12} className="small text-center pt-1">
          {buildZones ? (
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
                  {useEfg ? " (FG% where 3pt shots count more)" : ""}, colored
                  by their efficiency relative to D1 average in that{" "}
                  {viewMode === "regions" ? "region" : "zone"}. The color of the{" "}
                  {viewMode === "regions" ? "region" : "zone"} is the shot
                  frequency relative to the D1 average.
                </>
              )}
            </p>
          ) : (
            <p>
              Each hex is a cluster of shots: the color is their efficiency
              relative to the D1 average of shots taken there. The hex size
              gives an idea of its frequency. Mouse over for more details!
            </p>
          )}
        </Col>
      </Row>
      {onChangeChartOpts ? ( //(don't show the controls if we don't handle the change)
        <Row>
          <Col xs={6} md={6} lg={6} xl={12} className="text-center pt-2">
            <ToggleButtonGroup
              items={[
                {
                  items: [
                    {
                      label: "Regions",
                      tooltip:
                        "Regions: Show the shots grouped into large court regions",
                      toggled: viewMode === "regions",
                      onClick: () => {
                        onChangeChartOpts?.({
                          buildZones: true,
                          viewMode: "regions",
                          quickSwitch: quickSwitch,
                          useEfg: useEfg,
                          showFreqAsNumber: showFreqAsNumber,
                        });
                        setViewMode("regions");
                      },
                    },
                    {
                      label: "Zones",
                      tooltip: "Zones: Show the shots grouped into court zones",
                      toggled: viewMode === "zones",
                      onClick: () => {
                        onChangeChartOpts?.({
                          buildZones: true,
                          viewMode: "zones",
                          quickSwitch: quickSwitch,
                          useEfg: useEfg,
                          showFreqAsNumber: showFreqAsNumber,
                        });
                        setViewMode("zones");
                      },
                    },
                    {
                      label: "Clusters",
                      tooltip:
                        "Clusters: Show the shots grouped into small clusters",
                      toggled: viewMode === "clusters",
                      onClick: () => {
                        onChangeChartOpts?.({
                          buildZones: false,
                          viewMode: "clusters",
                          quickSwitch: quickSwitch,
                          useEfg: useEfg,
                          showFreqAsNumber: showFreqAsNumber,
                        });
                        setViewMode("clusters");
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
                      tooltip: "FG%: Show regular field goal percentage",
                      toggled: !useEfg,
                      onClick: () => {
                        onChangeChartOpts?.({
                          buildZones: buildZones,
                          viewMode: viewMode,
                          quickSwitch: quickSwitch,
                          useEfg: false,
                          showFreqAsNumber: showFreqAsNumber,
                        });
                        setUseEfg(false);
                      },
                    },
                    {
                      label: "eFG%",
                      tooltip:
                        "eFG%: Show effective field goal percentage (3-pointers weighted 1.5x)",
                      toggled: useEfg,
                      onClick: () => {
                        onChangeChartOpts?.({
                          buildZones: buildZones,
                          viewMode: viewMode,
                          quickSwitch: quickSwitch,
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
                          buildZones: buildZones,
                          viewMode: viewMode,
                          quickSwitch: quickSwitch,
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
                          buildZones: buildZones,
                          viewMode: viewMode,
                          quickSwitch: quickSwitch,
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
          </Col>
        </Row>
      ) : undefined}
      {quickSwitchAtBottom ? maybeQuickSwitchBar : undefined}
    </Container>
  ) : (
    <span>Loading Data...</span>
  );
};
export default ShotChartDiagView;
