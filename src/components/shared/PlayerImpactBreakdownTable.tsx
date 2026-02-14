// React imports:
import React from "react";
import _ from "lodash";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

import GenericTable, {
  GenericTableOps,
  GenericTableRow,
} from "../GenericTable";
import { IndivTableDefs } from "../../utils/tables/IndivTableDefs";
import { GameAnalysisUtils } from "../../utils/tables/GameAnalysisUtils";
import { RatingUtils } from "../../utils/stats/RatingUtils";
import { IndivStatSet, IndivPosInfo } from "../../utils/StatModels";
import { PlayerOnOffStats } from "../../utils/stats/LineupUtils";

/** One player point from PlayerImpactChart's buildStats (scatter point) */
export type PlayerImpactPoint = {
  seriesId: string;
  name: string;
  stats: IndivStatSet;
  onOffStats: PlayerOnOffStats;
  posInfo?: IndivPosInfo;
  /** optional for total row */
  perGamePoss?: [number, number];
  missingGameAdj?: number;
};

type Props = {
  team: string;
  playerPoints: PlayerImpactPoint[];
  avgEfficiency: number;
  seasonStats?: boolean;
  /** When true, add a "team" column after title (for combined view) */
  showTeamColumn?: boolean;
  /** Render team cell (e.g. logo); used when showTeamColumn is true */
  teamDisplay?: (teamId: string) => React.ReactNode;
};

const tableDefsBase = IndivTableDefs.impactDecompTable;

/** Table defs with team column after title for combined view */
function getTableDefsWithTeam(): Record<string, any> {
  const { title, ...rest } = tableDefsBase;
  return {
    title,
    team: GenericTableOps.addTitle(
      "",
      "Team",
      GenericTableOps.defaultRowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter,
    ),
    ...rest,
  };
}

/** Build a single player row for the impact breakdown table */
function buildPlayerRow(
  team: string,
  point: PlayerImpactPoint,
  avgEfficiency: number,
  seasonStats: boolean,
  teamDisplay?: (teamId: string) => React.ReactNode,
): Record<string, { value: number } | React.ReactNode> {
  const {
    stats,
    onOffStats,
    posInfo,
    perGamePoss,
    missingGameAdj = 1.0,
  } = point;
  const ortgDiag = stats.diag_off_rtg;
  const drtgDiag = stats.diag_def_rtg;

  // RAPM from enriched players (same as GameAnalysisUtils tooltip)
  const offAdjRapm = onOffStats.rapm?.off_adj_ppp?.value ?? 0;
  const defAdjRapm = onOffStats.rapm?.def_adj_ppp?.value ?? 0;
  const diffAdjRapm = offAdjRapm - defAdjRapm;
  // Need to inject these for RatingUtils to work
  stats.off_adj_rapm = onOffStats.rapm?.off_adj_ppp;
  stats.def_adj_rapm = onOffStats.rapm?.def_adj_ppp;

  const possPct = stats.off_team_poss_pct?.value ?? 0;

  const playerCode = stats.code ?? onOffStats.playerCode ?? point.name;
  const prettified = GameAnalysisUtils.namePrettifier(playerCode);
  const tooltip = (
    <Tooltip id={`impactBreakdown-${team}-${playerCode}`}>
      {GameAnalysisUtils.buildPlayerTooltipContents(
        team,
        stats,
        onOffStats,
        posInfo ?? ({} as IndivPosInfo),
        seasonStats,
        perGamePoss,
        missingGameAdj,
      )}
    </Tooltip>
  );
  const maybePos = posInfo?.posClass ?? "??";
  const title = (
    <span style={{ whiteSpace: "nowrap" }}>
      <sup>
        <small>{maybePos} </small>
      </sup>
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <b>{prettified}</b>
      </OverlayTrigger>
    </span>
  );

  let offSosBonus = 0;
  let offRapmBonus = 0;
  let usgBonus = 0;
  let offNet3P = 0;
  let offNetMid = 0;
  let offNetRim = 0;
  let offNetFt = 0;
  let offNetAst = 0;
  let offNetTo = 0;
  let offNetOrb = 0;
  let defSosBonus = 0;
  let defRapmBonus = 0;

  if (ortgDiag && drtgDiag) {
    const netPoints = RatingUtils.buildNetPoints(
      stats,
      ortgDiag,
      drtgDiag,
      avgEfficiency,
      "/G", //TODO
      1.0, //TODO
    );

    // DEBUG:
    // if (team == "XXX") {
    //   console.log(`${prettified}`, ortgDiag, drtgDiag, netPoints);
    // }

    offNet3P = netPoints.offNetPts3P;
    offNetMid = netPoints.offNetPtsMid;
    offNetRim = netPoints.offNetPtsRim;
    offNetFt = netPoints.offNetPtsFt;
    offNetAst = netPoints.offNetPtsAst2 + netPoints.offNetPtsAst3;
    offNetTo = netPoints.offNetPtsTo;
    offNetOrb = netPoints.offNetPtsOrb;
    offRapmBonus = netPoints.offNetPtsWowy;
    usgBonus = netPoints.offNetPtsVolume;

    return {
      title,
      ...(teamDisplay ? { team: teamDisplay(point.seriesId) } : {}),
      team_poss_pct: { value: possPct }, //TODO: make be raw poss in game mode, or maybe convert to mins?
      diff_adj_rapm: { value: netPoints.offNetPts - netPoints.defNetPts },
      off_adj_rapm: { value: netPoints.offNetPts },
      def_adj_rapm: { value: -netPoints.defNetPts },
      off_sos_bonus: { value: netPoints.offNetPtsSos },
      off_gravity_bonus: { value: offRapmBonus + usgBonus },
      off_net_3p: { value: offNet3P },
      off_net_mid: { value: offNetMid },
      off_net_rim: { value: offNetRim },
      off_net_ft: { value: offNetFt },
      off_net_ast: { value: offNetAst },
      off_net_to: { value: offNetTo },
      off_net_orb: { value: offNetOrb },
      def_sos_bonus: { value: -netPoints.defNetPtsSos },
      def_gravity_bonus: { value: -netPoints.defNetPtsWowy },
    };
  } else {
    return {
      title,
      ...(teamDisplay ? { team: teamDisplay(point.seriesId) } : {}),
    };
  }
}

const dataColKeys = [
  "team_poss_pct",
  "diff_adj_rapm",
  "off_adj_rapm",
  "def_adj_rapm",
  "off_sos_bonus",
  "off_gravity_bonus",
  "off_net_3p",
  "off_net_mid",
  "off_net_rim",
  "off_net_ft",
  "off_net_ast",
  "off_net_to",
  "off_net_orb",
  "def_sos_bonus",
  "def_gravity_bonus",
] as const;

/** Build total row (appended at end, not sorted) */
function buildTotalRow(
  rows: Record<string, { value: number } | React.ReactNode>[],
  showTeamColumn?: boolean,
): Record<string, { value: number } | React.ReactNode> {
  const total: Record<string, { value: number } | React.ReactNode> = {
    title: <i>Total</i>,
    ...(showTeamColumn ? { team: <i>Total</i> } : {}),
    team_poss_pct: { value: 1.0 },
  };
  for (const key of dataColKeys) {
    if (key === "team_poss_pct") continue;
    const sum = _.sumBy(rows, (r) => {
      const v = r[key];
      return typeof v === "object" && v !== null && "value" in v
        ? (v as { value: number }).value
        : 0;
    });
    total[key] = { value: sum };
  }
  return total;
}

const identityPrefix = (key: string) => key;
const noCellMeta = () => "";

const PlayerImpactBreakdownTable: React.FunctionComponent<Props> = ({
  team,
  playerPoints,
  avgEfficiency,
  seasonStats = false,
  showTeamColumn = false,
  teamDisplay,
}) => {
  const tableDefs = showTeamColumn ? getTableDefsWithTeam() : tableDefsBase;
  const sortedByPoss = _.orderBy(
    playerPoints,
    [(p) => p.stats.off_team_poss_pct?.value ?? 0],
    ["desc"],
  );

  const playerRowsData = sortedByPoss.map((point) =>
    buildPlayerRow(
      point.seriesId ?? team,
      point,
      avgEfficiency,
      seasonStats,
      teamDisplay,
    ),
  );

  const totalRowData = buildTotalRow(playerRowsData, showTeamColumn);

  const tableRows: GenericTableRow[] = [
    GenericTableOps.buildSubHeaderRow(
      [
        [
          showTeamColumn ? <b>Impact breakdown</b> : <b>{team}:</b>,
          _.size(tableDefs),
        ],
      ],
      "small text-center",
    ),
    ...playerRowsData.map((rowData) =>
      GenericTableOps.buildDataRow(
        rowData,
        identityPrefix,
        noCellMeta,
        tableDefs,
      ),
    ),
    GenericTableOps.buildDataRow(
      totalRowData,
      identityPrefix,
      noCellMeta,
      tableDefs,
    ),
  ];

  return (
    <GenericTable
      tableFields={tableDefs}
      tableData={tableRows}
      cellTooltipMode="missing"
    />
  );
};

export default PlayerImpactBreakdownTable;
