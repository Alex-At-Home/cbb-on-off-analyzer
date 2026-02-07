// System imports
import { NextApiRequest, NextApiResponse } from "next";

// Application imports
import { CommonApiUtils } from "../../utils/CommonApiUtils";
import { lineupStintsByTimeQuery } from "../../utils/es-queries/lineupStintsByTimeQueryTemplate";
import { ParamPrefixes, CommonFilterParams } from "../../utils/FilterModels";

const queryPrefix = ParamPrefixes.lineupStintsAgg;

function marshallRequest(
  index: string,
  genderPrefix: string,
  params: Record<string, any>,
  currentJsonEpoch: number,
  efficiency: Record<string, any>,
  lookup: Record<string, any>,
  avgEfficiency: number,
) {
  const lineupIndex = index;
  const playerEventsIndex = `player_events_${genderPrefix}${index}`;

  const body =
    [
      JSON.stringify({
        index: `${lineupIndex},${playerEventsIndex}`,
      }),
      JSON.stringify(
        lineupStintsByTimeQuery(
          params,
          currentJsonEpoch,
          efficiency,
          lookup,
          avgEfficiency,
          CommonApiUtils.getHca(params as CommonFilterParams),
          40, // numBins
          lineupIndex,
          playerEventsIndex,
        ),
        CommonApiUtils.efficiencyReplacer(),
      ),
    ].join("\n") + "\n";

  return body;
}

async function calculateLineupStintsByTime(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const url = require("url").parse(req.url);
  await CommonApiUtils.handleRequest(
    res,
    queryPrefix,
    url.query,
    marshallRequest,
  );
}

export default calculateLineupStintsByTime;
