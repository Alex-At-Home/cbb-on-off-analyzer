import React, { useState } from "react";
import { GradeUtils } from "../../utils/stats/GradeUtils";
import { DivisionStatistics } from "../../utils/StatModels";
import {
  buildPortalOverallCaveats,
  formatCategoryLabel,
  portalEvalLeagueLabelForViewer,
  statisticToD1Rank,
} from "../../utils/portal/portalEvalRules";
import {
  runDefenseEvalRules,
  runOffenseEvalRules,
  type PortalEvalOffenseDefenseSnapshot,
} from "../../utils/portal/portalEvalOffDefNotes";

export type PortalProspectEvalBlockProps = {
  tierToUse: DivisionStatistics | undefined;
  /** First segment of grade config, e.g. `"rank"` vs `"pct"`. */
  gradeFormat: string;
  player: Record<string, any>;
  /** D1 efficiency prior for usage / offense comparisons (e.g. KenPom-style). */
  avgEfficiency: number;
  /** Inline content after the Eval link (e.g. “Next year’s RAPM predictions: …”). */
  children: React.ReactNode;
};

function offenseDefenseSnapshotFromPlayer(
  player: Record<string, any>,
  avgEfficiency: number,
): PortalEvalOffenseDefenseSnapshot {
  return {
    def_adj_rapm: player.def_adj_rapm?.value,
    def_adj_rtg: player.def_adj_rtg?.value,
    off_adj_rapm: player.off_adj_rapm?.value,
    off_adj_rtg: player.off_adj_rtg?.value,
    off_rtg: player.off_rtg?.value,
    off_usage: player.off_usage?.value,
    off_usage_pred: player.off_usage_pred?.value,
    off_rtg_pred: player.off_rtg_pred?.value,
    avgEfficiency,
  };
}

const PortalProspectEvalBlock: React.FC<PortalProspectEvalBlockProps> = ({
  tierToUse,
  gradeFormat,
  player,
  avgEfficiency,
  children,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!tierToUse) {
    return <>{children}</>;
  }

  const offPred = player.off_adj_rapm_pred?.value || 0;
  const defPred = player.def_adj_rapm_pred?.value || 0;
  const netPred = offPred - defPred;

  const statsToGrade = {
    off_adj_rapm: player.off_adj_rapm_pred,
    def_adj_rapm: player.def_adj_rapm_pred,
    off_adj_rapm_margin: { value: netPred },
  };
  const fields = [
    "off_adj_rapm",
    "def_adj_rapm",
    "off_adj_rapm_margin",
  ] as const;

  const predictedGrades = GradeUtils.buildPlayerPercentiles(
    tierToUse,
    statsToGrade,
    [...fields],
    gradeFormat === "rank",
  );

  const netRank = statisticToD1Rank(
    predictedGrades.off_adj_rapm_margin as { value?: number; samples?: number },
  );
  const offRank = statisticToD1Rank(
    predictedGrades.off_adj_rapm as { value?: number; samples?: number },
  );
  const defRank = statisticToD1Rank(
    predictedGrades.def_adj_rapm as { value?: number; samples?: number },
  );

  const league = portalEvalLeagueLabelForViewer();

  const caveats = buildPortalOverallCaveats({
    yearClass: player.roster?.year_class,
    teamPossPct: player.off_team_poss_pct?.value,
    rosterHeight: player.roster?.height,
    posFreqs: player.posFreqs,
  });

  const netCat = formatCategoryLabel(netRank);
  const offCat = formatCategoryLabel(offRank);
  const defCat = formatCategoryLabel(defRank);

  const odSnap = offenseDefenseSnapshotFromPlayer(player, avgEfficiency);
  const offenseNotes = runOffenseEvalRules(odSnap);
  const defenseNotes = runDefenseEvalRules(odSnap);

  return (
    <>
      <span>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "(Eval−)" : "(Eval+)"}
        </a>{" "}
        {children}
      </span>
      {expanded ? (
        <div className="d-block small mt-1 mb-1">
          <div>
            Overall: {league} <strong>{netCat}</strong>
          </div>
          {caveats.length > 0 ? (
            <ul className="mt-1 mb-2 ps-3">
              {caveats.map((c, i) => (
                <li key={`caveat-${i}`}>Caveat: {c}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2">
            Offense: <strong>{offCat}</strong>
          </div>
          {offenseNotes.length > 0 ? (
            <ul className="mt-1 mb-2 ps-3">
              {offenseNotes.map((n, i) => (
                <li key={`off-${i}`}>{n}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2">
            Defense: <strong>{defCat}</strong>
          </div>
          {defenseNotes.length > 0 ? (
            <ul className="mt-1 mb-0 ps-3">
              {defenseNotes.map((n, i) => (
                <li key={`def-${i}`}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default PortalProspectEvalBlock;
