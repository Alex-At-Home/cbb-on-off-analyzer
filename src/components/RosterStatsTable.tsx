// React imports:
import React, { useState, useEffect, ReactNode } from "react";

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
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "./GenericTable";
import RosterStatsDiagView from "./diags/RosterStatsDiagView";
import PositionalDiagView from "./diags/PositionalDiagView";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import { TeamStatsModel } from "../components/TeamStatsTable";
import { LineupStatsModel } from "../components/LineupStatsTable";
import LuckAdjDiagView from "./diags/LuckAdjDiagView";
import LuckConfigModal from "./shared/LuckConfigModal";
import ManualOverrideModal from "./shared/ManualOverrideModal";
import OnBallDefenseModal from "./shared/OnBallDefenseModal";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import AsyncFormControl from "./shared/AsyncFormControl";
import StickyRow from "./shared/StickyRow";

// Util imports
import {
  StatModels,
  OnOffBaselineEnum,
  OnOffBaselineGlobalEnum,
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  TeamStatSet,
  LineupStatSet,
  PureStatSet,
  RosterStatsByCode,
  OnOffBaselineGlobalOtherEnum,
  OnOffBaselineOtherEnum,
  PlayerShotStatsModel,
  ShotStats,
} from "../utils/StatModels";
import { CbbColors } from "../utils/CbbColors";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import {
  getCommonFilterParams,
  ParamDefaults,
  ParamPrefixes,
  GameFilterParams,
  LuckParams,
  ManualOverride,
} from "../utils/FilterModels";
import { OnBallDefenseModel } from "../utils/stats/RatingUtils";
import { PositionUtils } from "../utils/stats/PositionUtils";
import { OverrideUtils } from "../utils/stats/OverrideUtils";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import { TeamReportTableUtils } from "../utils/tables/TeamReportTableUtils";
import {
  DivisionStatsCache,
  PositionStatsCache,
  GradeTableUtils,
} from "../utils/tables/GradeTableUtils";
import { defaultRapmConfig } from "../utils/stats/RapmUtils";
import TeamRosterStatsConfigModal, {
  TeamRosterStatsConfig,
} from "./shared/TeamRosterStatsConfigModal";
import { UrlRouting } from "../utils/UrlRouting";
import { DateUtils } from "../utils/DateUtils";
import ShotChartDiagView, { UserChartOpts } from "./diags/ShotChartDiagView";
import IndivPlayTypeTabbedView from "./shared/IndivPlayTypeTabbedView";
import { FilterPresetUtils } from "../utils/FilterPresetUtils";
import { useTheme } from "next-themes";
import ThemedSelect from "./shared/ThemedSelect";
import { PlayerStyleOpts } from "./diags/IndivPlayTypeDiagRadar";

export type RosterStatsModel = {
  on: Array<IndivStatSet>;
  off: Array<IndivStatSet>;
  other: Array<Array<IndivStatSet>>;
  baseline: Array<IndivStatSet>;
  global: Array<IndivStatSet>;
} & {
  onOffMode?: boolean;
  error_code?: string;
};
type Props = {
  gameFilterParams: GameFilterParams;
  /** Ensures that all relevant data is received at the same time */
  dataEvent: {
    teamStats: TeamStatsModel;
    rosterStats: RosterStatsModel;
    lineupStats: LineupStatsModel[];
    playerShotStats: PlayerShotStatsModel;
  };
  onChangeState: (newParams: GameFilterParams) => void;
  testMode?: boolean; //(if set, the initial processing occurs synchronously)
};

////////

// Some utils for building the table

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

/** Get the right shot chart stats for on/off/etc  */
const getPlayerShotChartStats = (
  key: OnOffBaselineOtherEnum,
  shotChartModel: PlayerShotStatsModel,
  otherIndex?: number
): Record<PlayerId, ShotStats> => {
  if (key == "other") {
    return shotChartModel.other?.[otherIndex || 0] || {};
  } else {
    return shotChartModel[key] || {};
  }
};

////////

// The main component (currently contains lots of static logic that should be moved to RosterStatsTableUtils)

const RosterStatsTable: React.FunctionComponent<Props> = ({
  gameFilterParams,
  dataEvent,
  onChangeState,
  testMode,
}) => {
  const { teamStats, rosterStats, lineupStats } = dataEvent;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const { resolvedTheme } = useTheme();

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] State (some of these are phase 2+ and aren't plumbed in yet)

  const commonParams = getCommonFilterParams(gameFilterParams);
  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const teamSeasonLookup = `${commonParams.gender}_${commonParams.team}_${commonParams.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(gameFilterParams.showGrades) ? "" : gameFilterParams.showGrades
  );

  /** Shot chart config */
  const [showShotCharts, setShowShotCharts] = useState<boolean>(
    _.isNil(gameFilterParams.playerShotCharts)
      ? false
      : gameFilterParams.playerShotCharts
  );
  // Shot charts:
  const [shotChartConfig, setShotChartConfig] = useState<
    UserChartOpts | undefined
  >(
    _.isNil(gameFilterParams.playerShotChartsShowZones)
      ? undefined
      : { 
          buildZones: gameFilterParams.playerShotChartsShowZones,
          useEfg: gameFilterParams.playerShotChartsUseEfg ?? false
        }
  );

  /** Splits out offensive and defensive metrics into separate rows */
  const [expandedView, setExpandedView] = useState(
    _.isNil(gameFilterParams.showExpanded)
      ? ParamDefaults.defaultPlayerShowExpanded
      : gameFilterParams.showExpanded
  );

  /** Show baseline even if on/off are present */
  const [alwaysShowBaseline, setAlwaysShowBaseline] = useState(
    _.isNil(gameFilterParams.showBase)
      ? ParamDefaults.defaultPlayerShowBase
      : gameFilterParams.showBase
  );

  /** Show a diagnostics mode explaining the off/def ratings */
  const [showDiagMode, setShowDiagMode] = useState(
    _.isNil(gameFilterParams.showDiag)
      ? ParamDefaults.defaultPlayerDiagMode
      : gameFilterParams.showDiag
  );

  /** Show a diagnostics mode explaining the positional evaluation */
  const [showPositionDiags, setShowPositionDiags] = useState(
    _.isNil(gameFilterParams.showPosDiag)
      ? ParamDefaults.defaultPlayerPosDiagMode
      : gameFilterParams.showPosDiag
  );

  /** Show the number of possessions as a % of total team count */
  const [possAsPct, setPossAsPct] = useState(
    _.isNil(gameFilterParams.possAsPct)
      ? ParamDefaults.defaultPlayerPossAsPct
      : gameFilterParams.possAsPct
  );
  /** Show the number of possessions as a % of total team count */
  const [factorMins, setFactorMins] = useState(
    _.isNil(gameFilterParams.factorMins)
      ? ParamDefaults.defaultPlayerFactorMins
      : gameFilterParams.factorMins
  );
  /** When switching between rating and prod, also switch common sort bys over */
  const toggleFactorMins = () => {
    const newSortBy = factorMins
      ? sortBy.replace("_prod", "_rtg")
      : sortBy.replace("_rtg", "_prod");
    if (newSortBy != sortBy) {
      setSortBy(newSortBy);
    }
    setFactorMins(!factorMins);
  };

  /** Whether to show sub-header with extra info */
  const [showInfoSubHeader, setShowInfoSubHeader] = useState(
    gameFilterParams.showInfoSubHeader || false
  );

  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    true as boolean
  ); //(always defaults to on)

  /** Whether to make the quick toggle bar stick (default: on) */
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    _.isNil(gameFilterParams.stickyQuickToggle)
      ? true
      : gameFilterParams.stickyQuickToggle
  );

  /** Which players to filter */
  const [filterStr, setFilterStr] = useState(
    _.isNil(gameFilterParams.filter)
      ? ParamDefaults.defaultPlayerFilter
      : gameFilterParams.filter
  );

  const [manualOverrides, setManualOverrides] = useState(
    _.isNil(gameFilterParams.manual) ? [] : gameFilterParams.manual
  );

  const [onBallDefenseByCode, setOnBallDefenseByCode] = useState(
    {} as Record<PlayerCode, OnBallDefenseModel>
  );

  const [showOnBallConfig, setShowOnBallConfig] = useState(
    _.isNil(gameFilterParams.showOnBallConfig)
      ? false
      : gameFilterParams.showOnBallConfig
  );

  // Transform the list into a map of maps of values
  const manualOverridesAsMap =
    OverrideUtils.buildOverrideAsMap(manualOverrides);

  const [showManualOverrides, setShowManualOverrides] = useState(
    _.isNil(gameFilterParams.showPlayerManual)
      ? false
      : gameFilterParams.showPlayerManual
  );

  const fragmentDelimiter = filterStr.includes(";") ? ";" : ",";
  const filterFragments = filterStr
    .split(fragmentDelimiter)
    .map((fragment) => _.trim(fragment))
    .filter((fragment) => (fragment ? true : false));
  const filterFragmentsPve = filterFragments.filter(
    (fragment) => fragment[0] != "-"
  );
  const filterFragmentsNve = filterFragments
    .filter((fragment) => fragment[0] == "-")
    .map((fragment) => fragment.substring(1));

  // Sort field
  const [sortBy, setSortBy] = useState(
    _.isNil(gameFilterParams.sortBy)
      ? ParamDefaults.defaultPlayerSortBy
      : gameFilterParams.sortBy
  );

  // Luck

  const [adjustForLuck, setAdjustForLuck] = useState(
    _.isNil(gameFilterParams.onOffLuck)
      ? ParamDefaults.defaultOnOffLuckAdjust
      : gameFilterParams.onOffLuck
  );
  const [showLuckAdjDiags, setShowLuckAdjDiags] = useState(
    _.isNil(gameFilterParams.showPlayerOnOffLuckDiags)
      ? ParamDefaults.defaultOnOffLuckDiagMode
      : gameFilterParams.showPlayerOnOffLuckDiags
  );
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(gameFilterParams.luck)
      ? ParamDefaults.defaultLuckConfig
      : gameFilterParams.luck
  );

  // Advanced stats config:
  const [rapmPriorMode, setRapmPriorMode] = useState(
    parseFloat(
      _.isNil(gameFilterParams.rapmPriorMode)
        ? ParamDefaults.defaultTeamReportRapmPriorMode
        : gameFilterParams.rapmPriorMode
    )
  );
  const [rapmRegressMode, setRapmRegresssMode] = useState(
    parseFloat(
      _.isNil(gameFilterParams.rapmRegressMode)
        ? ParamDefaults.defaultTeamReportRapmRegressMode
        : gameFilterParams.rapmRegressMode
    )
  );
  /** Whether we are showing the advanced on/off stats config modal */
  const [showTeamRosterStatsConfig, setShowTeamRosterStatsConfig] =
    useState(false);

  /** (placeholder for positional info)*/
  const [showPlayTypes, setShowPlayTypes] = useState(
    _.isNil(gameFilterParams.showPlayerPlayTypes)
      ? ParamDefaults.defaultPlayerShowPlayTypes
      : gameFilterParams.showPlayerPlayTypes
  );
  const [showPlayTypesAdjPpp, setShowPlayTypesAdjPpp] = useState<boolean>(
    gameFilterParams.showPlayerPlayTypesAdjPpp ?? true
  );
  const [showPlayTypesPlayType, setShowPlayTypesPlayType] = useState<
    string | undefined
  >(
    gameFilterParams.showPlayerPlayTypesPlayType ??
      ParamDefaults.defaultPlayerShowPlayTypesPlayType
  );
  //TODO CSV of yearly quickSwitch options

  /** (placeholder for positional info)*/
  const [calcRapm, setCalcRapm] = useState(
    _.isNil(gameFilterParams.calcRapm)
      ? ParamDefaults.defaultPlayerCalcRapm
      : gameFilterParams.calcRapm
  );

  /** Whether we are showing the luck config modal */
  const [showLuckConfig, setShowLuckConfig] = useState(false);

  useEffect(() => {
    //(keep luck and grades and manual up to date between the two views)
    setAdjustForLuck(
      _.isNil(gameFilterParams.onOffLuck)
        ? ParamDefaults.defaultOnOffLuckAdjust
        : gameFilterParams.onOffLuck
    );
    setLuckConfig(
      _.isNil(gameFilterParams.luck)
        ? ParamDefaults.defaultLuckConfig
        : gameFilterParams.luck
    );
    setShowGrades(
      _.isNil(gameFilterParams.showGrades) ? "" : gameFilterParams.showGrades
    );
    setManualOverrides(gameFilterParams.manual || []);

    setStickyQuickToggle(
      _.isNil(gameFilterParams.stickyQuickToggle)
        ? true
        : gameFilterParams.stickyQuickToggle
    );
  }, [gameFilterParams]);

  /** Don't forget need to update GameFilter as well when adding to here */
  useEffect(() => {
    //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...gameFilterParams,
      sortBy: sortBy,
      filter: filterStr,
      showBase: alwaysShowBaseline,
      showExpanded: expandedView,
      showDiag: showDiagMode,
      possAsPct: possAsPct,
      showPosDiag: showPositionDiags,
      showPlayerPlayTypes: showPlayTypes,
      showPlayerPlayTypesAdjPpp: showPlayTypesAdjPpp,
      showPlayerPlayTypesPlayType: showPlayTypesPlayType,
      // Overrides:
      manual: manualOverrides,
      // Luck:
      luck: luckConfig,
      calcRapm: calcRapm,
      playerShotCharts: showShotCharts,
      playerShotChartsShowZones: shotChartConfig?.buildZones,
      playerShotChartsUseEfg: shotChartConfig?.useEfg,
      rapmPriorMode: rapmPriorMode.toString(),
      rapmRegressMode: rapmRegressMode.toString(),
      factorMins: factorMins,
      onOffLuck: adjustForLuck,
      showGrades: showGrades,
      showPlayerOnOffLuckDiags: showLuckAdjDiags,
      showPlayerManual: showManualOverrides,
      showOnBallConfig: showOnBallConfig,
      showInfoSubHeader: showInfoSubHeader,
      stickyQuickToggle,
    };
    onChangeState(newState);
  }, [
    sortBy,
    filterStr,
    showDiagMode,
    alwaysShowBaseline,
    expandedView,
    possAsPct,
    showPositionDiags,
    showPlayTypes,
    showPlayTypesAdjPpp,
    showPlayTypesPlayType,
    luckConfig,
    adjustForLuck,
    showLuckAdjDiags,
    showManualOverrides,
    showOnBallConfig,
    manualOverrides,
    calcRapm,
    factorMins,
    showInfoSubHeader,
    showGrades,
    rapmPriorMode,
    rapmRegressMode,
    stickyQuickToggle,
    showShotCharts,
    shotChartConfig,
  ]);

  // Events that trigger building or rebuilding the division stats cache
  const [divisionStatsCache, setDivisionStatsCache] =
    useState<DivisionStatsCache>({});
  const [positionalStatsCache, setPositionalStatsCache] =
    useState<PositionStatsCache>({});
  useEffect(() => {
    if (showGrades || showPlayTypes) {
      const yearOrGenderChanged =
        gameFilterParams.year != divisionStatsCache.year ||
        gameFilterParams.gender != divisionStatsCache.gender;

      if (yearOrGenderChanged || _.isEmpty(divisionStatsCache)) {
        if (!_.isEmpty(divisionStatsCache)) setDivisionStatsCache({}); //unset if set
        if (!_.isEmpty(positionalStatsCache)) setPositionalStatsCache({}); //unset if set
        GradeTableUtils.populatePlayerDivisionStatsCache(
          gameFilterParams,
          setDivisionStatsCache
        );
      }
      const maybePosGroup = showGrades.split(":")[2]; //(rank[:tier[:pos]])
      if (maybePosGroup && maybePosGroup != "All") {
        const posGroupStats = positionalStatsCache[maybePosGroup];
        if (yearOrGenderChanged || !posGroupStats) {
          GradeTableUtils.populatePlayerDivisionStatsCache(
            gameFilterParams,
            (s: DivisionStatsCache) => {
              setPositionalStatsCache((currPosCache) => ({
                ...currPosCache,
                [maybePosGroup]: {
                  comboTier: s.Combo,
                  highTier: s.High,
                  mediumTier: s.Medium,
                  lowTier: s.Low,
                },
              }));
            },
            undefined,
            maybePosGroup
          );
        }
      }
    }
  }, [gameFilterParams, showGrades, showPlayTypes]);

  // 2] Data Model

  const allTableFields =
    CommonTableDefs.onOffIndividualTableAllFields(expandedView);
  const tableFields = CommonTableDefs.onOffIndividualTable(
    expandedView,
    possAsPct,
    factorMins,
    calcRapm
  );

  // 3] Utils

  // Needed for a few things, including RAPM and play type analysis

  type OnOffRosterStatsByCode = {
    [key in OnOffBaselineGlobalEnum]: RosterStatsByCode;
  } & {
    other: RosterStatsByCode[];
  };
  const rosterStatsByCode: OnOffRosterStatsByCode = _.chain([
    "on",
    "off",
    "global",
    "baseline",
    "other",
  ] as OnOffBaselineGlobalOtherEnum[])
    .transform(
      (acc, key) => {
        if (key == "other") {
          acc.other = (teamStats.other || []).map((team, otherIdx) => {
            return team?.doc_count
              ? RosterTableUtils.buildRosterTableByCode(
                  rosterStats.other?.[otherIdx] || [],
                  teamStats.global?.roster,
                  showPlayTypes,
                  teamSeasonLookup
                )
              : {};
          });
        } else {
          if (teamStats[key]?.doc_count) {
            acc[key] = RosterTableUtils.buildRosterTableByCode(
              rosterStats[key] || [],
              teamStats.global?.roster,
              key == "global" && showPlayTypes,
              teamSeasonLookup
            );
          }
        }
      },
      {
        on: {},
        off: {},
        global: {},
        baseline: {},
        other: [],
      } as OnOffRosterStatsByCode
    )
    .value();

  // 3.0] RAPM

  const [cachedRapm, setCachedRapm] = useState({} as Record<string, any>);

  useEffect(() => {
    //ensure we never show the _wrong_ RAPM
    setCachedRapm({});
  }, [dataEvent, adjustForLuck, manualOverrides, onBallDefenseByCode]);

  const positionFromPlayerKey = LineupTableUtils.buildPositionPlayerMap(
    rosterStats.global,
    teamSeasonLookup
  );

  /** For a given lineup set, calculate RAPM as quickly as possible */
  const buildRapm = (
    lineupStats: LineupStatsModel | undefined,
    playerInfo: Record<PlayerId, IndivStatSet>
  ) => {
    const preRapmTableData = LineupTableUtils.buildEnrichedLineups(
      //(calcs for both luck and non-luck versions)
      lineupStats?.lineups || [],
      teamStats.global,
      rosterStats.global,
      teamStats.baseline,
      //(the baseline vs on/off here doesn't make any practical difference)
      adjustForLuck,
      luckConfig.base,
      avgEfficiency,
      false,
      teamSeasonLookup,
      positionFromPlayerKey,
      playerInfo
    );
    const rapmInfo = TeamReportTableUtils.buildOrInjectRapm(
      preRapmTableData,
      playerInfo,
      adjustForLuck,
      avgEfficiency,
      genderYearLookup,
      undefined,
      {
        ...defaultRapmConfig,
        priorMode: rapmPriorMode,
        fixedRegression: rapmRegressMode,
      }
    );
    return _.fromPairs(
      (rapmInfo?.enrichedPlayers || []).map((p) => [
        p.playerId,
        {
          off_adj_rapm: p.rapm?.off_adj_ppp,
          def_adj_rapm: p.rapm?.def_adj_ppp,
        },
      ])
    );
  };

  const buildAllRapm = () => {
    if (calcRapm && _.isEmpty(cachedRapm)) {
      const buildSingleRapm = (
        teamStatSet: TeamStatSet,
        rosterStatSet: Array<IndivStatSet>,
        lineupStatSet: LineupStatsModel
      ) => {
        const rapmPriorsBaseline = LineupTableUtils.buildBaselinePlayerInfo(
          rosterStatSet,
          rosterStatsByCode.global,
          teamStatSet,
          avgEfficiency,
          adjustForLuck,
          luckConfig.base,
          manualOverridesAsMap,
          onBallDefenseByCode
        );
        return buildRapm(lineupStatSet, rapmPriorsBaseline);
      };
      const rapmInfos = _.chain([
        "baseline",
        "on",
        "off",
        "other",
      ] as OnOffBaselineOtherEnum[])
        .transform(
          (acc, key, keyIdx) => {
            if (key == "other") {
              acc.other = (teamStats.other || []).map(
                (teamStatSet, otherIdx) => {
                  return buildSingleRapm(
                    teamStatSet || StatModels.emptyTeam(),
                    rosterStats.other?.[otherIdx] || [],
                    lineupStats[3 + otherIdx] || StatModels.emptyLineup()
                  );
                }
              );
            } else {
              acc[key] = buildSingleRapm(
                teamStats[key] || StatModels.emptyTeam(),
                rosterStats[key] || [],
                lineupStats[keyIdx]
              );
            }
          },
          {
            baseline: undefined,
            on: undefined,
            off: undefined,
            other: [],
          } as Record<string, any>
        )
        .value();

      setCachedRapm(rapmInfos);
    }
  };

  useEffect(() => {
    buildAllRapm();
  }, [cachedRapm]);

  if (testMode) buildAllRapm();

  // 3.1] Table building

  /** Collects the different player stat sets according to their sourcee */
  type OnOffPlayerStatSet = {
    key: string;
  } & {
    [key in OnOffBaselineGlobalEnum]: IndivStatSet | undefined;
  } & {
    other?: Array<IndivStatSet | undefined>;
  };

  /** Handles the various sorting combos */
  const sorter = (sortStr: string) => {
    // format: (asc|desc):(off_|def_|diff_)<field>:(on|off|delta)
    const sortComps = sortStr.split(":"); //asc/desc
    const dir = sortComps[0] == "desc" ? -1 : 1;
    const fieldComps = _.split(sortComps[1], "_", 1); //off/def/diff
    const fieldName = sortComps[1].substring(fieldComps[0].length + 1); //+1 for _
    const field = (player: IndivStatSet) => {
      return player?.[sortComps[1]]?.value || 0; //(off or def)
    };
    const onOrOff = (playerSet: OnOffPlayerStatSet) => {
      switch (sortComps[2]) {
        case "on":
          return [playerSet.on || StatModels.emptyIndiv()];
        case "off":
          return [playerSet.off || StatModels.emptyIndiv()];
        case "baseline":
          return [playerSet.baseline || StatModels.emptyIndiv()];
        default:
          return [StatModels.emptyIndiv()];
      }
    };
    return (playerSet: OnOffPlayerStatSet) => {
      const playerFields = onOrOff(playerSet).map(
        (player) => field(player) || 0
      );
      return dir * playerFields[0];
    };
  };

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  const onOffBasePicker = (
    str: "On" | "Off" | "Baseline" | "Global",
    arr: Array<IndivStatSet>
  ) => {
    return _.find(arr, (p) => _.startsWith(p.onOffKey, str));
  };

  /** Show baseline unless both on and off are present (or in "other" mode) */
  const skipBaseline =
    !alwaysShowBaseline &&
    ((rosterStats?.on?.length && rosterStats?.off?.length) ||
      !_.isEmpty(rosterStats?.other));

  const baselineIsOnlyLine = !(
    rosterStats?.on?.length ||
    rosterStats?.off?.length ||
    _.some(rosterStats.other, (o) => o?.length)
  );

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

  /** Longer equivalent to onOffBaseToShortPhrase */
  const onOffBaseToLongerPhrase = (
    type: OnOffBaselineOtherEnum,
    otherIndex?: number
  ) => {
    const maybePrefix =
      gameFilterParams.splitPhrases ||
      FilterPresetUtils.getPresetPhrase(gameFilterParams.presetSplit || "??");
    switch (type) {
      case "on":
        return maybePrefix?.[0]
          ? `'${maybePrefix[0]}' set`
          : _.isEmpty(teamStats.other)
          ? "On ('A')"
          : "'A' set";
      case "off":
        return maybePrefix?.[1]
          ? `'${maybePrefix[1]}' set`
          : _.isEmpty(teamStats.other)
          ? "Off ('B')"
          : "'B' set";
      case "baseline":
        const maybeFilterPhrase = FilterPresetUtils.getPresetFilterPhrase(
          gameFilterParams.presetMode || "??"
        );
        return maybeFilterPhrase
          ? `'Base' set (${maybeFilterPhrase})`
          : `'Base' set`;
      case "other":
        const prefixIndex = 2 + (otherIndex || 0);
        return maybePrefix?.[prefixIndex]
          ? `'${maybePrefix[1]}' set`
          : `'${String.fromCharCode(67 + (otherIndex || 0))}' set`;
      default:
        return "unknown";
    }
  };

  /** Utility function to build the title for the player stats */
  const insertTitle = (
    playerName: string | React.ReactElement,
    type: OnOffBaselineOtherEnum,
    pos: string,
    rapmInfo?: React.ReactElement,
    otherIndex?: number
  ) => {
    const singleLineCase = type == "baseline" && baselineIsOnlyLine;
    //^ (if this is set we only show it together with on/off)
    const sub = onOffBaseToShortPhrase(type, otherIndex);

    const posIfNotExpanded1 = expandedView ? null : (
      <OverlayTrigger
        placement="auto"
        overlay={TableDisplayUtils.buildPositionTooltip(pos, sub)}
      >
        <sup>{pos}</sup>
      </OverlayTrigger>
    );

    const posIfNotExpanded2 = expandedView ? null : (
      <OverlayTrigger
        placement="auto"
        overlay={TableDisplayUtils.buildPositionTooltip(pos, sub)}
      >
        <small>{pos} - </small>
      </OverlayTrigger>
    );

    const numTeamPoss = possAsPct
      ? type == "other"
        ? (teamStats.other || [])[otherIndex || 0]?.off_poss?.value
        : teamStats[type]?.off_poss?.value
      : undefined;

    return singleLineCase ? (
      <span>
        <span className="d-none d-xl-block">
          <b>{playerName}</b> {posIfNotExpanded1}
        </span>
        <span className="d-block d-xl-none">
          <b>{playerName}</b>
        </span>
        {rapmInfo ? <span>{rapmInfo}</span> : undefined}
      </span>
    ) : (
      <span>
        <span>
          <b>{playerName}</b>
        </span>
        <span className="d-none d-xl-block">
          {TableDisplayUtils.addQueryInfo(
            <span>
              {posIfNotExpanded2}
              <b>{sub}</b> lineups
            </span>,
            gameFilterParams,
            type,
            otherIndex,
            numTeamPoss
          )}
          {rapmInfo ? " " : ""}
          {rapmInfo}
        </span>
        <span className="d-block d-xl-none" style={{ whiteSpace: "nowrap" }}>
          {TableDisplayUtils.addQueryInfo(
            <span>
              <b>{sub}</b> set
            </span>,
            gameFilterParams,
            type,
            otherIndex
          )}
          {rapmInfo ? " " : ""}
          {rapmInfo}
        </span>
      </span>
    );
  };

  /** Need to be able to see the stats table for players in the manual override table */
  const mutableTableDisplayForOverrides = {} as Record<string, any[]>;

  // (Always just use A/B here because it's too confusing to say
  // "On <Player name>" meaning ""<Player Name> when <Other other player> is on")
  // (NOTE: This already dubious logic is now even worse since I added "Other", but will live with it
  //  to avoid a complete rewrite)
  const allPlayers = _.chain([
    _.map(
      rosterStats.on || [],
      (p) =>
        _.assign(p, {
          onOffKey: "On",
        }) as IndivStatSet
    ),
    _.map(
      rosterStats.off || [],
      (p) =>
        _.assign(p, {
          onOffKey: "Off",
        }) as IndivStatSet
    ),
    _.map(
      rosterStats.baseline || [],
      (p) =>
        _.assign(p, {
          onOffKey: "Baseline",
        }) as IndivStatSet
    ),
    _.map(
      rosterStats.global || [],
      (p) =>
        _.assign(p, {
          onOffKey: "Global",
        }) as IndivStatSet
    ),
    ...(rosterStats.other?.map((o, oIdx) =>
      _.map(
        o || [],
        (p) =>
          _.assign(p, {
            onOffKey: `Other${oIdx}`,
          }) as IndivStatSet
      )
    ) || []),
  ])
    .flatten()
    .groupBy("key")
    .toPairs()
    .map((key_onOffBase) => {
      const player: OnOffPlayerStatSet = {
        // Now grouped by player, re-create the on/off/baseline set
        key: key_onOffBase[0],
        on: onOffBasePicker("On", key_onOffBase[1]),
        off: onOffBasePicker("Off", key_onOffBase[1]),
        baseline: onOffBasePicker("Baseline", key_onOffBase[1]),
        global: onOffBasePicker("Global", key_onOffBase[1]),
        other: _.chain(key_onOffBase[1])
          .filter((p) => (p?.onOffKey || "").startsWith("Other"))
          .transform(
            (acc, p) => {
              const index = parseInt((p?.onOffKey || "").substring(5));
              if (_.isNumber(index)) acc.other[index] = p;
            },
            {
              other: (teamStats.other || []).map((__) => undefined) as (
                | IndivStatSet
                | undefined
              )[],
            }
          )
          .value().other,
      };
      return player;
    })
    .value();

  // Now mutate players

  // First enrich with (luck, on-ball defense, manual overrides and...) ORtg etc

  /** Show on/off first, baseline last (order important because of [[varFirstRowKey]]) */
  const modelKeysDisplayOrder: [OnOffBaselineOtherEnum, number][] = (
    [
      ["on", 0],
      ["off", 0],
    ] as [OnOffBaselineOtherEnum, number][]
  )
    .concat((teamStats.other || []).map((__, ii) => ["other", ii]))
    .concat([["baseline", 0]]);

  modelKeysDisplayOrder.forEach(([queryKey, otherQueryIndex]) => {
    const playerList = allPlayers
      .map((triple) =>
        queryKey == "other" ? triple.other?.[otherQueryIndex] : triple[queryKey]
      )
      .flatMap(
        (maybePlayer: IndivStatSet | undefined) =>
          maybePlayer ? [maybePlayer] : [] //(remove undefined and assert type)
      );

    const teamStat = getTeamStats(queryKey, teamStats, otherQueryIndex);

    LineupTableUtils.buildBaselinePlayerInfo(
      playerList,
      rosterStatsByCode.global,
      teamStat,
      avgEfficiency,
      adjustForLuck,
      luckConfig.base,
      manualOverridesAsMap,
      onBallDefenseByCode
    );
  });

  // Then some final overrides for table display purposes

  const getPlayerStats = (
    queryKey: OnOffBaselineOtherEnum,
    player: OnOffPlayerStatSet,
    otherQueryIndex: number
  ) => {
    if (queryKey == "other") {
      return player.other?.[otherQueryIndex || 0];
    } else {
      return player[queryKey];
    }
  };
  const getRapmFromCache = (
    queryKey: OnOffBaselineOtherEnum,
    rapmInfo: Record<string, any>,
    otherQueryIndex: number
  ) => {
    if (queryKey == "other") {
      return rapmInfo.other?.[otherQueryIndex || 0];
    } else {
      return rapmInfo[queryKey];
    }
  };
  allPlayers.forEach((player) => {
    /** (ugly hack so that we only render the roster info for one of the rows per player)*/
    var varFirstRowKey: string | undefined = undefined;

    // Inject ORtg and DRB and Poss% (ie mutate player idempotently)
    modelKeysDisplayOrder.forEach(([queryKey, otherQueryIndex]) => {
      const stat = getPlayerStats(queryKey, player, otherQueryIndex);
      const teamStat = getTeamStats(queryKey, teamStats, otherQueryIndex);

      if (stat) {
        if (!varFirstRowKey) varFirstRowKey = queryKey;

        const rosterEntry = stat.roster || {};
        const height = rosterEntry.height;
        const heightIn = rosterEntry.height_in;
        const yearClass = rosterEntry.year_class;
        const rosterNum = rosterEntry.number;
        const rosterInfoText = `${height && height != "-" ? height : ""} ${
          yearClass ? yearClass : ""
        }${rosterNum ? ` / #${rosterNum}` : ""}`;

        const rosterVisibility =
          queryKey == varFirstRowKey ||
          showPositionDiags ||
          showLuckAdjDiags ||
          showPlayTypes
            ? 100
            : 0;
        //^(means it will be visible on table export but not on the page)
        if (rosterInfoText.length > 2) {
          stat.def_efg = (
            <small>
              <i
                className="text-secondary"
                style={{ opacity: rosterVisibility }}
              >
                {rosterInfoText}
              </i>
            </small>
          );
        }

        stat.off_drb = stat.def_orb; //(just for display, all processing should use def_orb)
        TableDisplayUtils.injectPlayTypeInfo(
          stat,
          expandedView,
          true,
          teamSeasonLookup
        );

        // Positional info (NOTE - no dependencies on other processing like ORtg):

        const [posConfs, posConfsDiags] =
          PositionUtils.buildPositionConfidences(stat, heightIn);
        const [pos, posDiags] = PositionUtils.buildPosition(
          posConfs,
          posConfsDiags.confsNoHeight,
          stat,
          teamSeasonLookup
        );
        stat.def_usage = (
          <OverlayTrigger
            placement="auto"
            overlay={TableDisplayUtils.buildPositionTooltip(
              pos,
              onOffBaseToShortPhrase(queryKey, otherQueryIndex)
            )}
          >
            <small>{pos}</small>
          </OverlayTrigger>
        );
        if (showPlayTypes) {
          stat.role = pos;
        }

        // RAPM: if we have a cached value then use that else claim it's being calculated...
        if (calcRapm) {
          if (!cachedRapm.baseline) {
            //(if baseline has RAPM it must have calculated)
            const rapmPlaceholder = (
              <OverlayTrigger
                placement="auto"
                overlay={
                  <Tooltip id={`${stat.key}-pendingRapm`}>
                    Calculating, stand by...
                  </Tooltip>
                }
              >
                <i>??</i>
              </OverlayTrigger>
            );
            stat.off_adj_rapm = rapmPlaceholder;
            stat.def_adj_rapm = rapmPlaceholder;
            stat.off_adj_rapm_prod = rapmPlaceholder;
            stat.def_adj_rapm_prod = rapmPlaceholder;
          } else {
            const rapm =
              getRapmFromCache(queryKey, cachedRapm, otherQueryIndex)?.[
                stat.key
              ] || {};
            stat.off_adj_rapm = rapm.off_adj_rapm;
            stat.off_adj_rapm_prod = rapm.off_adj_rapm
              ? {
                  value:
                    (rapm.off_adj_rapm?.value || 0) *
                    stat.off_team_poss_pct.value!,
                }
              : undefined;
            if (stat.off_adj_rtg.override && stat.off_adj_rapm) {
              (stat as PureStatSet).off_adj_rapm.override =
                stat.off_adj_rtg.override; //(just copy across)
              if (stat.off_adj_rapm_prod && stat.off_adj_rapm_prod) {
                (stat as PureStatSet).off_adj_rapm_prod.override =
                  stat.off_adj_rtg.override;
              }
            }
            stat.def_adj_rapm = rapm.def_adj_rapm;
            stat.def_adj_rapm_prod = rapm.off_adj_rapm
              ? {
                  value:
                    (rapm.def_adj_rapm?.value || 0) *
                    stat.def_team_poss_pct.value!,
                }
              : undefined;
            //(note don't copy override across for defense, currently there are no defensive overrides and on-ball adjustments are shown elsewhere)

            const adjRapmMargin: Statistic | undefined =
              rapm.off_adj_rapm && rapm.def_adj_rapm
                ? {
                    value:
                      (rapm.off_adj_rapm?.value || 0) -
                      (rapm.def_adj_rapm?.value || 0),
                  }
                : undefined;

            if (adjRapmMargin) {
              if (stat.off_adj_rtg.override || stat.def_adj_rtg.override) {
                adjRapmMargin.override = "Luck/Manual/On-Ball adjusted"; //(gloss over the exact details!)
              }
              stat.off_adj_rapm_margin = adjRapmMargin;
              stat.off_adj_rapm_prod_margin = {
                value: adjRapmMargin.value! * stat.off_team_poss_pct.value!,
                override: adjRapmMargin.override,
              };
            }
          }
        }
        const maybeRapm = _.thru(
          factorMins ? stat.off_adj_rapm_prod_margin : stat.off_adj_rapm_margin,
          (rapmMargin) => {
            if (rapmMargin && calcRapm && expandedView) {
              const rapmMarginVal = rapmMargin.value ?? 0;
              const adjMarginShadow = CommonTableDefs.getTextShadow(
                rapmMargin,
                CbbColors.diff10_p100_redGreen[0],
                "20px",
                4
              );
              const adjMarginEl = (
                <OverlayTrigger
                  placement="auto"
                  overlay={
                    <Tooltip
                      id={`${stat.code}${queryKey}${otherQueryIndex}rapmMargin`}
                    >
                      Overall player RAPM impact, in pts/100 above average.
                    </Tooltip>
                  }
                >
                  <b style={adjMarginShadow}>
                    [{(rapmMarginVal > 0 ? "+" : "") + rapmMarginVal.toFixed(1)}
                    ]
                  </b>
                </OverlayTrigger>
              );
              return adjMarginEl;
            } else {
              return undefined;
            }
          }
        );

        const playElToUse = stat.roster?.player_code_id?.ncaa_id ? (
          <OverlayTrigger
            placement="auto"
            overlay={
              <Tooltip id={`${stat.code}${queryKey}${otherQueryIndex}Link`}>
                Open new tab showing all the player's seasons, in the Player
                Career page
              </Tooltip>
            }
          >
            <a
              target="_blank"
              style={{ wordWrap: "normal" }}
              href={UrlRouting.getPlayerCareer({
                ncaaId: stat.roster?.player_code_id?.ncaa_id || "",
                gender: gameFilterParams.gender,
                showGrades,
                showInfoSubHeader,
                showPlayerPlayTypes: showPlayTypes,
                showPlayerPlayTypesAdjPpp: showPlayTypesAdjPpp,
                showPlayerPlayTypesPlayType: showPlayTypesPlayType,
                playerShotCharts: showShotCharts,
                possAsPct,
              })}
            >
              {stat.key}
            </a>
          </OverlayTrigger>
        ) : (
          stat.key
        );

        // Now we have the position we can build the titles:
        stat.off_title = insertTitle(
          playElToUse,
          queryKey,
          pos,
          maybeRapm,
          otherQueryIndex
        );

        // Create a table for the mutable overrides:

        mutableTableDisplayForOverrides[
          OverrideUtils.getPlayerRowId(stat.key, stat.onOffKey!)
        ] = [
          GenericTableOps.buildDataRow(stat, offPrefixFn, offCellMetaFn),
          GenericTableOps.buildDataRow(stat, defPrefixFn, defCellMetaFn),
        ];
      }
    });
  });

  const filteredPlayers = allPlayers.filter((player) => {
    const strToTest =
      (player.on?.key || player.off?.key || player.baseline?.key || "") +
      " " +
      (player.baseline?.player_array?.hits?.hits?.[0]?._source?.player?.code ||
        "");
    //(don't bother with the "other" queries here, on/off/baseline is sufficient to give us a searchable string)

    return (
      (filterFragmentsPve.length == 0 ||
        (_.find(
          filterFragmentsPve,
          (fragment) => strToTest.indexOf(fragment) >= 0
        )
          ? true
          : false)) &&
      (filterFragmentsNve.length == 0 ||
        (_.find(
          filterFragmentsNve,
          (fragment) => strToTest.indexOf(fragment) >= 0
        )
          ? false
          : true))
    );
  });

  /** Compresses number/height/year into 1 double-width column */
  const rosterInfoSpanCalculator = (key: string) =>
    key == "efg" ? 2 : key == "assist" ? 0 : 1;

  var currentRowCount = 0;
  const tableData = _.chain(filteredPlayers)
    .sortBy([
      sorter(sortBy),
      (p) => {
        p.baseline?.off_team_poss?.value || 0;
      },
    ])
    .flatMap((p) => {
      // If showing sub-headers at all, then the plan is:
      // If no other visualization and not expanded, then don't show
      // If expanded, show every 5
      // If any visualization used, show every player
      const showEveryLine =
        showRepeatingHeader &&
        (showPlayTypes ||
          showPositionDiags ||
          showLuckAdjDiags ||
          showShotCharts ||
          showDiagMode);

      // First line could be on/off/baseline
      const firstRowIsOn = currentRowCount == 0;
      const firstRowIsOff = firstRowIsOn && _.isNil(p.on?.off_title);
      const firstRowIsBaseline = firstRowIsOff && _.isNil(p.off?.off_title);

      // Locking repeating sub-headers to start of player entry, which could be on/off/baseline
      const every10thRow =
        showRepeatingHeader &&
        !showEveryLine &&
        currentRowCount > 0 &&
        currentRowCount % 10 == 0;
      const tenthRowIsOn = every10thRow;
      const tenthRowIsOff = tenthRowIsOn && _.isNil(p.on?.off_title);
      const tenthRowIsBaseline = tenthRowIsOff && _.isNil(p.off?.off_title);

      // Update "state" (how many rows since the last sub-header)
      if (currentRowCount == 10) currentRowCount = 0;
      const entriesPerPlayer = // the number of rows/pairs-of-rows per player
        (_.isNil(p.on?.off_title) ? 0 : 1) +
        (_.isNil(p.off?.off_title) ? 0 : 1) +
        (skipBaseline || _.isNil(p.baseline?.off_title) ? 0 : 1);
      const gradesMult = showGrades ? (expandedView ? 2 : 3) : 1;
      const currentRowInc =
        gradesMult * entriesPerPlayer * (expandedView ? 2 : 1); //(row or pair-of-rows)
      if (currentRowCount < 10 && currentRowCount + currentRowInc >= 10) {
        currentRowCount = 10; // always lock to start of new player
      } else {
        currentRowCount = currentRowCount + currentRowInc;
      }

      const shotChartQuickSwitchOptions = (
        player: IndivStatSet | undefined,
        queryKey: OnOffBaselineOtherEnum,
        otherQueryIndex: number
      ) =>
        [
          {
            title: onOffBaseToLongerPhrase("baseline"),
            key: "baseline",
            off:
              getPlayerShotChartStats("baseline", dataEvent.playerShotStats, 0)[
                player?.key || "???"
              ] || {},
            def: {},
            gender: gameFilterParams.gender as "Men" | "Women",
          },
          {
            title: onOffBaseToLongerPhrase("on"),
            key: "on",
            off:
              getPlayerShotChartStats("on", dataEvent.playerShotStats, 0)[
                player?.key || "???"
              ] || {},
            def: {},
            gender: gameFilterParams.gender as "Men" | "Women",
          },
          {
            title: onOffBaseToLongerPhrase("off"),
            key: "off",
            off:
              getPlayerShotChartStats("off", dataEvent.playerShotStats, 0)[
                player?.key || "???"
              ] || {},
            def: {},
            gender: gameFilterParams.gender as "Men" | "Women",
          },
        ]
          .concat(
            (teamStats.other || []).map((opt, idx) => {
              return {
                title: onOffBaseToLongerPhrase("other", idx),
                key: `other${idx}`,
                off:
                  getPlayerShotChartStats(
                    "other",
                    dataEvent.playerShotStats,
                    idx
                  )[player?.key || "???"] || {},
                def: {},
                gender: gameFilterParams.gender as "Men" | "Women",
              };
            })
          )
          .filter((opt) => (opt.off?.doc_count || 0) > 0)
          .filter(
            (opt) =>
              !(
                (queryKey == "other" && opt.key == `other${otherQueryIndex}`) ||
                queryKey == opt.key
              )
          );

      const indivPlayTypeQuickSwitchOptions = [
        {
          title: onOffBaseToLongerPhrase("baseline"),
          player: getPlayerStats("baseline", p, 0)!,
          rosterStatsByCode: rosterStatsByCode.global,
          teamStats: getTeamStats("baseline", teamStats, 0),
          showGrades: showGrades,
          avgEfficiency,
          showHelp,
        },
        {
          title: onOffBaseToLongerPhrase("on"),
          player: getPlayerStats("on", p, 0)!,
          rosterStatsByCode: rosterStatsByCode.global,
          teamStats: getTeamStats("on", teamStats, 0),
          showGrades: showGrades,
          avgEfficiency,
          showHelp,
        },
        {
          title: onOffBaseToLongerPhrase("off"),
          player: getPlayerStats("off", p, 0)!,
          rosterStatsByCode: rosterStatsByCode.global,
          teamStats: getTeamStats("off", teamStats, 0),
          showGrades: showGrades,
          avgEfficiency,
          showHelp,
        },
      ]
        .concat(
          (teamStats.other || []).map((__, idx) => {
            return {
              title: onOffBaseToLongerPhrase("other", idx),
              player: getPlayerStats("other", p, idx)!,
              rosterStatsByCode: rosterStatsByCode.global,
              teamStats: getTeamStats("other", teamStats, idx),
              showGrades: showGrades,
              avgEfficiency,
              showHelp,
            };
          })
        )
        .filter((opt) => opt.player && (opt.teamStats.doc_count || 0) > 0);

      const buildRowSet = (
        p: OnOffPlayerStatSet,
        queryKey: OnOffBaselineOtherEnum,
        displayKey: string,
        otherQueryIndex: number,
        firstRowIsThisSet: boolean,
        tenthRowIsThisSet: boolean
      ) => {
        const player = getPlayerStats(queryKey, p, otherQueryIndex);
        const isBaseline = queryKey == "baseline";
        const rowLetter = onOffBaseToShortPhrase(queryKey);
        return _.isNil(player?.off_title)
          ? []
          : _.flatten([
              !firstRowIsThisSet && showEveryLine
                ? [
                    GenericTableOps.buildHeaderRepeatRow(
                      CommonTableDefs.repeatingOnOffIndivHeaderFields,
                      "small"
                    ),
                  ]
                : [],
              tenthRowIsThisSet
                ? [
                    GenericTableOps.buildHeaderRepeatRow(
                      CommonTableDefs.repeatingOnOffIndivHeaderFields,
                      "small"
                    ),
                    GenericTableOps.buildRowSeparator(),
                  ]
                : [],
              [
                GenericTableOps.buildDataRow(
                  player,
                  offPrefixFn,
                  offCellMetaFn
                ),
              ],
              expandedView
                ? [
                    GenericTableOps.buildDataRow(
                      player,
                      defPrefixFn,
                      defCellMetaFn,
                      undefined,
                      rosterInfoSpanCalculator
                    ),
                  ]
                : [],

              showGrades && player
                ? GradeTableUtils.buildPlayerGradeTableRows({
                    isFullSelection: isBaseline
                      ? !gameFilterParams.baseQuery &&
                        !gameFilterParams.queryFilters
                      : undefined,
                    selectionTitle: isBaseline
                      ? rowLetter != "Base"
                        ? `Base ${rowLetter} Grades`
                        : "Baseline Grades"
                      : `'${rowLetter}' Lineups Grades`,
                    config: showGrades,
                    setConfig: (newConfig: string) => {
                      setShowGrades(newConfig);
                    },
                    playerStats: {
                      comboTier: divisionStatsCache.Combo,
                      highTier: divisionStatsCache.High,
                      mediumTier: divisionStatsCache.Medium,
                      lowTier: divisionStatsCache.Low,
                    },
                    playerPosStats: positionalStatsCache,
                    player: player,
                    expandedView,
                    possAsPct,
                    factorMins,
                    includeRapm: calcRapm,
                  })
                : [],
              showDiagMode && player?.diag_off_rtg && player?.diag_def_rtg
                ? [
                    GenericTableOps.buildTextRow(
                      <RosterStatsDiagView
                        ortgDiags={player?.diag_off_rtg}
                        drtgDiags={player?.diag_def_rtg}
                      />,
                      "small"
                    ),
                  ]
                : [],

              showPositionDiags
                ? [
                    GenericTableOps.buildTextRow(
                      <PositionalDiagView
                        player={player!}
                        teamSeason={teamSeasonLookup}
                        showHelp={showHelp}
                      />,
                      "small"
                    ),
                  ]
                : [],

              showLuckAdjDiags && player?.off_luck && player?.def_luck
                ? [
                    GenericTableOps.buildTextRow(
                      <LuckAdjDiagView
                        name={
                          isBaseline ? `Player Base` : `'${rowLetter}' Lineups`
                        }
                        offLuck={player?.off_luck}
                        defLuck={player?.def_luck}
                        baseline={luckConfig.base}
                        individualMode={true}
                        showHelp={showHelp}
                      />,
                      "small pt-2"
                    ),
                  ]
                : [],

              showPlayTypes && player
                ? [
                    GenericTableOps.buildTextRow(
                      <IndivPlayTypeTabbedView
                        title={onOffBaseToLongerPhrase(
                          queryKey,
                          otherQueryIndex
                        )}
                        player={player}
                        rosterStatsByCode={rosterStatsByCode.global}
                        teamStats={getTeamStats(
                          queryKey,
                          teamStats,
                          otherQueryIndex
                        )}
                        avgEfficiency={avgEfficiency}
                        showGrades={showGrades}
                        grades={divisionStatsCache}
                        showHelp={showHelp}
                        quickSwitchOptions={indivPlayTypeQuickSwitchOptions.filter(
                          (opt) => opt.title != displayKey
                        )}
                        onChangeChartOpts={(opts: PlayerStyleOpts) => {
                          setShowPlayTypesPlayType(opts.playType);
                          setShowPlayTypesAdjPpp(!(opts.rawPpp ?? false));
                          //TODO quick switch is more complex
                        }}
                        userOpts={{
                          playType: showPlayTypesPlayType,
                          rawPpp: !showPlayTypesAdjPpp,
                        }}
                        navigationLinkOverride={
                          <OverlayTrigger
                            placement="auto"
                            overlay={
                              <Tooltip id={`${player.code}styleTeamView`}>
                                Open the Team view with the play style chart
                                showing this player's actions in a team context
                              </Tooltip>
                            }
                          >
                            <a
                              target="_blank"
                              href={UrlRouting.getGameUrl(
                                {
                                  ...getCommonFilterParams(gameFilterParams),
                                  onQuery: gameFilterParams.onQuery,
                                  offQuery: gameFilterParams.offQuery,
                                  autoOffQuery: gameFilterParams.autoOffQuery,
                                  showTeamPlayTypes: true,
                                  teamPlayTypeConfig: `||${player.code}||all||multi||`,
                                },
                                {}
                              )}
                            >
                              Team View<sup>*</sup>
                            </a>
                          </OverlayTrigger>
                        }
                      />,
                      "small"
                    ),
                  ]
                : [],

              showShotCharts
                ? [
                    GenericTableOps.buildTextRow(
                      <ShotChartDiagView
                        title={onOffBaseToLongerPhrase(
                          queryKey,
                          otherQueryIndex
                        )}
                        off={
                          getPlayerShotChartStats(
                            queryKey,
                            dataEvent.playerShotStats,
                            otherQueryIndex
                          )[player?.key || "???"] || {}
                        }
                        def={{}}
                        gender={gameFilterParams.gender as "Men" | "Women"}
                        quickSwitchOptions={shotChartQuickSwitchOptions(
                          player,
                          queryKey,
                          otherQueryIndex
                        )}
                        chartOpts={shotChartConfig}
                        onChangeChartOpts={(newOpts: any) => {
                          setShotChartConfig(newOpts);
                        }}
                      />,
                      "small"
                    ),
                  ]
                : [],
            ]);
      };

      return _.flatten([
        buildRowSet(
          p,
          "on",
          onOffBaseToLongerPhrase("on"),
          0,
          firstRowIsOn,
          tenthRowIsOn
        ),
        buildRowSet(
          p,
          "off",
          onOffBaseToLongerPhrase("off"),
          0,
          firstRowIsOff,
          tenthRowIsOff
        ),
        ...(rosterStats?.other || []).map((_, otherIdx) => {
          return buildRowSet(
            p,
            "other",
            onOffBaseToLongerPhrase("other", otherIdx),
            otherIdx,
            false,
            false
          );
        }),
        skipBaseline
          ? []
          : buildRowSet(
              p,
              "baseline",
              "Baseline",
              0,
              firstRowIsBaseline,
              tenthRowIsBaseline
            ),
        [GenericTableOps.buildRowSeparator()],
      ]);
    })
    .value();

  /** A list of all the players in poss count order - doesn't support other */
  const playersAsList = _.flatMap(allPlayers, (p) => {
    return _.flatten([
      p.on?.off_team_poss ? [p.on] : [],
      p.off?.off_team_poss ? [p.off] : [],
      p.baseline?.off_team_poss ? [p.baseline] : [],
    ]);
  });

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (rosterStats?.baseline?.length || 0) == 0;
  }
  /** Table formatter */
  function rowSpanCalculator(cellMeta: string) {
    switch (cellMeta) {
      case "off":
        return expandedView ? 2 : 1;
      case "def":
        return 0;
      default:
        return 1;
    }
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return sortOptionsByValue[s];
  }

  // 3.1] Sorting utils

  const sortOptions: Array<any> = _.flatten(
    _.toPairs(allTableFields)
      .filter((keycol) => keycol[1].colName && keycol[1].colName != "")
      .map((keycol) => {
        return _.flatMap(
          [
            //TODO: inject some defensive fields in here
            ["desc", "off"],
            ["asc", "off"],
            ["desc", "def"],
            ["asc", "def"],
            ["desc", "diff"],
            ["asc", "diff"],
          ],
          (sort_offDef) => {
            const onOffCombos = _.flatMap([
              ["baseline"]
                .concat(teamStats?.on?.doc_count ? ["on"] : [])
                .concat(teamStats?.off?.doc_count ? ["off"] : []),
            ]);
            return onOffCombos.map((onOff) => {
              return [...sort_offDef, onOff];
            }); // eg [ [ desc, off, on ], [ desc, off, off ], [ desc, off, delta ] ]
          }
        ).flatMap((combo) => {
          if (
            combo[1] == "diff" &&
            keycol[0] != "rtg" &&
            keycol[0] != "adj_rtg" &&
            keycol[0] != "adj_prod" &&
            keycol[0] != "adj_rapm" &&
            keycol[0] != "adj_rapm_prod" &&
            keycol[0] != "adj_opp"
          ) {
            // only do diff for a few:
            return [];
          }
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
          const labelOverride =
            CommonTableDefs.indivColNameOverrides[`${combo[1]}_${keycol[0]}`];
          const ascOrDecLabel = ascOrDesc(combo[0]) || "";
          const offOrDefLabel = offOrDef(combo[1]) || "";
          const label = labelOverride
            ? labelOverride(ascOrDecLabel)
            : "see_below";
          return label
            ? [
                {
                  label: !_.isNil(labelOverride)
                    ? `${onOffBaseToShortPhrase(
                        combo[2] as OnOffBaselineEnum
                      )} ${label}`
                    : `${onOffBaseToShortPhrase(
                        combo[2] as OnOffBaselineEnum
                      )} ${
                        keycol[1].colName
                      } (${ascOrDecLabel} / ${offOrDefLabel})`,
                  value: `${combo[0]}:${combo[1]}_${keycol[0]}:${combo[2]}`,
                },
              ]
            : [];
        });
      })
  );
  const sortOptionsByValue = _.fromPairs(
    sortOptions.map((opt) => [opt.value, opt])
  );
  /** Put these options at the front */
  const mostUsefulSubset = _.flatMap([
    [
      "desc:off_team_poss_pct:baseline",
      "desc:off_team_poss_pct:on",
      "desc:off_team_poss_pct:off",
      "desc:off_rtg:baseline",
      "desc:off_rtg:on",
      "desc:off_rtg:off",
      "desc:off_usage:baseline",
      "desc:off_usage:on",
      "desc:off_usage:off",
    ],
    factorMins
      ? [
          "desc:off_adj_prod:baseline",
          "desc:off_adj_prod:on",
          "desc:off_adj_prod:off",
          "asc:def_adj_prod:baseline",
          "asc:def_adj_prod:on",
          "asc:def_adj_prod:off",
        ]
      : [
          "desc:off_adj_rtg:baseline",
          "desc:off_adj_rtg:on",
          "desc:off_adj_rtg:off",
          "asc:def_adj_rtg:baseline",
          "asc:def_adj_rtg:on",
          "asc:def_adj_rtg:off",
        ],
  ]);
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

  // 4] View

  const quickToggleBar = (
    <ToggleButtonGroup
      items={[
        {
          label: "Expanded",
          tooltip: expandedView
            ? "Show single row of player stats"
            : "Show expanded player stats",
          toggled: expandedView,
          onClick: () => setExpandedView(!expandedView),
        },
        {
          label: "Poss%",
          tooltip: possAsPct
            ? "Show possessions as count"
            : "Show possessions as percentage",
          toggled: possAsPct,
          onClick: () => setPossAsPct(!possAsPct),
        },
        {
          label: "* Mins%",
          tooltip:
            "Whether to incorporate % of minutes played into adjusted ratings (ie turns it into 'production per team 100 possessions')",
          toggled: factorMins,
          onClick: () => toggleFactorMins(),
        },
        {
          label: "Grades",
          tooltip: showGrades
            ? "Hide player ranks/percentiles"
            : "Show player ranks/percentiles",
          toggled: showGrades != "",
          onClick: () =>
            setShowGrades(showGrades ? "" : ParamDefaults.defaultEnabledGrade),
        },
        {
          label: "RAPM",
          tooltip:
            "Whether to calculate the RAPM Off/Def metrics for each player (can be slow - also on/off RAPMs can be very unreliable, particularly for high/low poss% values)" +
            (adjustForLuck
              ? ". Note luck is applied more aggressively here than in the leaderboard/team report pages"
              : ""),
          toggled: calcRapm,
          onClick: () => setCalcRapm(!calcRapm),
        },
        {
          label: "Luck",
          tooltip: adjustForLuck
            ? "Remove luck adjustments"
            : "Adjust statistics for luck",
          toggled: adjustForLuck,
          onClick: () => setAdjustForLuck(!adjustForLuck),
        },
        {
          label: (
            <span>
              Edit...{!_.isEmpty(manualOverrides) ? " " : ""}
              {!_.isEmpty(manualOverrides) ? (
                <small>
                  <Badge variant="dark">{(manualOverrides || []).length}</Badge>
                </small>
              ) : null}
            </span>
          ),
          tooltip: "Launch player stats manual editor",
          toggled: false,
          onClick: () => setShowManualOverrides(true),
        },
        {
          label: "Style",
          tooltip: showPlayTypes
            ? "Hide play style breakdowns"
            : "Show play style breakdowns",
          toggled: showPlayTypes,
          onClick: () => setShowPlayTypes(!showPlayTypes),
        },
      ]
        .concat(
          (gameFilterParams.year || DateUtils.mostRecentYearWithData) >=
            DateUtils.firstYearWithShotChartData
            ? [
                {
                  label: "Shots",
                  tooltip: showShotCharts
                    ? "Hide shot chart"
                    : "Show shot charts",
                  toggled: showShotCharts,
                  onClick: () => setShowShotCharts(!showShotCharts),
                },
              ]
            : []
        )
        .concat([
          {
            label: "+ Info",
            tooltip: showInfoSubHeader
              ? "Hide extra info sub-header"
              : "Show extra info sub-header (not currently saved like other options)",
            toggled: showInfoSubHeader,
            onClick: () => setShowInfoSubHeader(!showInfoSubHeader),
          },
        ])}
    />
  );

  const optionsDropdown = (
    <GenericTogglingMenu>
      <GenericTogglingMenuItem
        text="Always show baseline statistics"
        truthVal={alwaysShowBaseline}
        onSelect={() => setAlwaysShowBaseline(!alwaysShowBaseline)}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text={<span>Adjust for Luck</span>}
        truthVal={adjustForLuck}
        onSelect={() => setAdjustForLuck(!adjustForLuck)}
        helpLink={
          showHelp
            ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html"
            : undefined
        }
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text={<span>Configure Manual Overrides...</span>}
        truthVal={showManualOverrides}
        onSelect={() => setShowManualOverrides(!showManualOverrides)}
      />
      <GenericTogglingMenuItem
        text="Configure Luck Adjustments..."
        truthVal={false}
        onSelect={() => setShowLuckConfig(true)}
      />
      <GenericTogglingMenuItem
        text="Configure Advanced Stats..."
        truthVal={false}
        onSelect={() => setShowTeamRosterStatsConfig(true)}
      />
      <GenericTogglingMenuItem
        text={
          <span>
            Upload On-Ball Defense...{" "}
            <span className="badge badge-pill badge-info">alpha</span>
          </span>
        }
        truthVal={showOnBallConfig}
        onSelect={() => setShowOnBallConfig(true)}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text="Show Off/Def Rating diagnostics"
        truthVal={showDiagMode}
        onSelect={() => setShowDiagMode(!showDiagMode)}
      />
      <GenericTogglingMenuItem
        text="Show Positional diagnostics"
        truthVal={showPositionDiags}
        onSelect={() => setShowPositionDiags(!showPositionDiags)}
        helpLink={
          showHelp
            ? "https://hoop-explorer.blogspot.com/2020/05/classifying-college-basketball.html"
            : undefined
        }
      />
      <GenericTogglingMenuItem
        text="Show Luck Adjustment diagnostics"
        truthVal={showLuckAdjDiags}
        onSelect={() => setShowLuckAdjDiags(!showLuckAdjDiags)}
      />
      <GenericTogglingMenuItem
        text={
          <a
            target="_blank"
            href={UrlRouting.getTeamReportUrl({
              ...getCommonFilterParams(gameFilterParams),
              filter: gameFilterParams.filter,
              showOnOff: false,
              showComps: false,
              incRepOnOff: false,
              incRapm: true,
              rapmDiagMode: "team",
              rapmPriorMode: rapmPriorMode.toString(),
              rapmRegressMode: rapmRegressMode.toString(),
              luck: luckConfig,
              teamLuck: adjustForLuck,
            })}
          >
            Show RAPM diagnostrics (new tab)
          </a>
        }
        truthVal={false}
        onSelect={() => false}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text={"Show repeating header every 10 rows"}
        truthVal={showRepeatingHeader}
        onSelect={() => setShowRepeatingHeader(!showRepeatingHeader)}
      />
      <GenericTogglingMenuItem
        className="d-none d-md-flex"
        text="'Quick Select' Bar Is Sticky"
        truthVal={stickyQuickToggle}
        onSelect={() => setStickyQuickToggle(!stickyQuickToggle)}
      />
      <GenericTogglingMenuItem
        className="d-md-none"
        disabled={true}
        text="Sticky 'Quick Select' Bar Disabled"
        truthVal={false}
        onSelect={() => {}}
      />
    </GenericTogglingMenu>
  );

  /** The sub-header builder - Can show some handy context in between the header and data rows: */
  const maybeSubheaderRow = showInfoSubHeader
    ? RosterTableUtils.buildInformationalSubheader(
        calcRapm,
        expandedView,
        resolvedTheme == "dark"
      )
    : [];

  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );
  return typeof window !== `undefined` || testMode ? ( //(don't render as SSR)
    <Container fluid>
      <LoadingOverlay
        active={needToLoadQuery()}
        text={
          rosterStats.error_code
            ? `Query Error: ${rosterStats.error_code}`
            : "Press 'Submit' to view results"
        }
      >
        <ManualOverrideModal
          tableType={ParamPrefixes.player}
          filteredPlayers={
            filterStr
              ? new Set(filteredPlayers.map((p) => p.baseline?.key || ""))
              : undefined
          }
          inStats={playersAsList}
          statsAsTable={mutableTableDisplayForOverrides}
          overrides={manualOverrides}
          show={showManualOverrides && !_.isEmpty(rosterStats?.baseline || [])}
          onHide={() => setShowManualOverrides(false)}
          onSave={(overrides: ManualOverride[]) =>
            setManualOverrides(overrides)
          }
          showHelp={false}
        />
        <LuckConfigModal
          show={showLuckConfig}
          onHide={() => setShowLuckConfig(false)}
          onSave={(l: LuckParams) => setLuckConfig(l)}
          luck={luckConfig}
          showHelp={showHelp}
        />
        <TeamRosterStatsConfigModal
          show={showTeamRosterStatsConfig}
          onlyRapm={true}
          noRapmDiagMode={true}
          onHide={() => setShowTeamRosterStatsConfig(false)}
          onSave={(config: TeamRosterStatsConfig) => {
            setRapmPriorMode(config.rapmPriorMode);
            setRapmRegresssMode(config.rapmRegressMode);
          }}
          config={{
            rapmPriorMode,
            rapmRegressMode,
            showRapmDiag: false,
            regressDiffs: 0,
          }}
          showHelp={showHelp}
        />
        <OnBallDefenseModal
          show={showOnBallConfig}
          players={rosterStats.baseline || []}
          onHide={() => setShowOnBallConfig(!showOnBallConfig)}
          onSave={(onBallDefense: OnBallDefenseModel[]) => {
            setOnBallDefenseByCode(
              _.chain(onBallDefense)
                .groupBy((p) => p.code)
                .mapValues((l) => l[0]!)
                .value()
            );
          }}
          onBallDefense={_.values(onBallDefenseByCode)}
          showHelp={false}
        />
        <Form.Row>
          <Form.Group as={Col} sm="6">
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="filter">Filter</InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={filterStr}
                onChange={(t: string) => setFilterStr(t)}
                timeout={500}
                placeholder="eg Player1Surname,Player2FirstName,-Player3Name"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} sm="5">
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="sortBy">Sort By</InputGroup.Text>
              </InputGroup.Prepend>
              <ThemedSelect
                className="w-75"
                value={stringToOption(sortBy)}
                options={groupedOptions}
                onChange={(option: any) => {
                  if ((option as any)?.value) setSortBy((option as any)?.value);
                }}
                styles={{
                  menu: (base: any) => ({ ...base, zIndex: 1000 }),
                }}
                formatGroupLabel={formatGroupLabel}
              />
            </InputGroup>
          </Form.Group>
        </Form.Row>
        <StickyRow
          className="pt-1"
          stickyEnabled={stickyQuickToggle}
          topOffset="1em"
        >
          <Col sm="11">{quickToggleBar}</Col>
          <Form.Group as={Col} sm="1" className="mb-0">
            {optionsDropdown}
          </Form.Group>
        </StickyRow>
        <Row className="mt-2">
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
            <GenericTable
              tableCopyId="rosterStatsTable"
              tableFields={tableFields}
              tableData={maybeSubheaderRow.concat(tableData)}
              cellTooltipMode="none"
            />
          </Col>
        </Row>
      </LoadingOverlay>
    </Container>
  ) : null;
};

export default RosterStatsTable;
