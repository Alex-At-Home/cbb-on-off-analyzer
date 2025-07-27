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

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
//@ts-ignore
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faPen, faEye } from "@fortawesome/free-solid-svg-icons";
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
} from "../utils/FilterModels";

import { Statistic, RosterEntry, PlayerCode } from "../utils/StatModels";
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
import ThemedSelect from "./shared/ThemedSelect";

type Props = {
  startingState: OffseasonLeaderboardParams;
  dataEvent: TeamEditorStatsModel;
  onChangeState: (newParams: OffseasonLeaderboardParams) => void;
};

/** Set to true to rebuild public/leaderboard/lineups/stats_all_Men_YYYY_Preseason.json */
const logDivisionStatsToConsole = false;
const logDivisionStatsToFile =
  process.env.BUILD_OFFSEASON_STATS_LEADERBOARD == "true";
const updateNextYearsRoster = process.env.BUILD_OFFSEASON_ROSTER == "true";

/** Will dump out some possible manual overrides to be made */
const diagnosticCompareWithRosters = false;

const OffSeasonLeaderboardTable: React.FunctionComponent<Props> = ({
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
  const hasCustomFilter =
    confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0;
  const [queryFilters, setQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const [tmpQueryFilters, setTmpQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const separatorKeyword = "BREAK";
  const { queryFiltersAsMap, queryFilterRowBreaks } = _.transform(
    queryFilters.split(";"),
    (acc, v, ii) => {
      const teamName = _.trim(v);
      if (teamName == separatorKeyword) {
        acc.queryFilterRowBreaks.add(ii - acc.queryFilterRowBreaks.size - 1);
      } else if (teamName != "") {
        const teams = AvailableTeams.teamAliases[teamName] || [teamName];
        teams.forEach(
          (team) =>
            (acc.queryFiltersAsMap[team] =
              1 + ii - acc.queryFilterRowBreaks.size)
        );
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

  const [year, setYear] = useState(
    startingState.year || DateUtils.offseasonPredictionYear
  );
  const yearWithStats = DateUtils.getPrevYear(year);

  const [yearBeforeSettingEvalMode, setYearBeforeSettingEvalMode] =
    useState("");

  const [gender, setGender] = useState("Men"); // TODO ignore input just take Men
  const [teamView, setTeamView] = useState(startingState.teamView || "");

  const [showAllTeams, setShowAllTeams] = useState(
    startingState.showAllTeams || false
  );
  const [transferInOutMode, setTransferInOutMode] = useState(
    startingState.transferInOutMode || false
  );
  const [evalMode, setEvalMode] = useState(startingState.evalMode || false);
  const [showExtraStatsInEvalMode, setShowExtraStatsInEvalMode] =
    useState<Boolean>(false); //TODO make this display param (this option is mostly for me at the moment, so not a prio)

  const [sortBy, setSortBy] = useState(startingState.sortBy || "net");

  const [rostersPerTeam, setRostersPerTeam] = useState(
    {} as Record<string, Record<string, RosterEntry>>
  );

  const teamList = _.flatMap(AvailableTeams.byName, (teams, __) => {
    const maybeTeam = teams.find(
      (t) => t.year == yearWithStats && t.gender == gender
    );
    return maybeTeam ? [maybeTeam.team] : [];
  });

  if (diagnosticCompareWithRosters && _.isEmpty(rostersPerTeam)) {
    const fetchRosterJson = (teamName: string) => {
      const rosterJsonUri = () =>
        `/rosters/${gender}_${(year || "").substring(0, 4)}` +
        `/${RequestUtils.fixLocalhostRosterUrl(teamName, true)}.json`;
      //(note unlike buildLeaderboards, we need an extra level of encoding here
      // TODO: actually I think this just use fixRosterUrl since it's fetching via
      //       URL not from from file - and then we can simplify fixLocalhostRosterUrl
      //       by removing the second argument)
      //       But for now we'll leave, and fix when we next need it
      return fetch(rosterJsonUri())
        .then((resp: any) => resp.json())
        .then(
          (json: any) =>
            [teamName, json] as [string, Record<string, RosterEntry>]
        );
    };
    const rosterPromises: Promise<[string, Record<string, RosterEntry>]>[] =
      teamList.map((team) =>
        fetchRosterJson(team).catch(
          //(carry on error, eg if the file doesn't exist)
          (err: any) => {
            return [team, {}];
          }
        )
      );

    if (_.isEmpty(rosterPromises)) {
      setRostersPerTeam({});
    } else {
      Promise.all(rosterPromises).then(
        (rosterInfo: [string, Record<string, RosterEntry>][]) => {
          setRostersPerTeam(_.fromPairs(rosterInfo));
        }
      );
    }
  }

  /** Converts a list of params to their team's key/value params  */
  const buildOverrides = (inOverrides: Record<string, string>) => {
    return _.transform(
      inOverrides,
      (acc, paramIn, key) => {
        const splitKey = key.split("__");
        const inTeam = splitKey[0];
        const inParamKey = splitKey?.[1];
        const param = paramIn?.toString(); //(in case it's boolean)
        if (inParamKey) {
          if (!acc[inTeam]) {
            acc[inTeam] = {};
          }
          // Supported overrides: superSeniorsBack, deletedPlayers, disabledPlayers, addedPlayers, overrides
          if (inParamKey == "deletedPlayers") {
            acc[inTeam]!.deletedPlayers = param;
          } else if (inParamKey == "disabledPlayers") {
            acc[inTeam]!.disabledPlayers = param;
          } else if (inParamKey == "addedPlayers") {
            acc[inTeam]!.addedPlayers = param;
          } else if (inParamKey == "overrides") {
            acc[inTeam]!.overrides = param;
          } else if (inParamKey == "superSeniorsBack") {
            acc[inTeam]!.superSeniorsBack = param == "true";
          } else if (inParamKey == "diffBasis") {
            acc[inTeam]!.diffBasis = param;
          } else if (inParamKey == "showPrevSeasons") {
            acc[inTeam]!.showPrevSeasons = param == "true";
          } else if (inParamKey == "alwaysShowBench") {
            acc[inTeam]!.alwaysShowBench = param == "true";
          } else if (inParamKey == "factorMins") {
            acc[inTeam]!.factorMins = param == "true";
          }
        }
      },
      {} as Record<string, TeamEditorParams>
    );
  };
  const [teamOverrides, setTeamOverrides] = useState(
    buildOverrides(startingState) as Record<string, TeamEditorParams>
  );

  /** When the params change */
  useEffect(() => {
    onChangeState(
      _.merge(
        {
          year: year,
          teamView: teamView,
          confs,
          evalMode: evalMode,
          transferInOutMode: transferInOutMode,
          sortBy: sortBy,
          queryFilters: queryFilters,
          showAllTeams,
        },
        _.chain(teamOverrides)
          .flatMap((teamEdit, teamToOver) => {
            return _.map(teamEdit, (teamEditVal, paramKey) =>
              teamEditVal
                ? [`${teamToOver}__${paramKey}`, teamEditVal.toString()]
                : []
            );
          })
          .fromPairs()
          .value()
      )
    );
  }, [
    teamView,
    confs,
    teamOverrides,
    year,
    evalMode,
    transferInOutMode,
    showAllTeams,
    sortBy,
    queryFilters,
  ]);

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  useEffect(() => {
    // Add and remove clipboard listener
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
  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_offSeasonTeamLeaderboard`, {
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

  const editTooltip = (
    <Tooltip id="editTooltip">
      Show/Hide the inline Team Viewer and Editor{" "}
    </Tooltip>
  );

  const table = React.useMemo(() => {
    const tableDefs = CommonTableDefs.offseasonLeaderboardTable(
      evalMode,
      transferInOutMode
    );

    const waitForRosterDiagMode =
      diagnosticCompareWithRosters && _.isEmpty(rostersPerTeam);
    if (waitForRosterDiagMode || _.isEmpty(dataEvent.players)) {
      // If we don't have players we're not done loading yet, so put up a loading screen:
      return (
        <div>
          <GenericTable
            tableCopyId="teamTable"
            tableFields={tableDefs}
            tableData={_.range(0, 5).map((__) =>
              GenericTableOps.buildRowSeparator()
            )}
            cellTooltipMode={undefined}
          />
        </div>
      );
    } else {
      setLoadingOverride(false);
    }

    // The avgEff based on which the stats were calc'd (yearWithStats) and what actually happened (year)
    const avgEff =
      efficiencyAverages[`${gender}_${yearWithStats}`] ||
      efficiencyAverages.fallback;
    const actualResultsAvgEff = evalMode
      ? efficiencyAverages[`${gender}_${year}`] || efficiencyAverages.fallback
      : avgEff;

    // Team stats generation business logic:
    const {
      derivedDivisionStats,
      teamRanks,
      numTeams,
      netEffToRankMap,
      actualNetEffToRankMap,
      offEffToRankMap,
      defEffToRankMap,
    } = OffseasonLeaderboardUtils.buildAllTeamStats(
      dataEvent,
      {
        confs,
        year,
        gender,
        sortBy,
        evalMode,
        diagnosticCompareWithRosters,
      },
      teamOverrides,
      rostersPerTeam,
      avgEff,
      actualResultsAvgEff,
      logDivisionStatsToFile && typeof window === `undefined` //(in preseason-building mode, include teams)
    );

    //Useful for building late off-season grade lists (copy to public/leaderboard/lineups/stats_all_Men_YYYY_Preseason.json)
    //(note this gets printed out multiple times - ignore all but the last time, it doesn't have all the data yet)
    if (logDivisionStatsToConsole && server == "localhost") {
      console.log(JSON.stringify(derivedDivisionStats));
    }
    if (typeof window === `undefined`) {
      //(since require('fs) needs to appear only in server side code)
      if (logDivisionStatsToFile) {
        console.log(
          `(BUILDING [./stats_all_Men_${year.substring(0, 4)}_Preseason.json] )`
        );

        const fs = require("fs");
        fs.writeFileSync(
          `./stats_all_Men_${year.substring(0, 4)}_Preseason.json`,
          JSON.stringify(derivedDivisionStats)
        );
        //(DEBUG)
        //console.log(JSON.stringify(derivedDivisionStats));

        // For each team, if we have a roster file for them for the next seasion,
        // We have the option to update it with role info
        //(only do this as a one-off when building next year's rosters, otherwise it happens
        // during the normal buildLeaderboard process)
        if (updateNextYearsRoster)
          teamRanks.forEach((teamInfo) => {
            const filename = `./public/rosters/${gender}_${(
              year || ""
            ).substring(0, 4)}/${RequestUtils.fixLocalhostRosterUrl(
              teamInfo.team,
              false
            )}.json`;

            var varUpdatedOffseasonRoles = false;
            try {
              const currRosterJson = JSON.parse(
                fs.readFileSync(filename)
              ) as Record<PlayerCode, RosterEntry>;

              _.forEach(teamInfo.players || [], (playerInfo) => {
                const playerCode = playerInfo.key.replace(/:.*/, "");
                const playerRosterInfo = currRosterJson[playerCode];

                if (
                  playerInfo.ok.posClass &&
                  playerRosterInfo &&
                  playerRosterInfo.role != playerInfo.ok.posClass
                ) {
                  //(DEBUG)
                  // console.log(
                  //   `Will update roster info for [${playerCode}], old_role=[${playerRosterInfo.role}], new_role=[${playerInfo.ok.posClass}]`
                  // );
                  playerRosterInfo.role = playerInfo.ok.posClass;
                  varUpdatedOffseasonRoles = true;
                }
              });
              if (varUpdatedOffseasonRoles) {
                fs.writeFileSync(
                  filename,
                  JSON.stringify(currRosterJson, null, 3)
                );
              }
            } catch (err: unknown) {
              //(this can happen if the team rosters aren't available yet, so just skip)
              //(DEBUG)
              //console.log(`Roster filename [${filename}] doesn't exist`);
            }
          });
      }
    }

    const confFilter = (t: { team: string; conf: string }) => {
      return (
        confs == "" ||
        confs.indexOf(t.conf) >= 0 ||
        (confs.indexOf(ConfSelectorConstants.highMajorConfsNick) >= 0 &&
          ConfSelectorConstants.powerSixConfsStr.indexOf(t.conf) >= 0) ||
        (confs.indexOf(ConfSelectorConstants.nonHighMajorConfsNick) >= 0 &&
          ConfSelectorConstants.powerSixConfsStr.indexOf(t.conf) < 0) ||
        (hasCustomFilter && !_.isNil(queryFiltersAsMap[t.team]))
      );
    };

    const toIntRank = (val: Statistic | undefined) => {
      const pcile = val?.value || 0;
      const rank = 1 + Math.round((1 - pcile) * numTeams); //(+1, since 100% is rank==1)
      return rank;
    };
    const getActualNetRankObj = (t: OffseasonTeamInfo) => {
      const actualNetRankObj = actualNetEffToRankMap
        ? {
            off_net: {
              value:
                1.0 -
                actualNetEffToRankMap[t.actualNet || 0]! / (numTeams || 1),
              samples: numTeams,
            },
          }
        : undefined;
      return actualNetRankObj;
    };

    const resultsToText = (res: EvalResults) => {
      if (!res) return null; //(page component refresh order, wait for it to settle down)

      const predictedMissesTooltip = (
        <Tooltip id={`predictedMisses${res.rule.lowerRank}`}>
          {_.flatMap(res.predicted.bad, (s) => [s, <br />])}
        </Tooltip>
      );
      const predictedMisses = _.isEmpty(res.predicted.bad) ? (
        "0"
      ) : (
        <OverlayTrigger placement="auto" overlay={predictedMissesTooltip}>
          <span>
            {_.size(res.predicted.bad)}
            <sup>*</sup>
          </span>
        </OverlayTrigger>
      );
      const actualMissesTooltip = (
        <Tooltip id={`actualMisses${res.rule.lowerRank}`}>
          {_.flatMap(res.actual.bad, (s) => [s, <br />])}
        </Tooltip>
      );
      const actualMisses = _.isEmpty(res.actual.bad) ? (
        "0"
      ) : (
        <OverlayTrigger placement="auto" overlay={actualMissesTooltip}>
          <span>
            {_.size(res.actual.bad)}
            <sup>*</sup>
          </span>
        </OverlayTrigger>
      );
      const missOrMisses = (n: number) => (n == 1 ? "miss" : "misses");
      const displayStatResults = (s: EvalStatSubResults) => {
        const displayStats = (ss: EvalStatInfo) => {
          return (
            <span>
              [{ss.mean.toFixed(1)}]&plusmn;[
              {Math.sqrt(Math.abs(ss.meanSq - ss.mean * ss.mean)).toFixed(1)}]
            </span>
          );
        };
        return (
          <span>
            Off: {displayStats(s.off)} / Def: {displayStats(s.def)} / Net:{" "}
            {displayStats(s.net)}
          </span>
        );
      };
      const buildAndDisplayRankCorrelation = (
        rule: EvalRule,
        l: PredictedVsActualRankings[],
        ruleOnly: Boolean
      ) => {
        if (!_.isEmpty(l)) {
          const stats = new Statistics(l, {
            actual: "ordinal",
            predicted: "ordinal",
          });
          const ruleInfo = ruleOnly
            ? `T${1 + rule.goodThresholdRank - _.size(l)}:${
                rule.goodThresholdRank
              }`
            : `T${rule.lowerRank}`;
          const correlResults = stats.kendallsTau("actual", "predicted");
          if (correlResults?.b?.tauB) {
            return (
              <span>
                {ruleInfo} Actual vs Predicted rank similarity: [
                {((0.5 + 0.5 * correlResults?.b?.tauB) * 100).toFixed(1)}%]
              </span>
            );
          } else {
            return null;
          }
        } else {
          return null;
        }
      };
      return (
        <span>
          {confs ? (
            <span>
              [{res.predicted.good}] predicted in T{res.rule.lowerRank} were
              actually in, [{predictedMisses}]{" "}
              {missOrMisses(_.size(res.predicted.bad))}
              <br />[{res.actual.good}] outside the T{res.rule.lowerRank} were
              actually outside, [{actualMisses}]{" "}
              {missOrMisses(_.size(res.actual.bad))}
            </span>
          ) : (
            <span>
              [{res.predicted.good}] predicted in T{res.rule.lowerRank} were
              actually in T{res.rule.goodThresholdRank}, [{predictedMisses}] big{" "}
              {missOrMisses(_.size(res.predicted.bad))}
              <br />[{res.actual.good}] actually in T{res.rule.lowerRank} were
              predicted in T{res.rule.goodThresholdRank}, [{actualMisses}] big{" "}
              {missOrMisses(_.size(res.actual.bad))}
            </span>
          )}
          <br />
          {showExtraStatsInEvalMode ? (
            <span>
              <br />
              <b>Stats vs rating deltas ([mean]&plusmn;[std-dev])</b>{" "}
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setShowExtraStatsInEvalMode(false);
                }}
              >
                (hide)
              </a>
              <br />
              Predicted T{res.rule.goodThresholdRank},{" "}
              {displayStatResults(res.predicted.stats)}
              <br />
              {confs ? null : (
                <span>
                  Actual T{res.rule.goodThresholdRank},{" "}
                  {displayStatResults(res.actual.stats)}
                  <br />
                </span>
              )}
              (A perfect off/def prediction would have a mean season std-dev of
              ~2.0)
              <br />
              <br />
              {buildAndDisplayRankCorrelation(
                res.rule,
                res.predVsActual,
                false
              )}
              {_.isEmpty(res.predVsActualRuleOnly) ? null : <br />}
              {buildAndDisplayRankCorrelation(
                res.rule,
                res.predVsActualRuleOnly,
                true
              )}
              <br />
              (If the predictions were random you'd expect 50%)
            </span>
          ) : (
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setShowExtraStatsInEvalMode(true);
              }}
            >
              (show more stats)
            </a>
          )}
        </span>
      );
    };

    const maxUnfilteredRows = showAllTeams ? 10000 : 75;
    const useManualOrderForTeams = !_.isEmpty(queryFilterRowBreaks);
    const tableRowsPreMaybeManualSort: _.CollectionChain<
      [OffseasonTeamInfo, number]
    > = _.chain(teamRanks)
      .filter(confFilter)
      .take(maxUnfilteredRows)
      .map((t, netRankIn) => [t, netRankIn]);

    const actualNumRows = confs
      ? tableRowsPreMaybeManualSort.size().value() //(this is safe to use twice, ie it doesn't "exhaust the chain")
      : maxUnfilteredRows;

    const evalResults = evalMode
      ? OffseasonLeaderboardUtils.buildEvalResults(
          teamRanks,
          tableRowsPreMaybeManualSort,
          (t: OffseasonTeamInfo) =>
            _.thru(getActualNetRankObj(t), (rankObj) =>
              rankObj ? toIntRank(rankObj?.off_net) : 0
            ),
          actualNumRows,
          confs != ""
        )
      : undefined;

    const maybeHandSortedTeamRanks = useManualOrderForTeams
      ? tableRowsPreMaybeManualSort.sortBy(([t, __]) => {
          return queryFiltersAsMap[t.team] || 100;
        })
      : tableRowsPreMaybeManualSort;

    const tableRows = maybeHandSortedTeamRanks
      .flatMap(([t, netRankIn], finalTeamOrder) => {
        const nonStdSort = sortBy && sortBy != "net" && transferInOutMode;

        const goodNet = GradeUtils.buildTeamPercentiles(
          derivedDivisionStats,
          { off_net: { value: t.goodNet } },
          ["net"],
          true
        );
        const badNet = GradeUtils.buildTeamPercentiles(
          derivedDivisionStats,
          { off_net: { value: t.badNet } },
          ["net"],
          true
        );

        const teamParams = {
          year,
          gender,
          team: t.team,
          evalMode: evalMode,
          ...(teamOverrides[t.team] || {}),
        };
        const teamOverride = teamOverrides[t.team] || {};
        const hasOverrides =
          teamOverride.addedPlayers ||
          teamOverride.deletedPlayers ||
          teamOverride.disabledPlayers ||
          teamOverride.overrides;
        const maybeOverriddenEl = hasOverrides ? <span> (*)</span> : null;

        const teamTooltip = (
          <Tooltip id={`teamTooltip${netRankIn}`}>
            {maybeOverriddenEl ? (
              <span>
                (Team has edits, click on View icon to right to see them)
                <br />
                <br />
              </span>
            ) : null}
            Open new tab with the detailed off-season predictions for this team
            {maybeOverriddenEl ? <span> (with these edits)</span> : null}
          </Tooltip>
        );
        const teamLink = (
          <OverlayTrigger placement="auto" overlay={teamTooltip}>
            <b>
              <a target="_blank" href={UrlRouting.getTeamEditorUrl(teamParams)}>
                {t.team}
              </a>
              {maybeOverriddenEl}
            </b>
          </OverlayTrigger>
        );

        const netRank =
          nonStdSort || confs ? netEffToRankMap[t.net]! : netRankIn;

        // Eval mode part 2:
        // (make the format like we'd called buildTeamPercentiles)
        const actualNetRankObj = getActualNetRankObj(t);
        // example of calling buildTeamPercentils
        //const actualNetRank = GradeUtils.buildTeamPercentiles(derivedDivisionStats, { off_net: { value: t.actualNet || 0 } }, [ "net" ], true);
        const actualNetRank = actualNetRankObj
          ? toIntRank(actualNetRankObj?.off_net)
          : 0;
        const goodNetRank = actualNetRankObj ? toIntRank(goodNet.off_net) : 0;
        const badNetRank = actualNetRankObj ? toIntRank(badNet.off_net) : 0;
        const evalStdDev =
          actualNetRank < netRank
            ? netRank - goodNetRank
            : badNetRank - netRank;
        const deltaProjRank =
          Math.abs(netRank - actualNetRank) / (evalStdDev || 1);
        //end Eval mode part 2

        /** Gives an idea of when H-E didn't have enough data to work with */
        const maybeMinutesWarning = () => {
          if (t.playersInPrediction <= 5) {
            const badPredictionWarning = (
              <Tooltip id={`badPredictionWarning${netRankIn}`}>
                This prediction is very dubious - only based on [
                {t.playersInPrediction}] players' stats, with [
                {(200 - t.playersInPredictionMins).toFixed(1)}] minutes assigned
                to [{t.conf}] replacement level stats, despite unrealistically
                maxing out the minutes of the named players.
              </Tooltip>
            );
            return (
              <OverlayTrigger placement="auto" overlay={badPredictionWarning}>
                <sup style={{ color: "red" }}>&nbsp;(!!)</sup>
              </OverlayTrigger>
            );
          } else if (
            t.playersInPrediction == 6 ||
            (t.playersInPrediction == 7 && t.playersInPredictionMins < 175)
          ) {
            const mehPredictionWarning = (
              <Tooltip id={`mehPredictionWarning${netRankIn}`}>
                This prediction is dubious - only based on [
                {t.playersInPrediction}] players' stats, with [
                {(200 - t.playersInPredictionMins).toFixed(1)}] minutes assigned
                to [{t.conf}] replacement level stats, despite possibly
                unrealistically maxing out the minutes of the named players.
              </Tooltip>
            );
            return (
              <OverlayTrigger placement="auto" overlay={mehPredictionWarning}>
                <sup style={{ color: "orange" }}>&nbsp;(!)</sup>
              </OverlayTrigger>
            );
          } else {
            return null;
          }
        };

        const isFinalRow =
          netRankIn + 1 == actualNumRows && (netRankIn > 0 || evalMode);
        //(2nd clause is to handle the case where there's only 1 entry - in eval mode goes below, otherwise goes on top)

        const pickSubHeaderMessage = (rank: number) => {
          if (evalResults) {
            if (confs && isFinalRow) {
              //(special case for filtered data)
              return resultsToText(evalResults[0]);
            } else if (rank == 10) {
              return resultsToText(evalResults[0]);
            } else if (rank == 25) {
              return resultsToText(evalResults[1]);
            } else if (rank == 50) {
              return resultsToText(evalResults[2]);
            } else if (isFinalRow) {
              //(final row)
              return resultsToText(evalResults[3]);
            } else return "";
          } else {
            if (rank == 0) {
              return "Top 25 + 1";
            } else if (rank == 26) {
              return "Solid NCAAT teams";
            } else if (rank == 35) {
              return "The Bubble";
            } else if (rank == 55) {
              return "Autobids / AD on Selection Committee / Maybe Next Year";
            } else {
              return "";
            }
          }
        };
        const yearOnYearDetails = GenericTableOps.buildSubHeaderRow(
          [
            [<div />, 5],
            [<i>Net Yr-on-Yr</i>, 4],
            [<i>Yr-on-Yr gain/loss details</i>, 6],
          ],
          "small text-center"
        );

        const subHeaderMessage = pickSubHeaderMessage(netRank);
        const subHeaderRows =
          nonStdSort || (confs && !isFinalRow) || !subHeaderMessage
            ? netRankIn == 0 && transferInOutMode
              ? [yearOnYearDetails]
              : []
            : [
                GenericTableOps.buildSubHeaderRow(
                  [
                    [<div />, evalMode ? 3 : 4],
                    [
                      <i>{subHeaderMessage}</i>,
                      transferInOutMode ? 15 : evalMode ? 12 : 9, //(15 arbitrarily chosen to look nice!)
                    ],
                  ],
                  "small text-center"
                ),
              ].concat(
                netRank == 0
                  ? transferInOutMode
                    ? [yearOnYearDetails]
                    : []
                  : [GenericTableOps.buildHeaderRepeatRow({}, "small")].concat(
                      transferInOutMode ? [yearOnYearDetails] : []
                    )
              );

        const totalInOutMargin =
          t.fr_net +
          (t.in_off - t.in_def) -
          (t.out_off - t.out_def) -
          (t.nba_off - t.nba_def) -
          (t.sr_off - t.sr_def);
        return (isFinalRow ? [] : subHeaderRows)
          .concat([
            GenericTableOps.buildDataRow(
              {
                title: (
                  <span>
                    {nonStdSort || confs ? (
                      <sup>
                        <small>{1 + netRankIn}</small>&nbsp;
                      </sup>
                    ) : null}
                    {teamLink}
                    {maybeMinutesWarning()}
                  </span>
                ),
                conf: <small>{t.conf}</small>,

                net: { value: t.net },
                net_grade: {
                  samples: numTeams,
                  value: (1.0 * (numTeams - netRank)) / numTeams,
                },
                actual_grade: _.isNil(actualNetRankObj?.off_net)
                  ? undefined
                  : {
                      ...actualNetRankObj?.off_net,
                      colorOverride: deltaProjRank,
                    },
                off: { value: avgEff + t.off },
                off_grade: {
                  samples: numTeams,
                  value:
                    (1.0 * (numTeams - offEffToRankMap[t.off]!)) / numTeams,
                },
                def: { value: avgEff + t.def },
                def_grade: {
                  samples: numTeams,
                  value:
                    (1.0 * (numTeams - defEffToRankMap[t.def]!)) / numTeams,
                },

                high_grade: goodNet.off_net,
                low_grade: badNet.off_net,

                dev_margin: { value: t.dev_off - t.dev_def },
                inout_margin: { value: totalInOutMargin },
                fr_margin: { value: t.fr_net },
                in_margin: { value: t.in_off - t.in_def },
                out_margin: { value: t.out_off - t.out_def },
                nba_margin: { value: t.nba_off - t.nba_def },
                sr_margin: { value: t.sr_off - t.sr_def },

                roster: (
                  <span style={{ whiteSpace: "nowrap" }}>
                    <small>{t.rosterInfo}</small>
                  </span>
                ),
                edit: (
                  <OverlayTrigger overlay={editTooltip} placement="auto">
                    <Button
                      variant={
                        t.team == teamView ? "secondary" : "outline-secondary"
                      }
                      size="sm"
                      onClick={(ev: any) => {
                        friendlyChange(() => {
                          if (teamView == t.team) {
                            setTeamView("");
                          } else {
                            setTeamView(t.team);
                          }
                        }, true);
                      }}
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Button>
                  </OverlayTrigger>
                ),
              },
              GenericTableOps.defaultFormatter,
              GenericTableOps.defaultCellMeta
            ),
          ])
          .concat(
            teamView == t.team
              ? [
                  GenericTableOps.buildTextRow(
                    <TeamEditorTable
                      startingState={{
                        team: teamView,
                        gender,
                        year,
                        evalMode: evalMode,
                        ...(teamOverrides[teamView] || {}),
                      }}
                      dataEvent={dataEvent}
                      onChangeState={(newState) => {
                        const newOverrides = _.cloneDeep(teamOverrides);
                        if (_.isEmpty(newState)) {
                          delete newOverrides[teamView];
                        } else {
                          newOverrides[teamView] = newState;
                        }
                        friendlyChange(() => {
                          setTeamOverrides(newOverrides);
                        }, true);
                      }}
                      overrideGrades={derivedDivisionStats}
                    />
                  ),
                ]
              : []
          )
          .concat(
            queryFilterRowBreaks.has(finalTeamOrder)
              ? [GenericTableOps.buildRowSeparator()]
              : []
          )
          .concat(isFinalRow ? _.take(subHeaderRows, 1) : []);
      })
      .value();

    return (
      <GenericTable
        tableCopyId="teamTable"
        tableFields={tableDefs}
        tableData={tableRows}
        cellTooltipMode={undefined}
      />
    );
  }, [
    gender,
    year,
    confs,
    teamView,
    dataEvent,
    teamOverrides,
    transferInOutMode,
    evalMode,
    sortBy,
    queryFilters,
    rostersPerTeam,
    showExtraStatsInEvalMode,
  ]);

  // 3] View

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      !dataEvent.error &&
      (loadingOverride || (dataEvent?.players || []).length == 0)
    );
  }

  /** Switch to pre-season button */
  const getInSeasonButton = () => {
    const tooltip = (
      <Tooltip id="inSeasonLeaderboard">
        Switch to in-season leaderboard
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={(e) => {
            window.location.href = UrlRouting.getTeamLeaderboardUrl({
              year,
            });
          }}
        >
          IN
        </Button>
      </OverlayTrigger>
    );
  };

  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          className="float-left"
          id={`copyLink_offSeasonTeamLeaderboard`}
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
    net: { label: "Net Rating", value: "net" },
    offseason_net: { label: "Total offseason net", value: "offseason_net" },
    total_io: { label: "Total in - out", value: "total_io" },
    txfer_io: { label: "Transfer in - out", value: "txfer_io" },
    txfer_in: { label: "Transfers in", value: "txfer_in" },
    txfer_out: { label: "Transfers out", value: "txfer_out" },
    dev_in: { label: "Returning improvement", value: "dev_in" },
    nba_out: { label: "Declared", value: "nba_out" },
    sr_out: { label: "Aged out", value: "sr_out" },
  };

  return (
    <Container>
      <Form.Group as={Row}>
        <Col xs={6} sm={6} md={3} lg={2} style={{ zIndex: 12 }}>
          <ThemedSelect
            value={stringToOption("Men")}
            options={["Men"].map((gender) => stringToOption(gender))}
            isSearchable={false}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                /* currently only support Men */
              }
            }}
          />
        </Col>
        <Col xs={6} sm={6} md={3} lg={2} style={{ zIndex: 11 }}>
          <ThemedSelect
            isDisabled={transferInOutMode}
            value={stringToOption(year)}
            options={DateUtils.lboardYearListWithNextYear(tier == "High")
              .filter((y) => y >= DateUtils.firstYearWithDecentRosterData)
              .filter((y) =>
                evalMode ? y <= DateUtils.mostRecentYearWithLboardData : true
              ) //(can't eval year that hasn't happened yet)
              .map((r) => stringToOption(r))}
            isSearchable={false}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                /* currently only support 2022/23 - but lets other years be specified to jump between off-season predictions and previous results */
                setYear((option as any)?.value);
                setYearBeforeSettingEvalMode("");
              }
            }}
          />
        </Col>
        <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
        <Col xs={12} sm={12} md={5} lg={5} style={{ zIndex: 10 }}>
          <ConferenceSelector
            emptyLabel={
              year < DateUtils.yearFromWhichAllMenD1Imported
                ? `All High Tier Teams`
                : `All Teams`
            }
            confStr={confs}
            confMap={dataEvent?.confMap}
            confs={dataEvent?.confs}
            onChangeConf={(confStr) =>
              friendlyChange(() => setConfs(confStr), confs != confStr)
            }
          />
        </Col>
        <Col lg={2} className="mt-1">
          {getCopyLinkButton()}
          &nbsp;&nbsp;&nbsp;
          {year <= DateUtils.mostRecentYearWithData
            ? getInSeasonButton()
            : null}
        </Col>
        <Col lg={1} className="mt-1">
          <GenericTogglingMenu>
            <GenericTogglingMenuItem
              text={"Show breakdown of team's offseason metrics"}
              truthVal={transferInOutMode}
              disabled={evalMode}
              onSelect={() =>
                friendlyChange(
                  () => setTransferInOutMode(!transferInOutMode),
                  !evalMode
                )
              }
            />
            <GenericTogglingMenuItem
              text={"Show all teams (slow, useful for export)"}
              truthVal={showAllTeams}
              disabled={false}
              onSelect={() =>
                friendlyChange(() => setShowAllTeams(!showAllTeams), !evalMode)
              }
            />
            <GenericTogglingMenuItem
              text={"Review mode"}
              truthVal={evalMode}
              disabled={transferInOutMode}
              onSelect={() =>
                friendlyChange(() => {
                  if (evalMode) {
                    // Switching off, go back to year we were on
                    if (yearBeforeSettingEvalMode) {
                      setYear(yearBeforeSettingEvalMode);
                      setYearBeforeSettingEvalMode("");
                    } //(otherwise leave year along)
                    setEvalMode(false);
                  } else {
                    //Switching on, we only support 21/22 and 22/23
                    setYearBeforeSettingEvalMode(year);
                    if (year < DateUtils.firstYearWithDecentRosterData) {
                      // Don't support leaderboard eval mode before here, rosters are too wrong
                      setYear(DateUtils.firstYearWithDecentRosterData);
                    } else if (
                      year == DateUtils.offseasonPredictionYear &&
                      !DateUtils.seasonNotFinished[year]
                    ) {
                      // season finished, so offseason year has no results to evalyate, jump back to previous year
                      setYear(DateUtils.getPrevYear(year));
                    } //(else no need to change year)
                    setEvalMode(true);
                  }
                }, true)
              }
            />
          </GenericTogglingMenu>
        </Col>
      </Form.Group>
      {transferInOutMode || hasCustomFilter ? (
        <Form.Group as={Row}>
          {hasCustomFilter ? (
            <Col xs={12} sm={12} md={8} lg={8}>
              <InputGroup>
                <InputGroup.Prepend>
                  <InputGroup.Text id="filter">
                    Filter{maybeFilterPrompt}:
                  </InputGroup.Text>
                </InputGroup.Prepend>
                <div className="flex-fill">
                  <TeamFilterAutoSuggestText
                    readOnly={false}
                    placeholder={`;-separated list of teams, or "BREAK;"`}
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
          ) : null}
          {transferInOutMode ? (
            <Col xs={12} sm={12} md={4} lg={4}>
              <ThemedSelect
                styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                value={sortByOptions[sortBy]}
                options={_.values(sortByOptions)}
                isSearchable={false}
                onChange={(option: any) => {
                  if ((option as any)?.value) {
                    const newSortBy = (option as any)?.value || "net";
                    friendlyChange(
                      () => setSortBy(newSortBy),
                      sortBy != newSortBy
                    );
                  }
                }}
              />
            </Col>
          ) : null}
        </Form.Group>
      ) : null}
      <Row>
        <Col>
          <LoadingOverlay
            active={needToLoadQuery()}
            spinner
            text={"Loading Offseason Leaderboard..."}
          >
            {table}
          </LoadingOverlay>
        </Col>
      </Row>
    </Container>
  );
};
export default OffSeasonLeaderboardTable;
