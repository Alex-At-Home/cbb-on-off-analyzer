import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { faMinusSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Form } from "react-bootstrap";
import type {
  ActionProps,
  ActionWithRulesAndAddersProps,
  ActionWithRulesProps,
  CombinatorSelectorProps,
  Field,
  FieldSelectorProps,
  NotToggleProps,
  OperatorSelectorProps,
  Option,
  RuleGroupType,
  RuleType,
  ValueEditorProps,
} from "react-querybuilder";
import { QueryBuilder, ValueEditor, ValueSelector } from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import styles from "./PlayerQueryBuilder.module.css";
import { AdvancedFilterUtils } from "../../utils/AdvancedFilterUtils";
import {
  cascadingSlicesValueGroupsOnly,
  findSliceIdForFieldName,
  playerLeaderboardCascadingFieldSlices,
  playerLeaderboardFlatRqbFields,
  type PlayerQueryCascadingSlice,
} from "../../utils/queryBuilder/playerLeaderboard";
import {
  composePlayerLeaderboardFilterString,
  inferLeaderboardRuleSource,
  newSortRowId,
  parsePlayerLeaderboardFilterParts,
  parseWhereCoreToPlayerLeaderboardQuery,
  PLAYER_LEADERBOARD_RQB_OPERATORS,
  PLAYER_QB_CUSTOM_RULE_FIELD,
  queryToLinq,
  RQB_PLACEHOLDER_OPERATOR,
  type PlayerLeaderboardSortRow,
  type PlayerQueryRuleSource,
} from "../../utils/queryBuilder/playerLeaderboardLinqBridge";
import {
  teamLeaderboardCascadingFieldSlices,
  teamLeaderboardFlatRqbFields,
} from "../../utils/queryBuilder/teamLeaderboardRegistry";
import LinqExpressionBuilder from "./LinqExpressionBuilder";

/** Sort UI: value groups only (no rank / percentile cascading groups). */
const PLAYER_LBOARD_SORT_SLICES = cascadingSlicesValueGroupsOnly(
  playerLeaderboardCascadingFieldSlices,
);
const TEAM_LBOARD_SORT_SLICES = cascadingSlicesValueGroupsOnly(
  teamLeaderboardCascadingFieldSlices,
);

const CASCADING_SLICES_CONTEXT_KEY = "playerFieldCascadingSlices";
const CASCADING_TEAM_SLICES_CONTEXT_KEY = "teamFieldCascadingSlices";

const playerQueryBuilderCustomRuleField: Field = {
  name: PLAYER_QB_CUSTOM_RULE_FIELD,
  label: "Custom expression",
  operators: [{ name: "=", label: "=" }],
  defaultOperator: "=",
};

const mergedLeaderboardQueryBuilderFields: Field[] = (() => {
  const byName = new Map<string, Field>();
  for (const f of playerLeaderboardFlatRqbFields) {
    byName.set(String(f.name), f);
  }
  for (const f of teamLeaderboardFlatRqbFields) {
    const n = String(f.name);
    if (!byName.has(n)) {
      byName.set(n, f);
    }
  }
  byName.set(
    String(playerQueryBuilderCustomRuleField.name),
    playerQueryBuilderCustomRuleField,
  );
  return Array.from(byName.values());
})();

type PlayerQbUiContextValue = {
  morphToCustom: (path: number[]) => void;
  morphToPlayer: (path: number[]) => void;
  morphToTeam: (path: number[]) => void;
  showHelp?: boolean;
};

const PlayerQbUiContext = createContext<PlayerQbUiContextValue | null>(null);

function isRuleGroupNode(x: unknown): x is RuleGroupType {
  return (
    typeof x === "object" &&
    x !== null &&
    "rules" in x &&
    Array.isArray((x as RuleGroupType).rules)
  );
}

function mapQueryAtPath(
  root: RuleGroupType,
  path: number[],
  updater: (rule: RuleType) => RuleType,
): RuleGroupType {
  if (path.length === 1) {
    const idx = path[0]!;
    return {
      ...root,
      rules: root.rules.map((r, i) =>
        i === idx && !isRuleGroupNode(r) ? updater(r as RuleType) : r,
      ),
    };
  }
  const [head, ...rest] = path;
  return {
    ...root,
    rules: root.rules.map((r, i) => {
      if (i !== head) {
        return r;
      }
      if (!isRuleGroupNode(r)) {
        return r;
      }
      return mapQueryAtPath(r, rest, updater);
    }),
  };
}

export type PlayerQueryBuilderProps = {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly showHelp?: boolean;
  readonly className?: string;
  /**
   * When true, disables the query builder and custom where editor.
   * Do not tie this to draft-vs-applied filter: that would grey out the builder on every edit.
   */
  readonly disabled?: boolean;
};

/**
 * Source (Player | Custom) + stat group + field. Custom rules only show Source;
 * expression is edited in the value editor (LinqExpressionBuilder).
 */
const PlayerLeaderboardCascadingFieldSelector: React.FC<FieldSelectorProps> = (
  props,
) => {
  const ui = useContext(PlayerQbUiContext);
  const playerSlices = props.context?.[CASCADING_SLICES_CONTEXT_KEY] as
    | PlayerQueryCascadingSlice[]
    | undefined;
  const teamSlices = props.context?.[CASCADING_TEAM_SLICES_CONTEXT_KEY] as
    | PlayerQueryCascadingSlice[]
    | undefined;
  const source: PlayerQueryRuleSource = inferLeaderboardRuleSource(
    props.rule.field,
  );
  const slices =
    source === "team"
      ? teamSlices
      : source === "player"
        ? playerSlices
        : undefined;

  if (!playerSlices?.length) {
    return <ValueSelector {...props} />;
  }

  const currentField = props.value ?? "";
  const activeSliceList = slices ?? playerSlices;
  const sliceId =
    (currentField && findSliceIdForFieldName(activeSliceList, currentField)) ||
    activeSliceList[0]!.id;
  const activeSlice =
    activeSliceList.find((s) => s.id === sliceId) ?? activeSliceList[0]!;

  return (
    <div
      className={[styles.ruleFieldsShell, props.className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`d-flex align-items-center ${styles.ruleFieldSelector}`}>
        <Form.Control
          as="select"
          size="sm"
          className={styles.ruleFieldSelect}
          style={{ minWidth: "6.5rem" }}
          title="Rule source"
          disabled={props.disabled}
          value={source}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value as PlayerQueryRuleSource;
            if (v === "custom" && source !== "custom") {
              ui?.morphToCustom(props.path);
            } else if (v === "player" && source !== "player") {
              ui?.morphToPlayer(props.path);
            } else if (v === "team" && source !== "team") {
              ui?.morphToTeam(props.path);
            }
          }}
        >
          <option value="player">Player</option>
          <option value="team">Team</option>
          <option value="custom">Custom</option>
        </Form.Control>
        {source !== "custom" ? (
          <>
            <Form.Control
              as="select"
              size="sm"
              className={styles.ruleFieldSelect}
              style={{ minWidth: "9rem" }}
              title="Stat group"
              disabled={props.disabled}
              value={sliceId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const nextSlice = activeSliceList.find(
                  (s) => s.id === e.target.value,
                );
                const first = nextSlice?.fields[0];
                if (first) {
                  props.handleOnChange(first.name);
                }
              }}
            >
              {activeSliceList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Form.Control>
            <Form.Control
              as="select"
              size="sm"
              className={styles.ruleFieldSelect}
              style={{ minWidth: "10rem" }}
              title="Field"
              disabled={props.disabled}
              value={currentField}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                props.handleOnChange(e.target.value);
              }}
            >
              <option value="">— Field —</option>
              {activeSlice.fields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label}
                </option>
              ))}
            </Form.Control>
          </>
        ) : null}
      </div>
    </div>
  );
};

function flattenSelectorOptions<Opt extends Option>(
  options: readonly Opt[] | readonly { options?: Opt[]; label?: string }[],
): Opt[] {
  const out: Opt[] = [];
  for (const o of options ?? []) {
    if (!o) {
      continue;
    }
    if ("options" in o && Array.isArray(o.options)) {
      for (const c of o.options) {
        if (c) {
          out.push(c);
        }
      }
    } else {
      out.push(o as Opt);
    }
  }
  return out;
}

function renderOperatorOptions(
  options: OperatorSelectorProps["options"] | undefined,
): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  for (const o of options ?? []) {
    if (!o) {
      continue;
    }
    if ("options" in o && Array.isArray(o.options)) {
      for (const c of o.options) {
        rows.push(
          <option key={c.name} value={c.name}>
            {c.label}
          </option>,
        );
      }
    } else if ("name" in o) {
      const op = o as { name: string; label: string };
      rows.push(
        <option key={op.name} value={op.name}>
          {op.label}
        </option>,
      );
    }
  }
  return rows;
}

const PlayerQbRemoveGlyphButton: React.FC<
  ActionProps | ActionWithRulesProps
> = (props) => (
  <Button
    type="button"
    variant="outline-secondary"
    size="sm"
    className={[styles.removeRuleBtn, props.className]
      .filter(Boolean)
      .join(" ")}
    disabled={props.disabled}
    title={props.title}
    aria-label={props.title || "Remove"}
    onClick={props.handleOnClick}
  >
    <FontAwesomeIcon icon={faMinusSquare} />
  </Button>
);

const PlayerQbAddGroupAction: React.FC<ActionWithRulesAndAddersProps> = (
  props,
) => (
  <Button
    type="button"
    variant="outline-secondary"
    size="sm"
    className={[styles.qbAddToolbarBtn, props.className]
      .filter(Boolean)
      .join(" ")}
    disabled={props.disabled || false}
    title={props.title}
    onClick={(e) => props.handleOnClick(e)}
  >
    {props.label}
  </Button>
);

const PlayerQbCombinatorSelector: React.FC<CombinatorSelectorProps> = (
  props,
) => {
  const flat = flattenSelectorOptions(props.options);
  return (
    <Form.Control
      as="select"
      size="sm"
      className={[styles.combinatorSelect, props.className]
        .filter(Boolean)
        .join(" ")}
      disabled={props.disabled}
      title={props.title}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        props.handleOnChange(e.target.value)
      }
    >
      {flat.map((c) => (
        <option key={c.name} value={c.name}>
          {c.label}
        </option>
      ))}
    </Form.Control>
  );
};

const PlayerQbNotToggle: React.FC<NotToggleProps> = (props) => {
  const id = `player-qb-not-${props.path.join("-")}`;
  return (
    <Form.Check
      type="checkbox"
      id={id}
      className={[styles.notToggle, props.className].filter(Boolean).join(" ")}
      disabled={props.disabled}
      checked={!!props.checked}
      label={props.label}
      title={props.title}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        props.handleOnChange(e.target.checked)
      }
    />
  );
};

const PlayerQbOperatorSelector: React.FC<OperatorSelectorProps> = (props) => {
  if (props.field === PLAYER_QB_CUSTOM_RULE_FIELD) {
    return <span className="sr-only">=</span>;
  }
  return (
    <Form.Control
      as="select"
      size="sm"
      className={[styles.ruleOperatorSelect, props.className]
        .filter(Boolean)
        .join(" ")}
      disabled={props.disabled}
      title={props.title}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        props.handleOnChange(e.target.value)
      }
    >
      {renderOperatorOptions(props.options)}
    </Form.Control>
  );
};

const PlayerQbValueEditor: React.FC<ValueEditorProps> = (props) => {
  const ui = useContext(PlayerQbUiContext);
  if (props.field !== PLAYER_QB_CUSTOM_RULE_FIELD) {
    return (
      <ValueEditor
        {...props}
        className={["form-control", "form-control-sm", props.className]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }
  return (
    <div
      className={`${styles.valueEditorCustom} ${props.className || ""}`.trim()}
    >
      <LinqExpressionBuilder
        prompt="Custom Linq for this rule (Enter to apply)"
        value={String(props.value ?? "")}
        disabled={props.disabled}
        autocomplete={AdvancedFilterUtils.playerLboardWithTeamStatsAutocomplete}
        callback={(newVal: string) => props.handleOnChange(newVal)}
        showHelp={ui?.showHelp}
      />
    </div>
  );
};

const SortFieldCascadingSelector: React.FC<{
  readonly expression: string;
  readonly disabled?: boolean;
  readonly playerSlices: PlayerQueryCascadingSlice[];
  readonly teamSlices: PlayerQueryCascadingSlice[];
  readonly onExpressionChange: (fieldName: string) => void;
}> = ({
  expression,
  disabled,
  playerSlices,
  teamSlices,
  onExpressionChange,
}) => {
  const inferred = inferLeaderboardRuleSource(expression);
  const source: "player" | "team" = inferred === "team" ? "team" : "player";
  const contextSlices = source === "team" ? teamSlices : playerSlices;

  if (!contextSlices.length) {
    return null;
  }

  const sliceId =
    (expression && findSliceIdForFieldName(contextSlices, expression)) ||
    contextSlices[0]!.id;
  const activeSlice =
    contextSlices.find((s) => s.id === sliceId) ?? contextSlices[0]!;

  return (
    <div
      className="d-flex flex-wrap align-items-center flex-grow-1"
      style={{ minWidth: 0 }}
    >
      <Form.Control
        as="select"
        size="sm"
        className="mr-1 mb-1"
        style={{ minWidth: "6.5rem", maxWidth: "10rem" }}
        title="Rule source"
        disabled={disabled}
        value={source}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const v = e.target.value as "player" | "team";
          if (v === "team") {
            const first = teamSlices[0]?.fields[0]?.name ?? "";
            onExpressionChange(first);
          } else {
            const first = playerSlices[0]?.fields[0]?.name ?? "";
            onExpressionChange(first);
          }
        }}
      >
        <option value="player">Player</option>
        <option value="team">Team</option>
      </Form.Control>
      <Form.Control
        as="select"
        size="sm"
        className="mr-1 mb-1"
        style={{ minWidth: "10rem", maxWidth: "18rem" }}
        title="Sort stat group"
        disabled={disabled}
        value={sliceId}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const nextSlice = contextSlices.find((s) => s.id === e.target.value);
          const first = nextSlice?.fields[0];
          if (first) {
            onExpressionChange(first.name);
          }
        }}
      >
        {contextSlices.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </Form.Control>
      <Form.Control
        as="select"
        size="sm"
        className="mr-1 mb-1"
        style={{ minWidth: "11rem", maxWidth: "22rem" }}
        title="Sort field"
        disabled={disabled}
        value={expression}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onExpressionChange(e.target.value);
        }}
      >
        <option value="">— Field —</option>
        {activeSlice.fields.map((f) => (
          <option key={f.name} value={f.name}>
            {f.label}
          </option>
        ))}
      </Form.Control>
    </div>
  );
};

const emptyQuery = (): RuleGroupType => ({
  id: "root",
  combinator: "and",
  not: false,
  rules: [],
});

const PlayerQueryBuilder: React.FC<PlayerQueryBuilderProps> = ({
  value,
  onChange,
  showHelp,
  className,
  disabled = false,
}) => {
  const [query, setQuery] = useState<RuleGroupType>(emptyQuery);
  const [sortRows, setSortRows] = useState<PlayerLeaderboardSortRow[]>([]);
  const [limitN, setLimitN] = useState<number | null>(null);
  const skipNextExternalSync = useRef(false);

  const queryRef = useRef(query);
  const sortRowsRef = useRef(sortRows);
  const limitNRef = useRef(limitN);
  queryRef.current = query;
  sortRowsRef.current = sortRows;
  limitNRef.current = limitN;

  const emitComposed = useCallback(
    (opts?: {
      nextQuery?: RuleGroupType;
      nextSortRows?: PlayerLeaderboardSortRow[];
      nextLimit?: number | null;
    }) => {
      const q = opts?.nextQuery ?? queryRef.current;
      const sorts = opts?.nextSortRows ?? sortRowsRef.current;
      const lim =
        opts?.nextLimit !== undefined ? opts.nextLimit : limitNRef.current;
      const whereCore = queryToLinq(q).trim();
      const full = composePlayerLeaderboardFilterString(whereCore, sorts, lim);
      skipNextExternalSync.current = true;
      onChange(full);
    },
    [onChange],
  );

  const morphToCustom = useCallback(
    (path: number[]) => {
      const q = queryRef.current;
      const next = mapQueryAtPath(q, path, (r) => ({
        ...r,
        field: PLAYER_QB_CUSTOM_RULE_FIELD,
        operator: "=",
        value: "",
      }));
      setQuery(next);
      queryRef.current = next;
      emitComposed({ nextQuery: next });
    },
    [emitComposed],
  );

  const morphToPlayer = useCallback(
    (path: number[]) => {
      const firstField =
        playerLeaderboardCascadingFieldSlices[0]?.fields[0]?.name ?? "";
      const q = queryRef.current;
      const next = mapQueryAtPath(q, path, (r) => ({
        ...r,
        field: firstField,
        operator: RQB_PLACEHOLDER_OPERATOR,
        value: "",
      }));
      setQuery(next);
      queryRef.current = next;
      emitComposed({ nextQuery: next });
    },
    [emitComposed],
  );

  const morphToTeam = useCallback(
    (path: number[]) => {
      const firstField =
        teamLeaderboardCascadingFieldSlices[0]?.fields[0]?.name ??
        "team_stats.off_adj_ppp";
      const q = queryRef.current;
      const next = mapQueryAtPath(q, path, (r) => ({
        ...r,
        field: firstField,
        operator: RQB_PLACEHOLDER_OPERATOR,
        value: "",
      }));
      setQuery(next);
      queryRef.current = next;
      emitComposed({ nextQuery: next });
    },
    [emitComposed],
  );

  const playerQbUiValue = useMemo(
    () => ({
      morphToCustom,
      morphToPlayer,
      morphToTeam,
      showHelp,
    }),
    [morphToCustom, morphToPlayer, morphToTeam, showHelp],
  );

  const applyCommittedValue = useCallback((committed: string) => {
    const {
      whereCore,
      sortRows: parsedSorts,
      limit,
    } = parsePlayerLeaderboardFilterParts(committed);
    const sortRowsHydrated = parsedSorts.map((r) => ({
      ...r,
      id: newSortRowId(),
    }));
    setSortRows(sortRowsHydrated);
    sortRowsRef.current = sortRowsHydrated;
    setLimitN(limit);
    limitNRef.current = limit;

    const nextQuery = parseWhereCoreToPlayerLeaderboardQuery(whereCore);
    setQuery(nextQuery);
    queryRef.current = nextQuery;
  }, []);

  useEffect(() => {
    if (skipNextExternalSync.current) {
      skipNextExternalSync.current = false;
      return;
    }
    applyCommittedValue(value);
  }, [value, applyCommittedValue]);

  const emitLinq = useCallback(
    (nextQuery: RuleGroupType) => {
      setQuery(nextQuery);
      queryRef.current = nextQuery;
      emitComposed({ nextQuery: nextQuery });
    },
    [emitComposed],
  );

  const addSortRow = useCallback(() => {
    const next = [
      ...sortRowsRef.current,
      { id: newSortRowId(), expression: "", ascending: false },
    ];
    setSortRows(next);
    sortRowsRef.current = next;
    emitComposed({ nextSortRows: next });
  }, [emitComposed]);

  const addLimitClause = useCallback(() => {
    const next =
      limitNRef.current != null && limitNRef.current > 0
        ? limitNRef.current
        : 25;
    setLimitN(next);
    limitNRef.current = next;
    emitComposed({ nextLimit: next });
  }, [emitComposed]);

  const updateSortRow = useCallback(
    (id: string, patch: Partial<PlayerLeaderboardSortRow>) => {
      const next = sortRowsRef.current.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      );
      setSortRows(next);
      sortRowsRef.current = next;
      emitComposed({ nextSortRows: next });
    },
    [emitComposed],
  );

  const removeSortRow = useCallback(
    (id: string) => {
      const next = sortRowsRef.current.filter((r) => r.id !== id);
      setSortRows(next);
      sortRowsRef.current = next;
      emitComposed({ nextSortRows: next });
    },
    [emitComposed],
  );

  const updateLimitInput = useCallback(
    (raw: string) => {
      if (raw.trim() === "") {
        setLimitN(null);
        limitNRef.current = null;
        emitComposed({ nextLimit: null });
        return;
      }
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0) {
        return;
      }
      setLimitN(n);
      limitNRef.current = n;
      emitComposed({ nextLimit: n });
    },
    [emitComposed],
  );

  const removeLimit = useCallback(() => {
    setLimitN(null);
    limitNRef.current = null;
    emitComposed({ nextLimit: null });
  }, [emitComposed]);

  const qbContext = useMemo(
    () => ({
      [CASCADING_SLICES_CONTEXT_KEY]: playerLeaderboardCascadingFieldSlices,
      [CASCADING_TEAM_SLICES_CONTEXT_KEY]: teamLeaderboardCascadingFieldSlices,
    }),
    [],
  );

  const PlayerAddRuleAction: React.FC<ActionWithRulesAndAddersProps> =
    useCallback(
      (props) => {
        const addRuleBtn = (
          <Button
            type="button"
            variant="outline-secondary"
            size="sm"
            className={styles.qbAddToolbarBtn}
            disabled={props.disabled || disabled}
            title={props.title}
            onClick={(e) => props.handleOnClick(e)}
          >
            {props.label}
          </Button>
        );
        if (props.path.length > 0) {
          return <span className={props.className}>{addRuleBtn}</span>;
        }
        return (
          <div
            className={[
              styles.rootAddRuleCluster,
              "d-inline-flex align-items-center flex-wrap",
              props.className || "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {addRuleBtn}
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              className={styles.qbAddToolbarBtn}
              title="Add a SORT_BY clause"
              disabled={props.disabled || disabled}
              onClick={(e) => {
                e.preventDefault();
                addSortRow();
              }}
            >
              + Sort
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              className={styles.qbAddToolbarBtn}
              title="Add LIMIT"
              disabled={props.disabled || disabled}
              onClick={(e) => {
                e.preventDefault();
                addLimitClause();
              }}
            >
              + Limit
            </Button>
          </div>
        );
      },
      [addLimitClause, addSortRow, disabled],
    );

  const rootClassName = [styles.root, className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName || undefined}>
      <PlayerQbUiContext.Provider value={playerQbUiValue}>
        <QueryBuilder
          fields={mergedLeaderboardQueryBuilderFields}
          context={qbContext}
          controlElements={{
            fieldSelector: PlayerLeaderboardCascadingFieldSelector,
            operatorSelector: PlayerQbOperatorSelector,
            valueEditor: PlayerQbValueEditor,
            combinatorSelector: PlayerQbCombinatorSelector,
            notToggle: PlayerQbNotToggle,
            addRuleAction: PlayerAddRuleAction,
            addGroupAction: PlayerQbAddGroupAction,
            removeRuleAction: PlayerQbRemoveGlyphButton,
            removeGroupAction: PlayerQbRemoveGlyphButton,
          }}
          query={query}
          onQueryChange={emitLinq}
          operators={[...PLAYER_LEADERBOARD_RQB_OPERATORS]}
          combinators={[
            { name: "and", label: "AND" },
            { name: "or", label: "OR" },
          ]}
          autoSelectField={false}
          autoSelectOperator={false}
          enableMountQueryChange={false}
          disabled={disabled}
          controlClassnames={{ queryBuilder: "player-query-builder" }}
        />
      </PlayerQbUiContext.Provider>

      {sortRows.length > 0 ? (
        <div className="mt-2 small text-muted">Sort</div>
      ) : null}
      {sortRows.map((row) => (
        <div
          key={row.id}
          className="d-flex flex-wrap align-items-center mb-1 border rounded px-2 py-1 w-100"
        >
          <SortFieldCascadingSelector
            expression={row.expression}
            disabled={disabled}
            playerSlices={PLAYER_LBOARD_SORT_SLICES}
            teamSlices={TEAM_LBOARD_SORT_SLICES}
            onExpressionChange={(fieldName) =>
              updateSortRow(row.id, { expression: fieldName })
            }
          />
          <div
            className="flex-grow-1"
            style={{ minWidth: "0.75rem" }}
            aria-hidden
          />
          <div className="d-flex flex-wrap align-items-center flex-shrink-0">
            <Form.Control
              as="select"
              size="sm"
              style={{ width: "5.5rem" }}
              className="mr-1 mb-1"
              disabled={disabled}
              value={row.ascending ? "asc" : "desc"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateSortRow(row.id, { ascending: e.target.value === "asc" })
              }
            >
              <option value="desc">DESC</option>
              <option value="asc">ASC</option>
            </Form.Control>
            <Button
              variant="outline-danger"
              size="sm"
              className="mb-1"
              disabled={disabled}
              onClick={() => removeSortRow(row.id)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      {limitN != null && limitN > 0 ? (
        <>
          <div className="mt-2 small text-muted">Limit</div>
          <div className="d-flex flex-wrap align-items-center mb-1 border rounded px-2 py-1">
            <Form.Control
              type="number"
              min={1}
              size="sm"
              className="mr-1 mb-1"
              style={{ width: "6rem" }}
              disabled={disabled}
              value={limitN}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateLimitInput(e.target.value)
              }
            />
            <Button
              variant="outline-danger"
              size="sm"
              className="mb-1"
              disabled={disabled}
              onClick={removeLimit}
            >
              Remove
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default PlayerQueryBuilder;
