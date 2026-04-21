import _ from "lodash";

import {
  OffseasonLeaderboardCategoryUtils,
  type CategoryPathNeedDetail,
  type OffseasonCategoryPathComputedRow,
} from "../OffseasonLeaderboardCategoryUtils";

describe("OffseasonLeaderboardCategoryUtils", () => {
  describe("kNeedCumulativePercentileInGoalGroup", () => {
    function row(
      team: string,
      kSwings: number,
      net: number,
    ): OffseasonCategoryPathComputedRow {
      return {
        team,
        conf: "X",
        goalLabel: "G",
        fallbackLabel: "E",
        analysisText: "",
        goalSortKey: 25,
        goalThresholdNet: 0,
        kSwings,
        net,
        netRank: 1,
        teamInfo: {} as never,
      };
    }

    test("all same kSwings → everyone 100%", () => {
      const group = [row("A", 0, 10), row("B", 0, 12), row("C", 0, 8)];
      for (const r of group) {
        expect(
          OffseasonLeaderboardCategoryUtils.kNeedCumulativePercentileInGoalGroup(
            group,
            r,
          ),
        ).toBe(100);
      }
    });

    test("one team at k=0 among seven → 14% for that team only", () => {
      const group = [
        row("Illinois", 0, 20),
        row("Nebraska", 1.5, 18),
        row("Iowa", 1.5, 17),
        row("Maryland", 1.5, 16),
        row("OhioSt", 2, 15),
        row("MSU", 6, 30),
        row("UCLA", 6, 28),
      ];
      expect(
        OffseasonLeaderboardCategoryUtils.kNeedCumulativePercentileInGoalGroup(
          group,
          group[0]!,
        ),
      ).toBe(14);
      expect(
        OffseasonLeaderboardCategoryUtils.kNeedCumulativePercentileInGoalGroup(
          group,
          group[5]!,
        ),
      ).toBe(100);
    });
  });

  /**
   * Mirrors {@link OffseasonLeaderboardCategoryUtils.buildCategoryPathRows} final order:
   * ambitious goal first (−goalSortKey desc), then easier need (kSwings asc), then better net.
   */
  describe("category path sort iteratees (regression)", () => {
    function sortLikeTable(
      rows: Pick<
        OffseasonCategoryPathComputedRow,
        "goalSortKey" | "kSwings" | "net" | "team"
      >[],
    ) {
      return _.orderBy(
        rows,
        [(r) => -r.goalSortKey, (r) => r.kSwings, (r) => r.net],
        ["desc", "asc", "desc"],
      );
    }

    test("lower kSwings sorts before higher when goalSortKey matches", () => {
      const sorted = sortLikeTable([
        { team: "Hard", goalSortKey: 25, kSwings: 2, net: 25 },
        { team: "Easy", goalSortKey: 25, kSwings: 0, net: 20 },
      ]);
      expect(sorted.map((r) => r.team)).toEqual(["Easy", "Hard"]);
    });

    test("same kSwings: higher net first", () => {
      const sorted = sortLikeTable([
        { team: "LowerNet", goalSortKey: 25, kSwings: 0, net: 20 },
        { team: "HigherNet", goalSortKey: 25, kSwings: 0, net: 28 },
      ]);
      expect(sorted.map((r) => r.team)).toEqual(["HigherNet", "LowerNet"]);
    });

    test("No bad luck cohort must not use kSwings=MAX+1 vs real paths (same k=0 sorts by net)", () => {
      const sorted = sortLikeTable([
        { team: "Elite", goalSortKey: 25, kSwings: 0, net: 35 },
        { team: "NeedOne", goalSortKey: 25, kSwings: 1, net: 40 },
        { team: "Elite2", goalSortKey: 25, kSwings: 0, net: 32 },
      ]);
      expect(sorted.map((r) => r.team)).toEqual(["Elite", "Elite2", "NeedOne"]);
    });
  });

  describe("elseAbbrevFromFallbackLabel", () => {
    test("maps ladder labels to short Else column", () => {
      expect(
        OffseasonLeaderboardCategoryUtils.elseAbbrevFromFallbackLabel(
          "Final Four",
        ),
      ).toBe("FF");
      expect(
        OffseasonLeaderboardCategoryUtils.elseAbbrevFromFallbackLabel("Top 25"),
      ).toBe("T25");
      expect(
        OffseasonLeaderboardCategoryUtils.elseAbbrevFromFallbackLabel(
          "1-digit seed",
        ),
      ).toBe("S6-9");
      expect(
        OffseasonLeaderboardCategoryUtils.elseAbbrevFromFallbackLabel("Bubble"),
      ).toBe("Bub");
      expect(
        OffseasonLeaderboardCategoryUtils.elseAbbrevFromFallbackLabel(
          "Outside top 60",
        ),
      ).toBe(">T60");
    });
  });

  describe("summaryThingsGoWellFromNeedDetail", () => {
    test("single k", () => {
      const d = {
        quantifier: "any" as const,
        k: 1,
        groups: [],
      } satisfies CategoryPathNeedDetail;
      expect(
        OffseasonLeaderboardCategoryUtils.summaryThingsGoWellFromNeedDetail(d),
      ).toBe("+1 things go well");
    });

    test("primary and remainder k differ", () => {
      const d = {
        quantifier: "any" as const,
        k: 1,
        groups: [],
        remainderOrAny: {
          quantifier: "all" as const,
          k: 2,
          groups: [],
        },
      } satisfies CategoryPathNeedDetail;
      expect(
        OffseasonLeaderboardCategoryUtils.summaryThingsGoWellFromNeedDetail(d),
      ).toBe("+1-2 things go well");
    });
  });

  describe("buildNeedDetailFromTriples", () => {
    test("impossible when no positive marginal swings", () => {
      const r = OffseasonLeaderboardCategoryUtils.buildNeedDetailFromTriples(
        [],
        5,
        undefined,
      );
      expect(r.outcome).toBe("impossible");
    });
  });
});
