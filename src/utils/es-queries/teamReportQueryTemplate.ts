import { commonTeamQuery } from "./commonTeamQuery";
import { commonIndividualQuery } from "./commonIndividualQuery";
import { commonLineupAggregations } from "./commonLineupAggregations";

export const teamReportQueryTemplate = function(params: any, publicEfficiency: any, lookup: any) {
  return {
     "_source": {
        "includes": [],
        "excludes": []
     },
     "size": 0,
     "aggregations": {
        "tri_filter": {
           "aggregations": commonLineupAggregations(publicEfficiency, lookup),
           "filters": commonIndividualQuery(params)
        }
     },
     "query": commonTeamQuery(params, publicEfficiency, lookup)
  };
}
