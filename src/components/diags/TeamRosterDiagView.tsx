// React imports:
import React, { useState } from "react";

import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Utils
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";
import { PositionInfo } from "../../utils/tables/LineupTableUtils";
import { TableDisplayUtils } from "../../utils/tables/TableDisplayUtils";

// Component imports
import GenericTable, { GenericTableOps } from "../GenericTable";
import { IndivStatSet, PlayerId, IndivPosInfo } from "../../utils/StatModels";
import { ParamDefaults } from "../../utils/FilterModels";

type Props = {
  /**  PositionInfo indexed first by position (0-4) then by player (arbitrary order) ... global stats */
  positionInfoGlobal: PositionInfo[][];
  /**  PositionInfo indexed first by position (0-4) then by player (arbitrary order) ... baseline stats */
  positionInfoSample: PositionInfo[][] | undefined;
  /** For the tooltip display */
  rosterStatsByPlayerId: Record<PlayerId, IndivStatSet>;
  /** For the tooltip display */
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>;
  teamSeasonLookup: string;
  showHelp: boolean;
  useSampleStatsOverride?: boolean;
};
const TeamRosterDiagView: React.FunctionComponent<Props> = ({
  positionInfoSample,
  positionInfoGlobal: positionInfoBase,
  rosterStatsByPlayerId,
  positionFromPlayerId,
  useSampleStatsOverride,
}) => {
  const tableCols = ["pg", "sg", "sf", "pf", "c"];
  const tableFields = {
    title: GenericTableOps.addTitle(
      "",
      "",
      CommonTableDefs.singleLineRowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter,
      0
    ),
    pg: GenericTableOps.addDataCol(
      `PG`,
      "Roster distribution for PG slot",
      CbbColors.applyThemedBackground,
      GenericTableOps.percentOrHtmlFormatter
    ),
    sg: GenericTableOps.addDataCol(
      `SG`,
      "Roster distribution for SG slot",
      CbbColors.applyThemedBackground,
      GenericTableOps.percentOrHtmlFormatter
    ),
    sf: GenericTableOps.addDataCol(
      `SF`,
      "Roster distribution for SF slot",
      CbbColors.applyThemedBackground,
      GenericTableOps.percentOrHtmlFormatter
    ),
    pf: GenericTableOps.addDataCol(
      `PF`,
      "Roster distribution for PF slot",
      CbbColors.applyThemedBackground,
      GenericTableOps.percentOrHtmlFormatter
    ),
    c: GenericTableOps.addDataCol(
      `C`,
      "Roster distribution for C slot",
      CbbColors.applyThemedBackground,
      GenericTableOps.percentOrHtmlFormatter
    ),
  };

  const [useSampleStats, setUseSampleStats] = useState(
    useSampleStatsOverride ? true : false
  );
  const positionInfo =
    positionInfoSample && useSampleStats
      ? positionInfoSample
      : positionInfoBase;

  const possByPosPctInv = positionInfo
    .map((players) => _.sumBy(players, "numPoss"))
    .map((num) => 100.0 / (num || 1));
  const filteredPositionInfo = positionInfo.map((players, colIndex) => {
    return (players || []).filter((playerCodeId) => {
      const pct =
        (playerCodeId.numPoss || 0) * (possByPosPctInv[colIndex] || 0);
      return pct >= 5;
    });
  });
  const tableSize =
    _.max(filteredPositionInfo.map((players) => players.length)) || 0;

  const tableRawData = _.range(tableSize).map((index) => {
    return _.chain(tableCols)
      .map((col, colIndex) => {
        const playerCodeId = filteredPositionInfo?.[colIndex]?.[index];

        if (playerCodeId) {
          const pct =
            (playerCodeId.numPoss || 0) * (possByPosPctInv[colIndex] || 0);
          const decoratedPlayerInfo = TableDisplayUtils.buildDecoratedLineup(
            playerCodeId.code + col,
            [playerCodeId],
            rosterStatsByPlayerId,
            positionFromPlayerId,
            "off_adj_rtg",
            true,
            ParamDefaults.defaultLineupFontSize,
            {},
            true
          );
          const playerNum =
            rosterStatsByPlayerId[playerCodeId.id]?.roster?.number;
          return [
            col,
            <Row>
              <Col className="pr-0 pl-0" xs="3">
                <div
                  className="float-right"
                  style={CommonTableDefs.getTextShadow(
                    { value: pct },
                    CbbColors.posFreq
                  )}
                >
                  {pct.toFixed(0)}%
                </div>
              </Col>
              <Col xs="auto">
                <div className="float-left" style={{ display: "flex" }}>
                  {playerNum ? (
                    <i style={{ marginRight: ".1rem" }}>
                      <small>#{playerNum}</small>
                    </i>
                  ) : null}
                  {decoratedPlayerInfo}
                </div>
              </Col>
            </Row>,
          ];
        } else {
          return [col, undefined];
        }
      })
      .fromPairs()
      .value();
  });
  const tableData = tableRawData.map((row) =>
    GenericTableOps.buildDataRow(
      row,
      GenericTableOps.defaultFormatter,
      GenericTableOps.defaultCellMeta
    )
  );

  return (
    <Container fluid>
      <Col xs={12}>
        <GenericTable
          responsive={false}
          tableCopyId="rosterView"
          tableFields={tableFields}
          tableData={tableData}
        />
      </Col>
      {positionInfoSample ? (
        <Col>
          Using [{useSampleStats ? "sample" : "global"}] stats -{" "}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setUseSampleStats(!useSampleStats);
            }}
          >
            switch to {useSampleStats ? "global" : "sample"} stats
          </a>
        </Col>
      ) : null}
    </Container>
  );
};
export default TeamRosterDiagView;
