import {
  AvailableTeamMeta,
  AvailableTeams,
} from "../utils/internal-data/AvailableTeams";
import {
  latestConfChanges_yearlyDiffs,
  IndexTemplateToNickname,
} from "../utils/public-data/ConferenceInfo";
import { DateUtils } from "../utils/DateUtils";
import _ from "lodash";

/** Run "YEAR_TO_BUILD_FROM=2024/25 npm run test src/__tests__/buildAvailableTeamsForNewYear.test.ts  -- --coverage=false" to build
 * use ADD_WOMEN=yes to ensure there is a women's team for every men's team  in YEAR_TO_BUILD_FROM
 */
describe("buildAvailableTeamsForNewYear", () => {
  const addWomenMode = !_.isNil(process.env.ADD_WOMEN);
  const invertedConfMapping = _.invert(IndexTemplateToNickname);
  if (process.env.YEAR_TO_BUILD_FROM) {
    const yearToBuildFrom = process.env.YEAR_TO_BUILD_FROM! as string;
    const newYear = addWomenMode
      ? yearToBuildFrom
      : DateUtils.getNextYear(yearToBuildFrom);
    test(`create available teams for [${newYear}] from [${yearToBuildFrom}] `, () => {
      const newAvailableTeams = _.transform(
        AvailableTeams.byName,
        (acc, teamYears, teamName) => {
          if (!acc[teamName]) {
            acc[teamName] = [];
          }
          // if (adding women only do anything if there isn't a women's team for this year)
          teamYears.forEach((teamYear) => {
            const newTeams = _.thru(teamYear.year, (yr) => {
              if (
                yr == yearToBuildFrom &&
                (!addWomenMode || teamYear.gender != "Women") //(not "add women mode", or men's team)
              ) {
                // men's team or we don't care
                const newTeamYear = _.cloneDeep(teamYear);
                newTeamYear.year = newYear;
                if (addWomenMode) {
                  newTeamYear.gender = "Women";
                  newTeamYear.index_template = `women_${newTeamYear.index_template}`;
                }
                newTeamYear.index_template = _.thru(
                  latestConfChanges_yearlyDiffs[newYear]?.[teamName],
                  (maybeConfChange) => {
                    if (maybeConfChange) {
                      return `???CHANGE??? ${
                        invertedConfMapping[maybeConfChange] || maybeConfChange
                      }`;
                    } else {
                      return newTeamYear.index_template;
                    }
                  }
                );

                return [teamYear, newTeamYear];
              } else if (yr == newYear) {
                return []; //make this idempotent
              } else if (
                addWomenMode &&
                yr == yearToBuildFrom &&
                teamYear.gender == "Women"
              ) {
                // in add women mode if we found an existing women's team then delete it
                // (it might have the wrong conference)
                return [];
              } else {
                return [teamYear];
              }
            });
            acc[teamName] = acc[teamName].concat(newTeams);
          });
          acc[teamName] = _.orderBy(
            acc[teamName] || [],
            [(t) => t.gender, (t) => t.year],
            ["asc", "asc"]
          );
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
