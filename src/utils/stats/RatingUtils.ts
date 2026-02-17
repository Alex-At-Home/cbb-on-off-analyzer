// Utils:
import _ from "lodash";
import { OverrideUtils } from "./OverrideUtils";
import {
  IndivStatSet,
  Statistic,
  TeamStatSet,
  PureStatSet,
} from "../StatModels";

/** All the info needed to explain the ORtg calculation, see "buildORtgDiag" */
export type ORtgDiagnostics = {
  // Basic player numbers:
  rawFga: number;
  rawFgx: number;
  rawFgm: number;
  ptsFgm: number;
  rawFtm: number;
  rawAssist: number;
  rawAssistInfo: string[];
  rawPts: number;
  rawOrb: number;
  rawTo: number;
  // Shooting breakdowns, just for display:
  raw3Fga: number;
  raw2midFga: number;
  raw2rimFga: number;
  raw3Fgm: number;
  raw2midFgm: number;
  raw2rimFgm: number;
  // Basic team numbers:
  teamOrb: number;
  teamPts: number;
  teamFga: number;
  teamFgm: number;
  teamFta: number;
  teamFtPct: number;
  teamOrbPct: number;
  teamTo: number;
  teamPoss: number;

  // 1] Points produced calcs:

  // Advanced player numbers:
  eFG: number;
  // Advanced team numbers:
  teamPtsPerScore: number;
  teamFtHitOnePlus: number;
  teamProbFtHitOnePlus: number;
  rosterOrb: number;
  teamOrbCreditToRebounder: number;
  teamOrbCreditToScorer: number;
  teamScoreFromReboundPct: number;
  teamOrbWeight: number;
  othersAssist: number;
  otherEfg: number;
  otherEfgInfo: string[];
  otherPtsPerFgm: number;
  teamOrbContribPct: number;
  teamScoredPlayPct: number;
  teamAssistRate_Classic: number;
  ppFgTeamAstPct_Classic: number;
  teamAssistRate: number;
  ppFgTeamAstPct: number;
  teamAssistedEfg: number;

  // Pts produced:
  ptsProd: number;
  ppOrb: number;
  ppAssist: number;
  ppAssist_Classic: number;
  ppFg: number;

  // 2] Possession Calcs:
  // Advanced player numbers:
  offPoss: number;
  actualFtaToPoss: number;
  ftPoss: number;
  ftPct: number;
  missedBothFTs: number;
  offPlaysLessPoss: number;
  fgPart: number;
  ftPart: number;
  astPart_Classic: number;
  astPart: number;
  orbPart: number;
  // Advanced team numbers:
  teamScoringPoss: number;
  teamPlays: number;
  // Possession calcs
  adjPoss: number;
  scoringPoss: number;
  fgxPoss: number;
  ftxPoss: number;
  // Adjusted calcs:
  oRtg: number;
  oRtg_Classic: number;
  defSos: number;
  avgEff: number;
  SD_at_Usage: number; //(not used any more)
  SDs_Above_Mean: number; //(not used any more)
  SD_at_Usage_20: number; //(not used any more)
  Regressed_ORtg: number; //(not used any more)
  Usage: number;
  Usage_Bonus: number;
  SoS_Bonus: number;
  adjORtg: number;
  adjORtgPlus: number;

  // Net points decomp:
  rimPoss: number;
  midPoss: number;
  threePoss: number;
  //use orbPart for orbPoss
  astThreePoss: number;
  astTwoPoss: number;
  //(already have ftPoss)
  rimPtsProd: number;
  midPtsProd: number;
  threePtsProd: number;
  //(use ppOrb)
  astThreePProd: number;
  astTwoPProd: number;
  //(use rawFtm)
  //(use rawTo)
};

export type NetPoints = {
  // Off:
  offNetPts: number;
  offNetPtsDerived: number; //(for diag purpose - should be very close to identical to offNetPts)
  offNetPtsAst2: number;
  offNetPtsAst3: number;
  offNetPtsOrb: number;
  offNetPtsRim: number;
  offNetPts3P: number;
  offNetPtsMid: number;
  offNetPtsFt: number;
  offNetPtsTo: number;
  offNetPtsSos: number;
  offNetPtsVolume: number;
  offNetPtsWowy: number;
  // Def:
  defNetPts: number;
  defNetPtsSos: number;
  defNetPtsWowy: number;
};

/** All the info needed to explain the DRtg calculation, see "buildDRtgDiag" */
export type DRtgDiagnostics = {
  // Basic player numbers
  stl: number;
  blk: number;
  drb: number;
  pfPct: number;
  // Advanced player numbers
  playerRtg: number;
  playerDelta: number;
  scPossConceded: number;
  noShotCredit: number;
  reboundCredit: number;
  missFtCredit: number;
  stopsIndPct: number;
  stopsTeamPct: number;
  // Basic team numbers
  teamBlk: number;
  oppoPts: number;
  oppoPoss: number;
  oppoFga: number;
  oppoFgm: number;
  oppoFtm: number;
  oppoFta: number;
  oppoFtPoss: number;
  oppoTov: number;
  teamStl: number;
  teamDrb: number;
  opponentOrbPct: number;
  opponentFgPct: number;
  // Advanced team numbers
  teamOrbCreditToRebounder: number;
  teamOrbCreditToDefender: number;
  teamDvsRebCredit: number;
  oppoFgMiss: number;
  oppoNonStlTov: number;
  teamMissWeight: number;
  oppoFtPct: number;
  oppoFtHitOnePlus: number;
  oppoProbFtHitOnePlus: number;
  oppoScPoss: number;
  oppoPtsPerScore: number;
  teamRtg: number;
  // Adjusted calcs:
  dRtg: number;
  offSos: number;
  avgEff: number;
  adjDRtg: number;
  adjDRtgPlus: number;

  onBallDef?: OnBallDefenseModel;
  onBallDiags?: OnBallDefenseDiags;
};

/** Data pulled from proprietary sources to show pts/play */
export type OnBallDefenseModel = {
  code: string;
  number?: string;
  title: string;

  // Pts/play and stops credit
  pts: number;
  plays: number;
  scorePct: number;
  // Stops credit only
  tovPct: number;
  fgMiss: number;

  // New algo fields
  sfPct: number;
  fgMade: number;

  // Team numbers (same for all players) - needed for pts/play:
  totalPlays: number;
  // These are just interesting diags
  totalPts: number;
  totalScorePct: number;
  uncatPtsPerScPlay: number;
  uncatPts: number;
  uncatPlays: number;
  uncatScorePct: number;

  // New algo fields
  totalSfPlays: number;
  totalTos: number;
  totalFgMade: number;
  totalFgMiss: number;
  uncatSfPlays: number;
  uncatTos: number;
  uncatFgMade: number;
  uncatFgMiss: number;
};

/** All the info needed to explain on ball defense adjustments to DRtg */
export type OnBallDefenseDiags = {
  targetedPct: number;

  effectivePpp: number;
  onBallDRtg: number;
  offBallDRtg: number;
  reboundDRtgBonus: number;

  unadjDRtg: number;

  // Deeper diags
  diagInfo?: Record<string, number>;

  weightedClassicDRtgMean: number;
  weightedUnadjDRtgMean: number;
  uncategorizedAdjustment: number;
  adjustedPossPct: number;

  dRtg: number;
  adjDRtg: number;
  adjDRtgPlus: number;
};

/** (just to make copy/pasting between colab and this code easier)*/
const array = (v: number[]) => {
  return v;
};

/** Contains the logic to build offensive and defensive ratings for individual players */
export class RatingUtils {
  // Manual override calcs:

  /** The % of average efficiency that represents replacement level */
  static readonly Replacement_Level = 0.92;

  /** Arbitary/guess constant from original (NBA box scores) paper: 7% of the time possession is retained without an off. rebound */
  static readonly retainPossWithReboundRate = 1.07;

  /** Builds the overrides to the raw fields based on stat overrides
   *  See also OverrideUtils.applyPlayerOverridesToTeam, which is tightly coupled to this
   */
  static buildOffOverrides(statSet: IndivStatSet): Record<string, Statistic> {
    const threePTries = statSet?.total_off_3p_attempts?.value || 0;
    const twoPTries = statSet?.total_off_2p_attempts?.value || 0;
    const freeThrowTries = statSet?.total_off_fta?.value || 0;

    const extra3PMakes = OverrideUtils.diff(statSet.off_3p) * threePTries;
    const extra2PMakes = OverrideUtils.diff(statSet.off_2p) * twoPTries;
    const extraFgMakes = extra3PMakes + extra2PMakes;
    const extraFtMakes = OverrideUtils.diff(statSet.off_ft) * freeThrowTries;

    // TOs are more complicated:
    // (old_tos + tos_diff)/(currPoss + tos_diff) = new_to% =>
    // ie (old_tos + tos_diff) = new_to%*(currPoss + tos_diff)
    // ie tos_diff = (new_to%*currPoss - old_tos)/(1 - new_to%)
    const newToPct = statSet?.off_to?.value || 0; //(new value)
    const adjNewToPct = newToPct > 0.9 ? 0.9 : newToPct; //(avoid stupidly high TO%)
    const oldTos = statSet?.total_off_to?.value || 0;
    const currPoss = statSet?.off_poss?.value || 0;
    const extraTos = (adjNewToPct * currPoss - oldTos) / (1 - adjNewToPct);

    //TODO: additional ORBs? It's a bit tricky because you'd then need to add more shots and hits/misses
    //(some of which would be made by the player - so for now it's probably best just to ignore, I think
    // it's a second-order effect anyway)

    //TODO: also not taking into account other players' manual edits (at the team level)

    return {
      total_off_fgm: {
        value: (statSet?.total_off_fgm?.value || 0) + extraFgMakes,
      },
      total_off_2p_made: {
        value: (statSet?.total_off_2p_made?.value || 0) + extra2PMakes,
      },
      total_off_3p_made: {
        value: (statSet?.total_off_3p_made?.value || 0) + extra3PMakes,
      },
      total_off_ftm: {
        value: (statSet?.total_off_ftm?.value || 0) + extraFtMakes,
      },

      total_off_to: { value: (statSet?.total_off_to?.value || 0) + extraTos },
      off_poss: { value: (statSet?.off_poss?.value || 0) + extraTos },

      team_total_off_pts: {
        value:
          (statSet?.team_total_off_pts?.value || 0) +
          3 * extra3PMakes +
          2 * extra2PMakes +
          extraFtMakes,
      },
      team_total_off_fgm: {
        value: (statSet?.team_total_off_fgm?.value || 0) + extraFgMakes,
      },
      team_total_off_3p_made: {
        value: (statSet?.team_total_off_3p_made?.value || 0) + extra3PMakes,
      },
      team_total_off_ftm: {
        value: (statSet?.team_total_off_ftm?.value || 0) + extraFtMakes,
      },

      team_total_off_to: {
        value: (statSet?.team_total_off_to?.value || 0) + extraTos,
      },
    };
  }

  // Rating calcs

  /** From https://www.basketball-reference.com/about/ratings.html */
  static buildORtg(
    statSet: IndivStatSet,
    rosterStatsByCode: Record<string, IndivStatSet>,
    extraTeamStatInfo: { total_off_to: Statistic; sum_total_off_to: Statistic },
    avgEfficiency: number,
    calcDiags: boolean,
    overrideAdjusted: boolean,
  ): [
    { value: number } | undefined,
    { value: number } | undefined,
    { value: number } | undefined,
    { value: number } | undefined, //< if overridden these are the raw vals
    ORtgDiagnostics | undefined,
  ] {
    if (!statSet)
      return [undefined, undefined, undefined, undefined, undefined];

    /** version of _ . sumBy(..) which gives you the index as well as the value */
    const sumBy = (aa: Array<number>, f: (x: number, ii: number) => number) => {
      return _.sum(aa.map((x, ii) => f(x, ii)));
    };

    const overrides = overrideAdjusted
      ? RatingUtils.buildOffOverrides(statSet)
      : ({} as Record<string, Statistic>);
    const statGet = (key: string) => {
      return (
        (!_.isNil(overrides[key])
          ? overrides[key].value
          : statSet?.[key]?.value) || 0
      );
    };
    // New for assist calcs:
    const [_Rim, _Mid, _3P] = [0, 1, 2];
    const shotLocs = ["2prim", "2pmid", "3p"];
    const shotLocToLoc: Record<string, string> = {
      "3p": "3p",
      "2prim": "rim",
      "2pmid": "mid",
    };
    const shotBonus = [2, 2, 3];

    // The formulate references (MP / (Team_MP / 5)) a fair bit
    // All our team numbers are when the player is on the floor, so we set to 1

    // There are some team TOVs, which will assign to the team based on possessions players:
    //TODO; put this is the diags
    const UnblamedTOVs = Math.max(
      (extraTeamStatInfo.total_off_to?.value || 0) -
        (extraTeamStatInfo.sum_total_off_to?.value || 0),
      0,
    );
    const UnblamedTOVs_Player =
      0.2 * UnblamedTOVs * statGet("off_team_poss_pct");

    const FGA = statSet?.total_off_fga?.value || 0;
    const FGM = statGet("total_off_fgm");
    const FTM = statGet("total_off_ftm");
    const FTA = statSet?.total_off_fta?.value || 0;
    const AST = statSet?.total_off_assist?.value || 0;
    const TOV = statGet("total_off_to") + UnblamedTOVs_Player;
    const ORB = statSet?.total_off_orb?.value || 0;
    const FG2PM = statGet("total_off_2p_made");
    const FG3PM = statGet("total_off_3p_made");
    const offPoss = statGet("off_poss");
    const Def_SOS = statSet?.def_adj_opp?.value || avgEfficiency;
    // New for assist calcs:
    const Made = shotLocs.map((l) => statGet(`total_off_${l}_made`));
    const AttemptsDenom = shotLocs.map(
      (l) => statGet(`total_off_${l}_attempts`) || 1,
    ); //||1 because used as denom
    const RealAttempts = shotLocs.map(
      (l) => statGet(`total_off_${l}_attempts`) || 0,
    );
    const AssistedPct = shotLocs.map((l) => statGet(`off_${l}_ast`));
    const AssistsTotals = shotLocs.map((l) =>
      statGet(`total_off_ast_${shotLocToLoc[l]!}`),
    );
    const Assists: [string, Record<string, number>][] = shotLocs.map(
      (l) => [
        l,
        ((statSet as any)[`off_ast_${shotLocToLoc[l]!}_target`]
          ?.value as Record<string, number>) || {},
      ],
      // array of [shotLoc, map[player -> count]]
    );

    const Team_AST = statSet?.team_total_off_assist?.value || 0;
    const Team_FGM = statGet("team_total_off_fgm");
    const Team_FGA = statSet?.team_total_off_fga?.value || 0;
    const Team_FTM = statGet("team_total_off_ftm");
    const Team_FTA = statSet?.team_total_off_fta?.value || 0;
    const Team_PTS = statGet("team_total_off_pts");
    const Team_TOV = statGet("team_total_off_to");
    const Team_3PM = statGet("team_total_off_3p_made");
    const Team_Poss = statGet("team_total_off_poss");

    // TODO: regress this to bigger samples
    const Team_ORB = statSet?.team_total_off_orb?.value || 0;
    const Opponent_DRB = statSet?.oppo_total_def_drb?.value || 0;
    // Calculate an approximate number
    const Sum_Players_ORB = _.chain(rosterStatsByCode)
      .values()
      .sumBy((p) => p.total_off_orb?.value || 0)
      .value();
    const Global_ORB =
      _.chain(rosterStatsByCode)
        .values()
        .sumBy((p) => p.team_total_off_orb?.value || 0)
        .value() / 5;
    const Roster_ORB = Team_ORB * (Sum_Players_ORB / (Global_ORB || 1));

    // New for more granular ORB calcs:
    //TODO: don't currently collect these for the team, need to decide what to do
    //(eg calc approx weights from team? Or start collecting - another 5 sums per player? Or do it properly at the source?)
    // const Team_Made = shotLocs.map(l => statGet(`team_total_off_${l}_made`));
    // const Team_Attempts = shotLocs.map(l => statGet(`team_total_off_${l}_attempts`));
    // const ORB_Type_Weights = [ 1.0, 0.75, 0.5 ];
    // const Weighted_Team_Misses = _.zipWith(
    //   Team_Attempts, Team_Made, ORB_Type_Weights,
    //   (attempts, made, weights) => ((attempts || 0) - (made || 0))*(weights || 0)
    // );
    // const Team_FGX = Team_FGA - Team_FGM;
    //   //it gets harder to rebound the longer the shots, see https://kenpom.com/blog/rebounding-2s-vs-3s/
    //   // (the mid-range is a bit arbitrary, I weighted it towards the rim because longer 2s are rarer)
    // const Team_ORB_Rim = Team_ORB/(_.sumBy(Weighted_Team_Misses, miss => miss/(Team_FGX || 1)) || 1);
    // const Team_ORB_Mid = Team_ORB_Rim*(4/3);
    // const Team_ORB_3P = Team_ORB_Rim*2;

    // // Debug:
    // console.log(`ORBS [${statSet.key}]: [${Team_ORB}] = rim=[${Team_ORB_Rim}] + mid=[${Team_ORB_Mid}] + 3p=[${Team_ORB_3P}] (weighted misses: [${Team_Made}])`);

    // Useful base derived stats:
    const PTS_FROM_FG = 2 * FG2PM + 3 * FG3PM;
    const eFG = FGA > 0 ? PTS_FROM_FG / (2 * FGA) : 0.0;
    const Team_PTS_FROM_FG = Team_PTS - Team_FTM;
    const Others_FGA = Team_FGA - FGA;
    const Others_FGM = Team_FGM - FGM;
    const Others_AST = Team_AST - AST;
    const Others_eFG =
      Others_FGA > 0 ? (Team_PTS_FROM_FG - PTS_FROM_FG) / (2 * Others_FGA) : 0;

    // This is much simplified because the stats are for the period the player was on the floor

    // don't use qAST_Classic except for display because it is inaccurate (eg I saw an sum(error) of ~5pts on total of ~435)
    const qAST_Classic = Team_FGM > 0 ? 1.14 * (Others_AST / Team_FGM) : 0.0; //(estimate of what % of player's FGs were assisted)
    // Even for "classic" calcs we'll just this more accurate ast%
    const qAST =
      FGM > 0
        ? sumBy(Made, (playerMade, index) => AssistedPct[index]! * playerMade) /
          FGM
        : 0;

    const Team_Assist_Contrib_Classic = 0.5 * eFG * qAST;
    const FG_Part_Classic = FGM * (1 - Team_Assist_Contrib_Classic); //TAC = 1 - FG_Part/FGM
    const AST_Part_Classic =
      Others_FGA > 0
        ? 0.5 * ((Team_PTS_FROM_FG - PTS_FROM_FG) / (2 * Others_FGA)) * AST
        : 0.0;

    // New for assist calcs:
    const capThreePtAssistPenalty = (eFG: number, shotType: number) => {
      if (shotType == 2) {
        // shouldn't penalize 3P shooters for being good!
        // in fact we'll give them a buff if they are really good:
        const elite3PBuff =
          eFG > 0.38 * 1.5 ? Math.min(eFG - 0.38 * 1.5, 0.07 * 1.5) : 0; //(capped at 45%)
        return Math.min(eFG, 0.345 * 1.5) - elite3PBuff;
      } else {
        return eFG;
      }
    };
    const FGM_Minus_AssistPenalty = Made.map((playerMade, index) => {
      //(0.5*eFG)*(assisted FGs=FG*assisted)
      const playerEfg =
        0.5 * shotBonus[index]! * (playerMade / AttemptsDenom[index]!);
      return (
        playerMade *
        (1 -
          0.5 * capThreePtAssistPenalty(playerEfg, index) * AssistedPct[index]!)
      );
    });
    const FG_Part = _.sum(FGM_Minus_AssistPenalty);
    // We back-calculate these equivalents to the classic calcs just for approximate diags display
    const Team_Assist_Contrib = FGM > 0 ? 1 - FG_Part / FGM : 0;
    const Team_Assisted_eFG = qAST > 0 ? 2 * (Team_Assist_Contrib / qAST) : 0;

    const Capped_Efg_By_ShotType = Assists.map((locMap, index) => {
      const shotLoc = locMap[0];
      const playerMap = locMap[1];
      var totalEfgCount = AssistsTotals[index]! || 1;
      const eFgPart1 = 0.5 * shotBonus[index];
      return (
        _.sumBy(_.toPairs(playerMap), (playerCount) => {
          //(0.5*eFG)*(assists)
          const playerCode = playerCount[0];
          const count = playerCount[1] as number;
          const playerEfg =
            eFgPart1 *
            (rosterStatsByCode[playerCode]?.[`off_${shotLoc}`]?.value ||
              Others_eFG / eFgPart1);
          //(if we can't find the player, we just fallback to using team eFG for all phases)

          return capThreePtAssistPenalty(playerEfg, index) * count;
        }) / totalEfgCount
      );
    });
    const AST_Part = Capped_Efg_By_ShotType.map((cappedEffFG, index) => {
      return 0.5 * cappedEffFG * AssistsTotals[index]!;
    });

    // We have the actual number of possessions, which means we can do better than the legacy:
    //const FTA_to_Poss = 0.475;
    //(there was a case [23/24 La Salle] where a low volume player had this resolve to 0, so put a safety check in the low volume case)
    const Actual_FT_Poss = Math.max(
      Team_Poss - (Team_TOV + Team_FGA - Team_ORB),
      FTA > 0 ? 1 : 0,
    );
    const Actual_FTA_to_Poss = Actual_FT_Poss / (Team_FTA || 1);

    const Prob_Miss_Both_FT = FTA > 0 ? (1 - FTM / FTA) ** 2 : 0.0;
    const FT_Part =
      FTA > 0 ? (1 - Prob_Miss_Both_FT) * Actual_FTA_to_Poss * FTA : 0.0;

    const Team_Prob_Hit_1plus_FT = 1 - (1 - Team_FTM / Team_FTA) ** 2;
    const Team_Scoring_Poss =
      Team_FTA > 0
        ? Team_FGM + Team_Prob_Hit_1plus_FT * Team_FTA * Actual_FTA_to_Poss
        : 0.0;

    const Team_ORB_pct =
      Team_ORB + Opponent_DRB > 0 ? Team_ORB / (Team_ORB + Opponent_DRB) : 0.0;
    const Num_Team_Plays = Team_FGA + Team_FTA * Actual_FTA_to_Poss + Team_TOV;
    const Team_Play_Pct =
      Num_Team_Plays > 0 ? Team_Scoring_Poss / Num_Team_Plays : 0.0;

    const Credit_To_Rebounder = (1 - Team_ORB_pct) * Team_Play_Pct;
    const Credit_To_Scorer = Team_ORB_pct * (1 - Team_Play_Pct);
    const Team_ORB_Weight_Denom = Credit_To_Rebounder + Credit_To_Scorer;
    const Team_ORB_Weight =
      Team_ORB_Weight_Denom > 0
        ? Credit_To_Rebounder / Team_ORB_Weight_Denom
        : 0.0;

    const Team_Score_Rebound_Pct =
      Team_Scoring_Poss > 0
        ? (Roster_ORB * Team_Play_Pct) / Team_Scoring_Poss
        : 0.0;
    const Team_ORB_Contrib = Team_ORB_Weight * Team_Score_Rebound_Pct;

    const ORB_Part = ORB * Team_ORB_Weight * Team_Play_Pct;

    // And then:
    const ScPoss =
      (FG_Part + _.sum(AST_Part) + FT_Part) * (1 - Team_ORB_Contrib) + ORB_Part;
    //(legacy assist code)
    const ScPoss_Classic =
      (FG_Part_Classic + AST_Part_Classic + FT_Part) * (1 - Team_ORB_Contrib) +
      ORB_Part;

    // Other factors:

    const FGxPoss =
      (FGA - FGM) * (1 - RatingUtils.retainPossWithReboundRate * Team_ORB_pct);

    const FTxPoss =
      FTA > 0 ? Prob_Miss_Both_FT * Actual_FTA_to_Poss * FTA : 0.0;

    const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;

    // Some more decompostion:
    const shotPossDecomp = shotLocs.map((__, idx) => {
      return (
        FGM_Minus_AssistPenalty[idx] * (1 - Team_ORB_Contrib) +
        (RealAttempts[idx] - Made[idx]) *
          (1 - RatingUtils.retainPossWithReboundRate * Team_ORB_pct)
      );
    });
    const [rimPoss, midPoss, threePoss] = shotPossDecomp!;

    // Finally:

    const PProd_FG_Part_Classic =
      PTS_FROM_FG * (1 - Team_Assist_Contrib_Classic);
    // New assist code:
    const PProd_FG_Part = sumBy(
      FGM_Minus_AssistPenalty,
      (f, ii) => f * shotBonus[ii]!,
    );
    //(use the possession count but weighted by pts/scoring-poss)

    const PProd_FG_Decomp = shotBonus.map((bonus, idx) => {
      return FGM_Minus_AssistPenalty[idx] * bonus * (1 - Team_ORB_Contrib);
    });
    const [rimPtsProd, midPtsProd, threePtsProd] = PProd_FG_Decomp!;

    const Other_eFG =
      Others_FGA > 0
        ? (Team_FGM - FGM + 0.5 * (Team_3PM - FG3PM)) / Others_FGA
        : 0.0;
    const Other_Pts_Per_FGM =
      Others_FGM > 0 ? (Team_PTS_FROM_FG - PTS_FROM_FG) / Others_FGM : 0.0;
    const PProd_AST_Part_Classic = 0.5 * Other_eFG * AST * Other_Pts_Per_FGM;
    // New assist code:
    const PProd_AST_Part = sumBy(AST_Part, (a, ii) => shotBonus[ii]! * a);

    const astThreePProd = AST_Part[2]! * shotBonus[2]! * (1 - Team_ORB_Contrib);
    const astTwoPProd =
      (PProd_AST_Part - astThreePProd) * (1 - Team_ORB_Contrib);
    const astTwoPoss = (AST_Part[0]! + AST_Part[1]!) * (1 - Team_ORB_Contrib);
    const astThreePoss = AST_Part[2]! * (1 - Team_ORB_Contrib);

    const Team_FTs_Hit_1plus =
      Team_FTA > 0
        ? Team_Prob_Hit_1plus_FT * Actual_FTA_to_Poss * Team_FTA
        : 0.0;
    const Team_Pts_Per_Score =
      Team_FGM + Team_FTs_Hit_1plus > 0
        ? Team_PTS / (Team_FGM + Team_FTs_Hit_1plus)
        : 0.0;
    const PProd_ORB_Part =
      ORB * Team_ORB_Weight * Team_Play_Pct * Team_Pts_Per_Score;

    const PProd =
      (PProd_FG_Part + PProd_AST_Part + FTM) * (1 - Team_ORB_Contrib) +
      PProd_ORB_Part;

    // Legacy assist algo:
    const PProd_Classic =
      (PProd_FG_Part_Classic + PProd_AST_Part_Classic + FTM) *
        (1 - Team_ORB_Contrib) +
      PProd_ORB_Part;
    const TotPoss_Classic = ScPoss_Classic + FGxPoss + FTxPoss + TOV;
    const ORtg_Classic =
      TotPoss > 0 ? 100 * (PProd_Classic / TotPoss_Classic) : 0;
    // Adjusted efficiency
    // Adapted from: https://www.bigtengeeks.com/new-stat-porpagatu/

    // Useful diag info for debugging in Google Sheets
    const diagInfo: string = "";
    if (diagInfo.indexOf("POSS_TOT_CLASSIC") >= 0) {
      console.log(
        `POSS_TOT,${FG_Part_Classic},${AST_Part_Classic},${FT_Part},*,${
          1 - Team_ORB_Contrib
        },+,${ORB_Part},+,${FGxPoss},+,${FTxPoss},+,${TOV},=,${TotPoss_Classic}`,
      );
    }
    if (diagInfo.indexOf("PTS_TOT_CLASSIC") >= 0) {
      console.log(
        `PTS_TOT,${PProd_FG_Part_Classic},${PProd_AST_Part_Classic},${FTM},*,${
          1 - Team_ORB_Contrib
        },+,${PProd_ORB_Part},=,${PProd_Classic}`,
      );
    }
    if (diagInfo.indexOf("PTS_AST_CLASSIC") >= 0) {
      console.log(
        `PTS_AST,${PProd_FG_Part_Classic},=,${PTS_FROM_FG},*,${
          1 - Team_Assist_Contrib_Classic
        },...,${PProd_AST_Part_Classic},=,${0.5 * Other_eFG},*,${AST},*,${
          Team_PTS_FROM_FG - PTS_FROM_FG
        },/,${Others_FGM}`,
      );
    }
    if (diagInfo.indexOf("PTS_AST") >= 0) {
      console.log(
        `PTS_AST,${PProd_FG_Part},=,${FGM_Minus_AssistPenalty.join(
          ",",
        )},*,${shotBonus.join(",")},...,${PProd_AST_Part},=,${shotBonus.join(
          ",",
        )},*,${AST_Part.join(",")}`,
      );
    }

    //TODO: switching from classic broke the total numbers, so moving back to classic for now
    const ORtg = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;

    // My changes:
    // AR1- don't regress the ORtg (don't like "regressing upwards at high usage")
    // AR2- apply the usage to the (ORtg-avg) delta _then_ apply the bonus (at 20% usage)
    //    ^ this one is important because it ensures that the sum of the Adj Rtg+ is the adjusted efficiency
    // AR3- make the bonus offScale be the same for >/< average usage

    // Calculate actual ORtg usage and use that in all ORtg calcs
    const usage = (100 * TotPoss) / (Team_Poss || 1);

    const o_adj = avgEfficiency / Def_SOS;
    // See AR1:
    // (we don't use this any more, but keep it for display)
    const SD_at_Usage = usage * -0.144 + 13.023;
    const SDs_Above_Mean =
      SD_at_Usage > 0 ? (ORtg - avgEfficiency) / SD_at_Usage : 0;
    const SD_at_Usage_20 = 10.143;
    const Regressed_ORtg = avgEfficiency + SDs_Above_Mean * SD_at_Usage_20;
    // See AR3:
    // See AR2:
    const { Adj_ORtg, Adj_ORtgPlus, Usage_Bonus, SoS_Bonus } = _.thru(
      null,
      (__) => {
        if (false) {
          // Legacy, replace this thru with commented out code once I'm committed
          // Current "PPG!"-like
          const Usage_Bonus =
            usage > 20 ? (usage - 20) * 1.25 : (usage - 20) * 1.5;
          const Adj_ORtg = (ORtg + Usage_Bonus) * o_adj;
          const Adj_ORtgPlus = 0.2 * (Adj_ORtg - avgEfficiency);
          const ORtgPlus = 0.2 * (ORtg + Usage_Bonus - avgEfficiency);

          // TODO: candidate new calc:
          // const Adj_ORtg = 0.01*(ORtg*usage + Usage_Bonus*20)*o_adj;
          // const Adj_ORtgPlus = Adj_ORtg - avgEfficiency*(usage*0.01);

          // so sum(Adj_ORtgPlus) = sum(ORtg*usage)*sos_factor + 1.25*sum(delta_usage)*sos_factor - avgEff*(sum(usage))
          //                      = AdjTeamOffEff + 0 {sum(delta_usage)=0} - avgEff {sum(usage)=1}

          return {
            Adj_ORtg,
            Adj_ORtgPlus,
            Usage_Bonus,
            SoS_Bonus: Adj_ORtgPlus - ORtgPlus,
          };
        } else {
          // Dean Oliver's "PUE" with some diagnostics
          const Adj_ORtg = ORtg * o_adj;
          const Unadjusted_Productivity = 0.01 * usage * (ORtg - avgEfficiency);
          const Raw_Productivity =
            0.01 *
              usage *
              (ORtg - RatingUtils.Replacement_Level * avgEfficiency) -
            0.2 * (1 - RatingUtils.Replacement_Level) * avgEfficiency;
          // Adjusted for both SoS and usage:
          const Adj_ORtgPlus =
            0.01 *
              usage *
              (Adj_ORtg - RatingUtils.Replacement_Level * avgEfficiency) -
            0.2 * (1 - RatingUtils.Replacement_Level) * avgEfficiency;
          return {
            Adj_ORtg,
            Adj_ORtgPlus,
            Usage_Bonus: 5 * (Raw_Productivity - Unadjusted_Productivity),
            //(^ this is now v small, most of the benefit comes from multiplying the efficiency gain by the usage)
            SoS_Bonus: Adj_ORtgPlus - Raw_Productivity,
          };
        }
      },
    );

    // If the values have been overridden then calculate the un-overridden values
    const [rawORtg, rawAdjRating] = overrideAdjusted
      ? RatingUtils.buildORtg(
          statSet,
          rosterStatsByCode,
          extraTeamStatInfo,
          avgEfficiency,
          false,
          false,
        )
      : [undefined, undefined];

    return [
      TotPoss > 0 ? { value: ORtg } : undefined,
      TotPoss > 0 ? { value: Adj_ORtgPlus } : undefined,
      rawORtg,
      rawAdjRating,
      (calcDiags
        ? {
            // Basic player numbers:
            rawFga: FGA,
            rawFgx: FGA - FGM,
            rawFgm: FGM,
            ptsFgm: PTS_FROM_FG,
            rawFtm: FTM,
            rawAssist: AST,
            rawAssistInfo: _.reverse(AssistsTotals.map((p) => p.toFixed(0))), //(3p first)
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
            otherEfgInfo: _.reverse(
              Capped_Efg_By_ShotType.map((efg) => (100 * efg).toFixed(1)),
            ), //(3p first)
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
            ftPoss: Actual_FTA_to_Poss * FTA,
            actualFtaToPoss: Actual_FTA_to_Poss,
            ftPct: FTA > 0 ? FTM / FTA : 0,
            missedBothFTs: Prob_Miss_Both_FT,
            offPlaysLessPoss: FGA + FTA * Actual_FTA_to_Poss + TOV - offPoss,
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
            SD_at_Usage: SD_at_Usage, // (these 4 aren't used any more but keep them for info)
            SDs_Above_Mean: SDs_Above_Mean,
            SD_at_Usage_20: SD_at_Usage_20,
            Regressed_ORtg: Regressed_ORtg,
            Usage: Math.max(usage, 0.0), //(this can replace off_usage, so ensure it's sane in edge cases)
            Usage_Bonus,
            SoS_Bonus,
            adjORtg: Adj_ORtg,
            adjORtgPlus: Adj_ORtgPlus,

            // Some decomposition for Net points calcs:
            rimPoss,
            midPoss,
            threePoss,
            astThreePoss,
            astTwoPoss,
            rimPtsProd,
            midPtsProd,
            threePtsProd,
            astThreePProd,
            astTwoPProd,
          }
        : undefined) as ORtgDiagnostics | undefined,
    ];
  }

  /** Decompose ORtg and RAPM into something that looks a bit like Net points, if you squint */
  static buildNetPoints = (
    playerRapmAndPossPct: IndivStatSet,
    ortg: ORtgDiagnostics,
    drtg: DRtgDiagnostics,
    avgEff: number,
    scaleType: "T%" | "P%" | "/G",
    numGames: number = 1,
    missingGameAdjument: number = 1,
  ): NetPoints => {
    const avgPpp = 0.01 * avgEff;

    // Offense

    const offPossPct = playerRapmAndPossPct.off_team_poss_pct?.value ?? 0; //(% of time player is on floor)
    const offPosWhileOnFloor = ortg.teamPoss;

    const offScale =
      scaleType == "/G"
        ? 1.0 / (numGames || 1)
        : scaleType == "P%"
          ? 100 / (offPosWhileOnFloor || 1)
          : (100 * offPossPct * missingGameAdjument) /
            (offPosWhileOnFloor || 1);

    // These are over the sample
    // eg in one game Player A has 15 possessions (on floor for 50) and scores say 3pts+, so
    // P% is 2x (we want on floor for 100)

    const offNetPts3P =
      (ortg.threePtsProd - ortg.threePoss * avgPpp) * offScale;
    const offNetPtsMid = (ortg.midPtsProd - ortg.midPoss * avgPpp) * offScale;
    const offNetPtsRim = (ortg.rimPtsProd - ortg.rimPoss * avgPpp) * offScale;
    const offNetPtsOrb = (ortg.ppOrb - ortg.orbPart * avgPpp) * offScale;
    const offNetPtsFt =
      (ortg.rawFtm - ortg.ftPoss * avgPpp) *
      (1 - ortg.teamOrbContribPct) *
      offScale;
    const offNetPtsTo = -ortg.rawTo * avgPpp * offScale;
    const offNetPtsAst2 =
      (ortg.astThreePProd - ortg.astThreePoss * avgPpp) * offScale;
    const offNetPtsAst3 =
      (ortg.astTwoPProd - ortg.astTwoPoss * avgPpp) * offScale;

    // These are all in pts/T100 (because they are derived from RAPM/adj rtg+ which includes usgage)

    const offNetPtsVolume =
      ortg.Usage_Bonus * 0.2 * ortg.teamPoss * 0.01 * offScale;

    const offNetPtsSos = ortg.SoS_Bonus * ortg.teamPoss * 0.01 * offScale;

    const offNetPtsWowy = _.thru(
      playerRapmAndPossPct.off_adj_rapm as Statistic,
      (rapm) => {
        if (rapm) {
          const delta = (rapm.value || 0) - ortg.adjORtgPlus; //pts/P100 SoS-adj
          return delta * ortg.teamPoss * 0.01 * offScale;
        } else {
          return 0.0;
        }
      },
    );

    const offNetPts =
      ((playerRapmAndPossPct.off_adj_rapm as Statistic)?.value ??
        ortg.adjORtgPlus) *
      ortg.teamPoss *
      0.01 *
      offScale;

    // Final calcs

    const offNetPtsDerived =
      offNetPts3P +
      offNetPtsMid +
      offNetPtsRim +
      offNetPtsOrb +
      offNetPtsFt +
      offNetPtsTo +
      offNetPtsAst2 +
      offNetPtsAst3 +
      offNetPtsVolume +
      offNetPtsWowy +
      offNetPtsSos;

    // Defense:

    const defPossPct = playerRapmAndPossPct.def_team_poss_pct?.value ?? 0; //(% of time player is on floor)
    const defPosWhileOnFloor = drtg.oppoPoss;

    const defScale =
      scaleType == "/G"
        ? 1.0 / (numGames || 1)
        : scaleType == "P%"
          ? 100 / (defPosWhileOnFloor || 1)
          : (100 * missingGameAdjument * defPossPct) /
            (defPosWhileOnFloor || 1);

    const defNetPtsWowy = _.thru(
      playerRapmAndPossPct.def_adj_rapm as Statistic,
      (rapm) => {
        if (rapm) {
          const delta = (rapm.value || 0) - drtg.adjDRtgPlus; //pts/P100 SoS-adj
          return delta * drtg.oppoPoss * 0.01 * defScale;
        } else {
          return 0.0;
        }
      },
    );
    const defNetPtsBeforeRapm =
      drtg.adjDRtgPlus * drtg.oppoPoss * 0.01 * defScale;

    const unadjDefNet =
      (drtg.dRtg - avgEff) * 0.2 * drtg.oppoPoss * 0.01 * defScale;

    // These results are across the full sample (eg 70ish possessions for a game, 1000 possessions
    // for a season)
    // To convert to "P%", *100, divide by player poss (offPoss?)
    // To convert to "T%", *100, divide by player poss (offPoss?), multiply by usage/100
    // To convert to "/G", divice by number of player games
    return {
      /// Off:
      offNetPts,
      offNetPtsDerived,
      offNetPtsAst2,
      offNetPtsAst3,
      offNetPtsOrb,
      offNetPtsRim,
      offNetPts3P,
      offNetPtsMid,
      offNetPtsFt,
      offNetPtsTo,
      offNetPtsVolume,
      offNetPtsWowy,
      offNetPtsSos,
      // Def:
      defNetPts: defNetPtsBeforeRapm + defNetPtsWowy,
      defNetPtsWowy,
      defNetPtsSos: unadjDefNet - defNetPtsBeforeRapm,
    };
  };

  /** Builds the overrides to the raw fields based on stat overrides */
  private static buildDefOverrides(statSet: Record<string, any>) {
    const threePTries = statSet?.oppo_total_def_3p_attempts?.value || 0;
    const extra3PMakes = OverrideUtils.diff(statSet.oppo_def_3p) * threePTries;

    return {
      oppo_total_def_pts: {
        value: (statSet?.oppo_total_def_pts?.value || 0) + 3 * extra3PMakes,
      },
      oppo_total_def_fgm: {
        value: (statSet?.oppo_total_def_fgm?.value || 0) + extra3PMakes,
      },
    };
  }

  /** From https://www.basketball-reference.com/about/ratings.html */
  static buildDRtg(
    statSet: Record<string, any>,
    avgEfficiency: number,
    calcDiags: boolean,
    overrideAdjusted: boolean,
  ): [
    { value: number } | undefined,
    { value: number } | undefined,
    { value: number } | undefined,
    { value: number } | undefined, //< if overrridden these are the raw vals
    DRtgDiagnostics | undefined,
  ] {
    if (!statSet)
      return [undefined, undefined, undefined, undefined, undefined];

    const overrides = overrideAdjusted
      ? RatingUtils.buildDefOverrides(statSet)
      : ({} as Record<string, any>);
    const statGet = (key: string) => {
      return !_.isNil((overrides as any)[key])
        ? (overrides as any)[key].value
        : statSet?.[key]?.value || 0;
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
    const Opponent_Possessions_PbP = statSet?.oppo_total_def_poss?.value || 0;
    const Opponent_FTposs = 0.475 * Opponent_FTA;
    const Opponent_Possessions_Box =
      Opponent_FTposs + Opponent_FGA + Opponent_TOV - Opponent_ORB;
    const Opponent_PTS = statGet("oppo_total_def_pts");

    // The overall credit for a miss and a defensive rebound gets split between the ...
    // ... team for forcing the miss and the individual for getting the rebound
    // (as per usual based on their relative difficulty)
    const DFGpct = Opponent_FGA > 0 ? Opponent_FGM / Opponent_FGA : 0;
    const Total_RBs = Opponent_ORB + Team_DRB;
    const Team_DORpct = Total_RBs > 0 ? Opponent_ORB / Total_RBs : 0;
    const Credit_To_Shot_Defense = DFGpct * (1 - Team_DORpct);
    const Credit_To_Rebounder = (1 - DFGpct) * Team_DORpct;
    const FMwt =
      Credit_To_Shot_Defense + Credit_To_Rebounder > 0
        ? Credit_To_Shot_Defense /
          (Credit_To_Shot_Defense + Credit_To_Rebounder)
        : 0;

    // Block/Miss weighting - team has to rebound, and the credit is the chance opponent would have scored (bonus 7%)
    const TeamMissWeight =
      FMwt * (1 - RatingUtils.retainPossWithReboundRate * Team_DORpct);
    // Credit to the individual for stops
    const PFpct = Team_PF > 0 ? PF / Team_PF : 0;
    const Opponent_MissAllFTs =
      Opponent_FTA > 0 ? (1 - Opponent_FTM / Opponent_FTA) ** 2 : 0;
    const NoShot_Credit = STL + BLK * TeamMissWeight;
    const Rebound_Credit = DRB * (1 - FMwt);
    const FTmiss_Credit = PFpct * Opponent_FTposs * Opponent_MissAllFTs;
    const Stops_Ind = NoShot_Credit + Rebound_Credit + FTmiss_Credit;

    // Credit to the team for stops (divided by 5 for shots/turnovers, in proportion of fouls for FTMs)
    const Opponent_FGMiss = Opponent_FGA - Opponent_FGM - Team_BLK;
    const Opponent_NonStlTOV = Opponent_TOV - Team_STL;
    const Stops_Team =
      0.2 * (Opponent_FGMiss * TeamMissWeight + Opponent_NonStlTOV);

    const Stops = Stops_Ind + Stops_Team;

    //TODO:
    // This isn't working _that_ well ... the issues seem to be:
    // 1] (Box-)Derived Poss vs PbP Score Poss
    // For now I use the PbP poss for team poss but then for the delta used the Box
    // 2] Team DRB vs Sum(Player DRB) .. I think this is what the 0.7 is intended to represent

    const StopPct =
      Opponent_Possessions_Box > 0
        ? Stops / (0.2 * Opponent_Possessions_Box)
        : 0;

    const Opponent_HitFTs = 1 - Opponent_MissAllFTs;
    const Team_DRtg_PbP =
      Opponent_Possessions_PbP > 0
        ? 100 * (Opponent_PTS / Opponent_Possessions_PbP)
        : 0;
    const Team_DRtg_Box =
      Opponent_Possessions_Box > 0
        ? 100 * (Opponent_PTS / Opponent_Possessions_Box)
        : 0;

    const ScPoss = Opponent_FGM + Opponent_HitFTs * Opponent_FTposs;
    const D_Pts_Per_ScPoss = ScPoss > 0 ? Opponent_PTS / ScPoss : 0;

    const Player_DRtg = 100 * D_Pts_Per_ScPoss * (1 - StopPct);
    const Player_Delta = 0.2 * (Player_DRtg - Team_DRtg_Box);

    const DRtg = Team_DRtg_PbP + Player_Delta;
    const Off_SOS = statSet?.off_adj_opp?.value || avgEfficiency;
    const Adj_DRtg = Off_SOS > 0 ? DRtg * (avgEfficiency / Off_SOS) : 0;
    const Adj_DRtgPlus = 0.2 * (Adj_DRtg - avgEfficiency);

    // Try to incorporate FT fault:
    // Sum per lineup Approx_SF_Poss = PFpct*(Opponent_FTA*0.475)
    //(maybe discard intentional FT spots)
    // Approx_SF_FTM =PFpct*Opponent_FTM
    // then subtract from Opponent_PTS, Opponents_FTM, Opponents_FTA
    // remove Stop_Ind
    // and then add an extra term 100/Team_Poss*(SF_FTM/SF_Poss)

    // If the values have been overridden then calculate the un-overridden values
    const [rawDRtg, rawAdjRating] = overrideAdjusted
      ? RatingUtils.buildDRtg(statSet, avgEfficiency, false, false)
      : [undefined, undefined];

    return [
      Opponent_Possessions_Box > 0 ? { value: DRtg } : undefined,
      Opponent_Possessions_Box > 0 ? { value: Adj_DRtgPlus } : undefined,
      rawDRtg,
      rawAdjRating,
      calcDiags
        ? {
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
            stopsIndPct:
              Opponent_Possessions_Box > 0
                ? Stops_Ind / (0.2 * Opponent_Possessions_Box)
                : 0,
            stopsTeamPct:
              Opponent_Possessions_Box > 0
                ? Stops_Team / (0.2 * Opponent_Possessions_Box)
                : 0,
            // Basic team numbers
            teamBlk: Team_BLK,
            oppoPts: Opponent_PTS,
            oppoPoss: Opponent_Possessions_PbP,
            oppoFga: Opponent_FGA,
            oppoFgm: Opponent_FGM,
            oppoFtm: Opponent_FTM,
            oppoFta: Opponent_FTA,
            oppoFtPoss: Opponent_FTposs,
            oppoTov: Opponent_TOV,
            teamStl: Team_STL,
            teamDrb: Team_DRB,
            opponentOrbPct: Team_DORpct,
            opponentFgPct: DFGpct,
            // Advanced team numbers
            teamOrbCreditToDefender: Credit_To_Shot_Defense,
            teamOrbCreditToRebounder: Credit_To_Rebounder,
            teamDvsRebCredit: FMwt,
            oppoFgMiss: Opponent_FGMiss,
            oppoNonStlTov: Opponent_NonStlTOV,
            teamMissWeight: TeamMissWeight,
            oppoFtPct: Opponent_FTA > 0 ? Opponent_FTM / Opponent_FTA : 0,
            oppoFtHitOnePlus: Opponent_HitFTs * Opponent_FTposs,
            oppoProbFtHitOnePlus: Opponent_HitFTs,
            oppoScPoss: ScPoss,
            oppoPtsPerScore: D_Pts_Per_ScPoss,
            teamRtg: Team_DRtg_PbP,
            // Adjusted calcs:
            dRtg: DRtg,
            offSos: Off_SOS,
            avgEff: avgEfficiency,
            adjDRtg: Adj_DRtg,
            adjDRtgPlus: Adj_DRtgPlus,
          }
        : undefined,
    ];
  }

  // On-Ball defense calcs:

  /** Builds a stat object for all the defensive plays not assigned to a player, copy into the player stats */
  static injectUncatOnBallDefenseStats(
    totalStats: OnBallDefenseModel,
    players: OnBallDefenseModel[],
  ): OnBallDefenseModel[] {
    // Use this to output data beforer mutation and paste into sampleOnBallDefenseStats.ts
    //console.log(JSON.stringify(totalStats, null, 3));
    //console.log(JSON.stringify(players, null, 3));

    const totalSfPlays = totalStats.plays * totalStats.sfPct * 0.01;
    const totalTos = totalStats.plays * totalStats.tovPct * 0.01;

    const uncatOnBallDefense = _.transform(
      players,
      (acc, player) => {
        acc.pts -= player.pts;
        acc.plays -= player.plays;
        acc.uncatPtsPerScPlay -= player.scorePct * player.plays;

        acc.totalSfPlays -= player.plays * player.sfPct * 0.01;
        acc.totalTos -= player.plays * player.tovPct * 0.01;
        acc.totalFgMade -= player.fgMade;
        acc.totalFgMiss -= player.fgMiss;
      },
      {
        ...totalStats,
        totalPlays: totalStats.plays,
        uncatPtsPerScPlay: totalStats.scorePct * totalStats.plays,

        totalSfPlays: totalSfPlays,
        totalTos: totalTos,
        totalFgMade: totalStats.fgMade,
        totalFgMiss: totalStats.fgMiss,
      } as OnBallDefenseModel,
    );

    const uncatPtsPerScPlay =
      (100 * uncatOnBallDefense.pts) /
      (uncatOnBallDefense.uncatPtsPerScPlay || 1);

    players.forEach((player) => {
      player.totalPlays = uncatOnBallDefense.totalPlays;
      player.totalPts = totalStats.pts;
      player.totalScorePct = totalStats.scorePct;
      player.uncatPtsPerScPlay = uncatPtsPerScPlay;
      player.uncatScorePct =
        uncatOnBallDefense.uncatPtsPerScPlay / (uncatOnBallDefense.plays || 1);
      player.uncatPts = uncatOnBallDefense.pts;
      player.uncatPlays = uncatOnBallDefense.plays;

      player.totalSfPlays = totalSfPlays;
      player.totalTos = totalTos;
      player.totalFgMade = totalStats.fgMade;
      player.totalFgMiss = totalStats.fgMiss;
      player.uncatSfPlays = uncatOnBallDefense.totalSfPlays;
      player.uncatTos = uncatOnBallDefense.totalTos;
      player.uncatFgMade = uncatOnBallDefense.totalFgMade;
      player.uncatFgMiss = uncatOnBallDefense.totalFgMiss;
    });

    return players;
  }

  /** Adjusts the defensive stats according to the individual stats (phase 2 takes the team into account)*/
  static buildOnBallDefenseAdjustmentsPhase1(
    player: IndivStatSet,
    diags: DRtgDiagnostics,
    onBallStats: OnBallDefenseModel,
  ): OnBallDefenseDiags {
    const showConsoleDiag = false;

    // The basic idea is:
    // We break down Pts, FG made, FG miss (adjusted for credit), TO%, SF%, Def Reb (adjusted for credit) for:
    // Team, On Ball (from Synergy), Off Ball (Team-OnBall), Uncat (total-sum_players from Synergy)
    // We then weight on-ball and off-ball together
    // That leaves an almost always delta vs (team plays)/5, which we (arbitrarily) "fill in" with uncategorized plays

    // Team calcs

    const sampleTeamDefPoss = player.oppo_total_def_poss?.value || 0;
    const teamFgMadeAgainst = diags.oppoFgm;
    const teamFgMissAgainst = diags.oppoFga - diags.oppoFgm;
    const teamAdjFgMissAgainst = diags.teamDvsRebCredit * teamFgMissAgainst;
    const teamDefTo = diags.oppoTov;
    const teamPts = diags.oppoPts;
    const defEfficiency = teamPts / (sampleTeamDefPoss || 1);

    const teamOrbAllowed = player.oppo_total_def_orb?.value || 0;
    const teamAdjReb = (1 - diags.teamDvsRebCredit) * teamFgMissAgainst;
    //(note you get DRBs off missed 2nd FTs etc, so FGx != ORB + DRB - that will sort itself out in the phase 2 adjustment)

    //(What we want is sum(players)(RebCredit*DRBs - x) ==  teamAdjReb - teamOrbAllowed)
    // AvRebCredit*(DRBs=FGx - ORBs) - 5x = teamAdjReb - ORBs => teamAdjReb - AvRebCredit*ORBs - 5x = teamAdjReb - ORBs
    // x = 0.2*(1 - AvRebCredit)*ORBs = 0.2*(1 - AvRebCredit)*ORBs
    // So we'll need an adjustment of -0.2*teamDvsRebCredit*ORBs per player.
    const orbAdjustment = 0.2 * diags.teamDvsRebCredit * teamOrbAllowed; //TODO: in the future this could depend on position?

    //TODO: is teamDvsRebCredit really correct, or should I be using TeamMissWeight?
    // (somehow ... unclear how you model the chance of your opponent scoring?)
    // ...
    // Some handy numbers to think about (Maryland 21/22)
    // Team = 0.877 fgMiss%=0.457 def_orb=26.3% 101.6%...
    // Eff PPP = 0.877 + 0.457*0.264*1.016 = 0.999 (which is approx what I get ... _except_ ...)
    // actually Eff PPP is just the def eff = 101.6 (would require a 1.2 bonus on plays coming off ORBs
    // based on scramble numbers seems closer to 0.5*110)
    // (DRtg has a 7% bonus for shots off ORB, which seems about right based on the above)

    // const teamFtaPossEstimateDiagOnly = diags.oppoFtPoss; //(use teamFtaPossCalc to get the possessions closer to team numbers)
    const teamFtaPossCalc =
      sampleTeamDefPoss - diags.oppoFga - teamDefTo + teamOrbAllowed;

    const teamDefPoss =
      teamFgMadeAgainst +
      teamAdjFgMissAgainst +
      teamAdjReb +
      teamDefTo +
      teamFtaPossCalc -
      teamOrbAllowed;
    const teamDefPlays = teamDefPoss + teamOrbAllowed;
    const normalizedPlayerNonRebPoss =
      0.2 *
      (teamFgMadeAgainst + teamAdjFgMissAgainst + teamDefTo + teamFtaPossCalc);

    // Represents (approx) how much of the Hoop Explorer sample is present in Synergy
    const approxOnBallPlaysWhileOnFloor =
      (player.def_team_poss_pct?.value || 0) * onBallStats.totalPlays;
    const completeness = Math.min(
      1.0,
      approxOnBallPlaysWhileOnFloor / (teamDefPlays || 1),
    );
    // For weighting classic DRtg vs adjusted DRtg on incomplete samples, we weight up the on-ball stats
    // since it is somewhat predictive in nature
    const weightedCompleteness = Math.min(
      1.0,
      (2.0 * approxOnBallPlaysWhileOnFloor) /
        (teamDefPlays + approxOnBallPlaysWhileOnFloor || 1),
    );

    // Diags:
    if (showConsoleDiag) {
      console.log(
        `PLAYER ${player.key}: TEAM: poss=${sampleTeamDefPoss.toFixed(
          1,
        )} plays=${teamDefPlays.toFixed(
          1,
        )} on_ball_plays=${approxOnBallPlaysWhileOnFloor.toFixed(
          1,
        )} completeness=${(completeness * 100).toFixed(
          1,
        )} NORM_NON_REB ${normalizedPlayerNonRebPoss.toFixed(1)}`,
      );
      console.log(
        `TEAM: [${teamPts.toFixed(1)} / ${teamDefPoss.toFixed(
          1,
        )}] = (${teamFgMadeAgainst.toFixed(1)}+${teamAdjFgMissAgainst.toFixed(
          1,
        )}+${teamAdjReb.toFixed(1)}) ` +
          ` + ${teamDefTo.toFixed(1)} + ${teamFtaPossCalc.toFixed(
            1,
          )} - ${teamOrbAllowed.toFixed(1)} (${diags.teamDvsRebCredit.toFixed(
            1,
          )}, ${(teamFtaPossCalc / (diags.oppoFta || 1)).toFixed(1)})`,
      );
    }

    // Player on-ball calcs

    const targetedPct =
      onBallStats.plays /
      (onBallStats.totalPlays || 1) /
      (player.def_team_poss_pct?.value || 1);
    const onBallPlays = targetedPct * completeness * teamDefPlays;
    const onBallPts =
      (onBallPlays * onBallStats.pts) / (onBallStats.plays || 1);

    const onBallAdjFgMiss =
      diags.teamDvsRebCredit *
      (onBallStats.fgMiss / (onBallStats.plays || 1)) *
      onBallPlays;
    const onBallFgMade =
      (onBallStats.fgMade / (onBallStats.plays || 1)) * onBallPlays;

    const onBallFtPoss = 0.01 * onBallStats.sfPct * onBallPlays;
    const onBallTo = 0.01 * onBallStats.tovPct * onBallPlays;
    const onBallAdjPlays =
      onBallAdjFgMiss + onBallFgMade + onBallFtPoss + onBallTo;

    // Diags:
    if (showConsoleDiag) {
      console.log(
        `ON-BALL [${onBallPts.toFixed(1)} / ${onBallAdjPlays.toFixed(
          1,
        )}]: AdjFGMiss=${onBallAdjFgMiss.toFixed(
          1,
        )} + FGMade=${onBallFgMade.toFixed(1)}` +
          ` + SF=${onBallFtPoss.toFixed(1)} [${onBallStats.sfPct.toFixed(
            1,
          )}%] + TO=${onBallTo.toFixed(1)} [${onBallStats.tovPct.toFixed(
            1,
          )}%] ` +
          `(PLAYS=${onBallPlays.toFixed(1)} [${(targetedPct * 100).toFixed(
            1,
          )}%] vs [${onBallStats.plays}])`,
      );
    }

    //(for diags, calculate the effective on-ball PPP, ie taking into account offensive rebounding)

    const fgMissPct = onBallStats.fgMiss / (onBallStats.plays || 1);
    const effectivePpp =
      onBallStats.pts / (onBallStats.plays || 1) +
      fgMissPct *
        (teamOrbAllowed / (teamFgMissAgainst || 1)) *
        defEfficiency *
        RatingUtils.retainPossWithReboundRate;
    //TODO: note in practice effectivePpp is higher, because ~35% of the time it's a put-back at ~1.2ppp

    // Off-ball

    // The underlying math is (see onBallWeight below):
    // pts = 60%*on-ball + 10%*(team - on-ball), team=(sum(on-ball) + uncat)
    // sum(pts) = 50%*sum(on-ball) + 50%*sum(on-ball) + 50%*uncat = sum(on-ball) + 50%*uncat(=320)
    // so the assumption is that the remaining 50% of the uncat is attributed as delta from (def_usage-20)
    // (where def_usage does not include rebounds) - in practice this falls short by a few % (50 on 650 uncat pts), which is tidied up by injectOnBallDefenseAdjustmentsPhase2

    // Shortfall could be caused by: Incorrect term somewhere, Team rebounds?
    // (possessions seemed to be closer to correct)
    // (would expect an error due to team rebounds, sum(0.2*player + 0.8*(0.2*team))=0.2*sum(player)+0.8*team = 0.2*(team-team_drb)+0.8*team = team-team_drb)
    // This will sort itself out in the phase 2 adjustment

    const offBallPts = Math.max(0, completeness * teamPts - onBallPts);
    const offBallAdjFgMiss = Math.max(
      0,
      completeness * teamAdjFgMissAgainst - onBallAdjFgMiss,
    );
    const offBallFgMade = Math.max(
      0,
      completeness * teamFgMadeAgainst - onBallFgMade,
    );
    const offBallFtPoss = Math.max(
      0,
      completeness * teamFtaPossCalc - onBallFtPoss,
    );
    const offBallTo = Math.max(0, completeness * teamDefTo - onBallTo);
    const offBallAdjPlays =
      offBallAdjFgMiss + offBallFgMade + offBallFtPoss + offBallTo;

    // Diags:
    if (showConsoleDiag) {
      console.log(
        `OFF-BALL [${offBallPts.toFixed(1)} / ${offBallAdjPlays.toFixed(
          1,
        )}]: AdjFGMiss=${offBallAdjFgMiss.toFixed(
          1,
        )} + FGMade=${offBallFgMade.toFixed(1)}` +
          ` + SF=${offBallFtPoss.toFixed(1)} + TO=${offBallTo.toFixed(1)}`,
      );
    }

    // Uncategorized plays pro-rated - we'll use these to normalize every to 20% usage equivalent
    // so we can just weighted sum DRtg+poss% together and get something close to the team DRtg

    const uncatTargetedPct =
      onBallStats.uncatPlays /
      (onBallStats.totalPlays || 1) /
      (player.def_team_poss_pct?.value || 1);
    const uncatPlays = uncatTargetedPct * completeness * teamDefPlays;
    const uncatPts =
      (uncatPlays * onBallStats.uncatPts) / (onBallStats.uncatPlays || 1);

    const uncatAdjFgMiss =
      diags.teamDvsRebCredit *
      (onBallStats.uncatFgMiss / (onBallStats.uncatPlays || 1)) *
      uncatPlays;
    const uncatFgMade =
      (onBallStats.uncatFgMade / (onBallStats.uncatPlays || 1)) * uncatPlays;
    const uncatFtPoss =
      (onBallStats.uncatSfPlays / (onBallStats.uncatPlays || 1)) * uncatPlays;
    const uncatTo =
      (onBallStats.uncatTos / (onBallStats.uncatPlays || 1)) * uncatPlays;
    const uncatAdjPlays = uncatAdjFgMiss + uncatFgMade + uncatFtPoss + uncatTo;

    // Diags:
    if (showConsoleDiag) {
      console.log(
        `UNCAT [${uncatPts.toFixed(1)} / ${uncatAdjPlays.toFixed(
          1,
        )}]: AdjFGMiss=${uncatAdjFgMiss.toFixed(
          1,
        )} + FGMade=${uncatFgMade.toFixed(1)}` +
          ` + SF=${uncatFtPoss.toFixed(1)} + TO=${uncatTo.toFixed(1)} ` +
          `(PLAYS=${uncatPlays.toFixed(1)} [${(uncatTargetedPct * 100).toFixed(
            1,
          )}%] vs [${onBallStats.uncatPlays}])`,
      );
    }

    // Now we can estimate the actual "defensive targeted%"
    const onBallWeight = 0.6;
    const offBallWeight = (1 - onBallWeight) * 0.25; //(ie uniformly distributed across the other players)

    const totalCatAdjPlays =
      onBallWeight * onBallAdjPlays + offBallWeight * offBallAdjPlays;
    const deltaPlays = normalizedPlayerNonRebPoss - totalCatAdjPlays;

    // Diags:
    if (showConsoleDiag) {
      console.log(
        `COMBO: ${totalCatAdjPlays.toFixed(1)} [delta: ${deltaPlays.toFixed(
          1,
        )}]`,
      );
    }

    // Some more rebounds calcs

    // Regress the actual rebounding credit with 20% of the team rebounding credit - more or less
    // duplicating how the credit is regressed in the DRtg calc
    // sum(calc) = 0.2*sum(player reb credit) + 0.8*team_credit
    //           = team_credit - nobody_reb_credit (this might actually be quite significant, but should get sorted out in phase 2)
    const playerVsTeamRebWeight = 0.2;
    const rebsOffFts = Math.max(
      0,
      diags.teamDrb + teamOrbAllowed - teamFgMissAgainst,
    );
    //(we're only interesting in matching FGx, so we subtract the number of rebounded FTx ...
    // note this somewhat overvalues frontcourt players' rebounds - because many of them are off Ftx,
    // but the classic DRtg does the same thing. It offsets with the team rebound error term!)
    const calcRegressedDrbCredit = (drbCredit: number) => {
      return (
        playerVsTeamRebWeight * drbCredit +
        (1 - playerVsTeamRebWeight) *
          0.2 *
          (diags.teamDrb - rebsOffFts) *
          (1 - diags.teamDvsRebCredit)
      );
    };

    // Now finally we can calculate a DRtg

    const deltaPts = (deltaPlays / (uncatPlays || 1)) * uncatPts;
    const weightedPts =
      onBallWeight * onBallPts + offBallWeight * offBallPts + deltaPts;
    const adjDefRebPoss = calcRegressedDrbCredit(diags.reboundCredit);
    const zeroRebPoss = calcRegressedDrbCredit(0);
    const drbVsOrbAdjustment = adjDefRebPoss - orbAdjustment;
    const unadjSampleDRtg =
      (100 * weightedPts) /
      (normalizedPlayerNonRebPoss + drbVsOrbAdjustment || 1);

    // If the on-ball sample is incomplete then mix-in a good amount of the original DRtg
    const unadjDRtg =
      weightedCompleteness * unadjSampleDRtg +
      (1.0 - weightedCompleteness) * diags.dRtg;

    // Some other DRtgs for display purposes:
    // w1*Plays1 + w2*Plays2 + delta == normalizedPlayerNonRebPoss
    // w1*(Plays1 + delta/(w1+w2)) + w2*(Plays2 + delta/(w1+w2)) == normalizedPlayerNonRebPoss ("N")
    // so eg OnBall = w1*Pts1/(w1*X + w1*(X/N)*DRB_ORB), where X=(Plays1 + delta/(w1+w2)), can get rid of the w1
    const deltaDividedUp = deltaPlays / (onBallWeight + offBallWeight);
    const deltaPtsDividedUp = deltaPts / (onBallWeight + offBallWeight);
    const onBallRebPoss =
      (drbVsOrbAdjustment * (onBallAdjPlays + deltaDividedUp)) /
      normalizedPlayerNonRebPoss;
    const onBallDRtg =
      (100 * (onBallPts + deltaPtsDividedUp)) /
      (onBallAdjPlays + deltaDividedUp + onBallRebPoss);
    const offBallRebPoss =
      (drbVsOrbAdjustment * (offBallAdjPlays + deltaDividedUp)) /
      normalizedPlayerNonRebPoss;
    const offBallDRtg =
      (100 * (offBallPts + deltaPtsDividedUp)) /
      (offBallAdjPlays + deltaDividedUp + offBallRebPoss);
    const reboundDRtgBonus =
      unadjSampleDRtg -
      (100 * weightedPts) /
        (normalizedPlayerNonRebPoss + zeroRebPoss - orbAdjustment || 1);

    // Diags:
    if (showConsoleDiag) {
      console.log(
        `Sample DRtg [${unadjSampleDRtg.toFixed(1)}] = ${weightedPts.toFixed(
          1,
        )}/(${normalizedPlayerNonRebPoss.toFixed(1)} + ${adjDefRebPoss.toFixed(
          1,
        )} - ${orbAdjustment.toFixed(1)})`,
      );
      console.log(
        `DRtg [${unadjDRtg.toFixed(1)}] = ${weightedCompleteness.toFixed(
          2,
        )}*${unadjSampleDRtg.toFixed(1)} + ${(1 - weightedCompleteness).toFixed(
          2,
        )}*${diags.dRtg.toFixed(1)}`,
      );
    }

    // Calculate these in phase 2:

    const weightedClassicDRtgMean = 0;
    const weightedUnadjDRtgMean = 0;
    const uncategorizedAdjustment = 0;
    const adjustedPossPct = 0;
    const dRtg = 0;
    const adjDRtg = 0;
    const adjDRtgPlus = 0;

    const includeDiags = false;
    const diagInfo = includeDiags
      ? {
          weightedPts,
          deltaPlays,
          normalizedPlayerNonRebPoss,
          adjDefRebPoss,
          orbAdjustment,
          drbDelta: adjDefRebPoss - orbAdjustment,
        }
      : undefined;

    return {
      targetedPct,
      effectivePpp,

      onBallDRtg,
      offBallDRtg,
      reboundDRtgBonus,

      unadjDRtg,
      diagInfo,

      weightedClassicDRtgMean,
      weightedUnadjDRtgMean,
      uncategorizedAdjustment,
      adjustedPossPct,

      dRtg,
      adjDRtg,
      adjDRtgPlus,
    };
  }

  /** (MUTATES) Adjusts the defensive stats according to the aggregated individual stats (phase 2 takes the team into account) */
  static injectOnBallDefenseAdjustmentsPhase2(
    players: IndivStatSet[],
    team: PureStatSet,
  ) {
    const showConsoleDiag = false;

    // Calc the % of possessions over which I'm calculating the weighted means
    const adjustedPossPct =
      0.2 *
      _.reduce(
        players,
        (acc, stat) => {
          const onBallDiags = stat.diag_def_rtg?.onBallDiags;
          if (onBallDiags) {
            return acc + (stat.def_team_poss_pct?.value || 0);
          } else {
            return acc;
          }
        },
        0,
      );

    //(START CONSOLE DISPLAY/DIAGS)
    if (showConsoleDiag) {
      const totalPoss = team.def_poss?.value || 1;
      const avgDvsRebCredit =
        0.2 *
        _.reduce(
          players,
          (acc, stat) => {
            const diags = stat.diag_def_rtg;
            return diags
              ? acc + (diags.teamDvsRebCredit * diags.oppoPoss) / totalPoss
              : acc;
          },
          0,
        );

      // Calculate the team stats
      const sampleTeamDefPoss = totalPoss;
      const teamFgMadeAgainst = team.total_def_fgm?.value || 0;
      const teamFgMissAgainst =
        (team.total_def_fga?.value || 0) - teamFgMadeAgainst;
      const teamAdjFgMissAgainst = avgDvsRebCredit * teamFgMissAgainst;
      const teamDefTo = team.total_def_to?.value || 0;
      const teamPts = team.total_def_pts?.value || 0;
      const teamOrbAllowed = team.total_def_orb?.value || 0;
      const teamDrb = team.total_off_drb?.value || 0; //note that FGx != TeamDrb + teamOrbAllowed because of missed FTs
      const teamAdjReb = (1 - avgDvsRebCredit) * teamFgMissAgainst;
      const teamFtaPossCalc =
        sampleTeamDefPoss -
        (team.total_def_fga?.value || 0) -
        teamDefTo +
        teamOrbAllowed;
      const teamDefPoss =
        teamFgMadeAgainst +
        teamAdjFgMissAgainst +
        teamAdjReb +
        teamDefTo +
        teamFtaPossCalc -
        teamOrbAllowed;
      const playerNonRebPoss =
        teamFgMadeAgainst + teamAdjFgMissAgainst + teamDefTo + teamFtaPossCalc;

      console.log(
        `TEAM: [${teamPts.toFixed(1)} / ${teamDefPoss.toFixed(
          1,
        )}] = (${teamFgMadeAgainst.toFixed(1)}+${teamAdjFgMissAgainst.toFixed(
          1,
        )}+${teamAdjReb.toFixed(1)} [drb=${team.total_off_drb?.value}]) ` +
          ` + ${teamDefTo.toFixed(1)} + ${teamFtaPossCalc.toFixed(
            1,
          )} - ${teamOrbAllowed.toFixed(1)} (${avgDvsRebCredit.toFixed(2)}, ${(
            teamFtaPossCalc / (team.total_def_fta?.value || 1)
          ).toFixed(2)})`,
      );
    }
    //(END CONSOLE DISPLAY/DIAGS)

    const weightedClassicDRtgMean =
      (0.2 *
        _.reduce(
          players,
          (acc, stat) => {
            //(use poss% because classic DRtg is fixed% per player possession, no concept of targeting)
            // Only calculate it for players with adjusted ratings
            const onBallDiags = stat.diag_def_rtg?.onBallDiags;
            if (onBallDiags) {
              return (
                acc +
                (stat.diag_def_rtg?.dRtg || 0) *
                  (stat.def_team_poss_pct?.value || 0)
              );
            } else {
              return acc;
            }
          },
          0,
        )) /
      (adjustedPossPct || 1);

    const weightedUnadjDRtgMean =
      (0.2 *
        _.reduce(
          players,
          (acc, stat) => {
            const onBallDiags = stat.diag_def_rtg?.onBallDiags;
            if (onBallDiags) {
              //actually this should be based partially on target% and partially just on poss%
              return (
                acc +
                (onBallDiags.unadjDRtg || 0) *
                  (stat.def_team_poss_pct?.value || 0)
              );
            } else {
              return acc;
            }
          },
          0,
        )) /
      (adjustedPossPct || 1);

    const uncategorizedAdjustment =
      adjustedPossPct * (weightedClassicDRtgMean - weightedUnadjDRtgMean);

    _.forEach(players, (stat) => {
      const diag = stat.diag_def_rtg;
      const onBallDef = diag?.onBallDef;
      const onBallDiags = diag?.onBallDiags;
      if (diag && onBallDef && onBallDiags) {
        // (Add some working results to diag:)
        onBallDiags.weightedClassicDRtgMean = weightedClassicDRtgMean;
        onBallDiags.weightedUnadjDRtgMean = weightedUnadjDRtgMean;
        onBallDiags.uncategorizedAdjustment = uncategorizedAdjustment;
        onBallDiags.adjustedPossPct = adjustedPossPct;

        // Apply calcs that required all players' ratings:

        // Assign each player uncategorized events in even split (ensures DRtg stays ~ the same, it's just shared out evenly)

        onBallDiags.dRtg = onBallDiags.unadjDRtg + uncategorizedAdjustment;

        //DEBUG
        if (showConsoleDiag) {
          console.log(
            stat.key +
              ": " +
              JSON.stringify({
                unadjDRtg: onBallDiags.unadjDRtg.toFixed(1),
                finalDRtg: onBallDiags.dRtg.toFixed(1),
                weightedClassicDRtgMean: weightedClassicDRtgMean.toFixed(1),
                weightedUnadjDRtgMean: weightedUnadjDRtgMean.toFixed(1),
                uncategorizedAdjustment: uncategorizedAdjustment.toFixed(1),
                adjustedPossPct: adjustedPossPct.toFixed(1),
              }),
          );
        }

        // Apply the result to the player stats:

        onBallDiags.onBallDRtg =
          onBallDiags.onBallDRtg + uncategorizedAdjustment;
        onBallDiags.offBallDRtg =
          onBallDiags.offBallDRtg + uncategorizedAdjustment;

        const Adj_DRtg =
          diag.offSos > 0 ? onBallDiags.dRtg * (diag.avgEff / diag.offSos) : 0;
        const Adj_DRtgPlus = 0.2 * (Adj_DRtg - diag.avgEff);
        onBallDiags.adjDRtg = Adj_DRtg;
        onBallDiags.adjDRtgPlus = Adj_DRtgPlus;

        const pctOfTotalPlays =
          (100 * onBallDef.plays) / (onBallDef.totalPlays || 1);
        if (pctOfTotalPlays >= 0.25) {
          // (don't adjust if there are too few possessions, empirically 0.25% seems like a good number)
          if (stat.def_rtg) {
            stat.def_rtg.value = onBallDiags.dRtg;
            stat.def_rtg.extraInfo = `Using on-ball defense stats - classic value would be [${diag.dRtg.toFixed(
              1,
            )}]`;
          }
          if (stat.def_adj_rtg) {
            stat.def_adj_rtg.value = Adj_DRtgPlus;
            stat.def_adj_rtg.extraInfo = `Using on-ball defense stats - classic value would be [${diag.adjDRtgPlus.toFixed(
              1,
            )}]`;
          }
          if (stat.def_adj_prod) {
            stat.def_adj_prod.value =
              Adj_DRtgPlus * (stat.def_team_poss_pct.value || 0);

            const defAdjProd =
              diag.adjDRtgPlus * (stat.def_team_poss_pct.value || 0);
            stat.def_adj_prod.extraInfo = `Using on-ball defense stats - classic value would be [${defAdjProd.toFixed(
              1,
            )}]`;
          }
          if (!_.isNil((stat as PureStatSet).def_adj_rapm?.value)) {
            (stat as PureStatSet).def_adj_rapm.extraInfo =
              `Using on-ball defense - unknown adjustment (see Adj+ Rtg for estimate)`;
          }
          if (!_.isNil((stat as PureStatSet).def_adj_rapm_prod?.value)) {
            (stat as PureStatSet).def_adj_rapm_prod.extraInfo =
              `Using on-ball defense - unknown adjustment (see Adj+ Prod for estimate)`;
          }
        }
      }
    });
  }

  /** Calculates the approx new ORtg due to an increase/decreate in usage */
  static adjustORtgForUsageDelta(
    ortg: number,
    usagePct: number,
    usageDeltaPct: number,
  ) {
    //Based on
    //    const Usage_Bonus = usage > 20 ? ((usage - 20) * 1.25) :  ((usage - 20) * 1.5);
    const usage = 100 * usagePct;
    const usageDelta = 100 * usageDeltaPct;
    if (usage >= 20 && usageDelta > 0) {
      return ortg - 1.25 * usageDelta;
    } else if (usage < 20 && usageDelta < 0) {
      return ortg - 1.5 * usageDelta;
    } else if (usage < 20) {
      //(usageDelta > 0)
      const part1 = Math.min(20 - usage, usageDelta);
      const part2 = Math.max(0, usageDelta - part1);
      return ortg - 1.5 * part1 - 1.25 * part2;
    } else {
      // usage >= 20, usageDelta < 0
      const part1 = Math.min(usage - 20, Math.abs(usageDelta));
      const part2 = Math.max(0, Math.abs(usageDelta) - part1);
      return ortg + 1.25 * part1 + 1.5 * part2;
    }
  }
}
