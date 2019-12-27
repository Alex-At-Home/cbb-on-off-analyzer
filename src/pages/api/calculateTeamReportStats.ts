
// System imports
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'isomorphic-unfetch';

// Application imports
import { teamReportQueryTemplate } from "../../utils/es-queries/teamReportQueryTemplate";
import { AvailableTeams } from '../../utils/internal-data/AvailableTeams';
import { efficiencyInfo } from '../../utils/internal-data/efficiencyInfo';
import { ServerRequestCache } from '../../utils/ServerRequestCache';
import { dataLastUpdated } from '../../utils/internal-data/dataLastUpdated';
import { ParamDefaults } from '../../utils/FilterModels';

const isDebug = (process.env.NODE_ENV !== 'production');

// Additional imports
import queryString from "query-string";

export default async (req: NextApiRequest, res: NextApiResponse) => {

  const queryPrefix = ""; //(for consistency with what the client side cache looks like)

  const url = require('url').parse(req.url);
  const params = queryString.parse(url.query);
  const gender = params.gender || ParamDefaults.defaultGender;
  const year = params.year || ParamDefaults.defaultYear;

  const currentJsonEpoch = dataLastUpdated[`${gender}_${year}`] || -1;
  const maybeCacheJson = ServerRequestCache.decacheResponse(url.query, queryPrefix, currentJsonEpoch, isDebug);

  /**/console.log("????");
  /**/console.log(JSON.stringify(maybeCacheJson, null, 3));

  if (maybeCacheJson) {
    res.status(200).json(maybeCacheJson);
  } else {
    const team =
      (params.team && params.year && params.gender) ?
      AvailableTeams.getTeam( //(params is string|string[], so toString is needed for type safety)
          params.team.toString(), params.year.toString(), params.gender.toString()
      ) :
      null;

    const [ efficiency, lookup ] = efficiencyInfo[`${params.gender}_${params.year}`] || [ {}, {} ];

    if (team == null) {
      res.status(404).json({});
    } else {
      const index = team.index_template + "_" + team.year.substring(0, 4);

      const body = [
        JSON.stringify({ index: index }),
        JSON.stringify(teamReportQueryTemplate(params, efficiency, lookup))
      ].join('\n') + "\n";

      try {
        const esFetch = await fetch(`${process.env.CLUSTER_ID}/_msearch`, {
                method: 'post',
                body:    body,
                headers: { 'Content-Type': 'application/x-ndjson' },
            });

        const esFetchJson = await esFetch.json();

        /**/console.log(JSON.stringify(esFetchJson, null, 3));
        //console.log(esFetch.status);
        const jsonToUse = esFetch.ok ?
          esFetchJson :
          { error: { reason: "unknown" }, status_code: "" + esFetch.status }

        if (esFetch.ok) { // only cache if resposne was OK
           ServerRequestCache.cacheResponse(
             url.query, queryPrefix, esFetchJson, currentJsonEpoch, isDebug
           );
        }
        res.status(esFetch.status).json(esFetchJson);
      } catch (e) {
        res.status(500).json({});
      }
    }
  }
}
