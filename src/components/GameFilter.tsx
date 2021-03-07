// React imports:
import React, { useState, useEffect } from 'react';

// Next imports:
import { NextPage } from 'next';

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Component imports:
import { TeamStatsModel } from '../components/TeamStatsTable';
import { RosterCompareModel } from '../components/RosterCompareTable';
import { RosterStatsModel } from '../components/RosterStatsTable';
import { LineupStatsModel } from '../components/LineupStatsTable';
import CommonFilter, { GlobalKeypressManager } from '../components/CommonFilter';
import { ParamPrefixes, FilterParamsType, CommonFilterParams, GameFilterParams, FilterRequestInfo, ParamPrefixesType, ParamDefaults } from "../utils/FilterModels";
import AutoSuggestText from './shared/AutoSuggestText';

// Utils
import { QueryUtils } from '../utils/QueryUtils';

type Props = {
  onStats: (teamStats: TeamStatsModel, rosterCompareStats: RosterCompareModel, rosterStats: RosterStatsModel, lineupStats: LineupStatsModel[]) => void;
  startingState: GameFilterParams;
  onChangeState: (newParams: GameFilterParams) => void;
  forceReload1Up: number;
}

const GameFilter: React.FunctionComponent<Props> = ({onStats, startingState, onChangeState, forceReload1Up}) => {

  // Data model

  const {
    // Team stats
    teamDiffs: startTeamDiffs,
    showTeamPlayTypes: startShowTeamPlayTypes,
    showLineups: startShowLineups,
    //(common visualization fields across all tables)
    //(manual overrides)
    manual: startManual,
    showPlayerManual: startShowPlayerManual,
    //(luck)
    luck: startLuck,
    //(these fields are for the team view)
    onOffLuck: startOnOffLuck,
    showOnOffLuckDiags: startShowOnOffLuckDiags,
    showPlayerOnOffLuckDiags: startShowPlayerOnOffLuckDiags,
    calcRapm: startCalcRapm,
    //(these fields are for the individual view)
    filter: startFilter, sortBy: startSortBy,
    showBase: startShowBase, showExpanded: startShowExpanded,
    showDiag: startShowDiag, possAsPct: startPossAsPct,
    showPosDiag: startShowPosDiag,
    showPlayerPlayTypes: startShowPlayerPlayTypes,
    //these fields affect the query
    autoOffQuery: startAutoOffQuery,
    onQuery: startOnQuery, offQuery: startOffQuery,
    ...startingCommonFilterParams
  } = startingState;

  /** The state managed by the CommonFilter element */
  const [ commonParams, setCommonParams ] = useState(startingCommonFilterParams as CommonFilterParams);

  /** Ugly pattern that is part of support for force reloading */
  const [ internalForceReload1Up, setInternalForceReload1Up ] = useState(forceReload1Up);

  useEffect(() => { // Whenever forceReload1Up is incremented, reset common params:
    if (forceReload1Up != internalForceReload1Up) {
      setCommonParams(startingCommonFilterParams as CommonFilterParams);
      setInternalForceReload1Up(forceReload1Up);
      // Actually have to reset these two vs just their underlying value
      // (could build that intermediate pair,. but we'll stick with this limitation for now)
      setOnQuery(startOnQuery || "");
      setOffQuery(startOffQuery || "");
      //(leave toggleAutoOffQuery since it seems harmless, and weird stuff happened when I tried to set it
      // which I don't have time to investigate):
      //toggleAutoOffQuery(startAutoOffQuery);
    }
  }, [ forceReload1Up ]);

  // Game Filter - custom queries and filters:

  const [ autoOffQuery, toggleAutoOffQuery ] = useState(
    _.isNil(startAutoOffQuery) ? ParamDefaults.defaultAutoOffQuery : startAutoOffQuery
  );
  const [ onQuery, setOnQuery ] = useState(startOnQuery || "");
  const [ offQuery, setOffQuery ] = useState(startOffQuery || "");

  /** Used to differentiate between the different implementations of the CommonFilter */
  const cacheKeyPrefix = ParamPrefixes.game;

  // Utils

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    setCommonParams(params);
  }

  /** Builds a game filter from the various state elements, and also any secondary filters
   * NOTE: ugly hack I need to fix, needs to sync with CommonFilter.onSeeExample
  */
  function buildParamsFromState(includeFilterParams: Boolean): [ GameFilterParams, FilterRequestInfo[] ]  {
    const primaryRequest: GameFilterParams = includeFilterParams ?
      _.assign(
        buildParamsFromState(false)[0], {
          // Team stats
          autoOffQuery: autoOffQuery,
          teamDiffs: startTeamDiffs,
          showTeamPlayTypes: startShowTeamPlayTypes,
          showLineups: startShowLineups,
          // Common luck stats across all tables:
          //(manual overrides)
          manual: startManual,
          showPlayerManual: startShowPlayerManual,
          //(luck)
          luck: startLuck,
          onOffLuck: startOnOffLuck,
          showOnOffLuckDiags: startShowOnOffLuckDiags,
          showPlayerOnOffLuckDiags: startShowPlayerOnOffLuckDiags,
          // Individual stats:
          calcRapm: startCalcRapm,
          filter: startFilter, sortBy: startSortBy,
          showBase: startShowBase, showExpanded: startShowExpanded,
          showDiag: startShowDiag, possAsPct: startPossAsPct,
          showPosDiag: startShowPosDiag,
          showPlayerPlayTypes: startShowPlayerPlayTypes
      }) : {
        ...commonParams,
        onQuery: onQuery,
        offQuery: offQuery
      };

    //(another ugly hack to be fixed - remove default optional fields)
    QueryUtils.cleanseQuery(primaryRequest);

    const entireSeasonRequest = { // Get the entire season of players for things like luck adjustments
      team: primaryRequest.team, year: primaryRequest.year, gender: primaryRequest.gender,
      minRank: ParamDefaults.defaultMinRank, maxRank: ParamDefaults.defaultMaxRank,
      baseQuery: "", onQuery: "", offQuery: ""
    };
    //TODO: also if the main query minus/on-off matches can't we just re-use that?!
    // (ie and just ignore the on-off portion)

    const alsoPullLineups = (startCalcRapm || startShowLineups);

    const [ baseQuery, maybeAdvBaseQuery ] = alsoPullLineups ?
      QueryUtils.extractAdvancedQuery(commonParams.baseQuery || "") : [ "", undefined ];

    // RAPM calculations:
    const getLineupQuery = (onOrOffQuery: string) => {
      const [ onOrOff, maybeAdvOnOrOff ] = QueryUtils.extractAdvancedQuery(onOrOffQuery);
      const baseToUse = maybeAdvBaseQuery || baseQuery || "";
      const onOffToUse = maybeAdvOnOrOff || onOrOff || "";
      return (baseToUse != "") ? `(${onOffToUse}) AND (${baseToUse})` : onOffToUse;
    };
    const lineupRequests = alsoPullLineups ? [ QueryUtils.cleanseQuery({
      ...commonParams
    }) ].concat((onQuery != "") ? [ QueryUtils.cleanseQuery({
        ...commonParams,
        baseQuery: getLineupQuery(onQuery)
      }) ] : []
    ).concat((offQuery != "") ? [ QueryUtils.cleanseQuery({
        ...commonParams,
        baseQuery: getLineupQuery(offQuery)
      }) ] : []
    ) : [];

    return [ primaryRequest, [{
        context: ParamPrefixes.roster as ParamPrefixesType, paramsObj: primaryRequest
      }, {
        context: ParamPrefixes.player as ParamPrefixesType, paramsObj: primaryRequest
      }].concat(_.isEqual(entireSeasonRequest, primaryRequest) ? [] :[{ //(don't make a spurious call)
        context: ParamPrefixes.player as ParamPrefixesType, paramsObj: entireSeasonRequest
      }]).concat(lineupRequests.map(req => {
        return { context: ParamPrefixes.lineup as ParamPrefixesType, paramsObj: req };
      }))
    ];
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(jsonResps: any[], wasError: Boolean) {
    const jsonStatuses = jsonResps.map(j => j.status);
    const teamJson = jsonResps?.[0]?.responses?.[0] || {}; //(from primary request)
    const rosterCompareJson = jsonResps?.[1]?.responses?.[0] || {}; //(from roster request)
    const rosterStatsJson = jsonResps?.[2]?.responses?.[0] || {}; //(from player request #1)

    // 3, [4, 5] can be lineups ... or they might be 4, [5, 6]
    // depends on whether jsonResps?.[3]?.responses?.[0] has "aggregations.tri_filter"

    //(optionally, from player request #2)
    const hasGlobalRosterStats = jsonResps?.[3]?.responses?.[0]?.aggregations?.tri_filter;
    const globalRosterStatsJson =
      (hasGlobalRosterStats ? jsonResps?.[3]?.responses?.[0] : undefined) || _.cloneDeep(rosterStatsJson);
      //(need to clone it so that changes to baseline don't overwrite global)

    /** For RAPM, from lineup requests */
    const lineupResponses = _.drop(jsonResps, hasGlobalRosterStats ? 4 : 3).map(lineupJson => {
      return {
        lineups: lineupJson?.responses?.[0]?.aggregations?.lineups?.buckets,
        error_code: wasError ? (lineupJson?.status || jsonStatuses?.[0] || "Unknown") : undefined
      };
    });

    onStats({
      on: teamJson?.aggregations?.tri_filter?.buckets?.on || {},
      off: teamJson?.aggregations?.tri_filter?.buckets?.off || {},
      onOffMode: autoOffQuery,
      baseline: teamJson?.aggregations?.tri_filter?.buckets?.baseline || {},
      global: teamJson?.aggregations?.global?.only?.buckets?.team || {},
      error_code: wasError ? (teamJson?.status || jsonStatuses?.[0] || "Unknown") : undefined
    }, {
      on: rosterCompareJson?.aggregations?.tri_filter?.buckets?.on || {},
      off: rosterCompareJson?.aggregations?.tri_filter?.buckets?.off || {},
      onOffMode: autoOffQuery,
      baseline: rosterCompareJson?.aggregations?.tri_filter?.buckets?.baseline || {},
      error_code: wasError ? (rosterCompareJson?.status || jsonStatuses?.[1] || "Unknown") : undefined
    }, {
      on: rosterStatsJson?.aggregations?.tri_filter?.buckets?.on?.player?.buckets || [],
      off: rosterStatsJson?.aggregations?.tri_filter?.buckets?.off?.player?.buckets || [],
      onOffMode: autoOffQuery,
      baseline: rosterStatsJson?.aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      global: globalRosterStatsJson?.aggregations?.tri_filter?.buckets?.baseline?.player?.buckets || [],
      error_code: wasError ?
        (rosterStatsJson?.status || jsonStatuses?.[2] ||
          globalRosterStatsJson?.status || jsonStatuses?.[3] || "Unknown") : undefined
    }, lineupResponses);
  }

  /** Sets the automatically generated off query, if that option is selected */
  const setAutoOffQuery = (onQuery: string) => {
    setOffQuery((onQuery == "") || (onQuery == " ") ? "" : `NOT (${onQuery})`);
  }

  /** Ran into issues with SSR and 'readOnly' property, so have to fix like this */
  function renderOffQueryFormField() {
    if (typeof window !== `undefined`) {
      return <Form.Control
        placeholder="eg 'NOT (Player1 AND (Player2 OR Player3))'"
        onKeyUp={(ev: any) => setOffQuery(ev.target.value)}
        onChange={(ev: any) => setOffQuery(ev.target.value)}
        value={offQuery}
        readOnly={autoOffQuery}
      />
    }
  }

  /** Works around a bug in the input where it was ignoring the first select/delete of a page load */
  const handleOnQueryChange = (ev: any) => {
    setOnQuery(ev.target.value);
    if (autoOffQuery) {
      setAutoOffQuery(ev.target.value);
    }
  };

  const maybeOn = autoOffQuery ? "On ('A')" : "'A'";
  const maybeOff = autoOffQuery ? "Off ('B')" : "'B'";

  // Visual components:

  return <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix = {cacheKeyPrefix}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      forceReload1Up={internalForceReload1Up}
    ><GlobalKeypressManager.Consumer>{ globalKeypressHandler => <div>
      <Form.Group as={Row}>
        <Form.Label column sm="2">{maybeOn} Query</Form.Label>
        <Col sm="8">
          <AutoSuggestText
            readOnly={false}
            placeholder="eg 'Player1 AND (Player2 OR Player3)'"
            initValue={onQuery}
            year={commonParams.year}
            gender={commonParams.gender}
            team={commonParams.team}
            onKeyUp={handleOnQueryChange}
            onChange={handleOnQueryChange}
            onKeyDown={globalKeypressHandler}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column sm="2">{maybeOff} Query</Form.Label>
        <Col sm="8">
          { (typeof window !== `undefined`) ?
            <AutoSuggestText
              readOnly={autoOffQuery}
              placeholder="eg 'NOT (Player1 AND (Player2 OR Player3))'"
              initValue={offQuery}
              year={commonParams.year}
              gender={commonParams.gender}
              team={commonParams.team}
              onKeyUp={(ev: any) => setOffQuery(ev.target.value)}
              onChange={(ev: any) => setOffQuery(ev.target.value)}
              onKeyDown={globalKeypressHandler}
            /> : <div/> //(this construct needed to address SSR/readonly issue)
          }
        </Col>
        <Col sm="2">
          <Form.Check type="switch"
            id="autoOffQuery"
            checked={autoOffQuery}
            onChange={() => {
              if (!autoOffQuery) {
                setAutoOffQuery(onQuery);
              }
              toggleAutoOffQuery(!autoOffQuery);
            }}
            label="Auto"
          />
        </Col>
      </Form.Group>
    </div>}</GlobalKeypressManager.Consumer></CommonFilter>
    ;
}

export default GameFilter;
