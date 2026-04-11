import _ from "lodash";

import { PositionUtils } from "../stats/PositionUtils";
import type { GoodBadOkTriple } from "../stats/TeamEditorUtils";

export type DepthSlotKey = "pg" | "sg" | "sf" | "pf" | "c";

/** One cell: player + % value used for posFreq shadow (team poss % × 100). */
export type DepthCell = {
  triple: GoodBadOkTriple;
  displayPct: number;
};

export type DepthRow = Record<DepthSlotKey, DepthCell | undefined>;

const SLOT_ORDER: DepthSlotKey[] = ["pg", "sg", "sf", "pf", "c"];

/** MPG-style minutes for depth ordering (matches roster MPG column). */
export function defaultDepthChartMinutes(t: GoodBadOkTriple): number {
  return (t.ok.off_team_poss_pct?.value || 0) * 40;
}

/** % shown in depth cell (not lineup pos %); used only for coloring like TeamRosterDiagView. */
export function defaultDepthChartDisplayPct(t: GoodBadOkTriple): number {
  return (t.ok.off_team_poss_pct?.value || 0) * 100;
}

function firstArgmaxByMinutesStable<T extends GoodBadOkTriple>(
  list: T[],
  minutes: (t: T) => number,
): T | undefined {
  if (!list.length) {
    return undefined;
  }
  let bestIdx = 0;
  let bestM = minutes(list[0]);
  for (let i = 1; i < list.length; i++) {
    const m = minutes(list[i]);
    if (m > bestM) {
      bestM = m;
      bestIdx = i;
    }
  }
  return list[bestIdx];
}

/**
 * Top 4 non-bigs (Guards ∪ Wings) by minutes, then ordered for PG–PF by **vertical**
 * roster order: all Guards in list order, then all Wings (same as the main table).
 *
 * Tie on minutes: earlier row in that vertical order wins a slot in the top-4 *set*.
 */
/** PF/C and heavier (incl. C-class) may appear only in PF or C columns, not PG–SF. */
function posClassScore(t: GoodBadOkTriple): number {
  return PositionUtils.posClassToScore(t.orig.posClass || "");
}

function isPfCorCHigherOrHeavier(t: GoodBadOkTriple): boolean {
  return posClassScore(t) >= PositionUtils.posClassToScore("PF/C");
}

function topFourGuardsWingsByMinutesInVerticalOrder(
  guards: GoodBadOkTriple[],
  wings: GoodBadOkTriple[],
  usedKeys: Set<string>,
  minutes: (t: GoodBadOkTriple) => number,
): GoodBadOkTriple[] {
  const vertical = guards.concat(wings);
  const scored = vertical
    .map((t, verticalIndex) => ({ t, verticalIndex }))
    .filter(({ t }) => !usedKeys.has(t.key));
  const topFourCandidates = _.orderBy(
    scored,
    [(x) => minutes(x.t), (x) => x.verticalIndex],
    ["desc", "asc"],
  )
    .slice(0, 4)
    .map((x) => x.t);
  const keySet = new Set(topFourCandidates.map((t) => t.key));
  return vertical.filter((t) => keySet.has(t.key));
}

/**
 * PG–PF from `orderedAll` (vertical order among top-by-minutes set): fill PG–SF only
 * with players below PF/C on the pos score scale; PF is first PF/C+ in vertical order,
 * else first remaining sub–PF/C player.
 */
function assignPgPfFromOrderedWithBigSlotRule(
  orderedAll: GoodBadOkTriple[],
  displayPct: (t: GoodBadOkTriple) => number,
): Pick<DepthRow, "pg" | "sg" | "sf" | "pf"> {
  const out = {} as Pick<DepthRow, "pg" | "sg" | "sf" | "pf">;
  const placed = new Set<string>();
  const backcourtSlots = ["pg", "sg", "sf"] as const;

  for (const slot of backcourtSlots) {
    for (const t of orderedAll) {
      if (placed.has(t.key)) {
        continue;
      }
      if (isPfCorCHigherOrHeavier(t)) {
        continue;
      }
      out[slot] = cell(t, displayPct);
      placed.add(t.key);
      break;
    }
  }

  const firstBigSlotInOrder = orderedAll.find(
    (t) => !placed.has(t.key) && isPfCorCHigherOrHeavier(t),
  );
  if (firstBigSlotInOrder) {
    out.pf = cell(firstBigSlotInOrder, displayPct);
    placed.add(firstBigSlotInOrder.key);
  } else {
    for (const t of orderedAll) {
      if (!placed.has(t.key) && !isPfCorCHigherOrHeavier(t)) {
        out.pf = cell(t, displayPct);
        placed.add(t.key);
        break;
      }
    }
  }
  return out;
}

function cell(
  t: GoodBadOkTriple,
  displayPct: (t: GoodBadOkTriple) => number,
): DepthCell {
  return { triple: t, displayPct: displayPct(t) };
}

/**
 * Row 2 only, when fewer than 4 perimeter players: WG-heavy bench starts at SG;
 * last in vertical order if >= WF (pos score) is pinned to PF.
 */
function assignPgPfBenchSparse(
  ordered: GoodBadOkTriple[],
  displayPct: (t: GoodBadOkTriple) => number,
): Pick<DepthRow, "pg" | "sg" | "sf" | "pf"> {
  const out = {} as Pick<DepthRow, "pg" | "sg" | "sf" | "pf">;
  if (!ordered.length) {
    return out;
  }

  const wfFloor = PositionUtils.posClassToScore("WF");
  const last = ordered[ordered.length - 1];
  const pinLastToPf = posClassScore(last) >= wfFloor;

  const startAtSg = (ordered[0].orig.posClass || "") === "WG";

  if (pinLastToPf) {
    out.pf = cell(last, displayPct);
    const rest = ordered.slice(0, -1);
    const order = startAtSg
      ? (["sg", "sf", "pg"] as const)
      : (["pg", "sg", "sf"] as const);
    let r = 0;
    for (const slot of order) {
      while (r < rest.length) {
        const t = rest[r++];
        if (isPfCorCHigherOrHeavier(t)) {
          continue;
        }
        out[slot] = cell(t, displayPct);
        break;
      }
    }
    return out;
  }

  const orderAll = startAtSg
    ? (["sg", "sf", "pf", "pg"] as const)
    : (["pg", "sg", "sf", "pf"] as const);
  let o = 0;
  for (const slot of orderAll) {
    while (o < ordered.length) {
      const t = ordered[o++];
      if (slot !== "pf" && isPfCorCHigherOrHeavier(t)) {
        continue;
      }
      out[slot] = cell(t, displayPct);
      break;
    }
  }
  return out;
}

function buildRow(
  guards: GoodBadOkTriple[],
  wings: GoodBadOkTriple[],
  bigs: GoodBadOkTriple[],
  usedKeys: Set<string>,
  minutes: (t: GoodBadOkTriple) => number,
  displayPct: (t: GoodBadOkTriple) => number,
  isBenchDepthRow: boolean,
): DepthRow {
  const bigsAvailable = bigs.filter((b) => !usedKeys.has(b.key));
  const cTriple = firstArgmaxByMinutesStable(bigsAvailable, minutes);
  const used = new Set(usedKeys);
  if (cTriple) {
    used.add(cTriple.key);
  }
  const top4 = topFourGuardsWingsByMinutesInVerticalOrder(
    guards,
    wings,
    used,
    minutes,
  );
  const pgPf =
    isBenchDepthRow && top4.length < 4
      ? assignPgPfBenchSparse(top4, displayPct)
      : assignPgPfFromOrderedWithBigSlotRule(top4, displayPct);
  return {
    ...pgPf,
    c: cTriple
      ? { triple: cTriple, displayPct: displayPct(cTriple) }
      : undefined,
  };
}

function rowKeys(row: DepthRow): Set<string> {
  const s = new Set<string>();
  for (const k of SLOT_ORDER) {
    const c = row[k];
    if (c) {
      s.add(c.triple.key);
    }
  }
  return s;
}

/**
 * Two depth rows for PG–C from Team Editor positional buckets (Guards / Wings / Bigs),
 * in the order already used for the roster table.
 *
 * Row 1: C = max minutes among Bigs; PG–PF = the four Guards/Wings with the most minutes,
 * placed using **main-table vertical order** (Guards then Wings), with PG–SF only for
 * players below PF/C on `posClassToScore`; PF/C+ may appear only in PF or C.
 *
 * Row 2: C = max minutes among Bigs not used in row 1; PG–PF = same rule among remaining
 * Guards/Wings. If there are fewer than 4 perimeter players, **bench alignment**: first
 * in vertical order is WG → fill from SG (then SF, PF, PG); last in vertical order with
 * pos score ≥ WF → pinned to PF.
 */
export function buildTwoDepthRows(
  guards: GoodBadOkTriple[],
  wings: GoodBadOkTriple[],
  bigs: GoodBadOkTriple[],
  minutes: (t: GoodBadOkTriple) => number = defaultDepthChartMinutes,
  displayPct: (t: GoodBadOkTriple) => number = defaultDepthChartDisplayPct,
): [DepthRow, DepthRow] {
  const row1 = buildRow(
    guards,
    wings,
    bigs,
    new Set(),
    minutes,
    displayPct,
    false,
  );
  const used1 = rowKeys(row1);
  const row2 = buildRow(guards, wings, bigs, used1, minutes, displayPct, true);
  return [row1, row2];
}
