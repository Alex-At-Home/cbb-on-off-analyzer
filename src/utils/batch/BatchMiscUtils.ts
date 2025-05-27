import _ from "lodash";
import { RequestUtils } from "../RequestUtils";
import { promises as fs } from "fs";
import { DateUtils } from "../DateUtils";
import { IndivStatSet } from "../StatModels";

export class BatchMiscUtils {
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
}
