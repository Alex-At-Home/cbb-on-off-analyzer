/**
 * Filter for Season Matchup Analyzer: gender/year/team only.
 * Fetches game list, builds 3 requests (team, player, lineup) with on/off/otherQueries,
 * parses responses into per-game array. Supports simple (preset) and advanced mode.
 */
import React, { useState, useEffect, useRef } from "react";
import _ from "lodash";
import { FilteredGameSelection } from "../utils/QueryUtils";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Dropdown, OverlayTrigger, Tooltip } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSlidersH } from "@fortawesome/free-solid-svg-icons";
import CommonFilter, { GlobalKeypressManager } from "./CommonFilter";
import {
  ParamPrefixes,
  ParamPrefixesType,
  CommonFilterParams,
  SeasonMatchupFilterParams,
  FilterRequestInfo,
  GameFilterParams,
  LineupFilterParams,
  ParamDefaults,
} from "../utils/FilterModels";
import { FilterPresetUtils } from "../utils/FilterPresetUtils";
import { GameInfoStatSet } from "../utils/StatModels";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { RequestUtils } from "../utils/RequestUtils";
import {
  buildGameRequestParams,
  buildGameLabel,
} from "../utils/SeasonMatchupUtils";
import ThemedSelect from "./shared/ThemedSelect";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import { SEASON_MATCHUP_TEAM_KEY } from "../utils/SeasonMatchupImpactUtils";

export type SeasonMatchupPerGame = {
  gameLabel: string;
  gameInfo: GameInfoStatSet;
  teamStats: any;
  rosterStats: any;
  lineupStats: any;
};

export type SeasonMatchupOnStats = (data: {
  games: SeasonMatchupPerGame[];
}) => void;

type Props = {
  onStats: SeasonMatchupOnStats;
  startingState: SeasonMatchupFilterParams;
  onChangeState: (newParams: SeasonMatchupFilterParams) => void;
  /** Team + player options for preset "who" dropdown (from parent after games load). */
  playerOptions?: { title: string }[];
};

function bucketKeyForGameIndex(i: number): string {
  if (i === 0) return "on";
  if (i === 1) return "off";
  return `other_${i - 2}`;
}

/** Convert CommonFilter gameSelection.games to GameInfoStatSet[] for buildGameRequestParams */
function gameSelectionToGameInfo(games: FilteredGameSelection["games"]): GameInfoStatSet[] {
  if (!games?.length) return [];
  return games.map((g) => {
    const loc =
      g.location === "Away" ? "A" : g.location === "Home" ? "H" : "N";
    return { date: g.date, opponent: `${loc}:${g.opponent}` } as GameInfoStatSet;
  });
}

export const SeasonMatchupFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
  playerOptions = [],
}) => {
  const [params, setParams] = useState<SeasonMatchupFilterParams>(startingState);
  const [games, setGames] = useState<GameInfoStatSet[]>([]);
  const advancedView = params.advancedMode ?? false;
  const [presetMode, setPresetMode] = useState(
    params.presetMode ?? ParamDefaults.defaultPresetMode
  );
  const [presetGroup, setPresetGroup] = useState(
    params.presetGroup ?? SEASON_MATCHUP_TEAM_KEY
  );
  const [visualizeState, setVisualizeState] = useState({
    adjustForOpponentStrength: params.adjustForOpponentStrength ?? false,
    showChart: params.showChart ?? true,
  });

  const gameSelectionRef = useRef<FilteredGameSelection | undefined>();
  const rosterRef = useRef<string[] | undefined>();
  const lastRequestGamesRef = useRef<GameInfoStatSet[]>([]);

  useEffect(() => {
    if (params.presetMode !== undefined) setPresetMode(params.presetMode);
    if (params.presetGroup !== undefined) setPresetGroup(params.presetGroup);
    if (params.adjustForOpponentStrength !== undefined)
      setVisualizeState((v) => ({
        ...v,
        adjustForOpponentStrength: params.adjustForOpponentStrength!,
      }));
    if (params.showChart !== undefined)
      setVisualizeState((v) => ({ ...v, showChart: params.showChart! }));
  }, [
    params.presetMode,
    params.presetGroup,
    params.adjustForOpponentStrength,
    params.showChart,
  ]);

  // Sync from page when results section pushes presetGroup / visualization (e.g. quick switch)
  useEffect(() => {
    if (startingState.presetGroup !== undefined) {
      setPresetGroup(startingState.presetGroup);
      setParams((prev) => ({ ...prev, presetGroup: startingState.presetGroup }));
    }
    if (startingState.showChart !== undefined) {
      setVisualizeState((v) => ({ ...v, showChart: startingState.showChart! }));
      setParams((prev) => ({ ...prev, showChart: startingState.showChart }));
    }
    if (startingState.adjustForOpponentStrength !== undefined) {
      setVisualizeState((v) => ({
        ...v,
        adjustForOpponentStrength: startingState.adjustForOpponentStrength!,
      }));
      setParams((prev) => ({
        ...prev,
        adjustForOpponentStrength: startingState.adjustForOpponentStrength,
      }));
    }
  }, [
    startingState.presetGroup,
    startingState.showChart,
    startingState.adjustForOpponentStrength,
  ]);

  const isDebug = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (params.team && params.year && params.gender) {
      RequestUtils.fetchOpponents(
        params,
        (results) => setGames(results || []),
        dataLastUpdated,
        isDebug
      );
    } else {
      setGames([]);
    }
  }, [params.team, params.year, params.gender]);

  const commonParams: CommonFilterParams = {
    team: params.team,
    year: params.year,
    gender: params.gender,
    minRank: ParamDefaults.defaultMinRank,
    maxRank: ParamDefaults.defaultMaxRank,
    ...(advancedView
      ? {}
      : FilterPresetUtils.commonFilterPresets[presetMode]?.commonParams ?? {}),
  };

  function applyPresetFilter(
    newPresetMode: string,
    newPresetGroup: string
  ): void {
    if (newPresetMode === FilterPresetUtils.switchToAdvancedFilter) {
      onChangeState({ ...params, advancedMode: true });
      setParams((prev) => ({ ...prev, advancedMode: true }));
      return;
    }
    setPresetMode(newPresetMode);
    setPresetGroup(newPresetGroup);
    const presetCommon =
      FilterPresetUtils.commonFilterPresets[newPresetMode]?.commonParams ?? {};
    onChangeState({
      ...params,
      presetMode: newPresetMode,
      presetGroup: newPresetGroup,
      ...presetCommon,
    });
    setParams((prev) => ({
      ...prev,
      presetMode: newPresetMode,
      presetGroup: newPresetGroup,
      ...presetCommon,
    }));
  }

  function buildParamsFromState(
    includeFilterParams: Boolean,
    _forQuery?: Boolean
  ): [GameFilterParams, FilterRequestInfo[]] {
    const baseCommon = {
      team: params.team,
      year: params.year,
      gender: params.gender,
      minRank: ParamDefaults.defaultMinRank,
      maxRank: ParamDefaults.defaultMaxRank,
    };
    const mergedCommon = advancedView
      ? { ...baseCommon, ...params }
      : {
          ...baseCommon,
          ...(FilterPresetUtils.commonFilterPresets[presetMode]?.commonParams ??
            {}),
        };
    const gamesToUse =
      games.length > 0
        ? games
        : gameSelectionToGameInfo(gameSelectionRef.current?.games ?? []);
    lastRequestGamesRef.current = gamesToUse;
    const { teamPlayerParams, lineupParams } = buildGameRequestParams(
      gamesToUse,
      mergedCommon as CommonFilterParams
    );
    const primaryRequest = (
      includeFilterParams
        ? {
            ...teamPlayerParams,
            ...mergedCommon,
            advancedMode: advancedView,
            presetMode,
            presetGroup,
            adjustForOpponentStrength: visualizeState.adjustForOpponentStrength,
            showChart: visualizeState.showChart,
          }
        : { ...teamPlayerParams }
    ) as GameFilterParams;
    const otherRequests: FilterRequestInfo[] = [
      {
        context: ParamPrefixes.player as ParamPrefixesType,
        paramsObj: teamPlayerParams,
      },
      {
        context: ParamPrefixes.lineup as ParamPrefixesType,
        paramsObj: lineupParams as LineupFilterParams,
      },
    ];
    return [primaryRequest, otherRequests];
  }

  function handleResponse(jsons: any[], _wasError: Boolean) {
    const teamJson = jsons?.[0]?.responses?.[0] || {};
    const playerJson = jsons?.[1]?.responses?.[0] || {};
    const lineupJson = jsons?.[2]?.responses?.[0] || {};

    const teamBuckets = teamJson?.aggregations?.tri_filter?.buckets || {};
    const playerBuckets = playerJson?.aggregations?.tri_filter?.buckets || {};
    const lineupBuckets = lineupJson?.aggregations?.other_queries?.buckets || {};

    const gamesForResponse =
      games.length > 0 ? games : lastRequestGamesRef.current;
    const n = gamesForResponse.length;
    const perGame: SeasonMatchupPerGame[] = [];
    for (let i = 0; i < n; i++) {
      const tk = bucketKeyForGameIndex(i);
      const lk = `other_${i}`;
      const lineupBucket = lineupBuckets[lk] || {};
      const lineupBucketsList = lineupBucket.lineups?.buckets || [];
      perGame.push({
        gameLabel: buildGameLabel(gamesForResponse[i]),
        gameInfo: gamesForResponse[i],
        teamStats: teamBuckets[tk] || {},
        rosterStats: playerBuckets[tk]?.player?.buckets || [],
        lineupStats: { lineups: lineupBucketsList },
      });
    }
    onStats({ games: perGame });
  }

  const presetModeOptions = Object.keys(
    FilterPresetUtils.commonFilterPresets
  ).filter((k) => k !== FilterPresetUtils.switchToAdvancedFilter);
  const presetGroupOptions = [
    { title: SEASON_MATCHUP_TEAM_KEY },
    ...playerOptions.filter((o) => o.title !== SEASON_MATCHUP_TEAM_KEY),
  ];
  const stringToOption = (s: string) => ({ label: s, value: s });

  return (
    <CommonFilter
      gameSelectionRef={gameSelectionRef}
      rosterRef={rosterRef}
      startingState={{
        ...commonParams,
        ...params,
        advancedMode: advancedView,
        presetMode,
        presetGroup,
        adjustForOpponentStrength: visualizeState.adjustForOpponentStrength,
        showChart: visualizeState.showChart,
      } as GameFilterParams}
      onChangeState={(p: GameFilterParams) => {
        const next: SeasonMatchupFilterParams = {
          ...params,
          team: p.team,
          year: p.year,
          gender: p.gender,
        };
        const primaryFilterChanged =
          p.team !== params.team ||
          p.year !== params.year ||
          p.gender !== params.gender;
        if (primaryFilterChanged) {
          setPresetGroup(SEASON_MATCHUP_TEAM_KEY);
          next.presetGroup = SEASON_MATCHUP_TEAM_KEY;
        }
        if ((p as any).advancedMode !== undefined)
          next.advancedMode = (p as any).advancedMode;
        if ((p as any).presetMode !== undefined)
          next.presetMode = (p as any).presetMode;
        if ((p as any).presetGroup !== undefined)
          next.presetGroup = (p as any).presetGroup;
        if ((p as any).adjustForOpponentStrength !== undefined)
          next.adjustForOpponentStrength = (p as any).adjustForOpponentStrength;
        if ((p as any).showChart !== undefined)
          next.showChart = (p as any).showChart;
        setParams(next);
        if ((p as any).presetMode !== undefined)
          setPresetMode((p as any).presetMode);
        if ((p as any).presetGroup !== undefined)
          setPresetGroup((p as any).presetGroup);
        if ((p as any).adjustForOpponentStrength !== undefined)
          setVisualizeState((v) => ({
            ...v,
            adjustForOpponentStrength: (p as any).adjustForOpponentStrength,
          }));
        if ((p as any).showChart !== undefined)
          setVisualizeState((v) => ({ ...v, showChart: (p as any).showChart }));
        onChangeState(next);
      }}
      onChangeCommonState={(common) => {
        const primaryChanged =
          (common.team !== undefined && common.team !== params.team) ||
          (common.year !== undefined && common.year !== params.year) ||
          (common.gender !== undefined && common.gender !== params.gender);
        setParams((prev) => {
          const next = { ...prev, ...common };
          if (primaryChanged) next.presetGroup = SEASON_MATCHUP_TEAM_KEY;
          return next;
        });
        if (primaryChanged) {
          setPresetGroup(SEASON_MATCHUP_TEAM_KEY);
          onChangeState({
            ...params,
            ...common,
            presetGroup: SEASON_MATCHUP_TEAM_KEY,
          });
        }
      }}
      tablePrefix={ParamPrefixes.game as ParamPrefixesType}
      tablePrefixForPrimaryRequest={ParamPrefixes.game as ParamPrefixesType}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      buildLinks={() => []}
      hideSemiAdvancedOptions={!advancedView}
      extraButton={
        <GenericTogglingMenu size="sm">
          <GenericTogglingMenuItem
            text={advancedView ? "Simple Query Mode" : "Manual Filters..."}
            truthVal={false}
            onSelect={() => {
              const next = !advancedView;
              setParams((prev) => ({ ...prev, advancedMode: next }));
              onChangeState({
                ...params,
                advancedMode: next,
              });
            }}
          />
        </GenericTogglingMenu>
      }
    >
      <GlobalKeypressManager.Consumer>
        {() => (
          <>
            {!advancedView && (
              <Form.Group as={Row}>
                <Form.Label column xs={12} lg={12} xl={2}>
                  <b>What interests you?</b>
                </Form.Label>
                <Col xs={12} lg={6} xl={3}>
                  <ThemedSelect
                    isClearable={false}
                    styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                    value={stringToOption(presetMode)}
                    options={[
                      ...presetModeOptions.map(stringToOption),
                      {
                        label: FilterPresetUtils.switchToAdvancedFilter,
                        value: FilterPresetUtils.switchToAdvancedFilter,
                      },
                    ]}
                    onChange={(option: any) => {
                      const v = option?.value ?? presetMode;
                      if (v === FilterPresetUtils.switchToAdvancedFilter) {
                        setParams((prev) => ({ ...prev, advancedMode: true }));
                        onChangeState({ ...params, advancedMode: true });
                      } else applyPresetFilter(v, presetGroup);
                    }}
                  />
                </Col>
                <Col xs={12} lg={6} xl={3}>
                  <ThemedSelect
                    isClearable={false}
                    styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                    value={{ label: presetGroup, value: presetGroup }}
                    options={presetGroupOptions.map((o) => ({
                      label: o.title,
                      value: o.title,
                    }))}
                    onChange={(option: any) => {
                      const v = option?.value ?? presetGroup;
                      setPresetGroup(v);
                      onChangeState({ ...params, presetGroup: v });
                      setParams((prev) => ({ ...prev, presetGroup: v }));
                    }}
                  />
                </Col>
                <Col xs={12} lg={6} xl={2}>
                  <GenericTogglingMenu drop="down" label={<span>+ Visualize...</span>}>
                    <GenericTogglingMenuItem
                      text="Adjust for Opponent Strength"
                      truthVal={visualizeState.adjustForOpponentStrength}
                      onSelect={() => {
                        const next = !visualizeState.adjustForOpponentStrength;
                        setVisualizeState((v) => ({
                          ...v,
                          adjustForOpponentStrength: next,
                        }));
                        onChangeState({
                          ...params,
                          adjustForOpponentStrength: next,
                        });
                        setParams((prev) => ({
                          ...prev,
                          adjustForOpponentStrength: next,
                        }));
                      }}
                    />
                    <GenericTogglingMenuItem
                      text="Show Chart"
                      truthVal={visualizeState.showChart}
                      onSelect={() => {
                        const next = !visualizeState.showChart;
                        setVisualizeState((v) => ({ ...v, showChart: next }));
                        onChangeState({ ...params, showChart: next });
                        setParams((prev) => ({ ...prev, showChart: next }));
                      }}
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
                      onClick={() => {
                        setParams((prev) => ({ ...prev, advancedMode: true }));
                        onChangeState({ ...params, advancedMode: true });
                      }}
                    >
                      <FontAwesomeIcon icon={faSlidersH} />
                    </Button>
                  </OverlayTrigger>
                </Col>
              </Form.Group>
            )}
          </>
        )}
      </GlobalKeypressManager.Consumer>
    </CommonFilter>
  );
};

export default SeasonMatchupFilter;
