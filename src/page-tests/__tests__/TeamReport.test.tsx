import React from 'react';
import TeamReportPage from '../../pages/TeamReport';
import { shallow } from 'enzyme'
import toJson from 'enzyme-to-json'

describe("TeamReportPage", () => {
  test("TeamReportPage - should create snapshot", () => {
    const wrapper = shallow(<TeamReportPage/>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
