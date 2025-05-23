// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import InputGroup from "react-bootstrap/InputGroup";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { faMinusCircle } from "@fortawesome/free-solid-svg-icons";

// Component imports:
import { TeamStatsModel } from "../components/TeamStatsTable";
import { RosterCompareModel } from "../components/RosterCompareTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { LineupStatsModel } from "../components/LineupStatsTable";
import CommonFilter, {
  GlobalKeypressManager,
} from "../components/CommonFilter";
import {
  ParamPrefixes,
  CommonFilterParams,
  GameFilterParams,
  FilterRequestInfo,
  ParamPrefixesType,
  ParamDefaults,
  LineupFilterParams,
} from "../utils/FilterModels";
import LineupQueryAutoSuggestText from "./shared/LineupQueryAutoSuggestText";

// Utils
import {
  ShotStatsModel,
  StatModels,
  PlayerId,
  PlayerShotStatsModel,
} from "../utils/StatModels";
import {
  QueryUtils,
  CommonFilterCustomDate,
  FilteredGameSelection,
  CommonFilterType,
} from "../utils/QueryUtils";
import { QueryDisplayUtils } from "../utils/QueryDisplayUtils";
import QueryFilterDropdown from "./shared/QueryFilterDropdown";
import DateRangeModal from "./shared/DateRangeModal";
import { UrlRouting } from "../utils/UrlRouting";
import {
  Badge,
  Button,
  ButtonGroup,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import GameSelectorModal from "./shared/GameSelectorModal";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";

type Props = {
  onStats: (
    teamStats: TeamStatsModel,
    rosterCompareStats: RosterCompareModel,
    rosterStats: RosterStatsModel,
    shotStats: ShotStatsModel,
    lineupStats: LineupStatsModel[],
    playerShotStats: PlayerShotStatsModel
  ) => void;
  startingState: GameFilterParams;
  onChangeState: (newParams: GameFilterParams) => void;
  forceReload1Up: number;
};

const GameFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
  forceReload1Up,
}) => {
  // Data model

  const {
    // Team stats
    teamDiffs: startTeamDiffs,
    showTeamPlayTypes: startShowTeamPlayTypes,
    showRoster: startShowRoster,
    showGameInfo: startShowGameInfo,
    showGrades: startShowGrades,
    showExtraInfo: startShowExtraInfo,
    teamShotCharts: startTeamShotCharts,
    //(common visualization fields across all tables)
    //(manual overrides)
    manual: startManual,
    showPlayerManual: startShowPlayerManual,
    showOnBallConfig: startShowOnBallConfig,
    //(luck)
    luck: startLuck,
    //(these fields are for the team view)
    onOffLuck: startOnOffLuck,
    showOnOffLuckDiags: startShowOnOffLuckDiags,
    showPlayerOnOffLuckDiags: startShowPlayerOnOffLuckDiags,
    calcRapm: startCalcRapm,
    rapmPriorMode: startRapmPriorMode,
    rapmRegressMode: startRapmRegressMode,
    //(these fields are for the individual view)
    filter: startFilter,
    sortBy: startSortBy,
    showBase: startShowBase,
    showExpanded: startShowExpanded,
    showDiag: startShowDiag,
    possAsPct: startPossAsPct,
    showPosDiag: startShowPosDiag,
    showPlayerPlayTypes: startShowPlayerPlayTypes,
    showInfoSubHeader: startShowInfoSubHeader,
    playerShotCharts: startPlayerShotCharts,
    //these fields affect the query
    autoOffQuery: startAutoOffQuery,
    onQuery: startOnQuery,
    offQuery: startOffQuery,
    onQueryFilters: startOnQueryFilters,
    offQueryFilters: startOffQueryFilters,
    otherQueries: startOtherQueries,
    ...startingCommonFilterParams
  } = startingState;

  /** The state managed by the CommonFilter element */
  const [commonParams, setCommonParams] = useState(
    startingCommonFilterParams as CommonFilterParams
  );

  /** Ugly pattern that is part of support for force reloading */
  const [internalForceReload1Up, setInternalForceReload1Up] =
    useState(forceReload1Up);

  /** Duplicate from CommonFilter */
  const [gameSelection, setGameSelection] = useState<FilteredGameSelection>({
    games: [],
  });

  useEffect(() => {
    // Whenever forceReload1Up is incremented, reset common params:
    if (forceReload1Up != internalForceReload1Up) {
      setCommonParams(startingCommonFilterParams as CommonFilterParams);
      setInternalForceReload1Up(forceReload1Up);
      // Actually have to reset these two vs just their underlying value
      // (could build that intermediate pair,. but we'll stick with this limitation for now)
      setOnQuery(startOnQuery || "");
      setOffQuery(startOffQuery || "");
      setOnQueryFilters(
        QueryUtils.parseFilter(
          _.isNil(startOnQueryFilters)
            ? ParamDefaults.defaultQueryFilters
            : startOnQueryFilters,
          startingState.year || ParamDefaults.defaultYear
        )
      );
      setOffQueryFilters(
        QueryUtils.parseFilter(
          _.isNil(startOffQueryFilters)
            ? ParamDefaults.defaultQueryFilters
            : startOffQueryFilters,
          startingState.year || ParamDefaults.defaultYear
        )
      );
      //(leave toggleAutoOffQuery since it seems harmless, and weird stuff happened when I tried to set it
      // which I don't have time to investigate):
      //toggleAutoOffQuery(startAutoOffQuery);

      // Other queries:
      if (!_.isEmpty(startOtherQueries)) {
        setOtherQueries((startOtherQueries || []).map((q) => q.query));
        setOtherQueryFilters(
          (startOtherQueries || []).map((q) =>
            QueryUtils.parseFilter(
              _.isNil(q.queryFilters)
                ? ParamDefaults.defaultQueryFilters
                : q.queryFilters,
              startingState.year || ParamDefaults.defaultYear
            )
          )
        );
      }
    }
  }, [forceReload1Up]);

  // Game Filter - custom queries and filters:

  const [onQuery, setOnQuery] = useState(startOnQuery || "");
  const [offQuery, setOffQuery] = useState(startOffQuery || "");
  const [otherQueries, setOtherQueries] = useState<(string | undefined)[]>(
    (startOtherQueries || []).map((q) => q.query)
  );
  const [onQueryFilters, setOnQueryFilters] = useState(
    QueryUtils.parseFilter(
      _.isNil(startOnQueryFilters)
        ? ParamDefaults.defaultQueryFilters
        : startOnQueryFilters,
      startingState.year || ParamDefaults.defaultYear
    )
  );
  const [offQueryFilters, setOffQueryFilters] = useState(
    QueryUtils.parseFilter(
      _.isNil(startOffQueryFilters)
        ? ParamDefaults.defaultQueryFilters
        : startOffQueryFilters,
      startingState.year || ParamDefaults.defaultYear
    )
  );
  const [otherQueryFilters, setOtherQueryFilters] = useState<
    (CommonFilterType[] | undefined)[]
  >(
    (startOtherQueries || []).map((q) =>
      QueryUtils.parseFilter(
        _.isNil(q.queryFilters)
          ? ParamDefaults.defaultQueryFilters
          : q.queryFilters,
        startingState.year || ParamDefaults.defaultYear
      )
    )
  );
  const [autoOffQuery, toggleAutoOffQuery] = useState(
    otherQueries.length == 0
      ? _.isNil(startAutoOffQuery)
        ? ParamDefaults.defaultAutoOffQuery
        : startAutoOffQuery
      : false
  );
  const removeOtherQuery = () => {
    const clearingOtherQueries = otherQueries.length == 1;
    setOtherQueries((curr) => [..._.dropRight(curr)]);
    setOtherQueryFilters((curr) => [..._.dropRight(curr)]);
    if (clearingOtherQueries && !offQuery && _.isEmpty(offQueryFilters)) {
      setAutoOffQuery(onQuery);
      toggleAutoOffQuery(true);
    }
  };
  const removeAllOtherQueries = () => {
    setOtherQueries([]);
    setOtherQueryFilters([]);
    if (!offQuery && _.isEmpty(offQueryFilters)) {
      setAutoOffQuery(onQuery);
      toggleAutoOffQuery(true);
    }
  };
  const addOtherQuery = () => {
    if (_.isEmpty(otherQueries) && autoOffQuery) {
      //(remove auto off query terms and turn off)
      toggleAutoOffQuery(false);
      setOffQuery("");
      setOffQueryFilters([]);
    }
    setOtherQueries((curr) => [...curr, ""]);
    setOtherQueryFilters((curr) => [...curr, []]);
  };

  const [showOnDateRangeModal, setOnShowDateRangeModal] = useState(false);
  const [showOffDateRangeModal, setOffShowDateRangeModal] = useState(false);
  const [showOnGameSelectorModal, setOnShowGameSelectorModal] = useState(false);
  const [showOffGameSelectorModal, setOffShowGameSelectorModal] =
    useState(false);
  const [showOtherDateRangeModals, setShowOtherDateRangeModals] = useState<
    boolean[]
  >((startOtherQueries || []).map((q) => false));
  const [showOtherGameSelectorModals, setShowOtherGameSelectorModals] =
    useState<boolean[]>((startOtherQueries || []).map((q) => false));

  /** Used to differentiate between the different implementations of the CommonFilter */
  const cacheKeyPrefix = ParamPrefixes.game;

  // Utils

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    setCommonParams(params);
  }

  /** Builds lineup queries for on/off queries */
  function buildLineupQueriesFromOnOffQueries(): {
    on?: CommonFilterParams;
    off?: CommonFilterParams;
    others?: (CommonFilterParams | undefined)[];
  } {
    //TODO: should tidy this up so can just make get lineups back from on/off query
    //      but for now we'll just hack a workaround
    const [baseQuery, maybeAdvBaseQuery] = QueryUtils.extractAdvancedQuery(
      commonParams.baseQuery || ""
    );

    const getLineupQuery = (
      onOrOffQuery: string,
      ignoreBase: boolean = false
    ) => {
      const [onOrOff, maybeAdvOnOrOff] =
        QueryUtils.extractAdvancedQuery(onOrOffQuery);
      const baseToUse = ignoreBase ? "*" : maybeAdvBaseQuery || baseQuery || "";
      const onOffToUse = maybeAdvOnOrOff || onOrOff || "";
      return baseToUse != ""
        ? `(${onOffToUse}) AND (${baseToUse})`
        : onOffToUse;
    };

    return {
      on: QueryUtils.nonEmptyQuery(onQuery, onQueryFilters)
        ? {
            baseQuery: getLineupQuery(onQuery || "*"),
            queryFilters: QueryUtils.buildFilterStr(
              onQueryFilters.concat(
                QueryUtils.parseFilter(
                  commonParams.queryFilters ||
                    ParamDefaults.defaultQueryFilters,
                  commonParams.year || ParamDefaults.defaultYear
                )
              )
            ),
          }
        : undefined,

      off: _.thru(
        QueryUtils.autoOffAndFilters(autoOffQuery, onQueryFilters),
        (autoOff) => {
          const nonEmptyOff = QueryUtils.nonEmptyQuery(
            offQuery,
            offQueryFilters
          );

          if (!autoOff && nonEmptyOff) {
            return {
              baseQuery: getLineupQuery(offQuery || "*"), //(this is actually "B" not "off" if we're here and offQuery == "")
              queryFilters: QueryUtils.buildFilterStr(
                offQueryFilters.concat(
                  QueryUtils.parseFilter(
                    commonParams.queryFilters ||
                      ParamDefaults.defaultQueryFilters,
                    commonParams.year || ParamDefaults.defaultYear
                  )
                )
              ),
            };
          } else if (autoOff) {
            return {
              baseQuery: commonParams.baseQuery,
              queryFilters: commonParams.queryFilters,
              invertBase: getLineupQuery(onQuery || "*", true),
              invertBaseQueryFilters: QueryUtils.buildFilterStr(onQueryFilters),
              //(ie will be * once inverted, ie ignore this clause if missing)
            };
          } else {
            return undefined;
          }
        }
      ),

      others: _.isEmpty(otherQueries)
        ? undefined
        : _.zip(otherQueries, otherQueryFilters).map(
            ([otherQuery, otherQueryFilter], index) =>
              QueryUtils.nonEmptyQuery(otherQuery, otherQueryFilter || [])
                ? {
                    baseQuery: getLineupQuery(otherQuery || "*"),
                    queryFilters: QueryUtils.buildFilterStr(
                      (otherQueryFilter || []).concat(
                        QueryUtils.parseFilter(
                          commonParams.queryFilters ||
                            ParamDefaults.defaultQueryFilters,
                          commonParams.year || ParamDefaults.defaultYear
                        )
                      )
                    ),
                  }
                : undefined
          ),
    };
  }

  /** Builds a game filter from the various state elements, and also any secondary filters
   * NOTE: ugly hack I need to fix, needs to sync with CommonFilter.onSeeExample
   */
  function buildParamsFromState(
    includeFilterParams: Boolean
  ): [GameFilterParams, FilterRequestInfo[]] {
    // Only include these if they aren't defaults:
    const onQueryFiltersObj = !_.isEmpty(onQueryFilters)
      ? { onQueryFilters: QueryUtils.buildFilterStr(onQueryFilters) }
      : {};
    const offQueryFiltersObj =
      autoOffQuery || _.isEmpty(offQueryFilters)
        ? {}
        : { offQueryFilters: QueryUtils.buildFilterStr(offQueryFilters) };

    const primaryRequest: GameFilterParams = includeFilterParams
      ? _.assign(buildParamsFromState(false)[0], {
          // Team stats
          autoOffQuery: autoOffQuery,
          teamDiffs: startTeamDiffs,
          showTeamPlayTypes: startShowTeamPlayTypes,
          showRoster: startShowRoster,
          showGameInfo: startShowGameInfo,
          showGrades: startShowGrades,
          showExtraInfo: startShowExtraInfo,
          teamShotCharts: startTeamShotCharts,
          // Common luck stats across all tables:
          //(manual overrides)
          manual: startManual,
          showPlayerManual: startShowPlayerManual,
          showOnBallConfig: startShowOnBallConfig,
          //(luck)
          luck: startLuck,
          onOffLuck: startOnOffLuck,
          showOnOffLuckDiags: startShowOnOffLuckDiags,
          showPlayerOnOffLuckDiags: startShowPlayerOnOffLuckDiags,
          // Individual stats:
          calcRapm: startCalcRapm,
          rapmPriorMode: startRapmPriorMode,
          rapmRegressMode: startRapmRegressMode,
          filter: startFilter,
          sortBy: startSortBy,
          showBase: startShowBase,
          showExpanded: startShowExpanded,
          showDiag: startShowDiag,
          possAsPct: startPossAsPct,
          showPosDiag: startShowPosDiag,
          showPlayerPlayTypes: startShowPlayerPlayTypes,
          showInfoSubHeader: startShowInfoSubHeader,
          playerShotCharts: startPlayerShotCharts,
        })
      : {
          ...commonParams,
          autoOffQuery: autoOffQuery,
          onQuery: onQuery,
          ...onQueryFiltersObj,
          offQuery: offQuery,
          ...offQueryFiltersObj, //(not possible to specify if auto-off)
          otherQueries: _.thru(
            _.zip(otherQueries, otherQueryFilters).map((qZipQ) => ({
              query: qZipQ[0],
              queryFilters: QueryUtils.buildFilterStr(qZipQ[1] || []),
            })),
            (
              maybeOtherQueries //(if it's empty remove it)
            ) => (_.isEmpty(maybeOtherQueries) ? undefined : maybeOtherQueries)
          ),
        };
    //(another ugly hack to be fixed - remove default optional fields)
    QueryUtils.cleanseQuery(primaryRequest);

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
    //TODO: also if the main query minus/on-off matches can't we just re-use that?!
    // (ie and just ignore the on-off portion)

    const alsoPullLineups =
      startCalcRapm || startShowRoster || startShowGameInfo;

    // Lineups (eg for RAPM) calculations:
    //TODO: should tidy this up so can just make get lineups back from on/off query
    //      but for now we'll just hack a workaround
    const lineupRequests: (LineupFilterParams | undefined)[] = alsoPullLineups
      ? _.thru(alsoPullLineups, (__) => {
          const lineupQueriesAndFilters = buildLineupQueriesFromOnOffQueries();
          return (
            [
              QueryUtils.cleanseQuery({
                ...commonParams,
              }),
            ] as (LineupFilterParams | undefined)[]
          )
            .concat(
              _.isEmpty(lineupQueriesAndFilters.on)
                ? [undefined]
                : [
                    QueryUtils.cleanseQuery({
                      ...commonParams,
                      ...lineupQueriesAndFilters.on,
                    }),
                  ]
            )
            .concat(
              _.isEmpty(lineupQueriesAndFilters.off)
                ? [undefined]
                : [
                    QueryUtils.cleanseQuery({
                      ...commonParams,
                      ...lineupQueriesAndFilters.off,
                    }),
                  ]
            )
            .map((l) => {
              return l
                ? {
                    ...l,
                    showGameInfo: startShowGameInfo,
                  }
                : undefined;
            })
            .concat(
              (lineupQueriesAndFilters.others || []).map((l) => {
                return l
                  ? {
                      ...QueryUtils.cleanseQuery({
                        ...commonParams,
                        ...l,
                      }),
                      showGameInfo: startShowGameInfo,
                    }
                  : undefined;
              })
            );
        })
      : [];

    const makeGlobalRequest = !_.isEqual(entireSeasonRequest, primaryRequest);

    // New format, so duplicate primaryRequest and everything has a tag
    return [
      primaryRequest,
      [
        {
          tag: "team",
          context: ParamPrefixes.game as ParamPrefixesType,
          paramsObj: primaryRequest,
        },
        {
          tag: "roster",
          context: ParamPrefixes.roster as ParamPrefixesType,
          paramsObj: primaryRequest,
        },
        {
          tag: "players",
          context: ParamPrefixes.player as ParamPrefixesType,
          paramsObj: primaryRequest,
          includeRoster: !makeGlobalRequest,
        },
      ]
        .concat(
          startTeamShotCharts
            ? [
                {
                  tag: "shots",
                  context: ParamPrefixes.shots as ParamPrefixesType,
                  paramsObj: primaryRequest, //(makes exactly the on/off request we make for the teams stats)
                },
              ]
            : []
        )
        .concat(
          startPlayerShotCharts
            ? [
                {
                  tag: "playerShots",
                  context: ParamPrefixes.playerShots as ParamPrefixesType,
                  paramsObj: primaryRequest, //(makes exactly the on/off request we make for the teams stats)
                },
              ]
            : []
        )
        .concat(
          makeGlobalRequest
            ? [
                {
                  //(don't make a spurious call)
                  tag: "globalPlayers",
                  context: ParamPrefixes.player as ParamPrefixesType,
                  paramsObj: entireSeasonRequest,
                  includeRoster: true,
                },
              ]
            : []
        )
        .concat(
          lineupRequests.flatMap((req, reqIndex) => {
            return req //(the index ensures we now about jumps in other queries)
              ? [
                  {
                    tag: `lineups${reqIndex}`,
                    context: ParamPrefixes.lineup as ParamPrefixesType,
                    paramsObj: req,
                  },
                ]
              : [];
          })
        ),
    ];
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(jsonResps: Record<string, any>, wasError: Boolean) {
    const jsonStatuses = _.mapValues(jsonResps, (j) => j.status);

    const teamJson = jsonResps?.["team"]?.responses?.[0] || {};

    const rosterCompareJson = jsonResps?.["roster"]?.responses?.[0] || {};
    const rosterStatsJson = jsonResps?.["players"]?.responses?.[0] || {};

    const shotChartStatsJson = jsonResps?.["shots"]?.responses?.[0] || {};
    const playerShotChartStatsJson =
      jsonResps?.["playerShots"]?.responses?.[0] || {};

    const globalRosterStatsJson =
      jsonResps?.["globalPlayers"]?.responses?.[0] ||
      _.cloneDeep(rosterStatsJson);

    const globalTeam =
      teamJson?.aggregations?.global?.only?.buckets?.team ||
      StatModels.emptyTeam();
    const rosterInfo =
      jsonResps?.["globalPlayers"]?.roster || jsonResps?.["players"]?.roster;
    if (rosterInfo) {
      globalTeam.roster = rosterInfo;
    }

    // Can get additional rows of data
    // For now, just take the first 20 others, TODO make arbitrary
    const MAX_OTHERS = 20;
    var varNumOthers = -1;
    const otherTeamStats = _.range(0, MAX_OTHERS).map((i) => {
      const q = teamJson?.aggregations?.tri_filter?.buckets?.[`other_${i}`];
      if (q) varNumOthers = i;
      return q || StatModels.emptyTeam();
    });
    const numOthers = 1 + varNumOthers; //the actual number

    /** For RAPM, from lineup requests (at most 3 + N) */
    const lineupResponses = _.range(0, 3 + numOthers).map((i) => {
      const lineupKey = `lineups${i}`;
      const lineupJson = jsonResps?.[lineupKey]?.responses?.[0];
      return lineupJson
        ? {
            lineups: lineupJson?.aggregations?.lineups?.buckets,
            error_code: wasError
              ? lineupJson?.status || jsonStatuses?.[lineupKey] || "Unknown"
              : undefined,
          }
        : StatModels.emptyLineup();
    }) as LineupStatsModel[];

    const playerShotChartBuilder = (buckets: any[]) => {
      return _.chain(buckets)
        .map((playerShotChartInfo: any) => [
          playerShotChartInfo.key || "???",
          playerShotChartInfo || { doc_count: 0, shot_chart: { buckets: [] } },
        ])
        .fromPairs()
        .value();
    };

    onStats(
      {
        on:
          teamJson?.aggregations?.tri_filter?.buckets?.on ||
          StatModels.emptyTeam(),
        off:
          teamJson?.aggregations?.tri_filter?.buckets?.off ||
          StatModels.emptyTeam(),
        other: _.take(otherTeamStats, numOthers),
        onOffMode: autoOffQuery,
        baseline:
          teamJson?.aggregations?.tri_filter?.buckets?.baseline ||
          StatModels.emptyTeam(),
        global: globalTeam,
        error_code: wasError
          ? teamJson?.status || jsonStatuses?.[0] || "Unknown"
          : undefined,
      },
      {
        //(we don't support "other" additional queries for roster compare)
        //TODO: in fact we should remove it from the UI when "other" queries are specified
        on: rosterCompareJson?.aggregations?.tri_filter?.buckets?.on || {},
        off: rosterCompareJson?.aggregations?.tri_filter?.buckets?.off || {},
        onOffMode: autoOffQuery,
        baseline:
          rosterCompareJson?.aggregations?.tri_filter?.buckets?.baseline || {},
        error_code: wasError
          ? rosterCompareJson?.status || jsonStatuses?.[1] || "Unknown"
          : undefined,
      },
      {
        on:
          rosterStatsJson?.aggregations?.tri_filter?.buckets?.on?.player
            ?.buckets || [],
        off:
          rosterStatsJson?.aggregations?.tri_filter?.buckets?.off?.player
            ?.buckets || [],
        other: _.range(0, numOthers).map((i) => {
          return (
            rosterStatsJson?.aggregations?.tri_filter?.buckets?.[`other_${i}`]
              ?.player?.buckets || []
          );
        }),
        onOffMode: autoOffQuery,
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
      },
      {
        on: {
          off: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.on
            ?.off_def?.buckets?.off,
          def: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.on
            ?.off_def?.buckets?.def,
        },
        off: {
          off: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.off
            ?.off_def?.buckets?.off,
          def: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.off
            ?.off_def?.buckets?.def,
        },
        other: _.range(0, numOthers).map((i) => {
          return {
            off: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.[
              `other_${i}`
            ]?.off_def?.buckets?.off || { doc_count: 0 },
            def: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.[
              `other_${i}`
            ]?.off_def?.buckets?.def || { doc_count: 0 },
          };
        }),
        baseline: {
          off: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.baseline
            ?.off_def?.buckets?.off,
          def: shotChartStatsJson?.aggregations?.tri_filter?.buckets?.baseline
            ?.off_def?.buckets?.def,
        },
      },
      lineupResponses,
      {
        on: playerShotChartBuilder(
          playerShotChartStatsJson.aggregations?.tri_filter?.buckets?.on?.player
            ?.buckets || []
        ),
        off: playerShotChartBuilder(
          playerShotChartStatsJson.aggregations?.tri_filter?.buckets?.off
            ?.player?.buckets || []
        ),
        baseline: playerShotChartBuilder(
          playerShotChartStatsJson.aggregations?.tri_filter?.buckets?.baseline
            ?.player?.buckets || []
        ),
        other: _.range(0, numOthers).map((i) => {
          return playerShotChartBuilder(
            playerShotChartStatsJson.aggregations?.tri_filter?.buckets?.[
              `other_${i}`
            ]?.player?.buckets || []
          );
        }),
      }
    );
  }

  /** Sets the automatically generated off query, if that option is selected */
  const setAutoOffQuery = (onQuery: string) => {
    setOffQuery(onQuery == "" || onQuery == " " ? "" : `NOT (${onQuery})`);
  };

  /** Ran into issues with SSR and 'readOnly' property, so have to fix like this */
  function renderOffQueryFormField() {
    if (typeof window !== `undefined`) {
      return (
        <Form.Control
          placeholder="eg 'NOT (Player1 AND (Player2 OR Player3))'"
          onKeyUp={(ev: any) => setOffQuery(ev.target.value)}
          onChange={(ev: any) => setOffQuery(ev.target.value)}
          value={offQuery}
          readOnly={autoOffQuery}
        />
      );
    }
  }

  /** Works around a bug in the input where it was ignoring the first select/delete of a page load */
  const handleOnQueryChange = (ev: any) => {
    setOnQuery(ev.target.value);
    if (autoOffQuery) {
      setAutoOffQuery(ev.target.value);
    }
  };

  const maybeOn = autoOffQuery && _.isEmpty(otherQueries) ? "On ('A')" : "'A'";
  const maybeOff =
    autoOffQuery && _.isEmpty(otherQueries) ? "Off ('B')" : "'B'";

  // Link building:

  const buildLineups = (
    params: GameFilterParams,
    overrides: CommonFilterParams
  ) => {
    return {
      gender: params.gender,
      year: params.year,
      team: params.team,
      minRank: params.minRank,
      maxRank: params.maxRank,
      filterGarbage: params.filterGarbage,
      // Query filters and base query:
      ...overrides,
      // Game info
      showGameInfo: params.showGameInfo,
      // Luck:
      luck: params.luck,
      lineupLuck: params.onOffLuck,
      showLineupLuckDiags: params.onOffLuck,
    };
  };

  // Visual components:

  const queryPlusTooltip = (
    <Tooltip id="queryPlusTooltip">Add another query row</Tooltip>
  );
  const queryMinusTooltip = (
    <Tooltip id="queryMinusTooltip">
      Remove the last query row (cannot be undone)
    </Tooltip>
  );

  return (
    <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix={cacheKeyPrefix}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      buildLinks={(params) => {
        const lineupOnOffQueries = buildLineupQueriesFromOnOffQueries();
        //(don't this is built from state instead of params)
        return [
          <a
            target="_blank"
            href={UrlRouting.getMatchupUrl({
              gender: params.gender,
              year: params.year,
              team: params.team,
            })}
          >
            Game Reports
          </a>,
          "Lineups: ",
          <a
            target="_blank"
            href={UrlRouting.getLineupUrl(
              buildLineups(params, {
                baseQuery: params.baseQuery,
                queryFilters: params.queryFilters,
              }),
              {}
            )}
          >
            Base
          </a>,
        ]
          .concat(
            lineupOnOffQueries.on
              ? [
                  <a
                    target="_blank"
                    href={UrlRouting.getLineupUrl(
                      buildLineups(params, lineupOnOffQueries.on),
                      {}
                    )}
                  >
                    'A'
                  </a>,
                ]
              : []
          )
          .concat(
            lineupOnOffQueries.off
              ? [
                  <a
                    target="_blank"
                    href={UrlRouting.getLineupUrl(
                      buildLineups(params, lineupOnOffQueries.off),
                      {}
                    )}
                  >
                    'B'
                  </a>,
                ]
              : []
          )
          .concat(
            _.flatMap(lineupOnOffQueries.others || [], (l, idx) => {
              return l
                ? [
                    <a
                      target="_blank"
                      href={UrlRouting.getLineupUrl(
                        buildLineups(params, l),
                        {}
                      )}
                    >
                      '{String.fromCharCode(67 + idx)}'
                    </a>,
                  ]
                : [];
            })
          );
      }}
      forceReload1Up={internalForceReload1Up}
      onGameSelectionChange={(newGameSelection) => {
        // Reset any game-based filters:
        if (
          gameSelection.filter &&
          newGameSelection.filter &&
          (gameSelection.filter.team != newGameSelection.filter.team ||
            gameSelection.filter.year != newGameSelection.filter.year ||
            gameSelection.filter.gender != newGameSelection.filter.gender)
        ) {
          setOnQueryFilters(
            QueryUtils.setCustomGameSelection(onQueryFilters, undefined)
          );
          setOffQueryFilters(
            QueryUtils.setCustomGameSelection(offQueryFilters, undefined)
          );
          setOtherQueryFilters((curr) => {
            const newOtherQueryFilters = [...curr];
            curr.forEach(
              (q, queryIndex) =>
                (newOtherQueryFilters[queryIndex] =
                  QueryUtils.setCustomGameSelection(q || [], undefined))
            );
            return newOtherQueryFilters;
          });
        }
        setGameSelection(newGameSelection);
      }}
    >
      <GlobalKeypressManager.Consumer>
        {(globalKeypressHandler) => (
          <div>
            <DateRangeModal
              show={showOnDateRangeModal}
              queryType={
                !_.isEmpty(otherQueries) ? "'A' Query" : "On/'A' Query"
              }
              onSave={(filter: CommonFilterCustomDate | undefined) =>
                setOnQueryFilters(
                  QueryUtils.setCustomDate(onQueryFilters, filter)
                )
              }
              onHide={() => setOnShowDateRangeModal(false)}
              year={startingState.year || ParamDefaults.defaultYear}
            />
            <DateRangeModal
              show={showOffDateRangeModal}
              queryType={
                !_.isEmpty(otherQueries) ? "'B' Query" : "Off/'B' Query"
              }
              onSave={(filter: CommonFilterCustomDate | undefined) =>
                setOffQueryFilters(
                  QueryUtils.setCustomDate(offQueryFilters, filter)
                )
              }
              onHide={() => setOffShowDateRangeModal(false)}
              year={startingState.year || ParamDefaults.defaultYear}
            />
            <GameSelectorModal
              queryType={
                !_.isEmpty(otherQueries) ? "'A' Query" : "On/'A' Query"
              }
              games={gameSelection.games}
              selectedGames={QueryUtils.buildGameSelectionModel(onQueryFilters)}
              show={showOnGameSelectorModal}
              onClose={() => setOnShowGameSelectorModal(false)}
              onSubmit={(selectedGame) => {
                setOnQueryFilters(
                  QueryUtils.setCustomGameSelection(
                    onQueryFilters,
                    gameSelection.games.length > 0
                      ? QueryUtils.buildGameSelectionFilter(selectedGame)
                      : undefined
                  )
                );
                setOnShowGameSelectorModal(false);
              }}
            />
            <GameSelectorModal
              queryType={
                !_.isEmpty(otherQueries) ? "'B' Query" : "Off/'B' Query"
              }
              games={gameSelection.games}
              selectedGames={QueryUtils.buildGameSelectionModel(
                offQueryFilters
              )}
              show={showOffGameSelectorModal}
              onClose={() => setOffShowGameSelectorModal(false)}
              onSubmit={(selectedGame) => {
                setOffQueryFilters(
                  QueryUtils.setCustomGameSelection(
                    offQueryFilters,
                    gameSelection.games.length > 0
                      ? QueryUtils.buildGameSelectionFilter(selectedGame)
                      : undefined
                  )
                );
                setOffShowGameSelectorModal(false);
              }}
            />
            {_.range(0, otherQueries.length).map((extraQueryIndex) => (
              <DateRangeModal
                show={showOtherDateRangeModals[extraQueryIndex]}
                queryType={`'${String.fromCharCode(
                  67 + extraQueryIndex
                )}' Query`}
                onSave={(filter: CommonFilterCustomDate | undefined) => {
                  setOtherQueryFilters((curr) => {
                    const newOtherDateRangeModals = [...curr];
                    newOtherDateRangeModals[extraQueryIndex] =
                      QueryUtils.setCustomDate(
                        newOtherDateRangeModals[extraQueryIndex] || [],
                        filter
                      );
                    return newOtherDateRangeModals;
                  });
                }}
                onHide={() =>
                  setShowOtherDateRangeModals((curr) => {
                    const newShowOtherDateRangeModals = [...curr];
                    newShowOtherDateRangeModals[extraQueryIndex] = false;
                    return newShowOtherDateRangeModals;
                  })
                }
                year={startingState.year || ParamDefaults.defaultYear}
              />
            ))}
            {_.range(0, otherQueries.length).map((extraQueryIndex) => (
              <GameSelectorModal
                queryType={`'${String.fromCharCode(
                  67 + extraQueryIndex
                )}' Query`}
                games={gameSelection.games}
                selectedGames={QueryUtils.buildGameSelectionModel(
                  otherQueryFilters[extraQueryIndex] || []
                )}
                show={showOtherGameSelectorModals[extraQueryIndex]}
                onClose={() =>
                  setShowOtherGameSelectorModals((curr) => {
                    const newShowOtherGameSelectorModals = [...curr];
                    newShowOtherGameSelectorModals[extraQueryIndex] = false;
                    return newShowOtherGameSelectorModals;
                  })
                }
                onSubmit={(selectedGame) => {
                  setOtherQueryFilters((curr) => {
                    const newOtherQueryFilters = [...curr];
                    newOtherQueryFilters[extraQueryIndex] =
                      QueryUtils.setCustomGameSelection(
                        newOtherQueryFilters[extraQueryIndex] || [],
                        gameSelection.games.length > 0
                          ? QueryUtils.buildGameSelectionFilter(selectedGame)
                          : undefined
                      );
                    return newOtherQueryFilters;
                  });
                  setShowOtherGameSelectorModals((curr) => {
                    const newShowOtherGameSelectorModals = [...curr];
                    newShowOtherGameSelectorModals[extraQueryIndex] = false;
                    return newShowOtherGameSelectorModals;
                  });
                }}
              />
            ))}

            <Form.Group as={Row}>
              <Form.Label column sm="2">
                {maybeOn} Query
              </Form.Label>
              <Col sm="8">
                <Container>
                  <Row>
                    <InputGroup>
                      <LineupQueryAutoSuggestText
                        readOnly={false}
                        placeholder="eg 'Player1 AND (Player2 OR Player3)'"
                        initValue={onQuery}
                        year={commonParams.year}
                        gender={commonParams.gender}
                        team={commonParams.team}
                        games={gameSelection.games}
                        onKeyUp={handleOnQueryChange}
                        onChange={handleOnQueryChange}
                        onKeyDown={globalKeypressHandler}
                      />
                      <InputGroup.Append>
                        <QueryFilterDropdown
                          queryFilters={onQueryFilters}
                          setQueryFilters={setOnQueryFilters}
                          showCustomRangeFilter={() =>
                            setOnShowDateRangeModal(true)
                          }
                          showGameSelectorModal={() => {
                            setOnShowGameSelectorModal(true);
                          }}
                        />
                      </InputGroup.Append>
                    </InputGroup>
                  </Row>
                  {onQueryFilters.length > 0 ? (
                    <Row>
                      &nbsp;
                      {onQueryFilters.map((p, i) => (
                        <span key={`conf${i}`}>
                          {i > 0 ? null : (
                            <span>
                              <Badge variant="primary">AND</Badge>{" "}
                            </span>
                          )}
                          {QueryDisplayUtils.showQueryFilter(
                            p,
                            commonParams.gender || "",
                            commonParams.year || ""
                          )}
                          &nbsp;
                        </span>
                      ))}
                    </Row>
                  ) : null}
                </Container>
              </Col>
              <Col sm="2" className="mt-1">
                <GenericTogglingMenu size="sm">
                  <GenericTogglingMenuItem
                    text="Extra Query Mode"
                    truthVal={otherQueries.length > 0}
                    onSelect={() =>
                      _.isEmpty(otherQueries)
                        ? addOtherQuery()
                        : removeAllOtherQueries()
                    }
                  />
                </GenericTogglingMenu>
              </Col>
            </Form.Group>
            <Form.Group as={Row}>
              <Form.Label column sm="2">
                {maybeOff} Query
              </Form.Label>
              <Col sm="8">
                {
                  typeof window !== `undefined` ? (
                    <Container>
                      <Row>
                        <InputGroup>
                          <LineupQueryAutoSuggestText
                            readOnly={autoOffQuery}
                            placeholder="eg 'NOT (Player1 AND (Player2 OR Player3))'"
                            initValue={offQuery}
                            year={commonParams.year}
                            gender={commonParams.gender}
                            team={commonParams.team}
                            games={gameSelection.games}
                            onKeyUp={(ev: any) => setOffQuery(ev.target.value)}
                            onChange={(ev: any) => setOffQuery(ev.target.value)}
                            onKeyDown={globalKeypressHandler}
                          />
                          {autoOffQuery ? null : (
                            <InputGroup.Append>
                              <QueryFilterDropdown
                                queryFilters={offQueryFilters}
                                setQueryFilters={setOffQueryFilters}
                                showCustomRangeFilter={() =>
                                  setOffShowDateRangeModal(true)
                                }
                                showGameSelectorModal={() => {
                                  setOffShowGameSelectorModal(true);
                                }}
                              />
                            </InputGroup.Append>
                          )}
                        </InputGroup>
                      </Row>
                      {offQueryFilters.length > 0 && !autoOffQuery ? (
                        <Row>
                          &nbsp;
                          {offQueryFilters.map((p, i) => (
                            <span key={`conf${i}`}>
                              {i > 0 ? null : (
                                <span>
                                  <Badge variant="primary">AND</Badge>{" "}
                                </span>
                              )}
                              {QueryDisplayUtils.showQueryFilter(
                                p,
                                commonParams.gender || "",
                                commonParams.year || ""
                              )}
                              &nbsp;
                            </span>
                          ))}
                        </Row>
                      ) : null}
                      {onQueryFilters.length > 0 && autoOffQuery ? (
                        <Row>
                          &nbsp;
                          {onQueryFilters.map((p, i) => (
                            <span key={`conf${i}`}>
                              {i > 0 ? (
                                <span>/ </span>
                              ) : (
                                <span>
                                  <Badge pill variant="primary">
                                    OR
                                  </Badge>{" "}
                                </span>
                              )}
                              {QueryDisplayUtils.showQueryFilter(
                                p,
                                commonParams.gender || "",
                                commonParams.year || "",
                                true
                              )}
                              &nbsp;
                            </span>
                          ))}
                        </Row>
                      ) : null}
                    </Container>
                  ) : null //(this construct needed to address SSR/readonly issue)
                }
              </Col>
              <Col sm="2" className="mt-1">
                <Form.Check
                  type="switch"
                  disabled={otherQueries.length > 0}
                  id="autoOffQuery"
                  checked={autoOffQuery}
                  onChange={() => {
                    if (otherQueries.length == 0) {
                      //(for some reason the disabled/readOnly attributes do nothing so just disable)
                      setOffQueryFilters([]);
                      if (!autoOffQuery) {
                        setAutoOffQuery(onQuery);
                      } //(TODO: note clearing offQuery in the else doesn't work due to limitations of AutoSuggestText)
                      toggleAutoOffQuery(!autoOffQuery);
                    }
                  }}
                  label="Auto"
                />
              </Col>
            </Form.Group>
            {_.range(0, otherQueries.length).map((extraQueryIndex) => (
              <Form.Group as={Row}>
                <Form.Label column sm="2">
                  '{String.fromCharCode(67 + extraQueryIndex)}' Query
                </Form.Label>
                <Col sm="8">
                  {
                    typeof window !== `undefined` ? (
                      <Container>
                        <Row>
                          <InputGroup>
                            <LineupQueryAutoSuggestText
                              readOnly={false}
                              placeholder="eg 'NOT (Player1 AND (Player2 OR Player3))'"
                              initValue={otherQueries[extraQueryIndex] || ""}
                              year={commonParams.year}
                              gender={commonParams.gender}
                              team={commonParams.team}
                              games={gameSelection.games}
                              onKeyUp={(ev: any) =>
                                setOtherQueries((curr) => {
                                  curr[extraQueryIndex] = ev.target.value;
                                  return [...curr];
                                })
                              }
                              onChange={(ev: any) =>
                                setOtherQueries((curr) => {
                                  curr[extraQueryIndex] = ev.target.value;
                                  return [...curr];
                                })
                              }
                              onKeyDown={globalKeypressHandler}
                            />
                            {
                              <InputGroup.Append>
                                <QueryFilterDropdown
                                  queryFilters={
                                    otherQueryFilters?.[extraQueryIndex] || []
                                  }
                                  setQueryFilters={(newQueryFilters) => {
                                    setOtherQueryFilters((curr) => {
                                      curr[extraQueryIndex] = newQueryFilters;
                                      return [...curr];
                                    });
                                  }}
                                  showCustomRangeFilter={() =>
                                    setShowOtherDateRangeModals((curr) => {
                                      const newShowOtherDateRangeModals = [
                                        ...curr,
                                      ];
                                      newShowOtherDateRangeModals[
                                        extraQueryIndex
                                      ] = true;
                                      return newShowOtherDateRangeModals;
                                    })
                                  }
                                  showGameSelectorModal={() => {
                                    setShowOtherGameSelectorModals((curr) => {
                                      const newShowOtherGameSelectorModals = [
                                        ...curr,
                                      ];
                                      newShowOtherGameSelectorModals[
                                        extraQueryIndex
                                      ] = true;
                                      return newShowOtherGameSelectorModals;
                                    });
                                  }}
                                />
                              </InputGroup.Append>
                            }
                          </InputGroup>
                        </Row>
                        {otherQueryFilters?.[extraQueryIndex]?.length ? (
                          <Row>
                            &nbsp;
                            {(otherQueryFilters?.[extraQueryIndex] || []).map(
                              (p, i) => (
                                <span key={`conf${i}`}>
                                  {i > 0 ? null : (
                                    <span>
                                      <Badge variant="primary">AND</Badge>{" "}
                                    </span>
                                  )}
                                  {QueryDisplayUtils.showQueryFilter(
                                    p,
                                    commonParams.gender || "",
                                    commonParams.year || ""
                                  )}
                                  &nbsp;
                                </span>
                              )
                            )}
                          </Row>
                        ) : null}
                      </Container>
                    ) : null //(this construct needed to address SSR/readonly issue)
                  }
                </Col>
                {extraQueryIndex + 1 == otherQueries.length ? (
                  <Col sm="2" className="mt-1">
                    <ButtonGroup size="sm">
                      <Button
                        variant="outline-secondary"
                        onClick={() => addOtherQuery()}
                      >
                        <OverlayTrigger
                          placement="auto"
                          overlay={queryPlusTooltip}
                        >
                          <FontAwesomeIcon icon={faPlusCircle} />
                        </OverlayTrigger>
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => removeOtherQuery()}
                      >
                        <OverlayTrigger
                          placement="auto"
                          overlay={queryMinusTooltip}
                        >
                          <FontAwesomeIcon icon={faMinusCircle} />
                        </OverlayTrigger>
                      </Button>
                    </ButtonGroup>
                  </Col>
                ) : undefined}
              </Form.Group>
            ))}
          </div>
        )}
      </GlobalKeypressManager.Consumer>
    </CommonFilter>
  );
};

export default GameFilter;
