import { IndivCareerStatSet } from "../StatModels";
import { PlayTypeUtils, TopLevelIndivPlayType } from "./PlayTypeUtils";

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

  /** For use with playerSimilarityQueryTemplate */
  static readonly buildPlayerSimilarityVector = (
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
}
