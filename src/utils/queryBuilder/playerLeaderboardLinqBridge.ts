import type { RuleGroupType, RuleType } from "react-querybuilder";
import { playerQueryBuilderFieldNameSet } from "./playerLeaderboard";
import { PLAYER_LEADERBOARD_POS_SLOTS } from "./playerLeaderboardPosSlots";

const BRACKETED_POS_SLOT_KEYS = new Set<string>([
  ...PLAYER_LEADERBOARD_POS_SLOTS,
  "_1_",
  "_2_",
  "_3_",
  "_4_",
  "_5_",
]);

/**
 * react-querybuilder uses `~` as `translations.operators.placeholderName` when no
 * real operator is selected (`autoSelectOperator={false}`).
 */
export const RQB_PLACEHOLDER_OPERATOR = "~" as const;

/**
 * Sentinel `field` on a RuleType whose `value` is a raw Linq fragment (per-rule custom).
 * Not a real stat field; omitted from {@link playerQueryBuilderFieldNameSet}.
 */
export const PLAYER_QB_CUSTOM_RULE_FIELD = "__PLAYER_QB_CUSTOM__" as const;

export type PlayerQueryRuleSource = "player" | "custom";

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

/**
 * Reads a field token: `ident` or `ident[_PG_]`-style (see {@link BRACKETED_POS_SLOT_KEYS}).
 */
function readPlayerLinqFieldName(ctx: ParseCtx): string | null {
  const base = readIdent(ctx);
  if (!base) {
    return null;
  }
  if (ctx.i >= ctx.s.length || ctx.s[ctx.i] !== "[") {
    return base;
  }
  const bracketStart = ctx.i;
  ctx.i++;
  const innerStart = ctx.i;
  while (ctx.i < ctx.s.length && ctx.s[ctx.i] !== "]") {
    ctx.i++;
  }
  if (ctx.i >= ctx.s.length) {
    ctx.i = bracketStart;
    return base;
  }
  const inner = ctx.s.slice(innerStart, ctx.i);
  ctx.i++;
  if (!BRACKETED_POS_SLOT_KEYS.has(inner)) {
    ctx.i = bracketStart;
    return base;
  }
  return `${base}[${inner}]`;
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

/** Unquoted `true` / `false` (whole words), same idea as numeric literals. */
function readBooleanLiteral(ctx: ParseCtx): "true" | "false" | null {
  skipWs(ctx);
  const rest = ctx.s.slice(ctx.i);
  const atWordEnd = (len: number) => {
    const c = rest[len];
    return c === undefined || !/[A-Za-z0-9_.]/.test(c);
  };
  if (rest.startsWith("true") && atWordEnd(4)) {
    ctx.i += 4;
    return "true";
  }
  if (rest.startsWith("false") && atWordEnd(5)) {
    ctx.i += 5;
    return "false";
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
  if ((r as { field?: string }).field === PLAYER_QB_CUSTOM_RULE_FIELD) {
    return Boolean(String((r as { value?: unknown }).value ?? "").trim());
  }
  return Boolean((r.field || "").trim() && (r.operator || "").trim());
}

/**
 * Best-effort parse of a committed LINQ filter fragment into an RQB query.
 * Returns `null` if the string is non-empty and not a supported expression.
 */
export function linqToQuery(
  committedLinq: string,
  options?: { resetIdCounter?: boolean },
): RuleGroupType | null {
  if (options?.resetIdCounter !== false) {
    idCounter = 0;
  }
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

/** Split on top-level `&&` (ignores `&&` inside parentheses and string literals). */
export function splitWhereOnTopLevelAnd(where: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let inStr: string | null = null;
  for (let i = 0; i < where.length; i++) {
    const c = where[i]!;
    if (inStr) {
      if (c === "\\" && i + 1 < where.length) {
        i++;
        continue;
      }
      if (c === inStr) {
        inStr = null;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "(") {
      depth++;
      continue;
    }
    if (c === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (
      depth === 0 &&
      c === "&" &&
      i + 1 < where.length &&
      where[i + 1] === "&"
    ) {
      parts.push(where.slice(start, i).trim());
      start = i + 2;
      i++;
    }
  }
  parts.push(where.slice(start).trim());
  return parts.filter((p) => p.length > 0);
}

function stripBalancedOuterParens(s: string): string {
  let t = s.trim();
  while (t.length >= 2 && t[0] === "(") {
    let depth = 0;
    let closesAtEnd = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i]!;
      if (c === "(") {
        depth++;
      } else if (c === ")") {
        depth--;
        if (depth === 0) {
          closesAtEnd = i === t.length - 1;
          break;
        }
      }
    }
    if (closesAtEnd) {
      t = t.slice(1, -1).trim();
    } else {
      break;
    }
  }
  return t;
}

function simplifyParsedSegmentToRuleOrGroup(
  parsed: RuleGroupType,
): RuleType | RuleGroupType {
  if (
    parsed.rules.length === 1 &&
    !parsed.not &&
    parsed.combinator === "and" &&
    !isRuleGroup(parsed.rules[0]!)
  ) {
    return parsed.rules[0] as RuleType;
  }
  return parsed;
}

/**
 * Parses a where-core string into an RQB query. If the whole string parses as player rules,
 * returns that tree. Otherwise splits on top-level `&&` and uses a player subtree per
 * segment when {@link linqToQuery} succeeds, else a per-rule custom fragment
 * ({@link PLAYER_QB_CUSTOM_RULE_FIELD}).
 */
export function parseWhereCoreToPlayerLeaderboardQuery(
  whereCore: string,
): RuleGroupType {
  const stripped = whereCore.trim();
  if (!stripped) {
    return {
      id: "root",
      combinator: "and",
      not: false,
      rules: [],
    };
  }
  const whole = linqToQuery(stripped);
  if (whole !== null) {
    return whole;
  }
  const segments = splitWhereOnTopLevelAnd(stripped);
  idCounter = 0;
  const rulesOut: Array<RuleType | RuleGroupType> = [];
  for (const rawSeg of segments) {
    const seg = rawSeg.trim();
    if (!seg) {
      continue;
    }
    const normalized = stripBalancedOuterParens(seg);
    const parsed = linqToQuery(normalized, { resetIdCounter: false });
    if (parsed !== null) {
      rulesOut.push(simplifyParsedSegmentToRuleOrGroup(parsed));
    } else {
      rulesOut.push({
        id: nextId("r"),
        field: PLAYER_QB_CUSTOM_RULE_FIELD,
        operator: "=",
        value: seg,
      });
    }
  }
  if (rulesOut.length === 0) {
    return {
      id: "root",
      combinator: "and",
      not: false,
      rules: [],
    };
  }
  return {
    id: "root",
    combinator: "and",
    not: false,
    rules: rulesOut,
  };
}

function emitCustomPlayerRuleFragment(expr: string): string {
  const t = expr.trim();
  if (t.includes("&&") || t.includes("||")) {
    return `(${t})`;
  }
  return t;
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
  const field = readPlayerLinqFieldName(ctx);
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
  let value: string | null;
  if (strVal !== null) {
    value = strVal;
  } else {
    const boolLit = readBooleanLiteral(ctx);
    if (boolLit !== null) {
      value = boolLit;
    } else {
      const num = readNumber(ctx);
      value = num;
    }
  }
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
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  const s = String(value);
  if (s === "") {
    return `""`;
  }
  if (s === "true" || s === "false") {
    return s;
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
  if ((rule as { field?: string }).field === PLAYER_QB_CUSTOM_RULE_FIELD) {
    return emitCustomPlayerRuleFragment(String(rule.value ?? ""));
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
