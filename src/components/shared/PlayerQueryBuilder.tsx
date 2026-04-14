import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, ButtonGroup, Form } from "react-bootstrap";
import type {
  ActionWithRulesAndAddersProps,
  FieldSelectorProps,
  RuleGroupType,
} from "react-querybuilder";
import { ActionElement, QueryBuilder, ValueSelector } from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import { AdvancedFilterUtils } from "../../utils/AdvancedFilterUtils";
import {
  findSliceIdForFieldName,
  playerLeaderboardCascadingFieldSlices,
  playerLeaderboardFlatRqbFields,
  type PlayerQueryCascadingSlice,
} from "../../utils/queryBuilder/playerLeaderboard";
import {
  composePlayerLeaderboardFilterString,
  linqToQuery,
  newSortRowId,
  parsePlayerLeaderboardFilterParts,
  PLAYER_LEADERBOARD_RQB_OPERATORS,
  queryToLinq,
  type PlayerLeaderboardSortRow,
} from "../../utils/queryBuilder/playerLeaderboardLinqBridge";
import LinqExpressionBuilder from "./LinqExpressionBuilder";

const CASCADING_SLICES_CONTEXT_KEY = "playerFieldCascadingSlices";

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

type BuilderMode = "structured" | "custom";

/** Two-step field UI: group, then field within that group (not one giant optgroup list). */
const PlayerLeaderboardCascadingFieldSelector: React.FC<FieldSelectorProps> = (
  props,
) => {
  const slices = props.context?.[CASCADING_SLICES_CONTEXT_KEY] as
    | PlayerQueryCascadingSlice[]
    | undefined;
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
      className={`d-flex flex-wrap align-items-center ${props.className || ""}`}
    >
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
  const [builderMode, setBuilderMode] = useState<BuilderMode>("structured");
  const [customWhere, setCustomWhere] = useState("");
  const [sortRows, setSortRows] = useState<PlayerLeaderboardSortRow[]>([]);
  const [limitN, setLimitN] = useState<number | null>(null);
  const [structuredSwitchError, setStructuredSwitchError] = useState(false);
  const skipNextExternalSync = useRef(false);

  const queryRef = useRef(query);
  const customWhereRef = useRef(customWhere);
  const builderModeRef = useRef(builderMode);
  const sortRowsRef = useRef(sortRows);
  const limitNRef = useRef(limitN);
  queryRef.current = query;
  customWhereRef.current = customWhere;
  builderModeRef.current = builderMode;
  sortRowsRef.current = sortRows;
  limitNRef.current = limitN;

  const emitComposed = useCallback(
    (opts: {
      nextQuery?: RuleGroupType;
      nextCustomWhere?: string;
      nextMode?: BuilderMode;
      nextSortRows?: PlayerLeaderboardSortRow[];
      nextLimit?: number | null;
    }) => {
      const q = opts.nextQuery ?? queryRef.current;
      const mode = opts.nextMode ?? builderModeRef.current;
      const sorts = opts.nextSortRows ?? sortRowsRef.current;
      const lim =
        opts.nextLimit !== undefined ? opts.nextLimit : limitNRef.current;
      const custom = opts.nextCustomWhere ?? customWhereRef.current;
      const whereCore =
        mode === "custom" ? custom.trim() : queryToLinq(q).trim();
      const full = composePlayerLeaderboardFilterString(whereCore, sorts, lim);
      skipNextExternalSync.current = true;
      onChange(full);
    },
    [onChange],
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
    setStructuredSwitchError(false);

    const parsed = linqToQuery(whereCore);
    if (parsed === null && whereCore.trim().length > 0) {
      setBuilderMode("custom");
      setCustomWhere(whereCore);
      customWhereRef.current = whereCore;
      setQuery(emptyQuery());
      queryRef.current = emptyQuery();
      builderModeRef.current = "custom";
      return;
    }
    setBuilderMode("structured");
    builderModeRef.current = "structured";
    setCustomWhere("");
    customWhereRef.current = "";
    const nextQuery = parsed ?? emptyQuery();
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

  const trySwitchToStructured = useCallback(() => {
    const parsed = linqToQuery(customWhereRef.current);
    if (parsed === null && customWhereRef.current.trim().length > 0) {
      setStructuredSwitchError(true);
      return;
    }
    setStructuredSwitchError(false);
    builderModeRef.current = "structured";
    setBuilderMode("structured");
    const nextQuery = parsed ?? emptyQuery();
    setQuery(nextQuery);
    queryRef.current = nextQuery;
    setCustomWhere("");
    customWhereRef.current = "";
    emitComposed({
      nextMode: "structured",
      nextQuery: nextQuery,
      nextCustomWhere: "",
    });
  }, [emitComposed]);

  const qbContext = React.useMemo(
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

  const customExprPrompt =
    "Where clause only (SORT_BY / LIMIT are configured below). Example: off_efg > 20%";

  return (
    <div className={className}>
      {builderMode === "custom" ? (
        <>
          <Alert variant="info" className="py-2 mb-2 small">
            This filter&apos;s where-clause is not supported by the visual rule
            builder. Edit it as a Linq expression, or switch back if it matches
            supported rules.
          </Alert>
          {structuredSwitchError ? (
            <Alert variant="warning" className="py-2 mb-2 small">
              This expression still cannot be represented as rules. Adjust the
              text and try again.
            </Alert>
          ) : null}
          <div className="mb-2 d-flex flex-wrap align-items-center">
            <Button
              size="sm"
              variant="outline-primary"
              disabled={disabled}
              className="mr-2 mb-1"
              onClick={trySwitchToStructured}
            >
              Use visual rule builder
            </Button>
            <ButtonGroup size="sm" className="mb-1">
              <Button
                variant="outline-secondary"
                title="Add a SORT_BY clause"
                disabled={disabled}
                onClick={addSortRow}
              >
                + Sort
              </Button>
              <Button
                variant="outline-secondary"
                title="Add LIMIT"
                disabled={disabled}
                onClick={addLimitClause}
              >
                + Limit
              </Button>
            </ButtonGroup>
          </div>
          <LinqExpressionBuilder
            prompt={customExprPrompt}
            value={customWhere}
            disabled={disabled}
            autocomplete={
              AdvancedFilterUtils.playerLboardWithTeamStatsAutocomplete
            }
            callback={(newVal: string) => {
              setCustomWhere(newVal);
              customWhereRef.current = newVal;
              emitComposed({ nextCustomWhere: newVal, nextMode: "custom" });
            }}
            showHelp={showHelp}
          />
        </>
      ) : (
        <QueryBuilder
          fields={playerLeaderboardFlatRqbFields}
          context={qbContext}
          controlElements={{
            fieldSelector: PlayerLeaderboardCascadingFieldSelector,
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
      )}

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
