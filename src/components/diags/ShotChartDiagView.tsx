// React imports:
import React, { useState, useEffect, Fragment } from "react";

import _ from "lodash";

// Utils
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { ShotChartAvgs_Men_2024 } from "../../utils/internal-data/ShotChartAvgs_Men_2024";
import { ShotChartAvgs_Women_2024 } from "../../utils/internal-data/ShotChartAvgs_Women_2024";
import { ShotChartZones_Men_2024 } from "../../utils/internal-data/ShotChartZones_Men_2024";
import { ShotChartZones_Women_2024 } from "../../utils/internal-data/ShotChartZones_Women_2024";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faArrowAltCircleRight,
  faWindowClose,
  faWindowRestore,
} from "@fortawesome/free-regular-svg-icons";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

const HEX_HEIGHT = 400;
const HEX_WIDTH = 520;

import { ShotStats } from "../../utils/StatModels";
import ToggleButtonGroup from "../shared/ToggleButtonGroup";
import HexMap from "../shared/HexMap";
import { ParamDefaults } from "../../utils/FilterModels";
import { ShotChartUtils } from "../../utils/stats/ShotChartUtils";

///////////////////// UI element + control

const quickSwichDelim = ":|:";

/** Builds a handy element for scoring usage / play types to toggle between baseline/on/off views */
const buildQuickSwitchOptions = (
  title: string,
  hasDefensiveData: boolean,
  quickSwitch: string | undefined,
  quickSwitchExtra: string | undefined,
  quickSwitchOptions: { title?: string }[] | undefined,
  updateQuickSwitch: (
    newSetting: string | undefined,
    fromTimer: boolean
  ) => void,
  quickSwitchTimer: NodeJS.Timer | undefined,
  setQuickSwitchTimer: (newQuickSwitchTimer: NodeJS.Timer | undefined) => void
) => {
  const quickSwitchTimerLogic = (newQuickSwitch: string | undefined) => {
    if (quickSwitchTimer) {
      clearInterval(quickSwitchTimer);
    }
    if (quickSwitch) {
      updateQuickSwitch(undefined, false);
    } else {
      updateQuickSwitch(newQuickSwitch, false);
    }
    if (newQuickSwitch) {
      setQuickSwitchTimer(
        setInterval(() => {
          updateQuickSwitch(newQuickSwitch, true);
        }, 4000)
      );
    } else {
      setQuickSwitchTimer(undefined);
    }
  };
  const timeTooltip = (
    <Tooltip id="timerTooltip">
      Sets off a 4s timer switching between the default breakdown and this one
    </Tooltip>
  );
  const rightArrowTooltip = (
    <Tooltip id="rightArrowTooltip">
      Shows a side-by-side comparison between the two data sets
    </Tooltip>
  );
  const cancelRightArrowTooltip = (
    <Tooltip id="rightArrowTooltip">Hides the side-by-side comparison</Tooltip>
  );
  const rightOrDownArrowBuilder = (
    t: string | undefined,
    singleRow: boolean
  ) => {
    if (quickSwitchExtra == "extra" && t == quickSwitch) {
      return (
        <OverlayTrigger placement="auto" overlay={cancelRightArrowTooltip}>
          <FontAwesomeIcon icon={faWindowClose} />
        </OverlayTrigger>
      );
    } else {
      return (
        <OverlayTrigger placement="auto" overlay={rightArrowTooltip}>
          <FontAwesomeIcon icon={faArrowAltCircleRight} />
        </OverlayTrigger>
      );
    }
  };
  const diffViewTooltip = (
    <Tooltip id="diffViewTooltip">
      Shows a differential view of the two data sets
    </Tooltip>
  );
  const cancelDiffViewTooltip = (
    <Tooltip id="diffViewTooltip">
      Cancels the differential view of the two data sets
    </Tooltip>
  );
  const diffViewBuilder = (t: string | undefined, singleRow: boolean) => {
    if (quickSwitchExtra == "diff" && t == quickSwitch) {
      return (
        <OverlayTrigger placement="auto" overlay={cancelDiffViewTooltip}>
          <FontAwesomeIcon icon={faWindowClose} />
        </OverlayTrigger>
      );
    } else {
      return (
        <OverlayTrigger placement="auto" overlay={diffViewTooltip}>
          <FontAwesomeIcon icon={faWindowRestore} />
        </OverlayTrigger>
      );
    }
  };
  const quickSwitchBuilder = _.map(
    quickSwitchTimer
      ? [{ title: `Cancel 4s timer` }]
      : quickSwitchOptions || [],
    (opt) => opt.title
  ).map((t, index) => {
    return (
      <span key={`quickSwitch-${index}`} style={{ whiteSpace: "nowrap" }}>
        [
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!quickSwitchTimer) {
              updateQuickSwitch(
                quickSwitch == t && !quickSwitchExtra ? undefined : t,
                false
              ); //(ie toggle)
            } else {
              quickSwitchTimerLogic(undefined);
            }
          }}
        >
          {t}
        </a>
        {quickSwitchTimer ? undefined : (
          <span>
            &nbsp;
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                quickSwitchTimerLogic(t);
              }}
            >
              <OverlayTrigger placement="auto" overlay={timeTooltip}>
                <FontAwesomeIcon icon={faClock} />
              </OverlayTrigger>
              &nbsp;
            </a>
          </span>
        )}
        {quickSwitchTimer ? undefined : (
          <Fragment>
            <span>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  updateQuickSwitch(
                    quickSwitch == t && quickSwitchExtra == "extra"
                      ? undefined
                      : `${t}${quickSwichDelim}extra`,
                    false
                  ); //(ie toggle)
                }}
              >
                {rightOrDownArrowBuilder(t, !hasDefensiveData)}
                &nbsp;
              </a>
            </span>
            <span>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  updateQuickSwitch(
                    quickSwitch == t && quickSwitchExtra == "diff"
                      ? undefined
                      : `${t}${quickSwichDelim}diff`,
                    false
                  ); //(ie toggle)
                }}
              >
                {diffViewBuilder(t, !hasDefensiveData)}
                &nbsp;
              </a>
            </span>
          </Fragment>
        )}
        ]&nbsp;
      </span>
    );
  });

  const quickswitchOverride = quickSwitchExtra ? undefined : quickSwitch;
  return (
    <div>
      <span style={{ whiteSpace: "nowrap", display: "inline-block" }}>
        <b>Shot Chart Analysis: [{quickswitchOverride || title}]</b>
      </span>
      {_.isEmpty(quickSwitchOptions) ? null : (
        <span style={{ whiteSpace: "nowrap" }}>
          &nbsp;|&nbsp;<i>quick-toggles:</i>&nbsp;
        </span>
      )}
      {_.isEmpty(quickSwitchOptions) ? null : quickSwitchBuilder}
    </div>
  );
};

export type UserChartOpts = {
  buildZones?: boolean;
  quickSwitch?: string;
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
}) => {
  const [quickSwitch, setQuickSwitch] = useState<string | undefined>(
    chartOpts?.quickSwitch
  );
  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);
  const [buildZones, setBuildZones] = useState<boolean>(
    !chartOpts || _.isNil(chartOpts?.buildZones)
      ? ParamDefaults.defaultShotChartShowZones
      : chartOpts.buildZones
  );

  useEffect(() => {
    if (chartOpts) {
      setBuildZones(
        _.isNil(chartOpts?.buildZones)
          ? ParamDefaults.defaultShotChartShowZones
          : chartOpts.buildZones
      );
    }
  }, [chartOpts]); //(handle external changes to zone)

  const diffDataSet =
    gender == "Men" ? ShotChartAvgs_Men_2024 : ShotChartAvgs_Women_2024;

  const d1Zones =
    gender == "Men" ? ShotChartZones_Men_2024 : ShotChartZones_Women_2024;

  //ENABLE TO RE-CALCULATE
  //   ShotChartUtils.buildAverageZones(diffDataSet || {}, "Men");
  //   ShotChartUtils.buildAverageZones(diffDataSet || {}, "Women");

  const quickSwitchBase = quickSwitch
    ? quickSwitch.split(quickSwichDelim)[0]
    : undefined;
  const quickSwitchExtra: "extra" | "diff" | undefined = (
    quickSwitch ? quickSwitch.split(quickSwichDelim)[1] : undefined
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
            (opt) => opt.title == quickSwitchBase
          )?.offDefOverrides
        : offDefOverrides) ||
        offDefOverrides || [false, true];

      const selLabelOverrides =
        (quickSwitch
          ? _.find(
              quickSwitchOptions || [],
              (opt) => opt.title == quickSwitchBase
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
                (opt) => opt.title == quickSwitchBase
              )?.off
            : off) || off,
        extraRowOff: def,
        extraRowDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase
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
                (opt) => opt.title == quickSwitchBase
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
                (opt) => opt.title == quickSwitchBase
              )?.off
            : off) || off,
        extraRowDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase
              )?.def
            : def) || def,
        selOffDefOverrides: offDefOverrides,
        selLabelOverrides: (labelOverrides || ["Offense:", "Defense:"]).map(
          (l) => `(Delta: [${quickSwitchBase}]) ${l}`
        ),
      };
    } else {
      return {
        selectedOff:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase
              )?.off
            : off) || off,
        selectedDef:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase
              )?.def
            : def) || def,
        selOffDefOverrides:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase
              )?.offDefOverrides
            : offDefOverrides) || offDefOverrides,
        selLabelOverrides:
          (quickSwitch
            ? _.find(
                quickSwitchOptions || [],
                (opt) => opt.title == quickSwitchBase
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
    quickSwitchExtra == "diff" ? extraRowOff : undefined
  );
  const {
    data: defData,
    zones: defZones,
    splitZones: splitDefZones,
  } = ShotChartUtils.shotStatsToHexData(
    selectedDef,
    diffDataSet,
    quickSwitchExtra == "diff" ? extraRowDef : undefined
  );
  const { data: extraRowOffData, zones: extraRowOffZones } = extraRowOff
    ? ShotChartUtils.shotStatsToHexData(extraRowOff, diffDataSet)
    : { data: [], zones: [] };
  const { data: extraRowDefData, zones: extraRowDefZones } = extraRowDef
    ? ShotChartUtils.shotStatsToHexData(extraRowDef, diffDataSet)
    : { data: [], zones: [] };

  const leftIndex = invertLeftRight ? 1 : 0;
  const rightIndex = invertLeftRight ? 0 : 1;

  return off?.doc_count || def?.doc_count ? (
    <Container>
      {title ? (
        <Row className="pt-2 pb-2">
          <Col xs={12}>
            {buildQuickSwitchOptions(
              title,
              hasDefensiveData,
              quickSwitchBase,
              quickSwitchExtra,
              quickSwitchOptions?.filter(
                //(remove any options that don't have data)
                (opt) => opt.off?.doc_count || opt.def?.doc_count
              ),
              (newSetting, fromTimer) => {
                if (fromTimer) {
                  setQuickSwitch((curr) => (curr ? undefined : newSetting));
                } else {
                  onChangeChartOpts?.({
                    buildZones: buildZones,
                    quickSwitch: newSetting,
                  });
                  setQuickSwitch(newSetting);
                }
              },
              quickSwitchTimer,
              setQuickSwitchTimer
            )}
          </Col>
        </Row>
      ) : undefined}
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
              Each circle shows the eFG% (FG% where 3pts shots count more),
              colored by their efficiency relative to D1 average in that zone.
              The color of the zone is the shot frequency relative to the D1
              average.
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
                  label: "Zones",
                  tooltip: "Show the shots grouped into large court zones",
                  toggled: buildZones,
                  onClick: () => {
                    onChangeChartOpts?.({
                      buildZones: !buildZones,
                      quickSwitch: quickSwitch,
                    });
                    setBuildZones(!buildZones);
                  },
                },
                {
                  label: "Clusters",
                  tooltip: "Show the shots grouped into small clusters",
                  toggled: !buildZones,
                  onClick: () => {
                    onChangeChartOpts?.({
                      buildZones: !buildZones,
                      quickSwitch: quickSwitch,
                    });
                    setBuildZones(!buildZones);
                  },
                },
              ]}
            />
          </Col>
        </Row>
      ) : undefined}
    </Container>
  ) : (
    <span>Loading Data...</span>
  );
};
export default ShotChartDiagView;
