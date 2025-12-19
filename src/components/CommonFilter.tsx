// React imports:
import React, { useState, useEffect } from "react";

// Lodash
import _ from "lodash";

// Bootstrap imports:

import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Tooltip from "react-bootstrap/Tooltip";
import Modal from "react-bootstrap/Modal";

// Additional components:
//@ts-ignore
import Select, { components } from "react-select";
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory } from "@fortawesome/free-solid-svg-icons";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";
// @ts-ignore
import { Shake } from "reshake";
// @ts-ignore
import ls from "local-storage";

// Component imports:
import HistorySelector, {
  historySelectContainerWidth,
} from "./shared/HistorySelector";
import LineupQueryAutoSuggestText, {
  notFromAutoSuggest,
} from "./shared/LineupQueryAutoSuggestText";

// Utils:
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { PreloadedDataSamples } from "../utils/internal-data/preloadedData";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { RequestUtils } from "../utils/RequestUtils";
import {
  FilterRequestInfo,
  ParamPrefixes,
  ParamPrefixesType,
  ParamDefaults,
  CommonFilterParams,
} from "../utils/FilterModels";
import { HistoryManager } from "../utils/HistoryManager";
import { UrlRouting } from "../utils/UrlRouting";
import {
  QueryUtils,
  CommonFilterCustomDate,
  GameSelection,
  FilteredGameSelection,
} from "../utils/QueryUtils";

// Library imports:
import fetch from "isomorphic-unfetch";
import fetchBuilder from "fetch-retry-ts";
import QueryFilterDropdown from "./shared/QueryFilterDropdown";
import { QueryDisplayUtils } from "../utils/QueryDisplayUtils";
import DateRangeModal from "./shared/DateRangeModal";
import { DateUtils } from "../utils/DateUtils";
import { Badge } from "react-bootstrap";
import GameSelectorModal from "./shared/GameSelectorModal";
import ThemedSelect from "./shared/ThemedSelect";
import { ClientRequestCache } from "../utils/ClientRequestCache";

interface Props<PARAMS> {
  startingState: PARAMS;
  onChangeState: (newParams: PARAMS) => void;
  onChangeCommonState: (newCommonParams: CommonFilterParams) => void;
  tablePrefix: ParamPrefixesType;
  tablePrefixForPrimaryRequest?: ParamPrefixesType; //(goes with primary request, normally same as tablePrefix)
  /** If all FilterRequestInfo[] have tags then first FilterRequestInfo[] must equal PARAMS and all must have tags */
  buildParamsFromState: (
    includeFilterParams: Boolean,
    forQuery?: Boolean
  ) => [PARAMS, FilterRequestInfo[]];
  /** if the FilterRequestInfo's all contains tags then its input is a Record<string, (json)>, else it's an array */
  childHandleResponse:
    | ((json: any[], wasError: Boolean) => void)
    | ((json: Record<string, any>, wasError: Boolean) => void);
  buildLinks?: (params: PARAMS) => React.ReactNode[];
  majorParamsDisabled?: boolean; //(not currently used but would allow you to block changing team/seeason/gender)
  /** Note there needs to be an intermediate 1-up in the parent filter, see LineupFilter for an example */
  forceReload1Up?: number; //force submits a new set of parameters if true
  matchupMode?: "game" | "preview";
  blockSubmit?: boolean;
  onGameSelectionChange?: (gameSelection: FilteredGameSelection) => void;
  onRosterChange?: (roster: string[]) => void;
  gameSelectionRef?: React.MutableRefObject<FilteredGameSelection | undefined>;
  rosterRef?: React.MutableRefObject<string[] | undefined>;
  hideSemiAdvancedOptions?: boolean; //(only show team selector)
  propKey?: number;
  extraButton?: React.ReactElement;
}

/** Used to pass the submitListener to child components */
export const GlobalKeypressManager = React.createContext((ev: any) => {});

const fetchRetryOptions = {
  retries: 5,
  retryDelay: 500,
  retryOn: [419, 502, 503, 504],
};
const fetchWithRetry = fetchBuilder(fetch, fetchRetryOptions);

/** Type workaround per https://stackoverflow.com/questions/51459971/type-of-generic-stateless-component-react-or-extending-generic-function-interfa */
type CommonFilterI<PARAMS = any> = React.FunctionComponent<Props<PARAMS>>;

const CommonFilter: CommonFilterI = ({
  children,
  startingState,
  onChangeState,
  onChangeCommonState,
  tablePrefix,
  tablePrefixForPrimaryRequest,
  buildParamsFromState,
  childHandleResponse,
  buildLinks,
  majorParamsDisabled,
  forceReload1Up,
  matchupMode,
  blockSubmit,
  onGameSelectionChange,
  onRosterChange,
  gameSelectionRef,
  rosterRef,
  hideSemiAdvancedOptions,
  propKey,
  extraButton,
}) => {
  //console.log("Loading CommonFilter " + JSON.stringify(startingState));

  // Data model

  // Ugly internals
  const [queryIsLoading, setQueryIsLoading] = useState(false);
  const [atLeastOneQueryMade, setAtLeastOneQueryMade] = useState(false);
  const [pageJustLoaded, setPageJustLoaded] = useState(true);
  const [currForceReload1Up, setCurrForceload1up] = useState(forceReload1Up);
  const [currState, setCurrState] = useState(startingState);

  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);

  // Data source
  const [team, setTeam] = useState(
    startingState.team ||
      ClientRequestCache.getSavedTeam() ||
      ParamDefaults.defaultTeam
  );
  const [year, setYear] = useState(
    DateUtils.cleanYear(
      startingState.year,
      ClientRequestCache.getSavedYear() || ParamDefaults.defaultYear,
      [DateUtils.ExtraYears]
    )
  );
  const [gender, setGender] = useState(
    startingState.gender ||
      ClientRequestCache.getSavedGender() ||
      ParamDefaults.defaultGender
  );
  /** Pre-calculate this */
  const teamList = AvailableTeams.getTeams(null, year, gender);

  // Generic filters:

  const [minRankFilter, setMinRankFilter] = useState(
    startingState.minRank || ParamDefaults.defaultMinRank
  );
  const [maxRankFilter, setMaxRankFilter] = useState(
    startingState.maxRank || ParamDefaults.defaultMaxRank
  );
  const [baseQuery, setBaseQuery] = useState(startingState.baseQuery || "");

  const [garbageTimeFiltered, setGarbageTimeFiltered] = useState(
    _.isNil(startingState.filterGarbage)
      ? ParamDefaults.defaultFilterGarbage
      : startingState.filterGarbage
  );

  const [queryFilters, setQueryFilters] = useState(
    QueryUtils.parseFilter(
      _.isNil(startingState.queryFilters)
        ? ParamDefaults.defaultQueryFilters
        : startingState.queryFilters,
      year
    )
  );

  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [gameSelection, setGameSelection] = useState<FilteredGameSelection>({
    games: [],
  });

  const [showGamesModal, setShowGamesModal] = useState<boolean>(false);
  const [rosterNames, setRosterNames] = useState<string[]>([]);
  /** for debugging roster loading issues */
  const rosterFetchDebug = false;

  /** Parse the return from fetch Roster into name fragments */
  const handleRosterResponse = (players: string[]) => {
    const names = _.chain(players)
      .map((player) => `"${player}"`)
      .value();

    setRosterNames(names);
  };

  useEffect(() => {
    // If something has legit changed then notify clients:
    if (
      onGameSelectionChange &&
      gameSelection.filter &&
      (gameSelection.filter.team != team ||
        gameSelection.filter.year != year ||
        gameSelection.filter.gender != gender)
    ) {
      onGameSelectionChange({ games: [] });
    }
    // Update state:
    setRosterNames([]);
    setGameSelection({ games: [] }); //(changes to team season so unset games)
    if (team && year && gender) {
      // Fetch the team roster
      RequestUtils.fetchRoster(
        { team, year, gender },
        handleRosterResponse,
        dataLastUpdated,
        rosterFetchDebug
      );

      // Fetch the team's set of games
      RequestUtils.fetchOpponents(
        { team, year, gender },
        (results) => {
          // Reset any game-based filters if needed:
          if (
            gameSelection.filter &&
            (gameSelection.filter.team != team ||
              gameSelection.filter.year != year ||
              gameSelection.filter.gender != gender)
          ) {
            setQueryFilters(
              QueryUtils.setCustomGameSelection(queryFilters, undefined)
            );
          }
          setGameSelection({
            filter: {
              team,
              year,
              gender,
            },
            games: results.map((r) => {
              return {
                date: r.date || "????-??-??",
                score: RequestUtils.buildScoreInfo(r),
                opponent: (r.opponent || "?:Unknown").substring(2),
                location: _.thru(r.opponent || "??", (key) => {
                  if (key.startsWith("H:")) {
                    return "Home";
                  } else if (key.startsWith("A:")) {
                    return "Away";
                  } else {
                    return "Neutral";
                  }
                }),
              };
            }),
          });
        },
        dataLastUpdated,
        isDebug
      );
    }
  }, [team, year, gender]);
  /** Notify child filter elements when the games change */
  useEffect(() => {
    onGameSelectionChange &&
      gameSelection.filter &&
      onGameSelectionChange(gameSelection);
  }, [gameSelection]);
  useEffect(() => {
    onRosterChange && onRosterChange(rosterNames);
  }, [rosterNames]);
  if (gameSelectionRef) {
    //(allow access from child elements)
    gameSelectionRef.current = gameSelection;
  }
  if (rosterRef) {
    //(allow access from child elements)
    rosterRef.current = rosterNames;
  }

  // Validation, this currently only supports once case:
  const [showInvalidQuery, setShowInvalidQuery] = useState(false as boolean);

  // Automatically update child state when any current param is changed:
  // (Note this doesn't trigger a change to the URL unless submit is pressed)
  useEffect(() => {
    //(note: this is duplicated in the force reload logic)
    onChangeCommonState({
      team: team,
      year: year,
      gender: gender,
      minRank: minRankFilter,
      maxRank: maxRankFilter,
      baseQuery: baseQuery,
      filterGarbage: garbageTimeFiltered,
      queryFilters: QueryUtils.buildFilterStr(queryFilters),
    });
  }, [
    team,
    year,
    gender,
    minRankFilter,
    maxRankFilter,
    baseQuery,
    garbageTimeFiltered,
    queryFilters,
  ]);

  const [submitDisabled, setSubmitDisabled] = useState(false); // (always start as true on page load)
  const [reportIsDisabled, setReportIsDisabled] = useState(false); //(same as above)
  const canSubmit = () => !submitDisabled && !(blockSubmit || false);

  const isDebug = process.env.NODE_ENV !== "production";

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  // Utils

  const genderYear = `${gender}_${year}`;
  const currentJsonEpoch = dataLastUpdated[genderYear] || -1;

  /** Keyboard listener - handles global page overrides while supporting individual components */
  const submitListenerFactory = (inAutoSuggest: boolean) => (event: any) => {
    const allowKeypress = () => {
      //(if this logic is run inside AutoSuggestText, we've already processed the special cases so carry on)
      return inAutoSuggest || notFromAutoSuggest(event);
    };
    if (
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      event.keyCode == 13 ||
      event.keyCode == 14
    ) {
      if (canSubmit() && allowKeypress()) {
        onSubmit();
      } else if (event && event.preventDefault) {
        event.preventDefault();
      }
    } else if (event.code == "Escape" || event.keyCode == 27) {
      if (canSubmit() && allowKeypress()) {
        document.body.click(); //closes any overlays (like history) that have rootClick
      }
    }
  };

  /** Used with LS to determine if user is active */
  const sessionActiveKey = "session-activity";

  /** Was the session active recently enough that we'll auto-load? */
  const isSessionActive = () => {
    // const thresholdMs = 24*3600*1000; //(1 day)
    // const lastActive = parseInt((ls as any).get(sessionActiveKey));
    // const now = new Date().getTime();
    // return (now - lastActive) < thresholdMs; //4hrs
    // Let's just start auto-loading everything
    return true;
  };
  /** Update session activity */
  const registerSessionActivity = (sessionActive: boolean) => {
    if (!sessionActive) {
      console.log(
        "Set browser session active, will auto-retrieve non-cached requests"
      );
    }
    (ls as any).set(sessionActiveKey, "" + new Date().getTime());
  };

  /** Handles data loading logic either when loading a page (onLoad==true) or pressing submit (onLoad==false) */
  const requestHandlingLogic = (onLoadIn: boolean) => {
    if (onLoadIn && shouldSubmitBeDisabled()) {
      return; //page load when no team/gender/season is selected
    }
    const sessionActive = isSessionActive();
    const onLoad = onLoadIn && !sessionActive; //(ie always false if session active)
    if (!onLoadIn) registerSessionActivity(sessionActive); //(pressed button => session active)
    if (onLoadIn && !onLoad) {
      // (user visited page but we're going to load it anyway)
      setQueryIsLoading(true);
    }

    const fetchUrl = (url: string, force: boolean) => {
      return !onLoad || force //(if onLoad - JSON cache, or wait for user to hit submit)
        ? fetchWithRetry(url).then((response: fetch.IsomorphicResponse) => {
            return response
              .json()
              .then((json: any) => [json, response.ok, response]);
          })
        : Promise.reject(
            new Error("Needed request, currently forcing user to press submit")
          );
    };
    const [primaryRequest, filterRequests] = buildParamsFromState(false, true);

    const newFormat = !_.isNil(_.find(filterRequests, (req) => req.tag));

    const allPromises = Promise.all(
      RequestUtils.requestHandlingLogic(
        primaryRequest,
        tablePrefixForPrimaryRequest || tablePrefix,
        _.drop(filterRequests, newFormat ? 1 : 0),
        fetchUrl,
        currentJsonEpoch,
        isDebug
      )
    );
    allPromises.then(
      (jsons: any[]) => {
        if (onLoadIn) registerSessionActivity(sessionActive); //(retrieved from cache => session active)
        if (newFormat) {
          if (!_.every(filterRequests, (req) => req.tag)) {
            throw new Error(
              `In new format, all requests must have a tag [${filterRequests.map(
                (r, index) => r.tag || `MISSING=${index}`
              )}])`
            );
          }
          handleResponse(
            jsons,
            _.map(filterRequests, (req, index) => req.tag || `MISSING=${index}`)
          );
        } else {
          handleResponse(jsons);
        }
      },
      (rejection) => {
        if (isDebug) {
          console.log(`(no cached entry found)`);
        }
      }
    );
  };

  /** Checks if the input has been changed, and also handles on page load logic */
  useEffect(() => {
    initClipboard();
    setSubmitDisabled(shouldSubmitBeDisabled());
    setReportIsDisabled(
      _.isEmpty(team) || _.isEmpty(gender) || _.isEmpty(year)
    );

    const submitListener = submitListenerFactory(false);

    // Add "enter" to submit page (do on every effect, since removal occurs on every effect, see return below)
    if (typeof document !== `undefined`) {
      //(TODO: this actually causes mass complications with AutoSuggestText - see the useContext grovelling
      // 'cos for some reason preventDefault from AutoSuggestText gets ignored ... needs more investigation
      // but the grovelling works fine for now!)
      document.addEventListener("keydown", submitListener);
    }

    // Cached response and pre-load handling:
    const forceReload = forceReload1Up && forceReload1Up != currForceReload1Up;
    if (pageJustLoaded && (!propKey || propKey == 0)) {
      // Only do this once the team list has loaded
      if (
        (!_.isEmpty(gameSelection.games) && !_.isEmpty(rosterNames)) ||
        (tablePrefix != ParamPrefixes.game &&
          tablePrefix != ParamPrefixes.lineup)
      ) {
        if (isDebug)
          console.log(
            `Auto-reloading query on page reload ([${gameSelection.games.length} games][${rosterNames.length} roster entries])`
          );
        setPageJustLoaded(false); //(ensures this code only gets called once)
        // Load the data if it's cached
        requestHandlingLogic(true);
      } else {
        if (isDebug)
          console.log(
            "Disabling auto-reload query on page reload (because game selection not loaded)"
          );
      }
    } else if (forceReload) {
      // simulate user pressing "submit button"
      setCurrForceload1up(forceReload1Up || 0);
      onChangeCommonState({
        // THIS TAKE PLACE AFTER THE SUBMIT SO WILL RESET EVERYTHING BACK AGAIN, UGH
        team: team,
        year: year,
        gender: gender,
        minRank: minRankFilter,
        maxRank: maxRankFilter,
        baseQuery: baseQuery,
        filterGarbage: garbageTimeFiltered,
        queryFilters: QueryUtils.buildFilterStr(queryFilters),
      });
      onSubmit();
    }
    if (typeof document !== `undefined`) {
      //(if we added a clipboard listener, then remove it on page close)
      //(if we added a submitListener, then remove it on page close)
      return () => {
        if (clipboard) {
          clipboard.destroy();
          setClipboard(null);
        }
        document.removeEventListener("keydown", submitListener);
      };
    }
  });

  /** If the params match the last request, disable submit */
  function shouldSubmitBeDisabled() {
    // If parent is blocking then short-circuit this:
    if (blockSubmit) {
      return true;
    }

    const newParams = buildParamsFromState(false)[0];
    const moreSpecialCaseKeys = ["onQueryFilters", "offQueryFilters"];
    //(we remove these GameFilterParams from the query if they are null, handle that here)
    //TODO: really need to tidy up all these "missing if empty" special case clauses...
    const checkParamsUnchanged = (newParamsObj: any, currStateObj: any) => {
      const paramsUnchanged = _.keys(newParamsObj)
        .concat(moreSpecialCaseKeys)
        .filter((key) => {
          return (
            key != "filterGarbage" &&
            key != "queryFilters" &&
            key != "otherQueries"
          );
        })
        .every(
          (key: string) =>
            (newParamsObj as any)[key] == (currStateObj as any)[key]
        );
      const garbageSpecialCase =
        (newParamsObj?.filterGarbage || ParamDefaults.defaultFilterGarbage) ==
        (currStateObj?.filterGarbage || ParamDefaults.defaultFilterGarbage);
      const queryFiltersSpecialCase =
        (newParamsObj?.queryFilters || ParamDefaults.defaultQueryFilters) ==
        (currStateObj?.queryFilters || ParamDefaults.defaultQueryFilters);

      // Handy debug print:
      // console.log(
      //   `shouldSubmitBeDisabled: ${JSON.stringify(
      //     newParamsObj
      //   )} ${JSON.stringify(
      //     currStateObj
      //   )} ... ${paramsUnchanged} ${garbageSpecialCase} ${queryFiltersSpecialCase}`
      // );

      return paramsUnchanged && garbageSpecialCase && queryFiltersSpecialCase;
    };

    const allParamsUnchanged =
      checkParamsUnchanged(newParams, currState) &&
      _.every(newParams.otherQueries || [], (otherQuery, otherQueryIndex) => {
        return checkParamsUnchanged(
          otherQuery,
          currState.otherQueries?.[otherQueryIndex] || {
            query: "",
            queryFilters: ParamDefaults.defaultQueryFilters,
          }
        );
      });

    return (
      (atLeastOneQueryMade && allParamsUnchanged) ||
      team == "" ||
      year == AvailableTeams.extraTeamName
    );
  }

  /** Handles the response from ES to a stats calc request */
  function handleResponse(jsons: any[], tags?: string[]) {
    setQueryIsLoading(false);
    const newParams = buildParamsFromState(true)[0];
    const wasError = _.some(jsons, (json) =>
      RequestUtils.isResponseError(json)
    );
    if (!wasError) {
      setAtLeastOneQueryMade(true);
      setCurrState(newParams);
      onChangeState(newParams);
    }
    if (tags) {
      //(new format)
      const newFormatResponse = childHandleResponse as (
        json: Record<string, any>,
        wasError: Boolean
      ) => void;
      const jsonMap = _.zipObject(tags, jsons);
      newFormatResponse(jsonMap, wasError);
    } else {
      //(legacy format)
      const oldFormatResponse = childHandleResponse as (
        jsons: any[],
        wasError: Boolean
      ) => void;
      oldFormatResponse(jsons, wasError);
    }
  }

  /** The user has pressed the submit button - mix of generic and custom logic */
  function onSubmit() {
    // Store every primary request in history, successful or not:
    // including the filtering on the results
    const newParamsWithFilterParams = buildParamsFromState(true)[0];
    const checkQueriesForLowercaseOps = (strs: Array<string | undefined>) => {
      return _.find(strs, (str) => str && / (and|or|not) /.exec(str));
    };
    if (
      checkQueriesForLowercaseOps([
        newParamsWithFilterParams.baseQuery, //(common)
        newParamsWithFilterParams.onQuery,
        newParamsWithFilterParams.offQuery, //(on off page)
      ])
    ) {
      // Invalid query, raise an error, don't submit
      setShowInvalidQuery(true);
    } else {
      // Submit validated, carry on
      setQueryIsLoading(true);

      const newParamsStrWithFilterParams = QueryUtils.stringify(
        newParamsWithFilterParams
      );
      HistoryManager.addParamsToHistory(
        newParamsStrWithFilterParams,
        tablePrefix
      );

      // Load the data via request
      requestHandlingLogic(false);
    }
  }

  /** Load the designated example */
  function onSeeExample() {
    registerSessionActivity(true); //(ensures gets cached)

    // (this is overly complicated looking because it used to include a load of cache management
    //  which has been removed - it's close enough to optimal it's not currently worth tidying up though)
    const prefixesAndParamStrs = (() => {
      if (tablePrefix == ParamPrefixes.report) {
        if (gender == "Women") {
          const newUrl = `${PreloadedDataSamples.womenLineup}`;
          return [["TeamReport", newUrl]];
        } else {
          //(default is men)
          const newUrl = `${PreloadedDataSamples.menLineup}`;
          return [["TeamReport", newUrl]];
        }
      } else if (tablePrefix == ParamPrefixes.game) {
        if (gender == "Women") {
          const newUrl = `${PreloadedDataSamples.womenOnOff}`;
          return [["", newUrl]];
        } else {
          //(default is men)
          const newUrl = `${PreloadedDataSamples.menOnOff}`;
          return [["", newUrl]];
        }
      } else if (tablePrefix == ParamPrefixes.lineup) {
        if (gender == "Women") {
          const newUrl = `${PreloadedDataSamples.womenLineup}`;
          return [["LineupAnalyzer", newUrl]];
        } else {
          //(default is men)
          const newUrl = `${PreloadedDataSamples.menLineup}`;
          return [["LineupAnalyzer", newUrl]];
        }
      } else if (tablePrefix == ParamPrefixes.gameInfo) {
        if (gender == "Women") {
          const newUrl = `${PreloadedDataSamples.womenSingleGames}`;
          return [["MatchupAnalyzer", newUrl]];
        } else {
          //(default is men)
          const newUrl = `${PreloadedDataSamples.menSingleGames}`;
          return [["MatchupAnalyzer", newUrl]];
        }
      }
      return [["", ""]];
    })();
    const pageAndParam = prefixesAndParamStrs[0] as [string, string];
    window.location.href = `/${pageAndParam[0]}?${pageAndParam[1]}`;
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return { label: s, value: s };
  }
  /** For use in team select */
  function getCurrentTeamOrPlaceholder() {
    const currTeam = AvailableTeams.calculateCurrentLabel(
      team,
      year,
      gender,
      (aliasUpdate) => {
        setTeam(aliasUpdate);
      }
    ) || {
      value: undefined,
      label: "Choose Team...",
    };
    return currTeam;
  }

  /** Adds the MenuList component with user prompt if there are teams fitered out*/
  function maybeMenuList() {
    if (gender == "Women" || year < DateUtils.yearFromWhichAllMenD1Imported) {
      return { MenuList };
    }
  }

  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_${tablePrefix}`, {
        text: function (trigger) {
          return window.location.href;
        },
      });
      newClipboard.on("success", (event: ClipboardJS.Event) => {
        // Add the saved entry to the clipbaorrd
        const newParamsStrWithFilterParams = QueryUtils.stringify(
          buildParamsFromState(true)[0]
        );
        HistoryManager.addParamsToHistory(
          newParamsStrWithFilterParams,
          tablePrefix
        );
        // Clear the selection in some visually pleasing way
        setTimeout(function () {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  }

  // Visual components:

  /** Let the user know that he might need to change */
  const MenuList = (props: any) => {
    return (
      <components.MenuList {...props}>
        <p className="text-secondary text-center">
          (Let me know if there's a team/season you want to see!)
        </p>
        {props.children}
      </components.MenuList>
    );
  };

  /** Add button to allow users to access their analysis history easily */
  const getHistoryButton = () => {
    // I actually want placement=left but it doesn't work on mobile
    return (
      <OverlayTrigger
        rootClose={true}
        trigger="click"
        key="left"
        placement="auto"
        overlay={
          <Popover
            id="popover-positioned-left"
            style={{ maxWidth: historySelectContainerWidth }}
          >
            <Popover.Title as="h3">{`History`}</Popover.Title>
            <Popover.Content>
              <HistorySelector tablePrefix={tablePrefix} />
            </Popover.Content>
          </Popover>
        }
      >
        <Button
          className="float-left"
          id="historyButton"
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faHistory} />
        </Button>
      </OverlayTrigger>
    );
  };
  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">
        Copies URL to clipboard (and saves state to history)
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          className="float-left"
          id={`copyLink_${tablePrefix}`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>
    );
  };
  const getClearQueryButton = () => {
    const onClick = () => {
      const defaultParams = { gender, year, team }; //common set of params to preserve
      const getUrl = () => {
        if (tablePrefix == ParamPrefixes.game) {
          return UrlRouting.getGameUrl(defaultParams, {});
        } else if (tablePrefix == ParamPrefixes.lineup) {
          return UrlRouting.getLineupUrl(defaultParams, {});
        } else if (tablePrefix == ParamPrefixes.report) {
          return UrlRouting.getTeamReportUrl(defaultParams);
        } else if (tablePrefix == ParamPrefixes.gameInfo) {
          return UrlRouting.getMatchupUrl(defaultParams);
        } else {
          return undefined;
        }
      };
      const newUrl = getUrl();
      if (newUrl) {
        window.location.href = newUrl;
      }
    };
    const tooltip = (
      <Tooltip id="copyLinkTooltip">
        Clears and empties the page, preserving only gender / year / team
        settings
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          onClick={() => onClick()}
          className="float-right"
          id={`clearQuery_${tablePrefix}`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faTrashAlt} />
        </Button>
      </OverlayTrigger>
    );
  };

  /** If no team is specified, add the option to jump to an example */
  const getExampleButtonsIfNoTeamElseClear = () => {
    if (team == "") {
      return (
        <Shake
          h={20}
          v={5}
          r={5}
          q={5}
          int={25}
          fixed={true}
          className="float-right"
        >
          <Button variant="warning" onClick={() => onSeeExample()}>
            <b>Example ({gender})!</b>
          </Button>
        </Shake>
      );
    } else {
      // If there is no query then show clear query
      return getClearQueryButton();
    }
  };

  /** Shows the blog help when accessed via hoop-explorer, consistency with top-level maybeShowBlog */
  function maybeShowBlogHelp() {
    const publicSite = !_.startsWith(server, "cbb-on-off-analyzer");
    if (publicSite) {
      return (
        <a
          href="https://hoop-explorer.blogspot.com/2020/01/basic-and-advanced-queries-in-hoop.html"
          target="_blank"
        >
          (?)
        </a>
      );
    } else {
      return (
        <a href="/query_docs.html" target="_blank">
          (?)
        </a>
      );
    }
  }

  function maybeShowGarbageHelp() {
    const publicSite = !_.startsWith(server, "cbb-on-off-analyzer");
    if (publicSite) {
      return (
        <span>
          &nbsp;
          <a
            href="https://hoop-explorer.blogspot.com/2020/01/garbage-time.html"
            target="_blank"
          >
            (?)
          </a>
        </span>
      );
    } else {
      return undefined;
    }
  }

  const garbageFilterTooltip = (
    <Tooltip id="garbageFilterTooltip">
      Filters out lineups in garbage time - see the "Garbage time" article under
      "Blog contents" for more details
    </Tooltip>
  );

  return (
    <LoadingOverlay
      active={queryIsLoading}
      spinner
      text="Calculating statistics"
    >
      <Modal show={showInvalidQuery} onHide={() => setShowInvalidQuery(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ambiguous Query Error!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Your query contains one of these terms: ' <b>and</b> ', ' <b>or</b> ',
          ' <b>not</b> '.
          <br />
          Please use ' <b>AND</b> ', ' <b>OR</b> ', ' <b>NOT</b> ' instead.
          <br />
          <br />
          <i>
            In the unlikely event you wanted to search on the word rather than
            using it as an operator, please put the term in quotes, eg ' "and" '
          </i>
          .
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowInvalidQuery(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      <DateRangeModal
        show={showDateRangeModal}
        queryType="Baseline Query"
        onSave={(filter: CommonFilterCustomDate | undefined) =>
          setQueryFilters(QueryUtils.setCustomDate(queryFilters, filter))
        }
        onHide={() => setShowDateRangeModal(false)}
        year={startingState.year}
      />
      <GameSelectorModal
        queryType="Baseline Query"
        games={gameSelection.games}
        selectedGames={QueryUtils.buildGameSelectionModel(queryFilters)}
        show={showGamesModal}
        onClose={() => setShowGamesModal(false)}
        onSubmit={(selectedGame) => {
          setQueryFilters(
            QueryUtils.setCustomGameSelection(
              queryFilters,
              gameSelection.games.length > 0
                ? QueryUtils.buildGameSelectionFilter(selectedGame)
                : undefined
            )
          );
          setShowGamesModal(false);
        }}
      />
      <Form>
        <Form.Group as={Row}>
          <Col xs={6} sm={6} md={3} lg={2}>
            <ThemedSelect
              isDisabled={majorParamsDisabled}
              value={stringToOption(gender)}
              options={Array.from(
                new Set(
                  AvailableTeams.getTeams(team, year, null).map((r) => r.gender)
                )
              ).map((gender) => stringToOption(gender))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) setGender((option as any).value);
              }}
            />
          </Col>
          <Col xs={6} sm={6} md={3} lg={2}>
            <ThemedSelect
              isDisabled={majorParamsDisabled}
              styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
              value={stringToOption(year)}
              options={_.reverse(
                Array.from(
                  //(reverse because years are descending we want them ascending)
                  new Set(
                    AvailableTeams.getTeams(team, null, gender).map(
                      (r) => r.year
                    )
                  )
                )
              )
                .concat([AvailableTeams.extraTeamName])
                .map((year) => stringToOption(year))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) setYear((option as any).value);
              }}
            />
          </Col>
          <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
          <Col xs={12} sm={12} md={6} lg={6}>
            <ThemedSelect
              isDisabled={majorParamsDisabled}
              components={maybeMenuList()}
              isClearable={false}
              styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
              value={getCurrentTeamOrPlaceholder()}
              options={AvailableTeams.teamsToLabels(teamList)}
              onChange={(option: any) => {
                const selection = (option as any)?.value || "";
                if (year == AvailableTeams.extraTeamName) {
                  const teamYear = selection.split(/ (?=[^ ]+$)/);
                  setTeam(teamYear[0]);
                  setYear(teamYear[1]);
                } else {
                  setTeam(selection);
                }
              }}
            />
          </Col>
          <Col className="mt-1">
            {getHistoryButton()}
            <div className="float-left">&nbsp;&nbsp;</div>
            {getCopyLinkButton()}
          </Col>
        </Form.Group>
        <GlobalKeypressManager.Provider value={submitListenerFactory(true)}>
          {children}
        </GlobalKeypressManager.Provider>
        {matchupMode || hideSemiAdvancedOptions ? null : (
          <Form.Group as={Row}>
            <Form.Label column sm="2">
              Baseline Query {maybeShowBlogHelp()}
            </Form.Label>
            <Col sm="8">
              <Container>
                <Row>
                  <InputGroup>
                    <LineupQueryAutoSuggestText
                      readOnly={false}
                      placeholder="eg 'Player1 AND NOT (WalkOn1)'"
                      initValue={baseQuery}
                      year={year}
                      gender={gender}
                      team={team}
                      games={gameSelection.games}
                      onChange={(ev: any) => setBaseQuery(ev.target.value)}
                      onKeyUp={(ev: any) => setBaseQuery(ev.target.value)}
                      onKeyDown={submitListenerFactory(true)}
                    />
                    <InputGroup.Append>
                      <QueryFilterDropdown
                        queryFilters={queryFilters}
                        setQueryFilters={setQueryFilters}
                        showGameSelectorModal={() => setShowGamesModal(true)}
                        showCustomRangeFilter={() =>
                          setShowDateRangeModal(true)
                        }
                      />
                    </InputGroup.Append>
                  </InputGroup>
                </Row>
                {queryFilters.length > 0 ? (
                  <Row>
                    &nbsp;
                    {queryFilters
                      .map((p, i) => (
                        <span key={`conf${i}`}>
                          {i > 0 ? null : (
                            <span>
                              <Badge variant="primary">AND</Badge>{" "}
                            </span>
                          )}
                          {QueryDisplayUtils.showQueryFilter(p, gender, year)}
                          &nbsp;&nbsp;
                        </span>
                      ))
                      .concat(
                        startingState.invertBase ||
                          startingState.invertBaseQueryFilters
                          ? [
                              <span key="invertBase">
                                <span>
                                  <Badge variant="primary">AND</Badge>
                                  <Badge variant="danger">NOT</Badge>{" "}
                                </span>
                                {QueryDisplayUtils.showInvertedQueryAndFilters(
                                  startingState.invertBase,
                                  startingState.invertBaseQueryFilters
                                )}
                              </span>,
                            ]
                          : []
                      )}
                  </Row>
                ) : null}
              </Container>
            </Col>
            {extraButton ? (
              <Col sm="2" className="mt-1">
                {extraButton}
              </Col>
            ) : null}
          </Form.Group>
        )}
        {matchupMode || hideSemiAdvancedOptions ? null : (
          <Form.Group as={Row} controlId="oppositionFilter">
            <Form.Label column sm="2">
              Opponent Strength
            </Form.Label>
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
                  placeholder="eg 0"
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
                  placeholder="eg 400"
                  value={maxRankFilter}
                />
              </InputGroup>
            </Col>
            <Form.Label column sm="2">
              <span className="text-muted">(out of ~360 teams)</span>
            </Form.Label>
            <Col sm="3" className="mt-1 pt-1">
              <OverlayTrigger placement="auto" overlay={garbageFilterTooltip}>
                <div>
                  <Form.Check
                    type="switch"
                    id="excludeGarbage"
                    checked={garbageTimeFiltered}
                    onChange={() => {
                      setGarbageTimeFiltered(!garbageTimeFiltered);
                    }}
                    label={<span>Filter Garbage{maybeShowGarbageHelp()}</span>}
                  />
                </div>
              </OverlayTrigger>
            </Col>
          </Form.Group>
        )}
        <Row>
          <Col sm={2}>
            <Button
              disabled={!canSubmit()}
              variant="primary"
              onClick={onSubmit}
            >
              Submit
            </Button>
          </Col>
          <Col className="text-center w-100 pt-2">
            {_.thru(buildLinks, (__) => {
              if (buildLinks) {
                const links = buildLinks({
                  ...startingState,
                  team: team, //pull these 3 params from currently active dropdowns vs last submit
                  gender: gender,
                  year: year,
                });
                return _.isEmpty(links) ? null : (
                  <small className="text-center">
                    Links:{" "}
                    {links.map((l, i) => (
                      <span>
                        {l}
                        {i < links.length - 1 && !_.isString(l) ? (
                          <span> | </span>
                        ) : (
                          ""
                        )}
                      </span>
                    ))}
                  </small>
                );
              } else {
                return null;
              }
            })}
          </Col>
          <Col sm={2}>{getExampleButtonsIfNoTeamElseClear()}</Col>
        </Row>
      </Form>
    </LoadingOverlay>
  );
};

export default CommonFilter;
