import type { Field } from "react-querybuilder";
import {
  buildCascadingFieldSlices,
  buildFlatFieldsFromCascadingSlices,
  collectRegistryFieldNames,
} from "./playerLeaderboard/buildRqbFields";
import { allTeamLeaderboardQueryBlocks } from "./playerLeaderboard/categories/teamLeaderboardQueryBlocks";
import { rawTeamLeaderboardFieldToGradedPair } from "./teamLeaderboardGradedNames";

export { allTeamLeaderboardQueryBlocks } from "./playerLeaderboard/categories/teamLeaderboardQueryBlocks";

const _teamFieldNames = collectRegistryFieldNames(
  allTeamLeaderboardQueryBlocks,
  rawTeamLeaderboardFieldToGradedPair,
);

export const teamQueryBuilderFieldNameSet = new Set(_teamFieldNames);

export const teamLeaderboardCascadingFieldSlices = buildCascadingFieldSlices(
  allTeamLeaderboardQueryBlocks,
  rawTeamLeaderboardFieldToGradedPair,
);

export const teamLeaderboardFlatRqbFields: Field[] =
  buildFlatFieldsFromCascadingSlices(teamLeaderboardCascadingFieldSlices);
