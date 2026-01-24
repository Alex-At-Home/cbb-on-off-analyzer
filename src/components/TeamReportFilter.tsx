// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Component imports:
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import { LineupStatsModel } from "../components/LineupStatsTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { TeamStatsModel } from "../components/TeamStatsTable";
import CommonFilter from "../components/CommonFilter";
import {
  ParamDefaults,
  ParamPrefixes,
  ParamPrefixesType,
  CommonFilterParams,
  FilterRequestInfo,
  TeamReportFilterParams,
} from "../utils/FilterModels";

// Utils
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
} from "../utils/StatModels";
import { QueryUtils } from "../utils/QueryUtils";

type Props = {
  onStats: (
    lineupStats: LineupStatsModel,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel
  ) => void;
  startingState: TeamReportFilterParams;
  onChangeState: (newParams: TeamReportFilterParams) => void;
};

const TeamReportFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
}) => {
  // Data model

  const {
    // Luck stats:
    luck: startLuck,
    teamLuck: startTeamLuck,
    //  display/processing
    sortBy: startSortBy,
    filter: startFilter,
    showOnOff: startShowOnOff,
    showComps: startShowComps,
    incRepOnOff: startIncRepOnOff,
    incRapm: startIncRapm,
    regressDiffs: startingRegressDiffs,
    repOnOffDiagMode: startingRepOnOffDiagMode,
    rapmDiagMode: startingRapmDiagMode,
    rapmPriorMode: startingRapmPriorMode,
    rapmRegressMode: startingRapmRegressMode,
    // Table configuration:
    tablePreset: startTablePreset,
    tableConfigExtraCols: startTableConfigExtraCols,
    tableConfigDisabledCols: startTableConfigDisabledCols,
    ...startingCommonFilterParams
  } = startingState;

  /** The state managed by the CommonFilter element */
  const [commonParams, setCommonParams] = useState(
    startingCommonFilterParams as CommonFilterParams
  );

  // Lineup Filter - custom queries and filters:

  const isDebug = process.env.NODE_ENV !== "production";

  const cacheKeyPrefix = ParamPrefixes.report;

  // Utils

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    setCommonParams(params);
  }

  /** Builds a team report filter from the various state elements, and also any secondary filters
   * NOTE: ugly hack I need to fix, needs to sync with CommonFilter.onSeeExample
   */
  function buildParamsFromState(
    includeFilterParams: Boolean
  ): [TeamReportFilterParams, FilterRequestInfo[]] {
    const primaryRequest: TeamReportFilterParams = includeFilterParams
      ? _.assign(buildParamsFromState(false)[0], {
          // Luck stats:
          luck: startLuck,
          teamLuck: startTeamLuck,
          //  display/processing
          sortBy: startSortBy,
          filter: startFilter,
          showOnOff: startShowOnOff,
          showComps: startShowComps,
          incRepOnOff: startIncRepOnOff,
          incRapm: startIncRapm,
          regressDiffs: startingRegressDiffs,
          repOnOffDiagMode: startingRepOnOffDiagMode,
          rapmDiagMode: startingRapmDiagMode,
          rapmPriorMode: startingRapmPriorMode,
          rapmRegressMode: startingRapmRegressMode,
          // Table configuration:
          tablePreset: startTablePreset,
          tableConfigExtraCols: startTableConfigExtraCols,
          tableConfigDisabledCols: startTableConfigDisabledCols,
        })
      : {
          ...commonParams,
        };

    const secondaryRequest = {
      ...primaryRequest,
      onQuery: "",
      offQuery: "",
    };

    const entireSeasonRequest = {
      // Get the entire season of players for things like luck adjustments
      team: primaryRequest.team,
      year: primaryRequest.year,
      gender: primaryRequest.gender,
      minRank: ParamDefaults.defaultMinRank,
      maxRank: ParamDefaults.defaultMaxRank,
      baseQuery: "",
      onQuery: "",
      offQuery: "",
    };

    const makeGlobalRequest = !_.isEqual(entireSeasonRequest, secondaryRequest);

    return [
      primaryRequest,
      [
        {
          context: ParamPrefixes.game as ParamPrefixesType,
          paramsObj: secondaryRequest,
        },
        {
          context: ParamPrefixes.player as ParamPrefixesType,
          paramsObj: secondaryRequest,
          includeRoster: !makeGlobalRequest,
        },
      ].concat(
        makeGlobalRequest
          ? [
              {
                //(don't make a spurious call)
                context: ParamPrefixes.player as ParamPrefixesType,
                paramsObj: entireSeasonRequest,
                includeRoster: true,
              },
            ]
          : []
      ),
    ];
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(jsonResps: any[], wasError: Boolean) {
    const jsonStatuses = jsonResps.map((j) => j.status);
    const lineupJson = jsonResps?.[0]?.responses?.[0] || {};
    const teamJson = jsonResps?.[1]?.responses?.[0] || {};

    const rosterStatsJson = jsonResps?.[2]?.responses?.[0] || {};
    const globalRosterStatsJson =
      jsonResps?.[3]?.responses?.[0] || rosterStatsJson;
    const hasGlobalRosterStats =
      jsonResps?.[3]?.responses?.[0]?.aggregations?.tri_filter;

    const globalTeam =
      teamJson?.aggregations?.global?.only?.buckets?.team ||
      StatModels.emptyTeam();
    const rosterInfo = jsonResps?.[hasGlobalRosterStats ? 3 : 2]?.roster;
    if (rosterInfo) {
      globalTeam.roster = rosterInfo;
    }

    onStats(
      {
        lineups: lineupJson?.aggregations?.lineups?.buckets,
        error_code: wasError
          ? lineupJson?.status || jsonStatuses?.[0] || "Unknown"
          : undefined,
      },
      {
        on: StatModels.emptyTeam(),
        off: StatModels.emptyTeam(),
        onOffMode: true,
        baseline:
          teamJson?.aggregations?.tri_filter?.buckets?.baseline ||
          StatModels.emptyTeam(),
        global: globalTeam,
        error_code: wasError
          ? teamJson?.status || jsonStatuses?.[1] || "Unknown"
          : undefined,
      },
      {
        on: [],
        off: [],
        other: [],
        baseline:
          rosterStatsJson?.aggregations?.tri_filter?.buckets?.baseline?.player
            ?.buckets || [],
        global:
          globalRosterStatsJson?.aggregations?.tri_filter?.buckets?.baseline
            ?.player?.buckets || [],
        error_code: wasError
          ? rosterStatsJson?.status ||
            jsonStatuses?.[2] ||
            globalRosterStatsJson?.status ||
            jsonStatuses?.[3] ||
            "Unknown"
          : undefined,
      }
    );
  }

  // Visual components:

  /** Let the user know that he might need to change */

  return (
    <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix={cacheKeyPrefix}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
    />
  );
};

export default TeamReportFilter;
