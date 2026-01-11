import { PlayerSimilarityUtils } from "../PlayerSimilarityUtils";
import { SimilarityConfig, DefaultSimilarityConfig } from "../../FilterModels";
import { IndivCareerStatSet } from "../../StatModels";
import samplePlayerCareer from "../../../sample-data/samplePlayerCareer";

describe("PlayerSimilarityUtils", () => {
  // Extract a sample player from the sample data
  const getSamplePlayer = (): IndivCareerStatSet => {
    const playerHits = samplePlayerCareer.responses[0]?.hits?.hits;
    if (playerHits && playerHits.length > 0) {
      return playerHits[0]._source as unknown as IndivCareerStatSet;
    }
    
    // Fallback minimal player for testing
    return {
      style: {
        "Transition": {
          possPct: { value: 0.15 },
          pts: { value: 1.2 },
          adj_pts: { value: 1.3 },
          possPctUsg: { value: 0.08 }
        },
        "Post-Up": {
          possPct: { value: 0.12 },
          pts: { value: 0.9 },
          adj_pts: { value: 1.0 },
          possPctUsg: { value: 0.06 }
        }
      },
      off_3p: { value: 0.35 },
      off_2pmid: { value: 0.42 },
      off_2prim: { value: 0.58 },
      off_adj_rapm: { value: 2.5 },
      off_adj_rtg: { value: 1.8 },
      def_adj_rapm: { value: -1.2 },
      def_stl: { value: 0.02 },
      def_blk: { value: 0.015 },
      def_foul: { value: 0.045 },
      def_orb: { value: 0.08 },
      off_team_poss_pct: { value: 0.25 },
      roster: {
        year_class: "Jr",
        height: "6-2"
      }
    } as unknown as IndivCareerStatSet;
  };

  const samplePlayer = getSamplePlayer();

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
});
