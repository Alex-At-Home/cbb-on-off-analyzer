import _ from "lodash";
import { RequestUtils } from "../RequestUtils";
import { promises as fs } from "fs";
import { DateUtils } from "../DateUtils";
import { CompressedHexZone, IndivStatSet } from "../StatModels";
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
}
