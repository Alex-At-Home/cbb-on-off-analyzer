// Lodash:
import _ from "lodash";

// Next imports:
import fetch from "isomorphic-unfetch";
import { ParamDefaults } from "./FilterModels";
import { DateUtils } from "./DateUtils";

/** Information about transfer (typically indexed by player code) */
export type TransferModel = {
  f: string; //(team transferring from)
  t?: string; //(team transferring to)
};

export class LeaderboardUtils {
  //////////////////////////////////////

  // Top level methods

  /** Get multiple years and tier of player leaderboards, plus transfer info for a given year
   * Returns a list of JSONs, the last transfersYear.size of which are transfers
   */
  static getMultiYearPlayerLboards(
    dataSubEventKey: "all" | "t100" | "conf" | "all-lowvol",
    gender: string,
    fullYear: string,
    tier: string,
    transferYears: string[],
    otherYears: string[],
  ): Promise<any[]> {
    return LeaderboardUtils.getMultiYearLboards(
      gender,
      fullYear,
      tier,
      transferYears,
      otherYears,
      (gender: string, subYear: string, inTier: string) =>
        dataSubEventKey == "all-lowvol"
          ? [
              LeaderboardUtils.getPlayerUrl("all", gender, subYear, inTier),
              LeaderboardUtils.getPlayerUrl("lowvol", gender, subYear, inTier),
            ]
          : [
              LeaderboardUtils.getPlayerUrl(
                dataSubEventKey,
                gender,
                subYear,
                inTier,
              ),
            ],
    );
  }

  /** Get multiple years and tier of player/lineup leaderboards, plus transfer info for a given year
   * Returns a list of JSONs, the last transfersYear.size of which are transfers
   */
  private static getMultiYearLboards(
    gender: string,
    fullYear: string,
    tier: string,
    transferYears: string[],
    otherYears: string[],
    getUrl: (gender: string, subYear: string, inTier: string) => string[],
  ): Promise<any[]> {
    const year = fullYear.substring(0, 4);

    const years = fullYear.startsWith(DateUtils.MultiYearPrefix)
      ? DateUtils.getMultiYearSelection(fullYear)
      : _.filter(
          DateUtils.lboardYearListWithExtra,
          (inYear) =>
            year == DateUtils.AllYears ||
            inYear == fullYear ||
            _.some(otherYears, (y) => y == inYear),
        );
    const tiers = _.filter(
      ["High", "Medium", "Low"],
      (inTier) => tier == "All" || inTier == tier,
    );

    const yearsAndTiers = _.flatMap(years, (inYear) =>
      tiers.map((inTier) => [inYear, inTier]),
    );

    const fetchAll = Promise.all(
      _.flatMap(yearsAndTiers, ([inYear, inTier]) => {
        const subYear = inYear.substring(0, 4);
        return getUrl(gender, subYear, inTier).map((url) =>
          fetch(url).then((response: fetch.IsomorphicResponse) => {
            return response.ok
              ? response.json().then((j: any) => {
                  //(tag the tier in)
                  if (tier == "All") j.tier = inTier;
                  return j;
                })
              : Promise.resolve({ error: "No data available" });
          }),
        );
      }).concat(LeaderboardUtils.getTransferInfo(transferYears)),
    );
    return fetchAll;
  }

  /** Returns just the transfer info about a given year */
  static getTransferInfo(years: string[]): Promise<any>[] {
    return years.map((transferYear) => {
      const transferJsonPath = _.thru(transferYear, (__) => {
        if (
          !transferYear ||
          transferYear.substring(0, 4) ==
            DateUtils.offseasonPredictionYear.substring(0, 4)
        ) {
          return `/api/getTransfers?transferMode=${transferYear || ""}`;
        } else {
          return `/leaderboards/roster_movement/transfers_${transferYear.substring(
            0,
            4,
          )}.json`;
        }
      });
      return transferYear
        ? fetch(transferJsonPath).then((response: fetch.IsomorphicResponse) => {
            return response.ok ? response.json() : Promise.resolve({});
          })
        : Promise.resolve({});
    });
  }

  /** Get a single year of player leaderboard for a single tier (mostly for older years when there was only one tier) */
  static getSingleYearPlayerLboards(
    dataSubEventKey: "all" | "t100" | "conf",
    gender: string,
    fullYear: string,
    tier: string,
  ): Promise<any> {
    return LeaderboardUtils.getSingleYearLboards(
      gender,
      fullYear,
      tier,
      (gender: string, subYear: string, inTier: string) =>
        LeaderboardUtils.getPlayerUrl(dataSubEventKey, gender, subYear, inTier),
    );
  }

  /** Get a single year of player/lineup leaderboard for a single tier (mostly for older years when there was only one tier) */
  private static getSingleYearLboards(
    gender: string,
    fullYear: string,
    tier: string,
    getUrl: (gender: string, subYear: string, inTier: string) => string,
  ): Promise<any> {
    const year = fullYear.substring(0, 4);

    return fetch(getUrl(gender, year, tier)).then(
      (response: fetch.IsomorphicResponse) => {
        return response.ok
          ? response.json()
          : Promise.resolve({ error: "No data available" });
      },
    );
  }

  /** Get a single year (but multiple tiers) of team stats
   */
  static getMultiYearTeamStats(
    gender: string,
    fullYear: string,
    tier: string,
    otherYears: string[],
  ): Promise<any[]> {
    const year = fullYear.substring(0, 4);

    const years = fullYear.startsWith(DateUtils.MultiYearPrefix)
      ? DateUtils.getMultiYearSelection(fullYear)
      : _.filter(
          DateUtils.lboardYearListWithExtra,
          (inYear) =>
            year == DateUtils.AllYears ||
            inYear == fullYear ||
            _.some(otherYears, (y) => y == inYear),
        );
    const tiers = _.filter(
      ["High", "Medium", "Low"],
      (inTier) => tier == "All" || inTier == tier,
    );

    const yearsAndTiers = _.flatMap(years, (inYear) =>
      tiers.map((inTier) => [inYear, inTier]),
    );

    const fetchAll = Promise.all(
      yearsAndTiers.map(([inYear, inTier]) => {
        const subYear = inYear.substring(0, 4);
        return fetch(
          LeaderboardUtils.getTeamStatsUrl(gender, subYear, inTier),
        ).then((response: fetch.IsomorphicResponse) => {
          return response.ok
            ? response.json().then((j: any) => {
                //(tag the tier in)
                if (tier == "All") j.tier = inTier;
                return j;
              })
            : Promise.resolve({ error: "No data available" });
        });
      }),
    );
    return fetchAll;
  }

  /** Get a single year (but multiple tiers) of detailed team stats
   */
  static getMultiYearTeamDetails(
    oppo: "all" | "t100" | "conf",
    gender: string,
    fullYear: string,
    tier: string,
    otherYears: string[],
  ): Promise<any[]> {
    const year = fullYear.substring(0, 4);

    const years = fullYear.startsWith(DateUtils.MultiYearPrefix)
      ? DateUtils.getMultiYearSelection(fullYear)
      : _.filter(
          DateUtils.coreYears, //(for teams unlike players/lineups we can fetch the data immediately)
          (inYear) =>
            year == DateUtils.AllYears ||
            inYear == fullYear ||
            _.some(otherYears, (y) => y == inYear),
        );
    const tiers = _.filter(
      ["High", "Medium", "Low"],
      (inTier) => tier == "All" || inTier == tier,
    );

    const yearsAndTiers = _.flatMap(years, (inYear) =>
      tiers.map((inTier) => [inYear, inTier]),
    );

    const fetchAll = Promise.all(
      yearsAndTiers.map(([inYear, inTier]) => {
        const subYear = inYear.substring(0, 4);
        return fetch(
          LeaderboardUtils.getTeamDetailsUrl(oppo, gender, subYear, inTier),
        ).then((response: fetch.IsomorphicResponse) => {
          return response.ok
            ? response.json().then((j: any) => {
                //(tag the tier in)
                if (tier == "All") j.tier = inTier;
                return j;
              })
            : Promise.resolve({ error: "No data available" });
        });
      }),
    );
    return fetchAll;
  }

  //////////////////////////////////////

  // Lower level utils

  /** Debug param to fetch leaderboard URLs from local file */
  static readonly fetchLocally = false;

  /** Fetch the requested player leaderboard either from GCS or static storage */
  static readonly getPlayerUrl = (
    oppo: string,
    gender: string,
    subYear: string,
    inTier: string,
  ) => {
    if (
      DateUtils.inSeasonYear.startsWith(subYear) &&
      !LeaderboardUtils.fetchLocally
    ) {
      // Access from dynamic storage
      return `/api/getLeaderboard?src=players&oppo=${oppo}&gender=${gender}&year=${subYear}&tier=${inTier}`;
    } else {
      //archived
      return `/leaderboards/lineups/players_${oppo}_${gender}_${subYear}_${inTier}.json`;
    }
  };

  /** Fetch the requested lineup leaderboard either from GCS or static storage */
  static readonly getLineupUrl = (
    oppo: string,
    gender: string,
    subYear: string,
    inTier: string,
  ) => {
    if (
      DateUtils.inSeasonYear.startsWith(subYear) &&
      !LeaderboardUtils.fetchLocally
    ) {
      // Access from dynamic storage
      return `/api/getLeaderboard?src=lineups&oppo=${oppo}&gender=${gender}&year=${subYear}&tier=${inTier}`;
    } else {
      //archived
      return `/leaderboards/lineups/lineups_${oppo}_${gender}_${subYear}_${inTier}.json`;
    }
  };

  /** Fetch the requested team leaderboard either from GCS or static storage */
  static readonly getTeamUrl = (
    oppo: string,
    gender: string,
    subYear: string,
    inTier: string,
  ) => {
    if (
      DateUtils.inSeasonYear.startsWith(subYear) &&
      !LeaderboardUtils.fetchLocally
    ) {
      // Access from dynamic storage
      return `/api/getLeaderboard?src=teams&oppo=${oppo}&gender=${gender}&year=${subYear}&tier=${inTier}`;
    } else {
      //archived
      return `/leaderboards/lineups/teams_${oppo}_${gender}_${subYear}_${inTier}.json`;
    }
  };

  /** Fetch the requested team stats either from GCS or static storage */
  static readonly getTeamStatsUrl = (
    gender: string,
    subYear: string,
    inTier: string,
  ) => {
    if (
      DateUtils.inSeasonYear.startsWith(subYear) &&
      !LeaderboardUtils.fetchLocally
    ) {
      // Access from dynamic storage
      return `/api/getTeamStats?gender=${gender}&year=${subYear}&tier=${inTier}`;
    } else {
      //archived
      return `/leaderboards/lineups/team_stats_all_${gender}_${subYear}_${inTier}.json`;
    }
  };

  /** Fetch the requested team stats either from GCS or static storage */
  static readonly getTeamDetailsUrl = (
    oppo: "all" | "t100" | "conf",
    gender: string,
    subYear: string,
    inTier: string,
  ) => {
    if (
      DateUtils.inSeasonYear.startsWith(subYear) &&
      !LeaderboardUtils.fetchLocally
    ) {
      // Access from dynamic storage
      return `/api/getTeamDetails?oppo=${oppo}&gender=${gender}&year=${subYear}&tier=${inTier}`;
    } else {
      //archived
      return `/leaderboards/lineups/team_details_${oppo}_${gender}_${subYear}_${inTier}.json`;
    }
  };
}
