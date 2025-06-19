// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import "bootstrap/dist/css/bootstrap.min.css";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Component imports:
import { LineupStatsModel } from "../components/LineupStatsTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { TeamStatsModel } from "../components/TeamStatsTable";
import CommonFilter from "../components/CommonFilter";
import {
  ParamDefaults,
  ParamPrefixesType,
  ParamPrefixes,
  FilterParamsType,
  CommonFilterParams,
  LineupFilterParams,
  FilterRequestInfo,
  getCommonFilterParams,
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
import { FeatureFlags } from "../utils/stats/FeatureFlags";
//@ts-ignore
import Select, { components } from "react-select";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import { Button, Dropdown, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSlidersH } from "@fortawesome/free-solid-svg-icons";
import { FilterPresetUtils } from "../utils/FilterPresetUtils";

type Props = {
  onStats: (
    lineupStats: LineupStatsModel,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel
  ) => void;
  startingState: LineupFilterParams;
  onChangeState: (newParams: LineupFilterParams) => void;
  startingLineupLinks: (newParams: LineupFilterParams) => React.ReactNode[];
  forceReload1Up: number;
  onSwitchToAdvancedMode?: (newParams: LineupFilterParams) => void;
  propKey?: number;
  testMode?: boolean;
};

const LineupFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
  startingLineupLinks,
  forceReload1Up,
  onSwitchToAdvancedMode,
  propKey,
  testMode,
}) => {
  const isServer = () => typeof window === `undefined`;
  if (isServer() && !testMode) return null; //(don't render server-side)

  //console.log("Loading LineupFilter " + JSON.stringify(startingState));

  // Data model

  const {
    // UI
    advancedMode: startAdvancedMode,
    presetMode: startPresetMode,
    presetGroup: startPresetGroup,
    // Luck stats:
    luck: startLuck,
    lineupLuck: startLineupLuck,
    showLineupLuckDiags: startShowLineupLuckDiags,
    aggByPos: startAggByPos,
    showGameInfo: startShowGameInfo,
    // Filters etc
    decorate: startDecorate,
    showTotal: startShowTotal,
    maxTableSize: startMaxTableSize,
    minPoss: startMinPoss,
    sortBy: startSortBy,
    filter: startFilter,
    ...startingCommonFilterParams
  } = startingState;

  const rebuildFullState = () => {
    return {
      // Luck stats:
      luck: startLuck,
      lineupLuck: startLineupLuck,
      showLineupLuckDiags: startShowLineupLuckDiags,
      aggByPos: startAggByPos,
      showGameInfo: startShowGameInfo,
      // Filters etc
      decorate: startDecorate,
      showTotal: startShowTotal,
      maxTableSize: startMaxTableSize,
      minPoss: startMinPoss,
      sortBy: startSortBy,
      filter: startFilter,
      //(note doesn't include the actual game query params)
    };
  };

  /** The state managed by the CommonFilter element */
  const [commonParams, setCommonParams] = useState(
    startingCommonFilterParams as CommonFilterParams
  );

  /** All the game-specific viz options, ie not query/filter */
  const [newParamsOnSubmit, setNewParamsOnSubmit] =
    useState<LineupFilterParams>(rebuildFullState());

  /** Ugly pattern that is part of support for force reloading */
  const [internalForceReload1Up, setInternalForceReload1Up] =
    useState(forceReload1Up);

  useEffect(() => {
    // Whenever forceReload1Up is incremented, reset common params:
    if (forceReload1Up != internalForceReload1Up) {
      setCommonParams(startingCommonFilterParams as CommonFilterParams);
      setInternalForceReload1Up(forceReload1Up);
    }
  }, [forceReload1Up]);

  // Preset state and basic logic

  //(note the order matters here)

  /** Whether to show pre-sets instead of full set */
  const [advancedView, setAdvancedView] = useState(
    _.isNil(startingState.advancedMode)
      ? _.thru(startingState, (state) => {
          if (!_.isEmpty(state.presetMode)) return false;
          if (!_.isEmpty(state.presetGroup)) return false;

          if (!FeatureFlags.isActiveWindow(FeatureFlags.friendlierInterface))
            return true;

          // Advanced mode unspecified but matbe we can infer it?
          //TODO: implement this when we have a moment
          // const [maybeMode, maybeSplit] = checkForImplicitPresetsOnStartup();
          // if (maybeMode && maybeSplit) return false;

          if (!_.isEmpty(state.baseQuery)) return true;
          if (!_.isEmpty(state.queryFilters)) return true;
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
        //TODO: implement this:
        const [maybeMode, maybeSplit] = [undefined, undefined]; //checkForImplicitPresetsOnStartup();
        if (maybeMode && maybeSplit) {
          return maybeMode;
        } else {
          return startingState.presetMode || ParamDefaults.defaultPresetMode;
        }
      }
    })
  );

  /** The preset query to use */
  const [presetGroup, setPresetGroup] = useState(
    _.thru(!_.isEmpty(startingState.presetGroup), (presetsDefined) => {
      if (presetsDefined) {
        return startingState.presetGroup || ParamDefaults.defaultPresetGroup;
      } else if (advancedView) {
        return "";
      } else {
        //TODO: implement this:
        const [maybeMode, maybeSplit] = [undefined, undefined]; //checkForImplicitPresetsOnStartup();
        if (maybeMode && maybeSplit) {
          return maybeSplit;
        } else {
          return startingState.presetGroup || ParamDefaults.defaultPresetGroup;
        }
      }
    })
  );

  // Lineup Filter - custom queries and filters:

  const isDebug = process.env.NODE_ENV !== "production";

  const cacheKeyPrefix = ParamPrefixes.lineup;

  // Utils

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    setCommonParams(params);
  }

  /** Builds a lineup filter from the various state elements, and also any secondary filters
   * NOTE: ugly hack I need to fix, needs to sync with CommonFilter.onSeeExample
   */
  function buildParamsFromState(
    includeFilterParams: Boolean
  ): [LineupFilterParams, FilterRequestInfo[]] {
    const primaryRequest: LineupFilterParams = includeFilterParams
      ? _.assign(buildParamsFromState(false)[0], {
          // Luck stats:
          luck: startLuck,
          lineupLuck: startLineupLuck,
          showLineupLuckDiags: startShowLineupLuckDiags,
          aggByPos: startAggByPos,
          // Filters etc
          decorate: startDecorate,
          showTotal: startShowTotal,
          maxTableSize: startMaxTableSize,
          minPoss: startMinPoss,
          sortBy: startSortBy,
          filter: startFilter,
        })
      : {
          ...commonParams,
        };
    //(another ugly hack to be fixed - remove default optional fields)
    QueryUtils.cleanseQuery(primaryRequest);

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

    if (startShowGameInfo) {
      // mutate primary request to inject param only if non-default
      // Special case: this determines the query set sent to the server:
      primaryRequest.showGameInfo = true;
    }

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

  // More preset logic

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
  const groupedPresetSplitOptions = _.chain(
    FilterPresetUtils.lineupGroupPresets
  )
    .toPairs()
    .groupBy((kv) => kv[1].label)
    .map((kvs, key) => {
      return {
        label: key,
        options: kvs.map((kv) => stringToOption(kv[0])),
      };
    })
    .value();

  /** Handles the setting of a preset */
  const applyPresetConfig = (
    newPresetMode: string,
    newPresetGroup: string,
    applyEffects: boolean
  ): [LineupFilterParams | undefined, CommonFilterParams | undefined] => {
    const newCommonFilter = {
      ...commonParams,
      ...FilterPresetUtils.basePresetQuery,
      ...(FilterPresetUtils.commonFilterPresets[newPresetMode]?.commonParams ||
        {}),
    };

    const newParams = _.thru(
      FilterPresetUtils.lineupGroupPresets[newPresetGroup],
      (maybeSplitConfig) => {
        //TODO
        return {};
      }
    );

    //DEBUG
    // console.log(
    //   `${applyEffects} ${JSON.stringify(newCommonFilter)}`,
    //   newParams
    // );

    if (applyEffects) {
      if (newPresetGroup != presetGroup) {
        setPresetGroup(newPresetGroup);
        if (newParams) {
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
    const currPresetGroup = presetGroup;
    const [gameParamsToUse, commonParamsToUse] = !currAdvancedMode
      ? applyPresetConfig(currPresetMode, currPresetGroup, false)
      : [undefined, undefined];
    setAdvancedView(newAdvancedMode);

    const [newPresetMode, newPresetGroup] = _.thru(currAdvancedMode, (__) => {
      if (currAdvancedMode) {
        const [tmpMode, tmpGroup] = [undefined, undefined];
        //TODO: add this in:
        // checkForImplicitPresets(commonParams, {
        //   aggByPos
        // });
        return [
          tmpMode || ParamDefaults.defaultPresetMode,
          tmpGroup || ParamDefaults.defaultPresetGroup,
        ];
      } else {
        //(return presets to their defaults ready for when they are next to be used)
        return [
          ParamDefaults.defaultPresetMode,
          ParamDefaults.defaultPresetGroup,
        ];
      }
    });
    setPresetMode(newPresetMode);
    setPresetGroup(newPresetGroup);

    if (onSwitchToAdvancedMode) {
      // Switching to advanced view so we want to copy query over:
      onSwitchToAdvancedMode({
        ...(commonParamsToUse || commonParams),
        ...(gameParamsToUse || newParamsOnSubmit),
        advancedMode: newAdvancedMode,
        presetMode: newAdvancedMode ? undefined : newPresetMode,
        presetGroup: newAdvancedMode ? undefined : newPresetGroup,
      });
    }
  };

  // Visual components:

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
    presetGroup ==
      (startingState.presetGroup || ParamDefaults.defaultPresetGroup);

  return (
    <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix={cacheKeyPrefix}
      buildLinks={(params) => {
        return startingLineupLinks(params);
      }}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      forceReload1Up={internalForceReload1Up}
      hideSemiAdvancedOptions={!advancedView}
      extraButton={
        <GenericTogglingMenu size="sm">
          <GenericTogglingMenuItem
            text="Simple Query Mode"
            truthVal={false}
            onSelect={() => toggleAdvancedMode()}
          />
        </GenericTogglingMenu>
      }
    >
      {!advancedView ? (
        <Form.Group as={Row}>
          <Form.Label column xs={12} lg={12} xl={2}>
            <b>What interests you?</b>
          </Form.Label>
          <Col xs={12} lg={6} xl={3}>
            <Select
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
                applyPresetConfig(newPreset, presetGroup, true);
              }}
            />
          </Col>
          <Col xs={12} lg={6} xl={4}>
            <Select
              isClearable={false}
              styles={{
                menu: (base: any) => ({ ...base, zIndex: 1000 }),
              }}
              value={
                presetGroup
                  ? { label: presetGroup, value: presetGroup }
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
                        Pick which visualization elements you want for this
                        preset query
                        {disableViewDetails ? (
                          <>
                            <br />
                            <br />
                            NOTE: once you've submitted a query, use the
                            per-section controls below - most of this menu's
                            settings will be greyed out until you change to a
                            different preset query.
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
                truthVal={newParamsOnSubmit.lineupLuck || false}
                disabled={disableViewDetails}
                onSelect={() =>
                  setNewParamsOnSubmit({
                    ...newParamsOnSubmit,
                    lineupLuck: !(newParamsOnSubmit.lineupLuck || false),
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
    </CommonFilter>
  );
};

export default LineupFilter;
