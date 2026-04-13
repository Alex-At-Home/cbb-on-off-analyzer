import {
  buildPortalCaveats,
  buildPortalOverallCaveats,
  categoriesForRank,
  formatCategoryLabel,
  isDeepBenchRank,
  portalEvalLeagueLabelForViewer,
  statisticToD1Rank,
} from "../portalEvalRules";

describe("portalEvalRules", () => {
  test("statisticToD1Rank matches GenericTable formula", () => {
    expect(statisticToD1Rank({ value: 1, samples: 400 })).toBe(1);
    expect(statisticToD1Rank({ value: 0, samples: 400 })).toBe(401);
    expect(statisticToD1Rank({ value: 0.5, samples: 400 })).toBe(201);
  });

  test("statisticToD1Rank returns null without samples", () => {
    expect(statisticToD1Rank({ value: 0.5, samples: 0 })).toBeNull();
    expect(statisticToD1Rank({})).toBeNull();
  });

  test("categoriesForRank overlaps Starter and 6th Man", () => {
    const labels = categoriesForRank(300);
    expect(labels).toContain("Starter Caliber");
    expect(labels).toContain("6th Man Type");
  });

  test("categoriesForRank includes Deep Bench when rank > 700", () => {
    expect(isDeepBenchRank(700)).toBe(false);
    expect(isDeepBenchRank(701)).toBe(true);
    const at701 = categoriesForRank(701);
    expect(at701).toContain("Deep Bench");
    expect(at701).toContain("Borderline Rotation Player");
  });

  test("formatCategoryLabel joins with slash", () => {
    expect(formatCategoryLabel(300)).toContain("/");
  });

  test("portalEvalLeagueLabelForViewer is high-major (viewer team context, not player)", () => {
    expect(portalEvalLeagueLabelForViewer()).toBe("high-major");
  });

  test("buildPortalCaveats freshman and low minutes", () => {
    expect(buildPortalCaveats({ yearClass: "Fr", teamPossPct: 0.5 })).toEqual([
      "Fr → Soph jumps can be very volatile",
    ]);
    expect(buildPortalCaveats({ teamPossPct: 0.2 })).toEqual([
      "Played few minutes [20.0%] so treat stats with care",
    ]);
    expect(buildPortalCaveats({ teamPossPct: 0.5 })).toEqual([]);
  });

  test("buildPortalOverallCaveats adds small-at-C caveat for Men only", () => {
    expect(
      buildPortalOverallCaveats({
        gender: "Men",
        rosterHeight: "6-6",
        posFreqs: [0.1, 0.1, 0.1, 0.1, 0.2],
      }),
    ).toEqual([
      "Small player with [20.0%] Center minutes, may not be positionally viable",
    ]);
    expect(
      buildPortalOverallCaveats({
        gender: "Women",
        rosterHeight: "6-6",
        posFreqs: [0.1, 0.1, 0.1, 0.1, 0.2],
      }),
    ).toEqual([]);
  });
});
