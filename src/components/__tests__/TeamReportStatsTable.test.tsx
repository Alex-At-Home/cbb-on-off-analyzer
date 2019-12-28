import renderer from 'react-test-renderer';
import React from 'react';
import TeamReportStatsTable, { TeamReportStatsModel } from '../TeamReportStatsTable';
import { TeamReportFilterParams } from "../utils/FilterModels";
import { sampleTeamReportResponse } from "../../sample-data/sampleTeamReportResponse";
import { shallow } from 'enzyme'
import toJson from 'enzyme-to-json'

describe("TeamReportStatsTable", () => {
  test("TeamReportStatsTable - should create snapshot", () => {
    const onPlayer = "'ON' Ayala, Eric";
    const offPlayer = "'OFF' Ayala, Eric";
    const resultMap = sampleTeamReportResponse.responses[0].aggregations.roster_filter.buckets;
    const testData: TeamReportStatsModel = {
      players: [
        { on: { key: onPlayer, ...resultMap[onPlayer] }, off: { key: offPlayer, ...resultMap[offPlayer] } }
      ]
    };
    const dummyChangeStateCallback = (stats: TeamReportFilterParams) => {};
    const wrapper = shallow(
      <TeamReportStatsTable
        teamReport={testData}
        startingState={{}}
        onChangeState={dummyChangeStateCallback}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
