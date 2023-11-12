import {
  AvailableTeamMeta,
  AvailableTeams,
} from "../utils/internal-data/AvailableTeams";
import { latestConfChanges } from "../utils/public-data/ConferenceInfo";
import { DateUtils } from "../utils/DateUtils";
import _ from "lodash";

/** Run "YEAR_TO_BUILD_FROM=2022/23 npm run test src/__tests__/buildAvailableTeamsForNewYear.test.ts  -- --coverage=false" to build
 * After copying "transfers_${offseasonYearStr}" to working dir
 */
describe("buildAvailableTemsForNewYear", () => {
  if (process.env.YEAR_TO_BUILD_FROM) {
    const yearToBuildFrom = process.env.YEAR_TO_BUILD_FROM! as string;
    const newYear = DateUtils.getNextYear(yearToBuildFrom);
    test(`create available teams for [${newYear}] from [${yearToBuildFrom}] `, () => {
      const newAvailableTeams = _.transform(
        AvailableTeams.byName,
        (acc, teamYears, teamName) => {
          if (!acc[teamName]) {
            acc[teamName] = [];
          }
          teamYears.forEach((teamYear) => {
            const newTeams = _.thru(teamYear.year, (yr) => {
              if (yr == yearToBuildFrom) {
                const newTeamYear = _.cloneDeep(teamYear);
                newTeamYear.year = newYear;
                newTeamYear.index_template = _.thru(
                  latestConfChanges[newYear]?.[teamName],
                  (maybeConfChange) => {
                    if (maybeConfChange) {
                      return `???CHANGE??? ${maybeConfChange}`;
                    } else {
                      return newTeamYear.index_template;
                    }
                  }
                );

                return [teamYear, newTeamYear];
              } else if (yr == newYear) {
                return []; //make this idempotent
              } else {
                return [teamYear];
              }
            });
            acc[teamName] = acc[teamName].concat(newTeams);
          });
        },
        {} as Record<string, Array<AvailableTeamMeta>>
      );
      console.log(JSON.stringify(newAvailableTeams, null, 3));
    });
  } else {
    test("(Skipping buildAvailableTemsForNewYear, not manually specified)", async () => {
      //(do nothing this is just so that the suite has a test in it, otherwise jest errors)
    });
  }
});
