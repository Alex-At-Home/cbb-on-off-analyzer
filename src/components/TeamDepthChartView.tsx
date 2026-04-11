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
  /** Projected (ok) stats per player — Predicted tooltip; includes `ok_net` for badge color. */
  rosterStatsByPlayerId: Record<PlayerId, IndivStatSet>;
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>;
  factorMins: boolean;
  /** When true, tooltip may include a "Previous season" block from `triple.orig` (same row as roster table). */
  showPreviousSeasonInTooltip?: boolean;
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

/** True when we have enough stats to show a "Previous season" block (mirrors usefulness of roster sub-row). */
function hasUsableHistoricSeasonStats(
  season: IndivStatSet | undefined,
): boolean {
  if (!season) {
    return false;
  }
  const mp = season.min_played?.value;
  if (mp != null && mp > 0) {
    return true;
  }
  const ortg = season.off_rtg?.value;
  return ortg != null && ortg > 0;
}

/** Extended-style lines matching `TableDisplayUtils` lineup tooltips (historic season row). */
function historicSeasonExtendedStatLines(
  playerInfo: IndivStatSet,
  /** Roster display name (e.g. `triple.orig.key`), not `triple.key`. */
  displayName: string,
  /** Map key for `positionFromPlayerId` — `triple.key`, unique per player row. */
  lineupMapKey: string,
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>,
): string[] {
  const oRtgStr = (playerInfo.off_rtg?.value || 0).toFixed(0);
  const usageStr = (100 * (playerInfo.off_usage?.value || 0)).toFixed(0) + "%";
  const defRbStr = (100 * (playerInfo.def_orb?.value || 0)).toFixed(0) + "%";
  const adjOffRtg = playerInfo.off_adj_rtg?.value || 0;
  const adjOffRtgSgn = adjOffRtg >= 0 ? "+" : "";
  const adjOffRtgStr = adjOffRtgSgn + adjOffRtg.toFixed(1);
  const assistRateStr =
    (100 * (playerInfo.off_assist?.value || 0)).toFixed(0) + "%";
  const toRateStr = (100 * (playerInfo.off_to?.value || 0)).toFixed(0) + "%";
  const offRbStr = (100 * (playerInfo.off_orb?.value || 0)).toFixed(0) + "%";
  const freethrowRateStr =
    (100 * (playerInfo.off_ftr?.value || 0)).toFixed(0) + "%";
  const efgStr = (100 * (playerInfo.off_efg?.value || 0)).toFixed(0) + "%";
  const threePointRate = 100 * (playerInfo.off_3pr?.value || 0);
  const threePointRateStr = threePointRate.toFixed(0) + "%";
  const threePointPctStr =
    (100 * (playerInfo.off_3p?.value || 0)).toFixed(0) + "%";
  const rimRateStr =
    (100 * (playerInfo.off_2primr?.value || 0)).toFixed(0) + "%";
  const rimPointPctStr =
    (100 * (playerInfo.off_2prim?.value || 0)).toFixed(0) + "%";

  return [
    displayName,
    _.chain([
      playerInfo.roster?.year_class,
      playerInfo.roster?.height,
      positionFromPlayerId[lineupMapKey]?.posClass,
    ])
      .filter((p) => p != undefined && p != "-")
      .join(" / ")
      .value(),
    `ORtg ${oRtgStr} on ${usageStr} (${adjOffRtgStr})`,
    `3P ${threePointPctStr} on ${threePointRateStr}, eFG ${efgStr}`,
    `Rim ${rimPointPctStr} on ${rimRateStr}, FTR ${freethrowRateStr}`,
    `AST ${assistRateStr} : TO ${toRateStr}`,
    `ORB ${offRbStr}, DRB ${defRbStr}`,
  ];
}

function buildDepthChartTooltip(
  /** `triple.orig.key` — human-readable; may collide across siblings; not used as map key. */
  playerDisplayName: string,
  /** `{ code, id }` with `id === triple.key` for `perLineupPlayerMap` / pos lookups. */
  cid: { code: string; id: string },
  ok: IndivStatSet,
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>,
  factorMins: boolean,
  /** Most recent season with stats (`triple.orig`), same source as roster "Previous season" row — not `prevYear`. */
  historicSeason: IndivStatSet | undefined,
): React.ReactNode {
  const marginKey = factorMins
    ? "off_adj_rapm_prod_margin"
    : "off_adj_rapm_margin";
  const offKey = factorMins ? "off_adj_rapm_prod" : "off_adj_rapm";
  const defKey = factorMins ? "def_adj_rapm_prod" : "def_adj_rapm";

  const marginVal = (ok as Record<string, { value?: number }>)[marginKey]
    ?.value;
  const offVal = (ok as Record<string, { value?: number }>)[offKey]?.value;
  const defVal = (ok as Record<string, { value?: number }>)[defKey]?.value;

  const predRapm =
    marginVal ?? (offVal != null && defVal != null ? offVal - defVal : 0);
  const offR = offVal ?? 0;
  const defR = defVal ?? 0;

  const oRtgStr = (ok.off_rtg?.value || 0).toFixed(0);
  const usageStr = (100 * (ok.off_usage?.value || 0)).toFixed(0) + "%";

  const posLine = _.chain([
    ok.roster?.year_class,
    ok.roster?.height,
    positionFromPlayerId[cid.id]?.posClass,
  ])
    .filter((p) => p != undefined && p != "-")
    .join(" / ")
    .value();

  const showPreviousSeasonBlock =
    historicSeason && hasUsableHistoricSeasonStats(historicSeason);
  /** Same strings as `TableDisplayUtils.buildTooltipText` extended view; drop name + class/height/pos (already above). */
  const previousSeasonLines = showPreviousSeasonBlock
    ? historicSeasonExtendedStatLines(
        historicSeason,
        playerDisplayName,
        cid.id,
        positionFromPlayerId,
      ).slice(2)
    : [];

  return (
    <>
      <span>{playerDisplayName}</span>
      <br />
      <span>{posLine}</span>
      <br />
      <strong>Predicted:</strong>
      <br />
      <span>
        {`Impact: ${predRapm.toFixed(1)} pts/100 (o=[${offR.toFixed(1)}] d=[${defR.toFixed(1)}])`}
      </span>
      <br />
      <span>
        ORtg {oRtgStr} on {usageStr}
      </span>
      {showPreviousSeasonBlock ? (
        <>
          <br />
          <br />
          <strong>Previous season:</strong>
          <br />
          {previousSeasonLines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <br /> : null}
              <span>{line}</span>
            </React.Fragment>
          ))}
        </>
      ) : null}
    </>
  );
}

function buildCellNode(
  col: string,
  cell: DepthCell | undefined,
  rosterStatsByPlayerId: Record<PlayerId, IndivStatSet>,
  positionFromPlayerId: Record<PlayerId, IndivPosInfo>,
  factorMins: boolean,
  showPreviousSeasonInTooltip: boolean | undefined,
  getPlayerCareerUrl: TeamDepthChartViewProps["getPlayerCareerUrl"],
): React.ReactNode {
  if (!cell) {
    return undefined;
  }
  const { triple, displayPct } = cell;
  const playerDisplayName = triple.orig.key;
  const playerCodeId = {
    code: (triple.orig.code || triple.orig.key) as string,
    id: triple.key,
  };
  const careerUrl = getPlayerCareerUrl?.(triple);
  const okStats = rosterStatsByPlayerId[playerCodeId.id];
  const historicForTooltip =
    showPreviousSeasonInTooltip &&
    !triple.manualProfile &&
    hasUsableHistoricSeasonStats(triple.orig)
      ? triple.orig
      : undefined;

  const tooltipOverride = okStats
    ? buildDepthChartTooltip(
        playerDisplayName,
        playerCodeId,
        okStats,
        positionFromPlayerId,
        factorMins,
        historicForTooltip,
      )
    : undefined;

  const decoratedPlayerInfo = TableDisplayUtils.buildDecoratedLineup(
    playerCodeId.code + col,
    [playerCodeId],
    rosterStatsByPlayerId,
    positionFromPlayerId,
    "ok_net",
    true,
    ParamDefaults.defaultLineupFontSize,
    {},
    true,
    careerUrl ? () => careerUrl : undefined,
    careerUrl ? "Open Player Career page" : undefined,
    tooltipOverride,
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
  factorMins: boolean,
  showPreviousSeasonInTooltip: boolean | undefined,
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
        factorMins,
        showPreviousSeasonInTooltip,
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
  factorMins,
  showPreviousSeasonInTooltip,
  getPlayerCareerUrl,
}) => {
  const tableData = rows.map((row) =>
    GenericTableOps.buildDataRow(
      rowToDataObj(
        row,
        rosterStatsByPlayerId,
        positionFromPlayerId,
        factorMins,
        showPreviousSeasonInTooltip,
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
