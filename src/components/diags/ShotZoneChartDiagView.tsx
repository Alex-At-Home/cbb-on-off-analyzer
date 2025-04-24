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

///////////////////// UI element + control

type Props = {
  title?: string;
  gender: "Men" | "Women";
  off: CompressedHexZone;
};

const ShotZoneChartDiagView: React.FunctionComponent<Props> = ({
  title,
  gender,
  off,
}) => {
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
                />
              </Col>
            </Row>
          </Container>
        </Col>
      </Row>
    </Container>
  );
};
export default ShotZoneChartDiagView;
