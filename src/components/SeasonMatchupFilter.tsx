/**
 * Filter for Season Matchup Analyzer: gender/year/team only.
 * Fetches game list, builds 3 requests (team, player, lineup) with on/off/otherQueries,
 * parses responses into per-game array. No changes to existing components.
 */
import React, { useState, useEffect } from "react";
import _ from "lodash";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
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
import { GameInfoStatSet } from "../utils/StatModels";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { RequestUtils } from "../utils/RequestUtils";
import {
  buildGameRequestParams,
  buildGameLabel,
} from "../utils/SeasonMatchupUtils";

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
};

function bucketKeyForGameIndex(i: number): string {
  if (i === 0) return "on";
  if (i === 1) return "off";
  return `other_${i - 2}`;
}

export const SeasonMatchupFilter: React.FunctionComponent<Props> = ({
  onStats,
  startingState,
  onChangeState,
}) => {
  const [params, setParams] = useState<SeasonMatchupFilterParams>(startingState);
  const [games, setGames] = useState<GameInfoStatSet[]>([]);

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
  };

  function buildParamsFromState(
    _includeFilterParams: Boolean,
    _forQuery?: Boolean
  ): [GameFilterParams, FilterRequestInfo[]] {
    const { teamPlayerParams, lineupParams } = buildGameRequestParams(
      games,
      commonParams
    );
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
    return [teamPlayerParams, otherRequests];
  }

  function handleResponse(jsons: any[], _wasError: Boolean) {
    const teamJson = jsons?.[0]?.responses?.[0] || {};
    const playerJson = jsons?.[1]?.responses?.[0] || {};
    const lineupJson = jsons?.[2]?.responses?.[0] || {};

    const teamBuckets = teamJson?.aggregations?.tri_filter?.buckets || {};
    const playerBuckets = playerJson?.aggregations?.tri_filter?.buckets || {};
    const lineupBuckets = lineupJson?.aggregations?.other_queries?.buckets || {};

    const n = games.length;
    const perGame: SeasonMatchupPerGame[] = [];
    for (let i = 0; i < n; i++) {
      const tk = bucketKeyForGameIndex(i);
      const lk = `other_${i}`;
      const lineupBucket = lineupBuckets[lk] || {};
      const lineupBucketsList = lineupBucket.lineups?.buckets || [];
      perGame.push({
        gameLabel: buildGameLabel(games[i]),
        gameInfo: games[i],
        teamStats: teamBuckets[tk] || {},
        rosterStats: playerBuckets[tk]?.player?.buckets || [],
        lineupStats: { lineups: lineupBucketsList },
      });
    }
    onStats({ games: perGame });
  }

  return (
    <CommonFilter
      startingState={{ ...commonParams, ...params } as GameFilterParams}
      onChangeState={(p: GameFilterParams) =>
        onChangeState({
          team: p.team,
          year: p.year,
          gender: p.gender,
        })
      }
      onChangeCommonState={(common) =>
        setParams((prev) => ({ ...prev, ...common }))
      }
      tablePrefix={ParamPrefixes.game as ParamPrefixesType}
      tablePrefixForPrimaryRequest={ParamPrefixes.game as ParamPrefixesType}
      buildParamsFromState={buildParamsFromState}
      childHandleResponse={handleResponse}
      buildLinks={() => []}
      hideSemiAdvancedOptions={false}
    >
      <GlobalKeypressManager.Consumer>
        {() => (
          <Row className="mb-2">
            <Col>
              <Form.Text className="text-muted">
                Season Matchup: select team, year, and gender, then Submit to load
                per-game stats. {games.length > 0 && `${games.length} games loaded.`}
              </Form.Text>
            </Col>
          </Row>
        )}
      </GlobalKeypressManager.Consumer>
    </CommonFilter>
  );
};

export default SeasonMatchupFilter;
