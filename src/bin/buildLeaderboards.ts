////////////////////////////////////////////////////////////////
//
// NOTE: to compile this run "npm run dev" (then ctrl+c once "event - compiled successfully")
// ("npm run build" also works but takes longer)
// npm run build_leaderboards -- --year=<<eg 2021/22>> --tier=<<High|Low|Medium|Combo>> --gender=<<Men|Women>
//
// (Combo tier just combines the division stats from the other 3 tiers idempotently to buikd a combined stats file - no DB queries)
// Other command line options:
// --enrich-rosters: if included then rosters are enriched with positional info
// --extra-data: if included then adds extra sub-objects (rapm / on / off)

// NOTE: test code is under src/__tests__

// System imports
import { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";

import _ from "lodash";

// Models
import {
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  TeamStatSet,
  LineupStatSet,
  TeamInfo,
  DivisionStatistics,
  TeamStatInfo,
  PureStatSet,
  IndivPosInfo,
  RosterEntry,
  CompressedHexZone,
} from "../utils/StatModels";

// API calls
import calculateLineupStats from "../pages/api/calculateLineupStats";
import calculateOnOffStats from "../pages/api/calculateOnOffStats";
import calculateOnOffPlayerStats from "../pages/api/calculateOnOffPlayerStats";
import calculatePlayerShotStats from "../pages/api/calculatePlayerShotStats";
import { CommonApiUtils } from "../utils/CommonApiUtils";
import { BatchEfficiencyUtils } from "../utils/batch/BatchEfficiencyUtils";

// Pre processing
import { RequestUtils } from "../utils/RequestUtils";
import { QueryUtils } from "../utils/QueryUtils";
import { ParamDefaults } from "../utils/FilterModels";

// Post processing
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import { efficiencyInfo } from "../utils/internal-data/efficiencyInfo";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import { TeamReportTableUtils } from "../utils/tables/TeamReportTableUtils";
import {
  AvailableTeams,
  AvailableTeamMeta,
} from "../utils/internal-data/AvailableTeams";
import {
  effectivelyHighMajor,
  excludeFromMidMajor,
} from "../utils/public-data/ConferenceInfo";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { ncaaToEfficiencyLookup } from "../utils/public-data/ncaaToEfficiencyLookup";
import { TeamEvalUtils } from "../utils/stats/TeamEvalUtils";
import { GradeUtils } from "../utils/stats/GradeUtils";
import { DerivedStatsUtils } from "../utils/stats/DerivedStatsUtils";
import { OnBallDefenseUtils } from "../utils/stats/OnBallDefenseUtils";
import { OnBallDefenseModel } from "../utils/stats/RatingUtils";
import { DateUtils } from "../utils/DateUtils";
import { LuckUtils } from "../utils/stats/LuckUtils";
import { PositionUtils } from "../utils/stats/PositionUtils";
import {
  PlayTypeUtils,
  TopLevelPlayAnalysis,
} from "../utils/stats/PlayTypeUtils";
import calculateTeamDefenseStats from "../pages/api/calculateTeamDefenseStats";
import { ShotChartUtils } from "../utils/stats/ShotChartUtils";

//process.argv 2... are the command line args passed via "-- (args)"

const sleep = (milliseconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

/** Handy util for reducing  */
const reduceNumberSize = (k: string, v: any) => {
  if (_.isNumber(v)) {
    const rawNumStr = "" + v;
    const numStr = v.toFixed(4);
    if (numStr.length >= rawNumStr.length) {
      //made it worse
      return v;
    } else {
      return parseFloat(numStr);
    }
  } else {
    return v;
  }
};

export class MutableAsyncResponse {
  statusCode: number;
  resultJson: any;

  constructor() {
    this.statusCode = 0;
    this.resultJson = {};
  }
  status(n: number) {
    this.statusCode = n;
    return this;
  }
  json(j: any) {
    this.resultJson = j;
    return this;
  }
  getJsonResponse(index: number = 0) {
    return this.resultJson.responses?.[index] || {};
  }
}

/** Have to disable RAPM in test mode */
export const setTestModeOn = () => {
  ignoreRapm = true;
  ignoreRosterEnrichment = true;
};
/** Have to disable RAPM in test mode */
var ignoreRapm = false;

//TODO: we're not using this right now so avoid changing the (GH managed) roster files
// until we do (unless manually overridden)
/** Don't overwrite rosters in test mode */
var ignoreRosterEnrichment = true;

/** Exported for test only */
export const savedLineups = [] as Array<any>;
const savedConfOnlyLineups = [] as Array<any>;
const savedT100Lineups = [] as Array<any>;

/** Exported for test only */
export const savedPlayers = [] as Array<any>;
const savedConfOnlyPlayers = [] as Array<any>;
const savedT100Players = [] as Array<any>;

/** Exported for test only - this is to improve predictions a bit */
export const savedLowVolumePlayers = [] as Array<any>;

/** Exported for test only */
export const teamInfo = [] as Array<TeamInfo>;
export const detailedTeamInfo = [] as Array<any>;
export const detailedTeamInfoT100 = [] as Array<any>;
export const detailedTeamInfoConfOnly = [] as Array<any>;
var bubbleOffenseInfo: number[] = [];
var bubbleDefenseInfo: number[] = [];
var eliteOffenseInfo: number[] = [];
var eliteDefenseInfo: number[] = [];

/** Exported for test only */
export const teamStatInfo = [] as Array<TeamStatInfo>;

const buildEmptyDivisionStats = () => {
  return {
    tier_sample_size: 0,
    dedup_sample_size: 0,
    tier_samples: {},
    tier_lut: {},
    dedup_samples: {},
  };
};

/** Exported for test only */
export const mutableDivisionStats: DivisionStatistics =
  buildEmptyDivisionStats();

/** Exported for test only */
export const mutablePlayerDivisionStats: DivisionStatistics =
  buildEmptyDivisionStats();

/** Exported for test only */
export var rosterGeoMap = {} as Record<string, { lat: number; lon: number }>;

const positionGroups = [];

/** Exported for test only */
export const mutablePlayerDivisionStats_byPosGroup: Record<
  string,
  DivisionStatistics
> = _.chain(PositionUtils.positionGroupings)
  .map((pos) => [pos, buildEmptyDivisionStats()])
  .fromPairs()
  .value();

var commandLine = process?.argv || [];
if (commandLine?.[1]?.endsWith("buildLeaderboards.js")) {
  console.log("Start processing with args: " + _.drop(commandLine, 2));
} else {
  console.log(
    "Unit test mode - just export methods [main, completeLineupLeaderboard]"
  );
  commandLine = [];
}
const testMode = commandLine.length == 0;

if (_.find(commandLine, (p) => _.startsWith(p, "--enrich-rosters"))) {
  ignoreRosterEnrichment = false;
  console.log("Enriching rosters with positional info due to manual override");
}

/** Enable this to pass a subfield called 'rapm' to the player objects (just for export, then re-disable) */
const injectExtraDataForNbaFolks = _.find(commandLine, (p) =>
  _.startsWith(p, "--extra-data")
);

const inTier = (
  _.find(commandLine, (p) => _.startsWith(p, "--tier=")) ||
  `--tier=${ParamDefaults.defaultTier}`
).substring(7); //High, Medium, Low

const inGender = (
  _.find(commandLine, (p) => _.startsWith(p, "--gender=")) ||
  `--gender=${ParamDefaults.defaultGender}`
).substring(9);
const inYear = (
  _.find(commandLine, (p) => _.startsWith(p, "--year=")) ||
  `--year=${
    testMode ? DateUtils.yearToUseForTests : DateUtils.mostRecentYearWithData
  }`
).substring(7);
if (!testMode) console.log(`Args: gender=[${inGender}] year=[${inYear}]`);

const onlyHasTopConferences =
  inGender != "Men" || inYear < DateUtils.yearFromWhichAllMenD1Imported;

var testTeamFilter = undefined as Set<string> | undefined;
const isDebugMode = _.find(commandLine, (p) => _.startsWith(p, "--debug"));

//(generic test set for debugging)
//testTeamFilter = new Set([ "Maryland", "Iowa", "Michigan", "Dayton", "Rutgers", "Fordham", "Coppin St." ]);
//(used this to build sample:)
//testTeamFilter = new Set(["Maryland"]); //, "Dayton", "Fordham", "Kansas St." ]);
if (!isDebugMode && testTeamFilter) {
  console.log(
    `************************************ ` +
      `WARNING: [testTeamFilter] set (=[${_.toArray(
        testTeamFilter
      )}]) but [--debug] not specified, unsetting [testTeamFilter]`
  );
  testTeamFilter = undefined;
}
if (testTeamFilter) {
  console.log(
    `INFO: using the following test filter: [${_.toArray(testTeamFilter)}]`
  );
}

const rootFilePath = isDebugMode
  ? "./leaderboardDebug"
  : injectExtraDataForNbaFolks
  ? "./enrichedPlayers"
  : "./public/leaderboards/lineups";

/** All the conferences in a given tier plus the "guest" teams if it's not in the right tier */
const mutableConferenceMap = {} as Record<string, string[]>;

const lastUpdated = //(will be new now for curr year + "Extra")
  dataLastUpdated[`${inGender}_${inYear}`] || new Date().getTime();

/** ~20d before end of full season */
const approxEndofRegSeason =
  DateUtils.getEndOfRegSeason(`${inGender}_${inYear}`) || lastUpdated;

/** For completed years, filter based on possessions */
const averagePossInCompletedYear =
  inYear == DateUtils.covidSeason ? 1000 : 1600; //(reduce min allowed for Covid year)

/** Handy filename util */
const getTeamFilename = (team: string) => {
  return RequestUtils.fixLocalhostRosterUrl(team, false);
};
/** Handy filename util - roster */
const getRosterFilename = (team: string, teamYear: string) => {
  return `./public/rosters/${inGender}_${(teamYear || "").substring(
    0,
    4
  )}/${getTeamFilename(team)}.json`;
};
const getOnBallDefenseFilename = (team: string, teamYear: string) => {
  return `${process.env.PBP_OUT_DIR}/OnBallDefense/out/${(
    teamYear || ""
  ).substring(0, 4)}/${getTeamFilename(team)}.txt`;
};

const teamListChain =
  inYear == "Extra"
    ? _.chain(AvailableTeams.extraTeamsBase)
    : _.chain(AvailableTeams.byName).values().flatten();

/** Request data from ES, duplicate table processing over each team to build leaderboard (export for testing only) */
export async function main() {
  // Step 1: Retrieve lookup tables from various external sources

  // Step 1.1: Load the efficiency info for the year

  const {
    completedEfficiencyInfo,
    bubbleOffenseInfo: bubbleOffenseInfoTmp,
    bubbleDefenseInfo: bubbleDefenseInfoTmp,
    eliteOffenseInfo: eliteOffenseInfoTmp,
    eliteDefenseInfo: eliteDefenseInfoTmp,
  } = await BatchEfficiencyUtils.buildMiscEfficiencyInfo(inGender, inYear);

  // (these are copied over vars for test export purposes)
  bubbleOffenseInfo = bubbleOffenseInfoTmp;
  bubbleDefenseInfo = bubbleDefenseInfoTmp;
  eliteOffenseInfo = eliteOffenseInfoTmp;
  eliteDefenseInfo = eliteDefenseInfoTmp;

  // Step 1.2: If roster geo information exists them load that up

  /** If roster geo information exists them load that up */
  if (
    inYear.startsWith("2") && //(eg not "Extra")
    inYear >= DateUtils.firstYearWithRosterGeoData
  ) {
    console.log("Loading roster geo data...");
    rosterGeoMap = await fs
      .readFile(`./public/rosters/geo/roster_geos.json`)
      .then((s: any) => JSON.parse(s))
      .catch((err: any) => {
        console.log(`Couldn't load roster geo data: [${err}]`);
        return {};
      });
    console.log(`Loaded [${_.size(rosterGeoMap)}] geo entries`);
  }

  /** For defensive purposes we grab a cache of the set of players */

  const teamDefenseEnabled = true; //(keep this flag for a bit in case we need to pull the feature)
  var varAllPlayerStatsCacheByTeam: Record<string, IndivStatSet[]> = {};
  if (teamDefenseEnabled) {
    console.log(`Fetching player leaderboard for [${inGender}] [${inYear}]`);
    const tiersForThisYear =
      inYear < DateUtils.yearFromWhichAllMenD1Imported
        ? ["High"]
        : ["High", "Medium", "Low"];
    const playerJsons = await Promise.all(
      tiersForThisYear.map((tier) => {
        const subYear = inYear.substring(0, 4);
        return fs
          .readFile(
            `./public/leaderboards/lineups/players_all_${inGender}_${subYear}_${tier}.json`
          )
          .then((s: any) => JSON.parse(s))
          .catch((err: any) => {
            console.log(
              `Couldn't load player data [${inGender}[${subYear}][${tier}]]: [${err}]`
            );
            return {};
          });
      })
    );
    var numPlayers = 0;
    varAllPlayerStatsCacheByTeam = _.chain(playerJsons)
      .flatMap((response, tierIndex) => {
        const players = (response?.players || []) as Array<IndivStatSet>;
        numPlayers += players.length; //(just for diagnostics)
        return players;
      })
      .groupBy((p) => p.team)
      .value();

    console.log(
      `Cached [${numPlayers}] players in [${_.size(
        varAllPlayerStatsCacheByTeam
      )}] teams`
    );
  }

  /** If any teams aren't in the conf then add them here for error reporting */
  const mutableIncompleteConfs = new Set() as Set<string>;
  const teams = teamListChain
    .filter(
      (team) => testTeamFilter == undefined || testTeamFilter.has(team.team)
    )
    .filter((team) => {
      return (
        !team.use_team && //(these are teams that have changed names - under their "not valid that year" name)
        team.gender == inGender &&
        (inYear == "Extra" || team.year == inYear)
      );
    })
    .filter((team) => {
      const conference =
        completedEfficiencyInfo?.[team.team]?.conf || "Unknown";
      const rank =
        completedEfficiencyInfo?.[team.team]?.["stats.adj_margin.rank"] || 400;
      // For years with lots of conferences, split into tiers:
      if (onlyHasTopConferences) {
        return true;
      } else {
        const isSupported = () => {
          // Note that this method has to be consistent with naturalTier defintion below
          if (inTier == "High") {
            return (
              team.category == "high" ||
              rank <= 150 ||
              effectivelyHighMajor.has(team.team)
            );
          } else if (inTier == "Medium") {
            return (
              team.category != "high" &&
              team.category != "low" &&
              rank < 275 &&
              !excludeFromMidMajor.has(team.team)
            );
          } else if (inTier == "Low") {
            return (
              team.category == "low" ||
              team.category == "midlow" ||
              (team.category != "high" && rank > 250)
            );
          } else {
            throw `Tier not supported: ${inTier}`;
          }
        };
        const toInclude = isSupported();
        if (!toInclude) {
          mutableIncompleteConfs.add(conference);
        }
        return toInclude;
      }
    })
    .value();

  //Test code:
  //console.log("Number of teams = " + teams.length);
  //throw "done";

  async function handleTeam(teamObj: AvailableTeamMeta, retry: number) {
    const team = teamObj.team;
    const teamYear = teamObj.year;
    const genderYearLookup = `${inGender}_${teamYear}`;
    const avgEfficiency =
      efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;
    const rank =
      completedEfficiencyInfo?.[team]?.["stats.adj_margin.rank"] || 400;

    // Note that this definition has to be consistent with isSupported defintion above
    const naturalTier =
      onlyHasTopConferences ||
      teamObj.category == "high" ||
      excludeFromMidMajor.has(team)
        ? "High"
        : teamObj.category == "low" ||
          teamObj.category == "midlow" ||
          rank >= 275
        ? "Low"
        : "Medium";

    const inNaturalTier = naturalTier == inTier;

    if (!inNaturalTier) {
      console.log(`For all modes: now skipping [${team}] not in natural tier`);
      return;
    }

    if (!testMode) console.log(`Processing ${inGender} ${team} ${teamYear}`);

    const fullRequestModel = {
      gender: inGender,
      minRank: ParamDefaults.defaultMinRank,
      maxRank: ParamDefaults.defaultMaxRank,
      team: team,
      year: teamYear,
      //(for teams we also getGames but we set this explicitly below)
    };
    const _30d_ago = new Date((approxEndofRegSeason - 30 * 24 * 3600) * 1000)
      .toISOString()
      .slice(0, 10);
    const fullTeamRequestModelWithRecency = {
      ...fullRequestModel,
      onQuery: `date:[${_30d_ago} TO *]`,
    };
    const requestModelConfOnly = {
      ...fullRequestModel,
      queryFilters: "Conf",
    };
    const requestModelT100 = {
      ...fullRequestModel,
      maxRank: "100",
    };

    const teamSeasonLookup = `${fullRequestModel.gender}_${fullRequestModel.team}_${fullRequestModel.year}`;

    // Snag conference from D1 metadata
    const conference = completedEfficiencyInfo?.[team]?.conf || "Unknown";
    const buildTeamAbbr = (t: string) => {
      const candidate1 = t.replace(/[^A-Z]/g, "");
      const addU = (abb: string) => {
        return abb.indexOf("U") >= 0 ? abb : abb + "U";
      };
      return candidate1.length == 1 ? t.substring(0, 3) : addU(candidate1);
    };
    mutableConferenceMap[conference] = mutableIncompleteConfs.has(conference)
      ? (mutableConferenceMap[conference] || []).concat([buildTeamAbbr(team)])
      : [];

    const inputCases: Array<[string, any, any]> = [
      ["all", fullRequestModel, fullTeamRequestModelWithRecency],
      ["conf", requestModelConfOnly, undefined],
      ["t100", requestModelT100, undefined],
    ];

    if (!testMode) await sleep(1000); //(just ensure we don't hammer ES too badly)

    if (!testMode) console.log("Asking Elasticsearch:");

    const getAllDataPromise = Promise.all(
      inputCases.map(
        async ([label, requestModel, teamRequestModel]: [string, any, any]) => {
          const requestParams = QueryUtils.stringify(requestModel);
          const teamRequestParms = teamRequestModel
            ? QueryUtils.stringify({ ...teamRequestModel, getGames: true })
            : QueryUtils.stringify({ ...requestModel, getGames: true });

          const lineupResponse = new MutableAsyncResponse();
          const teamResponse = new MutableAsyncResponse();
          const playerResponse = new MutableAsyncResponse();
          const playerShotChartsResponse = new MutableAsyncResponse();
          const teamDefenseResponse = new MutableAsyncResponse();

          const isCalculatingShotCharts =
            inYear >= DateUtils.firstYearWithShotChartData;
          const isCalculatingTeamDefense =
            teamDefenseEnabled &&
            inNaturalTier &&
            !_.isEmpty(varAllPlayerStatsCacheByTeam);

          await Promise.all(
            [
              calculateLineupStats(
                {
                  url: `https://hoop-explorer.com/?${requestParams}`,
                } as unknown as NextApiRequest,
                lineupResponse as unknown as NextApiResponse
              ),
              calculateOnOffStats(
                {
                  url: `https://hoop-explorer.com/?${teamRequestParms}`,
                } as unknown as NextApiRequest,
                teamResponse as unknown as NextApiResponse
              ),
              calculateOnOffPlayerStats(
                {
                  url: `https://hoop-explorer.com/?${requestParams}`,
                } as unknown as NextApiRequest,
                playerResponse as unknown as NextApiResponse
              ),
            ]
              .concat(
                isCalculatingShotCharts
                  ? [
                      calculatePlayerShotStats(
                        {
                          url: `https://hoop-explorer.com/?${requestParams}`,
                        } as unknown as NextApiRequest,
                        playerShotChartsResponse as unknown as NextApiResponse
                      ),
                    ]
                  : []
              )
              .concat(
                isCalculatingTeamDefense
                  ? [
                      calculateTeamDefenseStats(
                        {
                          url: `https://hoop-explorer.com/?${requestParams}`,
                        } as unknown as NextApiRequest,
                        teamDefenseResponse as unknown as NextApiResponse
                      ),
                    ]
                  : []
              )
          );

          // In NBA mode we're going to grab the player percentiles from the previous run

          const playerGradesJson: DivisionStatistics | undefined = await _.thru(
            injectExtraDataForNbaFolks,
            (__) => {
              if (injectExtraDataForNbaFolks && label == "all") {
                //(currently only build these %iles for all)
                const divisionStatsComboPathname = `${rootFilePath}/stats_players_${label}_${inGender}_${inYear.substring(
                  0,
                  4
                )}_Combo.json`;

                return fs
                  .readFile(divisionStatsComboPathname)
                  .then((s: any) => JSON.parse(s) as DivisionStatistics)
                  .catch((err: any) => {
                    console.log(
                      `WARNING: Couldn't load player grades [${inGender}][${teamYear}][${label}]: [${err}]`
                    );
                    return undefined;
                  });
              } else {
                return undefined;
              }
            }
          );

          // Also we're going to try fetching the roster

          const rosterInfoFile = getRosterFilename(team, teamYear);
          const rosterInfoJson = await fs
            .readFile(rosterInfoFile)
            .then((s: any) => JSON.parse(s))
            .catch((err: any) => {
              console.log(`Couldn't load [${rosterInfoFile}]: [${err}]`);
              return undefined;
            });
          // From 2024/25 the year_class has a "." at the end of it, we'll remove that:
          if (rosterInfoJson) {
            _.forEach(
              rosterInfoJson as Record<PlayerCode, RosterEntry>,
              (rosterEntry) => {
                if (rosterEntry.year_class) {
                  rosterEntry.year_class = rosterEntry.year_class.replace(
                    ".",
                    ""
                  );
                }
              }
            );
          }
          // Build a structured model of the roster info from disk - later we will add
          // the positional info based on stats
          const rosterInfoJsonToWrite = _.cloneDeep(rosterInfoJson) as Record<
            PlayerCode,
            RosterEntry
          >;

          //Mutate the version we use in the processing (don't use height_in for women)
          RequestUtils.mutateRosterJsonForWomen(rosterInfoJson, inGender);

          // Check for errors:

          if (
            retry < 10 &&
            (lineupResponse.statusCode >= 500 ||
              teamResponse.statusCode >= 500 ||
              playerResponse.statusCode >= 500)
          ) {
            console.log(
              `RETRYABLE ERROR [${team} ${label}]: ${JSON.stringify(
                lineupResponse
              )} ${JSON.stringify(teamResponse)} ${JSON.stringify(
                playerResponse
              )}`
            );

            await sleep(10000); //(wait 10s and try again)
            handleTeam(teamObj, retry + 1);
          } else if (
            lineupResponse.statusCode >= 400 ||
            teamResponse.statusCode >= 400 ||
            playerResponse.statusCode >= 400
          ) {
            // Not retry-able, or run out of attempts
            console.log(
              `ERROR #[${retry}] [${team} ${label}]: ${JSON.stringify(
                lineupResponse
              )} ${JSON.stringify(teamResponse)} ${JSON.stringify(
                playerResponse
              )}`
            );
            process.exit(-1);
          }

          // Received all data, now do post-Processing:

          const rosterBaseline =
            playerResponse.getJsonResponse().aggregations?.tri_filter?.buckets
              ?.baseline?.player?.buckets || [];

          const rosterShotChartMap = _.chain(
            playerShotChartsResponse.getJsonResponse().aggregations?.tri_filter
              ?.buckets?.baseline?.player?.buckets || []
          )
            .map((playerShotChartInfo) => [
              playerShotChartInfo.key || "???",
              ShotChartUtils.compressHexZones(
                ShotChartUtils.shotStatsToHexData(playerShotChartInfo).zones
              ),
            ])
            .fromPairs()
            .value();

          const rosterGlobalButActuallyBaseline = rosterBaseline;
          // playerResponse.getJsonResponse().aggregations?.tri_filter?.buckets
          //   ?.baseline?.player?.buckets || [];
          //using baseline instead of global here:
          // has no effect on luck since using "baseline" not "season" for luck adjustments
          // will have a small impact on ORtg and position calcs, in on/off they use season-wide

          const lineups =
            lineupResponse.getJsonResponse().aggregations?.lineups?.buckets ||
            [];

          const teamGlobal =
            teamResponse.getJsonResponse().aggregations?.global?.only?.buckets
              ?.team || {};

          const teamBaseline =
            teamResponse.getJsonResponse().aggregations?.tri_filter?.buckets
              ?.baseline || {};

          const teamRecent =
            teamResponse.getJsonResponse().aggregations?.tri_filter?.buckets
              ?.on || {};

          /** Largest sample of player stats, by player key - use for ORtg calcs */
          const globalRosterStatsByCode =
            RosterTableUtils.buildRosterTableByCode(
              rosterGlobalButActuallyBaseline,
              rosterInfoJson,
              true //(injects positional info into the player stats, needed for play style analysis below)
            );

          // Inject the better positional info into the roster file:
          if ("all" == label) {
            const rosterChanges = _.transform(
              rosterInfoJsonToWrite,
              (acc, rosterEntry, playerCode) => {
                const playerInfoFromStats = globalRosterStatsByCode[playerCode];
                if (playerInfoFromStats?.role) {
                  // (if we already have a role then don't overwrite until we have a decent number of possessions)
                  const usage = playerInfoFromStats?.off_usage?.value || 0;
                  const poss = playerInfoFromStats?.off_team_poss?.value || 0;
                  const effectivePoss = poss * usage;

                  const currRoleFromStats = rosterEntry.role;
                  if (effectivePoss > 40.0 || !rosterEntry.role) {
                    //(40 is a pretty arbitrary stat, but if we have a role_from_stats from the prev season or HS analysis it's probably decent)
                    rosterEntry.role = playerInfoFromStats.role;
                  }
                  const roleHasChanged = currRoleFromStats != rosterEntry.role;
                  if (roleHasChanged) {
                    console.log(
                      `Should update roster info for [${playerCode}], old_role=[${currRoleFromStats}], new_role=[${rosterEntry.role}]`
                    );
                  }
                  return acc.push(playerCode);
                } else {
                  return acc;
                }
              },
              [] as Array<PlayerCode>
            );

            if (!_.isEmpty(rosterChanges)) {
              // Write a new roster file
              if (!ignoreRosterEnrichment) {
                console.log(
                  `Updating roster info at [${rosterInfoFile}] (changes [${rosterChanges}])`
                );
                //(don't currently need this, the plan was to use it for positional info in PbP)
                await fs.writeFile(
                  rosterInfoFile,
                  JSON.stringify(rosterInfoJsonToWrite)
                );
              }
            }
          }

          // Team info, for "Build your own T25" and Team Stats Explorer
          // (Do this for all labels, but only do grades / T25 if "all")
          if (completedEfficiencyInfo?.[team]) {
            const teamAdjOff =
              completedEfficiencyInfo?.[team]?.["stats.adj_off.value"] || 0.0;
            const teamAdjDef =
              completedEfficiencyInfo?.[team]?.["stats.adj_def.value"] || 0.0;

            const teamCalcAdjEffOff =
              teamBaseline.off_adj_ppp?.value || teamAdjOff;
            const teamCalcAdjEffDef =
              teamBaseline.def_adj_ppp?.value || teamAdjDef;
            const teamCalcAdjEffOffRecent =
              teamRecent.off_adj_ppp?.value || teamCalcAdjEffOff;
            const teamCalcAdjEffDefRecent =
              teamRecent.def_adj_ppp?.value || teamCalcAdjEffDef;

            // Add net if the data is available:
            if (teamBaseline.off_adj_ppp && teamBaseline.def_adj_ppp) {
              teamBaseline.off_net = {
                value: teamCalcAdjEffOff - teamCalcAdjEffDef,
              };
            }
            if (teamBaseline.off_ppp && teamBaseline.def_ppp) {
              teamBaseline.def_net = {
                value:
                  (teamBaseline.off_ppp?.value || 100) -
                  (teamBaseline.def_ppp?.value || 100),
              };
            }

            // Add other derived stats:
            const extraFields = DerivedStatsUtils.injectTeamDerivedStats(
              teamBaseline,
              {}
            );

            // Build all the samples ready for percentiles:
            // (only do this for full season stats)
            if ("all" == label) {
              GradeUtils.buildAndInjectTeamDivisionStats(
                teamBaseline,
                extraFields,
                mutableDivisionStats,
                inNaturalTier
              );
            }

            // And yet more derived stats!
            const topLevelPlayTypeStyles =
              PlayTypeUtils.buildTopLevelPlayStyles(
                rosterGlobalButActuallyBaseline,
                globalRosterStatsByCode,
                teamBaseline
              );

            const defSos = teamBaseline?.def_adj_opp?.value || avgEfficiency;
            const topLevelPlayTypeStylesAdj: TopLevelPlayAnalysis = _.chain(
              topLevelPlayTypeStyles
            )
              .mapValues((stat) => {
                return {
                  ...stat,
                  adj_pts: {
                    value: ((stat.pts?.value || 0) * avgEfficiency) / defSos,
                  },
                };
              })
              .value();

            // Also calculate defense
            const topLevelDefensePlayTypeStyles = isCalculatingTeamDefense
              ? _.chain(
                  PlayTypeUtils.buildTeamDefenseBreakdown(
                    PlayTypeUtils.parseTeamDefenseResponse([
                      teamDefenseResponse.getJsonResponse(0),
                      teamDefenseResponse.getJsonResponse(1),
                    ]),
                    varAllPlayerStatsCacheByTeam
                  )
                ) //(adj_pts gets injected by buildTeamDefenseBreakdown but not buildTopLevelPlayStyles)
                  .mapValues((stat) => _.omit(stat, "adj_pts"))
                  .value()
              : undefined;

            const offSos = teamBaseline?.off_adj_opp?.value || avgEfficiency;
            const topLevelDefensePlayTypeStylesAdj =
              topLevelDefensePlayTypeStyles
                ? _.chain(topLevelDefensePlayTypeStyles)
                    .mapValues((stat) => {
                      return {
                        ...stat,
                        adj_pts: {
                          value:
                            ((stat.pts?.value || 0) * avgEfficiency) / offSos,
                        },
                      };
                    })
                    .value()
                : undefined;

            // (only do this for full season stats)
            if ("all" == label) {
              GradeUtils.buildAndInjectPlayStyleStats(
                topLevelPlayTypeStylesAdj,
                topLevelDefensePlayTypeStylesAdj,
                mutableDivisionStats,
                inNaturalTier
              );
            }

            // Apply luck so we have both lucky and non-luck versions
            const teamBaselineWithLuck = _.cloneDeep(teamBaseline);
            const defLuckInfo = LuckUtils.calcDefTeamLuckAdj(
              teamBaselineWithLuck,
              teamBaseline,
              avgEfficiency
            );
            LuckUtils.injectLuck(teamBaselineWithLuck, undefined, defLuckInfo);
            //(currently injectTeamDerivedStats does not support luck)

            // TODO: not actually sure what this is used for ..
            // can I replace it with detailedTeamStats?
            // (only do this for full season stats)
            if ("all" == label) {
              teamStatInfo.push({
                team_name: fullRequestModel.team,
                gender: fullRequestModel.gender,
                year: fullRequestModel.year,
                conf: conference,

                stats: {
                  // Subset of baseline team stats
                  ..._.pick(
                    teamBaselineWithLuck,
                    _.flatMap(["off", "def"], (prefix) => {
                      const fields = [
                        "adj_ppp",
                        "ppp",
                        "to",
                        "3p",
                        "2p",
                        "3pr",
                        "ftr",
                        "sos",
                      ];
                      return fields.map((field) => `${prefix}_${field}`);
                    }).concat(["tempo"])
                  ),

                  // Derived stats
                  ...extraFields,
                },
              });
            }

            const oppoInfo = _.chain(teamBaseline.game_info?.buckets || [])
              .flatMap((l) => l?.game_info?.buckets || [])
              .map((l) => {
                // Let's do some marshalling:
                const retVal = l?.end_of_game?.hits?.hits?.[0]?._source || {};
                retVal.offPoss = l?.off_poss?.value || 0;
                retVal.defPoss = l?.def_poss?.value || 0;
                retVal.avgLead =
                  (l?.avg_lead?.value || 0) /
                  (0.5 * (retVal.offPoss + retVal.defPoss) || 1);
                return retVal;
              })
              .sortBy((g) => g.date)
              .flatMap((g) => {
                // Get efficiency
                const oppoEff = completedEfficiencyInfo?.[g.opponent?.team];
                const gameDate = Date.parse(g.date);

                const isValid =
                  g.score_info?.end?.scored &&
                  g.score_info?.end?.allowed &&
                  oppoEff &&
                  !Number.isNaN(gameDate);

                const teamOff = oppoEff?.["stats.adj_off.value"] || 0.0;
                const teamDef = oppoEff?.["stats.adj_def.value"] || 0.0;
                const locationType = g.location_type as
                  | "Home"
                  | "Away"
                  | "Neutral";
                const baseHca = CommonApiUtils.getHca(fullRequestModel);
                const actualHca =
                  locationType == "Home"
                    ? baseHca
                    : locationType == "Away"
                    ? -baseHca
                    : 0;

                return isValid
                  ? [
                      {
                        oppo_name: g.opponent?.team || "Unknown",
                        date_str: (g.date || "").substring(0, 16),
                        date: Math.floor(gameDate / 1000),
                        team_scored: g.score_info?.end?.scored || 0,
                        oppo_scored: g.score_info?.end?.allowed || 0,
                        off_poss: g.offPoss,
                        def_poss: g.defPoss,
                        avg_lead: g.avgLead,
                        location_type: locationType,

                        rank: oppoEff?.["stats.adj_margin.rank"] || 400,
                        adj_off: teamOff,
                        adj_def: teamDef,

                        wae: TeamEvalUtils.calcWinsAbove(
                          teamOff,
                          teamDef,
                          eliteOffenseInfo,
                          eliteDefenseInfo,
                          actualHca
                        ),
                        wab: TeamEvalUtils.calcWinsAbove(
                          teamOff,
                          teamDef,
                          bubbleOffenseInfo,
                          bubbleDefenseInfo,
                          actualHca
                        ),
                      },
                    ]
                  : [];
              })
              .value();

            if (inNaturalTier) {
              //(only store detailed stats for each team once, regardless of tier overlaps)
              const detailedTeamElement = {
                team_name: fullRequestModel.team,
                gender: fullRequestModel.gender,
                year: fullRequestModel.year,
                conf: conference,
                opponents: oppoInfo,
                ...teamBaselineWithLuck,
                ...extraFields,
                style: topLevelPlayTypeStyles,
                def_style: topLevelDefensePlayTypeStyles,
                game_info: undefined, //(unset game_info, it's already covered more efficiently via oppoInfo)
              };
              switch (label) {
                case "conf":
                  detailedTeamInfoConfOnly.push(detailedTeamElement);
                  break;
                case "t100":
                  detailedTeamInfoT100.push(detailedTeamElement);
                  break;
                default:
                  detailedTeamInfo.push(detailedTeamElement);
                  break;
              }
            }
            // "T25 / bubble" leaderboard
            // (only do this for full season stats)
            if ("all" == label) {
              teamInfo.push({
                team_name: fullRequestModel.team,
                gender: fullRequestModel.gender,
                year: fullRequestModel.year,
                conf: conference,
                adj_off: teamAdjOff,
                adj_def: teamAdjDef,
                adj_off_calc: teamCalcAdjEffOff,
                adj_def_calc: teamCalcAdjEffDef,
                adj_off_calc_30d: teamCalcAdjEffOffRecent,
                adj_def_calc_30d: teamCalcAdjEffDefRecent,

                opponents: oppoInfo,
              });
            }
          }

          // Read in on-ball defense if it exists
          var onBallDefenseByCode = {} as Record<string, OnBallDefenseModel>;
          if ("all" == label && inGender == "Men") {
            const onBallDefenseLoc = getOnBallDefenseFilename(team, teamYear);
            const onBallDefenseText = await fs
              .readFile(onBallDefenseLoc)
              .then((s: any) => s.toString())
              .catch((err: any) => {
                console.log(`Couldn't load [${onBallDefenseLoc}]: [${err}]`);
                return undefined;
              });
            if (onBallDefenseText && !testMode) {
              // Players need code added first, normally happens in buildBaselinePlayerInfo but is needed for "OnBallDefenseUtils.parseContents":
              (rosterBaseline || []).forEach((mutableP: IndivStatSet) => {
                // Code:
                mutableP.code = (mutableP.player_array?.hits?.hits?.[0]?._source
                  ?.player?.code || mutableP.key) as PlayerCode;
              });

              //Full diag
              //console.log(`Loaded on-ball defense [${onBallDefenseLoc}]: [${onBallDefenseText}]`)

              onBallDefenseByCode = _.chain(
                OnBallDefenseUtils.parseContents(
                  rosterBaseline,
                  onBallDefenseText
                ).matchedPlayerStats
              )
                .groupBy((p) => p.code)
                .mapValues((l) => l[0]!)
                .value();

              console.log(
                `Incorporated on-ball defense from [${onBallDefenseLoc}] into [${_.size(
                  onBallDefenseByCode
                )}] players`
              );
            }
          }
          //(end on ball defense logic)

          const baselinePlayerInfo = LineupTableUtils.buildBaselinePlayerInfo(
            rosterBaseline,
            globalRosterStatsByCode,
            teamBaseline,
            avgEfficiency,
            true,
            "baseline",
            {},
            onBallDefenseByCode //(always adjust for luck)
          );
          const positionFromPlayerKey = LineupTableUtils.buildPositionPlayerMap(
            rosterGlobalButActuallyBaseline,
            teamSeasonLookup,
            undefined,
            rosterGeoMap
          );

          // Using positional info, get the %s the players have at each position:
          const rosterPositionalInfo = LineupTableUtils.getPositionalInfo(
            lineups,
            positionFromPlayerKey,
            teamSeasonLookup
          );

          const [sortedLineups, ignoreDroppedLineups] =
            LineupTableUtils.buildFilteredLineups(
              lineups,
              "",
              "desc:off_poss",
              "0",
              "500", //take all players (sorted by off_pos) with no min poss - will filter later
              teamSeasonLookup,
              positionFromPlayerKey
            );

          // Need these to break down play types a bit (in advance of doing it properly)
          const extraTotalFieldsToKeep = injectExtraDataForNbaFolks
            ? new Set([
                "total_off_scramble_fga",
                "total_off_scramble_to",
                "total_off_trans_fga",
                "total_off_trans_to",
              ])
            : new Set();

          // Merge ratings and position, and filter based on offensive possessions played
          const enrichAndFilter = (
            playerMap: Record<string, IndivStatSet>,
            shotChartMap: Record<string, CompressedHexZone[]>,
            cutdownLowVolume: boolean
          ) =>
            _.toPairs(playerMap)
              .filter((kv) => {
                const minThreshold = cutdownLowVolume ? 0.125 : lowVolThreshold;
                const maxThreshold = cutdownLowVolume ? lowVolThreshold : 2.0; //(10 is effectively infinity)

                const player = kv[1];

                const extraPossFactor = (() => {
                  if (label == "conf") {
                    return 0.5;
                  } else if (label == "t100") {
                    return 0.5;
                  } else {
                    return 1;
                  }
                })();

                const playerPossPct = player.off_team_poss_pct?.value || 0;
                const playerPoss = player.off_team_poss?.value || 0; //(despite its name this is the player possessions, not team possessions)

                // For teams that have played fewer possessions than others we still have a lower limit
                //TODO: fix the secondary filter _during_ the year
                const secondaryFilter =
                  !DateUtils.isSeasonFinished(teamYear) ||
                  playerPoss >
                    minThreshold * averagePossInCompletedYear * extraPossFactor;

                return (
                  secondaryFilter &&
                  playerPossPct > minThreshold &&
                  playerPossPct < maxThreshold
                ); //(>10mpg)
              })
              .map((kv: [PlayerId, IndivStatSet]) => {
                const posInfo = positionFromPlayerKey[kv[0]] || {};
                const player = kv[1];

                // Calculate the % of the time they spend at each position
                const countsPerPos = rosterPositionalInfo.map(
                  (playersPerPos) => {
                    return _.sumBy(playersPerPos, (posInfo) =>
                      posInfo.id == kv[0] ? posInfo.numPoss : 0
                    );
                  }
                );
                const totalPositionedPoss = _.sum(countsPerPos);
                const posFreqs = countsPerPos.map(
                  (count) => count / (totalPositionedPoss || 1)
                );

                // Remove offensive luck apart from RAPM (everything else is normalized to data set)
                [
                  "off_rtg",
                  "off_adj_rtg",
                  "off_adj_prod",
                  "off_efg",
                  "off_3p",
                ].forEach((field) => {
                  if (!_.isNil(player[field]?.old_value))
                    delete player[field]?.old_value;
                  if (!_.isNil(player[field]?.override))
                    delete player[field]?.override;
                });

                // Improving wording of explanation of def rtg improvements
                if (player.diag_def_rtg?.onBallDef) {
                  ["def_rtg", "def_adj_rtg", "def_adj_prod"].forEach(
                    (field) => {
                      //Note: also copied into RAPM below
                      if (!_.isNil(player[field]))
                        player[field].extraInfo = "PREPROCESSING_WARNING"; //(used in PlayerLeaderboardTable)
                    }
                  );
                }
                if ("all" == label) {
                  // Apply different criteria depending on how far through the season we are
                  const offPoss = teamBaseline.off_poss?.value || 2000;
                  const criteriaMult =
                    offPoss < 500
                      ? 0.25
                      : offPoss < 1000
                      ? 0.5
                      : offPoss < 1500
                      ? 0.75
                      : 1;

                  // Everything except RAPM (we do it here because we need total_*, which get removed below)
                  GradeUtils.buildAndInjectPlayerDivisionStats(
                    player,
                    mutablePlayerDivisionStats,
                    inNaturalTier,
                    undefined,
                    criteriaMult
                  );
                  // Also per position grouping:
                  (
                    PositionUtils.positionsToGroup[posInfo.posClass] || []
                  ).forEach((posGroup) => {
                    const mutablePosGroupDivStats =
                      mutablePlayerDivisionStats_byPosGroup[posGroup];
                    if (mutablePosGroupDivStats) {
                      GradeUtils.buildAndInjectPlayerDivisionStats(
                        player,
                        mutablePosGroupDivStats,
                        inNaturalTier,
                        undefined,
                        criteriaMult
                      );
                    }
                  });
                }
                const playerInfo = kv[1];

                return {
                  /** _id used for indexing purposes, will mostly use NCAA id */
                  _id: `${
                    rosterInfoJson[player.code || ""]?.player_code_id
                      ?.ncaa_id ||
                    `${playerInfo.code || kv[0]}${
                      playerInfo.team || ""
                    }`.replace(/[^A-Z]/gi, "")
                  }_${inGender}_${inYear.substring(0, 4)}_${label}`,
                  key: kv[0],
                  conf: conference,
                  team: team,
                  year: teamYear,
                  shotInfo: shotChartMap[kv[0]],
                  posFreqs,
                  ...((cutdownLowVolume
                    ? lowVolumeStripPlayerInfo(playerInfo)
                    : _.chain(playerInfo)
                        .toPairs()
                        .filter(
                          (
                            t2 //Reduce down to the field we'll actually need
                          ) =>
                            t2[0] == "off_team_poss" ||
                            t2[0] == "off_team_poss_pct" ||
                            t2[0] == "def_team_poss" ||
                            t2[0] == "def_team_poss_pct" ||
                            (t2[0] != "diag_off_rtg" &&
                              t2[0] != "diag_def_rtg" &&
                              t2[0] != "off_luck" &&
                              t2[0] != "def_luck" &&
                              !_.startsWith(t2[0], "off_team_") &&
                              !_.startsWith(t2[0], "def_team_") &&
                              !_.startsWith(t2[0], "off_oppo_") &&
                              !_.startsWith(t2[0], "def_oppo_") &&
                              !_.startsWith(t2[0], "team_") &&
                              !_.startsWith(t2[0], "oppo_") &&
                              !(
                                _.startsWith(t2[0], "total_") &&
                                !GradeUtils.playerTotalsToKeep.has(t2[0]) &&
                                !extraTotalFieldsToKeep.has(t2[0])
                              ) &&
                              !_.endsWith(t2[0], "_target") &&
                              !_.endsWith(t2[0], "_source") &&
                              t2[0] != "player_array" &&
                              t2[0] != "role" &&
                              t2[0] != "roster")
                        )
                        .fromPairs()
                        .value()) as PureStatSet),
                  ...posInfo,
                } as IndivStatSet;
              });

          const enrichedAndFilteredPlayers = enrichAndFilter(
            baselinePlayerInfo,
            rosterShotChartMap,
            false
          );
          // In "all" mode (ie for predictions) we keep a list of players with fewer minutes but who are still noteworthy
          const cutdownEnrichedPlayers =
            label == "all" ? enrichAndFilter(baselinePlayerInfo, {}, true) : [];

          const preRapmTableData = LineupTableUtils.buildEnrichedLineups(
            sortedLineups,
            teamGlobal,
            rosterGlobalButActuallyBaseline,
            teamBaseline,
            true,
            "baseline",
            avgEfficiency,
            false,
            teamSeasonLookup,
            positionFromPlayerKey,
            baselinePlayerInfo
          );

          // Now do all the RAPM work (after luck has been adjusted)
          if (!ignoreRapm) {
            //(TODO: test data isn't big enough to calc RAPM so ignore for now in unit test)
            const rapmInfo = TeamReportTableUtils.buildOrInjectRapm(
              preRapmTableData,
              baselinePlayerInfo,
              true, //<-always adjust for luck
              avgEfficiency,
              genderYearLookup
            );
            const enrichedAndFilteredPlayersMap = _.fromPairs(
              enrichedAndFilteredPlayers.map((p) => [p.key, p])
            );
            const cutdownEnrichedPlayersMap = _.fromPairs(
              cutdownEnrichedPlayers.map((p) => [p.key, p])
            );
            (rapmInfo?.enrichedPlayers || []).forEach((rapmP, index) => {
              const player = (enrichedAndFilteredPlayersMap[rapmP.playerId] ||
                cutdownEnrichedPlayersMap[rapmP.playerId]) as Record<
                string,
                any
              >;

              // RAPM (rating + productions)
              if (player && rapmP.rapm) {
                player.off_adj_rapm = rapmP.rapm?.off_adj_ppp;
                player.def_adj_rapm = rapmP.rapm?.def_adj_ppp;

                const cutdownMode = _.isNil(
                  enrichedAndFilteredPlayersMap[rapmP.playerId]
                );

                if (injectExtraDataForNbaFolks && !cutdownMode) {
                  player.rapm = _.omit(rapmP.rapm, [
                    "key",
                    "off_sep2-1",
                    "off_sep2-2",
                    "def_sep2-1",
                    "def_sep2-2",
                  ]);
                  // Also let's create an on/off net inside "rapm" since someone asked for that
                  player.on = _.chain(rapmP.on)
                    .toPairs()
                    .filter(
                      ([key, val]) =>
                        _.startsWith(key, "off_") || _.startsWith(key, "def")
                    )
                    .filter(
                      (
                        [key, val] //(remove scramble and transition stats, which don't seem to be included)
                      ) =>
                        !_.includes(key, "f_scramble_") &&
                        !_.includes(key, "f_trans_") &&
                        !_.endsWith(key, "_luck_diags")
                    )
                    .fromPairs()
                    .value();
                  player.off = _.chain(rapmP.off)
                    .toPairs()
                    .filter(
                      ([key, val]) =>
                        _.startsWith(key, "off_") || _.startsWith(key, "def")
                    )
                    .filter(
                      (
                        [key, val] //(remove scramble and transition stats, which don't seem to be included)
                      ) =>
                        !_.includes(key, "f_scramble_") &&
                        !_.includes(key, "f_trans_") &&
                        !_.endsWith(key, "_luck_diags")
                    )
                    .fromPairs()
                    .value();
                }

                if (cutdownMode) {
                  //(cutdown mode, pare down RAPM still further)
                  if (player.off_adj_rapm) {
                    (player.off_adj_rapm as Statistic).old_value = undefined;
                    (player.off_adj_rapm as Statistic).override = undefined;
                  }
                  if (player.def_adj_rapm) {
                    (player.def_adj_rapm as Statistic).old_value = undefined;
                    (player.def_adj_rapm as Statistic).override = undefined;
                  }
                } else {
                  //(normal mode, bunch of other stats)
                  player.off_adj_rapm_prod = {
                    value:
                      rapmP.rapm!.off_adj_ppp!.value! *
                      player.off_team_poss_pct!.value!,
                  };
                  if (player.def_adj_rapm && player.def_adj_rtg?.extraInfo) {
                    player.def_adj_rapm.extraInfo =
                      player.def_adj_rtg?.extraInfo; //(on-ball defense context, def_adj_rtg is a prior for RAPM)
                  }
                  player.def_adj_rapm_prod = {
                    value:
                      rapmP.rapm!.def_adj_ppp!.value! *
                      player.def_team_poss_pct!.value!,
                    old_value:
                      (rapmP.rapm?.def_adj_ppp?.old_value || 0) *
                      player.def_team_poss_pct!.value!,
                    override: rapmP.rapm?.def_adj_ppp?.override,
                    extraInfo: player.def_adj_prod?.extraInfo, //(on-ball defense context, def_adj_rtg is a prior for RAPM)
                  };
                  const simpleRapmFieldsToGrade = _.flatMap(
                    ["adj_rapm", "adj_rapm_prod"],
                    (k) => [`off_${k}`, `def_${k}`]
                  );
                  const derivedRapmFieldsToGrade = [
                    "off_adj_rapm_margin",
                    "off_adj_rapm_prod_margin",
                  ];

                  //(for advanced NBA stats)
                  const onOffFieldsToGrade = _.chain(["on_", "off_", "diff_"])
                    .flatMap((prefix) => {
                      return [`${prefix}off_`, `${prefix}def_`];
                    })
                    .flatMap((prefix) => {
                      return [
                        "ppp", //(TODO: surely this a list somewhere, it's the "base table set of stats")
                        "adj_ppp",
                        "efg",
                        "assist",
                        "to",
                        "orb",
                        "ftr",
                        "3p",
                        "3pr",
                        "2pmidr",
                        "2pmid",
                        "2primr",
                        "2prim",
                      ].map((k) => `${prefix}${k}`);
                    })
                    .value();

                  //(for advanced NBA stats)
                  const onOffStatAccessor = (dataSet: any, field: string) => {
                    if (field.startsWith("on_")) {
                      return dataSet.on?.[`${field.substring(3)}`]?.value;
                    } else if (field.startsWith("off_")) {
                      return dataSet.off?.[`${field.substring(4)}`]?.value;
                    } else if (field.startsWith("diff_")) {
                      const valOn =
                        dataSet.on?.[`${field.substring(5)}`]?.value;
                      const valOff =
                        dataSet.off?.[`${field.substring(5)}`]?.value;
                      if (!_.isNil(valOn) && !_.isNil(valOff)) {
                        return valOn - valOff;
                      } else {
                        return undefined;
                      }
                    } else {
                      return dataSet[field]?.value;
                    }
                  };

                  if ("all" == label) {
                    GradeUtils.buildAndInjectPlayerDivisionStats(
                      player,
                      mutablePlayerDivisionStats,
                      inNaturalTier,
                      simpleRapmFieldsToGrade
                    );
                    const otherRapmValues = {
                      off_team_poss_pct: {
                        value: player.off_team_poss_pct?.value || 0,
                      },
                      off_adj_rapm_margin: {
                        value:
                          (player.off_adj_rapm?.value || 0) -
                          (player.def_adj_rapm?.value || 0),
                      },
                      off_adj_rapm_prod_margin: {
                        value:
                          (player.off_adj_rapm_prod?.value || 0) -
                          (player.def_adj_rapm_prod?.value || 0),
                      },
                    };
                    GradeUtils.buildAndInjectPlayerDivisionStats(
                      otherRapmValues,
                      mutablePlayerDivisionStats,
                      inNaturalTier,
                      derivedRapmFieldsToGrade
                    );

                    // When creating extra data for NBA folks, add on/off percentiles
                    if (injectExtraDataForNbaFolks) {
                      GradeUtils.buildAndInjectPlayerDivisionStats(
                        player,
                        mutablePlayerDivisionStats,
                        inNaturalTier,
                        onOffFieldsToGrade,
                        1.0,
                        onOffStatAccessor
                      );

                      // Also in "extra NBA mode" we'll add player percentiles if they exist:
                      if (playerGradesJson) {
                        const nbaPercentiles =
                          GradeUtils.buildPlayerPercentiles(
                            playerGradesJson,
                            player,
                            simpleRapmFieldsToGrade,
                            false //(percentile not rank)
                          );
                        const nbaPercentilesExtraRapm =
                          GradeUtils.buildPlayerPercentiles(
                            playerGradesJson,
                            otherRapmValues,
                            derivedRapmFieldsToGrade,
                            false //(percentile not rank)
                          );
                        const nbaPercentilesOnOff = GradeUtils.buildPercentiles(
                          playerGradesJson,
                          player,
                          onOffFieldsToGrade,
                          _.chain(onOffFieldsToGrade)
                            .filter((field) => field.includes("def_"))
                            .map((field) => [field, true])
                            .fromPairs()
                            .value(),
                          false,
                          false,
                          onOffStatAccessor
                        );
                        _.chain(nbaPercentiles)
                          .toPairs()
                          .concat(_.toPairs(nbaPercentilesExtraRapm))
                          .concat(_.toPairs(nbaPercentilesOnOff))
                          .forEach((kv) => {
                            const field = kv[0];
                            const statVal = kv[1];
                            if (field.startsWith("on_")) {
                              const subField = field.substring(3);
                              if (
                                player.on?.[subField] &&
                                !_.isNil(statVal?.value)
                              ) {
                                player.on[subField].pctile = statVal.value;
                              }
                            } else if (
                              field.startsWith("off_off_") ||
                              field.startsWith("off_def_")
                            ) {
                              const subField = field.substring(4);
                              if (
                                player.off?.[subField] &&
                                !_.isNil(statVal?.value)
                              ) {
                                player.off[subField].pctile = statVal.value;
                              }
                            } else if (field.startsWith("diff_")) {
                              const subField = field.substring(5);
                              if (
                                player.on?.[subField] &&
                                !_.isNil(statVal?.value)
                              ) {
                                player.on[subField].diff_pctile = statVal.value;
                              }
                            } else if (field == "off_adj_rapm_margin") {
                              const placeholderField = "off_adj_rapm";
                              if (
                                player[placeholderField] &&
                                !_.isNil(statVal?.value)
                              ) {
                                player[placeholderField].diff_pctile =
                                  kv[1].value;
                              }
                            } else {
                              if (player[field] && !_.isNil(statVal?.value)) {
                                player[field].pctile = statVal.value;
                              }
                            }
                          })
                          .value();

                        //TODO: more complex on/off fields

                        //DEBUG:
                        // console.log(
                        //   `[${player.key}]: [${JSON.stringify(
                        //     nbaPercentilesOnOff
                        //   )}]`
                        // );
                      }
                    }

                    // Again, per position grouping:
                    (
                      PositionUtils.positionsToGroup[player.posClass] || []
                    ).forEach((posGroup) => {
                      const mutablePosGroupDivStats =
                        mutablePlayerDivisionStats_byPosGroup[posGroup];
                      if (mutablePosGroupDivStats) {
                        GradeUtils.buildAndInjectPlayerDivisionStats(
                          player,
                          mutablePosGroupDivStats,
                          inNaturalTier,
                          simpleRapmFieldsToGrade
                        );
                        GradeUtils.buildAndInjectPlayerDivisionStats(
                          otherRapmValues,
                          mutablePosGroupDivStats,
                          inNaturalTier,
                          derivedRapmFieldsToGrade
                        );
                      }
                    });
                  }

                  // For Off RAPM, we copy the non-luck version across, except when we are using it to regress the lineups:
                  ["off_adj_rapm", "off_adj_rapm_prod"].forEach((field) => {
                    const maybeRapm = player[field];
                    if (
                      !DateUtils.lineupsHavePlayerShotInfo(genderYearLookup)
                    ) {
                      if (maybeRapm?.old_value) {
                        maybeRapm.value = maybeRapm.old_value;
                        delete maybeRapm.override;
                      }
                    } else if (maybeRapm?.override) {
                      // Improve wording of luck override if we're keeping it
                      maybeRapm.override =
                        "Adjusted from per-lineup 3P% luck adjustments";
                    }
                  });
                }
              }
            });
          } //(end RAPM)

          //TODO: start with all players
          // one have attached RAPM, _then_ remove players but keeping "hidden gems" (5mpg vs 0.25, RAPM above some tier-based threshold)
          // TO DECIDE: could put that in separate file where we massively cut down on the fields we keep
          // (since we only need off/def rtg/adj rtg/rapm)
          // ^ fair bit of this is done now... still need to manage the filter by RAPM

          const tableData = _.take(preRapmTableData, 5).map((tmpLineup) => {
            // (removes unused fields from the JSON, to save space)
            const lineup = _.chain(tmpLineup)
              .toPairs()
              .filter((kv) => {
                return (
                  !_.startsWith(kv[0], "shot_info") &&
                  !_.startsWith(kv[0], "off_luck_diags") &&
                  !_.startsWith(kv[0], "def_luck_diags") &&
                  (!_.startsWith(kv[0], "total_") || //(need to keep scramble and transition counts for now, used in the interim play category tooltips)
                    _.endsWith(kv[0], "_poss") ||
                    _.endsWith(kv[0], "_ppp"))
                );
              })
              .fromPairs()
              .value() as LineupStatSet; //(we trust it has required fields)
            // Add conference:
            lineup.conf = conference;
            lineup.team = team;
            lineup.year = teamYear;
            lineup.team_off_adj_ppp = teamBaseline.off_adj_ppp || {
              value: 100,
            };
            lineup.team_def_adj_ppp = teamBaseline.def_adj_ppp || {
              value: 100,
            };
            // Add minimal player info:
            const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
            lineup.player_info = _.fromPairs(
              codesAndIds.map((cid) => {
                const fullPlayer = baselinePlayerInfo[cid.id] || {};
                const playerSubset = _.pick(fullPlayer, [
                  //These are the fields required for lineup display enrichment
                  "off_rtg",
                  "off_usage",
                  "def_orb",
                  "key",
                  "off_adj_rtg",
                  "def_adj_rtg",
                  "off_3pr",
                  "off_ftr",
                  "off_assist",
                ]) as any;
                playerSubset.height_in = fullPlayer.roster?.height_in;
                playerSubset.year_class = fullPlayer.roster?.year_class;
                playerSubset.ncaa_id =
                  fullPlayer.roster?.player_code_id?.ncaa_id;
                return [
                  cid.id,
                  {
                    ...playerSubset,
                    code: cid.code,
                    // Both these are needed to order the players within the lineup
                    posClass: positionFromPlayerKey[playerSubset.key]?.posClass,
                    posConfidences:
                      positionFromPlayerKey[playerSubset.key]?.posConfidences,
                  } as IndivStatSet & IndivPosInfo,
                ];
              })
            );
            //(now don't need this:)
            delete lineup.players_array;
            return lineup;
          });

          switch (label) {
            case "all":
              //(Lineup table doesn't have a single view so we duplcate)
              savedLineups.push(...tableData);
              //(Originally we did the same for players but now we have a combo view, we can avoid the hassle)
              if (inNaturalTier) {
                savedPlayers.push(...enrichedAndFilteredPlayers);
                savedLowVolumePlayers.push(
                  ...cutdownEnrichedPlayers.filter(lowVolumePlayerCheck)
                );
              }
              break;
            case "conf":
              savedConfOnlyLineups.push(...tableData);
              if (inNaturalTier) {
                savedConfOnlyPlayers.push(...enrichedAndFilteredPlayers);
              }
              break;
            case "t100":
              savedT100Lineups.push(...tableData);
              if (inNaturalTier) {
                savedT100Players.push(...enrichedAndFilteredPlayers);
              }
              break;

            default:
              console.log(`WARNING unexpected label: ${label}`);
          }
        }
      )
    ); //(end loop over leaderboards)

    await getAllDataPromise;
  }
  for (const teamObj of teams) {
    await handleTeam(teamObj, 0);
  }
  //  console.log("RECEIVED: " + JSON.stringify(tableData, null, 3));
}

/** The normal leaderboard won't contain anyone who has played < 25% aka 10mpg */
const lowVolThreshold = 0.25;

/** Handy util to identify which players are worthy of getting some consideration in pre-season predictions */
const lowVolumePlayerCheck = (p: IndivStatSet): boolean => {
  // For low volume players they have to have been reasonably good compared to their tier
  // The closer they are to the 10mpg threshold, the
  const offRapm = (p.off_adj_rapm as Statistic)?.value || 0;
  const defRapm = (p.def_adj_rapm as Statistic)?.value || 0;
  const classBonus = p.roster?.year_class == "Fr" ? 0 : 0.5; //(non Fr have to clear a higher bar)
  const highThresh = inTier == "High" ? 1.4 : inTier == "Medium" ? 0.4 : -0.6; //(if poss% == lowVolThresholdMid)
  const lowThresh = inTier == "High" ? 0.9 : inTier == "Medium" ? -0.1 : -1.1; //(if poss% == lowVolThreshold, more poss = less picky)
  const lowVolThresholdMid = lowVolThreshold / 2;
  const playerPossPctCapped = Math.min(
    p.off_team_poss_pct?.value || 0,
    lowVolThreshold
  );
  const alpha =
    Math.max(playerPossPctCapped - lowVolThresholdMid) / lowVolThresholdMid;
  const thresh = highThresh + alpha * (lowThresh - highThresh);

  // Simplier version .. just include anyone who played >=8% of mins (3.2+mpg)
  return Boolean(
    p.off_adj_rapm && p.def_adj_rapm && playerPossPctCapped >= 0.08
  ).valueOf();

  // return Boolean(
  //   p.off_adj_rapm && p.def_adj_rapm && offRapm - defRapm >= thresh + classBonus
  // ).valueOf();
};

/** Handy util to cut a player's stats down to the bare min needed for evaluating them */
const lowVolumeStripPlayerInfo = (p: IndivStatSet) =>
  _.chain(p)
    .pick([
      // much smaller subset of fields, to keep the size down
      "off_team_poss_pct",
      "def_team_poss_pct",
      "off_rtg",
      "off_usage",
      "def_orb",
      "off_adj_rtg",
      "def_adj_rtg",
      "off_adj_opp",
      "def_adj_opp",
      "off_poss", //(misc extra required fields)
      "roster",
      // (in some cases these are injected later - harmless extra fields if so)
      "off_rapm",
      "def_rapm",
      // (in some cases these are injected outside)
      "code",
      "key",
      "conf",
      "team",
      "year",
      "posFreqs",
      "posClass",
      "posConfidences",
    ])
    .mapValues((p) => {
      if ((p as Statistic)?.override) (p as Statistic).override = undefined;
      if ((p as Statistic)?.old_value) (p as Statistic).old_value = undefined;
      if ((p as Statistic)?.extraInfo) (p as Statistic).extraInfo = undefined;
      return p;
    })
    .value();

/** Adds some handy default sortings - includes stripped down view of key players removed due to lack of posessions in second array */
export function completePlayerLeaderboard(
  key: string,
  leaderboard: any[],
  topTableSize: number
) {
  if (key == "lowvol") {
    return [leaderboard, []]; //(no sorting or anything for lowvol, just get it out)
  } else {
    // Take [topTableSize] by possessions
    const sortedByPoss = _.sortBy(
      leaderboard,
      (player) => -1 * (player.off_team_poss?.value || 0)
    );
    const [topByPoss, processedCastOffs] = [
      sortedByPoss.splice(0, topTableSize),
      sortedByPoss.splice(topTableSize),
    ];

    ["rtg", "prod", "rapm", "rapm_prod"].forEach((subKey) => {
      _.sortBy(
        topByPoss,
        (player) =>
          (player[`def_adj_${subKey}`]?.value || 0) -
          (player[`off_adj_${subKey}`]?.value || 0)
      ).map((player, index) => {
        player[`adj_${subKey}_margin_rank`] = index + 1;
      });
      _.sortBy(
        topByPoss,
        (player) => player[`def_adj_${subKey}`]?.value || 0
      ).forEach((player, index) => {
        player[`def_adj_${subKey}_rank`] = index + 1;
      });
      _.sortBy(
        topByPoss,
        (player) => -1 * (player[`off_adj_${subKey}`]?.value || 0)
      ).forEach((player, index) => {
        player[`off_adj_${subKey}_rank`] = index + 1;
      });
    });
    const sortedLeaderboard = _.sortBy(
      topByPoss,
      (player) => player.adj_rapm_margin_rank
    );
    return [
      sortedLeaderboard,
      processedCastOffs
        .filter(lowVolumePlayerCheck)
        .map(lowVolumeStripPlayerInfo),
    ];
  }
}

/** Adds some handy default sortings and removes possession outliers (export for test only) */
export function completeLineupLeaderboard(
  key: string,
  leaderboard: any[],
  topLineupSize: number
) {
  const bareMinPoss = 40;
  // Take top lineups by possessions
  const topByPoss = _.chain(leaderboard)
    .filter((lineup) => (lineup.off_poss?.value || 0) >= bareMinPoss) // (bare min possessions)
    .sortBy((lineup) => -1 * (lineup.off_poss?.value || 0))
    .take(topLineupSize)
    .value();

  const regression_min_poss = 50;
  const regression_max_min_poss = 200; //(at 250 we're using the exact value)
  const avg_eff = 100;
  const extra_regression_poss = 150; //(below this we assume the lineup was worse than team average)
  const extra_regression_max = 10;
  const off_regress = (lineup: any) => {
    const poss = lineup.off_poss?.value || 0;
    const off_adj_ppp = lineup.off_adj_ppp?.value || avg_eff;
    const regression =
      (1 - Math.min(poss, extra_regression_poss) / extra_regression_poss) *
      extra_regression_max;
    const team_off_adj_ppp =
      (lineup.team_off_adj_ppp?.value || avg_eff) - regression; //slight regression because it's a low vol
    const factor =
      Math.min(
        Math.max(poss - regression_min_poss, 0),
        regression_max_min_poss
      ) / regression_max_min_poss;

    //DIAG
    // console.log(
    //   `Off regress for [${lineup.key}] ${off_adj_ppp} : ${poss} = ${
    //     factor * off_adj_ppp + (1 - factor) * team_off_adj_ppp
    //   } (${team_off_adj_ppp})`
    // );

    return factor * off_adj_ppp + (1 - factor) * team_off_adj_ppp;
  };
  const def_regress = (lineup: any) => {
    const poss = lineup.def_poss?.value || 0;
    const def_adj_ppp = lineup.def_adj_ppp?.value || avg_eff;
    const regression = (1 - Math.min(poss, 150) / 150) * 10;
    const team_def_adj_ppp =
      (lineup.team_def_adj_ppp?.value || avg_eff) + regression; //slight regression because it's a low vol
    const factor =
      Math.min(
        Math.max(poss - regression_min_poss, 0),
        regression_max_min_poss
      ) / regression_max_min_poss;
    return factor * def_adj_ppp + (1 - factor) * team_def_adj_ppp;
  };

  _.sortBy(topByPoss, (lineup) => -1 * off_regress(lineup)).forEach(
    (lineup, index) => {
      lineup[`off_adj_ppp_rank`] = index + 1;
    }
  );
  _.sortBy(topByPoss, (lineup) => def_regress(lineup)).forEach(
    (lineup, index) => {
      lineup[`def_adj_ppp_rank`] = index + 1;
    }
  );
  const rankedLineups = _.sortBy(
    topByPoss,
    (lineup) => def_regress(lineup) - off_regress(lineup)
  ).map((lineup, index) => {
    lineup[`adj_margin_rank`] = index + 1;
    return lineup;
  });
  return rankedLineups;
}

/** If all 3 exist, combines stats for High/Medium/Low tiers */
export async function combineDivisionStatsFiles(player: Boolean = false) {
  const playerInfix = player ? "players_" : "";
  const tiers = ["High", "Medium", "Low"];
  const posGroups = [""].concat(
    player ? PositionUtils.positionGroupings.map((g) => `pos${g}_`) : []
  );

  const allPosGroupsComplete = posGroups.map(async (posInfix) => {
    const filesToCombine: Promise<[String, DivisionStatistics[]]>[] = tiers.map(
      (tier) => {
        const divisionStatsInFilename = `${rootFilePath}/stats_${playerInfix}${posInfix}all_${inGender}_${inYear.substring(
          0,
          4
        )}_${tier}.json`;
        const statsPromise: Promise<[String, DivisionStatistics[]]> = fs
          .readFile(divisionStatsInFilename)
          .then((buffer) => {
            return [
              tier,
              [JSON.parse(buffer.toString()) as DivisionStatistics],
            ] as [string, DivisionStatistics[]];
          })
          .catch((err) => [tier, [] as DivisionStatistics[]]);
        return statsPromise;
      }
    );
    const resolvedFilesAwait = await Promise.all(filesToCombine);
    const resolvedFiles: Record<string, DivisionStatistics> = _.chain(
      resolvedFilesAwait
    )
      .filter((kv) => kv[1].length > 0 && !_.isEmpty(kv[1][0]!.dedup_samples)) //(if hot has dedup_samples - makes this method idempotent-ish)
      .fromPairs()
      .mapValues((array) => array[0]!)
      .value();

    const combineDivisionStats = (toCombine: DivisionStatistics[]) => {
      const allKeys = _.chain(toCombine)
        .flatMap((stats) => _.keys(stats.dedup_samples))
        .value();
      const combinedSamples = _.transform(
        allKeys,
        (acc, key) => {
          acc[key] = _.flatMap(
            toCombine,
            (stat) => stat.dedup_samples[key] || []
          ); //(gets re-sorted below)
        },
        {} as Record<string, Array<number>>
      );

      // Build LUT from presorted samples
      return player
        ? GradeUtils.buildAndInjectPlayerDivisionStatsLUT({
            tier_sample_size: _.sumBy(
              toCombine,
              (stats) => stats.dedup_sample_size
            ),
            tier_samples: combinedSamples,
            tier_lut: {},
            dedup_sample_size: 0,
            dedup_samples: {},
          })
        : GradeUtils.buildAndInjectTeamDivisionStatsLUT({
            tier_sample_size: _.sumBy(
              toCombine,
              (stats) => stats.dedup_sample_size
            ),
            tier_samples: combinedSamples,
            tier_lut: {},
            dedup_sample_size: 0,
            dedup_samples: {},
          });
    };

    const divisionStatsComboFilename = `${rootFilePath}/stats_${playerInfix}${posInfix}all_${inGender}_${inYear.substring(
      0,
      4
    )}_Combo.json`;
    const combinedFilesPromise =
      _.keys(resolvedFiles).length == 3
        ? fs.writeFile(
            divisionStatsComboFilename,
            JSON.stringify(
              combineDivisionStats(_.values(resolvedFiles)),
              reduceNumberSize
            )
          )
        : Promise.resolve();

    await combinedFilesPromise; //(so we'll error out if this step fails - otherwise could lose dedup_samples before using them)

    console.log(
      `Completed combining stats for [${_.keys(
        resolvedFiles
      )}] files (player=${player}), now need to tidy up component files`
    );

    const filesToOutput = _.map(resolvedFiles, (stats, tier) => {
      const divisionStatsOutFilename = `${rootFilePath}/stats_${playerInfix}${posInfix}all_${inGender}_${inYear.substring(
        0,
        4
      )}_${tier}.json`;
      // Remove the dedup_samples since it's now been calculated
      return fs.writeFile(
        divisionStatsOutFilename,
        JSON.stringify({ ...stats, dedup_samples: {} }, reduceNumberSize)
      );
    });

    const filesToOutputComplete = Promise.all(filesToOutput);
    await filesToOutputComplete;

    console.log(
      `Completed combining stats and tidying up component stats in [${_.size(
        filesToOutput
      )}] files (player=${player})`
    );

    return filesToOutputComplete;
  });

  await Promise.all(allPosGroupsComplete);

  console.log(
    `Completed combining stats and tidying up component stats in [${_.size(
      allPosGroupsComplete
    )}] position group(s) (player=${player})`
  );
}

if (!testMode) {
  if (inTier == "Combo") {
    // Check files:
    const checkOnBall = true; //(normally false because we don't always expect it)
    console.log(
      `(Checking roster and maybe [${checkOnBall}] on-ball filenames)`
    );
    teamListChain
      .filter(
        (team) => testTeamFilter == undefined || testTeamFilter.has(team.team)
      )
      .filter((team) => {
        return (
          team.gender == inGender &&
          (inYear == "Extra" || team.year == inYear) &&
          !team.use_team //(these are teams that have changed names - under their "not valid that year" name)
        );
      })
      .forEach(async (team: AvailableTeamMeta, index: number) => {
        if (inTier == "Combo") {
          // For info check roster and on-ball defense:
          const rosterInfoFile = getRosterFilename(team.team, team.year);
          await fs.readFile(rosterInfoFile).catch((err: any) => {
            console.log(`Couldn't load [${rosterInfoFile}]: [${err}]`);
          });
          const onBallDefenseFile = getOnBallDefenseFilename(
            team.team,
            team.year
          );
          await fs.readFile(onBallDefenseFile).catch((err: any) => {
            console.log(`Couldn't load [${onBallDefenseFile}]: [${err}]`);
          });
        }
      })
      .value();

    // Now actual processing:
    console.log(`(Combining different tiers' stats)`);
    combineDivisionStatsFiles(false)
      .then(async (dummy) => {
        return combineDivisionStatsFiles(true); //(team==false then players==true)
      })
      .then(async (dummy) => {
        console.log("File creation Complete!");
        if (!testMode) {
          //(ie always)
          console.log("(exiting process)");
          process.exit(0);
        }
      });
  } else {
    main().then(async (dummy) => {
      const topLineupSize = onlyHasTopConferences ? 300 : 750;
      const topPlayersSize = 1500; //(at 1500 essentially just means the 10mpg is only qualifier)

      console.log("Processing Complete!");

      var savedCastoffs = [] as IndivStatSet[];

      const outputCases: Array<[string, Array<any>, Array<any>, Array<any>]> = [
        ["all", savedLineups, savedPlayers, detailedTeamInfo],
        ["lowvol", [], savedLowVolumePlayers, []],
        [
          "conf",
          savedConfOnlyLineups,
          savedConfOnlyPlayers,
          detailedTeamInfoConfOnly,
        ],
        ["t100", savedT100Lineups, savedT100Players, detailedTeamInfoT100],
      ];

      await Promise.all(
        _.flatMap(outputCases, (kv) => {
          const label = kv[0];
          const sortedLineups = completeLineupLeaderboard(
            label,
            kv[1],
            topLineupSize
          );
          const sortedLineupsStr = JSON.stringify(
            {
              lastUpdated: lastUpdated,
              confMap: mutableConferenceMap,
              confs: _.keys(mutableConferenceMap),
              lineups: sortedLineups,
            },
            reduceNumberSize
          );

          const playersToWrite = kv[2].concat(
            label == "lowvol" ? savedCastoffs : []
          );
          const [players, castOffs] = completePlayerLeaderboard(
            label,
            playersToWrite,
            topPlayersSize
          );
          if (label == "all") savedCastoffs = castOffs;

          const playersStr = JSON.stringify(
            {
              lastUpdated: lastUpdated,
              confMap: mutableConferenceMap,
              confs: _.keys(mutableConferenceMap),
              players: players,
            },
            reduceNumberSize
          );

          // Write to file
          console.log(
            `${kv[0]} lineup count: [${sortedLineups.length}] ([${kv[1].length}])`
          );
          console.log(`${kv[0]} lineup length: [${sortedLineupsStr.length}]`);
          const lineupFilename = `${rootFilePath}/lineups_${
            kv[0]
          }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;
          const lineupsWritePromise = _.isEmpty(sortedLineups)
            ? Promise.resolve()
            : fs.writeFile(`${lineupFilename}`, sortedLineupsStr);
          console.log(
            `${kv[0]} player count: [${players.length}] ([${kv[2].length}])`
          );
          console.log(`${kv[0]} player length: [${playersStr.length}]`);
          const playersFilename = `${rootFilePath}/players_${
            kv[0]
          }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;
          const playersWritePromise = fs.writeFile(
            `${playersFilename}`,
            playersStr
          );

          const teamFilename = `${rootFilePath}/teams_${
            kv[0]
          }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;
          console.log(`${kv[0]} team count: ${teamInfo.length}`);

          const teamWritePromise =
            "all" == kv[0] && teamInfo.length > 0
              ? fs.writeFile(
                  `${teamFilename}`,
                  JSON.stringify(
                    {
                      lastUpdated: lastUpdated,
                      confMap: mutableConferenceMap,
                      confs: _.keys(mutableConferenceMap),

                      bubbleOffense: bubbleOffenseInfo,
                      bubbleDefense: bubbleDefenseInfo,

                      teams: teamInfo,
                    },
                    reduceNumberSize
                  )
                )
              : Promise.resolve();

          const detailedTeamFilename = `${rootFilePath}/team_details_${
            kv[0]
          }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;

          const detailedTeamWritePromise =
            kv[3].length > 0
              ? fs.writeFile(
                  `${detailedTeamFilename}`,
                  JSON.stringify(
                    {
                      lastUpdated: lastUpdated,
                      confMap: mutableConferenceMap,
                      confs: _.keys(mutableConferenceMap),

                      //(so can build an approximate power ranking without pulling in an extra set of files)
                      bubbleOffense: bubbleOffenseInfo,
                      bubbleDefense: bubbleDefenseInfo,

                      teams: kv[3],
                    },
                    reduceNumberSize
                  )
                )
              : Promise.resolve();

          const teamStatFilename = `${rootFilePath}/team_stats_${
            kv[0]
          }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;
          console.log(`${kv[0]} team stats count: ${teamStatInfo.length}`);

          const teamWriteStatPromise =
            "all" == kv[0] && teamInfo.length > 0
              ? fs.writeFile(
                  `${teamStatFilename}`,
                  JSON.stringify(
                    {
                      lastUpdated: lastUpdated,
                      confMap: mutableConferenceMap,
                      confs: _.keys(mutableConferenceMap),

                      teams: teamStatInfo,
                    },
                    reduceNumberSize
                  )
                )
              : Promise.resolve();

          // Division stats
          const writeDivisionStats = "all" == kv[0];

          // Team division stats:
          if (writeDivisionStats) {
            GradeUtils.buildAndInjectTeamDivisionStatsLUT(mutableDivisionStats);
          }
          const divisionStatsFilename = `${rootFilePath}/stats_${
            kv[0]
          }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;
          const divisionStatsWritePromise = writeDivisionStats
            ? fs.writeFile(
                divisionStatsFilename,
                JSON.stringify(mutableDivisionStats, reduceNumberSize)
              )
            : Promise.resolve();

          // Player division stats:
          if (writeDivisionStats) {
            GradeUtils.buildAndInjectPlayerDivisionStatsLUT(
              mutablePlayerDivisionStats
            );
            PositionUtils.positionGroupings.forEach((posGroup) => {
              const mutablePosGroupDivStats =
                mutablePlayerDivisionStats_byPosGroup[posGroup];
              if (mutablePosGroupDivStats) {
                GradeUtils.buildAndInjectPlayerDivisionStatsLUT(
                  mutablePosGroupDivStats
                );
              }
            });
          }
          const playerDivisionStatsFilename = `${rootFilePath}/stats_players_${
            kv[0]
          }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;
          const playerDivisionStatsWritePromise = writeDivisionStats
            ? fs.writeFile(
                playerDivisionStatsFilename,
                JSON.stringify(mutablePlayerDivisionStats, reduceNumberSize)
              )
            : Promise.resolve();

          const posGroupPromises = writeDivisionStats
            ? PositionUtils.positionGroupings.map((posGroup) => {
                const mutablePosGroupDivStats =
                  mutablePlayerDivisionStats_byPosGroup[posGroup];
                if (mutablePosGroupDivStats) {
                  const playerDivisionStatsFilename = `${rootFilePath}/stats_players_pos${posGroup}_${
                    kv[0]
                  }_${inGender}_${inYear.substring(0, 4)}_${inTier}.json`;
                  return fs.writeFile(
                    playerDivisionStatsFilename,
                    JSON.stringify(mutablePosGroupDivStats, reduceNumberSize)
                  );
                } else {
                  return Promise.resolve();
                }
              })
            : [];

          if (writeDivisionStats) {
            console.log(
              `Writing division stats: teams:[${mutableDivisionStats.tier_sample_size}]/dedup=[${mutableDivisionStats.dedup_sample_size}] ` +
                `players:[${mutablePlayerDivisionStats.tier_sample_size}]/dedup=[${mutablePlayerDivisionStats.dedup_sample_size}]`
            );
          }

          return [
            lineupsWritePromise,
            playersWritePromise,
            teamWritePromise,
            detailedTeamWritePromise,
            teamWriteStatPromise,
            divisionStatsWritePromise,
            playerDivisionStatsWritePromise,
          ].concat(posGroupPromises);

          //(don't zip, the server/browser does it for us, so it's mainly just "wasting GH space")
          // zlib.gzip(sortedLineupsStr, (_, result) => {
          //   fs.writeFile(`${filename}.gz`,result, err => {});
          // });
        })
      );
      console.log("File creation Complete!");
      if (!testMode) {
        //(ie always)
        console.log("(exiting process)");
        process.exit(0);
      }
    });
  }
}
