// System imports
import { NextApiRequest, NextApiResponse } from "next";
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { ParamPrefixes } from "../../utils/FilterModels";
import { playerSimilarityQuery } from "../../utils/es-queries/playerSimilarityQueryTemplate";

const queryPrefix = ParamPrefixes.playerCareer;

function marshallRequest(
  index: string,
  genderPrefix: string,
  params: Record<string, any>,
  currentJsonEpoch: number,
  efficiency: Record<string, any>,
  lookup: Record<string, any>,
  avgEfficiency: number
) {
  // Allow configurable size, default to 10 for backward compatibility
  const size = parseInt(params.size) || 10;
  
  const body =
    [
      JSON.stringify({ index: `hoopexp_${genderPrefix}players_*` }),
      JSON.stringify({
        size: size,
        ...playerSimilarityQuery(
          (params.queryVector || "").split(",").map((n: any) => parseFloat(n))
        ),
      }),
    ].join("\n") + "\n";

  return body;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const url = require("url").parse(req.url);
  await CommonApiUtils.handleRequest(
    res,
    queryPrefix,
    url.query,
    marshallRequest,
    `hoopexp_GENDER_players_*`,
    true //(bypass cache)
  );
};
