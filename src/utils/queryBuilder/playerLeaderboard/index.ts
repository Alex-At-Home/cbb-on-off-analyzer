/**
 * Extensible registry for the player leaderboard visual query builder.
 * Add new files under `categories/` and merge them into `allPlayerQueryBlocks`.
 *
 * Autocomplete operators (`&&`, `SORT_BY`, …) are intentionally not exposed as fields;
 * RQB handles boolean combinators; sort/limit stay in the text editor for now.
 */
import type { Field } from "react-querybuilder";
import { playerQueryMetadataBlocks } from "./categories/metadata";
import { playerQueryPlayStyleBlock } from "./categories/playStyles";
import { playerQueryGradedStatBlocks } from "./categories/statsGraded";
import type { PlayerQueryBlock } from "./types";
import {
  buildCascadingFieldSlices,
  buildFlatFieldsFromCascadingSlices,
  collectRegistryFieldNames,
} from "./buildRqbFields";

export type {
  PlayerQueryBlock,
  PlayerQueryCascadingSlice,
  PlayerQueryFieldRow,
} from "./types";

export {
  findSliceIdForFieldName,
  cascadingSlicesValueGroupsOnly,
} from "./buildRqbFields";

/** Ordered list of field blocks (extend by spreading more slices). */
export const allPlayerQueryBlocks: PlayerQueryBlock[] = [
  ...playerQueryMetadataBlocks,
  ...playerQueryGradedStatBlocks,
  playerQueryPlayStyleBlock,
];

const _fieldNames = collectRegistryFieldNames(allPlayerQueryBlocks);

export const playerQueryBuilderFieldNameSet = new Set(_fieldNames);

/** First-dropdown groups with per-group field lists (cascading UI). */
export const playerLeaderboardCascadingFieldSlices =
  buildCascadingFieldSlices(allPlayerQueryBlocks);

/** All fields as a flat list for RQB’s schema (`fieldData`, validation, etc.). */
export const playerLeaderboardFlatRqbFields: Field[] =
  buildFlatFieldsFromCascadingSlices(playerLeaderboardCascadingFieldSlices);
