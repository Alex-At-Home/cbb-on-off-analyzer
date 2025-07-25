// React imports:
import React, { useState, useEffect } from "react";

// Bootstrap imports:
import Modal from "react-bootstrap/Modal";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

// Date range imports:
import "react-date-range/dist/styles.css"; // main css file
import "react-date-range/dist/theme/default.css"; // theme css file
//@ts-ignore
import { DateRangePicker, defaultStaticRanges } from "react-date-range";
//@ts-ignore
import { addDays, addMonths, isSameDay } from "date-fns";
import { ParamDefaults } from "../../utils/FilterModels";
import { QueryUtils, CommonFilterCustomDate } from "../../utils/QueryUtils";

type Props = {
  show: boolean;
  queryType: string;
  year: string;
  onSave: (filter: CommonFilterCustomDate | undefined) => void;
  onHide: () => void;
};

const DateRangeModal: React.FunctionComponent<Props> = ({
  queryType,
  year,
  onSave,
  ...props
}) => {
  const isActiveYear =
    (year || ParamDefaults.defaultYear) == ParamDefaults.defaultYear;
  const staticRangeLabels: Record<string, boolean> = {
    "This Month": isActiveYear,
    "Last Month": isActiveYear,
  };

  const startNov = addDays(
    Date.parse(`${(year || ParamDefaults.defaultYear).substring(0, 4)}-11-01`),
    1
  );
  const minDate = addDays(startNov, -1); //(for some reason this is needed to make the selection work, else it always says it's Dec)
  const endDec = addDays(
    Date.parse(`${(year || ParamDefaults.defaultYear).substring(0, 4)}-12-31`),
    1
  );
  const startJan = addDays(endDec, 1);
  const endApril = addMonths(endDec, 4);
  const maxDate = endApril;

  const [state, setState] = useState([
    {
      startDate: startNov,
      endDate: endApril,
      key: "selection",
    },
  ]);

  const subsetOfStaticRanges = defaultStaticRanges.filter(
    (rangeObj: any) => staticRangeLabels[rangeObj.label as string]
  );
  const thirtyDaysAgo = addDays(new Date(), -29);
  const tenDaysAgo = addDays(new Date(), -9);
  const today = new Date();
  const moreOptions = [
    {
      label: "Nov/Dec",
      range: () => ({
        startDate: startNov,
        endDate: endDec,
      }),
      isSelected: (range: any) => {
        return (
          isSameDay(range.startDate as Date, startNov) &&
          isSameDay(range.endDate as Date, endDec)
        );
      },
    },
    {
      label: "Jan/Apr",
      range: () => ({
        startDate: startJan,
        endDate: endApril,
      }),
      isSelected: (range: any) => {
        return (
          isSameDay(range.startDate as Date, startJan) &&
          isSameDay(range.endDate as Date, endApril)
        );
      },
    },
  ].concat(
    isActiveYear
      ? [
          {
            label: "Last 30 days",
            range: () => ({
              startDate: thirtyDaysAgo,
              endDate: today,
            }),
            isSelected: (range: any) => {
              return (
                isSameDay(range.startDate as Date, thirtyDaysAgo) &&
                isSameDay(range.endDate as Date, today)
              );
            },
          },
          {
            label: "Last 10 days",
            range: () => ({
              startDate: tenDaysAgo,
              endDate: today,
            }),
            isSelected: (range: any) => {
              return (
                isSameDay(range.startDate as Date, tenDaysAgo) &&
                isSameDay(range.endDate as Date, today)
              );
            },
          },
        ]
      : []
  );

  return (
    <Modal size="lg" scrollable={true} {...props}>
      <Modal.Header closeButton>
        <Modal.Title>Select Date Range Filter for {queryType}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row className="justify-content-center">
            <Col xs={"auto"}>
              <DateRangePicker
                onChange={(item: any) => {
                  setState([item.selection]);
                }}
                months={1}
                minDate={minDate}
                maxDate={maxDate}
                direction="vertical"
                scroll={{ enabled: true }}
                ranges={state}
                staticRanges={[...moreOptions, ...subsetOfStaticRanges]}
              />
            </Col>
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="warning"
          onClick={() => {
            onSave(undefined);
            props.onHide();
          }}
        >
          Clear
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onSave({
              kind: QueryUtils.customDateAliasName,
              start: state[0].startDate,
              end: state[0].endDate,
            });
            props.onHide();
          }}
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default DateRangeModal;
