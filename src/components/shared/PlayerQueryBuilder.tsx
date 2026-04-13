import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Form } from "react-bootstrap";
import type { FieldSelectorProps, RuleGroupType } from "react-querybuilder";
import { QueryBuilder, ValueSelector } from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import {
  findSliceIdForFieldName,
  playerLeaderboardCascadingFieldSlices,
  playerLeaderboardFlatRqbFields,
  type PlayerQueryCascadingSlice,
} from "../../utils/queryBuilder/playerLeaderboard";
import {
  linqToQuery,
  PLAYER_LEADERBOARD_RQB_OPERATORS,
  queryToLinq,
  splitPlayerLeaderboardFilterSuffix,
} from "../../utils/queryBuilder/playerLeaderboardLinqBridge";

const CASCADING_SLICES_CONTEXT_KEY = "playerFieldCascadingSlices";

export type PlayerQueryBuilderProps = {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly showHelp?: boolean;
  readonly className?: string;
};

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

const emptyQuery = (): RuleGroupType => ({
  id: "root",
  combinator: "and",
  not: false,
  rules: [],
});

const PlayerQueryBuilder: React.FC<PlayerQueryBuilderProps> = ({
  value,
  onChange,
  showHelp: _showHelp,
  className,
}) => {
  const [query, setQuery] = useState<RuleGroupType>(emptyQuery);
  const [parseWarning, setParseWarning] = useState(false);
  const filterSuffixRef = useRef("");
  const skipNextExternalSync = useRef(false);

  const applyCommittedValue = useCallback((committed: string) => {
    const { core, suffix } = splitPlayerLeaderboardFilterSuffix(committed);
    filterSuffixRef.current = suffix;
    const parsed = linqToQuery(core);
    if (parsed === null && core.length > 0) {
      setParseWarning(true);
      return;
    }
    setParseWarning(false);
    setQuery(parsed ?? emptyQuery());
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
      const body = queryToLinq(nextQuery);
      const suf = filterSuffixRef.current;
      const spacer = body && suf ? " " : "";
      const next = `${body}${spacer}${suf}`;
      skipNextExternalSync.current = true;
      onChange(next);
    },
    [onChange],
  );

  const qbContext = React.useMemo(
    () => ({
      [CASCADING_SLICES_CONTEXT_KEY]: playerLeaderboardCascadingFieldSlices,
    }),
    [],
  );

  return (
    <div className={className}>
      {parseWarning ? (
        <Alert variant="warning" className="py-2 mb-2 small">
          Visual query builder could not parse the current Linq filter; it is
          unchanged until the filter matches a supported shape (see docs) or you
          clear it.
        </Alert>
      ) : null}
      <QueryBuilder
        fields={playerLeaderboardFlatRqbFields}
        context={qbContext}
        controlElements={{
          fieldSelector: PlayerLeaderboardCascadingFieldSelector,
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
        controlClassnames={{ queryBuilder: "player-query-builder" }}
      />
    </div>
  );
};

export default PlayerQueryBuilder;
