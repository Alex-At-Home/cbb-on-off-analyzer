import React from "react";
import TeamReportFilter from "../TeamReportFilter";
import { TeamReportFilterParams } from "../../utils/FilterModels";
import { LineupStatsModel } from "../../components/LineupStatsTable";
import { RosterStatsModel } from "../../components/RosterStatsTable";
import { TeamStatsModel } from "../../components/TeamStatsTable";
import { shallow } from "enzyme";
import toJson from "enzyme-to-json";

describe("TeamReportFilter", () => {
  test("TeamReportFilter - should create snapshot", () => {
    const dummySubmitCallback = (
      lineupStats: LineupStatsModel,
      teamStats: TeamStatsModel,
      rosterStats: RosterStatsModel,
    ) => {};
    const dummyChangeStateCallback = (stats: TeamReportFilterParams) => {};
    const wrapper = shallow(
      <TeamReportFilter
        onStats={dummySubmitCallback}
        startingState={{}}
        onChangeState={dummyChangeStateCallback}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
//TODO: add mock for fetch and test submit etc
//TODO: check text
