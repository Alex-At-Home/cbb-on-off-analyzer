
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

//////////////////////////////////////////////////////////////////////////////////////////

// Lodash:
import _ from "lodash";

// Other app utils
import { LineupUtils } from "./LineupUtils";
import { LuckUtils } from "./LuckUtils";
import { CommonTableDefs } from "../CommonTableDefs";

// Math utils
// @ts-ignore
import { SVD } from 'svd-js'
// @ts-ignore
import { add, apply, diag, identity, inv, matrix, mean, multiply, resize, row, sum, transpose, variance, zeros } from 'mathjs';

/** Contains the prior info for individuals (strong priors dominate RAPM, weak priors are dominated)*/
export type RapmPriorInfo = {
  strongWeight: number,
  includeStrong: Record<string, boolean>; //(only need to set if unbiasWeight>0, else unused - TODO planning to remove unbiasWeight)
  playersStrong: Array<Record<string, number>>;
  playersWeak: Array<Record<string, number>>;
};
/** Handy util to */
const getStrongWeight = (prior: RapmPriorInfo, maybeAdaptiveFallback: number | undefined) => {
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
  /** The threshold of %s at which a player should be removed */
  removalPct: number;

  /** Players that have been removed */
  removedPlayers: Record<string, [number, number]>;
  /** The column corresponding to the player */
  playerToCol: Record<string, number>;
  /** The player name in each column */
  colToPlayer: Array<string>;
  /** A shallow copy of the lineups, minus ones with removed player or no off/def possessions */
  filteredLineups: Array<any>;
  /** An aggregated view of filteredLineups */
  teamInfo: Record<string, any>;
  /** The D1 average efficiency */
  avgEfficiency: number;
  // Handy counts:
  numPlayers: number;
  numLineups: number;
  offLineupPoss: number;
  defLineupPoss: number;
  // Prios:
  priorInfo: RapmPriorInfo;
};

/** Holds the multi-collinearity info */
export type RapmPreProcDiagnostics = {
  lineupCombos: Array<number>;
  playerCombos: Record<string, Array<number>>,
  correlMatrix: any,
  possCorrelMatrix: any,
  adaptiveCorrelWeights: number[]
};

export type RapmProcessingInputs = {
  solnMatrix: any | null,
  ridgeLambda: number,
  rapmAdjPpp: Array<number>,
  rapmRawAdjPpp: Array<number>, //(no priors)
  playerPossPcts: Array<number>,
  prevAttempts: Array<any> //TODO make this list of diag objects typed
};

export type RapmInfo = {
  ctx: RapmPlayerContext,
  preProcDiags?: RapmPreProcDiagnostics,
  offWeights: any,
  defWeights: any,
  offInputs: RapmProcessingInputs,
  defInputs: RapmProcessingInputs
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
}

/** Wrapper for some math to calculate RAPM and its various artefacts */
export class RapmUtils {

  // 1] INITIALIZATION LOGIC

  /** Builds priors for all the supported fields for all players */
  static buildPriors(
    playersBaseline: Record<string, any>,
    colToPlayer: Array<string>,
    priorMode: number //(-1 for adaptive mode)
  ): RapmPriorInfo {
    return {
      includeStrong: {}, //(see RapmPriorInfo type definition, not needed unless unbiasWeight > 0)
      strongWeight: priorMode, //(how much of a lineup is attributed to RAPM, and how much to the prior)
      playersWeak: colToPlayer.map(player => {
        const stats = playersBaseline[player] || {};
        if (stats) {
          return {
            off_adj_ppp: stats.off_adj_rtg?.value || 0,
            def_adj_ppp: stats.def_adj_rtg?.value || 0,
          } as Record<string, number>;
        } else return {} as Record<string, number>;
      }),
      playersStrong: colToPlayer.map(player => {
        const stats = playersBaseline[player] || {};
        if (stats) {
          return {
            off_adj_ppp: stats.off_adj_rtg?.value || 0,
          } as Record<string, number>;
        } else return {} as Record<string, number>;
      }),
    };
  }

  /**
  * Builds a context object with functionality required by further processing
  * removalPct - the min% (eg 10%) of possessions a player must have
  * unbiasWeight - if >0 adds an extra row with the desired combined results (eg 2)
  */
  static buildPlayerContext(
    players: Array<any>,
    lineups: Array<any>
    ,
    playersBaseline: Record<string, any> //(used for building priors)
    ,
    avgEfficiency: number
    ,
    removalPct: number = 0.06,
    priorMode: number = -1, //(or 0-1 for fixed strong prior)
    // REMOVED CODE:
//    unbiasWeight: number = 0.0, //TODO; with the new prior code, don't use this (used to be 2.0)
  ): RapmPlayerContext {
    const unbiasWeight = 0.0; //(see above)

    // The static threshold for removing players
    // (who do more harm than good)
    // (2x to approximate checking both offense and defense)
    const totalLineups =
      (players?.[0]?.on?.off_poss?.value || 0) + (players?.[0]?.off?.off_poss?.value || 0) +
      (players?.[0]?.on?.def_poss?.value || 0) + (players?.[0]?.off?.def_poss?.value || 0);
    const removalThreshold = removalPct*totalLineups || 1;
    // Filter out players with too few possessions
    var checkForPlayersToRemove = true; //(always do the full processing loop once)
    var currFilteredLineupSet = [];
    const removedPlayersSet: Record<string, [number, number]> = {};
    const playerPossessionCountTracker: Record<string, number> = {};
    while (checkForPlayersToRemove) {
      _.chain(players).filter((p: any) => !p.rapmRemove).forEach((p: any) => {
        const playerId = p.playerId as string || "";
        if (_.isNil(playerPossessionCountTracker[playerId])) {
          //(first time through, fill in the player possession tracker)
          playerPossessionCountTracker[playerId] =
            (p.on?.off_poss?.value || 0) + (p.on?.def_poss?.value || 0);
        }
        if (playerPossessionCountTracker[playerId] < removalThreshold) {
          p.rapmRemove = true; //(temp flag for peformance in this loop)
          const origPoss = (p.on?.off_poss?.value || 0) + (p.on?.def_poss?.value || 0);
          removedPlayersSet[playerId] =
            [ origPoss/totalLineups, playerPossessionCountTracker[playerId]/totalLineups ];
          checkForPlayersToRemove = true;
        }
      }).value();
      if (checkForPlayersToRemove) { //(always go through this first time)
        checkForPlayersToRemove = false; //(won't need to rerun unless we remove any new lineups)

        // Now need to go through lineups, remove them
        currFilteredLineupSet = _.chain(lineups).filter((l: any) => !l.rapmRemove).flatMap((l: any) => {
          // THIS FLATMAP HAS SIDE-EFFECTS

          const lineupPlayers = l?.players_array?.hits?.hits?.[0]?._source?.players || [];
          const shouldRemoveLineup =
            _.find(lineupPlayers, (p: any) => !_.isNil(removedPlayersSet[p.id as string])) //contains removed players
            ||
            (!l.off_poss?.value || !l.def_poss?.value); // only take lineup combos with both off and def combos

          if (shouldRemoveLineup) {
            l.rapmRemove = true; //(temp flag for peformance in this loop)
            const lineupPossCount = (l.off_poss?.value || 0) + (l.def_poss?.value || 0);
            // Loop over all the players, remove the lineup possessions from their counter
            _.chain(lineupPlayers).forEach((lp: any) => {
              playerPossessionCountTracker[lp.id as string] =
                (playerPossessionCountTracker[lp.id as string] || 0) - lineupPossCount;
            }).value();
            checkForPlayersToRemove = true;
          }
          return l.rapmRemove ? [] : [ l ];
        }).value();
      }
    }
    // Calculate the aggregated team stats
    //(note includes pre-luck-adjusted stats if the main stats are luck adjusted)
    const teamInfo = LineupUtils.calculateAggregatedLineupStats(lineups);

    const sortedPlayers = _.chain(playerPossessionCountTracker).toPairs().filter((kv) => {
      return !removedPlayersSet.hasOwnProperty(kv[0]);
    }).sortBy(kv => -kv[1]).map((kv) => kv[0]).value();

    return {
      unbiasWeight: unbiasWeight
      ,
      removedPlayers: removedPlayersSet,
      removalPct: removalPct
      ,
      playerToCol: _.chain(sortedPlayers).map((playerId, index) => {
        return [ playerId, index ]
      }).fromPairs().value()
      ,
      colToPlayer: sortedPlayers
      ,
      filteredLineups: currFilteredLineupSet
      ,
      teamInfo: teamInfo,
      avgEfficiency: avgEfficiency
      ,
      numPlayers: sortedPlayers.length,
      numLineups: currFilteredLineupSet.length,
      offLineupPoss: teamInfo.off_poss?.value || 0,
      defLineupPoss: teamInfo.def_poss?.value || 0
      ,
      priorInfo: RapmUtils.buildPriors(
        playersBaseline, sortedPlayers, priorMode
      )
    };
  }

  /** Calculates the weights and returns 2 matrices, one for off */
  static calcPlayerWeights(
    ctx: RapmPlayerContext,
  ) {
    const extra = ctx.unbiasWeight > 0;

    // Build a matrix of the right size:
    const offWeights = zeros(ctx.numLineups + (extra ? 1 : 0), ctx.numPlayers);
    const defWeights = zeros(ctx.numLineups + (extra ? 1 : 0), ctx.numPlayers);

    // Fill it in with the players
    const populateMatrix = (inMatrix: any, prefix: "off" | "def") => {
      ctx.filteredLineups.forEach((lineup, index) => {
        const possCount = (lineup as any)[`${prefix}_poss`]?.value || 0;
        const lineupRow = inMatrix.valueOf()[index];
        const lineupPossCount = ((ctx as any)[`${prefix}LineupPoss`] || 1);
        const possCountWeight = Math.sqrt(possCount/lineupPossCount);
        const inPlayers = lineup?.players_array?.hits?.hits?.[0]?._source?.players || [];
        inPlayers.forEach((player: any) => {
          const playerIndex = ctx.playerToCol[player.id];
          if (playerIndex >= 0) {
            lineupRow[playerIndex] = possCountWeight;
          } //(else this player is filtered out so ignore)
        });
      });
    };
    populateMatrix(offWeights, "off");
    populateMatrix(defWeights, "def");

    // Add the possession %s for each players
    if (ctx.unbiasWeight > 0) {
      const addExtraRow = (inMatrix: any) => {
        const inMatrixT = transpose(inMatrix);
        const bottomRow = inMatrix.valueOf()[ctx.numLineups];
        inMatrixT.valueOf().forEach((row: number[], i: number) => {
          bottomRow[i] =
            _.sum(row.map((v: number) => ctx.unbiasWeight*v*v));
        });
      };
      addExtraRow(offWeights);
      addExtraRow(defWeights);
    }
    return [ offWeights, defWeights ];
  }

  /** Calculate the output vectors (as 1-d arrays) against which we'll fit the vectors */
  static calcLineupOutputs(
    field: string,
    offOffset: number, defOffset: number,
    ctx: RapmPlayerContext,
    adaptiveCorrelWeights: number[] | undefined,
    useOldValIfPossible: boolean = false
  ) {
    const getVal = (o: any) => {
      return useOldValIfPossible ?
        ((_.isNil(o?.old_value) ? o?.value : o?.old_value) || 0) :
        o?.value || 0;
    };
    const offsets = {
      off: offOffset,
      def: defOffset
    }
    const calculateVector = (prefix: "off" | "def") => {
      return ctx.filteredLineups.map((lineup: any) => {
        const possCount = (lineup as any)[`${prefix}_poss`]?.value || 0;
        const lineupPossCount = ((ctx as any)[`${prefix}LineupPoss`] || 1);
        const possCountWeight = Math.sqrt(possCount/lineupPossCount);
        const val = getVal((lineup as any)[`${prefix}_${field}`]);

        var priorOffset = offsets[prefix];

        const inPlayers = lineup?.players_array?.hits?.hits?.[0]?._source?.players || [];
        inPlayers.forEach((player: any) => {
          const playerIndex = ctx.playerToCol[player.id];
          if (playerIndex >= 0) {
            const strongWeight = getStrongWeight(ctx.priorInfo, adaptiveCorrelWeights?.[playerIndex]);
            priorOffset += strongWeight*ctx.priorInfo.playersStrong[playerIndex]![`${prefix}_${field}`] || 0;
          } //(else this player is filtered out so ignore - exception case I think)
        });
        return (val - priorOffset)*possCountWeight;
      });
    };
    const extra = ctx.unbiasWeight > 0;

    return [
      calculateVector("off").concat(
        extra ?
        (ctx.priorInfo.includeStrong[`off_${field}`] ?
          [ 0 ] : [ ctx.unbiasWeight*(getVal(ctx.teamInfo[`off_${field}`])  - offOffset) ])
          : []
      ),
      calculateVector("def").concat(
        extra ?
        (ctx.priorInfo.includeStrong[`def_${field}`] ?
          [ 0 ] : [ ctx.unbiasWeight*(getVal(ctx.teamInfo[`def_${field}`])  - defOffset) ])
          : []
      )
    ];
  }

  // 2] PROCESSING

  /** Calculates a regression matrix using Tikhonov regression */
  private static slowRegression(
    playerWeightMatrix: any,
    ridgeLambda: number,
    ctx: RapmPlayerContext
  ) {
    //https://en.wikipedia.org/wiki/Tikhonov_regularization
    const playerWeightMatrixT = transpose(playerWeightMatrix)
    const bottom = add(
      multiply(playerWeightMatrixT, playerWeightMatrix),
      multiply(ridgeLambda, identity(ctx.numPlayers))
    );
    const bottomInv = inv(bottom);
    return multiply(
      bottomInv, playerWeightMatrixT
    );
  }

  /** Applies the regression matrix to the outputs */
  static calculateRapm(
    regressionMatrix: any,
    playerOutputs: Array<number>
  ) {
    const out = transpose(matrix(playerOutputs));
    return transpose(multiply(regressionMatrix, out)).valueOf();
  }

  /** Injects the RAPM predicted diffs into player.rapm
   * NOTE: useOldVals=true needs to be run after useOldVals=false
   * (since it injects the old value versions into the existing one)
   */
  static injectRapmIntoPlayers(
    players: Array<Record<string, any>>,
    offRapmInput: RapmProcessingInputs, defRapmInput: RapmProcessingInputs,
    statsAverages: Record<string, any>,
    ctx: RapmPlayerContext,
    adaptiveCorrelWeights: number[] | undefined,
    useOldVals: boolean = false
  ) {
    const getVal = (o: any) => { //(in practice we're going to discard fields without old_value anyway)
      return useOldVals ?
        ((_.isNil(o?.old_value) ? o?.value : o?.old_value) || 0) :
        o?.value || 0;
    };
    if (offRapmInput.solnMatrix && defRapmInput.solnMatrix) {
      const rapmInput = {
        off: offRapmInput,
        def: defRapmInput
      };
      // Get a map (per field) of arrays (per player) of the RAPM results
      const fieldToPlayerRapmArray = (useOldVals ?
        _.chain(LuckUtils.affectedPartialFieldnames).filter(p => p != "ppp") :
        _.chain(CommonTableDefs.onOffReportReplacement).omit(
          [ "title", "sep0", "ppp", "sep1", "sep2", "sep3", "sep4", "poss", "adj_opp" ]
        ).keys()
      ).flatMap((partialField: string) => {
        const [ offOffset, defOffset ] = ({
          "ppp": [ ctx.avgEfficiency, ctx.avgEfficiency ],
          "adj_ppp": [ ctx.avgEfficiency, ctx.avgEfficiency ],
        } as Record<string, any>)[partialField] || [
          statsAverages[`off_${partialField}`]?.value || getVal(ctx.teamInfo[`off_${partialField}`]),
          statsAverages[`def_${partialField}`]?.value || getVal(ctx.teamInfo[`def_${partialField}`])
        ];
        const [ offVal, defVal ] = RapmUtils.calcLineupOutputs(
          partialField, offOffset, defOffset, ctx, adaptiveCorrelWeights, useOldVals //TODO: adaptive weight here
        );
        const vals = {
          off: offVal, def: defVal
        };
        const onOffField = _.chain(["off", "def"]).map((offOrDef: "off" | "def") => {
          const field = `${offOrDef}_${partialField}`;
          const resultsPrePrior: number[] = RapmUtils.calculateRapm(
            rapmInput[offOrDef].solnMatrix, vals[offOrDef]
          );
          const results = (partialField == "adj_ppp") ?
            rapmInput[offOrDef].rapmAdjPpp :
            ctx.priorInfo.playersStrong.map((stat, index) => {
              const strongWeight = getStrongWeight(ctx.priorInfo, adaptiveCorrelWeights?.[index]);
              return strongWeight*(stat[`${offOrDef}_${partialField}`] || 0) + resultsPrePrior[index]!;
            });

          return [ field, results ];
        }).value(); //(ie [ ON, OFF ] where ON/OFF = [ (on|off)_field, [ results ] ] )

        return onOffField;

      }).fromPairs().value(); //ie returns [ ON1, OFF1, ON2, OFF2, ... ] where ON/OFF as above

      const keyForValOrOldVal = useOldVals ? "old_value" : "value";
      players.filter((p) => !ctx.removedPlayers.hasOwnProperty(p.playerId)).forEach((p) => {
        const index = ctx.playerToCol[p.playerId];
        const playerRapm = _.chain(fieldToPlayerRapmArray).toPairs().map((kv) => {
          return [ kv[0] , {
            [keyForValOrOldVal]: kv[1][index],
            override: useOldVals ? ctx.teamInfo[kv[0]]?.override : undefined
          } ];
        }).fromPairs().merge({
          key: `RAPM ${p.playerId}`,
          off_poss: ctx.teamInfo.off_poss, def_poss: ctx.teamInfo.def_poss
        }).value();

        p.rapm = useOldVals ? _.merge(p.rapm, playerRapm)  : playerRapm;
      });
    } //(else do nothing)
  }

  /** Use of ridge regression depresses the numbers towards 0. The weak priors let
      us "fill" the error with the prior stats
  */
  static applyWeakPriors(
    field: string,
    playerPossPcts: Array<number>,
    priorInfo: RapmPriorInfo
  ) {
    const priorSum =
      _.chain(priorInfo.playersWeak).map((p, ii) => (p[field] || 0)*playerPossPcts[ii]!).sum().value();

    return (error: number, baseResults: Array<number>) => {
      const priorSumInv = priorSum != 0 ? 1/priorSum: 0;
      const errorTimesSumInv = Math.min(0, Math.max(-0.5, error*priorSumInv));
      //(if the error is -ve, the actual eff is > RAPM, so need to add to RAPM (ie more +ve), hence errorTimesSumInv must be -ve, else ignore)
      //(if the error is +ve. the actual eff is < RAPM, so need to reduce RAPM (ie move -ve), hence errorsTimesSunInv must be
      // .... still -ve ...! Because of priorInv factor (which will on average same sign as priorSumInv)
      //(because it's -error*errorTimesSumInv*prior[player] below)

      // ... And then also can only take a <50% chunk of the priors

      //USEFUL DEBUG:
      //console.log(`prior=[${priorSum}] error=[${error}] tot=[${error*priorSumInv}] => [${errorTimesSumInv}]`);

      return baseResults.map((r, ii) => {
        return r - errorTimesSumInv*(priorInfo.playersWeak[ii]![field] || 0);
      });
    };
  }

  /**
  * Select a good ridge regression factor to use
  * If diagMode is enabled then add info about each possible regression value
  */
  static pickRidgeRegression(
    offWeights: any, defWeights: any,
    ctx: RapmPlayerContext,
    adaptiveCorrelWeights: number[] | undefined,
    diagMode: boolean,
    useOldValIfPossible: boolean = false
  ) {
    const getVal = (o: any) => {
      return useOldValIfPossible ?
        ((_.isNil(o?.old_value) ? o?.value : o?.old_value) || 0) :
        o?.value || 0;
    };

    const offDefDebugMode = { off: false, def: false };
    const generateTestCases = false;

    if (offDefDebugMode.off || offDefDebugMode.def) {
      console.log(`RAPM Priors = [${JSON.stringify(ctx.priorInfo, tidyNumbers)}]`);
      if (adaptiveCorrelWeights) console.log(`Adaptive weights = [${JSON.stringify(adaptiveCorrelWeights, tidyNumbers)}]`);
    }

    const weights = {
      off: offWeights,
      def: defWeights
    };
    // For creating tests
    if (generateTestCases) { //(double-safety: if guard AND commented out!)
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
      def: SVD(weights.def.valueOf())
    };

    // Get an approximate idea of the scale of the lambdas:
    const avgEigenVal = 0.5*mean(svd.off.q) + 0.5*mean(svd.def.q);
    const actualEff = {
      off: getVal(ctx.teamInfo.off_adj_ppp) - ctx.avgEfficiency,
      def: getVal(ctx.teamInfo.def_adj_ppp) - ctx.avgEfficiency
    };

    // Build player usage vectors:
    const pctByPlayer = (() => {
      const buildUsageVector = (onOrOff: "off" | "def") => {
        if (ctx.unbiasWeight > 0) {
          return weights[onOrOff].valueOf()[ctx.numLineups].map((v: number) => v/ctx.unbiasWeight);
        } else {
          const weightT = transpose(weights[onOrOff]);
          return weightT.valueOf().map((row: number[]) => {
            return _.sum(row.map((v: number) => v*v));
          });
        }
      };
      return {
        off: buildUsageVector("off") as number[],
        def: buildUsageVector("def") as number[]
      };
    })();
    const useWeakPriorsToFixErrors = {
      off: RapmUtils.applyWeakPriors(`off_adj_ppp`, pctByPlayer.off, ctx.priorInfo),
      def: RapmUtils.applyWeakPriors(`def_adj_ppp`, pctByPlayer.def, ctx.priorInfo)
    };

    if (offDefDebugMode.off) console.log(`(Off) Player Poss = [${pctByPlayer.off.map((p: number) => p.toFixed(2))}]`);

    const [ offAdjPoss, defAdjPoss ] = RapmUtils.calcLineupOutputs(
      "adj_ppp", ctx.avgEfficiency, ctx.avgEfficiency, ctx, adaptiveCorrelWeights, useOldValIfPossible
    );
    const adjPoss = {
      off: offAdjPoss,
      def: defAdjPoss
    };

    const pickRidgeThresh = { off: 0.061, def: 0.091 }; //(more confident in offensive priors)
    const lambdaRange = [ 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4.0 ];
    const usedLambdaRange = _.drop(lambdaRange, diagMode ? 0 : 3)
    const testResults = ([ "off", "def" ] as Array<"off" | "def">).map((offOrDef: "off" | "def") =>
      _.transform(usedLambdaRange, (acc, lambda) => {
        const notFirstStep = lambda > usedLambdaRange[0];
        if (!acc.foundLambda || diagMode) {
          const debugMode = offDefDebugMode[offOrDef];
          const ridgeLambda = lambda*avgEigenVal; //(scale lambda according to the scale of the weight matrix)

          if (debugMode) console.log(`********* [${offOrDef}] RAPM WITH LAMBDA ` + ridgeLambda.toFixed(3) + " / " + lambda);

          const solver = RapmUtils.slowRegression(weights[offOrDef], ridgeLambda, ctx);
          const resultsPrePrePrior: number[] = RapmUtils.calculateRapm(solver, adjPoss[offOrDef]);

          // Apply strong prior if present:
          const resultsPrePrior = ctx.priorInfo.playersStrong.map(
            (stat, index) => {
              const strongWeight = getStrongWeight(ctx.priorInfo, adaptiveCorrelWeights?.[index]);
              return strongWeight*(stat[`${offOrDef}_adj_ppp`] || 0) + resultsPrePrePrior[index]!;
            }
          );

          const combinedAdjEffPrePrior = _.sum(_.zip(pctByPlayer[offOrDef], resultsPrePrior).map((zip: Array<number|undefined>) => {
            return (zip[0] || 0)*(zip[1] || 0);
          }));
          const adjEffErrPrePrior = combinedAdjEffPrePrior - actualEff[offOrDef];
          const adjEffAbsErrPrePrior = Math.abs(adjEffErrPrePrior);

          const results = useWeakPriorsToFixErrors[offOrDef](adjEffErrPrePrior, resultsPrePrior);

          const combinedAdjEff = _.sum(_.zip(pctByPlayer[offOrDef], results).map((zip: Array<number|undefined>) => {
            return (zip[0] || 0)*(zip[1] || 0);
          }));
          const adjNonAbsEffErr = combinedAdjEff - actualEff[offOrDef];
          const adjEffErr = Math.abs(adjNonAbsEffErr);

          if (debugMode) { // Debug mode only (primary info)
            console.log(ctx.colToPlayer);
            console.log("rapm[PREPRE]: " + resultsPrePrePrior.map((p: number) => p.toFixed(3)));
            console.log("rapm[PRE]: " + resultsPrePrior.map((p: number) => p.toFixed(3)));
            console.log("rapm[POST]: " + results.map((p: number) => p.toFixed(3)));
            console.log(
              `combinedRapm[PRE] = [${combinedAdjEffPrePrior.toFixed(1)}] vs actualEff = [${actualEff[offOrDef].toFixed(1)}] ... ` +
              `Err[PRE] = [${adjEffErrPrePrior.toFixed(1)}] Err[POST] = [${adjNonAbsEffErr.toFixed(1)}]`
            );
          }

          if (debugMode) { // Debug mode only (secondary info)
            const residuals = RapmUtils.calculatePredictedOut(weights[offOrDef], results, ctx);
            const errSq = RapmUtils.calculateResidualError(adjPoss[offOrDef], residuals, ctx);
            const dofInv = 1.0/(ctx.numLineups - ctx.numPlayers); //(degrees of freedom)

            //console.log(`RSS = [${offErrSq.toFixed(1)}] + [${defErrSq.toFixed(1)}]`);
            console.log(`MSS = [${(errSq*dofInv).toFixed(1)}]`);

            const paramErrs = RapmUtils.calcSlowPseudoInverse(weights[offOrDef], ridgeLambda, ctx);

            // https://arxiv.org/pdf/1509.09169.pdf
            const sdRapm = paramErrs.map((p: number) => Math.sqrt(Math.sqrt(p)*errSq*dofInv));
            console.log("sdRapm: " + sdRapm.map((p: number) => p.toFixed(3)));
          }

          // Completion criteria:
          if (!acc.foundLambda) {

            const [ meanDiff, maxDiff ] = (() => {
              if (notFirstStep) { //ie 2nd+ time onwards, so we can check diffs
                const diffs = _.zip(
                  results, acc.lastAttempt.results as number[]
                ).map((zip: Array<number|undefined>) => {
                  return Math.abs((zip[1] || 0) - (zip[0] || 0));
                });
                const tempMaxDiff = _.reduce(diffs, (a, b) => a > b ? a : b) || 0;
                const tempMeanDiff = mean(diffs);

                if (debugMode) console.log(`Diffs: u=[${tempMeanDiff.toFixed(2)}] max=[${tempMaxDiff.toFixed(2)}]`);

                return [ tempMeanDiff, tempMaxDiff ];
              } else { return [ -1, -1 ]; }
            })();

            //(^ since we'll keep going in diag mode, ensure we don't change the actual processing flow)
            acc.output.ridgeLambda = ridgeLambda;
            acc.output.rapmAdjPpp = results;
            acc.output.rapmRawAdjPpp = resultsPrePrior;
            acc.output.solnMatrix = solver;
            if ((adjEffErr >= 1.05) && notFirstStep) {
              if (debugMode) console.log(`-!!!!!!!!!!- DONE PICK PREVIOUS [${acc.lastAttempt?.ridgeLambda?.toFixed(2)}]`);
              acc.foundLambda = true;
              // Roll back to previous
              acc.output.solnMatrix = acc.lastAttempt.solnMatrix;
              acc.output.ridgeLambda = acc.lastAttempt.ridgeLambda;
            } else if ((meanDiff >= 0) && (meanDiff < pickRidgeThresh[offOrDef])) {
              if (debugMode) console.log(`!!!!!!!!!!!! DONE PICK THIS [${ridgeLambda.toFixed(2)}]`);
              acc.foundLambda = true;
            } else {
              acc.lastAttempt = {
                results: results, // so we can build diffs
                ridgeLambda: ridgeLambda, // may need this value
                solnMatrix: solver
              };
            }
          }
          // Add diags for any step on which we've done processing
          acc.output.prevAttempts.push({
            ridgeLambda: ridgeLambda,
            results: results
          });

        }//(else short circuit processing, we're done)
      }, {
        // The return vals we care about
        output: {
          ridgeLambda: -1,
          rapmAdjPpp: [],
          rapmRawAdjPpp: [],
          solnMatrix: null,
          playerPossPcts: pctByPlayer[offOrDef],
          prevAttempts: [] as Array<Record<string, any>>
        } as RapmProcessingInputs,

        // These are throwaway
        lastAttempt: {} as Record<string, any>,
        foundLambda: false
      })
    );
    return [
      testResults[0].output, testResults[1].output
    ];
  }

  // 3] ERROR VALIDATION

  private static calcSlowPseudoInverse(
    playerWeightMatrix: any,
    ridgeLambda: number,
    ctx: RapmPlayerContext
  ) {
    //https://en.wikipedia.org/wiki/Tikhonov_regularization
    const playerWeightMatrixT = transpose(playerWeightMatrix)
    const bottom = add(
      multiply(playerWeightMatrixT, playerWeightMatrix),
      multiply(ridgeLambda, identity(ctx.numPlayers))
    );
    const bottomInv = inv(bottom).valueOf();
    return _.range(0, ctx.numPlayers).map((i) => Math.sqrt(bottomInv[i][i]));
  }

  static calculatePredictedOut(
    playerWeightMatrix: any,
    regressedPlayers: Array<any>,
    ctx: RapmPlayerContext
  ) {
    return transpose(
      multiply(playerWeightMatrix, transpose(matrix(regressedPlayers)))
    ).valueOf();
  }

  static calculateResidualError(
    playerOuts: Array<any>,
    regressedOuts: Array<any>,
    ctx: RapmPlayerContext
  ) {
    return _.reduce(
      _.zip(playerOuts, regressedOuts),
      (sum, ab: Array<number>) => sum + (ab[0] - ab[1])**2,
      0
    );
  }

  // 4] DIAGNOSTIC PROCESSING

  /** Pearson correlation matrix between players */
  private static calcPlayerCorrelations(
    weightMatrix: any,
    ctx: RapmPlayerContext
  ): any {
    const weightMatrixT = transpose(weightMatrix).valueOf();
    const weightMeans = weightMatrixT.map((row: number[]) => _.sum(row)/row.length);
    const squares = weightMatrixT.map((row: number[], index: number) => {
      const mean = weightMeans[index] || 0;
      return Math.sqrt(_.reduce(row, (acc, v) => acc + (v - mean)*(v - mean), 0));
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
        correlMatrixBacking[j][i] = _.reduce(veci, (acc: number, vi: number, index: number) => {
          return acc + (vi - meani)*(vecj[index] - meanj);
        }, 0)/(sqi*sqj);
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
    ctx: RapmPlayerContext
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
      console.log(`q=[${q}], v=[${JSON.stringify(v, null ,3)}]`);
    }

    const sortedQWithIndex = _.chain(q).zip(_.range(0, ctx.numPlayers)).sortBy([(zip) => zip[0]]).value() as Array<Array<number>>;

    if (debugMode) {
      console.log(`sort(q_i)=[${JSON.stringify(sortedQWithIndex)}]`);
    }

    // Ratio of largest singular value to all singular values
    const largestEig = sortedQWithIndex[q.length - 1][0] || 0;

    const condIndicesWithIndex = sortedQWithIndex.filter(zip => (zip[0] || 0) > 0).map((zip: Array<number>) => {
      return [ largestEig/(zip[0] || 1), (zip[1] || 0) ];
    });

    if (debugMode) {
      console.log(`cond_ind=[${JSON.stringify(condIndicesWithIndex)}]`);
    }

    // variance decomposition proportions
    const lambdaInvArray = q.map((eig: number) => {
      const eigRatioSq = eig > 0 ? 1.0/(eig*eig) : 0;
      return eigRatioSq;
    });

    if (debugMode) {
      console.log(`1/lambdaSq=[${JSON.stringify(lambdaInvArray)}]`);
    }

    const vMatrix = matrix(v);
    const vMatrixT = transpose(vMatrix);
    const phiMatrix = matrix(vMatrixT.valueOf().map((row: Array<number>, index: number) => {
      const lambda = lambdaInvArray[index];
      return row.map((val: number) => val*val*lambda);
    }));
    const phiMatrixInvSumArray = apply(phiMatrix, 0, sum).valueOf().map((val: number) => 1.0/val);

    if (debugMode) {
      console.log(`phi=[${JSON.stringify(phiMatrix.valueOf(), null, 3)}]`);
      console.log(`1/col_sum(phi)=[${JSON.stringify(phiMatrixInvSumArray)}]`);
    }

    const vdpMatrix = matrix(phiMatrix.valueOf().map((row: Array<number>) => {
      return row.map((val: number, index: number) => val*phiMatrixInvSumArray[index]);
    }));
    const vdpRaw = vdpMatrix.valueOf();

    if (debugMode) {
      console.log(`vdp=[${JSON.stringify(vdpRaw)}]`)
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
    const adaptiveCorrelRow = offPossCorrel.valueOf().map((row: number[], i: number) => {
      const selfPct = row[i]!;
      const weight = selfPct > 0 ? 0.25/selfPct : 0;
      const weightedAbsCorrel = weight*
        _.chain(row).map((val: number, j: number) => (i != j) ? Math.abs(tmpCorrelMatrix[i]![j]! as number)*val : 0).sum().value();
      return weightedAbsCorrel;
    });
    return {
      lineupCombos: condIndicesWithIndex.map((zip) => zip[0]),
      playerCombos: _.chain(ctx.colToPlayer).map((player, playerIndex) => {
        return [player, condIndicesSortedIndex.map((lineupComboIndex) => {
          return vdpRaw[lineupComboIndex][playerIndex];
        })]
      }).fromPairs().value(),
      correlMatrix: correlMatrix,
      possCorrelMatrix: offPossCorrel,
      adaptiveCorrelWeights: adaptiveCorrelRow
    };
  }


}
