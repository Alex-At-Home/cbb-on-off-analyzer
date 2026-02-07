import { commonRuntimeMappings } from "./commonRuntimeMappings";
import { commonTeamQuery } from "./commonTeamQuery";
import { timeBinAggregations } from "./timeBinAggregations";
import { QueryUtils } from "../QueryUtils";
import { CommonFilterParams } from "../FilterModels";

/**
 * Query template for aggregating lineup stints into time bins.
 *
 * Takes a multi-game query and returns stats aggregated into 1-minute bins,
 * with each stint's contribution weighted by how much of the bin it covers.
 *
 * For a stint of N minutes covering a 1-minute bin:
 * - If the bin is entirely enclosed: weight = 1/N
 * - If only x (<1) mins overlap: weight = x/N
 */
export const lineupStintsByTimeQuery = function (
  params: CommonFilterParams,
  lastDate: number,
  publicEfficiency: any,
  lookup: any,
  avgEfficiency: number,
  hca: number,
  numBins: number = 40,
  lineupIndex?: string,
  playerEventsIndex?: string
) {
  return {
    ...commonRuntimeMappings(params, lastDate, publicEfficiency, lookup),
    _source: {
      includes: [],
      excludes: ["agent", "host", "log", "ecs"],
    },
    size: 0, // We only want aggregations, not raw documents
    query: {
      bool: {
        filter: [],
        minimum_should_match: 0,
        should: [],
        must_not: [],
        must: [
          commonTeamQuery(params, lastDate, publicEfficiency, lookup),
          {
            query_string: {
              query: `${QueryUtils.basicOrAdvancedQuery(
                params.baseQuery,
                "*"
              )}`,
            },
          },
        ],
      },
    },
    aggregations: timeBinAggregations(numBins, lineupIndex, playerEventsIndex),
  };
};
