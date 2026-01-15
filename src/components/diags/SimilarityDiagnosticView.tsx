import React, { useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import {
  SimilarityDiagnostics,
} from "../../utils/stats/PlayerSimilarityUtils";
import { SimilarityConfig } from "../../utils/FilterModels";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";
import { PlayerSimilarityTableUtils, debugShowZScores } from "../shared/PlayerSimilarityTableUtils";

interface Props {
  diagnostics: SimilarityDiagnostics;
  config: SimilarityConfig;
  theme?: string;
}

const SimilarityDiagnosticView: React.FunctionComponent<Props> = ({
  diagnostics,
  config,
  theme,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const componentData = PlayerSimilarityTableUtils.calculateComponentDisplayData(
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
                    <Tooltip id={`tooltip-${component.cleanName}-breakdown`}>
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
                      Relative weight - partly from the category slider, partly
                      from the number of stats in the category
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
                <ul className="list-unstyled mb-0" style={{ fontSize: "0.8rem" }}>
                  {component.breakdown
                    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
                    .filter((stat) => stat.weight > 0.01 && stat.globalStdDev > 0)
                    .map((stat) => {
                      const percentage = PlayerSimilarityTableUtils.zScoreToPercentage(
                        stat.zScore
                      );
                      const color = PlayerSimilarityTableUtils.getZScoreColor(
                        stat.zScore,
                        theme
                      );

                      return (
                        <li
                          key={stat.name}
                          className="d-flex justify-content-between"
                        >
                          <span>
                            {stat.name}:
                            {PlayerSimilarityTableUtils.debugShowZScores &&
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

export default SimilarityDiagnosticView;
