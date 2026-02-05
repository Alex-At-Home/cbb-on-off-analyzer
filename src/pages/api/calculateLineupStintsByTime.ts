// System imports
import { NextApiRequest, NextApiResponse } from "next";

// Application imports
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { lineupStintsByTimeQuery } from "../../utils/es-queries/lineupStintsByTimeQueryTemplate";
import { ParamPrefixes, CommonFilterParams } from "../../utils/FilterModels";

const queryPrefix = ParamPrefixes.lineupStints + "_by_time";

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
      JSON.stringify({
        index: `${index},player_events_${genderPrefix}${index}`,
      }),
      JSON.stringify(
        lineupStintsByTimeQuery(
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

  return body;
}

async function calculateLineupStintsByTime(
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

export default calculateLineupStintsByTime;
