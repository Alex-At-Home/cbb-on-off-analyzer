import _ from "lodash";
import { RequestUtils } from "../RequestUtils";
import { promises as fs } from "fs";
import { DateUtils } from "../DateUtils";
import { CompressedHexZone, IndivStatSet, TeamInfo as StatsTeamInfo } from "../StatModels";
import {
  AvailableTeams,
  AvailableTeamMeta,
} from "../internal-data/AvailableTeams";
import {
  effectivelyHighMajor,
  excludeFromMidMajor,
} from "../public-data/ConferenceInfo";
import { PlayTypeUtils } from "../stats/PlayTypeUtils";
import { PositionUtils } from "../stats/PositionUtils";

type TeamInfo = {
  teams: AvailableTeamMeta[];
  incompleteConfs: Set<string>;
};

export class BatchMiscUtils {
  /** Handy util for reducing  */
  static readonly reduceNumberSize = (k: string, v: any) => {
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

  /** Older years only have a high tier (+ misc_conf for non "high major conf" teams of interest) */
  static readonly onlyHasTopConferences = (
    inGender: string,
    inYear: string
  ): boolean =>
    inGender != "Men" || inYear < DateUtils.yearFromWhichAllMenD1Imported;

  /** Handy filename util */
  static readonly getTeamFilename = (team: string) => {
    return RequestUtils.fixLocalhostRosterUrl(team, false);
  };

  /** Loads the player JSON from a given season */
  static readonly loadPlayersFromLeaderboard = async (
    inYear: string,
    inGender: string,
    label: string,
    rootFilePath: string
  ): Promise<Record<string, IndivStatSet[]>> => {
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
            `${rootFilePath}/players_${label}_${inGender}_${subYear}_${tier}.json`
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
    const allPlayerStatsCacheByTeam = _.chain(playerJsons)
      .flatMap((response, tierIndex) => {
        const players = (response?.players || []) as Array<IndivStatSet>;
        numPlayers += players.length; //(just for diagnostics)
        return players;
      })
      .groupBy((p) => p.team)
      .value();

    console.log(
      `Cached [${numPlayers}] players in [${_.size(
        allPlayerStatsCacheByTeam
      )}] teams`
    );
    return allPlayerStatsCacheByTeam;
  };

  /** Provides a list of teams for the year / gender */
  static readonly getBaseTeamList = (
    inYear: string,
    inGender: string,
    testTeamFilter?: Set<string> | undefined
  ): _.CollectionChain<AvailableTeamMeta> => {
    const teamListChain =
      inYear == "Extra"
        ? _.chain(AvailableTeams.extraTeamsBase)
        : _.chain(AvailableTeams.byName).values().flatten();

    const teams = teamListChain
      .filter(
        (team) => testTeamFilter == undefined || testTeamFilter.has(team.team)
      )
      .filter((team) => {
        return (
          team.gender == inGender && (inYear == "Extra" || team.year == inYear)
        );
      });

    return teams;
  };

  /** Provides a list of teams for which to peform batch actions */
  static readonly getTeamListToProcess = (
    inYear: string,
    inGender: string,
    inTier: string,
    completedEfficiencyInfo: Record<string, any>,
    testTeamFilter: Set<string> | undefined
  ): TeamInfo => {
    const mutableIncompleteConfs = new Set() as Set<string>;

    const teams = BatchMiscUtils.getBaseTeamList(
      inYear,
      inGender,
      testTeamFilter
    )
      .filter((team) => {
        const conference =
          completedEfficiencyInfo?.[team.team]?.conf || "Unknown";
        const rank =
          completedEfficiencyInfo?.[team.team]?.["stats.adj_margin.rank"] ||
          400;
        // For years with lots of conferences, split into tiers:
        if (BatchMiscUtils.onlyHasTopConferences(inGender, inYear)) {
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

    return {
      teams,
      incompleteConfs: mutableIncompleteConfs,
    };
  };

  /** Need these to break down play types a bit (in advance of doing it properly) */
  static readonly extraTotalFields = [
    "total_off_scramble_fga",
    "total_off_scramble_to",
    "total_off_trans_fga",
    "total_off_trans_to",
  ];

  /** After writing the full player object, we want to build the cut-down version that we load in bulk */
  static readonly stripExtraInfo = (p: IndivStatSet): IndivStatSet => {
    // 1] Remove Hex Data, leaving only zone information
    const shotInfo = p.shotInfo as CompressedHexZone | undefined;
    if (shotInfo && shotInfo.data) {
      delete shotInfo.data;
    }
    // 2] Remove extra fields to keep
    BatchMiscUtils.extraTotalFields.forEach((f) => {
      if (p[f]) delete p[f];
    });
    // 3] Decompress player styles (ignore the type grovelling here!)
    if (p.style) {
      (p as any).style = PlayTypeUtils.compressIndivPlayType(p.style as any);
    }
    // 4] Remove .rapm, .on, and .off
    if (p.rapm) delete p.rapm;
    if (p.on) delete p.on;
    if (p.off) delete p.off;
    // 5] Reprocess positional info (see maybeConvertPosInfo in buildLeaderboards): posFreqs and posConfidences
    if (p.posFreqs) {
      const expandedPosFreqs = p.posFreqs as any as Record<string, number>;
      p.posFreqs = PositionUtils.tradPosList.map(
        (pos) => expandedPosFreqs[pos.substring(4)] || 0
      );
    }
    if (p.posConfidences) {
      const expandedPosConfs = p.posConfidences as any as Record<
        string,
        number
      >;
      p.posConfidences = PositionUtils.tradPosList.map(
        (pos) => expandedPosConfs[pos.substring(4)] || 0
      );
    }
    return p;
  };

  /** Validates team vs opponent game matrix symmetry across tiers with location tracking */
  static readonly validateTeamOpponentMatrix = async (
    inGender: string,
    inYear: string,
    rootFilePath: string
  ): Promise<{ 
    simple: Array<{ bad_team: string; oppo: string; location: string }>;
    complex: Array<{ team: string; opponent: string; team_vs_oppo: Record<string, number>; oppo_vs_team: Record<string, number> }>
  }> => {
    const simpleCases: Array<{ bad_team: string; oppo: string; location: string }> = [];
    const complexCases: Array<{ team: string; opponent: string; team_vs_oppo: Record<string, number>; oppo_vs_team: Record<string, number> }> = [];
    const subYear = inYear.substring(0, 4);
    
    // Determine which tiers exist for this year
    const tiersForThisYear = inYear < DateUtils.yearFromWhichAllMenD1Imported 
      ? ["High"] 
      : ["High", "Medium", "Low"];

    // Matrix to store team vs opponent game counts by location
    const gameMatrix: Record<string, Record<string, Record<string, number>>> = {};

    // Read all team files for each tier
    for (const tier of tiersForThisYear) {
      const teamFilename = `${rootFilePath}/teams_all_${inGender}_${subYear}_${tier}.json`;
      
      try {
        const fileContent = await fs.readFile(teamFilename);
        const teamData = JSON.parse(fileContent.toString());
        const teams = teamData.teams as StatsTeamInfo[];

        // Process each team's opponents
        teams.forEach((team) => {
          if (!gameMatrix[team.team_name]) {
            gameMatrix[team.team_name] = {};
          }

          team.opponents.forEach((opponent) => {
            const opponentName = opponent.oppo_name;
            const location = opponent.location_type;
            
            // Initialize opponent record if needed
            if (!gameMatrix[team.team_name][opponentName]) {
              gameMatrix[team.team_name][opponentName] = {};
            }
            
            // Count games by location
            if (!gameMatrix[team.team_name][opponentName][location]) {
              gameMatrix[team.team_name][opponentName][location] = 0;
            }
            gameMatrix[team.team_name][opponentName][location]++;
          });
        });
      } catch (err) {
        console.log(`Could not load team file [${teamFilename}]: [${err}]`);
      }
    }

    // Helper function to get expected opponent location
    const getExpectedOpponentLocation = (teamLocation: string): string => {
      switch (teamLocation) {
        case "Home": return "Away";
        case "Away": return "Home";
        case "Neutral": return "Neutral";
        default: return teamLocation;
      }
    };

    // Check matrix symmetry with location switching
    Object.keys(gameMatrix).forEach((team) => {
      Object.keys(gameMatrix[team]).forEach((opponent) => {
        const teamVsOppo = gameMatrix[team][opponent];
        const oppoVsTeam = gameMatrix[opponent]?.[team] || {};
        
        // Check if this is a simple mismatch (one side has data, other is empty/missing)
        const teamLocations = Object.keys(teamVsOppo);
        const oppoLocations = Object.keys(oppoVsTeam);
        const teamTotalGames = teamLocations.reduce((sum, loc) => sum + teamVsOppo[loc], 0);
        const oppoTotalGames = oppoLocations.reduce((sum, loc) => sum + oppoVsTeam[loc], 0);
        
        // Simple case: one team has games, other has none
        if (teamTotalGames > 0 && oppoTotalGames === 0) {
          // Team has data but opponent doesn't - opponent is the bad team
          teamLocations.forEach((location) => {
            const expectedOpponentLocation = getExpectedOpponentLocation(location);
            for (let i = 0; i < teamVsOppo[location]; i++) {
              simpleCases.push({
                bad_team: opponent,
                oppo: team,
                location: expectedOpponentLocation
              });
            }
          });
        } else if (teamTotalGames === 0 && oppoTotalGames > 0) {
          // Opponent has data but team doesn't - team is the bad team
          oppoLocations.forEach((opponentLocation) => {
            const expectedTeamLocation = getExpectedOpponentLocation(opponentLocation);
            for (let i = 0; i < oppoVsTeam[opponentLocation]; i++) {
              simpleCases.push({
                bad_team: team,
                oppo: opponent,
                location: expectedTeamLocation
              });
            }
          });
        } else if (teamTotalGames > 0 || oppoTotalGames > 0) {
          // Check if there are any mismatches
          let hasMismatch = false;
          
          // Check each location for this team vs opponent
          teamLocations.forEach((location) => {
            const teamGames = teamVsOppo[location];
            const expectedOpponentLocation = getExpectedOpponentLocation(location);
            const opponentGames = oppoVsTeam[expectedOpponentLocation] || 0;
            
            if (teamGames !== opponentGames) {
              hasMismatch = true;
            }
          });
          
          // Also check if opponent has extra locations not accounted for
          oppoLocations.forEach((opponentLocation) => {
            const expectedTeamLocation = getExpectedOpponentLocation(opponentLocation);
            if (!teamVsOppo[expectedTeamLocation]) {
              hasMismatch = true;
            }
          });

          if (hasMismatch) {
            // Check if it's a simple mismatch within locations
            let isSimpleMismatch = true;
            const allMismatches: Array<{ bad_team: string; oppo: string; location: string }> = [];
            
            // Check team vs opponent mismatches
            teamLocations.forEach((location) => {
              const teamGames = teamVsOppo[location];
              const expectedOpponentLocation = getExpectedOpponentLocation(location);
              const opponentGames = oppoVsTeam[expectedOpponentLocation] || 0;
              
              if (teamGames > opponentGames) {
                // Team has more games - opponent is missing some
                const missing = teamGames - opponentGames;
                for (let i = 0; i < missing; i++) {
                  allMismatches.push({
                    bad_team: opponent,
                    oppo: team,
                    location: expectedOpponentLocation
                  });
                }
              } else if (opponentGames > teamGames) {
                // Opponent has more games - team is missing some
                const missing = opponentGames - teamGames;
                for (let i = 0; i < missing; i++) {
                  allMismatches.push({
                    bad_team: team,
                    oppo: opponent,
                    location: location
                  });
                }
              }
            });
            
            // Check opponent vs team mismatches not already covered
            oppoLocations.forEach((opponentLocation) => {
              const expectedTeamLocation = getExpectedOpponentLocation(opponentLocation);
              if (!teamVsOppo[expectedTeamLocation] && oppoVsTeam[opponentLocation] > 0) {
                const missing = oppoVsTeam[opponentLocation];
                for (let i = 0; i < missing; i++) {
                  allMismatches.push({
                    bad_team: team,
                    oppo: opponent,
                    location: expectedTeamLocation
                  });
                }
              }
            });
            
            // If we can explain all mismatches as simple missing games, use simple format
            if (allMismatches.length > 0) {
              simpleCases.push(...allMismatches);
            } else {
              // Complex mismatch - fall back to JSON
              complexCases.push({
                team,
                opponent,
                team_vs_oppo: teamVsOppo,
                oppo_vs_team: oppoVsTeam
              });
            }
          }
        }
      });
    });

    return { simple: simpleCases, complex: complexCases };
  };
}
