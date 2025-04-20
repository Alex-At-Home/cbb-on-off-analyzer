/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";

import React from "react";
import _ from "lodash";
import TeamStatsTable from "../TeamStatsTable";
import { SampleDataUtils } from "../../sample-data/SampleDataUtils";
import { sampleLineupStatsResponse } from "../../sample-data/sampleLineupStatsResponse";
import { sampleTeamStatsResponse } from "../../sample-data/sampleTeamStatsResponse";
import { samplePlayerStatsResponse } from "../../sample-data/samplePlayerStatsResponse";
import { GameFilterParams, ParamDefaults } from "../../utils/FilterModels";
import { StatModels, TeamStatSet, IndivStatSet } from "../../utils/StatModels";
import fs from "fs";

//@ts-nocheck
import fetchMock from "isomorphic-unfetch";

const ResizeObserver = (window as any).ResizeObserver;

describe("TeamStatsTable", () => {
  const testYear = "2021/22";
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
    (fetchMock as any).restore();
    (fetchMock as any).reset();
  });

  // Tidy up snapshot rendering:
  expect.addSnapshotSerializer(
    SampleDataUtils.summarizeEnrichedApiResponse(
      sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets
        .baseline
    )
  );

  const testData = _.assign(
    sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets as {
      on: TeamStatSet;
      off: TeamStatSet;
      baseline: TeamStatSet;
    },
    { global: StatModels.emptyTeam(), onOffMode: true }
  );
  const players =
    samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
      ?.baseline?.player?.buckets || [];
  const testRosterData = {
    on: _.cloneDeep(players) as unknown as IndivStatSet[],
    off: _.cloneDeep(players) as unknown as IndivStatSet[],
    baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
      ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
    global: _.cloneDeep(players) as unknown as IndivStatSet[],
    other: [],
    error_code: undefined,
  };
  const testLineupData = {
    lineups:
      sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets,
  };

  const refA = React.createRef<HTMLTableRowElement>();
  const refB = React.createRef<HTMLTableRowElement>();
  const refBase = React.createRef<HTMLTableRowElement>();
  const refDiffs = React.createRef<HTMLTableRowElement>();

  test("TeamStatsTable - should create snapshot", () => {
    const { container } = render(
      <TeamStatsTable
        testMode={true}
        gameFilterParams={{}}
        dataEvent={{
          teamStats: testData,
          rosterStats: { on: [], off: [], baseline: [], global: [], other: [] },
          shotStats: {
            on: { off: {}, def: {} },
            off: { off: {}, def: {} },
            baseline: { off: {}, def: {} },
            other: [],
          },
          lineupStats: [],
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
        navigationRefs={{ refA, refB, refBase, refDiffs, otherRefs: [] }}
      />
    );
    expect(container).toMatchSnapshot();
  });
  test("TeamStatsTable - should create snapshot, luck enabled + diagnostics + grades shown", async () => {
    const sampleData = JSON.parse(
      fs.readFileSync(
        "./public/leaderboards/lineups/stats_all_Men_2020_High.json",
        { encoding: "utf-8" }
      )
    );

    // Mock the URL calls needed to get the stats
    ["Combo", "High", "Medium", "Low"].forEach((tier) => {
      //(old files)
      (fetchMock as any).mock(
        `/leaderboards/lineups/stats_all_Men_${testYear.substring(
          0,
          4
        )}_${tier}.json`,
        {
          status: 200,
          body: tier == "High" ? sampleData : {},
        }
      );
      //(new files)
      (fetchMock as any).mock(
        `/api/getStats?&gender=Men&year=${testYear.substring(
          0,
          4
        )}&tier=${tier}`,
        {
          status: 200,
          body: tier == "High" ? sampleData : {},
        }
      );
    });

    const { container } = render(
      <TeamStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          onOffLuck: true,
          showOnOffLuckDiags: true,
          showRoster: true,
          showExtraInfo: true,
          //TODO: if this is set to true it causes an obscure render error
          // (because of the quick toggle which includes svg)
          // for now I'm just going to disable it
          showTeamPlayTypes: false,
          showGrades: ParamDefaults.defaultEnabledGrade,
        }}
        dataEvent={{
          teamStats: testData,
          rosterStats: testRosterData,
          shotStats: {
            on: { off: {}, def: {} },
            off: { off: {}, def: {} },
            baseline: { off: {}, def: {} },
            other: [],
          },
          lineupStats: [], // empty table
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
        navigationRefs={{ refA, refB, refBase, refDiffs, otherRefs: [] }}
      />
    );

    // Use waitFor to wait for state updates or DOM changes
    await waitFor(() => {
      expect(container).toMatchSnapshot(); // This accesses the root DOM container
    });
  });
  test("TeamStatsTable - should create snapshot, positional override + diagnostics + grades shown", async () => {
    const sampleData = JSON.parse(
      fs.readFileSync(
        "./public/leaderboards/lineups/stats_all_Men_2020_High.json",
        { encoding: "utf-8" }
      )
    );

    // Mock the URL calls needed to get the stats
    ["Combo", "High", "Medium", "Low"].forEach((tier) => {
      //(old files)
      (fetchMock as any).mock(
        `/leaderboards/lineups/stats_all_Men_${testYear.substring(
          0,
          4
        )}_${tier}.json`,
        {
          status: 200,
          body: tier == "High" ? sampleData : {},
        }
      );
      //(new files)
      (fetchMock as any).mock(
        `/api/getStats?&gender=Men&year=${testYear.substring(
          0,
          4
        )}&tier=${tier}`,
        {
          status: 200,
          body: tier == "High" ? sampleData : {},
        }
      );
    });

    const { container } = render(
      <TeamStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          showGrades: ParamDefaults.defaultEnabledGrade,
          manual: [
            {
              rowId: "Cowan, Anthony / Baseline",
              statName: "off_3p",
              newVal: 0.5,
              use: true,
            },
          ],
        }}
        dataEvent={{
          teamStats: testData,
          rosterStats: testRosterData,
          shotStats: {
            on: { off: {}, def: {} },
            off: { off: {}, def: {} },
            baseline: { off: {}, def: {} },
            other: [],
          },
          lineupStats: [], //(can't find lineup that works with this, needs more investigation - in the meantime just show the empty table)
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
        navigationRefs={{ refA, refB, refBase, refDiffs, otherRefs: [] }}
      />
    );

    // Use waitFor to wait for state updates or DOM changes
    await waitFor(() => {
      expect(container).toMatchSnapshot(); // This accesses the root DOM container
    });
  });
  //TODO: figure out how to get a lineup stats sample with game info an add tests for roster and per-game graphs
});
