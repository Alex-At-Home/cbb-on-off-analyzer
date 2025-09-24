// System imports
import { NextApiResponse, NextApiRequest } from "next";
import fetch from "isomorphic-unfetch";

import queryString from "query-string";
import { DateUtils } from "../../utils/DateUtils";

import _ from "lodash";

const transferFixes: Record<string, any> = {
  // Once we start the next season move this into the GH version and remove
  // Note: this array replaces the one in the file so needs to be hand merged currently
  "transfers_2025.json": {
    TaGapare: [
      {
        f: "Maryland",
        t: "Villanova",
      },
    ],
    AlDibba: [
      {
        f: "Southern Ill.",
        t: "Texas A&M",
      },
    ],
    MaWol: [
      {
        f: "Eastern Ky.",
        t: "Bowling Green",
      },
    ],
  },
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const url = require("url").parse(req.url);
  const parsed: Record<string, any> = queryString.parse(url.query, {
    parseBooleans: true,
  }) as any;

  const getFilename = () => {
    const transferMode = parsed["transferMode"] || "";
    if (transferMode == "" || transferMode == "true") {
      //(shortcut for current year)
      return `transfers_${DateUtils.offseasonPredictionYear.substring(
        0,
        4
      )}.json`;
    } else {
      //(all transfers from previous years)
      return `transfers_${transferMode}.json`;
    }
  };

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
    try {
      const filename = getFilename();
      const resp = await fetch(
        `https://storage.googleapis.com/${process.env.LEADERBOARD_BUCKET}/${filename}`,
        {
          method: "get",
        }
      );
      const respJson = await resp.json();
      const jsonWithFixes = _.merge(respJson, transferFixes[filename] || {});

      res.setHeader("Cache-Control", "s-maxage=28800"); // requests that the CDN cache this for 12 hours or until the app redeploys
      res.status(200).json(jsonWithFixes);
    } catch (err: unknown) {
      console.log(
        `Transfer error: [${err instanceof Error ? err.message : err}]`
      );
      res.status(500).json({ error: "Unknown error" });
    }
  }
};
