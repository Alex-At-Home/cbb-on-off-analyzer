import _ from "lodash";

// Internal components:
import {
  ParamPrefixes,
  ParamPrefixesType,
  FilterParamsType,
  FilterRequestInfo,
  CommonFilterParams,
  ParamDefaults,
  GameFilterParams,
} from "./FilterModels";
import { QueryUtils } from "./QueryUtils";
import { ClientRequestCache } from "./ClientRequestCache";
import { AvailableTeams } from "./internal-data/AvailableTeams";

// Library imports:
import fetch from "isomorphic-unfetch";
import { GameInfoStatSet, IndivStatSet } from "./StatModels";
import { LineupUtils } from "./stats/LineupUtils";

const debugLogResponses = false;

/** Some pages require different requests.
    Eg get me lineups but also individual/team requests with and without the filter
    We're going to keep this simple by treating them as separate API calls
    to the server, and then stitch them back together again
*/
export class RequestUtils {
  /** Whether any of the queries returned an error - we'll treat them all as errors if so */
  static isResponseError(resp: any): boolean {
    const isGlobalError = Object.keys(resp?.error || {}).length > 0;
    const isLocalError =
      _.some(
        (resp?.responses || []).map(
          (r: any) => Object.keys(r?.error || {}).length > 0
        )
      ) || false;

    return isGlobalError || isLocalError;
  }

  /** Handles the rather ugly URL conversion needed to fetch URL encoded files
   * highlights: spaces become +, use strict encoding, and % gets re-encoded as 25
   */
  static fixRosterUrl(str: string): string {
    const stage1 = encodeURIComponent(str)
      .replace(/[%]/g, "%25")
      // ^ some char like & are encoded, others like () aren't
      //   apart from "." they are all encoded on file (" " is encoded on file as)
      //   So first we pre-encode
      .replace(/[!'()*]/g, function (c) {
        return "%25" + c.charCodeAt(0).toString(16); //(handles chars encoded on file but not encodeURIComponent)
      })
      .replace(/[%]2520/g, "%2B"); //(encoded as + in filename, which needs to be URL encoded since + == " " in URL)

    return stage1;
  }
  /** Handles the rather ugly URL conversion needed to fetch URL encoded files
   * highlights: spaces become +, use strict encoding, and % gets re-encoded as 25
   */
  static fixLocalhostRosterUrl(
    str: string,
    encodeEncodePrefix: boolean
  ): string {
    const stage1 = encodeURIComponent(str)
      // Handle characters that are not/mis-encoded by encodeURIComponent (note & is fine, . not encoded)
      .replace(/%20/g, "+")
      .replace(/[(]/g, "%28")
      .replace(/[)]/g, "%29")
      .replace(/'/g, "%27");
    return encodeEncodePrefix ? stage1.replace(/[%]/g, "%25") : stage1;
  }
  static mutateRosterJsonForWomen(json: any, gender: string | undefined) {
    if (json && gender == "Women") {
      // Remove height_in because all the fns that use it are trained on men
      _.chain(json)
        .mapValues((rosterEntry) => {
          delete rosterEntry.height_in;
        })
        .value();
    }
  }

  /** An easily test abstraction for requesting multiple objects from the server */
  static requestHandlingLogic(
    primaryRequest: FilterParamsType,
    primaryContext: ParamPrefixesType,
    otherRequests: FilterRequestInfo[],
    fetchPromiseFactory: (
      url: string,
      force: boolean
    ) => Promise<[any, boolean, fetch.IsomorphicResponse]>,
    currentJsonEpoch: number,
    isDebug: boolean
  ): Promise<any>[] {
    return RequestUtils.buildRequestList(
      primaryRequest,
      primaryContext,
      otherRequests
    ).map((req: FilterRequestInfo, index: number) => {
      // Mutate req for teams with changing names over years:
      const teamToCheck =
        req.paramsObj?.team && req.paramsObj?.year && req.paramsObj?.gender
          ? AvailableTeams.getTeam(
              req.paramsObj?.team,
              req.paramsObj?.year,
              req.paramsObj?.gender
            )
          : null;

      const newParamsStr = QueryUtils.stringify(req.paramsObj);

      if (isDebug) {
        console.log(
          `Looking for cache entry for [${index}][${req.context}][${newParamsStr}]`
        );
      }

      // Check if it's in the cache:
      const cachedJson = ClientRequestCache.decacheResponse(
        newParamsStr,
        req.context,
        currentJsonEpoch,
        isDebug
      );
      const jsonExistsButEmpty = !_.isNil(cachedJson) && _.isEmpty(cachedJson);

      if (cachedJson && !jsonExistsButEmpty) {
        //(ignore placeholders here)
        return Promise.resolve(cachedJson);
      } else {
        const startTimeMs = new Date().getTime();
        const fetchPromise = fetchPromiseFactory(
          RequestUtils.requestContextToUrl(req.context, newParamsStr),
          jsonExistsButEmpty
        );

        // Fetch the JSON from the CDN if requested
        const fetchRosterJson = () => {
          const rosterJsonUri = () =>
            `/rosters/${req.paramsObj.gender}_${(
              req.paramsObj.year || ""
            ).substring(0, 4)}` +
            `/${RequestUtils.fixRosterUrl(req.paramsObj.team || "")}.json`;

          if (isDebug) {
            console.log(`Attaching roster from ${rosterJsonUri()}`);
          }

          return fetch(rosterJsonUri()).then((resp: any) => resp.json());
        };
        const rosterJsonPromise = req.includeRoster
          ? fetchRosterJson().catch((err: any) => undefined)
          : Promise.resolve(undefined);
        return rosterJsonPromise.then((rosterJson: any) => {
          return fetchPromise.then(function (
            jsonResp: [any, boolean, fetch.IsomorphicResponse | undefined]
          ) {
            const json = jsonResp[0];
            const respOk = jsonResp[1];
            const response = jsonResp[2]; //(just for debugging hence can be undefined)

            // Inject the roster into the cacheable object
            if (rosterJson) {
              RequestUtils.mutateRosterJsonForWomen(
                rosterJson,
                req.paramsObj.gender
              );
              json.roster = rosterJson;
            }

            // Cache result locally:
            if (isDebug) {
              console.log(
                `CACHE_KEY[${index}]=[${req.context}${newParamsStr}]`
              );
              if (debugLogResponses) {
                console.log(`CACHE_VAL[${index}]=[${JSON.stringify(json)}]`);
              } else {
                console.log(
                  `CACHE_VAL[${index}]=[${JSON.stringify(json).length}]B`
                );
              }
              const totalTimeMs = new Date().getTime() - startTimeMs;
              console.log(`TOOK[${index}]=[${totalTimeMs}]ms`);
            }
            if (respOk && !RequestUtils.isResponseError(json)) {
              //(never cache errors)
              ClientRequestCache.cacheResponse(
                newParamsStr,
                req.context,
                json,
                currentJsonEpoch,
                isDebug
              );
            } else if (isDebug) {
              console.log(
                `[${index}] Response error: ok=[${respOk}] ok_from_obj=[${!RequestUtils.isResponseError(
                  json
                )}] status=[${response?.status}] keys=[${Object.keys(
                  response || {}
                )}]`
              );
            }
            return json;
          });
        });
      }
    });
  }

  /** Switch from one of the request types to the URL */
  static requestContextToUrl(
    context: ParamPrefixesType,
    paramStr: string
  ): string {
    switch (context) {
      case ParamPrefixes.game:
        return `/api/calculateOnOffStats?${paramStr}`;
      case ParamPrefixes.shots:
        return `/api/calculateShotStats?${paramStr}`;
      case ParamPrefixes.lineup:
        return `/api/calculateLineupStats?${paramStr}`;
      case ParamPrefixes.lineupStints:
        return `/api/calculateLineupStints?${paramStr}`;
      case ParamPrefixes.report:
        return `/api/calculateLineupStats?${paramStr}`; //(report uses the lineup info but processes differently)
      case ParamPrefixes.roster:
        return `/api/getRoster?${paramStr}`;
      case ParamPrefixes.player:
        return `/api/calculateOnOffPlayerStats?${paramStr}`;
      case ParamPrefixes.playerShots:
        return `/api/calculatePlayerShotStats?${paramStr}`;
      case ParamPrefixes.playerCareer:
        return `/api/findPlayerSeasons?${paramStr}`;
      case ParamPrefixes.gameInfo:
        return `/api/getGameInfo?${paramStr}`;
      case ParamPrefixes.defensiveInfo:
        return `/api/calculateTeamDefenseStats?${paramStr}`;
      case ParamPrefixes.allTeamInfo:
        return `/api/calculateAllTeamStats?${paramStr}`;
    }
  }

  //////////////////////////////////

  // Common smaller requests for control purposes:

  /** Makes an API call to elasticsearch to get the list of opponents */
  static fetchOpponents(
    params: CommonFilterParams,
    resultCallback: (gameObjs: GameInfoStatSet[]) => void,
    dataLastUpdated: Record<string, number>,
    isDebug: boolean
  ) {
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
      const makeUnique = (gameInfoObjs: Array<GameInfoStatSet>) => {
        //TODO: should actually combine inside the LineupUtils call, but this will do for now
        return _.sortedUniqBy(
          gameInfoObjs,
          (gameInfoObj) => gameInfoObj.opponent || "" + gameInfoObj.date || ""
        );
      };
      if (cachedJson && !_.isEmpty(cachedJson)) {
        //(ignore placeholders here)
        const oppoList = LineupUtils.getGameInfo(
          cachedJson?.responses?.[0]?.aggregations?.game_info || {}
        );
        resultCallback(
          makeUnique(
            _.orderBy(oppoList, (gameInfoObj) => gameInfoObj.date, "desc")
          )
        );
      } else {
        fetch(`/api/getGameInfo?${paramStr}`).then(function (
          response: fetch.IsomorphicResponse
        ) {
          response.json().then(function (json: any) {
            // Cache result locally:
            if (isDebug) {
              console.log(`CACHE_KEY=[${ParamPrefixes.gameInfo}${paramStr}]`);
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
            const oppoList = LineupUtils.getGameInfo(
              json?.responses?.[0]?.aggregations?.game_info || {}
            );
            resultCallback(
              makeUnique(
                _.orderBy(oppoList, (gameInfoObj) => gameInfoObj.date, "desc")
              )
            );
          });
        });
      }
    }
  }

  /** Handy query shortcut, eg ROSTER_TOP_4 gives you the top 4 players as ";" separated inside {}
   * if the =N / ~N is specified, also applies that else has to be all of them, eg:
   * ROSTER_TOP_4 -> {list}=4
   * ROSTER_TOP_6~3 -> {list}~3 etc
   */
  static replaceRosterShortcut(
    inQuery: string | undefined,
    roster: string[],
    forQuery: Boolean //(if false then do nothing)
  ): string | undefined {
    if (!forQuery) return inQuery;
    return inQuery?.replace(
      /ROSTER_TOP_([0-9]+) *([=~][0-9]+)?/g,
      (match, numGroupStr, qualifier) => {
        const numGroup = parseInt(numGroupStr);
        const replacement = `{${_.take(roster, numGroup).join(";")}}${
          qualifier || `=${Math.min(numGroup, 5)}`
        }`;

        //DEBUG
        // console.log(
        //   `ROSTER_TOP REPLACE1 [${inQuery}] with [${replacement}] (${roster}/${match}/${numGroupStr}/${qualifier})`
        // );

        return replacement;
      }
    );
  }

  //TODO: we should try just fetching the team roster first before we do this expensive call...

  /** Makes an API call to elasticsearch to get the roster */
  static fetchRoster(
    params: CommonFilterParams,
    resultCallback: (rosterObjs: string[]) => void,
    dataLastUpdated: Record<string, number>,
    isDebug: boolean
  ) {
    if (params.gender && params.year && params.team) {
      const genderYear = `${params.gender}_${params.year}`;
      const currentJsonEpoch = dataLastUpdated[genderYear] || -1;

      const jsonToIndivs = (json: any) => {
        const jsons = json?.responses || [];
        const rosterCompareJson = jsons.length > 0 ? jsons[0] : {};
        const roster =
          rosterCompareJson?.aggregations?.tri_filter?.buckets?.baseline?.player
            ?.buckets || [];
        return roster.map((r: any) => r.key) as string[];
      };

      const query: GameFilterParams = {
        gender: params.gender,
        year: params.year,
        team: params.team,
        baseQuery: "",
        onQuery: "",
        offQuery: "",
        minRank: ParamDefaults.defaultMinRank,
        maxRank: ParamDefaults.defaultMaxRank,
      };
      const paramStr = QueryUtils.stringify(query);
      // Check if it's in the cache:
      const cachedJson = ClientRequestCache.decacheResponse(
        paramStr,
        ParamPrefixes.roster,
        currentJsonEpoch,
        false /* This gets called every keypress, so even in debug mode it's a huge pain */
      );
      if (cachedJson && !_.isEmpty(cachedJson)) {
        //(ignore placeholders here)
        resultCallback(jsonToIndivs(cachedJson));
      } else {
        fetch(`/api/getRoster?${paramStr}`).then(function (
          response: fetch.IsomorphicResponse
        ) {
          response.json().then(function (json: any) {
            // Cache result locally:
            if (isDebug) {
              console.log(
                `[auto-debug-mode] CACHE_KEY=[${ParamPrefixes.roster}${paramStr}]`
              );
              //(this is a bit chatty)
              //console.log(`CACHE_VAL=[${JSON.stringify(json)}]`);
            }
            if (response.ok) {
              //(never cache errors)
              ClientRequestCache.cacheResponse(
                paramStr,
                ParamPrefixes.roster,
                json,
                currentJsonEpoch,
                isDebug
              );
            }
            resultCallback(jsonToIndivs(json));
          });
        });
      }
    }
  }

  /////////////////////////////////

  // Utils:

  /** Builds a score string from the result of a game query */
  static buildScoreInfo(gameInfoObj: any) {
    const scoreInfoObj = {
      scored: gameInfoObj.num_pts_for || 0,
      allowed: gameInfoObj.num_pts_against || 0,
    };

    return `${scoreInfoObj.scored > scoreInfoObj.allowed ? "W" : "L"} ${
      scoreInfoObj.scored
    }-${scoreInfoObj.allowed}`;
  }

  // Internals

  private static buildRequestList(
    primaryRequest: FilterParamsType,
    context: ParamPrefixesType,
    otherRequests: FilterRequestInfo[]
  ): FilterRequestInfo[] {
    return [{ context: context, paramsObj: primaryRequest }].concat(
      otherRequests
    );
  }
}
