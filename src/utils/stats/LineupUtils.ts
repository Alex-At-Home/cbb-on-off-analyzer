// Lodash
import _ from "lodash";

import { TeamReportStatsModel } from "../../components/TeamReportStatsTable";
import { LineupStatsModel } from "../../components/LineupStatsTable";
import {
  StatModels,
  PureStatSet,
  PlayerCode,
  PlayerId,
  TeamStatSet,
  LineupStatSet,
  GameInfoStatSet,
} from "../StatModels";

//TODO: duration_mins and scramble/transition combos...

/** Output of LineupUtils.lineupToTeamReport:players */
type TeammatePossInfo = { off_poss: number; def_poss: number };

type OnOffLineupStatSet = LineupStatSet & {
  // Used to aggregate on/off lineups
  myLineups?: Array<OnOffLineupStatSet>;
  onLineup?: OnOffLineupStatSet;
  offLineups?: OnOffLineupStatSet;
  offLineupKeys?: Array<string>;
  lineupUsage?: Record<
    string,
    {
      poss?: number;
      keyArray?: Array<string>;
      overlap?: number;
    }
  >;
};

/** The complex object representing on/off info about each player in a roster */
export type PlayerOnOffStats = {
  playerId: PlayerId;
  playerCode: PlayerCode;
  teammates: Record<
    PlayerId,
    {
      on: TeammatePossInfo;
      off: TeammatePossInfo;
    }
  >;
  on: OnOffLineupStatSet;
  off: OnOffLineupStatSet;
  rapm?: OnOffLineupStatSet; //(optionally injected as part of RapmUtils calcs)
  replacement?: OnOffLineupStatSet;
};

/** Handles combining the statistics of different lineups */
export class LineupUtils {
  // Analysis of performance in this code:
  // 600ms-800s: lineupToTeamReport ... hotspots are ...
  // 1) map r/w access in weightedAvg (move to having lists of the fields with whatever context is required)
  // 2) regex in getShotTypeField (remove, see ), or at least switch to using strings)
  // 3) isComplementLineup (build/access map)
  // 4) the merge in mutableState constructor (add lineup as a separate field)
  // 5) combineReplacementOnOff (completeWeightedAvg, weightedAvg) (revisit once 1-4 are done)

  /** Adds some logs for the more complex replacement on/off cals */
  private static readonly debugReplacementOnOff = false;
  private static readonly debugReplacementOnOffPlayer = "PLAYER";
  private static readonly debugReplacementOnOffMinPoss = 30;

  /** Tidies up ugly name endings (see GameAnalysisUtils.namePrettifier - here
   *  we don't replace the "." because it would be too annoying when 2 players with dup codes
   * played together, and in the lineup leaderboard we don't know which names are duplicate)
   * TODO: but would be nice to unify this somewhat
   */
  static namePrettifier(name: PlayerCode) {
    if (name.length > 3) {
      return _.chain(name)
        .thru((n) => {
          // Step 1, tidy up end of names
          const endOfName = n.substring(3);
          return (
            n.substring(0, 3) +
            endOfName.replace(/([a-z]*)(?:([A-Z]|[-][A-Za-z]).*)/, "$1$2")
          );
        })
        .thru((n) => {
          //Step 2: tidy up hyphens
          const possibleHyphen = n.length - 2;
          if (n.charAt(possibleHyphen) == "-") {
            return (
              n.substring(0, possibleHyphen + 1) +
              n.charAt(possibleHyphen + 1).toUpperCase()
            );
          } else if (n.charAt(possibleHyphen + 1) == "-") {
            return n.substring(0, possibleHyphen + 1);
          } else return n;
        })
        .value();
    } else return name;
  }

  /**
   * Combines all lineups into a single team stat, ignoring discarded fields
   * TODO: for individual RAPM calcs, only actually need to do this for a couple of fields, can
   *       save a lot of CPU cycles
   */
  static calculateAggregatedLineupStats(
    lineups: Array<LineupStatSet>
  ): LineupStatSet {
    const teamInfo = _.chain(lineups || [])
      .transform(
        (acc, lineup) => {
          if (!lineup.rapmRemove) {
            LineupUtils.weightedAvg(acc, lineup);
          } else {
            //(the !rapmRemove lineups get incorporated below)
            LineupUtils.weightedAvg(acc.all_lineups!, lineup);
          }
        },
        {
          ...StatModels.emptyLineup(),
          all_lineups: StatModels.emptyLineup(),
        } as LineupStatSet
      )
      .value();
    LineupUtils.completeWeightedAvg(teamInfo);

    if (!_.isEmpty(teamInfo.all_lineups)) {
      //(TODO: only actually need to do this for _poss and _adj_ppp, can save some CPU cycles)
      LineupUtils.weightedAvg(teamInfo.all_lineups!, teamInfo);
      LineupUtils.completeWeightedAvg(teamInfo.all_lineups!);
    }

    // Rebuild net margin since aggregated version won't be quite right:
    LineupUtils.buildEfficiencyMargins(teamInfo, "value");
    if (!_.isNil(teamInfo?.off_ppp?.old_value)) {
      //(luck adjusted mode)
      LineupUtils.buildEfficiencyMargins(teamInfo, "old_value");
    }
    //(don't bother for "all_lineups" since off_net is not used in any stats)

    return teamInfo;
  }

  /** Builds the raw and adjusted efficiency margins */
  static buildEfficiencyMargins(
    mutableStatSet: TeamStatSet | LineupStatSet,
    keyOverride?: "old_value" | "value"
  ) {
    // Add margins:
    const nonLuckKey =
      keyOverride ||
      (!_.isNil(mutableStatSet?.off_ppp?.old_value) ? "old_value" : "value");

    if (mutableStatSet?.off_adj_ppp && mutableStatSet?.def_adj_ppp) {
      const value =
        (mutableStatSet?.off_adj_ppp?.[nonLuckKey] || 0) -
        (mutableStatSet?.def_adj_ppp?.[nonLuckKey] || 0);
      mutableStatSet.off_net = keyOverride
        ? {
            ...mutableStatSet.off_net,
            [keyOverride]: value,
          }
        : {
            value: value,
          };
    }
    // def_net is off_raw_net
    //TODO use correct field and copy across as part of enrichment
    if (mutableStatSet?.off_ppp && mutableStatSet?.def_ppp) {
      const value =
        (mutableStatSet?.off_ppp?.[nonLuckKey] || 0) -
        (mutableStatSet?.def_ppp?.[nonLuckKey] || 0);
      mutableStatSet.off_raw_net = keyOverride
        ? {
            ...mutableStatSet.off_raw_net,
            [keyOverride]: value,
          }
        : {
            value: value,
          };
    }
  }

  /** Take two statSet eg team stats and straight diffs them with no clever weighting or anything*/
  static getStatsDiff(
    statSet1: TeamStatSet,
    statSet2: TeamStatSet,
    offTitle: string,
    defTitle?: string
  ): TeamStatSet {
    // (discard some of the enriched info)
    const statsDiff: PureStatSet = _.chain(statSet1)
      .toPairs()
      .map((kv) => {
        const key = kv[0];
        const startVal = kv[1] as any;
        const toSub = statSet2[key];
        if (_.isNil(toSub?.value) || _.isNil(startVal?.value)) {
          return [key, undefined];
        } else {
          const diffStat = {
            value: startVal.value - toSub.value,
            old_value:
              _.isNil(toSub?.old_value) || _.isNil(startVal.old_value)
                ? undefined
                : startVal.old_value - toSub.old_value,
            override: startVal.override,
          };
          return [key, diffStat];
        }
      })
      .fromPairs()
      .value();
    return {
      ...statsDiff,
      off_title: offTitle,
      def_title: defTitle,
    } as TeamStatSet;
  }

  /** Parses the terms/histogram aggregation giving a bit of info about each lineup's game */
  static getGameInfo(
    gameInfo: GameInfoStatSet,
    mutableOpponents?: Record<string, GameInfoStatSet>
  ): Array<GameInfoStatSet> {
    return _.sortBy(
      (gameInfo?.buckets || []).flatMap((bb: any) => {
        const opponent = _.drop(bb?.key || "unknown", 2);
        return (bb?.game_info?.buckets || [])
          .filter((b: any) => {
            //Ignore any buckets of size 0:
            return (
              b?.num_off_poss?.value || //(lineup version)
              b?.off_poss?.value || //(game/player version)
              0 ||
              b?.num_def_poss?.value || //(lineup/player version)
              b?.def_poss?.value || //(game/player version)
              0
            );
          })
          .map((b: any) => {
            const opponent = bb?.key || "?:Unknown";
            const date = (b?.key_as_string || "????-??-??").substring(0, 10);
            const maybe_end_of_game_info =
              b?.end_of_game?.hits?.hits?.[0]?._source?.score_info?.end;
            if (mutableOpponents)
              mutableOpponents[`${date} ${opponent}`] = {
                opponent: opponent,
                date: date,
                num_off_poss: 0,
                num_def_poss: 0,
                num_pts_for: 0,
                num_pts_against: 0,
              };
            return {
              opponent: opponent,
              date: date,
              num_off_poss: b?.num_off_poss?.value || b?.off_poss?.value || 0,
              num_def_poss: b?.num_def_poss?.value || b?.def_poss?.value || 0,
              // These are only available for the lineup version
              num_pts_for:
                b?.num_pts_for?.value || maybe_end_of_game_info?.scored,
              num_pts_against:
                b?.num_pts_against?.value || maybe_end_of_game_info?.allowed,
            };
          });
      }),
      ["date"]
    );
  }

  //TODO: there is a problem with the dates here, eg the last poss of the Neb game is listed as:
  //           "date" : "2021-02-18T17:39:15.889-05:00",
  // which is out by one day .. not clear if the error is in my parser or in the data itself

  /** Builds on/off info out of lineups */
  static lineupToTeamReport(
    lineupReport: LineupStatsModel,
    incReplacement: boolean = false,
    regressDiffs: number = 0,
    repOnOffDiagMode: number = 0
  ): TeamReportStatsModel {
    const getPlayerSet = (lineup: LineupStatSet) => {
      const retVal: Record<PlayerId, PlayerCode> = _.chain(
        lineup?.players_array?.hits?.hits?.[0]?._source?.players || []
      )
        .map((v) => [v.id, v.code])
        .fromPairs()
        .value();
      return retVal;
    };

    const allPlayersSet: Record<PlayerId, PlayerCode> = _.chain(
      lineupReport.lineups || []
    )
      .reduce((acc: Record<PlayerId, PlayerCode>, lineup: LineupStatSet) => {
        delete lineup.rapmRemove; //(ugly hack/coupling with RAPM utils to ensure no state is preserved)
        return _.mergeWith(acc, getPlayerSet(lineup));
      }, {} as Record<PlayerId, PlayerCode>)
      .value();

    const mutableState: TeamReportStatsModel = {
      playerMap: _.invert(allPlayersSet), //(code -> id)
      players: _.toPairs(allPlayersSet).map((playerIdCode) => {
        const playerId = playerIdCode[0];
        const playerCode = playerIdCode[1];
        return {
          playerId: playerId,
          playerCode: playerCode,
          teammates: _.chain(allPlayersSet)
            .keys()
            .map((player) => [
              player,
              {
                on: { off_poss: 0, def_poss: 0 },
                off: { off_poss: 0, def_poss: 0 },
              },
            ])
            .fromPairs()
            .value(),
          on: {
            key: `'On' ${playerId}`,
          } as OnOffLineupStatSet,
          off: {
            key: `'Off' ${playerId}`,
          } as OnOffLineupStatSet,
          replacement: incReplacement
            ? ({
                key: `'r:On-Off' ${playerId}`,
                lineupUsage: {},
                myLineups: _.chain(lineupReport.lineups || [])
                  .filter((lineup) => {
                    const playersSet = getPlayerSet(lineup);
                    return (
                      playersSet.hasOwnProperty(playerId) && lineup.key != ""
                    ); //(workaround for #53 pending fix)
                  })
                  .map((lineup) => {
                    return _.assign(
                      {
                        offLineups: StatModels.emptyLineup(),
                        offLineupKeys: [],
                        onLineup: StatModels.emptyLineup(),
                      },
                      lineup
                    ) as OnOffLineupStatSet;
                    //(copies lineup and adds empty offLineups/offLineupList/onLineup)
                  })
                  .value(),
              } as OnOffLineupStatSet)
            : undefined,
        };
      }),
      error_code: lineupReport.error_code,
    };

    _.chain(lineupReport.lineups || [])
      .transform((acc, lineup) => {
        if (lineup.key == "") {
          //(workaround for #53 pending fix)
          return;
        }
        const playersSet = getPlayerSet(lineup);

        _.chain(acc.players)
          .forEach((playerObj) => {
            if (playersSet.hasOwnProperty(playerObj.playerId)) {
              //ON!
              LineupUtils.weightedAvg(playerObj.on, lineup);
              // Lineup composition:
              _.chain(playersSet)
                .keys()
                .forEach((player) =>
                  LineupUtils.updateLineupComposition(
                    playerObj.teammates[player]?.on,
                    player,
                    lineup
                  )
                )
                .value();
            } else {
              //OFF!
              LineupUtils.weightedAvg(playerObj.off, lineup);
              // Lineup composition:
              _.chain(playersSet)
                .keys()
                .forEach((player) =>
                  LineupUtils.updateLineupComposition(
                    playerObj.teammates[player]?.off,
                    player,
                    lineup
                  )
                )
                .value();

              if (incReplacement) {
                _.chain(playerObj.replacement?.myLineups || [])
                  .filter((onLineup) => {
                    const isComplement = LineupUtils.isComplementLineup(
                      playerObj.playerId,
                      onLineup,
                      lineup
                    );
                    return isComplement;
                  })
                  .forEach((onLineup) => {
                    if (repOnOffDiagMode > 0) {
                      if (onLineup.offLineupKeys)
                        onLineup.offLineupKeys.push(lineup.key);
                      if (
                        !playerObj.replacement?.lineupUsage?.hasOwnProperty(
                          lineup.key
                        )
                      ) {
                        playerObj.replacement!.lineupUsage![lineup.key] = {
                          poss: lineup?.off_poss?.value || 0,
                          keyArray: lineup.key.split("_"),
                          overlap: 1,
                        };
                      } else {
                        const tempObj =
                          playerObj.replacement?.lineupUsage?.[lineup.key];
                        if (tempObj && tempObj.overlap) tempObj.overlap += 1;
                      }
                    }
                    if (onLineup.offLineups)
                      LineupUtils.weightedAvg(onLineup.offLineups, lineup);
                  })
                  .value();
              }
            }
          })
          .value();
      }, mutableState)
      .value();

    // Finish off the weighted averages:

    mutableState.players = _.chain(mutableState.players)
      .map((playerObj) => {
        if (playerObj.on.hasOwnProperty("off_poss")) {
          LineupUtils.completeWeightedAvg(playerObj.on);
          if (!playerObj.off.hasOwnProperty("off_poss")) {
            LineupUtils.copyAndZero(playerObj.off, playerObj.on);
          }
        }
        if (playerObj.off.hasOwnProperty("off_poss")) {
          LineupUtils.completeWeightedAvg(playerObj.off);
        }
        if (incReplacement && playerObj.replacement) {
          LineupUtils.combineReplacementOnOff(
            playerObj.replacement,
            _.keys(playerObj.on),
            regressDiffs,
            repOnOffDiagMode
          );
        }
        return playerObj; // ('ON' exists by construction)
      })
      .value();
    return mutableState;
  }

  private static readonly ignoreFieldSet = {
    //or anything that starts with total_
    key: true,
    players_array: true,
    doc_count: true,
    //(replacement on/off vals:)
    offLineups: true,
    offLineupKeys: true,
    onLineup: true,
    // Game info, handled seoarately:
    game_info: true,
    // Removed lineups
    removed: true,
  };
  private static readonly sumFieldSet = {
    off_poss: true,
    def_poss: true,
    duration_mins: true,
  };

  /** Updates lineup info - this is just needed to determine if a player should be included in the list */
  private static updateLineupComposition(
    mutableTeammateInfo: TeammatePossInfo | undefined,
    player: string,
    lineupInfo: LineupStatSet
  ) {
    if (mutableTeammateInfo) {
      mutableTeammateInfo.off_poss += lineupInfo.off_poss?.value || 0;
      mutableTeammateInfo.def_poss += lineupInfo.def_poss?.value || 0;
    }
  }

  /** For scramble and transition plays we recalculate the off/def poss from the totals
   *  otherwise, because of the "complex ORB" term in commonLineupAggregations.`total_${dstPrefix}_${typePrefix}poss`
   *  the numbers end up too different. The source of truth is considered to be commonLineupAggregations
   *  See also DerivedStatsUtils.buildHalfCourtStats
   */
  private static recalculatePlayTypePoss(mutableStats: LineupStatSet) {
    // Written this weird way to keep the code as similar as possible
    [
      ["off", "def"],
      ["def", "off"],
    ].forEach((offDef) => {
      const [dstPrefix, oppoDstPrefix] = offDef;
      ["trans_", "scramble_"].forEach((typePrefix) => {
        const paramKeys = {
          fga: `total_${dstPrefix}_${typePrefix}fga`,
          fgm: `total_${dstPrefix}_${typePrefix}fgm`,
          fta: `total_${dstPrefix}_${typePrefix}fta`,
          to: `total_${dstPrefix}_${typePrefix}to`,

          var_orb: `total_${dstPrefix}_orb`,
          var_drb: `total_${oppoDstPrefix}_drb`,
        };
        const params = _.chain(paramKeys)
          .toPairs()
          .map((kv) => [kv[0], mutableStats[kv[1]]?.value || 0])
          .fromPairs()
          .value();

        const fgM = params.fga - params.fgm;
        const rebound_pct =
          params.var_orb > 0
            ? (1.0 * params.var_orb) / (params.var_orb + params.var_drb)
            : 0.0;
        const poss =
          params.fgm +
          (1.0 - rebound_pct) * fgM +
          0.475 * params.fta +
          params.to;

        mutableStats[`total_${dstPrefix}_${typePrefix}poss`] = {
          value: poss,
        };
        mutableStats[`${dstPrefix}_${typePrefix}ppp`] = {
          value:
            (100 *
              (mutableStats[`total_${dstPrefix}_${typePrefix}pts`]?.value ||
                0)) /
            (poss || 1),
        };
      });
    });
  }

  /** For diffs we'll regress the values by approx 1000 possessions */
  private static regressionWeights = (regress: number, poss: number) => {
    const usePoss = regress < 0 ? _.max([0, -regress - poss]) || 0 : regress;
    return {
      poss: usePoss,
      orb: 0.4 * usePoss, //(eg 50% of fga are missed)
      ast: 0.2 * usePoss, //(50% of FGM, 50% of FGA)
      fga: 0.8 * usePoss, //(eg 20% end in TOs/FTs)
      fta: 0.1 * usePoss, //(10% = 50% of the 20% are FT)
    };
  };

  /** Get the weights as a function of the key type (except for shot types) */
  private static getSimpleWeights(
    obj: LineupStatSet,
    defaultVal: number,
    regressDiffs: number = 0
  ) {
    const offRegress = LineupUtils.regressionWeights(
      regressDiffs,
      obj.off_poss?.value || defaultVal
    );
    const defRegress = LineupUtils.regressionWeights(
      regressDiffs,
      obj.def_poss?.value || defaultVal
    );

    // ppp, adj_opp (opposite)
    const ppp_totals = {
      off_ppp: offRegress.poss + (obj.off_poss?.value || defaultVal),
      def_ppp: defRegress.poss + (obj.def_poss?.value || defaultVal),
      off_to: offRegress.poss + (obj.off_poss?.value || defaultVal),
      def_to: defRegress.poss + (obj.def_poss?.value || defaultVal),
      off_adj_opp: offRegress.poss + (obj.def_poss?.value || defaultVal),
      def_adj_opp: defRegress.poss + (obj.off_poss?.value || defaultVal),
      off_adj_ppp: offRegress.poss + (obj.off_poss?.value || defaultVal),
      def_adj_ppp: defRegress.poss + (obj.def_poss?.value || defaultVal),
    };
    // all the shot type %s (not rates, which use FGA):
    // (see totalShotTypeKey below)
    // ORBs
    const orb_totals = {
      off_orb:
        offRegress.orb +
        (obj.total_off_orb?.value || defaultVal) +
        (obj.total_def_drb?.value || defaultVal),
      def_orb:
        defRegress.orb +
        (obj.total_def_orb?.value || defaultVal) +
        (obj.total_off_drb?.value || defaultVal),
    };
    // Assists:
    const offAst = offRegress.ast + (obj.total_off_assist?.value || defaultVal);
    const defAst = defRegress.ast + (obj.total_def_assist?.value || defaultVal);
    const ast_totals = {
      off_ast_3p: offAst,
      off_ast_mid: offAst,
      off_ast_rim: offAst,
      def_ast_3p: defAst,
      def_ast_mid: defAst,
      def_ast_rim: defAst,
    };
    // everything else
    const fga_totals = {
      off: offRegress.fga + (obj.total_off_fga?.value || defaultVal),
      def: defRegress.fga + (obj.total_def_fga?.value || defaultVal),
    };
    const fta_totals = {
      off_ft: offRegress.fta + (obj.total_off_fta?.value || defaultVal),
      def_ft: defRegress.fta + (obj.total_def_fta?.value || defaultVal),
    };
    // For transition and scramble playes, just do ppp for now
    return {
      ppp_totals: ppp_totals,
      orb_totals: orb_totals,
      ast_totals: ast_totals,
      fga_totals: fga_totals,
      fta_totals: fta_totals,
      regress: {
        off: offRegress,
        def: defRegress,
      },
    };
  }

  /** For all the various shot and assist type %s, get the corresponding total to use as a weight */
  private static getShotTypeField(key: string): string | undefined {
    const matchInfo = /^(off|def)_([23][a-z]*[^_r]+)(_ast)?$/.exec(key); //ie % only, not rates
    return matchInfo
      ? matchInfo[3]
        ? `total_${matchInfo[1]}_${matchInfo[2]}_made` //(assists)
        : `total_${matchInfo[1]}_${matchInfo[2]}_attempts` //(shots)
      : undefined;
  }

  /** Combines the per-lineup objects into a mutable aggregator */
  private static weightedAvg(mutableAcc: LineupStatSet, obj: LineupStatSet) {
    const weights = LineupUtils.getSimpleWeights(obj, 0);
    _.chain(obj)
      .toPairs()
      .forEach((keyVal) => {
        const key = keyVal[0];
        if (!LineupUtils.ignoreFieldSet.hasOwnProperty(key)) {
          const val = keyVal[1]?.value || 0;
          const oldVal = keyVal[1]?.old_value || 0; //(used in luck adjustment)
          const oldValOverride = keyVal[1]?.override;
          // all the shot type stats:
          const totalShotTypeKey: string | undefined =
            LineupUtils.getShotTypeField(key);

          if (!mutableAcc.hasOwnProperty(key)) {
            //(init if necessary)
            mutableAcc[key] = { value: 0 };
            if (oldValOverride) {
              //(luck adjustment)
              mutableAcc[key].old_value = 0;
              mutableAcc[key].override = oldValOverride;
            }
          } else if (oldValOverride && !mutableAcc[key].override) {
            //(was init'd without override)
            mutableAcc[key].old_value = 0;
            mutableAcc[key].override = oldValOverride;
          }
          if (totalShotTypeKey) {
            mutableAcc[key].value! += val * (obj[totalShotTypeKey]?.value || 0);
            if (oldValOverride) {
              mutableAcc[key].old_value! +=
                oldVal * (obj[totalShotTypeKey]?.value || 0);
            }
          } else if (weights.ppp_totals.hasOwnProperty(key)) {
            mutableAcc[key].value! += val * (weights.ppp_totals as any)[key];
            if (oldValOverride) {
              mutableAcc[key].old_value! +=
                oldVal * (weights.ppp_totals as any)[key];
            }
          } else if (weights.orb_totals.hasOwnProperty(key)) {
            mutableAcc[key].value! += val * (weights.orb_totals as any)[key];
            //(no luck adjustment currently)
          } else if (weights.fta_totals.hasOwnProperty(key)) {
            mutableAcc[key].value! += val * (weights.fta_totals as any)[key];
            //(no luck adjustment currently)
          } else if (weights.ast_totals.hasOwnProperty(key)) {
            mutableAcc[key].value! += val * (weights.ast_totals as any)[key];
            //(no luck adjustment currently)
          } else if (
            _.startsWith(key, "total_") ||
            LineupUtils.sumFieldSet.hasOwnProperty(key)
          ) {
            mutableAcc[key].value! += val;
            //(no luck adjustment currently)
            //(note includes total_X_(trans|scramble)_poss, which is recalc'd by recalculatePlayTypePoss)
          } else if (
            _.startsWith(key, "off_trans_") ||
            _.startsWith(key, "def_trans_")
          ) {
            // Ignore for now (ppp handled by recalculatePlayTypePoss)
          } else if (
            _.startsWith(key, "off_scramble_") ||
            _.startsWith(key, "def_scramble_")
          ) {
            // Ignore for now (ppp handled by recalculatePlayTypePoss)
          } else if (_.startsWith(key, "off_")) {
            // everything else if off/def FGA
            mutableAcc[key].value! += val * weights.fga_totals.off;
            if (oldValOverride) {
              mutableAcc[key].old_value! += oldVal * weights.fga_totals.off;
            }
          } else if (_.startsWith(key, "def_")) {
            mutableAcc[key].value! += val * weights.fga_totals.def;
            if (oldValOverride) {
              mutableAcc[key].old_value! += oldVal * weights.fga_totals.def;
            }
          }
        } else if (key == "game_info") {
          const gameInfo = keyVal[1];
          const zeroOppoInfo = {
            num_pts_for: 0,
            num_pts_against: 0,
            num_off_poss: 0,
            num_def_poss: 0,
          };
          const accGameInfo = mutableAcc.game_info || ({} as any);
          mutableAcc.game_info = accGameInfo;

          const newGameInfo = LineupUtils.getGameInfo(gameInfo || []);
          newGameInfo.forEach((oppoInfo) => {
            const key = `${oppoInfo.date} ${oppoInfo.opponent}`;
            const currOppoInfo = accGameInfo[key] || {
              opponent: oppoInfo.opponent,
              date: oppoInfo.date,
              ...zeroOppoInfo,
            };
            _.keys(currOppoInfo).forEach((key) => {
              if (_.startsWith(key, "num_"))
                currOppoInfo[key] += oppoInfo[key] || 0;
            });
            accGameInfo[key] = currOppoInfo;
          });
        }
      })
      .value();
  }
  /** Completes the mutable aggregator by dividing by the sum of its weights*/
  private static completeWeightedAvg(
    mutableAcc: LineupStatSet,
    harmonicWeighting: boolean = false,
    regressDiffs: number = 0
  ) {
    const weights = LineupUtils.getSimpleWeights(mutableAcc, 1, regressDiffs);

    // Trans and scramble ppp handled differently"
    if (!harmonicWeighting) LineupUtils.recalculatePlayTypePoss(mutableAcc);

    _.chain(mutableAcc)
      .toPairs()
      .forEach((keyVal) => {
        const key = keyVal[0];
        // all the shot type stats:
        const totalShotTypeKey: string | undefined =
          LineupUtils.getShotTypeField(key);
        if (!LineupUtils.ignoreFieldSet.hasOwnProperty(key)) {
          const val = keyVal[1]?.value || 0;
          const oldVal = keyVal[1]?.old_value || 0;
          const oldValOverride = keyVal[1]?.override || 0;

          if (totalShotTypeKey) {
            const offOrDefWeight = _.startsWith(key, "off_")
              ? weights.regress.off.fga
              : weights.regress.def.fga;
            //(3P, 2P mid, 2P rim == 1/3rd each, 2p == 2p rim + 2p mid so 2/3s)
            const adjRegWeight = _.endsWith(key, "2p")
              ? (offOrDefWeight * 2.0) / 3
              : offOrDefWeight / 3;

            mutableAcc[key].value =
              (1.0 * val) /
              (adjRegWeight + (mutableAcc[totalShotTypeKey]?.value || 0) || 1);
            if (oldValOverride) {
              mutableAcc[key].old_value =
                (1.0 * oldVal) /
                (adjRegWeight + (mutableAcc[totalShotTypeKey]?.value || 0) ||
                  1);
            }
          } else if (weights.ppp_totals.hasOwnProperty(key)) {
            mutableAcc[key].value =
              (1.0 * val) / (weights.ppp_totals as any)[key];
            if (oldValOverride) {
              mutableAcc[key].old_value =
                (1.0 * oldVal) / (weights.ppp_totals as any)[key];
            }
          } else if (weights.orb_totals.hasOwnProperty(key)) {
            mutableAcc[key].value =
              (1.0 * val) / (weights.orb_totals as any)[key];
            // (no luck adjustment for these stats)
          } else if (weights.fta_totals.hasOwnProperty(key)) {
            mutableAcc[key].value =
              (1.0 * val) / (weights.fta_totals as any)[key];
            // (no luck adjustment for these stats)
          } else if (weights.ast_totals.hasOwnProperty(key)) {
            mutableAcc[key].value =
              (1.0 * val) / (weights.ast_totals as any)[key];
            // (no luck adjustment for these stats)
          } else if (
            _.startsWith(key, "total_") ||
            LineupUtils.sumFieldSet.hasOwnProperty(key)
          ) {
            //(nothing to do)
            //(note includes total_X_(trans|scramble)_poss, which is recalc'd by recalculatePlayTypePoss)
          } else if (key == "off_ftr") {
            // FTR are special case because you can have a FT but 0 FGA
            if (harmonicWeighting) {
              mutableAcc[key].value = (1.0 * val) / weights.fga_totals.off;
            } else {
              mutableAcc[key].value =
                (1.0 * (mutableAcc.total_off_fta?.value || 0.0)) /
                weights.fga_totals.off;
            }
            // (no luck adjustment for these stats)
          } else if (key == "def_ftr") {
            if (harmonicWeighting) {
              mutableAcc[key].value = (1.0 * val) / weights.fga_totals.def;
            } else {
              mutableAcc[key].value =
                (1.0 * (mutableAcc.total_def_fta?.value || 0.0)) /
                weights.fga_totals.def;
            }
            // (no luck adjustment for these stats)
          } else if (
            _.startsWith(key, "off_trans_") ||
            _.startsWith(key, "def_trans_")
          ) {
            // Ignore for now (ppp handled by recalculatePlayTypePoss, above)
          } else if (
            _.startsWith(key, "off_scramble_") ||
            _.startsWith(key, "def_scramble_")
          ) {
            // Ignore for now (ppp handled by recalculatePlayTypePoss, above)
          } else if (_.startsWith(key, "off_")) {
            // everything else if off/def FGA
            mutableAcc[key].value = (1.0 * val) / weights.fga_totals.off;
            if (oldValOverride) {
              mutableAcc[key].old_value =
                (1.0 * oldVal) / weights.fga_totals.off;
            }
          } else if (_.startsWith(key, "def_")) {
            mutableAcc[key].value = (1.0 * val) / weights.fga_totals.def;
            if (oldValOverride) {
              mutableAcc[key].old_value =
                (1.0 * oldVal) / weights.fga_totals.def;
            }
          }
        } else if (key == "game_info") {
          // Switch from an associative array to a real one
          mutableAcc[key] = _.values(
            (mutableAcc[key] || {}) as GameInfoStatSet
          );
        }
      })
      .value();
  }

  /** Builds an empty object (all fields 0) */
  private static copyAndZero(
    mutableToZero: LineupStatSet,
    from: LineupStatSet
  ) {
    _.chain(from)
      .keys()
      .forEach((key) => {
        if (!LineupUtils.ignoreFieldSet.hasOwnProperty(key)) {
          mutableToZero[key] = { value: 0 };
        }
      })
      .value();
  }

  // Replacement on/off calcs

  /** Is this lineup the same except for the one player */
  private static isComplementLineup(
    player: string,
    onLineup: LineupStatSet,
    offLineup: LineupStatSet
  ): boolean {
    // If the number of non-player matches == 4
    const onLineupPlayerMap = _.chain(
      onLineup?.players_array?.hits?.hits?.[0]?._source?.players || []
    )
      .map((p) => [p.id, p.code])
      .fromPairs()
      .value();

    const isComplement =
      _.chain(offLineup?.players_array?.hits?.hits?.[0]?._source?.players || [])
        .map((k) => k.id)
        .filter((k) => k != player && onLineupPlayerMap.hasOwnProperty(k))
        .size()
        .value() == 4;

    if (LineupUtils.debugReplacementOnOff) {
      if (_.includes(player, LineupUtils.debugReplacementOnOffPlayer)) {
        console.log(
          `LineupUtils.isComplementLineup: ` +
            `For [${player}][${onLineup.key}]: vs [${offLineup.key}]: [${isComplement}]`
        );
      }
    }
    return isComplement;
  }

  private static calcHarmonicMean(w1: number, w2: number): number {
    return 2.0 / (1 / w1 + 1 / w2);
  }

  /** Combines the deltas between the on/off numbers, weights, and averages */
  private static combineReplacementOnOff(
    mutableReplacementObj: OnOffLineupStatSet,
    keySource: Array<string>,
    regressDiffs: number = 0,
    repOnOffDiagMode: number = 0
  ) {
    // Calculate offensive and defensive harmonic means for possessions etc
    const harmonicWeights = _.chain(keySource)
      .filter((k) => {
        return _.startsWith(k, "total_") || _.endsWith(k, "_poss");
      })
      .map((k) => [k, true])
      .fromPairs()
      .value();

    const someDebugFields = [
      "off_poss",
      "off_ppp",
      "total_def_3p_attempts",
      "def_3p",
      "total_off_orb",
      "off_orb",
      "total_off_fga",
      "total_off_fta",
      "off_ftr",
    ];

    // x: mutableReplacementObj.myLineups ... a list of lineups
    // x.offLineups the weighted average of the complements
    const weightedLineups = _.chain(mutableReplacementObj.myLineups || [])
      .filter((myLineup) => {
        const offLineups = myLineup.offLineups || StatModels.emptyLineup();

        // remove lineups with no possessions at all
        const retain = offLineups.hasOwnProperty("off_poss");

        if (LineupUtils.debugReplacementOnOff && !retain) {
          if (
            _.includes(
              mutableReplacementObj.key,
              LineupUtils.debugReplacementOnOffPlayer
            )
          ) {
            console.log(
              `LineupUtils.combineReplacementOnOff.prefilter: [${mutableReplacementObj.key}]: ` +
                `Filtering empty on/off lineup: [${myLineup.key}] ` +
                `(poss=[${myLineup?.off_poss?.value}/${myLineup?.def_poss?.value}//${offLineups?.off_poss?.value}/${offLineups?.def_poss?.value}])`
            );
          }
        }
        return retain;
      })
      .map((myLineup) => {
        if (repOnOffDiagMode > 0) {
          myLineup.onLineup = _.clone(myLineup); //(important: this is a shallow clone)
        }
        // Complete weighting
        const offLineups = myLineup.offLineups || StatModels.emptyLineup();
        LineupUtils.completeWeightedAvg(offLineups); //mutates this

        if (LineupUtils.debugReplacementOnOff) {
          if (
            _.includes(
              mutableReplacementObj.key,
              LineupUtils.debugReplacementOnOffPlayer
            ) &&
            (myLineup.off_poss?.value || 0) >
              LineupUtils.debugReplacementOnOffMinPoss &&
            (offLineups.off_poss?.value || 0) >
              LineupUtils.debugReplacementOnOffMinPoss
          ) {
            console.log(
              `LineupUtils.combineReplacementOnOff.counts: [${mutableReplacementObj.key}]: ` +
                `[${myLineup.key}] counts: [${JSON.stringify(
                  _.pick(myLineup, someDebugFields)
                )}] vs ` +
                `[${JSON.stringify(_.pick(offLineups, someDebugFields))}]`
            );
          }
        }

        _.keys(harmonicWeights).forEach((key) => {
          const oldValue = myLineup[key]?.old_value;
          const oldValOverride = myLineup[key]?.override;

          if (
            (myLineup[key]?.value || 0) > 0 &&
            (offLineups[key]?.value || 0) > 0
          ) {
            myLineup[key]! = {
              value: LineupUtils.calcHarmonicMean(
                myLineup[key]!.value!,
                offLineups[key]!.value!
              ),
            };
          } else {
            myLineup[key]! = { value: 0 };
          }
          // Same logic but for overridden values:
          // TODO: in the future neeed to handle when old_value is only present some of the time?
          if (oldValOverride) {
            if (
              (myLineup[key]?.old_value || 0) > 0 &&
              (offLineups[key]?.old_value || 0) > 0
            ) {
              myLineup[key]!.old_value = LineupUtils.calcHarmonicMean(
                myLineup[key]!.old_value!,
                offLineups[key]!.old_value!
              );
              myLineup[key]!.override = oldValOverride;
            } else {
              myLineup[key]!.old_value = 0;
            }
          }
        });
        _.chain(myLineup)
          .toPairs()
          .forEach((keyVal) => {
            const key = keyVal[0];
            if (
              !LineupUtils.ignoreFieldSet.hasOwnProperty(key) &&
              !harmonicWeights.hasOwnProperty(key)
            ) {
              myLineup[key]! = {
                // calc on-off
                value: (keyVal[1]?.value || 0) - (offLineups[key]?.value || 0),
              }; //(gets weigted by offensive pos/FGA/etc, so fine that it's nonsense if no samples)
              if (keyVal[1]?.override) {
                myLineup[key]!.old_value =
                  (keyVal[1]?.old_value || 0) -
                  (offLineups[key]?.old_value || 0);
                myLineup[key]!.override = keyVal[1].override;
              }
            }
          })
          .value();

        if (LineupUtils.debugReplacementOnOff) {
          if (
            _.includes(
              mutableReplacementObj.key,
              LineupUtils.debugReplacementOnOffPlayer
            ) &&
            (myLineup.off_poss?.value || 0) >
              LineupUtils.debugReplacementOnOffMinPoss
          ) {
            console.log(
              `LineupUtils.combineReplacementOnOff.diffs: [${mutableReplacementObj.key}]: ` +
                `[${myLineup.key}] diffs: [${JSON.stringify(
                  _.pick(myLineup, someDebugFields)
                )}]`
            );
          }
        }

        return myLineup;
      })
      .value();

    if (repOnOffDiagMode == 0) {
      delete mutableReplacementObj.myLineups;
    } else {
      //(remove any lineups that don't contribute)
      mutableReplacementObj.myLineups = weightedLineups;
    }

    _.chain(weightedLineups || [])
      .transform((acc, lineup) => {
        LineupUtils.weightedAvg(acc, lineup);
      }, mutableReplacementObj)
      .value();
    LineupUtils.completeWeightedAvg(mutableReplacementObj, true, regressDiffs);
  }

  /** Converts player names to 2/3 char code (digit used to disambigurate */
  static getOrBuildPlayerIdToInitials(
    playerId: string,
    mutableInitials: Record<string, string>,
    mutableInitialsCounts: Record<string, number>
  ): string {
    if (mutableInitials[playerId]) {
      return mutableInitials[playerId];
    } else {
      const tmp = playerId.replace(/[^A-Z]/g, "");
      const initials = (tmp.length > 1 ? tmp[tmp.length - 1] : "") + tmp[0];

      const num = mutableInitialsCounts[initials] || 1;
      mutableInitialsCounts[initials] = num + 1;

      const fullInitials = initials + (num > 1 ? num : "");
      mutableInitials[playerId] = fullInitials;
      return fullInitials;
    }
  }

  /** Part of game info building, determines which of the 2 forms the input takes */
  static isGameInfoStatSet(
    l: (GameInfoStatSet | undefined) | Array<GameInfoStatSet>
  ): l is GameInfoStatSet | undefined {
    return !(l instanceof Array);
  }

  /** Builds a map of game info vs opponent */
  static buildOpponentList(
    lineups: LineupStatSet[],
    showGameInfo: boolean
  ): Record<string, GameInfoStatSet> {
    const mutableOppoList = {} as Record<string, GameInfoStatSet>;
    if (showGameInfo) {
      // (calculate this before doing the table filter)
      lineups.forEach((l) => {
        if (LineupUtils.isGameInfoStatSet(l.game_info)) {
          LineupUtils.getGameInfo(l.game_info || {}, mutableOppoList);
        }
      });
    }
    const orderedMutableOppoList = {} as Record<string, GameInfoStatSet>;
    _.chain(mutableOppoList)
      .keys()
      .sort()
      .each((key) => {
        orderedMutableOppoList[key] = mutableOppoList[key];
      })
      .value();
    return orderedMutableOppoList;
  }

  // For leaderboards, build regressed off/def "power"

  static readonly regressedOffDef = (lineup: any, avgEff: number) => {
    const regression_min_poss = 50;
    const regression_max_min_poss = 200; //(at 250 we're using the exact value)
    const avg_eff = 100;
    const extra_regression_poss = 150; //(below this we assume the lineup was worse than team average)
    const extra_regression_max = 10;

    const poss = lineup.off_poss?.value || 0;
    const off_adj_ppp = lineup.off_adj_ppp?.value || avgEff;
    const regression =
      (1 - Math.min(poss, extra_regression_poss) / extra_regression_poss) *
      extra_regression_max;
    const team_off_adj_ppp =
      (lineup.team_off_adj_ppp?.value || avg_eff) - regression; //slight regression because it's a low vol
    const factor =
      Math.min(
        Math.max(poss - regression_min_poss, 0),
        regression_max_min_poss
      ) / regression_max_min_poss;

    const def_adj_ppp = lineup.def_adj_ppp?.value || avgEff;
    const team_def_adj_ppp =
      (lineup.team_def_adj_ppp?.value || avgEff) + regression; //slight regression because it's a low vol

    //DIAG
    // console.log(
    //   `Off regress for [${lineup.key}] ${off_adj_ppp} : ${poss} = ${
    //     factor * off_adj_ppp + (1 - factor) * team_off_adj_ppp
    //   } (${team_off_adj_ppp})`
    // );

    return {
      off_regress: factor * off_adj_ppp + (1 - factor) * team_off_adj_ppp,
      def_regress: factor * def_adj_ppp + (1 - factor) * team_def_adj_ppp,
    };
  };
}
