// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

import styles from "./GenericTable.module.css";
import GroupedOverlayTrigger from "./shared/GroupedOverlayTrigger";
import MobileFriendlyOverlayTrigger from "./shared/MobileFriendlyOverlayTrigger";

// Themes
import chroma from "chroma-js";
import { useTheme } from "next-themes";

// Bootstrap imports:
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Dropdown from "react-bootstrap/Dropdown";

// Libary imports
import ClipboardJS from "clipboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { faCircle } from "@fortawesome/free-solid-svg-icons";
import { faArrowAltCircleRight } from "@fortawesome/free-solid-svg-icons";
import { faArrowAltCircleDown } from "@fortawesome/free-solid-svg-icons";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import ReactNode from "react";

import ColumnConfigModal, {
  TableColumnConfig,
} from "./shared/ColumnConfigModal";
import { opacity } from "html2canvas-pro/dist/types/css/property-descriptors/opacity";

// Re-export for consumers
export type { TableColumnConfig };

type GenericTableColorPickerFn = (
  val: any,
  cellMeta: string
) => string | undefined;
export class GenericTableColProps {
  constructor(
    colName: string | React.ReactNode,
    toolTip: string,
    widthUnits: number,
    isTitle: boolean = false,
    formatter: (
      val: any,
      key?: string
    ) => string | React.ReactNode = GenericTableOps.defaultFormatter,
    colorPicker: GenericTableColorPickerFn = GenericTableOps.defaultColorPicker,
    rowSpan: (key: string) => number = GenericTableOps.defaultRowSpanCalculator,
    missingData: any | undefined = undefined,
    className: string = ""
  ) {
    this.colName = colName;
    this.toolTip = toolTip;
    this.widthUnits = widthUnits;
    this.isTitle = isTitle;
    this.formatter = formatter;
    this.colorPicker = colorPicker;
    this.rowSpan = rowSpan;
    this.missingData = missingData;
    this.className = className;
  }
  readonly colName: string | React.ReactNode;
  readonly toolTip: string;
  readonly widthUnits: number;
  readonly isTitle: boolean;
  readonly formatter: (val: any, key?: string) => string | React.ReactNode;
  readonly colorPicker: GenericTableColorPickerFn;
  readonly rowSpan: (key: string) => number;
  readonly missingData: any | undefined;
  readonly className: string;
}
class GenericTableDataRow {
  constructor(
    dataObj: any,
    prefixFn: (key: string) => string,
    cellMetaFn: (key: string, value: any) => string,
    tableFieldsOverride: Record<string, GenericTableColProps> | undefined,
    colSpanOverride: undefined | ((key: string) => number)
  ) {
    this.dataObj = dataObj;
    this.prefixFn = prefixFn;
    this.cellMetaFn = cellMetaFn;
    this.tableFieldsOverride = tableFieldsOverride;
    this.colSpanOverride = colSpanOverride;
  }
  readonly kind: string = "data-row";
  readonly dataObj: any;
  readonly prefixFn: (key: string) => string;
  readonly cellMetaFn: (key: string, value: any) => string;
  readonly tableFieldsOverride:
    | Record<string, GenericTableColProps>
    | undefined;
  readonly colSpanOverride: undefined | ((key: string) => number);
  navigationRef: undefined | React.RefObject<HTMLTableRowElement>;
}
class GenericTableSeparator {
  constructor(padding?: string) {
    this.padding = padding;
  }
  readonly kind: string = "separator";
  readonly padding: string | undefined;
  navigationRef: undefined | React.RefObject<HTMLTableRowElement>;
}
class GenericTableTextRow {
  constructor(text: React.ReactNode, className: string) {
    this.text = text;
    this.className = className;
  }
  readonly kind: string = "text-row";
  readonly text: React.ReactNode;
  readonly className: string;
  navigationRef: undefined | React.RefObject<HTMLTableRowElement>;
}
class GenericTableSubHeaderRow {
  constructor(cols: [React.ReactNode, number][], className: string) {
    this.cols = cols.map((nodeNum: [React.ReactNode, number]) => nodeNum[0]);
    this.spans = cols.map((nodeNum: [React.ReactNode, number]) => nodeNum[1]);
    this.className = className;
  }
  readonly kind: string = "subheader-row";
  readonly cols: React.ReactNode[];
  readonly spans: number[];
  readonly className: string;
  navigationRef: undefined | React.RefObject<HTMLTableRowElement>;
}
class GenericTableRepeatHeaderRow {
  constructor(colRename: Record<string, string>, className: string) {
    this.colRename = colRename;
    this.className = className;
  }
  readonly kind: string = "text-row";
  readonly colRename: Record<string, string>;
  readonly className: string;
  navigationRef: undefined | React.RefObject<HTMLTableRowElement>;
}
export type GenericTableRow =
  | GenericTableDataRow
  | GenericTableSeparator
  | GenericTableTextRow
  | GenericTableSubHeaderRow
  | GenericTableRepeatHeaderRow;
export class GenericTableOps {
  /** Utility to put a faint colored backing to text */
  static readonly getTextShadow = (
    stat: { value?: number },
    colorMapper: (val: number) => string | undefined,
    radius: string = "15px",
    strength = 3
  ) => {
    const shadow = _.range(0, strength)
      .map((__) => `0px 0px ${radius} ${colorMapper(stat?.value || 0) || ""}`)
      .join(",");
    return {
      textShadow: shadow,
    };
  };

  static readonly defaultFormatter = (val: any) => "" + val;
  static readonly offHighlightFormatter = (
    formatter: (val: any) => string | React.ReactNode
  ) => {
    return (val: any, key?: string) => {
      return _.startsWith(key, "off_") ? (
        <span style={{ opacity: 0.75 }}>{formatter(val)}</span>
      ) : (
        <span style={{ opacity: 0.33 }}>{formatter(val)}</span>
      );
    };
  };
  static readonly htmlFormatter = (val: React.ReactNode) => val;
  static readonly intFormatter = (val: any) =>
    "" + (val.value as number).toFixed(0);
  static readonly twoDpFormatter = (val: any) =>
    "" + (val.value as number).toFixed(2);
  static readonly rankSuffix = (n: number) =>
    ["st", "nd", "rd"][((((n + 90) % 100) - 10) % 10) - 1] || "th";
  static readonly rankFormatter = (val: any) => {
    return (
      //(sometimes get 0th due to rounding, we just switch that to 1)
      <small>
        {((val.value as number) || 1).toFixed(0)}
        <sup>{GenericTableOps.rankSuffix((val.value as number) || 1)}</sup>
      </small>
    );
  };
  static readonly approxRankFormatter = (val: any) => {
    const valToRender = val.value as number;
    return valToRender < 1000 ? (
      <small>T{valToRender.toFixed(0)}</small>
    ) : (
      <small>
        <small>T{valToRender.toFixed(0)}</small>
      </small>
    );
  };
  static readonly percentFormatter = (val: any) => {
    return val.value >= 1
      ? ((val.value as number) * 100.0).toFixed(0) //(remove the .0 in the 100% case)
      : ((val.value as number) * 100.0).toFixed(1); //(no % it's too ugly)
  };
  static readonly percentOrHtmlFormatter = (val: any) => {
    if (React.isValidElement(val)) {
      return GenericTableOps.htmlFormatter(val as React.ReactNode);
    } else {
      return GenericTableOps.percentFormatter(val);
    }
  };
  /** Top row is %, bottom row is also % but has a shadow instead of a full background */
  static readonly dualRowPercentFormatter = (
    colorOverride: (val: number) => string
  ) => {
    return (val: any, key?: string) => {
      if (!key || key.startsWith("off_")) {
        return GenericTableOps.percentFormatter(val);
      } else {
        //def_ ... add a shadow on top of whatever background (typically default)
        return (
          <small style={GenericTableOps.getTextShadow(val, colorOverride)}>
            <i>{(100 * (val?.value || 0)).toFixed(0)}%</i>
          </small>
        );
      }
    };
  };
  static readonly gradeOrHtmlFormatter = (val: any) => {
    if (React.isValidElement(val)) {
      return GenericTableOps.htmlFormatter(val as React.ReactNode);
    } else if (val.samples) {
      const numSamples = val.samples || 0;
      const pctile = val.value || 0;
      const rank = 1 + Math.round((1 - pctile) * numSamples); //(+1, since 100% is rank==1)
      return GenericTableOps.rankFormatter({ value: rank });
    } else {
      return GenericTableOps.percentFormatter(val);
    }
  };
  static readonly approxRankOrHtmlFormatter = (val: any) => {
    if (React.isValidElement(val)) {
      return GenericTableOps.htmlFormatter(val as React.ReactNode);
    } else if (val.samples) {
      const numSamples = val.samples || 0;
      const pctile = val.value || 0;
      const rank = 1 + Math.round((1 - pctile) * numSamples); //(+1, since 100% is rank==1)

      // How granular we are depends on how highly ranked we are:
      const approxRank = _.thru(rank, (r) => {
        if (r <= 250) {
          return 10 * Math.ceil(r / 10);
        } else {
          return 50 * Math.ceil(r / 50);
        }
      });
      return GenericTableOps.approxRankFormatter({ value: approxRank });
    } else {
      return GenericTableOps.percentFormatter(val);
    }
  };
  static readonly pointsFormatter = (val: any) =>
    (val.value as number).toFixed(1);
  static readonly pointsFormatter2dp = (val: any) =>
    (val.value as number).toFixed(2);
  static readonly pointsOrHtmlFormatter = (val: any) => {
    if (React.isValidElement(val)) {
      return GenericTableOps.htmlFormatter(val as React.ReactNode);
    } else if (React.isValidElement(val?.value)) {
      return GenericTableOps.htmlFormatter(val?.value as React.ReactNode);
    } else {
      return GenericTableOps.pointsFormatter(val);
    }
  };
  static readonly defaultCellMeta = (key: string, value: any) => "";
  static readonly defaultColorPicker = (val: any, cellMeta: string) =>
    undefined;
  static readonly defaultRowSpanCalculator = (key: string) => 1;

  // Rows:

  static buildDataRow(
    dataObj: any,
    prefixFn: (key: string) => string,
    cellMetaFn: (key: string, value: any) => string,
    tableFieldsOverride:
      | Record<string, GenericTableColProps>
      | undefined = undefined,
    colSpanOverride: undefined | ((key: string) => number) = undefined
  ): GenericTableRow {
    return new GenericTableDataRow(
      dataObj,
      prefixFn,
      cellMetaFn,
      tableFieldsOverride,
      colSpanOverride
    );
  }
  static buildTextRow(
    text: React.ReactNode,
    className: string = ""
  ): GenericTableRow {
    return new GenericTableTextRow(text, className);
  }
  static buildRowSeparator(padding?: string): GenericTableRow {
    return new GenericTableSeparator(padding);
  }
  static buildSubHeaderRow(
    cols: [React.ReactNode, number][],
    className: string = ""
  ): GenericTableRow {
    return new GenericTableSubHeaderRow(cols, className);
  }
  static buildHeaderRepeatRow(
    colRename: Record<string, string>,
    className: string = ""
  ): GenericTableRow {
    return new GenericTableRepeatHeaderRow(colRename, className);
  }

  // Cols:

  static addPctCol(
    colName: string | React.ReactNode,
    toolTip: string,
    colorPicker: GenericTableColorPickerFn
  ) {
    return new GenericTableColProps(
      colName,
      toolTip,
      2,
      false,
      GenericTableOps.percentFormatter,
      colorPicker,
      GenericTableOps.defaultRowSpanCalculator,
      undefined
    );
  }
  static addPtsCol(
    colName: string | React.ReactNode,
    toolTip: string,
    colorPicker: GenericTableColorPickerFn
  ) {
    return new GenericTableColProps(
      colName,
      toolTip,
      2,
      false,
      GenericTableOps.pointsFormatter,
      colorPicker,
      GenericTableOps.defaultRowSpanCalculator,
      undefined
    );
  }
  static addIntCol(
    colName: string | React.ReactNode,
    toolTip: string,
    colorPicker: GenericTableColorPickerFn
  ) {
    return new GenericTableColProps(
      colName,
      toolTip,
      2,
      false,
      GenericTableOps.intFormatter,
      colorPicker,
      GenericTableOps.defaultRowSpanCalculator,
      undefined
    );
  }
  static addDataCol(
    colName: string | React.ReactNode,
    toolTip: string,
    colorPicker: GenericTableColorPickerFn,
    formatter: (val: any, key?: string) => string | React.ReactNode
  ) {
    return new GenericTableColProps(
      colName,
      toolTip,
      2,
      false,
      formatter,
      colorPicker,
      GenericTableOps.defaultRowSpanCalculator,
      undefined
    );
  }
  static addTitle(
    colName: string | React.ReactNode,
    toolTip: string,
    rowSpan: (key: string) => number = GenericTableOps.defaultRowSpanCalculator,
    className: string = "",
    colFormatterOverride: (
      val: any
    ) => string | React.ReactNode = GenericTableOps.defaultFormatter,
    widthOverride: number = 8
  ) {
    return new GenericTableColProps(
      colName,
      toolTip,
      widthOverride,
      true,
      colFormatterOverride,
      GenericTableOps.defaultColorPicker,
      rowSpan,
      undefined,
      className
    );
  }
  static addColSeparator(width: number = 0.5) {
    return new GenericTableColProps("", "", width);
  }
  static addSpecialColSeparator(
    specialCase:
      | "__off_def__"
      | "__adj_raw__"
      | "__off_ast__"
      | "__off__"
      | "__def__"
      | "__net__"
      | "__adj__"
      | "__raw__"
      | "__ft__",
    width: number = 0.5
  ) {
    return new GenericTableColProps(specialCase, "", width);
  }

  /** TODO: make this configurable per table vs embedded here? */
  static colSeparatorSpecialCases: Record<
    string,
    { name: string; keys: Record<string, string> }
  > = {
    __off__: {
      name: "Offensive stats",
      keys: {
        off: "OFF",
        "": "OFF",
      },
    },
    __def__: {
      name: "Defensive stats",
      keys: {
        def: "DEF",
        "": "DEF",
      },
    },
    __off_def__: {
      name: "Top row offense, bottom row defense",
      keys: {
        off: "OFF",
        def: "DEF",
      },
    },
    __off_ast__: {
      name: "Assisted% in bottom row",
      keys: {
        off: "",
        def: "AST",
      },
    },
    __adj_raw__: {
      name: "Net: top row adjusted, bottom row raw",
      keys: {
        off: "ADJ",
        def: "RAW",
      },
    },
    __net__: {
      name: "Net stats",
      keys: {
        off: "NET",
        def: "NET",
        "": "NET",
      },
    },
    __adj__: {
      name: "Adjusted net stats",
      keys: {
        off: "ADJ",
        def: "ADJ",
        "": "ADJ",
      },
    },
    __raw__: {
      name: "Raw net stats",
      keys: {
        off: "RAW",
        def: "RAW",
        "": "RAW",
      },
    },
    __ft__: {
      name: "FT% lower row",
      keys: {
        off: "",
        def: "FT%",
        "": "",
      },
    },
  };
  static maybeSpecialCase(colName: string | React.ReactNode) {
    return (
      _.isString(colName) &&
      _.startsWith(colName, "__") &&
      GenericTableOps.colSeparatorSpecialCases[colName].keys
    );
  }
}
type LockModes = "col" | "none" | "row" | "missing";
const nextLockMode: Record<LockModes, LockModes> = {
  none: "col",
  col: "row",
  row: "none",
  missing: "missing",
};
export type IntegratedGradeSettingsColorChoice = {
  valToTest: number;
  expectedResult: string;
  gradeColor: (pctile: number) => string;
};
export type IntegratedGradeSettings = {
  topPctle?: number;
  bottomPctle?: number;
  hybridMode?: boolean;
  exactRanks?: boolean;
  colorChooser: IntegratedGradeSettingsColorChoice[];
  customKeyMappings?: Record<string, string>;
  alwaysShow?: Record<string, boolean>;
};
/** Extra column set with metadata */
export type ExtraColSet = {
  /** Whether this can be used as a standalone table preset */
  isPreset?: boolean;
  /** If it's a preset, whether _also_ to include it as a library of fields (default true) */
  isLibrary?: boolean;
  /** Name of this column set */
  name: string;
  /** Description of this column set */
  description?: string;
  /** The column definitions */
  colSet: Record<string, GenericTableColProps>;
};
type Props = {
  responsive?: boolean;
  /* otherwise table is always 100% */
  growsToFit?: boolean;
  tableFields: Record<string, GenericTableColProps>;
  tableData: Array<GenericTableRow>;
  tableCopyId?: string;
  cellTooltipMode?: LockModes;
  bordered?: boolean;
  rowStyleOverride?: Record<string, any>;
  extraInfoLookups?: Record<string, string>; //(lets us use codes for common strings)
  integratedGrades?: IntegratedGradeSettings;
  /** Extra column sets that can be added via the column config modal */
  extraColSets?: Record<string, ExtraColSet>;
  /** Callback when column configuration changes */
  onColumnConfigChange?: (config: TableColumnConfig) => void;
  /** Initial column configuration to apply */
  initialColumnConfig?: TableColumnConfig;
  /** Whether to show the column configuration button (default: false) */
  showConfigureColumns?: boolean;
  /** If set, use this preset from extraColSets instead of tableFields */
  presetOverride?: string;
  /** Callback when preset selection changes */
  onPresetChange?: (presetKey: string | undefined) => void;
  /** The key of the column (/col+row combo) that is being sorted */
  sortField?: string;
  /** If this callback is enabled, the table headers become clickable (ev is the click event) */
  onHeaderClick?: (headerKey: string, ev: any) => void;
};
const GenericTable: React.FunctionComponent<Props> = ({
  responsive,
  growsToFit,
  tableFields: tableFieldsIn,
  tableData,
  tableCopyId,
  cellTooltipMode,
  bordered,
  rowStyleOverride,
  extraInfoLookups,
  integratedGrades,
  extraColSets,
  onColumnConfigChange,
  initialColumnConfig,
  showConfigureColumns = false,
  presetOverride,
  onPresetChange,
  sortField,
  onHeaderClick,
}) => {
  const { resolvedTheme } = useTheme();
  const [lockMode, setLockMode] = useState(
    (cellTooltipMode || "missing") as LockModes
  );
  const [cellOverlayShowStates, setCellOverlayShowStates] = useState(
    {} as Record<string, boolean>
  );
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [columnConfig, setColumnConfig] = useState<
    TableColumnConfig | undefined
  >(initialColumnConfig);

  // Determine base columns (preset or default tableFields)
  const baseTableFields = React.useMemo(() => {
    if (presetOverride && extraColSets?.[presetOverride]) {
      return extraColSets[presetOverride].colSet;
    }
    return tableFieldsIn;
  }, [tableFieldsIn, extraColSets, presetOverride]);

  // Build tableFields from config or use the base tableFields
  const tableFields = React.useMemo(() => {
    if (
      !columnConfig ||
      (_.isEmpty(columnConfig.newCol) && _.isEmpty(columnConfig.disabledCols))
    ) {
      return baseTableFields;
    }

    // Build custom tableFields from config
    const result: Record<string, GenericTableColProps> = {};
    const disabledKeys = new Set(columnConfig.disabledCols || []);

    // First, add all title columns from the original (they are not configurable)
    Object.entries(baseTableFields).forEach(([key, colProps]) => {
      if (colProps.isTitle) {
        result[key] = colProps;
      }
    });

    const tableColsToUse = _.isEmpty(columnConfig.newCol)
      ? _.keys(baseTableFields)
      : columnConfig.newCol;

    // Then add enabled columns from config in order
    tableColsToUse.forEach((colKey) => {
      // Skip disabled columns
      if (disabledKeys.has(colKey)) return;

      if (colKey.includes(".")) {
        // Extra column set or default layout column
        const [setName, actualKey] = colKey.split(".", 2);
        if (setName === "__default__") {
          // Column from default layout (when using a preset)
          const colProps = tableFieldsIn[actualKey];
          if (colProps && !colProps.isTitle) {
            result[actualKey] = colProps;
          }
        } else {
          // Regular extra column set
          const colProps = extraColSets?.[setName]?.colSet?.[actualKey];
          if (colProps) {
            result[actualKey] = colProps;
          }
        }
      } else {
        // Regular tableFields column
        const colProps = baseTableFields[colKey];
        if (colProps && !colProps.isTitle) {
          result[colKey] = colProps;
        }
      }
    });

    return result;
  }, [baseTableFields, tableFieldsIn, extraColSets, columnConfig]);

  const handleColumnConfigSave = (config: TableColumnConfig) => {
    const newConfig = {
      ...config,
      disabledCols: _.thru(config.disabledCols, (__) => {
        if (_.size(config.disabledCols) == 1) {
          //(size 1 arrays are not handled)
          return (config.disabledCols || []).concat(["__dummy__"]);
        } else {
          return config.disabledCols;
        }
      }),
    };
    setColumnConfig(newConfig);
    onColumnConfigChange?.(newConfig);
  };

  const tableId: string =
    tableCopyId || Math.random().toString(36).substring(8);
  const buttonId = tableId + "_copy";
  const toolTipId = tableId + "_toolTip";

  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);
  useEffect(() => {
    // This grovelling is needed to ensure that clipboard is only loaded client side
    if (null == clipboard && typeof tableCopyId === "string") {
      var newClipboard = new ClipboardJS(`#${buttonId}`, {
        target: function (trigger) {
          return document.getElementById(tableId) as Element; //exists by construction
        },
      });
      newClipboard.on("success", (event: ClipboardJS.Event) => {
        setTimeout(function () {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  });

  const totalTableCols = Object.values(tableFields).length;
  const totalWidthUnits = Object.values(tableFields)
    .map((col) => col.widthUnits)
    .reduce((acc, v) => acc + v);

  function renderTableHeaders(
    maybeRepeatingHeader?: GenericTableRepeatHeaderRow
  ) {
    const isRepeatingHeaderRow = maybeRepeatingHeader != undefined;
    function insertCopyButton(insert: boolean) {
      if (!isRepeatingHeaderRow && tableCopyId && insert) {
        const tooltip = (
          <Tooltip id={`${toolTipId}-copy`}>
            Copies formatted table to clipboard
          </Tooltip>
        );
        return showConfigureColumns ? (
          <div className="d-none d-lg-block">
            <OverlayTrigger placement="top" overlay={tooltip}>
              <Button
                className="float-left"
                id={buttonId}
                variant="outline-secondary"
                size="sm"
              >
                <FontAwesomeIcon icon={faClipboard} />
              </Button>
            </OverlayTrigger>
          </div>
        ) : (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <Button
              className="float-left"
              id={buttonId}
              variant="outline-secondary"
              size="sm"
            >
              <FontAwesomeIcon icon={faClipboard} />
            </Button>
          </OverlayTrigger>
        );
      }
    }
    function insertConfigureDropdown(insert: boolean) {
      if (!isRepeatingHeaderRow && insert && showConfigureColumns) {
        // Get preset options
        const presetOptions = Object.entries(extraColSets || {})
          .filter(([_, colSet]) => colSet.isPreset)
          .map(([key, colSet]) => ({
            key,
            label: colSet.name,
            description: colSet.description,
          }));

        // Lock mode options
        const lockModeOptions: { mode: LockModes; label: string }[] = [
          { mode: "none", label: "Default" },
          { mode: "col", label: "Lock by column" },
          { mode: "row", label: "Lock by row" },
        ];

        return (
          <Dropdown className="float-left" style={{ marginLeft: "4px" }}>
            <Dropdown.Toggle
              variant="outline-secondary"
              size="sm"
              id={`${tableId}-config-dropdown`}
            >
              <FontAwesomeIcon icon={faCog} />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {showConfigureColumns ? (
                <Dropdown.Item id={buttonId} className="d-lg-none">
                  Copy Table Contents
                </Dropdown.Item>
              ) : undefined}
              <Dropdown.Item onClick={() => setShowColumnConfig(true)}>
                Configure Table...
              </Dropdown.Item>

              <Dropdown.Header
                style={{ fontSize: "0.75em", fontWeight: "normal" }}
              >
                TABLE PRESETS
              </Dropdown.Header>
              <Dropdown.Item onClick={() => onPresetChange?.(undefined)}>
                Default Layout
                {!presetOverride && (
                  <span>
                    &nbsp;&nbsp;
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                )}
              </Dropdown.Item>
              {presetOptions.map((preset) => (
                <Dropdown.Item
                  key={preset.key}
                  onClick={() => onPresetChange?.(preset.key)}
                  title={preset.description}
                >
                  {preset.label}
                  {presetOverride === preset.key && (
                    <span>
                      &nbsp;&nbsp;
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                  )}
                </Dropdown.Item>
              ))}

              {cellTooltipMode && cellTooltipMode !== "missing" && (
                <>
                  <Dropdown.Header
                    style={{ fontSize: "0.75em", fontWeight: "normal" }}
                  >
                    TOOLTIP LOCK MODE
                  </Dropdown.Header>
                  {lockModeOptions.map((opt) => (
                    <Dropdown.Item
                      key={opt.mode}
                      onClick={() => {
                        setLockMode(opt.mode);
                        setCellOverlayShowStates({});
                      }}
                    >
                      {opt.label}
                      {lockMode === opt.mode && (
                        <span>
                          &nbsp;&nbsp;
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                      )}
                    </Dropdown.Item>
                  ))}
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        );
      }
    }
    function insertTooltipLockMode() {
      // Only show standalone lock mode button if showConfigureColumns is false
      if (showConfigureColumns) return null;

      function getTooltipLockModeIcon() {
        switch (lockMode) {
          case "missing":
            return undefined;
          case "none":
            return faCircle;
          case "row":
            return faArrowAltCircleRight;
          case "col":
            return faArrowAltCircleDown;
        }
      }
      const lockIcon = getTooltipLockModeIcon();
      if (!isRepeatingHeaderRow && lockIcon) {
        const tooltip = (
          <Tooltip id={`${toolTipId}-lock`}>
            Cell tooltip locking mode ({lockMode})
          </Tooltip>
        );
        return (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <Button
              className="float-right"
              variant="outline-secondary"
              size="sm"
              onClick={() => {
                setLockMode(nextLockMode[lockMode] as LockModes);
                setCellOverlayShowStates({}); //(clear it all out)
              }}
            >
              <FontAwesomeIcon icon={lockIcon} />
            </Button>
          </OverlayTrigger>
        );
      }
    }
    const getNodeText: (node: any) => any = (node: any) => {
      if (["string", "number"].includes(typeof node)) return node;
      if (node instanceof Array) return node.map(getNodeText).join("");
      if (typeof node === "object" && node)
        return getNodeText(node.props.children);
    };
    const maybeFormatColName = (s: React.ReactNode | string) => {
      if (GenericTableOps.maybeSpecialCase(s)) {
        return "";
      } else if (isRepeatingHeaderRow && typeof s === "string") {
        const maybeRename = (maybeRepeatingHeader?.colRename || {})[s];
        return maybeRename || s;
      } else if (isRepeatingHeaderRow) {
        const textOfNode = getNodeText(s);
        const maybeRename = (maybeRepeatingHeader?.colRename || {})[textOfNode];
        return maybeRename || s;
      } else {
        return s;
      }
    };
    return Object.entries(tableFields).map(([colKey, colProp], index) => {
      const style = getColStyle(colProp);
      const isClickable =
        !!onHeaderClick && !colProp.isTitle && colProp.widthUnits > 0;
      const tooltip = (
        <Tooltip id={`${toolTipId}-${index}`}>
          {colProp.toolTip}
          {isClickable ? (
            <>
              <br />
              <br />
              Click to choose from available sort options
            </>
          ) : undefined}
        </Tooltip>
      );
      const headerContent = maybeFormatColName(colProp.colName);
      const hasTooltip = colProp.toolTip !== "";

      // Build the header content with appropriate tooltip/click behavior
      const renderHeaderContent = () => {
        if (isClickable && hasTooltip) {
          // Mobile-friendly: first tap shows tooltip, second tap triggers click
          return (
            <MobileFriendlyOverlayTrigger
              placement="top"
              overlay={tooltip}
              onClickWhenVisible={(ev) => onHeaderClick(colKey, ev)}
            >
              <span className={styles.clickableHeader}>{headerContent}</span>
            </MobileFriendlyOverlayTrigger>
          );
        } else if (isClickable) {
          // Clickable but no tooltip - direct click handler
          return (
            <span
              className={styles.clickableHeader}
              onClick={(ev) => onHeaderClick(colKey, ev)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  onHeaderClick(colKey, ev);
                }
              }}
            >
              {headerContent}
            </span>
          );
        } else if (hasTooltip) {
          // Tooltip but not clickable - standard overlay trigger
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <span>{headerContent}</span>
            </OverlayTrigger>
          );
        } else {
          // No tooltip, not clickable
          return headerContent;
        }
      };

      return (
        <th
          key={"" + index}
          style={style}
          className={maybeRepeatingHeader?.className}
        >
          {renderHeaderContent()}
          {insertCopyButton(index == 0)}
          {insertConfigureDropdown(index == 0)}
          {index == 0 ? insertTooltipLockMode() : null}
        </th>
      );
    });
  }
  function renderTableRow(
    row: GenericTableDataRow,
    mutableRowOffsetMap: Record<string, number>
  ) {
    var rowIndex = 0;
    var tooltipColIndex = 0;
    const prefixType = row.prefixFn("");
    return Object.entries(tableFields).map((keyVal, index) => {
      if (0 == index) {
        // Update mutableRowOffsetMap
        rowIndex = _.get(mutableRowOffsetMap, prefixType, 0);
        _.set(mutableRowOffsetMap, prefixType, rowIndex + 1);
      }
      const key: string = keyVal[0];
      const colProp: GenericTableColProps =
        row.tableFieldsOverride?.[key] || keyVal[1];
      const actualKey = row.prefixFn(key);
      const tmpVal = row.dataObj[actualKey] || colProp.missingData;
      const rankOrPctile = _.thru(integratedGrades, (gradeSettings) => {
        if (gradeSettings) {
          const gradeKey =
            gradeSettings.customKeyMappings?.[actualKey] || actualKey;
          const tmpGrade = row.dataObj?.grades?.[gradeKey];
          const maybePctile = tmpGrade?.value;
          const pctile = maybePctile || 0;
          const samples = tmpGrade?.samples * pctile;
          const topPctle = gradeSettings.topPctle || 0.75;
          const bottomPctle = gradeSettings.bottomPctle || 0.25;
          const maybeAddWarning = (
            el: React.ReactNode,
            extraInfo: string | undefined
          ) => {
            if (extraInfo) {
              const tooltipId = `gradeTooltip_${rowIndex}_${prefixType}`;
              const tooltip = (
                <Tooltip id={tooltipId}>
                  <span>{extraInfoLookups?.[extraInfo] || extraInfo}</span>
                </Tooltip>
              );
              return (
                <OverlayTrigger placement="auto" overlay={tooltip}>
                  <div>
                    {el}
                    <small>
                      <sup className={styles.infoBadge}></sup>
                    </small>
                  </div>
                </OverlayTrigger>
              );
            } else {
              return el;
            }
          };
          if (gradeSettings.hybridMode && gradeSettings.exactRanks) {
            // show top/bottom as exact ranks or %iles
            if (
              pctile >= topPctle ||
              pctile <= bottomPctle ||
              gradeSettings.alwaysShow?.[gradeKey]
            ) {
              if (samples > 0 && !_.isNil(maybePctile)) {
                return maybeAddWarning(
                  GenericTableOps.gradeOrHtmlFormatter(tmpGrade),
                  tmpGrade?.extraInfo
                );
              } else if (!_.isNil(maybePctile)) {
                return maybeAddWarning(
                  <small>{`${(pctile * 100).toFixed(0)}%`}</small>,
                  tmpGrade?.extraInfo
                );
              } else {
                return undefined;
              }
            } else {
              return undefined;
            }
          } else if (gradeSettings.hybridMode) {
            // show top as ranks, bottom as %iles
            //(in rank mode still shows %les for the bad %iles)
            if (
              samples > 0 &&
              !_.isNil(maybePctile) &&
              (pctile >= topPctle || gradeSettings.alwaysShow?.[gradeKey])
            ) {
              return maybeAddWarning(
                GenericTableOps.approxRankOrHtmlFormatter(tmpGrade),
                tmpGrade?.extraInfo
              );
            } else if (
              samples > 0 &&
              !_.isNil(maybePctile) &&
              (pctile <= bottomPctle || gradeSettings.alwaysShow?.[gradeKey])
            ) {
              return maybeAddWarning(
                <small>{`${(pctile * 100).toFixed(0)}%`}</small>,
                tmpGrade?.extraInfo
              );
            } else if (
              !_.isNil(maybePctile) &&
              (pctile >= topPctle || pctile <= bottomPctle)
            ) {
              return maybeAddWarning(
                <small>{`${(pctile * 100).toFixed(0)}%`}</small>,
                tmpGrade?.extraInfo
              );
            } else {
              return undefined;
            }
          } else {
            // show all
            if (samples > 0 && !_.isNil(maybePctile)) {
              return maybeAddWarning(
                gradeSettings.exactRanks
                  ? GenericTableOps.gradeOrHtmlFormatter(tmpGrade)
                  : GenericTableOps.approxRankOrHtmlFormatter(tmpGrade),
                tmpGrade?.extraInfo
              );
            } else if (!_.isNil(maybePctile)) {
              return maybeAddWarning(
                <small>{`${(pctile * 100).toFixed(0)}%`}</small>,
                tmpGrade?.extraInfo
              );
            } else {
              return undefined;
            }
          }
        } else {
          return undefined;
        }
      });
      const gradeColorOverride = _.thru(
        row.dataObj?.grades?.[actualKey]?.value,
        (pctileToUse) => {
          if (integratedGrades && !_.isNil(pctileToUse)) {
            const colorChoice = _.find(
              integratedGrades.colorChooser,
              (choice: IntegratedGradeSettingsColorChoice) => {
                const cellMeta = row.cellMetaFn(key, tmpVal);
                const actualResult = colProp.colorPicker(
                  { value: choice.valToTest },
                  cellMeta
                );
                const matches = choice.expectedResult == actualResult;
                return matches;
              }
            );
            return colorChoice?.gradeColor(pctileToUse);
          } else {
            return undefined;
          }
        }
      );
      const style = getRowStyle(
        key,
        tmpVal,
        colProp,
        row,
        !_.isNil(rankOrPctile),
        gradeColorOverride
      );
      const valBuilder = (inVal: any) => {
        if (_.isNil(tmpVal)) {
          const maybeSpecialCase = GenericTableOps.maybeSpecialCase(
            colProp.colName
          );
          if (maybeSpecialCase) {
            return (
              <span
                style={{
                  display: "inline-block",
                  width: "1ch",
                  wordBreak: "break-all",
                  lineHeight: 1.2,
                  textAlign: "center",
                  fontSize: "0.6em",
                }}
              >
                <b>{maybeSpecialCase[row.cellMetaFn(key, tmpVal)] || ""}</b>
              </span>
            );
          } else {
            // normal separator
            return "";
          }
        } else {
          try {
            return colProp.formatter(inVal, actualKey);
          } catch (err: unknown) {
            //handle formatting errors by making it return blank
            return "";
          }
        }
      };
      const val = valBuilder(tmpVal) || "";

      const hasTooltip = (cellVal: any) => {
        return cellVal?.override || cellVal?.extraInfo;
      };
      tooltipColIndex = hasTooltip(tmpVal)
        ? tooltipColIndex + 1
        : tooltipColIndex;
      const cellTooltipId =
        lockMode == "col"
          ? `tooltip_${index}_${actualKey}`
          : `tooltip_${rowIndex}_${prefixType}`;
      const cellTooltip = hasTooltip(tmpVal) ? (
        <Tooltip id={cellTooltipId}>
          {tmpVal?.override ? (
            <span>
              Original Value:{" "}
              {_.isNil(tmpVal?.old_value)
                ? "unknown"
                : valBuilder({ value: tmpVal?.old_value }) ||
                  colProp.missingData}
              <br />
              {tmpVal?.override}
            </span>
          ) : null}
          {tmpVal?.extraInfo && tmpVal?.override ? (
            <span>
              <br />
              <br />
            </span>
          ) : null}
          {tmpVal?.extraInfo ? (
            <span>
              {extraInfoLookups?.[tmpVal?.extraInfo] || tmpVal?.extraInfo}
            </span>
          ) : null}
        </Tooltip>
      ) : null;

      const addTooltipIndicator = (viewVal: any, cellVal: any) => {
        const addOverrideIndicator = (viewVal: any) => {
          return cellVal?.override ? <u>{viewVal}</u> : viewVal;
        };
        const addExtraInfoIndicator = (viewVal: any) => {
          return cellVal?.extraInfo ? (
            <div>
              {viewVal}
              <small>
                <sup className={styles.infoBadge}></sup>
              </small>
            </div>
          ) : (
            viewVal
          );
        };
        return addExtraInfoIndicator(addOverrideIndicator(viewVal));
      };

      const placement =
        lockMode == "col"
          ? rowIndex % 2 == 0
            ? "left"
            : "right"
          : tooltipColIndex % 2 == 0
          ? "top"
          : "bottom";
      const cellMeta = row.cellMetaFn(key, val);
      const rowSpan = colProp.rowSpan(cellMeta);
      const className = colProp.className;
      const colSpan = row.colSpanOverride ? row.colSpanOverride(key) : 1;
      return rowSpan > 0 && colSpan > 0 ? (
        <td
          className={className}
          rowSpan={rowSpan}
          colSpan={colSpan}
          key={"" + index}
          style={{
            ...style,
            ...(actualKey == sortField
              ? {
                  fontWeight: 550,
                }
              : {}),
          }}
        >
          {cellTooltip != null ? (
            lockMode == "row" || lockMode == "col" ? (
              <GroupedOverlayTrigger
                placement={placement}
                show={cellOverlayShowStates[cellTooltipId]}
                onShowOrHide={(show) =>
                  setCellOverlayShowStates({ [cellTooltipId]: show })
                }
                overlay={cellTooltip}
              >
                {addTooltipIndicator(val, tmpVal)}
              </GroupedOverlayTrigger>
            ) : (
              <OverlayTrigger placement="auto" overlay={cellTooltip}>
                {addTooltipIndicator(val, tmpVal)}
              </OverlayTrigger>
            )
          ) : _.isString(val) ? (
            val
              .split("\n")
              .map((l, index2) => (
                <div key={"s" + `${index}_${index2}`}>{l}</div>
              ))
          ) : (
            //(if not string must be element)
            val
          )}
          {rankOrPctile && (
            <div
              style={{
                textAlign: "center",
                fontSize: "0.8em",
                marginTop: "0px",
              }}
            >
              {rankOrPctile}
            </div>
          )}
        </td>
      ) : null;
    });
  }
  function renderTableRows() {
    var prefixAwareDataMap = {} as Record<string, number>;
    return tableData.map((row, index) => {
      if (row instanceof GenericTableDataRow) {
        return (
          <tr ref={row.navigationRef} key={"" + index}>
            {renderTableRow(row, prefixAwareDataMap)}
          </tr>
        );
      } else if (row instanceof GenericTableTextRow) {
        return (
          <tr ref={row.navigationRef} key={"" + index}>
            <td colSpan={totalTableCols} className={row.className}>
              {row.text}
            </td>
          </tr>
        );
      } else if (row instanceof GenericTableSubHeaderRow) {
        return (
          <tr ref={row.navigationRef} key={"" + index}>
            {row.cols.map((col, colIndex) => {
              return (
                <td
                  key={"col" + index + colIndex}
                  colSpan={row.spans?.[colIndex] || 1}
                  className={row.className}
                >
                  {col}
                </td>
              );
            })}
          </tr>
        );
      } else if (row instanceof GenericTableRepeatHeaderRow) {
        return <tr ref={row.navigationRef}>{renderTableHeaders(row)}</tr>;
      } else if (row instanceof GenericTableSeparator && row.padding) {
        //(separator, don't merge the cols because we don't have cell boundaries and that messes up spreadsheet)
        return (
          <tr className="divider" key={"" + index}>
            {_.range(totalTableCols).map((i, j) => (
              <td key={"" + j} style={{ padding: row.padding }}></td>
            ))}
          </tr>
        );
      } else {
        //(separator, don't merge the cols because we don't have cell boundaries and that messes up spreadsheet)
        return (
          <tr className="divider" key={"" + index}>
            {_.range(totalTableCols).map((i, j) => (
              <td key={"" + j}></td>
            ))}
          </tr>
        );
      }
    });
  }

  function getColStyle(colProps: GenericTableColProps) {
    return {
      textAlign: colProps.isTitle
        ? ("right" as "right")
        : ("center" as "center"),
      width: ((100.0 * colProps.widthUnits) / totalWidthUnits).toFixed(1) + "%",
      fontWeight: "bold" as "bold",
    };
  }
  function getRowStyle(
    key: string,
    val: any | null | undefined,
    colProps: GenericTableColProps,
    row: GenericTableDataRow,
    hasRank: boolean,
    gradeColorOverride?: string
  ) {
    const backgroundColorFn = () => {
      if (!_.isNil(val)) {
        const cellMeta = row.cellMetaFn(key, val);
        return colProps.colorPicker(val, cellMeta);
      } else return undefined;
    };
    const colorToUse = gradeColorOverride ?? backgroundColorFn();
    // I wanted some clever code that used the background color to decide on black vs white
    // but actually can do something cheaper, since background color override doesn't currently change with
    // theme, and was designed to work black text:
    const colorOverride = colorToUse ? "black" : undefined;
    // const colorOverride = _.thru(colorToUse, (maybeColor) => {
    //   if (maybeColor) {
    //     const chromaColor = chroma(maybeColor);
    //     return chromaColor.hsv()[2] < 0.5 ? "white" : "black";
    //   } else {
    //     return undefined;
    //   }
    // });
    return {
      textAlign: colProps.isTitle
        ? ("right" as "right")
        : ("center" as "center"),
      width: ((100.0 * colProps.widthUnits) / totalWidthUnits).toFixed(1) + "%",
      fontWeight:
        colProps.isTitle && _.isString(val)
          ? ("bold" as "bold")
          : ("normal" as "normal"),
      backgroundColor: colorToUse,
      verticalAlign: "middle",
      ...rowStyleOverride,
      color: colorOverride || (resolvedTheme == "dark" ? "#ebebeb" : "#525252"),
      // Reduce left/right padding if it's a special col separator
      ...(GenericTableOps.maybeSpecialCase(colProps.colName) && {
        paddingLeft: "5px",
        paddingRight: "5px",
        opacity: "0.5",
      }),
      // Reduce bottom padding when showing percentile
      ...(hasRank && { paddingBottom: "2px" }),
    };
  }
  const isResponsive = _.isNil(responsive) ? true : responsive;
  const isBordered = _.isNil(bordered) ? false : bordered;
  return (
    <>
      <Table
        className={growsToFit ? "grows-to-fit" : undefined}
        bordered={isBordered}
        responsive={isResponsive && lockMode != "row"}
        id={tableId}
        size="sm"
      >
        <thead>
          <tr>{renderTableHeaders()}</tr>
        </thead>
        <tbody>{renderTableRows()}</tbody>
      </Table>
      <ColumnConfigModal
        show={showColumnConfig}
        onHide={() => setShowColumnConfig(false)}
        onSave={handleColumnConfigSave}
        tableFields={baseTableFields}
        extraColSets={extraColSets}
        currentConfig={columnConfig}
      />
    </>
  );
};
export default GenericTable;
