// Lodash:
import _ from "lodash";

import { TeamEditorStatsModel } from '../../components/TeamEditorTable';
import { DateUtils } from "../DateUtils";

// Util imports
import { TeamEditorParams } from '../FilterModels';
import { AvailableTeams } from "../internal-data/AvailableTeams";
import { efficiencyInfo } from "../internal-data/efficiencyInfo";
import { ConferenceToNickname, latestConfChanges } from "../public-data/ConferenceInfo";
import { DivisionStatistics, IndivStatSet, RosterEntry, Statistic, TeamStatInfo } from "../StatModels";
import { GoodBadOkTriple, TeamEditorUtils } from '../stats/TeamEditorUtils';
import { GradeUtils } from "./GradeUtils";
import { TeamEditorManualFixes, TeamEditorManualFixModel } from "./TeamEditorManualFixes";

export type OffseasonTeamInfo = {
   numSuperstars: number;
   numStars: number;
   numStarters: number;
   numRotation: number;
   off: number;
   def: number;
   net: number;   
   goodNet: number,
   badNet: number,
   actualNet: number | undefined,
   team: string, 
   conf: string, 
   rosterInfo: string,
   // Some transfer diags
   in_off: number, in_def: number, out_off: number, out_def: number, 
   nba_off: number, nba_def: number, sr_off: number, sr_def: number, 
   dev_off: number, dev_def: number, fr_net: number,

   players?: Array<GoodBadOkTriple>
};

export type OffseasonLeaderboardsStats = {
   derivedDivisionStats: DivisionStatistics,
   teamRanks: OffseasonTeamInfo[],
   numTeams: number,
   netEffToRankMap: Record<number, number>,
   actualNetEffToRankMap: Record<number, number> | undefined,
   offEffToRankMap: Record<number, number>,
   defEffToRankMap: Record<number, number>,
};

export type OffseasonLeaderboardReadOnlyState = {
   confs: string,
   year: string,
   gender: string,

   sortBy: string,
   queryFilters?: string

   evalMode: boolean,

   diagnosticCompareWithRosters: boolean
};

/** Will dump out some possible manual overrides to be made - needs diagnosticCompareWithRosters to be set in calling component  */
const diagnosticCompareWithRostersDebugOnly = false;

/** Logic for building off-season predictions (etc) across all teams */
export class OffseasonLeaderboardUtils {

   static buildAllTeamStats(
      // Input state:
      dataEvent: TeamEditorStatsModel,
      readOnlyState: OffseasonLeaderboardReadOnlyState,

      // Derive state:
      teamOverrides: Record<string, TeamEditorParams>,
      rostersPerTeam: Record<string, Record<string, RosterEntry>>,
      avgEff: number,

      includeTeams: boolean = false
   ): OffseasonLeaderboardsStats {
      const {
         confs, year, gender,
         sortBy, 
         evalMode,
         diagnosticCompareWithRosters
      } = readOnlyState;
      const yearWithStats = DateUtils.getPrevYear(year);

      // Come up with a superset of which players might be on which teams, for performance reasons
      const playerPartition = _.transform(dataEvent.players || [], (acc, p) => {
         const teams = [ (p.team || "") ].concat(
            _.flatMap(dataEvent.transfers || [], txfers => {
               return ((txfers || {})[p.code || ""] || [])
                  .flatMap(txfer => txfer.t ? [ txfer.t, txfer.f ] : [ txfer.f ]);
            })      
         ).concat( // Add all players that might be added to this team
            _.flatMap(teamOverrides,
               (teamEdit, teamName) => ((teamEdit.addedPlayers || "").indexOf((p.code || "") + ":") >= 0) ? [ teamName ] : []
            )
         );
         teams.forEach(team => {
            if (!acc[team]) {
               acc[team] = [];
            }
            acc[team]!.push(p);
         })
      }, {} as Record<string, IndivStatSet[]>);

      const nextSeasonForEvalMode = DateUtils.getNextYear(yearWithStats);
      const teamStatsPartition = _.transform(dataEvent.teamStats || [], (acc, t) => {         
         if (t.year == yearWithStats) {
            acc.projYear[t.team_name] = t;
         } else if (t.year == nextSeasonForEvalMode) {
            acc.actualYear[t.team_name] = t;
         }
      }, { projYear: {} as Record<string, TeamStatInfo>, actualYear: {} as Record<string, TeamStatInfo> });

      // Come up with a superset of which (RSish) freshmen might be on which teams, for performance reasons
      const genderPrevSeason = `${gender}_${DateUtils.getPrevYear(yearWithStats)}`; //(For fr)
      const pretYearFrPartition = _.transform(
         TeamEditorManualFixes.getFreshmenForYear(genderPrevSeason), (acc, frPerTeam, teamKey) => {
            // To be quick just include the entire overrides object if any transfer matches
            const inject = (teamKeyIn: string, toInject: TeamEditorManualFixModel) => {
               if (!acc[teamKeyIn]) {
                  acc[teamKeyIn] = {};
               }
               acc[teamKeyIn]![teamKey] = toInject;
            };
            // Always inject a team's Fr for that team:
            inject(teamKey, frPerTeam);
            const transferringTeams = _.chain(frPerTeam.overrides || {}).keys()
                  .flatMap(code => dataEvent.transfers?.[0]?.[code] || [])
                     .flatMap(p => (p.t && (p.t != "NBA")) ? [p.t] : []).value();

            transferringTeams.forEach(teamKeyIn => {
               inject(teamKeyIn, frPerTeam);
            });

         }, {} as Record<string, Record<string, TeamEditorManualFixModel>>
      );

      // Get a list of teams
      const teamList = _.flatMap(AvailableTeams.byName, (teams, teamName) => {
         const maybeTeam = teams.find(t => (t.year == yearWithStats) && (t.gender == gender));
         return maybeTeam ? [ maybeTeam.team ] : []
      });
      const numTeams = _.size(teamList);

      // For each team, do the big off-season calcs:

      const derivedDivisionStats: DivisionStatistics = { 
         tier_sample_size: 0,
         dedup_sample_size: 0,
         tier_samples: {},
         tier_lut: {},
         dedup_samples: {}
        };

      /** (for diagnosticCompareWithRosters) */
      const superSeniorsReturning: Record<string, string[]> = {};
      const leftTeamUnexpectedly: Record<string, string[]> = {};

      const teamRanks = _.chain(teamList).map(t => {

         const maybeOverride = teamOverrides[t] || {};

         const addedPlayers = maybeOverride.addedPlayers ? TeamEditorUtils.fillInAddedPlayers(
            t, yearWithStats,
            maybeOverride.addedPlayers || "", playerPartition[t] || [], dataEvent.transfers?.[1] || {},
            false, maybeOverride.superSeniorsBack || false
         ) : {};
         const overrides = maybeOverride.overrides ? TeamEditorUtils.urlParamstoPlayerEditModels(maybeOverride.overrides) : {};
         const disabledPlayers = _.chain((maybeOverride.disabledPlayers || "").split(";")).map(p => [ p, true ]).fromPairs().value();
         const deletedPlayers = _.chain((maybeOverride.deletedPlayers || "").split(";")).map(p => [ p, "unknown" ]).fromPairs().value();
 
         const pxResults = TeamEditorUtils.teamBuildingPipeline(
            gender, t, yearWithStats,
            playerPartition[t] || [], teamStatsPartition.projYear[t]?.stats, dataEvent.transfers || [],
            true, evalMode || false,
            addedPlayers, overrides, deletedPlayers, disabledPlayers,
            maybeOverride.superSeniorsBack || false, false,
            avgEff, pretYearFrPartition[t] || {}
         );
         const filteredPlayerSet = TeamEditorUtils.getFilteredPlayersWithBench(pxResults, disabledPlayers);
         
         if (diagnosticCompareWithRosters && !_.isEmpty(rostersPerTeam)) {
            const roster = rostersPerTeam[t] || {};
            // Some analysis vs actual rosters:

            // 1) Super seniors
            const ignoreExistingSSrOverrides = false;

            const onTeamSet = new Set(
               pxResults.basePlayersPlusHypos.map(p => `${p.orig?.code || ""}::`)
            );
            
            const superSrsOnRoster = _.uniq((playerPartition[t] || []).filter(p => {
               return (p.team == t) && ((p.year || year) < year) && (p.roster?.year_class == "Sr") 
                  && roster[p.code || ""] //(players who were Srs last year on this year's roster)
            }).map(
               p => `${p.code || ""}::`)
            ).filter(
               code => ignoreExistingSSrOverrides || !onTeamSet.has(code)
            );
            
            if (!_.isEmpty(superSrsOnRoster)) {
               superSeniorsReturning[t] = superSrsOnRoster;
            }
         
            // 2) Players who left team

            // Players on the team but not
            const rosterCodes = new Set(_.keys(roster));
            if (rosterCodes.size >= 10) {
               const notOnTeamNonTransfers = 
                  pxResults.basePlayersPlusHypos
                     .filter(p => (p.orig.team == t) && !rosterCodes.has(p.orig.code || "")).map(p => p.key);
               //(for transfers we just assume the player got missed off the roster)

               const notOnTeamFreshhmen = 
                  pxResults.basePlayersPlusHypos
                     .filter(p => !p.orig.team && !rosterCodes.has(p.key.split(":")[0])).map(p => p.key);

               if (!_.isEmpty(notOnTeamFreshhmen)) {
                  // For freshmen this normally indicates there is a naming diff between the 247 list/NCAA 
                  // so we log but don't include the "leftTeam"
                  if (diagnosticCompareWithRostersDebugOnly) {
                     console.log(`[${t}]: unexpected_Fr=[${notOnTeamFreshhmen}] from team=[${pxResults.basePlayersPlusHypos.map(p => p.orig.code)}] / roster=[${_.keys(roster)}]`);               
                  }
               }
               if (!_.isEmpty(notOnTeamNonTransfers)) {
                  if (diagnosticCompareWithRostersDebugOnly) {
                     console.log(`${t}: unexpected=[${notOnTeamNonTransfers}] from team=[${pxResults.basePlayersPlusHypos.map(p => p.orig.code)}] / roster=[${_.keys(roster)}]`);               
                  }
                  leftTeamUnexpectedly[t] = notOnTeamNonTransfers;
               }       
            } else {
               if (diagnosticCompareWithRostersDebugOnly) {
                  console.log(`Skip [${t}] since roster size too small ([${rosterCodes.size}])`);
               }
            }
         }

         const buildTotals = (triples: GoodBadOkTriple[], range: "good" | "bad" | "ok" | "orig", depthBonus: {off: number, def: number}, adj: number = 0) => {
            const { off, def, net } = TeamEditorUtils.buildTotals(triples, range, depthBonus, adj);

            const netInfo = _.transform(triples, (acc, triple) => { 
               const netEff = TeamEditorUtils.getNet(triple.ok || {});
               if (netEff >= 6.5) {
                  acc.numSuperstars = acc.numSuperstars + 1;
               } else if (netEff >= 5) {
                  acc.numStars = acc.numStars + 1;
               } else if (netEff >= 3.5) {
                  acc.numStarters = acc.numStarters + 1;
               } else if (netEff >= 2) {
                  acc.numRotation = acc.numRotation + 1;
               }

            }, { numSuperstars: 0, numStars: 0, numStarters: 0, numRotation: 0});
            return { off, def, net, ...netInfo };
         };
         const depthBonus = TeamEditorUtils.calcDepthBonus(filteredPlayerSet, t);

         //Depth diag:
         // if ((depthBonus.off > 0) || (depthBonus.def < 0)) {
         //    console.log(`Team depth bonus: [${t}], off=[${depthBonus.off.toFixed(2)}] def=[${depthBonus.def.toFixed(2)}] net=[${(depthBonus.off-depthBonus.def).toFixed(2)}]`);
         // }

         const okTotals = buildTotals(filteredPlayerSet, "ok", depthBonus);
         const goodNet = _.sumBy(filteredPlayerSet, triple => {
            return (triple.good.off_team_poss_pct.value || 0)*TeamEditorUtils.getNet(triple.good);
         });
         const badNet = _.sumBy(filteredPlayerSet, triple => {
            return (triple.bad.off_team_poss_pct.value || 0)*TeamEditorUtils.getNet(triple.bad);
         });
         const stdDevFactor = 1.0/Math.sqrt(5); //(1 std dev, so divide by root of team size)
         const goodDeltaNet = (goodNet - okTotals.net)*stdDevFactor;
         const badDeltaNet = (badNet - okTotals.net)*stdDevFactor;
   
         //TODO; centralize this conf logic (also used in TeamEditorTable)
         const offseasonConfChanges = latestConfChanges[year] || {};
         const confLookupToUse = efficiencyInfo[`${gender}_${yearWithStats}`] || efficiencyInfo[`${gender}_Latest`];
         const confStr = offseasonConfChanges[t] || (confLookupToUse?.[0]?.[t]?.conf || "???");

         GradeUtils.buildAndInjectTeamDivisionStats(
            { off_adj_ppp: { value: okTotals.off + avgEff }, def_adj_ppp: { value: okTotals.def + avgEff }, off_net: { value: okTotals.net } },
            {}, derivedDivisionStats, true, [ "off_adj_ppp", "def_adj_ppp", "off_net" ]
         );

         // Eval mode:
         //(we try to use the actual team totals from the team stats page, though have a legacy fallback just because the code was there)
         const totalActualMins = evalMode ? _.sumBy(pxResults.actualResultsForReview, p => p.orig.off_team_poss_pct.value!)*0.2 : undefined;
         const finalActualEffAdj = totalActualMins ? 
           5.0*Math.max(0, 1.0 - totalActualMins)*TeamEditorUtils.getBenchLevelScoring(t, year) : 0;

         const actualTotalsFromTeam = evalMode ? teamStatsPartition.actualYear[t] : undefined;

         const getLuckAdjOrRaw = (s: Statistic | undefined) => (_.isNil(s?.old_value) ? s?.value : s?.old_value) || avgEff;
         const dummyTeamActualFromTeamNoLuck = actualTotalsFromTeam ? {
           off_net: { 
             value: getLuckAdjOrRaw(actualTotalsFromTeam.stats.off_adj_ppp) - getLuckAdjOrRaw(actualTotalsFromTeam.stats.def_adj_ppp) 
           }, 
           off_adj_ppp: { value: getLuckAdjOrRaw(actualTotalsFromTeam.stats.off_adj_ppp) },
           def_adj_ppp: { value: getLuckAdjOrRaw(actualTotalsFromTeam.stats.def_adj_ppp) },
         } : undefined;
     
         const actualTotalsFromPlayers = evalMode && !actualTotalsFromTeam ? 
           TeamEditorUtils.buildTotals(pxResults.actualResultsForReview, "orig", depthBonus, finalActualEffAdj) : undefined;
         const dummyTeamActualFromPlayers = actualTotalsFromPlayers ? {
           off_net: { value: actualTotalsFromPlayers.net },
           off_adj_ppp: { value: actualTotalsFromPlayers.off + avgEff },
           def_adj_ppp: { value: actualTotalsFromPlayers.def + avgEff },
         } : undefined;
         const dummyTeamActual = dummyTeamActualFromTeamNoLuck || dummyTeamActualFromPlayers;
         //(end Eval mode)

         return { ...okTotals, 
            goodNet: okTotals.net + goodDeltaNet, badNet: okTotals.net + badDeltaNet,
            actualNet: dummyTeamActual?.off_net?.value, //TODO: off and def also
            team: t, 
            conf: ConferenceToNickname[confStr] || "???", 
            rosterInfo: `${okTotals.numSuperstars} / ${okTotals.numStars} / ${okTotals.numStarters} / ${okTotals.numRotation}`,
            // Some transfer diags
            in_off: pxResults.in_off, in_def: pxResults.in_def, out_off: pxResults.out_off, out_def: pxResults.out_def, 
            nba_off: pxResults.nba_off, nba_def: pxResults.nba_def, sr_off: pxResults.sr_off, sr_def: pxResults.sr_def, 
            dev_off: pxResults.dev_off, dev_def: pxResults.dev_def, fr_net: pxResults.fr_net,

            players: includeTeams ? pxResults.basePlayersPlusHypos : undefined
         };
      }).sortBy(t => {
         // For net transfer purposes, cap the benefit you can get from losing players
         const transferIn = (t.in_off - t.in_def);
         const benefitCap = t.net > 0 ? (0.33*t.net) : t.net; //(1/3 transfer, 1/3 dev, 1/3 Fr)
         const transferInOutMargin = (t.in_off - t.in_def) - Math.max((t.out_off - t.out_def), -benefitCap);
         const seniorOut = Math.max((t.sr_off - t.sr_def), -benefitCap);

         const totalInOutMargin = t.fr_net + transferInOutMargin - (t.nba_off - t.nba_def) - seniorOut;
         switch(sortBy) {
            case "offseason_net":
               return -totalInOutMargin - (t.dev_off - t.dev_def);
            case "dev_in":
               return -(t.dev_off - t.dev_def);
            case "total_io":
               return -totalInOutMargin;
            case "txfer_in":
               return -transferIn;
            case "txfer_out":
               return -(t.out_off - t.out_def);
            case "txfer_io":
               return -transferInOutMargin;               
            case "nba_out":
               return -(t.nba_off - t.nba_def);
            case "sr_out":
               return -seniorOut;
            default: 
               return -t.net;
         }
      }).value();

      if (diagnosticCompareWithRosters && !_.isEmpty(superSeniorsReturning) && !diagnosticCompareWithRostersDebugOnly) {
         console.log(`export const superSeniors${year.replace("/", "_")} = \n${JSON.stringify(superSeniorsReturning, null, 3)}`);
      }
      if (diagnosticCompareWithRosters && !_.isEmpty(leftTeamUnexpectedly) && !diagnosticCompareWithRostersDebugOnly) {
         console.log(`export const leftTeam${year.replace("/", "_")} = \n${JSON.stringify(leftTeamUnexpectedly, null, 3)}`);
      }

      // Lookups
      const offEffToRankMap = _.chain(teamRanks).sortBy(t => -t.off).map((t, rank) => [t.off, rank]).fromPairs().value();
      const defEffToRankMap = _.chain(teamRanks).sortBy(t =>t.def).map((t, rank) => [t.def, rank]).fromPairs().value();
      const netEffToRankMap = (confs || (sortBy != "net")) ? _.chain(teamRanks).sortBy(t => -t.net).map((t, rank) => [t.net, rank]).fromPairs().value() : {};
      const actualNetEffToRankMap = evalMode ? 
         _.chain(teamRanks).sortBy(t => -(t.actualNet || 0)).map((t, rank) => [t.actualNet || 0, rank]).fromPairs().value() : undefined;

      GradeUtils.buildAndInjectTeamDivisionStatsLUT(derivedDivisionStats);

      return {
         derivedDivisionStats, teamRanks,
         numTeams,
         netEffToRankMap, actualNetEffToRankMap, offEffToRankMap, defEffToRankMap
      };
   }
}
 