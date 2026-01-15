import React from "react";
import {
  SimilarityDiagnostics,
  StatBreakdown,
} from "../../utils/stats/PlayerSimilarityUtils";
import { SimilarityConfig } from "../../utils/FilterModels";
import { CbbColors } from "../../utils/CbbColors";

// Global debug flag to show z-scores in component names
export const debugShowZScores = false;

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
  // Re-export debug flag for easy access
  static readonly debugShowZScores = debugShowZScores;
  /** Convert z-score to similarity percentage (0 z-score = 100%, higher abs values = lower %) */
  static zScoreToPercentage = (zScore: number): number => {
    const absZScore = Math.abs(zScore);
    return Math.max(0, Math.min(100, ((3 - absZScore) / 3) * 100));
  };

  static getColorScheme(theme: string | undefined) {
    if (theme == "dark") {
      return CbbColors.getRedToGreen().domain([0, 1]);
    } else {
      return CbbColors.getRedToGreenViaGrey().domain([0, 1]);
    }
  }

  /** Get color for z-score based on similarity percentage */
  static getZScoreColor = (
    zScore: number,
    theme: string | undefined
  ): string => {
    const percentage =
      PlayerSimilarityTableUtils.zScoreToPercentage(zScore) / 100;
    // Use 0=red (poor match), 1=green (good match)
    return PlayerSimilarityTableUtils.getColorScheme(theme)(
      percentage
    ).toString();
  };

  /** Group stats by style categories */
  static groupStatsByCategory = (breakdown: StatBreakdown[]) => {
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
  static categorizeStats = (breakdown: StatBreakdown[]) => {
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


  /** Calculate display data for each component */
  static calculateComponentDisplayData = (
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
  static buildSimpleStatBreakdownTooltip = (
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
                color:
                  PlayerSimilarityTableUtils.getColorScheme("dark")(
                    1
                  ).toString(),
              }}
              className="font-weight-bold"
            >
              Good Matches:
            </div>
            {good
              .filter((stat) => stat.weight >= 0.01 && stat.globalStdDev > 0)
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
                          stat.zScore,
                          "dark"
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
                color:
                  PlayerSimilarityTableUtils.getColorScheme("dark")(
                    0
                  ).toString(),
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
                        stat.zScore,
                        "dark"
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
