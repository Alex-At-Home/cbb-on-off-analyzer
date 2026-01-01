// React imports:
import React, { useState, useEffect, useMemo } from "react";

// Lodash:
import _ from "lodash";

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
  // Calculate defaults based on presets and params
  const getDefaults = useMemo(() => {
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
    const defaultBasePhrase = presetFilterPhrase || (isDefaultPreset ? "" : "");
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
    // Clear to only preset defaults (assumes params are blank)
    const defaults = getDefaults;
    setBaseState(defaults.base);
    setSplitStates(defaults.splits);
  };

  const handleSave = () => {
    const defaults = getDefaults;

    // Only save non-default values (save "" if it matches default)
    const basePhrase =
      baseState.phrase === defaults.base.phrase ? "" : baseState.phrase;
    const baseText =
      baseState.text === defaults.base.text ? "" : baseState.text;

    const splitPhrases: string[] = [];
    const splitText: string[] = [];

    splitStates.forEach((split, i) => {
      const defaultPhrase = defaults.splits[i]?.phrase || "";
      const defaultText = defaults.splits[i]?.text || "";

      splitPhrases.push(split.phrase === defaultPhrase ? "" : split.phrase);
      splitText.push(split.text === defaultText ? "" : split.text);
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

  // Get row label
  const getRowLabel = (index: number): string => {
    if (index === -1) return "Base";

    let splitIndex = 0;
    if (rowConfig.hasOnA) {
      if (splitIndex === index) return "On ('A')";
      splitIndex++;
    }
    if (rowConfig.hasOffB) {
      if (splitIndex === index) return "Off ('B')";
      splitIndex++;
    }
    // Extra queries: C, D, E, etc.
    const extraIndex = index - splitIndex;
    return String.fromCharCode(67 + extraIndex); // 'C', 'D', 'E', ...
  };

  // Render a single row
  const renderRow = (
    label: string,
    state: RowState,
    onChange: (newState: RowState) => void
  ) => (
    <Form.Group as={Row} className="mb-2" key={label}>
      <Form.Label column xs={2} className="text-end">
        <strong>{label}</strong>
      </Form.Label>
      <Col xs={7}>
        <Form.Control
          as="textarea"
          rows={1}
          value={state.text}
          placeholder="Row display text..."
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
          {renderRow("Base", baseState, setBaseState)}

          {/* Split rows */}
          {splitStates.map((split, index) =>
            renderRow(getRowLabel(index), split, (newState) => {
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

