import _ from "lodash";

import { CommonApiUtils } from "../CommonApiUtils";
import { NextApiRequest, NextApiResponse } from "next";

// Utils:

function testOnCacheHit(cacheJson: any, res: NextApiResponse) {
  (res as any)["testOnCacheHit"] = true;
  (res as any)["cache"] = cacheJson;
}

/** Return a 404 if the request is invalid */
function testOnTeamNotFound(res: NextApiResponse) {
  (res as any)["testOnTeamNotFound"] = true;
}

/** Return a 500 if the response is invalid */
function testOnRequestError(res: NextApiResponse) {
  (res as any)["testOnRequestError"] = true;
}

function testMarshallRequest(
  index: string,
  genderPrefix: string,
  params: Record<string, any>,
  currentJsonEpoch: number,
  efficiency: Record<string, any>,
  lookup: Record<string, any>,
  avgEfficiency: number
) {
  //TODO: check inputs
  return "test-body";
}

async function testMakeRequest(body: string): Promise<[boolean, number, any]> {
  //TODO: check body

  return Promise.resolve([true, 100, { test: "response" }]);
}

/** Returns the valid response */
function testOnResponse(
  status: number,
  responseBody: any,
  res: NextApiResponse
) {
  (res as any)["commonOnResponse"] = true;
  (res as any)["status"] = status;
  (res as any)["responseBody"] = responseBody;
}

describe("CommonApiUtils", () => {
  test("CommonApiUtils - handleRequest:(commonMakeRequest, commonOnResponse)", async () => {
    const res = {};
    const prefix = "test-";

    //TODO
    const query = "";

    const result = await CommonApiUtils.handleRequest(
      res as NextApiResponse,
      prefix,
      query,
      testMarshallRequest,
      // indexPatternOverride
      undefined,
      undefined,
      // isDebug
      false,
      // useLocalIndices
      false,
      // Callbacks:
      testMakeRequest,
      testOnCacheHit,
      testOnTeamNotFound,
      testOnRequestError,
      testOnResponse
    );
  });

  test("CommonApiUtils - efficiencyReplacer", () => {
    const sampleTeam = {
      Team: {
        "team_season.year": 2015,
        conf: "Misc Conference",
        "stats.adj_off.rank": 1,
        "stats.adj_off.value": 129,
        "stats.adj_def.rank": 35,
        "stats.adj_def.value": 95.2,
        "stats.adj_margin.rank": 2,
        "stats.adj_margin.value": 33.8,
        "stats.adj_tempo.rank": 345,
        "stats.adj_tempo.value": 58.7,
        "stats.off._3p_pct.value": 34.9,
        total_poss: 2509,
        ncaa_seed: 1,
        is_high_major: 1,
        good_md_comp: 0,
      },
    };
    const sampleTeamOpp = {
      Team: {
        conf: "Misc Conference",
        "stats.adj_margin.rank": 2,
      },
    };
    const sampleTeamOff = {
      Team: {
        "stats.adj_off.value": 129,
      },
    };
    const sampleTeamDef = {
      Team: {
        "stats.adj_def.value": 95.2,
      },
    };
    const sampleTeam3p = {
      Team: {
        "stats.off._3p_pct.value": 34.9,
      },
    };
    const test = {
      misc: 1,
      kp_off: {
        ...sampleTeam,
      },
      misc2: { val: 3 },
      nested: {
        kp_opp: {
          ...sampleTeam,
        },
        misc3: "test",
      },
      misc4: { kp: ["arr"] },
      kp_def: {
        ...sampleTeam,
      },
      kp_3p: {
        ...sampleTeam,
      },
    };
    const res = {
      ...test,
      kp_off: {
        ...sampleTeamOff,
      },
      nested: {
        kp_opp: {
          ...sampleTeamOpp,
        },
        misc3: "test",
      },
      kp_def: {
        ...sampleTeamDef,
      },
      kp_3p: {
        ...sampleTeam3p,
      },
    };
    expect(
      JSON.parse(JSON.stringify(test, CommonApiUtils.efficiencyReplacer(), 3))
    ).toEqual(res);
  });

  //TODO: test cache, team error, request error, general error
  //debug
});
