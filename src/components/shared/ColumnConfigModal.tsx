// React imports:
import React, { useState, useEffect, useMemo } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";

// Icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowAltCircleUp,
  faArrowAltCircleDown,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

import { GenericTableColProps } from "../GenericTable";
import styles from "./ColumnConfigModal.module.css";

/** Serializable config that can be used to reconstruct column layout */
export type TableColumnConfig = {
  /** Array of column keys: either "colKey" for tableFields, or "setName.colKey" for extraColSets */
  newCol: Array<string>;
};

type ColumnEntry = {
  key: string; // The key in tableFields or "setName.colKey" for extra columns
  displayKey: string; // Display key (e.g., "Separator 1" for separators)
  colProps: GenericTableColProps;
  enabled: boolean;
  isFromExtraSet: boolean;
  extraSetName?: string;
};

type Props = {
  show: boolean;
  onHide: () => void;
  onSave: (config: TableColumnConfig) => void;
  tableFields: Record<string, GenericTableColProps>;
  extraColSets?: Record<string, Record<string, GenericTableColProps>>;
  currentConfig?: TableColumnConfig;
};

const ColumnConfigModal: React.FunctionComponent<Props> = ({
  show,
  onHide,
  onSave,
  tableFields,
  extraColSets,
  currentConfig,
}) => {
  // Build the initial column list from tableFields (excluding titles)
  const buildInitialColumns = (): ColumnEntry[] => {
    let separatorCount = 0;
    const entries: ColumnEntry[] = [];

    Object.entries(tableFields).forEach(([key, colProps]) => {
      // Skip title columns
      if (colProps.isTitle) return;

      const isSeparator = colProps.colName === "" && colProps.toolTip === "";
      if (isSeparator) {
        separatorCount++;
      }

      entries.push({
        key,
        displayKey: isSeparator ? `Separator ${separatorCount}` : key,
        colProps,
        enabled: true,
        isFromExtraSet: false,
      });
    });

    return entries;
  };

  // Build columns from a saved config
  const buildColumnsFromConfig = (config: TableColumnConfig): ColumnEntry[] => {
    let separatorCount = 0;
    const entries: ColumnEntry[] = [];
    const usedKeys = new Set(config.newCol);

    // First, add columns from config in order
    config.newCol.forEach((colKey) => {
      if (colKey.includes(".")) {
        // Extra column set
        const [setName, actualKey] = colKey.split(".", 2);
        const colProps = extraColSets?.[setName]?.[actualKey];
        if (colProps) {
          const isSeparator = colProps.colName === "" && colProps.toolTip === "";
          if (isSeparator) separatorCount++;

          entries.push({
            key: colKey,
            displayKey: isSeparator ? `Separator ${separatorCount}` : actualKey,
            colProps,
            enabled: true,
            isFromExtraSet: true,
            extraSetName: setName,
          });
        }
      } else {
        // Regular tableFields column
        const colProps = tableFields[colKey];
        if (colProps && !colProps.isTitle) {
          const isSeparator = colProps.colName === "" && colProps.toolTip === "";
          if (isSeparator) separatorCount++;

          entries.push({
            key: colKey,
            displayKey: isSeparator ? `Separator ${separatorCount}` : colKey,
            colProps,
            enabled: true,
            isFromExtraSet: false,
          });
        }
      }
    });

    // Then add any columns from tableFields that weren't in config (as disabled)
    Object.entries(tableFields).forEach(([key, colProps]) => {
      if (colProps.isTitle) return;
      if (usedKeys.has(key)) return;

      const isSeparator = colProps.colName === "" && colProps.toolTip === "";
      if (isSeparator) separatorCount++;

      entries.push({
        key,
        displayKey: isSeparator ? `Separator ${separatorCount}` : key,
        colProps,
        enabled: false,
        isFromExtraSet: false,
      });
    });

    return entries;
  };

  const initialColumns = useMemo(() => {
    if (currentConfig && currentConfig.newCol.length > 0) {
      return buildColumnsFromConfig(currentConfig);
    }
    return buildInitialColumns();
  }, [tableFields, extraColSets, currentConfig]);

  const [columns, setColumns] = useState<ColumnEntry[]>(initialColumns);
  const [selectedExtraSet, setSelectedExtraSet] = useState<string | null>(null);

  // Reset when modal opens with new data
  useEffect(() => {
    if (show) {
      if (currentConfig && currentConfig.newCol.length > 0) {
        setColumns(buildColumnsFromConfig(currentConfig));
      } else {
        setColumns(buildInitialColumns());
      }
    }
  }, [show, tableFields, extraColSets, currentConfig]);

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newColumns = [...columns];
    [newColumns[index - 1], newColumns[index]] = [
      newColumns[index],
      newColumns[index - 1],
    ];
    setColumns(newColumns);
  };

  const handleMoveDown = (index: number) => {
    if (index >= columns.length - 1) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[index + 1]] = [
      newColumns[index + 1],
      newColumns[index],
    ];
    setColumns(newColumns);
  };

  const handleToggleEnabled = (index: number) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], enabled: !newColumns[index].enabled };
    setColumns(newColumns);
  };

  const handleRemoveExtraColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    setColumns(newColumns);
  };

  const handleAddExtraColumn = (setName: string, colKey: string) => {
    const colProps = extraColSets?.[setName]?.[colKey];
    if (!colProps) return;

    const fullKey = `${setName}.${colKey}`;
    // Check if already added
    if (columns.some((c) => c.key === fullKey)) return;

    const isSeparator = colProps.colName === "" && colProps.toolTip === "";
    const separatorCount = isSeparator
      ? columns.filter(
          (c) => c.colProps.colName === "" && c.colProps.toolTip === ""
        ).length + 1
      : 0;

    setColumns([
      ...columns,
      {
        key: fullKey,
        displayKey: isSeparator ? `Separator ${separatorCount}` : colKey,
        colProps,
        enabled: true,
        isFromExtraSet: true,
        extraSetName: setName,
      },
    ]);
  };

  const handleReset = () => {
    setColumns(buildInitialColumns());
    setSelectedExtraSet(null);
  };

  const handleSave = () => {
    const config: TableColumnConfig = {
      newCol: columns.filter((c) => c.enabled).map((c) => c.key),
    };
    onSave(config);
    onHide();
  };

  // Extract text from React nodes, handling nested elements
  const extractTextFromNode = (node: React.ReactNode): string => {
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (!node) return "";
    if (Array.isArray(node)) return node.map(extractTextFromNode).join("");
    if (React.isValidElement(node)) {
      const children = node.props?.children;
      return extractTextFromNode(children);
    }
    return "";
  };

  const getColumnDisplayName = (entry: ColumnEntry): string => {
    const { colProps, displayKey, isFromExtraSet, extraSetName } = entry;
    const isSeparator = colProps.colName === "" && colProps.toolTip === "";

    if (isSeparator) {
      return displayKey;
    }

    let name: string;
    if (typeof colProps.colName === "string") {
      name = colProps.colName;
    } else {
      // Extract text from React element and replace line separators
      const extractedText = extractTextFromNode(colProps.colName);
      // Replace common line separator patterns with " | "
      name = extractedText.replace(/\s*\n\s*/g, " | ").trim() || displayKey;
    }

    if (isFromExtraSet && extraSetName) {
      return `${name} (${extraSetName})`;
    }

    return name;
  };

  const extraSetNames = Object.keys(extraColSets || {});

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
        <Modal.Title>Configure Columns</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Column List */}
        <div className={styles.columnList}>
          {/* Header row */}
          <div className={styles.headerRow}>
            <div className={styles.headerSpacer1}></div>
            <div className={styles.headerSpacer2}></div>
            <div className={styles.headerName}>Name</div>
            <div className={styles.headerDescription}>Description</div>
            <div className={styles.headerDeleteSpacer}></div>
          </div>
          {columns.map((entry, index) => {
            const isSeparator =
              entry.colProps.colName === "" && entry.colProps.toolTip === "";

            return (
              <div
                key={entry.key + index}
                className={`${styles.columnRow} ${!entry.enabled ? styles.columnRowDisabled : ""}`}
              >
                {/* Move buttons */}
                <div className={styles.moveButtons}>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    style={{ padding: "2px 6px" }}
                  >
                    <FontAwesomeIcon icon={faArrowAltCircleUp} size="sm" />
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={index === columns.length - 1}
                    onClick={() => handleMoveDown(index)}
                    style={{ padding: "2px 6px" }}
                  >
                    <FontAwesomeIcon icon={faArrowAltCircleDown} size="sm" />
                  </Button>
                </div>

                {/* Checkbox */}
                <div className={styles.checkboxCell}>
                  <Form.Check
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={() => handleToggleEnabled(index)}
                  />
                </div>

                {/* Column name */}
                <div
                  className={`${styles.nameCell} ${isSeparator ? styles.separatorName : ""}`}
                >
                  {getColumnDisplayName(entry)}
                </div>

                {/* Tooltip/Description */}
                <div className={styles.descriptionCell}>
                  {entry.colProps.toolTip}
                </div>

                {/* Delete button for extra columns */}
                <div className={styles.deleteCell}>
                  {entry.isFromExtraSet && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRemoveExtraColumn(index)}
                      style={{ padding: "2px 6px" }}
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Extra Column Sets */}
        {extraSetNames.length > 0 && (
          <div className={styles.extraSetsSection}>
            <Form.Label className={styles.extraSetsLabel}>
              Add columns from:
            </Form.Label>
            <div className={styles.extraSetsDropdowns}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" size="sm">
                  {selectedExtraSet || "Select column set..."}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {extraSetNames.map((setName) => (
                    <Dropdown.Item
                      key={setName}
                      onClick={() => setSelectedExtraSet(setName)}
                    >
                      {setName}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {selectedExtraSet && extraColSets?.[selectedExtraSet] && (
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    <FontAwesomeIcon icon={faPlus} /> Add column
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                  >
                    {Object.entries(extraColSets[selectedExtraSet])
                      .filter(([_, colProps]) => !colProps.isTitle)
                      .map(([colKey, colProps]) => {
                        const fullKey = `${selectedExtraSet}.${colKey}`;
                        const alreadyAdded = columns.some(
                          (c) => c.key === fullKey
                        );
                        const isSeparator =
                          colProps.colName === "" && colProps.toolTip === "";
                        const displayName = isSeparator
                          ? "Separator"
                          : typeof colProps.colName === "string"
                          ? colProps.colName
                          : colKey;

                        return (
                          <Dropdown.Item
                            key={colKey}
                            disabled={alreadyAdded}
                            onClick={() =>
                              handleAddExtraColumn(selectedExtraSet, colKey)
                            }
                          >
                            {displayName}
                            {alreadyAdded && (
                              <small className="text-muted"> (added)</small>
                            )}
                          </Dropdown.Item>
                        );
                      })}
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
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

export default ColumnConfigModal;

