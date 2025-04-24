// System imports
import { NextApiRequest, NextApiResponse } from "next";

// Application imports
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { playerShotStatsQuery } from "../../utils/es-queries/playerShotStatsQueryTemplate";
import { ParamPrefixes, CommonFilterParams } from "../../utils/FilterModels";

const queryPrefix = ParamPrefixes.playerShots;

function marshallRequest(
  index: string,
  genderPrefix: string,
  params: Record<string, any>,
  currentJsonEpoch: number,
  efficiency: Record<string, any>,
  lookup: Record<string, any>,
  avgEfficiency: number
) {
  const body =
    [
      JSON.stringify({ index: `shot_events_${genderPrefix}${index}` }),
      JSON.stringify(
        playerShotStatsQuery(
          params,
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
  //console.log(JSON.stringify(teamStatsQuery(params, currentJsonEpoch, efficiency, lookup, avgEfficiency), CommonApiUtils.efficiencyReplacer(), 3));
  //console.log(JSON.stringify(teamStatsQuery(params, currentJsonEpoch, {}, {}, avgEfficiency), CommonApiUtils.efficiencyReplacer(), 3));
  //console.log(JSON.stringify(teamStatsQuery(params, currentJsonEpoch, {}, {}).query, CommonApiUtils.efficiencyReplacer(), 3));

  return body;
}

async function calculatePlayerShotStats(
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
export default calculatePlayerShotStats;
