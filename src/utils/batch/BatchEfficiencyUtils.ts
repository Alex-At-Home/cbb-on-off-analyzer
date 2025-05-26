import { ncaaToEfficiencyLookup } from "../public-data/ncaaToEfficiencyLookup";
import { CommonApiUtils } from "../CommonApiUtils";
import { efficiencyInfo } from "../internal-data/efficiencyInfo";
import _ from "lodash";

/** Some useful efficiency related info */
type EfficiencyInfo = {
  bubbleOffenseInfo: number[];
  bubbleDefenseInfo: number[];
  eliteOffenseInfo: number[];
  eliteDefenseInfo: number[];
  completedEfficiencyInfo: Record<string, any>;
};

/** Utils for building - things related to KenPom efficiency */
export class BatchEfficiencyUtils {
  /** Retrieve the per team efficiency info plus some derived stats */
  static buildMiscEfficiencyInfo = async (
    inGender: string,
    inYear: string
  ): Promise<EfficiencyInfo> => {
    const globalGenderYearKey = `${inGender}_${inYear}`;
    const lookupForQuery = ncaaToEfficiencyLookup[globalGenderYearKey];
    var fallbackConfMapInfo: any = undefined;
    if (!_.isUndefined(lookupForQuery)) {
      console.log(
        "Getting dynamic efficiency info (needed for conference map)"
      );
      //(also will cache it for subsequent requests)
      const efficiencyYear = (parseInt(inYear.substring(0, 4)) + 1).toString(); //(+1 from the input year)
      fallbackConfMapInfo = await CommonApiUtils.buildCurrentEfficiency(
        globalGenderYearKey,
        efficiencyYear,
        inGender,
        lookupForQuery
      );
    }
    const completedEfficiencyInfo =
      efficiencyInfo?.[globalGenderYearKey]?.[0] || fallbackConfMapInfo;

    const rankInfo = _.chain(completedEfficiencyInfo || {})
      .values()
      .orderBy(["stats.adj_margin.rank"], ["asc"])
      .value();
    const bubbleRankInfo = _.chain(rankInfo).drop(40).take(10).value();
    const eliteRankInfo = _.chain(rankInfo).drop(10).take(5).value();
    const bubbleOffenseInfo = bubbleRankInfo.map(
      (o) => o["stats.adj_off.value"] || 0
    );
    const bubbleDefenseInfo = bubbleRankInfo.map(
      (o) => o["stats.adj_def.value"] || 0
    );
    const eliteOffenseInfo = eliteRankInfo.map(
      (o) => o["stats.adj_off.value"] || 0
    );
    const eliteDefenseInfo = eliteRankInfo.map(
      (o) => o["stats.adj_def.value"] || 0
    );

    return {
      bubbleOffenseInfo,
      bubbleDefenseInfo,
      eliteOffenseInfo,
      eliteDefenseInfo,
      completedEfficiencyInfo,
    };
  };
}
