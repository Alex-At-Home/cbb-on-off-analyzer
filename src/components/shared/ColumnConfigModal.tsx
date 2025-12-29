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

import { GenericTableColProps, ExtraColSet } from "../GenericTable";
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
  /** Original default tableFields when a preset is active - allows adding columns from the default layout */
  defaultTableFields?: Record<string, GenericTableColProps>;
};

// Sortable row component - defined outside to prevent recreation on every render
type SortableColumnRowProps = {
  entry: ColumnEntry;
  index: number;
  onToggleEnabled: (index: number) => void;
  onRemoveExtraColumn: (index: number) => void;
  getDisplayName: (entry: ColumnEntry) => string;
};

const SortableColumnRow: React.FC<SortableColumnRowProps> = ({
  entry,
  index,
  onToggleEnabled,
  onRemoveExtraColumn,
  getDisplayName,
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

  const isSeparator =
    entry.colProps.colName === "" && entry.colProps.toolTip === "";

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

      {/* Old checkbox - kept for reference
      <div className={styles.checkboxCell}>
        <Form.Check
          type="checkbox"
          checked={entry.enabled}
          onChange={() => onToggleEnabled(index)}
        />
      </div>
      */}

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
        {entry.colProps.toolTip}
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
  defaultTableFields,
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
    const disabledKeys = new Set(config.disabledCols || []);

    // First, add columns from config in order
    config.newCol.forEach((colKey) => {
      const isEnabled = !disabledKeys.has(colKey);

      if (colKey.includes(".")) {
        // Extra column set or default layout column
        const [setName, actualKey] = colKey.split(".", 2);
        
        // Handle __default__ prefix - columns from default layout when using a preset
        if (setName === "__default__") {
          const colProps = defaultTableFields?.[actualKey];
          if (colProps && !colProps.isTitle) {
            const isSeparator =
              colProps.colName === "" && colProps.toolTip === "";
            if (isSeparator) separatorCount++;

            entries.push({
              key: colKey,
              displayKey: isSeparator ? `Separator ${separatorCount}` : actualKey,
              colProps,
              enabled: isEnabled,
              isFromExtraSet: true,
              extraSetName: "Default Columns",
            });
          }
        } else {
          // Regular extra column set
          const colProps = extraColSets?.[setName]?.colSet?.[actualKey];
          if (colProps) {
            const isSeparator =
              colProps.colName === "" && colProps.toolTip === "";
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
        }
      } else {
        // Regular tableFields column
        const colProps = tableFields[colKey];
        if (colProps && !colProps.isTitle) {
          const isSeparator =
            colProps.colName === "" && colProps.toolTip === "";
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

    const isSeparator = colProps.colName === "" && colProps.toolTip === "";
    const separatorCount = isSeparator
      ? columns.filter(
          (c) => c.colProps.colName === "" && c.colProps.toolTip === ""
        ).length + 1
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

  // Handler for adding columns from the default layout when using a preset
  const handleAddDefaultColumn = (colKey: string) => {
    const colProps = defaultTableFields?.[colKey];
    if (!colProps || colProps.isTitle) return;

    // Use a special prefix to identify default columns added to a preset
    const fullKey = `__default__.${colKey}`;
    // Check if already added (either as the original key or with the prefix)
    if (columns.some((c) => c.key === fullKey || c.key === colKey)) return;

    const isSeparator = colProps.colName === "" && colProps.toolTip === "";
    const separatorCount = isSeparator
      ? columns.filter(
          (c) => c.colProps.colName === "" && c.colProps.toolTip === ""
        ).length + 1
      : 0;

    setColumns([
      {
        key: fullKey,
        displayKey: isSeparator ? `Separator ${separatorCount}` : colKey,
        colProps,
        enabled: true,
        isFromExtraSet: true,
        extraSetName: "Default Columns",
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

    if (isFromExtraSet) {
      return `${name} (+)`;
    }

    return name;
  };

  // Get the set of column keys in the base tableFields (excluding titles)
  const baseTableFieldKeys = useMemo(() => {
    return new Set(
      Object.entries(tableFields)
        .filter(([_, colProps]) => !colProps.isTitle)
        .map(([key]) => key)
    );
  }, [tableFields]);

  // Filter extra col sets to only show those with columns not in the base table
  const extraSetNames = useMemo(() => {
    return Object.keys(extraColSets || {}).filter((setName) => {
      const colSet = extraColSets?.[setName]?.colSet;
      if (!colSet) return false;

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
    const isSeparator = colProps.colName === "" && colProps.toolTip === "";
    if (isSeparator) return "Separator";

    if (typeof colProps.colName === "string") {
      return colProps.colName;
    } else {
      const extractedText = extractTextFromNode(colProps.colName);
      return extractedText.replace(/\s*\n\s*/g, " | ").trim() || colKey;
    }
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
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </Tab>

          {/* Default Layout Tab - shown when a preset is active */}
          {defaultTableFields && (
            <Tab eventKey="defaultLayout" title="Default Columns">
              <div className={styles.columnList} style={{ marginTop: "12px" }}>
                {/* Header row */}
                <div className={styles.headerRow}>
                  <div className={styles.headerAddSpacer}></div>
                  <div className={styles.headerName}>Name</div>
                  <div className={styles.headerDescription}>Description</div>
                </div>
                {Object.entries(defaultTableFields)
                  .filter(([_, colProps]) => !colProps.isTitle)
                  .map(([colKey, colProps]) => {
                    const fullKey = `__default__.${colKey}`;
                    const alreadyAdded = columns.some(
                      (c) => c.key === fullKey || c.key === colKey
                    );
                    const isSeparator =
                      colProps.colName === "" && colProps.toolTip === "";

                    return (
                      <div
                        key={colKey}
                        className={`${styles.columnRow} ${alreadyAdded ? styles.columnRowDisabled : ""}`}
                      >
                        {/* Add button */}
                        <div className={styles.addButtonCell}>
                          <Button
                            variant={alreadyAdded ? "outline-secondary" : "outline-primary"}
                            size="sm"
                            disabled={alreadyAdded}
                            onClick={() => handleAddDefaultColumn(colKey)}
                            style={{ padding: "2px 8px" }}
                          >
                            <FontAwesomeIcon icon={faPlus} size="sm" />
                          </Button>
                        </div>

                        {/* Column name */}
                        <div
                          className={`${styles.nameCell} ${isSeparator ? styles.separatorName : ""}`}
                        >
                          {getExtraColDisplayName(colProps, colKey)}
                          {alreadyAdded && (
                            <small className="text-muted"> (added)</small>
                          )}
                        </div>

                        {/* Description */}
                        <div className={styles.descriptionCell}>
                          {colProps.toolTip}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Tab>
          )}

          {/* Extra Column Set Tabs - only shown if they have columns not in base table */}
          {extraSetNames.map((setName) => {
            const extraColSet = extraColSets?.[setName];
            const colSet = extraColSet?.colSet;
            if (!colSet) return null;

            return (
              <Tab eventKey={setName} title={setName} key={setName}>
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
                      const isSeparator =
                        colProps.colName === "" && colProps.toolTip === "";

                      return (
                        <div
                          key={colKey}
                          className={`${styles.columnRow} ${alreadyAdded ? styles.columnRowDisabled : ""}`}
                        >
                          {/* Add button */}
                          <div className={styles.addButtonCell}>
                            <Button
                              variant={alreadyAdded ? "outline-secondary" : "outline-primary"}
                              size="sm"
                              disabled={alreadyAdded}
                              onClick={() => handleAddExtraColumn(setName, colKey)}
                              style={{ padding: "2px 8px" }}
                            >
                              <FontAwesomeIcon icon={faPlus} size="sm" />
                            </Button>
                          </div>

                          {/* Column name */}
                          <div
                            className={`${styles.nameCell} ${isSeparator ? styles.separatorName : ""}`}
                          >
                            {getExtraColDisplayName(colProps, colKey)}
                            {alreadyAdded && (
                              <small className="text-muted"> (added)</small>
                            )}
                          </div>

                          {/* Description */}
                          <div className={styles.descriptionCell}>
                            {colProps.toolTip}
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
