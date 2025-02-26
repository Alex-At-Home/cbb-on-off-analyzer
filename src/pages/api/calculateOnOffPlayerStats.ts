// System imports
import { NextApiRequest, NextApiResponse } from "next";

// Application imports
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { playerStatsQuery } from "../../utils/es-queries/playerStatsQueryTemplate";
import { ParamPrefixes, CommonFilterParams } from "../../utils/FilterModels";

const queryPrefix = ParamPrefixes.player;

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
      JSON.stringify({ index: `player_events_${genderPrefix}${index}` }),
      JSON.stringify(
        playerStatsQuery(
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
  //console.log(JSON.stringify(playerStatsQuery(params, currentJsonEpoch, {}, {}, avgEfficiency).aggregations.tri_filter.aggregations, null, 3));

  return body;
}

async function calculateOnOffPlayerStats(
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
export default calculateOnOffPlayerStats;
