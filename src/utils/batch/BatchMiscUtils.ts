import _ from "lodash";
import { RequestUtils } from "../RequestUtils";
import { promises as fs } from "fs";
import { DateUtils } from "../DateUtils";
import { IndivStatSet } from "../StatModels";
import {
  AvailableTeams,
  AvailableTeamMeta,
} from "../internal-data/AvailableTeams";
import {
  effectivelyHighMajor,
  excludeFromMidMajor,
} from "../public-data/ConferenceInfo";

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
}
