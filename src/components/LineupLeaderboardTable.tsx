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
import Dropdown from 'react-bootstrap/Dropdown';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Button from 'react-bootstrap/Button';

// Additional components:
// @ts-ignore
import LoadingOverlay from 'react-loading-overlay';
import Select, { components } from "react-select";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink } from '@fortawesome/free-solid-svg-icons'
import ClipboardJS from 'clipboard';

// Component imports
import GenericTable, { GenericTableOps, GenericTableColProps } from "./GenericTable";
import { RosterStatsModel } from './RosterStatsTable';
import { TeamStatsModel } from './TeamStatsTable';
import LuckConfigModal from './shared/LuckConfigModal';
import GenericTogglingMenu from './shared/GenericTogglingMenu';
import GenericTogglingMenuItem from './shared/GenericTogglingMenuItem';
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import LuckAdjDiagView from './diags/LuckAdjDiagView';
import AsyncFormControl from './shared/AsyncFormControl';

// Table building
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";

// Util imports
import { UrlRouting } from "../utils/UrlRouting";
import { LineupUtils } from "../utils/stats/LineupUtils";
import { CbbColors } from "../utils/CbbColors";
import { CommonTableDefs } from "../utils/CommonTableDefs";
import { PositionUtils } from "../utils/stats/PositionUtils";
import { efficiencyAverages } from '../utils/public-data/efficiencyAverages';
import { LineupLeaderboardParams, ParamDefaults, LuckParams } from '../utils/FilterModels';
import { AvailableTeams } from '../utils/internal-data/AvailableTeams';
import { ConferenceToNickname, NicknameToConference, Power6Conferences } from '../utils/public-data/ConferenceInfo';

import ReactDOMServer from 'react-dom/server'

export type LineupLeaderboardStatsModel = {
  lineups?: Array<any>,
  confs?: Array<string>,
  error_code?: string
}
type Props = {
  startingState: LineupLeaderboardParams,
  dataEvent: LineupLeaderboardStatsModel,
  onChangeState: (newParams: LineupLeaderboardParams) => void
}

// Some static methods

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
  "desc:diff_adj_ppp",
  "desc:off_adj_ppp",
  "asc:def_adj_ppp",
  "desc:off_poss",
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

// Functional component

const LineupLeaderboardTable: React.FunctionComponent<Props> = ({startingState, dataEvent, onChangeState}) => {
  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data Model

  // 2] State

  // Data source
  const [ confs, setConfs ] = useState(startingState.conf || "");
  const [ year, setYear ] = useState(startingState.year || ParamDefaults.defaultYear);
  const [ gender, setGender ] = useState(startingState.gender || ParamDefaults.defaultGender);

  // Misc display

  const [ minPoss, setMinPoss ] = useState(startingState.minPoss || ParamDefaults.defaultLineupLboardMinPos);
  const [ maxTableSize, setMaxTableSize ] = useState(startingState.maxTableSize || ParamDefaults.defaultLineupLboardMaxTableSize);
  const [ sortBy, setSortBy ] = useState(startingState.sortBy || ParamDefaults.defaultLineupLboardSortBy);
  const [ filterStr, setFilterStr ] = useState(startingState.filter || ParamDefaults.defaultLineupLboardFilter);

  const [ isT100, setIsT100 ] = useState(startingState.t100 || false);
  const [ isConfOnly, setIsConfOnly ] = useState(startingState.confOnly || false);

  // Luck:

  /** Whether to show the luck diagnostics */
  const [ showLuckAdjDiags, setShowLuckAdjDiags ] = useState(_.isNil(startingState.showLineupLuckDiags) ?
    ParamDefaults.defaultLineupLboardLuckDiagMode : startingState.showLineupLuckDiags
  );

  useEffect(() => { //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...startingState,
      conf: confs, gender: gender, year: year,
      t100: isT100, confOnly: isConfOnly,
      // Luck
      showLineupLuckDiags: showLuckAdjDiags,
      // Misc filters
      minPoss: minPoss,
      maxTableSize: maxTableSize,
      sortBy: sortBy,
      filter: filterStr
    };
    onChangeState(newState);
  }, [ minPoss, maxTableSize, sortBy, filterStr,
      showLuckAdjDiags,
      isT100, isConfOnly,
      confs, year, gender ]);

  // 3] Utils

  // 3.0] Luck calculations:

  const genderYearLookup = `${startingState.gender}_${startingState.year}`;
  const avgEfficiency = efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  // 3.1] Build individual info

  // 3.2] Table building

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  /** Only rebuild the expensive table if one of the parameters that controls it changes */
  const table = React.useMemo(() => {

    const confSet = confs ? new Set(
      _.flatMap((confs || "").split(","), c => c == "P6" ? Power6Conferences : [ NicknameToConference[c] || c ])
    ) : undefined;

    const dataEventLineups = (dataEvent?.lineups || []);
    const minPossNum = parseInt(minPoss) || 0;
    const confDataEventLineups = dataEventLineups.filter(lineup => {
      return (!confSet || confSet.has(lineup.conf || "Unknown")) && (lineup.off_poss?.value >= minPossNum);
        //(we do the "spurious" minPossNum check so we can detect filter presence and use to add a ranking)
    });
    const lineups = LineupTableUtils.buildFilteredLineups(
      confDataEventLineups,
      filterStr,
      (sortBy == ParamDefaults.defaultLineupLboardSortBy) ? undefined : sortBy,
      minPoss, maxTableSize, undefined, undefined //<-calc from lineup
    );

    /** Either the sort is not one of the 3 pre-calced, or there is a filter */
    const isGeneralSortOrFilter = ((sortBy != ParamDefaults.defaultLineupLboardSortBy) &&
      (sortBy != "desc:off_adj_ppp") && (sortBy != "asc:def_adj_ppp"))
      ||
      ((confDataEventLineups.length < dataEventLineups.length) || ((filterStr || "") != ""));

    const tableData = lineups.flatMap((lineup, lineupIndex) => {
      TableDisplayUtils.injectPlayTypeInfo(lineup, false, false); //(inject assist numbers)

      const teamSeasonLookup = `${startingState.gender}_${lineup.team}_${startingState.year}`;

      const perLineupBaselinePlayerMap = lineup.player_info;
      const positionFromPlayerKey = lineup.player_info;
      const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
      const sortedCodesAndIds = PositionUtils.orderLineup(codesAndIds, positionFromPlayerKey, teamSeasonLookup);

      const lineupTitleKey = "" + lineupIndex;
      const subTitle = sortedCodesAndIds ?
        TableDisplayUtils.buildDecoratedLineup(
          lineupTitleKey, sortedCodesAndIds, perLineupBaselinePlayerMap, positionFromPlayerKey, "off_adj_rtg", true
        ) : "Weighted Total";

      const generalRank = isGeneralSortOrFilter ? <span><i>(#{lineupIndex + 1})</i>&nbsp;</span> : null;
      const rankings = <span>{generalRank}<b>#{lineup.adj_margin_rank}</b> <small>(#{lineup.off_adj_ppp_rank} / #{lineup.def_adj_ppp_rank})</small></span>;

      const confNickname = ConferenceToNickname[lineup.conf] || "???";

      const teamTooltip = (
        <Tooltip id={`team_${lineupIndex}`}>Open new tab with all lineups for this team</Tooltip>
      );
      const teamParams = {
        team: lineup.team, gender: gender, year: year,
        minRank: "0", maxRank: isT100 ? "100" : "400",
        queryFilters: isConfOnly ? "Conf" : undefined,
        lineupLuck: true
      };
      const teamEl = <OverlayTrigger placement="auto" overlay={teamTooltip}>
        <a target="_new" href={UrlRouting.getLineupUrl(teamParams, {})}><b>{lineup.team}</b></a>
      </OverlayTrigger>;

      const title = <div><span className="float-left">
        {rankings}
        &nbsp;<span>{teamEl} (<span>{confNickname}</span>)</span>
        </span><br/>
        {subTitle}
      </div>

      const stats = { off_title: title, def_title: "", ...lineup };

      return _.flatten([
        [ GenericTableOps.buildDataRow(stats, offPrefixFn, offCellMetaFn) ],
        [ GenericTableOps.buildDataRow(stats, defPrefixFn, defCellMetaFn) ],
        showLuckAdjDiags && lineup.off_luck_diags ? [ GenericTableOps.buildTextRow(
          <LuckAdjDiagView
            name="lineup"
            offLuck={lineup.off_luck_diags}
            defLuck={lineup.def_luck_diags}
            baseline={"season"}
            showHelp={showHelp}
          />, "small pt-2"
        ) ] : [] ,
        [ GenericTableOps.buildRowSeparator() ]
      ]);
    });
    return <GenericTable
      tableCopyId="lineupLeaderboardTable"
      tableFields={CommonTableDefs.lineupTable}
      tableData={tableData}
      cellTooltipMode="none"
    />

  }, [ minPoss, maxTableSize, sortBy, filterStr,
      showLuckAdjDiags, confs,
      dataEvent ]);

  // 3.2] Sorting utils

  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (dataEvent?.lineups || []).length == 0;
  }

  /** For use in selects */
  function sortStringToOption(s: string) {
    return sortOptionsByValue[s];
  }
  function stringToOption(s: string) {
    return { label: s, value: s};
  }

  // 4] View

  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard)</Tooltip>
    );
    return  <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button className="float-left" id={`copyLink_lineupLeaderboard`} variant="outline-secondary" size="sm">
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>;
  };

  function getCurrentConfsOrPlaceholder() {
    return (confs == "") ?
      { label: 'All Available Conferences' } :
      confs.split(",").map((conf: string) => stringToOption(NicknameToConference[conf] || conf));
  }

  /** Slightly hacky code to render the conference nick names */
  const ConferenceValueContainer = (props: any) => {
    const oldText = props.children[0];
    const fullConfname = oldText.props.children;
    const newText = {
      ...oldText,
      props: {
        ...oldText.props,
        children: [ ConferenceToNickname[fullConfname] || fullConfname ]
      }
    }
    const newProps = {
      ...props,
      children: [ newText, props.children[1] ]
    }
    return <components.MultiValueContainer {...newProps} />
  };

  return <Container>
    <LoadingOverlay
      active={needToLoadQuery()}
      spinner
      text={"Loading Lineup Leaderboard..."}
    >
    <Form.Group as={Row}>
      <Col xs={6} sm={6} md={3} lg={2}>
        <Select
          value={ stringToOption(gender) }
          options={[ "Men" ].map(
            (gender) => stringToOption(gender)
          )}
          isSearchable={false}
          onChange={(option) => { if ((option as any)?.value) setGender((option as any).value) }}
        />
      </Col>
      <Col xs={6} sm={6} md={3} lg={2}>
        <Select
          value={ stringToOption(year) }
          options={[ "2018/9", "2019/20" ].map( /*TODO: also add 2018/9*/
            (r) => stringToOption(r)
          )}
          isSearchable={false}
          onChange={(option) => { if ((option as any)?.value) setYear((option as any).value) }}
        />
      </Col>
      <Col className="w-100" bsPrefix="d-lg-none d-md-none"/>
      <Col xs={12} sm={12} md={6} lg={6}>
        <Select
          isClearable={true}
          styles={{ menu: base => ({ ...base, zIndex: 1000 }) }}
          isMulti
          components={{ MultiValueContainer: ConferenceValueContainer }}
          value={ getCurrentConfsOrPlaceholder() }
          options={["Power 6 Conferences"].concat(dataEvent?.confs || []).map(
            (r) => stringToOption(r)
          )}
          onChange={(optionsIn) => {
            const options = optionsIn as Array<any>;
            const selection = (options || []).map(option => (option as any)?.value || "");
            const confStr = selection.filter((t: string) => t != "").map((c: string) => ConferenceToNickname[c] || c).join(",")
            setConfs(confStr);
          }}
        />
      </Col>
      <Col>
        {getCopyLinkButton()}
      </Col>
    </Form.Group>
      <Form.Row>
        <Form.Group as={Col} sm="8">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="filter">Filter</InputGroup.Text>
            </InputGroup.Prepend>
            <AsyncFormControl
              onChange={(t: string) => setFilterStr(t)}
              timeout={500}
              placeholder = "eg TeamA;-TeamB;Player1Code;Player2FirstName;-Player3Surname"
            />
          </InputGroup>
        </Form.Group>
        <Col sm="3"/>
        <Form.Group as={Col} sm="1">
          <GenericTogglingMenu>
            <GenericTogglingMenuItem
              text={<i className="text-secondary">Adjust for Luck</i>}
              truthVal={true}
              onSelect={() => {}}
              helpLink={showHelp ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html" : undefined}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text="Show Luck Adjustment diagnostics"
              truthVal={showLuckAdjDiags}
              onSelect={() => setShowLuckAdjDiags(!showLuckAdjDiags)}
            />
          </GenericTogglingMenu>
        </Form.Group>
      </Form.Row>
      <Form.Row>
        <Form.Group as={Col} sm="3">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="maxLineups">Max Lineups</InputGroup.Text>
            </InputGroup.Prepend>
            <AsyncFormControl
              startingVal={maxTableSize}
              validate={(t: string) => t.match("^[0-9]*$") != null}
              onChange={(t: string) => setMaxTableSize(t)}
              timeout={200}
              placeholder = "eg 100"
            />
          </InputGroup>
        </Form.Group>
        <Form.Group as={Col} sm="3">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="minPossessions">Min Poss #</InputGroup.Text>
            </InputGroup.Prepend>
            <AsyncFormControl
              startingVal={minPoss}
              validate={(t: string) => t.match("^[0-9]*$") != null}
              onChange={(t: string) => setMinPoss(t)}
              timeout={200}
              placeholder = "eg 20"
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
              value={ sortStringToOption(sortBy) }
              options={ groupedOptions }
              onChange={(option) => { if ((option as any)?.value)
                setSortBy((option as any)?.value);
              }}
              formatGroupLabel={formatGroupLabel}
            />
          </InputGroup>
        </Form.Group>
      </Form.Row>
      <Form.Row>
        <Col>
          <ToggleButtonGroup items={([
            {
              label: "Luck",
              tooltip: "Statistics always adjusted for luck",
              toggled: true,
              onClick: () => {}
            },
            {
              label: "T100",
              tooltip: "Leaderboard of lineups vs T100 opposition",
              toggled: isT100,
              onClick: () => {
                setIsT100(!isT100); setIsConfOnly(false);
              }
            },
            {
              label: "Conf",
              tooltip: "Leaderboard of lineups vs conference opposition",
              toggled: isConfOnly,
              onClick: () => {
                setIsT100(false); setIsConfOnly(!isConfOnly);
              }
            }
          ] as Array<any>).concat(showHelp ? [
            {
              label: <a href="https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html" target="_new">?</a>,
              tooltip: "Open a page that explains some of the elements of this table",
              toggled: false,
              onClick: () => {}
            }
          ] : [])
          }/>
        </Col>
      </Form.Row>
      <Row className="mt-2">
        <Col style={{paddingLeft: "5px", paddingRight: "5px"}}>
          {table}
        </Col>
      </Row>
    </LoadingOverlay>
  </Container>;
};

export default LineupLeaderboardTable;