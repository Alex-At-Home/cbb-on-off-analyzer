

import _ from 'lodash';

import { RatingUtils } from "../RatingUtils";
import { GameFilterParams, LineupFilterParams, TeamReportFilterParams } from "../../FilterModels";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { sampleOrtgDiagnostics } from "../../../sample-data/sampleOrtgDiagnostics";
import { sampleDrtgDiagnostics } from "../../../sample-data/sampleDrtgDiagnostics";

describe("RatingUtils", () => {

  // Write the data objects out in pure JS format so we can store them
  expect.addSnapshotSerializer({
    test: (val: any) => true,
    print: (val: any) => JSON.stringify(val, null, 3)
  });

  test("RatingUtils - buildORtg", () => {
    const playerInfo = _.cloneDeep(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets[0]
    );
    const [ oRtg, adjORtg, rawORtg, rawAdjORtg, oRtgDiags ] = RatingUtils.buildORtg(
      playerInfo, 100, true, false
    );
    const expORtg = {value:113.40865079767507};
    const expORtgAdj = {value:5.002326978989183};
    expect(oRtg).toEqual(expORtg);
    expect(adjORtg).toEqual(expORtgAdj);
    expect(rawORtg).toEqual(undefined);
    expect(rawAdjORtg).toEqual(undefined);
    expect(oRtgDiags).toMatchSnapshot();
    // Then can be copied into here:
    expect(oRtgDiags).toEqual(sampleOrtgDiagnostics);

    // Check with override:
    (playerInfo as any).off_3p = {
      value: playerInfo.off_3p.value - 0.1,
      old_value: playerInfo.off_3p.value
    };
    const [ oRtg2, adjORtg2, rawORtg2, rawAdjORtg2, oRtgDiags2 ] = RatingUtils.buildORtg(
      playerInfo, 100, true, true
    );
    expect(oRtg2).toEqual({value:104.9838324244601});
    expect(adjORtg2).toEqual({value:3.123247651476328});
    expect(rawORtg2).toEqual(expORtg);
    expect(rawAdjORtg2).toEqual(expORtgAdj);
  });
  test("RatingUtils - buildOffOverrides", () => {
    const outputs = {
      total_off_fgm: { value: 0.0001 },
      total_off_2p_made: { value: 0.0002 },
      total_off_3p_made: { value: 0.0003 },
      total_off_ftm: { value: 0.0004 },
      team_total_off_pts: { value: 0.0005 },
      team_total_off_fgm: undefined, //(check it will be set as 0)
      team_total_off_3p_made: { value: 0.0007 },
      team_total_off_ftm: { value: 0.0008 },
      team_total_off_to: { value: 0.0009 }
    };
    const testStatSet = {
      // some volume numbers:
      total_off_3p_attempts: { value: 10 },
      total_off_2p_attempts: { value: 20 },
      total_off_fta: { value: 20 },
      total_off_to: { value: 20 },
      off_poss: { value: 100 },

      // all the possible overrides currently:
      off_3p: { value: 0.5, old_value: 0.4 },
      off_2p: { value: 0.6, old_value: 0.4 },
      off_ft: { value: 0.9, old_value: 0.7 },
      off_to: { value: 0.25, old_value: 0.2 },

      // Outputs:
      ...outputs
    };
    expect(RatingUtils.buildOffOverrides(testStatSet)).toEqual({
      total_off_to: { value: 26.666666666666668 },
      off_poss: { value: 106.66666666666667 }, //(extra 5% TOs)

      total_off_fgm: { value: 5.000099999999999 },
      total_off_2p_made: { value: 4.0001999999999995 },
      total_off_3p_made: { value: 1.0002999999999997 },
      total_off_ftm: { value: 4.000400000000002 },
      team_total_off_pts: { value: 15.000499999999999 },
      team_total_off_fgm: { value: 4.999999999999999 },
      team_total_off_3p_made: { value: 1.0006999999999997 },
      team_total_off_ftm: { value: 4.000800000000002 },
      team_total_off_to: { value: 6.667566666666667 }
    });
    // Now just check it does nothing if there are no changes
    const testStatSet2 = {
      ...testStatSet,
      off_3p: { value: 0.4 },
      off_2p: { value: 0.4 },
      off_ft: { value: 0.7 },
      off_to: { value: 0.2 }
    };
    expect(RatingUtils.buildOffOverrides(testStatSet2)).toEqual({
      ...outputs,
      team_total_off_fgm: { value: 0 },
      total_off_to: { value: 20 },
      off_poss: { value: 100 },
    });
  });

  test("RatingUtils - buildDRtg", () => {
    const playerInfo = _.cloneDeep(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets[0]
    );
    const [ dRtg, adjDRtg, rawDRtg, rawAdjDRtg, dRtgDiags ] = RatingUtils.buildDRtg(
      playerInfo, 100, true, false
    );
    const expDRtg = {value:98.84955759282161};
    const expDRtgAdj = {value:-1.7012563565592531};
    expect(dRtg).toEqual(expDRtg);
    expect(adjDRtg).toEqual(expDRtgAdj);
    expect(rawDRtg).toEqual(undefined);
    expect(rawAdjDRtg).toEqual(undefined);
    expect(dRtgDiags).toMatchSnapshot();
    // Then can be copied into here:
    expect(dRtgDiags).toEqual(sampleDrtgDiagnostics);

    // Check with override:
    (playerInfo as any).oppo_def_3p = {
      value: 0.3,
      old_value: 0.4
    };
    const [ dRtg2, adjDRtg2, rawDRtg2, rawAdjDRtg2, dRtgDiags2 ] = RatingUtils.buildDRtg(
      playerInfo, 100, true, true
    );
    expect(dRtg2).toEqual({value:89.6487161188261});
    expect(adjDRtg2).toEqual({value:-3.404489466919759});
    expect(rawDRtg2).toEqual(expDRtg);
    expect(rawAdjDRtg2).toEqual(expDRtgAdj);
  });
});
