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
import { PlayerLeaderboardParams, ParamDefaults, LuckParams } from '../utils/FilterModels';
import { AvailableTeams } from '../utils/internal-data/AvailableTeams';
import { ConferenceToNickname, NicknameToConference, Power6Conferences } from '../utils/public-data/ConferenceInfo';

import ReactDOMServer from 'react-dom/server'

export type PlayerLeaderboardStatsModel = {
  players?: Array<any>,
  confs?: Array<string>,
  error_code?: string
}
type Props = {
  startingState: PlayerLeaderboardParams,
  dataEvent: PlayerLeaderboardStatsModel,
  onChangeState: (newParams: PlayerLeaderboardParams) => void
}

// Some static methods

const sortOptions: Array<any> = _.flatten(
  _.toPairs(CommonTableDefs.onOffIndividualTableAllFields(true))
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

const PlayerLeaderboardTable: React.FunctionComponent<Props> = ({startingState, dataEvent, onChangeState}) => {
  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data Model

  const [ clipboard, setClipboard] = useState(null as null | ClipboardJS);

  // 2] State

  // Data source
  const [ confs, setConfs ] = useState(startingState.conf || "");
  const [ year, setYear ] = useState(startingState.year || ParamDefaults.defaultYear);
  const [ gender, setGender ] = useState(startingState.gender || ParamDefaults.defaultGender);

  // Misc display

  /** Set this to be true on expensive operations */
  const [ loadingOverride, setLoadingOverride ] = useState(false);

  const startingMinPoss = startingState.minPoss || ParamDefaults.defaultPlayerLboardMinPos;
  const [ minPoss, setMinPoss ] = useState(startingMinPoss);
  const startingMaxTableSize = startingState.maxTableSize || ParamDefaults.defaultPlayerLboardMaxTableSize;
  const [ maxTableSize, setMaxTableSize ] = useState(startingMaxTableSize);
  const [ sortBy, setSortBy ] = useState(startingState.sortBy || ParamDefaults.defaultPlayerLboardSortBy);
  const [ filterStr, setFilterStr ] = useState(startingState.filter || ParamDefaults.defaultPlayerLboardFilter);

  const [ isT100, setIsT100 ] = useState(startingState.t100 || false);
  const [ isConfOnly, setIsConfOnly ] = useState(startingState.confOnly || false);

  useEffect(() => { // Add and remove clipboard listener
    initClipboard();
    if (typeof document !== `undefined`) {
      //(if we added a clipboard listener, then remove it on page close)
      //(if we added a submitListener, then remove it on page close)
      return () => {
        if (clipboard) {
          clipboard.destroy();
          setClipboard(null);
        }
      };
    }
  });

  useEffect(() => { //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...startingState,
      conf: confs, gender: gender, year: year,
      t100: isT100, confOnly: isConfOnly,
      // Misc filters
      minPoss: minPoss,
      maxTableSize: maxTableSize,
      sortBy: sortBy,
      filter: filterStr
    };
    onChangeState(newState);
  }, [ minPoss, maxTableSize, sortBy, filterStr,
      isT100, isConfOnly,
      confs, year, gender ]);

  // 3] Utils

  // 3.0] Luck calculations:

  const genderYearLookup = `${startingState.gender}_${startingState.year}`;
  const avgEfficiency = efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  // 3.1] Build individual info

  const filterFragments =
    filterStr.split(",").map(fragment => _.trim(fragment)).filter(fragment => fragment ? true : false);
  const filterFragmentsPve =
    filterFragments.filter(fragment => fragment[0] != '-');
  const filterFragmentsNve =
    filterFragments.filter(fragment => fragment[0] == '-').map(fragment => fragment.substring(1));

  // 3.2] Table building

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  /** Only rebuild the expensive table if one of the parameters that controls it changes */
  const table = React.useMemo(() => {
    setLoadingOverride(false); //(rendering)

    const confSet = confs ? new Set(
      _.flatMap((confs || "").split(","), c => c == "P6" ? Power6Conferences : [ NicknameToConference[c] || c ])
    ) : undefined;

    const dataEventPlayers = (dataEvent?.players || []);
//TODO: make this a % or an int?

    // Filter and limit players part 1/2
    const minPossNum = parseInt(minPoss) || 0;
    const confDataEventPlayers = dataEventPlayers.filter(player => {
      return (!confSet || confSet.has(player.conf || "Unknown")) && (player.off_poss?.value >= minPossNum);
        //(we do the "spurious" minPossNum check so we can detect filter presence and use to add a ranking)
    });

    // Filter, sort, and limit players part 2/2
    const players = _.chain(confDataEventPlayers).filter(player => {
      const strToTest = (player.on?.key || player.off?.key || player.baseline?.key || "");

      return(
        (filterFragmentsPve.length == 0) ||
          (_.find(filterFragmentsPve, (fragment) => strToTest.indexOf(fragment) >= 0) ? true : false))
        &&
        ((filterFragmentsNve.length == 0) ||
          (_.find(filterFragmentsNve, (fragment) => strToTest.indexOf(fragment) >= 0) ? false : true))
        ;
    }).sortBy(
//TODO: don't need to sort if using default
      [ LineupTableUtils.sorter(sortBy) , (p) => { p.baseline?.off_team_poss?.value || 0 } ]
    ).take(maxTableSize).value();

    /** Either the sort is not one of the 3 pre-calced, or there is a filter */
    const isGeneralSortOrFilter = ((sortBy != ParamDefaults.defaultPlayerLboardSortBy) &&
      (sortBy != "desc:off_adj_ppp") && (sortBy != "asc:def_adj_ppp"))
      ||
      ((confDataEventPlayers.length < dataEventPlayers.length) || ((filterStr || "") != ""));

    const tableData = players.flatMap((player, playerIndex) => {
      player.def_usage = <OverlayTrigger placement="auto" overlay={TableDisplayUtils.buildPositionTooltip(player.posClass, "Base")}>
        <small>{player.posClass}</small>
      </OverlayTrigger>;

      const confNickname = ConferenceToNickname[player.conf] || "???";

      const teamTooltip = (
        <Tooltip id={`team_${playerIndex}`}>Open new tab with all players for this team</Tooltip>
      );
      const teamParams = {
        team: player.team, gender: gender, year: year,
        minRank: "0", maxRank: isT100 ? "100" : "400",
        queryFilters: isConfOnly ? "Conf" : undefined,
        lineupLuck: true
      };
      const teamEl = <OverlayTrigger placement="auto" overlay={teamTooltip}>
        <a target="_new" href={UrlRouting.getGameUrl(teamParams, {})}><b>{player.team}</b></a>
      </OverlayTrigger>;

      const rankings = "#TBD";  //TODO work needed here:
      const adjMarginStr = "+0.0";
      player.off_title = <div>
        {player.key}<br/>
        <span className="float-left">
        {rankings}
        &nbsp;<span>{teamEl} (<span>{confNickname}</span>) {adjMarginStr}</span>
        </span>
      </div>;

      player.off_drb = player.def_orb; //(just for display, all processing should use def_orb)
      TableDisplayUtils.injectPlayTypeInfo(player, true, true);

      return _.flatten([
        [ GenericTableOps.buildDataRow(player, offPrefixFn, offCellMetaFn) ],
        [ GenericTableOps.buildDataRow(player, defPrefixFn, defCellMetaFn) ],
        [ GenericTableOps.buildRowSeparator() ]
      ]);
    });
    return <GenericTable
      tableCopyId="playerLeaderboardTable"
      tableFields={CommonTableDefs.onOffIndividualTableAllFields(true)}
      tableData={tableData}
      cellTooltipMode="none"
    />

  }, [ minPoss, maxTableSize, sortBy, filterStr,
      confs,
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
    return loadingOverride || ((dataEvent?.players || []).length == 0);
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
        <Button className="float-left" id={`copyLink_playerLeaderboard`} variant="outline-secondary" size="sm">
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>;
  };
  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_playerLeaderboard`, {
        text: function(trigger) {
          return window.location.href;
        }
      });
      newClipboard.on('success', (event: ClipboardJS.Event) => {
        //(unlike other tables, don't add to history)
        // Clear the selection in some visually pleasing way
        setTimeout(function() {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  }

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

  /** At the expense of some time makes it easier to see when changes are happening */
  const friendlyChange = (change: () => void, guard: boolean, timeout: number = 250) => {
    if (guard) {
      setLoadingOverride(true);
      setTimeout(() => {
        change()
      }, timeout)
    }
  };

  return <Container>
    <LoadingOverlay
      active={needToLoadQuery()}
      spinner
      text={"Loading Player Leaderboard..."}
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
            friendlyChange(() => setConfs(confStr), confs != confStr);
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
              startingVal={filterStr}
              onChange={(t: string) => friendlyChange(() => setFilterStr(t), t != filterStr)}
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
          </GenericTogglingMenu>
        </Form.Group>
      </Form.Row>
      <Form.Row>
        <Form.Group as={Col} sm="3">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="maxPlayers">Max Players</InputGroup.Text>
            </InputGroup.Prepend>
            <AsyncFormControl
              startingVal={startingMaxTableSize}
              validate={(t: string) => t.match("^[0-9]*$") != null}
              onChange={(t: string) => friendlyChange(() => setMaxTableSize(t), t != maxTableSize)}
              timeout={400}
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
              startingVal={startingMinPoss}
              validate={(t: string) => t.match("^[0-9]*$") != null}
              onChange={(t: string) => friendlyChange(() => setMinPoss(t), t != minPoss)}
              timeout={400}
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
              onChange={(option) => { if ((option as any)?.value) {
                const newSortBy = (option as any)?.value;
                friendlyChange(() => setSortBy(newSortBy), sortBy != newSortBy);
              }}}
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
              tooltip: "Leaderboard of players vs T100 opposition",
              toggled: isT100,
              onClick: () => friendlyChange(() => { setIsT100(!isT100); setIsConfOnly(false); }, true)
            },
            {
              label: "Conf",
              tooltip: "Leaderboard of players vs conference opposition",
              toggled: isConfOnly,
              onClick: () => friendlyChange(() => { setIsT100(false); setIsConfOnly(!isConfOnly); }, true)
            }
          ] as Array<any>).concat(showHelp ? [
            //TODO: what to show here?
            // {
            //   label: <a href="https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html" target="_new">?</a>,
            //   tooltip: "Open a page that explains some of the elements of this table",
            //   toggled: false,
            //   onClick: () => {}
            // }
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

export default PlayerLeaderboardTable;