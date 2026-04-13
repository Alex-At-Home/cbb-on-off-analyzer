import type { Field } from "react-querybuilder";
import { rawFieldToGradedPair } from "../playerLeaderboardGradedNames";
import type { PlayerQueryBlock, PlayerQueryCascadingSlice } from "./types";

/**
 * Builds separate first-dropdown “slices” (group → then field), instead of one giant optgroup select.
 */
export function buildCascadingFieldSlices(
  blocks: PlayerQueryBlock[],
): PlayerQueryCascadingSlice[] {
  const slices: PlayerQueryCascadingSlice[] = [];
  for (const block of blocks) {
    if (!block.includeRankPctile) {
      slices.push({
        id: block.id,
        title: block.title,
        fields: block.fields.map((f) => ({ name: f.linq, label: f.label })),
      });
      continue;
    }
    slices.push({
      id: `${block.id}__raw`,
      title: block.title,
      fields: block.fields.map((f) => ({ name: f.linq, label: f.label })),
    });

    const pctileFields = block.fields.flatMap((f) => {
      const pair = rawFieldToGradedPair(f.linq);
      return pair
        ? [{ name: pair.pctile, label: `${f.label} — percentile` }]
        : [];
    });
    if (pctileFields.length > 0) {
      slices.push({
        id: `${block.id}__pctile`,
        title: `${block.title} (percentiles)`,
        fields: pctileFields,
      });
    }

    const rankFields = block.fields.flatMap((f) => {
      const pair = rawFieldToGradedPair(f.linq);
      return pair ? [{ name: pair.rank, label: `${f.label} — rank` }] : [];
    });
    if (rankFields.length > 0) {
      slices.push({
        id: `${block.id}__rank`,
        title: `${block.title} (ranks)`,
        fields: rankFields,
      });
    }
  }
  return slices;
}

/** Flat `Field[]` for RQB schema (lookup by `name`); UI uses cascading slices in context. */
export function buildFlatFieldsFromCascadingSlices(
  slices: PlayerQueryCascadingSlice[],
): Field[] {
  const out: Field[] = [];
  for (const slice of slices) {
    for (const f of slice.fields) {
      out.push({ name: f.name, label: f.label });
    }
  }
  return out;
}

export function findSliceIdForFieldName(
  slices: PlayerQueryCascadingSlice[],
  fieldName: string,
): string | undefined {
  for (const s of slices) {
    if (s.fields.some((f) => f.name === fieldName)) {
      return s.id;
    }
  }
  return undefined;
}

/** Every `name` token exposed in the query builder (for LINQ parse validation). */
export function collectRegistryFieldNames(
  blocks: PlayerQueryBlock[],
): string[] {
  const names: string[] = [];
  for (const block of blocks) {
    for (const f of block.fields) {
      names.push(f.linq);
      if (block.includeRankPctile) {
        const pair = rawFieldToGradedPair(f.linq);
        if (pair) {
          names.push(pair.rank, pair.pctile);
        }
      }
    }
  }
  return names;
}
