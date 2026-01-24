import { IndivCareerStatSet, Statistic } from "../StatModels";
import {
  PlayTypeUtils,
  TopLevelIndivPlayAnalysis,
  TopLevelIndivPlayType,
} from "./PlayTypeUtils";
import { SimilarityConfig, DefaultSimilarityConfig } from "../FilterModels";
import { ConferenceStrength } from "../public-data/ConferenceInfo";

// Lodash:
import _ from "lodash";

/** Diagnostic information for similarity calculation */
export interface SimilarityDiagnostics {
  componentScores: {
    playStyle: ComponentScore;
    scoringEfficiency: ComponentScore;
    defense: ComponentScore;
    playerInfo: ComponentScore;
  };
  totalSimilarity: number;
  zScoreStats: { means: number[]; stdDevs: number[] };
}

export interface ComponentScore {
  weightedZScoreSum: number;
  totalWeight: number;
  statBreakdown: StatBreakdown[];
}

export interface StatBreakdown {
  name: string;
  zScore: number;
  weight: number;
  weightedAbsoluteZScore: number;
  globalStdDev: number; // Global standard deviation for this stat
}

/** A repo of useful constants and methods for use in determining player similarity */
export class PlayerSimilarityUtils {
  static readonly zScoreBound = 2.5;

  static readonly firstPassPlayersRetrieved = 500;

  // SUMMARY OF OVERALL APPROACH

  // 1] Fetch the top $firstPassPlayersRetrieved based on the existing scoring in playerSimilarityQueryTemplate / buildSimplePlayerSimilarityVector
  // (we will make a few minor changes to that eventually, but for now it's fine as is)

  // 2] For each returned player (and the source player) we calculate the _unweighted_ input vector
  // (note unweighted also means for the "FG" / "ppp" values where we currently multiply by the rates ... that weighting will now be added later)

  // 3] For each index of the vector we calculate the z-score over the returned players

  // 4] To calculate the score for a given player vs "source player", do the following:
  // - calculate the diff between the unweighted input vectors
  // - divide each index diffs by the corresponding z-score, with bounds of [-3,3]
  // - then apply the weights derived from the config AND the FG/ppp rate-weightings
  // (the way we'll do the FG/ppp rate-weightings is: for each item in the style ppp OR the 2p-rim/2p-mid/3p we calc its
  //  weight as the square root of the rate divided by the sum of the square roots

  // IMPROVEMENTS:
  // add pins and "x"s
  // Add manual player
  // ^WIP, UI is in but not working yet .. added some TODOs plus need to support the Y+1
  // Add a filter for the comps (plus a "pinned only" filter)
  // Cache "top 500" players so don't need to rerun expensive
  // SoS-adjust FG% somehow (mainly rim?)
  // Add tooltips to all the dropdowns
  // Class - "has to match" / "upper/under-match" / (existing)
  // Player - similar opposition?
  // Calculate rate weights per player and average
  // (Diff mode - list players outside of style, also have option ("Diff" mode, default enabled) to only show style/shots for source player)
  // (Grade config bar - replace super ugly x with icon)

  // IDEAS I'm not sure about
  // SoS: apply to FG%s
  // Transition: 3 options: absolute / relative / none (default none? or relative? bit worried relative just won't work)
  // Move usage to style (done but need to change layout)
  // Style: Should merge stylistic-mid-range with pure mid-rate?
  // (idea: have a slider that weights up the "basic" fields)
  // (idea: should the sliders be exponential multipliers, eg x5 instead of 100%)
  // Maybe also have a FT% element (weighted by FTR, and maybe down)?
  // Maybe also (option SoS-adjusted) ORtg bonus? (or an offensive / defensive caliber that pins to RAPM?)

  ///////////////////////////////////////

  static readonly simpleSummaryText = (config: SimilarityConfig): string => {
    const keyElements = ([] as string[])
      .concat(!config.includeTransition ? ["Ignore transition"] : [])
      .concat(_.trim(config.customWeights) ? ["Custom weights"] : [])
      .concat(_.trim(config.advancedQuery) ? ["Advanced query"] : [])
      .concat(
        _.thru(config.levelOfPlay, (level) => {
          switch (level) {
            case "same_tier":
              return ["Similar level"];
            case "same_conf":
              return ["Same conf"];
            case "similar_sos":
              return ["Similar SoS"];
            default:
              return [];
          }
        })
      )
      .concat(
        _.thru(config.classWeighting, (classMatch) => {
          switch (classMatch) {
            case "same_class":
              return ["Same class"];
            case "fr_only":
              return ["Fr only"];
            case "under":
              return ["Fr/So only"];
            case "upper":
              return ["Jr/Sr only"];
            default:
              return [];
          }
        })
      );
    return keyElements.join("; ");
  };

  ///////////////////////////////////////

  // Speed up query performance by not running on players highly unlikely to match

  /** (if we switched to vector search we wouldn't need this any more?) */
  static readonly queryByPosition: Record<string, string[]> = {
    PG: ["PG", "s-PG", "CG", "G?"],
    "s-PG": ["PG", "s-PG", "CG", "G?"],
    CG: ["PG", "s-PG", "CG", "WG", "G?"],
    WG: ["CG", "WG", "WF", "G?", "F/C?"],
    WF: ["WG", "WF", "S-PF", "PF/C", "G?", "F/C?"],
    "S-PF": ["WF", "S-PF", "PF/C", "C", "F/C?"],
    "PF/C": ["WF", "S-PF", "PF/C", "C", "F/C?"],
    C: ["S-PF", "PF/C", "C", "F/C?"],
    "G?": ["PG", "s-PG", "CG", "WG", "WF", "G?", "F/C?"],
    "F/C?": ["WG", "WF", "S-PF", "PF/C", "C", "G?", "F/C?"],
  };

  ///////////////////////////////////////

  static readonly allStyles = PlayTypeUtils.topLevelIndivPlayTypes;

  static readonly lowFreqStyles: TopLevelIndivPlayType[] = [
    "Pick & Pop",
    "High-Low",
    "Backdoor Cut",
    "Hits Cutter",
    "PnR Passer",
    // "Inside Out" omitted here because it's not in `styles` list above
  ];
  static readonly lowFreqStylesSet = new Set(
    PlayerSimilarityUtils.lowFreqStyles
  );
  static readonly lowFreqStylesWeight = 3.0;
  static readonly medFreqStyles: TopLevelIndivPlayType[] = [
    "Put-Back",
    "Post-Up",
    "Big Cut & Roll",
    "Mid-Range",
    "Dribble Jumper",
    "Perimeter Sniper",
    "Attack & Kick",
  ];
  static readonly medFreqStylesSet = new Set(
    PlayerSimilarityUtils.medFreqStyles
  );
  static readonly medFreqStylesWeight = 1.5;

  /** Scoring has fewer elements in the vector but is important so we'll emphasis it more */
  static readonly styledScoringWeight = 4.0;

  /** Scoring has fewer elements in the vector but is important so we'll emphasis it more */
  static readonly fgWeight = 5.0;

  /** The total weight across all styles */
  static readonly styleFrequencyWeight = 6;

  // STEP 1: SIMPLE QUERY VECTOR

  /** For use with playerSimilarityQueryTemplate - has to stay in sync */
  static readonly buildSimplePlayerSimilarityVector = (
    player: IndivCareerStatSet,
    includeWeights: boolean = false
  ): number[] => {
    return PlayerSimilarityUtils.allStyles.map((pt) => {
      const raw = player.style?.[pt]?.possPctUsg?.value ?? 0;
      if (includeWeights) {
        if (PlayerSimilarityUtils.lowFreqStylesSet.has(pt))
          return raw * PlayerSimilarityUtils.lowFreqStylesWeight;
        if (PlayerSimilarityUtils.medFreqStylesSet.has(pt))
          return raw * PlayerSimilarityUtils.medFreqStylesWeight;
      }
      return raw;
    });
  };

  // STEP 2: RESCORING

  /** Build unweighted similarity vector from flat docvalue_fields format
   * (Note the order defined here needs to by synced in many other places if changed)
   */
  static readonly buildUnweightedPlayerSimilarityVectorFromFlat = (
    flatFields: Record<string, any[]>,
    config: SimilarityConfig = DefaultSimilarityConfig,
    isSourcePlayer?: boolean
  ): { vector: number[]; fieldMapping: Record<string, number> } => {
    const vector: number[] = [];
    const mutableFieldLookup: Record<string, number> = {};

    // Helper to get value from flat fields
    const getValue = (key: string): number => {
      const values = flatFields[key];
      return Array.isArray(values) && values.length > 0 ? values[0] : 0;
    };
    const appendToVec = (key: string, maybeTrans?: (n: number) => number) => {
      if (isSourcePlayer) mutableFieldLookup[key] = vector.length;
      const val = getValue(key);
      vector.push(maybeTrans ? maybeTrans(val) : val);
    };

    //TODO: always add fields to vector, just weight them to 0 later
    // (see transition as an example)

    // PLAY STYLE SECTION
    for (const pt of PlayerSimilarityUtils.allStyles) {
      const field = `style.${pt}.possPctUsg.value`;
      appendToVec(field);
    }

    // Additional play style stats (if weights are not 'none')
    const additionalStats = [
      { key: "off_assist.value", weight: config.assistWeighting },
      { key: "off_to.value", weight: config.turnoverWeighting },
      { key: "off_orb.value", weight: config.offensiveReboundWeighting },
      { key: "off_ftr.value", weight: config.freeThrowWeighting }, //(this is included twice, but not a big deal)
    ];

    for (const stat of additionalStats) {
      if (stat.weight !== "none") {
        appendToVec(stat.key);
      }
    }
    // USAGE BONUS
    if (config.usageBonus !== "none") {
      appendToVec("off_usage.value");
    }

    // SCORING EFFICIENCY SECTION
    for (const pt of PlayerSimilarityUtils.allStyles) {
      switch (config.scoringMode) {
        case "sos-adjusted":
          appendToVec(`style.${pt}.adj_pts.value`);
          break;
        case "raw":
          appendToVec(`style.${pt}.pts.value`);
          break;
        case "relative":
          appendToVec(`style.${pt}.pts.value`);
          break;
      }
    }

    // FG BONUS SECTION
    if (config.fgBonus !== "none") {
      appendToVec("off_3p.value");
      appendToVec("off_2pmid.value");
      appendToVec("off_2prim.value");
      appendToVec("off_ft.value");
    }

    // OFFENSIVE GRAVITY BONUS
    if (config.offensiveGravityBonus !== "none") {
      const offAdjRapm = getValue("off_adj_rapm.value");
      const offAdjRtg = getValue("off_adj_rtg.value");
      vector.push(offAdjRapm - offAdjRtg); //(no field, so no appendToVec)
    }

    // DEFENSE SECTION
    if (config.defensiveSkill !== "none") {
      switch (config.defensiveSkill) {
        case "sos-adjusted":
          appendToVec("def_adj_rapm.value");
          break;
        case "raw":
          appendToVec("def_rtg.value", (n) => -n + 1.0);
          break;
        case "relative":
          const defRapm = getValue("def_adj_rapm.value");
          const onDefPpp = getValue("on.def_adj_ppp.value");
          const relativeDefensiveSkill = defRapm - 0.2 * (onDefPpp - 1.0);
          vector.push(relativeDefensiveSkill); //(no direct field)
          break;
      }
    }

    if (config.stocksWeighting !== "none") {
      appendToVec("def_to.value");
      appendToVec("def_2prim.value");
    }

    if (config.foulsWeighting !== "none") {
      appendToVec("def_ftr.value", (n) => n * 50);
    }

    if (config.defensiveReboundWeighting !== "none") {
      appendToVec("def_orb.value");
    }

    // PLAYER INFO SECTION
    if (config.classWeighting !== "none") {
      const yearClassValue = flatFields["roster.year_class.keyword"]?.[0];
      const yearClass =
        typeof yearClassValue === "string" ? yearClassValue : "";
      vector.push(PlayerSimilarityUtils.parsePlayerClass(yearClass));
    }

    if (config.heightWeighting !== "none") {
      const heightValue = flatFields["roster.height.keyword"]?.[0];
      const height = typeof heightValue === "string" ? heightValue : "";
      vector.push(PlayerSimilarityUtils.parseHeight(height));
    }

    if (config.minutesWeighting !== "none") {
      appendToVec("off_team_poss_pct.value");
    }

    // We finally append some rate stats we don't use in scorig but do use to get some fields we want:
    appendToVec("off_3pr.value");
    appendToVec("off_2pmidr.value");
    appendToVec("off_2primr.value");
    appendToVec("off_ftr.value", (n) => n * 0.5); //(pair of FTs == one shot, note this field is included twice)

    return { vector, fieldMapping: mutableFieldLookup };
  };

  static readonly gradeBonusMultiplier = (x: number): number => {
    if (x <= 0.75) {
      return 1.0;
    } else if (x <= 0.8) {
      // Linear from 1.0 to 1.25 over 0.75 to 0.8
      return 1.0 + 5 * (x - 0.75);
    } else if (x <= 0.85) {
      // Linear from 1.25 to 1.5 over 0.8 to 0.85
      return 1.25 + 5 * (x - 0.8);
    } else if (x <= 0.95) {
      // Linear from 1.5 to 2.0 over 0.85 to 0.95
      return 1.5 + 5 * (x - 0.85);
    } else if (x <= 0.98) {
      // Linear from 2.0 to 3.0 over 0.95 to 0.98
      return 2.0 + (100 / 3) * (x - 0.95);
    } else {
      return 3.0;
    }
  };
  /** Convert nested player object to flat docvalue_fields format */
  static readonly playerToFlatFields = (
    player: IndivCareerStatSet,
    grades?: TopLevelIndivPlayAnalysis
  ): { flat: Record<string, any[]>; gradeBonus: Record<string, number> } => {
    const fields: Record<string, any[]> = {};
    const gradeBonus: Record<string, number> = {};

    // Helper to set field value
    const setField = (key: string, value: any) => {
      if (value !== undefined && value !== null) {
        // For nested stat objects, extract the value
        if (typeof value === "object" && value.value !== undefined) {
          fields[key] = [value.value];
        } else if (typeof value === "number") {
          fields[key] = [value];
        } else if (typeof value === "string") {
          fields[key] = [value];
        }
      }
    };

    // Play style fields
    for (const pt of PlayerSimilarityUtils.allStyles) {
      const style = player.style?.[pt];
      if (style) {
        setField(`style.${pt}.possPctUsg.value`, style.possPctUsg);
        setField(`style.${pt}.possPct.value`, style.possPct);
        setField(`style.${pt}.adj_pts.value`, style.adj_pts);
        setField(`style.${pt}.pts.value`, style.pts);
      }
      if (grades) {
        const styleGrade = grades[pt]?.possPct;
        if (styleGrade) {
          const bonus = PlayerSimilarityUtils.gradeBonusMultiplier(
            styleGrade.value || 0
          );
          if (bonus > 1.0) {
            gradeBonus[`style.${pt}.possPctUsg.value`] = bonus;
          }
        }
      }
    }

    // Additional stats
    setField("off_assist.value", player.off_assist);
    setField("off_to.value", player.off_to);
    setField("off_orb.value", player.off_orb);
    setField("off_ft.value", player.off_ft);
    setField("off_ftr.value", player.off_ftr);
    setField("off_3p.value", player.off_3p);
    setField("off_3pr.value", player.off_3pr);
    setField("off_2pmid.value", player.off_2pmid);
    setField("off_2pmidr.value", player.off_2pmidr);
    setField("off_2prim.value", player.off_2prim);
    setField("off_2primr.value", player.off_2primr);
    setField("off_adj_rapm.value", player.off_adj_rapm);
    setField("off_adj_rtg.value", player.off_adj_rtg);
    setField("off_usage.value", player.off_usage);
    setField("off_team_poss_pct.value", player.off_team_poss_pct);
    setField("def_adj_rapm.value", player.def_adj_rapm);
    setField("def_rtg.value", player.def_rtg);
    setField("def_to.value", player.def_to); //(stl)
    setField("def_2prim.value", player.def_2prim); //(blk)
    setField("def_ftr.value", player.def_ftr); //(fc/50)
    setField("def_orb.value", player.def_orb);
    setField("on.def_adj_ppp.value", player.on?.def_adj_ppp);

    // Player info (use .keyword suffix for text fields)
    if (player.roster?.year_class) {
      fields["roster.year_class.keyword"] = [player.roster.year_class];
    }
    if (player.roster?.height) {
      fields["roster.height.keyword"] = [player.roster.height];
    }

    return { flat: fields, gradeBonus };
  };

  /** Convert raw scoring values to relative mode if needed */
  static readonly convertToRelativeScoring = (
    vectors: number[][],
    config: SimilarityConfig
  ): number[][] => {
    if (config.scoringMode !== "relative") {
      return vectors; // No conversion needed
    }

    // Find the scoring efficiency section indices
    let scoringStartIndex = PlayerSimilarityUtils.allStyles.length;

    // Add additional play style stats count
    const additionalStats = [
      config.assistWeighting,
      config.turnoverWeighting,
      config.offensiveReboundWeighting,
      config.freeThrowWeighting,
    ];
    scoringStartIndex += additionalStats.filter((w) => w !== "none").length;

    const scoringEndIndex =
      scoringStartIndex + PlayerSimilarityUtils.allStyles.length;

    // Convert each vector
    return vectors.map((vector) => {
      const newVector = [...vector];

      // Calculate weighted average for this player across all styles
      // We need to get the rates for this calculation
      let totalPts = 0;
      let totalWeight = 0;

      for (let i = 0; i < PlayerSimilarityUtils.allStyles.length; i++) {
        const pts = vector[scoringStartIndex + i];
        // We need the rate, but we don't have it in the unweighted vector
        // For now, use equal weighting - this could be improved
        const weight = 1.0 / PlayerSimilarityUtils.allStyles.length;
        totalPts += pts * weight;
        totalWeight += weight;
      }

      const averagePts = totalWeight > 0 ? totalPts / totalWeight : 1.0;

      // Convert each scoring value to relative
      for (let i = scoringStartIndex; i < scoringEndIndex; i++) {
        newVector[i] = averagePts > 0 ? vector[i] / averagePts : 0;
      }

      return newVector;
    });
  };

  /** Calculate z-scores for each index across all player vectors */
  static readonly calculateZScores = (
    vectors: number[][],
    adjustStyleZScores: boolean = false
  ): { means: number[]; stdDevs: number[] } => {
    if (vectors.length === 0) return { means: [], stdDevs: [] };

    const vectorLength = vectors[0].length;
    const means: number[] = [];
    const stdDevs: number[] = [];

    for (let i = 0; i < vectorLength; i++) {
      const values = vectors.map((v) => v[i] || 0);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length;
      const stdDev = Math.sqrt(variance);

      means.push(mean);
      stdDevs.push(stdDev);
    }

    // Special case for style:
    if (adjustStyleZScores) {
      const styleStdDevs = stdDevs.slice(
        0,
        PlayerSimilarityUtils.allStyles.length
      );
      const groupStyleSumVars = _.sumBy(styleStdDevs, (p) => p * p);
      const groupStyleNum = _.sumBy(styleStdDevs, (stdDev) =>
        stdDev > 0 ? 1 : 0
      );
      const groupStyleStdDev = Math.sqrt(
        groupStyleSumVars / (groupStyleNum || 1)
      );

      for (var i = 0; i < PlayerSimilarityUtils.allStyles.length; ++i) {
        if (stdDevs[i] > 0) {
          stdDevs[i] = 0.5 * stdDevs[i] + 0.5 * groupStyleStdDev;
        }
      }
    }

    return { means, stdDevs };
  };

  /** A version of calculateRateWeights that uses both source and comp player's rates to give a better weighting  */
  static readonly calculateRelativeRateWeights = (
    playerVector: number[],
    candidateVector: number[],
    fieldMapping: Record<string, number>,
    config: SimilarityConfig
  ): {
    styleScoreWeights: number[];
    styleRateWeights: number[];
    fgRateWeights: number[];
  } => {
    // 1] Adjust the weights so styles that occur more often get a bonus
    // IMPORTANT: (all these rely on the order from buildUnweightedPlayerSimilarityVectorFromFlat)

    const transitionExclusionIdx = config.includeTransition
      ? -1
      : fieldMapping[`style.Transition.possPctUsg.value`];
    const styleRateWeightsSource = _.take(
      playerVector,
      PlayerSimilarityUtils.allStyles.length
    );
    const rawStyleRateWeights = _.map(styleRateWeightsSource, (p, idx) =>
      idx == transitionExclusionIdx
        ? 0
        : Math.sqrt(Math.abs(p) + Math.abs(candidateVector[idx]))
    );
    const totalStyleRateWeights = rawStyleRateWeights.reduce((a, b) => a + b);
    const styleScoreWeights = _.map(
      rawStyleRateWeights,
      (p) => p / totalStyleRateWeights
    );

    // 2] Style rate weights (for scoring efficiency section)
    const attackAndKickIdx =
      fieldMapping[`style.Attack & Kick.possPctUsg.value`] || 0;
    const postAndKickIdx =
      fieldMapping[`style.Post & Kick.possPctUsg.value`] || 0;
    const hitsCutterIdx =
      fieldMapping[`style.Hits Cutter.possPctUsg.value`] || 0;
    const pnrPasserIdx = fieldMapping[`style.PnR Passer.possPctUsg.value`] || 0;

    const styleRates = _.range(0, PlayerSimilarityUtils.allStyles.length).map(
      (styleIdx) => {
        const baseRate =
          0.5 * playerVector[styleIdx] + 0.5 * candidateVector[styleIdx];
        if (styleIdx == attackAndKickIdx || styleIdx == postAndKickIdx) {
          return baseRate * 0.1; //(3P, very random what happens after the pass)
        } else if (styleIdx == hitsCutterIdx || styleIdx == pnrPasserIdx) {
          return baseRate * 0.5; //(2P, still some level of randomness what happens after the pass)
        } else {
          return baseRate;
        }
      }
    );
    const rateMuter = (n: number) => n; //(tried various fns here but linear ended up working best)
    const styleSum = styleRates.reduce((sum, rate) => sum + rateMuter(rate), 0);
    const styleRateWeights = styleRates.map(
      (rate) =>
        PlayerSimilarityUtils.styledScoringWeight *
        (styleSum > 0 ? rateMuter(rate) / styleSum : 1.0 / styleRates.length)
    );

    // 3] Find the scoring efficiency section indices

    const fgRates = _.thru(config.fgBonus !== "none", (calcFgBonus) => {
      if (calcFgBonus) {
        const startingIndex = fieldMapping["off_3pr.value"] || 0;
        if (startingIndex > 0) {
          return _.range(0, 4).map((idx) => {
            return (
              0.5 * playerVector[startingIndex + idx] +
              0.5 * candidateVector[startingIndex + idx]
            );
          });
        } else {
          return [];
        }
      } else {
        return [];
      }
    });
    const fgSum = fgRates.reduce((sum, rate) => sum + rateMuter(rate), 0);
    const fgRateWeights = fgRates.map(
      (rate) =>
        PlayerSimilarityUtils.fgWeight *
        (fgSum > 0 ? rateMuter(rate) / fgSum : 1.0 / fgRates.length)
    );

    return { styleScoreWeights, styleRateWeights, fgRateWeights };
  };

  /** Calculate rate weights */
  static readonly calculateRateWeights = (
    player: IndivCareerStatSet,
    config: SimilarityConfig
  ): { styleRateWeights: number[]; fgRateWeights: number[] } => {
    // Style rate weights (for scoring efficiency section)
    const styleRates = PlayerSimilarityUtils.allStyles.map((pt) => {
      const baseRate = player.style?.[pt]?.possPctUsg?.value ?? 0;
      if (pt == "Attack & Kick" || pt == "Post & Kick") {
        return baseRate * 0.1; //(3P, very random what happens after the pass)
      } else if (pt == "Hits Cutter" || pt == "PnR Passer") {
        return baseRate * 0.5; //(2P, still some level of randomness what happens after the pass)
      } else {
        return baseRate;
      }
    });
    const rateMuter = (n: number) => n; //(tried various fns here but linear ended up working best)
    const styleSum = styleRates.reduce((sum, rate) => sum + rateMuter(rate), 0);
    const styleRateWeights = styleRates.map(
      (rate) =>
        PlayerSimilarityUtils.styledScoringWeight *
        (styleSum > 0 ? rateMuter(rate) / styleSum : 1.0 / styleRates.length)
    );

    // FG rate weights (for FG bonus section)
    let fgRateWeights: number[] = [];
    if (config.fgBonus !== "none") {
      const fgRates = [
        player.off_3pr?.value ?? 0,
        player.off_2pmidr?.value ?? 0,
        player.off_2primr?.value ?? 0,
        0.5 * (player.off_ftr?.value ?? 0),
      ];

      const fgSum = fgRates.reduce((sum, rate) => sum + rateMuter(rate), 0);
      fgRateWeights = fgRates.map(
        (rate) =>
          PlayerSimilarityUtils.fgWeight *
          (fgSum > 0 ? rateMuter(rate) / fgSum : 1.0 / fgRates.length)
      );
    }

    return { styleRateWeights, fgRateWeights };
  };

  /** Calculate similarity score with diagnostic information */
  static readonly calculatePlayerSimilarityScore = (
    sourceVector: number[],
    candidateVector: number[],
    zScoreStats: { means: number[]; stdDevs: number[] },
    legacyRateWeights: { styleRateWeights: number[]; fgRateWeights: number[] },
    fieldMapping: Record<string, number>,
    config: SimilarityConfig,
    gradeBonus: number[]
  ): SimilarityDiagnostics => {
    if (sourceVector.length !== candidateVector.length) {
      //DEBUG
      //console.log(`Vector length mismatch`, sourceVector, candidateVector);
      throw new Error(
        `Vector length mismatch [${sourceVector.length}] [${candidateVector.length}]`
      );
    }

    const diagnostics: SimilarityDiagnostics = {
      componentScores: {
        playStyle: { weightedZScoreSum: 0, totalWeight: 0, statBreakdown: [] },
        scoringEfficiency: {
          weightedZScoreSum: 0,
          totalWeight: 0,
          statBreakdown: [],
        },
        defense: { weightedZScoreSum: 0, totalWeight: 0, statBreakdown: [] },
        playerInfo: { weightedZScoreSum: 0, totalWeight: 0, statBreakdown: [] },
      },
      totalSimilarity: 0,
      zScoreStats: zScoreStats,
    };

    let totalScore = 0;
    let totalWeight = 0;
    let vectorIndex = 0;

    const styleWeightOverrides = PlayerSimilarityUtils.parseCustomWeights(
      config.customWeights
    );

    const rateWeights = PlayerSimilarityUtils.calculateRelativeRateWeights(
      sourceVector,
      candidateVector,
      fieldMapping,
      config
    );
    // (DEBUGGING, for comparison)
    // rateWeights.styleRateWeights = legacyRateWeights.styleRateWeights;
    // rateWeights.fgRateWeights = legacyRateWeights.fgRateWeights;

    // Helper to process vector section with weights and track diagnostics
    const processSection = (
      length: number,
      componentWeight: number,
      componentName: keyof SimilarityDiagnostics["componentScores"],
      statNames: string[],
      dropdownWeight: number = 1.0,
      sectionRateWeights?: number[],
      stdDevConfig?: { minStdDev?: number }
    ) => {
      const component = diagnostics.componentScores[componentName];

      for (let i = 0; i < length; i++) {
        const effStdDev = Math.max(
          zScoreStats.stdDevs[vectorIndex],
          stdDevConfig?.minStdDev ?? 0
        );

        const diff = sourceVector[vectorIndex] - candidateVector[vectorIndex];
        const zScore =
          zScoreStats.stdDevs[vectorIndex] > 0 ? diff / effStdDev : 0;

        // Bound z-score to [-2.5, 2.5]
        const boundedZScore = Math.max(
          -PlayerSimilarityUtils.zScoreBound,
          Math.min(PlayerSimilarityUtils.zScoreBound, zScore)
        );

        const maybeCustomWeight: number | undefined =
          styleWeightOverrides[statNames[i]];
        const customMult =
          !_.isNil(maybeCustomWeight) && maybeCustomWeight < 0
            ? -maybeCustomWeight
            : 1.0;

        // Calculate weight
        let weight =
          componentWeight *
          dropdownWeight *
          gradeBonus[vectorIndex] *
          customMult;

        if (sectionRateWeights && i < sectionRateWeights.length) {
          weight *= sectionRateWeights[i];
        }
        // Override a weight if desired:
        if (!_.isNil(maybeCustomWeight) && maybeCustomWeight >= 0) {
          weight = maybeCustomWeight;
        }

        // Squared difference in z-score space
        // (not sure what this is measuring but the total it generates doesn't seem to be used anywhere)
        const scoreDiff = boundedZScore * boundedZScore;

        // Update totals
        totalScore += scoreDiff * weight;
        totalWeight += weight;

        // Update component diagnostics
        component.weightedZScoreSum += scoreDiff * weight;
        component.totalWeight += weight;

        // Add to stat breakdown if we have a name
        if (i < statNames.length) {
          component.statBreakdown.push({
            name: statNames[i],
            zScore: boundedZScore,
            weight: weight,
            weightedAbsoluteZScore: scoreDiff * weight,
            globalStdDev: effStdDev,
          });
        }

        vectorIndex++;
      }
    };

    // PLAY STYLE SECTION

    processSection(
      PlayerSimilarityUtils.allStyles.length,
      config.playStyleWeight,
      "playStyle",
      PlayerSimilarityUtils.allStyles,
      PlayerSimilarityUtils.styleFrequencyWeight *
        PlayerSimilarityUtils.dropdownWeights[config.playTypeWeights],
      rateWeights.styleScoreWeights
    );

    // Additional play style stats
    const additionalStats = [
      { weight: config.assistWeighting, name: "Assists", minStdDev: 0.03 },
      { weight: config.turnoverWeighting, name: "Turnovers" },
      { weight: config.offensiveReboundWeighting, name: "Off Rebounds" },
      { weight: config.freeThrowWeighting, name: "Free Throw Rate" },
    ];

    for (const stat of additionalStats) {
      if (stat.weight !== "none") {
        processSection(
          1,
          config.playStyleWeight,
          "playStyle",
          [stat.name],
          PlayerSimilarityUtils.dropdownWeights[stat.weight],
          undefined,
          { minStdDev: stat.minStdDev }
        );
      }
    }
    if (config.usageBonus !== "none") {
      processSection(
        1,
        config.playStyleWeight,
        "playStyle",
        ["Usage"],
        PlayerSimilarityUtils.dropdownWeights[config.usageBonus]
      );
    }

    // SCORING EFFICIENCY SECTION (with rate weights)
    processSection(
      PlayerSimilarityUtils.allStyles.length,
      config.scoringEfficiencyWeight,
      "scoringEfficiency",
      PlayerSimilarityUtils.allStyles.map((style) => `${style} Scoring`),
      PlayerSimilarityUtils.dropdownWeights[config.playTypeWeights],
      rateWeights.styleRateWeights
    );

    // FG BONUS SECTION
    if (config.fgBonus !== "none") {
      processSection(
        4,
        config.scoringEfficiencyWeight,
        "scoringEfficiency",
        ["3P%", "2P Mid%", "2P Rim%", "FT%"],
        PlayerSimilarityUtils.dropdownWeights[config.fgBonus],
        rateWeights.fgRateWeights
      );
    }

    // GRAVITY AND USAGE BONUSES
    if (config.offensiveGravityBonus !== "none") {
      processSection(
        1,
        config.scoringEfficiencyWeight,
        "scoringEfficiency",
        ["Offensive Gravity"],
        PlayerSimilarityUtils.dropdownWeights[config.offensiveGravityBonus]
      );
    }

    // DEFENSE SECTION
    const defenseStats = [
      {
        weight: config.defensiveSkill,
        dropdown: "default" as const,
        name: "Defensive Skill",
      },
      {
        weight: config.stocksWeighting,
        dropdown: config.stocksWeighting,
        name: "Steals",
        minStdDev: 0.01,
      },
      {
        weight: config.stocksWeighting,
        dropdown: config.stocksWeighting,
        name: "Blocks",
        minStdDev: 0.01,
      },
      {
        weight: config.foulsWeighting,
        dropdown: config.foulsWeighting,
        name: "Fouls",
      },
      {
        weight: config.defensiveReboundWeighting,
        dropdown: config.defensiveReboundWeighting,
        name: "Def Rebounds",
        minStdDev: 0.03,
      },
    ];

    for (const stat of defenseStats) {
      if (stat.weight !== "none") {
        processSection(
          1,
          config.defenseWeight,
          "defense",
          [stat.name],
          PlayerSimilarityUtils.dropdownWeights[stat.dropdown],
          undefined,
          { minStdDev: stat.minStdDev }
        );
      }
    }

    // PLAYER INFO SECTION
    const playerInfoStats = [
      { weight: config.classWeighting, name: "Class" },
      { weight: config.heightWeighting, name: "Height" },
      { weight: config.minutesWeighting, name: "Minutes" },
    ];

    for (const stat of playerInfoStats) {
      if (stat.weight !== "none") {
        // Handle class-specific weighting options
        let actualWeight: number;
        if (
          stat.name === "Class" &&
          ["same_class", "fr_only", "under", "upper"].includes(
            stat.weight as string
          )
        ) {
          // Class-specific options use "default" weight as per user requirements
          actualWeight = PlayerSimilarityUtils.dropdownWeights["default"];
        } else {
          // Standard weighting options
          actualWeight =
            PlayerSimilarityUtils.dropdownWeights[
              stat.weight as keyof typeof PlayerSimilarityUtils.dropdownWeights
            ];
        }

        processSection(
          1,
          config.playerInfoWeight,
          "playerInfo",
          [stat.name],
          actualWeight
        );

        //(there's some rate stats at the end which we will ignore, we only wanted wanted them for rates)
      }
    }

    // Sort stat breakdowns by weighted absolute z-score (descending)
    Object.values(diagnostics.componentScores).forEach((component) => {
      component.statBreakdown.sort(
        (a, b) => b.weightedAbsoluteZScore - a.weightedAbsoluteZScore
      );
    });

    // Calculate final similarity score (note I think this is nonsense, sum(diff^2)/weight, but doesn't seem to be used anywhere)
    diagnostics.totalSimilarity =
      totalWeight > 0 ? Math.sqrt(totalScore / totalWeight) : Infinity;

    return diagnostics;
  };

  /** Shared logic for both the original scoring on the large set and the rescoring on the small set */
  static playerSimilarityLogic<T>(
    sourcePlayer: IndivCareerStatSet,
    config: SimilarityConfig,
    candidatePlayers: number[][],
    objBuilder: (idx: number) => T,
    zScoresIn?: { means: number[]; stdDevs: number[] },
    styleGrades?: TopLevelIndivPlayAnalysis
  ): {
    diags: Array<{
      obj: T;
      similarity: number;
      diagnostics: SimilarityDiagnostics;
    }>;
    zScores: { means: number[]; stdDevs: number[] };
  } {
    const { flat: flatSourcePlayer, gradeBonus } =
      PlayerSimilarityUtils.playerToFlatFields(sourcePlayer, styleGrades);
    const { vector: sourceVector, fieldMapping: sourceFieldMapping } =
      PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
        // Create flat fields from source player
        flatSourcePlayer,
        config,
        true
      );

    const indexBasedGradeBonusMap = _.mapKeys(
      gradeBonus,
      (v, k) => sourceFieldMapping[k] ?? -1
    );
    const indexBasedGradeBonus = sourceVector.map((__, idx) =>
      indexBasedGradeBonusMap[idx] >= 0 ? indexBasedGradeBonusMap[idx] : 1
    );

    const allVectors = [sourceVector].concat(candidatePlayers);

    let normalizedVectors = allVectors;

    // Step 2.5: Convert to relative scoring if needed
    normalizedVectors = PlayerSimilarityUtils.convertToRelativeScoring(
      normalizedVectors,
      config
    );

    // Step 3: Calculate z-scores across all players
    const zScoreStats = zScoresIn
      ? zScoresIn
      : PlayerSimilarityUtils.calculateZScores(normalizedVectors, true);

    // Step 4: Calculate rate weights for source player (these aren't used any more)
    const rateWeights = PlayerSimilarityUtils.calculateRateWeights(
      sourcePlayer,
      config
    );

    // Step 5: Score each candidate against source player
    const candidateResults: Array<{
      obj: T;
      similarity: number;
      diagnostics: SimilarityDiagnostics;
    }> = [];

    for (let i = 1; i < normalizedVectors.length; i++) {
      const candidateVector = normalizedVectors[i];

      const diagnostics = PlayerSimilarityUtils.calculatePlayerSimilarityScore(
        sourceVector,
        candidateVector,
        zScoreStats,
        rateWeights, //(now unused)
        sourceFieldMapping, //(use this to calc averaged player/comp weights)
        config,
        indexBasedGradeBonus
      );

      candidateResults.push({
        obj: objBuilder(i - 1),
        similarity: diagnostics.totalSimilarity,
        diagnostics,
      });
    }

    // Step 6: Sort by similarity (lower is more similar) and return top 10
    return {
      zScores: zScoreStats,
      diags: candidateResults
        .sort((a, b) => a.similarity - b.similarity)
        .slice(0, config.comparisonPlayersCount),
    };
  }

  /** Main framework function implementing the new similarity approach */
  static readonly findSimilarPlayers = (
    sourcePlayer: IndivCareerStatSet,
    config: SimilarityConfig = DefaultSimilarityConfig,
    candidatePlayers: IndivCareerStatSet[], // Optional for testing, will fetch if not provided
    zScoresIn?: { means: number[]; stdDevs: number[] },
    styleGrades?: TopLevelIndivPlayAnalysis
  ): Array<{
    obj: IndivCareerStatSet;
    similarity: number;
    diagnostics: SimilarityDiagnostics;
  }> => {
    const candidateVectors = candidatePlayers.map((player) => {
      const flatFields = PlayerSimilarityUtils.playerToFlatFields(player).flat;
      return PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
        flatFields,
        config
      ).vector;
    });
    return PlayerSimilarityUtils.playerSimilarityLogic(
      sourcePlayer,
      config,
      candidateVectors,
      (idx: number) => candidatePlayers[idx],
      zScoresIn,
      styleGrades
    ).diags;
  };

  // Dropdown weight multipliers for none/less/default/more/max
  static readonly dropdownWeights = {
    none: 0.0,
    less: 0.5,
    default: 1.0,
    more: 2.0,
    max: 5.0,
  };

  /** Parse custom weights string into a Record<string, number>
   * Format: "Weight Name 1: 2.0, Weight Name 2: 3.0"
   * Returns a map of weight name to multiplier value
   */
  static readonly parseCustomWeights = (
    customWeights: string
  ): Record<string, number> => {
    const result: Record<string, number> = {};

    if (!customWeights.trim()) {
      return result;
    }

    // Split by commas to get individual weight pairs
    const pairs = customWeights.split(",");

    for (const pair of pairs) {
      const colonIndex = pair.indexOf(":");
      if (colonIndex === -1) continue; // Skip invalid pairs

      const key = pair.substring(0, colonIndex).trim();
      const valueStr = pair.substring(colonIndex + 1).trim();

      if (key && valueStr) {
        if (valueStr[0] == "*" || valueStr[0] == "x") {
          // "*3.0" to mult instead of overwrite
          const value = parseFloat(valueStr.substring(1));
          if (!isNaN(value)) {
            result[key] = -value; //(store as -ve means = instead of =)
          }
        } else {
          const value = parseFloat(valueStr);
          if (!isNaN(value)) {
            result[key] = value;
          }
        }
      }
    }
    return result;
  };

  /** Helper function to parse height string to inches */
  private static parseHeight(heightStr?: string): number {
    if (!heightStr || heightStr === "-") return 72; // default to 6'0"

    const match = heightStr.match(/(\d+)-(\d+)/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = parseInt(match[2], 10);
      return feet * 12 + inches;
    }
    return 72; // fallback
  }

  /** Helper function to encode class to numeric value */
  private static parsePlayerClass(yearClass?: string): number {
    if (!yearClass) return 2.5; // default

    const classMap: Record<string, number> = {
      Fr: 1,
      SO: 2,
      Jr: 3,
      Sr: 4,
      Freshman: 1,
      Sophomore: 2,
      Junior: 3,
      Senior: 4,
    };

    return classMap[yearClass] ?? 2.5;
  }

  /**
   * Builds additional query filters based on similarity configuration
   */
  static buildSimilarityQueryFilters(
    sourcePlayer: IndivCareerStatSet,
    config: SimilarityConfig
  ): { query: string; runtimeMappingNames?: string } {
    const queryTerms: string[] = [];
    const runtimeMappingNames: string[] = [];

    // Class weighting filters
    if (
      config.classWeighting !== "none" &&
      config.classWeighting !== "less" &&
      config.classWeighting !== "default" &&
      config.classWeighting !== "more" &&
      config.classWeighting !== "max"
    ) {
      const sourceClass = sourcePlayer.roster?.year_class || "??";

      switch (config.classWeighting) {
        case "same_class":
          queryTerms.push(`roster.year_class.keyword:"${sourceClass}"`);
          break;
        case "fr_only":
          queryTerms.push(`roster.year_class.keyword:"Fr"`);
          break;
        case "under":
          queryTerms.push(`roster.year_class.keyword:("Fr" OR "So")`);
          break;
        case "upper":
          queryTerms.push(`roster.year_class.keyword:("Jr" OR "Sr")`);
          break;
      }
    }

    // Level of play filters
    switch (config.levelOfPlay) {
      case "same_conf":
        const sourceConf = sourcePlayer.conf || "??";
        queryTerms.push(`conf.keyword:"${sourceConf}"`);
        break;

      case "same_tier":
        const sourceConference = sourcePlayer.conf || "??";
        const sourceStrength = ConferenceStrength[sourceConference];

        if (sourceStrength !== undefined) {
          // Find conferences within 4 strength points
          const nearbyConferences = Object.entries(ConferenceStrength)
            .filter(
              ([, strength]) => Math.abs(strength - sourceStrength) <= 4.0
            )
            .map(([conf]) => `"${conf}"`)
            .join(" OR ");

          if (nearbyConferences) {
            queryTerms.push(`conf.keyword:(${nearbyConferences})`);
          }
        }
        break;

      case "similar_sos":
        // Calculate source player's SoS (off_adj_opp - def_adj_opp)
        const sourceOffAdjOpp =
          (sourcePlayer.off_adj_opp as Statistic)?.value || 0;
        const sourceDefAdjOpp =
          (sourcePlayer.def_adj_opp as Statistic)?.value || 0;
        const sourceSoS = sourceOffAdjOpp - sourceDefAdjOpp;

        // Request the oppo_sos runtime mapping
        runtimeMappingNames.push("oppo_sos");

        // Add range query for SoS ±3.5
        const sosMin = sourceSoS - 3.5;
        const sosMax = sourceSoS + 3.5;
        queryTerms.push(`oppo_sos:[${sosMin} TO ${sosMax}]`);
        break;

      case "any":
      default:
        // No additional filtering
        break;
    }

    return {
      query: queryTerms.length > 0 ? queryTerms.join(" AND ") : "",
      runtimeMappingNames:
        runtimeMappingNames.length > 0
          ? runtimeMappingNames.join(",")
          : undefined,
    };
  }
}
