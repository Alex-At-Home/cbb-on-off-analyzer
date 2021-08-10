import renderer from 'react-test-renderer';
import React from 'react';
import LineupStatsTable from '../LineupStatsTable';
import { TeamStatsModel } from '../TeamStatsTable';
import { LineupFilterParams } from "../utils/FilterModels";
import { SampleDataUtils } from "../../sample-data/SampleDataUtils";
import { sampleLineupStatsResponse } from "../../sample-data/sampleLineupStatsResponse";
import { sampleTeamStatsResponse } from "../../sample-data/sampleTeamStatsResponse";
import { samplePlayerStatsResponse } from "../../sample-data/samplePlayerStatsResponse";
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import _ from "lodash";
import { StatModels, LineupStatSet, IndivStatSet, TeamStatSet } from "../../utils/StatModels";

describe("LineupStatsTable", () => {

  // Tidy up snapshot rendering:
  expect.addSnapshotSerializer(SampleDataUtils.summarizeEnrichedApiResponse(
    sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets[0]
  ));


  test("LineupStatsTable - should create snapshot (no individual data)", () => {
    const testData = {
      lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[]
    };
    const dummyChangeStateCallback = (stats: LineupFilterParams) => {};
    const wrapper = shallow(
      <LineupStatsTable
        startingState={{}}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(), off: StatModels.emptyTeam(),
            baseline: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true
          },
          rosterStats: {
            on: [], off: [], baseline: [], global: []
          },
          lineupStats: testData
        }}
        onChangeState={dummyChangeStateCallback}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("LineupStatsTable - should create snapshot (with individual data)", () => {
    const testData = {
      lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[]
    };
    const teamData = _.assign(
      sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets,
      { global: StatModels.emptyTeam(), onOffMode: true }
    ) as TeamStatsModel;
    const playerData = {
      on: [], off: [],
      baseline: (samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.on.player.buckets as unknown) as IndivStatSet[],
      global: (samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets as unknown) as IndivStatSet[]
    };
    const dummyChangeStateCallback = (stats: LineupFilterParams) => {};
    const wrapper = shallow(
      <LineupStatsTable
        startingState={{}}
        dataEvent={{
          teamStats: teamData,
          rosterStats: playerData,
          lineupStats: testData
        }}
        onChangeState={dummyChangeStateCallback}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("LineupStatsTable - should create snapshot (with individual data - plain, luck, luck diags)", () => {
    const testData = {
      lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[]
    };
    const teamData = _.assign(
      sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets,
      { global: StatModels.emptyTeam(), onOffMode: true }
    ) as TeamStatsModel;
    const playerData = {
      on: [], off: [],
      baseline: (samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.on.player.buckets as unknown) as IndivStatSet[],
      global: (samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets as unknown) as IndivStatSet[]
    };
    const dummyChangeStateCallback = (stats: LineupFilterParams) => {};
    const wrapper = shallow(
      <LineupStatsTable
        startingState={{ decorate: false, lineupLuck: true, showLineupLuckDiags: true }}
        dataEvent={{
          teamStats: teamData,
          rosterStats: playerData,
          lineupStats: testData
        }}
        onChangeState={dummyChangeStateCallback}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("LineupStatsTable - should create snapshot (with individual data, aggregated by PG)", () => {
    const testData = {
      lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[]
    };
    const teamData = _.assign(
      sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets,
      { global: StatModels.emptyTeam(), onOffMode: true, aggByPos: "PG", showTotal: true }
    ) as TeamStatsModel;
    const playerData = {
      on: [], off: [],
      baseline: (samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.on.player.buckets as unknown) as IndivStatSet[],
      global: (samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets.baseline.player.buckets as unknown) as IndivStatSet[]
    };
    const dummyChangeStateCallback = (stats: LineupFilterParams) => {};
    const wrapper = shallow(
      <LineupStatsTable
        startingState={{}}
        dataEvent={{
          teamStats: teamData,
          rosterStats: playerData,
          lineupStats: testData
        }}
        onChangeState={dummyChangeStateCallback}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });});
