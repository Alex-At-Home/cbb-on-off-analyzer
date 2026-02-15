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
import { RatingUtils, NetPoints } from "../../utils/stats/RatingUtils";
import { IndivStatSet, IndivPosInfo } from "../../utils/StatModels";
import { LineupUtils, PlayerOnOffStats } from "../../utils/stats/LineupUtils";

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
  adjBreakdownForSoS: boolean;
  scaleType: "P%" | "T%" | "/G";
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
  adjBreakdownForSoS: boolean,
  scaleType: "T%" | "P%" | "/G",
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
  const missedTime = (missingGameAdj ?? 1) > 1.2;
  const title = (
    <span style={{ whiteSpace: "nowrap" }}>
      <sup>
        <small>{maybePos} </small>
      </sup>
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <b>
          {prettified}
          {missedTime ? <sup>!</sup> : null}
        </b>
      </OverlayTrigger>
    </span>
  );

  if (ortgDiag && drtgDiag) {
    const teamGames = seasonStats
      ? _.size(
          LineupUtils.isGameInfoStatSet(stats.game_info)
            ? LineupUtils.getGameInfo(stats.game_info || {})
            : stats.game_info,
        ) || 1
      : 1;

    const netPoints = RatingUtils.buildNetPoints(
      stats,
      ortgDiag,
      drtgDiag,
      avgEfficiency,
      scaleType,
      teamGames / (missingGameAdj || 1),
    );

    // DEBUG:
    // if (team == "Maryland") {
    //   console.log(`${prettified}`, ortgDiag, drtgDiag, netPoints);
    // }

    const offNetAst = netPoints.offNetPtsAst2 + netPoints.offNetPtsAst3;

    const offSosAdj = adjBreakdownForSoS ? 0 : netPoints.offNetPtsSos;
    const defSosAdj = adjBreakdownForSoS ? 0 : netPoints.defNetPtsSos;

    //TODO: huge mess with players who miss games
    // 1] T% impact on graph is over games in which has played, so need to dup that in table
    //    Needs to indicate what's going on though (maybe have a option?), with "!" for player
    //    and some *s for impacted stats, and show poss
    // 2]   Currently T% is too low .. but /G is too high wtf (/G poss is correct, T% is too low)
    //      ah T% is expected I think, I'm not adjusting .. perhaps never adjust inside the
    //      buildNetRating? or perhaps just adjust consistently
    // 3] Payne's RAPM is v different to on roster stats table, maybe everyone else also?
    //    (need to look into this?!)

    return {
      title,
      ...(teamDisplay ? { team: teamDisplay(point.seriesId) } : {}),
      team_poss_pct: {
        value: possPct * (scaleType == "/G" ? missingGameAdj : 1),
      }, //TODO: make be raw poss in game mode, or maybe convert to mins?
      diff_adj_rapm: {
        value:
          netPoints.offNetPts - netPoints.defNetPts - offSosAdj - defSosAdj,
      },
      off_adj_rapm: { value: netPoints.offNetPts - offSosAdj },
      def_adj_rapm: { value: -netPoints.defNetPts - defSosAdj },
      off_sos_bonus: { value: netPoints.offNetPtsSos },
      off_gravity_bonus: {
        value: netPoints.offNetPtsWowy + netPoints.offNetPtsVolume,
        extraInfo: (
          <span>
            RAPM/WOWY bonus: {netPoints.offNetPtsWowy.toFixed(2)}
            <br />
            Shot volume bonus: {netPoints.offNetPtsVolume.toFixed(2)}
          </span>
        ),
      },
      off_net_3p: { value: netPoints.offNetPts3P },
      off_net_mid: { value: netPoints.offNetPtsMid },
      off_net_rim: { value: netPoints.offNetPtsRim },
      off_net_ft: { value: netPoints.offNetPtsFt },
      off_net_ast: {
        value: offNetAst,
        extraInfo: (
          <span>
            2P Assists: {netPoints.offNetPtsAst2.toFixed(2)}
            <br />
            3P Assists: {netPoints.offNetPtsAst3.toFixed(2)}
          </span>
        ),
      },
      off_net_to: { value: netPoints.offNetPtsTo },
      off_net_orb: { value: netPoints.offNetPtsOrb },
      def_sos_bonus: { value: netPoints.defNetPtsSos },
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
  adjBreakdownForSoS,
  scaleType,
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
      adjBreakdownForSoS,
      scaleType,
      teamDisplay,
    ),
  );

  const totalRowData = buildTotalRow(playerRowsData, showTeamColumn);

  const subHeaderRow = showTeamColumn ? [] : [
    GenericTableOps.buildSubHeaderRow(
      [
        [
          <span
            key="team"
            style={{
              display: "block",
              width: "100%",
              textAlign: "right",
            }}
          >
            {team}:
          </span>,
          1,
        ],
      ],
      "small",
    )
  ];

  const tableRows: GenericTableRow[] = subHeaderRow
    .concat(
      playerRowsData.map((rowData) =>
        GenericTableOps.buildDataRow(
          rowData,
          identityPrefix,
          noCellMeta,
          tableDefs,
        ),
      ),
    )
    .concat(
      scaleType != "P%"
        ? [
            GenericTableOps.buildDataRow(
              totalRowData,
              identityPrefix,
              noCellMeta,
              tableDefs,
            ),
          ]
        : [],
    );

  return (
    <GenericTable
      tableFields={tableDefs}
      tableData={tableRows}
      cellTooltipMode="missing"
    />
  );
};

export default PlayerImpactBreakdownTable;
