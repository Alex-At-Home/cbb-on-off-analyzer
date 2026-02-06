/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { shallow } from "enzyme";
import toJson from "enzyme-to-json";
import LineupAveragedStintsChart from "../LineupAveragedStintsChart";
import { TimeBinnedAggregation } from "../../utils/StatModels";
import { MatchupFilterParams } from "../../utils/FilterModels";
import fs from "fs";

// Mock ResizeObserver for react-bootstrap components
const ResizeObserver = (window as any).ResizeObserver;

describe("LineupAveragedStintsChart", () => {
  beforeEach(() => {
    delete (window as any).ResizeObserver;
    (window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  afterEach(() => {
    (window as any).ResizeObserver = ResizeObserver;
  });

  // Load sample data
  const sampleData = JSON.parse(
    fs.readFileSync("./src/sample-data/sampleLineupStintAverages.json", {
      encoding: "utf-8",
    })
  );
  const aggregations =
    sampleData.responses[0].aggregations as TimeBinnedAggregation;

  test("LineupAveragedStintsChart (teamA only, default settings) - should create snapshot", async () => {
    const { container } = render(
      <LineupAveragedStintsChart
        teamA="Maryland"
        dataEvent={{ aggregatedStintsA: aggregations }}
        startingState={{}}
        onChangeState={(newParams: MatchupFilterParams) => {}}
      />
    );
    await waitFor(() => {
      expect(container).toMatchSnapshot();
    });
  });

  test("LineupAveragedStintsChart (teamA only, usage+ppp enabled) - should create snapshot", () => {
    const wrapper = shallow(
      <LineupAveragedStintsChart
        teamA="Maryland"
        dataEvent={{ aggregatedStintsA: aggregations }}
        startingState={{
          showUsage: true,
          showPpp: true,
          showLabels: false,
        }}
        onChangeState={(newParams: MatchupFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test("LineupAveragedStintsChart (teamA only, labels enabled with Points) - should create snapshot", () => {
    const wrapper = shallow(
      <LineupAveragedStintsChart
        teamA="Maryland"
        dataEvent={{ aggregatedStintsA: aggregations }}
        startingState={{
          showUsage: true,
          showPpp: true,
          showLabels: true,
          labelToShow: "Points",
        }}
        onChangeState={(newParams: MatchupFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test("LineupAveragedStintsChart (teamA only, labels enabled with Plus Minus) - should create snapshot", () => {
    const wrapper = shallow(
      <LineupAveragedStintsChart
        teamA="Maryland"
        dataEvent={{ aggregatedStintsA: aggregations }}
        startingState={{
          showUsage: true,
          showPpp: false,
          showLabels: true,
          labelToShow: "Plus Minus",
        }}
        onChangeState={(newParams: MatchupFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test("LineupAveragedStintsChart (teamA and teamB) - should create snapshot", () => {
    const wrapper = shallow(
      <LineupAveragedStintsChart
        teamA="Maryland"
        teamB="Duke"
        dataEvent={{
          aggregatedStintsA: aggregations,
          aggregatedStintsB: aggregations, // Use same data for both teams in test
        }}
        startingState={{
          showUsage: true,
          showPpp: true,
        }}
        onChangeState={(newParams: MatchupFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
