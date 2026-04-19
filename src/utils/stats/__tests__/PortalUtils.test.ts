import { PortalUtils } from "../PortalUtils";

describe("PortalUtils", () => {
  describe("tiers / ranks / caveats", () => {
    test("statisticToD1Rank matches GenericTable formula", () => {
      expect(PortalUtils.statisticToD1Rank({ value: 1, samples: 400 })).toBe(1);
      expect(PortalUtils.statisticToD1Rank({ value: 0, samples: 400 })).toBe(
        401,
      );
      expect(PortalUtils.statisticToD1Rank({ value: 0.5, samples: 400 })).toBe(
        201,
      );
    });

    test("statisticToD1Rank returns null without samples", () => {
      expect(
        PortalUtils.statisticToD1Rank({ value: 0.5, samples: 0 }),
      ).toBeNull();
      expect(PortalUtils.statisticToD1Rank({})).toBeNull();
    });

    test("categoriesForRank overlaps Starter and 6th Man", () => {
      const labels = PortalUtils.categoriesForRank(300);
      expect(labels).toContain("Starter Caliber");
      expect(labels).toContain("6th Man Type");
    });

    test("categoriesForRank includes Deep Bench when rank > 700", () => {
      expect(PortalUtils.isDeepBenchRank(700)).toBe(false);
      expect(PortalUtils.isDeepBenchRank(701)).toBe(true);
      const at701 = PortalUtils.categoriesForRank(701);
      expect(at701).toContain("Deep Bench");
      expect(at701).toContain("Borderline Rotation Player");
    });

    test("formatCategoryLabel joins with slash", () => {
      expect(PortalUtils.formatCategoryLabel(300)).toContain("/");
    });

    test("portalEvalLeagueLabelForViewer is high-major (viewer team context, not player)", () => {
      expect(PortalUtils.portalEvalLeagueLabelForViewer()).toBe("high-major");
    });

    test("buildPortalCaveats freshman and low minutes", () => {
      expect(
        PortalUtils.buildPortalCaveats({ yearClass: "Fr", teamPossPct: 0.5 }),
      ).toEqual(["Fr → Soph jumps can be very volatile"]);
      expect(PortalUtils.buildPortalCaveats({ teamPossPct: 0.2 })).toEqual([
        "Played few minutes [20.0%] so treat stats with care",
      ]);
      expect(PortalUtils.buildPortalCaveats({ teamPossPct: 0.5 })).toEqual([]);
    });

    test("buildPortalOverallCaveats adds small-at-C caveat for Men only", () => {
      expect(
        PortalUtils.buildPortalOverallCaveats({
          gender: "Men",
          rosterHeight: "6-6",
          posFreqs: [0.1, 0.1, 0.1, 0.1, 0.2],
        }),
      ).toEqual([
        "Small player with [20.0%] Center minutes, may not be positionally viable",
      ]);
      expect(
        PortalUtils.buildPortalOverallCaveats({
          gender: "Women",
          rosterHeight: "6-6",
          posFreqs: [0.1, 0.1, 0.1, 0.1, 0.2],
        }),
      ).toEqual([]);
    });
  });

  describe("offense / defense notes", () => {
    test("caveatSmallPlayerCenterMinutes", () => {
      expect(
        PortalUtils.caveatSmallPlayerCenterMinutes({
          gender: "Men",
          rosterHeight: "6-8",
          posFreqs: [0.2, 0.2, 0.2, 0.2, 0.16],
        }),
      ).toBeNull();
      expect(
        PortalUtils.caveatSmallPlayerCenterMinutes({
          rosterHeight: "6-7",
          posFreqs: [0.2, 0.2, 0.2, 0.2, 0.16],
        }),
      ).toBeNull();
      expect(
        PortalUtils.caveatSmallPlayerCenterMinutes({
          gender: "Women",
          rosterHeight: "6-7",
          posFreqs: [0.2, 0.2, 0.2, 0.2, 0.16],
        }),
      ).toBeNull();
      expect(
        PortalUtils.caveatSmallPlayerCenterMinutes({
          gender: "Men",
          rosterHeight: "6-7",
          posFreqs: [0.2, 0.2, 0.2, 0.2, 0.16],
        }),
      ).toBe(
        "Small player with [16.0%] Center minutes, may not be positionally viable",
      );
    });

    test("portalEvalDefenseRapmNote when delta > 0.8", () => {
      expect(
        PortalUtils.portalEvalDefenseRapmNote({
          def_adj_rapm: -5.5,
          def_adj_rtg: -4.0,
        }),
      ).toMatch(/Note:.*significant \(\[1\.5\] better\)/);
      expect(
        PortalUtils.portalEvalDefenseRapmNote({
          def_adj_rapm: -4.0,
          def_adj_rtg: -5.5,
        }),
      ).toMatch(/Note:.*significant \(\[1\.5\] worse\)/);
    });

    test("portalEvalOffenseRapmNote worse branch reasons", () => {
      const avg = 105;
      expect(
        PortalUtils.portalEvalOffenseRapmNote({
          off_adj_rapm: 5,
          off_adj_rtg: 110,
          off_rtg: 110,
          off_usage: 0.15,
          off_usage_pred: 0.2,
          off_rtg_pred: 110,
          avgEfficiency: avg,
        }),
      ).toMatch(/could be their usage is too low to be impactful/);
      expect(
        PortalUtils.portalEvalOffenseRapmNote({
          off_adj_rapm: 5,
          off_adj_rtg: 108,
          off_rtg: 108,
          off_usage: 0.25,
          off_usage_pred: 0.2,
          off_rtg_pred: 110,
          avgEfficiency: avg,
        }),
      ).toMatch(/could take too many low quality shots/);
    });

    test("portalEvalOffensePredictedUsageWarning", () => {
      expect(
        PortalUtils.portalEvalOffensePredictedUsageWarning({
          off_usage_pred: 0.1,
          off_rtg_pred: 110,
          avgEfficiency: 105,
          off_adj_rapm: 0,
          off_adj_rtg: 0,
          off_usage: 0.2,
        }),
      ).toMatch(/Warning: to maintain/);
      expect(
        PortalUtils.portalEvalOffensePredictedUsageWarning({
          off_usage_pred: 0.2,
          off_rtg_pred: 110,
          avgEfficiency: 105,
          off_adj_rapm: 0,
          off_adj_rtg: 0,
          off_usage: 0.2,
        }),
      ).toBeNull();
    });
  });
});
