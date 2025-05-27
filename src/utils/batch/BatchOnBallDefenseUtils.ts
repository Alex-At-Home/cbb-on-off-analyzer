import _ from "lodash";
import { DateUtils } from "../DateUtils";
import { BatchMiscUtils } from "./BatchMiscUtils";
import { IndivStatSet } from "../StatModels";

export class BatchOnBallDefenseUtils {
  static readonly teamDefenseEnabled = true; //(keep this flag for a bit in case we need to pull the feature)

  /** Handy util to fetch on ball defense from where it's kept */
  static readonly getOnBallDefenseFilename = (
    team: string,
    teamYear: string
  ) => {
    return `${process.env.PBP_OUT_DIR}/OnBallDefense/out/${(
      teamYear || ""
    ).substring(0, 4)}/${BatchMiscUtils.getTeamFilename(team)}.txt`;
  };
}
