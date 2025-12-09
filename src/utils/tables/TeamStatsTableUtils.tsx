import React from "react";
import _ from "lodash";

import GameInfoDiagView from "../../components/diags/GameInfoDiagView";
import LuckAdjDiagView from "../../components/diags/LuckAdjDiagView";
import TeamExtraStatsInfoView from "../../components/diags/TeamExtraStatsInfoView";
import TeamPlayTypeDiagRadar from "../../components/diags/TeamPlayTypeDiagRadar";
import TeamRosterDiagView from "../../components/diags/TeamRosterDiagView";
import ShotChartDiagView, {
  UserChartOpts,
} from "../../components/diags/ShotChartDiagView";
import {
  GenericTableOps,
  GenericTableRow,
} from "../../components/GenericTable";
import { LineupStatsModel } from "../../components/LineupStatsTable";
import { RosterStatsModel } from "../../components/RosterStatsTable";
import { TeamStatsModel } from "../../components/TeamStatsTable";
import { GameFilterParams, LuckParams } from "../FilterModels";
import { efficiencyAverages } from "../public-data/efficiencyAverages";
import {
  GameInfoStatSet,
  IndivPosInfo,
  IndivStatSet,
  LineupStatSet,
  OnOffBaselineEnum,
  OnOffBaselineOtherEnum,
  PlayerId,
  ShotStats,
  ShotStatsModel,
  StatModels,
  TeamStatSet,
} from "../StatModels";
import { LineupUtils } from "../stats/LineupUtils";
import {
  DefLuckAdjustmentDiags,
  LuckUtils,
  OffLuckAdjustmentDiags,
} from "../stats/LuckUtils";
import { OverrideUtils } from "../stats/OverrideUtils";
import { CommonTableDefs } from "./CommonTableDefs";
import { GradeTableUtils, DivisionStatsCache } from "./GradeTableUtils";
import { LineupTableUtils } from "./LineupTableUtils";
import { RosterTableUtils } from "./RosterTableUtils";
import { TableDisplayUtils } from "./TableDisplayUtils";
import TeamPlayTypeTabbedView from "../../components/shared/TeamPlayTypeTabbedView";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { UrlRouting } from "../UrlRouting";
import { FilterPresetUtils } from "../FilterPresetUtils";

// Data model

export type TeamStatsOnOffBase = {
  baseline?: TeamStatsBreakdown;
  on?: TeamStatsBreakdown;
  off?: TeamStatsBreakdown;
  other: (TeamStatsBreakdown | undefined)[];
  diffs: GenericTableRow[];
};

export type TeamStatsBreakdown = {
  teamStatsRows: GenericTableRow[];
  teamRosterRows: GenericTableRow[];
  teamDiagRows: GenericTableRow[];
};

export type TeamStatsReadOnlyState = {
  showPlayTypes: boolean;
  playTypeConfig?: { off: boolean; def: boolean };
  showRoster: boolean;
  adjustForLuck: boolean;
  showDiffs: boolean;
  showGameInfo: boolean;
  showShotCharts: boolean;
  shotChartConfig: UserChartOpts | undefined;
  showExtraInfo: boolean;
  showGrades: string;
  showStandaloneGrades: boolean;
  showLuckAdjDiags: boolean;
  showHelp: boolean;
  playStyleConfigStr?: string;
};

export type TeamStatsChangeState = {
  setShowGrades: (showGradesCfg: string) => void;
  setShotChartConfig: (opts: UserChartOpts) => void;
  setPlayStyleConfigStr: (configStr: string) => void;
};

/** Get the right roster stats for on/off/etc  */
const getRosterStats = (
  key: OnOffBaselineOtherEnum,
  rosterModel: RosterStatsModel,
  otherIndex?: number
): Array<IndivStatSet> => {
  if (key == "other") {
    return rosterModel.other?.[otherIndex || 0] || [];
  } else {
    return rosterModel[key] || [];
  }
};

/** Get the right roster stats for on/off/etc  */
const getTeamStats = (
  key: OnOffBaselineOtherEnum,
  teamModel: TeamStatsModel,
  otherIndex?: number
): TeamStatSet => {
  if (key == "other") {
    return teamModel.other?.[otherIndex || 0] || StatModels.emptyTeam();
  } else {
    return teamModel[key] || StatModels.emptyTeam();
  }
};

/** Get the right roster stats for on/off/etc  */
const getShotStats = (
  key: OnOffBaselineOtherEnum,
  shotModel: ShotStatsModel,
  otherIndex?: number
): {
  off: ShotStats;
  def: ShotStats;
} => {
  if (key == "other") {
    return shotModel.other?.[otherIndex || 0] || { off: {}, def: {} };
  } else {
    return shotModel[key] || { off: {}, def: {} };
  }
};

// Business logic:

/** Encapsulates building the elements that make up a TeamStatsTable */
export class TeamStatsTableUtils {
  static buildRows(
    // From page load
    gameFilterParams: GameFilterParams,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel,
    shotStats: ShotStatsModel,
    lineupStats: LineupStatsModel[],

    // Page control
    readOnlyState: TeamStatsReadOnlyState,
    persistNewState: TeamStatsChangeState,

    // Runtime page params
    luckConfig: LuckParams,
    divisionStatsCache: DivisionStatsCache
  ): TeamStatsOnOffBase {
    const {
      showPlayTypes,
      playTypeConfig,
      showRoster,
      adjustForLuck,
      showDiffs,
      showGameInfo,
      showExtraInfo,
      showGrades,
      showStandaloneGrades,
      showShotCharts,
      shotChartConfig,
      showLuckAdjDiags,
      showHelp,
      playStyleConfigStr,
    } = readOnlyState;

    // Some handy strings
    const offPrefixFn = (key: string) => "off_" + key;
    const offCellMetaFn = (key: string, val: any) => "off";
    const defPrefixFn = (key: string) => "def_" + key;
    const defCellMetaFn = (key: string, val: any) => "def";

    const genderYearLookup = `${gameFilterParams.gender}_${gameFilterParams.year}`;
    const teamSeasonLookup = `${gameFilterParams.gender}_${gameFilterParams.team}_${gameFilterParams.year}`;
    const avgEfficiency =
      efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

    // Build strings for rows, using presets where possible

    const onOffBaseToShortPhrase = (
      type: OnOffBaselineOtherEnum,
      otherIndex?: number
    ) => {
      const maybePrefix =
        gameFilterParams.splitPhrases ||
        FilterPresetUtils.getPresetPhrase(gameFilterParams.presetSplit || "??");
      switch (type) {
        case "on":
          return maybePrefix?.[0] || "A";
        case "off":
          return maybePrefix?.[1] || "B";
        case "baseline":
          const maybeFilterPhrase = FilterPresetUtils.getPresetFilterPhrase(
            gameFilterParams.presetMode || "??"
          );
          return maybeFilterPhrase ? `[${maybeFilterPhrase}]` : "Base";
        case "other":
          return (
            maybePrefix?.[2 + (otherIndex || 0)] ||
            `${String.fromCharCode(67 + (otherIndex || 0))}`
          );
        default:
          return "unknown";
      }
    };

    /** Longer equivalent to onOffBaseToShortPhrase*/
    const onOffBaseToLongerPhrase = (
      type: OnOffBaselineOtherEnum,
      includeSet: boolean = true,
      otherIndex?: number
    ) => {
      const maybeSet = includeSet ? ` set` : "";
      const maybePrefix =
        gameFilterParams.splitPhrases ||
        FilterPresetUtils.getPresetPhrase(gameFilterParams.presetSplit || "??");
      switch (type) {
        case "on":
          return maybePrefix?.[0]
            ? `'${maybePrefix[0]}'${maybeSet}`
            : teamStats.onOffMode && _.isEmpty(teamStats.other)
            ? "On ('A')"
            : `'A'${maybeSet}`;
        case "off":
          return maybePrefix?.[1]
            ? `'${maybePrefix[1]}'${maybeSet}`
            : teamStats.onOffMode && _.isEmpty(teamStats.other)
            ? "Off ('B')"
            : `'B'${maybeSet}`;
        case "baseline":
          const maybeFilterPhrase = FilterPresetUtils.getPresetFilterPhrase(
            gameFilterParams.presetMode || "??"
          );
          return maybeFilterPhrase
            ? `'Base'${maybeSet} (${maybeFilterPhrase})`
            : `'Base'${maybeSet}`;
        case "other":
          const prefixIndex = 2 + (otherIndex || 0);
          return maybePrefix?.[prefixIndex]
            ? `'${maybePrefix[prefixIndex]}'${maybeSet}`
            : `'${String.fromCharCode(67 + (otherIndex || 0))}'${maybeSet}`;
        default:
          return "unknown";
      }
    };

    /** Largest sample of player stats, by player key - use for ORtg calcs */
    const globalRosterInfo = teamStats.global?.roster;
    const globalRosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
      rosterStats.global || [],
      globalRosterInfo,
      showPlayTypes,
      teamSeasonLookup
    ); //TODO: which set do I actually want to use for positional calcs here?

    /** List all the normal query keys */
    const baselineOnOffKeys: OnOffBaselineEnum[] = ["baseline", "on", "off"];

    /** List all the query keys */
    const modelKeys: [OnOffBaselineOtherEnum, number][] = (
      [
        ["baseline", 0],
        ["on", 0],
        ["off", 0],
      ] as [OnOffBaselineOtherEnum, number][]
    ).concat((teamStats.other || []).map((__, ii) => ["other", ii]));
    /** Turn one of the model keys into associative index */
    const getModelKey = (
      k: OnOffBaselineOtherEnum,
      otherQueryIndex: number
    ) => {
      return k == "other" ? `other_${otherQueryIndex}` : k;
    };

    //TODO: need to do a better job of deciding which one to use (or possibly a blend?)
    const positionFromPlayerIdGlobal = showRoster
      ? LineupTableUtils.buildPositionPlayerMap(
          rosterStats.global,
          teamSeasonLookup
        )
      : {};

    const positionFromPlayerId = _.chain(modelKeys)
      .map(([k, otherQueryIndex]) => {
        const retVal: [string, Record<string, IndivPosInfo>] = [
          getModelKey(k, otherQueryIndex),
          showRoster && getRosterStats(k, rosterStats, otherQueryIndex).length
            ? LineupTableUtils.buildPositionPlayerMap(
                getRosterStats(k, rosterStats, otherQueryIndex),
                teamSeasonLookup,
                globalRosterInfo
              )
            : {},
        ];
        return retVal;
      })
      .fromPairs()
      .value();

    // If manual overrides specified we have some more work to do:
    const manualOverridesAsMap = _.isNil(gameFilterParams.manual)
      ? undefined
      : OverrideUtils.buildOverrideAsMap(gameFilterParams.manual);

    // If building roster info then enrich player stats:
    const playerInfoByIdBy0AB =
      showRoster || manualOverridesAsMap
        ? modelKeys.map(([queryKey, otherQueryIndex]) => {
            const playerStatsFor0AB = getRosterStats(
              queryKey,
              rosterStats,
              otherQueryIndex
            );
            const teamStatsFor0AB = getTeamStats(
              queryKey,
              teamStats,
              otherQueryIndex
            );
            if (teamStatsFor0AB.doc_count) {
              /** Need player info for tooltip view/lineup decoration */
              const playerInfo = LineupTableUtils.buildBaselinePlayerInfo(
                playerStatsFor0AB,
                globalRosterStatsByCode,
                teamStatsFor0AB,
                avgEfficiency,
                adjustForLuck,
                luckConfig.base,
                manualOverridesAsMap || {}
              );
              return playerInfo;
            } else {
              return undefined;
            }
          })
        : [];

    // Luck calculations and manual overrides

    // The luck baseline can either be the user-selecteed baseline or the entire season
    const baseLuckBuilder: () => [
      TeamStatSet,
      Record<PlayerId, IndivStatSet>
    ] = () => {
      if (adjustForLuck) {
        switch (luckConfig.base) {
          case "baseline":
            return [
              teamStats.baseline,
              _.fromPairs(
                (rosterStats.baseline || []).map((p: any) => [p.key, p])
              ),
            ];
          default:
            //("season")
            return [
              teamStats.global,
              _.fromPairs(
                (rosterStats.global || []).map((p: any) => [p.key, p])
              ),
            ];
        }
      } else return [StatModels.emptyTeam(), {}]; //(not used)
    };
    const [baseOrSeasonTeamStats, baseOrSeason3PMap] = baseLuckBuilder();

    // Create luck adjustments, inject luck into mutable stat sets, and calculate efficiency margins
    const luckAdjustment = _.fromPairs(
      modelKeys.map(([k, otherQueryIndex], ii) => {
        const compositeKey = getModelKey(k, otherQueryIndex);
        if (getTeamStats(k, teamStats, otherQueryIndex).doc_count) {
          const playerStats = playerInfoByIdBy0AB[ii] || {};

          // Before applying luck, reset any changes due to manual player overrides or earlier iterations of luck
          OverrideUtils.clearTeamManualOrLuckOverrides(
            getTeamStats(k, teamStats, otherQueryIndex)
          );

          if (adjustForLuck && k != "other") {
            //(currently don't support manual overrides for "other" queries)
            //(calculate expected numbers which then get incorporated into luck calcs)
            OverrideUtils.applyPlayerOverridesToTeam(
              k,
              gameFilterParams.manual || [],
              playerStats,
              getTeamStats(k, teamStats, otherQueryIndex),
              avgEfficiency,
              adjustForLuck
            );
          }

          //TODO: some (k != "other") to fix here
          const luckAdj = adjustForLuck
            ? ([
                LuckUtils.calcOffTeamLuckAdj(
                  getTeamStats(k, teamStats, otherQueryIndex),
                  getRosterStats(k, rosterStats, otherQueryIndex),
                  baseOrSeasonTeamStats,
                  baseOrSeason3PMap,
                  avgEfficiency,
                  undefined,
                  k != "other"
                    ? //(currently don't support manual overrides for "other" queries)
                      OverrideUtils.filterManualOverrides(
                        k,
                        gameFilterParams.manual
                      )
                    : []
                ),
                LuckUtils.calcDefTeamLuckAdj(
                  getTeamStats(k, teamStats, otherQueryIndex),
                  baseOrSeasonTeamStats,
                  avgEfficiency
                ),
              ] as [OffLuckAdjustmentDiags, DefLuckAdjustmentDiags])
            : undefined;

          // Extra mutable set, build net margin column:
          LineupUtils.buildEfficiencyMargins(
            getTeamStats(k, teamStats, otherQueryIndex)
          );

          // Mutate stats object to inject luck
          LuckUtils.injectLuck(
            getTeamStats(k, teamStats, otherQueryIndex),
            luckAdj?.[0],
            luckAdj?.[1]
          );

          if (!adjustForLuck && k != "other") {
            //(currently don't support manual overrides for "other" queries)
            //(else called above and incorporated into the luck adjustments)
            OverrideUtils.applyPlayerOverridesToTeam(
              k,
              gameFilterParams.manual || [],
              playerStats,
              getTeamStats(k, teamStats, otherQueryIndex),
              avgEfficiency,
              adjustForLuck
            );
          }
          return [compositeKey, luckAdj];
        } else {
          //(no docs)
          return [compositeKey, undefined];
        }
      })
    ) as Record<
      string,
      [OffLuckAdjustmentDiags, DefLuckAdjustmentDiags] | undefined
    >;

    //(end luck/manual overrides calcs)

    // Calc diffs if required ... needs to be before injectPlayTypeInfo but after luck injection!
    const [aMinusB, aMinusBase, bMinusBase] = showDiffs
      ? (() => {
          const aMinusB =
            teamStats.on?.doc_count && teamStats.off?.doc_count
              ? LineupUtils.getStatsDiff(
                  teamStats.on,
                  teamStats.off,
                  `'${onOffBaseToShortPhrase(
                    "on"
                  )}' - '${onOffBaseToShortPhrase("off")}' diffs`
                )
              : undefined;
          const aMinusBase =
            teamStats.on?.doc_count && teamStats.baseline?.doc_count
              ? LineupUtils.getStatsDiff(
                  teamStats.on,
                  teamStats.baseline,
                  `'${onOffBaseToShortPhrase("on")}' - 'Base' diffs`
                )
              : undefined;
          const bMinusBase =
            teamStats.off?.doc_count && teamStats.baseline?.doc_count
              ? LineupUtils.getStatsDiff(
                  teamStats.off,
                  teamStats.baseline,
                  `'${onOffBaseToShortPhrase("off")}' - 'Base' diffs`
                )
              : undefined;

          [aMinusB, aMinusBase, bMinusBase].forEach((statSet) => {
            if (statSet)
              TableDisplayUtils.injectPlayTypeInfo(
                statSet,
                false,
                false,
                teamSeasonLookup
              );
          });
          return [aMinusB, aMinusBase, bMinusBase];
        })()
      : ([undefined, undefined, undefined] as [any, any, any]);

    modelKeys.forEach(([k, otherQueryIndex]) => {
      TableDisplayUtils.injectPlayTypeInfo(
        getTeamStats(k, teamStats, otherQueryIndex),
        false,
        false,
        teamSeasonLookup
      );
    });

    // Show game info logic:
    const orderedMutableOppoList: Record<string, GameInfoStatSet> = {};
    const totalLineupsByQueryKey = _.chain(modelKeys)
      .map(([k, otherQueryIndex], ii) => {
        const compositeKey = getModelKey(k, otherQueryIndex);
        if (showGameInfo) {
          const lineups = lineupStats?.[ii]?.lineups || [];
          const totalLineup = _.assign(
            LineupUtils.calculateAggregatedLineupStats(lineups),
            {
              key: LineupTableUtils.totalLineupId,
              doc_count: lineups.length, //(for doc_count >0 checks, calculateAggregatedLineupStats doesn't inject)
            }
          );
          //(for reasons I don't understand the logic is different to the LineupStatsTable ...
          // the game_info isn't sorted but "orderedMutableOppoList" shouldn't be set
          //TODO: at some point i need to refactor/doc this game info code, but for now this works
          totalLineup.game_info = _.sortBy(
            (totalLineup.game_info as Array<GameInfoStatSet>) || [],
            (g) => g.date
          );
          orderedMutableOppoList[compositeKey] = {};
          return [compositeKey, totalLineup];
        } else {
          return [compositeKey, {}];
        }
      })
      .fromPairs()
      .value();
    //(end show game info logic)

    // Last stage before building the table: inject titles into the stats:
    const maybeBasePhrase = onOffBaseToLongerPhrase("baseline", false);
    const teamStatsKeys = _.zip(baselineOnOffKeys, [
      TableDisplayUtils.addQueryInfo(
        maybeBasePhrase != "'Base'" ? maybeBasePhrase : "Baseline",
        gameFilterParams,
        "baseline"
      ),
      TableDisplayUtils.addQueryInfo(
        onOffBaseToLongerPhrase("on", false),
        gameFilterParams,
        "on"
      ),
      TableDisplayUtils.addQueryInfo(
        onOffBaseToLongerPhrase("off", false),
        gameFilterParams,
        "off"
      ),
    ]);
    const teamStatsByQuery = _.chain(teamStatsKeys)
      .map((keyDesc) => {
        const queryKey = keyDesc[0]!;
        const desc = keyDesc[1];
        const maybeTitle = teamStats[queryKey]?.combo_title
          ? {
              off_title: teamStats[queryKey]?.combo_title,
            }
          : {
              off_title: teamStats[queryKey]?.off_title || (
                <b>{desc} Offense</b>
              ),
              def_title: teamStats[queryKey]?.def_title || (
                <b>{desc} Defense</b>
              ),
            };
        const retVal: [OnOffBaselineEnum, any] = [
          queryKey,
          {
            ...maybeTitle,
            ...teamStats[queryKey],
          },
        ];
        return retVal;
      })
      .fromPairs()
      .value() as {
      [P in OnOffBaselineOtherEnum]: any;
    };
    const teamStatsByOtherQuery = _.chain(teamStats.other || [])
      .map((other, idx) => {
        const attachedQueryInfo = TableDisplayUtils.addQueryInfo(
          onOffBaseToLongerPhrase("other", false, idx),
          gameFilterParams,
          "other",
          idx
        );
        const retVal: [string, any] = [
          getModelKey("other", idx),
          {
            off_title: <b>{attachedQueryInfo} Offense</b>,
            def_title: <b>{attachedQueryInfo} Defense</b>,
            ...other,
          },
        ];
        return retVal;
      })
      .fromPairs()
      .value();
    const teamStatsByCombinedQuery = (
      queryKey: OnOffBaselineOtherEnum,
      otherQueryIndex?: number
    ) => {
      return queryKey == "other"
        ? teamStatsByOtherQuery[getModelKey("other", otherQueryIndex || 0)]
        : teamStatsByQuery[queryKey];
    };

    /** If true, then repeat the table headers */
    const showingSomeDiags =
      showExtraInfo ||
      showStandaloneGrades ||
      showRoster ||
      showGameInfo ||
      showPlayTypes ||
      showShotCharts ||
      (showLuckAdjDiags && adjustForLuck);
    const showingOn = teamStats.on?.doc_count ? true : false;
    const showingOnOrOff =
      showingOn || (teamStats.off?.doc_count ? true : false);

    const shotChartQuickSwitchOptions = [
      {
        title: onOffBaseToLongerPhrase("baseline"),
        off: shotStats.baseline.off,
        def: shotStats.baseline.def,
        gender: gameFilterParams.gender as "Men" | "Women",
      },
      {
        title: onOffBaseToLongerPhrase("on"),
        off: shotStats.on.off,
        def: shotStats.on.def,
        gender: gameFilterParams.gender as "Men" | "Women",
      },
      {
        title: onOffBaseToLongerPhrase("off"),
        off: shotStats.off.off,
        def: shotStats.off.def,
        gender: gameFilterParams.gender as "Men" | "Women",
      },
    ]
      .concat(
        (shotStats.other || []).map((opt, idx) => {
          return {
            title: `'${String.fromCharCode(67 + idx)}'`,
            off: opt.off,
            def: opt.def,
            gender: gameFilterParams.gender as "Men" | "Women",
          };
        })
      )
      .filter((opt) => (opt.off?.doc_count || 0) > 0);

    const teamPlayTypeQuickSwitchOptions = [
      {
        title: onOffBaseToLongerPhrase("baseline"),
        players: rosterStats["baseline"] || [],
        rosterStatsByCode: globalRosterStatsByCode,
        teamStats: teamStatsByQuery["baseline"],
        showGrades: showGrades,
        avgEfficiency,
        showHelp,
      },
      {
        title: onOffBaseToLongerPhrase("on"),
        players: rosterStats["on"] || [],
        rosterStatsByCode: globalRosterStatsByCode,
        teamStats: teamStatsByQuery["on"],
        showGrades: showGrades,
        avgEfficiency,
        showHelp,
      },
      {
        title: onOffBaseToLongerPhrase("off"),
        players: rosterStats["off"] || [],
        rosterStatsByCode: globalRosterStatsByCode,
        teamStats: teamStatsByQuery["off"],
        showGrades: showGrades,
        avgEfficiency,
        showHelp,
      },
    ]
      .concat(
        (teamStats.other || []).map((__, idx) => {
          return {
            title: onOffBaseToLongerPhrase("other", false, idx),
            players: getRosterStats("other", rosterStats, idx),
            rosterStatsByCode: globalRosterStatsByCode,
            teamStats: getTeamStats("other", teamStats, idx),
            showGrades: showGrades,
            avgEfficiency,
            showHelp,
          };
        })
      )
      .filter((opt) => (opt.teamStats.doc_count || 0) > 0);

    /** Builds the basic info and all the optional diags/enrichment for a single lineup set (on/off/baseline) */
    const buildTableEntries = (
      queryKey: OnOffBaselineOtherEnum,
      displayKey: string,
      otherQueryIndex?: number
    ): TeamStatsBreakdown | undefined => {
      const compositeQueryKey = getModelKey(queryKey, otherQueryIndex || 0);
      const queryIndex = _.thru(queryKey, (k) => {
        switch (k) {
          case "baseline":
            return 0;
          case "on":
            return 1;
          case "off":
            return 2;
          case "other":
            return 3 + (otherQueryIndex || 0);
        }
      });
      const hasData =
        (getTeamStats(queryKey, teamStats, otherQueryIndex).doc_count || 0) > 0;

      const showExtraHeader =
        queryKey == "off"
          ? showingSomeDiags && showingOn
          : queryKey == "baseline"
          ? showingSomeDiags && showingOnOrOff
          : queryKey == "other"
          ? showingSomeDiags
          : false;

      if (hasData) {
        const teamStatsRows = _.flatten([
          showExtraHeader
            ? [
                GenericTableOps.buildHeaderRepeatRow(
                  CommonTableDefs.repeatingOnOffHeaderFields,
                  "small"
                ),
              ]
            : [],
          [
            GenericTableOps.buildDataRow(
              teamStatsByCombinedQuery(queryKey, otherQueryIndex),
              offPrefixFn,
              offCellMetaFn
            ),
          ],
          [
            GenericTableOps.buildDataRow(
              teamStatsByCombinedQuery(queryKey, otherQueryIndex),
              defPrefixFn,
              defCellMetaFn
            ),
          ],
          showStandaloneGrades
            ? GradeTableUtils.buildTeamGradeTableRows(
                onOffBaseToShortPhrase(queryKey, otherQueryIndex),
                {
                  selectionType: queryKey,
                  config: showGrades,
                  setConfig: (newConfig: string) => {
                    persistNewState.setShowGrades(newConfig);
                  },
                  teamStats: {
                    comboTier: divisionStatsCache.Combo,
                    highTier: divisionStatsCache.High,
                    mediumTier: divisionStatsCache.Medium,
                    lowTier: divisionStatsCache.Low,
                  },
                  team: getTeamStats(queryKey, teamStats, otherQueryIndex),
                }
              )
            : [],
          showShotCharts
            ? [
                GenericTableOps.buildTextRow(
                  <ShotChartDiagView
                    title={displayKey}
                    off={getShotStats(queryKey, shotStats, otherQueryIndex).off}
                    def={getShotStats(queryKey, shotStats, otherQueryIndex).def}
                    gender={gameFilterParams.gender as "Men" | "Women"}
                    quickSwitchOptions={shotChartQuickSwitchOptions.filter(
                      (opt) => opt.title != displayKey
                    )}
                    chartOpts={shotChartConfig}
                    onChangeChartOpts={(newOpts) => {
                      persistNewState.setShotChartConfig(newOpts);
                    }}
                  />,
                  "small"
                ),
              ]
            : [],
          showPlayTypes
            ? [
                GenericTableOps.buildTextRow(
                  _.isNil(
                    // If ".style" is present then use the pre-calcd values
                    //TODO: this is a bit of a hack, plus also needs to handle defence
                    teamStatsByCombinedQuery(queryKey, otherQueryIndex).style
                  ) ? (
                    <TeamPlayTypeTabbedView
                      title={displayKey}
                      players={getRosterStats(
                        queryKey,
                        rosterStats,
                        otherQueryIndex
                      )}
                      rosterStatsByCode={globalRosterStatsByCode}
                      teamStats={teamStatsByCombinedQuery(
                        queryKey,
                        otherQueryIndex
                      )}
                      avgEfficiency={avgEfficiency}
                      quickSwitchOptions={teamPlayTypeQuickSwitchOptions.filter(
                        (opt) => opt.title != displayKey
                      )}
                      showGrades={showGrades}
                      grades={divisionStatsCache}
                      showHelp={showHelp}
                      configStr={playStyleConfigStr}
                      updateConfig={persistNewState.setPlayStyleConfigStr}
                    />
                  ) : (
                    (!playTypeConfig || playTypeConfig.off
                      ? [
                          <TeamPlayTypeDiagRadar
                            title={"Offense"}
                            players={getRosterStats(
                              queryKey,
                              rosterStats,
                              otherQueryIndex
                            )}
                            rosterStatsByCode={globalRosterStatsByCode}
                            teamStats={teamStatsByCombinedQuery(
                              queryKey,
                              otherQueryIndex
                            )}
                            avgEfficiency={avgEfficiency}
                            showGrades={showGrades}
                            grades={divisionStatsCache}
                            configStr={playStyleConfigStr}
                            updateConfig={persistNewState.setPlayStyleConfigStr}
                            showHelp={showHelp}
                            quickSwitchOptions={
                              playTypeConfig?.def &&
                              teamStatsByCombinedQuery(
                                queryKey,
                                otherQueryIndex
                              ).def_style
                                ? undefined
                                : [
                                    {
                                      title: "Defense",
                                      players: getRosterStats(
                                        queryKey,
                                        rosterStats,
                                        otherQueryIndex
                                      ),
                                      rosterStatsByCode:
                                        globalRosterStatsByCode,
                                      teamStats: teamStatsByCombinedQuery(
                                        queryKey,
                                        otherQueryIndex
                                      ),
                                      defensiveOverride:
                                        teamStatsByCombinedQuery(
                                          queryKey,
                                          otherQueryIndex
                                        ).def_style,
                                      showGrades: showGrades,
                                      avgEfficiency,
                                      showHelp,
                                      quickSwitchOverride: undefined,
                                    },
                                  ]
                            }
                            quickSwitchOverride={undefined}
                            navigationLinkOverride={
                              //(note this is ignore unless in TeamStatsExplorer mode because !_.isEmpty(players))
                              <OverlayTrigger
                                placement="top"
                                overlay={(props: any) => (
                                  <Tooltip id="viewPlayerDetails" {...props}>
                                    The Team Stats Explorer Style view doesn't
                                    support players breakdowns...
                                    <br />
                                    <br />
                                    ...BUT just click on the hyperlink to open a
                                    new tab with the Team Analysis page with a
                                    style view that does support it. (Then click
                                    on the same hyperlink on that page or on any
                                    of the bar charts.)
                                  </Tooltip>
                                )}
                              >
                                <a
                                  target="_blank"
                                  href={UrlRouting.getGameUrl(
                                    {
                                      ...gameFilterParams,
                                      showExpanded: true,
                                      calcRapm: true,
                                      showTeamPlayTypes: true,
                                      showGrades: "rank:Combo",
                                      showExtraInfo: false,
                                      showRoster: true,
                                      teamPlayTypeConfig: "sos||||all||multi||",
                                    },
                                    {}
                                  )}
                                >
                                  <b>View Player Details</b>
                                  <sup>*</sup>
                                </a>
                              </OverlayTrigger>
                            }
                          />,
                        ]
                      : []
                    ).concat(
                      (!playTypeConfig || playTypeConfig.def) &&
                        teamStatsByCombinedQuery(queryKey, otherQueryIndex)
                          .def_style
                        ? [
                            <TeamPlayTypeDiagRadar
                              title={"Defense"}
                              players={getRosterStats(
                                queryKey,
                                rosterStats,
                                otherQueryIndex
                              )}
                              rosterStatsByCode={globalRosterStatsByCode}
                              teamStats={teamStatsByCombinedQuery(
                                queryKey,
                                otherQueryIndex
                              )}
                              defensiveOverride={
                                teamStatsByCombinedQuery(
                                  queryKey,
                                  otherQueryIndex
                                ).def_style
                              }
                              avgEfficiency={avgEfficiency}
                              showGrades={showGrades}
                              grades={divisionStatsCache}
                              configStr={playStyleConfigStr}
                              updateConfig={
                                persistNewState.setPlayStyleConfigStr
                              }
                              showHelp={showHelp}
                              quickSwitchOverride={undefined}
                            />,
                          ]
                        : []
                    )
                  ),
                  "small"
                ),
              ]
            : [],
          showExtraInfo
            ? [
                GenericTableOps.buildTextRow(
                  <span>
                    <TeamExtraStatsInfoView
                      name={displayKey}
                      teamStatSet={getTeamStats(
                        queryKey,
                        teamStats,
                        otherQueryIndex
                      )}
                      showGrades={showGrades}
                      grades={
                        showGrades
                          ? {
                              comboTier: divisionStatsCache.Combo,
                              highTier: divisionStatsCache.High,
                              mediumTier: divisionStatsCache.Medium,
                              lowTier: divisionStatsCache.Low,
                            }
                          : undefined
                      }
                    />
                  </span>,
                  "small pt-2"
                ),
              ]
            : [],
        ]);

        const teamRosterRows = _.flatten([
          showRoster
            ? [
                GenericTableOps.buildTextRow(
                  <span>
                    <TeamRosterDiagView
                      positionInfoGlobal={LineupTableUtils.getPositionalInfo(
                        lineupStats[queryIndex]?.lineups || [],
                        positionFromPlayerIdGlobal,
                        teamSeasonLookup
                      )}
                      positionInfoSample={
                        getTeamStats(queryKey, teamStats, otherQueryIndex)
                          .doc_count < teamStats.global.doc_count
                          ? LineupTableUtils.getPositionalInfo(
                              lineupStats[queryIndex]?.lineups || [],
                              positionFromPlayerId[compositeQueryKey],
                              teamSeasonLookup
                            )
                          : undefined
                      }
                      rosterStatsByPlayerId={
                        playerInfoByIdBy0AB[queryIndex] || {}
                      }
                      positionFromPlayerId={positionFromPlayerIdGlobal}
                      teamSeasonLookup={teamSeasonLookup}
                      showHelp={showHelp}
                    />
                  </span>,
                  "small pt-2"
                ),
              ]
            : [],
        ]);

        const teamDiagRows = _.flatten([
          showGameInfo
            ? [
                GenericTableOps.buildTextRow(
                  <GameInfoDiagView
                    oppoList={
                      LineupUtils.isGameInfoStatSet(
                        totalLineupsByQueryKey[compositeQueryKey].game_info
                      )
                        ? LineupUtils.getGameInfo(
                            totalLineupsByQueryKey[compositeQueryKey]
                              .game_info || {}
                          )
                        : (totalLineupsByQueryKey[compositeQueryKey]
                            .game_info as GameInfoStatSet[])
                    }
                    orderedOppoList={_.clone(
                      orderedMutableOppoList[compositeQueryKey]
                    )}
                    params={{}}
                    maxOffPoss={-1}
                  />,
                  "small pt-2"
                ),
              ]
            : [],
          showLuckAdjDiags && luckAdjustment[compositeQueryKey]
            ? [
                GenericTableOps.buildTextRow(
                  <LuckAdjDiagView
                    name={displayKey}
                    offLuck={luckAdjustment[compositeQueryKey]![0]}
                    defLuck={luckAdjustment[compositeQueryKey]![1]}
                    baseline={luckConfig.base}
                    showHelp={showHelp}
                  />,
                  "small pt-2"
                ),
              ]
            : [],
        ]);

        return {
          teamStatsRows,
          teamRosterRows,
          teamDiagRows,
        };
      } else {
        return undefined;
      }
    };

    return {
      baseline: buildTableEntries(
        "baseline",
        onOffBaseToLongerPhrase("baseline")
      ),
      on: buildTableEntries("on", onOffBaseToLongerPhrase("on")),
      off: buildTableEntries("off", onOffBaseToLongerPhrase("off")),
      other: (teamStats.other || []).map((__, queryIndex) => {
        return buildTableEntries(
          "other",
          onOffBaseToLongerPhrase("other", false, queryIndex),
          queryIndex
        );
      }),
      diffs: _.flatten([
        //(note diffs not supported when showing multiple queries)
        aMinusB
          ? _.flatten([
              [
                GenericTableOps.buildDataRow(
                  aMinusB,
                  offPrefixFn,
                  offCellMetaFn,
                  CommonTableDefs.onOffReportReplacement
                ),
              ],
              [
                GenericTableOps.buildDataRow(
                  aMinusB,
                  defPrefixFn,
                  defCellMetaFn,
                  CommonTableDefs.onOffReportReplacement
                ),
              ],
              [GenericTableOps.buildRowSeparator()],
            ])
          : [],
        aMinusBase
          ? _.flatten([
              [
                GenericTableOps.buildDataRow(
                  aMinusBase,
                  offPrefixFn,
                  offCellMetaFn,
                  CommonTableDefs.onOffReportReplacement
                ),
              ],
              [
                GenericTableOps.buildDataRow(
                  aMinusBase,
                  defPrefixFn,
                  defCellMetaFn,
                  CommonTableDefs.onOffReportReplacement
                ),
              ],
              [GenericTableOps.buildRowSeparator()],
            ])
          : [],
        bMinusBase
          ? _.flatten([
              [
                GenericTableOps.buildDataRow(
                  bMinusBase,
                  offPrefixFn,
                  offCellMetaFn,
                  CommonTableDefs.onOffReportReplacement
                ),
              ],
              [
                GenericTableOps.buildDataRow(
                  bMinusBase,
                  defPrefixFn,
                  defCellMetaFn,
                  CommonTableDefs.onOffReportReplacement
                ),
              ],
              [GenericTableOps.buildRowSeparator()],
            ])
          : [],
      ]),
    };
  }
}
