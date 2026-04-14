import type { RuleGroupType, RuleType } from "react-querybuilder";
import { playerQueryBuilderFieldNameSet } from "./playerLeaderboard";

/**
 * react-querybuilder uses `~` as `translations.operators.placeholderName` when no
 * real operator is selected (`autoSelectOperator={false}`).
 */
export const RQB_PLACEHOLDER_OPERATOR = "~" as const;

/** RQB operator `name` values used by the player leaderboard builder. */
export const PLAYER_LEADERBOARD_RQB_OPERATORS = [
  { name: ">", label: ">" },
  { name: "<", label: "<" },
  { name: ">=", label: ">=" },
  { name: "<=", label: "<=" },
  { name: "=", label: "=" },
  { name: "!=", label: "!=" },
] as const;

export function stripNonFilterLinqSuffixes(s: string): string {
  const noSort = s.split(/\bSORT_BY\b/i)[0] ?? s;
  const noLimit = noSort.split(/\bLIMIT\b/i)[0] ?? noSort;
  return noLimit.trim();
}

/** Preserves `SORT_BY` / `LIMIT` tails so the text editor and visual builder can share state. */
export function splitPlayerLeaderboardFilterSuffix(committed: string): {
  core: string;
  suffix: string;
} {
  const sortMatch = committed.match(/\bSORT_BY\b/i);
  const sortIdx = sortMatch?.index ?? -1;
  if (sortIdx < 0) {
    return { core: committed.trim(), suffix: "" };
  }
  const core = committed.slice(0, sortIdx).trimEnd();
  const suffix = committed.slice(sortIdx);
  return { core: core.trim(), suffix };
}

type ParseCtx = {
  s: string;
  i: number;
};

function skipWs(ctx: ParseCtx) {
  while (ctx.i < ctx.s.length && /\s/.test(ctx.s[ctx.i]!)) {
    ctx.i++;
  }
}

function readIdent(ctx: ParseCtx): string | null {
  skipWs(ctx);
  const start = ctx.i;
  if (start >= ctx.s.length) {
    return null;
  }
  const c = ctx.s[start]!;
  if (!/[A-Za-z_]/.test(c)) {
    return null;
  }
  while (ctx.i < ctx.s.length && /[A-Za-z0-9_.]/.test(ctx.s[ctx.i]!)) {
    ctx.i++;
  }
  return ctx.s.slice(start, ctx.i);
}

function readNumber(ctx: ParseCtx): string | null {
  skipWs(ctx);
  const start = ctx.i;
  if (start >= ctx.s.length) {
    return null;
  }
  let j = start;
  if (ctx.s[j] === "-") {
    j++;
  }
  if (j >= ctx.s.length || !/\d/.test(ctx.s[j]!)) {
    return null;
  }
  while (j < ctx.s.length && /\d/.test(ctx.s[j]!)) {
    j++;
  }
  if (j < ctx.s.length && ctx.s[j] === ".") {
    j++;
    while (j < ctx.s.length && /\d/.test(ctx.s[j]!)) {
      j++;
    }
  }
  if (j === start) {
    return null;
  }
  if (j < ctx.s.length && ctx.s[j] === "%") {
    j++;
  }
  ctx.i = j;
  return ctx.s.slice(start, j);
}

function readString(ctx: ParseCtx): string | null {
  skipWs(ctx);
  const q = ctx.s[ctx.i];
  if (q !== `"` && q !== `'`) {
    return null;
  }
  ctx.i++;
  let out = "";
  while (ctx.i < ctx.s.length) {
    const ch = ctx.s[ctx.i]!;
    if (ch === "\\" && ctx.i + 1 < ctx.s.length) {
      out += ctx.s[ctx.i + 1]!;
      ctx.i += 2;
      continue;
    }
    if (ch === q) {
      ctx.i++;
      return out;
    }
    out += ch;
    ctx.i++;
  }
  return null;
}

function readOp(ctx: ParseCtx): string | null {
  skipWs(ctx);
  const rest = ctx.s.slice(ctx.i);
  const two = [">=", "<=", "!="];
  for (const op of two) {
    if (rest.startsWith(op)) {
      ctx.i += op.length;
      return op;
    }
  }
  const one = [">", "<", "="];
  for (const op of one) {
    if (rest.startsWith(op)) {
      ctx.i += op.length;
      return op;
    }
  }
  return null;
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function isRuleGroup(x: unknown): x is RuleGroupType {
  return (
    typeof x === "object" &&
    x !== null &&
    "rules" in x &&
    Array.isArray((x as RuleGroupType).rules)
  );
}

function isNonEmptyRule(r: RuleType): boolean {
  return Boolean((r.field || "").trim() && (r.operator || "").trim());
}

/**
 * Best-effort parse of a committed LINQ filter fragment into an RQB query.
 * Returns `null` if the string is non-empty and not a supported expression.
 */
export function linqToQuery(committedLinq: string): RuleGroupType | null {
  idCounter = 0;
  const stripped = stripNonFilterLinqSuffixes(committedLinq);
  if (!stripped) {
    return {
      id: nextId("g"),
      combinator: "and",
      not: false,
      rules: [],
    };
  }
  const ctx: ParseCtx = { s: stripped, i: 0 };
  const root = parseOr(ctx);
  if (!root) {
    return null;
  }
  skipWs(ctx);
  if (ctx.i !== ctx.s.length) {
    return null;
  }
  return root;
}

function parseOr(ctx: ParseCtx): RuleGroupType | null {
  const first = parseAnd(ctx);
  if (!first) {
    return null;
  }
  const parts: Array<RuleGroupType | RuleType> = [first];
  while (true) {
    skipWs(ctx);
    if (ctx.s.slice(ctx.i, ctx.i + 2) !== "||") {
      break;
    }
    ctx.i += 2;
    const n = parseAnd(ctx);
    if (!n) {
      return null;
    }
    parts.push(n);
  }
  if (parts.length === 1) {
    const only = parts[0]!;
    if (isRuleGroup(only)) {
      return only;
    }
    return {
      id: nextId("g"),
      combinator: "and",
      not: false,
      rules: [only],
    };
  }
  return {
    id: nextId("g"),
    combinator: "or",
    not: false,
    rules: parts,
  };
}

function parseAnd(ctx: ParseCtx): RuleGroupType | RuleType | null {
  const first = parsePrimary(ctx);
  if (!first) {
    return null;
  }
  const parts: Array<RuleGroupType | RuleType> = [first];
  while (true) {
    skipWs(ctx);
    if (ctx.s.slice(ctx.i, ctx.i + 2) !== "&&") {
      break;
    }
    ctx.i += 2;
    const n = parsePrimary(ctx);
    if (!n) {
      return null;
    }
    parts.push(n);
  }
  if (parts.length === 1) {
    return parts[0]!;
  }
  return {
    id: nextId("g"),
    combinator: "and",
    not: false,
    rules: parts,
  };
}

/** After a bare field name, parsing may stop at these boundaries. */
function isBareFieldEnd(ctx: ParseCtx): boolean {
  skipWs(ctx);
  if (ctx.i >= ctx.s.length) {
    return true;
  }
  const c = ctx.s[ctx.i]!;
  if (c === ")") {
    return true;
  }
  const two = ctx.s.slice(ctx.i, ctx.i + 2);
  return two === "&&" || two === "||";
}

function parsePrimary(ctx: ParseCtx): RuleGroupType | RuleType | null {
  skipWs(ctx);
  if (ctx.s[ctx.i] === "(") {
    ctx.i++;
    const inner = parseOr(ctx);
    if (!inner) {
      return null;
    }
    skipWs(ctx);
    if (ctx.s[ctx.i] !== ")") {
      return null;
    }
    ctx.i++;
    return inner;
  }
  return parseRule(ctx);
}

function parseRule(ctx: ParseCtx): RuleType | null {
  const start = ctx.i;
  const field = readIdent(ctx);
  if (!field || !playerQueryBuilderFieldNameSet.has(field)) {
    return null;
  }
  const afterField = ctx.i;
  skipWs(ctx);
  // Legacy text from older serialization: `field ~ ""`
  if (ctx.i < ctx.s.length && ctx.s[ctx.i] === RQB_PLACEHOLDER_OPERATOR) {
    ctx.i++;
    skipWs(ctx);
    const legacyStr = readString(ctx);
    if (legacyStr !== null && legacyStr === "") {
      return {
        id: nextId("r"),
        field,
        operator: RQB_PLACEHOLDER_OPERATOR,
        value: "",
      };
    }
    ctx.i = afterField;
  }
  const op = readOp(ctx);
  if (!op) {
    skipWs(ctx);
    if (isBareFieldEnd(ctx)) {
      return {
        id: nextId("r"),
        field,
        operator: RQB_PLACEHOLDER_OPERATOR,
        value: "",
      };
    }
    ctx.i = start;
    return null;
  }
  skipWs(ctx);
  const strVal = readString(ctx);
  const value =
    strVal !== null
      ? strVal
      : (() => {
          const num = readNumber(ctx);
          return num !== null ? num : null;
        })();
  if (value === null) {
    return null;
  }
  return {
    id: nextId("r"),
    field,
    operator: op,
    value,
  };
}

export function formatRuleValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const s = String(value);
  if (s === "") {
    return `""`;
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return s;
  }
  if (/^-?\d+(\.\d+)?%$/.test(s)) {
    return s;
  }
  return `'${s.replace(/'/g, "\\'")}'`;
}

function isPlaceholderBareFieldRule(rule: RuleType): boolean {
  if ((rule.operator || "").trim() !== RQB_PLACEHOLDER_OPERATOR) {
    return false;
  }
  const v = rule.value;
  if (v === undefined || v === null) {
    return true;
  }
  if (typeof v === "string" && v.trim() === "") {
    return true;
  }
  return false;
}

function ruleToLinqFragment(rule: RuleType): string {
  if (!isNonEmptyRule(rule)) {
    return "";
  }
  if (isPlaceholderBareFieldRule(rule)) {
    return (rule.field || "").trim();
  }
  return `${rule.field} ${rule.operator} ${formatRuleValue(rule.value)}`;
}

/** Serialize an RQB query to LINQ filter text (no SORT_BY / LIMIT). */
export function queryToLinq(query: RuleGroupType): string {
  const inner = formatGroupInner(query);
  return inner.trim();
}

function formatGroupInner(group: RuleGroupType): string {
  const comb = group.combinator === "or" ? " || " : " && ";
  const parts: string[] = [];
  for (const r of group.rules) {
    if (isRuleGroup(r)) {
      const frag = formatGroupInner(r).trim();
      if (frag) {
        parts.push(`(${frag})`);
      }
    } else {
      const frag = ruleToLinqFragment(r);
      if (frag) {
        parts.push(frag);
      }
    }
  }
  return parts.join(comb);
}

/** One SORT_BY clause (expression before ASC/DESC). */
export type PlayerLeaderboardSortRow = {
  id: string;
  /** Sort key expression, e.g. `off_adj_rapm` or `100*pctile_off_efg`. */
  expression: string;
  ascending: boolean;
};

function stripTrailingSortDirection(frag: string): string {
  return frag.replace(/\s+(ASC|DESC)\s*$/i, "").trim();
}

function parseLimitFromCommitted(committed: string): number | null {
  const parts = committed.split(/\bLIMIT\b/i);
  if (parts.length < 2) {
    return null;
  }
  const tail = parts.slice(1).join("LIMIT").trim();
  const head = tail.split(/\s+/)[0] ?? "";
  const n = parseInt(head, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Splits a full player-leaderboard filter string into where-clause, SORT_BY rows, and LIMIT,
 * matching [`AdvancedFilterUtils.applyFilter`](src/utils/AdvancedFilterUtils.ts) segment rules.
 */
export function parsePlayerLeaderboardFilterParts(committed: string): {
  whereCore: string;
  sortRows: PlayerLeaderboardSortRow[];
  limit: number | null;
} {
  const filterFrags = committed
    .split(/\bSORT_BY\b/i)
    .map((frag) => frag.split(/\bLIMIT\b/i)[0] ?? frag);
  const whereCore = (filterFrags[0] ?? "").trim();
  const sortFrags = filterFrags
    .slice(1)
    .map((f) => f.trim())
    .filter(Boolean);
  const sortRows: PlayerLeaderboardSortRow[] = sortFrags.map((frag, i) => {
    const ascending = frag.toUpperCase().indexOf("ASC") >= 0;
    return {
      id: `sort-${i}`,
      expression: stripTrailingSortDirection(frag),
      ascending,
    };
  });
  const limit = parseLimitFromCommitted(committed);
  return { whereCore, sortRows, limit };
}

let sortRowId = 0;
export function newSortRowId(): string {
  sortRowId += 1;
  return `sort-${sortRowId}`;
}

/** Builds the committed filter string from structured parts (matches `applyFilter` expectations). */
export function composePlayerLeaderboardFilterString(
  whereCore: string,
  sortRows: PlayerLeaderboardSortRow[],
  limit: number | null,
): string {
  const w = whereCore.trim();
  let out = w;
  for (const row of sortRows) {
    const expr = row.expression.trim();
    if (!expr) {
      continue;
    }
    const dir = row.ascending ? "ASC" : "DESC";
    out += `${out ? " " : ""}SORT_BY ${expr} ${dir}`;
  }
  if (limit != null && limit > 0) {
    out += `${out ? " " : ""}LIMIT ${limit}`;
  }
  return out.trim();
}
