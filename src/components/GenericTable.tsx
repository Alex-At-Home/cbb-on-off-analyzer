// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

import styles from "./GenericTable.module.css";
import GroupedOverlayTrigger from "./shared/GroupedOverlayTrigger";

// Themes
import chroma from "chroma-js";
import { useTheme } from "next-themes";

// Bootstrap imports:
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

// Libary imports
import ClipboardJS from "clipboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { faCircle } from "@fortawesome/free-solid-svg-icons";
import { faArrowAltCircleRight } from "@fortawesome/free-solid-svg-icons";
import { faArrowAltCircleDown } from "@fortawesome/free-solid-svg-icons";

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
      val: any
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
  readonly formatter: (val: any) => string | React.ReactNode;
  readonly colorPicker: GenericTableColorPickerFn;
  readonly rowSpan: (key: string) => number;
  readonly missingData: any | undefined;
  readonly className: string;
}
class GenericTableDataRow {
  //TODO: remove generic table
  constructor(
    dataObj: any,
    prefixFn: (key: string) => string,
    cellMetaFn: (key: string, value: any) => string, //TODO: make this a generic
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
  readonly kind: string = "separator";
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
  | GenericTableSubHeaderRow;
export class GenericTableOps {
  static readonly defaultFormatter = (val: any) => "" + val;
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
  static readonly gradeOrHtmlFormatter = (val: any) => {
    if (React.isValidElement(val)) {
      return GenericTableOps.htmlFormatter(val as React.ReactNode);
    } else if (val.samples) {
      const numSamples = val.samples || 0;
      const pcile = val.value || 0;
      const rank = 1 + Math.round((1 - pcile) * numSamples); //(+1, since 100% is rank==1)
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
      const pcile = val.value || 0;
      const rank = 1 + Math.round((1 - pcile) * numSamples); //(+1, since 100% is rank==1)

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
  static buildRowSeparator(): GenericTableRow {
    return new GenericTableSeparator();
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
    formatter: (val: any) => string | React.ReactNode
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
}
type LockModes = "col" | "none" | "row" | "missing";
const nextLockMode: Record<LockModes, LockModes> = {
  none: "col",
  col: "row",
  row: "none",
  missing: "missing",
};
type Props = {
  responsive?: boolean;
  tableFields: Record<string, GenericTableColProps>;
  tableData: Array<GenericTableRow>;
  tableCopyId?: string;
  cellTooltipMode?: LockModes;
  bordered?: boolean;
  rowStyleOverride?: Record<string, any>;
  extraInfoLookups?: Record<string, string>; //(lets us use codes for common strings)
};
const GenericTable: React.FunctionComponent<Props> = ({
  responsive,
  tableFields,
  tableData,
  tableCopyId,
  cellTooltipMode,
  bordered,
  rowStyleOverride,
  extraInfoLookups,
}) => {
  const { resolvedTheme } = useTheme();
  const [lockMode, setLockMode] = useState(
    (cellTooltipMode || "missing") as LockModes
  );
  const [cellOverlayShowStates, setCellOverlayShowStates] = useState(
    {} as Record<string, boolean>
  );

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
        return (
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
    function insertTooltipLockMode() {
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
      if (isRepeatingHeaderRow && typeof s === "string") {
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
    return Object.values(tableFields).map((colProp, index) => {
      const style = getColStyle(colProp);
      const tooltip = (
        <Tooltip id={`${toolTipId}-${index}`}>{colProp.toolTip}</Tooltip>
      );
      const header = (
        <th
          key={"" + index}
          style={style}
          className={maybeRepeatingHeader?.className}
        >
          {maybeFormatColName(colProp.colName)}
          {insertCopyButton(index == 0)}
          {index == 0 ? insertTooltipLockMode() : null}
        </th>
      );
      return colProp.toolTip == "" ? (
        header
      ) : (
        <OverlayTrigger placement="top" overlay={tooltip} key={"" + index}>
          {header}
        </OverlayTrigger>
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
      const style = getRowStyle(key, tmpVal, colProp, row);
      const valBuilder = (inVal: any) => {
        try {
          return colProp.formatter(inVal);
        } catch (err: unknown) {
          //handle formatting errors by making it return blank
          return "";
        }
      };
      //(the isNil handles separators)
      const val = _.isNil(tmpVal) ? "" : valBuilder(tmpVal) || "";

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
          style={style}
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
    row: GenericTableDataRow
  ) {
    const backgroundColorFn = () => {
      if (!_.isNil(val)) {
        const cellMeta = row.cellMetaFn(key, val);
        return colProps.colorPicker(val, cellMeta);
      } else return undefined;
    };
    const colorToUse = backgroundColorFn();
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
    };
  }
  const isResponsive = _.isNil(responsive) ? true : responsive;
  const isBordered = _.isNil(bordered) ? false : bordered;
  return (
    <Table
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
  );
};
export default GenericTable;
