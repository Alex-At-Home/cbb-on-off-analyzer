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
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';

// Additional components:
// @ts-ignore
import LoadingOverlay from 'react-loading-overlay';
import Select, { components} from "react-select";

// Component imports
import GenericTable, { GenericTableOps, GenericTableColProps } from "./GenericTable";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import RapmGlobalDiagView from "./diags/RapmGlobalDiagView";
import RapmPlayerDiagView from "./diags/RapmPlayerDiagView";
import RepOnOffDiagView from "./diags/RepOnOffDiagView";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import LuckConfigModal from './shared/LuckConfigModal';

// Util imports
import { getCommonFilterParams, TeamReportFilterParams, ParamDefaults, LuckParams } from '../utils/FilterModels';
import { LineupUtils } from '../utils/stats/LineupUtils';
import { RapmInfo, RapmUtils } from '../utils/stats/RapmUtils';
import { UrlRouting } from '../utils/UrlRouting';
import { efficiencyAverages } from '../utils/public-data/efficiencyAverages';
import { averageStatsInfo } from '../utils/internal-data/averageStatsInfo';
import { CbbColors } from "../utils/CbbColors";
import { OnOffReportDiagUtils } from "../utils/stats/OnOffReportDiagUtils";
import { CommonTableDefs } from "../utils/CommonTableDefs";
import { LineupStatsModel } from '../components/LineupStatsTable';
import { RosterStatsModel } from '../components/RosterStatsTable';
import { TeamStatsModel } from '../components/TeamStatsTable';
import { LuckUtils, OffLuckAdjustmentDiags, DefLuckAdjustmentDiags, LuckAdjustmentBaseline } from "../utils/stats/LuckUtils";
import { LineupDisplayUtils } from "../utils/stats/LineupDisplayUtils";

/** Convert from LineupStatsModel into this */
export type TeamReportStatsModel = {
  players?: Array<any>,
  playerMap?: Record<string, string>,
  error_code?: string
}
type Props = {
  startingState: TeamReportFilterParams;
  dataEvent: {
    lineupStats: LineupStatsModel,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel,
  },
  onChangeState: (newParams: TeamReportFilterParams) => void;
  testMode?: boolean; //(if set, the initial processing occurs synchronously)
}

const TeamReportStatsTable: React.FunctionComponent<Props> = ({startingState, dataEvent, onChangeState, testMode}) => {
  const { lineupStats, teamStats, rosterStats } = dataEvent;

  const topRef = React.createRef<HTMLDivElement>();

  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  // 1] State

  const commonParams = getCommonFilterParams(startingState);

  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const avgEfficiency = efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;
  const statsAverages = averageStatsInfo[genderYearLookup] || {};

  const [ sortBy, setSortBy ] = useState(startingState.sortBy || ParamDefaults.defaultTeamReportSortBy);
  const [ filterStr, setFilterStr ] = useState(startingState.filter || ParamDefaults.defaultTeamReportFilter);

  // (slight delay when typing into the filter to make it more responsive)
  const [ timeoutId, setTimeoutId ] = useState(-1);
  const [ tmpFilterStr, setTmpFilterStr ] = useState(filterStr);

  // Luck:

  /** Adjust for luck in all stats */
  const [ adjustForLuck, setAdjustForLuck ] = useState(_.isNil(startingState.teamLuck) ?
    ParamDefaults.defaultTeamReportLuckAdjust : startingState.teamLuck
  );
  /** The settings to use for luck adjustment */
  const [ luckConfig, setLuckConfig ] = useState(_.isNil(startingState.luck) ?
    ParamDefaults.defaultLuckConfig : startingState.luck
  );

  /** Whether we are showing the luck config modal */
  const [ showLuckConfig, setShowLuckConfig ] = useState(false);

  // Display options:

  const [ showOnOff, setShowOnOff ] = useState(
    _.isNil(startingState.showOnOff) ? ParamDefaults.defaultShowOnOff : startingState.showOnOff
  );

  const [ showLineupCompositions, setShowLineupCompositions ] = useState(
    _.isNil(startingState.showComps) ? ParamDefaults.defaultShowComps : startingState.showComps
  );

  const [ incReplacementOnOff, setIncReplacementOnOff ] = useState(
    _.isNil(startingState.incRepOnOff) ? ParamDefaults.defaultTeamReportIncRepOnOff : startingState.incRepOnOff
  );

  const [ incRapm, setIncRapm ] = useState(
    _.isNil(startingState.incRapm) ? ParamDefaults.defaultTeamReportIncRapm : startingState.incRapm
  );

  const [ regressDiffs, setRegressDiffs ] = useState(
    parseInt(_.isNil(startingState.regressDiffs) ? ParamDefaults.defaultTeamReportRegressDiffs : startingState.regressDiffs)
  );
  //(this won't change unless the page is reloaded)
  const [ startingRegressDiffs, setStartingRegressDiffs_UNUSED ] = useState(
    parseInt(_.isNil(startingState.regressDiffs) ? ParamDefaults.defaultTeamReportRegressDiffs : startingState.regressDiffs)
  );

  const [ repOnOffDiagMode, setRepOnOffDiagMode ] = useState(_.isNil(startingState.repOnOffDiagMode) ?
    ParamDefaults.defaultTeamReportRepOnOffDiagMode : startingState.repOnOffDiagMode
  );
  // Calculate some derived fields from this aggregate field: (length:sort_order:sort_field)
  const repOnOffDiagModeInfo = repOnOffDiagMode.split(":");
  const repOnOffDiagModeNumLineups = parseInt(repOnOffDiagModeInfo[0]);
  const repOnOffDiagModeLineupSortDir = parseInt(repOnOffDiagModeInfo?.[1] || ParamDefaults.defaultTeamReportRepOnOffDiagModeIfEnabled[1]);
  const repOnOffDiagModeLineupSortField = repOnOffDiagModeInfo?.[2] || ParamDefaults.defaultTeamReportRepOnOffDiagModeIfEnabled[2];

  const [ rapmDiagMode, setRapmDiagMode ] = useState(
    _.isNil(startingState.rapmDiagMode) ? ParamDefaults.defaultTeamReportRapmDiagMode : startingState.rapmDiagMode
  );
  const globalRapmDiagRef = React.createRef<HTMLDivElement>();

  /** If the browser is doing heavier calcs then spin the display vs just be unresponsive */
  const [ inBrowserRepOnOffPxing, setInBrowserRepOnOffPxing ] = useState(0);

  const filterFragments =
    filterStr.split(",").map(fragment => _.trim(fragment)).filter(fragment => fragment ? true : false);
  const filterFragmentsPve =
    filterFragments.filter(fragment => fragment[0] != '-');
  const filterFragmentsNve =
    filterFragments.filter(fragment => fragment[0] == '-').map(fragment => fragment.substring(1));

  useEffect(() => { //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...startingState,
      // Luck
      luck: luckConfig,
      teamLuck: adjustForLuck,
      // display/processing
      sortBy: sortBy,
      filter: filterStr,
      showOnOff: showOnOff,
      showComps: showLineupCompositions,
      incRepOnOff: incReplacementOnOff,
      incRapm: incRapm,
      regressDiffs: regressDiffs.toString(),
      repOnOffDiagMode: repOnOffDiagMode,
      rapmDiagMode: rapmDiagMode
    };
    onChangeState(newState);
  }, [ sortBy, filterStr, showOnOff, showLineupCompositions, incReplacementOnOff, incRapm,
        regressDiffs, repOnOffDiagMode, rapmDiagMode,
        luckConfig, adjustForLuck ]);

  // (cache this below)
  const [ teamReport, setTeamReport ] = useState({} as any);
  const [ playersWithAdjEff, setPlayersWithAdjEff ] = useState([] as Array<any>);

  const [ rapmInfo, setRapmInfo ] = useState(undefined as RapmInfo | undefined);

  useEffect(() => { //(this ensures that the filter component is up to date with the union of these fields)

    // We just set this flag to make the processing async so that we can give some indication that
    // we're processing (vs just being unresponsive)
    setInBrowserRepOnOffPxing(inBrowserRepOnOffPxing + 1);

  }, [ lineupStats, incReplacementOnOff, incRapm, regressDiffs, repOnOffDiagMode, rapmDiagMode,
        luckConfig, adjustForLuck ] );

  /** logic to perform whenever the data changes (or the metadata in such a way re-processing is required) */
  const onDataChangeProcessing = (
    inLineupStats: LineupStatsModel, inTeamStats: TeamStatsModel, inRosterStats: RosterStatsModel
  ) => {
    try {

      // Luck

      // The luck baseline can either be the user-selecteed baseline or the entire season
      const [ baseOrSeasonTeamStats, baseOrSeason3PMap ] = (() => {
        if (adjustForLuck) {
          switch (luckConfig.base) {
            case "baseline":
              return [
                inTeamStats.baseline, _.fromPairs((inRosterStats.baseline || []).map((p: any) => [ p.key, p ]))
              ];
            default: //("season")
              return [
                inTeamStats.global, _.fromPairs((inRosterStats.global || []).map((p: any) => [ p.key, p ]))
              ];
          }
        } else return [ {}, {} ]; //(not used)
      })();

      // Mutate lineups:
      _.forEach(inLineupStats?.lineups || [], (lineup) => {
        const codesAndIds = lineup.players_array?.hits?.hits?.[0]?._source?.players || [];

        const perLineupPlayerLuckMap = _.fromPairs(codesAndIds.map((cid: { code: string, id: string }) => {
          return [  cid.id, baseOrSeason3PMap[cid.id] ];
        }));
        const luckAdj = (adjustForLuck && lineup?.doc_count) ? [
          LuckUtils.calcOffTeamLuckAdj(
            lineup, inRosterStats.baseline || [], baseOrSeasonTeamStats, perLineupPlayerLuckMap, avgEfficiency
          ),
          LuckUtils.calcDefTeamLuckAdj(lineup, baseOrSeasonTeamStats, avgEfficiency),
        ] as [OffLuckAdjustmentDiags, DefLuckAdjustmentDiags] : undefined;

        if (lineup?.doc_count) {
          LuckUtils.injectLuck(lineup, luckAdj?.[0], luckAdj?.[1]);
        }
      });

      // Processing

      const tempTeamReport = LineupUtils.lineupToTeamReport(
        inLineupStats, incReplacementOnOff, regressDiffs, repOnOffDiagModeNumLineups
      );
      if (incRapm) {
        try {
          const rapmContext = RapmUtils.buildPlayerContext(
            tempTeamReport.players || [], lineupStats.lineups || [],
            avgEfficiency
          );
          const [ offRapmWeights, defRapmWeights ] = RapmUtils.calcPlayerWeights(rapmContext);
          const [ offRapmInputs, defRapmInputs ] = RapmUtils.pickRidgeRegression(
            offRapmWeights, defRapmWeights, rapmContext, (rapmDiagMode != "")
          );
          RapmUtils.injectRapmIntoPlayers(
            tempTeamReport.players || [], offRapmInputs, defRapmInputs, statsAverages, rapmContext
          );
          if (adjustForLuck) { // (Calculate RAPM without luck, for display purposes)
            const [ offNoLuckRapmInputs, defNoLuckRapmInputs ] = RapmUtils.pickRidgeRegression(
              offRapmWeights, defRapmWeights, rapmContext, (rapmDiagMode != ""),
              true //<- uses old_value (ie pre-luck-adjusted)
            );
            RapmUtils.injectRapmIntoPlayers(
              tempTeamReport.players || [], offNoLuckRapmInputs, defNoLuckRapmInputs, statsAverages, rapmContext,
              true //<- only applies RAPM to old_values
            );
          }
          setRapmInfo({
            ctx: rapmContext,
            preProcDiags: (rapmDiagMode != "") ?
              RapmUtils.calcCollinearityDiag(offRapmWeights, rapmContext) : undefined
            ,
            noUnbiasWeightsDiags: (rapmDiagMode != "") && (rapmContext.unbiasWeight > 0) ?
              RapmUtils.recalcNoUnbiasWeightingRapmForDiag(
                offRapmWeights, defRapmWeights,
                offRapmInputs, defRapmInputs, rapmContext
              ) : undefined
            ,
            offWeights: offRapmWeights,
            defWeights: defRapmWeights,
            offInputs: offRapmInputs,
            defInputs: defRapmInputs
          });
        } catch (err) {
          console.log("ERROR CALLING (R)APM DIAGS: " + err.message, err);
        }
      }
      setTeamReport(tempTeamReport);
      setPlayersWithAdjEff(tempTeamReport?.players || []);
    } catch (e) {
      console.log("Error calling LineupUtils.lineupToTeamReport", e);
    }
  };

  React.useEffect(() => {
    if (inBrowserRepOnOffPxing > 0) {
      setTimeout(() => { //(ensures that the "processing" element is returned _before_ the processing starts)
        onDataChangeProcessing(lineupStats, teamStats, rosterStats);
        setInBrowserRepOnOffPxing(inBrowserRepOnOffPxing - 1);
      }, 1);
    }
  }, [ inBrowserRepOnOffPxing ] );

  // Called fron unit test so we build the snapshot based on the actual data
  if (testMode) {
    if (playersWithAdjEff.length == 0) { //(ensure that unit tests don't re-render to infinity)
      onDataChangeProcessing(lineupStats, teamStats, rosterStats);
    }
  }

  // 2] Data Model

  // 3] Utils

  // 3.1] Table building

  const [ playerLineupPowerSet, powerType ] = OnOffReportDiagUtils.buildPlayerSummary(
    playersWithAdjEff, incRapm, incReplacementOnOff
  );

  /** Handles the various sorting combos */
  const sorter = (sortStr: string) => { // format: (asc|desc):(off_|def_|diff_)<field>:(on|off|delta)
    const sortComps = sortStr.split(":"); //asc/desc
    const dir = (sortComps[0] == "desc") ? -1 : 1;
    const fieldComps = _.split(sortComps[1], "_", 1); //off/def/diff
    const fieldName = sortComps[1].substring(fieldComps[0].length + 1); //+1 for _
    const field = (player: any) => {
      switch(fieldComps[0]) {
        case "diff": //(off-def)
          return (player["off_" + fieldName]?.value || 0.0)
                - (player["def_" + fieldName]?.value || 0.0);
        default:
          return player[sortComps[1]]?.value; //(off or def)
      }
    };
    const onOrOff = (playerSet: any) => {
      switch(sortComps[2]) {
        case "on": return [ playerSet.on ];
        case "off": return [ playerSet.off ];
        case "rep": return [ playerSet.replacement ];
        case "rapm": return [ playerSet.rapm ];
        case "delta": return [ playerSet.on, playerSet.off ];
        default: return [ 0 ];
      }
    };
    return (playerSet: any) => {
      const playerFields = onOrOff(playerSet || {}).map(player => field(player || {}) || 0);
      if (playerFields.length > 1) {
        return dir*(playerFields[0] - playerFields[1]); //(delta case above)
      } else {
        return dir*playerFields[0];
      }
    };
  };

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  const tableDataInputs = _.chain(playersWithAdjEff).filter((player) => {
      const strToTest = player.playerId + " " + player.playerCode;
      return(
        (filterFragmentsPve.length == 0) ||
          (_.find(filterFragmentsPve, (fragment) => strToTest.indexOf(fragment) >= 0) ? true : false))
        &&
        ((filterFragmentsNve.length == 0) ||
          (_.find(filterFragmentsNve, (fragment) => strToTest.indexOf(fragment) >= 0) ? false : true))
        ;
    }).sortBy(
       [ sorter(sortBy) ]
    ).value();

    const playerOnOffTooltip =
      <Tooltip id="playerOnOffTooltip">Open a tab with the on/off analysis for this player</Tooltip>;

    const tableData = _.chain(tableDataInputs).flatMap((player, index) => {
      LineupDisplayUtils.injectAssistInfo(player.on, false, false); //(inject assist numbers)
      LineupDisplayUtils.injectAssistInfo(player.off, false, false); //(inject assist numbers)

      const [ onMargin, offMargin ] = OnOffReportDiagUtils.getAdjEffMargins(player);
      const onSuffix =
        <span>Adj: [<b>{onMargin.toFixed(1)}</b>]-[<b>{offMargin.toFixed(1)}</b>]=[<b>{(onMargin - offMargin).toFixed(1)}</b>]</span>;
      const totalPoss = (player.on.off_poss.value + player.off.off_poss.value || 1);
      const onPoss = 100.0*player.on.off_poss.value/totalPoss;
      const offPoss = 100.0*player.off.off_poss.value/totalPoss;
      const offSuffix =
        <span>Poss: [<b>{onPoss.toFixed(0)}</b>]% v [<b>{offPoss.toFixed(0)}</b>]%</span>;
      const onOffAnalysis = {
        ...commonParams,
        onQuery: `"${player.playerId}"`,
        offQuery: `NOT "${player.playerId}"`,
        autoOffQuery: true
      };
      const statsOn = {
        off_title: <span><b>{player.on.key}</b><br/>{onSuffix}</span>,
        def_title: "", ...player.on
      };
      const statsOff = {
        off_title: <span><b>{player.off.key}</b><br/>{offSuffix}<br/>
        <OverlayTrigger placement="auto" overlay={playerOnOffTooltip}>
          <a target="_blank" href={UrlRouting.getGameUrl(onOffAnalysis, {})}>On/Off Analysis...</a>
        </OverlayTrigger>
      </span>,
        def_title: "", ...player.off
      };

      const replacementMargin = incReplacementOnOff ?
        player.replacement?.off_adj_ppp?.value - player.replacement?.def_adj_ppp?.value : 0.0;
      const repSuffix = <span>Adj: [<b>{replacementMargin.toFixed(1)}</b>]</span>;

      const statsReplacement = incReplacementOnOff ? {
        off_title: <span><b>{player.replacement?.key}</b><br/>{repSuffix}</span>,
        def_title: "", ...player?.replacement
      }: {};

      const rapmMargin = incRapm ?
        player.rapm?.off_adj_ppp?.value - player.rapm?.def_adj_ppp?.value : 0.0;
      const rapmSuffix = <span>Adj: [<b>{rapmMargin.toFixed(1)}</b>]</span>;
      const statsRapm  = incRapm ? {
        off_title: <span><b>{player.rapm?.key}</b><br/>{rapmSuffix}</span>,
        def_title: "", ...player?.rapm
      } : {};

      const repOnOffDiagsEnabled = incReplacementOnOff && (repOnOffDiagModeNumLineups > 0);
      const repOnOffDiagInfo = repOnOffDiagsEnabled ? OnOffReportDiagUtils.getRepOnOffDiagInfo(
        player, regressDiffs
      ) : undefined;

      return _.flatten([
        showOnOff ? [
          GenericTableOps.buildDataRow(statsOn, CommonTableDefs.offPrefixFn, CommonTableDefs.offCellMetaFn, CommonTableDefs.onOffReportWithFormattedTitle),
          GenericTableOps.buildDataRow(statsOn, CommonTableDefs.defPrefixFn, CommonTableDefs.defCellMetaFn),
          GenericTableOps.buildDataRow(statsOff, CommonTableDefs.offPrefixFn, CommonTableDefs.offCellMetaFn, CommonTableDefs.onOffReportWithFormattedTitle),
          GenericTableOps.buildDataRow(statsOff, CommonTableDefs.defPrefixFn, CommonTableDefs.defCellMetaFn),
        ] : [],
        incReplacementOnOff && (player?.replacement?.key) ? [
          GenericTableOps.buildDataRow(statsReplacement, CommonTableDefs.offPrefixFn, CommonTableDefs.offCellMetaFn, CommonTableDefs.onOffReportReplacement),
          GenericTableOps.buildDataRow(statsReplacement, CommonTableDefs.defPrefixFn, CommonTableDefs.defCellMetaFn, CommonTableDefs.onOffReportReplacement)
        ] : [],
        repOnOffDiagsEnabled && (player?.replacement?.key) ? [
          GenericTableOps.buildTextRow(
            <RepOnOffDiagView
              diagInfo={repOnOffDiagInfo || []}
              player={player}
              playerMap={teamReport?.playerMap || {}}
              commonParams={commonParams}
              expandedMode={tableDataInputs.length == 1}
              onExpand = {(playerId: string) => { setFilterStr(playerId); setTmpFilterStr(playerId) }}
              showHelp={showHelp}
            />, "small"
          )
        ] : [],
        incRapm && (player?.rapm?.key) ? [
          GenericTableOps.buildDataRow(statsRapm, CommonTableDefs.offPrefixFn, CommonTableDefs.offCellMetaFn, CommonTableDefs.onOffReportReplacement),
          GenericTableOps.buildDataRow(statsRapm, CommonTableDefs.defPrefixFn, CommonTableDefs.defCellMetaFn, CommonTableDefs.onOffReportReplacement)
        ] : [],
        incRapm && (rapmDiagMode != "") && rapmInfo && (player?.rapm?.key) ? [
          GenericTableOps.buildTextRow(
            <RapmPlayerDiagView
              rapmInfo={rapmInfo}
              player={player}
              globalRef={globalRapmDiagRef}
            />, "small"
          )
        ] : [],
        showLineupCompositions ? [ GenericTableOps.buildTextRow(
          OnOffReportDiagUtils.buildLineupInfo(player, playerLineupPowerSet, powerType), "small"
        ) ] : [],
        [ GenericTableOps.buildRowSeparator() ],
         repOnOffDiagsEnabled && (tableDataInputs.length == 1) ?
          OnOffReportDiagUtils.getRepOnOffDiags(
            player, teamReport?.playerMap || {}, repOnOffDiagInfo || [], commonParams,
            [ repOnOffDiagModeNumLineups, repOnOffDiagModeLineupSortField, repOnOffDiagModeLineupSortDir ],
            (field: string, dir: number) => {
              if ((field == ParamDefaults.defaultTeamReportRepOnOffDiagModeIfEnabled[2]) &&
                (dir.toString() == ParamDefaults.defaultTeamReportRepOnOffDiagModeIfEnabled[1]))
              {
                //(if defaults then don't pollute the URL!)
                setRepOnOffDiagMode(repOnOffDiagModeNumLineups.toString());
              } else {
                setRepOnOffDiagMode(
                  [repOnOffDiagModeNumLineups, dir, field].join(":")
                );
              }
            },
            showHelp
          ) : [],
      ]);
    }).value();

  // 3.2] Sorting utils

  const sortOptions: Array<any> = _.flatten(
    _.toPairs(CommonTableDefs.onOffReport)
      .filter(keycol => keycol[1].colName && keycol[1].colName != "")
      .map(keycol => {
        return _.flatMap([
          ["desc","off"], ["asc","off"], ["desc","def"], ["asc","def"], ["desc","diff"], ["asc","diff"]
        ], sort_offDef => {
          const onOffCombos = _.flatMap([
            showOnOff || showLineupCompositions ? ["on", "off", "delta"] : [],
            incReplacementOnOff ? ["rep"] : [],
            incRapm ? ["rapm"] : []
          ]);
          return onOffCombos.map(onOff => {
            return [ ...sort_offDef, onOff ];
          }); // eg [ [ desc, off, on ], [ desc, off, off ], [ desc, off, delta ] ]
        }).map(combo => {
          const onOrOff = (s: string) => { switch(s) {
            case "on": return "'On'";
            case "off": return "'Off'";
            case "delta": return "'On-Off'";
            case "rep": return "'r:On-Off'";
            case "rapm": return "RAPM";
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
          return {
            label: `${onOrOff(combo[2])} ${keycol[1].colName} (${ascOrDesc(combo[0])} / ${offOrDef(combo[1])})`,
            value: `${combo[0]}:${combo[1]}_${keycol[0]}:${combo[2]}`
          };
        });
      })
  );
  const sortOptionsByValue = _.fromPairs(
    sortOptions.map(opt => [opt.value, opt])
  );
  /** Put these options at the front */
  const mostUsefulSubset = _.flatMap([
    showOnOff || showLineupCompositions ? [
      "desc:off_poss:on", "desc:off_poss:off",
      "desc:diff_adj_ppp:delta",
      "desc:diff_adj_ppp:on",
      "desc:diff_adj_ppp:off",
      "desc:off_adj_ppp:delta",
      "asc:def_adj_ppp:delta"
    ] : [],
    incReplacementOnOff ? [
      "desc:off_poss:rep",
      "desc:diff_adj_ppp:rep",
      "desc:off_adj_ppp:rep",
      "asc:def_adj_ppp:rep"
    ] : [],
    incRapm ? [
      "desc:off_poss:rapm",
      "desc:diff_adj_ppp:rapm",
      "desc:off_adj_ppp:rapm",
      "asc:def_adj_ppp:rapm"
    ] : []
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
  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  // 3] Utils

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (inBrowserRepOnOffPxing > 0) || (teamReport.players || []).length == 0;
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return sortOptionsByValue[s];
  }

  /** Handling filter change (/key presses to fix the select/delete on page load) */
  const onFilterChange = (ev: any) => {
    const toSet = ev.target.value;
    setTmpFilterStr(toSet);
    if (timeoutId != -1) {
      window.clearTimeout(timeoutId);
    }
    setTimeoutId(window.setTimeout(() => {
      setFilterStr(toSet);
    }, 100));
  };

  // 4] View
  return <Container><div ref={topRef}>
    <LoadingOverlay
      active={needToLoadQuery()}
      text={teamReport.error_code ?
        `Query Error: ${teamReport.error_code}` :
        "Press 'Submit' to view results"
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
        <Form.Group as={Col} sm="6">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="filter">Filter</InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              onKeyUp={onFilterChange}
              onChange={onFilterChange}
              placeholder = "eg Player1Surname,Player2FirstName,-Player3Name"
              value={tmpFilterStr}
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
              text="Show on/off statistics"
              truthVal={showOnOff}
              onSelect={() => setShowOnOff(!showOnOff)}
            />
            <GenericTogglingMenuItem
              text={<span>Show replacement On-Off <span className="badge badge-pill badge-info">alpha!</span></span>}
              truthVal={incReplacementOnOff}
              onSelect={() => setIncReplacementOnOff(!incReplacementOnOff)}
              helpLink={showHelp ? "https://hoop-explorer.blogspot.com/2020/04/replacement-on-off-heres-elevator-pitch.html" : undefined}
            />
            <GenericTogglingMenuItem
              text={<span>Show RAPM <span className="badge badge-pill badge-info">experimental!</span></span>}
              truthVal={incRapm}
              onSelect={() => setIncRapm(!incRapm)}
              helpLink={showHelp ? "https://hoop-explorer.blogspot.com/2020/03/understanding-team-report-onoff-page.html#RAPM" : undefined}
            />
            <GenericTogglingMenuItem
              text="Show lineup compositions"
              truthVal={showLineupCompositions}
              onSelect={() => setShowLineupCompositions(!showLineupCompositions)}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text="Adjust for Luck"
              truthVal={adjustForLuck}
              onSelect={() => setAdjustForLuck(!adjustForLuck)}
              helpLink={showHelp ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html" : undefined}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text={`Regress 'r:On-Off' ${
                startingRegressDiffs > 0 ? "by" : "to"
              } ${
                Math.abs(startingRegressDiffs != 0 ? startingRegressDiffs : parseInt(ParamDefaults.defaultTeamReportRegressDiffs))
              } samples`}
              truthVal={regressDiffs != 0}
              onSelect={() => setRegressDiffs(
                regressDiffs != 0 ?
                  0 : // switch off if on, else switch to the number the page was loaded with
                  (startingRegressDiffs != 0 ? startingRegressDiffs : parseInt(ParamDefaults.defaultTeamReportRegressDiffs))
              )}
            />
            <GenericTogglingMenuItem
              text="Configure Luck Adjustments..."
              truthVal={false}
              onSelect={() => setShowLuckConfig(true)}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text="'r:On-Off' diagnostic mode"
              truthVal={repOnOffDiagMode != "0"}
              onSelect={() => setRepOnOffDiagMode(
                repOnOffDiagMode != "0" ? //(only set the lineup size if the other are the defaults)
                  "0" : ParamDefaults.defaultTeamReportRepOnOffDiagModeIfEnabled[0]
              )}
            />
            <GenericTogglingMenuItem
              text="'RAPM diagnostic mode"
              truthVal={rapmDiagMode != ""}
              onSelect={() => setRapmDiagMode(rapmDiagMode != "" ? "" : "base")}
            />
          </GenericTogglingMenu>
        </Form.Group>
      </Form.Row>
      <Form.Row>
        <ToggleButtonGroup items={[
          {
            label: "On/Off",
            tooltip: showOnOff ? "Hide Basic On/Off Stats" : "Show Basic On/Off Stats",
            toggled: showOnOff,
            onClick: () => setShowOnOff(!showOnOff)
          },
          {
            label: "Same-4",
            tooltip: incReplacementOnOff ? "Hide Replacement ('Same-4') On-Off" : "Show Replacement ('Same-4') On-Off",
            toggled: incReplacementOnOff,
            onClick: () => setIncReplacementOnOff(!incReplacementOnOff)
          },
          {
            label: "RAPM",
            tooltip: incRapm ? "Hide Player RAPM" : "Show Player RAPM",
            toggled: incRapm,
            onClick: () => setIncRapm(!incRapm)
          },
          {
            label: "Luck",
            tooltip: adjustForLuck ? "Remove luck adjustments" : "Adjust statistics for luck",
            toggled: adjustForLuck,
            onClick: () => setAdjustForLuck(!adjustForLuck)
          }
        ]}/>
      </Form.Row>
      <Row className="mt-2">
        <Col>
          <GenericTable
            tableCopyId="teamReportStatsTable"
            tableFields={CommonTableDefs.onOffReport}
            tableData={tableData}
          />
        </Col>
      </Row>
      {
      incRapm && (rapmDiagMode != "") && rapmInfo ?
      <Row>
        <Col className="small">
          <div ref={globalRapmDiagRef}>
            <RapmGlobalDiagView
              topRef={topRef}
              rapmInfo={rapmInfo}
              players={[]}
            />
          </div>
        </Col>
      </Row> : null
      }
    </LoadingOverlay>
  </div></Container>;
};

export default TeamReportStatsTable;
