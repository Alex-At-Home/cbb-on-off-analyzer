import _ from "lodash";

import {
  CommonFilterParams,
  GameFilterParams,
  QueryWithFilters,
} from "../FilterModels";
import { QueryUtils } from "../QueryUtils";
import { buildQueryFiltersBoolArray } from "./commonTeamQuery";

/**
 * Builds the named filter object for otherQueries (other_0, other_1, ...) for use in a filters aggregation.
 */
export function buildOtherQueryFilters(
  baselineQueryIn: string | undefined,
  commonParams: CommonFilterParams,
  otherQueries: QueryWithFilters[] | undefined,
  lastDate: number,
  opponentMode: boolean = false,
): Record<string, any> {
  const baselineQuery =
    baselineQueryIn ??
    QueryUtils.basicOrAdvancedQuery(commonParams.baseQuery, "*");

  return _.isEmpty(otherQueries ?? [])
    ? {}
    : _.chain(otherQueries)
        .map((queryInfo, index) => {
          return [
            `other_${index}`,
            buildQueryAndFilter(
              baselineQuery,
              queryInfo.query,
              queryInfo.queryFilters,
              commonParams,
              lastDate,
              opponentMode,
            ),
          ];
        })
        .fromPairs()
        .value();
}

/** Creates a simple query element for on/off and lineup query elements */
const buildQueryAndFilter = (
  baselineQuery: string,
  queryStr: string | undefined,
  queryFilterStr: string | undefined,
  commonParams: CommonFilterParams,
  lastDate: number,
  opponentMode: boolean = false,
) => {
  const fallbackQuery = queryFilterStr ? "*" : "NOT *"; //(if any filters are specified need fallbackQuery to always be true inside the AND)
  const query = {
    //(note: ignored in the autoOff case)
    query_string: {
      query: `(${QueryUtils.basicOrAdvancedQuery(
        queryStr,
        fallbackQuery,
      )}) AND (${baselineQuery})`,
    },
  };
  if (queryFilterStr) {
    //(not auto-off mode)
    return {
      bool: {
        must: _.flatten([
          [query],
          buildQueryFiltersBoolArray(
            queryFilterStr,
            commonParams.gender,
            commonParams.year,
            lastDate,
            opponentMode,
          ),
        ] as any[]),
        must_not: [],
      },
    };
  } else {
    return query as any;
  }
};

/** For player / team on-off - builds the ES query from the logical-ish object */
export const commonOnOffBaseQuery = function (
  params: GameFilterParams,
  lastDate: number,
  opponentMode: boolean = false,
) {
  const baselineQuery = QueryUtils.basicOrAdvancedQuery(params.baseQuery, "*");

  /** buildQueryAndFilter But with an exception for auto-off cases */
  const buildQueryAndFilterIncAutoOff = (
    queryStr: string | undefined,
    queryFilterStr: string | undefined,
    offAndAutoOff: boolean,
  ) => {
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
                    "NOT *",
                  )}`, //(the clause is an OR, so an empty query needs to return false)
                },
              },
            ],
            buildQueryFiltersBoolArray(
              params.onQueryFilters,
              params.gender,
              params.year,
              lastDate,
              opponentMode,
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
    } else {
      return buildQueryAndFilter(
        baselineQuery,
        queryStr,
        queryFilterStr,
        params,
        lastDate,
        opponentMode,
      );
    }
  };

  return {
    filters: {
      off: buildQueryAndFilterIncAutoOff(
        params.offQuery,
        params.autoOffQuery ? undefined : params.offQueryFilters,
        params.autoOffQuery || false,
      ),
      on: buildQueryAndFilterIncAutoOff(
        params.onQuery,
        params.onQueryFilters,
        false,
      ),
      baseline: {
        query_string: {
          query: baselineQuery,
        },
      },
      ...buildOtherQueryFilters(
        baselineQuery,
        params,
        params.otherQueries,
        lastDate,
        opponentMode,
      ),
    },
  };
};
