// React imports:
import React, { useState, useEffect } from 'react';

// Next imports:
import { NextPage } from 'next';

// Lodash:
import _ from "lodash";

import "./GenericTable.css";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';

// Libary imports
import ClipboardJS from 'clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboard } from '@fortawesome/free-solid-svg-icons'

type GenericTableColorPickerFn =  (val: any, cellMeta: string) => string | undefined
export class GenericTableColProps {
  constructor(
    colName: string, toolTip: string,
    widthUnits: number, isTitle: boolean = false,
    formatter: (val: any) => string | React.ReactNode = GenericTableOps.defaultFormatter,
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
  readonly colName: string;
  readonly toolTip: string;
  readonly widthUnits: number;
  readonly isTitle: boolean;
  readonly formatter: (val: any) => string | React.ReactNode;
  readonly colorPicker:  GenericTableColorPickerFn;
  readonly rowSpan: (key: string) => number;
  readonly missingData: any | undefined;
  readonly className: string;
}
class GenericTableDataRow { //TODO: remove generic table
  constructor(
    dataObj: any,
    prefixFn: (key: string) => string,
    cellMetaFn: (key: string, value: any) => string, //TODO: make this a generic
    tableFieldsOverride: Record<string, GenericTableColProps> | undefined
  ) {
    this.dataObj = dataObj;
    this.prefixFn = prefixFn;
    this.cellMetaFn = cellMetaFn;
    this.tableFieldsOverride = tableFieldsOverride;
  }
  readonly kind: string = "data-row";
  readonly dataObj: any;
  readonly prefixFn: (key: string) => string;
  readonly cellMetaFn: (key: string, value: any) => string;
  readonly tableFieldsOverride: Record<string, GenericTableColProps> | undefined;
}
class GenericTableSeparator {
  readonly kind: string = "separator";
}
class GenericTableTextRow {
  constructor(
      text: React.ReactNode,
      className: string
  ) {
    this.text = text;
    this.className = className;
  }
  readonly kind: string = "text-row";
  readonly text: React.ReactNode;
  readonly className: string;
}
export type GenericTableRow = GenericTableDataRow | GenericTableSeparator | GenericTableTextRow;
export class GenericTableOps {

  static readonly defaultFormatter = (val: any) => "" + val;
  static readonly htmlFormatter = (val: React.ReactNode) => val;
  static readonly intFormatter = (val: any) => "" + (val.value as number).toFixed(0);
  static readonly percentFormatter = (val: any) => {
    return (val.value >= 1) ?
        ((val.value as number)*100.0).toFixed(0) //(remove the .0 in the 100% case)
      : ((val.value as number)*100.0).toFixed(1); //(no % it's too ugly)
  }
  static readonly percentOrHtmlFormatter = (val: any) => {
    if (React.isValidElement(val)) {
      return GenericTableOps.htmlFormatter(val as React.ReactNode);
    } else {
      return GenericTableOps.percentFormatter(val);
    }
  }
  static readonly pointsFormatter = (val: any) => (val.value as number).toFixed(1);
  static readonly defaultCellMeta = (key: string, value: any) => "";
  static readonly defaultColorPicker =  (val: any, cellMeta: string) => undefined;
  static readonly defaultRowSpanCalculator = (key: string) => 1;

  // Rows:

  static buildDataRow(
    dataObj: any,
    prefixFn: (key: string) => string,
    cellMetaFn: (key: string, value: any) => string,
    tableFieldsOverride: Record<string, GenericTableColProps> | undefined = undefined
  ): GenericTableRow {
    return new GenericTableDataRow(dataObj, prefixFn, cellMetaFn, tableFieldsOverride);
  }
  static buildTextRow(text: React.ReactNode, className: string = ""): GenericTableRow {
    return new GenericTableTextRow(text, className);
  }
  static buildRowSeparator(): GenericTableRow {
    return new GenericTableSeparator();
  }

  // Cols:

  static addPctCol(colName: string, toolTip: string, colorPicker: GenericTableColorPickerFn) {
    return new GenericTableColProps(colName, toolTip, 2, false, GenericTableOps.percentFormatter, colorPicker, GenericTableOps.defaultRowSpanCalculator, undefined);
  }
  static addPtsCol(colName: string, toolTip: string, colorPicker: GenericTableColorPickerFn) {
    return new GenericTableColProps(colName, toolTip, 2, false, GenericTableOps.pointsFormatter, colorPicker, GenericTableOps.defaultRowSpanCalculator, undefined);
  }
  static addIntCol(colName: string, toolTip: string, colorPicker: GenericTableColorPickerFn) {
    return new GenericTableColProps(colName, toolTip, 2, false, GenericTableOps.intFormatter, colorPicker, GenericTableOps.defaultRowSpanCalculator, undefined);
  }
  static addDataCol(colName: string, toolTip: string, colorPicker: GenericTableColorPickerFn, formatter: (val: any) => string | React.ReactNode) {
    return new GenericTableColProps(colName, toolTip, 2, false, formatter, colorPicker, GenericTableOps.defaultRowSpanCalculator, undefined);
  }
  static addTitle(
    colName: string, toolTip: string,
    rowSpan: (key: string) => number = GenericTableOps.defaultRowSpanCalculator,
    className: string = "",
    colFormatterOverride: (val: any) => string | React.ReactNode = GenericTableOps.defaultFormatter,
    widthOverride: number = 8
  ) {
    return new GenericTableColProps(colName, toolTip, widthOverride, true,
      colFormatterOverride, GenericTableOps.defaultColorPicker,
      rowSpan, undefined, className
    );
  }
  static addColSeparator(width: number = 0.5) {
    return new GenericTableColProps("", "", width);
  }
}
type Props = {
  responsive?: boolean,
  tableFields: Record<string, GenericTableColProps>,
  tableData: Array<GenericTableRow>,
  tableCopyId?: string
}
const GenericTable: React.FunctionComponent<Props> = ({responsive, tableFields, tableData, tableCopyId}) => {

  const tableId: string = tableCopyId || Math.random().toString(36).substring(8);
  const buttonId = tableId + "_copy";
  const toolTipId = tableId + "_toolTip";

  const [ clipboard, setClipboard] = useState(null as null | ClipboardJS);
  useEffect(() => {
    // This grovelling is needed to ensure that clipboard is only loaded client side
    if ((null == clipboard) && (typeof tableCopyId === "string")) {
      var newClipboard = new ClipboardJS(`#${buttonId}`, {
        target: function(trigger) {
          return document.getElementById(tableId) as Element; //exists by construction
        }
      });
      newClipboard.on('success', (event: ClipboardJS.Event) => {
        setTimeout(function() {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  });

  const totalTableCols = Object.values(tableFields).length;
  const totalWidthUnits =
    Object.values(tableFields).map((col) => col.widthUnits).reduce((acc, v) => acc + v);

  function renderTableHeaders() {
    function insertCopyButton(insert: boolean) {
      if (tableCopyId && insert) {
        const tooltip = (
          <Tooltip id={`${toolTipId}-copy`}>Copies formatted table to clipboard</Tooltip>
        );
        return  <OverlayTrigger placement="top" overlay={tooltip}>
            <Button className="float-left" id={buttonId} variant="outline-secondary" size="sm">
              <FontAwesomeIcon icon={faClipboard} />
            </Button>
          </OverlayTrigger>;
      }
    }
    return Object.values(tableFields).map((colProp, index) => {
        const style = getColStyle(colProp);
        const tooltip = (
          <Tooltip id={`${toolTipId}-${index}`}>{colProp.toolTip}</Tooltip>
        );
        const header = (
          <th key={"" + index} style={style}>
              {colProp.colName}
              {insertCopyButton(index == 0)}
          </th>
        );
        return (colProp.toolTip == "") ?
          (header)
          :
          (<OverlayTrigger placement="top" overlay={tooltip} key={"" + index}>
            {header}
          </OverlayTrigger>);
    });
  }
  function renderTableRow(row: GenericTableDataRow) {
    return Object.entries(tableFields).map((keyVal, index) => {
        const key: string = keyVal[0];
        const colProp: GenericTableColProps = row.tableFieldsOverride?.[key] || keyVal[1];
        const actualKey = row.prefixFn(key);
        const tmpVal = row.dataObj[actualKey] || colProp.missingData;
        const style = getRowStyle(key, tmpVal, colProp, row);
        const valBuilder = (inVal: any) => {
          try {
            return colProp.formatter(inVal);
          } catch (e) { //handle formatting errors by making it return blank
            return "";
          }
        };
        //(the isNil handles separators)
        const val = _.isNil(tmpVal) ? "" : valBuilder(tmpVal) || "";

        const hasTooltip = (cellVal: any) => {
          return cellVal?.override || cellVal?.extraInfo;
        }
        const cellTooltip = hasTooltip(tmpVal) ?
          <Tooltip id={`tooltip_${index}_${key}`}>
            {tmpVal?.override ? <span>
              Original Value: {valBuilder({value: tmpVal?.old_value}) || colProp.missingData}<br/>
              {tmpVal?.override}
            </span> : null}
            {tmpVal?.extraInfo && tmpVal?.override ? <br/> : null}
            {tmpVal?.extraInfo ? <span>
                {tmpVal?.extraInfo}
            </span> : null}
          </Tooltip> : null;

        const addTooltipIndicator = (viewVal: val, cellVal: any) => {
          const addOverrideIndicator = (viewVal: val) => {
            return cellVal?.override ? <u>{viewVal}</u> : viewVal;
          };
          const addExtraInfoIndicator = (viewVal: val) => {
            return cellVal?.extraInfo ?
              <div>{viewVal}<small><sup className="infoBadge"></sup></small></div> : viewVal;
          };
          return addExtraInfoIndicator(
            addOverrideIndicator(viewVal)
          );
        };

        const cellMeta = row.cellMetaFn(key, val);
        const rowSpan = colProp.rowSpan(cellMeta);
        const className = colProp.className;
        return (rowSpan > 0) ?
            <td
              className={className}
              rowSpan={rowSpan}
              key={"" + index} style={style}
            >{hasTooltip(tmpVal) ?
              <OverlayTrigger placement="auto" overlay={cellTooltip}>
                {addTooltipIndicator(val, tmpVal)}
              </OverlayTrigger>
              :
              (_.isString(val) ?
                val.split('\n').map((l, index2) => <div key={"s" + `${index}_${index2}`}>{l}</div>) :
                //(if not string must be element)
              val)}
            </td>
          :
            (null);
    });
  }
  function renderTableRows() {
    return tableData.map((row, index) => {
      if (row instanceof GenericTableDataRow) {
        return <tr key={"" + index}>{ renderTableRow(row) }</tr>;
      } else if (row instanceof GenericTableTextRow) {
        return <tr key={"" + index}><td colSpan={totalTableCols} className={row.className}>{row.text}</td></tr>;
      } else { //(separator, don't merge the cols because we don't have cell boundaries and that messes up spreadsheet)
        return <tr className="divider" key={"" + index}>{_.range(totalTableCols).map((i, j) => <td key={"" + j}></td>)}</tr>;
      }
    });
  }

  function getColStyle(colProps: GenericTableColProps)
  {
    return {
      textAlign: colProps.isTitle ? ("right" as "right") : ("center" as "center"),
      width: (100.0*colProps.widthUnits/totalWidthUnits).toFixed(1) + "%",
      fontWeight: ("bold" as "bold"),
    };
  }
  function getRowStyle(
    key: string, val: any | null | undefined,
    colProps: GenericTableColProps,
    row: GenericTableDataRow
  ) {
    const backgroundColorFn = () => {
      if (!_.isNil(val)) {
        const cellMeta = row.cellMetaFn(key, val);
        return colProps.colorPicker(val, cellMeta);
      } else return undefined;
    };
    return {
      textAlign: colProps.isTitle ? ("right" as "right") : ("center" as "center"),
      width: (100.0*colProps.widthUnits/totalWidthUnits).toFixed(1) + "%",
      fontWeight: colProps.isTitle && _.isString(val) ? ("bold" as "bold") : ("normal" as "normal"),
      backgroundColor: backgroundColorFn(),
      verticalAlign: "middle"
    };
  }

  // (tooltips don't work if table has `responsive` attribute, see popper.js #276)
  return <Table responsive={responsive} id={tableId} size="sm">
    <thead>
      <tr>{ renderTableHeaders() }</tr>
    </thead>
    <tbody>{ renderTableRows() }</tbody>
  </Table>;
}
export default GenericTable;
