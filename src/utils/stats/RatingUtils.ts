
// Utils:
import _ from 'lodash'
import { OverrideUtils } from "./OverrideUtils";

/** All the info needed to explain the ORtg calculation, see "buildORtgDiag" */
export type ORtgDiagnostics = {
  // Basic player numbers:
  rawFga: number,
  rawFgx: number,
  rawFgm: number,
  ptsFgm: number,
  rawFtm: number,
  rawAssist: number,
  rawAssistInfo: string[],
  rawPts: number,
  rawOrb: number,
  rawTo: number,
  // Shooting breakdowns, just for display:
  raw3Fga: number,
  raw2midFga: number,
  raw2rimFga: number,
  raw3Fgm: number,
  raw2midFgm: number,
  raw2rimFgm: number,
  // Basic team numbers:
  teamOrb: number,
  teamPts: number,
  teamFga: number,
  teamFgm: number,
  teamFta: number,
  teamFtPct: number,
  teamOrbPct: number,
  teamTo: number,
  teamPoss: number,

  // 1] Points produced calcs:

  // Advanced player numbers:
  eFG: number,
  // Advanced team numbers:
  teamPtsPerScore: number,
  teamFtHitOnePlus: number,
  teamProbFtHitOnePlus: number,
  rosterOrb: number,
  teamOrbCreditToRebounder: number,
  teamOrbCreditToScorer: number,
  teamScoreFromReboundPct: number,
  teamOrbWeight: number,
  othersAssist: number,
  otherEfg: number,
  otherEfgInfo: string[],
  otherPtsPerFgm: number,
  teamOrbContribPct: number,
  teamScoredPlayPct: number,
  teamAssistRate_Classic: number,
  ppFgTeamAstPct_Classic: number,
  teamAssistRate: number,
  ppFgTeamAstPct: number,
  teamAssistedEfg: number,

  // Pts produced:
  ptsProd: number,
  ppOrb: number,
  ppAssist: number,
  ppAssist_Classic: number,
  ppFg: number,

  // 2] Possession Calcs:
  // Advanced player numbers:
  offPoss: number,
  ftPoss: number,
  ftPct: number,
  missedBothFTs: number,
  offPlaysLessPoss: number,
  fgPart: number,
  ftPart: number,
  astPart_Classic: number,
  astPart: number,
  orbPart: number,
  // Advanced team numbers:
  teamScoringPoss: number,
  teamPlays: number,
  // Possession calcs
  adjPoss: number,
  scoringPoss: number,
  fgxPoss: number,
  ftxPoss: number,
  // Adjusted calcs:
  oRtg: number,
  oRtg_Classic: number,
  defSos: number,
  avgEff: number,
  SD_at_Usage: number,
  SDs_Above_Mean: number,
  SD_at_Usage_20: number,
  Regressed_ORtg: number,
  Usage: number,
  Usage_Bonus: number,
  adjORtg: number,
  adjORtgPlus: number,
};

/** All the info needed to explain the DRtg calculation, see "buildDRtgDiag" */
export type DRtgDiagnostics = {
  // Basic player numbers
  stl: number,
  blk: number,
  drb: number,
  pfPct: number,
  // Advanced player numbers
  playerRtg: number,
  playerDelta: number,
  scPossConceded: number,
  noShotCredit: number,
  reboundCredit: number,
  missFtCredit: number,
  stopsIndPct: number,
  stopsTeamPct: number,
  // Basic team numbers
  teamBlk: number,
  oppoPts: number,
  oppoPoss: number,
  oppoFga: number,
  oppoFgm: number,
  oppoFtm: number,
  oppoFta: number,
  oppoFtPoss: number,
  oppoTov: number,
  teamStl: number,
  opponentOrbPct: number,
  opponentFgPct: number,
  // Advanced team numbers
  teamOrbCreditToRebounder: number,
  teamOrbCreditToDefender: number,
  teamDvsRebCredit: number,
  oppoFgMiss: number,
  oppoNonStlTov: number,
  teamMissWeight: number,
  oppoFtPct: number,
  oppoFtHitOnePlus: number,
  oppoProbFtHitOnePlus: number,
  oppoScPoss: number,
  oppoPtsPerScore: number,
  teamRtg: number,
  // Adjusted calcs:
  dRtg: number,
  offSos: number,
  avgEff: number,
  adjDRtg: number,
  adjDRtgPlus: number,
};

/** (just to make copy/pasting between colab and this code easier)*/
const array = (v: number[]) => { return v; }

/** Contains the logic to build offensive and defensive ratings for individual players */
export class RatingUtils {

  /** Builds the overrides to the raw fields based on stat overrides */
  static buildOffOverrides(statSet: Record<string, any>) {
    const threePTries = statSet?.total_off_3p_attempts?.value || 0;
    const twoPTries = statSet?.total_off_2p_attempts?.value || 0;
    const freeThrowTries = statSet?.total_off_fta?.value || 0;

    const extra3PMakes = OverrideUtils.diff(statSet.off_3p)*threePTries;
    const extra2PMakes = OverrideUtils.diff(statSet.off_2p)*twoPTries;
    const extraFgMakes = extra3PMakes + extra2PMakes;
    const extraFtMakes = OverrideUtils.diff(statSet.off_ft)*freeThrowTries;

    // TOs are more complicated:
    // (old_tos + tos_diff)/(currPoss + tos_diff) = new_to% =>
    // ie (old_tos + tos_diff) = new_to%*(currPoss + tos_diff)
    // ie tos_diff = (new_to%*currPoss - old_tos)/(1 - new_to%)
    const newToPct = statSet?.off_to?.value || 0; //(new value)
    const adjNewToPct = (newToPct > 0.9) ? 0.9 : newToPct; //(avoid stupidly high TO%)
    const oldTos = statSet?.total_off_to?.value || 0;
    const currPoss = statSet?.off_poss?.value || 0;
    const extraTos = (adjNewToPct*currPoss - oldTos)/(1 - adjNewToPct);

    //TODO: additional ORBs? It's a bit tricky because you'd then need to add more shots and hits/misses
    //(some of which would be made by the player - so for now it's probably best just to ignore, I think
    // it's a second-order effect anyway)

    //TODO: also not taking into account other players' manual edits (at the team level)

    return {
      total_off_fgm: { value: (statSet?.total_off_fgm?.value || 0) + extraFgMakes },
      total_off_2p_made: { value: (statSet?.total_off_2p_made?.value || 0) + extra2PMakes },
      total_off_3p_made: { value: (statSet?.total_off_3p_made?.value || 0) + extra3PMakes },
      total_off_ftm: { value: (statSet?.total_off_ftm?.value || 0) + extraFtMakes },

      total_off_to: { value: (statSet?.total_off_to?.value || 0) + extraTos },
      off_poss: { value: (statSet?.off_poss?.value || 0) + extraTos },

      team_total_off_pts: { value: (statSet?.team_total_off_pts?.value || 0) + 3*extra3PMakes + 2*extra2PMakes + extraFtMakes },
      team_total_off_fgm: { value: (statSet?.team_total_off_fgm?.value || 0) + extraFgMakes },
      team_total_off_3p_made: { value: (statSet?.team_total_off_3p_made?.value || 0) + extra3PMakes },
      team_total_off_ftm: { value: (statSet?.team_total_off_ftm?.value || 0) + extraFtMakes },

      team_total_off_to: { value: (statSet?.team_total_off_to?.value || 0) + extraTos },

    };
  };

  /** From https://www.basketball-reference.com/about/ratings.html */
  static buildORtg(
    statSet: Record<string, any>, rosterStatsByCode: Record<string, any>,
    avgEfficiency: number, calcDiags: boolean, overrideAdjusted: boolean
  ): [
    { value: number } | undefined, { value: number } | undefined,
    { value: number } | undefined, { value: number } | undefined, //< if overrridden these are the raw vals
    ORtgDiagnostics | undefined
  ] {
    if (!statSet) return [ undefined, undefined, undefined, undefined, undefined ];

    /** version of _ . sumBy(..) which gives you the index as well as the value */
    const sumBy = (aa: Array<number>, f: (x: number, ii: number) => number) => {
      return _.sum(aa.map((x, ii) => f(x, ii)));
    }

    const overrides = overrideAdjusted ? RatingUtils.buildOffOverrides(statSet) : ({} as Record<string, any>);
    const statGet = (key: string) => {
      return !_.isNil(overrides[key]) ? overrides[key].value : statSet?.[key]?.value || 0;
    };
    // New for assist calcs:
    const [ _Rim, _Mid, _3P ] = [ 0, 1, 2 ];
    const shotLocs = [ "2prim", "2pmid", "3p" ];
    const shotLocToLoc: Record<string, string> = { "3p": "3p", "2prim": "rim", "2pmid": "mid" };
    const shotBonus = [ 2, 2, 3 ];

    // The formulate references (MP / (Team_MP / 5)) a fair bit
    // All our team numbers are when the player is on the floor, so we set to 1

    const FGA = statSet?.total_off_fga?.value || 0;
    const FGM = statGet("total_off_fgm");
    const FTM = statGet("total_off_ftm");
    const FTA = statSet?.total_off_fta?.value || 0;
    const AST = statSet?.total_off_assist?.value || 0;
    const TOV = statGet("total_off_to");
    const ORB = statSet?.total_off_orb?.value || 0;
    const FG2PM = statGet("total_off_2p_made");
    const FG3PM = statGet("total_off_3p_made");
    const offPoss = statGet("off_poss");
    const usage = 100*(statSet.off_usage?.value || 0);
    const Def_SOS = (statSet?.def_adj_opp?.value || avgEfficiency);
    // New for assist calcs:
    const Made = shotLocs.map(l => statGet(`total_off_${l}_made`));
    const Attempts = shotLocs.map(l => statGet(`total_off_${l}_attempts`) || 1); //||1 because used as denom
    const AssistedPct = shotLocs.map(l => statGet(`off_${l}_ast`));
    const AssistsTotals = shotLocs.map(l => statGet(`total_off_ast_${shotLocToLoc[l]!}`));
    const Assists = shotLocs.map(l => [l, statGet(`off_ast_${shotLocToLoc[l]!}_target`)]);
      // array of [shotLoc, map[player -> count]]

    const Team_AST = statSet?.team_total_off_assist?.value || 0;
    const Team_FGM = statGet("team_total_off_fgm");
    const Team_FGA = statSet?.team_total_off_fga?.value || 0;
    const Team_FTM = statGet("team_total_off_ftm");
    const Team_FTA = statSet?.team_total_off_fta?.value || 0;
    const Team_PTS = statGet("team_total_off_pts");
    const Team_TOV = statGet("team_total_off_to");
    const Team_3PM = statGet("team_total_off_3p_made");
    const Team_Poss = statGet("team_total_off_poss");
    // New for assist calcs:
    const Team_Made = shotLocs.map(l => statGet(`team_total_off_${l}_made`));
    const Team_Attempts = shotLocs.map(l => statGet(`team_total_off_${l}_attempts`));

    // TODO: regress this to bigger samples
    const Team_ORB = statSet?.team_total_off_orb?.value || 0;
    const Opponent_DRB = statSet?.oppo_total_def_drb?.value || 0;
    // Calculate an approximate number
    const Sum_Players_ORB =
      _.chain(rosterStatsByCode).values().sumBy(p => p.total_off_orb?.value || 0).value();
    const Global_ORB =
      _.chain(rosterStatsByCode).values().sumBy(p => p.team_total_off_orb?.value || 0).value()/5;
    const Roster_ORB = Team_ORB * (Sum_Players_ORB/(Global_ORB || 1));

    // Useful base derived stats:
    const PTS_FROM_FG = 2*FG2PM + 3*FG3PM;
    const eFG = FGA > 0 ? PTS_FROM_FG / (2 * FGA) : 0.0;
    const Team_PTS_FROM_FG = Team_PTS - Team_FTM;
    const Others_FGA = Team_FGA - FGA;
    const Others_FGM = Team_FGM - FGM;
    const Others_AST = Team_AST - AST;
    const Others_eFG = Others_FGA > 0 ? (Team_PTS_FROM_FG - PTS_FROM_FG) / (2 * Others_FGA) : 0;

    const FTA_to_Poss = 0.475;

    // This is much simplified because the stats are for the period the player was on the floor
    const qAST_Classic = Team_FGM > 0 ? (1.14 * (Others_AST / Team_FGM)) : 0.0; //(estimate of what % of player's FGs were assisted)
    const Team_Assist_Contrib_Classic = (0.5 * eFG) * qAST_Classic;
    const FG_Part_Classic = FGM * (1 - Team_Assist_Contrib_Classic); //TAC = 1 - FG_Part/FGM
    const AST_Part_Classic = Others_FGA > 0 ?
      0.5 * ((Team_PTS_FROM_FG - PTS_FROM_FG) / (2 * Others_FGA)) * AST : 0.0;
    // New for assist calcs:
    const FGM_Minus_AssistPenalty = Made.map((playerMade, index) => { //(0.5*eFG)*(assisted FGs=FG*assisted)
      const playerEfg = (0.5*shotBonus[index]!)*(playerMade/Attempts[index]!);
      return playerMade*(1 - (0.5*playerEfg)*AssistedPct[index]!);
    });
    const FG_Part = _.sum(FGM_Minus_AssistPenalty);
    // We back-calculate these equivalents to the classic calcs just for approximate diags display
    const qAST =
      sumBy(Made, (playerMade, index) => AssistedPct[index]!*playerMade)/FGM;
    const Team_Assist_Contrib = FGM > 0 ? 1 - FG_Part/FGM : 0;
    const Team_Assisted_eFG = qAST > 0 ? 2 * (Team_Assist_Contrib / qAST) : 0;

    const Efg_By_ShotType = Assists.map((locMap, index) => {
      const shotLoc = locMap[0];
      const playerMap = locMap[1];
      var totalEfgCount = AssistsTotals[index]! || 1;
      const eFgPart1 = 0.5*shotBonus[index];
      return _.sumBy(_.toPairs(playerMap), playerCount => { //(0.5*eFG)*(assists)
        const playerCode = playerCount[0];
        const count = playerCount[1] as number;
        const playerEfg =
          eFgPart1*(rosterStatsByCode[playerCode]?.[`off_${shotLoc}`]?.value || (Others_eFG/eFgPart1));
            //(if we can't find the player, we just fallback to using team eFG for all phases)
        return playerEfg*count;
      })/totalEfgCount;
    });
    const AST_Part = Efg_By_ShotType.map((eFG, index) => {
      return (0.5*eFG)*AssistsTotals[index]!;
    });

    const Prob_Miss_Both_FT = (1-(FTM/FTA))**2
    const FT_Part = FTA > 0 ? (1-Prob_Miss_Both_FT)*FTA_to_Poss*FTA : 0.0;

    const Team_Prob_Hit_1plus_FT = (1 - (1 - (Team_FTM / Team_FTA))**2);
    const Team_Scoring_Poss = Team_FTA > 0 ? Team_FGM + Team_Prob_Hit_1plus_FT * Team_FTA * FTA_to_Poss : 0.0;

    const Team_ORB_pct = (Team_ORB + Opponent_DRB) > 0 ? Team_ORB/(Team_ORB + Opponent_DRB) : 0.0;
    const Num_Team_Plays = Team_FGA + Team_FTA * FTA_to_Poss + Team_TOV;
    const Team_Play_Pct = Num_Team_Plays > 0 ? Team_Scoring_Poss / Num_Team_Plays : 0.0;

    const Credit_To_Rebounder = ((1 - Team_ORB_pct) * Team_Play_Pct);
    const Credit_To_Scorer = Team_ORB_pct * (1 - Team_Play_Pct);
    const Team_ORB_Weight_Denom = Credit_To_Rebounder + Credit_To_Scorer;
    const Team_ORB_Weight = Team_ORB_Weight_Denom > 0 ?  Credit_To_Rebounder/ Team_ORB_Weight_Denom : 0.0;
    const Team_Score_Rebound_Pct =
      Team_Scoring_Poss > 0 ? (Roster_ORB * Team_Play_Pct) / Team_Scoring_Poss : 0.0;
    const Team_ORB_Contrib = Team_ORB_Weight * Team_Score_Rebound_Pct;

    const ORB_Part = ORB * Team_ORB_Weight * Team_Play_Pct;

    // And then:
    const ScPoss = (FG_Part + _.sum(AST_Part) + FT_Part) * (1 - Team_ORB_Contrib) + ORB_Part;
    //(legacy assist code)
    const ScPoss_Classic = (FG_Part_Classic + AST_Part_Classic + FT_Part) * (1 - Team_ORB_Contrib) + ORB_Part;

    // Other factors:

    const FGxPoss = (FGA - FGM) * (1 - 1.07 * Team_ORB_pct);

    const FTxPoss = FTA > 0 ? Prob_Miss_Both_FT * FTA_to_Poss * FTA : 0.0;

    const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;

    // Finally:

    const PProd_FG_Part_Classic = PTS_FROM_FG * (1 - Team_Assist_Contrib_Classic);
    // New assist code:
    const PProd_FG_Part = sumBy(FGM_Minus_AssistPenalty, (f, ii) => f*shotBonus[ii]!);
      //(use the possession count but weighted by pts/scoring-poss)

    const Other_eFG = Others_FGA > 0 ? (Team_FGM - FGM + 0.5 * (Team_3PM - FG3PM)) / Others_FGA : 0.0;
    const Other_Pts_Per_FGM = Others_FGM > 0 ? (Team_PTS_FROM_FG - PTS_FROM_FG) / Others_FGM : 0.0;
    const PProd_AST_Part_Classic = (0.5*Other_eFG) * AST * Other_Pts_Per_FGM;
    // New assist code:
    const PProd_AST_Part = sumBy(AST_Part, (a, ii) => shotBonus[ii]!*a);

    const Team_FTs_Hit_1plus = Team_FTA > 0 ? Team_Prob_Hit_1plus_FT * FTA_to_Poss * Team_FTA : 0.0;
    const Team_Pts_Per_Score = (Team_FGM + Team_FTs_Hit_1plus) > 0 ? Team_PTS / (Team_FGM + Team_FTs_Hit_1plus) : 0.0;
    const PProd_ORB_Part = ORB * Team_ORB_Weight * Team_Play_Pct * Team_Pts_Per_Score;

    const PProd = (PProd_FG_Part + PProd_AST_Part + FTM) * (1 - Team_ORB_Contrib) + PProd_ORB_Part;

    const ORtg = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;
    // Legacy assist algo:
    const PProd_Classic = (PProd_FG_Part_Classic + PProd_AST_Part_Classic + FTM) * (1 - Team_ORB_Contrib) + PProd_ORB_Part;
    const TotPoss_Classic = ScPoss_Classic + FGxPoss + FTxPoss + TOV;
    const ORtg_Classic = TotPoss > 0 ? 100 * (PProd_Classic / TotPoss_Classic) : 0;

    // Adjusted efficiency
    // Adapted from: https://www.bigtengeeks.com/new-stat-porpagatu/

    const o_adj = avgEfficiency / Def_SOS;
    const SD_at_Usage = usage * -.144 + 13.023;
    const SDs_Above_Mean = SD_at_Usage > 0 ? (ORtg - avgEfficiency) / SD_at_Usage : 0;
    const SD_at_Usage_20 = 10.143;
    const Regressed_ORtg = avgEfficiency + SDs_Above_Mean * SD_at_Usage_20;
    const Usage_Bonus = usage > 20 ? ((usage - 20) * 1.25) :  ((usage - 20) * 1.5);
    const Adj_ORtg = (Regressed_ORtg + Usage_Bonus)*o_adj;
    const Adj_ORtgPlus = 0.2*(Adj_ORtg - avgEfficiency);

    // If the values have been overridden then calculate the un-overridden values
    const [ rawORtg, rawAdjRating ] = overrideAdjusted ? RatingUtils.buildORtg(
      statSet, rosterStatsByCode, avgEfficiency, false, false
    ) : [ undefined, undefined ];

    return [
      TotPoss > 0 ? { value: ORtg } : undefined,
      TotPoss > 0 ? { value: Adj_ORtgPlus } : undefined,
      rawORtg, rawAdjRating,
      (calcDiags ? {
      // Basic player numbers:
      rawFga: FGA,
      rawFgx: FGA - FGM,
      rawFgm: FGM,
      ptsFgm: PTS_FROM_FG,
      rawFtm: FTM,
      rawAssist: AST,
      rawAssistInfo: _.reverse(AssistsTotals.map(p => p.toFixed(0))), //(3p first)
      rawPts: PTS_FROM_FG + FTM,
      rawOrb: ORB,
      rawTo: TOV,
      // Shooting breakdowns, just for display:
      raw3Fga: statSet?.total_off_3p_attempts?.value || 0,
      raw2midFga: statSet?.total_off_2pmid_attempts?.value || 0,
      raw2rimFga: statSet?.total_off_2prim_attempts?.value || 0,
      raw3Fgm: statGet("total_off_3p_made"),
      raw2midFgm: statSet?.total_off_2pmid_made?.value || 0,
      raw2rimFgm: statSet?.total_off_2prim_made?.value || 0,
      // Basic team numbers:
      teamOrb: Team_ORB,
      teamPts: Team_PTS,
      teamFga: Team_FGA,
      teamFgm: Team_FGM,
      teamFta: Team_FTA,
      teamFtPct: Team_FTA > 0 ? Team_FTM / Team_FTA : 0,
      teamOrbPct: Team_ORB_pct,
      teamTo: Team_TOV,
      teamPoss: Team_Poss,

      // 1] Points produced calcs:
      // Advanced player numbers:
      eFG: eFG,
      // Advanced team numbers:
      teamPtsPerScore: Team_Pts_Per_Score,
      teamFtHitOnePlus: Team_FTs_Hit_1plus,
      teamProbFtHitOnePlus: Team_Prob_Hit_1plus_FT,
      rosterOrb: Roster_ORB,
      teamOrbCreditToRebounder: Credit_To_Rebounder,
      teamOrbCreditToScorer: Credit_To_Scorer,
      teamScoreFromReboundPct: Team_Score_Rebound_Pct,
      teamOrbWeight: Team_ORB_Weight,
      othersAssist: Others_AST,
      otherEfg: Other_eFG,
      otherEfgInfo: _.reverse(Efg_By_ShotType.map(efg => (100*efg).toFixed(1))), //(3p first)
      otherPtsPerFgm: Other_Pts_Per_FGM,
      teamOrbContribPct: Team_ORB_Contrib,
      teamScoredPlayPct: Team_Play_Pct,

      // Old school vs new assist%
      teamAssistRate_Classic: qAST_Classic,
      ppFgTeamAstPct_Classic: Team_Assist_Contrib_Classic,
      teamAssistRate: qAST,
      ppFgTeamAstPct: Team_Assist_Contrib,
      teamAssistedEfg: Team_Assisted_eFG,

      // Pts produced:
      ptsProd: PProd,
      ppOrb: PProd_ORB_Part,
      ppAssist: PProd_AST_Part,
      ppAssist_Classic: PProd_AST_Part_Classic,
      ppFg: PProd_FG_Part,

      // 2] Possession Calcs:
      // Advanced player numbers:
      ftPoss: FTA_to_Poss*FTA,
      ftPct: FTA > 0 ? FTM / FTA : 0,
      missedBothFTs: Prob_Miss_Both_FT,
      offPlaysLessPoss: FGA + FTA*FTA_to_Poss + TOV - offPoss,
      offPoss: offPoss,
      fgPart: FG_Part,
      ftPart: FT_Part,
      astPart: _.sum(AST_Part),
      astPart_Classic: AST_Part_Classic,
      orbPart: ORB_Part,
      // Advanced team numbers:
      teamScoringPoss: Team_Scoring_Poss,
      teamPlays: Num_Team_Plays,
      // Possessions calcs
      adjPoss: TotPoss,
      scoringPoss: ScPoss,
      fgxPoss: FGxPoss,
      ftxPoss: FTxPoss,
      // Adjusted calcs:
      oRtg: ORtg,
      oRtg_Classic: ORtg_Classic,
      defSos: Def_SOS,
      avgEff: avgEfficiency,
      SD_at_Usage: SD_at_Usage,
      SDs_Above_Mean: SDs_Above_Mean,
      SD_at_Usage_20: SD_at_Usage_20,
      Regressed_ORtg: Regressed_ORtg,
      Usage: usage,
      Usage_Bonus: Usage_Bonus,
      adjORtg: Adj_ORtg,
      adjORtgPlus: Adj_ORtgPlus
    } : undefined) as (ORtgDiagnostics | undefined) ];
  }

  /** Builds the overrides to the raw fields based on stat overrides */
  private static buildDefOverrides(statSet: Record<string, any>) {
    const threePTries = (statSet?.oppo_total_def_3p_attempts?.value || 0);
    const extra3PMakes = OverrideUtils.diff(statSet.oppo_def_3p)*threePTries;

    return {
      oppo_total_def_pts: { value: (statSet?.oppo_total_def_pts?.value || 0) + 3*extra3PMakes },
      oppo_total_def_fgm: { value: (statSet?.oppo_total_def_fgm?.value || 0) + extra3PMakes },
    };
  };

  /** From https://www.basketball-reference.com/about/ratings.html */
  static buildDRtg(
    statSet: Record<string, any>, avgEfficiency: number, calcDiags: boolean, overrideAdjusted: boolean
  ): [ { value: number } | undefined, { value: number } | undefined,
      { value: number } | undefined, { value: number } | undefined, //< if overrridden these are the raw vals
      DRtgDiagnostics | undefined ] {
    if (!statSet) return [ undefined, undefined, undefined, undefined, undefined ];

    const overrides = overrideAdjusted ? RatingUtils.buildDefOverrides(statSet) : ({} as Record<string, any>);
    const statGet = (key: string) => {
      return !_.isNil(overrides[key]) ? overrides[key].value : statSet?.[key]?.value || 0;
    };

    // Player:
    const STL = statSet?.total_off_stl?.value || 0;
    const BLK = statSet?.total_off_blk?.value || 0;
    const DRB = statSet?.total_off_drb?.value || 0;
    const PF = statSet?.total_off_foul?.value || 0;
    // Team:
    const Team_DRB = statSet?.team_total_off_drb?.value || 0;
    const Team_BLK = statSet?.team_total_off_blk?.value || 0;
    const Team_STL = statSet?.team_total_off_stl?.value || 0;
    const Team_PF = statSet?.team_total_off_foul?.value || 0;
    // Opponent:
    const Opponent_FGA = statSet?.oppo_total_def_fga?.value || 0;
    const Opponent_FGM = statGet("oppo_total_def_fgm");
    const Opponent_ORB = statSet?.oppo_total_def_orb?.value || 0;
    const Opponent_TOV = statSet?.oppo_total_def_to?.value || 0;
    const Opponent_FTA = statSet?.oppo_total_def_fta?.value || 0;
    const Opponent_FTM = statSet?.oppo_total_def_ftm?.value || 0;
    const Opponent_Possessions = statSet?.oppo_total_def_poss?.value || 0;
    const Opponent_PTS = statGet("oppo_total_def_pts");

    const Opponent_FTposs = 0.475*Opponent_FTA;

    // The overall credit for a miss and a defensive rebound gets split between the ...
    // ... team for forcing the miss and the individual for getting the rebound
    // (as per usual based on their relative difficulty)
    const DFGpct = Opponent_FGA > 0 ? Opponent_FGM / Opponent_FGA : 0;
    const Total_RBs = (Opponent_ORB + Team_DRB);
    const Team_DORpct = Total_RBs > 0 ? Opponent_ORB/Total_RBs : 0;
    const Credit_To_Shot_Defense = DFGpct*(1 - Team_DORpct);
    const Credit_To_Rebounder = (1 - DFGpct)*Team_DORpct;
    const FMwt = (Credit_To_Shot_Defense + Credit_To_Rebounder > 0) ?
      Credit_To_Shot_Defense / (Credit_To_Shot_Defense + Credit_To_Rebounder) : 0;

    // Block/Miss weighting - team has to rebound (bonus 7%), and the credit is the chance opponent would have scored
    const TeamMissWeight = FMwt*(1 - 1.07*Team_DORpct);
    // Credit to the individual for stops
    const PFpct = Team_PF > 0 ? PF/Team_PF : 0;
    const Opponent_MissAllFTs = Opponent_FTA > 0 ? (1 - Opponent_FTM/Opponent_FTA)**2 : 0;
    const NoShot_Credit = STL + BLK*TeamMissWeight;
    const Rebound_Credit = DRB*(1 - FMwt);
    const FTmiss_Credit = PFpct*Opponent_FTposs*Opponent_MissAllFTs;
    const Stops_Ind = NoShot_Credit + Rebound_Credit + FTmiss_Credit;

    // Credit to the team for stops (divided by 5 for shots/turnovers, in proportion of fouls for FTMs)
    const Opponent_FGMiss = Opponent_FGA - Opponent_FGM - Team_BLK;
    const Opponent_NonStlTOV  = Opponent_TOV - Team_STL;
    const Stops_Team = 0.2*(Opponent_FGMiss*TeamMissWeight + Opponent_NonStlTOV);

    const Stops = Stops_Ind + Stops_Team;

    const StopPct = Opponent_Possessions > 0 ? Stops/(0.2*Opponent_Possessions) : 0;

    const Opponent_HitFTs = 1 - Opponent_MissAllFTs;
    const Team_DRtg = Opponent_Possessions > 0 ? 100*(Opponent_PTS/Opponent_Possessions) : 0;

    const ScPoss = Opponent_FGM + Opponent_HitFTs*Opponent_FTposs;
    const D_Pts_Per_ScPoss = ScPoss > 0 ? Opponent_PTS/ScPoss : 0;

    const Player_DRtg = 100*D_Pts_Per_ScPoss*(1 - StopPct);
    const Player_Delta = 0.2*(Player_DRtg - Team_DRtg);

    const DRtg = Team_DRtg + Player_Delta;
    const Off_SOS = (statSet?.off_adj_opp?.value || avgEfficiency);
    const Adj_DRtg = Off_SOS > 0 ? DRtg*(avgEfficiency / Off_SOS) : 0;
    const Adj_DRtgPlus =  0.2*(Adj_DRtg - avgEfficiency);

    // Try to incorporate FT fault:
    // Sum per lineup Approx_SF_Poss = PFpct*(Opponent_FTA*0.475)
    //(maybe discard intentional FT spots)
    // Approx_SF_FTM =PFpct*Opponent_FTM
    // then subtract from Opponent_PTS, Opponents_FTM, Opponents_FTA
    // remove Stop_Ind
    // and then add an extra term 100/Team_Poss*(SF_FTM/SF_Poss)

    // If the values have been overridden then calculate the un-overridden values
    const [ rawDRtg, rawAdjRating ] = overrideAdjusted ? RatingUtils.buildDRtg(
      statSet, avgEfficiency, false, false
    ) : [ undefined, undefined ];

    return [
      Opponent_Possessions > 0 ? { value: DRtg } : undefined,
      Opponent_Possessions > 0 ? { value: Adj_DRtgPlus } : undefined,
      rawDRtg, rawAdjRating,
      (calcDiags ? {
      // Basic player numbers
      stl: STL,
      blk: BLK,
      drb: DRB,
      pfPct: PFpct,
      // Advanced player numbers
      playerRtg: Player_DRtg,
      playerDelta: Player_Delta,
      scPossConceded: 1 - StopPct,
      noShotCredit: NoShot_Credit,
      reboundCredit: Rebound_Credit,
      missFtCredit: FTmiss_Credit,
      stopsIndPct: Opponent_Possessions > 0 ? Stops_Ind/(0.2*Opponent_Possessions) : 0,
      stopsTeamPct: Opponent_Possessions > 0 ? Stops_Team/(0.2*Opponent_Possessions) : 0,
      // Basic team numbers
      teamBlk: Team_BLK,
      oppoPts: Opponent_PTS,
      oppoPoss: Opponent_Possessions,
      oppoFga: Opponent_FGA,
      oppoFgm: Opponent_FGM,
      oppoFtm: Opponent_FTM,
      oppoFta: Opponent_FTA,
      oppoFtPoss: Opponent_FTposs,
      oppoTov: Opponent_TOV,
      teamStl: Team_STL,
      opponentOrbPct: Team_DORpct,
      opponentFgPct: DFGpct,
      // Advanced team numbers
      teamOrbCreditToDefender: Credit_To_Shot_Defense,
      teamOrbCreditToRebounder: Credit_To_Rebounder,
      teamDvsRebCredit: FMwt,
      oppoFgMiss: Opponent_FGMiss,
      oppoNonStlTov: Opponent_NonStlTOV,
      teamMissWeight: TeamMissWeight,
      oppoFtPct: Opponent_FTA > 0 ? Opponent_FTM/Opponent_FTA : 0,
      oppoFtHitOnePlus: Opponent_HitFTs*Opponent_FTposs,
      oppoProbFtHitOnePlus: Opponent_HitFTs,
      oppoScPoss: ScPoss,
      oppoPtsPerScore: D_Pts_Per_ScPoss,
      teamRtg: Team_DRtg,
      // Adjusted calcs:
      dRtg: DRtg,
      offSos: Off_SOS,
      avgEff: avgEfficiency,
      adjDRtg: Adj_DRtg,
      adjDRtgPlus: Adj_DRtgPlus
    } : undefined) ];
  }
}
