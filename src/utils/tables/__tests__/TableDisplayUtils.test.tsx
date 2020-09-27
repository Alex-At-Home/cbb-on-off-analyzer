import renderer from 'react-test-renderer';
import React from 'react';
import { TableDisplayUtils } from '../TableDisplayUtils';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import _ from "lodash";

import { SampleDataUtils } from "../../../sample-data/SampleDataUtils";
import { sampleLineupStatsResponse } from "../../../sample-data/sampleLineupStatsResponse";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { sampleTeamStatsResponse } from "../../../sample-data/sampleTeamStatsResponse";

describe("TableDisplayUtils", () => {

  const testLineup = [
    { code: "p1", id: "player1" },
    { code: "p2", id: "player2" },
    { code: "p3", id: "player3" },
    { code: "p4", id: "player4" },
    { code: "p5", id: "player5" },
  ];
  const positionFromPlayerKey = { //(just used for display)
    "player1": { posClass: "p-PG" },
    "player2": { posClass: "CG" },
    "player3": { posClass: "WG" },
    "player4": { posClass: "WF" },
    "player5": { posClass: "PF/C" },
  };
  const perLineupPlayerMap = {
    "player1": { // *3* A
        off_rtg: { value: 101 }, off_adj_rtg: { value : 0.5 }, //(rtg just used for display)
        off_usage: { value: 0.1 }, off_assist: { value: 0.20 },
        off_3pr: { value: 0.8 }, off_ftr: { value: 0.1 },
        def_orb: { value: 0.05 }, //(just used for display)
    },
    "player2": { // *A* *F*
        off_rtg: { value: 102 }, off_adj_rtg: { value : 1.0 }, //(rtg just used for display)
        off_usage: { value: 0.15 }, off_assist: { value: 0.30 },
        off_3pr: { value: 0.3 }, off_ftr: { value: 0.9 },
        def_orb: { value: 0.10 }, //(just used for display)
    },
    "player3": { // *2*
        off_rtg: { value: 103 }, off_adj_rtg: { value : 1.5 }, //(rtg just used for display)
        off_usage: { value: 0.20 }, off_assist: { value: 0.15 },
        off_3pr: { value: 0.01 }, off_ftr: { value: 0.3 },
        def_orb: { value: 0.15 }, //(just used for display)
    },
    "player4": { // 2 F
        off_rtg: { value: 104 }, off_adj_rtg: { value : 2.0 }, //(rtg just used for display)
        off_usage: { value: 0.25 }, off_assist: { value: 0.15 },
        off_3pr: { value: 0.15 }, off_ftr: { value: 0.5 },
        def_orb: { value: 0.20 }, //(just used for display)
    },
    "player5": { // 3 A F
        off_rtg: { value: 105 }, off_adj_rtg: { value : 2.5 }, //(rtg just used for display)
        off_usage: { value: 0.30 }, off_assist: { value: 0.20 },
        off_3pr: { value: 0.50 }, off_ftr: { value: 0.5 },
        def_orb: { value: 0.25 }, //(just used for display)
    },
  }

  test("buildDecoratedLineup - plain version", () => {
    const component = renderer.create(
      <span>{
        TableDisplayUtils.buildDecoratedLineup(
          "p1_p2_p3_p4_p5", testLineup, perLineupPlayerMap, positionFromPlayerKey, "off_adj_rtg", false
        )
      }</span>
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
  test("buildDecoratedLineup - decorated version", () => {
    const component = renderer.create(
      <span>{
        TableDisplayUtils.buildDecoratedLineup(
          "p1_p2_p3_p4_p5", testLineup, perLineupPlayerMap, positionFromPlayerKey, "off_adj_rtg", true
        )
      }</span>
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
  test("buildDecoratedLineup - buildTooltipTexts", () => {
    const component = renderer.create(
      <span>{
        TableDisplayUtils.buildTooltipTexts(
          "p1_p2_p3_p4_p5", testLineup, perLineupPlayerMap, positionFromPlayerKey
        )
      }</span>
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  // Mutate expect here for better display:

  const sampleData = {} as Record<string, any>;
  const injectData = (mutableIn: Record<string, any>, newSample: Record<string, any>) => {
    const fields = _.keys(mutableIn);
    fields.forEach(key => delete mutableIn[key]);
    _.toPairs(newSample).forEach(kv => mutableIn[kv[0]] = kv[1]);
  }

  expect.addSnapshotSerializer(SampleDataUtils.summarizeEnrichedApiResponse(
    sampleData, true
  ));

  test("injectPlayTypeInfo - lineups", () => {
    injectData(sampleData, sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets[1]);
    expect(TableDisplayUtils.injectPlayTypeInfo(
      sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets[0],
      false, false
    )).toMatchSnapshot();
  });

  test("injectPlayTypeInfo - players (!expanded)", () => {
    injectData(sampleData,
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets[1]
    );
    expect(TableDisplayUtils.injectPlayTypeInfo(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets[0],
      false, true
    )).toMatchSnapshot();
  });

  test("injectPlayTypeInfo - players (expanded)", () => {
    injectData(sampleData,
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets[1]
    );
    expect(TableDisplayUtils.injectPlayTypeInfo(
      samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets[0],
      true, true
    )).toMatchSnapshot();
  });
});
