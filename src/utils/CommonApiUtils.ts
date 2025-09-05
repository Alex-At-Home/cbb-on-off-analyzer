// System imports
import { NextApiResponse } from "next";
import fetch from "isomorphic-unfetch";
import _ from "lodash";
import LRUCache from "lru-cache";

// Application imports
import { AvailableTeams } from "./internal-data/AvailableTeams";
import { efficiencyInfo } from "./internal-data/efficiencyInfo";
import {
  efficiencyLookup,
  formatEfficiencyLookupResponse,
} from "./es-queries/efficiencyLookup";
import { efficiencyAverages } from "./public-data/efficiencyAverages";
import { ncaaToEfficiencyLookup } from "./public-data/ncaaToEfficiencyLookup";
import { ServerRequestCache } from "./ServerRequestCache";
import { dataLastUpdated } from "./internal-data/dataLastUpdated";
import { ParamDefaults, CommonFilterParams } from "./FilterModels";
import { QueryUtils } from "./QueryUtils";

const pxIsDebug = process.env.NODE_ENV !== "production";

/** Run node with "USE_TEST_INDICES" to hit the test indices */
const pxUseTestIndices = pxIsDebug && process.env.USE_TEST_INDICES === "true";

if (pxIsDebug) {
  console.log(`Use test indices = [${pxUseTestIndices}]`);
}

export class CommonApiUtils {
  private static efficiencyCache = new LRUCache<string, Record<string, any>>({
    max: 20, //20 years of data (but only implemented for current year so far)
    maxAge: 24 * 3600 * 1000, //(in ms, 24h cache before age out)
  });

  /** Encodes the auth header */
  static authHeader =
    "Basic " +
    Buffer.from(
      `${process.env.CLUSTER_USER}:${process.env.CLUSTER_PASS}`
    ).toString("base64");

  /** Retrieve and cache the current men's efficiency */
  static async buildCurrentEfficiency(
    cacheKey: string,
    year: string,
    gender: string,
    nameLookup: Record<string, Record<string, string>>
  ) {
    console.log(
      `Refreshing efficiency cache for gender=[${gender}] year=[${year}]`
    );

    const index = gender == "Women" ? "massey_all" : "kenpom_all";

    const effFetch = await fetch(`${process.env.CLUSTER_ID}/${index}/_search`, {
      method: "post",
      body: JSON.stringify(efficiencyLookup(year, nameLookup)),
      headers: {
        "Content-Type": "application/json",
        Authorization: CommonApiUtils.authHeader,
      },
    });
    const transform = (x: any) => {
      const toRet = formatEfficiencyLookupResponse(x || {}, year);
      return toRet;
    };
    const bodyJson = await effFetch.json();
    const toCache = transform(bodyJson);

    CommonApiUtils.efficiencyCache.set(cacheKey, toCache);
    return toCache;
  }

  static getHca(params: CommonFilterParams) {
    if (_.startsWith(params.year, "2020")) {
      return 1.0; //no crowds so nerfing 2020/21 HCA
    } else {
      return 1.5;
    }
  }

  /** Return a cached response to the front-end */
  static commonOnCacheHit(cacheJson: any, res: NextApiResponse) {
    res.status(200).json(cacheJson);
  }

  /** Return a 404 if the request is invalid */
  static commonOnTeamNotFound(res: NextApiResponse) {
    res.status(404).json({});
  }

  /** Return a 500 if the response is invalid */
  static commonOnRequestError(res: NextApiResponse) {
    res.status(500).json({});
  }

  /** Launches the API request */
  static async commonMakeRequest(
    body: string
  ): Promise<[boolean, number, any]> {
    const esFetch = await fetch(`${process.env.CLUSTER_ID}/_msearch`, {
      method: "post",
      body: body,
      headers: { "Content-Type": "application/x-ndjson" },
    });

    const esFetchJson = await esFetch.json();

    return [esFetch.ok, esFetch.status, esFetchJson];
  }

  /** Returns the valid response */
  static commonOnResponse(
    status: number,
    responseBody: any,
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
      index: string,
      genderPrefix: string,
      params: Record<string, any>,
      currentJsonEpoch: number,
      efficiency: Record<string, any>,
      lookup: Record<string, any>,
      avgEfficiency: number
    ) => string,
    /** index pattern, apart from gender prefix (doesn't support efficiency/lookup/avgEfficiency)  */
    indexPatternOverride?: string,
    // Defaults:
    isDebug: boolean = pxIsDebug,
    useTestIndices: boolean = pxUseTestIndices,
    makeRequest: (
      body: string
    ) => Promise<[boolean, number, any]> = CommonApiUtils.commonMakeRequest,
    onCacheHit: (
      cacheJson: any,
      res: NextApiResponse
    ) => void = CommonApiUtils.commonOnCacheHit,
    onTeamNotFound: (
      res: NextApiResponse
    ) => void = CommonApiUtils.commonOnTeamNotFound,
    onRequestError: (
      res: NextApiResponse
    ) => void = CommonApiUtils.commonOnRequestError,
    onResponse: (
      status: number,
      response: any,
      res: NextApiResponse
    ) => void = CommonApiUtils.commonOnResponse
  ) {
    const params = QueryUtils.parse(urlQuery);

    const gender = params.gender || ParamDefaults.defaultGender;
    const year = params.year || ParamDefaults.defaultYear;

    const currentJsonEpoch = dataLastUpdated[`${gender}_${year}`] || -1;
    const maybeCacheJson = ServerRequestCache.decacheResponse(
      urlQuery,
      queryPrefix,
      currentJsonEpoch,
      isDebug
    );

    if (maybeCacheJson) {
      onCacheHit(maybeCacheJson, resHandle);
    } else {
      const body = await _.thru(indexPatternOverride, async () => {
        if (indexPatternOverride) {
          const genderPrefix = `${gender}_`.toLowerCase();

          return getBody(
            indexPatternOverride,
            genderPrefix,
            params,
            currentJsonEpoch,
            {},
            {},
            0
          );
        } else {
          const team =
            params.team && params.year && params.gender
              ? AvailableTeams.getTeam(
                  //(params is string|string[], so toString is needed for type safety)
                  params.team.toString(),
                  params.year.toString(),
                  params.gender.toString()
                ) || { index_template: null, year: null }
              : null;

          // The efficiency is either stored in the project or retrieved on the fly from the ES store
          const genderYearKey = `${params.gender}_${params.year}`;
          const [tmpEfficiency, lookup] = efficiencyInfo[genderYearKey] || [
            undefined,
            {},
          ];
          const getEfficiency = async () => {
            const lookupForQuery = ncaaToEfficiencyLookup[genderYearKey];
            if (!_.isUndefined(lookupForQuery)) {
              const cachedEff =
                CommonApiUtils.efficiencyCache.get(genderYearKey);
              if (cachedEff) {
                return cachedEff;
              } else {
                const year =
                  parseInt((params.year as string).substring(0, 4)) + 1; //(KP uses final year of season)
                const newEff = await CommonApiUtils.buildCurrentEfficiency(
                  genderYearKey,
                  year.toString(),
                  gender,
                  lookupForQuery
                );
                return newEff;
              }
            } else {
              //(the data is not available in the ES store, so this just falls through to having no efficiency stats)
              return {};
            }
          };
          const efficiency = tmpEfficiency
            ? tmpEfficiency
            : await getEfficiency();

          const avgEfficiency =
            efficiencyAverages[`${params.gender}_${params.year}`] ||
            efficiencyAverages.fallback;

          if (team == null) {
            return null;
          } else {
            const yearStr = (team.year || params.year || "xxxx").substring(
              0,
              4
            );
            const index =
              (team.index_template || AvailableTeams.defaultConfIndex) +
              "_" +
              yearStr +
              (useTestIndices ? "_ltest" : "");

            //(women is the suffix for index, so only need to add for men)
            const genderPrefix = (
              gender == "Women" ? "" : `${gender}_` || ""
            ).toLowerCase();

            // Use this to get all conference data:
            //const allConfsIndex = `*_${(team.year || params.year || "xxxx").substring(0, 4)},-women*,-player*,-bad*,-kenpom*,-shot*`;

            return getBody(
              index,
              //allConfsIndex,
              genderPrefix,
              params,
              currentJsonEpoch,
              efficiency,
              lookup,
              avgEfficiency
            );
          }
        }
      });

      if (body == null) {
        onTeamNotFound(resHandle);
      } else {
        try {
          const startTimeMs = new Date().getTime();
          const [esFetchOk, esFetchStatus, esFetchJson] = await makeRequest(
            body
          );

          // Debug logs:
          //console.log(JSON.stringify(body, null, 3));
          //console.log(JSON.stringify(esFetchJson, null, 3));
          //console.log(JSON.stringify(esFetchJson?.responses?.[0], null, 3));
          //console.log(JSON.stringify(esFetchJson?.responses?.[2]?.aggregations?.tri_filter?.buckets?.baseline?.player?.buckets, null, 3));
          //console.log(esFetch.status);
          //console.log(JSON.stringify(esFetchJson?.responses?.[0]?.hits, null, 3));

          const jsonToUse = esFetchOk
            ? esFetchJson
            : { error: { reason: "unknown" }, status_code: "" + esFetchStatus };

          if (esFetchOk) {
            // only cache if resposne was OK
            ServerRequestCache.cacheResponse(
              urlQuery,
              queryPrefix,
              esFetchJson,
              currentJsonEpoch,
              isDebug
            );
          }
          const totalTimeMs = new Date().getTime() - startTimeMs;
          if (pxIsDebug || totalTimeMs > 1000) {
            console.log(
              `Took [${totalTimeMs}]ms to request [${queryPrefix}][${urlQuery}]`
            );
          }
          onResponse(esFetchStatus, esFetchJson, resHandle);
        } catch (err: unknown) {
          console.log(
            `Error parsing response [${
              err instanceof Error ? err.message : err
            }]`
          );
          onRequestError(resHandle);
        }
      }
    }
  }

  /** Efficiently minimizes the size of the JSON representation of Efficiency depending on use */
  static efficiencyReplacer = () => {
    let kp_type: string | undefined = undefined; // (kp_filter, kp_off_sos, kp_def_sos)
    let kp_ptr: any = undefined; //(so we know when we're done)

    // IMPORTANT: ONLY KP_INFO IS NOW USED, WILL REMOVE THE OTHERS AFTER A RESPECTFUL PERIOD!
    // (because of runtime fields I can now calc all the values I want at the top)

    return function (this: any, key: string, value: any) {
      if (
        key == "kp_opp" ||
        key == "kp_off" ||
        key == "kp_def" ||
        key == "kp_3p" ||
        key == "kp_info"
      ) {
        kp_ptr = value;
        kp_type = key;
        return value;
      } else {
        //(this is set to the parent object per stringify.docs)
        if (this == kp_ptr) {
          // Everything key under one of these is [team_name]: { stats }
          if ("kp_info" == kp_type) {
            return {
              "stats.adj_margin.rank": value?.["stats.adj_margin.rank"],
              conf: value?.["conf"],
              is_high_major: value?.["is_high_major"],
              "stats.adj_off.rank": value?.["stats.adj_off.rank"],
              "stats.adj_def.rank": value?.["stats.adj_def.rank"],
              "stats.adj_off.value": value?.["stats.adj_off.value"],
              "stats.adj_def.value": value?.["stats.adj_def.value"],
              "stats.off._3p_pct.value": value?.["stats.off._3p_pct.value"],
            };
          } else if ("kp_opp" == kp_type) {
            return {
              "stats.adj_margin.rank": value?.["stats.adj_margin.rank"],
              conf: value?.["conf"],
            };
          } else if ("kp_def" == kp_type) {
            return {
              "stats.adj_def.value": value?.["stats.adj_def.value"],
            };
          } else if ("kp_off" == kp_type) {
            return {
              "stats.adj_off.value": value?.["stats.adj_off.value"],
            };
          } else if ("kp_3p" == kp_type) {
            return {
              "stats.off._3p_pct.value": value?.["stats.off._3p_pct.value"],
            };
          }
        } else {
          //(don't need to unset the ptr, since will be ignored)
          return value;
        }
      }
    };
  };
}
