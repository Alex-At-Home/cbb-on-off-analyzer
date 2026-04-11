// React imports:
import React from "react";

import _ from "lodash";

// Bootstrap imports:
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";

// Utils
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { CbbColors } from "../utils/CbbColors";
import type { GoodBadOkTriple } from "../utils/stats/TeamEditorUtils";
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import type { DepthCell, DepthRow } from "../utils/tables/TeamEditorDepthChart";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import { IndivPosInfo, IndivStatSet, PlayerId } from "../utils/StatModels";
import { ParamDefaults } from "../utils/FilterModels";

const TABLE_COLS = ["pg", "sg", "sf", "pf", "c"] as const;

export type TeamDepthChartViewProps = {
  rows: [DepthRow, DepthRow];
  rosterStatsByPlayerId: Record<PlayerId, IndivStatSet>;
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>;
  /** When set, opens this URL in a new tab from buildDecoratedLineup; otherwise name is not a link. */
  getPlayerCareerUrl?: (triple: GoodBadOkTriple) => string | undefined;
};

const tableFields = {
  title: GenericTableOps.addTitle(
    "",
    "",
    CommonTableDefs.singleLineRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter,
    0,
  ),
  pg: GenericTableOps.addDataCol(
    `PG`,
    "Depth chart (projected minutes share)",
    CbbColors.applyThemedBackground,
    GenericTableOps.percentOrHtmlFormatter,
  ),
  sg: GenericTableOps.addDataCol(
    `SG`,
    "Depth chart (projected minutes share)",
    CbbColors.applyThemedBackground,
    GenericTableOps.percentOrHtmlFormatter,
  ),
  sf: GenericTableOps.addDataCol(
    `SF`,
    "Depth chart (projected minutes share)",
    CbbColors.applyThemedBackground,
    GenericTableOps.percentOrHtmlFormatter,
  ),
  pf: GenericTableOps.addDataCol(
    `PF`,
    "Depth chart (projected minutes share)",
    CbbColors.applyThemedBackground,
    GenericTableOps.percentOrHtmlFormatter,
  ),
  c: GenericTableOps.addDataCol(
    `C`,
    "Depth chart (projected minutes share)",
    CbbColors.applyThemedBackground,
    GenericTableOps.percentOrHtmlFormatter,
  ),
};

function buildCellNode(
  col: string,
  cell: DepthCell | undefined,
  rosterStatsByPlayerId: Record<PlayerId, IndivStatSet>,
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>,
  getPlayerCareerUrl: TeamDepthChartViewProps["getPlayerCareerUrl"],
): React.ReactNode {
  if (!cell) {
    return undefined;
  }
  const { triple, displayPct } = cell;
  const playerCodeId = {
    code: (triple.orig.code || triple.orig.key) as string,
    id: triple.orig.key,
  };
  const careerUrl = getPlayerCareerUrl?.(triple);
  const decoratedPlayerInfo = TableDisplayUtils.buildDecoratedLineup(
    playerCodeId.code + col,
    [playerCodeId],
    rosterStatsByPlayerId,
    positionFromPlayerId,
    "off_adj_rtg",
    true,
    ParamDefaults.defaultLineupFontSize,
    {},
    true,
    careerUrl ? () => careerUrl : undefined,
    careerUrl ? "Open Player Career page" : undefined,
  );
  const playerNum = rosterStatsByPlayerId[playerCodeId.id]?.roster?.number;
  return (
    <Row>
      <Col className="pr-0 pl-0" xs="3">
        <div
          className="float-right"
          style={CommonTableDefs.getTextShadow(
            { value: displayPct },
            CbbColors.posFreq,
          )}
        >
          {displayPct.toFixed(0)}%
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
    </Row>
  );
}

function rowToDataObj(
  row: DepthRow,
  rosterStatsByPlayerId: Record<PlayerId, IndivStatSet>,
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>,
  getPlayerCareerUrl: TeamDepthChartViewProps["getPlayerCareerUrl"],
): Record<string, unknown> {
  return _.chain(TABLE_COLS)
    .map((col) => [
      col,
      buildCellNode(
        col,
        row[col],
        rosterStatsByPlayerId,
        positionFromPlayerId,
        getPlayerCareerUrl,
      ),
    ])
    .fromPairs()
    .value();
}

/** Two-row PG–C depth chart (Team Editor / Offseason leaderboard); visuals forked from TeamRosterDiagView. */
const TeamDepthChartView: React.FunctionComponent<TeamDepthChartViewProps> = ({
  rows,
  rosterStatsByPlayerId,
  positionFromPlayerId,
  getPlayerCareerUrl,
}) => {
  const tableData = rows.map((row) =>
    GenericTableOps.buildDataRow(
      rowToDataObj(
        row,
        rosterStatsByPlayerId,
        positionFromPlayerId,
        getPlayerCareerUrl,
      ),
      GenericTableOps.defaultFormatter,
      GenericTableOps.defaultCellMeta,
    ),
  );

  return (
    <Container fluid>
      <Col xs={12}>
        <GenericTable
          responsive={false}
          tableCopyId="teamDepthChartView"
          tableFields={tableFields}
          tableData={tableData}
        />
      </Col>
    </Container>
  );
};

export default TeamDepthChartView;
