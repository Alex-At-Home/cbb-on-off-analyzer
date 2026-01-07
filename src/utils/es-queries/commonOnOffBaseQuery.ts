import _ from "lodash";

import { GameFilterParams } from "../FilterModels";
import { QueryUtils } from "../QueryUtils";
import { buildQueryFiltersBoolArray } from "./commonTeamQuery";

export const commonOnOffBaseQuery = function (
  params: GameFilterParams,
  lastDate: number,
  opponentMode: boolean = false
) {
  const baselineQuery = QueryUtils.basicOrAdvancedQuery(params.baseQuery, "*");

  const buildQueryAndFilter = (
    queryStr: string | undefined,
    queryFilterStr: string | undefined,
    offAndAutoOff: boolean
  ) => {
    const fallbackQuery = queryFilterStr ? "*" : "NOT *"; //(if any filters are specified need fallbackQuery to always be true inside the AND)
    const query = {
      //(note: ignored in the autoOff case)
      query_string: {
        query: `(${QueryUtils.basicOrAdvancedQuery(
          queryStr,
          fallbackQuery
        )}) AND (${baselineQuery})`,
      },
    };
    if (offAndAutoOff && params.onQueryFilters) {
      return {
        bool: {
          must: [
            {
              //Decompose the 2 queries, since the off-specific one is combined with the query filters' negations
              query_string: {
                query: `${baselineQuery}`,
              },
            },
          ],
          should: _.flatten([
            [
              {
                query_string: {
                  query: `${QueryUtils.basicOrAdvancedQuery(
                    queryStr,
                    "NOT *"
                  )}`, //(the clause is an OR, so an empty query needs to return false)
                },
              },
            ],
            buildQueryFiltersBoolArray(
              params.onQueryFilters,
              params.gender,
              params.year,
              lastDate,
              opponentMode
            ).map((clause) => {
              return {
                bool: {
                  must_not: [clause],
                },
              };
            }),
          ] as any[]),
          minimum_should_match: 1,
        },
      };
    } else if (queryFilterStr) {
      //(not auto-off mode)
      return {
        bool: {
          must: _.flatten([
            [query],
            buildQueryFiltersBoolArray(
              queryFilterStr,
              params.gender,
              params.year,
              lastDate,
              opponentMode
            ),
          ] as any[]),
          must_not: [],
        },
      };
    } else {
      return query as any;
    }
  };

  return {
    filters: {
      off: buildQueryAndFilter(
        params.offQuery,
        params.autoOffQuery ? undefined : params.offQueryFilters,
        params.autoOffQuery || false
      ),
      on: buildQueryAndFilter(params.onQuery, params.onQueryFilters, false),
      baseline: {
        query_string: {
          query: baselineQuery,
        },
      },
      ...(_.isEmpty(params.otherQueries)
        ? {}
        : _.chain(params.otherQueries)
            .map((queryInfo, index) => {
              return [
                `other_${index}`,
                buildQueryAndFilter(
                  queryInfo.query,
                  queryInfo.queryFilters,
                  false
                ),
              ];
            })
            .fromPairs()
            .value()),
    },
  };
};
