import _ from "lodash";

import { OverrideUtils } from "./OverrideUtils";
import {
  PlayerId,
  Statistic,
  TeamStatSet,
  LineupStatSet,
  IndivStatSet,
} from "../StatModels";
import { ManualOverride } from "../FilterModels";

/** Whether to calculate the luck adjustment over the baseline or the entire season
    Baseline will be subject to more noise but enables luck to be reduced in cases
    where you suspect the baseline is more representative (eg injuries)
*/
export type LuckAdjustmentBaseline = "baseline" | "season";

/** A breakdown of the context of shots */
export type OffShotInfoBreakdown = {
  shot_info_ast_made: number;
  shot_info_early_attempts: number;
  shot_info_scramble_attempts: number;
  shot_info_unast_made: number;
  shot_info_unknown_missed: number;
  shot_info_total_attempts: number;
};

/** A breakdown of the estimated unassisted/assisted FG rates */
export type OffAdjShotBreakdown = {
  base: number;
  unassisted: number;
  assisted: number;
  baseAssistPct: number;
  expected?: number;
};

/** OffShotInfoBreakdown but for 3P only - retained for bwc */
export type OffLuckShotInfo3P = {
  shot_info_ast_3pm: number;
  shot_info_early_3pa: number;
  shot_info_scramble_3pa: number;
  shot_info_unast_3pm: number;
  shot_info_unknown_3pM: number;
  shot_info_total_3p: number;
};

/** OffAdjShotBreakdown but for 3P only - retained for bwc */
export type OffLuckAdj3P = {
  base3P: number;
  unassisted3P: number;
  assisted3P: number;
  expected3P?: number;
  baseAssistPct: number;
};

export type OffLuckShotTypeAndAdj3P = OffLuckShotInfo3P & OffLuckAdj3P;

/** Holds all the info required to calculate and explain the delta when luck is regressed away */
export type OffLuckAdjustmentDiags = {
  avgEff: number;
  samplePoss: number;
  sample3P: number;
  sample3PA: number;
  base3PA: number;
  player3PInfo: Record<string, OffLuckShotTypeAndAdj3P>;
  sampleBase3P: number;
  regress3P: number;

  // Effects:
  sampleOff3PRate: number;
  sampleOffFGA: number;
  sampleOffOrb: number;

  sampleOffEfg: number;
  sampleOffPpp: number;
  sampleDefSos: number;

  delta3P: number;
  deltaOffEfg: number;
  deltaMissesPct: number;
  deltaOffPppNoOrb: number;

  deltaOffOrbFactor: number;
  deltaPtsOffMisses: number;
  deltaOffPpp: number;
  deltaOffAdjEff: number;
};

/** Holds all the info required to calculate and explain the delta when luck is regressed away */
export type DefLuckAdjustmentDiags = {
  avgEff: number;
  /** The % of the delta between 3PD and 3P SoS  that is luck */
  luckPct: number;

  /** Opponents' 3P% against the team */
  baseDef3P: number;
  /** Opponents' 3P% over the season */
  baseDef3PSos: number;
  baseDef3PA: number;
  basePoss: number;
  /** The ability of the team to adjust the opponents' 3P% over the season */
  base3PSosAdj: number;

  // Same stats but over the sample in question: on/off/baseline
  sampleDef3P: number;
  sampleDef3PSos: number;
  sampleDef3PA: number;
  samplePoss: number;
  sample3PSosAdj: number;

  // (We'll need these stats later)
  sampleDefEfg: number;
  sampleDefPpp: number;
  sampleOffSos: number;
  sampleDef3PRate: number;
  sampleDefFGA: number;
  sampleDefOrb: number;

  /** The weighted sum of the two 3PD adjustments */
  avg3PSosAdj: number;
  /** The final number */
  adjDef3P: number;

  // The effect:
  delta3P: number;
  deltaDefEfg: number;
  /** The delta in raw Pts/100 not including the ORB change */
  deltaDefPppNoOrb: number;
  deltaMissesPct: number;
  deltaDefOrbFactor: number;
  deltaPtsOffMisses: number;
  deltaDefPpp: number;
  deltaDefAdjEff: number;
};

/** Contains logic to help other stats modules adjust for luck */
export class LuckUtils {
  //TODO(ish): LuckUtils for lineups are a bit weird. The problem is that if you regress each lineup as if you
  // were regressing a query set, then the weighted average of the lineups' regressed 3P values are _super regressed_
  // (eg 100x 1 3PA lineups vs 1000 3PA base set - if you regress each lineup 1 vs 1000, the weighted av is also 1 vs 1000)
  // Therefore every lineup is regressed as if it has the sample size of the query set
  //
  // (An alternative would be to use the "filtered total" instead of the query set ... that would be rather weird
  //  because the lineup stats would change as you changed the filter on the fly)

  static readonly lineupShotInfoFields = [
    "ast_3pm",
    "unast_3pm",
    "early_3pa",
    "unknown_3pM",
  ];
  static readonly lineupAggregatedShotInfoFields =
    LuckUtils.lineupShotInfoFields
      .concat(["scramble_3pa"])
      .map((i) => `shot_info_${i}`);

  /** Set of all the fields that are affected by luck adjustments */
  static readonly affectedFieldSet = new Set([
    "off_adj_ppp",
    "off_ppp",
    "off_efg",
    "off_3p",
    "def_adj_ppp",
    "def_ppp",
    "def_efg",
    "def_3p",
    "oppo_def_3p",
  ]);
  /** List of the partial fieldnames affected by luck adjustments */
  static readonly affectedPartialFieldnames = ["adj_ppp", "ppp", "efg", "3p"];

  /** Calculate the offensive luck adjustment for a player */
  static readonly calcOffPlayerLuckAdj = (
    samplePlayer: IndivStatSet,
    basePlayer: IndivStatSet,
    avgEff: number
  ) => {
    // The team calc basically works fine here, apart from ORBs, which we'll ignore
    return LuckUtils.calcOffTeamLuckAdj(
      samplePlayer,
      [samplePlayer],
      basePlayer,
      { [basePlayer.key]: basePlayer },
      avgEff
    );
  };

  /** Calculate the offensive luck adjustment for a team ...samplePlayers==players.map(_.on/off/baseline) */
  static readonly calcOffTeamLuckAdj = (
    sampleTeam: TeamStatSet | LineupStatSet | IndivStatSet,
    samplePlayers: Array<IndivStatSet>,
    baseTeam: TeamStatSet | LineupStatSet | IndivStatSet,
    basePlayersMap: Record<PlayerId, IndivStatSet>,
    avgEff: number,
    sample3PAOverride?: number,
    manualOverrides?: ManualOverride[]
    //(when calc'ing luck on lineups, each lineup gets the total sample as its regression so its average is right over the set)
  ) => {
    const manual3pPct = _.chain(manualOverrides || [])
      .filter((row) => row.statName == "off_3p")
      .map((row) => {
        return [row.rowId, row.newVal] as [string, number];
      })
      .fromPairs()
      .value();

    // Number of 3P shots taken in sample

    const samplePoss = LuckUtils.get(sampleTeam?.off_poss, 0);
    const sample3P = LuckUtils.get(sampleTeam?.off_3p, 0);
    const sample3PA = !_.isNil(sample3PAOverride)
      ? sample3PAOverride
      : LuckUtils.get(sampleTeam?.total_off_3p_attempts, 0);
    const base3PA = LuckUtils.get(baseTeam?.total_off_3p_attempts, 0);

    // Loop over sample roster - lookup into base to get 3PA shots 3P%

    // If we don't have roster but we do have lineup shot info then use that instead
    const deserializeLineupSum = (n: Statistic | undefined) => {
      return {
        value: [0, 1, 2, 3, 4].map((index) => {
          return ((n?.value || 0) / Math.pow(2, 10 * index)) & 0x3ff;
        }),
      };
    };
    const playerShotInfo = _.transform(
      LuckUtils.lineupAggregatedShotInfoFields,
      (acc, field) => {
        if (sampleTeam[field]) {
          const toAdd = deserializeLineupSum(sampleTeam[field]); //(exists and is >0)
          acc[field] = toAdd.value;
          acc.total = _.zipWith(
            toAdd.value,
            acc.total as number[],
            (a, b) => a + b
          );
          acc.hasLineupInfo =
            acc.hasLineupInfo || (sampleTeam[field].value || 0) > 0;
        }
      },
      { hasLineupInfo: false, total: [0, 0, 0, 0, 0] } as Record<string, any>
    );

    var varTotal3PA = 0.0;
    var varTotal3P = 0.0;

    const buildShotLineupInfo = (
      basePlayerStats: IndivStatSet,
      index: number,
      baseShotInfo: OffLuckShotInfo3P
    ) => {
      return _.transform(
        LuckUtils.lineupAggregatedShotInfoFields,
        (acc, field) => {
          acc[field] = playerShotInfo?.[field]?.[index] || 0;
        },
        {
          shot_info_total_3p: playerShotInfo.total[index] || 0,
          ...LuckUtils.buildAdjusted3P(basePlayerStats, baseShotInfo),
        } as Record<string, number>
      );
    };
    const player3PInfo = _.chain(samplePlayers)
      .flatMap((player: IndivStatSet, index: number) => {
        const basePlayerStats = basePlayersMap[player.key];
        const baseShotInfo = LuckUtils.build3PShotInfo(
          basePlayersMap[player.key] || player
        ); //(to calc buildAdjusted3P)
        const playerInfo = (
          index < 5 && playerShotInfo.hasLineupInfo && basePlayerStats
            ? {
                ...buildShotLineupInfo(basePlayerStats, index, baseShotInfo),
              }
            : {
                ...LuckUtils.build3PShotInfo(player),
                ...LuckUtils.buildAdjusted3P(
                  basePlayerStats || {},
                  baseShotInfo
                ),
              }
        ) as OffLuckShotTypeAndAdj3P;

        if (playerInfo) {
          //(we use the sample size but the expected 3P% based on base3P% and sample distribution)
          varTotal3PA += playerInfo.shot_info_total_3p;

          const manual3pOver = manual3pPct[player.key];
          if (_.isNil(manual3pOver)) {
            const totalTimes3P = LuckUtils.buildExp3P(playerInfo);
            playerInfo.expected3P =
              totalTimes3P / (playerInfo.shot_info_total_3p || 1);
            varTotal3P += totalTimes3P;
          } else {
            // Use the manual override (eg player's career stats as their expected shooting %)
            playerInfo.expected3P = manual3pOver;
            varTotal3P += playerInfo.shot_info_total_3p * manual3pOver;
          }

          return playerInfo.shot_info_total_3p > 0 //(don't bother with any players who didn't take a 3P shot)
            ? [[player.key, playerInfo]]
            : [];
        } else {
          return []; //(player not in this lineup)
        }
      })
      .sortBy((pV: any[]) => -1 * (pV?.[1]?.shot_info_total_3p || 0))
      .fromPairs()
      .value();

    // Calculate average weight of 3P% weighted by 3PA

    const sampleBase3P = varTotal3P / (varTotal3PA || 1);

    // Regress vs actual 3P%

    const total3PA = sample3PA + base3PA || 1;
    const regress3P =
      (sampleBase3P * base3PA + sample3P * sample3PA) / total3PA;

    // Calculate effects similarly to calcDefTeamLuckAdj
    const sampleOff3PRate = LuckUtils.get(sampleTeam?.off_3pr, 0);
    const sampleOffFGA =
      LuckUtils.get(sampleTeam?.total_off_2p_attempts, 0) +
      LuckUtils.get(sampleTeam?.total_off_3p_attempts, 0);
    const sampleOffFTA = LuckUtils.get(sampleTeam?.total_off_fta, 0);
    const rawSampleOffOrb = LuckUtils.get(sampleTeam?.off_orb, 0);
    const sampleOffOrb = rawSampleOffOrb > 0.66 ? 0.66 : rawSampleOffOrb;

    const sampleOffEfg = LuckUtils.get(sampleTeam?.off_efg, 0);
    const sampleOffPpp = LuckUtils.get(sampleTeam?.off_ppp, 0);
    const sampleDefSos = LuckUtils.get(sampleTeam?.def_adj_opp, 0);

    // Team only (check on manual overrides which is unset for player by construction)
    const adjustedTO = sampleTeam.off_to?.value || 0;
    const deltaTO = manualOverrides
      ? adjustedTO - (sampleTeam.off_to?.old_value || adjustedTO)
      : 0;

    // Team only (check on manual overrides which is unset for player by construction)
    const adjusted2P = sampleTeam.off_2p?.value || 0; //(to start with use the raw value post manual adjustments)
    const delta2P = manualOverrides
      ? adjusted2P - (sampleTeam.off_2p?.old_value || adjusted2P)
      : 0;

    // Team only (check on manual overrides which is unset for player by construction)
    const adjustedFT = sampleTeam.off_ft?.value || 0;
    const deltaFT = manualOverrides
      ? adjustedFT - (sampleTeam.off_ft?.old_value || adjustedFT)
      : 0;

    const delta3P = regress3P - sample3P;
    const deltaOffEfg =
      1.5 * delta3P * sampleOff3PRate + delta2P * (1 - sampleOff3PRate);
    const deltaMissesPct =
      -1 * (delta3P * sampleOff3PRate + delta2P * (1 - sampleOff3PRate));
    const deltaOffPppNoOrb =
      (200 * deltaOffEfg * sampleOffFGA + 100 * deltaFT * sampleOffFTA) /
      (samplePoss || 1);
    // pts_off_misses = delta_misses*ORB*(ppp_no_orb + pts_off_misses)
    // ie pts_off_misses = delta_misses*ORB*ppp_no_orb/(1 - delta_misses*ORB)
    const deltaOffOrbFactor =
      (deltaMissesPct * sampleOffOrb) / (1 - deltaMissesPct * sampleOffOrb);
    const deltaPtsOffMisses =
      deltaOffOrbFactor * (sampleOffPpp + deltaOffPppNoOrb);
    const deltaOffPppPreTo = deltaOffPppNoOrb + deltaPtsOffMisses;
    const deltaPtsLostFromTos =
      deltaTO * ((sampleTeam.off_ppp?.value || 0) + deltaOffPppPreTo);
    const deltaOffPpp = deltaOffPppPreTo - deltaPtsLostFromTos;
    const deltaOffAdjEff = (deltaOffPpp * avgEff) / (sampleDefSos || 1);

    return {
      avgEff,
      samplePoss,
      sample3P,
      sample3PA,
      base3PA,
      player3PInfo,
      sampleBase3P,
      regress3P,

      sampleOff3PRate,
      sampleOffFGA,
      sampleOffOrb,
      sampleOffEfg,
      sampleOffPpp,
      sampleDefSos,

      delta3P,
      deltaOffEfg,
      deltaMissesPct,
      deltaOffPppNoOrb,

      deltaOffOrbFactor,
      deltaPtsOffMisses,
      deltaOffPpp,
      deltaOffAdjEff,
    } as OffLuckAdjustmentDiags;
  };

  /** Calculate the defensive luck adjustment for a player */
  static readonly calcDefPlayerLuckAdj = (
    sample: IndivStatSet,
    base: IndivStatSet,
    avgEff: number
  ) => {
    const translate = (statSet: IndivStatSet) => {
      return {
        key: sample.key,
        def_3p: {
          value:
            (statSet.oppo_total_def_3p_made?.value || 0) /
            (statSet.oppo_total_def_3p_attempts?.value || 1),
        },
        def_3p_opp: statSet.oppo_def_3p_opp,
        def_poss: statSet.oppo_total_def_poss,
        total_def_3p_attempts: statSet.oppo_total_def_3p_attempts,
      } as IndivStatSet;
    };
    // We really just want the 3P delta:
    return LuckUtils.calcDefTeamLuckAdj(
      translate(sample),
      translate(base),
      avgEff
    );
  };

  /** Calculate the defensive luck adjustment for a team */
  static readonly calcDefTeamLuckAdj = (
    sample: IndivStatSet | TeamStatSet | LineupStatSet,
    base: IndivStatSet | TeamStatSet | LineupStatSet,
    avgEff: number,
    sampleDef3PAOverride?: number
    //(when calc'ing luck on lineups, each lineup gets the total sample as its regression so its average is right over the set)
  ) => {
    const get = (maybeOld: any, fallback: number) => {
      // Uses the non-adjusted luck number if present
      return (
        (_.isNil(maybeOld?.old_value)
          ? maybeOld?.value
          : maybeOld?.old_value) || fallback
      );
    };
    const luckPct = 0.66;

    //TODO: if we don't have 3PSos then just regress
    //TODO: also add a test for this case

    const baseDef3P = get(base?.def_3p, 0);
    const baseDef3PSos = _.isNil(base?.def_3p_opp?.value)
      ? baseDef3P
      : 0.01 * get(base?.def_3p_opp, 0); //(normalize to %)
    const basePoss = get(base?.def_poss, 0);
    const baseDef3PA = get(base?.total_def_3p_attempts, 0);
    const base3PSosAdj = (1 - luckPct) * (baseDef3P - baseDef3PSos);

    const sampleDef3P = get(sample?.def_3p, 0);
    const sampleDef3PSos = _.isNil(sample?.def_3p_opp?.value)
      ? sampleDef3P
      : 0.01 * get(sample?.def_3p_opp, 0); //(normalize to %)
    const samplePoss = get(sample?.def_poss, 0);
    const sample3PSosAdj = (1 - luckPct) * (sampleDef3P - sampleDef3PSos);

    const sampleDefEfg = get(sample?.def_efg, 0);
    const sampleDefPpp = get(sample?.def_ppp, 0);
    const sampleOffSos = get(sample?.off_adj_opp, 0);
    const sampleDef3PA = !_.isNil(sampleDef3PAOverride)
      ? sampleDef3PAOverride
      : get(sample?.total_def_3p_attempts, 0);

    const avg3PSosAdj =
      (sampleDef3PA * sample3PSosAdj + baseDef3PA * base3PSosAdj) /
      (sampleDef3PA + baseDef3PA || 1);
    const adjDef3P = sampleDef3PSos + avg3PSosAdj;

    const sampleDef3PRate = get(sample?.def_3pr, 0);
    const sampleDefFGA =
      get(sample?.total_def_2p_attempts, 0) +
      get(sample?.total_def_3p_attempts, 0);
    const rawSampleDefOrb = get(sample?.def_orb, 0);
    const sampleDefOrb = rawSampleDefOrb > 0.66 ? 0.66 : rawSampleDefOrb;

    const delta3P = adjDef3P - sampleDef3P;
    const deltaDefEfg = 1.5 * delta3P * sampleDef3PRate;
    const deltaMissesPct = -1 * delta3P * sampleDef3PRate;
    const deltaDefPppNoOrb =
      (200 * deltaDefEfg * sampleDefFGA) / (samplePoss || 1);
    // pts_off_misses = delta_misses*ORB*(ppp_no_orb + pts_off_misses)
    // ie pts_off_misses = delta_misses*ORB*ppp_no_orb/(1 - delta_misses*ORB)
    const deltaDefOrbFactor =
      (deltaMissesPct * sampleDefOrb) / (1 - deltaMissesPct * sampleDefOrb);
    const deltaPtsOffMisses =
      deltaDefOrbFactor * (sampleDefPpp + deltaDefPppNoOrb);
    const deltaDefPpp = deltaDefPppNoOrb + deltaPtsOffMisses;
    const deltaDefAdjEff = (deltaDefPpp * avgEff) / (sampleOffSos || 1);

    return {
      avgEff,
      luckPct,
      baseDef3P,
      baseDef3PSos,
      baseDef3PA,
      basePoss,
      base3PSosAdj,

      sampleDef3P,
      sampleDef3PSos,
      sampleDef3PA,
      samplePoss,
      sample3PSosAdj,

      sampleDefEfg,
      sampleDefPpp,
      sampleOffSos,
      sampleDef3PRate,
      sampleDefFGA,
      sampleDefOrb,

      avg3PSosAdj,
      adjDef3P,

      delta3P,
      deltaDefEfg,
      deltaDefPppNoOrb,
      deltaMissesPct,
      deltaDefOrbFactor,
      deltaPtsOffMisses,
      deltaDefPpp,
      deltaDefAdjEff,
    } as DefLuckAdjustmentDiags;
  };

  /** Mutates (in a reversible way) the team stats with luck adjustments */
  static readonly injectLuck = (
    mutableStats: TeamStatSet | IndivStatSet | LineupStatSet,
    offLuck: OffLuckAdjustmentDiags | undefined,
    defLuck: DefLuckAdjustmentDiags | undefined
  ) => {
    /** Builds a delta object */
    const maybeDelta = (val: number | undefined) =>
      _.isNil(val) ? undefined : { delta: val };

    // Offense - 3P

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "off_3p",
      maybeDelta(offLuck?.delta3P),
      "Luck adjusted"
    );

    // Offense - derived 4 factors and efficiency

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "off_efg",
      maybeDelta(offLuck?.deltaOffEfg),
      "Adjusted from Off 3P%"
    );

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "off_ppp",
      maybeDelta(offLuck?.deltaOffPpp),
      "Adjusted from Off 3P%"
    );

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "off_adj_ppp",
      maybeDelta(offLuck?.deltaOffAdjEff),
      "Adjusted from Off 3P%"
    );

    // Defense - 3P

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "def_3p",
      defLuck?.adjDef3P,
      "Luck adjusted"
    );

    // Defense - derived 4 factors and efficiency

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "def_efg",
      maybeDelta(defLuck?.deltaDefEfg),
      "Adjusted from Def 3P%"
    );

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "def_ppp",
      maybeDelta(defLuck?.deltaDefPpp),
      "Adjusted from Def 3P%"
    );

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "def_adj_ppp",
      maybeDelta(defLuck?.deltaDefAdjEff),
      "Adjusted from Def 3P%"
    );

    // Player defense

    if (mutableStats.oppo_total_def_3p_made) {
      //(use this to tell us if it's a player stat not a team one)
      // Don't have oppo_3p_def so we'll calculate it every time
      // (and pretend it was a raw value from the query)
      mutableStats.oppo_def_3p = {
        value:
          (mutableStats.oppo_total_def_3p_made?.value || 0) /
          (mutableStats.oppo_total_def_3p_attempts?.value || 1),
      };
      OverrideUtils.overrideMutableVal(
        mutableStats,
        "oppo_def_3p",
        defLuck?.adjDef3P,
        "Luck adjusted"
      );
    }

    // Net

    const pppAdjMargin =
      _.isNil(defLuck?.deltaDefAdjEff) && _.isNil(offLuck?.deltaOffAdjEff)
        ? undefined
        : (offLuck?.deltaOffAdjEff || 0) - (defLuck?.deltaDefAdjEff || 0);

    const pppMargin =
      _.isNil(defLuck?.deltaDefPpp) && _.isNil(offLuck?.deltaOffPpp)
        ? undefined
        : (offLuck?.deltaOffPpp || 0) - (defLuck?.deltaDefPpp || 0);

    OverrideUtils.overrideMutableVal(
      mutableStats,
      "off_net",
      maybeDelta(pppAdjMargin),
      "Adjusted from Off 3P% and Def 3P%"
    );
    OverrideUtils.overrideMutableVal(
      mutableStats,
      "off_raw_net",
      maybeDelta(pppMargin),
      "Adjusted from Off 3P% and Def 3P%"
    );
  };

  // Some utils

  /** Util - Uses the non-adjusted luck number if present */
  static readonly get = (maybeOld: Statistic, fallback: number) => {
    return (
      (_.isNil(maybeOld?.old_value) ? maybeOld?.value : maybeOld?.old_value) ||
      fallback
    );
  };

  /** Builds the different shot types when you don't have the lineup info
   * If used for luck call with separateHalfCourt=true ("the fact it's an assist is more important than scramble/half court")
   * If used for play type decomp call with separateHalfCourt=true ("the fact it's scramble/trans is more important than it's assisted")
   * ^ Note this isn't ideal because the FG% split is that for scramble it's some combo of (ast and base) > half-court
   * which is a mix of (ast and unast) .. but the diff in half court FG% split shouldn't be that important
   * (But that's why we call it with false for the luck adjustment!)
   */
  static readonly buildShotInfo = (
    p: IndivStatSet,
    shotType: "3p" | "2pmid" | "2prim",
    separateHalfCourt: boolean = false //(if set to true then keeps assists in their trans/scramble bin)
  ) => {
    const shot_info_ast_trans_made =
      p[`total_off_trans_${shotType}_ast`]?.value || 0; //(includes some early shots)
    const shot_info_unast_trans_made = Math.max(
      (p[`total_off_trans_${shotType}_made`]?.value || 0) -
        shot_info_ast_trans_made,
      0
    );
    const shot_info_early_attempts = Math.max(
      (p[`total_off_trans_${shotType}_attempts`]?.value || 0) -
        (separateHalfCourt ? 0 : shot_info_ast_trans_made),
      0
    );

    const shot_info_ast_scramble_made =
      p[`total_off_scramble_${shotType}_ast`]?.value || 0; //(includes some scramble shots)
    const shot_info_unast_scramble_made = Math.max(
      (p[`total_off_scramble_${shotType}_made`]?.value || 0) -
        shot_info_ast_scramble_made,
      0
    );
    const shot_info_scramble_attempts = Math.max(
      (p[`total_off_scramble_${shotType}_attempts`]?.value || 0) -
        (separateHalfCourt ? 0 : shot_info_ast_scramble_made),
      0
    );
    //(this includes assisted transition and scramble shots, unless specified otherwise)
    const shot_info_ast_made =
      (p[`total_off_${shotType}_ast`]?.value || 0) -
      (separateHalfCourt
        ? shot_info_ast_trans_made + shot_info_ast_scramble_made
        : 0);

    const shot_info_unast_made = Math.max(
      (p[`total_off_${shotType}_made`]?.value || 0) - //all makes
        (separateHalfCourt
          ? shot_info_ast_made +
            shot_info_ast_trans_made +
            shot_info_ast_scramble_made +
            shot_info_unast_trans_made + //(in this case sub-tract these to make it HC unast made only)
            shot_info_unast_scramble_made
          : shot_info_ast_made + //(in this case, ast_made includes HC/scramble/trans)
            shot_info_unast_trans_made +
            shot_info_unast_scramble_made),
      0
    );

    const shot_info_total_attempts =
      p[`total_off_${shotType}_attempts`]?.value || 0;
    const shot_info_unknown_missed = Math.max(
      0,
      shot_info_total_attempts -
        shot_info_ast_made -
        shot_info_early_attempts -
        shot_info_scramble_attempts -
        shot_info_unast_made
    );
    return {
      shot_info_ast_made,
      shot_info_early_attempts,
      shot_info_scramble_attempts,
      shot_info_unast_made,
      shot_info_unknown_missed,
      shot_info_total_attempts,
    } as OffShotInfoBreakdown;
  };

  /** Builds the different shot types when you don't have the lineup info */
  static readonly build3PShotInfo = (p: IndivStatSet) => {
    const {
      shot_info_ast_made,
      shot_info_early_attempts,
      shot_info_scramble_attempts,
      shot_info_unast_made,
      shot_info_unknown_missed,
      shot_info_total_attempts,
    } = LuckUtils.buildShotInfo(p, "3p");

    return {
      shot_info_ast_3pm: shot_info_ast_made,
      shot_info_early_3pa: shot_info_early_attempts,
      shot_info_scramble_3pa: shot_info_scramble_attempts,
      shot_info_unast_3pm: shot_info_unast_made,
      shot_info_unknown_3pM: shot_info_unknown_missed,
      shot_info_total_3p: shot_info_total_attempts,
    } as OffLuckShotInfo3P;
  };
  /** Calculates approx unassisted/assisted FG% - if you think sample size is small, use regressNumber say 20 */
  static readonly buildAdjustedFG = (
    p: IndivStatSet,
    baseShotInfo: OffShotInfoBreakdown,
    shotType: "3p" | "2pmid" | "2prim",
    regressNumber: number = 0
  ) => {
    const basePre = LuckUtils.get(p?.[`off_${shotType}`], 0);

    // Ideally can't use off_3p_ast because some of the transition 3PAs are unassisted makes, so we just use non-early ast%
    const fallbackBaseAssistPctPre = LuckUtils.get(
      p?.[`off_${shotType}_ast`],
      0.0
    );

    const fallbackBaseAssistPct =
      fallbackBaseAssistPctPre == 0.0 && basePre <= 0.2
        ? shotType == "3p"
          ? 1.0
          : 0.5
        : fallbackBaseAssistPctPre;
    //(fallback is that they only take assisted 3P shots, because they are bad!)

    const madeThisSample =
      baseShotInfo.shot_info_ast_made + baseShotInfo.shot_info_unast_made;
    const baseAssistPct =
      madeThisSample > 0
        ? baseShotInfo.shot_info_ast_made / (madeThisSample || 1)
        : fallbackBaseAssistPct;

    const totalShotsTaken = baseShotInfo.shot_info_total_attempts;
    const regressionPct =
      shotType == "3p" ? 0.3 : shotType == "2pmid" ? 0.35 : 0.5;
    const regressWeight =
      regressNumber / (totalShotsTaken + regressNumber || 1);

    const base =
      totalShotsTaken < regressNumber
        ? regressWeight * regressionPct + (1.0 - regressWeight) * basePre
        : basePre;

    const weight = shotType == "3p" ? 0.06 : 0.1; // (totally arbitrary)
    return {
      base,
      unassisted: base - baseAssistPct * weight,
      assisted: base + (1 - baseAssistPct) * weight,
      baseAssistPct,
    } as OffAdjShotBreakdown;
  };
  /** Calculates approx unassisted/assisted 3P (p and baseShotInfo should be based on the biggest sample available, normally NOT the sample)
   * Note this is just a special case of buildAdjustedFG retained for bwc compat
   */
  static readonly buildAdjusted3P = (
    p: IndivStatSet,
    info: OffLuckShotInfo3P
  ) => {
    const adjustedShotInfo = LuckUtils.buildAdjustedFG(
      p,
      {
        shot_info_ast_made: info.shot_info_ast_3pm,
        shot_info_early_attempts: info.shot_info_early_3pa,
        shot_info_scramble_attempts: info.shot_info_scramble_3pa,
        shot_info_unast_made: info.shot_info_unast_3pm,
        shot_info_unknown_missed: info.shot_info_unknown_3pM,
        shot_info_total_attempts: info.shot_info_total_3p,
      },
      "3p"
    );

    return {
      base3P: adjustedShotInfo.base,
      unassisted3P: adjustedShotInfo.unassisted,
      assisted3P: adjustedShotInfo.assisted,
      baseAssistPct: adjustedShotInfo.baseAssistPct,
    } as OffLuckAdj3P;
  };

  /** Returns (3P%*total 3P) */
  static readonly buildExp3P = (info: OffLuckShotTypeAndAdj3P) => {
    return (
      info.shot_info_ast_3pm * info.assisted3P +
      info.shot_info_unast_3pm * info.unassisted3P +
      (info.shot_info_early_3pa +
        info.shot_info_scramble_3pa +
        info.shot_info_unknown_3pM) *
        info.base3P
    );
  };

  /** Splits unknown misses into an estimate of whether they would have been ast or unast if they'd been scores */
  static readonly decomposeUnknownMisses = (
    shotCounts: OffShotInfoBreakdown,
    fgBreakdown: OffAdjShotBreakdown
  ): { fgM_ast: number; fgM_unast: number } => {
    // Pick decomposition based on what types of shot were made:
    //TODO: still not great, eg take the case where all my makes are assisted
    // it will likely say all misses were assisted also (makes/33% > misses)
    //TODO: plus using diff logic like this means you don't get remotely the same number
    // when switching betweens season average and average of all games
    if (
      shotCounts.shot_info_unast_made > 0 &&
      shotCounts.shot_info_ast_made > 0
    ) {
      const fgM_unast =
        shotCounts.shot_info_unast_made *
        (1 / (fgBreakdown.unassisted || 1) - 1.0);

      const fgM_ast =
        shotCounts.shot_info_ast_made * (1 / (fgBreakdown.assisted || 1) - 1.0);

      const astWeights = fgM_ast / (fgM_ast + fgM_unast);

      return {
        fgM_ast: shotCounts.shot_info_unknown_missed * astWeights,
        fgM_unast: shotCounts.shot_info_unknown_missed * (1.0 - astWeights),
      };
    } else if (shotCounts.shot_info_unast_made > 0) {
      const fgM_unast = Math.min(
        shotCounts.shot_info_unknown_missed,
        shotCounts.shot_info_unast_made *
          (1 / (fgBreakdown.unassisted || 1) - 1.0)
      );
      const fgM_ast = Math.max(
        0,
        shotCounts.shot_info_unknown_missed - fgM_unast
      );
      return { fgM_ast, fgM_unast };
    } else if (shotCounts.shot_info_ast_made > 0) {
      const fgM_ast = Math.min(
        shotCounts.shot_info_unknown_missed,
        shotCounts.shot_info_ast_made * (1 / (fgBreakdown.assisted || 1) - 1.0)
      );
      const fgM_unast = Math.max(
        0,
        shotCounts.shot_info_unknown_missed - fgM_ast
      );
      return { fgM_ast, fgM_unast };
    } else {
      const fudgeFactor = 1.1; //(seem to over-estimate assisted shots in this clause)

      const astWeights = //(if my assisted FG% is higher, I expected _fewer_ assisted misses)
        (fgBreakdown.unassisted /
          (0.5 * (fgBreakdown.unassisted + fgBreakdown.assisted))) *
        fudgeFactor;

      const astMissEstimate =
        shotCounts.shot_info_unknown_missed *
        fgBreakdown.baseAssistPct *
        astWeights;

      // This is the most common cause of issues with dribble jumper:
      // console.log(
      //   `0-0-SCENARIO: [${astMissEstimate.toFixed(3)}][${(
      //     shotCounts.shot_info_unknown_missed - astMissEstimate
      //   ).toFixed(3)}] // [${fgBreakdown.baseAssistPct.toFixed(
      //     3
      //   )}][${astWeights.toFixed(3)}]`
      // );

      return {
        fgM_ast: astMissEstimate,
        fgM_unast: Math.max(
          0,
          shotCounts.shot_info_unknown_missed - astMissEstimate
        ),
      };
    }
  };

  /** Special case of decomposeUnknownMisses, retained for bwc */
  static readonly decomposeUnknown3PMisses = (
    info: OffLuckShotTypeAndAdj3P
  ): { fgM_ast: number; fgM_unast: number } => {
    return LuckUtils.decomposeUnknownMisses(
      {
        shot_info_ast_made: info.shot_info_ast_3pm,
        shot_info_early_attempts: info.shot_info_early_3pa,
        shot_info_scramble_attempts: info.shot_info_scramble_3pa,
        shot_info_unast_made: info.shot_info_unast_3pm,
        shot_info_unknown_missed: info.shot_info_unknown_3pM,
        shot_info_total_attempts: info.shot_info_total_3p,
      },
      {
        base: info.base3P,
        unassisted: info.unassisted3P,
        assisted: info.assisted3P,
        baseAssistPct: info.base3P,
      }
    );
  };
}
