import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, ButtonGroup, Form } from "react-bootstrap";
import type {
  ActionWithRulesAndAddersProps,
  Field,
  FieldSelectorProps,
  OperatorSelectorProps,
  RuleGroupType,
  RuleType,
  ValueEditorProps,
} from "react-querybuilder";
import {
  ActionElement,
  QueryBuilder,
  ValueEditor,
  ValueSelector,
} from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import styles from "./PlayerQueryBuilder.module.css";
import { AdvancedFilterUtils } from "../../utils/AdvancedFilterUtils";
import {
  findSliceIdForFieldName,
  playerLeaderboardCascadingFieldSlices,
  playerLeaderboardFlatRqbFields,
  type PlayerQueryCascadingSlice,
} from "../../utils/queryBuilder/playerLeaderboard";
import {
  composePlayerLeaderboardFilterString,
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
import LinqExpressionBuilder from "./LinqExpressionBuilder";

const CASCADING_SLICES_CONTEXT_KEY = "playerFieldCascadingSlices";

const playerQueryBuilderCustomRuleField: Field = {
  name: PLAYER_QB_CUSTOM_RULE_FIELD,
  label: "Custom expression",
  operators: [{ name: "=", label: "=" }],
  defaultOperator: "=",
};

const playerLeaderboardQueryBuilderFields: Field[] = [
  ...playerLeaderboardFlatRqbFields,
  playerQueryBuilderCustomRuleField,
];

type PlayerQbUiContextValue = {
  morphToCustom: (path: number[]) => void;
  morphToPlayer: (path: number[]) => void;
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
  const slices = props.context?.[CASCADING_SLICES_CONTEXT_KEY] as
    | PlayerQueryCascadingSlice[]
    | undefined;
  const isCustom = props.rule.field === PLAYER_QB_CUSTOM_RULE_FIELD;
  const source: PlayerQueryRuleSource = isCustom ? "custom" : "player";

  if (!slices?.length) {
    return <ValueSelector {...props} />;
  }

  const currentField = props.value ?? "";
  const sliceId =
    (currentField && findSliceIdForFieldName(slices, currentField)) ||
    slices[0]!.id;
  const activeSlice = slices.find((s) => s.id === sliceId) ?? slices[0]!;

  return (
    <div
      className={`d-flex flex-column align-items-stretch ${props.className || ""}`}
    >
      <div className="d-flex flex-wrap align-items-center">
        <Form.Control
          as="select"
          size="sm"
          className="mr-1 mb-1"
          style={{ minWidth: "6.5rem", maxWidth: "10rem" }}
          title="Rule source"
          disabled={props.disabled}
          value={source}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value as PlayerQueryRuleSource;
            if (v === "custom" && source === "player") {
              ui?.morphToCustom(props.path);
            } else if (v === "player" && source === "custom") {
              ui?.morphToPlayer(props.path);
            }
          }}
        >
          <option value="player">Player</option>
          <option value="custom">Custom</option>
        </Form.Control>
        {!isCustom ? (
          <Form.Control
            as="select"
            size="sm"
            className="mr-1 mb-1"
            style={{ minWidth: "10rem", maxWidth: "18rem" }}
            title="Stat group"
            disabled={props.disabled}
            value={sliceId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const nextSlice = slices.find((s) => s.id === e.target.value);
              const first = nextSlice?.fields[0];
              if (first) {
                props.handleOnChange(first.name);
              }
            }}
          >
            {slices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Form.Control>
        ) : null}
      </div>
      {!isCustom ? (
        <div className="d-flex flex-wrap align-items-center">
          <Form.Control
            as="select"
            size="sm"
            className="mr-1 mb-1"
            style={{ minWidth: "11rem", maxWidth: "22rem" }}
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
        </div>
      ) : null}
    </div>
  );
};

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

const PlayerQbOperatorSelector: React.FC<OperatorSelectorProps> = (props) => {
  if (props.field === PLAYER_QB_CUSTOM_RULE_FIELD) {
    return <span className="sr-only">=</span>;
  }
  return (
    <Form.Control
      as="select"
      size="sm"
      className={props.className}
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
    return <ValueEditor {...props} />;
  }
  return (
    <div style={{ minWidth: "12rem", flex: "1 1 14rem" }}>
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
  readonly contextSlices: PlayerQueryCascadingSlice[];
  readonly onExpressionChange: (fieldName: string) => void;
}> = ({ expression, disabled, contextSlices, onExpressionChange }) => {
  const sliceId =
    (expression && findSliceIdForFieldName(contextSlices, expression)) ||
    contextSlices[0]!.id;
  const activeSlice =
    contextSlices.find((s) => s.id === sliceId) ?? contextSlices[0]!;

  return (
    <div className="d-flex flex-wrap align-items-center flex-grow-1">
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

  const playerQbUiValue = useMemo(
    () => ({
      morphToCustom,
      morphToPlayer,
      showHelp,
    }),
    [morphToCustom, morphToPlayer, showHelp],
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
    }),
    [],
  );

  const PlayerAddRuleAction: React.FC<ActionWithRulesAndAddersProps> =
    useCallback(
      (props) => {
        if (props.path.length > 0) {
          return (
            <ActionElement
              className={props.className}
              handleOnClick={props.handleOnClick}
              label={props.label}
              title={props.title}
              disabled={props.disabled || disabled}
              disabledTranslation={props.disabledTranslation}
              testID={props.testID}
              ruleOrGroup={props.ruleOrGroup}
              schema={props.schema}
              path={props.path}
              level={props.level}
              context={props.context}
              validation={props.validation}
            />
          );
        }
        return (
          <ButtonGroup size="sm" className={props.className}>
            <ActionElement
              handleOnClick={props.handleOnClick}
              label={props.label}
              title={props.title}
              disabled={props.disabled || disabled}
              disabledTranslation={props.disabledTranslation}
              testID={props.testID}
              ruleOrGroup={props.ruleOrGroup}
              schema={props.schema}
              path={props.path}
              level={props.level}
              context={props.context}
              validation={props.validation}
            />
            <Button
              variant="outline-secondary"
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
              variant="outline-secondary"
              title="Add LIMIT"
              disabled={props.disabled || disabled}
              onClick={(e) => {
                e.preventDefault();
                addLimitClause();
              }}
            >
              + Limit
            </Button>
          </ButtonGroup>
        );
      },
      [addLimitClause, addSortRow, disabled],
    );

  const rootClassName = [styles.root, className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName || undefined}>
      <PlayerQbUiContext.Provider value={playerQbUiValue}>
        <QueryBuilder
          fields={playerLeaderboardQueryBuilderFields}
          context={qbContext}
          controlElements={{
            fieldSelector: PlayerLeaderboardCascadingFieldSelector,
            operatorSelector: PlayerQbOperatorSelector,
            valueEditor: PlayerQbValueEditor,
            addRuleAction: PlayerAddRuleAction,
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
          className="d-flex flex-wrap align-items-center mb-1 border rounded px-2 py-1"
        >
          <SortFieldCascadingSelector
            expression={row.expression}
            disabled={disabled}
            contextSlices={playerLeaderboardCascadingFieldSlices}
            onExpressionChange={(fieldName) =>
              updateSortRow(row.id, { expression: fieldName })
            }
          />
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
