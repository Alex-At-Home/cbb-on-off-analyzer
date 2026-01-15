import { PlayerSimilarityUtils } from "../PlayerSimilarityUtils";
import { SimilarityConfig, DefaultSimilarityConfig } from "../../FilterModels";
import { IndivCareerStatSet } from "../../StatModels";

// Create a mock player for testing (avoids complex sample data type issues)
const createMockPlayer = (playerName: string = "Test Player"): IndivCareerStatSet => ({
  _id: `${playerName.toLowerCase().replace(/\s+/g, '_')}_2023_all`,
  player_name: playerName,
  roster: {
    height: "6-4",
    year_class: "Jr",
  },
      style: {
    "Rim Attack": { possPctUsg: { value: 0.15 }, possPct: { value: 0.08 }, pts: { value: 1.2 }, adj_pts: { value: 1.1 } },
    "Attack & Kick": { possPctUsg: { value: 0.10 }, possPct: { value: 0.05 }, pts: { value: 0.9 }, adj_pts: { value: 0.95 } },
    "Perimeter Sniper": { possPctUsg: { value: 0.12 }, possPct: { value: 0.06 }, pts: { value: 1.1 }, adj_pts: { value: 1.05 } },
    "Dribble Jumper": { possPctUsg: { value: 0.08 }, possPct: { value: 0.04 }, pts: { value: 0.85 }, adj_pts: { value: 0.9 } },
    "Mid-Range": { possPctUsg: { value: 0.05 }, possPct: { value: 0.03 }, pts: { value: 0.8 }, adj_pts: { value: 0.82 } },
    "Hits Cutter": { possPctUsg: { value: 0.07 }, possPct: { value: 0.04 }, pts: { value: 1.3 }, adj_pts: { value: 1.25 } },
    "Backdoor Cut": { possPctUsg: { value: 0.03 }, possPct: { value: 0.02 }, pts: { value: 1.4 }, adj_pts: { value: 1.35 } },
    "PnR Passer": { possPctUsg: { value: 0.06 }, possPct: { value: 0.03 }, pts: { value: 0.95 }, adj_pts: { value: 1.0 } },
    "Big Cut & Roll": { possPctUsg: { value: 0.04 }, possPct: { value: 0.02 }, pts: { value: 1.2 }, adj_pts: { value: 1.15 } },
    "Post-Up": { possPctUsg: { value: 0.09 }, possPct: { value: 0.05 }, pts: { value: 0.9 }, adj_pts: { value: 0.92 } },
    "Post & Kick": { possPctUsg: { value: 0.02 }, possPct: { value: 0.01 }, pts: { value: 1.0 }, adj_pts: { value: 0.98 } },
    "Pick & Pop": { possPctUsg: { value: 0.03 }, possPct: { value: 0.02 }, pts: { value: 1.1 }, adj_pts: { value: 1.08 } },
    "High-Low": { possPctUsg: { value: 0.01 }, possPct: { value: 0.01 }, pts: { value: 1.3 }, adj_pts: { value: 1.28 } },
    "Put-Back": { possPctUsg: { value: 0.02 }, possPct: { value: 0.01 }, pts: { value: 1.5 }, adj_pts: { value: 1.45 } },
    "Transition": { possPctUsg: { value: 0.13 }, possPct: { value: 0.07 }, pts: { value: 1.2 }, adj_pts: { value: 1.18 } },
      },
      off_3p: { value: 0.35 },
      off_2pmid: { value: 0.42 },
  off_2prim: { value: 0.68 },
  off_3pr: { value: 0.30 },
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
    def_adj_ppp: { value: 0.98 }
  }
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
        const vector = PlayerSimilarityUtils.buildSimplePlayerSimilarityVector(samplePlayerCareer);
        
        expect(vector).toBeInstanceOf(Array);
        expect(vector.length).toBe(15); // Should match allStyles length
        expect(vector.every((val: number) => typeof val === 'number')).toBe(true);
      });

      it("should apply frequency weights when includeWeights=true", () => {
        const vectorNoWeights = PlayerSimilarityUtils.buildSimplePlayerSimilarityVector(samplePlayerCareer, false);
        const vectorWithWeights = PlayerSimilarityUtils.buildSimplePlayerSimilarityVector(samplePlayerCareer, true);
        
        expect(vectorNoWeights.length).toBe(vectorWithWeights.length);
        
        // Some elements should be different (those with frequency weights applied)
        const hasDifferences = vectorNoWeights.some((val: number, idx: number) => 
          Math.abs(val - vectorWithWeights[idx]) > 0.001
        );
        expect(hasDifferences).toBe(true);
      });
    });

    describe("buildUnweightedPlayerSimilarityVectorFromFlat", () => {
      it("should build unweighted vector with default config", () => {
        const flatFields = PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const vector = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(flatFields);
        
        expect(vector).toBeInstanceOf(Array);
        expect(vector.length).toBeGreaterThan(15); // Should have more elements than just play styles
        expect(vector.every((val: number) => typeof val === 'number' && !isNaN(val))).toBe(true);
      });

      it("should exclude elements when weights are 'none'", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: 'none' as const, usageBonus: 'none' as const };
        const flatFields = PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const vectorDefault = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(flatFields);
        const vectorExcluded = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(flatFields, config);
        
        // Vector with exclusions should be shorter
        expect(vectorExcluded.length).toBeLessThan(vectorDefault.length);
      });

      it("should handle transition exclusion", () => {
        const configWithTransition = { ...DefaultSimilarityConfig, includeTransition: true };
        const configNoTransition = { ...DefaultSimilarityConfig, includeTransition: false };
        
        const flatFields = PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const vectorWith = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(flatFields, configWithTransition);
        const vectorWithout = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(flatFields, configNoTransition);
        
        // Transition should be at index 14 (last play style)
        expect(vectorWithout[14]).toBe(0);
        expect(vectorWith[14]).toBeGreaterThanOrEqual(0);
      });
    });

    describe("calculateZScores", () => {
      it("should calculate means and standard deviations", () => {
        const vectors = [
          [1, 2, 3],
          [2, 4, 6], 
          [3, 6, 9]
        ];
        
        const { means, stdDevs } = PlayerSimilarityUtils.calculateZScores(vectors);
        
        expect(means.length).toBe(3);
        expect(stdDevs.length).toBe(3);
        expect(means[0]).toBeCloseTo(2, 5); // (1+2+3)/3 = 2
        expect(means[1]).toBeCloseTo(4, 5); // (2+4+6)/3 = 4
        expect(stdDevs).toEqual(expect.arrayContaining([expect.any(Number)]));
        expect(stdDevs.every((std: number) => std > 0)).toBe(true);
      });

      it("should handle edge cases", () => {
        const { means: emptyMeans, stdDevs: emptyStdDevs } = PlayerSimilarityUtils.calculateZScores([]);
        expect(emptyMeans).toEqual([]);
        expect(emptyStdDevs).toEqual([]);
        
        // Single vector
        const { means, stdDevs } = PlayerSimilarityUtils.calculateZScores([[1, 2, 3]]);
        expect(means).toEqual([1, 2, 3]);
        expect(stdDevs).toEqual([0.0, 0.0, 0.0]); // Single data point has no standard deviation
      });
    });

    describe("calculateRateWeights", () => {
      it("should calculate style and FG rate weights", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: 'default' as const };
        const { styleRateWeights, fgRateWeights } = PlayerSimilarityUtils.calculateRateWeights(samplePlayerCareer, config);
        
        expect(styleRateWeights.length).toBe(15);
        expect(fgRateWeights.length).toBe(3);
        
        // Style weights should sum to styledScoringWeight (4.0), FG weights sum to fgWeight (4.0)
        const styleSum = styleRateWeights.reduce((sum: number, w: number) => sum + w, 0);
        const fgSum = fgRateWeights.reduce((sum: number, w: number) => sum + w, 0);
        
        expect(styleSum).toBeCloseTo(PlayerSimilarityUtils.styledScoringWeight, 5);
        expect(fgSum).toBeCloseTo(PlayerSimilarityUtils.fgWeight, 5);
      });

      it("should handle fgBonus = none", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: 'none' as const };
        const { fgRateWeights } = PlayerSimilarityUtils.calculateRateWeights(samplePlayerCareer, config);
        
        expect(fgRateWeights).toEqual([]);
      });
    });


    describe("findSimilarPlayers", () => {
      it("should find similar players from candidate list", async () => {
        // Create some test candidates
        const candidates = [
          createMockPlayer("Player 1"),
          createMockPlayer("Player 2"), 
          createMockPlayer("Player 3")
        ];
        
        const results = await PlayerSimilarityUtils.findSimilarPlayers(
          samplePlayerCareer,
          DefaultSimilarityConfig,
          candidates
        );
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeLessThanOrEqual(10); // Should return at most 10
        expect(results.length).toBeLessThanOrEqual(candidates.length);
        
        results.forEach(result => {
          expect(result).toHaveProperty('obj');
          expect(result).toHaveProperty('similarity');
          expect(result).toHaveProperty('diagnostics');
          expect(typeof result.similarity).toBe('number');
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
          expect(results[i].similarity).toBeGreaterThanOrEqual(results[i-1].similarity);
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
        expect(result.diagnostics.componentScores.scoringEfficiency).toBeDefined();
        expect(result.diagnostics.componentScores.defense).toBeDefined();
        expect(result.diagnostics.componentScores.playerInfo).toBeDefined();
        
        // Check that each component has the expected structure
        Object.values(result.diagnostics.componentScores).forEach(component => {
          expect(typeof component.weightedZScoreSum).toBe('number');
          expect(typeof component.totalWeight).toBe('number');
          expect(Array.isArray(component.statBreakdown)).toBe(true);
          
          // Check stat breakdown structure
          component.statBreakdown.forEach(stat => {
            expect(typeof stat.name).toBe('string');
            expect(typeof stat.zScore).toBe('number');
            expect(typeof stat.weight).toBe('number');
            expect(typeof stat.weightedAbsoluteZScore).toBe('number');
            expect(typeof stat.globalStdDev).toBe('number');
          });
        });
        
        // Check total similarity
        expect(typeof result.diagnostics.totalSimilarity).toBe('number');
        expect(Number.isFinite(result.diagnostics.totalSimilarity)).toBe(true);
        
        // Check z-score statistics
        expect(result.diagnostics.zScoreStats).toBeDefined();
        expect(Array.isArray(result.diagnostics.zScoreStats.means)).toBe(true);
        expect(Array.isArray(result.diagnostics.zScoreStats.stdDevs)).toBe(true);
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
          "roster.height.keyword": ["6-0"]
        };

        const vector = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
          flatFields,
          DefaultSimilarityConfig
        );

        expect(Array.isArray(vector)).toBe(true);
        expect(vector.length).toBeGreaterThan(0);
        expect(vector.every((val: number) => typeof val === 'number')).toBe(true);
      });

      it("should convert nested player to flat fields format", () => {
        const flatFields = PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        
        expect(typeof flatFields).toBe('object');
        expect(Object.keys(flatFields).length).toBeGreaterThan(0);
        
        // Check that style fields are present
        const styleKeys = Object.keys(flatFields).filter(key => key.startsWith('style.'));
        expect(styleKeys.length).toBeGreaterThan(0);
        
        // Check that values are arrays
        Object.values(flatFields).forEach(value => {
          expect(Array.isArray(value)).toBe(true);
          expect(value.length).toBeGreaterThan(0);
        });
      });

      it("should work consistently with round-trip conversion", () => {        
        // Convert to flat format and back
        const flatFields = PlayerSimilarityUtils.playerToFlatFields(samplePlayerCareer);
        const vector1 = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
          flatFields,
          DefaultSimilarityConfig
        );
        
        // Do it again to ensure consistency
        const vector2 = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
          flatFields,
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
      const result = PlayerSimilarityUtils.parseCustomWeights("Attack & Kick: 2.0");
      expect(result).toEqual({ "Attack & Kick": 2.0 });
    });

    it("should parse multiple weights correctly", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights("Attack & Kick: 2.0, Rim Attack: 3.0");
      expect(result).toEqual({ 
        "Attack & Kick": 2.0,
        "Rim Attack": 3.0 
      });
    });

    it("should handle whitespace around values", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights("Attack & Kick:  2.0 , Rim Attack :3.0");
      expect(result).toEqual({ 
        "Attack & Kick": 2.0,
        "Rim Attack": 3.0 
      });
    });

    it("should handle decimal values", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights("Test: 1.5, Another: 0.75");
      expect(result).toEqual({ 
        "Test": 1.5,
        "Another": 0.75 
      });
    });

    it("should skip invalid pairs without colons", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights("Valid: 2.0, Invalid, Another: 3.0");
      expect(result).toEqual({ 
        "Valid": 2.0,
        "Another": 3.0 
      });
    });

    it("should skip pairs with invalid numbers", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights("Valid: 2.0, Invalid: abc, Another: 3.0");
      expect(result).toEqual({ 
        "Valid": 2.0,
        "Another": 3.0 
      });
    });

    it("should handle empty keys or values", () => {
      const result = PlayerSimilarityUtils.parseCustomWeights(": 2.0, Valid: 3.0, Empty:");
      expect(result).toEqual({ 
        "Valid": 3.0
      });
    });
  });
});
