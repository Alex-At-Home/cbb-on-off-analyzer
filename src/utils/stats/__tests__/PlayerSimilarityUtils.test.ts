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

    describe("buildUnweightedPlayerSimilarityVector", () => {
      it("should build unweighted vector with default config", () => {
        const vector = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVector(samplePlayerCareer);
        
        expect(vector).toBeInstanceOf(Array);
        expect(vector.length).toBeGreaterThan(15); // Should have more elements than just play styles
        expect(vector.every((val: number) => typeof val === 'number' && !isNaN(val))).toBe(true);
      });

      it("should exclude elements when weights are 'none'", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: 'none' as const, usageBonus: 'none' as const };
        const vectorDefault = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVector(samplePlayerCareer);
        const vectorExcluded = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVector(samplePlayerCareer, config);
        
        // Vector with exclusions should be shorter
        expect(vectorExcluded.length).toBeLessThan(vectorDefault.length);
      });

      it("should handle transition exclusion", () => {
        const configWithTransition = { ...DefaultSimilarityConfig, includeTransition: true };
        const configNoTransition = { ...DefaultSimilarityConfig, includeTransition: false };
        
        const vectorWith = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVector(samplePlayerCareer, configWithTransition);
        const vectorWithout = PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVector(samplePlayerCareer, configNoTransition);
        
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
        expect(stdDevs).toEqual([1.0, 1.0, 1.0]); // Should avoid division by zero
      });
    });

    describe("calculateRateWeights", () => {
      it("should calculate style and FG rate weights", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: 'default' as const };
        const { styleRateWeights, fgRateWeights } = PlayerSimilarityUtils.calculateRateWeights(samplePlayerCareer, config);
        
        expect(styleRateWeights.length).toBe(15);
        expect(fgRateWeights.length).toBe(3);
        
        // All weights should sum to 1 (approximately)
        const styleSum = styleRateWeights.reduce((sum: number, w: number) => sum + w, 0);
        const fgSum = fgRateWeights.reduce((sum: number, w: number) => sum + w, 0);
        
        expect(styleSum).toBeCloseTo(1, 5);
        expect(fgSum).toBeCloseTo(1, 5);
      });

      it("should handle fgBonus = none", () => {
        const config = { ...DefaultSimilarityConfig, fgBonus: 'none' as const };
        const { fgRateWeights } = PlayerSimilarityUtils.calculateRateWeights(samplePlayerCareer, config);
        
        expect(fgRateWeights).toEqual([]);
      });
    });

    describe("calculatePlayerSimilarityScore", () => {
      it("should calculate similarity score between players", () => {
        const sourceVector = [1, 2, 3, 4, 5];
        const candidateVector = [1.1, 2.1, 3.1, 4.1, 5.1];
        const zScoreStats = {
          means: [1, 2, 3, 4, 5],
          stdDevs: [0.1, 0.1, 0.1, 0.1, 0.1]
        };
        const rateWeights = {
          styleRateWeights: [0.2, 0.2, 0.2, 0.2, 0.2],
          fgRateWeights: []
        };
        
        const score = PlayerSimilarityUtils.calculatePlayerSimilarityScore(
          sourceVector,
          candidateVector,
          zScoreStats,
          rateWeights,
          DefaultSimilarityConfig
        );
        
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThan(0);
        expect(Number.isFinite(score)).toBe(true);
      });

      it("should handle identical players", () => {
        const identicalVector = [1, 2, 3, 4, 5];
        const zScoreStats = {
          means: [1, 2, 3, 4, 5],
          stdDevs: [0.1, 0.1, 0.1, 0.1, 0.1]
        };
        const rateWeights = {
          styleRateWeights: [0.2, 0.2, 0.2, 0.2, 0.2],
          fgRateWeights: []
        };
        
        const score = PlayerSimilarityUtils.calculatePlayerSimilarityScore(
          identicalVector,
          identicalVector,
          zScoreStats,
          rateWeights,
          DefaultSimilarityConfig
        );
        
        expect(score).toBe(0); // Identical players should have 0 difference
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
          expect(result).toHaveProperty('player');
          expect(result).toHaveProperty('similarity');
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

      it("should provide diagnostic information when requested", async () => {
        const mockCandidates = [createMockPlayer("Test Player")];
        
        const results = await PlayerSimilarityUtils.findSimilarPlayers(
          samplePlayerCareer,
          DefaultSimilarityConfig,
          mockCandidates,
          true // Include diagnostics
        );

        expect(results).toHaveLength(1);
        const result = results[0];
        
        // Should include diagnostics
        expect(result.diagnostics).toBeDefined();
        
        if (result.diagnostics) {
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
            });
          });
          
          // Check total similarity
          expect(typeof result.diagnostics.totalSimilarity).toBe('number');
          expect(Number.isFinite(result.diagnostics.totalSimilarity)).toBe(true);
        }
      });
    });
  });
});
