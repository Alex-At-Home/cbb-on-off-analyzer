// React imports:
import React, { useState, useEffect } from 'react';

// Next imports:
import { NextPage } from 'next';

// Lodash
import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import InputGroup from 'react-bootstrap/InputGroup';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Tooltip from 'react-bootstrap/Tooltip';

// Additional components:
import Select, { components} from "react-select"
import queryString from "query-string";
// @ts-ignore
import LoadingOverlay from 'react-loading-overlay';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHistory } from '@fortawesome/free-solid-svg-icons'
import { faLink } from '@fortawesome/free-solid-svg-icons'
import ClipboardJS from 'clipboard';
// @ts-ignore
import { Shake } from 'reshake'

// Component imports:
import { TeamStatsModel } from '../components/TeamStatsTable';
import { RosterCompareModel } from '../components/RosterCompareTable';
import { dataLastUpdated } from '../utils/internal-data/dataLastUpdated';
import { PreloadedDataSamples, preloadedData } from '../utils/internal-data/preloadedData';
import { AvailableTeams } from '../utils/internal-data/AvailableTeams';
import { ClientRequestCache } from '../utils/ClientRequestCache';
import HistorySelector, { historySelectContainerWidth } from '../components/HistorySelector';
import { ParamPrefixes, ParamDefaults } from '../utils/FilterModels';
import { HistoryManager } from '../utils/HistoryManager';

// Library imports:
import fetch from 'isomorphic-unfetch';

export type CommonFilterParams = {
  year?: string,
  team?: string,
  gender?: string,
  minRank?: string,
  maxRank?: string
}
interface Props<PARAMS> {
  startingState: PARAMS;
  onChangeState: (newParams: PARAMS) => void;
  onChangeCommonState: (newCommonParams: CommonFilterParams) => void;
  tablePrefix: string,
  buildParamsFromState: (inHandleResponse: Boolean) => PARAMS;
  childHandleResponse: (json: any, wasError: Boolean) => void;
  childSubmitRequest: (paramStr: string, callback: (resp: fetch.IsomorphicResponse) => void) => void;
}

/** Type workaround per https://stackoverflow.com/questions/51459971/type-of-generic-stateless-component-react-or-extending-generic-function-interfa */
type CommonFilterI<PARAMS = any> = React.FunctionComponent<Props<PARAMS>>

const CommonFilter: CommonFilterI = ({
    children,
    startingState, onChangeState, onChangeCommonState,
    tablePrefix, buildParamsFromState, childHandleResponse, childSubmitRequest
}) => {

  // Data model

  // Ugly internals
  const [ queryIsLoading, setQueryIsLoading ] = useState(false);
  const [ atLeastOneQueryMade, setAtLeastOneQueryMade ] = useState(false);
  const [ pageJustLoaded, setPageJustLoaded ] = useState(true);
  const [ currState, setCurrState ] = useState(startingState);

  const [ clipboard, setClipboard] = useState(null as null | ClipboardJS);

  // Data source
  const [ team, setTeam ] = useState(startingState.team || ParamDefaults.defaultTeam);
  const [ year, setYear ] = useState(startingState.year || ParamDefaults.defaultYear);
  const [ gender, setGender ] = useState(startingState.gender || ParamDefaults.defaultGender);
  /** Pre-calculate this */
  const teamList = AvailableTeams.getTeams(null, year, gender);

  // Generic filters:

  const [ minRankFilter, setMinRankFilter ] = useState(startingState.minRank || ParamDefaults.defaultMinRank);
  const [ maxRankFilter, setMaxRankFilter ] = useState(startingState.maxRank || ParamDefaults.defaultMaxRank);

  // Automatically update child state when any current param is changed:
  useEffect(() => {
    onChangeCommonState({
      team: team, year: year, gender: gender, minRank: minRankFilter, maxRank: maxRankFilter
    })
  }, [ team, year, gender, minRankFilter, maxRankFilter ]);

  const [ submitDisabled, setSubmitDisabled ] = useState(false); // (always start as true on page load)

  const isDebug = (process.env.NODE_ENV !== 'production');

  var historyOverlay: any= null; // (Gets overwritten by the history overlay trigger)

  // Utils

  const currentJsonEpoch = dataLastUpdated[`${gender}_${year}`] || -1;

  /** Checks if the input has been changed, and also handles on page load logic */
  useEffect(() => {
    initClipboard();
    setSubmitDisabled(shouldSubmitBeDisabled());

    // Add "enter" to submit page (do on every effect, since removal occurs on every effect, see return below)
    const submitListener = (event: any) => {
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        if (!submitDisabled) {
          onSubmit();
        }
      } else if (event.code == "Escape") {
        if (historyOverlay) historyOverlay.hide();
      }
    };
    if (typeof document !== `undefined`) {
      document.addEventListener("keydown", submitListener);
    }

    // Cached response and pre-load handling:
    if (pageJustLoaded) {
      setPageJustLoaded(false); //(ensures this code only gets called once)

      const epochRefreshed = ClientRequestCache.refreshEpoch(gender, year, currentJsonEpoch, isDebug);

      // Check for pre-loads:
      Object.entries(preloadedData || {}).map(function(keyVal) {
        //TODO: check for prefix?
        const key = keyVal[0];
        const valAsJson = keyVal[1];
        if (!epochRefreshed && ClientRequestCache.peekForResponse(key, "")) {
          if (isDebug) {
            console.log(`Already pre-loaded [${key}]`);
          }
        } else {
          const isB64encoded = _.startsWith(valAsJson, ClientRequestCache.base64Prefix);
          if (isDebug) {
            console.log(`Pre-loading [${key}] B64=[${isB64encoded}]`);
          }
          if (isB64encoded) {
            ClientRequestCache.directInsertCache(
              key, "", valAsJson, currentJsonEpoch, isDebug //(no prefix since the key already has it)
            )
          } else {
            ClientRequestCache.cacheResponse(
              key, "", valAsJson, currentJsonEpoch, isDebug //(no prefix since the key already has it)
            );
          }
        }
      });
      // Check if object is in cache and handle response if so
      const newParamsStr = queryString.stringify(buildParamsFromState(false));
      if (isDebug) {
        console.log(`Looking for cache entry for [${tablePrefix}][${newParamsStr}]`);
      }
      const cachedJson = ClientRequestCache.decacheResponse(
        newParamsStr, tablePrefix, currentJsonEpoch, isDebug
      );
      if (cachedJson) {
        HistoryManager.addParamsToHistory(`${tablePrefix}${newParamsStr}`);
        handleResponse(cachedJson);
      } else {
        console.log(`(no pre-cached entry found)`);
      }
    }
    if (typeof document !== `undefined`) {
      //(if we added a submitListener, then remove it on page close)
      return () => {
        document.removeEventListener("keydown", submitListener);
      };
    }
  });

  /** If the params match the last request, disable submit */
  function shouldSubmitBeDisabled() {
    const newParams = buildParamsFromState(false);
    const paramsUnchanged = Object.keys(newParams).every(
      (key: string) => (newParams as any)[key] == (currState as any)[key]
    );
    return (atLeastOneQueryMade && paramsUnchanged) || (team == "");
  }

  /** Whether any of the queries returned an error - we'll treat them all as errors if so */
  function isResponseError(resp: any) {
    const jsons = resp?.responses || [];
    const teamJson = (jsons.length > 0) ? jsons[0] : resp;
      //(error can be so low level there's not even a responses)
    const rosterCompareJson = (jsons.length > 1) ? jsons[1] : {};
    return (Object.keys(teamJson?.error || {}).length > 0) ||
      (Object.keys(rosterCompareJson?.error || {}).length > 0);
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(json: any) {
    setQueryIsLoading(false);
    const newParams = buildParamsFromState(true); //TODO need to merge optionally
    const wasError = isResponseError(json);
    if (!wasError) {
      setAtLeastOneQueryMade(true);
      setCurrState(newParams);
      onChangeState(newParams);
    }
    childHandleResponse(json, wasError);
  }

  /** The user has pressed the submit button - mix of generic and custom logic */
  function onSubmit() {
    setQueryIsLoading(true);
    const newParamsStr = queryString.stringify(buildParamsFromState(false));

    // Store every request in history, successful or not:
    HistoryManager.addParamsToHistory(`${tablePrefix}${newParamsStr}`);

    // Check if it's in the cache:
    const cachedJson = ClientRequestCache.decacheResponse(
      newParamsStr, tablePrefix, currentJsonEpoch, isDebug
    );
    if (cachedJson) {
      handleResponse(cachedJson);
    } else {
      childSubmitRequest(newParamsStr, function(response: fetch.IsomorphicResponse) {
        response.json().then(function(json: any) {
          // Cache result locally:
          if (isDebug) {
            console.log(`CACHE_KEY=[${tablePrefix}${newParamsStr}]`);
            console.log(`CACHE_VAL=[${JSON.stringify(json)}]`);
          }
          if (!isResponseError(json)) { //(never cache errors)
            ClientRequestCache.cacheResponse(
              newParamsStr, tablePrefix, json, currentJsonEpoch, isDebug
            );
          }
          handleResponse(json);
        })
      })
    }
  }

  /** Load the designated example */
  function onSeeExample() {
    if (tablePrefix == ParamPrefixes.game) {
      if (gender == "Women") {
        const newUrl = `${PreloadedDataSamples.womenOnOff}`;
        window.location.href = `/?${newUrl}`;
      } else { //(default is men)
        const newUrl = `${PreloadedDataSamples.menOnOff}`;
        window.location.href = `/?${newUrl}`;
      }
    } else if (tablePrefix == ParamPrefixes.lineup) {
      if (gender == "Women") {
        const newUrl = `${PreloadedDataSamples.womenLineup}`;
        window.location.href = `/LineupAnalyzer?${newUrl}`;
      } else { //(default is men)
        const newUrl = `${PreloadedDataSamples.menLineup}`;
        window.location.href = `/LineupAnalyzer?${newUrl}`;
      }
    }
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return { label: s, value: s};
  }
  /** For use in team select */
  function getCurrentTeamOrPlaceholder() {
    return (team == "") ? { label: 'Choose Team...' } : stringToOption(team);
  }

  /** Adds the MenuList component with user prompt if there are teams fitered out*/
  function maybeMenuList() {
    if (teamList.length < Object.keys(AvailableTeams.byName).length) {
      return { MenuList };
    }
  }

  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink`, {
        text: function(trigger) {
          return window.location.href;
        }
      });
      newClipboard.on('success', (event: ClipboardJS.Event) => {
        setTimeout(function() {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  }

  // Visual components:

  /** Let the user know that he might need to change */
  const MenuList = (props: any)  => {
    return (
      <components.MenuList {...props}>
        <p className="text-secondary text-center">(Teams filtered by gender/year)</p>
        {props.children}
      </components.MenuList>
    );
  };

  /** Add button to allow users to access their analysis history easily */
  const getHistoryButton = () => {

    return <OverlayTrigger
      ref={(ref: any) => historyOverlay = ref}
      rootClose={true}
      trigger="click"
      key="left"
      placement="left"
      overlay={
        <Popover id="popover-positioned-left" style={{ maxWidth: historySelectContainerWidth }}>
          <Popover.Title as="h3">{`History`}</Popover.Title>
          <Popover.Content>
            <HistorySelector
              tablePrefix={tablePrefix}
            />
          </Popover.Content>
        </Popover>
      }
    >
      <Button className="float-left" id="historyButton" variant="outline-secondary" size="sm">
        <FontAwesomeIcon icon={faHistory} />
      </Button>
    </OverlayTrigger>
    ;
  };
  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard</Tooltip>
    );
    return  <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button className="float-left" id="copyLink" variant="outline-secondary" size="sm">
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>;
  };
  /** If no team is specified, add the option to jump to an example */
  const getExampleButtonIfNoTeam = () => {
    if (team == "") {
      return <Shake
        h={20} v={5} r={5} q={5} int={25} fixed={true}
        className="float-right"
      >
        <Button variant="warning" onClick={onSeeExample}><b>See Example ({gender})!</b></Button>
      </Shake>;
    }
  }

  return <LoadingOverlay
    active={queryIsLoading}
    spinner
    text="Calculating statistics"
  ><Form>
    <Form.Group as={Row}>
      <Col xs={6} sm={6} md={3} lg={2}>
        <Select
          value={ stringToOption(gender) }
          options={Array.from(new Set(AvailableTeams.getTeams(team, year, null).map(
            (r) => r.gender
          ))).map(
            (gender) => stringToOption(gender)
          )}
          isSearchable={false}
          onChange={(option) => { if ((option as any)?.value) setGender((option as any).value) }}
        />
      </Col>
      <Col xs={6} sm={6} md={3} lg={2}>
        <Select
          value={ stringToOption(year) }
          options={Array.from(new Set(AvailableTeams.getTeams(team, null, gender).map(
            (r) => r.year
          ))).map(
            (year) => stringToOption(year)
          )}
          isSearchable={false}
          onChange={(option) => { if ((option as any)?.value) setYear((option as any).value) }}
        />
      </Col>
      <Col className="w-100" bsPrefix="d-lg-none d-md-none"/>
      <Col xs={12} sm={12} md={6} lg={6}>
        <Select
          components = { maybeMenuList() }
          isClearable={true}
          styles={{ menu: base => ({ ...base, zIndex: 1000 }) }}
          value={ getCurrentTeamOrPlaceholder() }
          options={teamList.map(
            (r) => stringToOption(r.team)
          )}
          onChange={(option) => {
            setTeam((option as any)?.value || "")
          }}
        />
      </Col>
      <Col>
        {getHistoryButton()}
        <div className="float-left">&nbsp;&nbsp;</div>
        {getCopyLinkButton()}
      </Col>
    </Form.Group>
    { children }
    <Form.Group as={Row} controlId="oppositionFilter">
      <Form.Label column sm="2">Opponent Strength</Form.Label>
      <Col sm="2">
        <InputGroup>
          <InputGroup.Prepend>
            <InputGroup.Text id="filterOppoBest">Best</InputGroup.Text>
          </InputGroup.Prepend>
          <Form.Control
            onChange={(ev: any) => {
              if (ev.target.value.match("^[0-9]*$") != null) {
                setMinRankFilter(ev.target.value);
              }
            }}
            placeholder = "eg 0"
            value={minRankFilter}
          />
        </InputGroup>
      </Col>
        <Col sm="2">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="filterOppoWorst">Worst</InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              onChange={(ev: any) => {
                if (ev.target.value.match("^[0-9]*$") != null) {
                  setMaxRankFilter(ev.target.value);
                }
              }}
              placeholder = "eg 400"
              value={maxRankFilter}
            />
            </InputGroup>
        </Col>
      <Form.Label column sm="2">(out of ~360 teams)</Form.Label>
    </Form.Group>
    <Col>
      <Button disabled={submitDisabled} variant="primary" onClick={onSubmit}>Submit</Button>
      {getExampleButtonIfNoTeam()}
    </Col>
  </Form></LoadingOverlay>;
}

export default CommonFilter;
