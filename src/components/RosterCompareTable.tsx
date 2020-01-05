// React imports:
import React, { useState } from 'react';

// Next imports:
import { NextPage } from 'next';
import Link from 'next/link';

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

// Additional components:
// @ts-ignore
import LoadingOverlay from 'react-loading-overlay';
import queryString from "query-string";

// Component imports
import GenericTable, { GenericTableOps, GenericTableColProps } from "./GenericTable";

// Util imports
import { CbbColors } from "../utils/CbbColors";
import { GameFilterParams } from "../utils/FilterModels";
import { UrlRouting } from "../utils/UrlRouting";

export type RosterCompareModel = {
  on: any,
  off: any,
  baseline: any,
  error_code?: string
}
type Props = {
  gameFilterParams: GameFilterParams
  rosterCompareStats: RosterCompareModel
}

const RosterCompareTable: React.FunctionComponent<Props> = ({gameFilterParams, rosterCompareStats}) => {

  const tableFields = { //accessors vs column metadata
    "title": GenericTableOps.addTitle("", ""),
    "sep0": GenericTableOps.addColSeparator(),
    "pct": GenericTableOps.addPctCol("%", "Percentage of possessions played", GenericTableOps.defaultColorPicker),
    "poss": GenericTableOps.addIntCol("Poss", "Number of possessions played", GenericTableOps.defaultColorPicker),
  };
  function tableData(key: string) {
    const obj = (rosterCompareStats as any)[key];
    const total = obj?.global_poss_count?.value || 1;
    return (obj?.player?.buckets || []).map(function(obj: any) {
      return GenericTableOps.buildDataRow({
        title: obj.key,
        pct: 1.0*obj.poss_count.value/total,
        poss: obj.poss_count
      }, GenericTableOps.defaultFormatter, GenericTableOps.defaultCellMeta);
    });
  }
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (Object.keys(rosterCompareStats.on).length == 0) &&
      (Object.keys(rosterCompareStats.off).length == 0) &&
      (Object.keys(rosterCompareStats.baseline).length == 0);
  }

  const onOffReportLink = (tableName: string) => {
    const getQuery = () => { switch(tableName) {
      case "on": return gameFilterParams.onQuery;
      case "off": return gameFilterParams.offQuery;
      default: return gameFilterParams.baseQuery;
    }};
    const paramObj = {
      team: gameFilterParams.team,
      year: gameFilterParams.year,
      gender: gameFilterParams.gender,
      baseQuery: getQuery(),
      players: (tableData(tableName) || []).map(
          (rec: any) => rec?.dataObj?.title
        ).filter((name: string) => name),
      minRank: gameFilterParams.minRank,
      maxRank: gameFilterParams.maxRank
    }
    const paramStr = queryString.stringify(paramObj);
    return <Link href={UrlRouting.getTeamReportUrl(paramObj)}>
      <a>(report)</a>
    </Link>;

    //TODO: on press, inject "{}" into the cache entry (remove players, implied by baseQuery etc)
    // this then needs to get interpreted as "cache miss but means actually perform query"
  };

  return <LoadingOverlay
    active={needToLoadQuery()}
    text={rosterCompareStats.error_code ?
      `Query Error: ${rosterCompareStats.error_code}` :
      "Press 'Submit' to view results"
    }
  >
    <Row>
        <Col>
          <Card className="w-100">
            <Card.Body>
              <Card.Title>'On' Roster   {onOffReportLink("on")}</Card.Title>
              <GenericTable tableCopyId="rosterOnTable" tableFields={tableFields} tableData={tableData("on")}/>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="w-100">
            <Card.Body>
              <Card.Title>'Off' Roster   {onOffReportLink("off")}</Card.Title>
              <GenericTable tableCopyId="rosterOffTable" tableFields={tableFields} tableData={tableData("off")}/>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="w-100">
            <Card.Body>
              <Card.Title>'Baseline' Roster   {onOffReportLink("baseline")}</Card.Title>
              <GenericTable tableCopyId="rosterBaseTable" tableFields={tableFields} tableData={tableData("baseline")}/>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </LoadingOverlay>;
}

export default RosterCompareTable;
