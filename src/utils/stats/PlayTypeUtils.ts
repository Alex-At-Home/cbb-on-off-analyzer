// Utils:
import _ from "lodash";
import {
  PureStatSet,
  PlayerCode,
  IndivStatSet,
  TeamStatSet,
  Statistic,
  RosterStatsByCode,
} from "../StatModels";
import { LuckUtils } from "./LuckUtils";

export type PosFamily = "ballhandler" | "wing" | "big";
export const PosFamilyNames: PosFamily[] = ["ballhandler", "wing", "big"];

export type SourceAssistInfo = {
  order: number;
  source_sf: Statistic;
  source_to: Statistic;
  source_3p_ast: Statistic;
  source_mid_ast: Statistic;
  source_rim_ast: Statistic;
  target_ast: Statistic;
};
export type TargetAssistInfo = SourceAssistInfo & {
  target_3p_ast: Statistic;
  target_3p_efg: Statistic;
  target_mid_ast: Statistic;
  target_mid_efg: Statistic;
  target_rim_ast: Statistic;
  target_rim_efg: Statistic;
  code?: PlayerCode;
};
type ScoredTargetAssistInfo = {
  info?: TargetAssistInfo;
  title?: string;
  order: number; //(duplicate of info.order)
  score: number;
};
const asStatSet = (
  inStatSet: ScoredTargetAssistInfo | undefined
): Record<string, Statistic> =>
  (inStatSet?.info || {}) as unknown as Record<string, Statistic>;

/** Data for a given player broken down */
export type PlayerStyleInfo = {
  unassisted: SourceAssistInfo;
  assisted: SourceAssistInfo;
  scramble: SourceAssistInfo; //(totals, asssisted + unassisted)
  transition: SourceAssistInfo; //(totals, asssisted + unassisted)
  scrambleAssisted: SourceAssistInfo;
  transitionAssisted: SourceAssistInfo;
  totalPlaysMade: number;
  totalAssists: number;
  assistedMissAdjustments?: Record<string, number>; //(for each shot type, misses that we estimate would have been estimated)
};

const asPlayerStyleSet = (
  inPlayerStyleInfo: PlayerStyleInfo
): Record<string, SourceAssistInfo> =>
  inPlayerStyleInfo as unknown as Record<string, SourceAssistInfo>;

type PosCategoryAssistNetwork = {
  posCategoryAssistNetwork: ScoredTargetAssistInfo[];
  playerStyle: PlayerStyleInfo;
};
export type CategorizedAssistNetwork = {
  posInfo?: Record<PlayerCode, number>; //lists the player weights used in the categorization
  assists: TargetAssistInfo[];
  other: TargetAssistInfo[]; //(unassisted info but in the "assist" model format)
};

const targetSource = ["source", "target"];
const shotTypes = ["3p", "mid", "rim"];
const shotNameMap = { "3p": "3P", mid: "Mid", rim: "Rim" } as Record<
  string,
  string
>;
const shotMap = { "3p": "3p", rim: "2prim", mid: "2pmid" } as Record<
  string,
  string
>;

type PlayStyleType = "scoringPlaysPct" | "pointsPer100" | "playsPct";

export type TopLevelPlayType =
  | "Rim Attack"
  | "Attack & Kick"
  | "Dribble Jumper"
  | "Mid-Range"
  | "Backdoor Cut"
  | "Big Cut & Roll"
  | "Post-Up"
  | "Post & Kick"
  | "Pick & Pop"
  | "High-Low"
  | "Put-Back"
  | "Transition"
  | "Misc";
//(currently "Misc" is just team turnovers, used to get the sum back to 100%)

export type TopLevelIndivPlayType =
  | TopLevelPlayType
  | "Perimeter Sniper"
  | "Perimeter Sniper (Post-Up)"
  | "Perimeter Sniper (Rim Attack)"
  | "Hits Cutter"
  | "PnR Passer"
  | "PnR Passer (Pick & Pop)"
  | "PnR Passer (Big Cut & Roll)";

export type PlayTypeStat = {
  possPct: Statistic;
  pts: Statistic;
  adj_pts?: Statistic;
  possPctUsg?: Statistic;
};

export type TopLevelPlayAnalysis = Record<TopLevelPlayType, PlayTypeStat>;

export type TopLevelIndivPlayAnalysis = Record<
  TopLevelIndivPlayType,
  PlayTypeStat
>;

export type IndivPlayTypeInfo = {
  code: PlayerCode;
  player: IndivStatSet;
  teamPlayType: TopLevelPlayType;
  playType: TopLevelIndivPlayType;
  playStats: PlayTypeStat;
};

/** Utilities for guessing different play types based on box scorer info */
export class PlayTypeUtils {
  /** We don't cat the extra types to topLevelPlayTypes because we want this order */
  static topLevelIndivPlayTypes: TopLevelIndivPlayType[] = [
    "Rim Attack",
    "Attack & Kick",
    "Perimeter Sniper",
    "Dribble Jumper",
    "Mid-Range",
    "Hits Cutter",
    "Backdoor Cut",
    "PnR Passer",
    "Big Cut & Roll",
    "Post-Up",
    "Post & Kick",
    "Pick & Pop",
    "High-Low",
    "Put-Back",
    "Transition",
  ]; //(no Misc - we don't render)

  static extendedTopLevelIndivPlayTypes: TopLevelIndivPlayType[] = [
    "Rim Attack",
    "Attack & Kick",
    "Perimeter Sniper",
    "Perimeter Sniper (Post-Up)",
    "Perimeter Sniper (Rim Attack)",
    "Dribble Jumper",
    "Mid-Range",
    "Hits Cutter",
    "Backdoor Cut",
    "PnR Passer",
    "PnR Passer (Pick & Pop)",
    "PnR Passer (Big Cut & Roll)",
    "Big Cut & Roll",
    "Post-Up",
    "Post & Kick",
    "Pick & Pop",
    "High-Low",
    "Put-Back",
    "Transition",
  ]; //(no Misc - we don't render)

  /** Subset of TopLevelIndivPlayType */
  static topLevelPlayTypes: TopLevelPlayType[] = [
    "Rim Attack",
    "Attack & Kick",
    "Dribble Jumper",
    "Mid-Range",
    "Backdoor Cut",
    "Big Cut & Roll",
    "Post-Up",
    "Post & Kick",
    "Pick & Pop",
    "High-Low",
    "Put-Back",
    "Transition",
  ]; //(no Misc - we don't render)

  /** Gives % of ball-handler /  wing / big vs position name */
  private static posToFamilyScore = {
    PG: [1.0, 0, 0],
    "s-PG": [1.0, 0, 0],
    CG: [0.8, 0.2, 0],
    WG: [0.2, 0.8, 0],
    WF: [0, 0.8, 0.2],
    "S-PF": [0, 0.4, 0.6], //TODO: would be good here to use the actual frequency played (posFreqs)
    "PF/C": [0, 0.2, 0.8],
    C: [0, 0, 1.0],
    "G?": [0.75, 0.25, 0],
    "F/C?": [0, 0.5, 0.5],
    "??": [0.3, 0.4, 0.3],
  } as Record<string, [number, number, number]>;

  /** (currently unused, search for usage for more details) */
  private static posConfidenceToFamilyScore = [
    [1.0, 0.66, 0.15, 0.0, 0.0], // ballhandler
    [0.0, 0.34, 0.85, 0.66, 0.0], // wing
    [0.0, 0.0, 0.0, 0.34, 1.0], // big
  ];

  /** Depending on the code path the indiv stat set has taken to get here, code may or may not be present, so we'll reconstruct it */
  private static getCode = (pl: IndivStatSet): PlayerCode =>
    pl.code ||
    pl.player_array?.hits?.hits?.[0]?._source?.player?.code ||
    pl.key ||
    "??";

  //////////////////////////////////////////////////////////////

  // Top Level Logic

  /** Builds per-player assist networks and then groups players into weighted categories and re-aggregates the assist networks
   * separateHalfCourt - if true will try to separate out half-court vs transition/scramble better
   * NOTE: this isn't really self contained yet because the logic to (very approximately) pull the scramble/transition
   * assist info out of the assist networks is in buildTopLevelPlayStyles
   * useTeamPossessions - when calculating player play styles to see the player chart, we want to look at just that player's possessions
   *                      when doing a breakdown across players of team play styles, we want to use the team possessions
   * playerBreakdownMode - (this is probably == isActuallyIndivMode) ... it switches "target" %s to use player or team possessions
   *                       instead of assists (which only makes sense for player scoring breakdown), I made it a separate flag
   *                       just to make extra sure I didn't break any existing logic, but I'm pretty sure it's just
   *                       isActuallyIndivMode && (playStyleType == playsPct|pctsPer100)
   */
  static buildCategorizedAssistNetworks(
    playStyleType: PlayStyleType,
    separateHalfCourt: boolean,
    players: Array<IndivStatSet>,
    rosterStatsByCode: RosterStatsByCode,
    teamStats: TeamStatSet,
    useTeamPossessions: boolean = false,
    playerBreakdownMode: boolean = false
  ): Record<string, CategorizedAssistNetwork> {
    //(^ the key is "bh", "wing", "big")
    const isActuallyIndivMode = players.length == 1;

    //(use pure possessions and not + assists because the team is "closed" unlike one player)
    const teamPossessions =
      isActuallyIndivMode && !useTeamPossessions
        ? undefined
        : (teamStats.total_off_fga?.value || 0) +
          0.475 * (teamStats.total_off_fta?.value || 0) +
          (teamStats.total_off_to?.value || 0);

    const teamScoringPossessions =
      isActuallyIndivMode && !useTeamPossessions
        ? undefined
        : (teamStats.total_off_fgm?.value || 0) +
          0.475 * (teamStats.total_off_fta?.value || 0);
    //(use pure scoring possessions and not + assists because the team is "closed" unlike one player)

    // if (players.length > 1)
    //   console.log(`${players.map((p) => `"${p.code}"`).join(",")}`);
    //const filterCodes = new Set(["XXX"]);
    const filterCodes = undefined as Set<string> | undefined; //new Set(["JaGillespie", "SeMiguel", "RoRice"]);
    const filteredPlayers = filterCodes
      ? players.filter((pl) => {
          const code = PlayTypeUtils.getCode(pl);
          return filterCodes.has(code);
        })
      : players;

    const teamPossessionsToUse =
      playStyleType == "scoringPlaysPct"
        ? teamScoringPossessions
        : teamPossessions;
    const posCategoryAssistNetworkVsPlayer: Record<
      PlayerCode,
      PosCategoryAssistNetwork
    > = PlayTypeUtils.buildPerPlayerPositionalBreakdown(
      playStyleType,
      separateHalfCourt,
      filteredPlayers,
      rosterStatsByCode,
      teamStats,
      teamPossessionsToUse
    );

    // This gets us to:
    // [1] (player)[ { [pos]: <shot-type-stats> } ]   (pos=bh|wing|big)
    // The next method transforms that to give us a pos vs pos -> <shot-type-stats> as desired!

    const reorderedPosVsPosAssistNetwork: Record<
      string,
      CategorizedAssistNetwork
    > = PlayTypeUtils.convertFromPlayerToPositionPositionalBreakdown(
      posCategoryAssistNetworkVsPlayer,
      rosterStatsByCode
    );

    // Finally we do some post processing on the pos-pos assist chart to take into account:
    // - separating out half court and scramble/transition assists
    // - TOs

    if (separateHalfCourt) {
      _.chain(reorderedPosVsPosAssistNetwork)
        .toPairs()
        .forEach((kv, ix) => {
          // Some mutation that is needed
          const assistInfo = kv[1].assists;
          const otherInfo = kv[1].other;
          //(unassisted, assisted <- DROP, transition, scramble)
          const assistedTransitionInfo = otherInfo[4];
          const assistedScrambleInfo = otherInfo[5];

          // Unassisted:
          PlayTypeUtils.enrichUnassistedStats(
            otherInfo[0],
            ix,
            rosterStatsByCode
          );
          // Transition + Scramble:
          PlayTypeUtils.enrichNonHalfCourtStats(otherInfo[2], otherInfo[3]);

          // Now get an approximate half court number for all the assists by sensibly (if not correctly!)
          // taking out the scramble and transition assisted numbers
          // (NOTE: there's a complication here because we may have adjusted assists upwards to include missed shots
          //  .. the previous value is preserved in old_value and we use that when it exists)
          PlayTypeUtils.convertAssistsToHalfCourtAssists(
            assistInfo,
            assistedTransitionInfo,
            assistedScrambleInfo
          );
        })
        .value();
    }

    // Distribute TOs into half court assist network
    // Note that transition and scramble TOs have valid stat.extraInfo so are correctly incorporated later
    // hence don't need special handling here
    if (playStyleType == "playsPct") {
      //(need a copy of this before we mutate it one final time in PlayTypeUtils.apportionHalfCourtTurnovers()
      const copyOfAssistNetwork = _.cloneDeep(reorderedPosVsPosAssistNetwork);

      _.chain(reorderedPosVsPosAssistNetwork)
        .toPairs()
        .forEach((kv, ix) => {
          const posTitle = kv[0];
          const otherInfo = kv[1].other;
          const unassistedInfo = otherInfo[0];

          PlayTypeUtils.apportionHalfCourtTurnovers(
            posTitle,
            ix,
            copyOfAssistNetwork,
            reorderedPosVsPosAssistNetwork,
            unassistedInfo,
            playerBreakdownMode
          );
        })
        .value();
    }
    return reorderedPosVsPosAssistNetwork;
  }

  /** Builds usage and efficiency numbers for the top level play styles */
  static buildTopLevelPlayStyles(
    players: Array<IndivStatSet>,
    rosterStatsByCode: RosterStatsByCode,
    teamStats: TeamStatSet
  ): TopLevelPlayAnalysis {
    const posVsPosAssistNetworkPoss =
      PlayTypeUtils.buildCategorizedAssistNetworks(
        "playsPct",
        true,
        players,
        rosterStatsByCode,
        teamStats
      );

    const topLevelPlayTypeAnalysisPoss =
      PlayTypeUtils.aggregateToTopLevelPlayStyles(
        "playsPct",
        posVsPosAssistNetworkPoss,
        players,
        teamStats
      );
    const posVsPosAssistNetworkPts =
      PlayTypeUtils.buildCategorizedAssistNetworks(
        "pointsPer100",
        true,
        players,
        rosterStatsByCode,
        teamStats
      );
    const topLevelPlayTypeAnalysisPts =
      PlayTypeUtils.aggregateToTopLevelPlayStyles(
        "pointsPer100",
        posVsPosAssistNetworkPts,
        players,
        teamStats
      );

    return _.chain(PlayTypeUtils.topLevelPlayTypes)
      .map((type) => {
        const poss = topLevelPlayTypeAnalysisPoss[type] || 0;
        const pts = topLevelPlayTypeAnalysisPts[type] || 0;

        return [
          type,
          {
            possPct: { value: poss },
            pts: { value: poss > 0 && pts > 0 ? pts / poss : 0 },
          },
        ];
      })
      .fromPairs()
      .value() as TopLevelPlayAnalysis;
  }

  /** Builds usage and efficiency numbers for the top level play styles
   * (useTeamPossessions to see player play styles as a subset of a given team play)
   */
  static buildTopLevelIndivPlayStyles(
    player: IndivStatSet,
    rosterStatsByCode: RosterStatsByCode,
    teamStats: TeamStatSet,
    teamBreakdownMode: boolean = false
  ): TopLevelIndivPlayAnalysis {
    const posVsPosAssistNetworkPoss =
      PlayTypeUtils.buildCategorizedAssistNetworks(
        "playsPct",
        true,
        [player],
        rosterStatsByCode,
        teamStats,
        teamBreakdownMode,
        true
      );

    const topLevelPlayTypeAnalysisPoss =
      PlayTypeUtils.aggregateToIndivTopLevelPlayStyles(
        "playsPct",
        posVsPosAssistNetworkPoss,
        [player],
        teamStats,
        teamBreakdownMode
      );

    const posVsPosAssistNetworkPts =
      PlayTypeUtils.buildCategorizedAssistNetworks(
        "pointsPer100",
        true,
        [player],
        rosterStatsByCode,
        teamStats,
        teamBreakdownMode,
        true
      );
    const topLevelPlayTypeAnalysisPts =
      PlayTypeUtils.aggregateToIndivTopLevelPlayStyles(
        "pointsPer100",
        posVsPosAssistNetworkPts,
        [player],
        teamStats,
        teamBreakdownMode
      );

    // Normalize poss to 100 because actually it's "userPossessions + passes"
    // (but we'll keep the ppp based on the poss number)
    const possNormalizationFactor = teamBreakdownMode
      ? 1
      : 1.0 /
        _.sumBy(
          PlayTypeUtils.topLevelIndivPlayTypes,
          (type) => topLevelPlayTypeAnalysisPoss[type] || 0
        );

    const playerContextAnalysis = _.chain(
      teamBreakdownMode
        ? PlayTypeUtils.extendedTopLevelIndivPlayTypes
        : PlayTypeUtils.topLevelIndivPlayTypes
    )
      .map((type) => {
        const poss = topLevelPlayTypeAnalysisPoss[type] || 0;
        const pts = topLevelPlayTypeAnalysisPts[type] || 0;

        return [
          type,
          {
            possPct: { value: poss * possNormalizationFactor },
            pts: { value: poss > 0 && pts > 0 ? pts / poss : 0 },
          },
        ];
      })
      .fromPairs()
      .value() as TopLevelIndivPlayAnalysis;

    if (!teamBreakdownMode) {
      // add possPctUsg to each play style
      _.chain(
        PlayTypeUtils.fetchIndivPlayTypes(
          player.code || "??",
          new Set(PlayTypeUtils.topLevelPlayTypes), //(spits out all the topLevelIndivPlayTypes aggregated together)
          rosterStatsByCode,
          PlayTypeUtils.buildTopLevelIndivPlayStyles(
            player,
            rosterStatsByCode,
            teamStats,
            true
          )
        )
      )
        .forEach((playTypeInfo) => {
          // Convert from 100 team possessions to "100 possessions during which player is on the floor"
          if (!_.isNil(playTypeInfo.playStats.possPct.value)) {
            playTypeInfo.playStats.possPct.value /=
              player.off_team_poss_pct?.value || 1;
          }

          const phase1Result = playerContextAnalysis[playTypeInfo.playType];
          if (phase1Result) {
            phase1Result.possPctUsg = playTypeInfo.playStats.possPct;
          }
        })
        .value();
    }
    return playerContextAnalysis;
  }

  /** Builds an aggregated top level view of defense */
  static buildTeamDefenseBreakdown = (
    defensiveInfo: Record<
      string,
      { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
    >,
    globalPlayerInfo: Record<string, Array<IndivStatSet>>
  ): TopLevelPlayAnalysis => {
    var varTotalPlays = 0;
    const mutableBreakdownTotals: Record<string, number> = {};
    const separateBreakdown = _.mapValues(defensiveInfo, (stats, team) => {
      const globalRosterStatsByCode = _.chain(globalPlayerInfo[team] || [])
        .map((p) => {
          return [p.code, p];
        })
        .fromPairs()
        .value();

      const topLevelPlayTypeStyles = PlayTypeUtils.buildTopLevelPlayStyles(
        stats.playerStats,
        globalRosterStatsByCode,
        stats.teamStats
      );
      varTotalPlays +=
        (stats.teamStats.off_poss?.value || 0) +
        (stats.teamStats.total_off_orb?.value || 0);

      _.forEach(topLevelPlayTypeStyles, (v, k) => {
        const currBreakdown = mutableBreakdownTotals[k] || 0;
        if (!currBreakdown) {
          mutableBreakdownTotals[k] = 0;
        }
        mutableBreakdownTotals[k] = currBreakdown + (v.possPct.value || 0);
      });

      return topLevelPlayTypeStyles;
    });
    const combinedBreakdown = _.transform(
      defensiveInfo,
      (acc, stats, team) => {
        const numPlays =
          (stats.teamStats.off_poss?.value || 0) +
          (stats.teamStats.total_off_orb?.value || 0);
        const teamTopLevelPlayTypeStyles = separateBreakdown[team];
        if (teamTopLevelPlayTypeStyles) {
          _.forEach(teamTopLevelPlayTypeStyles, (v, k) => {
            const kk = k as TopLevelPlayType;
            if (!acc[kk]) {
              acc[kk] = {
                possPct: { value: 0 },
                pts: { value: 0 },
                adj_pts: { value: 0 },
              };
            }
            const numPlaysOfType = mutableBreakdownTotals[k] || 1;
            acc[kk].possPct.value! +=
              ((v.possPct?.value || 0) * numPlays) / (varTotalPlays || 1);
            acc[kk].pts.value! +=
              ((v.pts?.value || 0) * (v.possPct?.value || 0)) / numPlaysOfType;
            acc[kk].adj_pts!.value! +=
              ((v.adj_pts?.value || 0) * numPlays) / numPlaysOfType;
          });
        }
      },
      {} as TopLevelPlayAnalysis
    );

    return combinedBreakdown;
  };

  //////////////////////////////////////////////////////////////

  // The main builders

  static adjustPlayerAssistNetworkWithFailedAssists(
    mutablePlayerPosAssistNetwork: Record<string, CategorizedAssistNetwork>,
    teamPosAssistNework: Record<string, CategorizedAssistNetwork>,
    playerStats: IndivStatSet
  ) {
    // (The preceding logic leaves old_value)
    // TODO: note this isn't quite true, the half court assist calcs also
    // adjust old_value, I think we have to live with that
    const getExtraShots = (stat: Statistic): number => {
      if (_.isNumber(stat?.old_value)) {
        return (stat.value || 0) - stat.old_value;
      } else {
        return 0;
      }
    };

    // The denom for mutablePlayerPosAssistNetwork is "team poss in sample while player was on the floor"
    // The denom for teamPosAssistNework is "total team poss in sample"
    // Example:
    // Take "number of misses by a big assisted by a guard" of 1% in teamPosAssistNework = 1/100 (from 20/2000)
    // Say "all guards have an assist rate of 4% to bigs" in teamPosAssistNework, eg 4/100 (from 80/2000)
    // Then a guard who plays 50% of minutes has 20 assists
    // Therefore to convert team to the play basis (since we're using these numbers to mutate the _player_ object)
    // we multiply the teamPosAssistNetwork stats by the poss possession, eg we assume that in "player"'s 1000 poss
    // there were 40 "assists from guards to bigs" and 10 misses on assists
    // TODO: in practice we have the exact numbers in player.total_ so could do this exactly rather than v dubiously
    // assume the stats are uniform
    const playerPossPct = playerStats.off_team_poss_pct?.value || 0;

    var varFailedAssistCount = 0;
    _.chain(PosFamilyNames)
      .forEach((pos) => {
        //(from pos category)
        const playerInfo = mutablePlayerPosAssistNetwork[pos];
        const teamInfo = teamPosAssistNework[pos];
        if (playerInfo && teamInfo) {
          _.forEach(teamInfo.assists, (posAssistInfo, ii) => {
            //to pos category
            _.forEach(shotTypes, (shotType) => {
              const teamAsstInfo = posAssistInfo as Record<string, Statistic>;
              //per shot type
              const teamExtraShots = teamAsstInfo?.[`source_${shotType}_ast`];
              const teamTotalAssists =
                teamAsstInfo?.[`target_${shotType}_ast`]?.value || 0;
              const teamTotalAssistsWhilePlayerIn =
                teamTotalAssists * playerPossPct;

              const playerAssistInfo = playerInfo.assists[ii] as
                | Record<string, Statistic>
                | undefined;
              if (
                teamExtraShots &&
                playerAssistInfo &&
                teamTotalAssistsWhilePlayerIn > 0
              ) {
                const playerExtraShots =
                  playerAssistInfo?.[`source_${shotType}_ast`]; //(need to subtract this from the team roster since can't pass to yourself!)

                const teamExtraShotsWhilePlayerIn =
                  getExtraShots(teamExtraShots) * playerPossPct;

                const missedShots = playerExtraShots
                  ? Math.max(
                      0,
                      teamExtraShotsWhilePlayerIn -
                        getExtraShots(playerExtraShots)
                    )
                  : 0;

                const missedShotsCreditedToPlayer =
                  (missedShots *
                    (playerAssistInfo?.[`target_${shotType}_ast`]?.value ||
                      0)) /
                  teamTotalAssistsWhilePlayerIn;

                if (missedShotsCreditedToPlayer > 0) {
                  //TODO: ugh need to take total poss into account somehow since these are all %s already
                  // I think? Can we make them not be %s?

                  varFailedAssistCount =
                    varFailedAssistCount + missedShotsCreditedToPlayer;
                }
              }
            });
          });
        }
      })
      .value();
  }

  /** For each player, build breakdowns of assists to/from positional categories in the team */
  static buildPerPlayerPositionalBreakdown(
    playStyleType: PlayStyleType,
    separateHalfCourt: boolean,
    filteredPlayers: Array<IndivStatSet>,
    rosterStatsByCode: RosterStatsByCode,
    teamStats: TeamStatSet,
    teamPossessionsToUse: number | undefined
  ): Record<PlayerCode, PosCategoryAssistNetwork> {
    const teamTotalAssists = teamStats.total_off_assist?.value || 0;
    //(use team total assists for consistency with individual chart)

    const posCategoryAssistNetworkVsPlayer: Record<
      PlayerCode,
      PosCategoryAssistNetwork
    > = _.chain(filteredPlayers)
      .map((player, ix) => {
        const allPlayers = PlayTypeUtils.buildPlayerAssistCodeList(player);

        // Decomposes stats into unassisted half court, assisted half court (this is broken down further below)
        // plus scramble/transition stats
        const playerStyle = PlayTypeUtils.buildPlayerStyle(
          playStyleType,
          player,
          rosterStatsByCode[PlayTypeUtils.getCode(player)],
          teamPossessionsToUse,
          teamTotalAssists,
          separateHalfCourt
        );

        // Which players assisted "player", and which did "player" assist?
        const playerAssistNetwork = allPlayers.map((p) => {
          const [info, ignore] = PlayTypeUtils.buildPlayerAssistNetwork(
            playStyleType,
            p,
            player,
            playerStyle.totalPlaysMade,
            playStyleType == "scoringPlaysPct"
              ? playerStyle.totalAssists //(in scoring mode we use total team assists - for others we use either team/player poss)
              : playerStyle.totalPlaysMade,
            rosterStatsByCode
          );
          return { code: p, ...info };
        });

        // For this player, we convert their player-based assist network into a positional-based assist network
        // eg if "playerX (WG) -> player", then converts to "BH*0.6 -> player, W*0.4 -> player"
        const posCategoryAssistNetwork =
          PlayTypeUtils.buildPosCategoryAssistNetwork(
            playerAssistNetwork,
            rosterStatsByCode,
            undefined
          );

        // Distributes uncategorized misses across the source_
        const posCategoryAssistNetworkMaybeIncMisses =
          playerStyle.assistedMissAdjustments
            ? PlayTypeUtils.adjustPosCategoryAssistNetworkWithMissInfo(
                playStyleType,
                posCategoryAssistNetwork,
                playerStyle.assistedMissAdjustments,
                playerStyle.totalPlaysMade
              )
            : posCategoryAssistNetwork;

        const code: PlayerCode = PlayTypeUtils.getCode(player);

        return [
          code,
          {
            posCategoryAssistNetwork: posCategoryAssistNetworkMaybeIncMisses,
            playerStyle: playerStyle,
          },
        ];
      })
      .fromPairs()
      .value();

    return posCategoryAssistNetworkVsPlayer;
  }

  /** Given a per-player network of assists, convert to a positional network of assists */
  static convertFromPlayerToPositionPositionalBreakdown(
    posCategoryAssistNetworkVsPlayer: Record<
      PlayerCode,
      PosCategoryAssistNetwork
    >,
    rosterStatsByCode: RosterStatsByCode
  ): Record<string, CategorizedAssistNetwork> {
    // posCategoryAssistNetworkVsPlayer gets us to:
    // [1] (player)[ { [pos]: <shot-type-stats> } ]   (pos=bh|wing|big)

    // Then buildPosCategoryAssistNetwork goes:
    // [2] player, (other_players)[ <shot-type-stats> ] => { [pos]: <shot-type-stats> }
    // (and "player" is only used to inject examples in)

    // So transform [1] to (pos)(players)[ <shot-type-stats> ] and then use [2] on each pos
    // and that gives us a pos vs pos -> <shot-type-stats> as desired!

    const posVsPosAssistNetwork: Record<string, CategorizedAssistNetwork> =
      _.chain(PosFamilyNames)
        .map((pos, ix) => {
          const perPlayer: TargetAssistInfo[] = _.chain(
            posCategoryAssistNetworkVsPlayer
          )
            .mapValues((perPlayerInfo, playerCode) => {
              const posCategoryAssistNetwork =
                perPlayerInfo.posCategoryAssistNetwork;
              // ^ For each player, the stats to/from the position

              // For each player: get a single pos category stats
              const posStats =
                posCategoryAssistNetwork.filter(
                  (net: ScoredTargetAssistInfo) => net.order == ix
                )?.[0] || undefined;
              return posStats && posStats.info
                ? [
                    {
                      ...posStats.info,
                      code: playerCode,
                    },
                  ]
                : [];
            })
            .values()
            .flatten()
            .value();

          // This is now "for each pos, a list of player stats", so we can reapply, to get "for each pos a list of pos stats"
          const posPosCatAssistNetwork: ScoredTargetAssistInfo[] =
            PlayTypeUtils.buildPosCategoryAssistNetwork(
              perPlayer,
              rosterStatsByCode,
              ix
            ); // pos vs <shot-type-stats> (order tells you which)

          //console.log(`${pos} ... vs ... ${JSON.stringify(perPlayer, tidyNumbers, 3)}`);

          // Unassisted/scramble/transition: similar:
          const posVsPosOtherTypes: ScoredTargetAssistInfo[] = _.chain([
            "unassisted",
            "assisted", //(this are shots that are assisted, vs posPosCatAssistNetwork which are my assists)
            "transition",
            "scramble",
            "transitionAssisted",
            "scrambleAssisted",
          ])
            .map((key) => {
              const perPlayer: TargetAssistInfo[] = _.chain(
                posCategoryAssistNetworkVsPlayer
              )
                .mapValues((perPlayerInfo, playerCode) => {
                  const playerStyle = perPlayerInfo.playerStyle;
                  return {
                    ...(asPlayerStyleSet(playerStyle)[key] || {}),
                    code: playerCode,
                  } as TargetAssistInfo; //(actually this is SourceAssistInfo but using the super-type for convenience)
                })
                .values()
                .value();
              const posOtherPosCatAssistNetwork =
                PlayTypeUtils.buildPosCategoryAssistNetwork(
                  perPlayer,
                  rosterStatsByCode,
                  undefined
                ); // pos vs <shot-type-stats> (order tells you which)

              //console.log(`${key}: ${JSON.stringify(perPlayer, tidyNumbers)} ... ${JSON.stringify(posOtherPosCatAssistNetwork, tidyNumbers)}`);

              return posOtherPosCatAssistNetwork[ix];
            })
            .value();

          return [
            pos,
            {
              assists: posPosCatAssistNetwork.map(
                (p) => p.info
              ) as TargetAssistInfo[],
              other: posVsPosOtherTypes.map(
                (p) => p.info
              ) as TargetAssistInfo[],
            },
          ];
        })
        .fromPairs()
        .value();

    // The above is the wrong way round, so re-order the 2x pos keys:
    const reorderedPosVsPosAssistNetwork: Record<
      string,
      CategorizedAssistNetwork
    > = _.chain(PosFamilyNames)
      .map((pos, ix) => {
        const other = posVsPosAssistNetwork[pos]?.other || [];
        const assists = _.chain(posVsPosAssistNetwork)
          .values()
          .map((assistNetwork, ix2) => {
            return { ...(assistNetwork.assists?.[ix] || {}), order: ix2 };
          })
          .value();

        return [pos, { assists: assists, other: other }];
      })
      .fromPairs()
      .value();

    return reorderedPosVsPosAssistNetwork;
  }

  /** Builds a higher level view of the assist network, with lots of guessing */
  static aggregateToIndivTopLevelPlayStyles(
    playStyleType: PlayStyleType,
    assistNetwork: Record<
      string,
      { assists: TargetAssistInfo[]; other: SourceAssistInfo[] }
    >,
    players: Array<IndivStatSet>,
    teamStats: TeamStatSet,
    extendedPlayType: boolean = false, //(for team breakdown into players need a more granular set of play types)
    doubleCountPasses: boolean = true //(if false then weights passes by 0.25 /assisted shots by 0.75)
    //TODO: wire this up
  ): Record<TopLevelIndivPlayType, number> {
    const playTypesLookup = PlayTypeUtils.buildPlayTypesLookup();

    const flattenedNetworkSrc = _.chain(assistNetwork)
      .toPairs()
      .flatMap((kv, ix) => {
        const posTitle = kv[0];
        const assistInfo = kv[1].assists;
        const otherInfo = kv[1].other;
        //(unassisted, assisted <- DROP, transition, scramble)
        const unassistedInfo = otherInfo[0];
        const transitionInfo = otherInfo[2];
        const scrambleInfo = otherInfo[3];

        return (assistInfo as SourceAssistInfo[])
          .concat([unassistedInfo, transitionInfo, scrambleInfo])
          .flatMap((a, i) => {
            // Diagnostics:
            // if (playStyleType == "playsPct") {
            //   _.keys(a)
            //     .filter((ka) => _.startsWith(ka, "source_"))
            //     .forEach((ka) => {
            //       console.log(
            //         `??? ${posTitle}: ${i} : ${ka} .. [${
            //           (a as PureStatSet)[ka].extraInfo
            //         }] .. [${(a as PureStatSet)[ka].value}]`
            //       );
            //     });
            // }
            return _.keys(a)
              .filter((ka) => _.startsWith(ka, "source_"))
              .map((ka) => ({
                key: `${posTitle}_${i}_${ka}`,
                stat: (a as PureStatSet)[ka],
              }));
          });
      })
      //(type weirdness here, extraInfo temporarily is an array of strings)
      .groupBy((obj) => ((obj.stat.extraInfo as string[]) || []).join(":"))
      .mapValues((oo) => _.sumBy(oo, (o) => o.stat?.value || 0))
      .value();

    /** For assisted shots, estimate efficiency given some passes result in missed shots:
     * IMPORTANT see comments in here about why this exists */
    const buildAdjustedAssistStat = (
      statName: string,
      stat: Statistic,
      assistInfo: TargetAssistInfo
    ): Statistic => {
      const efgKey = _.endsWith(statName, "_ast")
        ? statName.replace("_ast", "_efg")
        : undefined;
      if (efgKey && (assistInfo as PureStatSet)[efgKey]) {
        const efgValue = (assistInfo as PureStatSet)[efgKey].value || 1;
        const rawStat = stat.value || 0;

        const _3pMult = statName.includes("3p") ? 1.5 : 1.0; //(want FG% since we just care about the number of misses)

        //TODO: there are some inaccuracies here though they sort of cancel each other out
        // 1] eFG should be higher because these are adjusted plays (or do I already adjust for that somewhere?)
        // 2] don't have eFG for transition or scrambles so numbers will be off
        //         (in the sense that player A passes to player B who misses, player B gets blame but not A)
        // 3] This is happened _after_ TOs are added so I'm double the TOs also
        //         but on the other hand, we need to double count TOs since a pass to a player who fumble the pass
        //         is a TO on the receiver, but should still count against the passer's PPP
        //
        //    There is some disabled code in adjustPosCategoryAssistNetworkWithMissInfo that applies this in the
        //    "correct" place that might be worth revisiting once eFG is fixed, but for now this empirically provides
        //    better results

        const adjustedStat =
          playStyleType == "playsPct"
            ? (rawStat * _3pMult) / efgValue
            : rawStat;

        return {
          ...stat,
          value: adjustedStat,
          //(DIAG)
          //efg: efgValue,
        } as any as Statistic;
      } else {
        return stat;
      }
    };

    const flattenedNetworkTarget = _.chain(assistNetwork)
      .toPairs()
      .flatMap((kv, ix) => {
        const posTitle = kv[0];
        const assistInfo = kv[1].assists;
        const otherInfo = kv[1].other;
        //(unassisted, assisted <- DROP, transition, scramble)
        const unassistedInfo = otherInfo[0];
        const transitionInfo = otherInfo[2];
        const scrambleInfo = otherInfo[3];

        return (assistInfo as SourceAssistInfo[])
          .concat([unassistedInfo, transitionInfo, scrambleInfo])
          .flatMap((a, i) => {
            // Diagnostics:
            // if (playStyleType == "playsPct") {
            //   _.keys(a)
            //     .filter((ka) => _.startsWith(ka, "target_"))
            //     .forEach((ka) => {
            //       console.log(
            //         `??? ${posTitle}: ${i} : ${ka} .. [${
            //           (a as PureStatSet)[ka].extraInfo
            //         }] .. [${(a as PureStatSet)[ka].value}]`
            //       );
            //     });
            // }
            return (
              _.keys(a)
                .filter((ka) => _.startsWith(ka, "target_"))
                // Diagnostics:
                // .map((ka) => {
                //   if (players.length == 1 && players[0].code == "JaGillespie") {
                //     //console.log(`assistInfo: [${i}]: [${JSON.stringify(a)}]`);
                //     console.log(
                //       `DST [${playStyleType}] key [${posTitle}_${i}_${ka}] stat [${JSON.stringify(
                //         buildAdjustedAssistStat(
                //           ka,
                //           (a as PureStatSet)[ka],
                //           a as TargetAssistInfo
                //         )
                //       )}]`
                //     );
                //   }
                //   return ka;
                // })
                .map((ka) => ({
                  key: `${posTitle}_${i}_${ka}`,
                  stat: buildAdjustedAssistStat(
                    ka,
                    (a as PureStatSet)[ka],
                    a as TargetAssistInfo
                  ),
                }))
            );
          });
      })
      //(type weirdness here, extraInfo temporarily is an array of strings)
      .groupBy((obj) => ((obj.stat.extraInfo as string[]) || []).join(":"))
      .mapValues((oo) => _.sumBy(oo, (o) => o.stat?.value || 0))
      .value();

    // The larger set of indiv play types is mapped from the team set depending on target vs source

    const topLevelPlayTypeAnalysisPhase1 = _.transform(
      flattenedNetworkSrc,
      (acc, usage, key) => {
        const playTypesCombo = playTypesLookup[key];
        //(note half-court TOs don't match anything here, key=="", that's OK because they are
        // already distributed amongst the other play types)

        _.toPairs(playTypesCombo).forEach((kv) => {
          const playType = PlayTypeUtils.teamToIndivSrcPlayTypeMapping(
            kv[0] as TopLevelPlayType,
            extendedPlayType
          );
          const weight =
            playStyleType == "playsPct" && !doubleCountPasses
              ? 0.75 * kv[1]
              : kv[1];

          // Diagnostics:
          // if (playStyleType == "playsPct") {
          //   console.log(
          //     `${key}: ${playType} ${weight}*${usage.toFixed(3)}=${(
          //       weight * usage
          //     ).toFixed(3)}: [${acc[playType]}]`
          //   );
          // }

          acc[playType] = (acc[playType] || 0) + weight * usage;
        });
      },
      {} as Record<TopLevelIndivPlayType, number>
    );

    // (note the per-team breakdowns don't use this to avoid double counting passes, whereas for players (when summed
    //  over all players) we _are_ double counting (note the flag that lets us very approximately undo this .. as yet
    //  this isn't wired up)
    const topLevelPlayTypeAnalysis = _.transform(
      flattenedNetworkTarget,
      (acc, usage, key) => {
        const playTypesCombo = playTypesLookup[key];
        //(note half-court TOs don't match anything here, key=="", that's OK because they are
        // already distributed amongst the other play types)

        _.toPairs(playTypesCombo).forEach((kv) => {
          const playType = PlayTypeUtils.teamToIndivTargetPlayTypeMapping(
            kv[0] as TopLevelPlayType,
            extendedPlayType
          );
          const weight =
            playStyleType == "playsPct" && !doubleCountPasses
              ? 0.25 * kv[1]
              : kv[1];

          // Diagnostics:
          // if (playStyleType == "playsPct") {
          //   console.log(
          //     `${key}: ${playType} ${weight}*${usage.toFixed(3)}=${(
          //       weight * usage
          //     ).toFixed(3)}: [${acc[playType]}]`
          //   );
          // }

          acc[playType] = (acc[playType] || 0) + weight * usage;
        });
      },
      topLevelPlayTypeAnalysisPhase1 as Record<TopLevelIndivPlayType, number>
    );

    // Unlike for team stats, we don't assign blame for uncategorized turnovers
    // If the scorer wanted blame to be assigned, they just had to click a button :)
    // (in the future could pre-calc this, weight by mins/usage/to% and add to unassisted.source_to for half court/
    //  more or less duplcate team equivalent fot transition/scramble)

    //TODO: finally need to normalize the frequencies because of all the approximations I've made?
    //(or just leave it? the numbers won't add to 100 across players anyway because passes are double counted...)

    return topLevelPlayTypeAnalysis;
  }

  /** Builds a higher level view of the assist network, with lots of guessing */
  static aggregateToTopLevelPlayStyles(
    playStyleType: PlayStyleType,
    assistNetwork: Record<
      string,
      { assists: TargetAssistInfo[]; other: SourceAssistInfo[] }
    >,
    players: Array<IndivStatSet>,
    teamStats: TeamStatSet
  ): Record<TopLevelPlayType, number> {
    const playTypesLookup = PlayTypeUtils.buildPlayTypesLookup();

    const flattenedNetwork = _.chain(assistNetwork)
      .toPairs()
      .flatMap((kv, ix) => {
        const posTitle = kv[0];
        const assistInfo = kv[1].assists;
        const otherInfo = kv[1].other;
        //(unassisted, assisted <- DROP, transition, scramble)
        const unassistedInfo = otherInfo[0];
        const transitionInfo = otherInfo[2];
        const scrambleInfo = otherInfo[3];

        return (assistInfo as SourceAssistInfo[])
          .concat([unassistedInfo, transitionInfo, scrambleInfo])
          .flatMap((a, i) => {
            // Diagnostics:
            // if (playStyleType == "playsPct") {
            //   _.keys(a)
            //     .filter((ka) => _.startsWith(ka, "source_"))
            //     .forEach((ka) => {
            //       console.log(
            //         `??? ${posTitle}: ${i} : ${ka} .. [${
            //           (a as PureStatSet)[ka].extraInfo
            //         }] .. [${(a as PureStatSet)[ka].value}]`
            //       );
            //     });
            // }
            return _.keys(a)
              .filter((ka) => _.startsWith(ka, "source_"))
              .map((ka) => ({
                key: `${posTitle}_${i}_${ka}`,
                stat: (a as PureStatSet)[ka],
              }));
          });
      })
      //(type weirdness here, extraInfo temporarily is an array of strings)
      .groupBy((obj) => ((obj.stat.extraInfo as string[]) || []).join(":"))
      .mapValues((oo) => _.sumBy(oo, (o) => o.stat?.value || 0))
      .value();

    const topLevelPlayTypeAnalysis = _.transform(
      flattenedNetwork,
      (acc, usage, key) => {
        const playTypesCombo = playTypesLookup[key];
        //(note half-court TOs don't match anything here, key=="", that's OK because they are
        // already distributed amongst the other play types)

        _.toPairs(playTypesCombo).forEach((kv) => {
          const playType = kv[0] as TopLevelPlayType;
          const weight = kv[1];

          // Diagnostics:
          // if (playStyleType == "playsPct") {
          //   console.log(
          //     `${key}: ${playType} ${weight}*${usage.toFixed(3)}=${(
          //       weight * usage
          //     ).toFixed(3)}: [${acc[playType]}]`
          //   );
          // }

          acc[playType] = (acc[playType] || 0) + weight * usage;
        });
      },
      {} as Record<TopLevelPlayType, number>
    );

    // Uncategorized turnovers:
    if (playStyleType == "playsPct") {
      //TODO: (ideally we'd pass this in to ensure it's the same demon as everything else)
      const teamPossessions =
        (teamStats.total_off_fga?.value || 0) +
          0.475 * (teamStats.total_off_fta?.value || 0) +
          (teamStats.total_off_to?.value || 0) || 1;

      const [uncatHalfCourtTos, uncatScrambleTos, uncatTransTos] =
        PlayTypeUtils.calcTeamHalfCourtTos(
          players as IndivStatSet[],
          teamStats as TeamStatSet
        );

      topLevelPlayTypeAnalysis["Misc"] = uncatHalfCourtTos / teamPossessions;
      topLevelPlayTypeAnalysis["Put-Back"] +=
        uncatScrambleTos / teamPossessions;
      topLevelPlayTypeAnalysis["Transition"] += uncatTransTos / teamPossessions;
    } else {
      topLevelPlayTypeAnalysis["Misc"] = 0;
    }

    return topLevelPlayTypeAnalysis;
  }

  /** Decomposes a player stats into unassisted/assisted _totals_ and half-court/scramble/transition */
  static buildPlayerStyle(
    playStyleType: PlayStyleType,
    player: IndivStatSet,
    playerGlobalRosterStats: IndivStatSet | undefined,
    countNotPctScorePoss?: number,
    countNotPctAssists?: number,
    separateHalfCourt?: boolean
  ): PlayerStyleInfo {
    // Some types and globals

    const ftaMult = 0.475;
    const totalAssistsCalc = player[`total_off_assist`]?.value || 0;
    const totalAssistsCalcHalfCourt =
      totalAssistsCalc -
      (player[`total_off_scramble_assist`]?.value || 0) -
      (player[`total_off_trans_assist`]?.value || 0); // (don't render if 0)
    const totalAssistsCalcToUse = separateHalfCourt
      ? totalAssistsCalcHalfCourt
      : totalAssistsCalc;

    const totalAssists = !_.isNil(countNotPctAssists)
      ? countNotPctAssists
      : totalAssistsCalc;
    const maybeTurnovers =
      playStyleType == "scoringPlaysPct" ? 0 : player.total_off_to?.value || 0;

    const totalSuffix = playStyleType == "scoringPlaysPct" ? "fgm" : "fga";
    //(for pts/100 and % of plays we care about field goals made and missed)
    //(note always use FTA*ftaMult though, scoring plays == plays in this case - later on for the numerator we use FTM in some cases)

    // Here's an issue .... ALL MISSES ARE (implicitly) UNASSISTED
    // so need to split the misses out from UA to A (half court only since we won't categorize scramble/transition further)
    const assistedMissAdjustments: Record<string, number> = _.thru(
      playStyleType == "playsPct",
      (needToSplitOutUnassistedMisses) => {
        if (needToSplitOutUnassistedMisses) {
          return _.transform(
            ["3p", "mid", "rim"],
            (acc, shotType) => {
              const mappedShotType = shotMap[shotType] as
                | "3p"
                | "2pmid"
                | "2prim";

              const fgDecompInfo = LuckUtils.buildShotInfo(
                player,
                mappedShotType,
                true
              );

              const regressNumber = 10;
              const adjFgPctDecompInfo = LuckUtils.buildAdjustedFG(
                playerGlobalRosterStats || player,
                fgDecompInfo,
                mappedShotType,
                regressNumber
              );

              if (fgDecompInfo.shot_info_total_attempts > 0) {
                const { fgM_ast, fgM_unast } = LuckUtils.decomposeUnknownMisses(
                  fgDecompInfo,
                  adjFgPctDecompInfo
                );
                acc[shotType] = fgM_ast;

                // Debugging this for 3P:
                //   if (mappedShotType == "3p") {
                //     console.log(
                //       `Player [${player.key}]: ` +
                //         `T [${player.total_off_trans_3p_attempts?.value || 0}]` +
                //         `[${player.total_off_trans_3p_made?.value || 0}]` +
                //         `a=[${player.total_off_trans_3p_ast?.value || 0}]` +
                //         `S [${
                //           player.total_off_scramble_3p_attempts?.value || 0
                //         }]` +
                //         `[${player.total_off_scramble_3p_made?.value || 0}]` +
                //         `a=[${player.total_off_scramble_3p_ast?.value || 0}]` +
                //         `Aa [${player.total_off_3p_ast?.value || 0}]` +
                //         `== [${player.total_off_3p_attempts?.value || 0}]` +
                //         `[${
                //           player.total_off_3p_made?.value || 0
                //         }] ... ${JSON.stringify(fgDecompInfo)}`
                //     );
                //     console.log(
                //       `Player [${player.key}]: ` +
                //         `a=[${adjFgPctDecompInfo.assisted.toFixed(
                //           4
                //         )}] ua=[${adjFgPctDecompInfo.unassisted.toFixed(4)}]; ` +
                //         `FG_a=[${
                //           fgDecompInfo.shot_info_ast_made
                //         }]M:[${fgM_ast.toFixed(1)}]m = [${(
                //           fgDecompInfo.shot_info_ast_made /
                //           (fgM_ast + fgDecompInfo.shot_info_ast_made || 1)
                //         ).toFixed(4)}],` +
                //         `FG_ua=[${
                //           fgDecompInfo.shot_info_unast_made
                //         }]M:[${fgM_unast.toFixed(1)}]m = [${(
                //           fgDecompInfo.shot_info_unast_made /
                //           (fgM_unast + fgDecompInfo.shot_info_unast_made || 1)
                //         ).toFixed(4)}] .. [${
                //           fgDecompInfo.shot_info_early_attempts
                //         }]x[${player.off_trans_3p?.value}] [${
                //           fgDecompInfo.shot_info_scramble_attempts
                //         }]x[${player.off_scramble_3p?.value}]`
                //     );
                //   }
              }
            },
            {} as Record<string, number>
          );
        }
        return {} as Record<string, number>;
      }
    );

    const totalShotsCount = player[`total_off_${totalSuffix}`]?.value || 0;
    const totalFtTripsMadeForDenom =
      ftaMult * (player[`total_off_fta`]?.value || 0);
    const totalPlaysMade =
      (!_.isNil(countNotPctScorePoss)
        ? countNotPctScorePoss
        : totalShotsCount +
          totalFtTripsMadeForDenom +
          totalAssists +
          maybeTurnovers) || 1; //(always render so avoid NaN with default 1)

    const fieldGoalTypeSuffix =
      playStyleType == "playsPct" ? "attempts" : "made";
    const freeThrowSuffix = playStyleType == "pointsPer100" ? "ftm" : "fta";
    //(if we care about scoring unless calculating the pure playsPct)

    const ptsMultiplier = (shotType: string) =>
      playStyleType == "pointsPer100" ? (shotType == "3p" ? 3 : 2) : 1;

    /** (util method, see below) */
    const buildTotal = (prefix: string) => {
      return _.fromPairs(
        shotTypes.map((key) => {
          const total =
            player[
              `total_off_${prefix}_${shotMap[key]!}_${fieldGoalTypeSuffix}`
            ]?.value || 0;
          const assisted =
            player[`total_off_${prefix}_${shotMap[key]!}_ast`]?.value || 0;
          const unassisted = total - assisted;
          return [key, [total, assisted, unassisted]];
        })
      ) as Record<string, number[]>;
    };

    /** (util method, see below) */
    const buildRow = (
      totalInfo: Record<string, number[]>,
      ftInfo: number,
      assists: number,
      turnovers: number,
      assistedOnly: boolean
    ) => {
      return _.toPairs(totalInfo)
        .map((kv) => {
          const key = kv[0];
          const total = kv[1][0]!; //total unassisted + assisted
          const assisted = kv[1][1]!;
          return [
            `source_${key}_ast`,
            total > 0
              ? {
                  value:
                    ((assistedOnly ? assisted : total) * ptsMultiplier(key)) /
                    totalPlaysMade,
                }
              : null,
          ];
        })
        .concat([
          [
            `target_ast`,
            assists > 0 ? { value: assists / totalPlaysMade } : null,
          ],
        ])
        .concat(
          assistedOnly
            ? []
            : [
                [
                  `source_sf`,
                  ftInfo > 0 ? { value: ftInfo / totalPlaysMade } : null,
                ],
              ]
        )
        .concat(
          !assistedOnly && maybeTurnovers > 0
            ? [
                [
                  `source_to`,
                  turnovers > 0 ? { value: turnovers / totalPlaysMade } : null,
                ],
              ]
            : []
        );
    };

    // Scramble and transition

    const maybeFtaMult = playStyleType == "pointsPer100" ? 1 : ftaMult;

    const scrambleTotal = buildTotal("scramble");
    const scrambleFtTrips =
      maybeFtaMult *
      (player[`total_off_scramble_${freeThrowSuffix}`]?.value || 0);
    const scrambleAssists = player[`total_off_scramble_assist`]?.value || 0;
    const scrambleTo = player[`total_off_scramble_to`]?.value || 0;
    const scrambleRow = buildRow(
      scrambleTotal,
      scrambleFtTrips,
      scrambleAssists,
      scrambleTo,
      false
    );
    const scrambleRowAssistedOnly = separateHalfCourt
      ? buildRow(scrambleTotal, scrambleFtTrips, scrambleAssists, 0, true)
      : [];

    const transitionTotal = buildTotal("trans");
    const transitionFtTrips =
      maybeFtaMult * (player[`total_off_trans_${freeThrowSuffix}`]?.value || 0);
    const transitionAssists = player[`total_off_trans_assist`]?.value || 0;
    const transitionTo = player[`total_off_trans_to`]?.value || 0;
    const transitionRow = buildRow(
      transitionTotal,
      transitionFtTrips,
      transitionAssists,
      transitionTo,
      false
    );
    const transitionRowAssistedOnly = separateHalfCourt
      ? buildRow(transitionTotal, transitionFtTrips, transitionAssists, 0, true)
      : [];

    // Half court:

    const totalFtTripsForNum =
      maybeFtaMult * (player[`total_off_${freeThrowSuffix}`]?.value || 0);
    const totalFtTripsMadeHalfCourt =
      totalFtTripsForNum - transitionFtTrips - scrambleFtTrips;
    const totalFtTripsToUse = separateHalfCourt
      ? totalFtTripsMadeHalfCourt
      : totalFtTripsForNum;
    const halfCourtTos = separateHalfCourt
      ? maybeTurnovers - transitionTo - scrambleTo
      : maybeTurnovers;

    const unassistedToUseRow = shotTypes
      .map((key) => {
        const shots =
          player[`total_off_${shotMap[key]!}_${fieldGoalTypeSuffix}`]?.value ||
          0; //(half court/transition/scramble)
        const assisted = player[`total_off_${shotMap[key]!}_ast`]?.value || 0; //(half court/transition/scramble)
        const unassisted = shots - assisted;
        const assistedMissAdjustment = assistedMissAdjustments[key] || 0; //(these are added to the assisted shot total, so removed here)
        const unassistedHalfCourt =
          unassisted -
          scrambleTotal[key]![2]! -
          transitionTotal[key]![2]! -
          assistedMissAdjustment;
        const unassistedToUse = separateHalfCourt
          ? unassistedHalfCourt
          : unassisted;

        const assistedMissAdjustmentPct =
          assistedMissAdjustment / totalPlaysMade;

        const unassistedPct =
          (unassistedToUse * ptsMultiplier(key)) / totalPlaysMade;

        return [
          `source_${key}_ast`,
          unassistedPct + assistedMissAdjustmentPct > 0
            ? ({
                value: unassistedPct,
                old_value:
                  assistedMissAdjustmentPct > 0.0
                    ? assistedMissAdjustmentPct + unassistedPct
                    : undefined,
              } as Statistic)
            : null,
        ];
      })
      .concat([
        [
          `source_sf`,
          totalFtTripsToUse > 0
            ? { value: totalFtTripsToUse / totalPlaysMade }
            : null,
        ],
      ])
      .concat(
        maybeTurnovers > 0
          ? [
              [
                `source_to`,
                halfCourtTos > 0
                  ? { value: halfCourtTos / totalPlaysMade }
                  : null,
              ],
            ]
          : []
      );

    const assistToUseTotalsRow = shotTypes
      .map((key) => {
        const assisted = player[`total_off_${shotMap[key]!}_ast`]?.value || 0;
        const assistedMissAdjustment = assistedMissAdjustments[key] || 0; //(these are added to the assisted shot total)
        const assistedHalfCourt =
          assisted -
          scrambleTotal[key]![1]! -
          transitionTotal[key]![1]! +
          assistedMissAdjustment;
        const assistedToUse = separateHalfCourt ? assistedHalfCourt : assisted;

        return [
          `source_${key}_ast`,
          assistedToUse > 0
            ? {
                value: (assistedToUse * ptsMultiplier(key)) / totalPlaysMade,
              }
            : null,
        ];
      })
      .concat([
        [
          `target_ast`,
          totalAssistsCalcToUse > 0
            ? {
                value: totalAssistsCalcToUse / totalPlaysMade,
              }
            : null,
        ],
      ]);

    const retVal = {
      unassisted: _.fromPairs(unassistedToUseRow) as SourceAssistInfo,
      assisted: _.fromPairs(assistToUseTotalsRow) as SourceAssistInfo,
      scramble: _.fromPairs(scrambleRow) as SourceAssistInfo,
      transition: _.fromPairs(transitionRow) as SourceAssistInfo,
      scrambleAssisted: _.fromPairs(
        scrambleRowAssistedOnly
      ) as SourceAssistInfo,
      transitionAssisted: _.fromPairs(
        transitionRowAssistedOnly
      ) as SourceAssistInfo,
      totalPlaysMade: totalPlaysMade,
      totalAssists: totalAssists,
      assistedMissAdjustments:
        playStyleType == "playsPct" ? assistedMissAdjustments : undefined,
    };

    //DEBUG INFO:
    // console.log(
    //   `${player.key}: ${playStyleType}: ${JSON.stringify(
    //     retVal,
    //     null,
    //     3
    //   )} [${JSON.stringify(shotAdjustments)}]`
    // );

    return retVal;
  }

  /** Takes a player or category (ball-handler / wing / frontcourt) and builds their assist network
   * relative to the main player (ie assisting or assisted by) for each shot type
   * If playStyleType=="pointsPer100" then the assist is multiplied by its pt value)
   *
   * note totalPlaysMade/totalAssists is relative to "mainPlayer"
   * (totalPlaysMade is either scoring if "scoringPlaysPct", or total plays otherwise)
   *  (note that the interaction between this logic and the calling code in XxxPlayTypeDiagView is currently a bit tangled)
   */
  static buildPlayerAssistNetwork(
    playStyleType: PlayStyleType,
    playerOrPos: string,
    mainPlayer: IndivStatSet,
    totalPlaysMade: number,
    totalAssists: number,
    rosterStatsByCode: RosterStatsByCode
  ): [TargetAssistInfo, number] {
    const ptsMultiplier = (shotType: string) =>
      playStyleType == "pointsPer100" ? (shotType == "3p" ? 3 : 2) : 1;

    const p = playerOrPos;
    var mutableTotal = 0;
    const info = _.fromPairs(
      ["target", "source"].flatMap((loc) => {
        const targetNotSource = loc == "target";
        var mutableAssistsAcrossShotTypes = 0;
        return shotTypes
          .flatMap((key) => {
            const assists =
              (mainPlayer[`off_ast_${key}_${loc}`]?.value as any)?.[p] || 0;
            mutableAssistsAcrossShotTypes += targetNotSource ? assists : 0;
            mutableTotal += assists;
            const denominator = targetNotSource
              ? totalAssists || 1
              : totalPlaysMade;
            const eFG =
              (key == "3p" ? 1.5 : 1) *
              (rosterStatsByCode[p]?.[`off_${shotMap[key]!}`]?.value || 0);

            return assists > 0
              ? [
                  [
                    `${loc}_${key}_ast`,
                    {
                      value:
                        (ptsMultiplier(key) * assists) / (denominator || 1),
                    },
                  ],
                  [`${loc}_${key}_efg`, { value: eFG }],
                ]
              : [];
          })
          .concat(
            targetNotSource && mutableAssistsAcrossShotTypes > 0
              ? [
                  [
                    `target_ast`,
                    { value: mutableAssistsAcrossShotTypes / totalPlaysMade },
                  ],
                ]
              : []
          );
      })
    );
    return [info as TargetAssistInfo, mutableTotal];
  }

  /** Add in an estimate of "assisted misses" to each positional category */
  static adjustPosCategoryAssistNetworkWithMissInfo(
    playStyleType: PlayStyleType,
    mutableUnadjusted: Array<ScoredTargetAssistInfo>,
    missAdjustments: Record<string, number>,
    denominator: number
  ): Array<ScoredTargetAssistInfo> {
    const genericAssistSplit = [1, 0.5, 0.5]; // regress assists to this number
    const genericAssistRegression = 2;
    shotTypes.map((key) => {
      // Decide on the weight of each positional category on the misses to add
      const totalWeight =
        _.sumBy(mutableUnadjusted, (assistInfo) => {
          const stat = (assistInfo.info as Record<string, Statistic>)?.[
            `source_${key}_ast`
          ];
          return (stat?.value || 0) * denominator;
        }) + genericAssistRegression;

      mutableUnadjusted.forEach((assistInfo, index) => {
        if (assistInfo.info) {
          // Source assists - used for "scorer" calcs in player mode and all calcs in team mode

          const stat: Statistic = _.thru(
            (assistInfo.info as Record<string, Statistic>)[`source_${key}_ast`],
            (testStat) => {
              if (!_.isUndefined(testStat?.value)) {
                return testStat;
              } else {
                const retVal = ((assistInfo.info as Record<string, Statistic>)[
                  `source_${key}_ast`
                ] = {
                  value: 0,
                });
                return retVal;
              }
            }
          );
          if (!_.isUndefined(stat?.value)) {
            const weight =
              (stat.value * denominator + genericAssistSplit[index]!) /
              totalWeight;

            const missAdjsForShot = missAdjustments[key] || 0;

            const adjustment = (weight * missAdjsForShot) / (denominator || 1);
            if (_.isNil(stat.old_value)) {
              stat.old_value = stat.value; //(save original value)
            }
            stat.value += adjustment;
          }
        }

        // Target assists - used for passer calcs in player mode:

        if (playStyleType == "playsPct") {
          /** This code is currently run in aggregateToIndivTopLevelPlayStyles.buildAdjustedAssists, for reasons
           * explained in that function
           */
          const useTargetAssistApproxLaterOn = false;

          if (useTargetAssistApproxLaterOn) {
            const targetEfg = (assistInfo.info as Record<string, Statistic>)[
              `target_${key}_efg`
            ]?.value; //(note this should be increased because it's assisted eFGs - see useTargetAssistApproxLaterOn)
            const targetAstToAdj = (
              assistInfo.info as Record<string, Statistic>
            )[`target_${key}_ast`];
            if (!_.isNil(targetEfg) && targetAstToAdj) {
              const _3pMult = key == "3p" ? 1.5 : 1.0; //(want FG% since we just care about the number of misses)

              const rawStat = targetAstToAdj?.value || 0;
              const adjustedStat =
                playStyleType == "playsPct"
                  ? (rawStat * _3pMult) / targetEfg
                  : rawStat;
              if (_.isNil(targetAstToAdj.old_value)) {
                targetAstToAdj.old_value = targetAstToAdj.value; //(save original value)
              }
              targetAstToAdj.value = adjustedStat;
            }
          }
        }
      });
    });

    return mutableUnadjusted;
  }

  /** Converts a player-grouped assist network into a positional category grouped one
   *  Returns an array of stats for each of: ballhandler, guard, wing (ie size <= 3)
   *  (note that the interaction between this logic and the calling code in XxxPlayTypeDiagView is currently a bit tangled)
   * (if mainPlayer is undefined then is called for team calcs)
   */
  static buildPosCategoryAssistNetwork(
    playerAssistNetwork: Array<TargetAssistInfo>,
    rosterStatsByCode: RosterStatsByCode,
    mainPlayer: IndivStatSet | number | undefined
  ): Array<ScoredTargetAssistInfo> {
    // Build main player's positional category:
    // (this is just for injecting examples - if you don't want examples just set mainPlayer to undefined)
    const mainPlayerCats = !_.isNil(mainPlayer)
      ? _.isNumber(mainPlayer)
        ? [{ order: mainPlayer, score: 0 }]
        : _.orderBy(
            PlayTypeUtils.buildPosFamily(
              rosterStatsByCode[PlayTypeUtils.getCode(mainPlayer)]?.role ||
                rosterStatsByCode[PlayTypeUtils.getCode(mainPlayer)]
                  ?.posClass || //(this is its name from player leaderboard)
                mainPlayer.role ||
                "??",
              rosterStatsByCode[PlayTypeUtils.getCode(mainPlayer)]
                ?.posConfidences ||
                mainPlayer.posConfidences ||
                []
            ).flatMap((catScore, ix) => {
              return catScore > 0 ? [{ order: ix, score: catScore }] : [];
            }),
            ["score"],
            ["desc"]
          )
      : undefined;

    return _.chain(playerAssistNetwork)
      .flatMap((playerStats) => {
        const playerCode = playerStats.code!;
        const role =
          rosterStatsByCode[playerCode]?.role ||
          rosterStatsByCode[playerCode]?.posClass || //(this is its name from player leaderboard)
          "??";
        const posConfidence =
          rosterStatsByCode[playerCode]?.posConfidences || [];
        return PlayTypeUtils.buildPosFamily(
          role,
          posConfidence
        ).flatMap<ScoredTargetAssistInfo>((catScore, ix) => {
          return catScore > 0
            ? [
                {
                  info: {
                    ...playerStats,
                    order: ix,
                  },
                  order: ix,
                  title: undefined,
                  score: catScore,
                },
              ]
            : [];
        });
      })
      .concat([
        { order: 0, score: 0 },
        { order: 1, score: 0 },
        { order: 2, score: 0 },
      ])
      .groupBy((info) => info.order)
      .values()
      .map((infos) => {
        //(NOTE: infos includes the empty dummy entry that just ensures we have one obj for every position)
        const orderToUse = infos[0]!.order;
        const mutableObj = {
          order: orderToUse,
          score: 0.0,
          info: {
            order: orderToUse,
          },
        } as ScoredTargetAssistInfo;

        // Weighting inv vs shot type:
        const efgWeightInvsTarget = shotTypes.map((shotType) => {
          return (
            1.0 /
            (_.reduce(
              infos,
              (acc, statSet) =>
                acc +
                statSet.score *
                  (asStatSet(statSet)[`target_${shotType}_ast`]?.value || 0),
              0
            ) || 1)
          );
        });
        // Aggregate the different stats across the different player weights vs the category
        _.transform(
          infos,
          (acc, statSet) => {
            const maybeFill = (key: string, examples?: Array<string>) => {
              if (!asStatSet(acc)[key]) {
                asStatSet(acc)[key] = { value: 0, extraInfo: examples };
              }
            };
            // handle usages, (AST)
            targetSource.forEach((loc) => {
              const sourceNotTarget = loc == "source";
              const weight = statSet.score;

              // Handle misc sums:
              const miscStats = sourceNotTarget
                ? ["source_sf", "source_to"]
                : ["target_ast"];
              miscStats.forEach((statKey) => {
                const statVal = asStatSet(statSet)[statKey];
                if (statVal?.value) {
                  // (do nothing on 0)
                  maybeFill(statKey);
                  asStatSet(acc)[statKey].value! += weight * statVal.value;
                }
              });

              // Handle shot types
              shotTypes.forEach((shotType, ix) => {
                //(bit horrid but everything is reversed when doing pos vs pos calcs)
                const playTypeWayRound = _.isNumber(mainPlayer)
                  ? !sourceNotTarget
                  : sourceNotTarget;

                // Inject examples
                const playTypeExamples = mainPlayerCats
                  ? _.chain(mainPlayerCats)
                      .map((catInfo) => {
                        const exampleKey = playTypeWayRound
                          ? `${PosFamilyNames[catInfo.order!]}_${shotType}_${
                              PosFamilyNames[statSet.order!]
                            }`
                          : `${PosFamilyNames[statSet.order!]}_${shotType}_${
                              PosFamilyNames[catInfo.order!]
                            }`;

                        return (
                          PlayTypeUtils.playTypesByFamily[exampleKey]
                            ?.examples || []
                        );
                      })
                      .flatten()
                      .uniq()
                      .value()
                  : undefined;

                const statKey = `${loc}_${shotType}_ast`;
                const statVal = asStatSet(statSet)[statKey];

                if (statVal?.value || statVal?.old_value) {
                  // (do nothing on 0, unless it use to be non-zero but has been adjusted down)
                  maybeFill(statKey, playTypeExamples);
                  const newStat = asStatSet(acc)[statKey];
                  const weightedVal = weight * (statVal.value || 0);

                  // If we encounter any old_values then build it for the new stat also
                  if (!_.isNil(statVal.old_value)) {
                    if (_.isNil(newStat.old_value)) {
                      newStat.old_value = newStat.value;
                      //(Set the override for this in the "half court turnover" logic - not ideal)
                    }
                    newStat.old_value! += weight * statVal.old_value;
                  } else if (!_.isNil(newStat.old_value)) {
                    newStat.old_value! += weightedVal;
                  }
                  // Update the main value as a weighted average
                  newStat.value! += weightedVal;
                }
              });
            });

            // Handle weighted averages (eFG)
            shotTypes.forEach((shotType, ix) => {
              //TODO: weights are still wrong here in x-player case
              const weight = statSet.score;

              const statKey = `target_${shotType}_efg`;
              const statVal = asStatSet(statSet)[statKey];
              if (statVal?.value) {
                // (do nothing on 0)
                maybeFill(statKey);
                const eFgWeight =
                  (asStatSet(statSet)[`target_${shotType}_ast`]?.value || 0) *
                  efgWeightInvsTarget[ix]!;
                asStatSet(acc)[statKey].value! +=
                  weight * statVal.value * eFgWeight;
              }
            });
          },
          mutableObj
        );

        return mutableObj;
      })
      .orderBy(["order"], ["asc"])
      .value();
  }

  //////////////////////////////////////////////////////////////

  // Some utils

  static fetchIndivPlayTypes(
    playerCode: PlayerCode,
    playTypes: Set<TopLevelPlayType>,
    rosterStatsByCode: RosterStatsByCode,
    indivPlayTypes: TopLevelIndivPlayAnalysis
  ): Array<IndivPlayTypeInfo> {
    return PlayTypeUtils.fetchTopIndivPlayTypes(
      playTypes,
      rosterStatsByCode,
      { [playerCode]: indivPlayTypes },
      true
    );
  }

  /** Lists all individual contributions to the top level team play style */
  static fetchTopIndivPlayTypes(
    playTypes: Set<TopLevelPlayType>,
    rosterStatsByCode: RosterStatsByCode,
    indivPlayTypes: Record<PlayerCode, TopLevelIndivPlayAnalysis>,
    disableFilters: boolean = false
  ): Array<IndivPlayTypeInfo> {
    return _.chain(indivPlayTypes)
      .flatMap((playTypeAnalysis, playerCode) => {
        const indivStats = rosterStatsByCode[playerCode];

        if (indivStats) {
          const playTypeAggs = _.transform(
            Array.from(playTypes),
            (acc, playType) => {
              PlayTypeUtils.teamToIndivPlayTypes(playType).forEach(
                (indivPlayType) => {
                  const indivPlayTypeRadical =
                    PlayTypeUtils.truncateExtendedIndivPlayType(indivPlayType);
                  if (!acc[indivPlayTypeRadical]) {
                    acc[indivPlayTypeRadical] = {
                      code: playerCode,
                      teamPlayType: playType,
                      playType: indivPlayTypeRadical,
                      player: indivStats,
                      playStats: {
                        possPct: { value: 0 },
                        pts: { value: 0 },
                      },
                    };
                  }
                  const playStats = playTypeAnalysis[indivPlayType];
                  if (playStats) {
                    const currWeight =
                      acc[indivPlayTypeRadical]!.playStats.possPct.value!;
                    const newWeight = playStats.possPct?.value || 0;
                    const totalWeightInv = 1.0 / (currWeight + newWeight);
                    if (newWeight > 0) {
                      acc[indivPlayTypeRadical]!.playStats.pts.value! =
                        totalWeightInv *
                          currWeight *
                          acc[indivPlayTypeRadical]!.playStats.pts.value! +
                        totalWeightInv *
                          newWeight *
                          (playStats.pts?.value || 0);
                      acc[indivPlayTypeRadical]!.playStats.possPct.value! +=
                        newWeight;
                    }
                  }
                }
              );
            },
            {} as Record<TopLevelIndivPlayType, IndivPlayTypeInfo>
          );

          return _.values(playTypeAggs).filter(
            (pt) => (pt?.playStats?.possPct?.value || 0) >= 0.0005
          );
        } else {
          return [];
        }
      })
      .filter(
        (pt, ii) =>
          disableFilters ||
          ii < 10 ||
          (pt?.playStats?.possPct?.value || 0) >= 0.01
      )
      .sortBy((pt) => -(pt.playStats?.possPct?.value || 0))
      .value();
  }

  /** Convert from getTeamDefense response to the team defense that we process */
  static parseTeamDefenseResponse(
    jsonResp: any[]
  ): Record<
    string,
    { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
  > {
    const teamsStatsByTeam: Record<string, TeamStatSet> = _.chain(
      jsonResp?.[0]?.aggregations?.tri_filter?.buckets?.baseline?.opponents
        ?.buckets || []
    )
      .groupBy((t) => t["key"])
      .mapValues(
        //(convert from  team defense to opponent offense)
        (vv) => vv[0] || ({} as TeamStatSet)
        // Previously I was getting team defense not opponent offense, but the
        // stats weren't entirely identical (buglet!) so I switched to the slower but more
        // accurate opponent offense
        // _.mapKeys(vv[0] || ({} as TeamStatSet), (v, k) =>
        //   _.startsWith(k, "total_def_") ? `total_off_${k.substring(10)}` : k
        // ) as TeamStatSet
      )
      .value();

    const playerStatsByTeam: Record<string, Array<IndivStatSet>> = _.chain(
      jsonResp?.[1]?.aggregations?.tri_filter?.buckets?.baseline?.opponents
        ?.buckets || []
    )
      .groupBy((t) => t["key"])
      .mapValues((vv) => vv[0]?.player?.buckets || [])
      .value();

    return _.chain(teamsStatsByTeam)
      .toPairs()
      .transform((acc, kv) => {
        const team = kv[0];
        const teamStats = kv[1];
        const playerStats = playerStatsByTeam[team];
        if (playerStats) {
          acc[team] = {
            teamStats,
            playerStats,
          };
        }
      }, {} as Record<string, { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }>)
      .value();
  }

  /** Goes from all 5 position classes to a smaller/simple position family */
  private static buildPosFamily(
    pos: string,
    posConfidences: number[]
  ): [number, number, number] {
    return PlayTypeUtils.posToFamilyScore[pos] || [0, 1.0, 0];
    //TODO: this uses the raw numbers, which empiricially didn't work particularly well
    // eg for centers it tended to <<comment never finished, I think it was going to say it gave bigs too wing-like possessions>>
    // (one idea was to use the roster analysis to figure out which archetypes played where and then use the combined
    //  position + position-family to be more definite)
    // return PlayTypeUtils.posConfidenceToFamilyScore.map((scores: number[]) => {
    //   return _.sumBy(_.zip(scores, posClass), xy => xy[0]!*xy[1]!);
    // });
  }

  /** Builds a list of all the team-mate codes who assist or are assisted by the specified player */
  static buildPlayerAssistCodeList(player: IndivStatSet): string[] {
    return _.chain(targetSource)
      .flatMap((loc) => {
        return shotTypes.flatMap((key) => {
          return _.keys(player[`off_ast_${key}_${loc}`]?.value || {});
        });
      })
      .uniq()
      .value();
  }

  /** Adds example plays to the "extraInfo" of unassisted stats */
  static enrichUnassistedStats(
    mutableUnassistedStats: SourceAssistInfo,
    mainPlayer: IndivStatSet | number,
    rosterStatsByCode: RosterStatsByCode
  ): SourceAssistInfo {
    // Build main player's positional category:
    const mainPlayerCats = _.isNumber(mainPlayer)
      ? [{ order: mainPlayer, score: 0 }]
      : _.orderBy(
          PlayTypeUtils.buildPosFamily(
            rosterStatsByCode[PlayTypeUtils.getCode(mainPlayer)]?.role ||
              rosterStatsByCode[PlayTypeUtils.getCode(mainPlayer)]?.posClass || //(this is its name from player leaderboard)
              mainPlayer.role ||
              "??",
            rosterStatsByCode[PlayTypeUtils.getCode(mainPlayer)]
              ?.posConfidences ||
              mainPlayer.posConfidences ||
              []
          ).flatMap((catScore, ix) => {
            return catScore > 0 ? [{ order: ix, score: catScore }] : [];
          }),
          ["score"],
          ["desc"]
        );

    // handle usages, (AST)
    shotTypes.concat(["sf"]).forEach((shotType, ix) => {
      const statKey = shotType == "sf" ? `source_sf` : `source_${shotType}_ast`;

      // Inject examples
      const playTypeExamples = _.chain(mainPlayerCats)
        .map((catInfo) => {
          const exampleKey = `${PosFamilyNames[catInfo.order!]}_${shotType}`;

          return PlayTypeUtils.playTypesByFamily[exampleKey]?.examples || [];
        })
        .flatten()
        .uniq()
        .value();

      if ((mutableUnassistedStats as PureStatSet)[statKey]) {
        (mutableUnassistedStats as PureStatSet)[statKey].extraInfo =
          playTypeExamples;
      }
    });
    return mutableUnassistedStats; //(for chaining)
  }

  /** Adds example plays to the "extraInfo" of non-half-court stats */
  static enrichNonHalfCourtStats(
    mutableTransitionStats: SourceAssistInfo,
    mutableScrambleStats: SourceAssistInfo
  ) {
    _.forEach(mutableTransitionStats, (oval, okey) => {
      if (okey.startsWith("source_")) {
        (oval as Statistic).extraInfo = ["trans"];
      }
    });
    _.forEach(mutableScrambleStats, (oval, okey) => {
      if (okey.startsWith("source_")) {
        (oval as Statistic).extraInfo = ["scramble"];
      }
    });
  }

  /** Comes up with an approximate set of half-court stats */
  static convertAssistsToHalfCourtAssists(
    mutableAssistInfo: TargetAssistInfo[],
    nonHalfCourtInfoTrans: SourceAssistInfo,
    nonHalfCourtInfoScramble: SourceAssistInfo
  ) {
    // For target (assists - use for individual play type analysis) we don't have the shot types categorized
    // for scrambles / transition (TODO I should consider that) so we'll just estimate it
    const shotTypesPlusTarget = shotTypes.concat("target");
    const keyBuilder = (shotType: string) =>
      shotType == "target" ? "target_ast" : `source_${shotType}_ast`;
    _.map(shotTypesPlusTarget, (shotType) => {
      const nonHalfCourtInfoTransPct =
        (nonHalfCourtInfoTrans as PureStatSet)[keyBuilder(shotType)]?.value ||
        0;
      const nonHalfCourtInfoScramblePct =
        (nonHalfCourtInfoScramble as PureStatSet)[keyBuilder(shotType)]
          ?.value || 0;
      const nonHalfCourtInfoPct =
        nonHalfCourtInfoTransPct + nonHalfCourtInfoScramblePct;

      // console.log(
      //   `[*][${shotType}] Need to distribute [${nonHalfCourtInfoPct.toFixed(
      //     4
      //   )}](=[${nonHalfCourtInfoTransPct.toFixed(
      //     4
      //   )}]+[${nonHalfCourtInfoScramblePct.toFixed(4)}]) to:`,
      //   nonHalfCourtInfoTrans as PureStatSet,
      //   nonHalfCourtInfoScramble as PureStatSet
      // );

      const totalAssistedPct = _.chain(PosFamilyNames)
        .map((pos, ipos) => {
          //(use old_value when it exists since that is pre "missed shot adjustment")
          const stat = (mutableAssistInfo[ipos] as PureStatSet)?.[
            keyBuilder(shotType)
          ] || { value: 0, old_value: 0 };
          return _.isNumber(stat.old_value) ? stat.old_value : stat.value;
        })
        .sum()
        .value();

      const reductionPct =
        (totalAssistedPct - Math.min(nonHalfCourtInfoPct, totalAssistedPct)) /
        (totalAssistedPct || 1);

      // console.log(
      //   `[*][${shotType}] Approximate half-court assisted by keeping [${reductionPct.toFixed(
      //     2
      //   )}]%`
      // );

      _.map(PosFamilyNames, (pos, ipos) => {
        _.map(shotType == "target" ? shotTypes : [shotType], (subShotType) => {
          const assistKey =
            shotType == "target"
              ? `target_${subShotType}_ast`
              : keyBuilder(shotType);
          const maybeShotTypeAst =
            // (for mutableAssistInfo we _do_ have the target shot types, that's what we're trying to fix)
            (mutableAssistInfo[ipos] as PureStatSet)?.[assistKey];

          // console.log(
          //   `[${pos}][${shotType}][${pos}]: [${assistKey}][${(
          //     maybeShotTypeAst?.value || 0
          //   ).toFixed(4)}] (${_.keys(mutableAssistInfo[ipos])}))`
          // );

          if (_.isNumber(maybeShotTypeAst?.value)) {
            const astValueToUse = _.isNumber(maybeShotTypeAst?.old_value)
              ? maybeShotTypeAst?.old_value
              : maybeShotTypeAst.value;
            const adjustment = astValueToUse * (reductionPct - 1.0);
            maybeShotTypeAst.value += adjustment;
            if (_.isNumber(maybeShotTypeAst.old_value)) {
              //(ideally we'd preserve "old_value" and then add this to the overrides list but
              // it's too complicated so we'll just pretend this is the original value)
              maybeShotTypeAst.old_value += adjustment;
            }
          }
        });
      });
    });
  }

  /** Guess what happened when a TO occurred */
  static apportionHalfCourtTurnovers(
    pos: string,
    posIndex: number,
    immutableHalfCourtAssistInfo: Record<
      string,
      { assists: TargetAssistInfo[] }
    >,
    mutableHalfCourtAssistInfo: Record<string, { assists: TargetAssistInfo[] }>,
    mutableUnassisted: SourceAssistInfo,
    playerBreakdownMode: boolean
  ) {
    // If playerBreakdownMode is set then we send estimated TOs to me to target_)
    // (otherwise they all go to source_ since that is the only set of fields used in team breakdowns)

    // We take the % of half-court turnovers for each position group
    // and apportion it out in the following ratios:
    // unassisted rim: highest weight
    // (gap)
    // (unusued middle weight)
    // (gap)
    // "my" assists inside: lower weight
    // assists to "me" inside: same weight
    // "my" other assists: lower weight
    // assists to "me" on the perimeter: same weight
    // (3p/mid unassisted shot types do not get turnovers)
    const weights = [6.5, 4.5, 2, 1];

    const toPctToUse = mutableUnassisted.source_to?.value || 0;

    const adjStat = (stat: Statistic | undefined, adj: number) => {
      const delta = 0.0006; //(avoid adding any diag for such small changes)
      if (stat) {
        // As a "handy spot in the code" (ugh) sets the override explanation
        // for any half court misses that have previously been adjusted
        if (!_.isNil(stat.old_value) && !stat.override) {
          const existingAdj = (stat.value || 0) - (stat.old_value || 0);
          if (Math.abs(existingAdj) >= delta) {
            const existingAdjInfo = `Adjusted by [${(100 * existingAdj).toFixed(
              1
            )}] from uncategorized half-court misses, `;
            stat.override = existingAdjInfo;
          }
        }

        if (_.isNumber(stat?.value)) {
          stat.value = stat.value + adj;
        }

        if (adj >= delta) {
          if (!stat.override) {
            stat.override = "";
          }
          stat.override += `Adjusted by [${(100 * adj).toFixed(
            1
          )}] from [${pos}] TO% of [${(100 * toPctToUse).toFixed(1)}], `;
        }
      }
    };

    var totalWeight = 0;
    // (Since we're abusing adjStat to "close out" half court misses, we call it for UA 3P/mid shots which
    //  bypass the TO distribuion logic below)
    //TODO: wait ... why do UA shots bypass them but A don't?!
    adjStat(mutableUnassisted.source_mid_ast, 0.0);
    adjStat(mutableUnassisted.source_3p_ast, 0.0);

    // 2 Phases, 1 to collect weight, 1 to mutate stats
    [0, 1].forEach((phase) => {
      const unassistedAtTheRim =
        (mutableUnassisted.source_rim_ast?.value || 0) +
        0.5 * (mutableUnassisted.source_sf?.value || 0); //(including some % shooting fouls)
      const unassistedWeight = weights[0] * unassistedAtTheRim;
      if (phase == 0) totalWeight = totalWeight + unassistedWeight;
      if (phase == 1)
        adjStat(
          mutableUnassisted.source_rim_ast,
          (unassistedWeight * toPctToUse) / (totalWeight || 1)
        );

      // if (phase == 1 && toPctToUse > 0)
      //   console.log(
      //     `[${pos}][${posIndex}] (to%=[${toPctToUse.toFixed(
      //       3
      //     )}]): adj [unassisted] by [${unassistedWeight}] -> [${
      //       (toPctToUse * unassistedWeight) / totalWeight
      //     }] ([${totalWeight.toFixed(2)}])`
      //   );

      _.map(PosFamilyNames).map((otherPos, jpos) => {
        //(eg if "I'm" a PG and "other" is a C, then:
        // otherPosToMeAssists.source = C's assisted FGM from me (based on C's stats)
        // otherPosToMeAssists.target = assists from C to me (based on C's stats)
        // meToOtherPosAssists.source = my assisted FGM from C (based on my stats)
        // meToOtherPosAssists.target = assists from me to C (based on my stats)
        // In team mode, all parts of the matrix are filled in so it doesn't matter what you do
        // (ie X.src should == Y.target) BUT you can only write to source, target isn't used (to avoid double counting)
        // In player mode, only meToOtherPosAssists is available so need to handle src and target

        const otherPosToMeAssists =
          immutableHalfCourtAssistInfo[otherPos]!.assists[posIndex]!;
        const mutOtherPosToMeAssists =
          mutableHalfCourtAssistInfo[otherPos]!.assists[posIndex]!;
        const meToOtherPosAssists =
          immutableHalfCourtAssistInfo[pos]!.assists[jpos]!;
        const mutMeToOtherPosAssists =
          mutableHalfCourtAssistInfo[pos]!.assists[jpos]!;

        shotTypes.map((shotType) => {
          const readMyAssistedShots = (meToOtherPosAssists as PureStatSet)[
            `source_${shotType}_ast`
          ];
          const readMyAssists = playerBreakdownMode
            ? (meToOtherPosAssists as PureStatSet)[`target_${shotType}_ast`]
            : (otherPosToMeAssists as PureStatSet)[`source_${shotType}_ast`];

          const writeMyAssistedShots = (mutMeToOtherPosAssists as PureStatSet)[
            `source_${shotType}_ast`
          ];
          const writeMyAssists = playerBreakdownMode
            ? (mutMeToOtherPosAssists as PureStatSet)[`target_${shotType}_ast`]
            : (mutOtherPosToMeAssists as PureStatSet)[`source_${shotType}_ast`];

          const isInside = shotType == "rim";
          const targetIsBigBoost = jpos == 2 ? 1.5 : 1; //(passes to bigs relatively more lkely to result in TOs)
          const otherToMeAssistWeight =
            weights[isInside ? 2 : 3] *
            targetIsBigBoost *
            (readMyAssistedShots?.value || 0);
          if (phase == 0) totalWeight = totalWeight + otherToMeAssistWeight;
          if (phase == 1)
            adjStat(
              writeMyAssistedShots,
              (otherToMeAssistWeight * toPctToUse) / (totalWeight || 1)
            );

          // if (phase == 1 && toPctToUse > 0)
          //   console.log(
          //     `[${pos}][${posIndex}][${jpos}] (to%=[${toPctToUse.toFixed(
          //       3
          //     )}]): adj other->me [ast/${shotType}] by [${otherToMeAssistWeight}] -> [${
          //       (toPctToUse * otherToMeAssistWeight) / totalWeight
          //     }] ([${totalWeight.toFixed(2)}])`
          //   );

          const meToOtherAssistWeight =
            weights[isInside ? 2 : 3] *
            targetIsBigBoost *
            (readMyAssists?.value || 0);
          if (phase == 0) totalWeight = totalWeight + meToOtherAssistWeight;
          if (phase == 1)
            adjStat(
              writeMyAssists,
              (meToOtherAssistWeight * toPctToUse) / (totalWeight || 1)
            );

          // if (phase == 1 && toPctToUse > 0)
          //   console.log(
          //     `[${pos}][${posIndex}][${jpos}] (to%=[${toPctToUse.toFixed(
          //       3
          //     )}]): adj me->other [ast/${shotType}] by [${meToOtherAssistWeight}] -> [${
          //       (toPctToUse * meToOtherAssistWeight) / totalWeight
          //     }] ([${totalWeight.toFixed(2)}])`
          //   );
        });
      });
    });
  }

  /** Uncategorized TOs, for housekeeping purposes - half court, scramble, transition
   */
  static calcTeamHalfCourtTos(
    players: IndivStatSet[],
    teamStats: TeamStatSet
  ): [number, number, number] {
    //(7..half-court, 6..scramble/trans)

    const teamTotalTos = Math.max(
      0,
      (teamStats.total_off_to?.value || 0) -
        _.sumBy(players, (player) => player.total_off_to?.value || 0)
    );
    const teamScrambleTos = Math.max(
      0,
      (teamStats.total_off_scramble_to?.value || 0) -
        _.sumBy(players, (player) => player.total_off_scramble_to?.value || 0)
    );
    const teamTransitionTos = Math.max(
      0,
      (teamStats.total_off_trans_to?.value || 0) -
        _.sumBy(players, (player) => player.total_off_trans_to?.value || 0)
    );
    return [
      teamTotalTos - teamScrambleTos - teamTransitionTos,
      teamScrambleTos,
      teamTransitionTos,
    ];
  }

  /////////////////////////////////////////////////////

  // Different ways of represening play types

  static buildPlayTypesLookup = _.memoize(() => {
    return _.chain(PlayTypeUtils.playTypesByFamily)
      .values()
      .map((o) => {
        return [o.examples.join(":"), o.topLevel];
      })
      .concat([
        ["trans", { Transition: 1.0 } as Record<TopLevelPlayType, number>],
        ["scramble", { "Put-Back": 1.0 } as Record<TopLevelPlayType, number>],
      ])
      .fromPairs()
      .value() as Record<string, Record<TopLevelPlayType, number>>;
  });

  private static teamToIndivSrcPlayTypeMapping = (
    playType: TopLevelPlayType,
    extendedPlayType: boolean = false
  ): TopLevelIndivPlayType => {
    switch (playType) {
      case "Attack & Kick":
        return extendedPlayType
          ? "Perimeter Sniper (Rim Attack)"
          : "Perimeter Sniper";
      case "Post & Kick":
        return extendedPlayType
          ? "Perimeter Sniper (Post-Up)"
          : "Perimeter Sniper";
      default:
        return playType;
    }
  };
  private static teamToIndivTargetPlayTypeMapping = (
    playType: TopLevelPlayType,
    extendedPlayType: boolean = false
  ): TopLevelIndivPlayType => {
    switch (playType) {
      case "Backdoor Cut":
        return "Hits Cutter";
      case "Pick & Pop":
        return extendedPlayType ? "PnR Passer (Pick & Pop)" : "PnR Passer";
      case "Big Cut & Roll":
        return extendedPlayType ? "PnR Passer (Big Cut & Roll)" : "PnR Passer";
      // case "Post-Up":
      // (this is some old code, it's not currently possible to get a post-up pass, I count these as PnR)
      //   return "PnR Passer";
      default:
        return playType;
    }
  };

  private static truncateExtendedIndivPlayType = (
    extendedPlayType: TopLevelIndivPlayType
  ): TopLevelIndivPlayType => {
    switch (extendedPlayType) {
      case "Perimeter Sniper (Rim Attack)":
        return "Perimeter Sniper";
      case "Perimeter Sniper (Post-Up)":
        return "Perimeter Sniper";
      case "PnR Passer (Pick & Pop)":
        return "PnR Passer";
      case "PnR Passer (Big Cut & Roll)":
        return "PnR Passer";
      default:
        return extendedPlayType;
    }
  };

  private static teamToIndivPlayTypes = (
    playType: TopLevelPlayType
  ): TopLevelIndivPlayType[] => {
    switch (playType) {
      case "Attack & Kick":
        return ["Perimeter Sniper (Rim Attack)", playType];
      case "Post & Kick":
        return ["Perimeter Sniper (Post-Up)", playType];
      case "Backdoor Cut":
        return ["Hits Cutter", playType];
      case "Backdoor Cut":
        return ["Hits Cutter", playType];
      case "Pick & Pop":
        return ["PnR Passer (Pick & Pop)", playType];
      case "Big Cut & Roll":
        return ["PnR Passer (Big Cut & Roll)", playType];
      default:
        return [playType];
    }
  };

  /** PlayerFamily_ShotType_([source|target]_AssisterFamily)? */
  private static playTypesByFamily: Record<
    string,
    {
      source: string;
      examples: string[];
      topLevel: Record<TopLevelPlayType, number>;
    }
  > = {
    // 1] Ball handler:

    // 1.0] SF
    ballhandler_sf: {
      source: "Shooting Foul",
      examples: [
        "fouled driving to the rim",
        "fouled in the bonus",
        "fouled cutting",
      ],
      topLevel: { "Rim Attack": 0.8, "Backdoor Cut": 0.2 },
    },

    // 1.1] 3P

    ballhandler_3p: {
      source: "3P Unassisted",
      examples: [
        "dribble jumper off misc action",
        "off ball-screen",
        "dribble jumper off ISO",
      ],
      topLevel: { "Dribble Jumper": 1.0 },
    },
    ballhandler_3p_ballhandler: {
      source: "3P Assisted by a ballhandler",
      target: "Pass to ballhandler for 3P",
      examples: [
        "drive-and-kick",
        "hockey assist after defense collapses inside",
        "misc action",
      ],
      topLevel: { "Attack & Kick": 1.0 },
    },
    ballhandler_3p_wing: {
      source: "3P Assisted by a wing",
      target: "Pass to ballhandler for 3P",
      examples: [
        "slash-and-kick",
        "hockey assist after defense collapses inside",
        "misc action",
      ],
      topLevel: { "Attack & Kick": 1.0 },
    },
    ballhandler_3p_big: {
      source: "3P Assisted by frontcourt",
      target: "Pass to ballhandler for 3P",
      examples: ["kick-out after an ORB", "pass out of a post-up"],
      topLevel: { "Post & Kick": 1.0 },
    },

    // 1.2] mid

    ballhandler_mid: {
      source: "Mid Range Unassisted",
      examples: ["drive and pull-up off ball-screen or ISO", "misc action"],
      topLevel: { "Rim Attack": 0.6, "Mid-Range": 0.4 },
    },
    ballhandler_mid_ballhandler: {
      source: "Mid Range Assisted by ballhandler",
      target: "Pass to ballhandler for mid-range",
      examples: ["spread offense", "misc action"],
      topLevel: { "Mid-Range": 1.0 },
    },
    ballhandler_mid_wing: {
      source: "Mid Range Assisted by wing",
      target: "Pass to ballhandler for mid-range",
      examples: ["spread offense", "misc action"],
      topLevel: { "Mid-Range": 1.0 },
    },
    ballhandler_mid_big: {
      source: "Mid Range Assisted from frontcourt",
      target: "Pass to ballhandler for mid-range",
      examples: ["(usually sub-optimal) pass out of a post-up"],
      topLevel: { "Post & Kick": 1.0 },
    },

    // 1.3] rim

    ballhandler_rim: {
      source: "Drive Unassisted",
      examples: ["attacks the rim off pick-and-roll", "ISO"],
      topLevel: { "Rim Attack": 1.0 },
    },
    ballhandler_rim_ballhandler: {
      source: "Layup Assisted by ballhandler",
      target: "Pass to ballhandler for a layup",
      examples: ["cut"],
      topLevel: { "Backdoor Cut": 1.0 },
    },
    ballhandler_rim_wing: {
      source: "Layup Assisted by wing",
      target: "Pass to ballhandler for a layup",
      examples: ["cut"],
      topLevel: { "Backdoor Cut": 1.0 },
    },
    ballhandler_rim_big: {
      source: "Layup Assisted by frontcourt",
      target: "Pass to ballhandler for a layup",
      examples: ["cut"],
      topLevel: { "Backdoor Cut": 1.0 },
    },

    // 2] Wing:

    // 2.0] SF
    wing_sf: {
      source: "Shooting Foul",
      examples: [
        "fouled slashing to the rim",
        "fouled in the bonus",
        "fouled cutting",
      ],
      topLevel: { "Rim Attack": 0.8, "Backdoor Cut": 0.2 },
    },

    // 2.1] 3P

    wing_3p: {
      source: "3P Unassisted",
      examples: [
        "off ball-screen",
        "dribble jumper off misc action",
        "dribble jumper off ISO",
      ],
      topLevel: { "Dribble Jumper": 1.0 },
    },
    wing_3p_ballhandler: {
      source: "3P Assisted by a ballhandler",
      target: "Pass to wing for 3P",
      examples: [
        "drive-and-kick",
        "hockey assist after defense collapses inside",
        "misc action",
      ],
      topLevel: { "Attack & Kick": 1.0 },
    },
    wing_3p_wing: {
      source: "3P Assisted by a wing",
      target: "Pass to wing for 3P",
      examples: [
        "slash-and-kick",
        "hockey assist after defense collapses inside",
        "misc action",
      ],
      topLevel: { "Attack & Kick": 1.0 },
    },
    wing_3p_big: {
      source: "3P Assisted by frontcourt",
      target: "Pass to wing for 3P",
      examples: ["kick-out after an ORB", "pass out of a post-up"],
      topLevel: { "Post & Kick": 1.0 },
    },

    // 2.2] mid

    wing_mid: {
      source: "Mid Range Unassisted",
      examples: ["drive and pull-up off ball-screen or ISO", "misc action"],
      topLevel: { "Rim Attack": 0.6, "Mid-Range": 0.4 },
    },
    wing_mid_ballhandler: {
      source: "Mid Range Assisted by ballhandler",
      target: "Pass to wing for mid-range",
      examples: ["spread offense", "misc action", "zone buster"],
      topLevel: { "Mid-Range": 1.0 },
    },
    wing_mid_wing: {
      source: "Mid Range Assisted by wing",
      target: "Pass to wing for mid-range",
      examples: ["spread offense, misc action", "zone buster"],
      topLevel: { "Mid-Range": 1.0 },
    },
    wing_mid_big: {
      source: "Mid Range Assisted from frontcourt",
      target: "Pass to wing for mid-range",
      examples: ["(usually sub-optimal) pass out of a post-up"],
      topLevel: { "Post & Kick": 1.0 },
    },

    // 2.3] rim

    wing_rim: {
      source: "Drive Unassisted",
      examples: ["attacks the rim off pick-and-roll", "ISO"],
      topLevel: { "Rim Attack": 1.0 },
    },
    wing_rim_ballhandler: {
      source: "Layup Assisted by ballhandler",
      target: "Pass to wing for a layup",
      examples: ["cut"],
      topLevel: { "Backdoor Cut": 1.0 },
    },
    wing_rim_wing: {
      source: "Layup Assisted by wing",
      target: "Pass to wing for a layup",
      examples: ["cut"],
      topLevel: { "Backdoor Cut": 1.0 },
    },
    wing_rim_big: {
      source: "Layup Assisted by frontcourt",
      target: "Pass to wing for a layup",
      examples: ["cut"],
      topLevel: { "Backdoor Cut": 1.0 },
    },

    // 3] Frontcourt:

    // 2.0] SF
    big_sf: {
      source: "Shooting Foul",
      examples: [
        "fouled on a rebound",
        "fouled posting up",
        "fouled rolling",
        "fouled in the bonus",
        "fouled cutting",
      ],
      topLevel: { "Post-Up": 0.7, "Big Cut & Roll": 0.3 },
    },

    // 3.1] 3P

    big_3p: {
      source: "3P Unassisted",
      examples: [
        "dribble jumper off misc action",
        "dribble jumper off ISO",
        "off ball-screen",
      ],
      topLevel: { "Dribble Jumper": 1.0 },
    },
    big_3p_ballhandler: {
      source: "3P Assisted by a ballhandler",
      target: "Pass to frontcourt for 3P",
      examples: ["pick-and-pop", "misc action"],
      topLevel: { "Pick & Pop": 1.0 },
    },
    big_3p_wing: {
      source: "3P Assisted by a wing",
      target: "Pass to frontcourt for 3P",
      examples: ["pick-and-pop", "misc action"],
      topLevel: { "Pick & Pop": 1.0 },
    },
    big_3p_big: {
      source: "3P Assisted by frontcourt",
      target: "Pass to frontcourt for 3P",
      examples: ["kick-out after an ORB", "pass out of a post-up"],
      topLevel: { "Post & Kick": 1.0 },
    },

    // 3.2] mid

    big_mid: {
      source: "Mid Range Unassisted",
      examples: ["high post-up", "ISO", "misc action"],
      topLevel: { "Post-Up": 1.0 },
    },
    big_mid_ballhandler: {
      source: "Mid Range Assisted by ballhandler",
      target: "Pass to frontcourt for mid-range",
      examples: ["high post-up", "spread offense", "misc action"],
      topLevel: { "Post-Up": 1.0 },
    },
    big_mid_wing: {
      source: "Mid Range Assisted by wing",
      target: "Pass to frontcourt for mid-range",
      examples: ["high post-up", "spread offense", "misc action"],
      topLevel: { "Post-Up": 1.0 },
    },
    big_mid_big: {
      source: "Mid Range Assisted from frontcourt",
      target: "Pass to frontcourt for mid-range",
      examples: ["high-low action"],
      topLevel: { "High-Low": 1.0 },
    },

    // 3.3] rim

    big_rim: {
      source: "Layup Unassisted",
      examples: ["post-up", "ISO"],
      topLevel: { "Post-Up": 1.0 },
    },
    big_rim_ballhandler: {
      source: "Layup Assisted by ballhandler",
      target: "Pass to frontcourt for layup",
      examples: ["roll", "cut", "sometimes post-up"],
      topLevel: { "Big Cut & Roll": 1.0 },
    },
    big_rim_wing: {
      source: "Layup Assisted by wing",
      target: "Pass to frontcourt for layup",
      examples: ["roll", "cut", "sometimes post-up"],
      topLevel: { "Big Cut & Roll": 1.0 },
    },
    big_rim_big: {
      source: "Layup Assisted by frontcourt",
      target: "Pass to frontcourt for layup",
      examples: ["high-low action"],
      topLevel: { "High-Low": 0.8, "Big Cut & Roll": 0.2 },
    },
  } as Record<string, any>;
}

/** Util for console log */
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
