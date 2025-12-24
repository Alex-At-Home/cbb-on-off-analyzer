import { PureStatSet } from "../StatModels";

/** Similar to PlayTypeUtils, contains methods to build statistics that are fairly simple derivations of what the ES response returns  */
export class DerivedStatsUtils {
  static readonly injectExtraDefensiveStats = (
    stat: PureStatSet,
    toMutate: PureStatSet
  ) => {
    ["def", "off"].forEach((offOrDef) => {
      const defNotOff = offOrDef == "off" ? "def" : "off";
      const totalPoss = stat[`total_${offOrDef}_poss`]?.value || 1;
      const total2pAttempts = stat[`total_${offOrDef}_2p_attempts`]?.value || 1;
      const totalStls = stat[`total_${defNotOff}_stl`]?.value || 0; //(confusing! but "total_off" just means _our_ stats)
      const totalBlks = stat[`total_${defNotOff}_blk`]?.value || 0; //(confusing! but "total_off" just means _our_ stats)
      const totalTos = stat[`total_${offOrDef}_to`]?.value || 0;
      const totalNonStlTos = Math.max(0, totalTos - totalStls);

      toMutate[`${offOrDef}_stl`] = { value: totalStls / totalPoss };
      toMutate[`${offOrDef}_blk`] = { value: totalBlks / total2pAttempts };
      toMutate[`${offOrDef}_stk`] = {
        value:
          (0.5 * totalStls) / totalPoss + (0.5 * totalBlks) / total2pAttempts,
      };
      toMutate[`${offOrDef}_to_nonstl`] = { value: totalNonStlTos / totalPoss };
    });
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
    playType: "scramble" | "trans" | "half",
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

  /** Use the scramble / transition totals to build half court ("everything else") totals */
  static readonly buildHalfCourtStats = (
    stat: PureStatSet,
    offDef: "off" | "def",
    toMutate: PureStatSet
  ) => {
    const buildTotal = (statName: string) => {
      return (
        (stat[`total_${offDef}_${statName}`]?.value || 0) -
        (stat[`total_${offDef}_scramble_${statName}`]?.value || 0) -
        (stat[`total_${offDef}_trans_${statName}`]?.value || 0)
      );
    };
    const playType = "half";

    // a play starts half-court OR transition, then is nx (half-court OR scramble)
    // what trans_poss means is % of possessions that _START_ as a transition%
    // what scramble_poss means is approx % of possessions that include a "put-back"
    // (it's only approx because currently it uses the "all" ORB%)

    // As a result you need to build the half court possession stats from scratch:

    const allPlayPoss = stat[`total_${offDef}_poss`]?.value || 0;
    const allPlayPpp = stat[`${offDef}_ppp`]?.value || 0; //TODO: depends on player vs team/lineup

    const totalTos = buildTotal("to");
    const totalFtas = buildTotal("fta");
    const totalFtms = buildTotal("ftm");
    const totalFgas = buildTotal("fga");
    const totalFgms = buildTotal("fgm");
    const total2pms = buildTotal("2p_made");
    const total3pms = buildTotal("3p_made");
    const totalFgMs = totalFgas - totalFgms;

    // See also LineupUtils.recalculatePlayTypePoss
    const defOrbPct = stat[`${offDef}_orb`]?.value || 0;
    const totalPoss =
      totalTos + totalFgms + totalFgMs * (1 - defOrbPct) + totalFtas * 0.475;

    toMutate[`${offDef}_${playType}`] = {
      value: totalPoss / (allPlayPoss || 1),
    };
    toMutate[`total_${offDef}_${playType}_poss`] = { value: totalPoss };
    const halfCourtPpp =
      (100 * (totalFtms + 2 * total2pms + 3 * total3pms)) / (totalPoss || 1);
    toMutate[`${offDef}_${playType}_ppp`] = {
      value: halfCourtPpp,
    };
    toMutate[`${offDef}_${playType}_delta_ppp`] = {
      value: halfCourtPpp - allPlayPpp,
    };

    toMutate[`total_${offDef}_${playType}_to`] = { value: totalTos };
    toMutate[`total_${offDef}_${playType}_fta`] = { value: totalFtas };
    toMutate[`total_${offDef}_${playType}_fga`] = { value: totalFgas };
    toMutate[`total_${offDef}_${playType}_3p`] = { value: buildTotal("3p") };
    toMutate[`total_${offDef}_${playType}_3p_made`] = {
      value: total3pms,
    };
    toMutate[`total_${offDef}_${playType}_3p_attempts`] = {
      value: buildTotal("3p_attempts"),
    };
    toMutate[`total_${offDef}_${playType}_2p_made`] = {
      value: total2pms,
    };
    toMutate[`total_${offDef}_${playType}_2p_attempts`] = {
      value: buildTotal("2p_attempts"),
    };

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

    DerivedStatsUtils.buildHalfCourtStats(stat, "off", toMutate);
    DerivedStatsUtils.buildHalfCourtStats(stat, "def", toMutate);
    DerivedStatsUtils.injectStatBreakdowns(toMutate, "off", "half", toMutate);
    DerivedStatsUtils.injectStatBreakdowns(toMutate, "def", "half", toMutate);

    DerivedStatsUtils.injectPaceStats(stat, toMutate, false);
    return toMutate;
  };
}
