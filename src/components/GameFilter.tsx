// React imports:
import React, { useState, useEffect, useRef } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";
import fetch from "isomorphic-unfetch";

// Bootstrap imports:

import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import InputGroup from "react-bootstrap/InputGroup";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faPlusCircle,
  faSlidersH,
} from "@fortawesome/free-solid-svg-icons";
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
  IndivStatSet,
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
  Dropdown,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import GameSelectorModal from "./shared/GameSelectorModal";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
//@ts-ignore
import Select, { components } from "react-select";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { FilterPresetUtils } from "../utils/FilterPresetUtils";
import { RequestUtils } from "../utils/RequestUtils";
import ThemedSelect from "./shared/ThemedSelect";

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
  onSwitchToAdvancedMode?: (newParams: GameFilterParams) => void;
  propKey?: number;
  testMode?: boolean;
};

const GameFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
  forceReload1Up,
  onSwitchToAdvancedMode,
  propKey,
  testMode,
}) => {
  /** handy to force rerender when roster changes */
  const [forceRerender, setForceRerender] = useState<number>(0);

  const isServer = () => typeof window === `undefined`;
  if (isServer() && !testMode) return null; //(don't render server-side)

  // Data model

  const {
    // UI
    advancedMode: startAdvancedMode,
    presetMode: startPresetMode,
    presetSplit: startPresetSplit,
    splitPhrases: startSplitPhrases,
    // Team stats
    teamDiffs: startTeamDiffs,
    showTeamPlayTypes: startShowTeamPlayTypes,
    teamPlayTypeConfig: startTeamPlayTypeConfig,
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

  const rebuildFullState = () => {
    return {
      splitPhrases: startSplitPhrases,
      // Team stats
      autoOffQuery: autoOffQuery, //(TODO: I don't think this is needed)
      teamDiffs: startTeamDiffs,
      showTeamPlayTypes: startShowTeamPlayTypes,
      teamPlayTypeConfig: startTeamPlayTypeConfig,
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
      //(note doesn't include the actual game query params)
    };
  };

  /** The state managed by the CommonFilter element */
  const [commonParams, setCommonParams] = useState(
    startingCommonFilterParams as CommonFilterParams
  );

  /** All the game-specific viz options, ie not query/filter */
  const [newParamsOnSubmit, setNewParamsOnSubmit] = useState<GameFilterParams>(
    rebuildFullState()
  );

  /** Ugly pattern that is part of support for force reloading */
  const [internalForceReload1Up, setInternalForceReload1Up] =
    useState(forceReload1Up);

  /** Reference from CommonFilter */
  const gameSelectionRef = useRef<FilteredGameSelection | undefined>();

  /** Reference from CommonFilter */
  const rosterRef = useRef<string[]>();

  /** Whenever starting state updates, we also update the critical params
   *  that trigger data reloads, otherwise it gets too complicated to keep in sync
   *  It's not ideal because these table UI features override the "preset details"
   *  ... but it's necessary because the features trigger a reload which relies
   *      on GameFilter for its state, and the preset / advanced code is too tightly
   *      coupled to make that option workable
   */
  useEffect(() => {
    setNewParamsOnSubmit({
      ...newParamsOnSubmit,
      // The ones that it really needs are calcRapm, showRoster, showGameInfo, teamShotCharts, playerShotCharts
      // We need all the others also, otherwise they get lost when the above are fired
      ...rebuildFullState(),
    });
  }, [startingState]);

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

  // Preset state and basic logic

  //(note the order matters here)

  /** Tries to convert some simple query/on/off scenarios into presets */
  const checkForImplicitPresets = (
    commonParamsIn: CommonFilterParams,
    queryParamsIn: {
      autoOffQuery?: boolean;
      onQuery?: string;
      offQuery?: string;
      onQueryFilters: CommonFilterType[];
      offQueryFilters: CommonFilterType[];
      otherQueries: (string | undefined)[];
      otherQueryFilters: (CommonFilterType[] | undefined)[];
    }
  ): [string | undefined, string | undefined] => {
    // Switching back to simple mode
    // Let's figure out if we can re-use existing modes/splits
    const maybeMode = _.findKey(
      FilterPresetUtils.commonFilterPresets,
      (preset, key) => {
        return _.isEqual(commonParamsIn, {
          ...commonParamsIn,
          ...FilterPresetUtils.basePresetQuery,
          ...(preset.commonParams || {}),
        });
      }
    );
    const autoOffQueryIn = _.isNil(queryParamsIn.autoOffQuery)
      ? true
      : queryParamsIn.autoOffQuery;
    const testSplit = {
      autoOffQuery: autoOffQueryIn,
      onQuery: queryParamsIn.onQuery || "",
      // some minor complications with auto-off
      offQuery:
        _.isEmpty(queryParamsIn.offQuery) &&
        autoOffQuery &&
        !_.isEmpty(queryParamsIn.onQuery)
          ? `NOT ${queryParamsIn.onQuery}`
          : queryParamsIn.offQuery || "",
      onQueryFilters: QueryUtils.buildFilterStr(
        queryParamsIn.onQueryFilters || ""
      ),
      offQueryFilters: QueryUtils.buildFilterStr(
        queryParamsIn.offQueryFilters || ""
      ),
      otherQueries: _.zip(
        queryParamsIn.otherQueries,
        queryParamsIn.otherQueryFilters
      ).map(([oq, oqf]) => {
        const qComp = oq ? { query: oq } : {};
        const qfComp =
          oqf && !_.isEmpty(oqf)
            ? { queryFilters: QueryUtils.buildFilterStr(oqf) }
            : {};
        return _.merge(qComp, qfComp);
      }),
    };

    const testPlayers = new Set(rosterRef.current || []);
    const maybeSplit = _.thru(testPlayers.has(onQuery), (maybePlayerOnOff) => {
      if (maybePlayerOnOff) {
        return _.isEqual(testSplit, {
          autoOffQuery: true,
          ...FilterPresetUtils.basePresetOnOffQuery,
          onQuery: onQuery,
          offQuery: `NOT ${onQuery}`,
        })
          ? `${FilterPresetUtils.gameFilterOnOffPrefix}${onQuery.replaceAll(
              '"',
              ""
            )}`
          : undefined;
      } else {
        return _.findKey(FilterPresetUtils.gameSplitPresets, (preset) => {
          const toTest = {
            ...testSplit,
            ...FilterPresetUtils.basePresetOnOffQuery,
            ...(preset.gameParams || {}),
          };
          //DIAG:
          // console.log(`A ${JSON.stringify(testSplit)}`, testSplit);
          // console.log(`B ${JSON.stringify(toTest)}`, toTest);

          return _.isEqual(testSplit, toTest);
        });
      }
    });

    return [maybeMode, maybeSplit];
  };

  /** Need to call this in a few places in the following startup logic */
  const checkForImplicitPresetsOnStartup = () => {
    return checkForImplicitPresets(commonParams, {
      autoOffQuery,
      onQuery,
      offQuery,
      onQueryFilters,
      offQueryFilters,
      otherQueries,
      otherQueryFilters,
    });
  };

  /** Whether to show pre-sets instead of full set */
  const [advancedView, setAdvancedView] = useState(
    _.isNil(startingState.advancedMode)
      ? _.thru(startingState, (state) => {
          if (!_.isEmpty(state.presetMode)) return false;
          if (!_.isEmpty(state.presetSplit)) return false;

          // Advanced mode unspecified but matbe we can infer it?
          const [maybeMode, maybeSplit] = checkForImplicitPresetsOnStartup();
          if (maybeMode && maybeSplit) return false;

          if (!_.isEmpty(state.onQuery)) return true;
          if (!_.isEmpty(state.onQueryFilters)) return true;
          if (!_.isEmpty(state.offQuery)) return true;
          if (!_.isEmpty(state.offQueryFilters)) return true;
          if (!_.isEmpty(state.baseQuery)) return true;
          if (!_.isEmpty(state.queryFilters)) return true;
          if (!_.isEmpty(state.otherQueries)) return true;
          if (state.minRank && state.minRank != ParamDefaults.defaultMinRank)
            return true;
          if (state.maxRank && state.maxRank != ParamDefaults.defaultMaxRank)
            return true;
          return false;
        })
      : startingState.advancedMode
  );

  /** The preset query to use */
  const [presetMode, setPresetMode] = useState(
    _.thru(!_.isEmpty(startingState.presetMode), (presetsDefined) => {
      if (presetsDefined) {
        return startingState.presetMode || ParamDefaults.defaultPresetMode;
      } else if (advancedView) {
        return "";
      } else {
        const [maybeMode, maybeSplit] = checkForImplicitPresetsOnStartup();
        if (maybeMode && maybeSplit) {
          return maybeMode;
        } else {
          return startingState.presetMode || ParamDefaults.defaultPresetMode;
        }
      }
    })
  );

  /** The preset query to use */
  const [presetSplit, setPresetSplit] = useState(
    _.thru(!_.isEmpty(startingState.presetSplit), (presetsDefined) => {
      if (presetsDefined) {
        return startingState.presetSplit || ParamDefaults.defaultPresetSplit;
      } else if (advancedView) {
        return "";
      } else {
        const [maybeMode, maybeSplit] = checkForImplicitPresetsOnStartup();
        if (maybeMode && maybeSplit) {
          return maybeSplit;
        } else {
          return startingState.presetSplit || ParamDefaults.defaultPresetSplit;
        }
      }
    })
  );

  // Utils

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    setCommonParams(params);
  }

  /** Handy builder for dynamic query filters */
  const buildFilterMaybeForQuery = (
    queries: CommonFilterType[],
    forQuery: Boolean
  ) => {
    return forQuery
      ? QueryUtils.buildFilterStrForQuery(
          queries,
          gameSelectionRef.current?.games || []
        )
      : QueryUtils.buildFilterStr(queries);
  };

  /** Builds lineup queries for on/off queries */
  function buildLineupQueriesFromOnOffQueries(forQuery: Boolean): {
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
      return RequestUtils.replaceRosterShortcut(
        baseToUse != "" ? `(${onOffToUse}) AND (${baseToUse})` : onOffToUse,
        rosterRef.current || [],
        forQuery
      );
    };

    return {
      on: QueryUtils.nonEmptyQuery(onQuery, onQueryFilters)
        ? {
            baseQuery: getLineupQuery(onQuery || "*"),
            queryFilters: buildFilterMaybeForQuery(
              onQueryFilters.concat(
                QueryUtils.parseFilter(
                  commonParams.queryFilters ||
                    ParamDefaults.defaultQueryFilters,
                  commonParams.year || ParamDefaults.defaultYear
                )
              ),
              forQuery
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
              queryFilters: buildFilterMaybeForQuery(
                offQueryFilters.concat(
                  QueryUtils.parseFilter(
                    commonParams.queryFilters ||
                      ParamDefaults.defaultQueryFilters,
                    commonParams.year || ParamDefaults.defaultYear
                  )
                ),
                forQuery
              ),
            };
          } else if (autoOff) {
            return {
              baseQuery: commonParams.baseQuery,
              queryFilters: commonParams.queryFilters,
              invertBase: getLineupQuery(onQuery || "*", true),
              invertBaseQueryFilters: buildFilterMaybeForQuery(
                onQueryFilters,
                forQuery
              ),
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
                    queryFilters: buildFilterMaybeForQuery(
                      (otherQueryFilter || []).concat(
                        QueryUtils.parseFilter(
                          commonParams.queryFilters ||
                            ParamDefaults.defaultQueryFilters,
                          commonParams.year || ParamDefaults.defaultYear
                        )
                      ),
                      forQuery
                    ),
                  }
                : undefined
          ),
    };
  }

  /** Builds a game filter from the various state elements, and also any secondary filters
   * NOTE: ugly hack I need to fix, needs to sync with CommonFilter.onSeeExample
   *
   * Another nasty hack here is that you'll see some params are the state params
   * and others come from calling applyPresetConfig ... in an ideal world, we'd just use
   * the state params except for the startXxx which would come from newParamsOnSubmit
   * but there's some complications based on what gets set when
   */
  function buildParamsFromState(
    includeFilterParams: Boolean,
    forQuery?: Boolean
  ): [GameFilterParams, FilterRequestInfo[]] {
    // Only include these if they aren't defaults:
    const onQueryFiltersObj = !_.isEmpty(onQueryFilters)
      ? {
          onQueryFilters: buildFilterMaybeForQuery(
            onQueryFilters,
            forQuery || false
          ),
        }
      : {};
    const offQueryFiltersObj =
      autoOffQuery || _.isEmpty(offQueryFilters)
        ? {}
        : {
            offQueryFilters: buildFilterMaybeForQuery(
              offQueryFilters,
              forQuery || false
            ),
          };

    // It's painful but re-calc the result of the preset to make sure we are using the right params
    const [maybeNewParams, maybeNewCommonParams] = advancedView
      ? [undefined, undefined]
      : applyPresetConfig(presetMode, presetSplit, false);

    const visualSettingsToUse = advancedView
      ? startingState
      : newParamsOnSubmit;

    const primaryOnOffRequest = advancedView
      ? {
          baseQuery: RequestUtils.replaceRosterShortcut(
            commonParams.baseQuery,
            rosterRef.current || [],
            forQuery || false
          ),
          autoOffQuery: autoOffQuery,
          onQuery: RequestUtils.replaceRosterShortcut(
            onQuery,
            rosterRef.current || [],
            forQuery || false
          ),
          ...onQueryFiltersObj,
          offQuery: RequestUtils.replaceRosterShortcut(
            offQuery,
            rosterRef.current || [],
            forQuery || false
          ),
          ...offQueryFiltersObj, //(not possible to specify if auto-off)
          otherQueries: _.thru(
            _.zip(otherQueries, otherQueryFilters).map((qZipQ) => ({
              query: RequestUtils.replaceRosterShortcut(
                qZipQ[0],
                rosterRef.current || [],
                forQuery || false
              ),
              queryFilters: buildFilterMaybeForQuery(
                qZipQ[1] || [],
                forQuery || false
              ),
            })),
            (
              maybeOtherQueries //(if it's empty remove it)
            ) => (_.isEmpty(maybeOtherQueries) ? undefined : maybeOtherQueries)
          ),
        }
      : {
          baseQuery: RequestUtils.replaceRosterShortcut(
            (maybeNewCommonParams || commonParams).baseQuery,
            rosterRef.current || [],
            forQuery || false
          ),
          autoOffQuery: (maybeNewParams || newParamsOnSubmit).autoOffQuery,
          onQuery: RequestUtils.replaceRosterShortcut(
            (maybeNewParams || newParamsOnSubmit).onQuery,
            rosterRef.current || [],
            forQuery || false
          ),
          offQuery: RequestUtils.replaceRosterShortcut(
            (maybeNewParams || newParamsOnSubmit).offQuery,
            rosterRef.current || [],
            forQuery || false
          ),
          onQueryFilters: buildFilterMaybeForQuery(
            QueryUtils.parseFilter(
              (maybeNewParams || newParamsOnSubmit).onQueryFilters ||
                ParamDefaults.defaultQueryFilters,
              commonParams.year || ParamDefaults.defaultYear
            ) || [],
            forQuery || false
          ),
          offQueryFilters: buildFilterMaybeForQuery(
            QueryUtils.parseFilter(
              (maybeNewParams || newParamsOnSubmit).offQueryFilters ||
                ParamDefaults.defaultQueryFilters,
              commonParams.year || ParamDefaults.defaultYear
            ) || [],
            forQuery || false
          ),
          otherQueries: _.thru(
            ((maybeNewParams || newParamsOnSubmit)?.otherQueries || []).map(
              (oq) => {
                return {
                  query: RequestUtils.replaceRosterShortcut(
                    oq.query,
                    rosterRef.current || [],
                    forQuery || false
                  ),
                  queryFilters: buildFilterMaybeForQuery(
                    QueryUtils.parseFilter(
                      oq.queryFilters || ParamDefaults.defaultQueryFilters,
                      commonParams.year || ParamDefaults.defaultYear
                    ) || [],
                    forQuery || false
                  ),
                };
              }
            ),
            (
              maybeOtherQueries //(if it's empty remove it)
            ) => (_.isEmpty(maybeOtherQueries) ? undefined : maybeOtherQueries)
          ),
        };

    const primaryRequest: GameFilterParams = includeFilterParams
      ? _.assign(buildParamsFromState(false, forQuery)[0], {
          ...rebuildFullState(),
          ...(advancedView ? {} : maybeNewParams || newParamsOnSubmit), //(in preset mode use the presets)
          // UI
          advancedMode: advancedView,
          presetMode: presetMode,
          presetSplit: presetSplit,
        })
      : {
          ...(advancedView
            ? commonParams
            : maybeNewCommonParams || commonParams), //TODO: need to build games dynamically
          ...primaryOnOffRequest,
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
      visualSettingsToUse.calcRapm ||
      visualSettingsToUse.showRoster ||
      visualSettingsToUse.showGameInfo;

    // Lineups (eg for RAPM) calculations:
    //TODO: should tidy this up so can just make get lineups back from on/off query
    //      but for now we'll just hack a workaround
    const lineupRequests: (LineupFilterParams | undefined)[] = alsoPullLineups
      ? _.thru(alsoPullLineups, (__) => {
          const lineupQueriesAndFilters = buildLineupQueriesFromOnOffQueries(
            forQuery || false
          );
          return (
            [
              QueryUtils.cleanseQuery({
                ...commonParams,
                baseQuery: RequestUtils.replaceRosterShortcut(
                  commonParams.baseQuery,
                  rosterRef.current || [],
                  forQuery || false
                ),
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
                    showGameInfo: visualSettingsToUse.showGameInfo,
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
                      showGameInfo: visualSettingsToUse.showGameInfo,
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
          visualSettingsToUse.teamShotCharts
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
          visualSettingsToUse.playerShotCharts
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

  // Presets logic to make things easier

  /** The two sub-headers for the dropdown */
  const groupedPresetModeOptions = [
    {
      label: "Basic Views",
      options: _.keys(FilterPresetUtils.commonFilterPresets).map(
        stringToOption
      ),
    },
  ];

  /** The two sub-headers for the dropdown */
  const groupedPresetSplitOptions = _.chain(FilterPresetUtils.gameSplitPresets)
    .toPairs()
    .groupBy((kv) => kv[1].label)
    .pick(FilterPresetUtils.gameSplitLabelSortOrder)
    .map((kvs, key) => {
      return {
        label: key,
        options: kvs.map((kv) => stringToOption(kv[0])),
      };
    })
    .value()
    .concat([
      {
        label: "On/Off Splits",
        options: (rosterRef.current || []).map((n) =>
          stringToOption(
            `${FilterPresetUtils.gameFilterOnOffPrefix}${n.replaceAll('"', "")}`
          )
        ),
      },
    ]);

  /** Handles the setting of a preset */
  const applyPresetConfig = (
    newPresetMode: string,
    newPresetSplit: string,
    applyEffects: boolean
  ): [GameFilterParams | undefined, CommonFilterParams | undefined] => {
    const newCommonFilter = {
      ...commonParams,
      ...FilterPresetUtils.basePresetQuery,
      ...(FilterPresetUtils.commonFilterPresets[newPresetMode]?.commonParams ||
        {}),
    };

    const newParams = _.thru(
      FilterPresetUtils.gameSplitPresets[newPresetSplit],
      (maybeSplitConfig) => {
        if (maybeSplitConfig) {
          return {
            ...newParamsOnSubmit,
            ...FilterPresetUtils.basePresetOnOffQuery,
            ...(maybeSplitConfig?.gameParams || {}),
          };
        } else if (
          _.startsWith(newPresetSplit, FilterPresetUtils.gameFilterOnOffPrefix)
        ) {
          return {
            ...newParamsOnSubmit,
            ...FilterPresetUtils.basePresetOnOffQuery,
            onQuery: `"${newPresetSplit.substring(
              FilterPresetUtils.gameFilterOnOffPrefix.length
            )}"`,
            offQuery: `NOT "${newPresetSplit.substring(
              FilterPresetUtils.gameFilterOnOffPrefix.length
            )}"`,
          };
        }
      }
    );

    //DEBUG
    // console.log(
    //   `${applyEffects} ${JSON.stringify(newCommonFilter)}`,
    //   newParams
    // );

    if (applyEffects) {
      if (newPresetSplit != presetSplit) {
        setPresetSplit(newPresetSplit);
        if (newParams) {
          toggleAutoOffQuery(
            _.isNil(newParams.autoOffQuery) ? true : newParams.autoOffQuery
          );
          if (!_.isNil(newParams.onQuery)) {
            setOnQuery(newParams.onQuery);
          }
          setOnQueryFilters(
            QueryUtils.parseFilter(
              _.isNil(newParams.onQueryFilters)
                ? ParamDefaults.defaultQueryFilters
                : newParams.onQueryFilters,
              startingState.year || ParamDefaults.defaultYear
            )
          );
          if (!_.isNil(newParams.offQuery)) {
            setOffQuery(newParams.offQuery);
          }
          setOffQueryFilters(
            QueryUtils.parseFilter(
              _.isNil(newParams.offQueryFilters)
                ? ParamDefaults.defaultQueryFilters
                : newParams.offQueryFilters,
              startingState.year || ParamDefaults.defaultYear
            )
          );
          setOtherQueries((newParams.otherQueries || []).map((oq) => oq.query));
          setOtherQueryFilters(
            (newParams.otherQueries || []).map((oq) => {
              return QueryUtils.parseFilter(
                _.isNil(oq.queryFilters)
                  ? ParamDefaults.defaultQueryFilters
                  : oq.queryFilters,
                startingState.year || ParamDefaults.defaultYear
              );
            })
          );
        }
      }
      if (newPresetMode != presetMode) {
        setPresetMode(newPresetMode);
        if (newCommonFilter) setCommonParams(newCommonFilter);
      }
    }
    return [newParams, newCommonFilter];
  };

  /** Extra logic needed when switching between advanced and basic mode */
  const toggleAdvancedMode = () => {
    const currAdvancedMode = advancedView;
    const newAdvancedMode = !currAdvancedMode;
    const currPresetMode = presetMode;
    const currPresetSplit = presetSplit;

    const [newPresetMode, newPresetSplit] = _.thru(currAdvancedMode, (__) => {
      if (currAdvancedMode) {
        const [tmpMode, tmpSplit] = checkForImplicitPresets(commonParams, {
          autoOffQuery,
          onQuery,
          offQuery,
          onQueryFilters,
          offQueryFilters,
          otherQueries,
          otherQueryFilters,
        });
        return [
          tmpMode || ParamDefaults.defaultPresetMode,
          tmpSplit || ParamDefaults.defaultPresetSplit,
        ];
      } else {
        //(return presets to their defaults ready for when they are next to be used)
        return [
          ParamDefaults.defaultPresetMode,
          ParamDefaults.defaultPresetSplit,
        ];
      }
    });

    // Effects:

    setAdvancedView(newAdvancedMode);
    setPresetMode(newPresetMode);
    setPresetSplit(newPresetSplit);

    // If switching out of simple mode, then sync the current presets into the advanced state
    // (and then reset the presets to defaults)
    // If switching into simple mode then apply whatever inferred presets we find (or defaults if none)
    const [gameParamsToUse, commonParamsToUse] = applyPresetConfig(
      currAdvancedMode ? newPresetMode : currPresetMode,
      currAdvancedMode ? newPresetSplit : currPresetSplit,
      false
    );

    if (onSwitchToAdvancedMode) {
      // Switching to advanced view so we want to copy query over:
      onSwitchToAdvancedMode({
        ...(commonParamsToUse || commonParams),
        ...(gameParamsToUse || newParamsOnSubmit),
        advancedMode: newAdvancedMode,
        presetMode: newAdvancedMode ? undefined : newPresetMode,
        presetSplit: newAdvancedMode ? undefined : newPresetSplit,
      });
    }
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

  /** For use in selects */
  function stringToOption(s: string) {
    return { label: s, value: s };
  }
  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  const disableViewDetails =
    presetMode ==
      (startingState.presetMode || ParamDefaults.defaultPresetMode) &&
    presetSplit ==
      (startingState.presetSplit || ParamDefaults.defaultPresetSplit);

  return (
    <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix={cacheKeyPrefix}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      buildLinks={(params) => {
        const lineupOnOffQueries = buildLineupQueriesFromOnOffQueries(false);
        const maybePresetPhrase =
          (params as GameFilterParams).splitPhrases ||
          FilterPresetUtils.getPresetPhrase(params.presetSplit || "??");
        const maybeFilterPhrase = FilterPresetUtils.getPresetFilterPhrase(
          params.presetMode || "??"
        );
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
            {maybeFilterPhrase ? `Base (${maybeFilterPhrase})` : "Base"}
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
                    '{maybePresetPhrase?.[0] || "A"}'
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
                    '{maybePresetPhrase?.[1] || "B"}'
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
                      '
                      {maybePresetPhrase?.[2 + idx] ||
                        String.fromCharCode(67 + idx)}
                      '
                    </a>,
                  ]
                : [];
            })
          );
      }}
      forceReload1Up={internalForceReload1Up}
      gameSelectionRef={gameSelectionRef}
      rosterRef={rosterRef}
      onRosterChange={(newRoster) => {
        // Just change something to reload page:
        setForceRerender((curr) => curr + 1);
      }}
      onGameSelectionChange={(newGameSelection) => {
        // Reset any game-based filters:
        if (
          gameSelectionRef.current?.filter &&
          newGameSelection.filter &&
          (gameSelectionRef.current.filter.team !=
            newGameSelection.filter.team ||
            gameSelectionRef.current.filter.year !=
              newGameSelection.filter.year ||
            gameSelectionRef.current.filter.gender !=
              newGameSelection.filter.gender)
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
      }}
      hideSemiAdvancedOptions={!advancedView}
      propKey={propKey}
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
              games={gameSelectionRef.current?.games || []}
              selectedGames={QueryUtils.buildGameSelectionModel(onQueryFilters)}
              show={showOnGameSelectorModal}
              onClose={() => setOnShowGameSelectorModal(false)}
              onSubmit={(selectedGame) => {
                setOnQueryFilters(
                  QueryUtils.setCustomGameSelection(
                    onQueryFilters,
                    (gameSelectionRef.current?.games || []).length > 0
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
              games={gameSelectionRef.current?.games || []}
              selectedGames={QueryUtils.buildGameSelectionModel(
                offQueryFilters
              )}
              show={showOffGameSelectorModal}
              onClose={() => setOffShowGameSelectorModal(false)}
              onSubmit={(selectedGame) => {
                setOffQueryFilters(
                  QueryUtils.setCustomGameSelection(
                    offQueryFilters,
                    (gameSelectionRef.current?.games || []).length > 0
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
                games={gameSelectionRef.current?.games || []}
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
                        (gameSelectionRef.current?.games || []).length > 0
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

            {!advancedView ? (
              <Form.Group as={Row}>
                <Form.Label column xs={12} lg={12} xl={2}>
                  <b>What interests you?</b>
                </Form.Label>
                <Col xs={12} lg={6} xl={3}>
                  <ThemedSelect
                    isClearable={false}
                    styles={{
                      menu: (base: any) => ({ ...base, zIndex: 1000 }),
                    }}
                    value={
                      presetMode
                        ? { label: presetMode, value: presetMode }
                        : undefined
                    }
                    options={groupedPresetModeOptions}
                    formatGroupLabel={formatGroupLabel}
                    onChange={(option: any) => {
                      const newPreset = option.value || "";
                      applyPresetConfig(newPreset, presetSplit, true);
                    }}
                  />
                </Col>
                <Col xs={12} lg={6} xl={4}>
                  <ThemedSelect
                    isClearable={false}
                    styles={{
                      menu: (base: any) => ({ ...base, zIndex: 1000 }),
                    }}
                    value={
                      presetSplit
                        ? { label: presetSplit, value: presetSplit }
                        : undefined
                    }
                    options={groupedPresetSplitOptions}
                    formatGroupLabel={formatGroupLabel}
                    onChange={(option: any) => {
                      const newPreset = option.value || "";
                      applyPresetConfig(presetMode, newPreset, true);
                    }}
                  />
                </Col>
                <Col xs={10} lg={10} xl={2}>
                  <GenericTogglingMenu
                    drop="down"
                    label={
                      <OverlayTrigger
                        placement="auto"
                        overlay={
                          <Tooltip id="viewsDetails">
                            <>
                              Pick which visualization elements you want for
                              this preset query
                              {disableViewDetails ? (
                                <>
                                  <br />
                                  <br />
                                  NOTE: once you've submitted a query, use the
                                  per-section controls below - most of this
                                  menu's settings will be greyed out until you
                                  change to a different preset query.
                                </>
                              ) : null}
                            </>
                          </Tooltip>
                        }
                      >
                        <span>+ Visuals / Details...</span>
                      </OverlayTrigger>
                    }
                  >
                    <GenericTogglingMenuItem
                      text="Reset to defaults"
                      truthVal={false}
                      onSelect={() => setNewParamsOnSubmit({})}
                    />
                    <Dropdown.Divider />
                    <GenericTogglingMenuItem
                      text="Show Team View"
                      truthVal={true}
                      disabled={true}
                      onSelect={() => {}}
                    />
                    <GenericTogglingMenuItem
                      text="Shot Charts"
                      truthVal={newParamsOnSubmit.teamShotCharts || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          teamShotCharts: !(
                            newParamsOnSubmit.teamShotCharts || false
                          ),
                        })
                      }
                    />
                    <GenericTogglingMenuItem
                      text="Play Type Breakdown"
                      truthVal={newParamsOnSubmit.showTeamPlayTypes || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          showTeamPlayTypes: !(
                            newParamsOnSubmit.showTeamPlayTypes || false
                          ),
                        })
                      }
                    />
                    <GenericTogglingMenuItem
                      text="Roster Breakdown"
                      truthVal={newParamsOnSubmit.showRoster || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          showRoster: !(newParamsOnSubmit.showRoster || false),
                        })
                      }
                    />
                    <GenericTogglingMenuItem
                      text="Games Breakdown"
                      truthVal={newParamsOnSubmit.showGameInfo || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          showGameInfo: !(
                            newParamsOnSubmit.showGameInfo || false
                          ),
                        })
                      }
                    />
                    <GenericTogglingMenuItem
                      text="Extra Detailed Stats"
                      truthVal={newParamsOnSubmit.showExtraInfo || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          showExtraInfo: !(
                            newParamsOnSubmit.showExtraInfo || false
                          ),
                        })
                      }
                    />
                    <Dropdown.Divider />
                    <GenericTogglingMenuItem
                      text="Show Player View"
                      truthVal={true}
                      disabled={true}
                      onSelect={() => {}}
                    />
                    <GenericTogglingMenuItem
                      text="Information Sub-Header"
                      truthVal={newParamsOnSubmit.showInfoSubHeader || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          showInfoSubHeader: !(
                            newParamsOnSubmit.showInfoSubHeader || false
                          ),
                        })
                      }
                    />
                    <GenericTogglingMenuItem
                      text="Shot Charts"
                      truthVal={newParamsOnSubmit.playerShotCharts || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          playerShotCharts: !(
                            newParamsOnSubmit.playerShotCharts || false
                          ),
                        })
                      }
                    />
                    <GenericTogglingMenuItem
                      text="Play Type Breakdown"
                      truthVal={newParamsOnSubmit.showPlayerPlayTypes || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          showPlayerPlayTypes: !(
                            newParamsOnSubmit.showPlayerPlayTypes || false
                          ),
                        })
                      }
                    />
                    <Dropdown.Divider />
                    <GenericTogglingMenuItem
                      text="Show Lineup Comp View"
                      truthVal={true}
                      disabled={true}
                      onSelect={() => {}}
                    />
                    <Dropdown.Divider />
                    <GenericTogglingMenuItem
                      text="Show Ranks/Pctiles"
                      truthVal={!_.isEmpty(newParamsOnSubmit.showGrades || "")}
                      disabled={disableViewDetails}
                      onSelect={() => {
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          showGrades: newParamsOnSubmit.showGrades
                            ? ""
                            : ParamDefaults.defaultEnabledGrade,
                        });
                      }}
                    />
                    <GenericTogglingMenuItem
                      text="Filter Garbage Time"
                      truthVal={commonParams.filterGarbage || false}
                      onSelect={() =>
                        //TODO: for some reason this is super slow
                        updateCommonParams({
                          ...commonParams,
                          filterGarbage: !(commonParams.filterGarbage || false),
                        })
                      }
                    />
                    <GenericTogglingMenuItem
                      text="Adjust For Luck"
                      truthVal={newParamsOnSubmit.onOffLuck || false}
                      disabled={disableViewDetails}
                      onSelect={() =>
                        setNewParamsOnSubmit({
                          ...newParamsOnSubmit,
                          onOffLuck: !(newParamsOnSubmit.onOffLuck || false),
                        })
                      }
                    />
                  </GenericTogglingMenu>
                </Col>
                <Col xs={2} lg={2} xl={1} className="mt-1 text-center">
                  <OverlayTrigger
                    placement="auto"
                    overlay={
                      <Tooltip id="advancedMode">
                        Switch to advanced query mode
                      </Tooltip>
                    }
                  >
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={(e) => toggleAdvancedMode()}
                    >
                      <FontAwesomeIcon icon={faSlidersH} />
                    </Button>
                  </OverlayTrigger>
                </Col>
              </Form.Group>
            ) : null}
            {advancedView ? (
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
                          games={gameSelectionRef.current?.games || []}
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
                      text="Simple Query Mode"
                      truthVal={false}
                      onSelect={() => toggleAdvancedMode()}
                    />
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
            ) : null}
            {advancedView ? (
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
                              games={gameSelectionRef.current?.games || []}
                              onKeyUp={(ev: any) =>
                                setOffQuery(ev.target.value)
                              }
                              onChange={(ev: any) =>
                                setOffQuery(ev.target.value)
                              }
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
            ) : null}
            {_.range(0, advancedView ? otherQueries.length : 0).map(
              (extraQueryIndex) => (
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
                                games={gameSelectionRef.current?.games || []}
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
              )
            )}
          </div>
        )}
      </GlobalKeypressManager.Consumer>
    </CommonFilter>
  );
};

export default GameFilter;
