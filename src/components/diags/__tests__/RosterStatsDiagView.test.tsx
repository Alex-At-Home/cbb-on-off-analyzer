import renderer from "react-test-renderer";
import React from "react";
import _ from "lodash";
import RosterStatsDiagView from "../RosterStatsDiagView";
import { sampleOrtgDiagnostics } from "../../../sample-data/sampleOrtgDiagnostics";
import { sampleDrtgDiagnostics } from "../../../sample-data/sampleDrtgDiagnostics";
import { sampleOnBallDefenseStats } from "../../../sample-data/sampleOnBallDefenseStats";
import { sampleOnBallDefDiagnostics } from "../../../sample-data/sampleOnBallDefDiagnostics";
import {
  RatingUtils,
  DRtgDiagnostics,
  OnBallDefenseDiags,
  OnBallDefenseModel,
} from "../../../utils/stats/RatingUtils";

describe("RosterStatsDiagView", () => {
  test("RosterStatsDiagView - should create snapshot", () => {
    const testData = null;
    const component = renderer.create(
      <RosterStatsDiagView
        ortgDiags={sampleOrtgDiagnostics}
        drtgDiags={sampleDrtgDiagnostics}
      />,
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
  test("RosterStatsDiagView - expanded, should create snapshot", () => {
    const testData = null;
    const component = renderer.create(
      <RosterStatsDiagView
        ortgDiags={sampleOrtgDiagnostics}
        drtgDiags={sampleDrtgDiagnostics}
        expandAll={true}
      />,
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
  test("RosterStatsDiagView - should create snapshot", () => {
    const testData = null;
    const drtgDiags = _.cloneDeep(sampleDrtgDiagnostics) as DRtgDiagnostics;
    const onBallStats = _.cloneDeep(
      sampleOnBallDefenseStats[1],
    ) as OnBallDefenseModel[];
    const teamStats = sampleOnBallDefenseStats[0] as OnBallDefenseModel;
    const modOnBallStats: OnBallDefenseModel[] =
      RatingUtils.injectUncatOnBallDefenseStats(teamStats, onBallStats);
    drtgDiags.onBallDef = modOnBallStats[0];
    drtgDiags.onBallDiags = sampleOnBallDefDiagnostics;
    const component = renderer.create(
      <RosterStatsDiagView
        ortgDiags={sampleOrtgDiagnostics}
        drtgDiags={drtgDiags}
      />,
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
  test("RosterStatsDiagView - expanded, should create snapshot", () => {
    const testData = null;
    const drtgDiags = _.cloneDeep(sampleDrtgDiagnostics) as DRtgDiagnostics;
    const onBallStats = _.cloneDeep(
      sampleOnBallDefenseStats[1],
    ) as OnBallDefenseModel[];
    const teamStats = sampleOnBallDefenseStats[0] as OnBallDefenseModel;
    const modOnBallStats: OnBallDefenseModel[] =
      RatingUtils.injectUncatOnBallDefenseStats(teamStats, onBallStats);
    drtgDiags.onBallDef = modOnBallStats[0];
    drtgDiags.onBallDiags = sampleOnBallDefDiagnostics;
    const component = renderer.create(
      <RosterStatsDiagView
        ortgDiags={sampleOrtgDiagnostics}
        drtgDiags={drtgDiags}
        expandAll={true}
      />,
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
