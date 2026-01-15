import { IndivCareerStatSet, Statistic } from "../StatModels";
import { PlayTypeUtils, TopLevelIndivPlayType } from "./PlayTypeUtils";
import { SimilarityConfig, DefaultSimilarityConfig } from "../FilterModels";

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
  // Add custom weights (make advanced section collapsible at the same time)
  // add pins and "x"s
  // Add manual player
  // ^WIP, UI is in but not working yet .. added some TODOs plus need to support the Y+1
  // Scoring: probably shouldn't include efficiency of 3P assist plays (and maybe weight down 2P assist plays?)
  // ^ I added a suppressor but they are still a bit high, I'm not sure why
  // + ... need to weight up the more important play styles (based on source player positional group?!)
  // Add a filter for the comps (plus a "pinned only" filter)

  // IDEAS I'm not sure about
  // Style: Should merge stylistic-mid-range with pure mid-rate?
  // (idea: have a slider that weights up the "basic" fields)
  // (idea: should the sliders be exponential multipliers, eg x5 instead of 100%)
  // Maybe also have a FT% element (weighted by FTR, and maybe down)?
  // Maybe also (option SoS-adjusted) ORtg bonus? (or an offensive / defensive caliber that pins to RAPM?)

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
  static readonly fgWeight = 4.0;

  /** Style has a bunch of elements so we reduce it a bit */
  static readonly styleFrequencyWeight = 0.66;

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

  /** Build unweighted similarity vector from flat docvalue_fields format */
  static readonly buildUnweightedPlayerSimilarityVectorFromFlat = (
    flatFields: Record<string, any[]>,
    config: SimilarityConfig = DefaultSimilarityConfig
  ): number[] => {
    const vector: number[] = [];

    // Helper to get value from flat fields
    const getValue = (key: string): number => {
      const values = flatFields[key];
      return Array.isArray(values) && values.length > 0 ? values[0] : 0;
    };

    // PLAY STYLE SECTION
    for (const pt of PlayerSimilarityUtils.allStyles) {
      if (pt === "Transition" && !config.includeTransition) {
        vector.push(0);
        continue;
      }
      vector.push(getValue(`style.${pt}.possPctUsg.value`));
    }

    // Additional play style stats (if weights are not 'none')
    const additionalStats = [
      { key: "off_assist.value", weight: config.assistWeighting },
      { key: "off_to.value", weight: config.turnoverWeighting },
      { key: "off_orb.value", weight: config.offensiveReboundWeighting },
      { key: "off_ftr.value", weight: config.freeThrowWeighting },
    ];

    for (const stat of additionalStats) {
      if (stat.weight !== "none") {
        vector.push(getValue(stat.key));
      }
    }

    // SCORING EFFICIENCY SECTION
    for (const pt of PlayerSimilarityUtils.allStyles) {
      let raw = 0;
      switch (config.scoringMode) {
        case "sos-adjusted":
          raw = getValue(`style.${pt}.adj_pts.value`);
          break;
        case "raw":
          raw = getValue(`style.${pt}.pts.value`);
          break;
        case "relative":
          raw = getValue(`style.${pt}.pts.value`);
          break;
      }
      vector.push(raw);
    }

    // FG BONUS SECTION
    if (config.fgBonus !== "none") {
      vector.push(getValue("off_3p.value"));
      vector.push(getValue("off_2pmid.value"));
      vector.push(getValue("off_2prim.value"));
    }

    // OFFENSIVE GRAVITY BONUS
    if (config.offensiveGravityBonus !== "none") {
      const offAdjRapm = getValue("off_adj_rapm.value");
      const offAdjRtg = getValue("off_adj_rtg.value");
      vector.push(offAdjRapm - offAdjRtg);
    }

    // USAGE BONUS
    if (config.usageBonus !== "none") {
      vector.push(getValue("off_usage.value"));
    }

    // DEFENSE SECTION
    if (config.defensiveSkill !== "none") {
      let defensiveSkill = 0;
      switch (config.defensiveSkill) {
        case "sos-adjusted":
          defensiveSkill = getValue("def_adj_rapm.value");
          break;
        case "raw":
          defensiveSkill = -getValue("def_rtg.value") + 1.0;
          break;
        case "relative":
          const defRapm = getValue("def_adj_rapm.value");
          const onDefPpp = getValue("on.def_adj_ppp.value");
          defensiveSkill = defRapm - 0.2 * (onDefPpp - 1.0);
          break;
      }
      vector.push(defensiveSkill);
    }

    if (config.stocksWeighting !== "none") {
      const steals = getValue("def_to.value");
      const blocks = getValue("def_2prim.value");
      vector.push(steals);
      vector.push(blocks);
    }

    if (config.foulsWeighting !== "none") {
      vector.push(getValue("def_ftr.value") * 50);
    }

    if (config.defensiveReboundWeighting !== "none") {
      vector.push(getValue("def_orb.value"));
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
      vector.push(getValue("off_team_poss_pct.value"));
    }

    return vector;
  };

  /** Convert nested player object to flat docvalue_fields format */
  static readonly playerToFlatFields = (
    player: IndivCareerStatSet
  ): Record<string, any[]> => {
    const fields: Record<string, any[]> = {};

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
    }

    // Additional stats
    setField("off_assist.value", player.off_assist);
    setField("off_to.value", player.off_to);
    setField("off_orb.value", player.off_orb);
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

    return fields;
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

  /** Calculate rate weights using square root approach */
  static readonly calculateRateWeights = (
    player: IndivCareerStatSet,
    config: SimilarityConfig
  ): { styleRateWeights: number[]; fgRateWeights: number[] } => {
    // Style rate weights (for scoring efficiency section)
    const styleRates = PlayerSimilarityUtils.allStyles.map((pt) => {
      const baseRate = player.style?.[pt]?.possPct?.value ?? 0;
      if (pt == "Attack & Kick" || pt == "Post & Kick") {
        return baseRate * 0.1; //(3P, very random what happens after the pass)
      } else if (pt == "Hits Cutter" || pt == "PnR Passer") {
        return baseRate * 0.5; //(2P, still some level of randomness what happens after the pass)
      } else {
        return baseRate;
      }
    });
    const styleSqrtSum = styleRates.reduce(
      (sum, rate) => sum + Math.sqrt(rate),
      0
    );
    const styleRateWeights = styleRates.map(
      (rate) =>
        PlayerSimilarityUtils.styledScoringWeight *
        (styleSqrtSum > 0
          ? Math.sqrt(rate) / styleSqrtSum
          : 1.0 / styleRates.length)
    );

    // FG rate weights (for FG bonus section)
    let fgRateWeights: number[] = [];
    if (config.fgBonus !== "none") {
      const fgRates = [
        player.off_3pr?.value ?? 0,
        player.off_2pmidr?.value ?? 0,
        player.off_2primr?.value ?? 0,
      ];
      const fgSqrtSum = fgRates.reduce((sum, rate) => sum + Math.sqrt(rate), 0);
      fgRateWeights = fgRates.map(
        (rate) =>
          PlayerSimilarityUtils.fgWeight *
          (fgSqrtSum > 0 ? Math.sqrt(rate) / fgSqrtSum : 1.0 / fgRates.length)
      );
    }

    return { styleRateWeights, fgRateWeights };
  };

  /** Calculate similarity score with diagnostic information */
  static readonly calculatePlayerSimilarityScore = (
    sourceVector: number[],
    candidateVector: number[],
    zScoreStats: { means: number[]; stdDevs: number[] },
    rateWeights: { styleRateWeights: number[]; fgRateWeights: number[] },
    config: SimilarityConfig
  ): SimilarityDiagnostics => {
    if (sourceVector.length !== candidateVector.length) {
      throw new Error("Vector length mismatch");
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
        const diff = sourceVector[vectorIndex] - candidateVector[vectorIndex];
        const zScore =
          zScoreStats.stdDevs[vectorIndex] > 0
            ? diff /
              Math.max(
                zScoreStats.stdDevs[vectorIndex],
                stdDevConfig?.minStdDev ?? 0
              )
            : 0;

        // Bound z-score to [-3, 3]
        const boundedZScore = Math.max(-3, Math.min(3, zScore));

        // Calculate weight
        let weight = componentWeight * dropdownWeight;
        if (sectionRateWeights && i < sectionRateWeights.length) {
          weight *= sectionRateWeights[i];
        }

        // Squared difference in z-score space
        const scoreDiff = boundedZScore * boundedZScore;

        // Update totals
        totalScore += scoreDiff * weight;
        totalWeight += weight;

        // Update component diagnostics
        component.weightedZScoreSum += Math.abs(boundedZScore) * weight;
        component.totalWeight += weight;

        // Add to stat breakdown if we have a name
        if (i < statNames.length) {
          component.statBreakdown.push({
            name: statNames[i],
            zScore: boundedZScore,
            weight: weight,
            weightedAbsoluteZScore: Math.abs(boundedZScore) * weight,
            globalStdDev: zScoreStats.stdDevs[vectorIndex], // Current vector index
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
      PlayerSimilarityUtils.styleFrequencyWeight
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

    // SCORING EFFICIENCY SECTION (with rate weights)
    processSection(
      PlayerSimilarityUtils.allStyles.length,
      config.scoringEfficiencyWeight,
      "scoringEfficiency",
      PlayerSimilarityUtils.allStyles.map((style) => `${style} Scoring`),
      1.0,
      rateWeights.styleRateWeights
    );

    // FG BONUS SECTION
    if (config.fgBonus !== "none") {
      processSection(
        3,
        config.scoringEfficiencyWeight,
        "scoringEfficiency",
        ["3P%", "2P Mid%", "2P Rim%"],
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

    if (config.usageBonus !== "none") {
      processSection(
        1,
        config.scoringEfficiencyWeight,
        "scoringEfficiency",
        ["Usage"],
        PlayerSimilarityUtils.dropdownWeights[config.usageBonus]
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
        processSection(
          1,
          config.playerInfoWeight,
          "playerInfo",
          [stat.name],
          PlayerSimilarityUtils.dropdownWeights[stat.weight]
        );
      }
    }

    // Sort stat breakdowns by weighted absolute z-score (descending)
    Object.values(diagnostics.componentScores).forEach((component) => {
      component.statBreakdown.sort(
        (a, b) => b.weightedAbsoluteZScore - a.weightedAbsoluteZScore
      );
    });

    // Calculate final similarity score
    diagnostics.totalSimilarity =
      totalWeight > 0 ? totalScore / totalWeight : Infinity;

    return diagnostics;
  };

  /** Shared logic for both the original scoring on the large set and the rescoring on the small set */
  static playerSimilarityLogic<T>(
    sourcePlayer: IndivCareerStatSet,
    config: SimilarityConfig,
    candidatePlayers: number[][],
    objBuilder: (idx: number) => T
  ): Array<{ obj: T; similarity: number; diagnostics: SimilarityDiagnostics }> {
    const sourceVector =
      PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
        // Create flat fields from source player
        PlayerSimilarityUtils.playerToFlatFields(sourcePlayer),
        config
      );

    const allVectors = [sourceVector].concat(candidatePlayers);

    let normalizedVectors = allVectors;

    // Step 2.5: Convert to relative scoring if needed
    normalizedVectors = PlayerSimilarityUtils.convertToRelativeScoring(
      normalizedVectors,
      config
    );

    // Step 3: Calculate z-scores across all players
    const zScoreStats = PlayerSimilarityUtils.calculateZScores(
      normalizedVectors,
      true
    );

    // Step 4: Calculate rate weights for source player
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
        rateWeights,
        config
      );

      candidateResults.push({
        obj: objBuilder(i - 1),
        similarity: diagnostics.totalSimilarity,
        diagnostics,
      });
    }

    // Step 6: Sort by similarity (lower is more similar) and return top 10
    return candidateResults
      .sort((a, b) => a.similarity - b.similarity)
      .slice(0, config.comparisonPlayersCount);
  }

  /** Main framework function implementing the new similarity approach */
  static readonly findSimilarPlayers = (
    sourcePlayer: IndivCareerStatSet,
    config: SimilarityConfig = DefaultSimilarityConfig,
    candidatePlayers: IndivCareerStatSet[] // Optional for testing, will fetch if not provided
  ): Array<{
    obj: IndivCareerStatSet;
    similarity: number;
    diagnostics: SimilarityDiagnostics;
  }> => {
    const candidateVectors = candidatePlayers.map((player) => {
      const flatFields = PlayerSimilarityUtils.playerToFlatFields(player);
      return PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
        flatFields,
        config
      );
    });
    return PlayerSimilarityUtils.playerSimilarityLogic(
      sourcePlayer,
      config,
      candidateVectors,
      (idx: number) => candidatePlayers[idx]
    );
  };

  // Dropdown weight multipliers for none/less/default/more
  static readonly dropdownWeights = {
    none: 0.0,
    less: 0.5,
    default: 1.0,
    more: 2.0,
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
}
