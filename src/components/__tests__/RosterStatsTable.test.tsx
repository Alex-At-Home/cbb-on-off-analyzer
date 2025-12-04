/**
 * @jest-environment jsdom
 */

import RosterStatsTable from "../RosterStatsTable";
import { SampleDataUtils } from "../../sample-data/SampleDataUtils";
import { samplePlayerStatsResponse } from "../../sample-data/samplePlayerStatsResponse";
import { GameFilterParams, ParamDefaults } from "../../utils/FilterModels";
import { shallow } from "enzyme";
import toJson from "enzyme-to-json";
import _ from "lodash";
import { StatModels, IndivStatSet } from "../../utils/StatModels";
import fs from "fs";

//@ts-nocheck
import fetchMock from "isomorphic-unfetch";

import { render, screen, waitFor } from "@testing-library/react";
const ResizeObserver = (window as any).ResizeObserver;

describe("RosterStatsTable", () => {
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

  const sampleData = JSON.parse(
    fs.readFileSync(
      "./public/leaderboards/lineups/stats_players_all_Men_2020_High.json",
      { encoding: "utf-8" }
    )
  );

  // Mock the URL calls needed to get the stats
  ["Combo", "High", "Medium", "Low"].forEach((tier) => {
    //(old files)
    (fetchMock as any).mock(
      `/leaderboards/lineups/stats_players_all_Men_${testYear.substring(
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
      )}&tier=${tier}&type=player`,
      {
        status: 200,
        body: tier == "High" ? sampleData : {},
      }
    );
  });

  // Tidy up snapshot rendering:
  expect.addSnapshotSerializer(
    SampleDataUtils.summarizeEnrichedApiResponse(
      samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
        ?.baseline?.player?.buckets[0]
    )
  );

  // First test, we're experimenting with using the new RTL renderer

  test("RosterStatsTable (baseline only, !expanded) - should create snapshot", async () => {
    const testData = {
      on: [],
      off: [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };
    const { container } = render(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{ year: testYear, showExpanded: false }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: StatModels.emptyTeam(),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
            other: [],
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    //expect(toJson(wrapper)).toMatchSnapshot();
    // Use waitFor to wait for state updates or DOM changes
    await waitFor(() => {
      expect(container).toMatchSnapshot(); // This accesses the root DOM container
    });
  });

  // Subsequent tests - we go back to using the (deprecated) shallow renderer

  test("RosterStatsTable (baseline only, expanded) - should create snapshot", () => {
    const testData = {
      on: [],
      off: [],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };
    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{ year: testYear, showExpanded: true }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: StatModels.emptyTeam(),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
            other: [],
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (!expanded) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };
    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          onQuery: "testQon",
          offQuery: `testQoff`,
        }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: StatModels.emptyTeam(),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
            other: [],
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (expanded) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };
    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{ year: testYear, showExpanded: true }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: StatModels.emptyTeam(),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (luck enabled, all the diags) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };

    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          onOffLuck: true,
          showPlayerOnOffLuckDiags: true,
          showDiag: true,
          showPosDiag: true,
        }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: StatModels.emptyTeam(),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (manual enabled - manual dialog showing, all the diags) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };

    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          onOffLuck: false,
          showPlayerOnOffLuckDiags: true,
          showDiag: true,
          showPosDiag: true,
          manual: [
            {
              rowId: "Cowan, Anthony / Baseline",
              newVal: 0.5,
              statName: "off_3p",
              use: true,
            },
          ],
          showPlayerManual: true,
        }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: StatModels.emptyTeam(),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("RosterStatsTable (luck+overrides enabled, all the diags) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };

    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          onOffLuck: true,
          showPlayerOnOffLuckDiags: true,
          showDiag: true,
          showPosDiag: true,
          showPlayerPlayTypes: true,
          manual: [
            {
              rowId: "Cowan, Anthony / Baseline",
              newVal: 0.5,
              statName: "off_3p",
              use: true,
            },
            {
              rowId: "Wiggins, Aaron / Baseline",
              newVal: 0.5,
              statName: "sq_3p",
              use: true,
            }, //(applied)
            {
              rowId: "Wiggins, Aaron / Baseline",
              newVal: 0.1,
              statName: "sq_2pmid",
              use: true,
            }, //(ignored)
            {
              rowId: "Wiggins, Aaron / Baseline",
              newVal: 0.6,
              statName: "off_2pmid",
              use: true,
            }, //(overwrites the above)
          ],
          showPlayerManual: true,
        }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: _.assign(StatModels.emptyTeam(), { doc_count: 1000 }),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test("RosterStatsTable (grades, expanded) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };

    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          onOffLuck: false,
          showPlayerOnOffLuckDiags: false,
          showDiag: true,
          showPosDiag: false,
          showPlayerPlayTypes: false,
          showGrades: ParamDefaults.defaultEnabledGrade,
          showExpanded: true,
        }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: _.assign(StatModels.emptyTeam(), { doc_count: 1000 }),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test("RosterStatsTable (grades, !expanded) - should create snapshot", () => {
    const testData = {
      on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
      off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
      baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter
        ?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
      global: _.cloneDeep(
        samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
          ?.baseline?.player?.buckets as unknown as IndivStatSet[]
      ),
      other: [],
      error_code: undefined,
    };

    const wrapper = shallow(
      <RosterStatsTable
        testMode={true}
        gameFilterParams={{
          year: testYear,
          onOffLuck: false,
          showPlayerOnOffLuckDiags: false,
          showDiag: true,
          showPosDiag: false,
          showPlayerPlayTypes: false,
          showGrades: ParamDefaults.defaultEnabledGrade,
        }}
        dataEvent={{
          teamStats: {
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
            global: _.assign(StatModels.emptyTeam(), { doc_count: 1000 }),
            onOffMode: true,
            baseline: StatModels.emptyTeam(),
          },
          rosterStats: testData,
          lineupStats: [],
          playerShotStats: {
            on: {},
            off: {},
            baseline: {},
            other: [],
          },
        }}
        onChangeState={(newParams: GameFilterParams) => {}}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
