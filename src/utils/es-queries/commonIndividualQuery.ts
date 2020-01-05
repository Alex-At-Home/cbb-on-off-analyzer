
// Lodash:
import _ from "lodash";

export const commonIndividualQuery = function(params: any) {
  return {
    filters: _.chain((params.players || []) as Array<string>).flatMap((player) => {
      const normPlayer = player.replace(/"/g, "'");
      return [
        [ `'ON' ${normPlayer}`, {
          "query_string": {
            "query": `players.id:(("${normPlayer}") AND (${params.baseQuery || "*"}))`
          }
        }]
        ,
        [ `'OFF' ${normPlayer}`, {
          "query_string": {
            "query": `players.id:(NOT ("${normPlayer}") AND (${params.baseQuery || "*"}))`
          }
        }]
      ];
    }).fromPairs().value()
  }
};
