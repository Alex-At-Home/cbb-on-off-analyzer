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
import TableSortPopupMenu, {
  TableSortPopupMenuState,
} from "../shared/TableSortPopupMenu";
import { GameAnalysisUtils } from "../../utils/tables/GameAnalysisUtils";
import { RatingUtils, NetPoints } from "../../utils/stats/RatingUtils";
import { IndivStatSet, IndivPosInfo } from "../../utils/StatModels";
import { LineupUtils, PlayerOnOffStats } from "../../utils/stats/LineupUtils";
import { CbbColors } from "../../utils/CbbColors";

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
  showWalkOns: boolean;
};

const tableDefsBase = IndivTableDefs.impactDecompTable;

/** Enable to add a load of items to the table to help debug offensive adjustment credit */
const offDebugMode = false;

/** Enable to add a load of items to the table to help debug defensive adjustment credit */
const defDebugMode = false;

/** Table defs with team column after title for combined view */
function adjustTableDefs(showTeamCol: boolean): Record<string, any> {
  const { title, ...rest } = tableDefsBase;
  return {
    title,
    ...(showTeamCol
      ? {
          team: GenericTableOps.addDataCol(
            "",
            "Team",
            CbbColors.applyThemedBackground,
            GenericTableOps.htmlFormatter,
          ),
        }
      : {}),
    ...(offDebugMode
      ? {
          totPoss: GenericTableOps.addDataCol(
            "Tot Poss",
            "Tot Poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          scPoss: GenericTableOps.addDataCol(
            "Sc Poss",
            "Sc Poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          fgxPoss: GenericTableOps.addDataCol(
            "FGx Poss",
            "FGx Poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          ftxPoss: GenericTableOps.addDataCol(
            "FTx Poss",
            "FTx Poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          fgPts: GenericTableOps.addDataCol(
            "FG pts",
            "FG pts",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          fgPoss: GenericTableOps.addDataCol(
            "FG poss",
            "FG poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          ftPoss: GenericTableOps.addDataCol(
            "FT poss",
            "FT poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          astPoss: GenericTableOps.addDataCol(
            "AST poss",
            "AST poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
          orbPoss: GenericTableOps.addDataCol(
            "ORB poss",
            "ORB poss",
            CbbColors.applyThemedBackground,
            GenericTableOps.pointsOrHtmlFormatter,
          ),
        }
      : {}),
    ...(defDebugMode ? {} : {}),
    ...rest,
  };
}

/** Build a single player row for the impact breakdown table
 * TODO: issues this has highlighted:
 * 1] sometimes (if  low vol players are removed?) RAPM sum has larger difference from game score
 * 2] often see ~1.5 sum for O/D "Gdelta", indicating that weighted [OD]Rtg / AdjRtg+ are not summing to game
 *    score (seems worse for game than season)
 */
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

  const offPossPct = stats.off_team_poss_pct?.value ?? 0;
  const defPossPct = stats.def_team_poss_pct?.value ?? 0;
  const possPct = 0.5 * offPossPct + 0.5 * defPossPct;

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
        scaleType === "/G" ? perGamePoss : undefined,
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
    const playerTeamGames = seasonStats
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
      playerTeamGames,
      scaleType === "T%" ? missingGameAdj : 1,
    );

    //DEBUG:
    // if (team == "Maryland") {
    //   console.log(
    //     `${prettified}: [${playerTeamGames}]`,
    //     ortgDiag,
    //     drtgDiag,
    //     netPoints,
    //   );
    // }

    const offNetAst = netPoints.offNetPtsAst2 + netPoints.offNetPtsAst3;

    const offSosAdj = adjBreakdownForSoS ? 0 : netPoints.offNetPtsSos;
    const defSosAdj = adjBreakdownForSoS ? 0 : netPoints.defNetPtsSos;

    return {
      title,
      ...(teamDisplay ? { team: teamDisplay(point.seriesId) } : {}),
      team_poss_pct: {
        value: possPct * missingGameAdj,
        extraInfo:
          missingGameAdj > 1
            ? `Ignoring missing games, would be [${(possPct * 100).toFixed(1)}%]`
            : undefined,
      }, //TODO: make be raw poss in game mode, or maybe convert to mins?
      off_team_poss_pct: {
        value: offPossPct,
      },
      def_team_poss_pct: {
        value: defPossPct,
      },
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
      off_net_3p: {
        value: offDebugMode ? ortgDiag.threePtsProd : netPoints.offNetPts3P,
      },
      off_net_mid: {
        value: offDebugMode ? ortgDiag.midPtsProd : netPoints.offNetPtsMid,
      },
      off_net_rim: {
        value: offDebugMode ? ortgDiag.rimPtsProd : netPoints.offNetPtsRim,
      },
      off_net_ft: {
        value: offDebugMode
          ? ortgDiag.ftPart * (1 - ortgDiag.teamOrbContribPct)
          : netPoints.offNetPtsFt,
      },
      off_net_ast: {
        value: offDebugMode
          ? ortgDiag.astThreePProd + ortgDiag.astTwoPProd
          : offNetAst,
        extraInfo: (
          <span>
            2P Assists: {netPoints.offNetPtsAst2.toFixed(2)}
            <br />
            3P Assists: {netPoints.offNetPtsAst3.toFixed(2)}
          </span>
        ),
      },
      off_net_to: {
        value: offDebugMode ? ortgDiag.rawTo : netPoints.offNetPtsTo,
      },
      off_net_orb: {
        value: offDebugMode ? ortgDiag.ppOrb : netPoints.offNetPtsOrb,
      },
      def_sos_bonus: { value: netPoints.defNetPtsSos },
      def_gravity_bonus: { value: -netPoints.defNetPtsWowy },
      ...(offDebugMode
        ? {
            totPoss: {
              //(for testing the derived sum is right)
              //value: netPoints.offNetPts - netPoints.offNetPtsDerived,
              value: ortgDiag.adjPoss,
            },
            fgPts: {
              value:
                ortgDiag.threePtsProd +
                ortgDiag.rimPtsProd +
                ortgDiag.midPtsProd,
            },
            scPoss: {
              //temp isolate from scoringPoss to just "fgScoringPoss"
              // (components: fgPart, astPart, ftPart),
              // and then * (1 - ortgDiag.teamOrbContribPct) to remove ORB bits
              value:
                (ortgDiag.fgPart + ortgDiag.astPart) *
                (1 - ortgDiag.teamOrbContribPct),
            },
            fgxPoss: {
              value: ortgDiag.fgxPoss,
            },
            ftxPoss: {
              value: ortgDiag.ftxPoss,
            },
            fgPoss: {
              value: ortgDiag.threePoss + ortgDiag.rimPoss + ortgDiag.midPoss,
            },
            ftPoss: {
              value:
                ortgDiag.ftPart * (1 - ortgDiag.teamOrbContribPct) +
                ortgDiag.ftxPoss,
              extraInfo: `Raw: [${ortgDiag.ftPoss.toFixed(1)}]`,
            },
            astPoss: {
              value: ortgDiag.astThreePoss + ortgDiag.astTwoPoss,
            },
            orbPoss: {
              value: ortgDiag.orbPart,
            },
          }
        : {}),
    };
  } else {
    return {
      title,
      ...(teamDisplay ? { team: teamDisplay(point.seriesId) } : {}),
    };
  }
}

const dataColKeys = [
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
].concat(
  offDebugMode
    ? [
        "totPoss",
        "scPoss",
        "fgxPoss",
        "ftxPoss",
        "fgPoss",
        "fgPts",
        "ftPoss",
        "astPoss",
        "orbPoss",
      ]
    : [],
);

/** Build total row (appended at end, not sorted) */
function buildTotalRow(
  rows: Record<string, { value: number } | React.ReactNode>[],
  possPerGame: [number, number] | undefined,
  avgEff: number,
  scaleType: "P%" | "T%" | "/G",
  seasonStats: boolean,
): Record<string, { value: number } | React.ReactNode> {
  const weightByPoss = scaleType === "P%";

  const total: Record<string, { value: number } | React.ReactNode> = {
    title: seasonStats ? (
      <OverlayTrigger
        placement="auto"
        overlay={
          <Tooltip id={`impactBreakdown-total`}>
            {weightByPoss
              ? "Note - for players who have missed games uses their season rates stats (not just for games in which they played)"
              : "Note - for players who have missed games uses their rate stats from games in which they played, so totals aren't exactly weighted averages"}
          </Tooltip>
        }
      >
        <i>
          Total<sup>*</sup>
        </i>
      </OverlayTrigger>
    ) : (
      <i>Total</i>
    ),
  };
  const totalOffTeamPossPct = weightByPoss
    ? _.sumBy(rows, (r) => (r.off_team_poss_pct as any)?.value ?? 0)
    : 1.0;
  const totalDefTeamPossPct = weightByPoss
    ? _.sumBy(rows, (r) => (r.def_team_poss_pct as any)?.value ?? 0)
    : 1.0;
  for (const key of dataColKeys) {
    const sum = _.sumBy(rows, (r) => {
      const v = r[key];
      const valToSum =
        typeof v === "object" && v !== null && "value" in v
          ? (v as { value: number }).value
          : 0;
      if (weightByPoss) {
        const weightToUse = key.startsWith("off_")
          ? ((r.off_team_poss_pct as any)?.value ?? 0)
          : ((r.def_team_poss_pct as any)?.value ?? 0);
        return 5 * valToSum * weightToUse;
      } else {
        return valToSum;
      }
    });
    const totalWeightToUse = key.startsWith("off_")
      ? totalOffTeamPossPct
      : totalDefTeamPossPct;
    total[key] = { value: sum / (totalWeightToUse || 1) };
  }
  // If different number of possessions then add a final adjustment:
  if (scaleType === "/G" && possPerGame && possPerGame[0] != possPerGame[1]) {
    const [offPoss, defPoss] = possPerGame;
    const keyToAdjust = "def_adj_rapm"; //(always adjust defense, effectively by winning the tip you've saved a defensive possession)
    const possDelta = (offPoss - defPoss) * 100;
    const deltaPts = (offPoss - defPoss) * avgEff;
    (total[keyToAdjust] as any).value =
      ((total[keyToAdjust] as any).value ?? 0) + deltaPts;
    (total[keyToAdjust] as any).extraInfo =
      `Off-Def possession delta of [${possDelta.toFixed(1)}]: adjust by [${deltaPts.toFixed(1)}]pts`;
  }
  // Handle RAPM diff separately to work around possession differences:
  total["diff_adj_rapm"] = {
    value:
      ((total["off_adj_rapm"] as any)?.value ?? 0) +
      ((total["def_adj_rapm"] as any)?.value ?? 0),
  };

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
  showWalkOns,
  teamDisplay,
}) => {
  const [sortBy, setSortBy] = React.useState(
    IndivTableDefs.defaultImpactDecompSortBy,
  );
  const [sortMenuState, setSortMenuState] = React.useState<
    TableSortPopupMenuState | undefined
  >(undefined);

  const sortOptions = IndivTableDefs.impactDecompSortOptions;
  const handleSortMenuClick = (value: string) => {
    setSortMenuState(undefined);
    setSortBy(value || IndivTableDefs.defaultImpactDecompSortBy);
  };

  const tableDefs =
    showTeamColumn || offDebugMode || defDebugMode
      ? adjustTableDefs(showTeamColumn)
      : tableDefsBase;
  const sortKey = sortBy.split(":")[1];
  const sortDir = sortBy.startsWith("desc") ? "desc" : "asc";

  const unsortedRowsData = playerPoints.map((point) =>
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
  const playerRowsData = _.orderBy(
    unsortedRowsData,
    [
      (row) => {
        const v = row[sortKey];
        return typeof v === "object" && v !== null && "value" in v
          ? (v as { value: number }).value
          : 0;
      },
    ],
    [sortDir],
  );

  const totalRowData = buildTotalRow(
    playerRowsData,
    playerPoints[0]?.perGamePoss,
    avgEfficiency,
    scaleType,
    Boolean(seasonStats),
  );

  const subHeaderRow = showTeamColumn
    ? []
    : [
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
        ),
      ];

  const tableRows: GenericTableRow[] = subHeaderRow
    .concat(
      playerRowsData
        .filter((rowData) => {
          return !(
            !showWalkOns &&
            ((rowData.off_team_poss_pct as any)?.value ?? 0) <
              (seasonStats ? 0.1 : 0.05) &&
            ((rowData.def_team_poss_pct as any)?.value ?? 0) <
              (seasonStats ? 0.1 : 0.05)
          );
        })
        .map((rowData) =>
          GenericTableOps.buildDataRow(
            rowData,
            identityPrefix,
            noCellMeta,
            tableDefs,
          ),
        ),
    )
    .concat(
      !showTeamColumn
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
    <>
      <GenericTable
        tableCopyId={`playTypeStats_${team.replace(/[^a-zA-Z]/g, "")}`}
        tableFields={tableDefs}
        tableData={tableRows}
        cellTooltipMode="missing"
        sortField={IndivTableDefs.impactDecompSortField(
          sortBy,
          IndivTableDefs.defaultImpactDecompSortBy,
        )}
        onHeaderClick={IndivTableDefs.buildImpactDecompSortCallback(
          sortBy,
          sortOptions,
          setSortMenuState,
        )}
      />
      <TableSortPopupMenu
        state={sortMenuState}
        onClick={handleSortMenuClick}
        onClose={() => setSortMenuState(undefined)}
      />
    </>
  );
};

export default PlayerImpactBreakdownTable;
