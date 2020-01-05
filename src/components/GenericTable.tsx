// React imports:
import React, { useState, useEffect } from 'react';

// Next imports:
import { NextPage } from 'next';

// Lodash:
import _ from "lodash";

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
    formatter: (val: any) => string = GenericTableOps.defaultFormatter,
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
  readonly formatter: (val: any) => string;
  readonly colorPicker:  GenericTableColorPickerFn;
  readonly rowSpan: (key: string) => number;
  readonly missingData: any | undefined;
  readonly className: string;
}
class GenericTableDataRow { //TODO: remove generic table
  constructor(
    dataObj: any,
    prefixFn: (key: string) => string,
    cellMetaFn: (key: string, value: any) => string //TODO: make this a generic
  ) {
    this.dataObj = dataObj;
    this.prefixFn = prefixFn;
    this.cellMetaFn = cellMetaFn;
  }
  readonly kind: string = "data-row";
  readonly dataObj: any;
  readonly prefixFn: (key: string) => string;
  readonly cellMetaFn: (key: string, value: any) => string;
}
class GenericTableSeparator {
  readonly kind: string = "separator";
}
export type GenericTableRow = GenericTableDataRow | GenericTableSeparator;
export class GenericTableOps {

  static readonly defaultFormatter = (val: any) => "" + val;
  static readonly percentFormatter = (val: any) => ((val as number)*100.0).toFixed(1); //(no % it's too ugly)
  static readonly pointsFormatter = (val: any) => (val as number).toFixed(1);
  static readonly defaultCellMeta = (key: string, value: any) => "";
  static readonly defaultColorPicker =  (val: any, cellMeta: string) => undefined;
  static readonly defaultRowSpanCalculator = (key: string) => 1;

  // Rows:

  static buildDataRow(dataObj: any, prefixFn: (key: string) => string, cellMetaFn: (key: string, value: any) => string): GenericTableRow {
    return new GenericTableDataRow(dataObj, prefixFn, cellMetaFn);
  }
  static buildRowSeparator(): GenericTableRow {
    return new GenericTableSeparator();
  }

  // Cols:

  static addPctCol(colName: string, toolTip: string, colorPicker: GenericTableColorPickerFn) {
    return new GenericTableColProps(colName, toolTip, 2, false, GenericTableOps.percentFormatter, colorPicker, GenericTableOps.defaultRowSpanCalculator, 0.0);
  }
  static addPtsCol(colName: string, toolTip: string, colorPicker: GenericTableColorPickerFn) {
    return new GenericTableColProps(colName, toolTip, 2, false, GenericTableOps.pointsFormatter, colorPicker, GenericTableOps.defaultRowSpanCalculator, 0);
  }
  static addIntCol(colName: string, toolTip: string, colorPicker: GenericTableColorPickerFn) {
    return new GenericTableColProps(colName, toolTip, 2, false, GenericTableOps.defaultFormatter, colorPicker, GenericTableOps.defaultRowSpanCalculator, 0);
  }
  static addTitle(
    colName: string, toolTip: string,
    rowSpan: (key: string) => number = GenericTableOps.defaultRowSpanCalculator,
    className: string = ""
  ) {
    return new GenericTableColProps(colName, toolTip, 8, true,
      GenericTableOps.defaultFormatter, GenericTableOps.defaultColorPicker,
      rowSpan, undefined, className
    );
  }
  static addColSeparator() {
    return new GenericTableColProps("", "", 1);
  }
}
type Props = {
  tableFields: Record<string, GenericTableColProps>,
  tableData: Array<GenericTableRow>,
  tableCopyId?: string
}
const GenericTable: React.FunctionComponent<Props> = ({tableFields, tableData, tableCopyId}) => {

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
        const colProp: GenericTableColProps = keyVal[1];
        const actualKey = row.prefixFn(key);
        const tmpValObj = row.dataObj[actualKey] || {};
        const tmpVal = ((tmpValObj instanceof Object) ? tmpValObj.value : tmpValObj) || colProp.missingData;
        const style = getRowStyle(key, tmpVal, colProp, row);
        const val = !_.isNil(tmpVal) ? colProp.formatter(tmpVal) : "";

        const cellMeta = row.cellMetaFn(key, val);
        const rowSpan = colProp.rowSpan(cellMeta);
        const className = colProp.className;

        return (rowSpan > 0) ?
            <td
              className={className}
              rowSpan={rowSpan}
              key={"" + index} style={style}
            >{val.split('\n').map((l, index2) => <div key={"" + `${index}_${index2}`}>{l}</div>)}</td>
          :
            (null);
    });
  }
  function renderTableRows() {
    return tableData.map((row, index) => {
      if (row instanceof GenericTableDataRow) {
        return <tr key={"" + index}>{ renderTableRow(row) }</tr>;
      } else {
        return <tr className="divider" key={"" + index}><td colSpan={totalTableCols}></td></tr>;
      }
    });
  }

  function getColStyle(colProps: GenericTableColProps)
  {
    return {
      textAlign: colProps.isTitle ? ("right" as "right") : ("center" as "center"),
      width: (100.0*colProps.widthUnits/totalWidthUnits).toFixed(1) + "%",
      fontWeight: ("bold" as "bold")
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
      fontWeight: colProps.isTitle ? ("bold" as "bold") : ("normal" as "normal"),
      backgroundColor: backgroundColorFn()
    };
  }

  // (tooltips don't work if table has `responsive` attribute, see popper.js #276)
  return <Table id={tableId} size="sm">
    <thead>
      <tr>{ renderTableHeaders() }</tr>
    </thead>
    <tbody>{ renderTableRows() }</tbody>
  </Table>;
}
export default GenericTable;
