import { IndivCareerStatSet, Statistic } from "../StatModels";
import { PlayTypeUtils, TopLevelIndivPlayType } from "./PlayTypeUtils";
import { SimilarityConfig, DefaultSimilarityConfig } from "../FilterModels";

/** A repo of useful constants and methods for use in determining player similarity */
export class PlayerSimilarityUtils {
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

  // Dynamic range weights for normalizing different metrics to ~0.20 range
  static readonly dynamicRangeWeights = {
    // Play Style: possPctUsg values typically 0-0.4
    playStyle: 0.5, // normalize 0.4 → 0.20
    
    // Scoring Efficiency: adj_pts typically 0.6-1.4  
    scoringEfficiency: 0.25, // normalize 0.8 range → 0.20
    
    // FG percentages: typically 0.2-0.8
    fgPercentage: 0.33, // normalize 0.6 → 0.20
    
    // RAPM values: typically -8 to +8
    rapm: 0.0125, // normalize 16 → 0.20
    
    // Per-possession stats: typically 0-0.3
    perPossession: 0.67, // normalize 0.3 → 0.20
    
    // Class: 1-4 range
    playerClass: 0.067, // normalize 3 → 0.20
    
    // Height: 66-84 inches typically
    height: 0.011, // normalize 18 → 0.20
    
    // Minutes: 0-1 range
    minutes: 0.20, // normalize 1 → 0.20
    
    // Individual stat weights
    assists: 0.05,         // normalize ~4 → 0.20
    turnovers: 0.1,        // normalize ~2 → 0.20
    offRebounds: 0.2,      // normalize ~1 → 0.20
    freeThrows: 0.4,       // normalize ~0.5 → 0.20
    usage: 0.01,           // normalize ~20 → 0.20
    
    // Style frequency boost weights (to boost lower frequency styles)
    lowFreqBoost: 2.0,     // boost for low frequency styles
    medFreqBoost: 1.5,     // boost for medium frequency styles
    highFreqBoost: 1.0     // normal weight for high frequency styles
  };

  // Dropdown weight multipliers for none/less/default/more
  static readonly dropdownWeights = {
    none: 0.0,
    less: 0.5, 
    default: 1.0,
    more: 2.0
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
      'Fr': 1, 'SO': 2, 'Jr': 3, 'Sr': 4,
      'Freshman': 1, 'Sophomore': 2, 'Junior': 3, 'Senior': 4
    };
    
    return classMap[yearClass] ?? 2.5;
  }

  /** For use with playerSimilarityQueryTemplate */
  static readonly buildPlayerSimilarityVector = (
    player: IndivCareerStatSet,
    includeWeights: boolean = false,
    config: SimilarityConfig = DefaultSimilarityConfig,
    avgEfficiency: number = 1.0
  ): number[] => {
    const vector: number[] = [];
    
    // Vector structure documentation (variable length based on config):
    // First 15 elements: Play styles (possPctUsg values)  
    // Next 0-4 elements: Additional play style stats (assist/TO/ORB/FT) if not 'none'
    // Next 15 elements: Scoring efficiency per style (rate-weighted)
    // Next 0-3 elements: FG bonus (3P, 2P_mid, 2P_rim) if fgBonus not 'none'
    // Next 0-1 elements: Gravity bonus if offensiveGravityBonus not 'none'
    // Next 0-1 elements: Usage bonus if usageBonus not 'none'
    // Next 0-4 elements: Defense stats (skill/stocks/fouls/DRB) if respective weights not 'none'
    // Next 0-3 elements: Player info (class/height/minutes) if respective weights not 'none'

    // PLAY STYLE SECTION (indices 0-19)
    for (const pt of PlayerSimilarityUtils.allStyles) {
      // Skip transition if not included in config
      if (pt === "Transition" && !config.includeTransition) {
        vector.push(0);
        continue;
      }
      
      let raw = player.style?.[pt]?.possPctUsg?.value ?? 0;
      
      if (includeWeights) {
        // Apply dynamic range normalization
        raw *= PlayerSimilarityUtils.dynamicRangeWeights.playStyle;
        
        // Apply component weight
        raw *= config.playStyleWeight;
      }
      
      vector.push(raw);
    }

    // Additional play style stats (if weights are not 'none')
    const additionalPlayStyleStats = [
      { value: player.off_assist?.value ?? 0, weight: config.assistWeighting, dynamicWeight: PlayerSimilarityUtils.dynamicRangeWeights.assists },
      { value: player.off_to?.value ?? 0, weight: config.turnoverWeighting, dynamicWeight: PlayerSimilarityUtils.dynamicRangeWeights.turnovers },
      { value: player.off_orb?.value ?? 0, weight: config.offensiveReboundWeighting, dynamicWeight: PlayerSimilarityUtils.dynamicRangeWeights.offRebounds },
      { value: player.off_ftr?.value ?? 0, weight: config.freeThrowWeighting, dynamicWeight: PlayerSimilarityUtils.dynamicRangeWeights.freeThrows }
    ];
    
    for (const stat of additionalPlayStyleStats) {
      if (stat.weight !== 'none') {
        let raw = stat.value;
        
        if (includeWeights) {
          raw *= stat.dynamicWeight;
          raw *= PlayerSimilarityUtils.dropdownWeights[stat.weight];
          raw *= config.playStyleWeight;
        }
        
        vector.push(raw);
      }
    }

    // SCORING EFFICIENCY SECTION 
    // Calculate weighted average for relative mode
    let weightedAveragePts = 0;
    if (config.scoringMode === 'relative') {
      let totalWeight = 0;
      for (const pt of PlayerSimilarityUtils.allStyles) {
        const pts = player.style?.[pt]?.pts?.value ?? 0;
        const freq = player.style?.[pt]?.possPct?.value ?? 0;
        weightedAveragePts += pts * freq;
        totalWeight += freq;
      }
      weightedAveragePts = totalWeight > 0 ? weightedAveragePts / totalWeight : 1.0;
    }
    
    for (const pt of PlayerSimilarityUtils.allStyles) {
      let raw = 0;
      const rate = player.style?.[pt]?.possPct?.value ?? 0;
      
      switch (config.scoringMode) {
        case 'sos-adjusted':
          raw = (player.style?.[pt]?.adj_pts?.value ?? 0) * rate;
          break;
        case 'raw':
          raw = (player.style?.[pt]?.pts?.value ?? 0) * rate;
          break;
        case 'relative':
          const pts = player.style?.[pt]?.pts?.value ?? 0;
          raw = (weightedAveragePts > 0 ? pts / weightedAveragePts : 0) * rate;
          break;
      }
      
      if (includeWeights) {
        // Apply dynamic range normalization
        raw *= PlayerSimilarityUtils.dynamicRangeWeights.scoringEfficiency;
        
        // Apply style frequency boost (lower frequency styles get higher weights)
        if (PlayerSimilarityUtils.lowFreqStylesSet.has(pt)) {
          raw *= PlayerSimilarityUtils.dynamicRangeWeights.lowFreqBoost;
        } else if (PlayerSimilarityUtils.medFreqStylesSet.has(pt)) {
          raw *= PlayerSimilarityUtils.dynamicRangeWeights.medFreqBoost;
        } else {
          raw *= PlayerSimilarityUtils.dynamicRangeWeights.highFreqBoost;
        }
        
        // Apply component weight
        raw *= config.scoringEfficiencyWeight;
      }
      
      vector.push(raw);
    }

    // FG BONUS SECTION (if fgBonus is not 'none')
    if (config.fgBonus !== 'none') {
      const fgStats = [
        { pct: player.off_3p?.value ?? 0, rate: player.off_3pr?.value ?? 0 },
        { pct: player.off_2pmid?.value ?? 0, rate: player.off_2pmidr?.value ?? 0 },
        { pct: player.off_2prim?.value ?? 0, rate: player.off_2primr?.value ?? 0 }
      ];
      
      for (const fgStat of fgStats) {
        let raw = fgStat.pct * fgStat.rate;
        
        if (includeWeights) {
          raw *= PlayerSimilarityUtils.dynamicRangeWeights.fgPercentage;
          raw *= PlayerSimilarityUtils.dropdownWeights[config.fgBonus];
          raw *= config.scoringEfficiencyWeight;
        }
        
        vector.push(raw);
      }
    }

    // OFFENSIVE GRAVITY BONUS (if offensiveGravityBonus is not 'none')
    if (config.offensiveGravityBonus !== 'none') {
      const offAdjRapm = (player.off_adj_rapm as Statistic)?.value ?? 0;
      const offAdjRtg = player.off_adj_rtg?.value ?? 0;
      let gravityBonus = offAdjRapm - offAdjRtg;
      
      if (includeWeights) {
        gravityBonus *= PlayerSimilarityUtils.dynamicRangeWeights.rapm;
        gravityBonus *= PlayerSimilarityUtils.dropdownWeights[config.offensiveGravityBonus];
        gravityBonus *= config.scoringEfficiencyWeight;
      }
      
      vector.push(gravityBonus);
    }

    // USAGE BONUS (if usageBonus is not 'none')
    if (config.usageBonus !== 'none') {
      let usage = player.off_usage?.value ?? 0;
      
      if (includeWeights) {
        usage *= PlayerSimilarityUtils.dynamicRangeWeights.usage;
        usage *= PlayerSimilarityUtils.dropdownWeights[config.usageBonus];
        usage *= config.scoringEfficiencyWeight;
      }
      
      vector.push(usage);
    }

    // DEFENSE SECTION
    
    // Main defensive skill (if defensiveSkill is not 'none')
    if (config.defensiveSkill !== 'none') {
      let defensiveSkill = 0;
      switch (config.defensiveSkill) {
        case 'sos-adjusted':
          defensiveSkill = (player.def_adj_rapm as Statistic)?.value ?? 0;
          break;
        case 'raw':
          // Use DRtg with different dynamic range weight
          defensiveSkill = -(player.def_rtg?.value ?? avgEfficiency) + avgEfficiency;
          break;
        case 'relative':
          const defRapm = (player.def_adj_rapm as Statistic)?.value ?? 0;
          const onDefPpp = player.on?.def_adj_ppp?.value ?? avgEfficiency;
          defensiveSkill = defRapm - 0.2 * (onDefPpp - avgEfficiency);
          break;
      }
      
      if (includeWeights) {
        if (config.defensiveSkill === 'raw') {
          // Different dynamic range for DRtg
          defensiveSkill *= PlayerSimilarityUtils.dynamicRangeWeights.perPossession;
        } else {
          defensiveSkill *= PlayerSimilarityUtils.dynamicRangeWeights.rapm;
        }
        defensiveSkill *= config.defenseWeight;
      }
      
      vector.push(defensiveSkill);
    }
    
    // Stocks (if stocksWeighting is not 'none')
    if (config.stocksWeighting !== 'none') {
      const steals = player.def_stl?.value ?? 0;
      const blocks = player.def_blk?.value ?? 0;
      let stocks = (steals + blocks) * 50; // per 50 possessions
      
      if (includeWeights) {
        stocks *= PlayerSimilarityUtils.dynamicRangeWeights.perPossession;
        stocks *= PlayerSimilarityUtils.dropdownWeights[config.stocksWeighting];
        stocks *= config.defenseWeight;
      }
      
      vector.push(stocks);
    }
    
    // Fouls (if foulsWeighting is not 'none')
    if (config.foulsWeighting !== 'none') {
      let fouls = (player.def_foul?.value ?? 0) * 50;
      
      if (includeWeights) {
        fouls *= PlayerSimilarityUtils.dynamicRangeWeights.perPossession;
        fouls *= PlayerSimilarityUtils.dropdownWeights[config.foulsWeighting];
        fouls *= config.defenseWeight;
      }
      
      vector.push(fouls);
    }
    
    // DRB (if defensiveReboundWeighting is not 'none')
    if (config.defensiveReboundWeighting !== 'none') {
      let drb = player.def_orb?.value ?? 0; // note: def_orb is actually DRB due to perspective flip
      
      if (includeWeights) {
        drb *= PlayerSimilarityUtils.dynamicRangeWeights.perPossession;
        drb *= PlayerSimilarityUtils.dropdownWeights[config.defensiveReboundWeighting];
        drb *= config.defenseWeight;
      }
      
      vector.push(drb);
    }

    // PLAYER INFO SECTION
    
    // Class (if classWeighting is not 'none')
    if (config.classWeighting !== 'none') {
      let playerClass = PlayerSimilarityUtils.parsePlayerClass(player.roster?.year_class);
      
      if (includeWeights) {
        playerClass *= PlayerSimilarityUtils.dynamicRangeWeights.playerClass;
        playerClass *= PlayerSimilarityUtils.dropdownWeights[config.classWeighting];
        playerClass *= config.playerInfoWeight;
      }
      
      vector.push(playerClass);
    }
    
    // Height (if heightWeighting is not 'none')
    if (config.heightWeighting !== 'none') {
      let height = PlayerSimilarityUtils.parseHeight(player.roster?.height);
      
      if (includeWeights) {
        height *= PlayerSimilarityUtils.dynamicRangeWeights.height;
        height *= PlayerSimilarityUtils.dropdownWeights[config.heightWeighting];
        height *= config.playerInfoWeight;
      }
      
      vector.push(height);
    }
    
    // Minutes (if minutesWeighting is not 'none')
    if (config.minutesWeighting !== 'none') {
      let minutes = player.off_team_poss_pct?.value ?? 0;
      
      if (includeWeights) {
        minutes *= PlayerSimilarityUtils.dynamicRangeWeights.minutes;
        minutes *= PlayerSimilarityUtils.dropdownWeights[config.minutesWeighting];
        minutes *= config.playerInfoWeight;
      }
      
      vector.push(minutes);
    }

    return vector;
  };
}
