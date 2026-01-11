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
    minutes: 0.20 // normalize 1 → 0.20
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
    
    // Vector structure documentation:
    // Indices 0-14: Play styles (possPctUsg values)  
    // Indices 15-29: Scoring efficiency per style
    // Indices 30-32: FG bonus (3P, 2P_mid, 2P_rim)
    // Indices 33: Usage bonus  
    // Indices 34: Defensive skill
    // Indices 35: Stocks
    // Indices 36: Fouls  
    // Indices 37: DRB
    // Indices 38: Class
    // Indices 39: Height  
    // Indices 40: Minutes

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
        
        // Apply dropdown weighting based on specific play type characteristics
        const assistWeight = PlayerSimilarityUtils.dropdownWeights[config.assistWeighting];
        const toWeight = PlayerSimilarityUtils.dropdownWeights[config.turnoverWeighting];
        const orbWeight = PlayerSimilarityUtils.dropdownWeights[config.offensiveReboundWeighting];
        const ftWeight = PlayerSimilarityUtils.dropdownWeights[config.freeThrowWeighting];
        
        // Apply average of applicable weights (simplified for now)
        const avgWeight = (assistWeight + toWeight + orbWeight + ftWeight) / 4;
        raw *= avgWeight;
        
        // Apply component weight
        raw *= config.playStyleWeight;
      }
      
      vector.push(raw);
    }

    // SCORING EFFICIENCY SECTION (indices 20-44) 
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
      
      switch (config.scoringMode) {
        case 'sos-adjusted':
          raw = player.style?.[pt]?.adj_pts?.value ?? 0;
          break;
        case 'raw':
          raw = player.style?.[pt]?.pts?.value ?? 0;
          break;
        case 'relative':
          const pts = player.style?.[pt]?.pts?.value ?? 0;
          raw = weightedAveragePts > 0 ? pts / weightedAveragePts : 0;
          break;
      }
      
      if (includeWeights) {
        // Apply dynamic range normalization
        raw *= PlayerSimilarityUtils.dynamicRangeWeights.scoringEfficiency;
        
        // Apply dropdown weightings
        const gravityWeight = PlayerSimilarityUtils.dropdownWeights[config.offensiveGravityBonus];
        const fgWeight = PlayerSimilarityUtils.dropdownWeights[config.fgBonus];
        const usageWeight = PlayerSimilarityUtils.dropdownWeights[config.usageBonus];
        
        const avgWeight = (gravityWeight + fgWeight + usageWeight) / 3;
        raw *= avgWeight;
        
        // Apply component weight
        raw *= config.scoringEfficiencyWeight;
      }
      
      vector.push(raw);
    }

    // FG BONUS SECTION (indices 45-47)
    const threeP = player.off_3p?.value ?? 0;
    const twoPMid = player.off_2pmid?.value ?? 0;
    const twoPRim = player.off_2prim?.value ?? 0;
    
    for (const fgPct of [threeP, twoPMid, twoPRim]) {
      let raw = fgPct;
      
      if (includeWeights) {
        raw *= PlayerSimilarityUtils.dynamicRangeWeights.fgPercentage;
        raw *= PlayerSimilarityUtils.dropdownWeights[config.fgBonus];
        raw *= config.scoringEfficiencyWeight;
      }
      
      vector.push(raw);
    }

    // USAGE BONUS (index 48)
    const offAdjRapm = (player.off_adj_rapm as Statistic)?.value ?? 0;
    const offAdjRtg = player.off_adj_rtg?.value ?? 0;
    let usageBonus = offAdjRapm - offAdjRtg;
    
    if (includeWeights) {
      usageBonus *= PlayerSimilarityUtils.dynamicRangeWeights.rapm;
      usageBonus *= PlayerSimilarityUtils.dropdownWeights[config.usageBonus];
      usageBonus *= config.scoringEfficiencyWeight;
    }
    
    vector.push(usageBonus);

    // DEFENSE SECTION (indices 49-52)
    
    // Main defensive skill (index 49)
    let defensiveSkill = 0;
    switch (config.defensiveSkill) {
      case 'sos-adjusted':
        defensiveSkill = (player.def_adj_rapm as Statistic)?.value ?? 0;
        break;
      case 'raw':
        // Approximate from team efficiency - simplified
        defensiveSkill = -(player.def_rtg?.value ?? avgEfficiency) + avgEfficiency;
        break;
      case 'relative':
        const defRapm = (player.def_adj_rapm as Statistic)?.value ?? 0;
        const onDefPpp = player.on?.def_adj_ppp?.value ?? avgEfficiency;
        defensiveSkill = defRapm - 0.2 * (onDefPpp - avgEfficiency);
        break;
      case 'none':
        defensiveSkill = 0;
        break;
    }
    
    if (includeWeights) {
      defensiveSkill *= PlayerSimilarityUtils.dynamicRangeWeights.rapm;
      defensiveSkill *= PlayerSimilarityUtils.dropdownWeights[config.defensiveReboundWeighting]; // using as proxy
      defensiveSkill *= config.defenseWeight;
    }
    
    vector.push(defensiveSkill);
    
    // Stocks (index 50)
    const steals = player.def_stl?.value ?? 0;
    const blocks = player.def_blk?.value ?? 0;
    let stocks = (steals + blocks) * 50; // per 50 possessions
    
    if (includeWeights) {
      stocks *= PlayerSimilarityUtils.dynamicRangeWeights.perPossession;
      stocks *= PlayerSimilarityUtils.dropdownWeights[config.stocksWeighting];
      stocks *= config.defenseWeight;
    }
    
    vector.push(stocks);
    
    // Fouls (index 51)
    let fouls = (player.def_foul?.value ?? 0) * 50;
    
    if (includeWeights) {
      fouls *= PlayerSimilarityUtils.dynamicRangeWeights.perPossession;
      fouls *= PlayerSimilarityUtils.dropdownWeights[config.foulsWeighting];
      fouls *= config.defenseWeight;
    }
    
    vector.push(fouls);
    
    // DRB (index 52) - note: def_orb is actually DRB due to perspective flip
    let drb = player.def_orb?.value ?? 0;
    
    if (includeWeights) {
      drb *= PlayerSimilarityUtils.dynamicRangeWeights.perPossession;
      drb *= PlayerSimilarityUtils.dropdownWeights[config.defensiveReboundWeighting];
      drb *= config.defenseWeight;
    }
    
    vector.push(drb);

    // PLAYER INFO SECTION (indices 53-55)
    
    // Class (index 53)
    let playerClass = PlayerSimilarityUtils.parsePlayerClass(player.roster?.year_class);
    
    if (includeWeights) {
      playerClass *= PlayerSimilarityUtils.dynamicRangeWeights.playerClass;
      playerClass *= PlayerSimilarityUtils.dropdownWeights[config.classWeighting];
      playerClass *= config.playerInfoWeight;
    }
    
    vector.push(playerClass);
    
    // Height (index 54)
    let height = PlayerSimilarityUtils.parseHeight(player.roster?.height);
    
    if (includeWeights) {
      height *= PlayerSimilarityUtils.dynamicRangeWeights.height;
      height *= PlayerSimilarityUtils.dropdownWeights[config.heightWeighting];
      height *= config.playerInfoWeight;
    }
    
    vector.push(height);
    
    // Minutes (index 55)
    let minutes = player.off_team_poss_pct?.value ?? 0;
    
    if (includeWeights) {
      minutes *= PlayerSimilarityUtils.dynamicRangeWeights.minutes;
      minutes *= PlayerSimilarityUtils.dropdownWeights[config.minutesWeighting];
      minutes *= config.playerInfoWeight;
    }
    
    vector.push(minutes);

    return vector;
  };
}
