// React imports:
import React, { useState, useEffect } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
//@ts-ignore
import { components } from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faClipboard,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ConferenceSelector, {
  ConfSelectorConstants,
} from "./shared/ConferenceSelector";

// Math:
// @ts-ignore
import Statistics from "statistics.js";

// Table building
// Util imports
import {
  TeamEditorParams,
  OffseasonLeaderboardParams,
  TeamStatsExplorerParams,
  ParamDefaults,
} from "../utils/FilterModels";

import {
  Statistic,
  RosterEntry,
  PlayerCode,
  StatModels,
} from "../utils/StatModels";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { GradeUtils } from "../utils/stats/GradeUtils";
import { UrlRouting } from "../utils/UrlRouting";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import TeamEditorTable, { TeamEditorStatsModel } from "./TeamEditorTable";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { DateUtils } from "../utils/DateUtils";
import { InputGroup } from "react-bootstrap";

// Library imports:
import fetch from "isomorphic-unfetch";
import { RequestUtils } from "../utils/RequestUtils";
import {
  EvalResults,
  EvalRule,
  EvalStatInfo,
  EvalStatSubResults,
  OffseasonLeaderboardUtils,
  OffseasonTeamInfo,
  PredictedVsActualRankings,
} from "../utils/stats/OffseasonLeaderboardUtils";
import TeamFilterAutoSuggestText, {
  notFromFilterAutoSuggest,
} from "./shared/TeamFilterAutoSuggestText";
import { TeamStatsTableUtils } from "../utils/tables/TeamStatsTableUtils";
import {
  DivisionStatsCache,
  GradeTableUtils,
} from "../utils/tables/GradeTableUtils";
import { ConferenceToNickname } from "../utils/public-data/ConferenceInfo";
import { TeamEvalUtils } from "../utils/stats/TeamEvalUtils";
import LinqExpressionBuilder from "./shared/LinqExpressionBuilder";
import { AdvancedFilterUtils } from "../utils/AdvancedFilterUtils";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import AsyncFormControl from "./shared/AsyncFormControl";
import { LuckUtils } from "../utils/stats/LuckUtils";
import StickyRow from "./shared/StickyRow";
import ThemedSelect from "./shared/ThemedSelect";
import YearSelector from "./shared/YearSelector";
import { AnnotationMenuItems } from "./shared/AnnotationMenuItems";
import { CbbColors } from "../utils/CbbColors";
import { FeatureFlags } from "../utils/stats/FeatureFlags";

export type TeamStatsExplorerModel = {
  confs: string[];
  teams: any[];
  bubbleOffenses: Record<string, number[]>;
  bubbleDefenses: Record<string, number[]>;
  lastUpdated: number;
  error?: string;
  syntheticData?: boolean; //(if true, can't use T100 and conf sub-filters)
};

type Props = {
  startingState: TeamStatsExplorerParams;
  dataEvent: TeamStatsExplorerModel;
  onChangeState: (newParams: TeamStatsExplorerParams) => void;
};

const MAX_EXTRA_INFO_IN_ROWS = 30; //Too slow after this

/** A sensible looking set of bubble offenses for the hypo where the actual year is not available */
const fallbackBubbleOffense = [
  115.9, 113.2, 114.7, 113.4, 114.3, 114.1, 117.8, 114.6, 115.2, 113.1,
];
/** A sensible looking set of bubble offenses for the hypo where the actual year is not available */
const fallbackBubbleDefense = [
  99.5, 96.9, 98.7, 97.4, 98.4, 98.4, 102.1, 99.2, 100, 98.1,
];

const TeamStatsExplorerTable: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data model

  // (don't support tier changes)
  const tier: string = "All";

  // Data source
  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);
  const [confs, setConfs] = useState(startingState.confs || "");

  const [isT100, setIsT100] = useState(startingState.t100 || false);
  const [isConfOnly, setIsConfOnly] = useState(startingState.confOnly || false);

  const [maxTableSize, setMaxTableSize] = useState(
    startingState.maxTableSize || ParamDefaults.defaultTeamExplorerMaxTableSize
  );

  const [showExtraInfo, setShowExtraInfo] = useState(
    _.isNil(startingState.showExtraInfo) ? false : startingState.showExtraInfo
  );

  const [showPlayStyles, setShowPlayStyles] = useState(
    _.isNil(startingState.showPlayStyles) ? false : startingState.showPlayStyles
  );
  const [playStyleConfig, setPlayStyleConfig] = useState(
    startingState.playStyleConfig ||
      ParamDefaults.defaultTeamExplorerPlayStyleConfig
  );
  const [playStyleConfigStr, setPlayStyleConfigStr] = useState(
    startingState.playStyleConfigStr || ParamDefaults.defaultTeamPlayTypeConfig
  );

  /** Whether to make the quick toggle bar stick (default: on) */
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    _.isNil(startingState.stickyQuickToggle)
      ? true
      : startingState.stickyQuickToggle
  );

  // Basic filter:
  const manualFilterSelected =
    confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0; //(if so this will override the ordering)
  const [queryFilters, setQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const [tmpQueryFilters, setTmpQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const separatorKeyword = "BREAK"; //(not used but leave the logic in here in case we change our mind later)
  const { queryFiltersAsMap, queryFilterRowBreaks } = _.transform(
    queryFilters.split(";"),
    (acc, v, ii) => {
      const teamName = _.trim(v);
      if (teamName == separatorKeyword) {
        acc.queryFilterRowBreaks.add(ii - acc.queryFilterRowBreaks.size - 1);
      } else if (teamName != "") {
        const teams = [teamName].concat(AvailableTeams.teamAliases[teamName]);
        teams.forEach((team) => {
          if (team) {
            acc.queryFiltersAsMap[team] =
              1 + ii - acc.queryFilterRowBreaks.size;
          }
        });
      }
    },
    {
      queryFiltersAsMap: {} as Record<string, number>,
      queryFilterRowBreaks: new Set<number>(),
    }
  );
  const maybeFilterPromptTooltip = (
    <Tooltip id="maybeFilterPromptTooltip">
      Press Enter to apply this filter (current filter [{queryFilters}])
    </Tooltip>
  );
  const maybeFilterPrompt =
    queryFilters != tmpQueryFilters ? (
      <OverlayTrigger placement="auto" overlay={maybeFilterPromptTooltip}>
        <span>&nbsp;(*)</span>
      </OverlayTrigger>
    ) : null;

  // Advanced filter:
  const [advancedFilterStr, setAdvancedFilterStr] = useState(
    _.trim(startingState.advancedFilter || "")
  );
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(
    _.isNil(startingState.showAdvancedFilter)
      ? true
      : startingState.showAdvancedFilter
  );
  const [advancedFilterError, setAdvancedFilterError] = useState(
    undefined as string | undefined
  );
  const [secretQuery, setSecretQuery] = useState<string | undefined>(
    _.trim(startingState.secretQuery)
  );

  const [year, setYear] = useState(
    startingState.year || DateUtils.mostRecentYearWithData
  );

  const [gender, setGender] = useState(
    startingState.gender || ParamDefaults.defaultGender
  );

  const [sortBy, setSortBy] = useState(startingState.sortBy || "power");

  const teamList =
    year == DateUtils.AllYears || year.startsWith(DateUtils.MultiYearPrefix)
      ? _.chain(
          _.flatMap(AvailableTeams.byName, (teams, teamName) => {
            return [teamName].concat(
              // Just do "ADD_SEASON" and let user fill it in
              `${teamName}:ADD_SEASON`
              // Not doing: add every year, more intuitive but doesn't scale
              // teams
              //   .filter((t) => t.year && t.gender == gender)
              //   .map((t) => `${t.team}:${t.year.substring(2, 4)}+`)
            );
          })
        )
          .flatMap((team) => {
            const teamFrags = team.split(`:`);
            // Add aliases in:
            return [team].concat(
              (AvailableTeams.teamAliases[teamFrags[0]] || []).map((s) =>
                teamFrags[1] ? `${s}:${teamFrags[1]}` : s
              )
            );
          })
          .uniq()
          .value()
      : _.chain(
          _.flatMap(AvailableTeams.byName, (teams, __) => {
            const maybeTeam = teams.find(
              (t) => t.year == year && t.gender == gender
            );
            return maybeTeam ? [maybeTeam.team] : [];
          })
        )
          .flatMap((team) => {
            // Add aliases in:
            return [team].concat(AvailableTeams.teamAliases[team] || []);
          })
          .value();

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(startingState.showGrades)
      ? ParamDefaults.defaultEnabledGrade
      : startingState.showGrades
  );
  const [hideGlobalGradeSettings, setHideGlobalGradeSettings] =
    useState<boolean>(true);
  const showStandaloneGrades =
    GradeTableUtils.showingStandaloneGrades(showGrades);

  /** The settings to use for luck adjustment */
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(startingState.luck)
      ? ParamDefaults.defaultLuckConfig
      : startingState.luck
  );

  // Grades:

  const [divisionStatsCache, setDivisionStatsCache] = useState<
    Record<string, DivisionStatsCache>
  >({});
  /** TODO: this is used to trigger the memoized table, but not sure it works since the caches could be stale
   * since I'm not using a ref? Maybe it's OK because it's in a memo not an effect?
   */
  const [divisionStatsRefresh, setDivisionStatsRefresh] = useState<number>(0);

  // Events that trigger building or rebuilding the division stats cache
  useEffect(() => {
    if (
      showGrades ||
      showPlayStyles ||
      advancedFilterStr.includes("rank_") ||
      advancedFilterStr.includes("pctile_")
    ) {
      const yearsToCheck = _.thru(undefined, (__) => {
        if (year == DateUtils.AllYears) {
          return DateUtils.coreYears;
        } else if (year.startsWith(DateUtils.MultiYearPrefix)) {
          return DateUtils.getMultiYearSelection(year);
        } else {
          return [year];
        }
      });
      yearsToCheck.forEach((yearToCheck) => {
        const currCacheForThisYear = divisionStatsCache[yearToCheck] || {};
        const yearOrGenderChanged =
          yearToCheck != currCacheForThisYear.year ||
          gender != currCacheForThisYear.gender;

        if (_.isEmpty(currCacheForThisYear) || yearOrGenderChanged) {
          if (!_.isEmpty(currCacheForThisYear)) {
            setDivisionStatsCache((currCache) => ({
              ...currCache,
              [yearToCheck]: {},
            })); //unset if set
          }
          GradeTableUtils.populateTeamDivisionStatsCache(
            { year: yearToCheck, gender },
            (newCache) => {
              setDivisionStatsCache((currCache) => ({
                ...currCache,
                [yearToCheck]: newCache,
              }));
              setDivisionStatsRefresh((curr) => curr + 1);
            }
          );
        }
      });
    }
  }, [
    year,
    gender,
    showGrades,
    showPlayStyles,
    playStyleConfig,
    advancedFilterStr,
  ]);

  /** When the params change */
  useEffect(() => {
    onChangeState({
      year,
      gender,
      maxTableSize,
      confs,
      showGrades,
      showExtraInfo,
      showPlayStyles,
      playStyleConfig,
      playStyleConfigStr,
      sortBy: sortBy,
      queryFilters: queryFilters,
      advancedFilter: advancedFilterStr,
      t100: isT100,
      confOnly: isConfOnly,
      showAdvancedFilter,
      secretQuery,
      stickyQuickToggle,
    });
  }, [
    confs,
    year,
    gender,
    sortBy,
    maxTableSize,
    showGrades,
    showExtraInfo,
    showPlayStyles,
    playStyleConfig,
    playStyleConfigStr,
    queryFilters,
    advancedFilterStr,
    isT100,
    isConfOnly,
    showAdvancedFilter,
    secretQuery,
    stickyQuickToggle,
  ]);

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  /** Keyboard listener - handles global page overrides while supporting individual components */
  const submitListenerFactory = (inAutoSuggest: boolean) => (event: any) => {
    const allowKeypress = () => {
      //(if this logic is run inside AutoSuggestText, we've already processed the special cases so carry on)
      return inAutoSuggest || notFromFilterAutoSuggest(event);
    };
    if (
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      event.keyCode == 13 ||
      event.keyCode == 14
    ) {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
    } else if (event.code == "Escape" || event.keyCode == 27) {
      if (allowKeypress()) {
        document.body.click(); //closes any overlays (like history) that have rootClick
      }
    }
  };

  useEffect(() => {
    // Add and remove clipboard listener
    initClipboard();

    const submitListener = submitListenerFactory(false);

    // Add "enter" to submit page (do on every effect, since removal occurs on every effect, see return below)
    if (typeof document !== `undefined`) {
      //(TODO: this actually causes mass complications with AutoSuggestText - see the useContext grovelling
      // 'cos for some reason preventDefault from AutoSuggestText gets ignored ... needs more investigation
      // but the grovelling works fine for now!)
      document.addEventListener("keydown", submitListener);
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
  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_teamStatsExplorer`, {
        text: function (trigger) {
          return window.location.href;
        },
      });
      newClipboard.on("success", (event: ClipboardJS.Event) => {
        //(unlike other tables, don't add to history)
        // Clear the selection in some visually pleasing way
        setTimeout(function () {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  }

  /** At the expense of some time makes it easier to see when changes are happening */
  const friendlyChange = (
    change: () => void,
    guard: boolean,
    timeout: number = 250
  ) => {
    if (guard) {
      setLoadingOverride(true);
      setTimeout(() => {
        change();
      }, timeout);
    }
  };

  // 2] Processing

  /** Handy util to filter teams by conference */
  const confFilter = (t: { team: string; conf: string; year: string }) => {
    const manualFilterInUse = !_.isEmpty(queryFiltersAsMap);
    return manualFilterInUse
      ? year == DateUtils.AllYears || year.startsWith(DateUtils.MultiYearPrefix)
        ? !_.isNil(
            queryFiltersAsMap[t.team] ||
              queryFiltersAsMap[`${t.team}:${t.year}`] ||
              queryFiltersAsMap[`${t.team}:${(t.year || "").substring(0, 4)}`]
          )
        : !_.isNil(queryFiltersAsMap[t.team])
      : confs == "" ||
          confs.indexOf(t.conf) >= 0 ||
          (confs.indexOf(ConfSelectorConstants.highMajorConfsNick) >= 0 &&
            ConfSelectorConstants.powerSixConfsStr.indexOf(t.conf) >= 0) ||
          (confs.indexOf(ConfSelectorConstants.nonHighMajorConfsNick) >= 0 &&
            ConfSelectorConstants.powerSixConfsStr.indexOf(t.conf) < 0);
  };
  /** Builds a list of JSON objects with basic filtering, subsequent phases render */
  const phase1Processing = (teams: any[], applyConfFilter: boolean = true) => {
    return _.chain(teams)
      .map((team, teamIndex) => {
        const confNick = ConferenceToNickname[team.conf || ""] || "???";
        const { wab, wae, wins, losses } = _.transform(
          team.opponents || [],
          (acc, game) => {
            const isWin = (game.team_scored || 0) >= (game.oppo_scored || 0);
            acc.wab += isWin ? game.wab || 0 : (game.wab || 0) - 1;
            acc.wae += isWin ? game.wae || 0 : (game.wae || 0) - 1;
            acc.wins += isWin ? 1 : 0;
            acc.losses += isWin ? 0 : 1;
          },
          { wab: 0.0, wae: 0.0, wins: 0, losses: 0 }
        );
        team.conf_nick = confNick;
        team.wab = wab;
        team.wae = wae;
        team.wins = wins;
        team.losses = losses;

        // Bonus step: get the source_id and inject an _id
        team._id = _.find(
          [team.team_name]
            .concat(AvailableTeams.teamAliases[team.team_name] || [])
            .map(
              (teamAlias) => AvailableTeams.byName[teamAlias]?.[0]?.source_id
            ),
          (sourceId) => !_.isEmpty(sourceId)
        );

        // Ugh, so some fields are luck adjusted but we don't want that
        // TODO: longer term provide a "Luck" toggle, though it's not ideal because some stats
        // (eg style) aren't luck adjusted so it will be a little bit inconsistent
        // (note that the fields get overwritten/lost in TeamStatsTableUtils.buildRows below because
        //  adjustForLuck is hard-coded to false but need to do it here so the correct value
        //  is used in the sort/filter and exp. WAB)
        LuckUtils.injectLuck(team, undefined, undefined);

        // this is a bit horrible but this field gets overwritten by some React node for visual
        // purposes, so we re-create it here every time for sorting / filtering / clipboard
        team.off_raw_net = {
          value: (team.off_ppp?.value || 100) - (team.def_ppp?.value || 100),
        };
        if (!team.off_net) {
          //(SECRET_QUERY mode doesn't include this so calculate)
          team.off_net = {
            value:
              (team.off_adj_ppp?.value || 100) -
              (team.def_adj_ppp?.value || 100),
          };
        }

        const expWinPctVsBubble = TeamEvalUtils.calcWinsAbove(
          team.off_adj_ppp?.value || 100,
          team.def_adj_ppp?.value || 100,
          dataEvent.bubbleOffenses[team.year] || fallbackBubbleOffense,
          dataEvent.bubbleDefenses[team.year] || fallbackBubbleDefense,
          0.0
        );
        const expWab = (expWinPctVsBubble - 0.5) * (wins + losses);
        team.exp_wab = expWab;
        team.power = 0.5 * wab + 0.5 * expWab;
        //(to get a proper ranking would need to normalize games played, but this is fine for this power ranking)

        return team;
      })
      .filter((team) => {
        return applyConfFilter
          ? confFilter({
              team: team.team_name,
              conf: team.conf_nick || "???",
              year: team.year || "????",
            })
          : true;
      })
      .sortBy((team) => {
        if (manualFilterSelected) {
          if (
            year == DateUtils.AllYears ||
            year.startsWith(DateUtils.MultiYearPrefix)
          ) {
            //few different formats
            return (
              queryFiltersAsMap[team.team_name] ||
              queryFiltersAsMap[`${team.team_name}:${team.year}`] ||
              queryFiltersAsMap[
                `${team.team_name}:${(team.year || "").substring(0, 4)}`
              ] ||
              1000
            );
          } else {
            return queryFiltersAsMap[team.team_name] || 1000;
          }
        } else if (secretQuery?.length) {
          return -(team.off_net?.value || 0);
        } else {
          return -(team.power || 0);
        }
      })
      .value();
  };

  // 2.1 Export

  /** Export teams to string */
  const buildExportStr = (filtered: boolean): string => {
    const teamsPhase1 = phase1Processing(dataEvent.teams || [], filtered);
    const finalData = _.thru(teamsPhase1, (phase1) => {
      const [teamsPhase2, tmpAvancedFilterError] =
        advancedFilterStr.length > 0 && filtered
          ? AdvancedFilterUtils.applyTeamExplorerFilter(
              phase1,
              advancedFilterStr,
              (year: string) =>
                GradeTableUtils.pickDivisonStats(
                  divisionStatsCache,
                  year,
                  gender,
                  showGrades
                )
            )
          : [phase1, undefined];

      return teamsPhase2;
    });

    const [header, dataRows] = AdvancedFilterUtils.generateTeamExplorerCsv(
      finalData,
      showGrades
        ? (year: string) =>
            GradeTableUtils.pickDivisonStats(
              divisionStatsCache,
              year,
              gender,
              showGrades
            )
        : undefined
    );

    return [header].concat(dataRows).join("\n");
  };

  // 2.2 Display

  const table = React.useMemo(() => {
    setLoadingOverride(false);
    const teamsPhase1 = phase1Processing(dataEvent.teams || []);

    const [teamsPhase2, tmpAvancedFilterError] =
      advancedFilterStr.length > 0
        ? AdvancedFilterUtils.applyTeamExplorerFilter(
            teamsPhase1,
            advancedFilterStr,
            (year: string) =>
              GradeTableUtils.pickDivisonStats(
                divisionStatsCache,
                year,
                gender,
                showGrades
              )
          )
        : [teamsPhase1, undefined];

    if (advancedFilterStr.length > 0)
      setAdvancedFilterError(tmpAvancedFilterError);

    const rowsForEachTeam = teamsPhase2
      .filter((team) => team?.off_poss?.value)
      .map((team, teamIndex) => {
        const teamTooltip = (
          <Tooltip id={`team_${teamIndex}`}>
            {AvailableTeams.teamAliases[team.team_name] ? (
              <>
                Other names over the years:{" "}
                {AvailableTeams.teamAliases[team.team_name].join("; ")}
                <br />
                <br />
              </>
            ) : undefined}
            Open new tab with a detailed analysis view (roster, play style info,
            on/off) for this team
          </Tooltip>
        );
        const teamParams = {
          team: team.team_name,
          gender: gender,
          year: team.year,
          minRank: "0",
          maxRank: isT100 ? "100" : "400",
          queryFilters: isConfOnly ? "Conf" : undefined,
          showExpanded: true,
          calcRapm: true,
          showTeamPlayTypes: showPlayStyles,
          showGrades: "rank:Combo",
          showExtraInfo,
          showRoster: true,
        };
        const confTooltip = (
          <Tooltip id={`teamConf_${teamIndex}`}>
            Filter the table to only teams from this conference
          </Tooltip>
        );
        const conferenceSelector = (
          <OverlayTrigger placement="auto" overlay={confTooltip}>
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setConfs(team.conf_nick);
              }}
            >
              {team.conf_nick}
            </a>
          </OverlayTrigger>
        );

        const yearSuffix = _.thru(team.year || "??????", (effYear) => {
          return effYear < "2019/20"
            ? "1" + effYear.substring(5)
            : effYear.substring(5);
        });
        team.combo_title = (
          <p>
            <OverlayTrigger placement="auto" overlay={teamTooltip}>
              <span>
                <sup>
                  <small>{teamIndex + 1}</small>
                </sup>
                &nbsp;
                <a target="_blank" href={UrlRouting.getGameUrl(teamParams, {})}>
                  <b>
                    {team.team_name}
                    {year == DateUtils.AllYears ||
                    year.startsWith(DateUtils.MultiYearPrefix)
                      ? ` '${yearSuffix}`
                      : ""}
                  </b>
                </a>
              </span>
            </OverlayTrigger>
            <br />
            <small>
              <i>
                {conferenceSelector} / {team.wins}-{team.losses} (
                {team.wab >= 0 ? "+" : ""}
                {team.wab.toFixed(2)})
              </i>
            </small>
          </p>
        );

        const tableInfo = TeamStatsTableUtils.buildRows(
          {
            team: team.team_name,
            year: team.year,
            gender,
            minRank: "0",
            maxRank: isT100 ? "100" : "400",
            queryFilters: isConfOnly ? "Conf" : undefined,
          },
          {
            baseline: team,
            global: team,
            on: StatModels.emptyTeam(),
            off: StatModels.emptyTeam(),
          },
          { on: [], off: [], baseline: [], other: [], global: [] },

          {
            on: { off: {}, def: {} },
            off: { off: {}, def: {} },
            other: [],
            baseline: { off: {}, def: {} },
          },
          [],

          // Page control
          {
            showPlayTypes: showPlayStyles && teamIndex < MAX_EXTRA_INFO_IN_ROWS,
            playTypeConfig: {
              off: playStyleConfig.includes("off"),
              def: playStyleConfig.includes("def"),
            },
            showRoster: false, //(won't work without more data)
            adjustForLuck: false, //(won't work without more data)
            showDiffs: false, //(NA for this view)
            showGameInfo: false,
            showShotCharts: false, //(won't work without more data)
            shotChartConfig: undefined, //(won't work without more data)
            showExtraInfo: showExtraInfo && teamIndex < MAX_EXTRA_INFO_IN_ROWS,
            showGrades,
            showStandaloneGrades,
            showLuckAdjDiags: false, //(won't work without more data)
            showHelp,
            playStyleConfigStr,
          },
          {
            setShowGrades: (showGrades: string) => setShowGrades(showGrades),
            setShotChartConfig: (config: any) => {},
            setPlayStyleConfigStr: (config: string) => {
              //(if there's lots of teams then hide updates behind a spinner)
              if (Math.min(parseInt(maxTableSize), teamsPhase2.length) > 10) {
                friendlyChange(() => setPlayStyleConfigStr(config), true, 100);
              } else setPlayStyleConfigStr(config);
            },
          },

          luckConfig,
          divisionStatsCache[team.year] || {}
        );
        return tableInfo;
      });

    const tableRows = _.chain(rowsForEachTeam)
      .take(parseInt(maxTableSize))
      .flatMap((rows, ii) => {
        const repeatingHeader =
          (showExtraInfo || showPlayStyles) && ii < MAX_EXTRA_INFO_IN_ROWS
            ? 1
            : showGrades
            ? 5
            : 10;

        return [
          ...(ii > 0 && ii % repeatingHeader == 0
            ? [
                GenericTableOps.buildHeaderRepeatRow(
                  CommonTableDefs.repeatingOnOffHeaderFields,
                  "small"
                ),
              ]
            : []),
          ...(rows.baseline?.teamStatsRows || []),
          GenericTableOps.buildRowSeparator(),
        ];
      })
      .value();

    return (
      <GenericTable
        showConfigureColumns={FeatureFlags.isActiveWindow(
          FeatureFlags.tableConfigOptions
        )}
        tableCopyId="teamStatsTable"
        tableFields={CommonTableDefs.onOffTable()}
        tableData={
          tableRows.length == 0 && needToLoadQuery() //(make table big enough to render loading script)
            ? _.range(0, 3).map((__) => GenericTableOps.buildRowSeparator())
            : tableRows
        }
        cellTooltipMode="none"
        integratedGrades={
          showGrades && !showStandaloneGrades
            ? {
                hybridMode:
                  GradeTableUtils.showingHybridOrStandaloneGrades(showGrades),
                exactRanks: true,
                colorChooser: CbbColors.integratedColorsDefault,
                customKeyMappings: {
                  def_net: "off_raw_net",
                },
                alwaysShow: {
                  off_net: true,
                  off_adj_ppp: true,
                  def_adj_ppp: true,
                },
              }
            : undefined
        }
      />
    );
  }, [
    gender,
    year,
    confs,
    dataEvent, //(also includes changes to secretQuery)
    sortBy,
    queryFilters,
    advancedFilterStr,
    showGrades,
    divisionStatsRefresh,
    maxTableSize,
    showExtraInfo,
    showPlayStyles,
    playStyleConfig,
    playStyleConfigStr,
  ]);

  // 3] View

  /** Let the user know that he might need to change */
  const MenuList = (props: any) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <p className="text-secondary text-center">
          (For other sorting options, use 'SORT_BY' below)
        </p>
      </components.MenuList>
    );
  };

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      !dataEvent.error &&
      (loadingOverride ||
        (!dataEvent.syntheticData && (dataEvent?.teams || []).length == 0))
    );
  }

  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          className="float-left"
          id={`copyLink_teamStatsExplorer`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>
    );
  };

  function stringToOption(s: string) {
    return { label: s, value: s };
  }
  const sortByOptions: Record<string, { label: string; value: string }> = {
    power: {
      label: _.thru(undefined, (__) => {
        if (advancedFilterStr.includes("SORT_BY") || dataEvent.syntheticData) {
          return "Custom Ranking";
        } else if (manualFilterSelected) {
          return "Manual Ordering";
        } else if (secretQuery?.length) {
          return "Adjusted Efficiency";
        } else {
          return "Default Power Ranking";
        }
      }),
      value: "power", //(this is ignored, see sortBy filter for what's actually applied)
    },
  };

  const linqEnableTooltip = (
    <Tooltip id="linqEnableTooltip">
      Enable the Linq filter editor, click on "?" for a guide on using Linq
    </Tooltip>
  );
  const linqEnableText = showHelp ? (
    <OverlayTrigger placement="auto" overlay={linqEnableTooltip}>
      <span>
        Linq
        <sup>
          <a
            target="_blank"
            href="https://hoop-explorer.blogspot.com/2025/02/using-linq-to-build-advanced-filters-in.html"
          >
            ?
          </a>
        </sup>
      </span>
    </OverlayTrigger>
  ) : (
    <span>Linq</span>
  );

  const topLevelGradeControls = _.thru(
    !hideGlobalGradeSettings,
    (buildTopLevelGradeControls) => {
      if (buildTopLevelGradeControls) {
        const yearToUseForTopLevelGradeControls = !year.startsWith("2")
          ? DateUtils.inSeasonYear
          : year;
        const divisionStatsCacheByYear: DivisionStatsCache = showGrades
          ? divisionStatsCache[yearToUseForTopLevelGradeControls] || {}
          : {};
        return GradeTableUtils.buildTeamGradeControlState(
          "",
          {
            config: showGrades,
            setConfig: (newConfig: string) => setShowGrades(newConfig),
            selectionType: "baseline",
            teamStats: {
              comboTier: divisionStatsCacheByYear.Combo,
              highTier: divisionStatsCacheByYear.High,
              mediumTier: divisionStatsCacheByYear.Medium,
              lowTier: divisionStatsCacheByYear.Low,
            },
            team: StatModels.emptyTeam(),
          },
          {
            countsAreExample: !year.startsWith("2"),
            onHide: () => {
              setHideGlobalGradeSettings(true);
            },
          }
        );
      } else {
        return undefined;
      }
    }
  );

  const quickToggleBar = (
    <ToggleButtonGroup
      items={_.flatten([
        [
          //TODO: need some work to plumb into getTeamDetails
          // {
          //   label: "T100",
          //   tooltip: "Show teams' stats vs T100 opposition",
          //   toggled: isT100,
          //   onClick: () =>
          //     friendlyChange(() => {
          //       setIsT100(!isT100);
          //       setIsConfOnly(false);
          //     }, true),
          // },
          // {
          //   label: "Conf",
          //   tooltip: "Show teams' stats vs conference opposition",
          //   toggled: isConfOnly,
          //   onClick: () =>
          //     friendlyChange(() => {
          //       setIsT100(false);
          //       setIsConfOnly(!isConfOnly);
          //     }, true),
          // },
        ],
        [
          {
            label: "Extra",
            tooltip: showExtraInfo
              ? "Hide extra stats info"
              : `Show extra stats info (first ${MAX_EXTRA_INFO_IN_ROWS} teams)`,
            toggled: showExtraInfo,
            onClick: () =>
              friendlyChange(() => setShowExtraInfo(!showExtraInfo), true),
          },
          {
            label: "|",
            tooltip: "",
            toggled: true,
            onClick: () => {},
            isLabelOnly: true,
          },
          {
            label: "Style",
            tooltip: showPlayStyles
              ? "Hide play style breakdowns"
              : `Show offensive and defensive play style breakdowns (first ${MAX_EXTRA_INFO_IN_ROWS} teams)`,
            toggled: showPlayStyles,
            onClick: () =>
              friendlyChange(() => setShowPlayStyles(!showPlayStyles), true),
          },
          {
            label: ":",
            tooltip: "",
            toggled: true,
            onClick: () => {},
            isLabelOnly: true,
          },
          {
            label: "Off",
            tooltip: showPlayStyles
              ? playStyleConfig.includes("off")
                ? "Hide offensive play style breakdowns"
                : `Show offensive play style breakdowns`
              : "Show offensive play style breakdowns",
            toggled: showPlayStyles && playStyleConfig.includes("off"),
            onClick: () => {
              if (!showPlayStyles) {
                friendlyChange(() => {
                  setShowPlayStyles(true);
                  setPlayStyleConfig("off");
                }, true);
              } else {
                const newVal = _.thru(playStyleConfig, (curr) => {
                  if (curr.includes("off")) return curr.replace("off", "");
                  else return "off" + curr;
                });
                friendlyChange(
                  () => setPlayStyleConfig(newVal),
                  newVal != playStyleConfig
                );
              } //(else ignore clicks, style not enabled)
            },
          },
          {
            label: "Def",
            tooltip: showPlayStyles
              ? playStyleConfig.includes("def")
                ? "Hide defensive play style breakdowns"
                : `Show defensive play style breakdowns`
              : "Show defensive play style breakdowns",
            toggled: showPlayStyles && playStyleConfig.includes("def"),
            onClick: () => {
              if (!showPlayStyles) {
                friendlyChange(() => {
                  setShowPlayStyles(true);
                  setPlayStyleConfig("def");
                }, true);
              } else {
                const newVal = _.thru(playStyleConfig, (curr) => {
                  if (curr.includes("def")) return curr.replace("def", "");
                  else return curr + "def";
                });
                friendlyChange(
                  () => setPlayStyleConfig(newVal),
                  newVal != playStyleConfig
                );
              } //(else ignore clicks, style not enabled)
            },
          },
        ],
        showHelp
          ? [
              //TODO: what to show here?
              // {
              //   label: <a href="https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html" target="_blank">?</a>,
              //   tooltip: "Open a page that explains some of the elements of this table",
              //   toggled: false,
              //   onClick: () => {}
              // }
            ]
          : [],
      ])}
    />
  );

  const fullHelpDropdown = (
    <GenericTogglingMenu>
      <GenericTogglingMenuItem
        text="Show grade controls"
        truthVal={!hideGlobalGradeSettings}
        onSelect={() => setHideGlobalGradeSettings(!hideGlobalGradeSettings)}
      />
      <AnnotationMenuItems />
      <GenericTogglingMenuItem
        text={
          <span>
            <FontAwesomeIcon icon={faClipboard} />
            {"  "}Export all teams to CSV
          </span>
        }
        truthVal={false}
        onSelect={() => {
          friendlyChange(() => {
            navigator.clipboard.writeText(buildExportStr(false));
            setLoadingOverride(false);
          }, true);
        }}
      />
      <GenericTogglingMenuItem
        text={
          <span>
            <FontAwesomeIcon icon={faDownload} />
            {"  "}Export all teams to CSV
          </span>
        }
        truthVal={false}
        onSelect={() => {
          friendlyChange(() => {
            const blob = new Blob([buildExportStr(false)], {
              type: "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "all_team_explorer_stats.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setLoadingOverride(false);
          }, true);
        }}
      />
      <GenericTogglingMenuItem
        text={
          <span>
            <FontAwesomeIcon icon={faClipboard} />
            {"  "}Export filtered teams to CSV
          </span>
        }
        truthVal={false}
        onSelect={() => {
          friendlyChange(() => {
            navigator.clipboard.writeText(buildExportStr(true));
            setLoadingOverride(false);
          }, true);
        }}
      />
      <GenericTogglingMenuItem
        text={
          <span>
            <FontAwesomeIcon icon={faDownload} />
            {"  "}Export filtered teams to CSV
          </span>
        }
        truthVal={false}
        onSelect={() => {
          friendlyChange(() => {
            const blob = new Blob([buildExportStr(true)], {
              type: "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "filtered_team_explorer_stats.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setLoadingOverride(false);
          }, true);
        }}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        className="d-none d-md-flex"
        text="'Quick Select' Bar Is Sticky"
        truthVal={stickyQuickToggle}
        onSelect={() => setStickyQuickToggle(!stickyQuickToggle)}
      />
      <GenericTogglingMenuItem
        className="d-md-none"
        disabled={true}
        text="Sticky 'Quick Select' Bar Disabled"
        truthVal={false}
        onSelect={() => {}}
      />
    </GenericTogglingMenu>
  );

  const maxTeamsInput = (
    <InputGroup>
      <InputGroup.Prepend>
        <InputGroup.Text id="maxTeams">Max Teams</InputGroup.Text>
      </InputGroup.Prepend>
      <AsyncFormControl
        startingVal={
          startingState.maxTableSize ||
          ParamDefaults.defaultTeamExplorerMaxTableSize
        }
        validate={(t: string) => t.match("^[0-9]*$") != null}
        onChange={(t: string) =>
          friendlyChange(() => setMaxTableSize(t), t != maxTableSize)
        }
        timeout={400}
        placeholder="eg 100"
      />
    </InputGroup>
  );
  return (
    <Container className="medium_screen">
      {dataEvent.syntheticData ? null : (
        <Form.Group as={Row}>
          <Col xs={6} sm={6} md={6} lg={2} style={{ zIndex: 12 }}>
            <ThemedSelect
              value={stringToOption(gender)}
              options={["Men", "Women"].map((g) => stringToOption(g))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) {
                  const newGender = (option as any)?.value;
                  friendlyChange(
                    () => setGender(newGender),
                    newGender != gender
                  );
                }
              }}
            />
          </Col>
          <Col
            xs={6}
            sm={6}
            md={6}
            lg={year.startsWith(DateUtils.MultiYearPrefix) ? 3 : 2}
            style={{ zIndex: 11 }}
          >
            <YearSelector
              yearOptions={DateUtils.coreYears.concat(DateUtils.AllYears)}
              selectedYear={year}
              onYearChange={(newYear) => {
                friendlyChange(() => setYear(newYear), newYear != year);
              }}
              allowMultiYear={true}
            />
          </Col>
          <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
          <Col
            xs={11}
            sm={11}
            md={11}
            lg={year.startsWith(DateUtils.MultiYearPrefix) ? 4 : 5}
            style={{ zIndex: 10 }}
          >
            <ConferenceSelector
              emptyLabel={
                year < DateUtils.yearFromWhichAllMenD1Imported
                  ? `All High Tier Teams`
                  : `All Teams`
              }
              confStr={confs}
              confMap={undefined}
              confs={dataEvent?.confs}
              onChangeConf={(confStr) =>
                friendlyChange(() => setConfs(confStr), confs != confStr)
              }
            />
          </Col>
          <Col xs={2} lg={2} className="mt-1">
            {getCopyLinkButton()}
            <span className="float-left pl-2">
              <OverlayTrigger
                placement="auto"
                overlay={
                  <Tooltip id={"playerDocsTooltip"}>
                    Go to an article describing for the contents of the table
                    below
                  </Tooltip>
                }
              >
                <a
                  target="_blank"
                  href={
                    "https://hoop-explorer.blogspot.com/2025/08/team-lineup-stats-table-explanation.html"
                  }
                >
                  (?)
                </a>
              </OverlayTrigger>
            </span>
          </Col>
        </Form.Group>
      )}
      <Row>
        <Col xs={12} sm={12} md={7} lg={7}>
          <InputGroup className="flex-nowrap">
            <InputGroup.Prepend>
              <InputGroup.Text id="filter">
                Filter{maybeFilterPrompt}:
              </InputGroup.Text>
            </InputGroup.Prepend>
            <div className="flex-fill">
              <TeamFilterAutoSuggestText
                readOnly={false}
                placeholder={`;-separated list of teams`}
                autocomplete={teamList
                  .concat([separatorKeyword])
                  .map((s) => s + ";")}
                value={tmpQueryFilters}
                onChange={(ev: any) => setTmpQueryFilters(ev.target.value)}
                onSelectionChanged={(newStr: string) =>
                  friendlyChange(() => {
                    setQueryFilters(newStr);
                  }, newStr != queryFilters)
                }
                onKeyUp={(ev: any) => setTmpQueryFilters(ev.target.value)}
              />
            </div>
          </InputGroup>
        </Col>
        <Form.Group as={Col} xs={8} sm={10} md={4} lg={4}>
          <ThemedSelect
            styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
            value={sortByOptions[sortBy]}
            components={{ MenuList }}
            options={_.values(sortByOptions)}
            isSearchable={false}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                const newSortBy = (option as any)?.value || "net";
                friendlyChange(() => setSortBy(newSortBy), sortBy != newSortBy);
              }
            }}
          />
        </Form.Group>
        <Form.Group as={Col} xs={1} className="mt-2">
          <Form.Check
            type="switch"
            id="linq"
            checked={showAdvancedFilter || advancedFilterStr.length > 0}
            onChange={() => {
              const isCurrentlySet =
                showAdvancedFilter || advancedFilterStr.length > 0;
              if (!showAdvancedFilter || 0 == advancedFilterStr.length) {
                // Just enabling/disabling the LINQ query with no implications on filter, so don't need a UX friendly change
                setShowAdvancedFilter(!isCurrentlySet);
              } else {
                friendlyChange(() => {
                  setAdvancedFilterStr("");
                  setShowAdvancedFilter(!isCurrentlySet);
                }, true);
              }
            }}
            label={linqEnableText}
          />
        </Form.Group>
      </Row>
      {showAdvancedFilter ? (
        <Row>
          <Form.Group as={Col} xs={12} sm={12} md={12} lg={12}>
            <LinqExpressionBuilder
              prompt="eg 'off_adj_ppp > 110.0 SORT_BY def_adj_ppp ASC'"
              value={advancedFilterStr.concat(
                secretQuery
                  ? `${
                      _.endsWith(advancedFilterStr, " ") ? "" : " "
                    }SECRET_QUERY ` + secretQuery
                  : ""
              )}
              error={advancedFilterError}
              autocomplete={AdvancedFilterUtils.teamExplorerAutocomplete.concat(
                "SECRET_QUERY"
              )}
              richTextReplacements={undefined}
              callback={(newVal: string) =>
                friendlyChange(() => {
                  const splits = newVal.split("SECRET_QUERY ");
                  setAdvancedFilterStr(splits[0]);
                  setSecretQuery(splits[1]);
                }, true)
              }
              showHelp={showHelp}
            />
          </Form.Group>
        </Row>
      ) : null}
      <StickyRow stickyEnabled={stickyQuickToggle} className="pt-1 pb-1">
        <Col xs={12} sm={12} md={8} lg={8} className="pt-1 pb-1">
          {quickToggleBar}
          {topLevelGradeControls ? (
            <Col xs="12" className="pt-1">
              <div>{topLevelGradeControls}</div>
            </Col>
          ) : undefined}
        </Col>
        <Form.Group as={Col} xs={8} lg={3} className="mb-1">
          {maxTeamsInput}
        </Form.Group>
        <Col xs={1} sm={1} lg={1}>
          {fullHelpDropdown}
        </Col>
      </StickyRow>
      <Row>
        <Col>
          <LoadingOverlay
            active={needToLoadQuery()}
            spinner
            text={"Loading Team Stats Explorer..."}
          >
            {table}
          </LoadingOverlay>
        </Col>
      </Row>
    </Container>
  );
};
export default TeamStatsExplorerTable;
