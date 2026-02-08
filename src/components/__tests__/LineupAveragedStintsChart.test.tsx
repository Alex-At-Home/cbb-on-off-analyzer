/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { shallow } from "enzyme";
import toJson from "enzyme-to-json";
import LineupAveragedStintsChart from "../LineupAveragedStintsChart";
import { StatModels, TimeBinnedAggregation } from "../../utils/StatModels";
import { MatchupFilterParams } from "../../utils/FilterModels";
import { LineupStatsModel } from "../LineupStatsTable";
import { TeamStatsModel } from "../TeamStatsTable";
import { RosterStatsModel } from "../RosterStatsTable";
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

  // Mock data for required props
  const mockLineupStats: LineupStatsModel = { lineups: [] };
  const mockTeamStats: TeamStatsModel = {
    on: StatModels.emptyTeam(),
    off: StatModels.emptyTeam(),
    baseline: StatModels.emptyTeam(),
    global: StatModels.emptyTeam(),
  };
  const mockRosterStats: RosterStatsModel = {
    on: [],
    off: [],
    other: [],
    baseline: [],
    global: [],
  };

  test("LineupAveragedStintsChart (teamA only, default settings) - should create snapshot", async () => {
    const { container } = render(
      <LineupAveragedStintsChart
        teamA="Maryland"
        dataEvent={{
          aggregatedStintsA: aggregations,
          lineupStatsA: mockLineupStats,
          teamStatsA: mockTeamStats,
          rosterStatsA: mockRosterStats,
        }}
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
        dataEvent={{
          aggregatedStintsA: aggregations,
          lineupStatsA: mockLineupStats,
          teamStatsA: mockTeamStats,
          rosterStatsA: mockRosterStats,
        }}
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
        dataEvent={{
          aggregatedStintsA: aggregations,
          lineupStatsA: mockLineupStats,
          teamStatsA: mockTeamStats,
          rosterStatsA: mockRosterStats,
        }}
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
        dataEvent={{
          aggregatedStintsA: aggregations,
          lineupStatsA: mockLineupStats,
          teamStatsA: mockTeamStats,
          rosterStatsA: mockRosterStats,
        }}
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
          lineupStatsA: mockLineupStats,
          teamStatsA: mockTeamStats,
          rosterStatsA: mockRosterStats,
          lineupStatsB: mockLineupStats,
          teamStatsB: mockTeamStats,
          rosterStatsB: mockRosterStats,
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
