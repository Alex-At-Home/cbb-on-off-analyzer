import { IndivCareerStatSet, Statistic } from "../StatModels";
import { PlayTypeUtils, TopLevelIndivPlayType } from "./PlayTypeUtils";
import { SimilarityConfig, DefaultSimilarityConfig } from "../FilterModels";

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

  //TODO:
  // create and show "component scores"
  // add pins and "x"s
  // "show next season for pinned teams"
  // different "config option weights"
  // (tidy up layout of config)
  // (clear similarity pins/view when player changes)
  // Improve simple vector (don't include transition), add role based query (others?)
  // (delete buildPlayerSimilarityVector and all the tests - it's not used any more?)

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

  /** Build unweighted similarity vector for z-score calculation */
  static readonly buildUnweightedPlayerSimilarityVector = (
    player: IndivCareerStatSet,
    config: SimilarityConfig = DefaultSimilarityConfig
  ): number[] => {
    const vector: number[] = [];

    // Vector structure (all unweighted raw values):
    // - Play styles (possPctUsg values)
    // - Additional play style stats (assist/TO/ORB/FT) if not 'none'
    // - Scoring efficiency per style (WITHOUT rate weighting)
    // - FG stats (percentage only, WITHOUT rate weighting) if not 'none'
    // - Gravity bonus if not 'none'
    // - Usage bonus if not 'none'
    // - Defense stats if respective weights not 'none'
    // - Player info if respective weights not 'none'

    // PLAY STYLE SECTION
    for (const pt of PlayerSimilarityUtils.allStyles) {
      if (pt === "Transition" && !config.includeTransition) {
        vector.push(0);
        continue;
      }

      const raw = player.style?.[pt]?.possPctUsg?.value ?? 0;
      vector.push(raw);
    }

    // Additional play style stats (if weights are not 'none')
    const additionalPlayStyleStats = [
      { value: player.off_assist?.value ?? 0, weight: config.assistWeighting },
      { value: player.off_to?.value ?? 0, weight: config.turnoverWeighting },
      {
        value: player.off_orb?.value ?? 0,
        weight: config.offensiveReboundWeighting,
      },
      { value: player.off_ftr?.value ?? 0, weight: config.freeThrowWeighting },
    ];

    for (const stat of additionalPlayStyleStats) {
      if (stat.weight !== "none") {
        vector.push(stat.value);
      }
    }

    // SCORING EFFICIENCY SECTION (raw values without rate weighting)
    for (const pt of PlayerSimilarityUtils.allStyles) {
      let raw = 0;

      switch (config.scoringMode) {
        case "sos-adjusted":
          raw = player.style?.[pt]?.adj_pts?.value ?? 0;
          break;
        case "raw":
          raw = player.style?.[pt]?.pts?.value ?? 0;
          break;
        case "relative":
          // For relative mode, we'll calculate the ratio after we have all players
          // For now, store raw pts - will be converted in post-processing
          //TODO: this is wrong, relative is supposed to be shot making / total ppp
          raw = player.style?.[pt]?.pts?.value ?? 0;
          break;
      }

      vector.push(raw);
    }

    // FG BONUS SECTION (percentages only, no rate weighting yet)
    if (config.fgBonus !== "none") {
      const fgStats = [
        player.off_3p?.value ?? 0,
        player.off_2pmid?.value ?? 0,
        player.off_2prim?.value ?? 0,
      ];

      for (const fgPct of fgStats) {
        vector.push(fgPct);
      }
    }

    // OFFENSIVE GRAVITY BONUS
    if (config.offensiveGravityBonus !== "none") {
      const offAdjRapm = (player.off_adj_rapm as Statistic)?.value ?? 0;
      const offAdjRtg = player.off_adj_rtg?.value ?? 0;
      const gravityBonus = offAdjRapm - offAdjRtg;
      vector.push(gravityBonus);
    }

    // USAGE BONUS
    if (config.usageBonus !== "none") {
      const usage = player.off_usage?.value ?? 0;
      vector.push(usage);
    }

    // DEFENSE SECTION
    if (config.defensiveSkill !== "none") {
      let defensiveSkill = 0;
      switch (config.defensiveSkill) {
        case "sos-adjusted":
          defensiveSkill = (player.def_adj_rapm as Statistic)?.value ?? 0;
          break;
        case "raw":
          defensiveSkill = -(player.def_rtg?.value ?? 1.0) + 1.0;
          break;
        case "relative":
          const defRapm = (player.def_adj_rapm as Statistic)?.value ?? 0;
          const onDefPpp = player.on?.def_adj_ppp?.value ?? 1.0;
          defensiveSkill = defRapm - 0.2 * (onDefPpp - 1.0);
          break;
      }
      vector.push(defensiveSkill);
    }

    if (config.stocksWeighting !== "none") {
      const steals = player.def_stl?.value ?? 0;
      const blocks = player.def_blk?.value ?? 0;
      const stocks = (steals + blocks) * 50; // per 50 possessions
      vector.push(stocks);
    }

    if (config.foulsWeighting !== "none") {
      const fouls = (player.def_foul?.value ?? 0) * 50;
      vector.push(fouls);
    }

    if (config.defensiveReboundWeighting !== "none") {
      const drb = player.def_orb?.value ?? 0; // note: def_orb is actually DRB
      vector.push(drb);
    }

    // PLAYER INFO SECTION
    if (config.classWeighting !== "none") {
      const playerClass = PlayerSimilarityUtils.parsePlayerClass(
        player.roster?.year_class
      );
      vector.push(playerClass);
    }

    if (config.heightWeighting !== "none") {
      const height = PlayerSimilarityUtils.parseHeight(player.roster?.height);
      vector.push(height);
    }

    if (config.minutesWeighting !== "none") {
      const minutes = player.off_team_poss_pct?.value ?? 0;
      vector.push(minutes);
    }

    return vector;
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
    vectors: number[][]
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
      stdDevs.push(stdDev > 0 ? stdDev : 1.0); // Avoid division by zero
    }

    return { means, stdDevs };
  };

  /** Calculate rate weights using square root approach */
  static readonly calculateRateWeights = (
    player: IndivCareerStatSet,
    config: SimilarityConfig
  ): { styleRateWeights: number[]; fgRateWeights: number[] } => {
    // Style rate weights (for scoring efficiency section)
    const styleRates = PlayerSimilarityUtils.allStyles.map(
      (pt) => player.style?.[pt]?.possPct?.value ?? 0
    );
    const styleSqrtSum = styleRates.reduce(
      (sum, rate) => sum + Math.sqrt(rate),
      0
    );
    const styleRateWeights = styleRates.map((rate) =>
      styleSqrtSum > 0
        ? Math.sqrt(rate) / styleSqrtSum
        : 1.0 / styleRates.length
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
      fgRateWeights = fgRates.map((rate) =>
        fgSqrtSum > 0 ? Math.sqrt(rate) / fgSqrtSum : 1.0 / fgRates.length
      );
    }

    return { styleRateWeights, fgRateWeights };
  };

  /** Calculate similarity score between source player and candidate using z-scores */
  static readonly calculatePlayerSimilarityScore = (
    sourceVector: number[],
    candidateVector: number[],
    zScoreStats: { means: number[]; stdDevs: number[] },
    rateWeights: { styleRateWeights: number[]; fgRateWeights: number[] },
    config: SimilarityConfig
  ): number => {
    if (sourceVector.length !== candidateVector.length) {
      throw new Error("Vector length mismatch");
    }

    let totalScore = 0;
    let totalWeight = 0;
    let vectorIndex = 0;

    // Helper to process vector section with weights
    const processSection = (
      length: number,
      componentWeight: number,
      dropdownWeight: number = 1.0,
      sectionRateWeights?: number[]
    ) => {
      for (let i = 0; i < length; i++) {
        const diff = sourceVector[vectorIndex] - candidateVector[vectorIndex];
        const zScore =
          zScoreStats.stdDevs[vectorIndex] > 0
            ? diff / zScoreStats.stdDevs[vectorIndex]
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

        totalScore += scoreDiff * weight;
        totalWeight += weight;
        vectorIndex++;
      }
    };

    // PLAY STYLE SECTION
    processSection(
      PlayerSimilarityUtils.allStyles.length,
      config.playStyleWeight
    );

    // Additional play style stats
    const additionalStats = [
      { weight: config.assistWeighting },
      { weight: config.turnoverWeighting },
      { weight: config.offensiveReboundWeighting },
      { weight: config.freeThrowWeighting },
    ];

    for (const stat of additionalStats) {
      if (stat.weight !== "none") {
        processSection(
          1,
          config.playStyleWeight,
          PlayerSimilarityUtils.dropdownWeights[stat.weight]
        );
      }
    }

    // SCORING EFFICIENCY SECTION (with rate weights)
    processSection(
      PlayerSimilarityUtils.allStyles.length,
      config.scoringEfficiencyWeight,
      1.0,
      rateWeights.styleRateWeights
    );

    // FG BONUS SECTION
    if (config.fgBonus !== "none") {
      processSection(
        3,
        config.scoringEfficiencyWeight,
        PlayerSimilarityUtils.dropdownWeights[config.fgBonus],
        rateWeights.fgRateWeights
      );
    }

    // GRAVITY AND USAGE BONUSES
    if (config.offensiveGravityBonus !== "none") {
      processSection(
        1,
        config.scoringEfficiencyWeight,
        PlayerSimilarityUtils.dropdownWeights[config.offensiveGravityBonus]
      );
    }

    if (config.usageBonus !== "none") {
      processSection(
        1,
        config.scoringEfficiencyWeight,
        PlayerSimilarityUtils.dropdownWeights[config.usageBonus]
      );
    }

    // DEFENSE SECTION
    const defenseStats = [
      { weight: config.defensiveSkill, dropdown: "default" as const },
      { weight: config.stocksWeighting, dropdown: config.stocksWeighting },
      { weight: config.foulsWeighting, dropdown: config.foulsWeighting },
      {
        weight: config.defensiveReboundWeighting,
        dropdown: config.defensiveReboundWeighting,
      },
    ];

    for (const stat of defenseStats) {
      if (stat.weight !== "none") {
        processSection(
          1,
          config.defenseWeight,
          PlayerSimilarityUtils.dropdownWeights[stat.dropdown]
        );
      }
    }

    // PLAYER INFO SECTION
    const playerInfoStats = [
      { weight: config.classWeighting },
      { weight: config.heightWeighting },
      { weight: config.minutesWeighting },
    ];

    for (const stat of playerInfoStats) {
      if (stat.weight !== "none") {
        processSection(
          1,
          config.playerInfoWeight,
          PlayerSimilarityUtils.dropdownWeights[stat.weight]
        );
      }
    }

    // Return inverse similarity (lower is more similar)
    return totalWeight > 0 ? totalScore / totalWeight : Infinity;
  };

  /** Main framework function implementing the new similarity approach */
  static readonly findSimilarPlayers = async (
    sourcePlayer: IndivCareerStatSet,
    config: SimilarityConfig = DefaultSimilarityConfig,
    candidatePlayers?: IndivCareerStatSet[] // Optional for testing, will fetch if not provided
  ): Promise<Array<{ player: IndivCareerStatSet; similarity: number }>> => {
    // Step 1: Get candidate players (top 500 using simple similarity)
    let candidates: IndivCareerStatSet[];
    if (candidatePlayers) {
      candidates = candidatePlayers.slice(
        0,
        PlayerSimilarityUtils.firstPassPlayersRetrieved
      );
    } else {
      // TODO: This will need to be wired up to actual API call
      // For now, return empty array - this will be implemented when wiring to UI
      console.warn("findSimilarPlayers: API integration not yet implemented");
      return [];
    }

    // Step 2: Build unweighted vectors for all players (including source)
    const allPlayers = [sourcePlayer, ...candidates];
    const allVectors = allPlayers.map((player) =>
      PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVector(
        player,
        config
      )
    );

    // Handle case where vectors have different lengths (shouldn't happen but be safe)
    const minLength = Math.min(...allVectors.map((v) => v.length));
    let normalizedVectors = allVectors.map((v) => v.slice(0, minLength));

    // Step 2.5: Convert to relative scoring if needed
    normalizedVectors = PlayerSimilarityUtils.convertToRelativeScoring(
      normalizedVectors,
      config
    );

    // Step 3: Calculate z-scores across all players
    const zScoreStats =
      PlayerSimilarityUtils.calculateZScores(normalizedVectors);

    // Step 4: Calculate rate weights for source player
    const rateWeights = PlayerSimilarityUtils.calculateRateWeights(
      sourcePlayer,
      config
    );

    // Step 5: Score each candidate against source player
    const sourceVector = normalizedVectors[0];
    const candidateResults: Array<{
      player: IndivCareerStatSet;
      similarity: number;
    }> = [];

    for (let i = 1; i < normalizedVectors.length; i++) {
      const candidateVector = normalizedVectors[i];
      const similarity = PlayerSimilarityUtils.calculatePlayerSimilarityScore(
        sourceVector,
        candidateVector,
        zScoreStats,
        rateWeights,
        config
      );

      candidateResults.push({
        player: candidates[i - 1],
        similarity,
      });
    }

    // Step 6: Sort by similarity (lower is more similar) and return top 10
    return candidateResults
      .sort((a, b) => a.similarity - b.similarity)
      .slice(0, 10);
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
