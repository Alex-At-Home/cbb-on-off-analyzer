import _ from "lodash";

import {
  RatingUtils,
  DRtgDiagnostics,
  OnBallDefenseModel,
} from "../RatingUtils";
import {
  GameFilterParams,
  LineupFilterParams,
  TeamReportFilterParams,
} from "../../FilterModels";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { sampleOrtgDiagnostics } from "../../../sample-data/sampleOrtgDiagnostics";
import { sampleDrtgDiagnostics } from "../../../sample-data/sampleDrtgDiagnostics";
import { sampleOnBallDefenseStats } from "../../../sample-data/sampleOnBallDefenseStats";
import { IndivStatSet } from "../../StatModels";

describe("RatingUtils", () => {
  // Write the data objects out in pure JS format so we can store them
  expect.addSnapshotSerializer({
    test: (val: any) => true,
    print: (val: any) => JSON.stringify(val, null, 3),
  });

  test("RatingUtils - buildORtg", () => {
    const playerInfo = _.cloneDeep(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets
        .baseline.player.buckets[0],
    );
    const [oRtg, adjORtg, rawORtg, rawAdjORtg, oRtgDiags] =
      RatingUtils.buildORtg(
        playerInfo as any as IndivStatSet,
        {},
        { total_off_to: { value: 0 }, sum_total_off_to: {} },
        100,
        true,
        false,
      );
    const expORtg = { value: 119.84956630535876 };
    const expORtgAdj = { value: 6.856412755959791 };
    expect(rawORtg).toEqual(undefined);
    expect(rawAdjORtg).toEqual(undefined);
    expect(oRtgDiags).toMatchSnapshot();
    // Then can be copied into here:
    expect(oRtgDiags).toEqual(sampleOrtgDiagnostics);

    // Check with override:
    (playerInfo as any).off_3p = {
      value: playerInfo.off_3p.value - 0.1,
      old_value: playerInfo.off_3p.value,
    };
    const [oRtg2, adjORtg2, rawORtg2, rawAdjORtg2, oRtgDiags2] =
      RatingUtils.buildORtg(
        playerInfo as any as IndivStatSet,
        {},
        { total_off_to: { value: 0 }, sum_total_off_to: {} },
        100,
        false,
        true,
      );
    const expORtg2 = { value: 111.95544936503978 };
    const expORtgAd2 = { value: 4.680453508281225 };
    // Override exists but is disabled:
    const [oRtg2b, adjORtg2b, rawORtg2b, rawAdjORtg2b, oRtgDiags2b] =
      RatingUtils.buildORtg(
        playerInfo as any as IndivStatSet,
        {},
        { total_off_to: { value: 0 }, sum_total_off_to: {} },
        100,
        false,
        false,
      );
    //(expected versions should be 1)

    // Check with team TO

    (playerInfo as any).off_team_poss_pct = {
      value: 0.5,
    };
    const [oRtg3, adjORtg3, rawORtg3, rawAdjORtg3, oRtgDiags3] =
      RatingUtils.buildORtg(
        playerInfo as any as IndivStatSet,
        {},
        { total_off_to: { value: 100 }, sum_total_off_to: { value: 80 } },
        100,
        false,
        true,
      );
    const expORtg3 = { value: 111.48470743647295 };
    const expORtgAd3 = { value: 4.57834474024571 };

    // Do the tests as clumped as possible
    expect({
      oRtg: oRtg,
      adjORtg: adjORtg,
      oRtg2: oRtg2,
      adjORtg2: adjORtg2,
      oRtg2b: oRtg2b,
      adjORtg2b: adjORtg2b,
      oRtg3: oRtg3,
      adjORtg3: adjORtg3,
    }).toEqual({
      oRtg: expORtg,
      adjORtg: expORtgAdj,
      oRtg2: expORtg2,
      adjORtg2: expORtgAd2,
      oRtg2b: expORtg,
      adjORtg2b: expORtgAdj,
      oRtg3: expORtg3,
      adjORtg3: expORtgAd3,
    });
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
      team_total_off_to: { value: 0.0009 },
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
      ...outputs,
    };
    expect(
      RatingUtils.buildOffOverrides(testStatSet as any as IndivStatSet),
    ).toEqual({
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
      team_total_off_to: { value: 6.667566666666667 },
    });
    // Now just check it does nothing if there are no changes
    const testStatSet2 = {
      ...testStatSet,
      off_3p: { value: 0.4 },
      off_2p: { value: 0.4 },
      off_ft: { value: 0.7 },
      off_to: { value: 0.2 },
    };
    expect(
      RatingUtils.buildOffOverrides(testStatSet2 as any as IndivStatSet),
    ).toEqual({
      ...outputs,
      team_total_off_fgm: { value: 0 },
      total_off_to: { value: 20 },
      off_poss: { value: 100 },
    });
  });

  test("RatingUtils - buildDRtg", () => {
    const playerInfo = _.cloneDeep(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets
        .baseline.player.buckets[0],
    );
    const [dRtg, adjDRtg, rawDRtg, rawAdjDRtg, dRtgDiags] =
      RatingUtils.buildDRtg(playerInfo, 100, true, false);
    const expDRtg = { value: 99.2719681851988 };
    const expDRtgAdj = { value: -1.6230609318106304 };
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
      old_value: 0.4,
    };
    const [dRtg2, adjDRtg2, rawDRtg2, rawAdjDRtg2, dRtgDiags2] =
      RatingUtils.buildDRtg(playerInfo, 100, true, true);
    expect(dRtg2).toEqual({ value: 90.04849177213895 });
    expect(adjDRtg2).toEqual({ value: -3.3304841564964764 });
    expect(rawDRtg2).toEqual(expDRtg);
    expect(rawAdjDRtg2).toEqual(expDRtgAdj);
  });

  test("RatingUtils - injectUncatOnBallDefenseStats", () => {
    const onBallStats = _.cloneDeep(
      sampleOnBallDefenseStats[1],
    ) as OnBallDefenseModel[];
    const teamStats = sampleOnBallDefenseStats[0] as OnBallDefenseModel;
    const modOnBallStats: OnBallDefenseModel[] =
      RatingUtils.injectUncatOnBallDefenseStats(teamStats, onBallStats);
    expect(modOnBallStats).toMatchSnapshot();
  });
  test("RatingUtils - buildOnBallDefenseAdjustmentsPhase1", () => {
    const onBallStats = _.cloneDeep(
      sampleOnBallDefenseStats[1],
    ) as OnBallDefenseModel[];
    const teamStats = sampleOnBallDefenseStats[0] as OnBallDefenseModel;
    const modOnBallStats: OnBallDefenseModel[] =
      RatingUtils.injectUncatOnBallDefenseStats(teamStats, onBallStats);
    const playerOnBallStats = modOnBallStats[0]!;
    const playerInfo = _.cloneDeep(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets
        .baseline.player.buckets[0],
    ) as any as IndivStatSet;
    playerInfo.def_team_poss_pct = { value: 0.2 };

    const onBallDiags = RatingUtils.buildOnBallDefenseAdjustmentsPhase1(
      playerInfo,
      sampleDrtgDiagnostics,
      playerOnBallStats,
    );
    expect(onBallDiags).toMatchSnapshot();
  });
  test("RatingUtils - injectOnBallDefenseAdjustmentsPhase2", () => {
    const playerBallStats = _.cloneDeep(
      sampleOnBallDefenseStats[1],
    ) as OnBallDefenseModel[];
    const teamStats = sampleOnBallDefenseStats[0] as OnBallDefenseModel;
    const modOnBallStats: OnBallDefenseModel[] =
      RatingUtils.injectUncatOnBallDefenseStats(teamStats, playerBallStats);

    const playersToMutate = _.cloneDeep(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets
        .baseline.player.buckets,
    ) as any[] as IndivStatSet[];
    playersToMutate.forEach((p, ii) => {
      const dRtgDiag = _.cloneDeep(sampleDrtgDiagnostics) as DRtgDiagnostics;
      const onBallStats = playerBallStats[ii % playerBallStats.length];
      p.def_rtg = { value: dRtgDiag.dRtg };
      p.def_team_poss_pct = { value: 0.2 };
      const onBallDiags = RatingUtils.buildOnBallDefenseAdjustmentsPhase1(
        p,
        dRtgDiag,
        onBallStats,
      );
      p.diag_def_rtg = dRtgDiag;
      dRtgDiag.onBallDef = onBallStats;
      dRtgDiag.onBallDiags = onBallDiags;
    });
    RatingUtils.injectOnBallDefenseAdjustmentsPhase2(playersToMutate, {});

    expect(playersToMutate[0]?.diag_def_rtg?.onBallDiags).toMatchSnapshot();
  });
});
