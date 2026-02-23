// React imports:
import React, { useState } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Library imports:
//@ts-ignore
import Select from "react-select";

// Component imports:
import { LineupStatsModel } from "../components/LineupStatsTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { TeamStatsModel } from "../components/TeamStatsTable";
import CommonFilter, {
  GlobalKeypressManager,
} from "../components/CommonFilter";
import {
  ParamPrefixesType,
  ParamPrefixes,
  LineupFilterParams,
  FilterRequestInfo,
  MatchupFilterParams,
  GameFilterParams,
  ParamDefaults,
} from "../utils/FilterModels";

// Utils
import {
  StatModels,
  LineupStintInfo,
  IndivStatSet,
  TeamStatSet,
  ShotStats,
  TimeBinnedAggregation,
} from "../utils/StatModels";
import { QueryUtils } from "../utils/QueryUtils";
import { UrlRouting } from "../utils/UrlRouting";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { DateUtils } from "../utils/DateUtils";
import { FilterParamsType, CommonFilterParams } from "../utils/FilterModels";
import { PlayTypeUtils } from "../utils/stats/PlayTypeUtils";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import ThemedSelect from "./shared/ThemedSelect";

type Props = {
  onStats: (
    lineupStatsA: LineupStatsModel,
    teamStatsA: TeamStatsModel,
    rosterStatsA: RosterStatsModel,
    lineupStatsB: LineupStatsModel,
    teamStatsB: TeamStatsModel,
    rosterStatsB: RosterStatsModel,
    lineupStintsA: LineupStintInfo[],
    lineupStintsB: LineupStintInfo[],
    shotChartInfoA: {
      off: ShotStats;
      def: ShotStats;
    },
    shotChartInfoB: {
      off: ShotStats;
      def: ShotStats;
    },
    defensiveInfoA?: Record<
      string,
      { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
    >,
    defensiveInfoB?: Record<
      string,
      { teamStats: TeamStatSet; playerStats: Array<IndivStatSet> }
    >,
    lineupStintsAggA?: TimeBinnedAggregation,
    lineupStintsAggB?: TimeBinnedAggregation,
  ) => void;
  startingState: MatchupFilterParams;
  onChangeState: (newParams: MatchupFilterParams) => void;
  includeDefense?: boolean;
};

const MatchupPreviewFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
  includeDefense,
}) => {
  //console.log("Loading LineupFilter " + JSON.stringify(startingState));

  // Data model

  const {
    oppoTeam: startOppoTeam,
    onOffLuck: startOnOffLuck,
    luck: startLuck,
    ...startingCommonFilterParams
  } = startingState;

  /** The state managed by the CommonFilter element */
  const [commonParams, setCommonParams] = useState(
    startingCommonFilterParams as CommonFilterParams,
  );

  // Lineup Filter - custom queries and filters:

  const isDebug = process.env.NODE_ENV !== "production";

  const [game, setGame] = useState(startingState.oppoTeam || "");

  // Utils

  /** Pre-calculate this */
  const teamList = AvailableTeams.getTeams(
    null,
    commonParams.year || ParamDefaults.defaultYear,
    commonParams.gender || ParamDefaults.defaultGender,
  ).filter((t) => t.team != commonParams.team);

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    //(unlike MatchupFilter, don't need to reset the opponent, they won't typically change
    // year to year and it's a real pain when you have to re-select the dropdown)
    setCommonParams(params);
  }

  /** Builds a lineup filter from the various state elements, and also any secondary filters
   * NOTE: ugly hack I need to fix, needs to sync with CommonFilter.onSeeExample
   */
  function buildParamsFromState(
    includeFilterParams: Boolean,
  ): [LineupFilterParams, FilterRequestInfo[]] {
    const shotChartEnabled =
      !commonParams.year ||
      commonParams.year >= DateUtils.firstYearWithShotChartData;

    //(only query supported is conf)

    const primaryRequestA: MatchupFilterParams = {
      ...commonParams,
      baseQuery: "",
      queryFilters:
        commonParams.queryFilters == "Conf"
          ? commonParams.queryFilters
          : undefined,

      // Hacky: because of how this logic works, the primary request needs to have all the
      // filter and query params:
      oppoTeam: game,
      ...(includeFilterParams
        ? {
            luck: startLuck,
            onOffLuck: startOnOffLuck,
          }
        : {}),
    };
    const primaryRequestB: CommonFilterParams = {
      ...commonParams,
      team: game,
      baseQuery: "",
      queryFilters:
        commonParams.queryFilters == "Conf"
          ? commonParams.queryFilters
          : undefined,
    };
    //(another ugly hack to be fixed - remove default optional fields)
    QueryUtils.cleanseQuery(primaryRequestA);
    QueryUtils.cleanseQuery(primaryRequestB);

    const secondaryRequestA = {
      ...primaryRequestA,
      onQuery: "",
      offQuery: "",
      getGames: true,
    };
    const secondaryRequestB = {
      ...primaryRequestB,
      onQuery: "",
      offQuery: "",
      getGames: true,
    };

    const noExtraFullSeasonRequests = true;

    const primaryRequests: FilterRequestInfo[] =
      //(new format with tags - primaryRequest is included)
      (
        [
          {
            tag: "lineupsA",
            context: ParamPrefixes.lineup as ParamPrefixesType,
            paramsObj: primaryRequestA as FilterParamsType,
          },
          {
            tag: "teamA",
            context: ParamPrefixes.game as ParamPrefixesType,
            paramsObj: secondaryRequestA,
          },
          {
            tag: "playersA",
            context: ParamPrefixes.player as ParamPrefixesType,
            paramsObj: secondaryRequestA,
            includeRoster: noExtraFullSeasonRequests,
          },
        ] as FilterRequestInfo[]
      ).concat(
        shotChartEnabled
          ? [
              {
                tag: "shotsA",
                context: ParamPrefixes.shots as ParamPrefixesType,
                paramsObj: primaryRequestA,
              },
            ]
          : [],
      );
    const secondaryRequests: FilterRequestInfo[] = [
      {
        tag: "lineupsB",
        context: ParamPrefixes.lineup as ParamPrefixesType,
        paramsObj: primaryRequestB as FilterParamsType,
      },
      {
        tag: "teamB",
        context: ParamPrefixes.game as ParamPrefixesType,
        paramsObj: secondaryRequestB,
      },
      {
        tag: "playersB",
        context: ParamPrefixes.player as ParamPrefixesType,
        paramsObj: secondaryRequestB,
        includeRoster: noExtraFullSeasonRequests,
      },
    ].concat(
      shotChartEnabled
        ? [
            {
              tag: "shotsB",
              context: ParamPrefixes.shots as ParamPrefixesType,
              paramsObj: primaryRequestB,
            },
          ]
        : [],
    );
    const defensiveRequests: FilterRequestInfo[] = includeDefense
      ? _.take(
          [
            {
              tag: "defenseA",
              context: ParamPrefixes.defensiveInfo as ParamPrefixesType,
              paramsObj: primaryRequestA as FilterParamsType,
            },
            {
              tag: "defenseB",
              context: ParamPrefixes.defensiveInfo as ParamPrefixesType,
              paramsObj: primaryRequestB as FilterParamsType,
            },
          ],
          game != AvailableTeams.noOpponent ? 2 : 1,
        ) //(only get team defense if there is "no opponent")
      : [];

    const lineupStintsAggRequests: FilterRequestInfo[] = (
      [
        {
          tag: "lineupStintsAggA",
          context: ParamPrefixes.lineupStintsAgg as ParamPrefixesType,
          paramsObj: secondaryRequestA,
        },
      ] as FilterRequestInfo[]
    ).concat(
      game != AvailableTeams.noOpponent
        ? [
            {
              tag: "lineupStintsAggB",
              context: ParamPrefixes.lineupStintsAgg as ParamPrefixesType,
              paramsObj: secondaryRequestB,
            },
          ]
        : [],
    );

    return [
      primaryRequestA,
      primaryRequests
        .concat(
          game != AvailableTeams.noOpponent
            ? secondaryRequests
            : ([] as FilterRequestInfo[]),
        )
        .concat(defensiveRequests)
        .concat(lineupStintsAggRequests),
    ];
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(jsonResps: Record<string, any>, wasError: Boolean) {
    const shotChartEnabled =
      !commonParams.year ||
      commonParams.year >= DateUtils.firstYearWithShotChartData;
    const jsonStatuses = _.mapValues(jsonResps, (j) => j.status);

    const fromLineups = (lineupJson: any) => ({
      lineups: lineupJson?.aggregations?.lineups?.buckets,
      error_code: wasError
        ? lineupJson?.status || jsonStatuses?.["lineupsA"] || "Unknown"
        : undefined,
    });
    const fromTeam = (teamJson: any, globalTeam: any) => ({
      on: StatModels.emptyTeam(),
      off: StatModels.emptyTeam(),
      onOffMode: true,
      baseline:
        teamJson?.aggregations?.tri_filter?.buckets?.baseline ||
        StatModels.emptyTeam(),
      global: globalTeam,
      error_code: wasError
        ? teamJson?.status || jsonStatuses?.["teamA"] || "Unknown"
        : undefined,
    });
    const fromRoster = (rosterStatsJson: any, globalRosterStatsJson: any) => ({
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
          jsonStatuses?.["playersA"] ||
          globalRosterStatsJson?.status ||
          "Unknown"
        : undefined,
    });

    const lineupJsonA = jsonResps?.["lineupsA"]?.responses?.[0] || {};
    const teamJsonA = jsonResps?.["teamA"]?.responses?.[0] || {};
    const rosterStatsJsonA = jsonResps?.["playersA"]?.responses?.[0] || {};
    const globalRosterStatsJsonA =
      jsonResps?.["playersA"]?.responses?.[0] || rosterStatsJsonA;
    const globalTeamA =
      teamJsonA?.aggregations?.global?.only?.buckets?.team ||
      StatModels.emptyTeam();
    const rosterInfoA = jsonResps?.["playersA"]?.roster;
    globalTeamA.roster = rosterInfoA;

    const shotChartInfoA = shotChartEnabled
      ? {
          off: jsonResps?.["shotsA"]?.responses?.[0]?.aggregations?.tri_filter
            ?.buckets?.baseline?.off_def?.buckets?.off,
          def: jsonResps?.["shotsA"]?.responses?.[0]?.aggregations?.tri_filter
            ?.buckets?.baseline?.off_def?.buckets?.def,
        }
      : { off: {}, def: {} };

    const [defensiveStatsA, defensiveStatsB] = _.thru(includeDefense, (__) => {
      if (includeDefense) {
        return [
          PlayTypeUtils.parseTeamDefenseResponse(
            jsonResps?.["defenseA"]?.responses || [],
          ),
          PlayTypeUtils.parseTeamDefenseResponse(
            jsonResps?.["defenseB"]?.responses || [],
          ),
        ];
      } else {
        return [undefined, undefined];
      }
    });

    // Parse lineup stints aggregations (feature flagged)
    const lineupStintsAggA: TimeBinnedAggregation =
      jsonResps?.["lineupStintsAggA"]?.responses?.[0]?.aggregations || {};
    const lineupStintsAggB: TimeBinnedAggregation =
      jsonResps?.["lineupStintsAggB"]?.responses?.[0]?.aggregations || {};

    if (!jsonResps?.["teamB"]) {
      //special "no opponent case", short circuit the rest
      onStats(
        fromLineups(lineupJsonA),
        fromTeam(teamJsonA, globalTeamA),
        fromRoster(rosterStatsJsonA, globalRosterStatsJsonA),
        fromLineups({}),
        fromTeam({}, {}),
        fromRoster({}, {}),
        [],
        [],
        shotChartInfoA,
        { off: {}, def: {} },
        defensiveStatsA,
        defensiveStatsB,
        lineupStintsAggA,
        lineupStintsAggB,
      );
    } else {
      const lineupJsonB = jsonResps?.["lineupsB"]?.responses?.[0] || {};
      const teamJsonB = jsonResps?.["teamB"]?.responses?.[0] || {};
      const rosterStatsJsonB = jsonResps?.["playersB"]?.responses?.[0] || {};
      const globalRosterStatsJsonB =
        jsonResps?.["playersB"]?.responses?.[0] || rosterStatsJsonB;
      const globalTeamB =
        teamJsonB?.aggregations?.global?.only?.buckets?.team ||
        StatModels.emptyTeam();
      const rosterInfoB = jsonResps?.["playersB"]?.roster;
      globalTeamB.roster = rosterInfoB;

      const shotChartInfoB = shotChartEnabled
        ? {
            off: jsonResps?.["shotsB"]?.responses?.[0]?.aggregations?.tri_filter
              ?.buckets?.baseline?.off_def?.buckets?.off,
            def: jsonResps?.["shotsB"]?.responses?.[0]?.aggregations?.tri_filter
              ?.buckets?.baseline?.off_def?.buckets?.def,
          }
        : { off: {}, def: {} };

      onStats(
        fromLineups(lineupJsonA),
        fromTeam(teamJsonA, globalTeamA),
        fromRoster(rosterStatsJsonA, globalRosterStatsJsonA),
        fromLineups(lineupJsonB),
        fromTeam(teamJsonB, globalTeamB),
        fromRoster(rosterStatsJsonB, globalRosterStatsJsonB),
        [],
        [],
        shotChartInfoA,
        shotChartInfoB,
        defensiveStatsA,
        defensiveStatsB,
        lineupStintsAggA,
        lineupStintsAggB,
      );
    }
  }

  // Visual components:

  /** Let the user know that he might need to change */

  const team: string = "";

  /** For use in selects */
  function stringToOption(s: string) {
    return { label: s, value: s };
  }
  /** For use in team select */
  function getCurrentTeamOrPlaceholder() {
    const currTeam = AvailableTeams.calculateCurrentLabel(
      game,
      commonParams.year || ParamDefaults.defaultYear,
      commonParams.gender || ParamDefaults.defaultGender,
      (aliasUpdate) => {
        setGame(aliasUpdate);
      },
    ) || {
      value: undefined,
      label: "Choose Team...",
    };
    return currTeam;
  }

  function getCurrentGameFilter() {
    const buildStr = (p: CommonFilterParams) => {
      if (
        p.queryFilters == "Conf" &&
        (_.isNil(p.minRank) ||
          p.minRank == ParamDefaults.defaultMinRank ||
          p.minRank == "1") &&
        (_.isNil(p.maxRank) || p.maxRank == ParamDefaults.defaultMaxRank)
      ) {
        return "Conf";
      } else {
        return p.minRank + "-" + p.maxRank;
      }
    };
    const objToCheck = buildStr(commonParams);
    const key = _.findKey(
      gameFilterOptions,
      (v, k) => buildStr(v) == objToCheck,
    );
    return key || "Based On All Games";
  }

  const gameFilterOptions = {
    "Based On All Games": {
      minRank: "0",
      maxRank: "400",
    },
    "Based On Conference Games": {
      queryFilters: "Conf",
      minRank: "0",
      maxRank: "400",
    },
    "Based on T50 Games": {
      minRank: "0",
      maxRank: "50",
    },
    "Based on T100 Games": {
      minRank: "0",
      maxRank: "100",
    },
    "Based on T150 Games": {
      minRank: "0",
      maxRank: "150",
    },
    "Based on T200 Games": {
      minRank: "0",
      maxRank: "200",
    },
    "Based on Weak Opponents": {
      minRank: "200",
      maxRank: "400",
    },
  } as Record<
    string,
    { minRank: string; maxRank: string; queryFilters?: string }
  >;

  // Link building
  const gameParams = (
    params: MatchupFilterParams,
    team: string,
    subFor?: string,
  ): GameFilterParams => ({
    team,
    minRank: params.minRank ?? "0",
    maxRank: params.maxRank ?? "400",
    gender: params.gender,
    year: params.year,
    baseQuery: subFor
      ? (params.baseQuery || "").replace(`"${team}"`, `"${subFor}"`)
      : params.baseQuery,
    queryFilters: params.queryFilters,
    showRoster: true,
    calcRapm: true,
    showExpanded: true,
    teamShotCharts: true,
  });
  const lineupParams = (
    params: MatchupFilterParams,
    team: string,
    subFor?: string,
  ): LineupFilterParams => ({
    team,
    minRank: params.minRank ?? "0",
    maxRank: params.maxRank ?? "400",
    gender: params.gender,
    year: params.year,
    minPoss: "0",
    baseQuery: subFor
      ? (params.baseQuery || "").replace(`"${team}"`, `"${subFor}"`)
      : params.baseQuery,
    queryFilters: params.queryFilters,
  });

  return (
    <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix={ParamPrefixes.gameInfo}
      tablePrefixForPrimaryRequest={ParamPrefixes.lineup}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      matchupMode={"preview"}
      blockSubmit={game == ""}
      buildLinks={(params) => {
        const opponentName = game;
        return params.team && opponentName
          ? [
              <a
                target="_blank"
                href={UrlRouting.getGameUrl(
                  gameParams(params, params.team),
                  {},
                )}
              >
                Team stats
              </a>,
              <a
                target="_blank"
                href={UrlRouting.getLineupUrl(
                  lineupParams(params, params.team),
                  {},
                )}
              >
                Team lineups
              </a>,
            ].concat(
              opponentName != AvailableTeams.noOpponent
                ? [
                    <a
                      target="_blank"
                      href={UrlRouting.getGameUrl(
                        gameParams(params, opponentName, params.team),
                        {},
                      )}
                    >
                      Opponent stats
                    </a>,
                    <a
                      target="_blank"
                      href={UrlRouting.getLineupUrl(
                        lineupParams(params, opponentName, params.team),
                        {},
                      )}
                    >
                      Opponent lineups
                    </a>,
                  ]
                : [],
            )
          : [];
      }}
    >
      <GlobalKeypressManager.Consumer>
        {(globalKeypressHandler) => (
          <div>
            <Form.Group as={Row}>
              <Col xs={0} sm={0} md={0} lg={4}>
                <ThemedSelect
                  isClearable={false}
                  styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                  value={stringToOption(getCurrentGameFilter())}
                  options={_.keys(gameFilterOptions).map((r) =>
                    stringToOption(r),
                  )}
                  onChange={(option: any) => {
                    const chosenFilter = gameFilterOptions[option.value];
                    if (chosenFilter) {
                      setCommonParams({
                        ...commonParams,
                        queryFilters:
                          gameFilterOptions[option.value]?.queryFilters,
                        minRank: gameFilterOptions[option.value]?.minRank,
                        maxRank: gameFilterOptions[option.value]?.maxRank,
                      });
                    }
                  }}
                />
              </Col>
              <Col xs={12} sm={12} md={12} lg={6}>
                <ThemedSelect
                  isClearable={false}
                  styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                  value={getCurrentTeamOrPlaceholder()}
                  options={[stringToOption(AvailableTeams.noOpponent)].concat(
                    AvailableTeams.teamsToLabels(teamList),
                  )}
                  onChange={(option: any) => {
                    setGame((option as any)?.value);
                  }}
                />
              </Col>
            </Form.Group>
          </div>
        )}
      </GlobalKeypressManager.Consumer>
    </CommonFilter>
  );
};

export default MatchupPreviewFilter;
