// System imports
import { NextApiResponse, NextApiRequest } from "next";
import fetch from "isomorphic-unfetch";

import queryString from "query-string";
import { Readable } from "stream";

// Streaming code doesn't work in earlier versions of Node than 18
// production is now Node 18 so the legacy code should not be needed any more
const useNode18Stream = true;
if (!useNode18Stream) {
  console.log(`Running legacy node16- for streaming`);
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const url = require("url").parse(req.url);
  const parsed: Record<string, any> = queryString.parse(url.query, {
    parseBooleans: true,
  }) as any;
  //tier: High, Medium, Low, Combo
  //gender: Men, Women
  //type: player, team
  const urlInFix = parsed.type == "player" ? "players_" : "";
  const maybePosInfix = parsed.posGroup ? `pos${parsed.posGroup}_` : "";

  // Check the request is cacheable: ie GET, no Authorization header, no Range header, no _vercel_no_cache
  // and no _vercel_no_cache cookie
  if (
    req.headers?.cookie?.includes("_vercel_no_cache") ||
    req.headers?.authorization ||
    req.headers?.range ||
    parsed._vercel_no_cache ||
    req.method != "GET"
  ) {
    res.status(400).json({ error: "Request must be cacheable" });
    return undefined;
  } else {
    if (req.headers?.["accept-encoding"]?.includes("gzip")) {
      try {
        const cacheId =
          process.env.NEXT_PUBLIC_VERCEL_URL || "default_cache_control";
        const resp = await fetch(
          `https://storage.googleapis.com/${
            process.env.LEADERBOARD_BUCKET
          }/team_details_${urlInFix}${maybePosInfix}${parsed.oppo || "all"}_${
            parsed.gender
          }_${parsed.year}_${parsed.tier}.json.gz?cacheId=${cacheId}`,
          {
            method: "get",
          }
        );
        if (resp.status >= 400) {
          res
            .status(resp.status)
            .json({ error: `status code error [${resp.status}]` });
        } else {
          res.setHeader("Cache-Control", "s-maxage=28800"); // requests that the CDN cache this for 12 hours or until the app redeploys
          res.setHeader("Content-Encoding", "gzip");
          res.setHeader("Content-Type", "application/json");

          res.status(200);
          if (useNode18Stream) {
            //@ts-ignore
            Readable.fromWeb(resp.body).pipe(res);
          } else {
            //(legacy, should no longer be used)
            res.send(resp.body);
          }
        }
      } catch (err: unknown) {
        console.log(err);
        res.status(500).json({ error: "Unknown error" });
      }
    } else {
      res
        .status(400)
        .json({ error: "Client must support accept-encoding: gzip" });
    }
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};
