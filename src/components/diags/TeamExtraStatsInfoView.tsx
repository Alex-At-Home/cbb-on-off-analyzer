// React imports:
import React from "react";

import _ from "lodash";

// Bootstrap imports:

// Utils
import { CbbColors } from "../../utils/CbbColors";
import GenericTable, { GenericTableOps } from "../../components/GenericTable";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Component imports
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import {
  TeamStatSet,
  PureStatSet,
  DivisionStatistics,
} from "../../utils/StatModels";
import { DerivedStatsUtils } from "../../utils/stats/DerivedStatsUtils";
import { GradeUtils, GradeProps } from "../../utils/stats/GradeUtils";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { GradeTableUtils } from "../../utils/tables/GradeTableUtils";

const playTypeTable = {
  title: GenericTableOps.addTitle(
    "",
    "",
    GenericTableOps.defaultRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter
  ),
  sep1: GenericTableOps.addColSeparator(),
  pct: GenericTableOps.addPctCol(
    "%",
    "Percentage of possessions ending in this play type",
    CommonTableDefs.picker(CbbColors.trans_offDef, CbbColors.trans_offDef)
  ),
  pct_orbs: GenericTableOps.addPctCol(
    "%ORB",
    "Percentage of Off rebounds resulting in a scramble play type",
    CbbColors.alwaysWhite
  ),
  ppp: GenericTableOps.addPtsCol(
    "P/100",
    "Points per 100 possessions ending in this play type",
    CommonTableDefs.picker(...CbbColors.pp100)
  ),
  delta_ppp: GenericTableOps.addPtsCol(
    <span>&Delta;/100</span>,
    "Delta points per 100 possessions between overall play and this play type",
    CommonTableDefs.picker(...CbbColors.diff35_p100_redGreen)
  ),
  sep2: GenericTableOps.addColSeparator(),
  to: GenericTableOps.addPctCol(
    "TO%",
    "Turnover % for this play type",
    CommonTableDefs.picker(...CbbColors.tOver)
  ),
  ftr: GenericTableOps.addPctCol(
    "FTR",
    "Free throw rate  for this play type",
    CommonTableDefs.picker(...CbbColors.ftr)
  ),
  "3pr": GenericTableOps.addPctCol(
    "3PR",
    "Percentage of 3 pointers taken against all field goals for this play type",
    CommonTableDefs.picker(...CbbColors.fgr)
  ),
  sep3: GenericTableOps.addColSeparator(),
  "3p": GenericTableOps.addPctCol(
    "3P%",
    "3 point field goal percentage for this play type",
    CommonTableDefs.picker(...CbbColors.fg3P)
  ),
  "2p": GenericTableOps.addPctCol(
    "2P%",
    "2 point field goal percentage for this play type",
    CommonTableDefs.picker(...CbbColors.fg2P)
  ),
};

const playTypeTableGrades = {
  title: GenericTableOps.addTitle(
    "",
    "",
    GenericTableOps.defaultRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter
  ),
  sep1: GenericTableOps.addColSeparator(),
  pct: GenericTableOps.addDataCol(
    "%",
    "Percentage of possessions this play type occurs",
    CbbColors.varPicker(CbbColors.all_pctile_freq),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  pct_orbs: GenericTableOps.addDataCol(
    "%ORB",
    "Percentage of Off rebounds resulting in a scramble play type",
    CbbColors.varPicker(CbbColors.all_pctile_freq),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  ppp: GenericTableOps.addDataCol(
    "P/100",
    "Points per 100 possessions ending in this play type",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  delta_ppp: GenericTableOps.addDataCol(
    <span>&Delta;/100</span>,
    "Delta points per 100 possessions between overall play and this play type",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  sep2: GenericTableOps.addColSeparator(),
  to: GenericTableOps.addDataCol(
    "TO%",
    "Turnover % for this play type",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  ftr: GenericTableOps.addDataCol(
    "FTR",
    "Free throw rate  for this play type",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  "3pr": GenericTableOps.addDataCol(
    "3PR",
    "Percentage of 3 pointers taken against all field goals for this play type",
    CbbColors.varPicker(CbbColors.all_pctile_freq),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  sep3: GenericTableOps.addColSeparator(),
  "3p": GenericTableOps.addDataCol(
    "3P%",
    "3 point field goal percentage for this play type",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  "2p": GenericTableOps.addDataCol(
    "2P%",
    "2 point field goal percentage for this play type",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
};

const assistDetailsTable = {
  title: GenericTableOps.addTitle(
    "",
    "",
    GenericTableOps.defaultRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter
  ),
  sep1: GenericTableOps.addColSeparator(),
  "3p_ast": GenericTableOps.addPctCol(
    "3P",
    "% of assists for 3P",
    CommonTableDefs.picker(...CbbColors.fgr)
  ),
  mid_ast: GenericTableOps.addPctCol(
    "Mid",
    "% of assists for mid-range 2P",
    CommonTableDefs.picker(...CbbColors.fgr)
  ),
  rim_ast: GenericTableOps.addPctCol(
    "Rim",
    "% of assists for 2PAs at the rim",
    CommonTableDefs.picker(...CbbColors.fgr)
  ),
  sep2: GenericTableOps.addColSeparator(),
  ast_3p: GenericTableOps.addPctCol(
    "3P",
    "% of assists for 3P",
    CommonTableDefs.picker(...CbbColors.fgr)
  ),
  ast_mid: GenericTableOps.addPctCol(
    "Mid",
    "% of assists for mid-range 2P",
    CommonTableDefs.picker(...CbbColors.fgr)
  ),
  ast_rim: GenericTableOps.addPctCol(
    "Rim",
    "% of assists for 2PAs at the rim",
    CommonTableDefs.picker(...CbbColors.fgr)
  ),
};
const assistDetailGradesTable = {
  title: GenericTableOps.addTitle(
    "",
    "",
    GenericTableOps.defaultRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter
  ),
  sep1: GenericTableOps.addColSeparator(),
  "3p_ast": GenericTableOps.addDataCol(
    "3P",
    "% of assists for 3P",
    CbbColors.varPicker(CbbColors.all_pctile_freq),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  rim_ast: GenericTableOps.addDataCol(
    "Rim",
    "% of assists for 2PAs at the rim",
    CbbColors.varPicker(CbbColors.all_pctile_freq),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  sep2: GenericTableOps.addColSeparator(),
  ast_3p: GenericTableOps.addDataCol(
    "3P",
    "% of assists for 3P",
    CbbColors.varPicker(CbbColors.all_pctile_freq),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  ast_rim: GenericTableOps.addDataCol(
    "Rim",
    "% of assists for 2PAs at the rim",
    CbbColors.varPicker(CbbColors.all_pctile_freq),
    GenericTableOps.gradeOrHtmlFormatter
  ),
};

type Props = {
  name: string;
  teamStatSet: TeamStatSet;
  showGrades: string;
  grades?: GradeProps;
};
const TeamExtraStatsInfoView: React.FunctionComponent<Props> = ({
  name,
  teamStatSet,
  showGrades,
  grades,
}) => {
  const nameAsId = name.replace(/[^A-Za-z0-9_]/g, "");

  const { tierToUse, gradeFormat } = GradeTableUtils.buildTeamTierInfo(
    showGrades,
    grades
  );

  // Build derived stats and inject into extraStats
  const extraStats = {
    // Opponent stats
    def_3p_opp: teamStatSet.def_3p_opp,
    // Assist stats
    off_3p_ast: teamStatSet.off_3p_ast,
    def_3p_ast: teamStatSet.def_3p_ast,
    off_2prim_ast: teamStatSet.off_2prim_ast,
    def_2prim_ast: teamStatSet.def_2prim_ast,
    off_ast_3p: teamStatSet.off_ast_3p,
    def_ast_3p: teamStatSet.def_ast_3p,
    off_ast_rim: teamStatSet.off_ast_rim,
    def_ast_rim: teamStatSet.def_ast_rim,
  } as PureStatSet;
  DerivedStatsUtils.injectTeamDerivedStats(teamStatSet, extraStats);

  // And now maybe build ranks/%iles:
  const extraOriginalFields = ["3p_ast", "2prim_ast", "ast_3p", "ast_rim"];
  const teamPercentiles = tierToUse
    ? GradeUtils.buildTeamPercentiles(
        tierToUse,
        extraStats,
        GradeUtils.teamDerivedFields.concat(extraOriginalFields),
        gradeFormat == "rank"
      )
    : {};

  const scrambleTooltip = (
    <Tooltip id={`scrambleDef${nameAsId}`}>
      Possessions finishing after an ORB, but not counting plays where the
      offense resets
    </Tooltip>
  );

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";
  const buildPlayTypeDataRow = (
    offDef: "off" | "def",
    playType: "trans" | "scramble"
  ) => {
    const offNotDef = offDef == "off";
    const isTrans = playType == "trans";
    const pct = extraStats[`${offDef}_${playType}`]?.value || 0;
    return GenericTableOps.buildDataRow(
      {
        [`${offDef}_title`]: isTrans ? (
          `Transition ${offNotDef ? "Offense" : "Defense"}`
        ) : (
          <OverlayTrigger placement="auto" overlay={scrambleTooltip}>
            <b>
              Scramble {offNotDef ? "Offense" : "Defense"}
              <sup>*</sup>
            </b>
          </OverlayTrigger>
        ),
        [`${offDef}_pct`]: extraStats[`${offDef}_${playType}`],
        [`${offDef}_pct_orbs`]: isTrans
          ? undefined
          : extraStats[`${offDef}_scramble_per_orb`],
        [`${offDef}_ppp`]:
          pct > 0 ? extraStats[`${offDef}_${playType}_ppp`] : undefined,
        [`${offDef}_delta_ppp`]:
          pct > 0 ? extraStats[`${offDef}_${playType}_delta_ppp`] : undefined,

        [`${offDef}_to`]: extraStats[`${offDef}_${playType}_to`],
        [`${offDef}_ftr`]: extraStats[`${offDef}_${playType}_ftr`],
        [`${offDef}_3pr`]: extraStats[`${offDef}_${playType}_3pr`],

        [`${offDef}_3p`]: extraStats[`${offDef}_${playType}_3p`],
        [`${offDef}_2p`]: extraStats[`${offDef}_${playType}_2p`],
      },
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn,
      isTrans
        ? undefined
        : {
            pct: GenericTableOps.addPctCol(
              "%",
              "Percentage of possessions this play type occurs",
              CbbColors.alwaysWhite
            ),
          }
    );
  };
  const buildPlayTypeGrade = (
    offDef: "off" | "def",
    playType: "trans" | "scramble"
  ) => {
    const offNotDef = offDef == "off";
    const isTrans = playType == "trans";
    const pct = extraStats[`${offDef}_${playType}`]?.value || 0;

    return GenericTableOps.buildDataRow(
      {
        [`${offDef}_title`]: (
          <small>
            Equivalent {gradeFormat == "pct" ? "percentile" : "rank"}
          </small>
        ),
        [`${offDef}_pct`]: teamPercentiles[`${offDef}_${playType}`],
        [`${offDef}_pct_orbs`]: isTrans
          ? undefined
          : teamPercentiles[`${offDef}_scramble_per_orb`],
        [`${offDef}_ppp`]:
          pct > 0 ? teamPercentiles[`${offDef}_${playType}_ppp`] : undefined,
        [`${offDef}_delta_ppp`]:
          pct > 0
            ? teamPercentiles[`${offDef}_${playType}_delta_ppp`]
            : undefined,

        [`${offDef}_to`]: teamPercentiles[`${offDef}_${playType}_to`],
        [`${offDef}_ftr`]: teamPercentiles[`${offDef}_${playType}_ftr`],
        [`${offDef}_3pr`]: teamPercentiles[`${offDef}_${playType}_3pr`],

        [`${offDef}_3p`]: teamPercentiles[`${offDef}_${playType}_3p`],
        [`${offDef}_2p`]: teamPercentiles[`${offDef}_${playType}_2p`],
      },
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn,
      playTypeTableGrades
    );
  };
  const playTypeTableData = _.flatten([
    [buildPlayTypeDataRow("off", "trans")],
    tierToUse
      ? [
          buildPlayTypeGrade("off", "trans"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [buildPlayTypeDataRow("off", "scramble")],
    tierToUse
      ? [
          buildPlayTypeGrade("off", "scramble"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [GenericTableOps.buildRowSeparator()],
    [buildPlayTypeDataRow("def", "trans")],
    tierToUse
      ? [
          buildPlayTypeGrade("def", "trans"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [buildPlayTypeDataRow("def", "scramble")],
    tierToUse ? [buildPlayTypeGrade("def", "scramble")] : [],
  ]);

  const buildAssistDataRow = (offDef: "off" | "def") => {
    const offNotDef = offDef == "off";
    return GenericTableOps.buildDataRow(
      {
        [`${offDef}_title`]: `${
          offNotDef ? "Offensive" : "Defensive"
        } assist details`,

        ..._.chain(["3p", "mid", "rim"])
          .flatMap((field) => {
            return [
              [`${offDef}_${field}_ast`, teamStatSet[`${offDef}_ast_${field}`]],
              [
                `${offDef}_ast_${field}`,
                teamStatSet[
                  `${offDef}_${field == "3p" ? field : `2p${field}`}_ast`
                ],
              ],
            ];
          })
          .fromPairs()
          .value(),
      },
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn
    );
  };
  const buildAssistGradeRow = (offDef: "off" | "def") => {
    const offNotDef = offDef == "off";
    return GenericTableOps.buildDataRow(
      {
        [`${offDef}_title`]: (
          <small>
            Equivalent {gradeFormat == "pct" ? "percentile" : "rank"}
          </small>
        ),

        ..._.chain(["3p", "rim"])
          .flatMap((field) => {
            return [
              [
                `${offDef}_${field}_ast`,
                teamPercentiles[`${offDef}_ast_${field}`],
              ],
              [
                `${offDef}_ast_${field}`,
                teamPercentiles[
                  `${offDef}_${field == "3p" ? field : `2p${field}`}_ast`
                ],
              ],
            ];
          })
          .fromPairs()
          .value(),
      },
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn,
      assistDetailGradesTable
    );
  };

  const assistTableData = _.flatten([
    [
      GenericTableOps.buildSubHeaderRow(
        [
          ["", 2],
          [<i>Assist distribution</i>, 3],
          ["", 1],
          [<i>% of these shots assisted</i>, 3],
        ] as [string, number][],
        "text-center"
      ),
    ],
    [buildAssistDataRow("off")],
    tierToUse
      ? [buildAssistGradeRow("off"), GenericTableOps.buildRowSeparator()]
      : [],
    [buildAssistDataRow("def")],
    tierToUse
      ? [buildAssistGradeRow("def"), GenericTableOps.buildRowSeparator()]
      : [],
  ]);

  const possPer40 = extraStats[`tempo`]?.value || 0;
  const tempoHtml =
    possPer40 > 0 ? (
      <span>
        <b
          style={CommonTableDefs.getTextShadow(
            { value: possPer40 },
            CbbColors.p_tempo
          )}
        >
          [{possPer40.toFixed(1)}]
        </b>{" "}
        poss/g
      </span>
    ) : undefined;
  const off_ft = teamStatSet[`off_ft`]?.value || 0;
  const def_ft = teamStatSet[`def_ft`]?.value || 0;
  const def_3p_SoS = extraStats[`def_3p_opp`]?.value || 0;
  const def_stl = extraStats[`def_stl`]?.value || 0;
  const def_blk = extraStats[`def_blk`]?.value || 0;
  const def_to_nonstl = extraStats[`def_to_nonstl`]?.value || 0;

  const offdefFtHtml =
    tierToUse && teamPercentiles.off_ft && teamPercentiles.def_ft ? (
      <span>
        {" "}
        (<b>{gradeFormat == "rank" ? "Ranks" : "Pctiles"}</b>: off=[
        <span
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.off_ft,
            CbbColors.off_pctile_qual
          )}
        >
          {GenericTableOps.gradeOrHtmlFormatter(teamPercentiles.off_ft)}
        </span>
        ]{gradeFormat == "rank" ? "" : "%"}
        def=[
        <span
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.def_ft,
            CbbColors.def_pctile_qual
          )}
        >
          {GenericTableOps.gradeOrHtmlFormatter(teamPercentiles.def_ft)}
        </span>
        ]{gradeFormat == "rank" ? "" : "%"} )
      </span>
    ) : null;

  const defStlHtml =
    tierToUse && teamPercentiles.def_stl ? (
      <span>
        {" "}
        (<b>{gradeFormat == "rank" ? "Rank" : "Pctile"}</b>: [
        <span
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.def_stl,
            CbbColors.def_pctile_qual
          )}
        >
          {GenericTableOps.gradeOrHtmlFormatter(teamPercentiles.def_stl)}
        </span>
        ]{gradeFormat == "rank" ? "" : "%"})
      </span>
    ) : null;

  const defBlkHtml =
    tierToUse && teamPercentiles.def_blk ? (
      <span>
        {" "}
        (<b>{gradeFormat == "rank" ? "Rank" : "Pctile"}</b>: [
        <span
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.def_blk,
            CbbColors.def_pctile_qual
          )}
        >
          {GenericTableOps.gradeOrHtmlFormatter(teamPercentiles.def_blk)}
        </span>
        ]{gradeFormat == "rank" ? "" : "%"})
      </span>
    ) : null;

  const defToNonStlHtml =
    tierToUse && teamPercentiles.def_to_nonstl ? (
      <span>
        {" "}
        (<b>{gradeFormat == "rank" ? "Rank" : "Pctile"}</b>: [
        <span
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.def_to_nonstl,
            CbbColors.def_pctile_qual
          )}
        >
          {GenericTableOps.gradeOrHtmlFormatter(teamPercentiles.def_to_nonstl)}
        </span>
        ]{gradeFormat == "rank" ? "" : "%"})
      </span>
    ) : null;

  const def3pRankHtml =
    tierToUse && teamPercentiles.def_3p_opp ? (
      <span>
        {" "}
        (<b>{gradeFormat == "rank" ? "Rank" : "Pctile"}</b>: [
        <span
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.def_3p_opp,
            CbbColors.def_pctile_qual
          )}
        >
          {GenericTableOps.gradeOrHtmlFormatter(teamPercentiles.def_3p_opp)}
        </span>
        ]{gradeFormat == "rank" ? "" : "%"})
      </span>
    ) : null;

  return (
    <span>
      <b>Extra stats info for [{name}]</b>
      <br />
      <br />
      <Container fluid className="float-left">
        <Row>
          <Col xs={8} sm={12} lg={8} xl={6}>
            <p>Play type stats:</p>
            <GenericTable
              tableCopyId={`playTypeStats_${nameAsId}`}
              tableFields={playTypeTable}
              tableData={playTypeTableData}
            />
          </Col>
          <Col xs={8} sm={12} lg={8} xl={6}>
            <Container fluid>
              <Row>
                <p>More assist stats:</p>
                <GenericTable
                  tableCopyId={`assistStats_${nameAsId}`}
                  tableFields={assistDetailsTable}
                  tableData={assistTableData}
                />
              </Row>
              <Row>Misc other stats:</Row>
              <Row>
                <ul>
                  <li>
                    FT%: off=[
                    <b
                      style={CommonTableDefs.getTextShadow(
                        { value: off_ft },
                        (val: number) => CbbColors.off_FT(val)
                      )}
                    >
                      {(100 * off_ft).toFixed(1)}
                    </b>
                    ]% def=[
                    <b
                      style={CommonTableDefs.getTextShadow(
                        { value: def_ft },
                        (val: number) => CbbColors.def_FT(val)
                      )}
                    >
                      {(100 * def_ft).toFixed(1)}
                    </b>
                    ]%
                    {offdefFtHtml}
                  </li>
                  <li>
                    Defensive Steal%: [
                    <b
                      style={CommonTableDefs.getTextShadow(
                        { value: def_stl },
                        (val: number) => CbbColors.def_TO(val * 2)
                      )}
                    >
                      {(100 * def_stl).toFixed(1)}
                    </b>
                    ]%
                    {defStlHtml}
                  </li>
                  <li>
                    Defensive Non-Steal TO%: [
                    <b
                      style={CommonTableDefs.getTextShadow(
                        { value: def_to_nonstl },
                        (val: number) => CbbColors.def_TO(val * 2)
                      )}
                    >
                      {(100 * def_to_nonstl).toFixed(1)}
                    </b>
                    ]%
                    {defToNonStlHtml}
                  </li>
                  <li>
                    Defensive Block%: [
                    <b
                      style={CommonTableDefs.getTextShadow(
                        { value: def_blk },
                        (val: number) => CbbColors.def_TO(val * 2)
                      )}
                    >
                      {(100 * def_blk).toFixed(1)}
                    </b>
                    ]%
                    {defBlkHtml}
                  </li>
                  <li>
                    3P Defensive SoS: [
                    <b
                      style={CommonTableDefs.getTextShadow(
                        { value: 0.01 * def_3p_SoS },
                        CbbColors.def_3P
                      )}
                    >
                      {def_3p_SoS.toFixed(1)}
                    </b>
                    ]%
                    {def3pRankHtml}
                  </li>
                  <li>Raw tempo: {tempoHtml}</li>
                </ul>
              </Row>{" "}
            </Container>
          </Col>
        </Row>
      </Container>
    </span>
  );
};
export default TeamExtraStatsInfoView;
