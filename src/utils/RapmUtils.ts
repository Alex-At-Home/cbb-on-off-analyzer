
// Lodash:
import _ from "lodash";

// Other app utils
import { LineupUtils } from "./LineupUtils";
import { CommonTableDefs } from "./CommonTableDefs";

// Math utils
// @ts-ignore
import { SVD } from 'svd-js'
// @ts-ignore
import { add, apply, diag, identity, inv, matrix, mean, multiply, row, sum, transpose, variance, zeros } from 'mathjs';

/** Useful intermediate results */
export type RapmPlayerContext = {
  /** If true, then adds an additional row with the desired final result */
  unbiasWeight: number;

  /** Players that have been removed */
  removedPlayers: Record<string, number>;
  /** The column corresponding to the player */
  playerToCol: Record<string, number>;
  /** The player name in each column */
  colToPlayer: Array<string>;
  /** A shallow copy of the lineups, minus ones with removed player or no off/def possessions */
  filteredLineups: Array<any>,
  /** An aggregated view of filteredLineups */
  teamInfo: Record<string, any>,
  /** The D1 average efficiency */
  avgEfficiency: number,
  // Handy counts:
  numPlayers: number;
  numLineups: number;
  offLineupPoss: number;
  defLineupPoss: number;
};

/** Holds the multi-collinearity info */
export type RapmPreProcDiagnostics = {
  lineupCombos: Array<number>;
  playerCombos: Record<string, Array<number>>
};

export type RapmProcessingInputs = {
  solnMatrix: any | null,
  ridgeLambda: number,
  prevAttempts: Array<any> //TODO make this list of diag objects typed
/**/,
  effLambda: any
};

/** Wrapper for some math to calculate RAPM and its various artefacts */
export class RapmUtils {

  // 1] INITIALIZATION LOGIC

  /**
  * Builds a context object with functionality required by further processing
  * removalPct - the min% (eg 10%) of possessions a player must have
  * unbiasWeight - if >0 adds an extra row with the desired combined results (eg 2)
  */
  static buildPlayerContext(
    players: Array<any>,
    lineups: Array<any>,
    avgEfficiency: number
    ,
    removalPct: number = 0.10,
    unbiasWeight: number = 0.0, //TODO
  ): RapmPlayerContext {
    // The static threshold for removing players
    // (who do more harm than good)
    // (2x to approximate checking both offense and defense)
    const totalLineups = players?.[0]?.on?.off_poss?.value || 0;
    const removalThreshold = 2*removalPct*totalLineups;
    // Filter out players with too few possessions
    var checkForPlayersToRemove = true; //(always do the full processing loop once)
    var currFilteredLineupSet = [];
    const removedPlayersSet: Record<string, number> = {};
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
          removedPlayersSet[playerId] = playerPossessionCountTracker[playerId];
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
    const teamInfo = LineupUtils.calculateAggregatedLineupStats(lineups);

    const sortedPlayers = _.chain(playerPossessionCountTracker).toPairs().filter((kv) => {
      return !removedPlayersSet.hasOwnProperty(kv[0]);
    }).sortBy(kv => -kv[1]).map((kv) => kv[0]).value();

    return {
      unbiasWeight: unbiasWeight
      ,
      removedPlayers: removedPlayersSet
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
        const inPlayers = lineup?.players_array?.hits?.hits?.[0]?._source?.players || [];
        const lineupRow = inMatrix.valueOf()[index];
        const lineupPossCount = ((ctx as any)[`${prefix}LineupPoss`] || 1);
        const possCountWeight = Math.sqrt(possCount/lineupPossCount);
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
  ) {
    const offsets = {
      off: offOffset,
      def: defOffset
    }
    const calculateVector = (prefix: "off" | "def") => {
      return ctx.filteredLineups.map((lineup: any) => {
        const possCount = (lineup as any)[`${prefix}_poss`]?.value || 0;
        const lineupPossCount = ((ctx as any)[`${prefix}LineupPoss`] || 1);
        const possCountWeight = Math.sqrt(possCount/lineupPossCount);
        const val = (lineup as any)[`${prefix}_${field}`]?.value || 0;
        return (val - offsets[prefix])*possCountWeight;
      });
    };
    const extra = ctx.unbiasWeight > 0;

    return [
      calculateVector("off").concat(
        extra ? [ ctx.unbiasWeight*((ctx.teamInfo[`off_${field}`]?.value || 0)  - offOffset) ] : []
      ),
      calculateVector("def").concat(
        extra ? [ ctx.unbiasWeight*((ctx.teamInfo[`def_${field}`]?.value || 0)  - defOffset) ] : []
      )
    ];
  }

  // 2] PROCESSING

  /** Calculates a regression matrix using Tikhonov regression */
  private static slowRegression(
    playerWeightMatrix: any,
    ridgeLambda: number,
    ctx: RapmPlayerContext
  ): [ any, any ] { //(returns the pseudo-inverse, and also one of the factors we re-use)
    //https://en.wikipedia.org/wiki/Tikhonov_regularization
    const playerWeightMatrixT = transpose(playerWeightMatrix)
    const bottom = add(
      multiply(playerWeightMatrixT, playerWeightMatrix),
      multiply(ridgeLambda, identity(ctx.numPlayers))
    );
    const bottomInv = inv(bottom);
    return [ multiply(
      bottomInv, playerWeightMatrixT
    ), bottomInv ];
  }

  /** Applies the regression matrix to the outputs */
  static calculateRapm(
    regressionMatrix: any,
    playerOutputs: Array<number>
  ) {
    const out = transpose(matrix(playerOutputs));
    return transpose(multiply(regressionMatrix, out)).valueOf();
  }

  static slowCalcRapmWithPrior(
    regressionMatrix: any,
    regressionFactorMatrix: any,
    ridgeLambda: number,
    playerOutputs: Array<number>,
    prior: Array<number>
  ) {
    //MRR: http://www.utgjiu.ro/math/sma/v04/p08.pdf
    const out1 = transpose(matrix(playerOutputs));
    const part1 = transpose(multiply(regressionMatrix, out1)).valueOf();
    const out2 = transpose(matrix(prior.map((v) => v*ridgeLambda)));
    const part2 = transpose(multiply(regressionFactorMatrix, out2)).valueOf();

    return part1.map((v: number, i: number) => v + part2[i]);
  }

  /** Injects the RAPM predicted diffs into player.rapm */
  static injectRapmIntoPlayers(
    players: Array<Record<string, any>>,
    offRapmInput: RapmProcessingInputs, defRapmInput: RapmProcessingInputs,
    statsAverages: Record<string, any>,
    ctx: RapmPlayerContext
  ) {
    if (offRapmInput.solnMatrix && defRapmInput.solnMatrix) {
      const rapmInput = {
        off: offRapmInput,
        def: defRapmInput
      };
      // Get a map (per field) of arrays (per player) of the RAPM results
      const fieldToPlayerRapmArray = _.chain(CommonTableDefs.onOffReportReplacement).omit(
        [ "title", "sep0", "ppp", "sep1", "sep2", "sep3", "sep4", "poss", "adj_opp" ]
      ).keys().flatMap((partialField: string) => {
        const [ offOffset, defOffset ] = ({
          "ppp": [ ctx.avgEfficiency, ctx.avgEfficiency ],
          "adj_ppp": [ ctx.avgEfficiency, ctx.avgEfficiency ],
        } as Record<string, any>)[partialField] || [
          statsAverages[`off_${partialField}`]?.value || ctx.teamInfo[`off_${partialField}`]?.value || 0,
          statsAverages[`def_${partialField}`]?.value || ctx.teamInfo[`def_${partialField}`]?.value || 0
        ];
        const [ offVal, defVal ] = RapmUtils.calcLineupOutputs(
          partialField, offOffset, defOffset, ctx
        );
        const vals = {
          off: offVal, def: defVal
        }
        const onOffField = _.chain(["off", "def"]).map((offOrDef: "off" | "def") => {
          const field = `${offOrDef}_${partialField}`;
/**/
if (partialField == "adj_ppp") {
  const results = rapmInput[offOrDef].effLambda;
  return [ field, results ];
}
          const results: number[] = RapmUtils.calculateRapm(
            rapmInput[offOrDef].solnMatrix, vals[offOrDef]
          );
          return [ field, results ];
        }).value(); //(ie [ ON, OFF ] where ON/OFF = [ (on|off)_field, [ results ] ] )

        return onOffField;

      }).fromPairs().value(); //ie returns [ ON1, OFF1, ON2, OFF2, ... ] where ON/OFF as above

      players.filter((p) => !ctx.removedPlayers.hasOwnProperty(p.playerId)).forEach((p) => {
        const index = ctx.playerToCol[p.playerId];
        p.rapm = _.chain(fieldToPlayerRapmArray).toPairs().map((kv) => {
          return [ kv[0] , { value: kv[1][index] } ];
        }).fromPairs().merge({
          key: `RAPM ${p.playerId}`,
          off_poss: ctx.teamInfo.off_poss, def_poss: ctx.teamInfo.def_poss
        }).value();
      });
    } //(else do nothing)
  }

  /**
  * Select a good ridge regression factor to use
  * TODO: not sure how to test this!
  */
  static pickRidgeRegression(
    offWeights: any, defWeights: any,
    ctx: RapmPlayerContext
  ) {
    const debugMode = true;
    const generateTestCases = false;

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
    // https://en.wikipedia.org/wiki/Tikhonov_regularization#Relation_to_singular-value_decomposition_and_Wiener_filter

    // Thoughts:
    // 1) Using the prior to ensure the average is right seems to work better than doing the prior
    // properly + can see the exact amount used (eg 23%) when we stop iterating
    // 2) Prior calculation ... using the "r:on-off" and the adjusted defense seems extreme
    //    sidenote ... regressing all the stats the same seems dubious, would be interesting
    //    to see what the SD was and applying a regression factor that depended on that
    //    eg 3P%, mid-range% would be most affected? (counterpoint is 3P really any worse than say ORB or TO)


    // SVD
    // See https://en.wikipedia.org/wiki/Tikhonov_regularization#Determination_of_the_Tikhonov_factor
    const svd = {
      off: SVD(weights.off.valueOf()), // u, v, q==D
      def: SVD(weights.def.valueOf())
    };

    // Get an approximate idea of the scale of the lambdas:
    const avgEigenVal = 0.5*mean(svd.off.q) + 0.5*mean(svd.def.q);
    const actualEff = {
      off: ctx.teamInfo.off_adj_ppp.value - ctx.avgEfficiency,
      def: ctx.teamInfo.def_adj_ppp.value - ctx.avgEfficiency
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
/**/
console.log(ctx.colToPlayer);
    if (debugMode) console.log(`(Off) Player Poss = [${pctByPlayer.off.map((p: number) => p.toFixed(2))}]`);

    const [ offAdjPoss, defAdjPoss ] = RapmUtils.calcLineupOutputs(
      "adj_ppp", ctx.avgEfficiency, ctx.avgEfficiency, ctx
    );
    const adjPoss = {
      off: offAdjPoss,
      def: defAdjPoss
    };

//TODO: added 0/0.25 for illustration
    const lambdaRange = [ 0, 0.25,
      0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3 ];
    const testResults = ([ "off", "def" ] as Array<"off" | "def">).map((offOrDef: "off" | "def") =>
      _.transform(lambdaRange, (acc, lambda) => {

        /**/
        const weighter = (offOrDef == "off") ?
        [ 0, 0, 0, 0, 0, 0, 0, 0 ] :
//        [ -2.01, -3.19, -1.10, -6.68, -0.64, -2.86, -2.06, -1.5  ];
        [ -2.92,	-2.58,	-2.42,	-3.46,	-2.28,	-2.88,	-2.00, -2.00 ];
        const priors = (offOrDef == "off") ?
          pctByPlayer[offOrDef].map((ignore: number) => 0.2*actualEff[offOrDef]) :
//  [ -2.01, -3.19, -6.68, -1.10, -0.64, -2.86, -2.06, -1.5  ] :
//          [ -2.92,	-2.58,	-2.42,	-3.46,	-2.28,	-2.88,	-2.00, -2.00 ]
          [ 0, 0, 0, 0, 0, 0, 0, 0 ]
          ;
        if (debugMode) console.log(`(${offOrDef}) Priors = [${priors.map((p: number) => p.toFixed(2))}]`);

        const notFirstStep = lambda > lambdaRange[0];
        if (!acc.foundLambda) {
          const ridgeLambda = lambda*avgEigenVal; //(scale lambda according to the scale of the weight matrix)

          if (debugMode) console.log(`********* [${offOrDef}] RAPM WITH LAMBDA ` + ridgeLambda.toFixed(3) + " / " + lambda);

          const [ solver, solverFactor ] = RapmUtils.slowRegression(weights[offOrDef], ridgeLambda, ctx);
/**/
//          const results: number[] = RapmUtils.calculateRapm(solver, adjPoss[offOrDef]);
          const results: number[] = RapmUtils.slowCalcRapmWithPrior(
            solver, solverFactor, ridgeLambda,
            adjPoss[offOrDef], priors
          );
          const combinedAdjEff = _.sum(_.zip(pctByPlayer[offOrDef], results).map((zip: Array<number|undefined>) => {
            return (zip[0] || 0)*(zip[1] || 0);
          }));
          const adjEffErrTmp = combinedAdjEff - actualEff[offOrDef];
          results.forEach((v, i) => results[i] = results[i] - (weighter[i]/actualEff[offOrDef])*adjEffErrTmp);
/**/
const adjEffErr = 0.0;
console.log("WEIGHT = " + adjEffErrTmp/actualEff[offOrDef]);
//          Math.abs(combinedAdjEff - actualEff[offOrDef]);

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

          if (debugMode) console.log(ctx.colToPlayer);
          if (debugMode) console.log("rapm: " + results.map((p: number) => p.toFixed(3)));
          if (debugMode) console.log(
            `combinedRapm = [${combinedAdjEff.toFixed(1)}] vs actualEff = [${actualEff[offOrDef].toFixed(1)}] ... Err = [${adjEffErr.toFixed(1)}] `
          );

          const residuals = RapmUtils.calculatePredictedOut(weights[offOrDef], results, ctx);
          const errSq = RapmUtils.calculateResidualError(adjPoss[offOrDef], residuals, ctx);
          const dofInv = 1.0/(ctx.numLineups - ctx.numPlayers); //(degrees of freedom)

          //if (debugMode) console.log(`RSS = [${offErrSq.toFixed(1)}] + [${defErrSq.toFixed(1)}]`);
          if (debugMode) console.log(`MSS = [${(errSq*dofInv).toFixed(1)}]`);

          const paramErrs = RapmUtils.calcSlowPseudoInverse(weights[offOrDef], ridgeLambda, ctx);

          // https://arxiv.org/pdf/1509.09169.pdf
          const sdRapm = paramErrs.map((p: number) => Math.sqrt(Math.sqrt(p)*errSq*dofInv));
          if (debugMode) console.log("sdRapm: " + sdRapm.map((p: number) => p.toFixed(3)));

          // Completion criteria:
          const maxEffError = 1.05;
/**/ //also tried with 0.05 ... that looks a bit too smooth?
          const rapmChangeThreshold =  0.105;
          acc.output.ridgeLambda = ridgeLambda;
          acc.output.solnMatrix = solver;
/**/
acc.output.effLambda = results;
          if ((adjEffErr >= maxEffError) && notFirstStep) {
            if (debugMode) console.log(`-!!!!!!!!!!- DONE PICK PREVIOUS [${acc.lastAttempt.ridgeLambda.toFixed(2)}]`);
            acc.foundLambda = true;
            // Roll back to previous
            acc.output.solnMatrix = acc.lastAttempt.solnMatrix;
            acc.output.ridgeLambda = acc.lastAttempt.ridgeLambda;
          } else if ((meanDiff >= 0) && (meanDiff < rapmChangeThreshold)) {
            if (debugMode) console.log(`!!!!!!!!!!!! DONE PICK THIS [${ridgeLambda.toFixed(2)}]`);
            acc.foundLambda = true;
          } else {
            acc.lastAttempt = {
              results: results, // so we can build diffs
              ridgeLambda: ridgeLambda, // may need this value
              solnMatrix: solver
            };
          }
          // Add diags for any step on which we've done processing
          acc.output.prevAttempts.push({
              //TODO: diags
          });

        }//(else short circuit processing, we're done)
      }, {
        // The return vals we care about
        output: {
          ridgeLambda: -1,
          solnMatrix: null,
          prevAttempts: [] as Array<Record<string, any>>
          /**/,
          effLambda: []
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

  //TODO: Pearsson correlation matrix between players

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

    const sortedQWithIndex = _.chain(q).zip(_.range(0, ctx.numPlayers)).sortBy([(zip) => zip[0]]).value();

    if (debugMode) {
      console.log(`sort(q_i)=[${JSON.stringify(sortedQWithIndex)}]`);
    }

    // Ratio of largest singular value to all singular values
    const largestEig = sortedQWithIndex[q.length - 1][0];

    const condIndicesWithIndex = sortedQWithIndex.filter(zip => zip[0] > 0).map((zip: Array<number>) => {
      return [ largestEig/zip[0], zip[1] ];
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
    return {
      lineupCombos: condIndicesWithIndex.map((zip) => zip[0]),
      playerCombos: _.chain(ctx.colToPlayer).map((player, playerIndex) => {
        return [player, condIndicesSortedIndex.map((lineupComboIndex) => {
          return vdpRaw[lineupComboIndex][playerIndex];
        })]
      }).fromPairs().value()
    };
  }


}
