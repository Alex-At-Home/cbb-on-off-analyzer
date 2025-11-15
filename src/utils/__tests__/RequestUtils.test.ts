import _ from "lodash";

import {
  ParamPrefixes,
  ParamPrefixesType,
  FilterParamsType,
  FilterRequestInfo,
} from "../FilterModels";
import { RequestUtils } from "../RequestUtils";
import { ClientRequestCache } from "../ClientRequestCache";

// Handy util to cope with client caching now being async:
const waitForCondition = async (
  condition: () => Boolean,
  attempts: number = 10,
  sleepTimeMs: number = 50
) => {
  const sleep = (milliseconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  };
  for (let i = 0; i < attempts; i++) {
    const exitLoop = condition();
    if (exitLoop) break;
    await sleep(sleepTimeMs);
  }
};

describe("RequestUtils", () => {
  test("RequestUtils - isResponseError", () => {
    expect(RequestUtils.isResponseError({})).toBe(false);
    expect(
      RequestUtils.isResponseError({
        error: {},
      })
    ).toBe(false);
    expect(
      RequestUtils.isResponseError({
        responses: [],
      })
    ).toBe(false);
    expect(
      RequestUtils.isResponseError({
        responses: [{}],
      })
    ).toBe(false);
    expect(
      RequestUtils.isResponseError({
        responses: [{ error: {} }],
      })
    ).toBe(false);
    expect(
      RequestUtils.isResponseError({
        error: { message: "test" },
      })
    ).toBe(true);
    expect(
      RequestUtils.isResponseError({
        responses: [{ error: { message: "test" } }],
      })
    ).toBe(true);
  });
  test("RequestUtils - requestHandlingLogic", async () => {
    // Cs are cached, Rs are _not_ cached, Fs fail
    const testObjMap = {
      C1: { team: "C1" },
      C2: { team: "C2" },
      B0: { team: "B0" }, //(returns ok==false)
      B1: { team: "B1" }, // (results {})
      Rn: { team: "Rn" }, //(never cached because of "B0" and "B1")
      R1: { team: "R1" },
      R2: { team: "R2" },
      R3: { team: "R3" },
      R4: { team: "R4" },
      F: { team: "F" },
    } as Record<string, any>;
    // Pre-cache some elements
    ClientRequestCache.cacheResponse(
      "team=C1",
      ParamPrefixes.game,
      { url: `/api/calculateOnOffStats?team=C1`, force: false, error: {} },
      1,
      false
    );
    ClientRequestCache.cacheResponse(
      "team=C2",
      ParamPrefixes.lineup,
      { url: `/api/calculateLineupStats?team=C2`, force: false, error: {} },
      1,
      false
    );
    ClientRequestCache.directInsertCache(
      "team=R3",
      ParamPrefixes.lineup,
      "{}",
      1,
      false
    ); //(force override)

    //(cache inserts are async these days)
    await waitForCondition(() =>
      ClientRequestCache.peekForResponse("team=C1", ParamPrefixes.game)
    );
    await waitForCondition(() =>
      ClientRequestCache.peekForResponse("team=C2", ParamPrefixes.lineup)
    );
    await waitForCondition(() =>
      ClientRequestCache.peekForResponse("team=R3", ParamPrefixes.lineup)
    );
    //(note won't depend either way on items being added to the cache in the future)

    // Actual tests:
    await Promise.all(
      [
        ["R4", "F", "normal"],
        ["B0", "Rn", "normal"],
        ["B1", "Rn", "normal"],
        ["F", "F", "normal"], //(do these early so would be cached if they were going to be)
        ["C1", "C2", "normal"],
        ["C1", "R1", "normal"],
        ["R2", "R3", "normal"],
      ].map(async (t1t2: string[]) => {
        const result = Promise.all(
          RequestUtils.requestHandlingLogic(
            testObjMap[t1t2[0]] || {},
            ParamPrefixes.game,
            [
              {
                context: ParamPrefixes.lineup as ParamPrefixesType,
                paramsObj: testObjMap[t1t2[1]] || {},
              },
            ],
            (url: string, force: boolean) => {
              const index = _.startsWith(url, "/api/calculateOnOffStats")
                ? 0
                : 1;
              return t1t2[2] == "fail" || //(this isn't currently used)
                t1t2[index] == "C1" ||
                t1t2[index] == "C2" ||
                t1t2[index] == "F"
                ? //^(will ignore these because they are always cached
                  Promise.reject(new Error(`Fail by design [${t1t2}]`))
                : Promise.resolve([
                    {
                      cacheEpoch: 1,
                      url: url,
                      force: force,
                      error: t1t2[index] != "B1" ? {} : { message: "e" },
                    },
                    t1t2[0] != "B0",
                    null,
                  ]);
            },
            1,
            false,
            1 /** to simulate "now" being the same time as the curr JSON epoch */
          )
        );

        if (t1t2[0] == "F" || t1t2[1] == "F") {
          await expect(result).rejects.toThrow();
        } else {
          await expect(result).resolves.toEqual([
            {
              cacheEpoch: 1,
              url: `/api/calculateOnOffStats?team=${t1t2[0]}`,
              force: false,
              error: t1t2[0] != "B1" ? {} : { message: "e" },
            },
            {
              cacheEpoch: 1,
              url: `/api/calculateLineupStats?team=${t1t2[1]}`,
              force: t1t2[1] == "R3",
              error: {},
            },
          ]);
          // Wait for result to complete then check cache
          await expect(
            result.then((array: any[]) => {
              return Promise.all(
                t1t2.map((t: string, index: number) => {
                  const prefix =
                    0 == index ? ParamPrefixes.game : ParamPrefixes.lineup;
                  if (index >= 2 || t1t2[index] == "F" || t1t2[1] == "Rn") {
                    //(Rn never cached)
                    return Promise.resolve(true);
                  } else {
                    return waitForCondition(() =>
                      ClientRequestCache.peekForResponse(`team=${t}`, prefix)
                    ).then((nothing) => {
                      return ClientRequestCache.peekForResponse(
                        `team=${t}`,
                        prefix
                      );
                    });
                  }
                })
              );
            })
          ).resolves.toEqual([true, true, true]);
        }
      })
    );
    await waitForCondition(() =>
      ClientRequestCache.peekForResponse("team=R2", ParamPrefixes.lineup)
    );
    expect(
      ClientRequestCache.peekForResponse(`team=B0`, ParamPrefixes.game)
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse(`team=B1`, ParamPrefixes.game)
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse(`team=F`, ParamPrefixes.game)
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse(`team=F`, ParamPrefixes.lineup)
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse(`team=rn`, ParamPrefixes.lineup)
    ).toBe(false);
  });
  test("RequestUtils - requestContextToUrl", () => {
    expect(RequestUtils.requestContextToUrl(ParamPrefixes.game, "test1")).toBe(
      "/api/calculateOnOffStats?test1"
    );
    expect(
      RequestUtils.requestContextToUrl(ParamPrefixes.lineup, "test2")
    ).toBe("/api/calculateLineupStats?test2");
    expect(
      RequestUtils.requestContextToUrl(ParamPrefixes.report, "test3")
    ).toBe("/api/calculateLineupStats?test3");
    expect(
      RequestUtils.requestContextToUrl(ParamPrefixes.roster, "test4")
    ).toBe("/api/getRoster?test4");
    expect(
      RequestUtils.requestContextToUrl(ParamPrefixes.player, "test5")
    ).toBe("/api/calculateOnOffPlayerStats?test5");
  });
});
