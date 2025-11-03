import _ from "lodash";

/** The NCAA name to KenPom name mappings, built in 2020, can have per year changes */

/** Contains NCAA/KP lookups for gender/years where we want to retrieve efficiency from the cache (current year only) */
export const ncaaToEfficiencyLookup: Record<
  string,
  Record<string, Record<string, string>>
> = {
  "Men_2022/23": {}, // the upload pipeline already performs the team map
  "Women_2022/23": {}, // the upload pipeline already performs the team map
  "Men_2023/24": {}, // the upload pipeline already performs the team map
  "Women_2023/24": {}, // the upload pipeline already performs the team map
  "Men_2024/25": {}, // the upload pipeline already performs the team map
  "Women_2024/25": {}, // the upload pipeline already performs the team map
  "Men_2025/26": {}, // the upload pipeline already performs the team map
  "Women_2025/26": {}, // the upload pipeline already performs the team map
};
