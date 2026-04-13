/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import PositionalDiagView from "../PositionalDiagView";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";

describe("PositionalDiagView", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
    const { asFragment } = render(
      <PositionalDiagView
        showHelp={true}
        player={testData.on[0]}
        teamSeason="Men_Maryland_2018/9"
        showDetailsOverride={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("PositionalDiagView - should create snapshot (basic details, !help)", () => {
    const { asFragment } = render(
      <PositionalDiagView
        showHelp={false}
        player={testData.baseline[0]}
        teamSeason="Men_Maryland_2018/9"
        showDetailsOverride={false}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("PositionalDiagView - should create snapshot (use height, basic details, !help)", () => {
    const { asFragment } = render(
      <PositionalDiagView
        showHelp={false}
        player={{ ...testData.baseline[0], roster: { height_in: 81 } }}
        teamSeason="Men_Maryland_2018/9"
        showDetailsOverride={false}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
