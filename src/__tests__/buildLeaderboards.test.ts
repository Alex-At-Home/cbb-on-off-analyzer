import { NextApiRequest, NextApiResponse } from "next";

import _ from "lodash";

import {
  main,
  completeLineupLeaderboard,
  completePlayerLeaderboard,
  savedLineups,
  savedPlayers,
  savedLowVolumePlayers,
  teamInfo,
  detailedTeamInfo,
  mutableDivisionStats,
  mutablePlayerDivisionStats,
  MutableAsyncResponse,
  setTestModeOn,
} from "../bin/buildLeaderboards";

import { sampleLineupStatsResponse } from "../sample-data/sampleLineupStatsResponse";
import { sampleTeamStatsResponse } from "../sample-data/sampleTeamStatsResponse";
import { samplePlayerStatsResponse } from "../sample-data/samplePlayerStatsResponse";
import { GradeUtils } from "../utils/stats/GradeUtils";

const mockSampleLineupStatsResponse = sampleLineupStatsResponse;
const mockSampleTeamStatsResponse = sampleTeamStatsResponse;
const mockSamplePlayerStatsResponse = samplePlayerStatsResponse;

// Mock the API requests to return the sample data where available, else just an empty list

setTestModeOn(); //(dataset not big enough to calc RAPM off it)

jest.mock("../pages/api/calculateLineupStats", () =>
  jest.fn().mockImplementation((req: NextApiRequest, res: NextApiResponse) => {
    const mockRes = res as unknown as MutableAsyncResponse;
    mockRes.statusCode = 200;
    if ((req.url || "").indexOf("Maryland") >= 0) {
      mockRes.resultJson = mockSampleLineupStatsResponse;
    } else {
      mockRes.resultJson = {};
    }
  })
);

jest.mock("../pages/api/calculateOnOffStats", () =>
  jest.fn().mockImplementation((req: NextApiRequest, res: NextApiResponse) => {
    const mockRes = res as unknown as MutableAsyncResponse;
    mockRes.statusCode = 200;
    if ((req.url || "").indexOf("Maryland") >= 0) {
      mockRes.resultJson = mockSampleTeamStatsResponse;
    } else {
      mockRes.resultJson = {};
    }
  })
);
jest.mock("../pages/api/calculateOnOffPlayerStats", () =>
  jest.fn().mockImplementation((req: NextApiRequest, res: NextApiResponse) => {
    const mockRes = res as unknown as MutableAsyncResponse;
    mockRes.statusCode = 200;
    if ((req.url || "").indexOf("Maryland") >= 0) {
      mockRes.resultJson = mockSamplePlayerStatsResponse;
    } else {
      mockRes.resultJson = {};
    }
  })
);
jest.mock("../pages/api/calculatePlayerShotStats", () =>
  jest.fn().mockImplementation((req: NextApiRequest, res: NextApiResponse) => {
    const mockRes = res as unknown as MutableAsyncResponse;
    mockRes.statusCode = 200;
    if ((req.url || "").indexOf("Maryland") >= 0) {
      mockRes.resultJson = {};
    } else {
      mockRes.resultJson = {};
    }
  })
);
jest.mock("../pages/api/calculateTeamDefenseStats", () =>
  jest.fn().mockImplementation((req: NextApiRequest, res: NextApiResponse) => {
    const mockRes = res as unknown as MutableAsyncResponse;
    mockRes.statusCode = 200;
    if ((req.url || "").indexOf("Maryland") >= 0) {
      mockRes.resultJson = {};
    } else {
      mockRes.resultJson = {};
    }
  })
);

// seeing intermittent: "Timeout - Async callback was not invoked within the 5000ms timeout specified by jest.setTimeout.Timeout - Async callback was not invoked within the 5000ms timeout specified by jest.setTimeout.Error:"
jest.setTimeout(60000);

describe("buildLeaderboards", () => {
  test("buildLeaderboards - main / completeLineupLeaderboard / completePlayerLeaderboard", async () => {
    await main();

    expect(
      completePlayerLeaderboard("test", savedPlayers, 700)
    ).toMatchSnapshot();
    expect(
      completePlayerLeaderboard("test", savedPlayers, 1)
    ).toMatchSnapshot();
    //(no lowvol players because RAPM isn't being calculated in this test)

    expect(
      completeLineupLeaderboard("test", savedLineups, 300)
    ).toMatchSnapshot();
    expect(
      completeLineupLeaderboard("test", savedLineups, 1)
    ).toMatchSnapshot();
  });
  test("buildLeaderboards - main / low volume players", async () => {
    // (only works if run after test above)

    //(TODO actually this is just [] at the moment :( but in the future maybe will add some more players that match this)
    expect(
      completePlayerLeaderboard("lowvol", savedLowVolumePlayers, 700)
    ).toMatchSnapshot();
  });
  test("buildLeaderboards - main / team stats", async () => {
    // (only works if run after test above)

    expect(teamInfo).toMatchSnapshot();
  });
  test("buildLeaderboards - main / detailed team stats", async () => {
    // (only works if run after test above)

    expect(detailedTeamInfo).toMatchSnapshot();
  });
  test("buildLeaderboards - main / division team stats", async () => {
    // (only works if run after test above)

    expect(
      GradeUtils.buildAndInjectTeamDivisionStatsLUT(mutableDivisionStats)
    ).toMatchSnapshot();
  });

  test("buildLeaderboards - main / division player stats", async () => {
    // (only works if run after test above)
    expect(
      GradeUtils.buildAndInjectPlayerDivisionStatsLUT(
        mutablePlayerDivisionStats
      )
    ).toMatchSnapshot();
  });
});
