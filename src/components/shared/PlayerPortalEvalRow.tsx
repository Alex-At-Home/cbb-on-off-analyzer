import React, { ReactNode } from "react";
import _ from "lodash";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import {
  DivisionStatsCache,
  GradeTableUtils,
  PositionStatsCache,
} from "../../utils/tables/GradeTableUtils";
import { GradeUtils } from "../../utils/stats/GradeUtils";
import { CbbColors } from "../../utils/CbbColors";
import PortalProspectEvalBlock from "../portal/PortalProspectEvalBlock";

export type PlayerPortalEvalRowProps = {
  /** Row with `*_pred` stats (from API or merged after `approxTransferPrediction`). */
  player: Record<string, any>;
  gender: string;
  showGrades: string | undefined;
  divisionStatsCache: Record<string, DivisionStatsCache>;
  positionalStatsCache: Record<string, PositionStatsCache>;
  /** Season year key used with division / positional caches (`player.year` wins when present). */
  year: string;
  avgEfficiency: number;
  /** Career table: expand the first season’s eval panel by default. */
  defaultExpanded?: boolean;
  /** Leaderboard wraps in `<span>` for layout next to adjacent snippets. */
  wrapInSpan?: boolean;
  /** With `playerIndex`, only compute percentile grades for the first N rows (leaderboard perf). */
  maxPlayersForGrades?: number;
  playerIndex?: number;
};

const PlayerPortalEvalRow: React.FC<PlayerPortalEvalRowProps> = ({
  player,
  gender,
  showGrades,
  divisionStatsCache,
  positionalStatsCache,
  year,
  avgEfficiency,
  defaultExpanded,
  wrapInSpan,
  maxPlayersForGrades,
  playerIndex,
}) => {
  const yrKey = player.year || year;
  const divisionStatsCacheByYear = divisionStatsCache[yrKey] || {};

  const { tierToUse: predTierToUse, gradeFormat: predGradeFormat } =
    GradeTableUtils.buildPlayerTierInfo(
      showGrades || "rank:Combo",
      {
        comboTier: divisionStatsCacheByYear.Combo,
        highTier: divisionStatsCacheByYear.High,
        mediumTier: divisionStatsCacheByYear.Medium,
        lowTier: divisionStatsCacheByYear.Low,
      },
      positionalStatsCache[yrKey] || {},
    );

  const offPred = player.off_adj_rapm_pred?.value || 0;
  const defPred = player.def_adj_rapm_pred?.value || 0;
  const netPred = offPred - defPred;
  const offRtgPred = player.off_rtg_pred?.value || 100;
  const offUsagePred = (player.off_usage_pred?.value || 0.2) * 100;

  const netPredWithShadow = (
    <b
      style={CommonTableDefs.getTextShadow(
        { value: netPred },
        CbbColors.diff10_p100_redGreen[0],
        "15px",
        6,
      )}
    >
      {netPred.toFixed(1)}
    </b>
  );
  const offPredWithShadow = (
    <b
      style={CommonTableDefs.getTextShadow(
        { value: offPred },
        CbbColors.diff10_p100_redGreen[0],
        "15px",
        6,
      )}
    >
      {offPred.toFixed(1)}
    </b>
  );
  const defPredWithShadow = (
    <b
      style={CommonTableDefs.getTextShadow(
        { value: defPred },
        CbbColors.diff10_p100_redGreen[1],
        "15px",
        6,
      )}
    >
      {defPred.toFixed(1)}
    </b>
  );
  const offRtgWithShadow = (
    <b
      style={CommonTableDefs.getTextShadow(
        { value: offRtgPred },
        CbbColors.pp100[0],
        "15px",
        6,
      )}
    >
      {offRtgPred.toFixed(1)}
    </b>
  );
  const usageWithShadow = (
    <b
      style={CommonTableDefs.getTextShadow(
        { value: offUsagePred * 0.01 },
        CbbColors.usg[0],
        "15px",
        6,
      )}
    >
      {offUsagePred.toFixed(1)}
    </b>
  );

  const shouldComputeGrades =
    Boolean(showGrades) &&
    (maxPlayersForGrades === undefined ||
      (playerIndex !== undefined && playerIndex < maxPlayersForGrades));

  let netGrade: ReactNode;
  let offGrade: ReactNode;
  let defGrade: ReactNode;
  let offRtgGrade: ReactNode;
  let usageGrade: ReactNode;

  if (shouldComputeGrades) {
    const statsToGrade = {
      off_adj_rapm: player.off_adj_rapm_pred,
      def_adj_rapm: player.def_adj_rapm_pred,
      off_adj_rapm_margin: { value: netPred },
      off_rtg: player.off_rtg_pred,
      off_usage: player.off_usage_pred,
    };

    const predictedGrades = predTierToUse
      ? GradeUtils.buildPlayerPercentiles(
          predTierToUse,
          statsToGrade,
          _.keys(statsToGrade),
          predGradeFormat == "rank",
        )
      : {};

    netGrade = predictedGrades.off_adj_rapm_margin ? (
      <small>
        &nbsp;(
        {GradeTableUtils.buildPlayerGradeTextElement(
          predictedGrades.off_adj_rapm_margin,
          predGradeFormat,
          CbbColors.off_pctile_qual,
        )}
        )
      </small>
    ) : undefined;

    offGrade = predictedGrades.off_adj_rapm ? (
      <small>
        &nbsp;(
        {GradeTableUtils.buildPlayerGradeTextElement(
          predictedGrades.off_adj_rapm,
          predGradeFormat,
          CbbColors.off_pctile_qual,
        )}
        )
      </small>
    ) : undefined;

    defGrade = predictedGrades.def_adj_rapm ? (
      <small>
        &nbsp;(
        {GradeTableUtils.buildPlayerGradeTextElement(
          predictedGrades.def_adj_rapm,
          predGradeFormat,
          CbbColors.off_pctile_qual,
        )}
        )
      </small>
    ) : undefined;

    offRtgGrade = predictedGrades.off_rtg ? (
      <small>
        &nbsp;(
        {GradeTableUtils.buildPlayerGradeTextElement(
          predictedGrades.off_rtg,
          predGradeFormat,
          CbbColors.off_pctile_qual,
        )}
        )
      </small>
    ) : undefined;

    usageGrade = predictedGrades.off_usage ? (
      <small>
        &nbsp;(
        {GradeTableUtils.buildPlayerGradeTextElement(
          predictedGrades.off_usage,
          predGradeFormat,
          CbbColors.all_pctile_freq,
        )}
        )
      </small>
    ) : undefined;
  }

  const smallComp1 = (
    <small>
      <b>Next year&apos;s RAPM predictions</b>
    </small>
  );
  const smallComp2 = <small>//</small>;
  const smallComp3 = (
    <small>
      {" "}
      // off rating=[{offRtgWithShadow}]{offRtgGrade} usage=[{usageWithShadow}]%
      {usageGrade}
    </small>
  );

  const block = (
    <PortalProspectEvalBlock
      tierToUse={predTierToUse}
      gradeFormat={predGradeFormat}
      player={player}
      gender={gender}
      avgEfficiency={avgEfficiency}
      defaultExpanded={defaultExpanded}
    >
      {smallComp1}: net=[{netPredWithShadow}]{netGrade} {smallComp2} off=[
      {offPredWithShadow}]{offGrade} def=[{defPredWithShadow}]{defGrade}
      {smallComp3}
    </PortalProspectEvalBlock>
  );

  if (wrapInSpan) {
    return <span>{block}</span>;
  }
  return block;
};

export default PlayerPortalEvalRow;
