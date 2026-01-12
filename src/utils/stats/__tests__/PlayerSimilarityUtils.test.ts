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

  describe("buildPlayerSimilarityVector", () => {
    describe("without weights (includeWeights=false)", () => {
      it("should return a vector with consistent length", () => {
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false
        );
        
        // Expected length with default config: 15 play styles + 4 additional + 15 scoring + 3 FG + 1 gravity + 1 usage + 4 defense + 3 player info = 46 elements
        expect(vector.length).toBe(46);
        expect(vector).toBeInstanceOf(Array);
        expect(vector.every((val: number) => typeof val === 'number')).toBe(true);
      });

      it("should handle missing style data gracefully", () => {
        const emptyPlayer: IndivCareerStatSet = {} as IndivCareerStatSet;
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          emptyPlayer, 
          false
        );
        
        expect(vector.length).toBe(46);
        expect(vector.every((val: number) => typeof val === 'number' && !isNaN(val))).toBe(true);
      });

      it("should extract play style values correctly", () => {
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false
        );
        
        // First 15 elements should be play style possPctUsg values
        const playStyleSection = vector.slice(0, 15);
        expect(playStyleSection.every((val: number) => val >= 0)).toBe(true);
        expect(playStyleSection.some((val: number) => val > 0)).toBe(true); // should have some non-zero values
      });

      it("should exclude transition when includeTransition is false", () => {
        const config: SimilarityConfig = {
          ...DefaultSimilarityConfig,
          includeTransition: false
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false, 
          config
        );
        
        // Transition should be at index 14 (last play style) and should be 0
        expect(vector[14]).toBe(0);
      });

      it("should include transition when includeTransition is true", () => {
        const config: SimilarityConfig = {
          ...DefaultSimilarityConfig,
          includeTransition: true
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false, 
          config
        );
        
        // If sample player has transition data, it should be > 0
        if (samplePlayer.style?.["Transition"]?.possPctUsg?.value) {
          expect(vector[0]).toBeGreaterThan(0);
        }
      });
    });

    describe("with weights (includeWeights=true)", () => {
      it("should apply dynamic range weights", () => {
        const vectorNoWeights = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false
        );
        
        const vectorWithWeights = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          true
        );
        
        expect(vectorWithWeights.length).toBe(vectorNoWeights.length);
        
        // Values should generally be different (smaller due to normalization)
        const nonZeroIndices = vectorNoWeights
          .map((val: number, idx: number) => ({ val, idx }))
          .filter(({ val }: { val: number }) => val > 0)
          .map(({ idx }: { idx: number }) => idx);
          
        if (nonZeroIndices.length > 0) {
          const hasChanges = nonZeroIndices.some((idx: number) => 
            Math.abs(vectorWithWeights[idx] - vectorNoWeights[idx]) > 0.001
          );
          expect(hasChanges).toBe(true);
        }
      });

      it("should apply component weights correctly", () => {
        const configZeroPlayStyle: SimilarityConfig = {
          ...DefaultSimilarityConfig,
          playStyleWeight: 0
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          true, 
          configZeroPlayStyle
        );
        
        // First 15 elements (play style section) should be zero or very close
        const playStyleSection = vector.slice(0, 15);
        expect(playStyleSection.every((val: number) => Math.abs(val) < 0.001)).toBe(true);
      });

      it("should apply dropdown weights", () => {
        const configNoneWeighting: SimilarityConfig = {
          ...DefaultSimilarityConfig,
          assistWeighting: 'none',
          turnoverWeighting: 'none',
          offensiveReboundWeighting: 'none',
          freeThrowWeighting: 'none'
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          true, 
          configNoneWeighting
        );
        
        // Play style section (0-14) should still have values, but additional stats should be excluded
        const playStyleSection = vector.slice(0, 15);
        expect(playStyleSection.some((val: number) => val > 0)).toBe(true); // Should have some values
        
        // Additional play style stats should be excluded when weights are 'none'
        // The vector should be shorter since those elements aren't added
        expect(vector.length).toBeLessThan(46); // Should be shorter than default config
      });
    });

    describe("scoring modes", () => {
      it("should handle sos-adjusted scoring mode", () => {
        const config: SimilarityConfig = {
          ...DefaultSimilarityConfig,
          scoringMode: 'sos-adjusted'
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false, 
          config
        );
        
        expect(vector.length).toBe(46);
        // Should use adj_pts values from style data
      });

      it("should handle raw scoring mode", () => {
        const config: SimilarityConfig = {
          ...DefaultSimilarityConfig,
          scoringMode: 'raw'
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false, 
          config
        );
        
        expect(vector.length).toBe(46);
        // Should use pts values from style data
      });

      it("should handle relative scoring mode", () => {
        const config: SimilarityConfig = {
          ...DefaultSimilarityConfig,
          scoringMode: 'relative'
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          samplePlayer, 
          false, 
          config
        );
        
        expect(vector.length).toBe(46);
        // Values should be normalized relative to weighted average
      });
    });

    describe("defensive skill modes", () => {
      it("should handle different defensive skill settings", () => {
        const modes: Array<SimilarityConfig['defensiveSkill']> = [
          'sos-adjusted', 'raw', 'relative', 'none'
        ];
        
        modes.forEach(mode => {
          const config: SimilarityConfig = {
            ...DefaultSimilarityConfig,
            defensiveSkill: mode
          };
          
          const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
            samplePlayer, 
            false, 
            config
          );
          
          if (mode === 'none') {
            // Vector should be shorter when defensive skill is excluded
            expect(vector.length).toBe(45);
          } else {
            expect(vector.length).toBe(46);
          }
        });
      });
    });

    describe("edge cases", () => {
      it("should handle player with no roster info", () => {
        const playerNoRoster: any = {
          ...samplePlayer,
          roster: undefined
        };
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          playerNoRoster, 
          false
        );
        
        expect(vector.length).toBe(46);
        expect(vector.every((val: number) => typeof val === 'number' && !isNaN(val))).toBe(true);
      });

      it("should handle player with missing statistical fields", () => {
        const playerMissingStats: IndivCareerStatSet = {
          style: {},
          roster: { year_class: "Sr", height: "6-4" }
        } as IndivCareerStatSet;
        
        const vector = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          playerMissingStats, 
          false
        );
        
        expect(vector.length).toBe(46);
        expect(vector.every((val: number) => typeof val === 'number' && !isNaN(val))).toBe(true);
      });
    });

    describe("helper functions", () => {
      it("should parse height strings correctly", () => {
        // Test via the actual vector building since parseHeight is private
        const playerTall: any = {
          ...samplePlayer,
          roster: { year_class: "Jr", height: "7-1" }
        };
        
        const playerShort: any = {
          ...samplePlayer,
          roster: { year_class: "Jr", height: "5-9" }
        };
        
        const vectorTall = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          playerTall, 
          false
        );
        const vectorShort = PlayerSimilarityUtils.buildPlayerSimilarityVector(
          playerShort, 
          false
        );
        
        // Since vector indices are variable, test that vectors are different (height should affect outcome)
        // Both vectors should have same length with default config
        expect(vectorTall.length).toBe(vectorShort.length);
        
        // At least one element should be different (height-related)
        const hasDifference = vectorTall.some((val: number, idx: number) => 
          Math.abs(val - vectorShort[idx]) > 0.001
        );
        expect(hasDifference).toBe(true);
      });

      it("should parse player class correctly", () => {
        const classes = ["Fr", "SO", "Jr", "Sr"];
        const vectors = classes.map(yearClass => {
          const player: any = {
            ...samplePlayer,
            roster: { year_class: yearClass, height: "6-2" }
          };
          return PlayerSimilarityUtils.buildPlayerSimilarityVector(player, false);
        });
        
        // Class values should be in ascending order (Fr < So < Jr < Sr)
        // Class is at index 38
        for (let i = 1; i < vectors.length; i++) {
          expect(vectors[i][38]).toBeGreaterThanOrEqual(vectors[i-1][38]);
        }
      });
    });
  });

  describe("constants", () => {
    it("should have consistent dynamic range weights", () => {
      const weights = PlayerSimilarityUtils.dynamicRangeWeights;
      
      expect(weights.playStyle).toBeGreaterThan(0);
      expect(weights.scoringEfficiency).toBeGreaterThan(0);
      expect(weights.fgPercentage).toBeGreaterThan(0);
      expect(weights.rapm).toBeGreaterThan(0);
      expect(weights.perPossession).toBeGreaterThan(0);
      expect(weights.playerClass).toBeGreaterThan(0);
      expect(weights.height).toBeGreaterThan(0);
      expect(weights.minutes).toBeGreaterThan(0);
    });

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
    });
  });
});
