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
import { UserChartOpts } from "./ShotChartDiagView";

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
  const [useEfg, setUseEfg] = useState<boolean>(
    chartOpts?.useEfg ?? false
  );

  useEffect(() => {
    if (chartOpts) {
      setUseEfg(chartOpts?.useEfg ?? false);
    }
  }, [chartOpts]);
  const diffDataSet =
    gender == "Men" ? ShotChartAvgs_Men_2024 : ShotChartAvgs_Women_2024;

  const d1Zones =
    gender == "Men" ? ShotChartZones_Men_2024 : ShotChartZones_Women_2024;

  const offZones = ShotChartUtils.decompressHexZones(off);

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
              <Col xs={12}>
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
                />
              </Col>
            </Row>
          </Container>
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="small text-center pt-1">
          <p>
            Each circle shows the {useEfg ? "eFG%" : "FG%"} {useEfg ? "(FG% where 3pt shots count more)" : ""},
            colored by their efficiency relative to D1 average in that zone.
            The color of the zone is the shot frequency relative to the D1
            average.
          </p>
        </Col>
      </Row>
      {onChangeChartOpts ? (
        <Row>
          <Col xs={6} md={6} lg={6} xl={12} className="text-center pt-2">
            <ToggleButtonGroup
              items={[
                {
                  label: "FG%",
                  tooltip: "Show regular field goal percentage",
                  toggled: !useEfg,
                  onClick: () => {
                    onChangeChartOpts?.({
                      useEfg: false,
                    });
                    setUseEfg(false);
                  },
                },
                {
                  label: "eFG%",
                  tooltip: "Show effective field goal percentage (3-pointers weighted 1.5x)",
                  toggled: useEfg,
                  onClick: () => {
                    onChangeChartOpts?.({
                      useEfg: true,
                    });
                    setUseEfg(true);
                  },
                },
              ]}
            />
          </Col>
        </Row>
      ) : undefined}
    </Container>
  );
};
export default ShotZoneChartDiagView;
