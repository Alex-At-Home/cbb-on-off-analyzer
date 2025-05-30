import { PositionUtils } from "../stats/PositionUtils";
import { DivisionStatistics } from "../StatModels";
import { promises as fs } from "fs";
import _ from "lodash";
import { GradeUtils } from "../stats/GradeUtils";
import { BatchMiscUtils } from "./BatchMiscUtils";

export class BatchGradeUtils {
  /** If all 3 exist, combines stats for High/Medium/Low tiers */
  static async combineDivisionStatsFiles(
    inGender: string,
    inYear: string,
    rootFilePath: string,
    player: Boolean = false
  ): Promise<void> {
    const playerInfix = player ? "players_" : "";
    const tiers = ["High", "Medium", "Low"];
    const posGroups = [""].concat(
      player ? PositionUtils.positionGroupings.map((g) => `pos${g}_`) : []
    );

    const allPosGroupsComplete = posGroups.map(async (posInfix) => {
      const filesToCombine: Promise<[String, DivisionStatistics[]]>[] =
        tiers.map((tier) => {
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
        });
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
                BatchMiscUtils.reduceNumberSize
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
          JSON.stringify(
            { ...stats, dedup_samples: {} },
            BatchMiscUtils.reduceNumberSize
          )
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

  /** Handles writing all the stats grades to file once processsing is complete */
  static createTierGradeFiles(
    inGender: string,
    inYear: string,
    inTier: string,
    label: string,
    rootFilePath: string,
    mutableDivisionStats: DivisionStatistics,
    mutablePlayerDivisionStats: DivisionStatistics,
    mutablePlayerDivisionStats_byPosGroup: Record<string, DivisionStatistics>
  ) {
    // Team division stats:
    GradeUtils.buildAndInjectTeamDivisionStatsLUT(mutableDivisionStats);
    const divisionStatsFilename = `${rootFilePath}/stats_${label}_${inGender}_${inYear.substring(
      0,
      4
    )}_${inTier}.json`;
    const divisionStatsWritePromise = fs.writeFile(
      divisionStatsFilename,
      JSON.stringify(mutableDivisionStats, BatchMiscUtils.reduceNumberSize)
    );

    // Player division stats:
    GradeUtils.buildAndInjectPlayerDivisionStatsLUT(mutablePlayerDivisionStats);
    PositionUtils.positionGroupings.forEach((posGroup) => {
      const mutablePosGroupDivStats =
        mutablePlayerDivisionStats_byPosGroup[posGroup];
      if (mutablePosGroupDivStats) {
        GradeUtils.buildAndInjectPlayerDivisionStatsLUT(
          mutablePosGroupDivStats
        );
      }
    });
    const playerDivisionStatsFilename = `${rootFilePath}/stats_players_${label}_${inGender}_${inYear.substring(
      0,
      4
    )}_${inTier}.json`;
    const playerDivisionStatsWritePromise = fs.writeFile(
      playerDivisionStatsFilename,
      JSON.stringify(
        mutablePlayerDivisionStats,
        BatchMiscUtils.reduceNumberSize
      )
    );

    const posGroupPromises = PositionUtils.positionGroupings.map((posGroup) => {
      const mutablePosGroupDivStats =
        mutablePlayerDivisionStats_byPosGroup[posGroup];
      if (mutablePosGroupDivStats) {
        const playerDivisionStatsFilename = `${rootFilePath}/stats_players_pos${posGroup}_${label}_${inGender}_${inYear.substring(
          0,
          4
        )}_${inTier}.json`;
        return fs.writeFile(
          playerDivisionStatsFilename,
          JSON.stringify(
            mutablePosGroupDivStats,
            BatchMiscUtils.reduceNumberSize
          )
        );
      } else {
        return Promise.resolve();
      }
    });

    console.log(
      `Writing division stats: teams:[${mutableDivisionStats.tier_sample_size}]/dedup=[${mutableDivisionStats.dedup_sample_size}] ` +
        `players:[${mutablePlayerDivisionStats.tier_sample_size}]/dedup=[${mutablePlayerDivisionStats.dedup_sample_size}]`
    );

    return [divisionStatsWritePromise, playerDivisionStatsWritePromise].concat(
      posGroupPromises
    );
  }
}
