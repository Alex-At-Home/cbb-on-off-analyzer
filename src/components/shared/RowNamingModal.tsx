// React imports:
import React, { useState, useEffect, useMemo } from "react";

// Bootstrap imports:
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Utils
import { GameFilterParams, ParamDefaults } from "../../utils/FilterModels";
import { FilterPresetUtils } from "../../utils/FilterPresetUtils";
import { TableDisplayUtils } from "../../utils/tables/TableDisplayUtils";
import { OnOffBaselineOtherEnum } from "../../utils/StatModels";

/** Represents which query rows are visible */
export type RowNamingConfig = {
  /** Always true - baseline is always shown */
  hasBase: true;
  /** True if on/A query is populated */
  hasOnA: boolean;
  /** True if off/B is populated OR if on/A is populated and auto-on-off mode is enabled */
  hasOffB: boolean;
  /** Number of extra queries (C, D, etc) */
  numExtraQueries: number;
};

type Props = {
  show: boolean;
  onHide: () => void;
  onSave: (params: {
    baseText?: string;
    basePhrase?: string;
    splitText?: string[];
    splitPhrases?: string[];
  }) => void;
  /** Current params to read existing values */
  params: GameFilterParams;
  /** Which rows are visible */
  rowConfig: RowNamingConfig;
};

type RowState = {
  text: string;
  phrase: string;
};

const RowNamingModal: React.FunctionComponent<Props> = ({
  show,
  onHide,
  onSave,
  params,
  rowConfig,
}) => {
  // Calculate defaults based on presets only (ignoring params)
  const getPresetDefaults = useMemo(() => {
    const presetMode = params.presetMode || ParamDefaults.defaultPresetMode;
    const presetSplit = params.presetSplit || ParamDefaults.defaultPresetSplit;

    // Get preset phrases for splits (A, B, C, D, etc)
    const presetSplitPhrases =
      FilterPresetUtils.getPresetPhrase(presetSplit) || [];
    // Get preset filter phrase for base
    const presetFilterPhrase =
      FilterPresetUtils.getPresetFilterPhrase(presetMode);

    // Determine base phrase/text defaults
    // If no manual baseline specified, use "Baseline stats" unless preset filter is "Season stats" (default)
    const isDefaultPreset = presetMode === ParamDefaults.defaultPresetMode;
    const defaultBasePhrase = presetFilterPhrase || "";
    const defaultBaseText = isDefaultPreset ? "Season stats" : "Baseline stats";

    // Build defaults for each row
    const defaults = {
      base: {
        phrase: defaultBasePhrase,
        text: presetFilterPhrase
          ? `Base (${presetFilterPhrase}) stats`
          : defaultBaseText,
      },
      splits: [] as RowState[],
    };

    // Total number of split rows: On/A, Off/B, and any extras
    const numSplits =
      (rowConfig.hasOnA ? 1 : 0) +
      (rowConfig.hasOffB ? 1 : 0) +
      rowConfig.numExtraQueries;

    for (let i = 0; i < numSplits; i++) {
      const presetPhrase = presetSplitPhrases[i] || "";
      defaults.splits.push({
        phrase: presetPhrase,
        text: presetPhrase ? `${presetPhrase} lineups` : "",
      });
    }

    return defaults;
  }, [params.presetMode, params.presetSplit, rowConfig]);

  // Calculate defaults taking into account param phrases (param phrase takes precedence)
  const getDefaults = useMemo(() => {
    const presetDefaults = getPresetDefaults;
    const paramBasePhrase = params.basePhrase || "";
    const paramSplitPhrases = params.splitPhrases || [];

    // Base: use param phrase if set, else preset phrase
    const effectiveBasePhrase = paramBasePhrase || presetDefaults.base.phrase;
    const baseText = effectiveBasePhrase
      ? `Base (${effectiveBasePhrase}) stats`
      : presetDefaults.base.text;

    const defaults = {
      base: {
        phrase: effectiveBasePhrase,
        text: baseText,
      },
      splits: [] as RowState[],
    };

    // Splits: param phrase takes precedence over preset phrase
    for (let i = 0; i < presetDefaults.splits.length; i++) {
      const paramPhrase = paramSplitPhrases[i] || "";
      const presetPhrase = presetDefaults.splits[i]?.phrase || "";
      const effectivePhrase = paramPhrase || presetPhrase;

      defaults.splits.push({
        phrase: effectivePhrase,
        text: effectivePhrase ? `${effectivePhrase} lineups` : "",
      });
    }

    return defaults;
  }, [getPresetDefaults, params.basePhrase, params.splitPhrases]);

  // Get current values from params (with fallback to defaults)
  const getCurrentValues = (): { base: RowState; splits: RowState[] } => {
    const defaults = getDefaults;

    // Base values
    const basePhrase = params.basePhrase ?? "";
    const baseText = params.baseText ?? "";

    // Determine effective base values
    const effectiveBasePhrase = basePhrase || defaults.base.phrase;
    const effectiveBaseText = baseText || defaults.base.text;

    // Split values
    const splitPhrases = params.splitPhrases || [];
    const splitText = params.splitText || [];

    const splits: RowState[] = [];
    const numSplits =
      (rowConfig.hasOnA ? 1 : 0) +
      (rowConfig.hasOffB ? 1 : 0) +
      rowConfig.numExtraQueries;

    for (let i = 0; i < numSplits; i++) {
      const phraseFromParams = splitPhrases[i] ?? "";
      const textFromParams = splitText[i] ?? "";

      // If param has value, use it; otherwise fall back to default
      const effectivePhrase = phraseFromParams || defaults.splits[i]?.phrase || "";
      const effectiveText = textFromParams || defaults.splits[i]?.text || "";

      splits.push({
        phrase: effectivePhrase,
        text: effectiveText,
      });
    }

    return {
      base: { phrase: effectiveBasePhrase, text: effectiveBaseText },
      splits,
    };
  };

  // State for each row
  const [baseState, setBaseState] = useState<RowState>({ phrase: "", text: "" });
  const [splitStates, setSplitStates] = useState<RowState[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      const current = getCurrentValues();
      setBaseState(current.base);
      setSplitStates(current.splits);
    }
  }, [show, params, rowConfig]);

  // Handlers
  const handleReset = () => {
    const current = getCurrentValues();
    setBaseState(current.base);
    setSplitStates(current.splits);
  };

  const handleClear = () => {
    // Clear to only preset defaults (ignoring param phrases)
    const defaults = getPresetDefaults;
    setBaseState(defaults.base);
    setSplitStates(defaults.splits);
  };

  const handleSave = () => {
    // Compare against PRESET-ONLY defaults (not param-augmented)
    // This ensures values don't get cleared on subsequent saves
    const defaults = getPresetDefaults;

    // Calculate what the default text would be based on current phrase input
    const effectiveBasePhrase = baseState.phrase || defaults.base.phrase;
    const expectedBaseText = effectiveBasePhrase
      ? `Base (${effectiveBasePhrase}) stats`
      : defaults.base.text;

    // Only save non-default values (save "" if it matches default)
    const basePhrase =
      baseState.phrase === defaults.base.phrase ? "" : baseState.phrase;
    const baseText =
      baseState.text === expectedBaseText ? "" : baseState.text;

    const splitPhrases: string[] = [];
    const splitText: string[] = [];

    splitStates.forEach((split, i) => {
      const defaultPhrase = defaults.splits[i]?.phrase || "";
      const effectivePhrase = split.phrase || defaultPhrase;
      const expectedText = effectivePhrase ? `${effectivePhrase} lineups` : "";

      splitPhrases.push(split.phrase === defaultPhrase ? "" : split.phrase);
      splitText.push(split.text === expectedText ? "" : split.text);
    });

    // Only include arrays if they have non-empty values
    const hasNonEmptySplitPhrases = splitPhrases.some((p) => p !== "");
    const hasNonEmptySplitText = splitText.some((t) => t !== "");

    onSave({
      basePhrase: basePhrase || undefined,
      baseText: baseText || undefined,
      splitPhrases: hasNonEmptySplitPhrases ? splitPhrases : undefined,
      splitText: hasNonEmptySplitText ? splitText : undefined,
    });
    onHide();
  };

  // Get row label and query type
  const getRowInfo = (
    index: number
  ): { label: string; queryType: OnOffBaselineOtherEnum; otherIndex?: number } => {
    if (index === -1) return { label: "Base", queryType: "baseline" };

    let splitIndex = 0;
    if (rowConfig.hasOnA) {
      if (splitIndex === index) return { label: "On ('A')", queryType: "on" };
      splitIndex++;
    }
    if (rowConfig.hasOffB) {
      if (splitIndex === index) return { label: "Off ('B')", queryType: "off" };
      splitIndex++;
    }
    // Extra queries: C, D, E, etc.
    const extraIndex = index - splitIndex;
    return {
      label: String.fromCharCode(67 + extraIndex), // 'C', 'D', 'E', ...
      queryType: "other",
      otherIndex: extraIndex,
    };
  };

  // Calculate the default text that would be used if display text is empty
  // This uses the CURRENT phrase input value (what user typed), with fallback to preset
  const getDefaultTextForRow = (index: number, currentPhrase: string): string => {
    if (index === -1) {
      // Base row
      const effectivePhrase = currentPhrase || getPresetDefaults.base.phrase;
      if (effectivePhrase) {
        return `Base (${effectivePhrase}) stats`;
      }
      return getPresetDefaults.base.text;
    } else {
      // Split rows
      const presetPhrase = getPresetDefaults.splits[index]?.phrase || "";
      const effectivePhrase = currentPhrase || presetPhrase;
      if (effectivePhrase) {
        return `${effectivePhrase} lineups`;
      }
      return "";
    }
  };

  // Render a single row
  const renderRow = (
    index: number,
    state: RowState,
    onChange: (newState: RowState) => void
  ) => {
    const { label, queryType, otherIndex } = getRowInfo(index);

    // Build the placeholder text based on current phrase input value
    const defaultText = getDefaultTextForRow(index, state.phrase);
    const placeholderText = defaultText
      ? `Row display text... [${defaultText}]`
      : "Row display text...";

    // Wrap the label with query info tooltip
    const labelWithQueryInfo = TableDisplayUtils.addQueryInfo(
      <strong>{label}</strong>,
      params,
      queryType,
      otherIndex
    );

    return (
      <Form.Group as={Row} className="mb-2" key={label}>
        <Form.Label column xs={2} className="text-end">
          {labelWithQueryInfo}
        </Form.Label>
        <Col xs={7}>
          <Form.Control
            as="textarea"
            rows={1}
            value={state.text}
            placeholder={placeholderText}
            onChange={(e) => onChange({ ...state, text: e.target.value })}
          />
        </Col>
        <Col xs={3}>
          <Form.Control
            type="text"
            value={state.phrase}
            placeholder="Phrase..."
            onChange={(e) => onChange({ ...state, phrase: e.target.value })}
          />
        </Col>
      </Form.Group>
    );
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      onEntered={() => {
        document.body.style.overflow = "scroll";
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title>Configure Row Names</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          {/* Header row */}
          <Form.Group as={Row} className="mb-2">
            <Form.Label column xs={2} className="text-end">
              <strong>Row</strong>
            </Form.Label>
            <Col xs={7}>
              <Form.Label>
                <strong>Display Text</strong>
              </Form.Label>
            </Col>
            <Col xs={3}>
              <Form.Label>
                <strong>Phrase</strong>
              </Form.Label>
            </Col>
          </Form.Group>

          {/* Base row */}
          {renderRow(-1, baseState, setBaseState)}

          {/* Split rows */}
          {splitStates.map((split, index) =>
            renderRow(index, split, (newState) => {
              setSplitStates((prev) => {
                const updated = [...prev];
                updated[index] = newState;
                return updated;
              });
            })
          )}
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="warning" onClick={handleClear}>
          Clear
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset
        </Button>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RowNamingModal;

