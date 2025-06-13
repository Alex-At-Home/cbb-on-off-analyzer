import { PureStatSet } from "../StatModels";

/** Similar to PlayTypeUtils, contains methods to build statistics that are fairly simple derivations of what the ES response returns  */
export class DerivedStatsUtils {
  static readonly injectExtraDefensiveStats = (
    stat: PureStatSet,
    toMutate: PureStatSet
  ) => {
    const totalPoss = stat[`total_def_poss`]?.value || 1;
    const total2pAttempts = stat[`total_def_2p_attempts`]?.value || 1;
    const totalStls = stat[`total_off_stl`]?.value || 0; //(confusing! but "total_off" just means _our_ stats)
    const totalBlks = stat[`total_off_blk`]?.value || 0; //(confusing! but "total_off" just means _our_ stats)
    const totalTos = stat[`total_def_to`]?.value || 0;
    const totalNonStlTos = Math.max(0, totalTos - totalStls);

    toMutate[`def_stl`] = { value: totalStls / totalPoss };
    toMutate[`def_blk`] = { value: totalBlks / total2pAttempts };
    toMutate[`def_stk`] = {
      value:
        (0.5 * totalStls) / totalPoss + (0.5 * totalBlks) / total2pAttempts,
    };
    toMutate[`def_to_nonstl`] = { value: totalNonStlTos / totalPoss };
  };

  /** "Scramble" (Post ORB) stats - note only valid for team
   * Fields injected (off/def unless specified): _scramble, _scramble_per_orb, _scramble_ppp, _scramble_delta_ppp
   */
  static readonly injectScrambleStats = (
    stat: PureStatSet,
    offDef: "off" | "def",
    toMutate: PureStatSet
  ) => {
    const totalPoss = stat[`total_${offDef}_poss`]?.value || 1;
    const totalOrbs = stat[`total_${offDef}_orb`]?.value || 1;
    const scramblePct =
      (stat[`total_${offDef}_scramble_poss`]?.value || 0) / totalPoss;
    const scrambleOrbRatio =
      (stat[`total_${offDef}_scramble_poss`]?.value || 0) / totalOrbs;
    const totalPpp = stat[`${offDef}_ppp`]?.value || 0; //TODO: depends on player vs team/lineup
    const scramblePpp = stat[`${offDef}_scramble_ppp`]?.value || 0;
    const scramblePppDelta = scramblePpp - totalPpp;

    if (totalPoss > 0) {
      toMutate[`${offDef}_scramble`] = { value: scramblePct };
      toMutate[`${offDef}_scramble_per_orb`] = { value: scrambleOrbRatio };
      toMutate[`${offDef}_scramble_ppp`] = { value: scramblePpp };
      toMutate[`${offDef}_scramble_delta_ppp`] = { value: scramblePppDelta };
    }
    return toMutate;
  };

  /** Transition stats - note only valid for team
   * Fields injected (off/def unless specified): _trans, _trans_ppp, _trans_delta_ppp
   */
  static readonly injectTransitionStats = (
    stat: PureStatSet,
    offDef: "off" | "def",
    toMutate: PureStatSet
  ) => {
    const totalPoss = stat[`total_${offDef}_poss`]?.value || 1;
    const transPct =
      (stat[`total_${offDef}_trans_poss`]?.value || 0) / totalPoss;
    const totalPpp = stat[`${offDef}_ppp`]?.value || 0;
    const transPpp = stat[`${offDef}_trans_ppp`]?.value || 0;
    const transPppDelta = transPpp - totalPpp;

    if (totalPoss > 0) {
      toMutate[`${offDef}_trans`] = { value: transPct };
      toMutate[`${offDef}_trans_ppp`] = { value: transPpp };
      toMutate[`${offDef}_trans_delta_ppp`] = { value: transPppDelta };
    }
    return toMutate;
  };

  /** Injects some 4-8 factor stats for transition and scrambles - note only valid for team
   * Fields injected (off/def unless specified): _${playType}_to, _${playType}_ftr, _${playType}_3pr, _${playType}_3p, _${playType}_2p
   */
  static readonly injectStatBreakdowns = (
    stat: PureStatSet,
    offDef: "off" | "def",
    playType: "scramble" | "trans",
    toMutate: PureStatSet
  ) => {
    const totalPoss = stat[`total_${offDef}_${playType}_poss`]?.value || 0;
    const toPct =
      (stat[`total_${offDef}_${playType}_to`]?.value || 0) / (totalPoss || 1);
    const fga = stat[`total_${offDef}_${playType}_fga`]?.value || 0;
    const ftr =
      (stat[`total_${offDef}_${playType}_fta`]?.value || 0) / (fga || 1);
    const threePtA =
      stat[`total_${offDef}_${playType}_3p_attempts`]?.value || 0;
    const threePtR = threePtA / (fga || 1);
    const threePct =
      (stat[`total_${offDef}_${playType}_3p_made`]?.value || 0) /
      (threePtA || 1);
    const twoPct =
      (stat[`total_${offDef}_${playType}_2p_made`]?.value || 0) /
      (stat[`total_${offDef}_${playType}_2p_attempts`]?.value || 1);

    if (totalPoss > 0) {
      toMutate[`${offDef}_${playType}_to`] = { value: toPct };
      toMutate[`${offDef}_${playType}_ftr`] = { value: ftr };
      toMutate[`${offDef}_${playType}_3pr`] = { value: threePtR };
      toMutate[`${offDef}_${playType}_3p`] = { value: threePct };
      toMutate[`${offDef}_${playType}_2p`] = { value: twoPct };
    }
    return toMutate;
  };

  /** Unadjusted pace of play - valid for player or team
   * Fields injected: tempo
   */
  static readonly injectPaceStats = (
    stat: PureStatSet,
    toMutate: PureStatSet,
    isPlayer: Boolean
  ) => {
    const totalOffPoss =
      (isPlayer ? stat[`off_team_poss`]?.value : stat[`off_poss`]?.value) || 0;
    const totalDefPoss =
      (isPlayer ? totalOffPoss : stat[`def_poss`]?.value) || 0;
    const totalTime = stat[`duration_mins`]?.value || 0;
    const possPer40 = (0.5 * (totalOffPoss + totalDefPoss)) / (totalTime / 40);
    if (totalTime) {
      toMutate[`tempo`] = { value: possPer40 };
    }
    return toMutate;
  };

  /** Injects all the derived stats in one go */
  static readonly injectTeamDerivedStats = (
    stat: PureStatSet,
    toMutate: PureStatSet
  ) => {
    DerivedStatsUtils.injectExtraDefensiveStats(stat, toMutate);
    DerivedStatsUtils.injectScrambleStats(stat, "off", toMutate);
    DerivedStatsUtils.injectScrambleStats(stat, "def", toMutate);
    DerivedStatsUtils.injectStatBreakdowns(stat, "off", "scramble", toMutate);
    DerivedStatsUtils.injectStatBreakdowns(stat, "def", "scramble", toMutate);
    DerivedStatsUtils.injectTransitionStats(stat, "off", toMutate);
    DerivedStatsUtils.injectTransitionStats(stat, "def", toMutate);
    DerivedStatsUtils.injectStatBreakdowns(stat, "off", "trans", toMutate);
    DerivedStatsUtils.injectStatBreakdowns(stat, "def", "trans", toMutate);
    DerivedStatsUtils.injectPaceStats(stat, toMutate, false);
    return toMutate;
  };
}
