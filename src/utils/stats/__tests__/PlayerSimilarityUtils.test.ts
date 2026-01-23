import { PlayerSimilarityUtils } from "../PlayerSimilarityUtils";
import { SimilarityConfig, DefaultSimilarityConfig } from "../../FilterModels";
import { IndivCareerStatSet } from "../../StatModels";

// Create a mock player for testing (avoids complex sample data type issues)
const createMockPlayer = (
  playerName: string = "Test Player"
): IndivCareerStatSet =>
  ({
    _id: `${playerName.toLowerCase().replace(/\s+/g, "_")}_2023_all`,
    player_name: playerName,
    roster: {
      height: "6-4",
      year_class: "Jr",
    },
    style: {
      "Rim Attack": {
        possPctUsg: { value: 0.15 },
        possPct: { value: 0.08 },
        pts: { value: 1.2 },
        adj_pts: { value: 1.1 },
      },
      "Attack & Kick": {
        possPctUsg: { value: 0.1 },
        possPct: { value: 0.05 },
        pts: { value: 0.9 },
        adj_pts: { value: 0.95 },
      },
      "Perimeter Sniper": {
        possPctUsg: { value: 0.12 },
        possPct: { value: 0.06 },
        pts: { value: 1.1 },
        adj_pts: { value: 1.05 },
      },
      "Dribble Jumper": {
        possPctUsg: { value: 0.08 },
        possPct: { value: 0.04 },
        pts: { value: 0.85 },
        adj_pts: { value: 0.9 },
      },
      "Mid-Range": {
        possPctUsg: { value: 0.05 },
        possPct: { value: 0.03 },
        pts: { value: 0.8 },
        adj_pts: { value: 0.82 },
      },
      "Hits Cutter": {
        possPctUsg: { value: 0.07 },
        possPct: { value: 0.04 },
        pts: { value: 1.3 },
        adj_pts: { value: 1.25 },
      },
      "Backdoor Cut": {
        possPctUsg: { value: 0.03 },
        possPct: { value: 0.02 },
        pts: { value: 1.4 },
        adj_pts: { value: 1.35 },
      },
      "PnR Passer": {
        possPctUsg: { value: 0.06 },
        possPct: { value: 0.03 },
        pts: { value: 0.95 },
        adj_pts: { value: 1.0 },
      },
      "Big Cut & Roll": {
        possPctUsg: { value: 0.04 },
        possPct: { value: 0.02 },
        pts: { value: 1.2 },
        adj_pts: { value: 1.15 },
      },
      "Post-Up": {
        possPctUsg: { value: 0.09 },
        possPct: { value: 0.05 },
        pts: { value: 0.9 },
        adj_pts: { value: 0.92 },
      },
      "Post & Kick": {
        possPctUsg: { value: 0.02 },
        possPct: { value: 0.01 },
        pts: { value: 1.0 },
        adj_pts: { value: 0.98 },
      },
      "Pick & Pop": {
        possPctUsg: { value: 0.03 },
        possPct: { value: 0.02 },
        pts: { value: 1.1 },
        adj_pts: { value: 1.08 },
      },
      "High-Low": {
        possPctUsg: { value: 0.01 },
        possPct: { value: 0.01 },
        pts: { value: 1.3 },
        adj_pts: { value: 1.28 },
      },
      "Put-Back": {
        possPctUsg: { value: 0.02 },
        possPct: { value: 0.01 },
        pts: { value: 1.5 },
        adj_pts: { value: 1.45 },
      },
      Transition: {
        possPctUsg: { value: 0.13 },
        possPct: { value: 0.07 },
        pts: { value: 1.2 },
        adj_pts: { value: 1.18 },
      },
    },
    off_3p: { value: 0.35 },
    off_2pmid: { value: 0.42 },
    off_2prim: { value: 0.68 },
    off_3pr: { value: 0.3 },
    off_2pmidr: { value: 0.15 },
    off_2primr: { value: 0.55 },
    off_assist: { value: 3.2 },
    off_to: { value: 2.1 },
    off_orb: { value: 1.8 },
    off_ftr: { value: 0.25 },
    off_usage: { value: 22.5 },
    off_adj_rapm: { value: 2.1 },
    off_adj_rtg: { value: 115.2 },
    def_adj_rapm: { value: 0.8 },
    def_rtg: { value: 98.5 },
    def_stl: { value: 1.1 },
    def_blk: { value: 0.4 },
    def_foul: { value: 2.3 },
    def_orb: { value: 4.2 }, // This is actually DRB from player perspective
    off_team_poss_pct: { value: 0.78 },
    on: {
      def_adj_ppp: { value: 0.98 },
    },
  } as any);

const samplePlayerCareer = createMockPlayer();

describe("PlayerSimilarityUtils", () => {
  const samplePlayer = samplePlayerCareer;

  describe("constants", () => {
    it("should have correct dropdown weights", () => {
      const weights = PlayerSimilarityUtils.dropdownWeights;

      expect(weights.none).toBe(0.0);
      expect(weights.less).toBe(0.5);
      expect(weights.default).toBe(1.0);
      expect(weights.more).toBe(2.0);
    });
  });

  describe("New Z-Score Based Approach", () => {
    describe("buildSimplePlayerSimilarityVector", () => {
      it("should build simple vector for first pass", () => {
        const vector =
          PlayerSimilarityUtils.buildSimplePlayerSimilarityVector(
            samplePlayerCareer
          );

        expect(vector).toBeInstanceOf(Array);
        expect(vector.length).toBe(15); // Should match allStyles length
        expect(vector.every((val: number) => typeof val === "number")).toBe(
          true
        );
      });

      it("should apply frequency weights when includeWeights=true", () => {
        const vectorNoWeights =
          PlayerSimilarityUtils.buildSimplePlayerSimilarityVector(
            samplePlayerCareer,
            false
          );
        const vectorWithWeights =
          PlayerSimilarityUtils.buildSimplePlayerSimilarityVector(
            samplePlayerCareer,
            true
          );

        expect(vectorNoWeights.length).toBe(vectorWithWeights.length);

        // Some elements should be different (those with frequency weights applied)
        const hasDifferences = vectorNoWeights.some(
          (val: number, idx: number) =>
            Math.abs(val - vectorWithWeights[idx]) > 0.001
        );
        expect(hasDifferences).toBe(true);
      });
    });

    describe("buildUnweightedPlayerSimilarityVectorFromFlat", () => {
      it("should build unweighted vector with default config", () => {
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const { vector } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat
          );

        expect(vector).toBeInstanceOf(Array);
        expect(vector.length).toBeGreaterThan(15); // Should have more elements than just play styles
        expect(
          vector.every((val: number) => typeof val === "number" && !isNaN(val))
        ).toBe(true);
      });

      it("should exclude elements when weights are 'none'", () => {
        const config = {
          ...DefaultSimilarityConfig,
          fgBonus: "none" as const,
          usageBonus: "none" as const,
        };
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const { vector: vectorDefault } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat
          );
        const { vector: vectorExcluded } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat,
            config
          );

        // Vector with exclusions should be shorter
        expect(vectorExcluded.length).toBeLessThan(vectorDefault.length);
      });

      it("should calculate fieldMapping correctly for default config", () => {
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);

        // Test with isSourcePlayer=true to get field mapping
        const { vector, fieldMapping } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat,
            DefaultSimilarityConfig,
            true // isSourcePlayer=true to populate fieldMapping
          );

        // Field mapping should be defined when isSourcePlayer=true
        expect(fieldMapping).toBeDefined();
        expect(typeof fieldMapping).toBe("object");

        // Should have entries for each field added to the vector
        const fieldKeys = Object.keys(fieldMapping);
        expect(fieldKeys.length).toBeGreaterThan(0);

        // All mapping values should be valid indices in the vector
        Object.values(fieldMapping).forEach((index: number) => {
          expect(typeof index).toBe("number");
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(vector.length);
        });

        // Should include play style fields (both usage and scoring efficiency)
        const styleFields = fieldKeys.filter((key) => key.startsWith("style."));
        expect(styleFields.length).toBe(30); // 15 for usage + 15 for scoring efficiency

        // Play style usage fields should have indices 0-14 (first in vector)
        const styleUsageFields = fieldKeys.filter((key) =>
          key.includes(".possPctUsg.value")
        );
        expect(styleUsageFields.length).toBe(15);
        styleUsageFields.forEach((styleField) => {
          const index = fieldMapping[styleField];
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThanOrEqual(14);
        });

        // Play style scoring efficiency fields should come later in the vector
        const styleScoringFields = fieldKeys.filter(
          (key) => key.includes(".adj_pts.value") || key.includes(".pts.value")
        );
        expect(styleScoringFields.length).toBe(15);

        // Should include other expected field types (only those added via appendToVec with non-'none' weights)
        const assistField = fieldKeys.find((key) => key.includes("off_assist"));
        const toField = fieldKeys.find((key) => key.includes("off_to"));
        const orbField = fieldKeys.find((key) => key.includes("off_orb"));
        const ftrField = fieldKeys.find((key) => key.includes("off_ftr"));
        const usageField = fieldKeys.find((key) => key.includes("off_usage"));

        expect(assistField).toBeDefined(); // assistWeighting: "default"
        expect(toField).toBeDefined(); // turnoverWeighting: "default"
        expect(orbField).toBeDefined(); // offensiveReboundWeighting: "default"
        expect(ftrField).toBeDefined(); // freeThrowWeighting: "default"
        expect(usageField).toBeDefined(); // usageBonus: "default"

        // Field names should be unique (no duplicate field mappings)
        // Note: some fields like off_ftr.value may be used multiple times in the vector
        // but should only appear once in the fieldMapping
        const fieldNames = Object.keys(fieldMapping);
        const uniqueFieldNames = Array.from(new Set(fieldNames));
        expect(uniqueFieldNames.length).toBe(fieldNames.length);

        // All indices should be valid (within vector bounds)
        const indices = Object.values(fieldMapping);
        indices.forEach((index) => {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(vector.length);
        });
      });

      it("should not populate fieldMapping when isSourcePlayer=false", () => {
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);

        // Test with isSourcePlayer=false (default)
        const { vector, fieldMapping } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat,
            DefaultSimilarityConfig,
            false // isSourcePlayer=false
          );

        // Vector should still be built
        expect(vector).toBeDefined();
        expect(vector.length).toBeGreaterThan(0);

        // Field mapping should be empty when isSourcePlayer=false
        expect(fieldMapping).toBeDefined();
        expect(Object.keys(fieldMapping).length).toBe(0);
      });
    });

    describe("calculateZScores", () => {
      it("should calculate means and standard deviations", () => {
        const vectors = [
          [1, 2, 3],
          [2, 4, 6],
          [3, 6, 9],
        ];

        const { means, stdDevs } =
          PlayerSimilarityUtils.calculateZScores(vectors);

        expect(means.length).toBe(3);
        expect(stdDevs.length).toBe(3);
        expect(means[0]).toBeCloseTo(2, 5); // (1+2+3)/3 = 2
        expect(means[1]).toBeCloseTo(4, 5); // (2+4+6)/3 = 4
        expect(stdDevs).toEqual(expect.arrayContaining([expect.any(Number)]));
        expect(stdDevs.every((std: number) => std > 0)).toBe(true);
      });

      it("should handle edge cases", () => {
        const { means: emptyMeans, stdDevs: emptyStdDevs } =
          PlayerSimilarityUtils.calculateZScores([]);
        expect(emptyMeans).toEqual([]);
        expect(emptyStdDevs).toEqual([]);

        // Single vector
        const { means, stdDevs } = PlayerSimilarityUtils.calculateZScores([
          [1, 2, 3],
        ]);
        expect(means).toEqual([1, 2, 3]);
        expect(stdDevs).toEqual([0.0, 0.0, 0.0]); // Single data point has no standard deviation
      });
    });

    describe("calculateRateWeights", () => {
      it("should calculate style and FG rate weights", () => {
        const config = {
          ...DefaultSimilarityConfig,
          fgBonus: "default" as const,
        };
        const { styleRateWeights, fgRateWeights } =
          PlayerSimilarityUtils.calculateRateWeights(
            samplePlayerCareer,
            config
          );

        expect(styleRateWeights.length).toBe(15);
        expect(fgRateWeights.length).toBe(4);

        // Style weights should sum to styledScoringWeight (4.0), FG weights sum to fgWeight (4.0)
        const styleSum = styleRateWeights.reduce(
          (sum: number, w: number) => sum + w,
          0
        );
        const fgSum = fgRateWeights.reduce(
          (sum: number, w: number) => sum + w,
          0
        );

        expect(styleSum).toBeCloseTo(
          PlayerSimilarityUtils.styledScoringWeight,
          5
        );
        expect(fgSum).toBeCloseTo(PlayerSimilarityUtils.fgWeight, 5);
      });

      it("should handle fgBonus = none", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: "none" as const };
        const { fgRateWeights } = PlayerSimilarityUtils.calculateRateWeights(
          samplePlayerCareer,
          config
        );

        expect(fgRateWeights).toEqual([]);
      });
    });

    describe("calculateRelativeRateWeights", () => {
      it("should match calculateRateWeights when using same vector for both player and candidate", () => {
        const config = {
          ...DefaultSimilarityConfig,
          fgBonus: "default" as const,
        };

        // Get the original rate weights from calculateRateWeights
        const originalWeights = PlayerSimilarityUtils.calculateRateWeights(
          samplePlayerCareer,
          config
        );

        // Convert player to flat fields and build vector
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer).flat;
        const { vector, fieldMapping } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields,
            config,
            true // isSourcePlayer = true to get fieldMapping
          );

        // Get relative rate weights using same vector for both parameters
        const relativeWeights =
          PlayerSimilarityUtils.calculateRelativeRateWeights(
            vector,
            vector, // Same vector as candidate
            fieldMapping,
            config
          );

        // Style rate weights should match exactly
        expect(relativeWeights.styleRateWeights.length).toBe(
          originalWeights.styleRateWeights.length
        );

        try {
          relativeWeights.styleRateWeights.forEach((weight, index) => {
            expect(weight).toBeCloseTo(
              originalWeights.styleRateWeights[index],
              5
            );
          });
        } catch (error) {
          console.log("\n=== STYLE RATE WEIGHTS COMPARISON FAILED ===");
          console.log("Player:", JSON.stringify(samplePlayerCareer));
          console.log("Flat Player:", JSON.stringify(flatFields));
          console.log("Player Vector:", JSON.stringify(vector));
          console.log(
            "Original styleRateWeights:",
            originalWeights.styleRateWeights
          );
          console.log(
            "Relative styleRateWeights:",
            relativeWeights.styleRateWeights
          );
          console.log(
            "Differences:",
            relativeWeights.styleRateWeights.map(
              (weight, index) =>
                weight - originalWeights.styleRateWeights[index]
            )
          );
          throw error;
        }

        // FG rate weights should match exactly
        expect(relativeWeights.fgRateWeights.length).toBe(
          originalWeights.fgRateWeights.length
        );

        try {
          relativeWeights.fgRateWeights.forEach((weight, index) => {
            expect(weight).toBeCloseTo(originalWeights.fgRateWeights[index], 5);
          });
        } catch (error) {
          console.log("\n=== FG RATE WEIGHTS COMPARISON FAILED ===");
          console.log("Original fgRateWeights:", originalWeights.fgRateWeights);
          console.log("Relative fgRateWeights:", relativeWeights.fgRateWeights);
          console.log(
            "Differences:",
            relativeWeights.fgRateWeights.map(
              (weight, index) => weight - originalWeights.fgRateWeights[index]
            )
          );
          throw error;
        }
      });

      it("should handle fgBonus = none", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: "none" as const };

        // Convert player to flat fields and build vector
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const { vector, fieldMapping } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat,
            config,
            true
          );

        const { fgRateWeights } =
          PlayerSimilarityUtils.calculateRelativeRateWeights(
            vector,
            vector,
            fieldMapping,
            config
          );

        expect(fgRateWeights).toEqual([]);
      });
    });

    describe("findSimilarPlayers", () => {
      it("should find similar players from candidate list", async () => {
        // Create some test candidates
        const candidates = [
          createMockPlayer("Player 1"),
          createMockPlayer("Player 2"),
          createMockPlayer("Player 3"),
        ];

        const results = await PlayerSimilarityUtils.findSimilarPlayers(
          samplePlayerCareer,
          DefaultSimilarityConfig,
          candidates
        );

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeLessThanOrEqual(10); // Should return at most 10
        expect(results.length).toBeLessThanOrEqual(candidates.length);

        results.forEach((result) => {
          expect(result).toHaveProperty("obj");
          expect(result).toHaveProperty("similarity");
          expect(result).toHaveProperty("diagnostics");
          expect(typeof result.similarity).toBe("number");
        });
      });

      it("should sort results by similarity", async () => {
        const candidate1 = createMockPlayer("Player 1");
        const candidate2 = createMockPlayer("Player 2");

        // Modify one candidate to be more different
        if (candidate2.style?.["Rim Attack"]) {
          candidate2.style["Rim Attack"].possPctUsg = { value: 0.999 }; // Make it very different
        }

        const candidates = [candidate1, candidate2];

        const results = await PlayerSimilarityUtils.findSimilarPlayers(
          samplePlayerCareer,
          DefaultSimilarityConfig,
          candidates
        );

        // Results should be sorted by similarity (ascending)
        for (let i = 1; i < results.length; i++) {
          expect(results[i].similarity).toBeGreaterThanOrEqual(
            results[i - 1].similarity
          );
        }
      });

      it("should provide diagnostic information", async () => {
        const mockCandidates = [createMockPlayer("Test Player")];

        const results = await PlayerSimilarityUtils.findSimilarPlayers(
          samplePlayerCareer,
          DefaultSimilarityConfig,
          mockCandidates
        );

        expect(results).toHaveLength(1);
        const result = results[0];

        // Should always include diagnostics
        expect(result.diagnostics).toBeDefined();

        // Check component scores structure
        expect(result.diagnostics.componentScores).toBeDefined();
        expect(result.diagnostics.componentScores.playStyle).toBeDefined();
        expect(
          result.diagnostics.componentScores.scoringEfficiency
        ).toBeDefined();
        expect(result.diagnostics.componentScores.defense).toBeDefined();
        expect(result.diagnostics.componentScores.playerInfo).toBeDefined();

        // Check that each component has the expected structure
        Object.values(result.diagnostics.componentScores).forEach(
          (component) => {
            expect(typeof component.weightedZScoreSum).toBe("number");
            expect(typeof component.totalWeight).toBe("number");
            expect(Array.isArray(component.statBreakdown)).toBe(true);

            // Check stat breakdown structure
            component.statBreakdown.forEach((stat) => {
              expect(typeof stat.name).toBe("string");
              expect(typeof stat.zScore).toBe("number");
              expect(typeof stat.weight).toBe("number");
              expect(typeof stat.weightedAbsoluteZScore).toBe("number");
              expect(typeof stat.globalStdDev).toBe("number");
            });
          }
        );

        // Check total similarity
        expect(typeof result.diagnostics.totalSimilarity).toBe("number");
        expect(Number.isFinite(result.diagnostics.totalSimilarity)).toBe(true);

        // Check z-score statistics
        expect(result.diagnostics.zScoreStats).toBeDefined();
        expect(Array.isArray(result.diagnostics.zScoreStats.means)).toBe(true);
        expect(Array.isArray(result.diagnostics.zScoreStats.stdDevs)).toBe(
          true
        );
      });
    });

    describe("Flat Format Functions", () => {
      it("should build vector from flat docvalue_fields format", () => {
        // Create sample flat fields (simulating Elasticsearch docvalue_fields response)
        const flatFields = {
          "style.Rim Attack.possPctUsg.value": [0.0906],
          "style.Rim Attack.possPct.value": [0.2545],
          "style.Rim Attack.adj_pts.value": [0.9787],
          "style.Rim Attack.pts.value": [0.9636],
          "off_assist.value": [0.3074],
          "off_to.value": [0.1344],
          "off_orb.value": [0.0101],
          "off_ftr.value": [0.4302],
          "off_usage.value": [0.2562],
          "roster.year_class.keyword": ["So"],
          "roster.height.keyword": ["6-0"],
        };

        const { vector } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields,
            DefaultSimilarityConfig
          );

        expect(Array.isArray(vector)).toBe(true);
        expect(vector.length).toBeGreaterThan(0);
        expect(vector.every((val: number) => typeof val === "number")).toBe(
          true
        );
      });

      it("should convert nested player to flat fields format", () => {
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer).flat;

        expect(typeof flatFields).toBe("object");
        expect(Object.keys(flatFields).length).toBeGreaterThan(0);

        // Check that style fields are present
        const styleKeys = Object.keys(flatFields).filter((key) =>
          key.startsWith("style.")
        );
        expect(styleKeys.length).toBeGreaterThan(0);

        // Check that values are arrays
        Object.values(flatFields).forEach((value) => {
          expect(Array.isArray(value)).toBe(true);
          expect(value.length).toBeGreaterThan(0);
        });
      });

      it("should work consistently with round-trip conversion", () => {
        // Convert to flat format and back
        const flatFields =
          PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const { vector: vector1 } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat,
            DefaultSimilarityConfig
          );

        // Do it again to ensure consistency
        const { vector: vector2 } =
          PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
            flatFields.flat,
            DefaultSimilarityConfig
          );

        // Vectors should be identical
        expect(vector2.length).toBe(vector1.length);
        for (let i = 0; i < vector1.length; i++) {
          expect(vector2[i]).toBe(vector1[i]);
        }
      });
    });
  });

  describe("parseCustomWeights", () => {
    it("should parse empty string correctly", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights("");
      expect(result).toEqual({});
    });

    it("should parse whitespace-only string correctly", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights("   ");
      expect(result).toEqual({});
    });

    it("should parse single weight correctly", () => {
      const result =
        PlayerSimilarityUtils.parseCustomWeights("Attack & Kick: 2.0");
      expect(result).toEqual({ "Attack & Kick": 2.0 });
    });

    it("should parse multiple weights correctly", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights(
        "Attack & Kick: 2.0, Rim Attack: 3.0"
      );
      expect(result).toEqual({
        "Attack & Kick": 2.0,
        "Rim Attack": 3.0,
      });
    });

    it("should handle whitespace around values", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights(
        "Attack & Kick:  2.0 , Rim Attack :3.0"
      );
      expect(result).toEqual({
        "Attack & Kick": 2.0,
        "Rim Attack": 3.0,
      });
    });

    it("should handle decimal values", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights(
        "Test: 1.5, Another: 0.75"
      );
      expect(result).toEqual({
        Test: 1.5,
        Another: 0.75,
      });
    });

    it("should skip invalid pairs without colons", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights(
        "Valid: 2.0, Invalid, Another: 3.0"
      );
      expect(result).toEqual({
        Valid: 2.0,
        Another: 3.0,
      });
    });

    it("should skip pairs with invalid numbers", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights(
        "Valid: 2.0, Invalid: abc, Another: 3.0"
      );
      expect(result).toEqual({
        Valid: 2.0,
        Another: 3.0,
      });
    });

    it("should handle empty keys or values", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights(
        ": 2.0, Valid: 3.0, Empty:"
      );
      expect(result).toEqual({
        Valid: 3.0,
      });
    });
  });

  describe("buildSimilarityQueryFilters", () => {
    const mockPlayer = createMockPlayer("Test Player");

    it("should return empty query for default config", () => {
      const config = { ...DefaultSimilarityConfig };
      const result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        mockPlayer as any,
        config
      );

      expect(result.query).toBe("");
      expect(result.runtimeMappingNames).toBeUndefined();
    });

    it("should generate class weighting filters", () => {
      // Test "same_class"
      const configSameClass = {
        ...DefaultSimilarityConfig,
        classWeighting: "same_class" as any,
      };
      let result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        mockPlayer as any,
        configSameClass
      );
      expect(result.query).toBe(`roster.year_class.keyword:"Jr"`);
      expect(result.runtimeMappingNames).toBeUndefined();

      // Test "fr_only"
      const configFrOnly = {
        ...DefaultSimilarityConfig,
        classWeighting: "fr_only" as any,
      };
      result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        mockPlayer as any,
        configFrOnly
      );
      expect(result.query).toBe(`roster.year_class.keyword:"Fr"`);

      // Test "under"
      const configUnder = {
        ...DefaultSimilarityConfig,
        classWeighting: "under" as any,
      };
      result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        mockPlayer as any,
        configUnder
      );
      expect(result.query).toBe(`roster.year_class.keyword:("Fr" OR "So")`);

      // Test "upper"
      const configUpper = {
        ...DefaultSimilarityConfig,
        classWeighting: "upper" as any,
      };
      result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        mockPlayer as any,
        configUpper
      );
      expect(result.query).toBe(`roster.year_class.keyword:("Jr" OR "Sr")`);
    });

    it("should generate level of play filters", () => {
      const playerWithConf = { ...mockPlayer, conf: "Big Ten Conference" };

      // Test "same_conf"
      const configSameConf = {
        ...DefaultSimilarityConfig,
        levelOfPlay: "same_conf" as any,
      };
      let result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        playerWithConf as any,
        configSameConf
      );
      expect(result.query).toBe(`conf.keyword:"Big Ten Conference"`);
      expect(result.runtimeMappingNames).toBeUndefined();

      // Test "same_tier"
      const configSameTier = {
        ...DefaultSimilarityConfig,
        levelOfPlay: "same_tier" as any,
      };
      result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        playerWithConf as any,
        configSameTier
      );
      expect(result.query).toContain("conf.keyword:");
      expect(result.query).toContain("Big Ten Conference");
      expect(result.runtimeMappingNames).toBeUndefined();

      // Test "similar_sos"
      const configSimilarSos = {
        ...DefaultSimilarityConfig,
        levelOfPlay: "similar_sos" as any,
      };
      result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        playerWithConf as any,
        configSimilarSos
      );
      expect(result.query).toContain("oppo_sos:");
      expect(result.runtimeMappingNames).toBe("oppo_sos");

      // Test "any"
      const configAny = {
        ...DefaultSimilarityConfig,
        levelOfPlay: "any" as any,
      };
      result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        playerWithConf as any,
        configAny
      );
      expect(result.query).toBe("");
      expect(result.runtimeMappingNames).toBeUndefined();
    });

    it("should combine multiple filters with AND", () => {
      const playerWithConf = { ...mockPlayer, conf: "Big Ten Conference" };
      const config = {
        ...DefaultSimilarityConfig,
        classWeighting: "same_class" as any,
        levelOfPlay: "same_conf" as any,
      };

      const result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        playerWithConf as any,
        config
      );
      expect(result.query).toBe(
        `roster.year_class.keyword:"Jr" AND conf.keyword:"Big Ten Conference"`
      );
      expect(result.runtimeMappingNames).toBeUndefined();
    });

    it("should handle missing conference data gracefully", () => {
      const playerNoConf = { ...mockPlayer, conf: undefined };

      // Test "same_tier" with no conference
      const config = {
        ...DefaultSimilarityConfig,
        levelOfPlay: "same_tier" as any,
      };
      const result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        playerNoConf as any,
        config
      );
      expect(result.query).toBe("");
      expect(result.runtimeMappingNames).toBeUndefined();
    });

    it("should calculate SoS range correctly", () => {
      const playerWithSos = {
        ...mockPlayer,
        off_adj_opp: { value: 100 },
        def_adj_opp: { value: 95 },
      };

      const config = {
        ...DefaultSimilarityConfig,
        levelOfPlay: "similar_sos" as any,
      };
      const result = PlayerSimilarityUtils.buildSimilarityQueryFilters(
        playerWithSos as any,
        config
      );

      // SoS = 100 - 95 = 5, range should be 1.5 to 8.5
      expect(result.query).toBe("oppo_sos:[1.5 TO 8.5]");
      expect(result.runtimeMappingNames).toBe("oppo_sos");
    });
  });
});
