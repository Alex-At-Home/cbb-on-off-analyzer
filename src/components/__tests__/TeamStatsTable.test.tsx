import renderer from 'react-test-renderer';
import React from 'react';
import _ from 'lodash';
import TeamStatsTable, { TeamStatsModel } from '../TeamStatsTable';
import { SampleDataUtils } from "../../sample-data/SampleDataUtils";
import { sampleLineupStatsResponse } from "../../sample-data/sampleLineupStatsResponse";
import { sampleTeamStatsResponse } from "../../sample-data/sampleTeamStatsResponse";
import { samplePlayerStatsResponse } from "../../sample-data/samplePlayerStatsResponse";
import { GameFilterParams } from '../../utils/FilterModels';
import { StatModels, LineupStatSet, IndivStatSet, TeamStatSet } from "../../utils/StatModels";

describe("TeamStatsTable", () => {

  // Tidy up snapshot rendering:
  expect.addSnapshotSerializer(SampleDataUtils.summarizeEnrichedApiResponse(
    sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline
  ));

  const testData = _.assign(
    sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets as { on: any, off: any, baseline: any },
    { global: {}, onOffMode: true }
  ) as TeamStatsModel;
  const players = ((samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []) as unknown) as IndivStatSet[];
  const testRosterData = {
    on: _.cloneDeep(players) as unknown as IndivStatSet[],
    off: _.cloneDeep(players) as unknown as IndivStatSet[],
    baseline: ((samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []) as unknown) as IndivStatSet[],
    global: _.cloneDeep(players) as unknown as IndivStatSet[],
    error_code: undefined
  };
  const testLineupData = {
    lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[]
  }


  test("TeamStatsTable - should create snapshot", () => {
    const component = renderer.create(<TeamStatsTable
      gameFilterParams={{}}
      dataEvent={{
        teamStats: testData,
        rosterStats: {
          on: [], off: [], global: [], baseline: []
        },
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
      />);
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
  test("TeamStatsTable - should create snapshot, luck enabled + diagnostics shown", () => {
    const component = renderer.create(<TeamStatsTable
      gameFilterParams={{ onOffLuck: true, showOnOffLuckDiags: true, showRoster: true, showTeamPlayTypes: true }}
      dataEvent={{
        teamStats: testData,
        rosterStats: testRosterData,
        lineupStats: [ ] //(can't find lineup that works with this, needs more investigation - in the meantime just show the empty table)
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
      />);
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
