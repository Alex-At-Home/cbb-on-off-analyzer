/**
 * Combines AsyncFormControl and PlayerSelector: edits a semicolon-separated
 * string in the format code[=$option]; with optional - prefix for NOT.
 * Toggles between selector UI (nuggets + dropdown) and raw text mode.
 */

import React, { useState, useMemo } from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
// @ts-ignore
import { components, createFilter } from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";

import ThemedSelect from "./ThemedSelect";
import AsyncFormControl from "./AsyncFormControl";

// --- Types ---

export type PlayerOptionFilterItem = {
  name: string;
  dropdownText?: string;
  code: string;
  allowedOptions: string[];
};

export type PlayerOptionFilterToken = {
  negated: boolean;
  code: string;
  option?: string;
};

export type ParseResult = {
  valid: boolean;
  tokens: PlayerOptionFilterToken[];
};

type SelectOption = { label: string; value: string };

const SWITCH_TO_TEXT_VALUE = "__switch_to_text__";
const TOKEN_REGEX = /^(-?)([^=]+)(=(.+))?$/;

// --- Display name: "Last, First" -> "First Last" ---

export function formatDisplayName(name: string): string {
  if (name.includes(", ")) {
    const parts = name.split(", ");
    return parts.length >= 2
      ? [...parts.slice(1), parts[0]].join(" ").trim()
      : name;
  }
  return name;
}

// --- Parser ---

export function parseCodeOptionString(
  value: string,
  items: PlayerOptionFilterItem[],
): ParseResult {
  const itemByCode = _.keyBy(items || [], "code");

  const rawTokens = (value || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const tokens: PlayerOptionFilterToken[] = [];
  let valid = true;

  for (const raw of rawTokens) {
    const m = raw.match(TOKEN_REGEX);
    if (!m) {
      valid = false;
      break;
    }
    const negated = m[1] === "-";
    const code = m[2].trim();
    const optionPart = m[4] !== undefined ? m[4].trim() : undefined;

    if (!code) {
      valid = false;
      break;
    }
    const item = itemByCode[code];
    const allowed = item?.allowedOptions ?? [];
    if (
      optionPart !== undefined &&
      item != null &&
      !allowed.includes(optionPart)
    ) {
      valid = false;
      break;
    }
    tokens.push({
      negated,
      code,
      option: optionPart === "" ? undefined : optionPart,
    });
  }

  return {
    valid,
    tokens: valid ? tokens : [],
  };
}

function tokenToValue(t: PlayerOptionFilterToken): string {
  const prefix = t.negated ? "-" : "";
  if (t.option !== undefined && t.option !== "") {
    return `${prefix}${t.code}=${t.option}`;
  }
  return `${prefix}${t.code}`;
}

function tokensToValue(tokens: PlayerOptionFilterToken[]): string {
  return tokens.map(tokenToValue).join(";");
}

// --- Build select options from items ---

function buildSelectOptions(items: PlayerOptionFilterItem[]): SelectOption[] {
  const switchOption: SelectOption = {
    value: SWITCH_TO_TEXT_VALUE,
    label: "Switch to text...",
  };
  const list: SelectOption[] = [switchOption];

  for (const item of items || []) {
    const dropdownLabel = item.dropdownText ?? item.name;
    const opts = item.allowedOptions ?? [];
    const optionSet = new Set(opts);
    if (!optionSet.has("")) {
      optionSet.add("");
    }
    const optionsList = Array.from(optionSet);
    for (const opt of optionsList) {
      const label = opt === "" ? dropdownLabel : `${dropdownLabel} [${opt}]`;
      const value = opt === "" ? item.code : `${item.code}=${opt}`;
      list.push({ label, value });
      list.push({ label: `NOT ${label}`, value: `-${value}` });
    }
  }

  return list;
}

// --- Map token to option value string (for react-select value) ---

function tokenToOptionValue(t: PlayerOptionFilterToken): string {
  return tokenToValue(t);
}

function optionValueToToken(
  valueStr: string,
  items: PlayerOptionFilterItem[],
): PlayerOptionFilterToken | null {
  const parsed = parseCodeOptionString(valueStr, items);
  if (!parsed.valid || parsed.tokens.length !== 1) return null;
  return parsed.tokens[0] ?? null;
}

// --- Component props ---

type Props = {
  value: string;
  onChange: (s: string) => void;
  items: PlayerOptionFilterItem[];
  placeholder?: string;
  timeout?: number;
  emptyLabel?: string;
  size?: "sm" | "lg";
  className?: string;
};

const DEFAULT_PLACEHOLDER = "e.g. Code1,Code2=PG,-Code3";
const DEFAULT_EMPTY_LABEL = "Select…";

const PlayerOptionFilterControl: React.FunctionComponent<Props> = ({
  value,
  onChange,
  items,
  placeholder = DEFAULT_PLACEHOLDER,
  timeout = 500,
  emptyLabel = DEFAULT_EMPTY_LABEL,
  size = "sm",
  className,
}) => {
  const [isTextMode, setIsTextMode] = useState(false);

  const parsed = useMemo(
    () => parseCodeOptionString(value, items),
    [value, items],
  );

  const showSelector = !isTextMode && parsed.valid;

  const selectOptions = useMemo(() => {
    const all = buildSelectOptions(items);
    if (!parsed.valid || parsed.tokens.length === 0) return all;
    const excludeOpposite = new Set(
      parsed.tokens.map((t) => tokenToValue({ ...t, negated: !t.negated })),
    );
    return all.filter(
      (o) => o.value === SWITCH_TO_TEXT_VALUE || !excludeOpposite.has(o.value),
    );
  }, [items, parsed.valid, parsed.tokens]);

  const selectValue = useMemo(() => {
    if (!parsed.valid || parsed.tokens.length === 0) {
      return null;
    }
    const options: SelectOption[] = parsed.tokens.map((t) => {
      const val = tokenToOptionValue(t);
      const opt = selectOptions.find((o) => o.value === val);
      if (opt) return opt;
      const item = _.find(items, (i) => i.code === t.code);
      const displayName = item ? item.name : t.code;
      const label =
        t.option != null && t.option !== ""
          ? `${displayName} [${t.option}]`
          : displayName;
      return {
        value: val,
        label: t.negated ? `NOT ${label}` : label,
      };
    });
    return options;
  }, [parsed.valid, parsed.tokens, items, selectOptions]);

  const handleSelectChange = (selected: SelectOption[] | null) => {
    const arr = selected ?? [];
    const hasSwitch = arr.some((o) => o?.value === SWITCH_TO_TEXT_VALUE);
    if (hasSwitch) {
      setIsTextMode(true);
      return;
    }
    const values = arr
      .map((o) => o?.value)
      .filter(
        (v): v is string => typeof v === "string" && v !== SWITCH_TO_TEXT_VALUE,
      );
    const tokens: PlayerOptionFilterToken[] = [];
    for (const v of values) {
      const t = optionValueToToken(v, items);
      if (t) tokens.push(t);
    }
    onChange(tokensToValue(tokens));
  };

  const MultiValueLabelNugget = (props: any) => {
    const { data, selectProps, innerProps } = props;
    const optionItems = selectProps.items ?? [];
    const t = optionValueToToken(data.value, optionItems);
    const item = t ? _.find(optionItems, (i) => i.code === t.code) : null;
    const displayName = item ? item.name : (t?.code ?? data.label);
    const label =
      t && t.option != null && t.option !== ""
        ? `${displayName} [${t.option}]`
        : displayName;
    const isNegated = t?.negated ?? false;
    return (
      <div {...innerProps}>
        {isNegated && (
          <>
            <FontAwesomeIcon icon={faBan} />{" "}
          </>
        )}
        {label}
      </div>
    );
  };

  const getMultiValueStyles = (base: any, props: any) => {
    const optionItems = props.selectProps?.items ?? [];
    const t = optionValueToToken(props.data?.value, optionItems);
    const isNegated = t?.negated ?? false;
    return {
      ...base,
      backgroundColor: isNegated ? "#1a015aff" : "grey",
    };
  };

  const getMultiValueLabelStyles = (base: any, props: any) => {
    const optionItems = props.selectProps?.items ?? [];
    const t = optionValueToToken(props.data?.value, optionItems);
    const isNegated = t?.negated ?? false;
    return {
      ...base,
      fontSize: "85%",
      color: isNegated ? "lightgrey" : base.color,
      fontWeight: isNegated ? 100 : base.fontWeight,
    };
  };

  if (showSelector) {
    return (
      <ThemedSelect
        isClearable
        isMulti
        size={size}
        className={className}
        style={{ minWidth: 0 }}
        items={items}
        styles={{
          menu: (base: any) => ({ ...base, zIndex: 1000 }),
          multiValue: getMultiValueStyles,
          multiValueLabel: getMultiValueLabelStyles,
          option: (base: any) => ({ ...base, textAlign: "left" }),
        }}
        components={{ MultiValueLabel: MultiValueLabelNugget }}
        value={selectValue}
        placeholder={emptyLabel}
        options={selectOptions}
        filterOption={createFilter({
          ignoreCase: true,
          ignoreAccents: true,
          matchFrom: "any",
          trim: true,
          stringify: (option: any) =>
            option.value === SWITCH_TO_TEXT_VALUE
              ? option.label
              : `${option.value} ${option.label}`,
        })}
        onChange={(selected: SelectOption[] | null) =>
          handleSelectChange(selected)
        }
      />
    );
  }

  const switchBackTooltip = (
    <Tooltip id="player-option-filter-switch-back">
      Switch back to dropdown mode
      {!parsed.valid && (
        <>
          <br />
          <br />
          Current filter expression cannot be rendered as dropdown, you have to
          delete it to return to dropdown mode.
        </>
      )}
    </Tooltip>
  );

  return (
    <InputGroup
      size={size}
      className={className}
      style={{ minWidth: 0, flexWrap: "nowrap" }}
    >
      <AsyncFormControl
        startingVal={value}
        onChange={onChange}
        timeout={timeout}
        placeholder={placeholder}
        allowExternalChange
        size={size}
      />
      <InputGroup.Append>
        <OverlayTrigger placement="auto" overlay={switchBackTooltip}>
          <Button
            variant="outline-secondary"
            onClick={() => setIsTextMode(false)}
            style={{
              width: 36,
              height: size === "sm" ? 31 : 38,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </Button>
        </OverlayTrigger>
      </InputGroup.Append>
    </InputGroup>
  );
};

export default PlayerOptionFilterControl;
