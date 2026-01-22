// System imports
import { NextApiRequest, NextApiResponse } from "next";
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { ParamPrefixes } from "../../utils/FilterModels";
import { playerSimilarityQuery } from "../../utils/es-queries/playerSimilarityQueryTemplate";

// Global runtime mappings available for similarity queries
const AVAILABLE_RUNTIME_MAPPINGS = {
  oppo_sos: {
    type: "double",
    script: {
      source: `if (doc['off_adj_opp.value'].size() > 0 && doc['def_adj_opp.value'].size() > 0) emit(doc['off_adj_opp.value'].value - doc['def_adj_opp.value'].value)`,
    },
  },
} as const;

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

  // Build runtime mappings from requested names
  let runtimeMappings: any = undefined;
  if (params.runtimeMappingNames) {
    const requestedMappings = params.runtimeMappingNames.split(",");
    runtimeMappings = {};
    for (const mappingName of requestedMappings) {
      const trimmedName = mappingName.trim();
      if (trimmedName && trimmedName in AVAILABLE_RUNTIME_MAPPINGS) {
        runtimeMappings[trimmedName] = (AVAILABLE_RUNTIME_MAPPINGS as any)[
          trimmedName
        ];
      }
    }
    if (Object.keys(runtimeMappings).length === 0) {
      runtimeMappings = undefined;
    }
  }

  const queryObject: any = {
    size: size,
    ...playerSimilarityQuery(
      (params.queryVector || "").split(",").map((n: any) => parseFloat(n)),
      params.queryPos,
      params.extraSimilarityQuery
    ),
  };

  // Add runtime mappings if any were requested and found
  if (runtimeMappings) {
    queryObject.runtime_mappings = runtimeMappings;
  }

  const body =
    [
      JSON.stringify({ index: `hoopexp_${genderPrefix}players_*` }),
      JSON.stringify(queryObject),
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
