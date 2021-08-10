import renderer from 'react-test-renderer';
import React from 'react';
import RosterStatsTable, { RosterStatsModel } from '../RosterStatsTable';
import { SampleDataUtils } from "../../sample-data/SampleDataUtils";
import { samplePlayerStatsResponse } from "../../sample-data/samplePlayerStatsResponse";
import { GameFilterParams } from "../utils/FilterModels";
import { shallow } from 'enzyme'
import toJson from 'enzyme-to-json'
import _ from "lodash";
import { StatModels, LineupStatSet, IndivStatSet, TeamStatSet } from "../../utils/StatModels";

describe("RosterStatsTable", () => {

  // Tidy up snapshot rendering:
  expect.addSnapshotSerializer(SampleDataUtils.summarizeEnrichedApiResponse(
    samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets[0]
  ));

  test("RosterStatsTable (baseline only, !expanded) - should create snapshot", () => {
    const testData = {
      on: [],
      off: [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: _.cloneDeep(samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []),
      error_code: undefined
    } as unknown as RosterStatsModel;
    const wrapper = shallow(
    <RosterStatsTable
      gameFilterParams={{showExpanded: false}}
      dataEvent={{
        teamStats: {on: StatModels.emptyTeam(), off: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true, baseline: StatModels.emptyTeam()},
        rosterStats: testData,
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
    />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (baseline only, expanded) - should create snapshot", () => {
    const testData = {
      on: [],
      off: [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: _.cloneDeep(samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []),
      error_code: undefined
    } as unknown as RosterStatsModel;
    const wrapper = shallow(
    <RosterStatsTable
      gameFilterParams={{showExpanded: true}}
      dataEvent={{
        teamStats: {on: StatModels.emptyTeam(), off: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true, baseline: StatModels.emptyTeam()},
        rosterStats: testData,
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
    />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (!expanded) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.on?.player?.buckets || [],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.off?.player?.buckets || [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: _.cloneDeep(samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []),
      error_code: undefined
    } as unknown as RosterStatsModel;
    const wrapper = shallow(
    <RosterStatsTable
      gameFilterParams={{}}
      dataEvent={{
        teamStats: {on: StatModels.emptyTeam(), off: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true, baseline: StatModels.emptyTeam()},
        rosterStats: testData,
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
    />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (expanded) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.on?.player?.buckets || [],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.off?.player?.buckets || [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: _.cloneDeep(samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []),
      error_code: undefined
    } as unknown as RosterStatsModel;
    const wrapper = shallow(
    <RosterStatsTable
      gameFilterParams={{showExpanded: true}}
      dataEvent={{
        teamStats: {on: StatModels.emptyTeam(), off: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true, baseline: StatModels.emptyTeam()},
        rosterStats: testData,
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
    />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (luck enabled, all the diags) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.on?.player?.buckets || [],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.off?.player?.buckets || [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: _.cloneDeep(samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []),
      error_code: undefined
    } as unknown as RosterStatsModel;

    const wrapper = shallow(
    <RosterStatsTable
      gameFilterParams={{onOffLuck: true, showPlayerOnOffLuckDiags: true, showDiag: true, showPosDiag: true }}
      dataEvent={{
        teamStats: {on: StatModels.emptyTeam(), off: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true, baseline: StatModels.emptyTeam()},
        rosterStats: testData,
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
    />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (manual enabled - manual dialog showing, all the diags) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.on?.player?.buckets || [],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.off?.player?.buckets || [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: _.cloneDeep(samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []),
      error_code: undefined
    } as unknown as RosterStatsModel;

    const wrapper = shallow(
    <RosterStatsTable
      gameFilterParams={{onOffLuck: false, showPlayerOnOffLuckDiags: true, showDiag: true, showPosDiag: true,
        manual: [
          { rowId: "Cowan, Anthony / Baseline", newVal: 0.5, statName: "off_3p", use: true },
        ],
        showPlayerManual: true
       }}
      dataEvent={{
        teamStats: {on: StatModels.emptyTeam(), off: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true, baseline: StatModels.emptyTeam()},
        rosterStats: testData,
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
    />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (luck+overrides enabled, all the diags) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.on?.player?.buckets || [],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.off?.player?.buckets || [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: _.cloneDeep(samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || []),
      error_code: undefined
    } as unknown as RosterStatsModel;

    const wrapper = shallow(
    <RosterStatsTable
      gameFilterParams={{onOffLuck: true,
        showPlayerOnOffLuckDiags: true, showDiag: true, showPosDiag: true, showPlayerPlayTypes: true,
        manual: [
          { rowId: "Cowan, Anthony / Baseline", newVal: 0.5, statName: "off_3p", use: true },
        ],
        showPlayerManual: true
       }}
      dataEvent={{
        teamStats: {on: StatModels.emptyTeam(), off: StatModels.emptyTeam(), global: StatModels.emptyTeam(), onOffMode: true, baseline: StatModels.emptyTeam()},
        rosterStats: testData,
        lineupStats: []
      }}
      onChangeState={(newParams: GameFilterParams) => {}}
    />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
