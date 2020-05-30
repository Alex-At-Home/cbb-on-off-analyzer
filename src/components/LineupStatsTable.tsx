// React imports:
import React, { useState, useEffect } from 'react';

// Next imports:
import { NextPage } from 'next';

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

// Additional components:
// @ts-ignore
import LoadingOverlay from 'react-loading-overlay';
import Select, { components} from "react-select"

// Component imports
import GenericTable, { GenericTableOps, GenericTableColProps } from "./GenericTable"
import { LineupFilterParams, ParamDefaults, getCommonFilterParams } from '../utils/FilterModels';

// Util imports
import { UrlRouting } from "../utils/UrlRouting"
import { CbbColors } from "../utils/CbbColors"
import { CommonTableDefs } from "../utils/CommonTableDefs"

export type LineupStatsModel = {
  lineups?: Array<any>,
  error_code?: string
}
type Props = {
  lineupStats: LineupStatsModel,
  startingState: LineupFilterParams;
  onChangeState: (newParams: LineupFilterParams) => void;
}

const LineupStatsTable: React.FunctionComponent<Props> = ({lineupStats, startingState, onChangeState}) => {

  // 1] State

  const [ minPoss, setMinPoss ] = useState(startingState.minPoss || ParamDefaults.defaultLineupMinPos);
  const [ maxTableSize, setMaxTableSize ] = useState(startingState.maxTableSize || ParamDefaults.defaultLineupMaxTableSize);
  const [ sortBy, setSortBy ] = useState(startingState.sortBy || ParamDefaults.defaultLineupSortBy);
  const [ filterStr, setFilterStr ] = useState(startingState.filter || ParamDefaults.defaultLineupFilter);

  // (slight delay when typing into the filter to make it more responsive)
  const [ timeoutId, setTimeoutId ] = useState(-1);
  const [ tmpFilterStr, setTmpFilterStr ] = useState(filterStr);

  const filterFragments =
    filterStr.split(",").map(fragment => _.trim(fragment)).filter(fragment => fragment ? true : false);
  const filterFragmentsPve =
    filterFragments.filter(fragment => fragment[0] != '-');
  const filterFragmentsNve =
    filterFragments.filter(fragment => fragment[0] == '-').map(fragment => fragment.substring(1));

  useEffect(() => { //(this ensures that the filter component is up to date with the union of these fields)
    const newState = _.merge(startingState, {
      minPoss: minPoss,
      maxTableSize: maxTableSize,
      sortBy: sortBy,
      filter: filterStr
    });
    onChangeState(newState);
  }, [ minPoss, maxTableSize, sortBy, filterStr ]);

  // 2] Data Model

  // 3] Utils

  // 3.1] Table building

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  const sorter = (sortStr: string) => { // format: (asc|desc):(off_|def_|diff_)<field>
    const sortComps = sortStr.split(":"); //asc/desc
    const dir = (sortComps[0] == "desc") ? -1 : 1;
    const fieldComps = _.split(sortComps[1], "_", 1); //off/def/diff
    const fieldName = sortComps[1].substring(fieldComps[0].length + 1); //+1 for _
    const field = (lineup: any) => {
      switch(fieldComps[0]) {
        case "diff": //(off-def)
          return (lineup["off_" + fieldName]?.value || 0.0)
                - (lineup["def_" + fieldName]?.value || 0.0);
        default: return lineup[sortComps[1]]?.value; //(off or def)
      }
    };
    return (lineup: any) => {
      return dir*(field(lineup) || 0);
    };
  };

/**/
  const commonParams = getCommonFilterParams(startingState);

  const lineups = lineupStats?.lineups || [];
  const tableData = _.chain(lineups).filter((lineup) => {
      const minPossInt = parseInt(minPoss);
      const offPos = lineup.off_poss?.value || 0;
      const defPos = lineup.def_poss?.value || 0;
      return offPos >= minPossInt || defPos >= minPossInt; //(unclear which of || vs && is best...)
    }).filter((lineup) => {
      const namesToTest = _.chain(lineup?.players_array?.hits?.hits).flatMap((pDoc) => {
        return pDoc?._source.players.map((p: any) => p.id);
      }).value().concat([ lineup.key ]);

      const playerFilter =
        (_.isEmpty(filterFragmentsPve) ||
          _.every(filterFragmentsPve, (frag) => _.some(namesToTest, (name) => name.indexOf(frag) >= 0))
        ) &&
        (_.isEmpty(filterFragmentsNve) ||
          !_.some(filterFragmentsNve, (frag) => _.some(namesToTest, (name) => name.indexOf(frag) >= 0))
        );
      return playerFilter && (lineup.key != ""); // (workaround for #53 pending fix)

    }).sortBy(
       [ sorter(sortBy) ]
    ).take(
      parseInt(maxTableSize)
    ).flatMap((lineup) => {
      const title = lineup.key.lineup_id.replace(/_/g, " / "); //TODO: merge the lines

      const params = { ...commonParams, team: lineup.key.team_id };
      const teamReportParms = { ...params, incRapm: true, incRepOnOff: true, filter: lineup.key.lineup_id.replace(/_/g, ",") };

      const stats = { off_title: <b><a target="_blank" href={"https://hoop-explorer.com/" + UrlRouting.getTeamReportUrl(teamReportParms)}>{title}</a></b>,
        def_title: "",
        off_team: <b><a target="_blank" href={"https://hoop-explorer.com/" + UrlRouting.getGameUrl(params, {})}>{lineup.key.team_id}</a></b>,
        def_type: "", off_type: "Off", def_type: "Def", ...lineup };
      return [
        GenericTableOps.buildDataRow(stats, offPrefixFn, offCellMetaFn),
        GenericTableOps.buildDataRow(stats, defPrefixFn, defCellMetaFn),
        GenericTableOps.buildRowSeparator()
      ];
    }).value();

  // 3.2] Sorting utils

  const sortOptions: Array<any> = _.flatten(
    _.toPairs(CommonTableDefs.lineupTable)
      .filter(keycol => keycol[1].colName && keycol[1].colName != "")
      .map(keycol => {
        return [
          ["desc","off"], ["asc","off"], ["desc","def"], ["asc","def"], ["desc","diff"], ["asc","diff"]
        ].map(combo => {
          const ascOrDesc = (s: string) => { switch(s) {
            case "asc": return "Asc.";
            case "desc": return "Desc.";
          }}
          const offOrDef = (s: string) => { switch(s) {
            case "off": return "Offensive";
            case "def": return "Defensive";
            case "diff": return "Off-Def";
          }}
          return {
            label: `${keycol[1].colName} (${ascOrDesc(combo[0])} / ${offOrDef(combo[1])})`,
            value: `${combo[0]}:${combo[1]}_${keycol[0]}`
          };
        });
      })
  );
  const sortOptionsByValue = _.fromPairs(
    sortOptions.map(opt => [opt.value, opt])
  );
  /** Put these options at the front */
  const mostUsefulSubset = [
    "desc:off_poss",
    "desc:diff_adj_ppp",
    "desc:off_adj_ppp",
    "asc:def_adj_ppp",
  ];
  /** The two sub-headers for the dropdown */
  const groupedOptions = [
    {
      label: "Most useful",
      options: _.chain(sortOptionsByValue).pick(mostUsefulSubset).values().value()
    },
    {
      label: "Other",
      options: _.chain(sortOptionsByValue).omit(mostUsefulSubset).values().value()
    }
  ];
  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  // 3] Utils
  function picker(offScale: (val: number) => string, defScale: (val: number) => string) {
    return (val: any, valMeta: string) => {
      const num = val.value as number;
      return _.isNil(num) ?
        CbbColors.malformedDataColor : //(we'll use this color to indicate malformed data)
        ("off" == valMeta) ? offScale(num) : defScale(num)
        ;
    };
  }
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return lineupStats.lineups === undefined;
  }
  function rowSpanCalculator(cellMeta: string) {
    switch(cellMeta) {
      case "off": return 2;
      case "def": return 0;
      default: return 1;
    }
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return sortOptionsByValue[s];
  }

  /** Handling filter change (/key presses to fix the select/delete on page load) */
  const onFilterChange = (ev: any) => {
    const toSet = ev.target.value;
    setTmpFilterStr(toSet);
    if (timeoutId != -1) {
      window.clearTimeout(timeoutId);
    }
    setTimeoutId(window.setTimeout(() => {
      setFilterStr(toSet);
    }, 100));
  };

  // 4] View
  return <Container>
    <LoadingOverlay
      active={needToLoadQuery()}
      text={lineupStats.error_code ?
        `Query Error: ${lineupStats.error_code}` :
        "Press 'Submit' to view results"
      }
    >
      <Form.Row>
        <Form.Group as={Col} sm="6">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="filter">Filter</InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              onKeyUp={onFilterChange}
              onChange={onFilterChange}
              placeholder = "eg Player1Surname,Player2FirstName,-Player3Name"
              value={tmpFilterStr}
            />
          </InputGroup>
        </Form.Group>
      </Form.Row>
      <Form.Row>
        <Form.Group as={Col} sm="3">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="maxLineups">Max Lineups</InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              onChange={(ev: any) => {
                if (ev.target.value.match("^[0-9]*$") != null) {
                  setMaxTableSize(ev.target.value);
                }
              }}
              placeholder = "eg 50"
              value={maxTableSize}
            />
          </InputGroup>
        </Form.Group>
        <Form.Group as={Col} sm="3">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="minPossessions">Min Poss #</InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              onChange={(ev: any) => {
                if (ev.target.value.match("^[0-9]*$") != null) {
                  setMinPoss(ev.target.value);
                }
              }}
              placeholder = "eg 5"
              value={minPoss}
            />
          </InputGroup>
        </Form.Group>
        <Form.Group as={Col} sm="6">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="sortBy">Sort By</InputGroup.Text>
            </InputGroup.Prepend>
            <Select
              className="w-75"
              value={ stringToOption(sortBy) }
              options={ groupedOptions }
              onChange={(option) => { if ((option as any)?.value)
                setSortBy((option as any)?.value);
              }}
              formatGroupLabel={formatGroupLabel}
            />
          </InputGroup>
        </Form.Group>
      </Form.Row>
      <Row>
        <Col>
          <GenericTable tableCopyId="lineupStatsTable" tableFields={CommonTableDefs.lineupTable} tableData={tableData}/>
        </Col>
      </Row>
    </LoadingOverlay>
  </Container>;
};

export default LineupStatsTable;
