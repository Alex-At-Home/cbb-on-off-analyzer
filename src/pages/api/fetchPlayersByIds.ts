// System imports
import { NextApiRequest, NextApiResponse } from "next";
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { ParamPrefixes } from "../../utils/FilterModels";
import { playersByIdsQuery } from "../../utils/es-queries/playersByIdsQueryTemplate";

const queryPrefix = ParamPrefixes.multiPlayerCareer;

function marshallRequest(
  index: string,
  genderPrefix: string,
  params: Record<string, any>,
  currentJsonEpoch: number,
  efficiency: Record<string, any>,
  lookup: Record<string, any>,
  avgEfficiency: number
) {
  // Parse comma-separated player IDs
  const playerIds = params.ids ? params.ids.split(",").filter(Boolean) : [];

  if (playerIds.length === 0) {
    throw new Error("No player IDs provided");
  }

  const body =
    [
      JSON.stringify({ index: `hoopexp_${genderPrefix}players_*` }),
      JSON.stringify({
        size: playerIds.length, // Fetch exactly the requested players
        ...playersByIdsQuery(playerIds),
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
    true //(bypass cache for now)
  );
};
