
// System imports
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'isomorphic-unfetch';

// Application imports
import { rosterCompareQuery } from "../../utils/es-queries/rosterCompareQueryTemplate";
import { AvailableTeams } from '../../utils/internal-data/AvailableTeams';
import { ServerRequestCache } from '../../utils/ServerRequestCache';
import { dataLastUpdated } from '../../utils/internal-data/dataLastUpdated';
import { ParamPrefixes, ParamDefaults, CommonFilterParams } from '../../utils/FilterModels';

const isDebug = (process.env.NODE_ENV !== 'production');

// Additional imports
import { QueryUtils } from "../../utils/QueryUtils";

export default async (req: NextApiRequest, res: NextApiResponse) => {

  const queryPrefix = ParamPrefixes.roster;

  const url = require('url').parse(req.url);
  const params = QueryUtils.parse(url.query) as CommonFilterParams;
  const gender = params.gender || ParamDefaults.defaultGender;
  const year = params.year || ParamDefaults.defaultYear;

  const currentJsonEpoch = dataLastUpdated[`${gender}_${year}`] || -1;
  const maybeCacheJson = ServerRequestCache.decacheResponse(url.query, queryPrefix, currentJsonEpoch, isDebug);

  if (maybeCacheJson) {
    res.status(200).json(maybeCacheJson);
  } else {
    const team =
      (params.team && params.year && params.gender) ?
      AvailableTeams.getTeam( //(params is string|string[], so toString is needed for type safety)
          params.team.toString(), params.year.toString(), params.gender.toString()
      ) || { index_template: null, year: null }:
      null;

    if (team == null) {
      res.status(404).json({});
    } else {
      const index = (team.index_template || AvailableTeams.defaultConfIndex) + "_" +
                      (team.year || params.year || "xxxx").substring(0, 4);

      const body = [
        JSON.stringify({ index: index }),
        JSON.stringify(rosterCompareQuery(params, currentJsonEpoch, {}, {}))
          //(leaving efficiency blank means that the opponent filter is ignored)
      ].join('\n') + "\n";

      try {
        const esFetch = await fetch(`${process.env.CLUSTER_ID}/_msearch`, {
                method: 'post',
                body:    body,
                headers: { 'Content-Type': 'application/x-ndjson' },
            });

        const esFetchJson = await esFetch.json();

        // Debug logs:
        //console.log(JSON.stringify(esFetchJson, null, 3));
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