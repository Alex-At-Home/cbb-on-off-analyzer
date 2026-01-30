// Lodash
import _, { chain } from "lodash";

// Util imports
import {
  StatModels,
  PlayerCodeId,
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  TeamStatSet,
  LineupStatSet,
  IndivPosInfo,
  RosterEntry,
} from "../StatModels";
import { RatingUtils, OnBallDefenseModel } from "../stats/RatingUtils";
import { PositionUtils } from "../stats/PositionUtils";
import { LineupUtils } from "../stats/LineupUtils";
import {
  LuckUtils,
  OffLuckAdjustmentDiags,
  DefLuckAdjustmentDiags,
  LuckAdjustmentBaseline,
} from "../stats/LuckUtils";
import { ParamDefaults } from "../FilterModels";
import { OverrideUtils } from "../stats/OverrideUtils";

export type PositionInfo = PlayerCodeId & { numPoss: number };

/** Object marshalling logic for lineup tables */
export class LineupTableUtils {
  /** Key of "total" fake lineuo */
  static readonly totalLineupId = "TOTAL";

  /** Key of "off" fake lineuo */
  static readonly droppedLineupId = "DROPPED";

  /** Handy accessor for picking the player codes out of the lineup */
  static buildCodesAndIds(lineup: LineupStatSet): Array<PlayerCodeId> {
    return lineup.players_array
      ? lineup.players_array?.hits?.hits?.[0]?._source?.players || []
      : _.toPairs(
          (lineup.player_info || {}) as Record<PlayerId, IndivStatSet>
        ).map((kv) => {
          return { code: kv[1].code as string, id: kv[0] };
        }); //(leaderboard mode)
  }

  /** Injects some advanced stats into players, returns an associative array vs player.key, but also mutates players */
  static buildBaselinePlayerInfo(
    players: Array<IndivStatSet> | undefined,
    globalRosterStatsByCode: Record<PlayerCode, IndivStatSet>,
    teamStat: TeamStatSet,
    avgEfficiency: number,
    adjustForLuck: boolean,
    luckConfigBase: "baseline" | "season",
    manualOverridesAsMap: Record<string, Record<string, number>> = {},
    onBallDefenseByCode: Record<PlayerCode, OnBallDefenseModel> = {}
  ): Record<PlayerId, IndivStatSet> {
    const sampleRosterByCode = _.fromPairs(
      // Needed for ORtg, also ensure the codes exist
      (players || []).map((mutableP: IndivStatSet) => {
        // Code:
        mutableP.code = (mutableP.player_array?.hits?.hits?.[0]?._source?.player
          ?.code || mutableP.key) as PlayerCode;
        return [mutableP.code, mutableP];
      })
    );

    const baselinePlayerInfo = _.fromPairs(
      (players || []).map((mutableP: IndivStatSet) => {
        // Possession %
        mutableP.off_team_poss_pct = {
          value: _.min([
            (mutableP.off_team_poss?.value || 0) /
              (teamStat.off_poss?.value || 1),
            1,
          ]),
        };
        mutableP.def_team_poss_pct = {
          value: _.min([
            (mutableP.def_team_poss?.value || 0) /
              (teamStat.def_poss?.value || 1),
            1,
          ]),
        };

        if (mutableP?.doc_count) {
          const globalPlayerStats =
            luckConfigBase == "season"
              ? globalRosterStatsByCode[mutableP.code || "??"] || mutableP
              : mutableP;
          // (No offensive luck since our "to adjust" and baseline are the same)
          const offLuckAdj = adjustForLuck
            ? LuckUtils.calcOffPlayerLuckAdj(
                mutableP,
                globalPlayerStats,
                avgEfficiency
              )
            : undefined;
          if (offLuckAdj) mutableP.off_luck = offLuckAdj;
          // Calculate luck for defense - over the baseline query, but will regress to opponent SoS
          const defLuckAdj = adjustForLuck
            ? LuckUtils.calcDefPlayerLuckAdj(
                mutableP,
                globalPlayerStats,
                avgEfficiency
              )
            : undefined;
          if (defLuckAdj) mutableP.def_luck = defLuckAdj;
          LuckUtils.injectLuck(mutableP, offLuckAdj, defLuckAdj);
        }

        // Once luck is applied apply any manual overrides
        const [adjustmentReason, overrodeOffFields] =
          OverrideUtils.applyOverrides(
            mutableP,
            mutableP.onOffKey || "Baseline",
            manualOverridesAsMap,
            adjustForLuck
          );

        // Add ORtg to lineup stats:
        const [oRtg, adjORtg, rawORtg, rawAdjORtg, oRtgDiag] =
          RatingUtils.buildORtg(
            mutableP,
            sampleRosterByCode,
            {
              total_off_to: teamStat.total_off_to || { value: 0 },
              sum_total_off_to: {
                //(sum of all players TOs, so we can calc team TOVs)
                //(note don't luck adjust these since the team values aren't luck adjusted)
                value: _.sumBy(players, (p) => p.total_off_to?.value || 0),
              },
            },
            avgEfficiency,
            true,
            adjustForLuck || overrodeOffFields
          );
        const [dRtg, adjDRtg, rawDRtg, rawAdjDRtg, dRtgDiag] =
          RatingUtils.buildDRtg(mutableP, avgEfficiency, true, adjustForLuck);
        mutableP.off_rtg = {
          value: oRtg?.value,
          old_value: rawORtg?.value,
          override: adjustmentReason,
        };
        mutableP.diag_off_rtg = oRtgDiag;
        mutableP.off_adj_rtg = {
          value: adjORtg?.value,
          old_value: rawAdjORtg?.value,
          override: adjustmentReason,
        };
        mutableP.off_adj_prod = {
          value: (adjORtg?.value || 0) * mutableP.off_team_poss_pct.value!,
          old_value:
            (rawAdjORtg?.value || 0) * mutableP.off_team_poss_pct.value!,
          override: adjustmentReason,
        };
        mutableP.off_usage = {
          //TODO: make this controllable
          value: !_.isNil(oRtgDiag)
            ? oRtgDiag.Usage! * 0.01
            : mutableP.off_usage?.value,
        };
        mutableP.def_rtg = {
          value: dRtg?.value,
          old_value: rawDRtg?.value,
          override: adjustForLuck ? "Luck adjusted" : undefined,
        };
        mutableP.def_adj_rtg = {
          value: adjDRtg?.value,
          old_value: rawAdjDRtg?.value,
          override: adjustForLuck ? "Luck adjusted" : undefined,
        };
        mutableP.def_adj_prod = {
          value: (adjDRtg?.value || 0) * mutableP.def_team_poss_pct.value!,
          old_value:
            (rawAdjDRtg?.value || 0) * mutableP.def_team_poss_pct.value!,
          override: adjustForLuck ? "Luck adjusted" : undefined,
        };
        mutableP.diag_def_rtg = dRtgDiag;

        // Apply on-ball defense if it exists for this player
        if (dRtgDiag && onBallDefenseByCode.hasOwnProperty(mutableP.code!)) {
          const onBallDefense = onBallDefenseByCode[mutableP.code!]!;
          const onBallDiags = RatingUtils.buildOnBallDefenseAdjustmentsPhase1(
            mutableP,
            dRtgDiag,
            onBallDefense
          );
          dRtgDiag.onBallDef = onBallDefense;
          dRtgDiag.onBallDiags = onBallDiags;
        }

        // If roster info is available then add:
        const rosterEntry =
          globalRosterStatsByCode[mutableP.code!]?.roster || {};
        if (rosterEntry && !_.isEmpty(rosterEntry)) {
          mutableP.roster = rosterEntry;
        }

        return [mutableP.key, mutableP];
      })
    );

    // Finish off on-ball defense if there is any:
    if (!_.isEmpty(onBallDefenseByCode)) {
      RatingUtils.injectOnBallDefenseAdjustmentsPhase2(
        _.values(baselinePlayerInfo),
        teamStat
      );
    }
    return baselinePlayerInfo;
  }

  /** Handy util for sorting JSON blobs of fields */
  static sorter(sortStr: string) {
    // format: (asc|desc):(off_|def_|diff_)<field>|year
    const sortComps = sortStr.split(":"); //asc/desc
    const dir = sortComps[0] == "desc" ? -1 : 1;
    const fieldComps = _.split(sortComps[1], "_", 1); //off/def/diff
    const fieldName =
      fieldComps[0] != "year"
        ? sortComps[1]?.substring(fieldComps[0].length + 1) //+1 for _
        : sortComps[1];
    const field = (stat: any) => {
      switch (fieldComps[0]) {
        case "diff": //(off-def)
          return (
            (stat["off_" + fieldName]?.value || 0.0) -
            (stat["def_" + fieldName]?.value || 0.0)
          );
        case "year": //metadata
          return parseInt(
            (stat?.year || ParamDefaults.defaultLeaderboardYear).substring(0, 4)
          );
        default:
          if (sortComps[1] == "off_drb") {
            //(annoying special case)
            return stat["def_orb"]?.value;
          } else {
            return stat[sortComps[1]]?.value; //(off or def)
          }
      }
    };
    return (stat: any) => {
      return dir * (field(stat) || 0);
    };
  }

  /** Builds positional info vs player key */
  static buildPositionPlayerMap(
    players: IndivStatSet[] | undefined,
    teamSeasonLookup: string,
    externalRoster?: Record<PlayerId, RosterEntry>,
    rosterGeoLookup?: Record<string, { lat: number; lon: number }>
  ): Record<PlayerId, IndivPosInfo> {
    const positionFromPlayerKey = _.chain(players || [])
      .map((player: IndivStatSet) => {
        const rosterMeta = player.roster || externalRoster?.[player.key];
        const [posConfs, posConfsDiags] =
          PositionUtils.buildPositionConfidences(player, rosterMeta?.height_in);
        const [pos, posDiags] = PositionUtils.buildPosition(
          posConfs,
          posConfsDiags.confsNoHeight,
          player,
          teamSeasonLookup
        );

        return [
          player.key,
          {
            posConfidences: _.values(posConfs || {}),
            posClass: pos,
            roster: rosterMeta
              ? {
                  ncaa_id: rosterMeta.player_code_id?.ncaa_id,
                  number: rosterMeta.number,
                  height: rosterMeta.height,
                  year_class: rosterMeta.year_class,
                  pos: rosterMeta.pos,
                  origin: rosterMeta.origin,
                  ...rosterGeoLookup?.[rosterMeta.origin || "unknown"],
                }
              : undefined,
          },
        ];
      })
      .fromPairs()
      .value();

    return positionFromPlayerKey;
  }

  /** Builds a filter that ignores aggregation keys we don't want */
  static buildFilteredLineupKeys(
    filterStr: string
  ): undefined | ((inKeys: PlayerCodeId[]) => boolean) {
    const orFragments = filterStr
      ? filterStr.split("||").map((orFrag) => {
          var separator = "!!!";
          _.takeWhile([";", "/", ","], (sep) => {
            if (filterStr.indexOf(sep) >= 0) {
              separator = sep;
            }
            return separator == "!!!";
          });
          // Basic decomposition:
          const andFrags = orFrag
            .split(separator)
            .map((fragment) => _.trim(fragment))
            .filter(
              (fragment) => fragment?.[0] == "[" && _.last(fragment) == "]"
            ) //(use [key] to filter on aggregation keys instead of raw lineups)
            .map((frag) => frag.substring(1, frag.length - 1))
            .map((fragment) => _.trim(fragment))
            .filter((fragment) => (fragment ? true : false));

          const [pveAndFrags, nveAndFrags] = _.partition(
            andFrags,
            (frag) => frag[0] != "-"
          );
          return [pveAndFrags, nveAndFrags.map((frag) => frag.substring(1))];
        })
      : [];

    return orFragments.length == 0
      ? undefined
      : (keys: PlayerCodeId[]) => {
          return Boolean(
            _.find(orFragments, (andFrags) => {
              const [pveAndFrags, nveAndFrags] = andFrags;
              return (
                (pveAndFrags.length == 0 ||
                  (_.every(pveAndFrags, (fragment) =>
                    _.find(keys, (key) => {
                      const isNegativeAgg = key.id?.[0] == "-"; // eg Player1
                      const matches =
                        key.code.indexOf(fragment) >= 0 ||
                        (isNegativeAgg ? key.id.substring(1) : key.id).indexOf(
                          fragment
                        ) >= 0;
                      return matches; //(currently we match on the presense of any key, +ve or -ve)
                    })
                  )
                    ? true
                    : false)) &&
                (nveAndFrags.length == 0 ||
                  (_.find(nveAndFrags, (fragment) =>
                    _.find(keys, (key) => {
                      const isNegativeAgg = key.id?.[0] == "-"; // eg Player1
                      const matches =
                        key.code.indexOf(fragment) >= 0 ||
                        (isNegativeAgg ? key.id.substring(1) : key.id)
                          .substring(1)
                          .indexOf(fragment) >= 0;
                      return matches;
                    })
                  )
                    ? false
                    : true))
              );
            })
          );
        };
  }

  /** Builds a filtered sorted list of lineups */
  static buildFilteredLineups(
    lineups: LineupStatSet[],
    filterStr: string,
    sortBy: string | undefined,
    minPoss: string,
    maxTableSize: string,
    teamSeasonLookup: string | undefined,
    positionFromPlayerKey: Record<string, any> | undefined,
    alsoReturnDroppedLineups: boolean = false
  ): [LineupStatSet[], LineupStatSet[] | undefined] {
    const orFragments = filterStr
      .split("||")
      .map((orFrag) => PositionUtils.buildPositionalAwareFilter(orFrag));

    const filterOnPosition = _.some(orFragments, (orFrag) => orFrag[2]);

    const minPossInt = parseInt(minPoss);
    const passLineup = (lineup: LineupStatSet) => {
      const offPos = lineup.off_poss?.value || 0;
      const defPos = lineup.def_poss?.value || 0;
      const phase1Pass = offPos >= minPossInt || defPos >= minPossInt;

      if (phase1Pass) {
        const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);

        const lineupPosFromPlayerKey =
          positionFromPlayerKey || lineup.player_info || {}; //(leaderboard version, calc from lineup)
        const lineupTeamSeason =
          teamSeasonLookup || `${lineup.gender}_${lineup.team}_${lineup.year}`; //(leaderboard version, calc from lineup)

        const namesToTest = filterOnPosition
          ? PositionUtils.orderLineup(
              codesAndIds,
              lineupPosFromPlayerKey,
              lineupTeamSeason
            )
          : codesAndIds;
        const teamFilter = lineup.team
          ? [{ id: `${lineup.team}_${lineup.year}`, code: lineup.team }]
          : []; //(leaderboard version)

        const namesAndTeams = namesToTest.concat(teamFilter);

        const playerFilter: Boolean = _.chain(orFragments)
          .map((orFrag) => {
            const [filterFragmentsPve, filterFragmentsNve, filterOnPos] =
              orFrag;
            return PositionUtils.testPositionalAwareFilter(
              namesAndTeams,
              filterFragmentsPve,
              filterFragmentsNve
            );
          })
          .some()
          .value();

        return playerFilter && lineup.key != ""; // (workaround for #53 pending fix)
      } else {
        return false;
      }
    };

    const sortAndTruncLineups = (
      lineupChain: _.CollectionChain<LineupStatSet>
    ) =>
      lineupChain
        .sortBy(
          sortBy ? [LineupTableUtils.sorter(sortBy)] : [] //(don't sort if sortBy not specified)
        )
        .take(parseInt(maxTableSize))
        .value();

    if (alsoReturnDroppedLineups) {
      const [filteredLineups, droppedLineups] = _.chain(lineups)
        .partition(passLineup)
        .value();
      return [sortAndTruncLineups(_.chain(filteredLineups)), droppedLineups];
    } else {
      // more efficient if we don't need dropped lineups
      return [
        sortAndTruncLineups(_.chain(lineups).filter(passLineup)),
        undefined,
      ];
    }
  }

  /** Builds a filtered sorted list of lineups */
  static buildEnrichedLineups(
    // Stats inputs:
    filteredLineups: Array<LineupStatSet>,
    globalTeamStats: TeamStatSet,
    players: Array<IndivStatSet>,
    baselineTeamStats: TeamStatSet,
    // Table control:
    adjustForLuck: boolean,
    luckConfigBase: "baseline" | "season",
    avgEfficiency: number,
    // Derived objects:
    showTotalLineups: boolean,
    teamSeasonLookup: string,
    positionFromPlayerKey: Record<PlayerId, any>,
    baselinePlayerInfo: Record<PlayerId, IndivStatSet>,
    droppedLineups?: LineupStatSet[]
  ): Array<LineupStatSet> {
    // The luck baseline can either be the user-selecteed baseline or the entire season
    const baseLuckBuilder: () => [
      TeamStatSet,
      Record<PlayerId, IndivStatSet>
    ] = () => {
      if (adjustForLuck) {
        switch (luckConfigBase) {
          case "baseline":
            return [baselineTeamStats, baselinePlayerInfo];
          default:
            //("season")
            return [
              globalTeamStats,
              _.fromPairs((players || []).map((p) => [p.key, p])),
            ];
        }
      } else return [StatModels.emptyTeam(), {}]; //(not used)
    };
    const [baseOrSeasonTeamStats, baseOrSeason3PMap] = baseLuckBuilder();

    /** Perform enrichment on each lineup, including luck adjustment */
    const enrichLineup = (lineup: LineupStatSet) => {
      const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);

      const sortedCodesAndIds =
        lineup.key == LineupTableUtils.totalLineupId
          ? undefined
          : PositionUtils.orderLineup(
              codesAndIds,
              positionFromPlayerKey,
              teamSeasonLookup
            );

      const perLineupPlayerLuckMap: Record<PlayerId, IndivStatSet> =
        _.fromPairs(
          codesAndIds.map((cid: PlayerCodeId) => {
            return [
              cid.id,
              baseOrSeason3PMap[cid.id] || StatModels.emptyIndiv(),
            ];
          })
        );
      const luckAdj =
        lineup.key != LineupTableUtils.totalLineupId &&
        adjustForLuck &&
        lineup?.doc_count
          ? ([
              //(the totalLineupId check needed because enrichLineups is called separately on totalLineup once calculated below)
              LuckUtils.calcOffTeamLuckAdj(
                lineup,
                codesAndIds.map((cid) => perLineupPlayerLuckMap[cid.id]),
                baseOrSeasonTeamStats,
                perLineupPlayerLuckMap,
                avgEfficiency,
                baselineTeamStats?.total_off_3p_attempts?.value
                //(ensure that the aggregation of the 3P-luck-adjusted lineups are equal to the 3P-adjusted set)
                // (this means I'm technically under-regressing each lineup .. otherwise they'd mostly just be the 3P% average)
              ),
              LuckUtils.calcDefTeamLuckAdj(
                lineup,
                baseOrSeasonTeamStats,
                avgEfficiency,
                baselineTeamStats?.total_def_3p_attempts?.value
                //(ensure that the aggregation of the 3P-luck-adjusted lineups are equal to the 3P-adjusted set)
                // (this means I'm technically under-regressing each lineup .. otherwise they'd mostly just be the 3P SoS)
              ),
            ] as [OffLuckAdjustmentDiags, DefLuckAdjustmentDiags])
          : undefined;

      if (lineup?.doc_count) {
        if (
          lineup.key != LineupTableUtils.totalLineupId &&
          lineup.key != LineupTableUtils.droppedLineupId
        ) {
          LineupUtils.buildEfficiencyMargins(lineup); //(just used for display in the lineup table)
          //(already calculated for totalLineup)

          //(check needed because enrichLineups is called separately on totalLineup once calculated below)
          LuckUtils.injectLuck(lineup, luckAdj?.[0], luckAdj?.[1]);
          lineup.off_luck_diags = luckAdj?.[0];
          lineup.def_luck_diags = luckAdj?.[1];
        }
      }
      return lineup;
    };
    const enrichedLineups = filteredLineups.map((lineup) =>
      enrichLineup(lineup)
    );
    const totalLineup = showTotalLineups
      ? [
          // Have to do this last in order to get the luck-mutated lineups
          // (https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/100)
          enrichLineup(
            _.assign(
              LineupUtils.calculateAggregatedLineupStats(filteredLineups),
              {
                key: LineupTableUtils.totalLineupId,
                doc_count: filteredLineups.length, //(for doc_count >0 checks, calculateAggregatedLineupStats doesn't inject)
              }
            )
          ),
        ]
      : [];

    const offLineup =
      droppedLineups && !_.isEmpty(droppedLineups)
        ? [
            // Have to do this last in order to get the luck-mutated lineups
            // (https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/100)
            enrichLineup(
              _.assign(
                LineupUtils.calculateAggregatedLineupStats(
                  droppedLineups.map(enrichLineup)
                ),
                {
                  key: LineupTableUtils.droppedLineupId,
                  doc_count: droppedLineups.length, //(for doc_count >0 checks, calculateAggregatedLineupStats doesn't inject)
                }
              )
            ),
          ]
        : [];

    return totalLineup.concat(offLineup).concat(enrichedLineups);
  }

  /** Builds the list of where players play based on their lineup */
  static getPositionalInfo(
    lineups: Array<LineupStatSet>,
    positionFromPlayerId: Record<PlayerId, IndivPosInfo>,
    teamSeasonLookup: string
  ): PositionInfo[][] {
    return _.chain(lineups)
      .transform(
        (mutableAcc, lineup) => {
          const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
          const sortedCodesAndIds = PositionUtils.orderLineup(
            codesAndIds,
            positionFromPlayerId,
            teamSeasonLookup
          );
          sortedCodesAndIds.forEach((codeId, i) => {
            mutableAcc[i]!.push({
              id: codeId.id,
              code: codeId.code,
              numPoss: lineup?.off_poss?.value || 0,
            });
          });
        },
        [
          [] as PositionInfo[],
          [] as PositionInfo[],
          [] as PositionInfo[],
          [] as PositionInfo[],
          [] as PositionInfo[],
        ]
      )
      .map((keyPosses) => {
        return _.chain(keyPosses)
          .groupBy((keyPoss) => keyPoss.id)
          .mapValues((keyPosses, id) => {
            const code = keyPosses?.[0].code;
            return {
              id: id,
              code: code,
              numPoss: _.reduce(
                keyPosses,
                (acc, keyPoss) => acc + keyPoss.numPoss,
                0
              ),
            };
          })
          .values()
          .orderBy(["numPoss"], ["desc"])
          .value();
      })
      .value();
  }
}
