// System imports
import { NextApiRequest, NextApiResponse } from "next";

// Application imports
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { allTeamStatsQuery } from "../../utils/es-queries/allTeamsQueryTemplate";
import {
  ParamPrefixes,
  CommonFilterParams,
  ParamDefaults,
} from "../../utils/FilterModels";

const queryPrefix = ParamPrefixes.allTeamInfo;

function marshallRequest(
  index: string,
  genderPrefix: string,
  params: Record<string, any>,
  currentJsonEpoch: number,
  efficiency: Record<string, any>,
  lookup: Record<string, any>,
  avgEfficiency: number
) {
  const yearStr = (params.year || ParamDefaults.defaultYear).substring(0, 4);
  const isGenderWomen = (params.gender || "Men") == "Women";

  if (params.baseQuery?.includes("filter_garbage_time")) {
    params.baseQuery = params.baseQuery.replace("filter_garbage_time", "");
    params.filterGarbage = true;
  }

  const body =
    [
      JSON.stringify({
        index: isGenderWomen
          ? `women_*${yearStr}*,-player_*,-bad*,-kenpom*,-shot_events_*`
          : `*${yearStr}*,-women*,-player_*,-bad*,-kenpom*,-shot_events_*`,
      }),
      JSON.stringify(
        allTeamStatsQuery(
          {
            ...params,
            team: "*",
          },
          currentJsonEpoch,
          efficiency,
          lookup,
          avgEfficiency,
          CommonApiUtils.getHca(params as CommonFilterParams)
        ),
        CommonApiUtils.efficiencyReplacer()
      ),
    ].join("\n") + "\n";

  // Debug logs:
  // console.log(
  //   JSON.stringify(
  //     teamDefenseStatsQuery(
  //       params,
  //       currentJsonEpoch,
  //       efficiency,
  //       lookup,
  //       avgEfficiency,
  //       CommonApiUtils.getHca(params as CommonFilterParams)
  //     ),
  //     CommonApiUtils.efficiencyReplacer(),
  //     3
  //   )
  // );
  // console.log(
  //   JSON.stringify(
  //     teamDefensePlayerStatsQuery(
  //       params,
  //       currentJsonEpoch,
  //       efficiency,
  //       lookup,
  //       avgEfficiency,
  //       CommonApiUtils.getHca(params as CommonFilterParams)
  //     ),
  //     CommonApiUtils.efficiencyReplacer(),
  //     3
  //   )
  // );

  return body;
}

async function calculateAllTeamStats(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const url = require("url").parse(req.url);

  await CommonApiUtils.handleRequest(
    res,
    queryPrefix,
    url.query,
    marshallRequest
  );
}
export default calculateAllTeamStats;
