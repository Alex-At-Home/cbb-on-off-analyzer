import React, { useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import {
  SimilarityDiagnostics,
  ComponentScore,
  StatBreakdown,
} from "../../utils/stats/PlayerSimilarityUtils";
import { SimilarityConfig } from "../../utils/FilterModels";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";

// Global debug flag to show z-scores in component names
const debugShowZScores = false;

interface Props {
  diagnostics: SimilarityDiagnostics;
  config: SimilarityConfig;
}

// Style groupings for better organization
const styleGroups = {
  "On-Ball": [
    "Rim Attack",
    "Attack & Kick",
    "Dribble Jumper",
    "Hits Cutter",
    "PnR Passer",
    "Post-Up",
    "Post & Kick",
  ],
  "Off-Ball": [
    "Perimeter Sniper",
    "Mid-Range",
    "Backdoor Cut",
    "Big Cut & Roll",
    "Pick & Pop",
    "High-Low",
    "Put-Back",
  ],
  Transition: ["Transition"],
};

export class PlayerSimilarityTableUtils {
  /** Convert z-score to similarity percentage (0 z-score = 100%, higher abs values = lower %) */
  private static zScoreToPercentage = (zScore: number): number => {
    const absZScore = Math.abs(zScore);
    return Math.max(0, Math.min(100, ((3 - absZScore) / 3) * 100));
  };

  /** Get color for z-score based on similarity percentage */
  private static getZScoreColor = (zScore: number): string => {
    const percentage =
      PlayerSimilarityTableUtils.zScoreToPercentage(zScore) / 100;
    // Use 0=red (poor match), 1=green (good match)
    return CbbColors.getRedToGreen().domain([0, 1])(percentage).toString();
  };

  /** Group stats by style categories */
  private static groupStatsByCategory = (breakdown: StatBreakdown[]) => {
    const grouped: Record<string, StatBreakdown[]> = {
      "On-Ball": [],
      "Off-Ball": [],
      Transition: [],
      Other: [],
    };

    breakdown.forEach((stat) => {
      let category = "Other";
      for (const [groupName, styles] of Object.entries(styleGroups)) {
        if (styles.some((style) => stat.name.includes(style))) {
          category = groupName;
          break;
        }
      }
      grouped[category].push(stat);
    });

    return grouped;
  };

  /** Categorize stats as Good or Bad based on z-score thresholds */
  private static categorizeStats = (breakdown: StatBreakdown[]) => {
    const good: StatBreakdown[] = [];
    const bad: StatBreakdown[] = [];

    breakdown.forEach((stat) => {
      const absZScore = Math.abs(stat.zScore);
      if (absZScore < 0.75) {
        good.push(stat);
      } else if (absZScore > 1.5) {
        bad.push(stat);
      }
    });

    return { good, bad };
  };

  /** Build diagnostic content for use within a table row */
  static readonly buildDiagnosticContent = (
    diagnostics: SimilarityDiagnostics,
    config: SimilarityConfig
  ): React.ReactElement => {
    const DiagnosticContent = () => {
      const [showDetails, setShowDetails] = useState(false);
      const componentData =
        PlayerSimilarityTableUtils.calculateComponentDisplayData(
          diagnostics,
          config
        );

      return (
        <div className="border-top">
          {/* Summary row */}
          <div className="d-flex flex-wrap justify-content-center align-items-center p-2 small">
            {componentData.map((component, index) => (
              <React.Fragment key={component.cleanName}>
                <div className="d-flex align-items-center">
                  <strong>
                    {component.name}:
                    {debugShowZScores && (
                      <span className="text-muted font-weight-normal ml-1">
                        ({component.avgZScore.toFixed(3)})
                      </span>
                    )}
                  </strong>
                  <span className="ml-1">
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip
                          id={`tooltip-${component.cleanName}-breakdown`}
                        >
                          {PlayerSimilarityTableUtils.buildSimpleStatBreakdownTooltip(
                            component.breakdown
                          )}
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
                        <Tooltip id={`tooltip-${component.cleanName}-weight`}>
                          Relative weight - partly from the category slider,
                          partly from the number of stats in the category
                        </Tooltip>
                      }
                    >
                      <span className="text-muted">
                        (x{component.displayWeight}%)
                      </span>
                    </OverlayTrigger>
                  </span>
                </div>
                {index < componentData.length - 1 && (
                  <span className="mx-2 text-muted">/</span>
                )}
              </React.Fragment>
            ))}
            <span className="ml-3">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDetails(!showDetails);
                }}
                className="text-primary small"
              >
                {showDetails ? "hide details" : "more details"}
              </a>
            </span>
          </div>

          {/* Detailed breakdown */}
          {showDetails && (
            <div className="px-2 pb-2">
              <div className="row small">
                {componentData.map((component) => (
                  <div key={component.cleanName} className="col-3">
                    <div className="font-weight-bold mb-1">
                      {component.name}
                      {debugShowZScores && (
                        <span className="text-muted font-weight-normal ml-1">
                          ({component.avgZScore.toFixed(3)})
                        </span>
                      )}
                    </div>
                    <ul
                      className="list-unstyled mb-0"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {component.breakdown
                        .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
                        .filter((stat) => stat.weight > 0.01)
                        .map((stat) => {
                          const percentage =
                            PlayerSimilarityTableUtils.zScoreToPercentage(
                              stat.zScore
                            );
                          const color =
                            PlayerSimilarityTableUtils.getZScoreColor(
                              stat.zScore
                            );

                          return (
                            <li
                              key={stat.name}
                              className="d-flex justify-content-between"
                            >
                              <span>
                                {stat.name}:
                                {debugShowZScores &&
                                  stat.globalStdDev !== undefined && (
                                    <span className="text-muted ml-1">
                                      ({stat.globalStdDev.toFixed(3)})
                                    </span>
                                  )}
                              </span>
                              <span>
                                <span
                                  style={{
                                    color: color,
                                    ...CommonTableDefs.getTextShadow(
                                      { value: percentage / 100 },
                                      CbbColors.off_pctile_qual,
                                      "1px",
                                      2
                                    ),
                                  }}
                                >
                                  {Math.round(percentage)}%
                                </span>
                                <span className="text-muted ml-1">
                                  (x{stat.weight.toFixed(2)})
                                </span>
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    return <DiagnosticContent />;
  };

  /** Calculate display data for each component */
  private static calculateComponentDisplayData = (
    diagnostics: SimilarityDiagnostics,
    config: SimilarityConfig
  ) => {
    const components = [
      {
        name: "Style",
        key: "playStyle" as const,
        weight: config.playStyleWeight,
        cleanName: "style",
      },
      {
        name: "Scoring",
        key: "scoringEfficiency" as const,
        weight: config.scoringEfficiencyWeight,
        cleanName: "scoring",
      },
      {
        name: "Defense",
        key: "defense" as const,
        weight: config.defenseWeight,
        cleanName: "defense",
      },
      {
        name: "Info",
        key: "playerInfo" as const,
        weight: config.playerInfoWeight,
        cleanName: "info",
      },
    ];

    // Calculate total actual weight (sum of all per-element weights across components)
    const totalActualWeight = components.reduce((sum, comp) => {
      const componentScore = diagnostics.componentScores[comp.key];
      return sum + componentScore.totalWeight;
    }, 0);

    return components.map((component) => {
      const componentScore = diagnostics.componentScores[component.key];

      // Calculate normalized score (0-100% where 100% = 0 z-score, 0% = 3 z-score)
      const avgZScore =
        componentScore.totalWeight > 0
          ? componentScore.weightedZScoreSum / componentScore.totalWeight
          : 0;
      const normalizedScore = Math.max(
        0,
        Math.min(100, ((3 - avgZScore) / 3) * 100)
      );

      // Calculate relative weight percentage based on actual per-element weights
      const relativeWeight =
        totalActualWeight > 0
          ? (componentScore.totalWeight / totalActualWeight) * 100
          : 25; // Equal weights if no data

      // Keep name clean for display logic
      const displayName = component.name;

      return {
        name: displayName,
        cleanName: component.cleanName, // For tooltip IDs
        displayScore: Math.round(normalizedScore),
        normalizedScore: normalizedScore / 100, // For color calculation (0-1 range)
        displayWeight: Math.round(relativeWeight),
        avgZScore: Math.abs(avgZScore), // For debug display
        breakdown: componentScore.statBreakdown,
      };
    });
  };

  /** Build simplified tooltip content showing Good/Bad categorization */
  private static buildSimpleStatBreakdownTooltip = (
    breakdown: StatBreakdown[]
  ): React.ReactElement => {
    const { good, bad } = PlayerSimilarityTableUtils.categorizeStats(breakdown);

    return (
      <div
        style={{
          maxWidth: "280px",
          color: "white",
          padding: "8px",
        }}
      >
        <div className="font-weight-bold mb-2">Component Breakdown</div>

        {good.length > 0 && (
          <div className="mb-2">
            <div
              style={{
                color: CbbColors.getRedToGreen().domain([0, 1])(1).toString(),
              }}
              className="font-weight-bold"
            >
              Good Matches:
            </div>
            {good
              .filter((stat) => stat.weight >= 0.01)
              .map((stat) => {
                const percentage =
                  PlayerSimilarityTableUtils.zScoreToPercentage(stat.zScore);
                return (
                  <div
                    key={stat.name}
                    className="d-flex justify-content-between"
                  >
                    <span>{stat.name}:</span>
                    <span
                      style={{
                        color: PlayerSimilarityTableUtils.getZScoreColor(
                          stat.zScore
                        ),
                      }}
                    >
                      {Math.round(percentage)}%
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {bad.length > 0 && (
          <div>
            <div
              style={{
                color: CbbColors.getRedToGreen().domain([0, 1])(0).toString(),
              }}
              className="font-weight-bold"
            >
              Poor Matches:
            </div>
            {bad.map((stat) => {
              const percentage = PlayerSimilarityTableUtils.zScoreToPercentage(
                stat.zScore
              );
              return (
                <div key={stat.name} className="d-flex justify-content-between">
                  <span>{stat.name}:</span>
                  <span
                    style={{
                      color: PlayerSimilarityTableUtils.getZScoreColor(
                        stat.zScore
                      ),
                    }}
                  >
                    {Math.round(percentage)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {good.length === 0 && bad.length === 0 && (
          <div className="text-muted">
            All matches are moderate (0.75 ≤ |z| ≤ 1.5)
          </div>
        )}
      </div>
    );
  };
}
