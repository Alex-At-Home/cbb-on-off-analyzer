

import _ from 'lodash';

import { PositionUtils } from "../PositionUtils";
import { GameFilterParams, LineupFilterParams, TeamReportFilterParams } from "../../FilterModels";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";

describe("PositionUtils", () => {

  const tidyObj = (vo: Record<string, number>) => _.mapValues(vo, (v: any) => (v.value || v).toFixed(2))

  test("PositionUtils - averageScoresByPos", () => {
    expect(_.values(tidyObj(PositionUtils.averageScoresByPos))).toEqual(["0.15", "-0.03", "-0.11", "0.03", "0.42", ]);
  });
  test("PositionUtils - buildPositionConfidences", () => {

    // Some hand-checked results:

    const [ realConfidences, realDiags ] = PositionUtils.buildPositionConfidences(
      samplePlayerStatsResponse.aggregations.tri_filter.buckets.baseline.player.buckets[0]
    );
    expect(_.values(tidyObj(realConfidences))).toEqual(["0.95", "0.05", "0.00", "0.00", "0.00", ]);
    expect(_.values(tidyObj(realDiags.scores))).toEqual(["0.41","0.12","-0.44","-0.81","-1.70"]);
    expect(tidyObj(realDiags.calculated)).toEqual({
      "calc_assist_per_fga": "0.41",
      "calc_ast_tov": "2.09",
      "calc_ft_relative_inv": "0.59", // 47% eFG / (166/206)
      "calc_mid_relative": "0.91",
      "calc_rim_relative": "1.07",
      "calc_three_relative": "1.02"
    });
    expect(_.keys(realConfidences)).toEqual(PositionUtils.tradPosList)
    expect(_.keys(realDiags.scores)).toEqual(PositionUtils.tradPosList)

    const [ realConfidences2, realDiags2 ] = PositionUtils.buildPositionConfidences(
      samplePlayerStatsResponse.aggregations.tri_filter.buckets.baseline.player.buckets[1]
    );
    expect(_.values(tidyObj(realConfidences2))).toEqual(["0.21", "0.71", "0.07", "0.01", "0.00", ]);
  });
  test("PositionUtils - buildPosition", () => {
    const testCases = [
      // Point guards:
      {
        confs: [0.9, 0.1, 0, 0, 0], extra: { off_assist: 0.10, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "PG", fallbackPos: "G?", diag: `(P[PG] >= 85%)`, name: "Pure PG"
      },
      {
        confs: [0.9, 0.1, 0, 0, 0], extra: { off_assist: 0.05, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "WG", fallbackPos: "G?", diag: `(PG:)(P[PG] >= 85%) BUT (AST%[5.0] < 9%)`
      },

      {
        confs: [0.6, 0.4, 0, 0, 0], extra: { off_assist: 0.10, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "s-PG", fallbackPos: "G?", diag: `(P[PG] >= 50%)`, name: "Scoring PG"
      },
      {
        confs: [0.6, 0.4, 0, 0, 0], extra: { off_assist: 0.05, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "WG", fallbackPos: "G?", diag: `(pG:)(P[PG] >= 50%) BUT (AST%[5.0] < 9%)`
      },
      // Combo guards
      {
        confs: [0.4, 0.3, 0.2, 0.1, 0], extra: { off_assist: 0.10, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "CG", fallbackPos: "G?", diag: `(Max[P] == PG)`, name: "Combo Guard"
      },
      {
        confs: [0.4, 0.3, 0.2, 0.1, 0], extra: { off_assist: 0.05, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "WG", fallbackPos: "G?", diag: `(CG:)(Max[P] == PG) BUT (AST%[5.0] < 9%)`, name: "Wing Guard"
      },
      {
        confs: [0.2, 0.6, 0.1, 0.0, 0.1], extra: { off_assist: 0.10, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "CG", fallbackPos: "G?", diag: `(Max[P] == SG) AND (P[PG] >= P[SF] + P[PF] + P[C])`
      },
      {
        confs: [0.2, 0.6, 0.1, 0.0, 0.1], extra: { off_assist: 0.05, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "WG", fallbackPos: "G?", diag: `(CG:)(Max[P] == SG) AND (P[PG] >= P[SF] + P[PF] + P[C]) BUT (AST%[5.0] < 9%)`
      },
      // Wing guards
      {
        confs: [0.1, 0.6, 0.1, 0.1, 0.1], extra: { off_assist: 0.10, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "WG", fallbackPos: "G?", diag: `(Max[P] == SG) AND (P[PG] < P[SF] + P[PF] + P[C])`
      },
      {
        confs: [0.2, 0.2, 0.3, 0.2, 0.1], extra: { off_assist: 0.10, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "WG", fallbackPos: "G?", diag: `(Max[P] == SF) AND (P[PG] + P[SG] >= P[PF] + P[C])`
      },
      // Wing forwards:
      {
        confs: [0.2, 0.1, 0.3, 0.2, 0.2], extra: { off_assist: 0.10, off_3pr: 0.20, off_team_poss: 1000, off_usage: 0.20 },
        pos: "WF", fallbackPos: "F/C?", diag: `(Max[P] == SF) AND (P[PG] + P[SG] < P[PF] + P[C])`, name: "Wing Forward"
      },
      // Stretch-PF
      {
        confs: [0.0, 0.1, 0.1, 0.6, 0.2], extra: { off_assist: 0.10, off_3pr: 0.25, off_team_poss: 1000, off_usage: 0.20 },
        pos: "S-PF", fallbackPos: "F/C?", diag: `(Max[P] == PF) AND (P[PG] + P[SG] + P[SF] >= P[C])`, name: "Stretch PF"
      },
      {
        confs: [0.0, 0.1, 0.1, 0.6, 0.2], extra: { off_assist: 0.10, off_3pr: 0.15, off_team_poss: 1000, off_usage: 0.20 },
        pos: "PF/C", fallbackPos: "F/C?", diag: `(S4:)(Max[P] == PF) AND (P[PG] + P[SG] + P[SF] >= P[C]) BUT 3PR%[15.0] < 20%`
      },
      // PF/C
      {
        confs: [0.0, 0.0, 0.1, 0.9, 0.0], extra: { off_assist: 0.10, off_3pr: 0.25, off_team_poss: 1000, off_usage: 0.20 },
        pos: "PF/C", fallbackPos: "F/C?", diag: `(P[PF] >= 85%)`, name: "Power Forward/Center"
      },
      {
        confs: [0.0, 0.0, 0.05, 0.8, 0.15], extra: { off_assist: 0.10, off_3pr: 0.25, off_team_poss: 1000, off_usage: 0.20 },
        pos: "PF/C", fallbackPos: "F/C?", diag: `(Max[P] == C) OR ((Max[P] == PF) AND (P[PG] + P[SG] + P[SF] < P[C]))`
      },
      {
        confs: [0.0, 0.0, 0.0, 0.2, 0.8], extra: { off_assist: 0.10, off_3pr: 0.25, off_team_poss: 1000, off_usage: 0.20 },
        pos: "PF/C", fallbackPos: "F/C?", diag: `(Max[P] == C) OR ((Max[P] == PF) AND (P[PG] + P[SG] + P[SF] < P[C]))`
      },
      // C
      {
        confs: [0.0, 0.0, 0.0, 0.1, 0.9], extra: { off_assist: 0.10, off_3pr: 0.25, off_team_poss: 1000, off_usage: 0.20 },
        pos: "C", fallbackPos: "F/C?", diag: `(P[C] >= 85%)`, name: "Center"
      }
    ];
    const posList = PositionUtils.tradPosList;
    testCases.forEach((caseObj: any) => {
      const confObj = _.fromPairs(_.zip(posList, caseObj.confs).map(kv => [kv[0], kv[1]]));
      const player = _.mapValues(caseObj.extra, (v: any) => { return { value: v}; });
      expect(PositionUtils.buildPosition(confObj, player)).toEqual([ caseObj.pos, caseObj.diag ]);

      if (caseObj.name) {
        expect(PositionUtils.idToPosition[caseObj.pos as string]).toEqual(caseObj.name);
      }

      const playerTooFewPos = _.chain(player).clone().merge({off_team_poss: { value: 100 } }).value();
      expect(PositionUtils.buildPosition(confObj, playerTooFewPos)).toEqual([ caseObj.fallbackPos,
        `Too few used possessions [20.0]=[100]*[20.0]% < [25.0]. Would have matched [${caseObj.pos}] from rule [${caseObj.diag}]`
      ]);
    });
    expect(PositionUtils.idToPosition["G?"]).toEqual("Unknown - probably Guard");
    expect(PositionUtils.idToPosition["F/C?"]).toEqual("Unknown - probably Forward/Center");
  });
});