// System imports
import { NextApiRequest, NextApiResponse } from "next";

import { CommonApiUtils } from "../../utils/CommonApiUtils";

//@ts-ignore
import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

const connector = new ElasticsearchAPIConnector({
  host: `${process.env.CLUSTER_ID}`,
  index: "hoopexp_*_players*",
  connectionOptions: {
    headers: {
      Authorization: CommonApiUtils.authHeader,
    },
  },
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { state, queryConfig } = req.body;
  const response = await connector.onAutocomplete(state, queryConfig);
  res.json(response);
};
