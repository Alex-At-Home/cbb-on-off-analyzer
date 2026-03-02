import renderer from "react-test-renderer";
import React from "react";
import PositionalDiagView from "../PositionalDiagView";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { shallow } from "enzyme";
import toJson from "enzyme-to-json";

describe("PositionalDiagView", () => {
  const testData = {
    on:
      samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
        ?.on?.player?.buckets || [],
    off:
      samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
        ?.off?.player?.buckets || [],
    baseline:
      samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
        ?.baseline?.player?.buckets || [],
    error_code: undefined,
  };
  test("PositionalDiagView - should create snapshot (details, help)", () => {
    const wrapper = shallow(
      <PositionalDiagView
        showHelp={true}
        player={testData.on[0]}
        teamSeason="Men_Maryland_2018/9"
        showDetailsOverride={true}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("PositionalDiagView - should create snapshot (basic details, !help)", () => {
    const wrapper = shallow(
      <PositionalDiagView
        showHelp={false}
        player={testData.baseline[0]}
        teamSeason="Men_Maryland_2018/9"
        showDetailsOverride={false}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("PositionalDiagView - should create snapshot (use height, basic details, !help)", () => {
    const wrapper = shallow(
      <PositionalDiagView
        showHelp={false}
        player={{ ...testData.baseline[0], roster: { height_in: 81 } }}
        teamSeason="Men_Maryland_2018/9"
        showDetailsOverride={false}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
