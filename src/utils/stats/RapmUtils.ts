//TODO: add models for  prevAttempts  / lastAttempt

//////////////////////////////////////////////////////////////////////////////////////////

// RAPM module description

// The core idea of RAPM is that each player has a single "offensive|defensive effiency above D1 average" number
// which they contribute to whichever lineup they play in (independent to team-mates)
// (You can also apply RAPM to any of the individual mettrics - 3P%, TO, FTR etc)

// (Full RAPM involves lineup vs lineup across all games. To make it tractable I just do lineup vs team
//  and ignore the -unquantified- inaccuracy of certain lineups facing strong/weaker opposing lineups)

// 1] In an ideal world you could just solve a big linear equation of all the lineups BUT
//    it turns out that the matrix is full of collinearities which makes it very sensitive to
//    the (large amounts of) noise

// 2] Ridge regression is a technique to come up with sane solutions to such linear equation sets
//    It adds a diagonal of a given size to the inverse component, making it much more stable.
//    The bigger the size ("lambda") the more stable; but the technique has the following negative effects:
//    2.1] The solution tends towards zero as the lambda gets larger
//         Viewed in the context of (eg) "the of(de)fensive efficiency of each player", this means
//         The % of the team's overall efficiency "explained" by adding the minutes-weighted player RAPMs
//         decreases. Eg for a typical lambda (see below)
//    2.2] The higher the % of lineups 2 players share, the more RAPM just shares the efficiency between them
//         (regardless of their peripherals)
//         For example, calculate the RAPM for query "A and B": A and B will have the same "raw RAPM"
//         This is particularly problematic for college teams (cf NBA) since the 6-8 top players log almost all the minutes
//         and the starters play 80% of minutes each (and coaches often seem to try to clump minutes)

// 3] Interlude: There's lots of Clever Math to help you pick the optimal lambda, given an understanding of the distribution
//    of the variable being fitted. Instead I just try a bunch of lambdas for off and def adjusted efficiency
//    and pick the smallest number where the average delta goes below a threshold. Then I use the same (off, def) lambda pairs
//    For all the off and def variables

// 4] OK back to the limitations described in 2]. I use a few different techniques to offset them:
//    4.1] Originally I added a separate constraint (row to matrix/vector) that was:
//         "the minutes-adjusted sum of the players' <metrics> sums to the team's season average", weighted by *2
//         This was nice and easy but essentially filled in the otherwise-lost efficiency by sharing it out
//         between the players as a not-quite-linear proportion of minutes played
//         So now I now longer do this, and it's only there until I have time to pull out all the code
//
//    4.2] Then I imported the individuals stats and calculated their "Adj+ Rtg" (SoS+usage weighted efficiency above average)
//         And use it in two ways:
//         4.2.1] (so called "Weak Prior") For a given lambda, calculate the RAPM, calculate the minutes-weighted sum,
//                and compare with the actual efficiency. I take a % of each player's efficiency to get as close
//                as possible to the actual efficiency (max 50% - otherwise if the team efficiency is close to 0 you get ugliness)
//                This fixes 2.1` nicely
//
//         4.2.2] (so called "Strong Prior") Take a given % of the player metrics (eg rating), and:
//                 - subtract it each lineup player's number from the input vector (ie each lineup's adj efficiency)
//                 - add it back again to the calculated RAPM
//
//         4.2.3] I experimented with different "Strong Prior" weights - 100% seemed to match "Adj Rtg+" too much
//                50% worked nice, but seemed arbitrary. 0% tended to share too much of strong player's impact
//                among statistically inferior team-mates who happened to play lots of mins together (Myles Powell and Cale)
//                One way of getting ~50% that seems less arbitrary is to calculate a weighted sum of their (Pearson) correlation
//                with other players - eg Powell has 43%, Cowan/Stix have 75%, some bench players have way less
//                This is called "adaptiveCorrelWeights" in the code below
//
//        4.2.4] A "final" alternative(?) to 4.2.3 I'm thinking about is to take each player's delta from their "Adj+ Rtg"
//               (not sure yet how it would work with other metrics) compared to each team-mate
//               and decompose how much of that is "shared RAPM" vs "difference due to on/off analysis"
//               and then replace the shared component in proportion of the relative "Adj Rtg+"s
//               Haven't figured out how/if that works yet!
//

// Another quick summary to help understand:
// you have "rotation" - will calc their RAPMs
// and "bench" - too low volume to calc their RAPMs, so will just use their adj rating+ instead
// so what you want is:
// sum(RAPM,total_min,rotation) + sum(Rtg,total_min,bench) = KP(rotation) + KP(combined) + KP(bench)
// calc RAPM based on rotation+combined, using Rtg for bench, which gives you:
// sum(RAPM,total_min,rotation) + sum(Rtg,combined_min,bench) ~= KP(rotation) + KP(combined)
// => sum(RAPM,total_min,rotation) + sum(Rtg,total_min,bench) ~= KP(rotation) + KP(combined) + sum(Rtg,bench_min,bench)
// the latter is ~= KP(bench) + noise from combined mins, so we can use the error of:
// sum(RAPM,total_min,rotation) + sum(Rtg,total_min,bench) vs KP(total) [IMPORTANT-EQUATION-01]

//////////////////////////////////////////////////////////////////////////////////////////

// Lodash:
import _ from "lodash";

// Other app utils
import { PlayerOnOffStats, LineupUtils } from "./LineupUtils";
import { LuckUtils } from "./LuckUtils";
import { CommonTableDefs } from "../tables/CommonTableDefs";
import {
  StatModels,
  PureStatSet,
  PlayerCodeId,
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  LineupStatSet,
} from "../StatModels";

// Math utils
// @ts-ignore
import { SVD } from "svd-js";
// @ts-ignore
import {
  add,
  apply,
  diag,
  identity,
  inv,
  matrix,
  mean,
  multiply,
  resize,
  row,
  sum,
  transpose,
  variance,
  zeros,
  // @ts-ignore
} from "mathjs";

type ValueKey = "value" | "old_value";

/** Contains the prior info for individuals (strong priors dominate RAPM, weak priors are dominated)*/
export type RapmPriorInfo = {
  strongWeight: number;
  noWeakPrior: boolean; //(ie allow the RAPM to diverge from the KenPom that generated it)
  useRecursiveWeakPrior: boolean; //if noWeakPrior then use the initial RAPM to make up the KP short-fall
  includeStrong: Record<string, boolean>; //(only need to set if unbiasWeight>0, else unused - TODO planning to remove unbiasWeight)
  playersStrong: Array<Record<string, number>>;
  playersWeak: Array<Record<string, number>>;
  basis: { off: number; def: number }; //(to handle cases when the prior is close to 0)
  keyUsed: ValueKey; //(whether luck is being used in this prior)
};
/** Handy util to */
const getStrongWeight = (
  prior: RapmPriorInfo,
  maybeAdaptiveFallback: number | undefined,
) => {
  if (prior.strongWeight >= 0) {
    return prior.strongWeight;
  } else {
    return maybeAdaptiveFallback || 0.0;
  }
};

/** Useful intermediate results */
export type RapmPlayerContext = {
  /** If true, then adds an additional row with the desired final result */
  unbiasWeight: number;

  /** Players that have been removed */
  removedPlayers: Record<string, [number, number, IndivStatSet]>;
  /** The column corresponding to the player */
  playerToCol: Record<string, number>;
  /** The player name in each column */
  colToPlayer: Array<string>;
  /** A shallow copy of the lineups, minus ones with removed player or no off/def possessions */
  filteredLineups: (prefix: "off" | "def") => Array<any>;
  /** An aggregated view of filteredLineups */
  teamInfo: LineupStatSet;
  /** The D1 average efficiency */
  avgEfficiency: number;
  // Handy counts:
  numPlayers: number;
  numOffLineups: number;
  numDefLineups: number;
  offLineupPoss: number;
  defLineupPoss: number;
  // Prios:
  priorInfo: RapmPriorInfo;
  // Config:
  config: RapmConfig;
};

export type RapmConfig = {
  priorMode: number; // -1 for adaptive prior, or 0-1 for fixed strong prior
  removalPct: number;
  fixedRegression: number; //-1 to calculate, or 0-1 for less/more regression
};

export const defaultRapmConfig = {
  priorMode: -1,
  removalPct: 0.06,
  fixedRegression: -1,
};

/** Holds the multi-collinearity info */
export type RapmPreProcDiagnostics = {
  lineupCombos: Array<number>;
  playerCombos: Record<string, Array<number>>;
  correlMatrix: any;
  possCorrelMatrix: any;
  adaptiveCorrelWeights: number[];
};

export type RapmProcessingInputs = {
  solnMatrix: any | null;
  ridgeLambda: number;
  rapmAdjPpp: Array<number>;
  rapmRawAdjPpp: Array<number>; //(no priors)
  playerPossPcts: Array<number>;
  prevAttempts: Array<any>; //TODO make this list of diag objects typed
};

/** Useful glue type that the code that orchestrates RAPM uses to collect info */
export type RapmInfo = {
  // Output:
  enrichedPlayers: Array<PlayerOnOffStats>;
  // All the diags
  ctx: RapmPlayerContext;
  preProcDiags?: RapmPreProcDiagnostics;
  offWeights: any;
  defWeights: any;
  offInputs: RapmProcessingInputs;
  defInputs: RapmProcessingInputs;
};

/** Handy util for display */
const tidyNumbers = (k: string, v: any) => {
  if (_.isNumber(v)) {
    const numStr = v.toFixed(3);
    if (_.endsWith(numStr, ".000")) {
      return numStr.split(".")[0];
    } else {
      return parseFloat(numStr);
    }
  } else {
    return v;
  }
};

/** Wrapper for some math to calculate RAPM and its various artefacts */
export class RapmUtils {
  // 1] INITIALIZATION LOGIC

  /** Builds priors for all the supported fields for all players */
  static buildPriors(
    playersBaseline: Record<PlayerId, IndivStatSet>,
    statsAverages: PureStatSet,
    avgEfficiency: number,
    colToPlayer: Array<string>,
    priorMode: number, //(-1 for adaptive mode, -2 for no prior)
    valueKey: ValueKey = "value", //(allows use of luck adjusted parameters)
  ): RapmPriorInfo {
    const getVal = (o: any) => {
      return (_.isNil(o?.[valueKey]) ? o?.value : o?.[valueKey]) || 0;
    };

    const noWeakPrior = priorMode < -1.5;

    // This handles the case where the prior is too close to 0 and the weak prior math breaks down
    // Pick a replacement value such that hte players have a RAPM of ~3
    //
    // NOTE: we now have a weak prior strategy that handles a prior of 0 (it just translates the RAPM
    // numbers to make the average correct, so we don't need this)
    const getPriorBasis = (offOrDef: "off" | "def") => {
      const disablePriorBasis = true;
      if (disablePriorBasis) {
        return 0;
      } else {
        const priorSum = _.chain(playersBaseline)
          .values()
          .map(
            (stats) =>
              getVal(stats[`${offOrDef}_adj_rtg`]) *
              getVal(stats[`${offOrDef}_team_poss_pct`]),
          )
          .sum()
          .value();

        const tieGoesPveIffOff = priorSum == 0 && offOrDef == "off";

        if (priorSum > 0 || tieGoesPveIffOff) {
          //reduce to lower "replacement value" for offense, raise the bar for defense
          return Math.max(3.0 - priorSum, 0) * 0.2;
        } else {
          //opposite
          return Math.min(0, -3.0 - priorSum) * 0.2;
        }
      }
    };
    const offBasis = noWeakPrior ? 0 : getPriorBasis("off");
    const defBasis = noWeakPrior ? 0 : getPriorBasis("def");

    /** For component priors, lets us combine player stats and D1 averages */
    const withAvgOrUndef = (
      field: string,
      stats: IndivStatSet,
      fn: (avg: number, player: number) => number,
      avgWeight: number = 1.0,
    ): number | undefined => {
      const avg = getVal(statsAverages[field]);
      const player = getVal(stats?.[field]);
      if (_.isNil(statsAverages[field]) || _.isNil(stats?.[field])) {
        return undefined;
      } else {
        return fn(avg * avgWeight, player);
      }
    };
    const defaultPrior = (
      field: string,
      stats: IndivStatSet,
      usage: number,
      avgWeight: number = 1.0,
    ): number | undefined => {
      return withAvgOrUndef(
        field,
        stats,
        (avg, player) => (player - avg) * usage,
        avgWeight,
      );
    };

    const returnVal = {
      includeStrong: {}, //(see RapmPriorInfo type definition, not needed unless unbiasWeight > 0)
      strongWeight: noWeakPrior ? 0 : priorMode, //(how much of a lineup is attributed to RAPM, and how much to the prior)
      //(-2 means no prior at all)
      noWeakPrior: noWeakPrior,
      useRecursiveWeakPrior: priorMode < -2.5,
      playersWeak: colToPlayer.map((player) => {
        // NOTE this is only applied for the current stat set below
        // addding additional stats to the weak prior does nothing

        const stats = playersBaseline[player] || {};
        if (stats) {
          // Build alternative rating using usage differently, on which to fallback
          const oRtgFactor =
            avgEfficiency / (getVal(stats.def_adj_opp) || avgEfficiency);
          const offUsage = getVal(stats.off_usage);
          const altOffRating =
            offUsage * (getVal(stats.off_rtg) * oRtgFactor - avgEfficiency);

          return {
            off_adj_ppp: getVal(stats.off_adj_rtg) + offBasis,
            def_adj_ppp: getVal(stats.def_adj_rtg) + defBasis,
            off_adj_ppp_alt: altOffRating + offBasis,
            off_usage: offUsage,
          } as Record<string, number>;
        } else return {} as Record<string, number>;
      }),
      playersStrong: colToPlayer.map((player) => {
        const stats = playersBaseline[player] || {};
        if (stats) {
          const offUsage = getVal(stats.off_usage);
          const rawEfg = defaultPrior("off_efg", stats, offUsage);
          return {
            off_adj_ppp: getVal(stats.off_adj_rtg) + offBasis,
            // THESE PRIORS ARE VERY ARBITARY, they are "directionally correct" and otherwise
            // all the components are very low and not much visual use (and you shouldn't use them for anything else)
            // 4 factors:
            off_efg: rawEfg
              ? rawEfg + Math.max(0.0, getVal(stats.off_assist) - 0.15) * 0.08
              : undefined, //(+0.8% over average for being an above average passer)
            off_to: defaultPrior("off_to", stats, offUsage),
            def_to: getVal(stats.def_to) - 0.01, //(arbitrary chosen average steal rate)
            off_orb: defaultPrior("off_orb", stats, 0.25, 0.2), //(semi arbitrary weights to avoid this prior being too strong)
            off_ftr: defaultPrior("off_ftr", stats, 0.5 * offUsage),
            def_orb: defaultPrior("def_orb", stats, -0.2, 0.25),
            def_ftr: (getVal(stats.def_ftr) - 0.025) * 2.0, //(eg 5 fouls (==0.05) / 50 -> ~0.1 inscrease in FTR)
            //(no defensive priors for 4 factors, apart from a hacky DTO using stl/blk, even hackier FTR based one)
            // peripherals:
            off_assist: defaultPrior("off_assist", stats, offUsage, 0.2),
            off_3pr: defaultPrior(
              "off_3pr",
              stats,
              offUsage,
              0.5 * (1.0 - getVal(stats.off_2prim)), //(rim attackers aren't expected to take as many 3s)
            ),
            off_2pmidr: defaultPrior("off_2pmidr", stats, offUsage),
            off_2primr: defaultPrior("off_2primr", stats, offUsage),
            //(no defensive priors for shot/assist rates)
            // shot making
            off_3p: defaultPrior(
              "off_3p",
              stats,
              offUsage * getVal(stats.off_3pr),
            ),
            off_2p: defaultPrior(
              "off_2p",
              stats,
              offUsage * (1.0 - getVal(stats.off_3pr)),
            ),
            off_2pmid: defaultPrior(
              "off_2pmid",
              stats,
              offUsage * getVal(stats.off_2pmid),
            ),
            off_2prim: defaultPrior(
              "off_2prim",
              stats,
              offUsage * getVal(stats.off_2prim),
            ),
            //(no defensive priors for shot making)
          } as Record<string, number>;
        } else return {} as Record<string, number>;
      }),
      keyUsed: valueKey,
      basis: {
        off: offBasis,
        def: defBasis,
      },
    };
    //console.log(JSON.stringify(returnVal));
    return returnVal;
  }

  /** For "recursive" prior */
  static buildWeakPriorFromRapm(
    rapmResults: Array<number>,
    offOrDef: "off" | "def",
  ): Array<Record<string, any>> {
    return rapmResults.map((rapm) => {
      return {
        [`${offOrDef}_adj_ppp`]: rapm,
      };
    });
  }

  /**
   * Builds a context object with functionality required by further processing
   * removalPct - the min% (eg 10%) of possessions a player must have
   * priorMode - -1 for adaptive strong prior (using Adj Rtg+), -2 for no strong prior, 0-1 to apply strong prior
   * unbiasWeight - if >0 adds an extra row with the desired combined results (eg 2)
   */
  static buildPlayerContext(
    players: Array<PlayerOnOffStats>,
    lineups: Array<LineupStatSet>,
    playersBaseline: Record<PlayerId, IndivStatSet>, //(used for building priors - most general info)
    statsAverages: PureStatSet,
    avgEfficiency: number,
    aggValueKey: ValueKey = "value", //(allows use of luck adjusted parameters, note applies to prior calcs only)
    config: RapmConfig = defaultRapmConfig,
    // REMOVED CODE:
    //    unbiasWeight: number = 0.0, //TODO; with the new prior code, don't use this (used to be 2.0)
  ): RapmPlayerContext {
    const unbiasWeight = 0.0; //(see above)

    // The static threshold for removing players
    // (who do more harm than good)
    // (2x to approximate checking both offense and defense)
    const totalLineups =
      (players?.[0]?.on?.off_poss?.value || 0) +
      (players?.[0]?.off?.off_poss?.value || 0) +
      (players?.[0]?.on?.def_poss?.value || 0) +
      (players?.[0]?.off?.def_poss?.value || 0);
    const removalThreshold = config.removalPct * totalLineups || 1;

    // Calculate while players do not have enough possessions to use their RAPM:

    const removedPlayersSet = _.chain(players)
      .transform(
        (acc, p: any) => {
          const playerId = (p.playerId as string) || "";
          const origPoss =
            (p.on?.off_poss?.value || 0) + (p.on?.def_poss?.value || 0);
          if (origPoss < removalThreshold) {
            acc[playerId] = [
              origPoss / totalLineups,
              0, //(<- unused now)
              {
                ...(playersBaseline[playerId] || StatModels.emptyIndiv()),
                off_poss: p.on?.off_poss || {},
                def_poss: p.on?.def_poss || {},
              } as unknown as IndivStatSet,
            ];
          }
        },
        {} as Record<string, [number, number, IndivStatSet]>,
      )
      .value();

    // Now need to go through lineups, remove any that don't include RAPM info

    var varLineupsWithNoOffPoss = 0; //(hacky to save a few CPU cycles/code complexity)
    var varLineupsWithNoDefPoss = 0;
    const currFilteredLineupSet = _.chain(lineups)
      .flatMap((l: any) => {
        // THIS FLATMAP HAS SIDE-EFFECTS - ADDS rapmRemove to some lineups

        const lineupPlayers =
          l?.players_array?.hits?.hits?.[0]?._source?.players || [];
        const shouldRemoveLineup = _.every(
          lineupPlayers,
          (p: any) => !_.isNil(removedPlayersSet[p.id as string]),
        ); //contains _only_ removed players

        if (!l.off_poss?.value) varLineupsWithNoOffPoss++;
        if (!l.def_poss?.value) varLineupsWithNoDefPoss++;

        if (shouldRemoveLineup) {
          l.rapmRemove = true; //(temp flag for peformance in calculateAggregatedLineupStats)
        }
        return shouldRemoveLineup ? [] : [l];
      })
      .value();

    // Calculate the aggregated team stats
    //(note includes pre-luck-adjusted stats if the main stats are luck adjusted)
    const teamInfo = LineupUtils.calculateAggregatedLineupStats(lineups);
    const sortedPlayers = _.chain(players)
      .filter((p) => {
        const playerId = (p.playerId as string) || "";
        return !removedPlayersSet.hasOwnProperty(playerId);
      })
      .sortBy((p) => -1 * (p.on?.off_poss?.value || 0))
      .map((p) => (p.playerId as string) || "")
      .value();

    return {
      unbiasWeight: unbiasWeight,
      removedPlayers: removedPlayersSet,
      playerToCol: _.chain(sortedPlayers)
        .map((playerId, index) => {
          return [playerId, index];
        })
        .fromPairs()
        .value(),
      colToPlayer: sortedPlayers,
      filteredLineups: (prefix: "off" | "def") =>
        currFilteredLineupSet.filter((l) =>
          Boolean(prefix == "off" ? l.off_poss?.value : l.def_poss?.value),
        ),
      teamInfo: teamInfo,
      avgEfficiency: avgEfficiency,
      numPlayers: sortedPlayers.length,
      numOffLineups: currFilteredLineupSet.length - varLineupsWithNoOffPoss,
      numDefLineups: currFilteredLineupSet.length - varLineupsWithNoDefPoss,
      offLineupPoss: teamInfo.off_poss?.value || 0,
      defLineupPoss: teamInfo.def_poss?.value || 0,
      priorInfo: RapmUtils.buildPriors(
        playersBaseline,
        statsAverages,
        avgEfficiency,
        sortedPlayers,
        config.priorMode,
        aggValueKey,
      ),
      config,
    };
  }

  /** Calculates the weights and returns 2 matrices, one for off one for def */
  static calcPlayerWeights(ctx: RapmPlayerContext) {
    const extra = ctx.unbiasWeight > 0;

    // Build a matrix of the right size:
    const offWeights = zeros(
      ctx.numOffLineups + (extra ? 1 : 0),
      ctx.numPlayers,
    );
    const defWeights = zeros(
      ctx.numDefLineups + (extra ? 1 : 0),
      ctx.numPlayers,
    );

    // Fill it in with the players
    const populateMatrix = (inMatrix: any, prefix: "off" | "def") => {
      ctx.filteredLineups(prefix).forEach((lineup, index) => {
        const possCount = (lineup as any)[`${prefix}_poss`]?.value || 0;
        const lineupRow = inMatrix.valueOf()[index];
        const lineupPossCount = (ctx as any)[`${prefix}LineupPoss`] || 1;
        const possCountWeight = Math.sqrt(possCount / lineupPossCount);
        const inPlayers =
          lineup?.players_array?.hits?.hits?.[0]?._source?.players || [];
        inPlayers.forEach((player: any) => {
          const playerIndex = ctx.playerToCol[player.id];
          if (!_.isNil(playerIndex) && playerIndex >= 0) {
            lineupRow[playerIndex] = possCountWeight;
          } //(else this player is filtered out so ignore, we'll just use their adj_rtg)
        });
      });
    };
    populateMatrix(offWeights, "off");
    populateMatrix(defWeights, "def");

    // Add the possession %s for each players
    if (ctx.unbiasWeight > 0) {
      const addExtraRow = (inMatrix: any, prefix: "off" | "def") => {
        const inMatrixT = transpose(inMatrix);
        const bottomRow =
          inMatrix.valueOf()[
            prefix == "off" ? ctx.numOffLineups : ctx.numDefLineups
          ];
        inMatrixT.valueOf().forEach((row: number[], i: number) => {
          bottomRow[i] = _.sum(
            row.map((v: number) => ctx.unbiasWeight * v * v),
          );
        });
      };
      addExtraRow(offWeights, "off");
      addExtraRow(defWeights, "def");
    }
    return [offWeights, defWeights];
  }

  /** Calculate the output vectors (as 1-d arrays) against which we'll fit the vectors */
  static calcLineupOutputs(
    field: string,
    offOffset: number,
    defOffset: number,
    ctx: RapmPlayerContext,
    adaptiveCorrelWeights: number[] | undefined,
    useOldValIfPossible: [boolean, boolean] = [false, false],
  ) {
    const getOffVal = (o: any) => {
      return useOldValIfPossible[0]!
        ? (_.isNil(o?.old_value) ? o?.value : o?.old_value) || 0
        : o?.value || 0;
    };
    const getDefVal = (o: any) => {
      return useOldValIfPossible[1]
        ? (_.isNil(o?.old_value) ? o?.value : o?.old_value) || 0
        : o?.value || 0;
    };
    const getVal = { off: getOffVal, def: getDefVal };
    const offsets = {
      off: offOffset,
      def: defOffset,
    };
    /** If we're not applying luck on a per lineup basis,
     * BUT WE ARE APPLYING LUCK to the priors/overall efficiency (ie not the old_value/adjustForLuck case)
     * we need to apply the luck/non-luck delta equally across all lineups
     */
    const doGlobalLuckAdj = (offOrDef: "off" | "def") => {
      if (field == "adj_ppp") {
        const useOldVal =
          offOrDef == "off" ? useOldValIfPossible[0] : useOldValIfPossible[1];
        if (
          useOldVal &&
          ctx.priorInfo.keyUsed == "value" &&
          !_.isNil(
            ctx.teamInfo.all_lineups?.[`${offOrDef}_${field}`]?.old_value,
          )
        ) {
          return (
            (ctx.teamInfo.all_lineups?.[`${offOrDef}_${field}`]?.value || 0) -
            (ctx.teamInfo.all_lineups?.[`${offOrDef}_${field}`]?.old_value || 0)
          );
        } else {
          return 0;
        }
      } else {
        return 0;
      }
    };
    const globalLuckAdjOffsets = {
      off: doGlobalLuckAdj("off"),
      def: doGlobalLuckAdj("def"),
    };
    const calculateVector = (prefix: "off" | "def") => {
      return ctx.filteredLineups(prefix).map((lineup: any) => {
        const possCount = (lineup as any)[`${prefix}_poss`]?.value || 0;
        const lineupPossCount = (ctx as any)[`${prefix}LineupPoss`] || 1;
        const possCountWeight = Math.sqrt(possCount / lineupPossCount);
        const val = getVal[prefix]((lineup as any)[`${prefix}_${field}`]);

        const inPlayers =
          lineup?.players_array?.hits?.hits?.[0]?._source?.players || [];
        const priorOffset = _.reduce(
          inPlayers,
          (acc: number, player: any) => {
            const playerIndex = ctx.playerToCol[player.id];
            // imagine you have a 2 person lineup, one rotation player and one rotation/bench player, the 2 cases are:
            // (R and B are value above average)
            // 1] sqrt(poss%)*R1 + sqrt(poss%)*R2 = L(stat) - sqrt(poss%)*(D1-av-stat)
            // sqrt(poss%)*R1 + sqrt(poss%)*B1 = L(stat) - sqrt(poss%)*(D1-av-stat), B1 is constant, so:
            // 2] sqrt(poss%)*R1 = L(stat) - sqrt(poss%)*(D1-av-stat - B1)

            if (!_.isNil(playerIndex) && playerIndex >= 0) {
              //(case 1] above)
              //(the strong weight is currently 0 for everything except adj_off_rtg)
              const strongWeight = getStrongWeight(
                ctx.priorInfo,
                adaptiveCorrelWeights?.[playerIndex],
              );

              const strongVal =
                ctx.priorInfo.playersStrong[playerIndex]![
                  `${prefix}_${field}`
                ] || 0;
              //(note this already contains the basis)

              return acc + strongWeight * strongVal;
            } else {
              // this player is filtered out but we still want to use their result on the RHS of equation
              // case 2] above
              const removedPlayerInfo =
                (ctx.removedPlayers[player.id] as [
                  number,
                  number,
                  IndivStatSet,
                ]) || undefined;
              if (removedPlayerInfo) {
                const removedPlayerStat = removedPlayerInfo[2] || {};
                const removedPlayerStatAboveMean =
                  field == "adj_ppp"
                    ? getVal[prefix](removedPlayerStat[`${prefix}_adj_rtg`]) +
                      ctx.priorInfo.basis[prefix]
                    : getVal[prefix](removedPlayerStat[`${prefix}_${field}`]) -
                      offsets[prefix];
                return acc + removedPlayerStatAboveMean;
              } else {
                //(else exception case)
                return acc;
              }
            }
          },
          offsets[prefix],
        ); //(starting value is the D1 average for that stat, minus any basis to avoid "edge effects")

        return (
          (val + globalLuckAdjOffsets[prefix] - priorOffset) * possCountWeight
        );
      });
    };
    const extra = ctx.unbiasWeight > 0;

    return [
      calculateVector("off").concat(
        extra
          ? ctx.priorInfo.includeStrong[`off_${field}`]
            ? [0]
            : [
                ctx.unbiasWeight *
                  (getOffVal(ctx.teamInfo[`off_${field}`]) - offOffset),
              ]
          : [],
      ),
      calculateVector("def").concat(
        extra
          ? ctx.priorInfo.includeStrong[`def_${field}`]
            ? [0]
            : [
                ctx.unbiasWeight *
                  (getDefVal(ctx.teamInfo[`def_${field}`]) - defOffset),
              ]
          : [],
      ),
    ];
  }

  // 2] PROCESSING

  /** Calculates a regression matrix using Tikhonov regression */
  private static slowRegression(
    playerWeightMatrix: any,
    ridgeLambda: number,
    ctx: RapmPlayerContext,
  ) {
    //https://en.wikipedia.org/wiki/Tikhonov_regularization
    const playerWeightMatrixT = transpose(playerWeightMatrix);
    const bottom = add(
      multiply(playerWeightMatrixT, playerWeightMatrix),
      multiply(ridgeLambda, identity(ctx.numPlayers)),
    );
    const bottomInv = inv(bottom);
    return multiply(bottomInv, playerWeightMatrixT);
  }

  /** Applies the regression matrix to the outputs */
  static calculateRapm(regressionMatrix: any, playerOutputs: Array<number>) {
    const out = transpose(matrix(playerOutputs));
    return transpose(multiply(regressionMatrix, out)).valueOf();
  }

  /** Injects the RAPM predicted diffs into player.rapm
   * NOTE: useOldVals=true needs to be run after useOldVals=false
   * (since it injects the old value versions into the existing one)
   */
  static injectRapmIntoPlayers(
    players: Array<PlayerOnOffStats>,
    offRapmInput: RapmProcessingInputs,
    defRapmInput: RapmProcessingInputs,
    statsAverages: PureStatSet,
    ctx: RapmPlayerContext,
    adaptiveCorrelWeights: number[] | undefined,
    readValueKeys: [ValueKey, ValueKey] = ["value", "value"],
    writeValueKey: ValueKey = "value",
  ) {
    const writeOtherVals = writeValueKey == "old_value";
    const readOtherValsOff = readValueKeys[0]! == "old_value";
    const readOtherValsDef = readValueKeys[1]! == "old_value";
    const getOffVal = (o: any) => {
      //(in practice we're going to discard fields without old_value anyway)
      return readOtherValsOff
        ? (_.isNil(o?.[readValueKeys[0]]) ? o?.value : o?.[readValueKeys[0]]) ||
            0
        : o?.value || 0;
    };
    const getDefVal = (o: any) => {
      //(in practice we're going to discard fields without old_value anyway)
      return readOtherValsDef
        ? (_.isNil(o?.[readValueKeys[1]]) ? o?.value : o?.[readValueKeys[1]]) ||
            0
        : o?.value || 0;
    };
    if (offRapmInput.solnMatrix && defRapmInput.solnMatrix) {
      const rapmInput = {
        off: offRapmInput,
        def: defRapmInput,
      };
      // Get a map (per field) of arrays (per player) of the RAPM results
      const fieldToPlayerRapmArray = (
        writeOtherVals
          ? _.chain(LuckUtils.affectedPartialFieldnames).filter(
              (p) => p != "ppp",
            )
          : _.chain(CommonTableDefs.onOffReportReplacement)
              .omit([
                "title",
                "sep0",
                "ppp",
                "sep1",
                "sep2",
                "sep3",
                "sep4",
                "poss",
                "adj_opp",
              ])
              .keys()
      )
        .flatMap((partialField: string) => {
          const [offOffset, defOffset] = (
            {
              ppp: [ctx.avgEfficiency, ctx.avgEfficiency],
              adj_ppp: [ctx.avgEfficiency, ctx.avgEfficiency],
            } as Record<string, [number, number]>
          )[partialField] || [
            statsAverages[`off_${partialField}`]?.value ||
              getOffVal(ctx.teamInfo[`off_${partialField}`]),
            statsAverages[`def_${partialField}`]?.value ||
              getDefVal(ctx.teamInfo[`def_${partialField}`]),
          ];
          const [offVal, defVal] = RapmUtils.calcLineupOutputs(
            partialField,
            offOffset,
            defOffset,
            ctx,
            adaptiveCorrelWeights,
            [readOtherValsOff, readOtherValsDef], //TODO: adaptive weight here
          );
          const vals = {
            off: offVal,
            def: defVal,
          };
          const onOffField = _.chain(["off", "def"])
            .map((offOrDef: "off" | "def") => {
              const field = `${offOrDef}_${partialField}`;
              const resultsPrePrior: number[] = RapmUtils.calculateRapm(
                rapmInput[offOrDef].solnMatrix,
                vals[offOrDef],
              );
              const results =
                partialField == "adj_ppp"
                  ? rapmInput[offOrDef].rapmAdjPpp
                  : ctx.priorInfo.playersStrong.map((stat, index) => {
                      const strongWeight = getStrongWeight(
                        ctx.priorInfo,
                        adaptiveCorrelWeights?.[index],
                      );
                      return (
                        strongWeight *
                          (stat[`${offOrDef}_${partialField}`] || 0) +
                        resultsPrePrior[index]!
                      );
                    });

              return [field, results];
            })
            .value(); //(ie [ ON, OFF ] where ON/OFF = [ (on|off)_field, [ results ] ] )

          return onOffField;
        })
        .fromPairs()
        .value(); //ie returns [ ON1, OFF1, ON2, OFF2, ... ] where ON/OFF as above

      players
        .filter((p) => !ctx.removedPlayers.hasOwnProperty(p.playerId))
        .forEach((p) => {
          const index = ctx.playerToCol[p.playerId];
          const playerRapm = _.chain(fieldToPlayerRapmArray)
            .toPairs()
            .map((kv) => {
              return [
                kv[0],
                {
                  [writeValueKey]: kv[1][index],
                  override: writeOtherVals
                    ? ctx.teamInfo[kv[0]]?.override
                    : undefined,
                },
              ];
            })
            .fromPairs()
            .merge({
              key: `RAPM ${p.playerId}`,
              off_poss: ctx.teamInfo.off_poss,
              def_poss: ctx.teamInfo.def_poss,
            })
            .value();

          p.rapm = writeOtherVals ? _.merge(p.rapm, playerRapm) : playerRapm;
        });
    } //(else do nothing)
  }

  /** Use of ridge regression depresses the numbers towards 0. The weak priors let
      us "fill" the error with the prior stats
  */
  static applyWeakPriors(
    field: string,
    playerPossPcts: Array<number>,
    priorInfo: RapmPriorInfo,
    debugMode: Boolean,
  ) {
    const isPpp = field == "off_adj_ppp" || field == "def_adj_ppp";

    // It's often the case that the prior of the starters' performance doesn't match the error well, eg:
    // 1] priorSum = -7.2, error = -5.2: priorSum would make the offense works when the error => should be made better
    // 2] priorSum = 0.66, error = -4.5: priorSum has the right sign, but is so small you'd have to expand way too high to remove the error
    // The likely worst offender here is that adj_rtg has a usage adjustment which, esp on small samples like
    // single-game RAPM can make the prior sum a stupid value compared to the team efficiency

    // In such cases we will simply translate the RAPM so that its average sums to the adj_rtg+ sum

    // For now I just have an alternate rating that doesn't give a bonus/penalty for efficiency, it just
    // weights it so it's guaranteed to hit the team rating (though not the "sum of all the lineups" rating,
    // so it's not perfect)

    const priorSum = _.chain(priorInfo.playersWeak)
      .map((p, ii) => {
        return (p[field] || 0) * playerPossPcts[ii]!;
      })
      .sum()
      .value();

    const sumPoss = _.chain(priorInfo.playersWeak)
      .map((p, ii) => {
        return playerPossPcts[ii]!;
      })
      .sum()
      .value();
    const sumPossInv = 1.0 / Math.min(5, Math.max(sumPoss, 4.5)); //(low volume players, with safety bounds)

    const maxMultiplier = -0.5; //(if the multiplier is too high then translate the RAPM instead)

    return (error: number, baseResults: Array<number>) => {
      const priorSumInv = priorSum != 0 ? 1 / priorSum : 0;
      const errorTimesSumInv = Math.min(
        0,
        Math.max(maxMultiplier, error * priorSumInv),
      );
      const approxErrWithCappedPrior = error - priorSum * errorTimesSumInv; //(eg -4.5 - (-0.5)*8 = 3.5 -> -1.5)

      //(if the error is -ve, the actual eff is > RAPM, so need to add to RAPM (ie more +ve), hence errorTimesSumInv must be -ve, else ignore)
      //(if the error is +ve. the actual eff is < RAPM, so need to reduce RAPM (ie move -ve), hence errorsTimesSunInv ~must~ should be
      // .... still -ve ...! Because of priorInv factor (which will on average same sign as errorTimesSumInv)
      //(because it's -error*errorTimesSumInv*prior[player] below)

      // Pick the best
      const useAltRating =
        isPpp && (errorTimesSumInv == 0 || errorTimesSumInv == maxMultiplier);
      //(only consider the alt if the base value can't make the adjustment perfectly)

      // ... And then also can only take a <50% chunk of the priors

      //USEFUL DEBUG:
      if (debugMode)
        console.log(
          `prior=[${priorSum.toFixed(2)}][${sumPoss.toFixed(2)}x] error=[${error.toFixed(
            2,
          )}] tot=[${(error * priorSumInv).toFixed(4)}] => [${errorTimesSumInv.toFixed(4)}] (useAlt=[${useAltRating}]/err=[${approxErrWithCappedPrior.toFixed(3)}])`,
        );

      return baseResults.map((r, ii) => {
        const weakPrior = priorInfo.playersWeak[ii]![field] || 0;
        return (
          r -
          errorTimesSumInv * weakPrior -
          (useAltRating ? approxErrWithCappedPrior * sumPossInv : 0) //(*0.2 because the sum of the poss% is 5)
        );
      });
    };
  }

  /**
   * Select a good ridge regression factor to use
   * If diagMode is enabled then add info about each possible regression value
   */
  static pickRidgeRegression(
    offWeights: any,
    defWeights: any,
    ctx: RapmPlayerContext,
    adaptiveCorrelWeights: number[] | undefined,
    diagMode: boolean,
    aggValueKey: ValueKey = "value", // not indiv lineup numbers - just player and team aggregates
    lineupValueKeys: [ValueKey, ValueKey] = ["value", "value"], // indiv lineup numbers
  ) {
    const useAggOldValIfPossible = aggValueKey == "old_value";
    const getAggVal = (o: any) => {
      return useAggOldValIfPossible
        ? (_.isNil(o?.[aggValueKey]) ? o?.value : o?.[aggValueKey]) || 0
        : o?.value || 0;
    };
    const useLineupOldValIfPossible: [boolean, boolean] = [
      lineupValueKeys[0] == "old_value",
      lineupValueKeys[1] == "old_value",
    ];

    // Some test + diag artefacts
    const offDefDebugMode = {
      off: false,
      def: false,
    };
    const generateTestCases = false;
    //(end test artefacts)

    if (offDefDebugMode.off || offDefDebugMode.def) {
      console.log(
        `RAPM Priors = [${JSON.stringify(ctx.priorInfo, tidyNumbers)}]`,
      );
      if (adaptiveCorrelWeights)
        console.log(
          `Adaptive weights = [${JSON.stringify(
            adaptiveCorrelWeights,
            tidyNumbers,
          )}]`,
        );
    }

    const weights = {
      off: offWeights,
      def: defWeights,
    };
    // For creating tests
    if (generateTestCases) {
      //(double-safety: if guard AND commented out!)
      // console.log(JSON.stringify(offWeights.valueOf()).replace(/([.][0-9]{4})[0-9]*/g, "$1"));
      // console.log(JSON.stringify(defWeights.valueOf()).replace(/([.][0-9]{4})[0-9]*/g, "$1"));
      // console.log(JSON.stringify(_.omit(ctx, [ "filteredLineups", "teamInfo"])));
      // console.log(JSON.stringify(ctx.filteredLineups.map((l) => {
      //   return _.pick(l, "off_adj_ppp", "def_adj_ppp", "off_to", "def_to", "off_poss", "def_poss")
      // })).replace(/([.][0-9]{4})[0-9]*/g, "$1"));
    }

    // TODO: look into one of the "proper" unbiased estimators:
    // - http://www.utgjiu.ro/math/sma/v04/p08.pdf (coulnd't figure out how to turn this into algo?)
    // - https://www.researchgate.net/publication/264911183_An_almost_unbiased_ridge_estimator

    // TODO: use SVD to build a single expensive matrix that can then be minimally modified
    // for each lambda (u,d,v) = svd; ridgeInv = v*f(d)*uT where (d) = diag(dii*dii/(lambda  + dii*dii))
    // Thttps://en.wikipedia.org/wiki/Tikhonov_regularization#Relation_to_singular-value_decomposition_and_Wiener_filter

    // SVD
    // See https://en.wikipedia.org/wiki/Tikhonov_regularization#Determination_of_the_Tikhonov_factor
    const svd = {
      off: SVD(weights.off.valueOf()), // u, v, q==D
      def: SVD(weights.def.valueOf()),
    };

    // If priors get too close to 0 then use something closer to replacement value
    const offEfficiencyBasis = ctx.avgEfficiency - ctx.priorInfo.basis.off * 5;
    const defEfficiencyBasis = ctx.avgEfficiency - ctx.priorInfo.basis.def * 5;

    // Get an approximate idea of the scale of the lambdas:
    const avgEigenVal = 0.5 * mean(svd.off.q) + 0.5 * mean(svd.def.q);
    const allLineups = _.isEmpty(ctx.teamInfo.all_lineups)
      ? ctx.teamInfo
      : ctx.teamInfo.all_lineups;
    //(handle the special case where filtered lineups == all lineups)
    const actualEff = {
      //(we include both "RAPM players only" and "all other lineups" and then counter adjust with adj_rtg when we don't have RAPM)
      off: getAggVal(allLineups?.off_adj_ppp) - offEfficiencyBasis,
      def: getAggVal(allLineups?.def_adj_ppp) - defEfficiencyBasis,
    };

    if (offDefDebugMode.off) {
      const possUsedinRapm =
        getAggVal(ctx.teamInfo.off_adj_ppp) - offEfficiencyBasis;
      console.log(
        `off: Eff components: rotation+combined=[${possUsedinRapm.toFixed(
          2,
        )}] bench=[${(actualEff.off - possUsedinRapm).toFixed(2)}]`,
        ctx.teamInfo,
      );
    }
    if (offDefDebugMode.def) {
      const possUsedinRapm =
        getAggVal(ctx.teamInfo.def_adj_ppp) - defEfficiencyBasis;
      console.log(
        `def: Eff components: rotation+combined=[${possUsedinRapm.toFixed(
          2,
        )}] bench=[${(actualEff.def - possUsedinRapm).toFixed(2)}]`,
        ctx.teamInfo,
      );
    }

    // Build player usage vectors:
    const pctByPlayer = (() => {
      const buildUsageVector = (onOrOff: "off" | "def") => {
        if (ctx.unbiasWeight > 0) {
          return weights[onOrOff]
            .valueOf()
            [
              onOrOff == "off" ? ctx.numOffLineups : ctx.numDefLineups
            ].map((v: number) => v / ctx.unbiasWeight);
        } else {
          const weightT = transpose(weights[onOrOff]);
          return weightT.valueOf().map((row: number[]) => {
            return _.sum(row.map((v: number) => v * v));
          });
        }
      };
      return {
        off: buildUsageVector("off") as number[],
        def: buildUsageVector("def") as number[],
      };
    })();
    if (offDefDebugMode.off)
      console.log(
        `(Off) Player Poss = [${pctByPlayer.off.map((p: number) =>
          p.toFixed(2),
        )}]`,
      );
    if (offDefDebugMode.def)
      console.log(
        `(Def) Player Poss = [${pctByPlayer.def.map((p: number) =>
          p.toFixed(2),
        )}]`,
      );

    // Build an adj-rating-based adjustment for low-volume players
    const lowVolumePlayerRapmAdj = (() => {
      const buildLowVolumePlayerRapmAdj = (onOrOff: "off" | "def") => {
        const lineupPossCount = allLineups?.[`${onOrOff}_poss`]?.value || 1;
        return [
          _.chain(ctx.removedPlayers)
            .values()
            .reduce((acc, v, index) => {
              const vStat = v[2] || {};

              // Very detailed debugging:
              // if (offDefDebugMode[onOrOff]) {
              //   console.log(
              //     `Low Volume Player Calc [${
              //       _.keys(ctx.removedPlayers)[index]
              //     }]: poss: ([${getAggVal(vStat[`${onOrOff}_adj_rtg`])}]+[${
              //       ctx.priorInfo.basis[onOrOff]
              //     }]*[${getAggVal(
              //       vStat[`${onOrOff}_poss`]
              //     )}])/[${lineupPossCount}]`
              //   );
              // }

              // (use total bench mins as per [IMPORTANT-EQUATION-01])
              return (
                acc +
                ((getAggVal(vStat[`${onOrOff}_adj_rtg`]) +
                  ctx.priorInfo.basis[onOrOff]) *
                  getAggVal(vStat[`${onOrOff}_poss`])) /
                  lineupPossCount
              );
            }, 0.0)
            .value(),
          (ctx as any)[`${onOrOff}LineupPoss`]! / lineupPossCount, //% of rotation+combined possessions, diag only
        ];
      };
      return {
        off: buildLowVolumePlayerRapmAdj("off") as [number, number],
        def: buildLowVolumePlayerRapmAdj("def") as [number, number],
      };
    })();
    if (offDefDebugMode.off)
      console.log(
        `(Off) Low Volume Adj = [${lowVolumePlayerRapmAdj.off[0].toFixed(
          2,
        )}, ${lowVolumePlayerRapmAdj.off[1].toFixed(2)}]`,
      );
    if (offDefDebugMode.def)
      console.log(
        `(Def) Low Volume Adj = [${lowVolumePlayerRapmAdj.def[0].toFixed(
          2,
        )}, ${lowVolumePlayerRapmAdj.def[1].toFixed(2)}]`,
      );

    const useWeakPriorsToFixErrors = {
      off: RapmUtils.applyWeakPriors(
        `off_adj_ppp`,
        pctByPlayer.off,
        ctx.priorInfo,
        offDefDebugMode.off,
      ),
      def: RapmUtils.applyWeakPriors(
        `def_adj_ppp`,
        pctByPlayer.def,
        ctx.priorInfo,
        offDefDebugMode.def,
      ),
    };

    const [offAdjPoss, defAdjPoss] = RapmUtils.calcLineupOutputs(
      "adj_ppp",
      offEfficiencyBasis,
      defEfficiencyBasis,
      ctx,
      adaptiveCorrelWeights,
      useLineupOldValIfPossible,
    );
    const adjPoss = {
      off: offAdjPoss,
      def: defAdjPoss,
    };
    const pickRidgeThresh = { off: 0.061, def: 0.091 }; //(more confident in offensive priors)

    const lambdaRange = [
      0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75,
      4.0,
    ];
    const lowPossCountLambdaRange = [
      0.7, 1.1, 1.5, 1.9, 2.3, 2.7, 3.1, 3.5, 3.9, 4.3, 4.7, 5.1, 5.5, 5.9, 6.3,
      6.7,
    ];
    // consider adding some more for single game RAPM (and maybe space existing ones out?)
    // (maybe only for offense? Defense is already quite boring normally)
    // eg
    // [
    //   0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5,
    // ];
    const firstNonDiagLambdaIndex = 3;
    const testResults = (["off", "def"] as Array<"off" | "def">).map(
      (offOrDef: "off" | "def") => {
        const isLowPossCountOff = ctx.offLineupPoss < 200 && offOrDef == "off";
        const lambdaRangeToUse = isLowPossCountOff
          ? lowPossCountLambdaRange
          : lambdaRange;

        const usedLambdaRange = _.thru(
          ctx.config.fixedRegression,
          (fixedRegression) => {
            if (fixedRegression < 0) {
              return _.drop(
                lambdaRangeToUse,
                diagMode ? 0 : firstNonDiagLambdaIndex,
              );
            } else {
              const lowerBound = lambdaRangeToUse[firstNonDiagLambdaIndex];
              const upperBound = _.last(lambdaRangeToUse)!;
              return [lowerBound + fixedRegression * (upperBound - lowerBound)];
            }
          },
        );
        return _.transform(
          usedLambdaRange,
          (acc, lambda) => {
            const notFirstStep = lambda > usedLambdaRange[0];
            if (!acc.foundLambda || diagMode) {
              const debugMode = offDefDebugMode[offOrDef];
              const ridgeLambda = lambda * avgEigenVal; //(scale lambda according to the scale of the weight matrix)

              if (debugMode)
                console.log(
                  `********* [${offOrDef}] RAPM WITH LAMBDA ` +
                    ridgeLambda.toFixed(3) +
                    " / " +
                    lambda +
                    ` key=[${lineupValueKeys[offOrDef == "off" ? 0 : 1]}]`,
                );

              const solver = RapmUtils.slowRegression(
                weights[offOrDef],
                ridgeLambda,
                ctx,
              );
              const resultsPrePrePrior: number[] = RapmUtils.calculateRapm(
                solver,
                adjPoss[offOrDef],
              );

              // Apply strong prior if present:
              const resultsPrePrior = ctx.priorInfo.playersStrong.map(
                (stat, index) => {
                  const strongWeight = getStrongWeight(
                    ctx.priorInfo,
                    adaptiveCorrelWeights?.[index],
                  );
                  return (
                    strongWeight * (stat[`${offOrDef}_adj_ppp`] || 0) +
                    resultsPrePrePrior[index]!
                  );
                },
              );

              const [addLowVolumeAdjRtg, reduceRapmUnused] =
                lowVolumePlayerRapmAdj[offOrDef];
              const combinedAdjEffPrePrior =
                _.sum(
                  _.zip(pctByPlayer[offOrDef], resultsPrePrior).map(
                    (zip: Array<number | undefined>) => {
                      return (zip[0] || 0) * (zip[1] || 0);
                    },
                  ),
                ) + addLowVolumeAdjRtg;
              //(^ see [IMPORTANT-EQUATION-01])

              const adjEffErrPrePrior =
                combinedAdjEffPrePrior - actualEff[offOrDef];
              const adjEffAbsErrPrePrior = Math.abs(adjEffErrPrePrior);

              const results = useWeakPriorsToFixErrors[offOrDef](
                adjEffErrPrePrior,
                resultsPrePrior,
              );

              const combinedAdjEff =
                _.sum(
                  _.zip(pctByPlayer[offOrDef], results).map(
                    (zip: Array<number | undefined>) => {
                      return (zip[0] || 0) * (zip[1] || 0);
                    },
                  ),
                ) + addLowVolumeAdjRtg;
              //(^ see [IMPORTANT-EQUATION-01])

              const adjNonAbsEffErr = combinedAdjEff - actualEff[offOrDef];
              const adjEffErr = Math.abs(adjNonAbsEffErr);

              if (debugMode) console.log(ctx.colToPlayer);
              if (debugMode)
                console.log(
                  "rapm[PREPRE]: " +
                    resultsPrePrePrior.map((p: number) => p.toFixed(3)),
                );
              if (debugMode)
                console.log(
                  "rapm[PRE]: " +
                    resultsPrePrior.map((p: number) => p.toFixed(3)),
                );
              if (debugMode)
                console.log(
                  "rapm[POST]: " + results.map((p: number) => p.toFixed(3)),
                );
              if (debugMode)
                console.log(
                  `combinedRapm[PRE] = [${combinedAdjEffPrePrior.toFixed(
                    1,
                  )}] vs actualEff = [${actualEff[offOrDef].toFixed(1)}] ... ` +
                    `Err[PRE] = [${adjEffErrPrePrior.toFixed(
                      1,
                    )}] Err[POST] = [${adjNonAbsEffErr.toFixed(1)}]`,
                );

              const residuals = RapmUtils.calculatePredictedOut(
                weights[offOrDef],
                results,
                ctx,
              );
              const errSq = RapmUtils.calculateResidualError(
                adjPoss[offOrDef],
                residuals,
                ctx,
              );
              const numLineups =
                offOrDef == "off" ? ctx.numOffLineups : ctx.numDefLineups;
              const dofInv = 1.0 / (numLineups - ctx.numPlayers); //(degrees of freedom)

              //if (debugMode) console.log(`RSS = [${offErrSq.toFixed(1)}] + [${defErrSq.toFixed(1)}]`);
              if (debugMode)
                console.log(`MSS = [${(errSq * dofInv).toFixed(1)}]`);

              const paramErrs = RapmUtils.calcSlowPseudoInverse(
                weights[offOrDef],
                ridgeLambda,
                ctx,
              );

              // https://arxiv.org/pdf/1509.09169.pdf
              const sdRapm = paramErrs.map((p: number) =>
                Math.sqrt(Math.sqrt(p) * errSq * dofInv),
              );
              if (debugMode)
                console.log(
                  "sdRapm: " + sdRapm.map((p: number) => p.toFixed(3)),
                );

              // Completion criteria:
              if (!acc.foundLambda) {
                const [meanDiff, maxDiff] = (() => {
                  if (notFirstStep) {
                    //ie 2nd+ time onwards, so we can check diffs
                    const diffs = _.zip(
                      results,
                      acc.lastAttempt.results as number[],
                    ).map((zip: Array<number | undefined>) => {
                      return Math.abs((zip[1] || 0) - (zip[0] || 0));
                    });
                    const tempMaxDiff =
                      _.reduce(diffs, (a, b) => (a > b ? a : b)) || 0;
                    const tempMeanDiff = mean(diffs);

                    if (debugMode)
                      console.log(
                        `Diffs: u=[${tempMeanDiff.toFixed(
                          2,
                        )}] max=[${tempMaxDiff.toFixed(2)}]`,
                      );

                    return [tempMeanDiff, tempMaxDiff];
                  } else {
                    return [-1, -1];
                  }
                })();

                //(^ since we'll keep going in diag mode, ensure we don't change the actual processing flow)
                acc.output.ridgeLambda = ridgeLambda;

                const maybeRecursiveWeakPrior = ctx.priorInfo
                  .useRecursiveWeakPrior
                  ? RapmUtils.applyWeakPriors(
                      `${offOrDef}_adj_ppp`,
                      pctByPlayer[offOrDef]!,
                      {
                        ...ctx.priorInfo,
                        playersWeak: RapmUtils.buildWeakPriorFromRapm(
                          resultsPrePrior,
                          offOrDef,
                        ),
                      },
                      debugMode,
                    )(adjEffErrPrePrior, resultsPrePrior)
                  : resultsPrePrior;

                acc.output.rapmAdjPpp = (
                  ctx.priorInfo.noWeakPrior ? maybeRecursiveWeakPrior : results
                ).map((n) => n - ctx.priorInfo.basis[offOrDef]);
                acc.output.rapmRawAdjPpp = resultsPrePrior.map(
                  (n) => n - ctx.priorInfo.basis[offOrDef],
                );
                acc.output.solnMatrix = solver;

                const lastError = Math.abs(
                  (acc.lastAttempt.adjEffErr || adjEffErr) as number,
                );
                const errorExitThresh = isLowPossCountOff ? 1.35 : 1.05; //(steps are bigger in low poss count mode)

                // (if in diag mode we're injecting some extra steps at the start - can't actually pick them though)
                const canPickPrev =
                  !diagMode ||
                  lambda > lambdaRangeToUse[firstNonDiagLambdaIndex];
                const canPick =
                  !diagMode ||
                  lambda >= lambdaRangeToUse[firstNonDiagLambdaIndex];

                if (
                  canPickPrev &&
                  adjEffErr >= errorExitThresh &&
                  notFirstStep &&
                  Math.abs(adjEffErr) >= lastError
                ) {
                  //TODO: I have seen the error reduce down again, so what would be nice to pick the global min
                  // instead of just exiting here

                  if (debugMode)
                    console.log(
                      `-!!!!!!!!!!- DONE [ERROR EXCEEDED=${adjEffErr.toFixed(
                        2,
                      )}] PICK PREVIOUS [${acc.lastAttempt?.ridgeLambda?.toFixed(
                        2,
                      )}]`,
                    );
                  acc.foundLambda = true;
                  // Roll back to previous
                  acc.output.solnMatrix = acc.lastAttempt.solnMatrix;
                  acc.output.ridgeLambda = acc.lastAttempt.ridgeLambda;
                } else if (
                  canPick &&
                  meanDiff >= 0 &&
                  meanDiff < pickRidgeThresh[offOrDef]
                ) {
                  if (debugMode)
                    console.log(
                      `!!!!!!!!!!!! DONE PICK THIS [${ridgeLambda.toFixed(2)}]`,
                    );
                  acc.foundLambda = true;
                } else {
                  if (notFirstStep && adjEffErr >= errorExitThresh) {
                    if (debugMode)
                      console.log(
                        `(Error=[${adjEffErr.toFixed(
                          4,
                        )}] exceeded thresh=[${errorExitThresh}] but smaller than previous=[${lastError.toFixed(
                          4,
                        )}])`,
                      );
                  }
                  acc.lastAttempt = {
                    results: results, // so we can build diffs
                    ridgeLambda: ridgeLambda, // may need this value
                    solnMatrix: solver,
                    adjEffErr: adjEffErr,
                  };
                }
              }
              // Add diags for any step on which we've done processing
              acc.output.prevAttempts.push({
                ridgeLambda: ridgeLambda,
                results: results.map((n) => n - ctx.priorInfo.basis[offOrDef]),
              });
            } //(else short circuit processing, we're done)
          },
          {
            // The return vals we care about
            output: {
              ridgeLambda: -1,
              rapmAdjPpp: [],
              rapmRawAdjPpp: [],
              solnMatrix: null,
              playerPossPcts: pctByPlayer[offOrDef],
              prevAttempts: [] as Array<Record<string, any>>,
            } as RapmProcessingInputs,

            // These are throwaway
            lastAttempt: {} as Record<string, any>,
            foundLambda: false,
          },
        );
      },
    );
    return [testResults[0].output, testResults[1].output];
  }

  // 3] ERROR VALIDATION

  private static calcSlowPseudoInverse(
    playerWeightMatrix: any,
    ridgeLambda: number,
    ctx: RapmPlayerContext,
  ) {
    //https://en.wikipedia.org/wiki/Tikhonov_regularization
    const playerWeightMatrixT = transpose(playerWeightMatrix);
    const bottom = add(
      multiply(playerWeightMatrixT, playerWeightMatrix),
      multiply(ridgeLambda, identity(ctx.numPlayers)),
    );
    const bottomInv = inv(bottom).valueOf();
    return _.range(0, ctx.numPlayers).map((i) => Math.sqrt(bottomInv[i][i]));
  }

  static calculatePredictedOut(
    playerWeightMatrix: any,
    regressedPlayers: Array<any>,
    ctx: RapmPlayerContext,
  ) {
    return transpose(
      multiply(playerWeightMatrix, transpose(matrix(regressedPlayers))),
    ).valueOf();
  }

  static calculateResidualError(
    playerOuts: Array<any>,
    regressedOuts: Array<any>,
    ctx: RapmPlayerContext,
  ) {
    return _.reduce(
      _.zip(playerOuts, regressedOuts),
      (sum, ab: Array<number>) => sum + (ab[0] - ab[1]) ** 2,
      0,
    );
  }

  // 4] DIAGNOSTIC PROCESSING

  /** Pearson correlation matrix between players */
  private static calcPlayerCorrelations(
    weightMatrix: any,
    ctx: RapmPlayerContext,
  ): any {
    const weightMatrixT = transpose(weightMatrix).valueOf();
    const weightMeans = weightMatrixT.map(
      (row: number[]) => _.sum(row) / row.length,
    );
    const squares = weightMatrixT.map((row: number[], index: number) => {
      const mean = weightMeans[index] || 0;
      return Math.sqrt(
        _.reduce(row, (acc, v) => acc + (v - mean) * (v - mean), 0),
      );
    });
    const correlMatrix = identity(ctx.numPlayers);
    const correlMatrixBacking = correlMatrix.valueOf();
    for (let i = 0; i < ctx.numPlayers; i++) {
      for (let j = 0; j < i; j++) {
        const veci: number[] = weightMatrixT[i] || [];
        const vecj: number[] = weightMatrixT[j] || [];
        const meani = weightMeans[i] || 0;
        const meanj = weightMeans[j] || 0;
        const sqi = squares[i] || 1;
        const sqj = squares[j] || 1;
        correlMatrixBacking[j][i] =
          _.reduce(
            veci,
            (acc: number, vi: number, index: number) => {
              return acc + (vi - meani) * (vecj[index] - meanj);
            },
            0,
          ) /
          (sqi * sqj);
        correlMatrixBacking[i][j] = correlMatrixBacking[j][i];
      }
    }
    return correlMatrix;
  }

  /** Looks for multi-collinearity conditions between players
      The cond index ("lineup combo") is 0-10 == safe, 10-30 == OKish, 30 - 100 problem
      With players 0.5+ is concerning (up to the max concern of the lineup combo)

      Note will throw if there are too few lineups
  */
  static calcCollinearityDiag(
    weightMatrix: any,
    ctx: RapmPlayerContext,
  ): RapmPreProcDiagnostics {
    const debugMode = false;

    if (debugMode) {
      console.log(`in=[${JSON.stringify(weightMatrix.valueOf(), null, 3)}]`);
    }

    // Algorithm inferred from https://github.com/brian-lau/colldiag/blob/master/colldiag.m
    // (test using https://www.mathworks.com/help/matlab/ref/double.svd.html)

    // SVD
    const { v, q } = SVD(weightMatrix.valueOf(), false);

    if (debugMode) {
      console.log(`q=[${q}], v=[${JSON.stringify(v, null, 3)}]`);
    }

    const sortedQWithIndex = _.chain(q)
      .zip(_.range(0, ctx.numPlayers))
      .sortBy([(zip) => zip[0]])
      .value() as Array<Array<number>>;

    if (debugMode) {
      console.log(`sort(q_i)=[${JSON.stringify(sortedQWithIndex)}]`);
    }

    // Ratio of largest singular value to all singular values
    const largestEig = sortedQWithIndex[q.length - 1][0] || 0;

    const condIndicesWithIndex = sortedQWithIndex
      .filter((zip) => (zip[0] || 0) > 0)
      .map((zip: Array<number>) => {
        return [largestEig / (zip[0] || 1), zip[1] || 0];
      });

    if (debugMode) {
      console.log(`cond_ind=[${JSON.stringify(condIndicesWithIndex)}]`);
    }

    // variance decomposition proportions
    const lambdaInvArray = q.map((eig: number) => {
      const eigRatioSq = eig > 0 ? 1.0 / (eig * eig) : 0;
      return eigRatioSq;
    });

    if (debugMode) {
      console.log(`1/lambdaSq=[${JSON.stringify(lambdaInvArray)}]`);
    }

    const vMatrix = matrix(v);
    const vMatrixT = transpose(vMatrix);
    const phiMatrix = matrix(
      vMatrixT.valueOf().map((row: Array<number>, index: number) => {
        const lambda = lambdaInvArray[index];
        return row.map((val: number) => val * val * lambda);
      }),
    );
    const phiMatrixInvSumArray = apply(phiMatrix, 0, sum)
      .valueOf()
      .map((val: number) => 1.0 / val);

    if (debugMode) {
      console.log(`phi=[${JSON.stringify(phiMatrix.valueOf(), null, 3)}]`);
      console.log(`1/col_sum(phi)=[${JSON.stringify(phiMatrixInvSumArray)}]`);
    }

    const vdpMatrix = matrix(
      phiMatrix.valueOf().map((row: Array<number>) => {
        return row.map(
          (val: number, index: number) => val * phiMatrixInvSumArray[index],
        );
      }),
    );
    const vdpRaw = vdpMatrix.valueOf();

    if (debugMode) {
      console.log(`vdp=[${JSON.stringify(vdpRaw)}]`);
    }

    // Now build an actual player/lineup specific construct

    // the result of all the matrix stuff is like: (descending sorted)
    // (C_I) ... player[0] ............ player[n]
    // C_I_0 ... VDP_RAW[s(0), 0], ..., VDP_RAW[s(0), n]
    // C_I_1 ... VDP_RAW[s(1), 0], ..., VDP_RAW[s(1), n]
    // ...
    // For the output, we're going to transpose that, ie:
    // player[0]: [  VDP_RAW[s(0), 0], ..., VDP_RAW[s(N), 0] ]

    const condIndicesSortedIndex = condIndicesWithIndex.map((zip) => zip[1]);

    // Now build the correlation matrix and use to build some
    const offPossCorrel = multiply(transpose(weightMatrix), weightMatrix);

    const correlMatrix = RapmUtils.calcPlayerCorrelations(weightMatrix, ctx);
    const tmpCorrelMatrix = correlMatrix.valueOf();
    const adaptiveCorrelRow = offPossCorrel
      .valueOf()
      .map((row: number[], i: number) => {
        const selfPct = row[i]!;
        const weight = selfPct > 0 ? 0.25 / selfPct : 0;
        const weightedAbsCorrel =
          weight *
          _.chain(row)
            .map((val: number, j: number) =>
              i != j ? Math.abs(tmpCorrelMatrix[i]![j]! as number) * val : 0,
            )
            .sum()
            .value();
        return weightedAbsCorrel;
      });
    return {
      lineupCombos: condIndicesWithIndex.map((zip) => zip[0]),
      playerCombos: _.chain(ctx.colToPlayer)
        .map((player, playerIndex) => {
          return [
            player,
            condIndicesSortedIndex.map((lineupComboIndex) => {
              return vdpRaw[lineupComboIndex][playerIndex];
            }),
          ];
        })
        .fromPairs()
        .value(),
      correlMatrix: correlMatrix,
      possCorrelMatrix: offPossCorrel,
      adaptiveCorrelWeights: adaptiveCorrelRow,
    };
  }
}
