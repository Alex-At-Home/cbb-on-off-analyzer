/** One selectable field in the player leaderboard query builder. */
export type PlayerQueryFieldRow = {
  /** LINQ / autocomplete token, e.g. `off_adj_rapm` or `pctile_off_efg` */
  linq: string;
  /** Human label shown in the RQB field dropdown */
  label: string;
};

/**
 * A block of fields that becomes one or more RQB optgroups.
 * When `includeRankPctile` is true, the builder emits up to three sibling groups:
 * title, title (percentiles), title (ranks).
 */
export type PlayerQueryBlock = {
  id: string;
  title: string;
  includeRankPctile: boolean;
  fields: PlayerQueryFieldRow[];
};

/** One row in the first (group) dropdown; second dropdown lists `fields`. */
export type PlayerQueryCascadingSlice = {
  id: string;
  title: string;
  fields: { name: string; label: string }[];
};
