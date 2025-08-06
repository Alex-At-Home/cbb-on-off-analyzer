import React from "react";
import TeamLeaderboard from "../../pages/TeamLeaderboardPage";
import { shallow } from "enzyme";
import toJson from "enzyme-to-json";

describe("TeamLeaderboardPage", () => {
  test("TeamLeaderboardPage - should create snapshot", () => {
    const wrapper = shallow(<TeamLeaderboard testMode={true} />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
