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
import { efficiencyAverages } from '../utils/public-data/efficiencyAverages';
import { TeamReportStatsModel } from '../components/TeamReportStatsTable';
import CommonFilter, { CommonFilterParams } from '../components/CommonFilter';
import { ParamPrefixes, TeamReportFilterParams } from "../utils/FilterModels";

// Library imports:
import fetch from 'isomorphic-unfetch';

type Props = {
  onStats: (reportStats: TeamReportStatsModel) => void;
  startingState: TeamReportFilterParams;
  onChangeState: (newParams: TeamReportFilterParams) => void;
}

const TeamReportFilter: React.FunctionComponent<Props> = ({onStats, startingState, onChangeState}) => {

  // Data model

  /** The state managed by the CommonFilter element */
  const [ commonParams, setCommonParams ] = useState({
      year: startingState.year, team: startingState.team, gender: startingState.gender,
      minRank: startingState.minRank, maxRank: startingState.maxRank,
  } as CommonFilterParams);

  // Lineup Filter - custom queries and filters:

  const [ baseQuery, setBaseQuery ] = useState(startingState.baseQuery || "");
  const [ players, setPlayers ] = useState(startingState.players || []);

  const isDebug = (process.env.NODE_ENV !== 'production');

  const cacheKeyPrefix = ParamPrefixes.report;

  // Utils

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    setCommonParams(params)
  }

  /** Builds a game filter from the various state elements */
  function buildParamsFromState(inHandleResponse: Boolean): TeamReportFilterParams {
    return inHandleResponse ?
    _.merge(
      buildParamsFromState(false), {
        sortBy: startingState.sortBy
    }) : {
      team: commonParams.team,
      year: commonParams.year,
      gender: commonParams.gender,
      baseQuery: baseQuery,
      players: players,
      minRank: commonParams.minRank,
      maxRank: commonParams.maxRank
    };
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(json: any, wasError: Boolean) {
    const jsons = json?.responses || [];
    const onOffJson = (jsons.length > 0) ? jsons[0] : {};
    onStats({
      players: _.chain(onOffJson?.aggregations?.lineups?.buckets).toPairs().map((p) => {
        return { key: p[0], ...p[1] };
      }).value(),
      error_code: wasError ? (onOffJson?.status || json?.status) : undefined,
      avgOff: efficiencyAverages[`${commonParams.gender}_${commonParams.year}`]
    });
  }

  /** Builds the query issued to the API server - the response handling is generic */
  function onSubmit(paramStr: string, callback: (resp: fetch.IsomorphicResponse) => void) {
    fetch(`/api/calculateTeamReportStats?${paramStr}`).then(callback);
  }

  // Visual components:

  /** Let the user know that he might need to change */

  return <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix = {cacheKeyPrefix}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      childSubmitRequest={onSubmit}
    >
      <Form.Group as={Row}>
        <Form.Label column sm="2">Baseline Query</Form.Label>
        <Col sm="8">
          <Form.Control
            placeholder="eg 'Player1 AND NOT (WalkOn1 OR WalkOn2)'"
            value={baseQuery}
            onKeyUp={(ev: any) => setBaseQuery(ev.target.value)}
            onChange={(ev: any) => setBaseQuery(ev.target.value)}
            disabled
          />
        </Col>
        <Col sm="2">
          <Form.Check type="switch"
            id="excludeWalkons"
            checked={false}
            disabled
            label="Auto Walk-ons"
          />
        </Col>
      </Form.Group>
    </CommonFilter>
    ;
}

export default TeamReportFilter;
