// React imports:
import React, { useState, useEffect, useRef } from "react";

// Lodash:
import _, { isNumber, some, values } from "lodash";

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
import Select, { components } from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faPen,
  faEye,
  faExclamation,
  faCheck,
  faFilter,
  faList,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ConferenceSelector, {
  ConfSelectorConstants,
} from "./shared/ConferenceSelector";

// Table building
// Util imports
import {
  TeamEditorParams,
  PlayerSeasonComparisonParams,
  ParamDefaults,
  PlayerLeaderboardParams,
  TeamStatsExplorerChartParams,
  TeamStatsExplorerParams,
} from "../utils/FilterModels";

import { Statistic, RosterEntry, PureStatSet } from "../utils/StatModels";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { GradeUtils } from "../utils/stats/GradeUtils";
import { UrlRouting } from "../utils/UrlRouting";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import TeamEditorTable, { TeamEditorStatsModel } from "./TeamEditorTable";
import { DateUtils } from "../utils/DateUtils";
import { Dropdown, InputGroup, ModalTitle } from "react-bootstrap";
import AsyncFormControl from "./shared/AsyncFormControl";

// Library imports:
import fetch from "isomorphic-unfetch";
import { RequestUtils } from "../utils/RequestUtils";
import {
  OffseasonLeaderboardUtils,
  OffseasonTeamInfo,
} from "../utils/stats/OffseasonLeaderboardUtils";

// Recharts imports:
//@ts-ignore
import {
  ReferenceArea,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Label,
  Cell,
  LabelList,
} from "recharts";
import { GoodBadOkTriple } from "../utils/stats/TeamEditorUtils";
import { CbbColors } from "../utils/CbbColors";
import {
  ConferenceToNickname,
  NicknameToConference,
  NonP6Conferences,
  Power6Conferences,
} from "../utils/public-data/ConferenceInfo";
import { AdvancedFilterUtils } from "../utils/AdvancedFilterUtils";
import LinqExpressionBuilder from "./shared/LinqExpressionBuilder";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { ScatterChartUtils } from "../utils/charts/ScatterChartUtils";
import GenericCollapsibleCard from "./shared/GenericCollapsibleCard";
import PlayerLeaderboardTable from "./PlayerLeaderboardTable";
import ThemedSelect from "./shared/ThemedSelect";
import ChartConfigContainer from "./shared/ChartConfigContainer";
import ExplorerChart from "./shared/ExplorerChart";
import { decompAxis } from "../utils/ExplorerChartUtils";
import { useTheme } from "next-themes";
import { TeamStatsExplorerModel } from "./TeamStatsExplorerTable";
import { LuckUtils } from "../utils/stats/LuckUtils";
import { TeamEvalUtils } from "../utils/stats/TeamEvalUtils";
import YearSelector from "./shared/YearSelector";

type Props = {
  startingState: TeamStatsExplorerChartParams;
  dataEvent: TeamStatsExplorerModel;
  onChangeState: (newParams: TeamStatsExplorerChartParams) => void;
};

/** The list of pre-built team charts, exported so that other elements can list them */
export const overallTeamChartPresets = [] as Array<
  [string, TeamStatsExplorerChartParams]
>;

/** A sensible looking set of bubble offenses for the hypo where the actual year is not available */
const fallbackBubbleOffense = [
  115.9, 113.2, 114.7, 113.4, 114.3, 114.1, 117.8, 114.6, 115.2, 113.1,
];
/** A sensible looking set of bubble offenses for the hypo where the actual year is not available */
const fallbackBubbleDefense = [
  99.5, 96.9, 98.7, 97.4, 98.4, 98.4, 102.1, 99.2, 100, 98.1,
];

const TeamStatsExplorerChart: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const { resolvedTheme } = useTheme();
  const contrastForegroundBuilder =
    resolvedTheme == "dark"
      ? CbbColors.alwaysLightGrey
      : CbbColors.alwaysDarkGrey;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data model

  //(controlling the leaderboard table)
  const [statsExplorerParams, setStatsExplorerParams] = useState(
    startingState as TeamStatsExplorerParams
  );

  // (don't support tier changes)
  const tier: string = "All";

  // Data source
  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);
  const [confs, setConfs] = useState(startingState.confs || "");
  const hasCustomFilter =
    confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0;

  const [year, setYear] = useState(
    startingState.year || DateUtils.mostRecentYearWithData
  );

  const [gender, setGender] = useState(
    startingState.gender || ParamDefaults.defaultGender
  );

  const [title, setTitle] = useState(startingState.title || "");

  // TODO: support for manual filter at the chart stage:
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

  // Chart magic:

  const [toggledEntities, settoggledEntities] = useState<
    Record<string, boolean>
  >(
    startingState.toggledEntities
      ? _.chain(startingState.toggledEntities.split(";"))
          .map((p) => [p, true])
          .fromPairs()
          .value()
      : {}
  );
  const globalScatterChartRef = React.createRef<any>();

  // All the complex config:

  // If there's a title show that, otherwise show the config
  const [showConfigOptions, setShowConfigOptions] = useState<boolean>(
    startingState.showConfig || !startingState.title
  );

  // If there's a title show that, otherwise show the config
  const [showTable, setShowTable] = useState<boolean>(
    startingState.showTable || false
  );

  // Whether to show only manually selected players in the table (if there are any)
  const [showOnlyHandSelectedInTable, setShowOnlyHandSelectedInTable] =
    useState<boolean>(
      _.isNil(startingState.showOnlyHandSelectedInTable)
        ? true
        : startingState.showOnlyHandSelectedInTable
    );

  // Filter text (show/hide):
  const [datasetFilterStr, setAdvancedFilterStr] = useState(
    startingState.datasetFilter || ""
  );
  const [datasetFilterError, setAdvancedFilterError] = useState(
    undefined as string | undefined
  );
  const datasetFilterPresets = [["All teams", "ALL"]] as Array<
    [string, string]
  >;

  // Highlight text (show/hide):
  const [highlightFilterStr, setHighlightFilterStr] = useState(
    startingState.highlightFilter || ""
  );
  const [highlightFilterError, setHighlightFilterError] = useState(
    undefined as string | undefined
  );

  // Chart control
  const [xAxis, setXAxis] = useState(startingState.xAxis || "");
  const [yAxis, setYAxis] = useState(startingState.yAxis || "");
  const [dotColor, setDotColor] = useState(startingState.dotColor || "");
  const [dotSize, setDotSize] = useState(startingState.dotSize || "");
  const axisPresets = [] as Array<[string, string]>;
  const [dotColorMap, setDotColorMap] = useState(
    startingState.dotColorMap || "Default"
  );
  const colorMapOptions = CbbColors.colorMapOptions(resolvedTheme);

  const [labelStrategy, setLabelStrategy] = useState(
    startingState.labelStrategy || "None"
  );

  // On page load, if title is specified and the other params aren't then pre-load
  const applyPresetChart = (preset: TeamStatsExplorerChartParams) => {
    friendlyChange(() => {
      setTitle(preset.title || "");
      setAdvancedFilterStr(
        datasetFilterPresets.find((t) => t[0] == preset.datasetFilter)?.[1] ||
          preset.datasetFilter ||
          ""
      );
      setHighlightFilterStr(
        datasetFilterPresets.find((t) => t[0] == preset.highlightFilter)?.[1] ||
          preset.highlightFilter ||
          ""
      );
      setXAxis(
        axisPresets.find((t) => t[0] == preset.xAxis)?.[1] || preset.xAxis || ""
      );
      setYAxis(
        axisPresets.find((t) => t[0] == preset.yAxis)?.[1] || preset.yAxis || ""
      );
      setDotColor(
        axisPresets.find((t) => t[0] == preset.dotColor)?.[1] ||
          preset.dotColor ||
          ""
      );
      setDotSize(
        axisPresets.find((t) => t[0] == preset.dotSize)?.[1] ||
          preset.dotSize ||
          ""
      );
      setDotColorMap(preset.dotColorMap || "Default");
      setLabelStrategy(preset.labelStrategy || "None");
    }, true);
  };
  useEffect(() => {
    if (title && !xAxis && !yAxis) {
      const maybePreset = _.find(
        overallTeamChartPresets,
        (kv) => kv[0] == title
      );
      if (maybePreset) applyPresetChart(maybePreset[1]);
    }
  }, []);

  /** When the params change */
  useEffect(() => {
    onChangeState({
      ...statsExplorerParams,
      year: year,
      confs,
      queryFilters: queryFilters,
      title: title,
      datasetFilter: datasetFilterStr,
      highlightFilter: highlightFilterStr,
      xAxis: xAxis,
      yAxis: yAxis,
      dotSize: dotSize,
      dotColor: dotColor,
      showConfig: showConfigOptions,
      dotColorMap: dotColorMap,
      labelStrategy: labelStrategy,
      toggledEntities: _.keys(toggledEntities).join(";"),
      showTable: showTable,
      showOnlyHandSelectedInTable: showOnlyHandSelectedInTable,
    });
  }, [
    confs,
    year,
    queryFilters,
    datasetFilterStr,
    highlightFilterStr,
    title,
    xAxis,
    yAxis,
    dotColor,
    dotColorMap,
    dotSize,
    showConfigOptions,
    labelStrategy,
    statsExplorerParams,
    toggledEntities,
    showOnlyHandSelectedInTable,
    showTable,
  ]);

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  useEffect(() => {
    // Add and remove clipboard listener
    initClipboard();

    if (typeof document !== `undefined`) {
      //(if we added a clipboard listener, then remove it on page close)
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
      var newClipboard = new ClipboardJS(`#copyLink_playerSeasonComparison`, {
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

  // Viewport management

  const [height, setHeight] = useState(512);
  const [screenHeight, setScreenHeight] = useState(512);
  const [screenWidth, setScreenWidth] = useState(512);
  //(would only need these if using dynamic sizing)
  // const latestScreenHeight = useRef(screenHeight);
  // const latestScreenWidth = useRef(screenWidth);
  const calcWidthHeight = (): [number, number] => {
    const baseHeight = Math.max(0.75 * window.innerHeight, 400);
    const baseWidth = Math.max(baseHeight, Math.max(window.innerWidth, 400));
    return [baseWidth, baseHeight];
  };
  useEffect(() => {
    function handleResize() {
      setTimeout(() => {
        setHeight(window.innerHeight);
        const [baseWidth, baseHeight] = calcWidthHeight();
        // Only bother setting these expensive vars if they chance enough
        if (
          Math.abs(baseHeight - screenHeight) > 25 ||
          Math.abs(baseWidth - screenWidth) > 25
        ) {
          setScreenHeight(baseHeight);
          setScreenWidth(baseWidth);
        }
      }, 250);
    }
    window.addEventListener("resize", handleResize);
    setHeight(window.innerHeight);
    const [baseWidth, baseHeight] = calcWidthHeight();
    setScreenHeight(baseHeight);
    setScreenWidth(baseWidth);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2] Processing

  // Tooltip builder (doesn't need to be closed in React.useMemo below)

  const fieldValExtractor = (field: string) => {
    return (p: PureStatSet | undefined) => {
      if (field[0] == "o" || field[0] == "d") {
        return p?.[field]?.value || 0;
      } else {
        return (
          (p?.[`off_${field}`]?.value || 0) - (p?.[`def_${field}`]?.value || 0)
        );
      }
    };
  };

  type CustomTooltipProps = {
    active?: boolean;
    payload?: any;
    label?: string;
  };
  const CustomTooltip: React.FunctionComponent<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active) {
      const data = payload?.[0].payload || {};
      if (!data.showTooltips) return null; //(if showing sub-chart don't show tooltips for main chart)

      //TODO: come up with some team tooltip info

      const teamObj = data.p;

      return (
        <div
          className="custom-tooltip"
          style={{
            background:
              resolvedTheme == "dark"
                ? "rgba(0, 0, 0, 0.9)"
                : "rgba(238, 238, 238, 0.9)",
          }}
        >
          <small>
            <p className="label">
              <b>{`${teamObj?.team || "??"}`}</b> (
              <i>{ConferenceToNickname[teamObj.conf] || "??"}</i>)
              <br />
            </p>
            <p className="desc">
              {/*
              <span>
                Net RAPM:{" "}
                <b>
                  {fieldValExtractor("adj_rapm")(
                    data?.p?.actualResults
                  ).toFixed(1)}
                </b>{" "}
                pts/100
              </span>
              <br />
              */}
            </p>
          </small>
        </div>
      );
    }
    return null;
  };
  // (end chart tooltip)

  // Processing primitives

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
        } else {
          return -(team.power || 0);
        }
      })
      .value();
  };

  const [chart, teamStatsExplorerTable] = React.useMemo(() => {
    if (_.isEmpty(dataEvent.teams)) {
      // If we don't have players we're not done loading yet, so put up a loading screen:
      return [<div style={{ height: "200px" }}></div>, <div></div>];
    } else {
      setLoadingOverride(false);
    }

    const teamObjs = phase1Processing(dataEvent.teams, false);

    const handleTeamToggle = (teamKey: string) => {
      friendlyChange(
        () => {
          if (teamKey === "") {
            // Clear all selections
            settoggledEntities({});
          } else if (toggledEntities[teamKey]) {
            settoggledEntities(_.omit(toggledEntities, [teamKey]));
          } else {
            settoggledEntities({
              ...toggledEntities,
              [teamKey]: true,
            });
          }
        },
        true,
        250
      ); //(i experimented with making this shorter but it tended not to appear a bit too often)
    };

    // Apply filtering to the data
    const [filteredData, tmpAdvancedFilterError] = datasetFilterStr
      ? AdvancedFilterUtils.applyTeamExplorerFilter(
          teamObjs,
          datasetFilterStr,
          (year: string) => undefined, //(team rank queries not yet supported)
          {
            x: decompAxis(xAxis).linq,
            y: decompAxis(yAxis).linq,
            z: dotSize,
            color: dotColor,
          }
        )
      : [[], undefined];
    setAdvancedFilterError(tmpAdvancedFilterError);

    const [highlightData, tmpHighlightFilterError] = highlightFilterStr
      ? AdvancedFilterUtils.applyTeamExplorerFilter(
          filteredData,
          highlightFilterStr,
          (year: string) => undefined, //(team rank queries not yet supported)
          {}
        )
      : [undefined, undefined];
    setHighlightFilterError(tmpHighlightFilterError);

    // Build chart data for leaderboard table
    const hasCustomFilter =
      confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0;
    const specialCases = {
      P6: Power6Conferences,
      MM: NonP6Conferences,
    } as Record<string, any>;
    const confSet = confs
      ? new Set(
          _.flatMap(
            (confs || "").split(","),
            (c) => specialCases[c] || [NicknameToConference[c] || c]
          )
        )
      : undefined;

    const chartToReturn = (
      <ExplorerChart
        filteredData={filteredData}
        highlightData={highlightData}
        CustomTooltip={CustomTooltip}
        xAxis={xAxis}
        yAxis={yAxis}
        dotColor={dotColor}
        dotSize={dotSize}
        dotColorMap={dotColorMap}
        labelStrategy={labelStrategy}
        confs={confs}
        queryFilters={queryFilters}
        axisPresets={axisPresets}
        colorMapOptions={colorMapOptions}
        contrastForegroundBuilder={contrastForegroundBuilder}
        screenHeight={screenHeight}
        screenWidth={screenWidth}
        height={height}
        toggledEntities={toggledEntities}
        onPlayerToggle={handleTeamToggle}
      />
    );
    const dataIsAlreadySorted =
      datasetFilterStr.includes("SORT_BY") ||
      highlightFilterStr.includes("SORT_BY");

    const subChartData =
      _.isEmpty(confs) && !highlightData
        ? undefined
        : _.chain(highlightData || filteredData)
            .filter((p: any) => {
              return _.isEmpty(confs)
                ? true
                : confSet?.has(p.actualResults?.conf || "???") ||
                    false ||
                    (hasCustomFilter &&
                      (queryFilters || "").indexOf(
                        `${p.actualResults?.team || ""};`
                      ) >= 0);
            })
            .value();

    const teamStatsExplorerTableToReturn = (
      <div />
      // <PlayerLeaderboardTable
      //   startingState={{
      //     ...startingState,
      //     includePrevYear: showPrevNextInTable,
      //     sortBy: dataIsAlreadySorted ? "unsorted" : undefined, //(default if not sorted already)
      //     year: multiYearScenarios[year] ? DateUtils.AllYears : year,
      //     tier: "All",
      //     minPoss: incLowVol ? "0" : undefined,
      //   }}
      //   dataEvent={{
      //     players: (subChartData || filteredData)
      //       .map((p) => {
      //         if (showPrevNextInTable && p.actualResults && p.orig) {
      //           p.actualResults.prevYear = p.orig;
      //         }
      //         return p.actualResults;
      //       })
      //       .filter((p) => {
      //         return _.isEmpty(toggledEntities) || !showOnlyHandSelectedInTable
      //           ? true
      //           : toggledEntities[p?.code || "??"];
      //       }),
      //     confs: _.chain(dataEvent)
      //       .values()
      //       .flatMap((d) => d.confs || [])
      //       .uniq()
      //       .value(),
      //     //(don't need confMap because the conference selector isn't shown, it's just inherited)
      //     error: _.chain(dataEvent)
      //       .values()
      //       .flatMap((d) => (d.error ? [d.error] : []))
      //       .value()
      //       .join("/"),
      //     transfers: undefined, //(we've already injected transfer_src and transfer_dest where possible)
      //     syntheticData: true,
      //   }}
      //   onChangeState={(newParams: PlayerLeaderboardParams) => {
      //     setLboardParams(newParams);
      //   }}
      // />
    );

    return [chartToReturn, teamStatsExplorerTableToReturn];
  }, [
    confs,
    dataEvent,
    queryFilters,
    height,
    datasetFilterStr,
    highlightFilterStr,
    xAxis,
    yAxis,
    dotSize,
    dotColor,
    dotColorMap,
    labelStrategy,
    screenHeight,
    screenWidth,
    toggledEntities,
    showOnlyHandSelectedInTable,
    resolvedTheme,
  ]);

  // 3] View

  // Advanced filter text

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return loadingOverride || _.size(dataEvent.teams) == 0;
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
          id={`copyLink_playerSeasonComparison`}
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

  // Overall presets

  // Color selector

  // Label strategy

  // Chart config container callbacks
  const handleFilterChange = (newVal: string) => {
    friendlyChange(() => setAdvancedFilterStr(newVal), true);
  };

  const handleHighlightChange = (newVal: string) => {
    friendlyChange(() => setHighlightFilterStr(newVal), true);
  };

  const handleXAxisChange = (newVal: string) => {
    friendlyChange(() => setXAxis(newVal), true);
  };

  const handleYAxisChange = (newVal: string) => {
    friendlyChange(() => setYAxis(newVal), true);
  };

  const handleDotColorChange = (newVal: string) => {
    friendlyChange(() => setDotColor(newVal), true);
  };

  const handleDotSizeChange = (newVal: string) => {
    friendlyChange(() => setDotSize(newVal), true);
  };

  const handleLabelStrategyChange = (name: string) => {
    friendlyChange(() => {
      setLabelStrategy(name);
    }, true);
  };

  const handleDotColorMapChange = (newColorMap: string) => {
    friendlyChange(() => {
      setDotColorMap(newColorMap);
    }, newColorMap != dotColorMap);
  };

  return (
    <>
      <Container className="medium_screen">
        <Form.Row>
          <Col xs={6} sm={6} md={6} lg={2} style={{ zIndex: 12 }}>
            <ThemedSelect
              isDisabled={true}
              value={stringToOption(gender)}
              options={["Men", "Women"].map((gender) => stringToOption(gender))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) {
                  const maybeGender = (option as any)?.value;
                  friendlyChange(
                    () => setGender(maybeGender),
                    maybeGender != gender
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
              confs={dataEvent.confs}
              onChangeConf={(confStr) =>
                friendlyChange(() => setConfs(confStr), confs != confStr)
              }
            />
          </Col>
          <Form.Group as={Col} xs={1} className="mt-1">
            {getCopyLinkButton()}
          </Form.Group>
          <Form.Group as={Col} xs={6} sm={6} md={6} lg={2} className="mt-2">
            <Form.Check
              className="float-left"
              type="switch"
              id="configOptions"
              checked={!showConfigOptions}
              onChange={() => {
                const isCurrentlySet = showConfigOptions;
                setShowConfigOptions(!showConfigOptions);
              }}
              label="Hide Config"
            />
          </Form.Group>
        </Form.Row>
        {hasCustomFilter ? (
          <Form.Row>
            {hasCustomFilter ? (
              <Col xs={12} sm={12} md={8} lg={8}>
                <InputGroup>
                  <InputGroup.Prepend>
                    <InputGroup.Text id="filter">Filter:</InputGroup.Text>
                  </InputGroup.Prepend>
                  <AsyncFormControl
                    startingVal={queryFilters}
                    onChange={(t: string) => {
                      const newStr = t.endsWith(";") ? t : t + ";";
                      friendlyChange(
                        () => setQueryFilters(newStr),
                        newStr != queryFilters
                      );
                    }}
                    timeout={500}
                    placeholder=";-separated list of teams"
                  />
                </InputGroup>
              </Col>
            ) : null}
          </Form.Row>
        ) : null}
      </Container>
      <ChartConfigContainer
        title={title}
        onTitleChange={setTitle}
        chartPresets={overallTeamChartPresets}
        onApplyPreset={applyPresetChart}
        onClearPreset={() => {
          applyPresetChart({});
        }}
        showConfigOptions={showConfigOptions}
        filterValue={datasetFilterStr}
        filterError={datasetFilterError}
        filterPlaceholder="Enter Linq: remove non-matching players (see presets for ideas - just type 'next_off_poss' to get all players)"
        filterPresets={datasetFilterPresets}
        onFilterChange={handleFilterChange}
        highlightValue={highlightFilterStr}
        highlightError={highlightFilterError}
        highlightPlaceholder="Enter Linq: non-matching players from 'Filter' are faded into the background"
        highlightPresets={datasetFilterPresets}
        onHighlightChange={handleHighlightChange}
        labelStrategy={labelStrategy}
        onLabelStrategyChange={handleLabelStrategyChange}
        xAxis={xAxis}
        yAxis={yAxis}
        onXAxisChange={handleXAxisChange}
        onYAxisChange={handleYAxisChange}
        axisPresets={axisPresets}
        dotColor={dotColor}
        onDotColorChange={handleDotColorChange}
        dotColorMap={dotColorMap}
        colorMapOptions={colorMapOptions}
        onDotColorMapChange={handleDotColorMapChange}
        contrastForegroundBuilder={contrastForegroundBuilder}
        dotSize={dotSize}
        onDotSizeChange={handleDotSizeChange}
        autocompleteOptions={
          AdvancedFilterUtils.playerSeasonComparisonAutocomplete
        }
        showHelp={showHelp}
      />
      <Container className="medium_screen">
        <Row>
          <Col>
            {(xAxis && yAxis) || loadingOverride ? (
              <LoadingOverlay
                active={needToLoadQuery()}
                spinner
                text={"Loading Team Stats Explorer Chart..."}
                styles={{
                  overlay: (base: any) => ({
                    ...base,
                    zIndex: 2000,
                  }),
                }}
              >
                {chart}
              </LoadingOverlay>
            ) : (
              <LoadingOverlay
                active={true}
                text={`Configure chart or select a preset from "Chart Title"`}
              >
                {chart}
              </LoadingOverlay>
            )}
          </Col>
        </Row>
        <Row>
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
            <GenericCollapsibleCard
              screenSize="medium_screen"
              minimizeMargin={true}
              title="Team Stats"
              helpLink={undefined}
              startClosed={!showTable}
              onShowHide={(nowShown: boolean) => setShowTable(nowShown)}
            >
              <Container className="medium_screen">
                <Row>
                  <Form.Group as={Col} className="mt-2">
                    <Form.Check
                      className="float-left"
                      type="switch"
                      id="showOnlyHandSelectedInTable"
                      disabled={_.isEmpty(toggledEntities)}
                      checked={showOnlyHandSelectedInTable}
                      onChange={() => {
                        friendlyChange(
                          () =>
                            setShowOnlyHandSelectedInTable(
                              !showOnlyHandSelectedInTable
                            ),
                          true
                        );
                      }}
                      label="Show only hand-selected players"
                    />
                  </Form.Group>
                </Row>
                <Row>{teamStatsExplorerTable}</Row>
              </Container>
            </GenericCollapsibleCard>
          </Col>
        </Row>
      </Container>
    </>
  );
};
export default TeamStatsExplorerChart;
