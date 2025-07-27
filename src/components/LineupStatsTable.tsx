// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
//@ts-ignore
import Select, { components } from "react-select";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import { RosterStatsModel } from "./RosterStatsTable";
import { TeamStatsModel } from "./TeamStatsTable";
import LuckConfigModal from "./shared/LuckConfigModal";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import LuckAdjDiagView from "./diags/LuckAdjDiagView";
import GameInfoDiagView from "./diags/GameInfoDiagView";
import AsyncFormControl from "./shared/AsyncFormControl";

// Table building
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";

// Util imports
import {
  StatModels,
  PlayerCodeId,
  PlayerId,
  IndivStatSet,
  LineupStatSet,
} from "../utils/StatModels";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { PositionUtils } from "../utils/stats/PositionUtils";
import { LineupUtils } from "../utils/stats/LineupUtils";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import {
  LineupFilterParams,
  ParamDefaults,
  LuckParams,
  getCommonFilterParams,
} from "../utils/FilterModels";
import PlayerSelector from "./shared/PlayerSelector";
import ThemedSelect from "./shared/ThemedSelect";

export type LineupStatsModel = {
  lineups: Array<LineupStatSet>;
  error_code?: string;
};
type Props = {
  startingState: LineupFilterParams;
  dataEvent: {
    lineupStats: LineupStatsModel;
    teamStats: TeamStatsModel;
    rosterStats: RosterStatsModel;
  };
  onChangeState: (newParams: LineupFilterParams) => void;
};

/** Recursive util method to get all pairwise lineup combos */
function getPairs(ids: Array<string>): Array<string> {
  if (ids.length < 2) {
    return [];
  }
  const first = _.first(ids);
  const rest = _.drop(ids, 1);
  const pairs = _.map(rest, (x) => `${first} / ${x}`);
  return pairs.concat(getPairs(rest));
}

/** Recursive util method to get all triplewise lineup combos */
function getTriples(ids: Array<string>): Array<string> {
  if (ids.length < 3) {
    return [];
  }
  const first = _.first(ids);
  const rest = _.drop(ids, 1);
  const triples = getPairs(rest).map((x) => `${first} / ${x}`);
  return triples.concat(getTriples(rest));
}

/** Recursive util method to get all quadwise lineup combos */
function getQuads(ids: Array<string>): Array<string> {
  if (ids.length < 4) {
    return [];
  }
  const first = _.first(ids);
  const rest = _.drop(ids, 1);
  const triples = getTriples(rest).map((x) => `${first} / ${x}`);
  return triples.concat(getQuads(rest));
}

/** Builds all combos of from the set of ids being on and off (down to 2) */
function getStarterOnOff(
  ids: Array<string>
): Array<[Set<string>, Set<string>]> {
  const quads = getQuads(ids);
  const triples = getTriples(ids);
  const pairs = getPairs(ids);
  const singles = ids.length <= 4 ? ids : []; //(for full lineup only go down 2 on)
  const all = _.flatten([quads, triples, pairs, singles]);
  const startingPair: [Set<string>, Set<string>] = [
    new Set(ids),
    new Set<string>(),
  ];
  return (ids.length > 4 ? [startingPair] : []).concat(
    all.map((combo) => {
      const comboBreakdown = new Set(combo.split(" / "));
      const missing = ids.filter((id) => !comboBreakdown.has(id));
      const retVal: [Set<string>, Set<string>] = [
        comboBreakdown,
        new Set(missing),
      ];
      return retVal;
    })
  );
}

/** For a given lineup, figures out which starter-on-off combos it matches */
function getStarterOnOffDiff(
  ids: Array<string>,
  starterOnOff: Array<[Set<string>, Set<string>]>
): Array<string> {
  return starterOnOff
    .filter(([onSet, offSet]) => {
      const onCount = _.sumBy(
        ids,
        (id) => (onSet.has(id) ? 1 : offSet.has(id) ? 100 : 0) //(any off count his is a disqualifier)
      );
      return onCount == onSet.size;
    })
    .map(([onSet, offSet]) => {
      // Turn into a key:
      return Array.from(onSet.entries())
        .map((id) => id[0])
        .concat(Array.from(offSet.entries()).map((id) => `-${id[0]}`))
        .join(" / ");
    });
}

const LineupStatsTable: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
}) => {
  const { lineupStats, teamStats, rosterStats } = dataEvent;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data Model

  // 2] State

  // Misc display

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  /** Whether to show the weighted combo of all visible lineups */
  const [showTotals, setShowTotals] = useState(
    _.isNil(startingState.showTotal)
      ? ParamDefaults.defaultLineupShowTotal
      : startingState.showTotal
  );

  /** Whether to show the weighted combo of all visible lineups */
  const [showDropped, setShowDropped] = useState(
    _.isNil(startingState.showOff)
      ? ParamDefaults.defaultLineupShowDropped
      : startingState.showOff
  );

  const teamSeasonLookup = `${startingState.gender}_${startingState.team}_${startingState.year}`;

  const startingMinPoss =
    startingState.minPoss || ParamDefaults.defaultLineupMinPos;
  const [minPoss, setMinPoss] = useState(startingMinPoss);
  const startingMaxTableSize =
    startingState.maxTableSize || ParamDefaults.defaultLineupMaxTableSize;
  const [maxTableSize, setMaxTableSize] = useState(startingMaxTableSize);
  const [sortBy, setSortBy] = useState(
    startingState.sortBy || ParamDefaults.defaultLineupSortBy
  );
  const [filterStr, setFilterStr] = useState(
    startingState.filter || ParamDefaults.defaultLineupFilter
  );

  // Luck:

  /** Adjust for luck in all stats */
  const [adjustForLuck, setAdjustForLuck] = useState(
    _.isNil(startingState.lineupLuck)
      ? ParamDefaults.defaultLineupLuckAdjust
      : startingState.lineupLuck
  );
  /** Whether to show the luck diagnostics */
  const [showLuckAdjDiags, setShowLuckAdjDiags] = useState(
    _.isNil(startingState.showLineupLuckDiags)
      ? ParamDefaults.defaultLineupLuckDiagMode
      : startingState.showLineupLuckDiags
  );
  /** The settings to use for luck adjustment */
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(startingState.luck)
      ? ParamDefaults.defaultLuckConfig
      : startingState.luck
  );

  /** For smaller possession counts make sense to show pts rather than pts/100 */
  const [showRawPts, setShowRawPts] = useState(
    startingState.showRawPts || false
  );

  /** Whether we are showing the luck config modal */
  const [showLuckConfig, setShowLuckConfig] = useState(false);

  /** Whether to badge/colorize the lineups */
  const [decorateLineups, setDecorateLineups] = useState(
    _.isNil(startingState.decorate)
      ? ParamDefaults.defaultLineupDecorate
      : startingState.decorate
  );

  const [aggregateByPos, setAggregateByPos] = useState(
    _.isNil(startingState.aggByPos)
      ? ParamDefaults.defaultLineupAggByPos
      : startingState.aggByPos
  );
  const [onOffPlayerSel, setOnOffPlayerSel] = useState(
    startingState.onOffPlayerSel || ""
  );

  const [showGameInfo, setShowGameInfo] = useState(
    _.isNil(startingState.showGameInfo)
      ? ParamDefaults.defaultLineupShowGameInfo
      : startingState.showGameInfo
  );

  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    true as boolean
  ); //(always start as true)

  useEffect(() => {
    //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...startingState,
      // Luck
      luck: luckConfig,
      lineupLuck: adjustForLuck,
      showLineupLuckDiags: showLuckAdjDiags,
      aggByPos: aggregateByPos,
      showGameInfo: showGameInfo,
      // Misc filters
      decorate: decorateLineups,
      showTotal: showTotals,
      showOff: showDropped,
      showRawPts,
      minPoss: minPoss,
      maxTableSize: maxTableSize,
      sortBy: sortBy,
      filter: filterStr,
      onOffPlayerSel,
    };
    onChangeState(newState);
  }, [
    decorateLineups,
    showTotals,
    showDropped,
    minPoss,
    maxTableSize,
    sortBy,
    filterStr,
    luckConfig,
    adjustForLuck,
    showLuckAdjDiags,
    aggregateByPos,
    showGameInfo,
    showRawPts,
    onOffPlayerSel,
  ]);

  // 3] Utils

  // 3.0] Luck calculations:

  const genderYearLookup = `${startingState.gender}_${startingState.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  /** Largest sample of player stats, by player key - use for ORtg calcs */
  const globalRosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
    rosterStats.global || [],
    teamStats.global?.roster
  );

  /** Need baseline player info for tooltip view/lineup decoration */
  const baselinePlayerInfo = LineupTableUtils.buildBaselinePlayerInfo(
    rosterStats.baseline,
    globalRosterStatsByCode,
    teamStats.baseline,
    avgEfficiency,
    adjustForLuck,
    luckConfig.base
  );

  // 3.1] Build individual info

  // 3.1.1] Positional info from the season stats

  /** Only rebuild the expensive table if one of the parameters that controls it changes */
  const table = React.useMemo(() => {
    const lineups = lineupStats?.lineups || [];

    if (showGameInfo) {
      const haveGameInfo: boolean = !_.isNil(lineups?.[0]?.game_info);
      setLoadingOverride(!haveGameInfo); //(special case ... don't remove overlay until we have game info)
    } else {
      setLoadingOverride(false); //(rendering)
    }

    const positionFromPlayerKey = LineupTableUtils.buildPositionPlayerMap(
      rosterStats.global,
      teamSeasonLookup
    );

    // 3.2] Table building

    const offPrefixFn = (key: string) => "off_" + key;
    const offCellMetaFn = (key: string, val: any) => "off";
    const defPrefixFn = (key: string) => "def_" + key;
    const defCellMetaFn = (key: string, val: any) => "def";

    // Build a list of all the opponents:
    const orderedMutableOppoList = LineupUtils.buildOpponentList(
      lineups,
      showGameInfo
    );

    if (aggregateByPos == "") {
      const [filteredLineups, droppedLineups] =
        LineupTableUtils.buildFilteredLineups(
          lineups,
          filterStr,
          sortBy,
          minPoss,
          maxTableSize,
          teamSeasonLookup,
          positionFromPlayerKey,
          showDropped
        );
      const globalMaxPoss = _.chain(filteredLineups)
        .flatMap((l) => LineupUtils.getGameInfo(l.game_info || {}))
        .map((oppo) => oppo?.num_off_poss || 0)
        .reduce((acc, offPoss) => (offPoss > acc ? offPoss : acc))
        .value();

      const tableData = LineupTableUtils.buildEnrichedLineups(
        filteredLineups,
        teamStats.global,
        rosterStats.global,
        teamStats.baseline,
        adjustForLuck,
        luckConfig.base,
        avgEfficiency,
        showTotals,
        teamSeasonLookup,
        positionFromPlayerKey,
        baselinePlayerInfo,
        droppedLineups
      ).flatMap((lineup, lineupIndex) => {
        TableDisplayUtils.injectPlayTypeInfo(
          lineup,
          false,
          false,
          teamSeasonLookup
        ); //(inject assist numbers)

        // Create (off_/def_)raw_net and raw_ppp if needed
        if (showRawPts) {
          TableDisplayUtils.turnPppIntoRawPts(lineup, adjustForLuck);
        }

        const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
        const sortedCodesAndIds =
          lineup.key == LineupTableUtils.totalLineupId
            ? undefined
            : PositionUtils.orderLineup(
                codesAndIds,
                positionFromPlayerKey,
                teamSeasonLookup
              );

        const perLineupBaselinePlayerMap: Record<PlayerId, IndivStatSet> =
          _.fromPairs(
            codesAndIds.map((cid: PlayerCodeId) => {
              return [
                cid.id,
                baselinePlayerInfo[cid.id] || StatModels.emptyIndiv(),
              ];
            })
          );

        const lineupTitleKey = "" + lineupIndex;
        const title = _.thru("", (__) => {
          if (lineup.key == LineupTableUtils.totalLineupId) {
            return "Weighted Total";
          } else if (lineup.key == LineupTableUtils.droppedLineupId) {
            return "'Off' Lineups";
          } else {
            return TableDisplayUtils.buildDecoratedLineup(
              lineupTitleKey,
              sortedCodesAndIds || [],
              perLineupBaselinePlayerMap,
              positionFromPlayerKey,
              "off_adj_rtg",
              decorateLineups,
              getCommonFilterParams(startingState)
            );
          }
        });

        const stats = { off_title: title, def_title: "", ...lineup };

        const isUsingLuckAndShowingDiags =
          showLuckAdjDiags &&
          lineup.off_luck_diags &&
          lineup.def_luck_diags &&
          sortedCodesAndIds;
        const showRepeatingHeaderThisLine =
          showRepeatingHeader &&
          !showGameInfo &&
          !isUsingLuckAndShowingDiags &&
          lineupIndex > 0 &&
          0 == lineupIndex % 5;

        return _.flatten([
          (showGameInfo || isUsingLuckAndShowingDiags) &&
          showRepeatingHeader &&
          lineupIndex > 0
            ? [
                GenericTableOps.buildHeaderRepeatRow(
                  CommonTableDefs.repeatingLineupHeaderFields,
                  "small"
                ),
              ]
            : [],
          showRepeatingHeaderThisLine
            ? [
                GenericTableOps.buildHeaderRepeatRow(
                  CommonTableDefs.repeatingLineupHeaderFields,
                  "small"
                ),
                GenericTableOps.buildRowSeparator(),
              ]
            : [],
          [GenericTableOps.buildDataRow(stats, offPrefixFn, offCellMetaFn)],
          [GenericTableOps.buildDataRow(stats, defPrefixFn, defCellMetaFn)],
          showGameInfo
            ? [
                GenericTableOps.buildTextRow(
                  <GameInfoDiagView
                    oppoList={
                      LineupUtils.isGameInfoStatSet(lineup.game_info)
                        ? LineupUtils.getGameInfo(lineup.game_info || {})
                        : lineup.game_info //(total lineups - this is already an array, see LineupStatSet in StatModels)
                    }
                    orderedOppoList={_.clone(orderedMutableOppoList)}
                    params={startingState}
                    maxOffPoss={
                      lineup.key == LineupTableUtils.totalLineupId
                        ? -1
                        : globalMaxPoss
                    }
                  />,
                  "small"
                ),
              ]
            : [],
          isUsingLuckAndShowingDiags
            ? [
                GenericTableOps.buildTextRow(
                  <LuckAdjDiagView
                    name="lineup"
                    offLuck={lineup.off_luck_diags!}
                    defLuck={lineup.def_luck_diags!}
                    baseline={luckConfig.base}
                    showHelp={showHelp}
                  />,
                  "small pt-2"
                ),
              ]
            : [],
          [GenericTableOps.buildRowSeparator()],
        ]);
      });
      return (
        <GenericTable
          tableCopyId="lineupStatsTable"
          tableFields={CommonTableDefs.lineupTable(showRawPts)}
          tableData={tableData}
          cellTooltipMode="none"
        />
      );
    } else {
      // First we aggregate the lineups into common position groups, then render that
      const [filteredLineups, droppedLineups] =
        LineupTableUtils.buildFilteredLineups(
          lineups,
          filterStr,
          sortBy,
          "0",
          "1000",
          teamSeasonLookup,
          positionFromPlayerKey
        );

      var varStarterOnOffInfo: Array<[Set<string>, Set<string>]> = [];
      var varStartingLineup: Array<PlayerCodeId> = [];
      if (aggregateByPos == "On-Off") {
        const [topLineup, dummyField] = LineupTableUtils.buildFilteredLineups(
          lineups,
          onOffPlayerSel,
          sortBy,
          "0",
          "1",
          teamSeasonLookup,
          positionFromPlayerKey
        );
        if (topLineup.length > 0) {
          const codesAndIds = LineupTableUtils.buildCodesAndIds(topLineup[0]!);
          const sortedCodesAndIds = PositionUtils.orderLineup(
            codesAndIds,
            positionFromPlayerKey,
            teamSeasonLookup
          );

          varStartingLineup = sortedCodesAndIds; //TODO: also reduce to just the selected players
        } else {
          const allCodes = (rosterStats.global || []).flatMap((p) => {
            const codeId = p.player_array?.hits?.hits?.[0]?._source?.player;
            return codeId ? [codeId as PlayerCodeId] : [];
          });
          varStartingLineup = allCodes;
        }
        if (onOffPlayerSel.length > 0) {
          varStartingLineup = _.chain(varStartingLineup)
            .filter((codeId) => {
              return (onOffPlayerSel + ";").includes(codeId.code + ";");
            })
            .take(5)
            .value();
        }
        varStarterOnOffInfo = getStarterOnOff(
          varStartingLineup.map((p) => p.id)
        );
      }

      const enrichedLineupsPhase1 = _.chain(
        LineupTableUtils.buildEnrichedLineups(
          filteredLineups,
          teamStats.global,
          rosterStats.global,
          teamStats.baseline,
          adjustForLuck,
          luckConfig.base,
          avgEfficiency,
          showTotals,
          teamSeasonLookup,
          positionFromPlayerKey,
          baselinePlayerInfo
        )
      ).flatMap((lineup, lineupIndex) => {
        TableDisplayUtils.injectPlayTypeInfo(
          lineup,
          false,
          false,
          teamSeasonLookup
        ); //(inject assist numbers)

        const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
        const sortedCodesAndIds =
          lineup.key == LineupTableUtils.totalLineupId
            ? undefined
            : PositionUtils.orderLineup(
                codesAndIds,
                positionFromPlayerKey,
                teamSeasonLookup
              );

        const getBackcourtCombos = () => {
          const top4 = _.take(sortedCodesAndIds || [], 4).map((p) => p.id);
          const pf = top4?.[3] || "";
          const is4Guard = _.endsWith(
            positionFromPlayerKey[pf]?.posClass || "",
            "G"
          ); //(not "G?" since we don't really know if that's a guard/forward yet)
          return is4Guard ? top4.join(" / ") : _.take(top4, 3).join(" / ");
        };
        const getKeys = (l: LineupStatSet) => {
          if (lineup.key != LineupTableUtils.totalLineupId)
            switch (aggregateByPos) {
              case "PG":
                return [sortedCodesAndIds?.[0]?.id || "Unknown"];
              case "Backcourt":
                return [getBackcourtCombos()];
              case "PG+C":
                return [
                  `${sortedCodesAndIds?.[0]?.id || "Unknown"} / ${
                    sortedCodesAndIds?.[4]?.id || "Unknown"
                  }`,
                ];
              case "Frontcourt":
                return [
                  _.chain(sortedCodesAndIds || [])
                    .drop(3)
                    .map((p) => p.id)
                    .value()
                    .join(" / "),
                ];
              case "C":
                return [sortedCodesAndIds?.[4]?.id || "Unknown"];
              case "Pairs":
                return getPairs((sortedCodesAndIds || []).map((p) => p.id));
              case "Triples":
                return getTriples((sortedCodesAndIds || []).map((p) => p.id));
              case "Quads":
                return getQuads((sortedCodesAndIds || []).map((p) => p.id));
              case "On-Off":
                return getStarterOnOffDiff(
                  (sortedCodesAndIds || []).map((p) => p.id),
                  varStarterOnOffInfo
                );
              default:
                return [];
            }
          else return [LineupTableUtils.totalLineupId];
        };

        return getKeys(lineup).map((key) => {
          const comboCodeAndIds = _.thru(key.split(" / "), (keys) => {
            if (aggregateByPos == "On-Off") {
              const keySet = new Set(keys);
              return varStartingLineup.map((codeId) => {
                if (keySet.has(codeId.id)) {
                  return codeId;
                } else {
                  return {
                    ...codeId,
                    id: `-${codeId.id}`,
                  };
                }
              });
            } else {
              return keys.flatMap((keyPos) =>
                (sortedCodesAndIds || []).filter(
                  (codeId) => codeId.id == keyPos
                )
              );
            }
          });
          const stats = {
            ...lineup,
            posKey: key,
            codesAndIds: comboCodeAndIds,
          } as LineupStatSet;
          return stats;
        });
      });

      const enrichedLineups = enrichedLineupsPhase1
        .groupBy((l) => l.posKey)
        .mapValues((lineups) => {
          const posKey = lineups?.[0].posKey;
          const codesAndIds = lineups?.[0].codesAndIds || [];

          const perLineupBaselinePlayerMap: Record<PlayerId, IndivStatSet> =
            _.fromPairs(
              codesAndIds.map((cid: PlayerCodeId) => {
                return [
                  cid.id,
                  baselinePlayerInfo[cid.id] || StatModels.emptyIndiv(),
                ];
              })
            );

          const linkParams = getCommonFilterParams(startingState);
          const maybeOnClickOverride = _.thru(aggregateByPos, (agg) => {
            switch (agg) {
              case "PG":
              case "Backcourt":
              case "PG+C":
              case "Frontcourt":
              case "C":
                return (codes: { code: string; id: string }[]) => {
                  const excludeList = enrichedLineupsPhase1
                    .filter((l) => {
                      // Go over all lineups, remove those that are part of this positional lineup key
                      //... or don't have all players (anywhere in lineup) from this position lineup key

                      return (
                        l.key != LineupTableUtils.totalLineupId &&
                        l.posKey != posKey &&
                        _.every(codes, (playerSet) => {
                          return (
                            l.key.startsWith(playerSet.code + "_") ||
                            l.key.endsWith("_" + playerSet.code) ||
                            l.key.indexOf("_" + playerSet.code + "_") >= 0
                          );
                        })
                      );
                    })
                    .flatMap((l) => {
                      return (l.codesAndIds || []).filter((cid) => {
                        return !_.some(codes, (playerSet) => {
                          return cid.id == playerSet.id;
                        });
                      });
                    })
                    .uniqBy((cid) => cid.code)
                    .value();

                  return TableDisplayUtils.buildGameUrl(
                    linkParams,
                    codes,
                    excludeList
                  );
                };
              default:
                return undefined;
            }
          });

          const lineupTitleKey = "" + posKey;
          const title = TableDisplayUtils.buildDecoratedLineup(
            lineupTitleKey,
            codesAndIds,
            perLineupBaselinePlayerMap,
            positionFromPlayerKey,
            "off_adj_rtg",
            decorateLineups,
            linkParams,
            false,
            maybeOnClickOverride
          );

          const maybeLineBreak = aggregateByPos.length > 2 ? <br /> : null;

          return posKey == LineupTableUtils.totalLineupId
            ? {
                ...lineups[0],
                off_title: "Weighted Total",
                def_title: undefined,
              }
            : {
                ...LineupUtils.calculateAggregatedLineupStats(lineups),
                off_title: (
                  <div>
                    Lineups with [<b>{aggregateByPos}</b>]: {maybeLineBreak}
                    <b>{title}</b>
                  </div>
                ),
                def_title: undefined,
              };
        })
        .value();

      const maybeTotal = enrichedLineups?.[LineupTableUtils.totalLineupId];
      const otherLineups = _.chain(enrichedLineups)
        .omit([LineupTableUtils.totalLineupId])
        .values()
        .value() as LineupStatSet[];
      const [refilteredLineupsNotTotal, ignoreTheseLineups] =
        LineupTableUtils.buildFilteredLineups(
          otherLineups,
          "",
          sortBy,
          minPoss,
          maxTableSize,
          teamSeasonLookup,
          positionFromPlayerKey
        );
      const refilteredLineups = (maybeTotal ? [maybeTotal as any] : []).concat(
        refilteredLineupsNotTotal
      );
      const comboGlobalMaxPoss = _.chain(refilteredLineupsNotTotal)
        .flatMap((l) => l.game_info || {})
        .map((oppo) => oppo?.num_off_poss || 0)
        .reduce((acc, offPoss) => (offPoss > acc ? offPoss : acc))
        .value();

      const tableData = refilteredLineups.flatMap((stats, index) => {
        // Re-enrich if not total
        if (stats.posKey != LineupTableUtils.totalLineupId) {
          TableDisplayUtils.injectPlayTypeInfo(
            stats,
            false,
            false,
            teamSeasonLookup
          ); //(inject assist numbers)
        }
        if (showRawPts) {
          TableDisplayUtils.turnPppIntoRawPts(stats, adjustForLuck);
        }

        const showRepeatingHeaderThisLine =
          showRepeatingHeader && !showGameInfo && index > 0 && 0 == index % 5;

        return _.flatten([
          showGameInfo && showRepeatingHeader
            ? [
                GenericTableOps.buildHeaderRepeatRow(
                  CommonTableDefs.repeatingLineupHeaderFields,
                  "small"
                ),
              ]
            : [],
          showRepeatingHeaderThisLine
            ? [
                GenericTableOps.buildHeaderRepeatRow(
                  CommonTableDefs.repeatingLineupHeaderFields,
                  "small"
                ),
                GenericTableOps.buildRowSeparator(),
              ]
            : [],
          [GenericTableOps.buildDataRow(stats, offPrefixFn, offCellMetaFn)],
          [GenericTableOps.buildDataRow(stats, defPrefixFn, defCellMetaFn)],
          showGameInfo
            ? [
                GenericTableOps.buildTextRow(
                  <GameInfoDiagView
                    oppoList={stats.game_info || []}
                    orderedOppoList={_.clone(orderedMutableOppoList)}
                    params={startingState}
                    maxOffPoss={comboGlobalMaxPoss}
                  />,
                  "small"
                ),
              ]
            : [],
          [GenericTableOps.buildRowSeparator()],
        ]);
      });

      return (
        <GenericTable
          tableCopyId="lineupStatsTable"
          tableFields={CommonTableDefs.lineupTable(showRawPts)}
          tableData={tableData}
          cellTooltipMode="none"
        />
      );
    }
  }, [
    decorateLineups,
    showTotals,
    showDropped,
    showRawPts,
    minPoss,
    maxTableSize,
    sortBy,
    filterStr,
    luckConfig,
    adjustForLuck,
    showLuckAdjDiags,
    aggregateByPos,
    showGameInfo,
    showRepeatingHeader,
    onOffPlayerSel,
    dataEvent,
  ]);

  // 3.2] Sorting utils

  const sortOptions: Array<any> = _.flatten(
    _.toPairs(CommonTableDefs.lineupTable(false))
      .filter((keycol) => keycol[1].colName && keycol[1].colName != "")
      .map((keycol) => {
        return [
          ["desc", "off"],
          ["asc", "off"],
          ["desc", "def"],
          ["asc", "def"],
          ["desc", "diff"],
          ["asc", "diff"],
        ].map((combo) => {
          const ascOrDesc = (s: string) => {
            switch (s) {
              case "asc":
                return "Asc.";
              case "desc":
                return "Desc.";
            }
          };
          const offOrDef = (s: string) => {
            switch (s) {
              case "off":
                return "Offensive";
              case "def":
                return "Defensive";
              case "diff":
                return "Off-Def";
            }
          };
          return {
            label: `${keycol[1].colName} (${ascOrDesc(combo[0])} / ${offOrDef(
              combo[1]
            )})`,
            value: `${combo[0]}:${combo[1]}_${keycol[0]}`,
          };
        });
      })
  );
  const sortOptionsByValue = _.fromPairs(
    sortOptions.map((opt) => [opt.value, opt])
  );
  /** Put these options at the front */
  const mostUsefulSubset = [
    "desc:off_poss",
    "desc:diff_adj_ppp",
    "desc:off_adj_ppp",
    "asc:def_adj_ppp",
  ];
  /** The two sub-headers for the dropdown */
  const groupedOptions = [
    {
      label: "Most useful",
      options: _.chain(sortOptionsByValue)
        .pick(mostUsefulSubset)
        .values()
        .value(),
    },
    {
      label: "Other",
      options: _.chain(sortOptionsByValue)
        .omit(mostUsefulSubset)
        .values()
        .value(),
    },
  ];
  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return loadingOverride || _.isEmpty(lineupStats.lineups);
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return sortOptionsByValue[s];
  }

  // 4] View

  const comboLabel: String | undefined = (() => {
    switch (aggregateByPos) {
      case "Pairs":
      case "Triples":
      case "Quads":
        return aggregateByPos;
      default:
        return undefined;
    }
  })();

  /** At the expense of some time makes it easier to see when changes are happening */
  const friendlyChange = (
    change: () => void,
    guard: boolean,
    timeout: number = 250
  ) => {
    if (guard) {
      setLoadingOverride(true);
      setTimeout(() => {
        change();
      }, timeout);
    }
  };

  return (
    <Container fluid>
      <LoadingOverlay
        active={needToLoadQuery()}
        text={
          lineupStats.error_code
            ? `Query Error: ${lineupStats.error_code}`
            : loadingOverride
            ? "Recalculating table"
            : "Press 'Submit' to view results"
        }
      >
        <LuckConfigModal
          show={showLuckConfig}
          onHide={() => setShowLuckConfig(false)}
          onSave={(l: LuckParams) => setLuckConfig(l)}
          luck={luckConfig}
          showHelp={showHelp}
        />
        <Form.Row>
          <Form.Group as={Col} xs={10}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="filter">Filter</InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={filterStr}
                onChange={(t: string) =>
                  friendlyChange(() => setFilterStr(t), t != filterStr)
                }
                timeout={500}
                placeholder="eg Player1Code=PG;Player2FirstName;-Player3Surname;Player4Name=4+5"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} xs={1} className="pl-4">
            <GenericTogglingMenu>
              <GenericTogglingMenuItem
                text="Decorate Lineups"
                truthVal={decorateLineups}
                onSelect={() =>
                  friendlyChange(
                    () => setDecorateLineups(!decorateLineups),
                    true
                  )
                }
              />
              <GenericTogglingMenuItem
                text="Show Weighted Combo of All Lineups"
                truthVal={showTotals}
                onSelect={() =>
                  friendlyChange(() => setShowTotals(!showTotals), true)
                }
              />
              <GenericTogglingMenuItem
                text="Show raw Off/Def/Net as Pts (vs P/100)"
                truthVal={showRawPts}
                onSelect={() =>
                  friendlyChange(() => setShowRawPts(!showRawPts), true)
                }
              />
              <GenericTogglingMenuItem
                text="Show Weighted Combo of All Filtered-Out Lineups"
                truthVal={showDropped}
                onSelect={() =>
                  friendlyChange(() => setShowDropped(!showDropped), true)
                }
              />
              <GenericTogglingMenuItem
                text={
                  <span>
                    Adjust for Luck{" "}
                    <span className="badge badge-pill badge-info">alpha!</span>
                  </span>
                }
                truthVal={adjustForLuck}
                onSelect={() =>
                  friendlyChange(() => setAdjustForLuck(!adjustForLuck), true)
                }
                helpLink={
                  showHelp
                    ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html"
                    : undefined
                }
              />
              <GenericTogglingMenuItem
                text="Show Minimal Game Info for All Lineups"
                truthVal={showGameInfo}
                onSelect={() =>
                  friendlyChange(() => setShowGameInfo(!showGameInfo), true)
                }
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text="Configure Luck Adjustments..."
                truthVal={false}
                onSelect={() => setShowLuckConfig(true)}
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text="Show Luck Adjustment diagnostics"
                truthVal={showLuckAdjDiags}
                onSelect={() => setShowLuckAdjDiags(!showLuckAdjDiags)}
              />
              <GenericTogglingMenuItem
                text={"Show repeating header every 10 rows"}
                truthVal={showRepeatingHeader}
                onSelect={() =>
                  friendlyChange(
                    () => setShowRepeatingHeader(!showRepeatingHeader),
                    true
                  )
                }
              />
            </GenericTogglingMenu>
          </Form.Group>
        </Form.Row>
        <Form.Row>
          <Form.Group as={Col} xs={3}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="maxLineups">Max Lineups</InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={startingMaxTableSize}
                validate={(t: string) => t.match("^[0-9]*$") != null}
                onChange={(t: string) =>
                  friendlyChange(() => setMaxTableSize(t), t != maxTableSize)
                }
                timeout={200}
                placeholder="eg 50"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} xs={3}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="minPossessions">
                  Min Poss #
                </InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={startingMinPoss}
                validate={(t: string) => t.match("^[0-9]*$") != null}
                onChange={(t: string) =>
                  friendlyChange(() => setMinPoss(t), t != minPoss)
                }
                timeout={200}
                placeholder="eg 20"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} xs={6}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="sortBy">Sort By</InputGroup.Text>
              </InputGroup.Prepend>
              <ThemedSelect
                className="w-75"
                value={stringToOption(sortBy)}
                options={groupedOptions}
                onChange={(option: any) => {
                  if ((option as any)?.value) {
                    const newSortBy = (option as any)?.value;
                    friendlyChange(
                      () => setSortBy(newSortBy),
                      sortBy != newSortBy
                    );
                  }
                }}
                formatGroupLabel={formatGroupLabel}
              />
            </InputGroup>
          </Form.Group>
        </Form.Row>
        <Form.Row>
          <Col>
            <ToggleButtonGroup
              items={[
                {
                  label: "Totals",
                  tooltip: showTotals
                    ? "Hide Weighted Combo of All Lineups"
                    : "Show Weighted Combo of All Lineups",
                  toggled: showTotals,
                  onClick: () =>
                    friendlyChange(() => setShowTotals(!showTotals), true),
                },
                {
                  label: "Off",
                  tooltip: showDropped
                    ? "Hide Weighted Combo of All Filtered-Out Lineups"
                    : "Show Weighted Combo of All Filtered-Out Lineups",
                  toggled: showDropped,
                  onClick: () =>
                    friendlyChange(() => setShowDropped(!showDropped), true),
                },
                {
                  label: "Luck",
                  tooltip: adjustForLuck
                    ? "Remove luck adjustments"
                    : "Adjust statistics for luck",
                  toggled: adjustForLuck,
                  onClick: () =>
                    friendlyChange(
                      () => setAdjustForLuck(!adjustForLuck),
                      true
                    ),
                },
                {
                  label: "Pts",
                  tooltip: showRawPts
                    ? "Show raw pts stats as P/100"
                    : "Show raw pts stats as Pts",
                  toggled: showRawPts,
                  onClick: () =>
                    friendlyChange(() => setShowRawPts(!showRawPts), true),
                },
                {
                  label: "Games",
                  tooltip: showGameInfo
                    ? "Hide per-lineup game info"
                    : "Show per-lineup game info",
                  toggled: showGameInfo,
                  onClick: () =>
                    friendlyChange(() => setShowGameInfo(!showGameInfo), true),
                },
                {
                  label: "| Combos: ",
                  tooltip:
                    "Aggregate lineups over the specified position/position group combos",
                  toggled: true,
                  onClick: () => {},
                  isLabelOnly: true,
                },
                {
                  label: "PG",
                  tooltip:
                    aggregateByPos == "PG"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different PG combos",
                  toggled: aggregateByPos == "PG",
                  onClick: () =>
                    friendlyChange(
                      () =>
                        setAggregateByPos(aggregateByPos == "PG" ? "" : "PG"),
                      true
                    ),
                },
                {
                  label: "Backcourt",
                  tooltip:
                    aggregateByPos == "Backcourt"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different Backcourt combos",
                  toggled: aggregateByPos == "Backcourt",
                  onClick: () =>
                    friendlyChange(
                      () =>
                        setAggregateByPos(
                          aggregateByPos == "Backcourt" ? "" : "Backcourt"
                        ),
                      true
                    ),
                },
                {
                  label: "PG+C",
                  tooltip:
                    aggregateByPos == "PG+C"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different PG/C pairs",
                  toggled: aggregateByPos == "PG+C",
                  onClick: () =>
                    friendlyChange(
                      () =>
                        setAggregateByPos(
                          aggregateByPos == "PG+C" ? "" : "PG+C"
                        ),
                      true
                    ),
                },
                {
                  label: "Frontcourt",
                  tooltip:
                    aggregateByPos == "Frontcourt"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different Frontcourt combos",
                  toggled: aggregateByPos == "Frontcourt",
                  onClick: () =>
                    friendlyChange(
                      () =>
                        setAggregateByPos(
                          aggregateByPos == "Frontcourt" ? "" : "Frontcourt"
                        ),
                      true
                    ),
                },
                {
                  label: "C",
                  tooltip:
                    aggregateByPos == "C"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different C combos",
                  toggled: aggregateByPos == "C",
                  onClick: () =>
                    friendlyChange(
                      () => setAggregateByPos(aggregateByPos == "C" ? "" : "C"),
                      true
                    ),
                },
                {
                  label: "/ ",
                  tooltip: "Aggregate lineups by combinations of 2/3/4 players",
                  toggled: true,
                  onClick: () => {},
                  isLabelOnly: true,
                },
                {
                  label: "2",
                  tooltip:
                    aggregateByPos == "Pairs"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different 2-player combos",
                  toggled: aggregateByPos == "Pairs",
                  onClick: () =>
                    friendlyChange(
                      () =>
                        setAggregateByPos(
                          aggregateByPos == "Pairs" ? "" : "Pairs"
                        ),
                      true
                    ),
                },
                {
                  label: "3",
                  tooltip:
                    aggregateByPos == "Triples"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different 3-player combos",
                  toggled: aggregateByPos == "Triples",
                  onClick: () =>
                    friendlyChange(
                      () =>
                        setAggregateByPos(
                          aggregateByPos == "Triples" ? "" : "Triples"
                        ),
                      true
                    ),
                },
                {
                  label: "4",
                  tooltip:
                    aggregateByPos == "Quads"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different 4-player combos",
                  toggled: aggregateByPos == "Quads",
                  onClick: () =>
                    friendlyChange(
                      () =>
                        setAggregateByPos(
                          aggregateByPos == "Quads" ? "" : "Quads"
                        ),
                      true
                    ),
                },
                {
                  label: "/ ",
                  tooltip: "Other combination features",
                  toggled: true,
                  onClick: () => {},
                  isLabelOnly: true,
                },
                {
                  label: "On/Off",
                  tooltip:
                    aggregateByPos == "On-Off"
                      ? "Clear combo aggregation"
                      : "Aggregate lineups by different combinations of the 5 players in the top lineup for this query",
                  toggled: aggregateByPos == "On-Off",
                  onClick: () =>
                    friendlyChange(() => {
                      setAggregateByPos(
                        aggregateByPos == "On-Off" ? "" : "On-Off"
                      );
                      // If we're turning it on and there is no selection, then inject the top lineup:
                      if (aggregateByPos != "On-Off" && !onOffPlayerSel) {
                        setOnOffPlayerSel(
                          _.thru(
                            dataEvent?.lineupStats?.lineups?.[0],
                            (maybeLineup) => {
                              return maybeLineup
                                ? LineupTableUtils.buildCodesAndIds(maybeLineup)
                                    .map((p) => p.code)
                                    .join(";")
                                : "";
                            }
                          )
                        );
                      }
                      //(otherwise leave player selection so can toggle easily)
                    }, true),
                },
              ]}
            />
          </Col>
        </Form.Row>
        {aggregateByPos == "On-Off" && !_.isEmpty(rosterStats.global) ? (
          <Form.Group as={Row} className="mt-3">
            <Form.Group as={Col} xs={10}>
              <InputGroup>
                <InputGroup.Prepend>
                  <InputGroup.Text id="onOff">
                    <small>On/Off</small>
                  </InputGroup.Text>
                </InputGroup.Prepend>
                <PlayerSelector
                  emptyLabel={"Default (Top Unfiltered Lineup)"}
                  playerSelectionStr={onOffPlayerSel}
                  players={(rosterStats.global || []).flatMap((p) => {
                    const codeId =
                      p.player_array?.hits?.hits?.[0]?._source?.player;
                    return codeId ? [codeId as PlayerCodeId] : [];
                  })}
                  onChangePlayerSelection={(newPlayerSelectionStr: string) => {
                    setOnOffPlayerSel(newPlayerSelectionStr);
                  }}
                />
              </InputGroup>
            </Form.Group>
          </Form.Group>
        ) : null}
        <Row className="mt-2">
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>{table}</Col>
        </Row>
      </LoadingOverlay>
    </Container>
  );
};

export default LineupStatsTable;
