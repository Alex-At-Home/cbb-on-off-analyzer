// React imports:
import React, { useState, useEffect, useMemo } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

// Drag and drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGripVertical,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

import {
  GenericTableColProps,
  ExtraColSet,
  GenericTableOps,
} from "../GenericTable";
import styles from "./ColumnConfigModal.module.css";

/** Serializable config that can be used to reconstruct column layout */
export type TableColumnConfig = {
  /** Array of column keys in order: either "colKey" for tableFields, or "setName.colKey" for extraColSets */
  newCol: Array<string>;
  /** Optional array of disabled column keys (if not present, all columns in newCol are enabled) */
  disabledCols?: Array<string>;
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
  extraColSets?: Record<string, ExtraColSet>;
  currentConfig?: TableColumnConfig;
};

// Helper to check if colProps is a separator (regular or special case)
// Defined outside component so it can be used by SortableColumnRow
const isSeparatorColFn = (colProps: GenericTableColProps): boolean => {
  // Regular separator: empty colName and empty toolTip
  if (colProps.colName === "" && colProps.toolTip === "") return true;
  // Special case separator: colName is a key in colSeparatorSpecialCases
  if (
    typeof colProps.colName === "string" &&
    colProps.colName.startsWith("__") &&
    GenericTableOps.colSeparatorSpecialCases[colProps.colName]
  ) {
    return true;
  }
  return false;
};

// Sortable row component - defined outside to prevent recreation on every render
type SortableColumnRowProps = {
  entry: ColumnEntry;
  index: number;
  onToggleEnabled: (index: number) => void;
  onRemoveExtraColumn: (index: number) => void;
  getDisplayName: (entry: ColumnEntry) => string;
  getDescription: (entry: ColumnEntry) => string;
};

const SortableColumnRow: React.FC<SortableColumnRowProps> = ({
  entry,
  index,
  onToggleEnabled,
  onRemoveExtraColumn,
  getDisplayName,
  getDescription,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSeparator = isSeparatorColFn(entry.colProps);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.columnRow} ${
        !entry.enabled ? styles.columnRowDisabled : ""
      } ${isDragging ? styles.dragging : ""}`}
    >
      {/* Switch (enabled/disabled) */}
      <div className={styles.switchCell}>
        <Form.Check
          type="switch"
          id={`column-switch-${entry.key}`}
          checked={entry.enabled}
          onChange={() => {
            onToggleEnabled(index);
          }}
        />
      </div>

      {/* Drag handle */}
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <FontAwesomeIcon icon={faGripVertical} />
      </div>

      {/* Column name - also grabbable */}
      <div
        className={`${styles.nameCell} ${styles.grabbable} ${
          isSeparator ? styles.separatorName : ""
        }`}
        {...attributes}
        {...listeners}
      >
        {getDisplayName(entry)}
      </div>

      {/* Tooltip/Description */}
      <div className={styles.descriptionCell}>
        {getDescription(entry)}
        {entry.isFromExtraSet && entry.extraSetName && (
          <span className="text-muted"> (+ from {entry.extraSetName})</span>
        )}
      </div>

      {/* Delete button for extra columns */}
      <div
        className={styles.deleteCell}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {entry.isFromExtraSet && (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onRemoveExtraColumn(index)}
            style={{ padding: "2px 6px" }}
          >
            <FontAwesomeIcon icon={faTrash} size="sm" />
          </Button>
        )}
      </div>
    </div>
  );
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

      const isSeparator = isSeparatorColFn(colProps);
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
    const disabledKeys = new Set(config.disabledCols || []);

    // First, add columns from config in order
    config.newCol.forEach((colKey) => {
      const isEnabled = !disabledKeys.has(colKey);

      if (colKey.includes(".")) {
        // Extra column set
        const [setName, actualKey] = colKey.split(".", 2);
        const colProps = extraColSets?.[setName]?.colSet?.[actualKey];
        if (colProps) {
          const isSeparator = isSeparatorColFn(colProps);
          if (isSeparator) separatorCount++;

          entries.push({
            key: colKey,
            displayKey: isSeparator ? `Separator ${separatorCount}` : actualKey,
            colProps,
            enabled: isEnabled,
            isFromExtraSet: true,
            extraSetName: setName,
          });
        }
      } else {
        // Regular tableFields column
        const colProps = tableFields[colKey];
        if (colProps && !colProps.isTitle) {
          const isSeparator = isSeparatorColFn(colProps);
          if (isSeparator) separatorCount++;

          entries.push({
            key: colKey,
            displayKey: isSeparator ? `Separator ${separatorCount}` : colKey,
            colProps,
            enabled: isEnabled,
            isFromExtraSet: false,
          });
        }
      }
    });

    // Then add any columns from tableFields that weren't in config (as disabled)
    Object.entries(tableFields).forEach(([key, colProps]) => {
      if (colProps.isTitle) return;
      if (usedKeys.has(key)) return;

      const isSeparator = isSeparatorColFn(colProps);
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((c) => c.key === active.id);
      const newIndex = columns.findIndex((c) => c.key === over.id);
      setColumns(arrayMove(columns, oldIndex, newIndex));
    }
  };

  const handleToggleEnabled = React.useCallback((index: number) => {
    setColumns((prevColumns) => {
      const newColumns = [...prevColumns];
      newColumns[index] = {
        ...newColumns[index],
        enabled: !newColumns[index].enabled,
      };
      return newColumns;
    });
  }, []);

  const handleRemoveExtraColumn = React.useCallback((index: number) => {
    setColumns((prevColumns) => prevColumns.filter((_, i) => i !== index));
  }, []);

  const handleAddExtraColumn = (setName: string, colKey: string) => {
    const colProps = extraColSets?.[setName]?.colSet?.[colKey];
    if (!colProps) return;

    const fullKey = `${setName}.${colKey}`;
    // Check if already added
    if (columns.some((c) => c.key === fullKey)) return;

    const isSeparator = isSeparatorColFn(colProps);
    const separatorCount = isSeparator
      ? columns.filter((c) => isSeparatorColFn(c.colProps)).length + 1
      : 0;

    setColumns([
      {
        key: fullKey,
        displayKey: isSeparator ? `Separator ${separatorCount}` : colKey,
        colProps,
        enabled: true,
        isFromExtraSet: true,
        extraSetName: setName,
      },
      ...columns,
    ]);
  };

  const handleReset = () => {
    setColumns(buildInitialColumns());
  };

  const handleSave = () => {
    const disabledCols = columns.filter((c) => !c.enabled).map((c) => c.key);
    const config: TableColumnConfig = {
      newCol: columns.map((c) => c.key), // All columns in order
      ...(disabledCols.length > 0 ? { disabledCols } : {}), // Only include if there are disabled columns
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

  // Helper to get description for special separator cases
  const getSpecialSeparatorDescription = (
    colProps: GenericTableColProps
  ): string => {
    if (
      typeof colProps.colName === "string" &&
      colProps.colName.startsWith("__") &&
      GenericTableOps.colSeparatorSpecialCases[colProps.colName]
    ) {
      return GenericTableOps.colSeparatorSpecialCases[colProps.colName].name;
    }
    return "";
  };

  const getColumnDisplayName = (entry: ColumnEntry): string => {
    const { colProps, displayKey, isFromExtraSet } = entry;

    // For separators (regular or special), use displayKey (e.g. "Separator 1")
    if (isSeparatorColFn(colProps)) {
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

    if (isFromExtraSet) {
      return `${name} (+)`;
    }

    return name;
  };

  // Get description for a column entry
  const getColumnDescription = (entry: ColumnEntry): string => {
    const { colProps } = entry;

    // For special separators, use the name from colSeparatorSpecialCases
    const specialDesc = getSpecialSeparatorDescription(colProps);
    if (specialDesc) return specialDesc;

    // For regular separators, no description
    if (isSeparatorColFn(colProps)) return "";

    // Normal columns use toolTip
    return colProps.toolTip || "";
  };

  // Get the set of column keys in the base tableFields (excluding titles)
  const baseTableFieldKeys = useMemo(() => {
    return new Set(
      Object.entries(tableFields)
        .filter(([_, colProps]) => !colProps.isTitle)
        .map(([key]) => key)
    );
  }, [tableFields]);

  // Filter extra col sets to only show those that are libraries with columns not in the base table
  const extraSetNames = useMemo(() => {
    return Object.keys(extraColSets || {}).filter((setName) => {
      const extraColSet = extraColSets?.[setName];
      const colSet = extraColSet?.colSet;
      if (!colSet) return false;

      // Only include if isLibrary is true or undefined (not explicitly false)
      if (extraColSet?.isLibrary === false) return false;

      // Check if any column in this set is NOT in the base table fields
      return Object.keys(colSet).some(
        (colKey) => !colSet[colKey].isTitle && !baseTableFieldKeys.has(colKey)
      );
    });
  }, [extraColSets, baseTableFieldKeys]);

  // Helper to get display name for extra set columns
  const getExtraColDisplayName = (
    colProps: GenericTableColProps,
    colKey: string
  ): string => {
    if (isSeparatorColFn(colProps)) return "Separator";

    if (typeof colProps.colName === "string") {
      return colProps.colName;
    } else {
      const extractedText = extractTextFromNode(colProps.colName);
      return extractedText.replace(/\s*\n\s*/g, " | ").trim() || colKey;
    }
  };

  // Helper to get description for extra set columns
  const getExtraColDescription = (colProps: GenericTableColProps): string => {
    // For special separators, use the name from colSeparatorSpecialCases
    const specialDesc = getSpecialSeparatorDescription(colProps);
    if (specialDesc) return specialDesc;

    // For regular separators, no description
    if (isSeparatorColFn(colProps)) return "";

    // Normal columns use toolTip
    return colProps.toolTip || "";
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
        <Modal.Title>Configure Columns</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs defaultActiveKey="layout" id="column-config-tabs">
          {/* Table Layout Tab */}
          <Tab eventKey="layout" title="Table Layout">
            <div className={styles.columnList} style={{ marginTop: "12px" }}>
              {/* Header row */}
              <div className={styles.headerRow}>
                <div className={styles.headerSwitchSpacer}></div>
                <div className={styles.headerDragSpacer}></div>
                <div className={styles.headerName}>Name</div>
                <div className={styles.headerDescription}>Description</div>
                <div className={styles.headerDeleteSpacer}></div>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.map((c) => c.key)}
                  strategy={verticalListSortingStrategy}
                >
                  {columns.map((entry, index) => (
                    <SortableColumnRow
                      key={entry.key}
                      entry={entry}
                      index={index}
                      onToggleEnabled={handleToggleEnabled}
                      onRemoveExtraColumn={handleRemoveExtraColumn}
                      getDisplayName={getColumnDisplayName}
                      getDescription={getColumnDescription}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </Tab>

          {/* Extra Column Set Tabs - only shown if they have columns not in base table */}
          {extraSetNames.map((setName) => {
            const extraColSet = extraColSets?.[setName];
            const colSet = extraColSet?.colSet;
            if (!colSet) return null;

            const tabTitle = extraColSet?.description ? (
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id={`tab-tooltip-${setName}`}>
                    {extraColSet.description}
                  </Tooltip>
                }
              >
                <span>{setName}</span>
              </OverlayTrigger>
            ) : (
              setName
            );

            return (
              <Tab eventKey={setName} title={tabTitle} key={setName}>
                <div
                  className={styles.columnList}
                  style={{ marginTop: "12px" }}
                >
                  {/* Header row for extra cols */}
                  <div className={styles.headerRow}>
                    <div className={styles.headerAddSpacer}></div>
                    <div className={styles.headerName}>Name</div>
                    <div className={styles.headerDescription}>Description</div>
                  </div>
                  {Object.entries(colSet)
                    .filter(([_, colProps]) => !colProps.isTitle)
                    .map(([colKey, colProps]) => {
                      const fullKey = `${setName}.${colKey}`;
                      const alreadyAdded = columns.some(
                        (c) => c.key === fullKey
                      );
                      const isSeparator = isSeparatorColFn(colProps);

                      return (
                        <div
                          key={colKey}
                          className={`${styles.columnRow} ${
                            alreadyAdded ? styles.columnRowDisabled : ""
                          }`}
                        >
                          {/* Add button */}
                          <div className={styles.addButtonCell}>
                            <Button
                              variant={
                                alreadyAdded
                                  ? "outline-secondary"
                                  : "outline-primary"
                              }
                              size="sm"
                              disabled={alreadyAdded}
                              onClick={() =>
                                handleAddExtraColumn(setName, colKey)
                              }
                              style={{ padding: "2px 8px" }}
                            >
                              <FontAwesomeIcon icon={faPlus} size="sm" />
                            </Button>
                          </div>

                          {/* Column name */}
                          <div
                            className={`${styles.nameCell} ${
                              isSeparator ? styles.separatorName : ""
                            }`}
                          >
                            {getExtraColDisplayName(colProps, colKey)}
                            {alreadyAdded && (
                              <small className="text-muted"> (added)</small>
                            )}
                          </div>

                          {/* Description */}
                          <div className={styles.descriptionCell}>
                            {getExtraColDescription(colProps)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Tab>
            );
          })}
        </Tabs>
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
