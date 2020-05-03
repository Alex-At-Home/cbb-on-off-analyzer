
// System imports
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'isomorphic-unfetch';

// Application imports
import { teamStatsQuery } from "./es-queries/teamStatsQueryTemplate";
import { rosterCompareQuery } from "./es-queries/rosterCompareQueryTemplate";
import { playerStatsQuery } from "./es-queries/playerStatsQueryTemplate";
import { AvailableTeams } from './internal-data/AvailableTeams';
import { efficiencyInfo } from './internal-data/efficiencyInfo';
import { efficiencyAverages } from './public-data/efficiencyAverages';
import { ServerRequestCache } from './ServerRequestCache';
import { dataLastUpdated } from './internal-data/dataLastUpdated';
import { ParamPrefixes, ParamDefaults, GameFilterParams } from './FilterModels';
import { QueryUtils } from "./QueryUtils";

const pxIsDebug = (process.env.NODE_ENV !== 'production');

/** Run node with "USE_TEST_INDICES" to hit the test indices */
const pxUseTestIndices = pxIsDebug && (process.env.USE_TEST_INDICES === 'true');

if (pxIsDebug) {
  console.log(`Use test indices = [${pxUseTestIndices}]`);
}

export class CommonApiUtils {

  /** Return a cached response to the front-end */
  static commonOnCacheHit(
    cacheJson: any, res: NextApiResponse
  ) {
    res.status(200).json(cacheJson);
  }

  /** Return a 404 if the request is invalid */
  static commonOnTeamNotFound(
    res: NextApiResponse
  ) {
    res.status(404).json({});
  }

  /** Return a 500 if the response is invalid */
  static commonOnRequestError(
    res: NextApiResponse
  ) {
    res.status(500).json({});
  }

  /** Launches the API request */
  static async commonMakeRequest(
    body: string
  ): Promise<[ boolean, number, any ]> {
    const esFetch = await fetch(`${process.env.CLUSTER_ID}/_msearch`, {
            method: 'post',
            body:    body,
            headers: { 'Content-Type': 'application/x-ndjson' },
        });

    const esFetchJson = await esFetch.json();

    return [ esFetch.ok, esFetch.status, esFetchJson ];
  }

  /** Returns the valid response */
  static commonOnResponse(
    status: number, responseBody: any,
    res: NextApiResponse
  ) {
    res.status(status).json(responseBody);
  }

  /** Completely generic business logic for marshalling the request */
  static async handleRequest(
    resHandle: NextApiResponse, //(treat this as opaque)
    queryPrefix: string,
    urlQuery: string,
    getBody: (
      index: string, genderPrefix: string, params: Record<string, any>,
      currentJsonEpoch: number, efficiency: Record<string, any>, lookup: Record<string, any>,
      avgEfficiency: number
    ) => string,
    // Defaults:
    isDebug: boolean = pxIsDebug,
    useTestIndices: boolean = pxUseTestIndices,
    makeRequest: (body: string) => Promise<[ boolean, number, any ]> = CommonApiUtils.commonMakeRequest,
    onCacheHit: (cacheJson: any, res: NextApiResponse) => void = CommonApiUtils.commonOnCacheHit,
    onTeamNotFound: (res: NextApiResponse) => void = CommonApiUtils.commonOnTeamNotFound,
    onRequestError: (res: NextApiResponse) => void = CommonApiUtils.commonOnRequestError,
    onResponse: (status: number, response: any, res: NextApiResponse) => void = CommonApiUtils.commonOnResponse
  ) {
    const params = QueryUtils.parse(urlQuery);

    const gender = params.gender || ParamDefaults.defaultGender;
    const year = params.year || ParamDefaults.defaultYear;

    const currentJsonEpoch = dataLastUpdated[`${gender}_${year}`] || -1;
    const maybeCacheJson = ServerRequestCache.decacheResponse(urlQuery, queryPrefix, currentJsonEpoch, isDebug);

    if (maybeCacheJson) {
      onCacheHit(maybeCacheJson, resHandle);
    } else {
      const team =
        (params.team && params.year && params.gender) ?
        AvailableTeams.getTeam( //(params is string|string[], so toString is needed for type safety)
            params.team.toString(), params.year.toString(), params.gender.toString()
        ) || { index_template: null, year: null }:
        null;

      const [ efficiency, lookup ] = efficiencyInfo[`${params.gender}_${params.year}`] || [ {}, {} ];
      const avgEfficiency = efficiencyAverages[`${params.gender}_${params.year}`] || efficiencyAverages.fallback;

      if (team == null) {
        onTeamNotFound(resHandle);
      } else {
        const index = (team.index_template || AvailableTeams.defaultConfIndex) + "_" +
                        (team.year || params.year || "xxxx").substring(0, 4) + (useTestIndices ? "_ltest" : "");

        //(women is the suffix for index, so only need to add for men)
        const genderPrefix = (gender == "Women" ? "" : (`${gender}_` || "")).toLowerCase();

        const body = getBody(
          index, genderPrefix, params, currentJsonEpoch, efficiency, lookup, avgEfficiency
        );

        try {
          const [ esFetchOk, esFetchStatus, esFetchJson ] = await makeRequest(body);

          // Debug logs:
          /**/
          //console.log(JSON.stringify(esFetchJson, null, 3));
          //console.log(JSON.stringify(esFetchJson?.responses?.[0], null, 3));
          //console.log(JSON.stringify(esFetchJson?.responses?.[2]?.aggregations?.tri_filter?.buckets?.baseline?.player?.buckets, null, 3));
          //console.log(esFetch.status);

          const jsonToUse = esFetchOk ?
            esFetchJson :
            { error: { reason: "unknown" }, status_code: "" + esFetchStatus }

          if (esFetchOk) { // only cache if resposne was OK
             ServerRequestCache.cacheResponse(
               urlQuery, queryPrefix, esFetchJson, currentJsonEpoch, isDebug
             );
          }
          onResponse(esFetchStatus, esFetchJson, resHandle);

        } catch (e) {
          console.log(`Error parsing response [${e.message}]`);
          onRequestError(resHandle);
        }
      }
    }

  }

}
