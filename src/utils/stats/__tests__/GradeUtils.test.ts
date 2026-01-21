import { GradeUtils } from "../GradeUtils";
import { DivisionStatistics, Statistic } from "../../StatModels";
import { toArray as treeToArray } from "@collectable/red-black-tree";

describe("GradeUtils", () => {
  //TODO: add unit tests anyway:
  //GradeUtils.buildAndInjectTeamDivisionStats tested by src/__tests__/buildLeaderboards.test.ts
  //GradeUtils.buildAndInjectTeamDivisionStatsLUT tested by src/__tests__/buildLeaderboards.test.ts
  //GradeUtils.buildAndInjectPlayerivisionStats tested by src/__tests__/buildLeaderboards.test.ts
  //GradeUtils.buildAndInjectPlayerDivisionStatsLUT tested by src/__tests__/buildLeaderboards.test.ts

  test("GradeUtils.binaryChop", () => {
    const test1 = [129, 0, 10, 20, 30, 40, 50]; //(eg 0-10 is 129, 40-50 is 133)

    expect(GradeUtils.binaryChop(test1, 5, 1, 6)).toEqual(130);
    expect(GradeUtils.binaryChop(test1, 20, 1, 6)).toEqual(131);
    expect(GradeUtils.binaryChop(test1, 22, 1, 6)).toEqual(132);
    expect(GradeUtils.binaryChop(test1, 49, 1, 6)).toEqual(134);

    //(ignore val because start/end indices are the same)
    expect(GradeUtils.binaryChop(test1, 300, 3, 3)).toEqual(131);

    // (check optimization - gets there in 1)
    expect(GradeUtils.binaryChop(test1, 25, 2, 6)).toEqual(132);
    expect(GradeUtils.binaryChop(test1, 35, 2, 6)).toEqual(133);

    // Edge cases - outside the bounds of the array
    expect(GradeUtils.binaryChop(test1, 55, 1, 6)).toEqual(135);
    expect(GradeUtils.binaryChop(test1, -5, 1, 6)).toEqual(129); //(min val allowed is start offset)
  });

  // When things break in practice fail, put 'em here

  const stableDoorLut = {
    def_adj_ppp: {
      isPct: false,
      min: 89.36973972,
      size: 358,
      lut: {
        "89": [0, 89.36973972],
        "91": [1, 91.07522499, 91.17919656, 91.23846, 91.30987205, 91.41544195],
        "92": [6, 91.87347977, 92.18124207, 92.26684514, 92.37299122],
        "93": [
          10, 92.62822067, 92.71815122, 92.73271262, 92.79564822, 92.85616978,
          93.03223977, 93.03944118, 93.05430467, 93.18887442,
        ],
      },
    },
  };
  const stableDoorStats: DivisionStatistics = {
    tier_sample_size: 0,
    tier_samples: {},
    tier_lut: stableDoorLut,
    dedup_sample_size: 0,
    dedup_samples: {},
  };
  const convertToRank = (res: Statistic | undefined) => {
    // This is way easier to see the correctness (and also in practice how I'm using it)
    return res
      ? {
          rank: Math.round((res?.value || 0) * (res?.samples || 0)),
          samples: res.samples || 0,
        }
      : {};
  };

  test("GradeUtils.getPercentile", () => {
    // Stable door testing

    expect(
      convertToRank(
        GradeUtils.buildTeamPercentiles(
          stableDoorStats,
          {
            def_adj_ppp: { value: 90.6 },
          },
          ["adj_ppp"],
          true
        )?.def_adj_ppp
      )
    ).toEqual({
      samples: 358,
      rank: 357,
    });
    expect(
      convertToRank(
        GradeUtils.buildTeamPercentiles(
          {
            precision: "native",
            ...stableDoorStats,
          },
          {
            def_adj_ppp: { value: 92.8561697808506 },
          },
          ["adj_ppp"],
          true
        )?.def_adj_ppp
      )
    ).toEqual({
      samples: 358,
      rank: 344,
    });
    expect(
      convertToRank(
        GradeUtils.buildTeamPercentiles(
          stableDoorStats,
          {
            def_adj_ppp: { value: 92.8561697808506 },
          },
          ["adj_ppp"],
          true
        )?.def_adj_ppp
      )
    ).toEqual({
      samples: 358,
      rank: 343,
    });

    // Functional testing

    const testLut = {
      test_field_pct: {
        isPct: true, //(whether you need to *100 before applying .toFixed(0))
        size: 200, //(total number of samples in the LUT)
        min: 0.15, //(don't need max, if value missed LUT and is >max then %ile==100, else 1)
        lut: {
          //5 entries
          "15": [0, 0.150001, 0.150002, 0.150003, 0.150004, 0.150005], //1st onwards
          "20": [5, 0.199, 0.203, 0.204, 0.2048], //6th onwards
          "22": [9, 0.22], //10th onwards
        },
      },
      test_field: {
        isPct: false, //(whether you need to *100 before applying .toFixed(0))
        size: 200, //(total number of samples in the LUT)
        min: -5, //(don't need max, if value missed LUT and is >max then %ile==100, else 1)
        lut: {
          "1": [10, 0.5, 0.53, 0.54], //(11th onwards)
        },
      },
    };
    const testDivStats: DivisionStatistics = {
      tier_sample_size: 0,
      tier_samples: {},
      tier_lut: testLut,
      dedup_sample_size: 0,
      dedup_samples: {},
    };
    expect(GradeUtils.getPercentile(testDivStats, "no_field", -1)).toEqual({});

    // Outside limits
    expect(
      convertToRank(
        GradeUtils.getPercentile(testDivStats, "test_field_pct", 0.1)
      )
    ).toEqual({ rank: 1, samples: 200 });
    expect(
      convertToRank(
        GradeUtils.getPercentile(testDivStats, "test_field_pct", 0.3)
      )
    ).toEqual({ rank: 200, samples: 200 });
    // Exact match
    expect(
      convertToRank(
        GradeUtils.getPercentile(testDivStats, "test_field_pct", 0.199)
      )
    ).toEqual({ rank: 6, samples: 200 });
    // In the gaps
    expect(
      convertToRank(
        GradeUtils.getPercentile(testDivStats, "test_field_pct", 0.1995)
      )
    ).toEqual({ rank: 7, samples: 200 });
    expect(
      convertToRank(
        GradeUtils.getPercentile(testDivStats, "test_field_pct", 0.2035)
      )
    ).toEqual({ rank: 8, samples: 200 });
    expect(
      convertToRank(
        GradeUtils.getPercentile(testDivStats, "test_field_pct", 0.20485)
      )
    ).toEqual({ rank: 10, samples: 200 });

    // Check if it doesn't hit a hash entry
    [false, true].forEach((buildCache) => {
      expect(
        convertToRank(
          GradeUtils.getPercentile(
            testDivStats,
            "test_field_pct",
            0.211,
            buildCache
          )
        )
      ).toEqual({ rank: 10, samples: 200 });

      expect(
        convertToRank(
          GradeUtils.getPercentile(testDivStats, "test_field", -10, buildCache)
        )
      ).toEqual({ rank: 1, samples: 200 });
      expect(
        convertToRank(
          GradeUtils.getPercentile(testDivStats, "test_field", 0.5, buildCache)
        )
      ).toEqual({ rank: 11, samples: 200 });
      expect(
        convertToRank(
          GradeUtils.getPercentile(
            testDivStats,
            "test_field",
            0.539,
            buildCache
          )
        )
      ).toEqual({ rank: 13, samples: 200 });
      expect(
        convertToRank(
          GradeUtils.getPercentile(testDivStats, "test_field", 100, buildCache)
        )
      ).toEqual({ rank: 200, samples: 200 });
    });
  });

  test("GradeUtils.buildSpacesBetween", () => {
    expect(
      treeToArray(
        GradeUtils.buildSpacesBetween(stableDoorStats, "def_adj_ppp")
      ).map((node) => {
        return {
          key: node.key.toFixed(1),
          value: (100 * node.value).toFixed(2),
        };
      })
    ).toEqual([
      { key: "89.4", value: "0.28" },
      { key: "91.1", value: "0.56" },
      { key: "91.9", value: "1.96" },
      { key: "92.6", value: "3.07" },
    ]);
  });

  test("GradeUtils.getPercentile - ranks should cover 1 to size (off_net)", async () => {
    // Load the combo stats file
    const fs = await import("fs/promises");
    const path = await import("path");
    const statsPath = path.resolve(
      __dirname,
      "../../../../public/leaderboards/lineups/stats_all_Men_2024_Combo.json"
    );
    const statsJson = await fs.readFile(statsPath, "utf-8");
    const divStats: DivisionStatistics = JSON.parse(statsJson);

    // Extract all values from tier_lut.off_net
    const offNetLut = divStats.tier_lut["off_net"];
    expect(offNetLut).toBeDefined();

    // Get all values from the LUT (skip the first element of each array which is the starting index)
    // Perturb values slightly to simulate floating point precision issues
    const allValues: number[] = [];
    let valueIndex = 0;
    for (const key in offNetLut.lut) {
      const arr = offNetLut.lut[key];
      // First element is the starting index, rest are the actual values
      for (let i = 1; i < arr.length; i++) {
        // Add/subtract tiny amount to simulate floating point representation issues
        // (e.g., 32.4742 stored as 32.474199999999996)
        const perturbation = valueIndex % 2 === 0 ? 1e-10 : -1e-10;
        allValues.push(arr[i]! + perturbation);
        valueIndex++;
      }
    }

    // Sort numerically
    allValues.sort((a, b) => a - b);

    // Verify we have the expected number of values
    expect(allValues.length).toBe(offNetLut.size);

    // Get percentiles for each value and convert to ranks
    const ranks = allValues.map((val) => {
      const percentile = GradeUtils.getPercentile(
        divStats,
        "off_net",
        val,
        true
      );
      return convertToRank(percentile);
    });

    // Build expected ranks array [1, 2, 3, ..., size]
    const expectedRanks = Array.from({ length: offNetLut.size }, (_, i) => ({
      rank: i + 1,
      samples: offNetLut.size,
    }));

    // Test that ranks go from 1 to arraySize
    expect(ranks).toEqual(expectedRanks);
  });
});
