// React imports:
import React, { useState, useEffect } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Library imports:
import fetch from "isomorphic-unfetch";
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
  ParamDefaults,
  ParamPrefixesType,
  ParamPrefixes,
  CommonFilterParams,
  LineupFilterParams,
  FilterRequestInfo,
  MatchupFilterParams,
  GameFilterParams,
} from "../utils/FilterModels";

// Utils
import {
  StatModels,
  LineupStintInfo,
  PlayerCode,
  LineupStintTeamStats,
  ShotStats,
} from "../utils/StatModels";
import { QueryUtils } from "../utils/QueryUtils";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import { UrlRouting } from "../utils/UrlRouting";
import { DateUtils } from "../utils/DateUtils";

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
    shotChartInfo?: {
      game: {
        off: ShotStats;
        def: ShotStats;
      };
      seasonA: {
        off: ShotStats;
        def: ShotStats;
      };
      seasonB: {
        off: ShotStats;
        def: ShotStats;
      };
    }
  ) => void;
  startingState: MatchupFilterParams;
  onChangeState: (newParams: MatchupFilterParams) => void;
};

/** Convert from the menu string into team + date */
export const buildOppoFilter = (
  menuItemStr: string
): { team: string; dateStr: string } | undefined => {
  const regexExtractor = /^(?:@|vs)? *(.*) [(]([^)]*).*$/;
  const regexResult = regexExtractor.exec(menuItemStr);
  if (regexResult && regexResult.length >= 3) {
    return { team: regexResult[1], dateStr: regexResult[2] };
  } else {
    return undefined;
  }
};

const CustomMatchupFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
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
    startingCommonFilterParams as CommonFilterParams
  );

  /** The list of opponents */
  const [opponentList, setOpponentList] = useState<Array<any>>([]); //(TODO: see StatModels - this needs to get modelled)

  // Lineup Filter - custom queries and filters:

  const isDebug = process.env.NODE_ENV !== "production";

  const [game, setGame] = useState(startingState.oppoTeam || "");

  // Utils

  useEffect(() => {
    // On load,
    if (_.isEmpty(opponentList) && commonParams.team) {
      fetchOpponents(commonParams);
    }
  }, []);

  /** Bridge between the callback in CommonFilter and state management */
  function updateCommonParams(params: CommonFilterParams) {
    // Need to refetch the list of games a team has played
    if (
      params.team != commonParams.team ||
      params.year != commonParams.year ||
      params.gender != commonParams.gender
    ) {
      if (params.team && params.year && params.gender) {
        setOpponentList([]);
        setGame("");
        fetchOpponents(params);
      }
    }
    setCommonParams(params);
  }

  const buildDateStr = (gameInfoObj: any) => {
    return (
      gameInfoObj?.game_info?.buckets?.[0]?.key_as_string || "????-??-??"
    ).substring(0, 10);
  };

  const buildScoreInfo = (gameInfoObj: any) => {
    const scoreInfoObj = gameInfoObj?.game_info?.buckets?.[0]?.end_of_game?.hits
      ?.hits?.[0]?._source?.score_info?.end || { scored: 0, allowed: 0 };

    return `${scoreInfoObj.scored > scoreInfoObj.allowed ? "W" : "L"} ${
      scoreInfoObj.scored
    }-${scoreInfoObj.allowed}`;
  };

  const buildMenuItem = (gameInfoObj: any) => {
    const oppoAndLocation = (gameInfoObj?.key || "Unknown")
      .replace(/^A:/, "@ ")
      .replace(/^H:/, "")
      .replace(/^N:/, "vs ");

    return `${oppoAndLocation} (${buildDateStr(gameInfoObj)}): ${buildScoreInfo(
      gameInfoObj
    )}`;
  };

  /** Makes an API call to elasticsearch to get the roster */
  const fetchOpponents = (params: CommonFilterParams) => {
    const { gender, year, team } = params;
    if (gender && year && team) {
      const genderYear = `${gender}_${year}`;
      const currentJsonEpoch = dataLastUpdated[genderYear] || -1;

      const query: CommonFilterParams = {
        gender: gender,
        year: year,
        team: team,
        baseQuery: "start_min:0",
        minRank: ParamDefaults.defaultMinRank,
        maxRank: ParamDefaults.defaultMaxRank,
      };
      const paramStr = QueryUtils.stringify(query);
      // Check if it's in the cache:
      const cachedJson = ClientRequestCache.decacheResponse(
        paramStr,
        ParamPrefixes.gameInfo,
        currentJsonEpoch,
        isDebug
      );
      if (cachedJson && !_.isEmpty(cachedJson)) {
        //(ignore placeholders here)
        setOpponentList(
          _.orderBy(
            cachedJson?.responses?.[0]?.aggregations?.game_info?.buckets || [],
            buildDateStr,
            "desc"
          )
        );
      } else {
        fetch(`/api/getGameInfo?${paramStr}`).then(function (
          response: fetch.IsomorphicResponse
        ) {
          response.json().then(function (json: any) {
            // Cache result locally:
            if (isDebug) {
              console.log(`CACHE_KEY=[${ParamPrefixes.lineup}${paramStr}]`);
              //(this is a bit chatty)
              //console.log(`CACHE_VAL=[${JSON.stringify(json)}]`);
            }
            if (response.ok) {
              //(never cache errors)
              ClientRequestCache.cacheResponse(
                paramStr,
                ParamPrefixes.gameInfo,
                json,
                currentJsonEpoch,
                isDebug
              );
            }
            setOpponentList(
              _.orderBy(
                json?.responses?.[0]?.aggregations?.game_info?.buckets || [],
                buildDateStr,
                "desc"
              )
            );
          });
        });
      }
    }
  };

  /** Builds a lineup filter from the various state elements, and also any secondary filters
   * NOTE: ugly hack I need to fix, needs to sync with CommonFilter.onSeeExample
   */
  function buildParamsFromState(
    includeFilterParams: Boolean
  ): [LineupFilterParams, FilterRequestInfo[]] {
    const oppoQueryInfo = buildOppoFilter(game);
    if (!oppoQueryInfo) {
      return [{}, []];
    }
    const shotChartEnabled =
      !commonParams.year ||
      commonParams.year >= DateUtils.firstYearWithShotChartData;

    const baseQueryA = `opponent.team:"${oppoQueryInfo.team}" AND date:(${oppoQueryInfo.dateStr})`;
    const baseQueryB = `opponent.team:"${team}" AND date:(${oppoQueryInfo.dateStr})`;

    const primaryRequestA: MatchupFilterParams = {
      ...commonParams,
      baseQuery: baseQueryA,

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
      team: oppoQueryInfo.team,
      baseQuery: baseQueryB,
    };
    //(another ugly hack to be fixed - remove default optional fields)
    QueryUtils.cleanseQuery(primaryRequestA);
    QueryUtils.cleanseQuery(primaryRequestB);

    const teamRequestA = {
      ...primaryRequestA,
      onQuery: primaryRequestA.baseQuery,
      offQuery: "",
      baseQuery: "",
    };
    const teamRequestB = {
      ...primaryRequestB,
      onQuery: primaryRequestB.baseQuery,
      offQuery: "",
      baseQuery: "",
    };

    const playersRequestA = {
      ...primaryRequestA,
      onQuery: "",
      offQuery: "",
    };
    const playersRequestB = {
      ...primaryRequestB,
      onQuery: "",
      offQuery: "",
    };

    const entireSeasonRequestA = {
      // Get the entire season of players for things like luck adjustments
      team: primaryRequestA.team,
      year: primaryRequestA.year,
      gender: primaryRequestA.gender,
      minRank: ParamDefaults.defaultMinRank,
      maxRank: ParamDefaults.defaultMaxRank,
      baseQuery: "",
      onQuery: "",
      offQuery: "",
    };
    const entireSeasonRequestB = {
      // Get the entire season of players for things like luck adjustments
      team: primaryRequestB.team,
      year: primaryRequestB.year,
      gender: primaryRequestB.gender,
      minRank: ParamDefaults.defaultMinRank,
      maxRank: ParamDefaults.defaultMaxRank,
      baseQuery: "",
      onQuery: "",
      offQuery: "",
    };

    // Display restriction mode:
    const restrictiveMode = !_.isNil(startingState.customDisplayMode);
    const restrictiveModePlayTypesFilter = new Set(
      _.includes(startingState.customDisplayMode, "playTypes")
        ? [
            "teamA_season",
            "teamB_season",
            "playersA",
            "playersB",
            "playersA_season",
            "playersB_season",
          ]
        : []
    );
    const restrictiveModeTeamStats = new Set(
      _.includes(startingState.customDisplayMode, "teamStats")
        ? ["teamA_season", "teamB_season"]
        : []
    );

    // New format, so duplicate primaryRequest and everything has a tag
    return [
      teamRequestA,
      [
        {
          tag: "teamA_season",
          context: ParamPrefixes.game as ParamPrefixesType,
          paramsObj: teamRequestA,
        },
        {
          tag: "lineupsA",
          context: ParamPrefixes.lineup as ParamPrefixesType,
          paramsObj: primaryRequestA,
        },
        {
          tag: "playersA",
          context: ParamPrefixes.player as ParamPrefixesType,
          paramsObj: playersRequestA,
          includeRoster: false,
        },
        {
          tag: "playersA_season",
          context: ParamPrefixes.player as ParamPrefixesType,
          paramsObj: entireSeasonRequestA,
          includeRoster: true,
        },
        {
          tag: "teamB_season",
          context: ParamPrefixes.game as ParamPrefixesType,
          paramsObj: teamRequestB,
        },
        {
          tag: "lineupsB",
          context: ParamPrefixes.lineup as ParamPrefixesType,
          paramsObj: primaryRequestB,
        },
        {
          tag: "playersB",
          context: ParamPrefixes.player as ParamPrefixesType,
          paramsObj: playersRequestB,
          includeRoster: false,
        },
        {
          tag: "playersB_season",
          context: ParamPrefixes.player as ParamPrefixesType,
          paramsObj: entireSeasonRequestB,
          includeRoster: true,
        },
        {
          tag: "game_lineupsA",
          context: ParamPrefixes.lineupStints as ParamPrefixesType,
          paramsObj: primaryRequestA,
          includeRoster: false,
        },
        {
          tag: "game_lineupsB",
          context: ParamPrefixes.lineupStints as ParamPrefixesType,
          paramsObj: primaryRequestB,
          includeRoster: false,
        },
      ]
        .filter((obj) => {
          if (!restrictiveMode) {
            return true;
          } else {
            return (
              restrictiveModePlayTypesFilter.has(obj.tag) ||
              restrictiveModeTeamStats.has(obj.tag)
            );
          }
        })
        .concat(
          shotChartEnabled && !restrictiveMode
            ? [
                {
                  tag: "game_shots", //TODO: need a game mode for this so that "def" is the opponent's off, with players tagged
                  context: ParamPrefixes.shots as ParamPrefixesType,
                  paramsObj: playersRequestA,
                },
                {
                  tag: "season_shotsA",
                  context: ParamPrefixes.shots as ParamPrefixesType,
                  paramsObj: entireSeasonRequestA,
                },
                {
                  tag: "season_shotsB",
                  context: ParamPrefixes.shots as ParamPrefixesType,
                  paramsObj: entireSeasonRequestB,
                },
              ]
            : []
        ),
    ];
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(jsonResps: Record<string, any>, wasError: Boolean) {
    const shotChartEnabled =
      !commonParams.year ||
      commonParams.year >= DateUtils.firstYearWithShotChartData;

    const jsonStatuses = _.mapValues(jsonResps, (j) => j.status);

    const lineupJsonA = jsonResps?.["lineupsA"]?.responses?.[0] || {};
    const teamJsonA = jsonResps?.["teamA_season"]?.responses?.[0] || {};
    const rosterStatsJsonA = jsonResps?.["playersA"]?.responses?.[0] || {};
    const globalRosterStatsJsonA =
      jsonResps?.["playersA_season"]?.responses?.[0] || rosterStatsJsonA;
    const globalTeamA =
      teamJsonA?.aggregations?.global?.only?.buckets?.team ||
      StatModels.emptyTeam();
    const rosterInfoA = jsonResps?.["playersA_season"]?.roster;
    globalTeamA.roster = rosterInfoA;

    const lineupJsonB = jsonResps?.["lineupsB"]?.responses?.[0] || {};
    const teamJsonB = jsonResps?.["teamB_season"]?.responses?.[0] || {};
    const rosterStatsJsonB = jsonResps?.["playersB"]?.responses?.[0] || {};
    const globalRosterStatsJsonB =
      jsonResps?.["playersB_season"]?.responses?.[0] || rosterStatsJsonB;
    const globalTeamB =
      teamJsonB?.aggregations?.global?.only?.buckets?.team ||
      StatModels.emptyTeam();
    const rosterInfoB = jsonResps?.["playersB_season"]?.roster;
    globalTeamB.roster = rosterInfoB;

    /** Combines player and team info for each minute */
    const buildLineupStint = (pp: any[]) => {
      const loadPlayer = (
        mutableLineupStint: LineupStintInfo,
        playerCode: PlayerCode,
        playerStatSet: any
      ) => {
        const playerInfo = _.find(
          mutableLineupStint.players,
          (p) => p.code == playerCode
        );
        if (playerInfo) {
          playerInfo.stats = playerStatSet as LineupStintTeamStats;
        }
      };
      return _.transform(
        pp,
        (acc, p) => {
          const newStartMin = _.isNumber(p.start_min) ? p.start_min : -2;

          if (p.player?.code && newStartMin != acc.startMin) {
            //stash:
            acc.playerStash[p.player?.code] = p.player_stats || {};
          } else if (p.player) {
            const currStint = _.last(acc.stints);
            if (currStint) {
              loadPlayer(currStint, p.player.code, p.player_stats || {});
            }
          } else {
            acc.startMin = newStartMin;
            acc.stints = acc.stints.concat([p as LineupStintInfo]);
            _.forEach(acc.playerStash, (val, key) => {
              loadPlayer(p as LineupStintInfo, key, val);
            });
          }
        },
        {
          stints: [] as LineupStintInfo[],
          startMin: -1,
          playerStash: {} as Record<string, any>,
        }
      ).stints;
    };

    const lineupStintsA: LineupStintInfo[] = buildLineupStint(
      (jsonResps?.["game_lineupsA"]?.responses?.[0]?.hits?.hits || []).map(
        (p: any) => p._source
      )
    );
    const lineupStintsB: LineupStintInfo[] = buildLineupStint(
      (jsonResps?.["game_lineupsB"]?.responses?.[0]?.hits?.hits || []).map(
        (p: any) => p._source
      )
    );

    const fromLineups = (lineupJson: any) => ({
      lineups: lineupJson?.aggregations?.lineups?.buckets,
      error_code: wasError
        ? lineupJson?.status || jsonStatuses?.["lineupsA"] || "Unknown"
        : undefined,
    });
    const fromTeam = (teamJson: any, globalTeam: any) => ({
      on:
        teamJson?.aggregations?.tri_filter?.buckets?.on ||
        StatModels.emptyTeam(),
      off: StatModels.emptyTeam(),
      onOffMode: true,
      baseline:
        teamJson?.aggregations?.tri_filter?.buckets?.baseline ||
        StatModels.emptyTeam(),
      global: globalTeam,
      error_code: wasError
        ? teamJson?.status || jsonStatuses?.["teamA_season"] || "Unknown"
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
          jsonStatuses?.["playersA_season"] ||
          "Unknown"
        : undefined,
    });
    onStats(
      fromLineups(lineupJsonA),
      fromTeam(teamJsonA, globalTeamA),
      fromRoster(rosterStatsJsonA, globalRosterStatsJsonA),
      fromLineups(lineupJsonB),
      fromTeam(teamJsonB, globalTeamB),
      fromRoster(rosterStatsJsonB, globalRosterStatsJsonB),
      lineupStintsA,
      lineupStintsB,
      shotChartEnabled
        ? {
            game: {
              off: jsonResps?.["game_shots"]?.responses?.[0]?.aggregations
                ?.tri_filter?.buckets?.baseline?.off_def?.buckets
                ?.off as ShotStats,
              def: jsonResps?.["game_shots"]?.responses?.[0]?.aggregations
                ?.tri_filter?.buckets?.baseline?.off_def?.buckets
                ?.def as ShotStats,
            },
            seasonA: {
              off: jsonResps?.["season_shotsA"]?.responses?.[0]?.aggregations
                ?.tri_filter?.buckets?.baseline?.off_def?.buckets
                ?.off as ShotStats,
              def: jsonResps?.["season_shotsA"]?.responses?.[0]?.aggregations
                ?.tri_filter?.buckets?.baseline?.off_def?.buckets
                ?.def as ShotStats,
            },
            seasonB: {
              off: jsonResps?.["season_shotsB"]?.responses?.[0]?.aggregations
                ?.tri_filter?.buckets?.baseline?.off_def?.buckets
                ?.off as ShotStats,
              def: jsonResps?.["season_shotsB"]?.responses?.[0]?.aggregations
                ?.tri_filter?.buckets?.baseline?.off_def?.buckets
                ?.def as ShotStats,
            },
          }
        : undefined
    );
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
    return game == "" ? { label: "Choose Game..." } : stringToOption(game);
  }

  // Link building
  const gameParams = (
    params: MatchupFilterParams,
    team: string,
    subFor?: string
  ): GameFilterParams => ({
    team,
    minRank: "1",
    maxRank: "400",
    gender: params.gender,
    year: params.year,
    onQuery: subFor
      ? (params.baseQuery || "").replace(`"${team}"`, `"${subFor}"`)
      : params.baseQuery,
    autoOffQuery: false,
    offQuery: undefined,
    baseQuery: "",
    showRoster: true,
    calcRapm: true,
    showTeamPlayTypes: true,
    rapmRegressMode: "0.8",
    showExpanded: true,
    teamShotCharts: true,
  });
  const lineupParams = (
    params: MatchupFilterParams,
    team: string,
    subFor?: string
  ): LineupFilterParams => ({
    team,
    minRank: "1",
    maxRank: "400",
    gender: params.gender,
    year: params.year,
    minPoss: "0",
    showRawPts: true,
    baseQuery: subFor
      ? (params.baseQuery || "").replace(`"${team}"`, `"${subFor}"`)
      : params.baseQuery,
  });

  return (
    <CommonFilter //(generic type inferred)
      startingState={startingState}
      onChangeState={onChangeState}
      onChangeCommonState={updateCommonParams}
      tablePrefix={ParamPrefixes.gameInfo}
      tablePrefixForPrimaryRequest={ParamPrefixes.game}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      matchupMode={"game"}
      blockSubmit={game == ""}
      buildLinks={(params) => {
        const opponentName = buildOppoFilter(params.oppoTeam || "")?.team;
        return params.team && opponentName
          ? [
              <a
                target="_blank"
                href={UrlRouting.getGameUrl(
                  gameParams(params, params.team),
                  {}
                )}
              >
                Team stats
              </a>,
              <a
                target="_blank"
                href={UrlRouting.getLineupUrl(
                  lineupParams(params, params.team),
                  {}
                )}
              >
                Team lineups
              </a>,
              <a
                target="_blank"
                href={UrlRouting.getGameUrl(
                  gameParams(params, opponentName, params.team),
                  {}
                )}
              >
                Opponent stats
              </a>,
              <a
                target="_blank"
                href={UrlRouting.getLineupUrl(
                  lineupParams(params, opponentName, params.team),
                  {}
                )}
              >
                Opponent lineups
              </a>,
            ]
          : [];
      }}
    >
      <GlobalKeypressManager.Consumer>
        {(globalKeypressHandler) => (
          <div>
            <Form.Group as={Row}>
              <Col xs={0} sm={0} md={0} lg={4} />
              <Col xs={12} sm={12} md={12} lg={6}>
                <Select
                  isClearable={false}
                  styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                  value={getCurrentTeamOrPlaceholder()}
                  options={opponentList.map((r) =>
                    stringToOption(buildMenuItem(r))
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

export default CustomMatchupFilter;
