// Lodash
import _ from "lodash";

// Util imports
import {
  StatModels,
  OnOffBaselineEnum,
  OnOffBaselineGlobalEnum,
  PlayerCodeId,
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  TeamStatSet,
  LineupStatSet,
} from "../StatModels";
import {
  RapmInfo,
  RapmUtils,
  defaultRapmConfig,
  RapmConfig,
} from "../stats/RapmUtils";
import { LineupUtils } from "../stats/LineupUtils";
import {
  averageStatsInfo,
  defaultAverageStatsInfo,
} from "../internal-data/averageStatsInfo";
import { DateUtils } from "../DateUtils";

/** Object marshalling logic for roster tables */
export class TeamReportTableUtils {
  /** For a given lineup set, calculate RAPM as quickly as possible */
  static buildOrInjectRapm(
    enrichedLineups: Array<LineupStatSet>,
    playerInfoIn: Record<PlayerId, IndivStatSet>,
    adjustForLuck: Boolean,
    avgEfficiency: number,
    genderYearLookup: string,
    preCalcTeamReport: undefined | Record<string, any> = undefined, //(can calculate this in advance if using anyway)
    rapmConfig?: RapmConfig,
    rapmDiagMode: string = ""
  ): RapmInfo | undefined {
    //TODO: an attempt to fix [Invalid matrix: m < n] error in single game RAPM
    // (eg see http://localhost:3000/MatchupAnalyzer?baseQuery=opponent.team%3A%22Purdue%22%20AND%20date%3A2023-01-05&gender=Men&maxRank=400&minRank=0&oppoTeam=Purdue%20%282023-01-05%29%3A%20L%2069-71&team=Ohio%20St.&year=2022%2F23&)
    // This didn't work at all, so needs more analysis
    // Problem is 'RapmUtils.calcCollinearityDiag(offRapmWeights, rapmContext)'
    //
    // Math doesn't work, so we pull out the players with the least possessions first:
    // const maxMatrixDiff = 1;
    // const playerInfo = (_.size(playerInfoIn) < (enrichedLineups.length + maxMatrixDiff)) ? _.chain(playerInfoIn)
    //   .values()
    //   .orderBy(p => -(p.off_team_poss?.value || 0))
    //   .take(enrichedLineups.length - maxMatrixDiff)
    //   .map(p => [ p.key, p ] as [ PlayerId, IndivStatSet ]).fromPairs()
    //   .value() : playerInfoIn;

    const playerInfo = playerInfoIn;

    //TODO (#4): manual edits don't show as override (so can't see original value) - fix at some point
    // but not worth delaying over

    //TODO (#173): ^ similar for on-ball defense adjustments. Both these only affect the priors, so
    //need some logic to loop over before/after options for luck/!luck

    //TODO (#???): currently on-ball defense and manual overrides just impact the priors but actually
    // should also "smear" impact uniformly across players' lineups

    const tempTeamReport =
      preCalcTeamReport ||
      LineupUtils.lineupToTeamReport({
        //(calcs for both luck and non-luck versions)
        lineups: enrichedLineups,
      });
    const ignoreLineupLuckKey = adjustForLuck ? "old_value" : "value";

    /** Makes the non-efficiency stats be baselined against D1 (or high major for earlier years) stats, not their team */
    const statsAverages =
      averageStatsInfo[genderYearLookup] ||
      defaultAverageStatsInfo[genderYearLookup.split("_")[0]] ||
      {};

    // Has to be in this order, else injectRapmIntoPlayers doesn't work properly
    const results = (["value", "old_value"] as Array<"value" | "old_value">)
      .filter((valueKey) => {
        // What about if there  is a per-player manual override? For now just ignore. See "todos" at the top of the method
        if (valueKey == "old_value" && !adjustForLuck)
          return false; //(nothing to do)
        else return true;
      })
      .map((valueKey, index) => {
        try {
          const rapmContext = RapmUtils.buildPlayerContext(
            tempTeamReport.players || [],
            enrichedLineups,
            playerInfo,
            avgEfficiency,
            valueKey, //<- with or without luck adjustment, only applies to priors
            rapmConfig || defaultRapmConfig
          );

          const [offRapmWeights, defRapmWeights] =
            RapmUtils.calcPlayerWeights(rapmContext);
          const preProcDiags = RapmUtils.calcCollinearityDiag(
            offRapmWeights,
            rapmContext
          );
          const [offRapmInputs, defRapmInputs] = RapmUtils.pickRidgeRegression(
            offRapmWeights,
            defRapmWeights,
            rapmContext,
            preProcDiags.adaptiveCorrelWeights,
            rapmDiagMode != "",
            valueKey, //<- we fit to the overall efficiency, be it luck adjusted or not
            [
              DateUtils.lineupsHavePlayerShotInfo(genderYearLookup)
                ? valueKey
                : ignoreLineupLuckKey,
              ignoreLineupLuckKey, //<-never use luck adjusted _lineup_ values for defense, too noisy
            ]
          );
          RapmUtils.injectRapmIntoPlayers(
            tempTeamReport.players || [],
            offRapmInputs,
            defRapmInputs,
            statsAverages,
            rapmContext,
            preProcDiags.adaptiveCorrelWeights,
            [
              DateUtils.lineupsHavePlayerShotInfo(genderYearLookup)
                ? valueKey
                : ignoreLineupLuckKey,
              ignoreLineupLuckKey, //<-never use luck adjusted _lineup_ values for defense, too noisy
            ],
            valueKey //(write)
          );
          return {
            enrichedPlayers: tempTeamReport.players || [],
            ctx: rapmContext,
            preProcDiags: preProcDiags,
            offWeights: offRapmWeights,
            defWeights: defRapmWeights,
            offInputs: offRapmInputs,
            defInputs: defRapmInputs,
          };
        } catch (err: unknown) {
          console.log(
            `Error calculating RAPM for [${valueKey}]: [${
              err instanceof Error ? err.message : err
            }] (players=[${_.size(playerInfoIn)}]->[${_.size(
              playerInfo
            )}] vs [${_.size(enrichedLineups)}])`
          );
          //console.log(`Error calculating RAPM for [${valueKey}]: [${err.message}] (players=[${_.size(playerInfoIn)}]->[${_.size(playerInfo)}] vs [${_.size(enrichedLineups)}])`, err);
          return undefined;
        }
      });
    return results[0]!;
  }
}
