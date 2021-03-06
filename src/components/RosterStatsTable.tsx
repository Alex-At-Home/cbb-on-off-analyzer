// React imports:
import React, { useState, useEffect } from 'react';

// Next imports:
import { NextPage } from 'next';

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';

// Additional components:
// @ts-ignore
import LoadingOverlay from 'react-loading-overlay';
import Select, { components} from "react-select";

// Component imports
import GenericTable, { GenericTableOps, GenericTableColProps } from "./GenericTable";
import RosterStatsDiagView from "./diags/RosterStatsDiagView";
import PositionalDiagView from "./diags/PositionalDiagView";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import { TeamStatsModel } from '../components/TeamStatsTable';
import { LineupStatsModel } from '../components/LineupStatsTable';
import LuckAdjDiagView from "./diags/LuckAdjDiagView"
import LuckConfigModal from "./shared/LuckConfigModal";
import ManualOverrideModal from "./shared/ManualOverrideModal";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import PlayerPlayTypeDiagView from "./diags/PlayerPlayTypeDiagView"
import AsyncFormControl from './shared/AsyncFormControl';

// Util imports
import { CbbColors } from "../utils/CbbColors";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { getCommonFilterParams, ParamDefaults, ParamPrefixes, GameFilterParams, LuckParams, ManualOverride } from "../utils/FilterModels";
import { ORtgDiagnostics, RatingUtils } from "../utils/stats/RatingUtils";
import { PositionUtils } from "../utils/stats/PositionUtils";
import { LuckUtils } from "../utils/stats/LuckUtils";
import { OverrideUtils } from "../utils/stats/OverrideUtils";
import { efficiencyAverages } from '../utils/public-data/efficiencyAverages';
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import { QueryUtils } from "../utils/QueryUtils";
import { RapmUtils } from "../utils/stats/RapmUtils";
import { LineupUtils } from "../utils/stats/LineupUtils";

export type RosterStatsModel = {
  on?: Array<any>,
  off?: Array<any>,
  onOffMode?: boolean,
  baseline?: Array<any>,
  global?: Array<any>, //(across all samples for the team)
  error_code?: string
}
type Props = {
  gameFilterParams: GameFilterParams,
  /** Ensures that all relevant data is received at the same time */
  dataEvent: {
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel,
    lineupStats: LineupStatsModel[]
  },
  onChangeState: (newParams: GameFilterParams) => void,
  testMode?: boolean //(if set, the initial processing occurs synchronously)
}

const RosterStatsTable: React.FunctionComponent<Props> = ({gameFilterParams, dataEvent, onChangeState, testMode}) => {
  const { teamStats, rosterStats, lineupStats } = dataEvent;

  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] State (some of these are phase 2+ and aren't plumbed in yet)

  const commonParams = getCommonFilterParams(gameFilterParams);
  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const teamSeasonLookup = `${commonParams.gender}_${commonParams.team}_${commonParams.year}`;
  const avgEfficiency = efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  /** Splits out offensive and defensive metrics into separate rows */
  const [ expandedView, setExpandedView ] = useState(_.isNil(gameFilterParams.showExpanded) ?
    ParamDefaults.defaultPlayerShowExpanded : gameFilterParams.showExpanded
  );

  /** Show baseline even if on/off are present */
  const [ alwaysShowBaseline, setAlwaysShowBaseline ] = useState(_.isNil(gameFilterParams.showBase) ?
    ParamDefaults.defaultPlayerShowBase : gameFilterParams.showBase
  );

  /** Show a diagnostics mode explaining the off/def ratings */
  const [ showDiagMode, setShowDiagMode ] = useState(_.isNil(gameFilterParams.showDiag) ?
    ParamDefaults.defaultPlayerDiagMode : gameFilterParams.showDiag
  );

  /** Show a diagnostics mode explaining the positional evaluation */
  const [ showPositionDiags, setShowPositionDiags ] = useState(_.isNil(gameFilterParams.showPosDiag) ?
      ParamDefaults.defaultPlayerPosDiagMode : gameFilterParams.showPosDiag
  );

  /** Show the number of possessions as a % of total team count */
  const [ possAsPct, setPossAsPct ] = useState(_.isNil(gameFilterParams.possAsPct) ?
    ParamDefaults.defaultPlayerPossAsPct : gameFilterParams.possAsPct
  );
  /** Show the number of possessions as a % of total team count */
  const [ factorMins, setFactorMins ] = useState(_.isNil(gameFilterParams.factorMins) ?
    ParamDefaults.defaultPlayerFactorMins : gameFilterParams.factorMins
  );
  /** When switching between rating and prod, also switch common sort bys over */
  const toggleFactorMins = () => {
    const newSortBy = factorMins ? sortBy.replace("_prod", "_rtg") : sortBy.replace("_rtg", "_prod");
    if (newSortBy != sortBy) {
      setSortBy(newSortBy);
    }
    setFactorMins(!factorMins);
  };

  /** Incorporates SoS into rating calcs "Adj [Eq] Rtg" */
  const [ adjORtgForSos, setAdjORtgForSos ] = useState(false);

  /** Switches usage to an offset "[Adj] Eq ORtg" */
  const [ showEquivORtgAtUsage, setShowEquivORtgAtUsage ] = useState("" as string);

  /** Which players to filter */
  const [ filterStr, setFilterStr ] = useState(_.isNil(gameFilterParams.filter) ?
    ParamDefaults.defaultPlayerFilter : gameFilterParams.filter
  );

  const [ manualOverrides, setManualOverrides ] = useState(_.isNil(gameFilterParams.manual) ?
    [] : gameFilterParams.manual
  );

  // Transform the list into a map of maps of values
  const manualOverridesAsMap = OverrideUtils.buildOverrideAsMap(manualOverrides);
  const overridableStatsList = _.keys(OverrideUtils.getOverridableStats(ParamPrefixes.player));

  const [ showManualOverrides, setShowManualOverrides ] = useState(_.isNil(gameFilterParams.showPlayerManual) ?
    false : gameFilterParams.showPlayerManual
  );

  const filterFragments =
    filterStr.split(",").map(fragment => _.trim(fragment)).filter(fragment => fragment ? true : false);
  const filterFragmentsPve =
    filterFragments.filter(fragment => fragment[0] != '-');
  const filterFragmentsNve =
    filterFragments.filter(fragment => fragment[0] == '-').map(fragment => fragment.substring(1));

  // Sort field
  const [ sortBy, setSortBy ] = useState(_.isNil(gameFilterParams.sortBy) ?
    ParamDefaults.defaultPlayerSortBy : gameFilterParams.sortBy
  );

  // Luck

  const [ adjustForLuck, setAdjustForLuck ] = useState(_.isNil(gameFilterParams.onOffLuck) ?
    ParamDefaults.defaultOnOffLuckAdjust : gameFilterParams.onOffLuck
  );
  const [ showLuckAdjDiags, setShowLuckAdjDiags ] = useState(_.isNil(gameFilterParams.showPlayerOnOffLuckDiags) ?
    ParamDefaults.defaultOnOffLuckDiagMode : gameFilterParams.showPlayerOnOffLuckDiags
  );
  const [ luckConfig, setLuckConfig ] = useState(_.isNil(gameFilterParams.luck) ?
    ParamDefaults.defaultLuckConfig : gameFilterParams.luck
  );

  /** (placeholder for positional info)*/
  const [ showPlayTypes, setShowPlayTypes ] = useState(_.isNil(gameFilterParams.showPlayerPlayTypes) ?
    ParamDefaults.defaultPlayerShowPlayTypes : gameFilterParams.showPlayerPlayTypes
  );

  /** (placeholder for positional info)*/
  const [ calcRapm, setCalcRapm ] = useState(_.isNil(gameFilterParams.calcRapm) ?
    ParamDefaults.defaultPlayerCalcRapm : gameFilterParams.calcRapm
  );

  /** Whether we are showing the luck config modal */
  const [ showLuckConfig, setShowLuckConfig ] = useState(false);

  useEffect(() => { //(keep luck and manual up to date between the two views)
    setAdjustForLuck(_.isNil(gameFilterParams.onOffLuck) ?
        ParamDefaults.defaultOnOffLuckAdjust : gameFilterParams.onOffLuck
    );
    setLuckConfig(_.isNil(gameFilterParams.luck) ?
      ParamDefaults.defaultLuckConfig : gameFilterParams.luck
    );
    setManualOverrides(gameFilterParams.manual || []);

  }, [ gameFilterParams ]);

  useEffect(() => { //(this ensures that the filter component is up to date with the union of these fields)
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
      // Overrides:
      manual: manualOverrides,
      // Luck:
      luck: luckConfig,
      calcRapm: calcRapm,
      factorMins: factorMins,
      onOffLuck: adjustForLuck,
      showPlayerOnOffLuckDiags: showLuckAdjDiags,
      showPlayerManual: showManualOverrides
    };
    onChangeState(newState);

  }, [ sortBy, filterStr, showDiagMode, alwaysShowBaseline, expandedView, possAsPct, showPositionDiags,
      showPlayTypes, luckConfig, adjustForLuck, showLuckAdjDiags, showManualOverrides, manualOverrides, calcRapm, factorMins
    ]);

  // 2] Data Model

  const allTableFields = CommonTableDefs.onOffIndividualTableAllFields(expandedView);
  const tableFields = CommonTableDefs.onOffIndividualTable(expandedView, possAsPct, factorMins, calcRapm);

  // 3] Utils

  // Needed for a few things, including RAPM and play type analysis

  /** Largest sample of player stats, by player key - use for ORtg calcs */
  const globalRosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
    rosterStats.global || [], showPlayTypes, teamSeasonLookup
  ); //TODO: which set do I actually want to use for positional calcs here?

  // 3.0] RAPM

  const [ cachedRapm, setCachedRapm ] = useState({} as Record<string, any>);

  useEffect(() => {
    //ensure we never show the _wrong_ RAPM
    setCachedRapm({});
  }, [ dataEvent, adjustForLuck, manualOverrides ]);

  const baselinePlayerInfo = LineupTableUtils.buildBaselinePlayerInfo(
    rosterStats.baseline, globalRosterStatsByCode, teamStats.baseline, avgEfficiency
  );
  const positionFromPlayerKey = LineupTableUtils.buildPositionPlayerMap(rosterStats.global, teamSeasonLookup);

  /** For a given lineup set, calculate RAPM as quickly as possible */
  const buildRapm = (lineupStats: LineupStatsModel) => {
    //TODO: manual edits don't show as override (so can't see original value) - fix at some point
    // but not worth delaying over

    const preRapmTableData = LineupTableUtils.buildEnrichedLineups(
      lineupStats.lineups || [],
      teamStats.global, rosterStats.global, teamStats.baseline,
      adjustForLuck, luckConfig.base, avgEfficiency,
      false, teamSeasonLookup, positionFromPlayerKey, baselinePlayerInfo
    );
    const tempTeamReport = LineupUtils.lineupToTeamReport({
      lineups: preRapmTableData
    });
    const rapmContext = RapmUtils.buildPlayerContext(
      tempTeamReport.players || [], preRapmTableData,
      baselinePlayerInfo,
      avgEfficiency
    );
    const [ offRapmWeights, defRapmWeights ] = RapmUtils.calcPlayerWeights(rapmContext);
    const preProcDiags = RapmUtils.calcCollinearityDiag(offRapmWeights, rapmContext);
    const [ offRapmInputs, defRapmInputs ] = RapmUtils.pickRidgeRegression(
      offRapmWeights, defRapmWeights, rapmContext, preProcDiags.adaptiveCorrelWeights, false
    );
    RapmUtils.injectRapmIntoPlayers(
      tempTeamReport.players || [], offRapmInputs, defRapmInputs, {}, rapmContext, preProcDiags.adaptiveCorrelWeights
    );
    if (adjustForLuck) { // (Calculate RAPM without luck, for display purposes)
      const [ offNoLuckRapmInputs, defNoLuckRapmInputs ] = RapmUtils.pickRidgeRegression(
        offRapmWeights, defRapmWeights, rapmContext, preProcDiags.adaptiveCorrelWeights, false,
        true //<- uses old_value (ie pre-luck-adjusted)
      );
      RapmUtils.injectRapmIntoPlayers(
        tempTeamReport.players || [], offNoLuckRapmInputs, defNoLuckRapmInputs, {}, rapmContext, preProcDiags.adaptiveCorrelWeights,
        true //<- only applies RAPM to old_values
      );
    }
    return _.fromPairs(
      (tempTeamReport.players || []).map(p => [ p.playerId, { off_adj_rapm: p.rapm?.off_adj_ppp, def_adj_rapm: p.rapm?.def_adj_ppp }])
    );
  };

  const buildAllRapm = () => {
    if (calcRapm && _.isEmpty(cachedRapm)) {
        const rapmInfos = (lineupStats || []).map(lineupStat => {
        try {
          return buildRapm(lineupStat)
        } catch (err) {
          return {};
        }
      });
      setCachedRapm({
        baseline: rapmInfos?.[0],
        on: (gameFilterParams.onQuery) != "" ? rapmInfos?.[1] : undefined,
        off: (gameFilterParams.onQuery) != "" ? rapmInfos?.[2] : rapmInfos?.[1],
      });
    }
  };

  useEffect(() => {
    buildAllRapm();
  }, [ cachedRapm ]);

  if (testMode) buildAllRapm();

  // 3.1] Table building

  /** Handles the various sorting combos */
  const sorter = (sortStr: string) => { // format: (asc|desc):(off_|def_|diff_)<field>:(on|off|delta)
    const sortComps = sortStr.split(":"); //asc/desc
    const dir = (sortComps[0] == "desc") ? -1 : 1;
    const fieldComps = _.split(sortComps[1], "_", 1); //off/def/diff
    const fieldName = sortComps[1].substring(fieldComps[0].length + 1); //+1 for _
    const field = (player: any) => {
      return player?.[sortComps[1]]?.value || 0; //(off or def)
    };
    const onOrOff = (playerSet: any) => {
      switch(sortComps[2]) {
        case "on": return [ playerSet.on ];
        case "off": return [ playerSet.off ];
        case "baseline": return [ playerSet.baseline ];
        default: return [ 0 ];
      }
    };
    return (playerSet: any) => {
      const playerFields = onOrOff(playerSet || {}).map(player => field(player) || 0);
      return dir*playerFields[0];
    };
  };

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  const onOffBasePicker = (str: "On" | "Off" | "Baseline" | "Global", arr: Array<any>) => {
    return _.find(arr, (p) => _.startsWith(p.onOffKey, str));
  }

  /** Show baseline unless both on and off are present */
  const skipBaseline = !alwaysShowBaseline &&
    (rosterStats?.on?.length && rosterStats?.off?.length);

  const baselineIsOnlyLine = !(rosterStats?.on?.length || rosterStats?.off?.length);

  const onOffBaseToPhrase = (type: "on" | "off" | "baseline") => {
    switch(type) {
      case "on":  return "A";
      case "off":  return "B";
      case "baseline": return "Base"
    }
  };

  /** Utility function to build the title for the player stats */
  const insertTitle = (playerName: string, type: "on" | "off" | "baseline", pos: string) => {
    const singleLineCase = type == "baseline" && baselineIsOnlyLine;
      //^ (if this is set we only show it together with on/off)
    const sub = onOffBaseToPhrase(type);

    const posIfNotExpanded1 = expandedView ? null :
      <OverlayTrigger placement="auto" overlay={TableDisplayUtils.buildPositionTooltip(pos, sub)}>
          <sup>{pos}</sup>
      </OverlayTrigger>;

    const posIfNotExpanded2 = expandedView ? null :
      <OverlayTrigger placement="auto" overlay={TableDisplayUtils.buildPositionTooltip(pos, sub)}>
          <small>{pos} - </small>
      </OverlayTrigger>;

    return singleLineCase ?
      <span>
        <span className="d-none d-xl-block"><b>{playerName}</b> {posIfNotExpanded1}</span>
        <span className="d-block d-xl-none"><b>{playerName}</b></span>
      </span> :
      <span>
        <span><b>{playerName}</b></span>
        <span className="d-none d-xl-block">{posIfNotExpanded2}<b>{sub}</b> lineups</span>
        <span className="d-block d-xl-none"><b>{sub}</b> set</span>
      </span>;
  };

  /** Need to be able to see the stats table for players in the manual override table */
  const mutableTableDisplayForOverrides = {} as Record<string, any[]>;

  // (Always just use A/B here because it's too confusing to say
  // "On <Player name>" meaning ""<Player Name> when <Other other player> is on")
  const allPlayers = _.chain([
    _.map(rosterStats.on  || [], (p) => _.assign(p, {
      onOffKey: 'On'
    })),
    _.map(rosterStats.off  || [], (p) => _.assign(p, {
      onOffKey: 'Off'
    })),
    _.map(rosterStats.baseline || [], (p) => _.assign(p, {
      onOffKey: 'Baseline'
    })),
    _.map(rosterStats.global || [], (p) => _.assign(p, {
      onOffKey: 'Global'
    })),
  ]).flatten().groupBy("key").toPairs().map((key_onOffBase) => {

    const player = { // Now grouped by player, re-create the on/off/baseline set
      key: key_onOffBase[0],
      on: onOffBasePicker("On", key_onOffBase[1]),
      off: onOffBasePicker("Off", key_onOffBase[1]),
      baseline: onOffBasePicker("Baseline", key_onOffBase[1]),
      global: onOffBasePicker("Global", key_onOffBase[1]),
    };
    const baseOrSeasonTeamStats = (luckConfig.base == "baseline")
      ? teamStats.baseline : teamStats.global;

    // Inject ORtg and DRB and Poss% (ie mutate player idempotently)
    ([ "baseline", "on", "off" ] as ("baseline" | "on" | "off")[]).forEach((key) => {
      const stat = (player as any)[key];
      const teamStat = (teamStats as any)[key] || {};
      if (stat) {
        stat.off_team_poss_pct = { value: _.min([(stat.off_team_poss.value || 0)
            / (teamStat.off_poss?.value || 1), 1 ]) };
        stat.def_team_poss_pct = { value: _.min([(stat.def_team_poss.value || 0)
            / (teamStat.def_poss?.value || 1), 1 ]) };

        // Handle luck:
        const baseOrGlobalPlayer = (luckConfig.base == "baseline")
          ? (player as any)["baseline"] : (player as any)["global"];

        const [ offLuckAdj, defLuckAdj ] = baseOrGlobalPlayer && adjustForLuck ? [
          LuckUtils.calcOffPlayerLuckAdj(
            stat, baseOrGlobalPlayer, avgEfficiency
          ), LuckUtils.calcDefPlayerLuckAdj(
            stat, baseOrGlobalPlayer, avgEfficiency
          ) ] : [ undefined, undefined ];

        if (stat?.doc_count) {
          LuckUtils.injectLuck(stat, offLuckAdj, defLuckAdj);
        }
        stat.off_luck = offLuckAdj;
        stat.def_luck = defLuckAdj;

        // Once luck is applied apply any manual overrides

        const playerOverrideKey = OverrideUtils.getPlayerRowId(stat.key, stat.onOffKey);
        const overrides = manualOverridesAsMap[playerOverrideKey];
        const overrodeOffFields = _.reduce(overridableStatsList, (acc, statName) => {
          const override = overrides?.[statName];
          const maybeDoOverride = OverrideUtils.overrideMutableVal(stat, statName, override, "Manually adjusted");
          return acc || maybeDoOverride;
        }, false);

        const adjustmentReason = (() => {
          if (adjustForLuck && overrodeOffFields) {
            return "Derived from luck adjustments and manual overrides";
          } else if (!adjustForLuck && overrodeOffFields) {
            return "Derived from manual overrides";
          } else if (adjustForLuck && !overrodeOffFields) {
            return "Derived from luck adjustments";
          } else {
            return undefined;
          }
        })();
        // Set or unset derived stats:
        OverrideUtils.updateDerivedStats(stat, adjustmentReason);
        stat.off_drb = stat.def_orb; //(just for display, all processing should use def_orb)
        TableDisplayUtils.injectPlayTypeInfo(stat, expandedView, true, teamSeasonLookup);

        // Ratings:

        const [
          oRtg, adjORtg, rawORtg, rawAdjORtg, oRtgDiag
        ] = RatingUtils.buildORtg(
            stat, globalRosterStatsByCode,
            avgEfficiency, showDiagMode, adjustForLuck || overrodeOffFields
          );
        const [
          dRtg, adjDRtg, rawDRtg, rawAdjDRtg, dRtgDiag
        ] = RatingUtils.buildDRtg(stat, avgEfficiency, showDiagMode, adjustForLuck);
        stat.off_rtg = {
          value: oRtg?.value, old_value: rawORtg?.value,
          override: adjustmentReason
        };
        stat.off_adj_rtg = {
          value: adjORtg?.value, old_value: rawAdjORtg?.value,
          override: adjustmentReason
        };
        stat.off_adj_prod = {
          value: (adjORtg?.value || 0)*stat.off_team_poss_pct.value!,
          old_value: (rawAdjORtg?.value || 0)*stat.off_team_poss_pct.value!,
          override: adjustmentReason
        };
        stat.diag_off_rtg = oRtgDiag;
        stat.def_rtg = {
          value: dRtg?.value, old_value: rawDRtg?.value,
          override: adjustForLuck ? "Derived from luck adjustments" : undefined
        };
        stat.def_adj_rtg = {
          value: adjDRtg?.value,
          old_value: rawAdjDRtg?.value,
          override: adjustForLuck ? "Derived from luck adjustments" : undefined
        };
        stat.def_adj_prod = {
          value: (adjDRtg?.value || 0)*stat.def_team_poss_pct.value!,
          old_value: (rawAdjDRtg?.value || 0)*stat.def_team_poss_pct.value!,
          override: adjustForLuck ? "Derived from luck adjustments" : undefined
        };
        stat.diag_def_rtg = dRtgDiag;

        // Positional info (NOTE - no dependencies on other processing like ORtg):

        const [ posConfs, posConfsDiags ] = PositionUtils.buildPositionConfidences(stat);
        const [ pos, posDiags ] = PositionUtils.buildPosition(posConfs, stat, teamSeasonLookup);
        stat.def_usage = <OverlayTrigger placement="auto" overlay={TableDisplayUtils.buildPositionTooltip(pos, onOffBaseToPhrase(key))}>
          <small>{pos}</small>
        </OverlayTrigger>;
        if (showPlayTypes) {
          stat.role = pos;
        }

        // RAPM: if we have a cached value then use that else claim it's being calculated...
        if (calcRapm) {
          if (!cachedRapm.baseline) { //(if baseline has RAPM it must have calculated)
            const rapmPlaceholder = <OverlayTrigger placement="auto" overlay={
              <Tooltip id={`${stat.key}-pendingRapm`}>Calculating, stand by...</Tooltip>
            }><i>??</i></OverlayTrigger>;
            stat.off_adj_rapm = rapmPlaceholder;
            stat.def_adj_rapm = rapmPlaceholder;
            stat.off_adj_rapm_prod = rapmPlaceholder;
            stat.def_adj_rapm_prod = rapmPlaceholder;
          } else {
            const rapm = cachedRapm?.[key]?.[stat.key] || {};
            if (expandedView) {
              stat.off_adj_rapm = rapm.off_adj_rapm;
              stat.def_adj_rapm = rapm.def_adj_rapm;
              stat.off_adj_rapm_prod = rapm.off_adj_rapm ? { value: (rapm.off_adj_rapm?.value || 0)*stat.off_team_poss_pct.value! } : undefined;
              stat.def_adj_rapm_prod = rapm.off_adj_rapm ? { value: (rapm.def_adj_rapm?.value || 0)*stat.def_team_poss_pct.value! } : undefined;
            } else {
              stat.off_adj_rapm = (rapm.off_adj_rapm && rapm.def_adj_rapm) ?
                { value: (rapm.off_adj_rapm?.value || 0) - (rapm.def_adj_rapm?.value || 0) } :
                undefined;
              stat.off_adj_rapm_prod = stat.off_adj_rapm ? { value: (stat.off_adj_rapm.value || 0)*stat.off_team_poss_pct.value! } : undefined;
            }
          }
        }

        // Now we have the position we can build the titles:
        stat.off_title = insertTitle(stat.key, key, pos);

        // Create a table for the mutable overrides:

        mutableTableDisplayForOverrides[OverrideUtils.getPlayerRowId(stat.key, stat.onOffKey)] = [
           GenericTableOps.buildDataRow(stat, offPrefixFn, offCellMetaFn),
           GenericTableOps.buildDataRow(stat, defPrefixFn, defCellMetaFn)
        ];
      }
    });
    return player;
  }).value();

  const filteredPlayers = allPlayers.filter((player) => {
    const strToTest = (player.on?.key || player.off?.key || player.baseline?.key || "") +
      " " + (player.baseline?.player_array?.hits?.hits?.[0]?._source?.player?.code || "");

    return(
      (filterFragmentsPve.length == 0) ||
        (_.find(filterFragmentsPve, (fragment) => strToTest.indexOf(fragment) >= 0) ? true : false))
      &&
      ((filterFragmentsNve.length == 0) ||
        (_.find(filterFragmentsNve, (fragment) => strToTest.indexOf(fragment) >= 0) ? false : true))
      ;
  });
  const tableData = _.chain(filteredPlayers).sortBy(
    [ sorter(sortBy) , (p) => { p.baseline?.off_team_poss?.value || 0 } ]
  ).flatMap((p) => {
    return _.flatten([
      _.isNil(p.on?.off_title) ? [ ] : _.flatten([
        [ GenericTableOps.buildDataRow(p.on, offPrefixFn, offCellMetaFn) ],
        expandedView ? [ GenericTableOps.buildDataRow(p.on, defPrefixFn, defCellMetaFn) ] : [],
        p.on?.diag_off_rtg ?
          [ GenericTableOps.buildTextRow(<RosterStatsDiagView ortgDiags={p.on?.diag_off_rtg} drtgDiags={p.on?.diag_def_rtg}/>, "small") ] : [],
        showPositionDiags ?
          [ GenericTableOps.buildTextRow(<PositionalDiagView player={p.on} teamSeason={teamSeasonLookup} showHelp={showHelp}/>, "small") ] : [],
        showLuckAdjDiags && p.on?.off_luck ? [ GenericTableOps.buildTextRow(
          <LuckAdjDiagView
            name="Player On"
            offLuck={p.on?.off_luck}
            defLuck={p.on?.def_luck}
            baseline={luckConfig.base}
            individualMode={true}
            showHelp={showHelp}
          />, "small pt-2"
        ) ] : [] ,
        showPlayTypes ?
          [ GenericTableOps.buildTextRow(
            <PlayerPlayTypeDiagView
              player={{...p.on, posClass: p.global?.posClass || "??"}}
              rosterStatsByCode={globalRosterStatsByCode}
              teamSeasonLookup={teamSeasonLookup} showHelp={showHelp}/>, "small"
          ) ] : [],
      ]),
      _.isNil(p.off?.off_title) ? [ ] : _.flatten([
        [ GenericTableOps.buildDataRow(p.off, offPrefixFn, offCellMetaFn) ],
        expandedView ? [ GenericTableOps.buildDataRow(p.off, defPrefixFn, defCellMetaFn) ] : [],
        p.off?.diag_off_rtg ?
          [ GenericTableOps.buildTextRow(<RosterStatsDiagView ortgDiags={p.off?.diag_off_rtg} drtgDiags={p.off?.diag_def_rtg}/>, "small") ] : [],
        showPositionDiags ?
          [ GenericTableOps.buildTextRow(<PositionalDiagView player={p.off} teamSeason={teamSeasonLookup} showHelp={showHelp}/>, "small") ] : [],
        showLuckAdjDiags && p.off?.off_luck? [ GenericTableOps.buildTextRow(
          <LuckAdjDiagView
            name="Player Off"
            offLuck={p.off?.off_luck}
            defLuck={p.off?.def_luck}
            baseline={luckConfig.base}
            individualMode={true}
            showHelp={showHelp}
          />, "small pt-2"
        ) ] : [] ,
        showPlayTypes ?
          [ GenericTableOps.buildTextRow(
            <PlayerPlayTypeDiagView
              player={{...p.off, posClass: p.global?.posClass || "??"}}
              rosterStatsByCode={globalRosterStatsByCode}
              teamSeasonLookup={teamSeasonLookup} showHelp={showHelp}/>, "small"
          ) ] : [],
      ]),
      (skipBaseline || _.isNil(p.baseline?.off_title)) ? [ ] : _.flatten([
        [ GenericTableOps.buildDataRow(p.baseline, offPrefixFn, offCellMetaFn) ],
        expandedView ? [ GenericTableOps.buildDataRow(p.baseline, defPrefixFn, defCellMetaFn) ] : [],
        p.baseline?.diag_off_rtg ?
          [ GenericTableOps.buildTextRow(<RosterStatsDiagView ortgDiags={p.baseline?.diag_off_rtg} drtgDiags={p.baseline?.diag_def_rtg}/>, "small") ] : [],
        showPositionDiags ?
          [ GenericTableOps.buildTextRow(<PositionalDiagView player={p.baseline} teamSeason={teamSeasonLookup} showHelp={showHelp}/>, "small") ] : [],
        showLuckAdjDiags && p.baseline?.off_luck ? [ GenericTableOps.buildTextRow(
          <LuckAdjDiagView
            name="Player Base"
            offLuck={p.baseline?.off_luck}
            defLuck={p.baseline?.def_luck}
            baseline={luckConfig.base}
            individualMode={true}
            showHelp={showHelp}
          />, "small pt-2"
        ) ] : [] ,
        showPlayTypes ?
          [ GenericTableOps.buildTextRow(
            <PlayerPlayTypeDiagView
              player={{...p.baseline, posClass: p.global?.posClass || "??"}}
              rosterStatsByCode={globalRosterStatsByCode}
              teamSeasonLookup={teamSeasonLookup} showHelp={showHelp}/>, "small"
          ) ] : [],
      ]),
      [ GenericTableOps.buildRowSeparator() ]
    ]);
  }).value();

  /** A list of all the players in poss count order */
  const playersAsList = _.flatMap(allPlayers, (p) => {
    return _.flatten([
      p.on?.off_team_poss ? [ p.on ] : [],
      p.off?.off_team_poss ? [ p.off ] : [],
      p.baseline?.off_team_poss ? [ p.baseline ] : [],
    ]);
  });

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (rosterStats?.baseline?.length || 0) == 0;
  }
  /** Table formatter */
  function rowSpanCalculator(cellMeta: string) {
    switch(cellMeta) {
      case "off": return expandedView ? 2 : 1;
      case "def": return 0;
      default: return 1;
    }
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return sortOptionsByValue[s];
  }

  // 3.1] Sorting utils

  const sortOptions: Array<any> = _.flatten(
    _.toPairs(allTableFields)
      .filter(keycol => keycol[1].colName && keycol[1].colName != "")
      .map(keycol => {
        return _.flatMap([
          //TODO: inject some defensive fields in here
          ["desc","off"], ["asc","off"], ["desc","def"], ["asc","def"], ["desc","diff"], ["asc","diff"]
        ], sort_offDef => {
          const onOffCombos = _.flatMap([
            ["baseline"].concat(teamStats?.on?.doc_count ? ["on"] : []).concat(teamStats?.off?.doc_count ? ["off"] : [])
          ]);
          return onOffCombos.map(onOff => {
            return [ ...sort_offDef, onOff ];
          }); // eg [ [ desc, off, on ], [ desc, off, off ], [ desc, off, delta ] ]
        }).flatMap(combo => {
          if ((combo[1] == "diff") && (
            (keycol[0] != "rtg") && (keycol[0] != "adj_rtg") && (keycol[0] != "adj_prod") &&
              (keycol[0] != "adj_rapm") && (keycol[0] != "adj_rapm_prod") && (keycol[0] != "adj_opp")
          )) {  // only do diff for a few:
            return [];
          }
          const onOrOff = (s: string) => { switch(s) {
            case "on": return "'On'";
            case "off": return "'Off'";
            case "baseline": return "Base";
          }}
          const ascOrDesc = (s: string) => { switch(s) {
            case "asc": return "Asc.";
            case "desc": return "Desc.";
          }}
          const offOrDef = (s: string) => { switch(s) {
            case "off": return "Offensive";
            case "def": return "Defensive";
            case "diff": return "Off-Def";
          }}
          const labelOverride = CommonTableDefs.indivColNameOverrides[`${combo[1]}_${keycol[0]}`];
          const ascOrDecLabel = ascOrDesc(combo[0]) || "";
          const offOrDefLabel = offOrDef(combo[1]) || "";
          const label = labelOverride ? labelOverride(ascOrDecLabel) : "see_below";
          return label ? [{
            label: !_.isNil(labelOverride) ? `${onOrOff(combo[2])} ${label}` : `${onOrOff(combo[2])} ${keycol[1].colName} (${ascOrDecLabel} / ${offOrDefLabel})`,
            value: `${combo[0]}:${combo[1]}_${keycol[0]}:${combo[2]}`
          }] : [];
        });
      })
  );
  const sortOptionsByValue = _.fromPairs(
    sortOptions.map(opt => [opt.value, opt])
  );
  /** Put these options at the front */
  const mostUsefulSubset = _.flatMap([
    [
      "desc:off_team_poss_pct:baseline", "desc:off_team_poss_pct:on", "desc:off_team_poss_pct:off",
      "desc:off_rtg:baseline", "desc:off_rtg:on", "desc:off_rtg:off",
      "desc:off_usage:baseline", "desc:off_usage:on", "desc:off_usage:off",
    ],
    factorMins ?
      [ "desc:off_adj_prod:baseline", "desc:off_adj_prod:on", "desc:off_adj_prod:off",
        "asc:def_adj_prod:baseline", "asc:def_adj_prod:on",  "asc:def_adj_prod:off",
      ] : [
        "desc:off_adj_rtg:baseline", "desc:off_adj_rtg:on", "desc:off_adj_rtg:off",
        "asc:def_adj_rtg:baseline", "asc:def_adj_rtg:on", "asc:def_adj_rtg:off",
      ]
  ]);
  /** The two sub-headers for the dropdown */
  const groupedOptions = [
    {
      label: "Most useful",
      options: _.chain(sortOptionsByValue).pick(mostUsefulSubset).values().value()
    },
    {
      label: "Other",
      options: _.chain(sortOptionsByValue).omit(mostUsefulSubset).values().value()
    }
  ];

  // 4] View

  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );
  return <Container>
    <LoadingOverlay
      active={needToLoadQuery()}
      text={rosterStats.error_code ?
        `Query Error: ${rosterStats.error_code}` :
        "Press 'Submit' to view results"
      }
    >
      <ManualOverrideModal
        tableType={ParamPrefixes.player}
        filteredPlayers={filterStr ? new Set(filteredPlayers.map(p => p.baseline?.key || "")) : undefined }
        inStats={playersAsList}
        statsAsTable={mutableTableDisplayForOverrides}
        overrides={manualOverrides}
        show={showManualOverrides && !_.isEmpty(rosterStats?.baseline || [])}
        onHide={() => setShowManualOverrides(false)}
        onSave={(overrides: ManualOverride[]) => setManualOverrides(overrides)}
        showHelp={false}
      />
      <LuckConfigModal
        show={showLuckConfig}
        onHide={() => setShowLuckConfig(false)}
        onSave={(l: LuckParams) => setLuckConfig(l)}
        luck={luckConfig}
        showHelp={showHelp}
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
              placeholder = "eg Player1Surname,Player2FirstName,-Player3Name"
            />
          </InputGroup>
        </Form.Group>
        <Form.Group as={Col} sm="5">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="sortBy">Sort By</InputGroup.Text>
            </InputGroup.Prepend>
            <Select
              className="w-75"
              value={ stringToOption(sortBy) }
              options={ groupedOptions }
              onChange={(option) => { if ((option as any)?.value)
                setSortBy((option as any)?.value);
              }}
              formatGroupLabel={formatGroupLabel}
            />
          </InputGroup>
        </Form.Group>
        <Form.Group as={Col} sm="1">
          <GenericTogglingMenu>
            <GenericTogglingMenuItem
              text="Show expanded statistics"
              truthVal={expandedView}
              onSelect={() => setExpandedView(!expandedView)}
            />
            <GenericTogglingMenuItem
              text="Always show baseline statistics"
              truthVal={alwaysShowBaseline}
              onSelect={() => setAlwaysShowBaseline(!alwaysShowBaseline)}
            />
            <GenericTogglingMenuItem
              text={<span>{possAsPct ?
                "Show possessions as count" : "Show possessions as % of team"
              }</span>}
              truthVal={false}
              onSelect={() => setPossAsPct(!possAsPct)}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text={<span>Factor minutes % into Adjusted Rating+</span>}
              truthVal={factorMins}
              onSelect={() => toggleFactorMins()}
            />
            <GenericTogglingMenuItem
              text={<span>Calculate RAPM metric (slow)</span>}
              truthVal={calcRapm}
              onSelect={() => setCalcRapm(!calcRapm)}
            />
            <GenericTogglingMenuItem
              text="Adjust for Luck"
              truthVal={adjustForLuck}
              onSelect={() => setAdjustForLuck(!adjustForLuck)}
              helpLink={showHelp ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html" : undefined}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text="Configure Manual Overrides..."
              truthVal={showManualOverrides}
              onSelect={() => setShowManualOverrides(!showManualOverrides)}
            />
            <GenericTogglingMenuItem
              text="Configure Luck Adjustments..."
              truthVal={false}
              onSelect={() => setShowLuckConfig(true)}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text="Show Play Style Breakdowns"
              truthVal={showPlayTypes}
              onSelect={() => setShowPlayTypes(!showPlayTypes)}
            />
            <GenericTogglingMenuItem
              text="Show Off/Def Rating diagnostics"
              truthVal={showDiagMode}
              onSelect={() => setShowDiagMode(!showDiagMode)}
            />
            <GenericTogglingMenuItem
              text="Show Positional diagnostics"
              truthVal={showPositionDiags}
              onSelect={() => setShowPositionDiags(!showPositionDiags)}
              helpLink={showHelp ? "https://hoop-explorer.blogspot.com/2020/05/classifying-college-basketball.html" : undefined}
            />
            <GenericTogglingMenuItem
              text="Show Luck Adjustment diagnostics"
              truthVal={showLuckAdjDiags}
              onSelect={() => setShowLuckAdjDiags(!showLuckAdjDiags)}
            />
          </GenericTogglingMenu>
        </Form.Group>
      </Form.Row>
      <Form.Row>
        <Col>
          <ToggleButtonGroup items={[
            {
              label: "Expanded",
              tooltip: expandedView ? "Show single row of player stats" : "Show expanded player stats",
              toggled: expandedView,
              onClick: () => setExpandedView(!expandedView)
            },
            {
              label: "Poss%",
              tooltip: possAsPct ? "Show possessions as count" : "Show possessions as percentage",
              toggled: possAsPct,
              onClick: () => setPossAsPct(!possAsPct)
            },
            {
              label: "* Mins%",
              tooltip: "Whether to incorporate % of minutes played into adjusted ratings (ie turns it into 'production per team 100 possessions')",
              toggled: factorMins,
              onClick: () => toggleFactorMins()
            },
            {
              label: "RAPM",
              tooltip: "Whether to calculate the RAPM Off/Def metrics for each player (can be slow - also on/off RAPMs can be very unreliable, particularly for high/low poss% values)",
              toggled: calcRapm,
              onClick: () => setCalcRapm(!calcRapm)
            },
            {
              label: "Luck",
              tooltip: adjustForLuck ? "Remove luck adjustments" : "Adjust statistics for luck",
              toggled: adjustForLuck,
              onClick: () => setAdjustForLuck(!adjustForLuck)
            },
            {
              label: <span>Edit...{!_.isEmpty(manualOverrides) ? " " : ""}{!_.isEmpty(manualOverrides) ?
                <small><Badge variant="dark">{(manualOverrides || []).length}</Badge></small>  : null
              }</span>
              ,
              tooltip: "Launch player stats manual editor",
              toggled: false,
              onClick: () => setShowManualOverrides(true)
            },
            {
              label: "Style",
              tooltip: showPlayTypes ? "Hide play style breakdowns" : "Show play style breakdowns",
              toggled: showPlayTypes,
              onClick: () => setShowPlayTypes(!showPlayTypes)
            },
          ]}/>
        </Col>
      </Form.Row>
      <Row className="mt-2">
        <Col style={{paddingLeft: "5px", paddingRight: "5px"}}>
          <GenericTable
            tableCopyId="rosterStatsTable"
            tableFields={tableFields}
            tableData={tableData}
            cellTooltipMode="none"
          />
        </Col>
      </Row>
    </LoadingOverlay>
  </Container>;
}

export default RosterStatsTable;
