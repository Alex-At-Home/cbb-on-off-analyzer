import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { SimilarityDiagnostics, ComponentScore, StatBreakdown } from "../../utils/stats/PlayerSimilarityUtils";
import { SimilarityConfig } from "../../utils/FilterModels";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";

interface Props {
  diagnostics: SimilarityDiagnostics;
  config: SimilarityConfig;
}

export class PlayerSimilarityTableUtils {
  
  /** Build diagnostic content for use within a table row */
  static readonly buildDiagnosticContent = (
    diagnostics: SimilarityDiagnostics,
    config: SimilarityConfig
  ): React.ReactElement => {

    const componentData = PlayerSimilarityTableUtils.calculateComponentDisplayData(diagnostics, config);

    return (
      <div className="border-top">
        <div className="d-flex flex-wrap justify-content-center align-items-center p-2 small">
          {componentData.map((component, index) => (
            <React.Fragment key={component.name}>
              <div className="d-flex align-items-center">
                <strong>{component.name}:</strong>
                <span className="ml-1">
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-${component.name.toLowerCase()}-breakdown`}>
                        {PlayerSimilarityTableUtils.buildStatBreakdownTooltip(component.breakdown)}
                      </Tooltip>
                    }
                  >
                    <span
                      style={CommonTableDefs.getTextShadow(
                        { value: component.normalizedScore },
                        CbbColors.off_pctile_qual,
                        "20px",
                        4
                      )}
                    >
                      {component.displayScore}%
                    </span>
                  </OverlayTrigger>
                </span>
                <span className="ml-1">
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-${component.name.toLowerCase()}-weight`}>
                        Base relative weight, before applying slider bonus/penalty
                      </Tooltip>
                    }
                  >
                    <span className="text-muted">
                      (x{component.displayWeight}%)
                    </span>
                  </OverlayTrigger>
                </span>
              </div>
              {index < componentData.length - 1 && <span className="mx-2 text-muted">/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  /** Calculate display data for each component */
  private static calculateComponentDisplayData = (
    diagnostics: SimilarityDiagnostics,
    config: SimilarityConfig
  ) => {
    const components = [
      { name: 'Style', key: 'playStyle' as const, weight: config.playStyleWeight },
      { name: 'Scoring', key: 'scoringEfficiency' as const, weight: config.scoringEfficiencyWeight },
      { name: 'Defense', key: 'defense' as const, weight: config.defenseWeight },
      { name: 'Info', key: 'playerInfo' as const, weight: config.playerInfoWeight },
    ];

    // Calculate total config weight for relative percentages
    const totalConfigWeight = components.reduce((sum, comp) => sum + comp.weight, 0);

    return components.map(component => {
      const componentScore = diagnostics.componentScores[component.key];
      
      // Calculate normalized score (0-100% where 100% = 0 z-score, 0% = 3 z-score)
      const avgZScore = componentScore.totalWeight > 0 
        ? componentScore.weightedZScoreSum / componentScore.totalWeight 
        : 0;
      const normalizedScore = Math.max(0, Math.min(100, (3 - avgZScore) / 3 * 100));
      
      // Calculate relative weight percentage
      const relativeWeight = totalConfigWeight > 0 
        ? (component.weight / totalConfigWeight) * 100 
        : 25; // Equal weights if no config

      return {
        name: component.name,
        displayScore: Math.round(normalizedScore),
        normalizedScore: normalizedScore / 100, // For color calculation (0-1 range)
        displayWeight: Math.round(relativeWeight),
        breakdown: componentScore.statBreakdown,
      };
    });
  };

  /** Build tooltip content for stat breakdown */
  private static buildStatBreakdownTooltip = (breakdown: StatBreakdown[]): React.ReactElement => {
    // Show top 3 and bottom 3 stats, or all if <= 6 stats
    const sortedStats = [...breakdown].sort((a, b) => b.weightedAbsoluteZScore - a.weightedAbsoluteZScore);
    
    let statsToShow: StatBreakdown[];
    if (sortedStats.length <= 6) {
      statsToShow = sortedStats;
    } else {
      const top3 = sortedStats.slice(0, 3);
      const bottom3 = sortedStats.slice(-3);
      statsToShow = [...top3, ...bottom3];
    }

    return (
      <div style={{ maxWidth: '300px' }}>
        <div className="font-weight-bold mb-1">Component Breakdown:</div>
        {statsToShow.map((stat, index) => {
          const isTop3 = index < 3 || sortedStats.length <= 6;
          const isSeparator = index === 3 && sortedStats.length > 6;
          
          return (
            <React.Fragment key={`${stat.name}-${index}`}>
              {isSeparator && <div className="my-1 text-muted">...</div>}
              <div className={`d-flex justify-content-between ${isTop3 ? '' : 'text-muted'}`}>
                <span>{stat.name}:</span>
                <span>
                  z={stat.zScore.toFixed(2)}, w={stat.weight.toFixed(3)} 
                  (={stat.weightedAbsoluteZScore.toFixed(3)})
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };
}
