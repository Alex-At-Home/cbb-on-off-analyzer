import renderer from "react-test-renderer";
import React from "react";

import {
  TeamEditorParams,
  OffseasonLeaderboardParams,
} from "../../utils/FilterModels";
import { SampleDataUtils } from "../../sample-data/SampleDataUtils";

import { shallow } from "enzyme";
import toJson from "enzyme-to-json";
import _ from "lodash";
import fs from "fs";
import OffSeasonLeaderboardTable from "../OffseasonLeaderboardTable";

jest.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    theme: "light",
    setTheme: jest.fn(),
  }),
}));

describe("OffseasonLeaderboardTable", () => {
  // Load in data sample:
  const sampleData = JSON.parse(
    fs.readFileSync(
      "./public/leaderboards/lineups/players_all_Men_2019_High.json",
      { encoding: "utf-8" },
    ),
  );
  const sampleDataMore = JSON.parse(
    fs.readFileSync(
      "./public/leaderboards/lineups/players_all_Men_2018_High.json",
      { encoding: "utf-8" },
    ),
  );
  const sampleDataEvenMore = JSON.parse(
    fs.readFileSync(
      "./public/leaderboards/lineups/players_all_Men_2020_High.json",
      { encoding: "utf-8" },
    ),
  );
  const sampleTeamData = JSON.parse(
    fs.readFileSync(
      "./public/leaderboards/lineups/team_stats_all_Men_2020_High.json",
      { encoding: "utf-8" },
    ),
  );
  const transfers = [
    {
      RiLindo: [{ f: "Maryland", t: "George Washington" }],
      SeSmith: [{ f: "Maryland", t: "ETSU" }],
    },
  ];
  const twoYears = {
    ...sampleData,
    players: (sampleData.players || [])
      .concat(sampleDataMore.players || [])
      .filter((p: any) => {
        return p.team == "Maryland" || p.team == "Seton Hall";
      }),
    transfers: transfers,
  };
  const threeYears = {
    ...sampleData,
    players: (sampleData.players || [])
      .concat(sampleDataMore.players || [])
      .concat(sampleDataEvenMore.players || [])
      .filter((p: any) => {
        return p.team == "Maryland" || p.team == "Seton Hall";
      }),
    transfers: transfers,
  };
  const threeYearsWithEvalTeamStats = {
    ...threeYears,
    teamStats: sampleTeamData.teams.filter(
      (t: any) => t.team_name == "Maryland",
    ),
  };

  // Tidy up snapshot rendering:
  expect.addSnapshotSerializer(
    SampleDataUtils.summarizeEnrichedApiResponse(sampleData.players[0]),
  );

  test("OffseasonLeaderboardTable - should create snapshot", () => {
    const dummyChangeStateCallback = (stats: TeamEditorParams) => {};
    const wrapper = shallow(
      <OffSeasonLeaderboardTable
        startingState={{
          year: "2019/20",
        }}
        dataEvent={twoYears}
        onChangeState={dummyChangeStateCallback}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("OffseasonLeaderboardTable - should create snapshot (teamview)", () => {
    const dummyChangeStateCallback = (stats: TeamEditorParams) => {};
    const wrapper = shallow(
      <OffSeasonLeaderboardTable
        startingState={{
          teamView: "Maryland",
          year: "2019/20",
        }}
        dataEvent={twoYears}
        onChangeState={dummyChangeStateCallback}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("OffseasonLeaderboardTable - should create snapshot (eval mode)", () => {
    const dummyChangeStateCallback = (stats: TeamEditorParams) => {};
    const wrapper = shallow(
      <OffSeasonLeaderboardTable
        startingState={
          {
            evalMode: true,
            year: "2020/21",
          } as OffseasonLeaderboardParams
        }
        dataEvent={threeYearsWithEvalTeamStats}
        onChangeState={dummyChangeStateCallback}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("OffseasonLeaderboardTable - should create snapshot (confs view)", () => {
    const dummyChangeStateCallback = (stats: TeamEditorParams) => {};
    const wrapper = shallow(
      <OffSeasonLeaderboardTable
        startingState={{
          confs: "B1G",
          year: "2019/20",
        }}
        dataEvent={twoYears}
        onChangeState={dummyChangeStateCallback}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("OffseasonLeaderboardTable - transfer in+out + queryFilters", () => {
    const dummyChangeStateCallback = (stats: TeamEditorParams) => {};
    const wrapper = shallow(
      <OffSeasonLeaderboardTable
        startingState={
          {
            queryFilters: "Maryland;",
            transferInOutMode: true,
            year: "2019/20",
            confs: "Manual Filter",
          } as OffseasonLeaderboardParams
        }
        dataEvent={twoYears}
        onChangeState={dummyChangeStateCallback}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("OffseasonLeaderboardTable - queryFilters + override", () => {
    const dummyChangeStateCallback = (stats: TeamEditorParams) => {};
    const wrapper = shallow(
      <OffSeasonLeaderboardTable
        startingState={
          {
            queryFilters: "Maryland;BREAK;Clemson;",
            year: "2019/20",
            confs: "Manual Filter",
            Maryland__overrides: "ErAyala::|m=20.0",
          } as OffseasonLeaderboardParams
        }
        dataEvent={twoYears}
        onChangeState={dummyChangeStateCallback}
      />,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
