import type { Field } from "react-querybuilder";
import { rawFieldToGradedPair } from "../playerLeaderboardGradedNames";
import type { PlayerQueryBlock, PlayerQueryCascadingSlice } from "./types";

/** Maps a raw cascading `linq` token to rank_/pctile_ pair names, or null if ungraded. */
export type GradedPairResolver = (
  rawLinqField: string,
) => { rank: string; pctile: string } | null;

/**
 * Builds separate first-dropdown “slices” (group → then field), instead of one giant optgroup select.
 */
export function buildCascadingFieldSlices(
  blocks: PlayerQueryBlock[],
  gradedPair: GradedPairResolver = rawFieldToGradedPair,
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
      const pair = gradedPair(f.linq);
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
      const pair = gradedPair(f.linq);
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

/**
 * Cascading groups used for SORT_BY in the visual builder: raw/value stats only.
 * Rank and percentile slices sort the same order as raw for leaderboard purposes
 * and are omitted from the sort UI until dedicated support exists.
 */
export function cascadingSlicesValueGroupsOnly(
  slices: PlayerQueryCascadingSlice[],
): PlayerQueryCascadingSlice[] {
  return slices.filter(
    (s) => !s.id.endsWith("__rank") && !s.id.endsWith("__pctile"),
  );
}

/**
 * If `expression` names a rank_ or pctile_ field from a graded block, returns the
 * corresponding raw LINQ field from the sibling `__raw` slice; otherwise returns
 * `expression` unchanged.
 */
export function mapRankOrPctileSortFieldToRawField(
  expression: string,
  fullSlices: PlayerQueryCascadingSlice[],
  gradedPair: GradedPairResolver,
): string {
  const t = expression.trim();
  if (!t) {
    return expression;
  }
  const sid = findSliceIdForFieldName(fullSlices, t);
  if (!sid || (!sid.endsWith("__rank") && !sid.endsWith("__pctile"))) {
    return expression;
  }
  const rawSliceId = sid.replace(/__(rank|pctile)$/, "__raw");
  const rawSlice = fullSlices.find((s) => s.id === rawSliceId);
  if (!rawSlice) {
    return expression;
  }
  for (const rf of rawSlice.fields) {
    const pair = gradedPair(rf.name);
    if (pair && (pair.rank === t || pair.pctile === t)) {
      return rf.name;
    }
  }
  return expression;
}

/** Every `name` token exposed in the query builder (for LINQ parse validation). */
export function collectRegistryFieldNames(
  blocks: PlayerQueryBlock[],
  gradedPair: GradedPairResolver = rawFieldToGradedPair,
): string[] {
  const names: string[] = [];
  for (const block of blocks) {
    for (const f of block.fields) {
      names.push(f.linq);
      if (block.includeRankPctile) {
        const pair = gradedPair(f.linq);
        if (pair) {
          names.push(pair.rank, pair.pctile);
        }
      }
    }
  }
  return names;
}
