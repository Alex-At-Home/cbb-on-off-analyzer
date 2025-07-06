import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import _ from "lodash";

/** Run npm run test src/__tests__/buildMultiTeamNames.test.ts  -- --coverage=false" to build
 */
describe("buildMultiTeamNames", () => {
  /** Run this whenever a team name changes */
  const buildMultiNames = () => {
    return _.transform(
      AvailableTeams.byName,
      (acc, val, key) => {
        const names = _.chain(val)
          .flatMap((info) => [info.team || key, info.use_team || key])
          .uniq()
          .value();
        if (names.length > 1) {
          acc[key] = names;
        }
      },
      {} as Record<string, string[]>
    );
  };
  test("(No tests in buildMultiTeamNames)", async () => {
    //(do nothing this is just so that the suite has a test in it, otherwise jest errors)
  });
  console.log(JSON.stringify(buildMultiNames(), null, 3));
});
