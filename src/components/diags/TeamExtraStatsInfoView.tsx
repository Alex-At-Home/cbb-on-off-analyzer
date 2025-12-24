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
import { FeatureFlags } from "../../utils/stats/FeatureFlags";

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
    CbbColors.applyThemedBackground
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
const miscDetailsTable = {
  title: GenericTableOps.addTitle(
    "",
    "",
    GenericTableOps.defaultRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter
  ),
  sep1: GenericTableOps.addColSeparator(),
  ft: GenericTableOps.addPctCol(
    "FT%",
    "Free throw %",
    CommonTableDefs.picker(...CbbColors.ft)
  ),
  sep2: GenericTableOps.addColSeparator(),
  stl: GenericTableOps.addPctCol(
    "Stl%",
    "Steal %",
    CommonTableDefs.picker(...CbbColors.TO_comp)
  ),
  to_nonstl: GenericTableOps.addPctCol(
    "Non-Stl%",
    "Non-Steal TO%",
    CommonTableDefs.picker(...CbbColors.TO_comp)
  ),
  blk: GenericTableOps.addPctCol(
    "Blk%",
    "Block %",
    CommonTableDefs.picker(...CbbColors.TO_comp)
  ),
  sep3: GenericTableOps.addColSeparator(),
  "3p_opp": GenericTableOps.addPtsCol(
    "3P% SoS",
    "How good the team's opponents were at shooting 3 over their season",
    CommonTableDefs.picker(...CbbColors.fg3P)
  ),
  sep4: GenericTableOps.addColSeparator(),
  tempo: GenericTableOps.addPtsCol(
    "Pace",
    "Raw tempo (possessions per game)",
    CbbColors.varPicker(CbbColors.p_tempo)
  ),
};
const miscDetailsGradesTable = {
  title: GenericTableOps.addTitle(
    "",
    "",
    GenericTableOps.defaultRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter
  ),
  sep1: GenericTableOps.addColSeparator(),
  ft: GenericTableOps.addDataCol(
    "FT%",
    "Free throw %",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  sep2: GenericTableOps.addColSeparator(),
  stl: GenericTableOps.addDataCol(
    "Stl%",
    "Steal %",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  to_nonstl: GenericTableOps.addDataCol(
    "Non-Stl%",
    "Non-Steal TO%",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  blk: GenericTableOps.addDataCol(
    "Blk%",
    "Block %",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  sep3: GenericTableOps.addColSeparator(),
  "3p_opp": GenericTableOps.addDataCol(
    "3P% SoS",
    "How good the team's opponents were at shooting 3 over their season",
    CbbColors.varPicker(CbbColors.off_pctile_qual),
    GenericTableOps.gradeOrHtmlFormatter
  ),
  sep4: GenericTableOps.addColSeparator(),
  tempo: GenericTableOps.addDataCol(
    "Pace",
    "Raw tempo (possessions per game)",
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
  const showStandaloneGrades =
    GradeTableUtils.showingStandaloneGrades(showGrades);
  const showInlineGrades = showGrades && !showStandaloneGrades;

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
    off_ft: teamStatSet.off_ft,
    def_ft: teamStatSet.def_ft,
  } as PureStatSet;
  DerivedStatsUtils.injectTeamDerivedStats(teamStatSet, extraStats);

  // And now maybe build ranks/%iles:
  const extraOriginalFields = [
    "3p_ast",
    "2prim_ast",
    "ast_3p",
    "ast_rim",
    "ft",
  ];
  const teamPercentiles = tierToUse
    ? GradeUtils.buildTeamPercentiles(
        tierToUse,
        extraStats,
        GradeUtils.teamDerivedFields
          .concat(extraOriginalFields)
          .concat("tempo"),
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

  const buildPlayTypeGrades = (
    offDef: "off" | "def",
    playType: "trans" | "scramble" | "half"
  ) => {
    const isTrans = playType == "trans";
    const isScramble = playType == "scramble";
    const pct = extraStats[`${offDef}_${playType}`]?.value || 0;
    return {
      [`${offDef}_title`]: (
        <small>Equivalent {gradeFormat == "pct" ? "percentile" : "rank"}</small>
      ),
      [`${offDef}_pct`]: teamPercentiles[`${offDef}_${playType}`],
      [`${offDef}_pct_orbs`]: isScramble
        ? teamPercentiles[`${offDef}_scramble_per_orb`]
        : undefined,
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
    };
  };

  const buildPlayTypeDataRow = (
    offDef: "off" | "def",
    playType: "trans" | "scramble" | "half"
  ) => {
    const offNotDef = offDef == "off";
    const isTrans = playType == "trans";
    const isScramble = playType == "scramble";
    const pct = extraStats[`${offDef}_${playType}`]?.value || 0;
    return GenericTableOps.buildDataRow(
      {
        [`${offDef}_title`]: isTrans ? (
          `Transition ${offNotDef ? "Offense" : "Defense"}`
        ) : isScramble ? (
          <OverlayTrigger placement="auto" overlay={scrambleTooltip}>
            <b>
              Scramble {offNotDef ? "Offense" : "Defense"}
              <sup>*</sup>
            </b>
          </OverlayTrigger>
        ) : (
          `Half-Court ${offNotDef ? "Offense" : "Defense"}`
        ),
        [`${offDef}_pct`]: extraStats[`${offDef}_${playType}`],
        [`${offDef}_pct_orbs`]: isScramble
          ? extraStats[`${offDef}_scramble_per_orb`]
          : undefined,
        [`${offDef}_ppp`]:
          pct > 0 ? extraStats[`${offDef}_${playType}_ppp`] : undefined,
        [`${offDef}_delta_ppp`]:
          pct > 0 ? extraStats[`${offDef}_${playType}_delta_ppp`] : undefined,

        [`${offDef}_to`]: extraStats[`${offDef}_${playType}_to`],
        [`${offDef}_ftr`]: extraStats[`${offDef}_${playType}_ftr`],
        [`${offDef}_3pr`]: extraStats[`${offDef}_${playType}_3pr`],

        [`${offDef}_3p`]: extraStats[`${offDef}_${playType}_3p`],
        [`${offDef}_2p`]: extraStats[`${offDef}_${playType}_2p`],
        grades: showInlineGrades
          ? buildPlayTypeGrades(offDef, playType)
          : undefined,
      },
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn,
      isTrans || (showInlineGrades && !_.isEmpty(teamPercentiles))
        ? //(^ in this second clause, we'll always override the color so doesn't matter what is returned)
          {
            // (For transition % we come up with a generic color if we don't have grades
            pct_orbs: GenericTableOps.addPctCol(
              "%ORB",
              "Percentage of Off rebounds resulting in a scramble play type",
              CbbColors.varPicker(CbbColors.all_pctile_freq)
            ),
          }
        : {
            // For scramble we don't color the ORB% so no entry here, and % is just the background
            // (not sure why for either!)
            pct: GenericTableOps.addPctCol(
              "%",
              "Percentage of possessions this play type occurs",
              CbbColors.applyThemedBackground
            ),
          }
    );
  };
  const buildPlayTypeGradeRow = (
    offDef: "off" | "def",
    playType: "trans" | "scramble" | "half"
  ) => {
    const offNotDef = offDef == "off";
    return GenericTableOps.buildDataRow(
      buildPlayTypeGrades(offDef, playType),
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn,
      playTypeTableGrades
    );
  };
  const playTypeTableData = _.flatten([
    FeatureFlags.isActiveWindow(FeatureFlags.halfCourtStatCategory)
      ? [buildPlayTypeDataRow("off", "half")]
      : [],
    FeatureFlags.isActiveWindow(FeatureFlags.halfCourtStatCategory) &&
    tierToUse &&
    showStandaloneGrades
      ? [
          buildPlayTypeGradeRow("off", "half"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [buildPlayTypeDataRow("off", "trans")],
    tierToUse && showStandaloneGrades
      ? [
          buildPlayTypeGradeRow("off", "trans"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [buildPlayTypeDataRow("off", "scramble")],
    tierToUse && showStandaloneGrades
      ? [
          buildPlayTypeGradeRow("off", "scramble"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [GenericTableOps.buildRowSeparator()],
    FeatureFlags.isActiveWindow(FeatureFlags.halfCourtStatCategory)
      ? [buildPlayTypeDataRow("def", "half")]
      : [],
    FeatureFlags.isActiveWindow(FeatureFlags.halfCourtStatCategory) &&
    tierToUse &&
    showStandaloneGrades
      ? [
          buildPlayTypeGradeRow("def", "half"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [buildPlayTypeDataRow("def", "trans")],
    tierToUse && showStandaloneGrades
      ? [
          buildPlayTypeGradeRow("def", "trans"),
          GenericTableOps.buildRowSeparator(),
        ]
      : [],
    [buildPlayTypeDataRow("def", "scramble")],
    tierToUse && showStandaloneGrades
      ? [buildPlayTypeGradeRow("def", "scramble")]
      : [],
  ]);

  const buildAssistGrades = (offDef: "off" | "def") => {
    return {
      [`${offDef}_title`]: (
        <small>Equivalent {gradeFormat == "pct" ? "percentile" : "rank"}</small>
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
    };
  };
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
        grades: showInlineGrades ? buildAssistGrades(offDef) : undefined,
      },
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn
    );
  };
  const buildAssistGradeRow = (offDef: "off" | "def") => {
    const offNotDef = offDef == "off";
    return GenericTableOps.buildDataRow(
      buildAssistGrades(offDef),
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
    tierToUse && showStandaloneGrades
      ? [buildAssistGradeRow("off"), GenericTableOps.buildRowSeparator()]
      : [],
    [buildAssistDataRow("def")],
    tierToUse && showStandaloneGrades
      ? [buildAssistGradeRow("def"), GenericTableOps.buildRowSeparator()]
      : [],
  ]);

  const buildOtherStatsGrades = (offDef: "off" | "def") => {
    return {
      [`${offDef}_title`]: (
        <small>Equivalent {gradeFormat == "pct" ? "percentile" : "rank"}</small>
      ),
      [`${offDef}_tempo`]:
        offDef == "off" ? teamPercentiles[`tempo`] : undefined,
      ...teamPercentiles,
    };
  };

  // miscDetailsTables: title, stl, to_nonstl, blk, 3p_sos, tempo
  const buildOtherStats = (offDef: "off" | "def") => {
    const offNotDef = offDef == "off";
    return GenericTableOps.buildDataRow(
      {
        [`${offDef}_title`]: `${offNotDef ? "Offense" : "Defense"}`,
        [`${offDef}_tempo`]: offDef == "off" ? extraStats[`tempo`] : undefined,
        ...extraStats,
        grades: showInlineGrades ? buildOtherStatsGrades(offDef) : undefined,
      },
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn
    );
  };
  const buildOtherStatsGradeRow = (offDef: "off" | "def") => {
    const offNotDef = offDef == "off";
    return GenericTableOps.buildDataRow(
      buildOtherStatsGrades(offDef),
      offNotDef ? offPrefixFn : defPrefixFn,
      offNotDef ? offCellMetaFn : defCellMetaFn,
      miscDetailsGradesTable
    );
  };
  const otherStatsTableData = _.flatten([
    [buildOtherStats("off")],
    tierToUse && showStandaloneGrades
      ? [buildOtherStatsGradeRow("off"), GenericTableOps.buildRowSeparator()]
      : [],
    [buildOtherStats("def")],
    tierToUse && showStandaloneGrades
      ? [buildOtherStatsGradeRow("def"), GenericTableOps.buildRowSeparator()]
      : [],
  ]);

  const integratedGrades = showInlineGrades
    ? {
        hybridMode: GradeTableUtils.showingHybridOrStandaloneGrades(showGrades),
        exactRanks: true,
        colorChooser: CbbColors.integratedColorsDefault,
        customKeyMappings: {},
      }
    : undefined;

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
              integratedGrades={integratedGrades}
            />
          </Col>
          <Col xs={8} sm={12} lg={8} xl={6}>
            <Container fluid>
              <Row>
                <span>More assist stats:</span>
                <GenericTable
                  tableCopyId={`assistStats_${nameAsId}`}
                  tableFields={assistDetailsTable}
                  tableData={assistTableData}
                  integratedGrades={integratedGrades}
                />
              </Row>
              <Row>
                <span>Misc other stats:</span>
                <GenericTable
                  tableCopyId={`otherStats_${nameAsId}`}
                  tableFields={miscDetailsTable}
                  tableData={otherStatsTableData}
                  integratedGrades={integratedGrades}
                />
              </Row>
            </Container>
          </Col>
        </Row>
      </Container>
    </span>
  );
};
export default TeamExtraStatsInfoView;
