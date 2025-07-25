// React imports:
import React, { useState } from "react";

// Next imports:
import { NextPage } from "next";

import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

// Utils
import { PositionUtils } from "../../utils/stats/PositionUtils";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../GenericTable";

const tooltipTradPosGenerator = (pos: string) => {
  return `% Fit of the player vs signature stats associated with players traditionally called [${pos}]`;
};

const tooltipWeightGenerator = (pos: string) => {
  return `The weight associated with this feature for the position [${pos}]`;
};

const tooltipAverageGenerator = (pos: string) => {
  return `The average for this feature for the players in the training set for position [${pos}]`;
};

const tooltipContribGenerator = (pos: string) => {
  return `A relative value for much this feature improves/reduces the chance of this player's fit for this position ([${pos}])`;
};

// Table defs
const simpleDiagTable = {
  title: GenericTableOps.addTitle(
    "",
    "The positional class associated with this player's statistical signature"
  ),
  sep0: GenericTableOps.addColSeparator(),
  pos_pg: GenericTableOps.addPctCol(
    "PG%",
    tooltipTradPosGenerator("Point Guard"),
    GenericTableOps.defaultColorPicker
  ),
  pos_sg: GenericTableOps.addPctCol(
    "SG%",
    tooltipTradPosGenerator("Shooting Guard"),
    GenericTableOps.defaultColorPicker
  ),
  pos_sf: GenericTableOps.addPctCol(
    "SF%",
    tooltipTradPosGenerator("Small Forward"),
    GenericTableOps.defaultColorPicker
  ),
  pos_pf: GenericTableOps.addPctCol(
    "PF%",
    tooltipTradPosGenerator("Power Forward"),
    GenericTableOps.defaultColorPicker
  ),
  pos_c: GenericTableOps.addPctCol(
    "C%",
    tooltipTradPosGenerator("Center"),
    GenericTableOps.defaultColorPicker
  ),
};

/** Assigns different color maps for the single featyre value column */
const colorPicker = (val: any, valMeta: string) => {
  const num = val.value as number;
  switch (valMeta) {
    case "off_assist":
      return CbbColors.p_ast_offDef(num);
    case "off_to":
      return CbbColors.off_TO(num);
    case "off_3pr":
      return CbbColors.fgr_offDef(num);
    case "off_2pmidr":
      return CbbColors.fgr_offDef(num);
    case "off_2primr":
      return CbbColors.fgr_offDef(num);
    case "off_ftr":
      return CbbColors.off_FTR(num);
    case "off_orb":
      return CbbColors.p_off_OR(num);
    case "off_drb":
      return CbbColors.p_def_OR(num);
    case "def_to":
      return CbbColors.p_def_TO(num);
    case "def_2prim":
      return CbbColors.p_def_2P_rim(num);
    case "def_ftr":
      return CbbColors.alwaysWhite(num);
    default:
      return undefined;
  }
};

const complexDiagTable = {
  feature: GenericTableOps.addTitle(
    "",
    "Each of the statistical features used in the classification",
    CommonTableDefs.singleLineRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter
  ),
  sep0: GenericTableOps.addColSeparator(),
  player: GenericTableOps.addPctCol(
    "Player %",
    "The value of this player vs this statistic",
    colorPicker
  ),
  sep1: GenericTableOps.addColSeparator(),
  pos_pg: GenericTableOps.addPctCol(
    "Wt PG",
    tooltipWeightGenerator("Point Guard"),
    GenericTableOps.defaultColorPicker
  ),
  av_pos_pg: GenericTableOps.addPctCol(
    "Av PG",
    tooltipAverageGenerator("Point Guard"),
    colorPicker
  ),
  contrib_pos_pg: GenericTableOps.addPctCol(
    "+- PG%",
    tooltipContribGenerator("Point Guard"),
    CbbColors.varPicker(CbbColors.posColors)
  ),
  sep2: GenericTableOps.addColSeparator(),
  pos_sg: GenericTableOps.addPctCol(
    "Wt SG",
    tooltipWeightGenerator("Shooting Guard"),
    GenericTableOps.defaultColorPicker
  ),
  av_pos_sg: GenericTableOps.addPctCol(
    "Av SG",
    tooltipAverageGenerator("Shooting Guard"),
    colorPicker
  ),
  contrib_pos_sg: GenericTableOps.addPctCol(
    "+- SG%",
    tooltipContribGenerator("Shooting Guard"),
    CbbColors.varPicker(CbbColors.posColors)
  ),
  sep3: GenericTableOps.addColSeparator(),
  pos_sf: GenericTableOps.addPctCol(
    "Wt SF",
    tooltipWeightGenerator("Small Forward"),
    GenericTableOps.defaultColorPicker
  ),
  av_pos_sf: GenericTableOps.addPctCol(
    "Av SF",
    tooltipAverageGenerator("Small Forward"),
    colorPicker
  ),
  contrib_pos_sf: GenericTableOps.addPctCol(
    "+- SF%",
    tooltipContribGenerator("Small Forward"),
    CbbColors.varPicker(CbbColors.posColors)
  ),
  sep4: GenericTableOps.addColSeparator(),
  pos_pf: GenericTableOps.addPctCol(
    "Wt PF",
    tooltipWeightGenerator("Power Forward"),
    GenericTableOps.defaultColorPicker
  ),
  av_pos_pf: GenericTableOps.addPctCol(
    "Av PF",
    tooltipAverageGenerator("Power Forward"),
    colorPicker
  ),
  contrib_pos_pf: GenericTableOps.addPctCol(
    "+- PF%",
    tooltipContribGenerator("Power Forward"),
    CbbColors.varPicker(CbbColors.posColors)
  ),
  sep5: GenericTableOps.addColSeparator(),
  pos_c: GenericTableOps.addPctCol(
    "Wt C",
    tooltipWeightGenerator("Center"),
    GenericTableOps.defaultColorPicker
  ),
  av_pos_c: GenericTableOps.addPctCol(
    "Av C",
    tooltipAverageGenerator("Center"),
    colorPicker
  ),
  contrib_pos_c: GenericTableOps.addPctCol(
    "+- C%",
    tooltipContribGenerator("Center"),
    CbbColors.varPicker(CbbColors.posColors)
  ),
};

const calculatedDescriptions = {
  calc_ast_tov: ["A/TOV", "Assist to Turnover ratio in selected lineups"],
  calc_three_relative: [
    "3PQ%",
    "A measure of how good a player is at shooting 3s relative to their overall scoring efficiency (1.5*3P%/eFG)",
  ],
  calc_mid_relative: [
    "2PQ% mid",
    "A measure of how good a player is at shooting mid-range 2s relative to their overall scoring efficiency (2P% mid/eFG)",
  ],
  calc_rim_relative: [
    "2PQ% rim",
    "A measure of how good a player is at shooting layups/posts/drunks relative to their overall scoring efficiency (2P% rim/eFG)",
  ],
  calc_assist_per_fga: [
    "A/FG%",
    "The ratio of Assists to FG attempts, expressed as a %",
  ],
  calc_ft_relative_inv: [
    "FGCZ%",
    "(FG Comfort Zone) A very approximate measure of how easy/tough the shots a player takes relative to their overall shooting ability (eFG/FT%) - the lower the number the tougher the shots the player takes.",
  ],
} as Record<string, [string, string]>;

const complexDiagSubtitles = {
  calc_ast_tov: "Ball-Handling",
  off_3pr: "Shot Selection",
  calc_three_relative: "Shot-Making",
  def_to: "Rebounding and Defense",
} as Record<string, string>;

const contribKeys = [
  "contrib_pg",
  "contrib_sg",
  "contrib_sf",
  "contrib_pf",
  "contrib_c",
];

type Props = {
  player: Record<string, any>;
  teamSeason: string;
  showHelp: boolean;
  showDetailsOverride?: boolean;
};
const PositionalDiagView: React.FunctionComponent<Props> = ({
  player,
  teamSeason,
  showHelp,
  showDetailsOverride,
}) => {
  const topRef = React.createRef<HTMLDivElement>();

  const [positionInfo, positionDiags] = PositionUtils.buildPositionConfidences(
    player,
    player?.roster?.height_in
  );

  const [positionId, positionIdDiag] = PositionUtils.buildPosition(
    positionInfo,
    positionDiags.confsNoHeight,
    player,
    teamSeason
  );
  const [positionIdNoHeight, positionIdDiagNoHeight] =
    positionDiags.confsNoHeight
      ? PositionUtils.buildPosition(
          positionDiags.confsNoHeight,
          undefined,
          player,
          teamSeason
        )
      : [positionId, undefined];

  const [showComplexDiag, setShowComplexDiag] = useState(
    _.isNil(showDetailsOverride) ? false : showDetailsOverride
  );

  const simpleDiagTableData = [
    GenericTableOps.buildDataRow(
      {
        title: PositionUtils.idToPosition[positionId] || "Unknown",
        ..._.mapValues(positionInfo, (p: number) => {
          return { value: p };
        }),
      },
      GenericTableOps.defaultFormatter,
      GenericTableOps.defaultCellMeta
    ),
  ].concat(
    positionDiags.confsNoHeight
      ? [
          GenericTableOps.buildDataRow(
            {
              title: `(Ignore Height) ${
                PositionUtils.idToPosition[positionIdNoHeight] || "Unknown"
              }`,
              ..._.mapValues(positionDiags.confsNoHeight, (p: number) => {
                return { value: p };
              }),
            },
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta
          ),
        ]
      : []
  );

  const buildFeatureTooltip = (key: string, text: string) => {
    return <Tooltip id={key + "Tooltip"}>{text}</Tooltip>;
  };

  const complexDiagTableData = showComplexDiag
    ? [
        // Total scores

        GenericTableOps.buildDataRow(
          {
            feature: (
              <OverlayTrigger
                placement="auto"
                overlay={buildFeatureTooltip(
                  "totalScore",
                  "The average score per position/positional group, and the total score for this player/position group. (10x the actual -relative- value, to make it more readable.)"
                )}
              >
                <b>Total Score</b>
              </OverlayTrigger>
            ),
            ..._.mapKeys(PositionUtils.averageScoresByPos, (v, s) => "av_" + s),
            ..._.chain(positionDiags.scores)
              .mapKeys((v, s) => "contrib_" + s)
              .mapValues((s) => {
                return { value: s };
              })
              .value(),
          },
          GenericTableOps.defaultFormatter,
          GenericTableOps.defaultCellMeta
        ),
      ].concat(
        _.chain(PositionUtils.positionFeatureWeights) // Per field contrib/weights:
          .flatMap((feat_scale_weights: [string, number, number[]]) => {
            const feat = feat_scale_weights[0];
            const scale = feat_scale_weights[1];
            const weightArray = feat_scale_weights[2];
            const weights = _.mapValues(
              _.fromPairs(_.zip(PositionUtils.tradPosList, weightArray)),
              (v: any) => {
                return { value: v };
              }
            );

            const calculated = positionDiags.calculated;

            const featureName = CommonTableDefs.individualDescriptions[feat] ||
              calculatedDescriptions[feat] || [feat, ""];

            const fieldVal = _.startsWith(feat, "calc_")
              ? calculated[feat] || 0
              : player[feat]?.value || 0;

            const dataRow = GenericTableOps.buildDataRow(
              {
                feature: (
                  <OverlayTrigger
                    placement="auto"
                    overlay={buildFeatureTooltip(feat, featureName[1])}
                  >
                    <b>{featureName[0]}</b>
                  </OverlayTrigger>
                ),
                player: { value: fieldVal * (scale * 0.01) }, //(convert to % where needed)
                ...weights,
                ..._.fromPairs(
                  _.flatMap(
                    PositionUtils.tradPosList,
                    (key: string, index: number) => {
                      // Regressed value:
                      const regressedFieldVal =
                        PositionUtils.regressShotQuality(
                          fieldVal,
                          index,
                          feat,
                          player
                        );

                      return [
                        [
                          "av_" + key,
                          {
                            value:
                              PositionUtils.positionFeatureAverages[feat][
                                index
                              ] * 0.01, //(convert to %)
                          },
                        ],
                        [
                          "contrib_" + key,
                          {
                            //(0.1 is being applied to all scores - once used to build conf%s - to make the display prettier)
                            value:
                              (weightArray[index] || 0) *
                              (regressedFieldVal * scale -
                                PositionUtils.positionFeatureAverages[feat][
                                  index
                                ]) *
                              0.1,
                          },
                        ],
                      ];
                    }
                  )
                ),
              },
              GenericTableOps.defaultFormatter,
              (key: string, value: any) => feat
            );

            const subtitle = complexDiagSubtitles[feat];

            return subtitle
              ? [
                  GenericTableOps.buildTextRow(
                    <span>
                      <em>{subtitle}</em>
                    </span>,
                    "small"
                  ),
                  dataRow,
                ]
              : [dataRow];
          })
          .value()
      )
    : [];

  return (
    <span ref={topRef}>
      <span>
        <b>Positional diagnostics for [{player.key}]</b>{" "}
        {showHelp ? (
          <a
            href="https://hoop-explorer.blogspot.com/2020/05/classifying-college-basketball.html"
            target="_blank"
          >
            (?)
          </a>
        ) : null}
      </span>
      <ul>
        <li>
          The following table shows the confidence that the player could fit
          into one of the traditional positional categories. That "signature" is
          then used to assign a "positional role".
          {showHelp ? (
            <span> See the linked help for more info about the algorithm.</span>
          ) : null}
        </li>
        <li>
          Rule used to categorize player:{" "}
          <i>
            <b>{positionIdDiag}</b>
          </i>
        </li>
      </ul>
      <Container>
        <Col xs={8}>
          <GenericTable
            responsive={false}
            tableFields={simpleDiagTable}
            tableData={simpleDiagTableData}
          />
        </Col>
      </Container>
      (
      <a
        href="#"
        onClick={(event) => {
          event.preventDefault();
          setShowComplexDiag(!showComplexDiag);
        }}
      >
        {showComplexDiag ? "Hide" : "Show"} detailed positional breakdown
      </a>
      )
      {showComplexDiag ? (
        <span>
          <ul>
            <li>
              This table breaks down how a player matches up against each of the
              traditional positional categories, based on the different
              statistics used to train the algorithm.
            </li>
          </ul>
          <Container>
            <Col xs={11}>
              <GenericTable
                responsive={false}
                tableCopyId="complexDiagTable"
                tableFields={complexDiagTable}
                tableData={complexDiagTableData}
              />
            </Col>
          </Container>
          (
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (topRef.current) {
                topRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            Scroll back to start of positional diagnostics
          </a>
          )
        </span>
      ) : null}
    </span>
  );
};
export default PositionalDiagView;
