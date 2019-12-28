import React from 'react';
import TeamReportFilter from '../TeamReportFilter';
import { TeamReportFilterParams } from "../utils/FilterModels";
import { TeamReportStatsModel } from '../TeamReportStatsTable';
import { shallow } from 'enzyme'
import toJson from 'enzyme-to-json'

describe("TeamReportFilter", () => {
  test("TeamReportFilter - should create snapshot", () => {
    const dummySubmitCallback = (stats: TeamReportStatsModel) => {};
    const dummyChangeStateCallback = (stats: TeamReportFilterParams) => {};
    const wrapper = shallow(<TeamReportFilter
      onStats={dummySubmitCallback}
      startingState={{}}
      onChangeState={dummyChangeStateCallback}
    />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
//TODO: add mock for fetch and test submit etc
//TODO: check text
