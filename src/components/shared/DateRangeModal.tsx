// React imports:
import React, { useState, useEffect } from 'react';

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from 'react-bootstrap/Modal';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

// Date range imports:
import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file
//@ts-ignore
import { DateRangePicker, defaultStaticRanges } from 'react-date-range';
//@ts-ignore
import { addDays, isSameDay } from 'date-fns';
import { ParamDefaults } from '../../utils/FilterModels';
import { QueryUtils, CommonFilterCustomDate } from '../../utils/QueryUtils';

type Props = {
   show: boolean
   queryType: string,
   year: string,
   onSave: (filter: CommonFilterCustomDate | undefined) => void
   onHide: () => void
};

const staticRangeLabels: Record<string, boolean> = {
   "This Week": true, "Last Week": true, "This Month": true, "Last Month": true
};

const DateRangeModal: React.FunctionComponent<Props> = ({queryType, year, onSave, ...props}) => {
   const [state, setState] = useState([
      {
        startDate: addDays(new Date(), -14),
        endDate: new Date(),
        key: 'selection'
      }
    ]);
    
   const subsetOfStaticRanges = defaultStaticRanges.filter((rangeObj: any) => staticRangeLabels[rangeObj.label as string]);
   const thirtyDaysAgo = addDays(new Date(), -29);
   const tenDaysAgo = addDays(new Date(), -9);
   const today = new Date();
   const moreOptions = [
      {
         label: "Last 30 days",
         range: () => ({
            startDate: thirtyDaysAgo,
            endDate: today
         }),
         isSelected: (range: any) => {
            return isSameDay(range.startDate as Date, thirtyDaysAgo) && isSameDay(range.endDate as Date, today)
         }
      },
      {
         label: "Last 10 days",
         range: () => ({
            startDate: tenDaysAgo,
            endDate: today
         }),
         isSelected: (range: any) => {
            return isSameDay(range.startDate as Date, tenDaysAgo) && isSameDay(range.endDate as Date, today)
         }
      },
   ];

   const minDate = Date.parse(`${(year || ParamDefaults.defaultYear).substring(0, 4)}-11-01`);
   const maxDate = Number.isNaN(minDate) ? NaN : addDays(minDate, 210);
   return <Modal size="lg" scrollable={true} {...props}>
      <Modal.Header closeButton>
         <Modal.Title>Select Date Range Filter for {queryType}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
         <Container>
            <Row className='justify-content-center'>
               <Col xs={"auto"}>
                  <DateRangePicker
                     onChange={(item: any) => setState([item.selection])}
                     months={1}
                     minDate={Number.isNaN(minDate) ? addDays(new Date(), -1) : new Date(minDate)}
                     maxDate={Number.isNaN(maxDate) ? addDays(new Date(), 1) : maxDate}
                     direction="vertical"
                     scroll={{ enabled: true }}
                     ranges={state}
                     staticRanges={[ ...moreOptions, ...subsetOfStaticRanges]}
                  />
               </Col>
            </Row>
         </Container>
      </Modal.Body>
      <Modal.Footer>
         <Button variant="warning" onClick={() => { onSave(undefined); props.onHide() }}>Clear</Button>
         <Button variant="primary" onClick={() => { onSave({
            kind: QueryUtils.customDateAliasName,
            start: state[0].startDate, 
            end: state[0].endDate
         }); props.onHide() }}>Save</Button>
    </Modal.Footer>
   </Modal>
};
export default DateRangeModal;