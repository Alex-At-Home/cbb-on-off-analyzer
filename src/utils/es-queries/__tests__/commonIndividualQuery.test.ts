
// Lodash:
import { commonIndividualQuery } from '../commonIndividualQuery'

//export const commonIndividualQuery = function(team: Array<string>, params: any) {
describe("commonIndividualQuery", () => {
  test("commonIndividualQuery", () => {
    const team = [ "P One", "P 'Two'", 'P "Three"' ];
    const params1 = { players: team, };
    const params2 = { players: team, baseQuery: "test" };

    const expRes = (base: string) => { return {
      filters: {
        "'ON' P One": { "query_string": { "query": `players.id:(("P One") AND (${base}))` } },
        "'OFF' P One": { "query_string": { "query": `NOT players.id:(("P One") AND (${base}))` } },
        "'ON' P 'Two'": { "query_string": { "query": `players.id:(("P 'Two'") AND (${base}))` } },
        "'OFF' P 'Two'": { "query_string": { "query": `NOT players.id:(("P 'Two'") AND (${base}))` } },
        "'ON' P 'Three'": { "query_string": { "query": `players.id:(("P 'Three'") AND (${base}))` } },
        "'OFF' P 'Three'": { "query_string": { "query": `NOT players.id:(("P 'Three'") AND (${base}))` } },
      }
    }};
    expect(commonIndividualQuery(params1)).toEqual(expRes('*'));
    expect(commonIndividualQuery(params2)).toEqual(expRes('test'));
  });
});
