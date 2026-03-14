// Lodash
import _ from "lodash";

import { ClientRequestCache } from "../ClientRequestCache";
import { PreloadedDataSamples } from "../internal-data/preloadedData";

describe("ClientRequestCache", () => {
  // Handy util to cope with client caching now being async:
  const waitForCondition = async (
    condition: () => Boolean,
    attempts: number = 10,
    sleepTimeMs: number = 50,
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

  test("ClientRequestCache - decacheResponse / cacheResponse / peekForResponse", async () => {
    const obj1 = { testKey: "testVal" };
    const expObj1 = { testKey: "testVal", cacheEpoch: 1 };
    ClientRequestCache.cacheResponse(
      "test-cache-key",
      "test-prefix-",
      obj1,
      1,
      false,
    );
    await waitForCondition(() =>
      ClientRequestCache.peekForResponse("test-cache-key", "test-prefix-"),
    );

    expect(
      ClientRequestCache.peekForResponse("test-cache-key", "test-prefix-"),
    ).toBe(true);
    expect(
      ClientRequestCache.peekForResponse("wrong-cache-key", "test-prefix-"),
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse("test-cache-key", "wrong-prefix-"),
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse("test-prefix-test-cache-key", ""),
    ).toBe(true);

    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key",
        "test-prefix-",
        1,
        false,
      ),
    ).toEqual(expObj1);
    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key",
        "test-prefix-",
        undefined,
        false,
      ),
    ).toEqual(expObj1);
    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key",
        "test-prefix-",
        2,
        false,
      ),
    ).toBe(null);
  });
  test("ClientRequestCache - directInsertCache", () => {
    /*TODO: not using directInsertCache for anything except {} so don't run this test for now
    const testObj = null; //TODO: needs to be B64 encoded and compressed
    const expectedObj = { cacheEpoch: 1, took: 43 }
    ClientRequestCache.directInsertCache(PreloadedDataSamples.menLineup, "lineup-", testObj, 1, false);

    expect(
      _.pick(
        ClientRequestCache.decacheResponse(PreloadedDataSamples.menLineup, "lineup-", 1, false),
        [ "cacheEpoch", "took" ]
      )
    ).toEqual(expectedObj);
    */
  });
  test("ClientRequestCache - special handling for {} as placeholder", () => {
    ClientRequestCache.directInsertCache(
      "test-empty-key",
      "test-prefix-",
      "{}",
      1,
      false,
    );
    expect(
      ClientRequestCache.decacheResponse(
        "test-empty-key",
        "test-prefix-",
        1,
        false,
      ),
    ).toEqual({});
    //(epoch ignored)
    expect(
      ClientRequestCache.decacheResponse(
        "test-empty-key",
        "test-prefix-",
        2,
        false,
      ),
    ).toEqual({});

    // Check handles report- vs lineup- below
    ClientRequestCache.directInsertCache(
      "test-empty-key",
      "report-",
      "{}",
      1,
      false,
    );
    expect(
      ClientRequestCache.peekForResponse("test-empty-key", "report-"),
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse("test-empty-key", "lineup-"),
    ).toBe(true);
  });
  test("ClientRequestCache - special handling for report- vs lineup-", async () => {
    const obj1 = { testKey: "testVal1" };
    const obj2 = { testKey: "testVal2" };
    const obj3 = { testKey: "testVal3" };
    const expObj1 = { testKey: "testVal1", cacheEpoch: 1 };
    const expObj2 = { testKey: "testVal2", cacheEpoch: 1 };
    const expObj3 = { testKey: "testVal3", cacheEpoch: 2 };
    ClientRequestCache.cacheResponse(
      "test-cache-key1",
      "lineup-",
      obj1,
      1,
      false,
    );
    ClientRequestCache.cacheResponse(
      "test-cache-key2",
      "report-",
      obj2,
      1,
      false,
    );
    await waitForCondition(() =>
      ClientRequestCache.peekForResponse("test-cache-key1", "lineup-"),
    );

    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key1",
        "lineup-",
        1,
        false,
      ),
    ).toEqual(expObj1);
    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key1",
        "report-",
        1,
        false,
      ),
    ).toEqual(expObj1);
    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key2",
        "lineup-",
        1,
        false,
      ),
    ).toEqual(expObj2);
    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key2",
        "report-",
        1,
        false,
      ),
    ).toEqual(expObj2);

    // Peek _doesn't_ work for "report-"
    expect(
      ClientRequestCache.peekForResponse("test-cache-key1", "lineup-"),
    ).toBe(true);
    expect(
      ClientRequestCache.peekForResponse("test-cache-key2", "lineup-"),
    ).toBe(true);
    expect(
      ClientRequestCache.peekForResponse("test-cache-key1", "report-"),
    ).toBe(false);
    expect(
      ClientRequestCache.peekForResponse("test-cache-key2", "report-"),
    ).toBe(false);

    //(will overwrite obj1)
    ClientRequestCache.cacheResponse(
      "test-cache-key1",
      "report-",
      obj3,
      2,
      false,
    );
    await waitForCondition(
      () =>
        ClientRequestCache.decacheResponse(
          "test-cache-key1",
          "lineup-",
          2,
          false,
        ) != null,
    );

    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key1",
        "lineup-",
        2,
        false,
      ),
    ).toEqual(expObj3);
    expect(
      ClientRequestCache.decacheResponse(
        "test-cache-key1",
        "report-",
        2,
        false,
      ),
    ).toEqual(expObj3);
  });

  test("ClientRequestCache - getSavedPreference / setSavedPreference", () => {
    const table = "TestTable";
    const param = "colSort";

    expect(ClientRequestCache.getSavedPreference(table, param)).toBeUndefined();

    ClientRequestCache.setSavedPreference(table, param, "asc");
    expect(ClientRequestCache.getSavedPreference(table, param)).toBe("asc");

    ClientRequestCache.setSavedPreference(table, param, "desc");
    expect(ClientRequestCache.getSavedPreference(table, param)).toBe("desc");

    ClientRequestCache.setSavedPreference(table, param, undefined);
    expect(ClientRequestCache.getSavedPreference(table, param)).toBeUndefined();
  });

  test("ClientRequestCache - getSavedPreference key uses userPref- prefix", () => {
    ClientRequestCache.setSavedPreference("T", "p", "v");
    expect(ClientRequestCache.getSavedPreference("T", "p")).toBe("v");
    expect(ClientRequestCache.peekForResponse("T-p", "userPref-")).toBe(true);
    ClientRequestCache.setSavedPreference("T", "p", undefined);
  });

  test("ClientRequestCache - setSavedYear / setSavedGender / setSavedTeam", async () => {
    ClientRequestCache.setSavedYear("2024");
    ClientRequestCache.setSavedGender("Men");
    ClientRequestCache.setSavedTeam("duke");

    await waitForCondition(() => ClientRequestCache.getSavedYear() === "2024");
    expect(ClientRequestCache.getSavedYear()).toBe("2024");
    expect(ClientRequestCache.getSavedGender()).toBe("Men");
    expect(ClientRequestCache.getSavedTeam()).toBe("duke");

    ClientRequestCache.setSavedYear(undefined);
    ClientRequestCache.setSavedGender(undefined);
    ClientRequestCache.setSavedTeam(undefined);

    await waitForCondition(
      () => ClientRequestCache.getSavedYear() === undefined,
    );
    expect(ClientRequestCache.getSavedYear()).toBeUndefined();
    expect(ClientRequestCache.getSavedGender()).toBeUndefined();
    expect(ClientRequestCache.getSavedTeam()).toBeUndefined();
  });

  test("ClientRequestCache - getSavedIntro / setSavedIntro", async () => {
    // Default / true = show intro
    ClientRequestCache.setSavedIntro(true);
    await waitForCondition(() => ClientRequestCache.getSavedIntro() === true);
    expect(ClientRequestCache.getSavedIntro()).toBe(true);

    ClientRequestCache.setSavedIntro(false);
    await waitForCondition(() => ClientRequestCache.getSavedIntro() === false);
    expect(ClientRequestCache.getSavedIntro()).toBe(false);

    ClientRequestCache.setSavedIntro(true);
    await waitForCondition(() => ClientRequestCache.getSavedIntro() === true);
    expect(ClientRequestCache.getSavedIntro()).toBe(true);
  });

  test("ClientRequestCache - isProtectedKey", () => {
    expect(ClientRequestCache.isProtectedKey("landing_show_team")).toBe(true);
    expect(ClientRequestCache.isProtectedKey("landing_show_gender")).toBe(true);
    expect(ClientRequestCache.isProtectedKey("landing_show_year")).toBe(true);
    expect(ClientRequestCache.isProtectedKey("userPref-")).toBe(true);
    expect(ClientRequestCache.isProtectedKey("userPref-table-param")).toBe(
      true,
    );
    expect(ClientRequestCache.isProtectedKey("userPref-x")).toBe(true);

    expect(ClientRequestCache.isProtectedKey("lineup-abc")).toBe(false);
    expect(ClientRequestCache.isProtectedKey("landing_show_intro")).toBe(true);
    expect(ClientRequestCache.isProtectedKey("data-epoch-Men-2024")).toBe(
      false,
    );
    expect(ClientRequestCache.isProtectedKey("")).toBe(false);
  });

  // clearCache / refreshEpoch / removeLru - can't be tested without additional mocking
});
