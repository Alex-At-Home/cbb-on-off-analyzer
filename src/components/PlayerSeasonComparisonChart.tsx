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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import ConferenceSelector, {
  ConfSelectorConstants,
} from "./shared/ConferenceSelector";

// Table building
// Util imports
import {
  PlayerSeasonComparisonParams,
  PlayerLeaderboardParams,
} from "../utils/FilterModels";

import { Statistic, RosterEntry, PureStatSet } from "../utils/StatModels";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import TeamEditorTable, { TeamEditorStatsModel } from "./TeamEditorTable";
import { DateUtils } from "../utils/DateUtils";
import { Dropdown, InputGroup, ModalTitle } from "react-bootstrap";

// Library imports:
import {
  OffseasonLeaderboardUtils,
  OffseasonTeamInfo,
} from "../utils/stats/OffseasonLeaderboardUtils";

import { GoodBadOkTriple } from "../utils/stats/TeamEditorUtils";
import { CbbColors } from "../utils/CbbColors";
import {
  ConferenceToNickname,
  NicknameToConference,
  NonP6Conferences,
  Power6Conferences,
} from "../utils/public-data/ConferenceInfo";
import { AdvancedFilterUtils } from "../utils/AdvancedFilterUtils";
import GenericCollapsibleCard from "./shared/GenericCollapsibleCard";
import PlayerLeaderboardTable from "./PlayerLeaderboardTable";
import ThemedSelect from "./shared/ThemedSelect";
import ChartConfigContainer from "./shared/ChartConfigContainer";
import ExplorerChart from "./shared/ExplorerChart";
import { decompAxis } from "../utils/ExplorerChartUtils";
import { useTheme } from "next-themes";
import TeamFilterAutoSuggestText from "./shared/TeamFilterAutoSuggestText";

type Props = {
  startingState: PlayerSeasonComparisonParams;
  dataEvent: Record<string, TeamEditorStatsModel>;
  onChangeState: (newParams: PlayerSeasonComparisonParams) => void;
};

/** The list of pre-built player charts, exported so that other elements can list them */
export const overallPlayerChartPresets = [
  [
    "Transfer predictions",
    {
      title: "How transfers fared compared to their predicted RAPM",
      datasetFilter: "Transfers",
      xAxis: "Off RAPM: actual - predicted",
      yAxis: "Def RAPM: actual - predicted",
      dotColor: "RAPM margin",
      dotSize: "Possession% (off)",
      dotColorMap: "RAPM",
      labelStrategy: "Top/Bottom 10",
      pointMarkerType: "Colored Dot",
    },
  ],
  [
    "Freshmen vs Rankings",
    {
      title:
        "How Freshmen fared compared to a prediction based on their HS ranking",
      datasetFilter: "Ranked Freshmen",
      xAxis: "Off RAPM: actual - predicted",
      yAxis: "Def RAPM: actual - predicted",
      dotColor: "RAPM margin",
      dotSize: "Possession% (off)",
      dotColorMap: "RAPM",
      labelStrategy: "Top/Bottom 10",
      pointMarkerType: "Colored Dot",
    },
  ],
  [
    "Fr to Soph Jumps",
    {
      title: "Increase in production from Freshman to Soph years",
      datasetFilter: `prev_roster.year_class == "Fr" AND next_roster.year_class == "So" SORT_BY (next_adj_rapm_margin - prev_adj_rapm_margin) DESC`,
      xAxis: "prev_adj_rapm_margin",
      yAxis: "next_adj_rapm_margin",
      dotColor: "next_adj_rapm_margin - prev_adj_rapm_margin",
      dotSize: "Possession% (off)",
      dotColorMap: "RAPM",
      labelStrategy: "Top/Bottom 10",
      pointMarkerType: "Colored Dot",
    },
  ],
  [
    "Jr -> Sr Off Rating Jump",
    {
      title: "How the Jr->Sr Off Rating changes vs the Jr Off Rtg",
      datasetFilter: `(prev_team == next_team) SORT_BY (next_off_rtg - prev_off_rtg)  DESC`,
      highlightFilter: `prev_roster.year_class == "Jr" AND next_roster.year_class == "Sr" `,
      xAxis: `prev_off_rtg  //LABEL Previous Season Off Rating`,
      yAxis: "next_off_rtg - prev_off_rtg //LABEL Off Rating Jump",
      dotColor: "next_off_rtg",
      dotSize: "Possession% (off)",
      dotColorMap: "Off Rtg",
      labelStrategy: "Top/Bottom 10",
      pointMarkerType: "Colored Dot",
    },
  ],
  [
    "Super Senior Offense",
    {
      title: "Super Senior Off Rtg/Usage, ranked by offensive RAPM production",
      datasetFilter: `ALL SORT_BY next_off_adj_rapm* next_off_team_poss_pct DESC`,
      highlightFilter: `prev_roster.year_class == "Sr"`,
      xAxis: `next_off_rtg //LABEL Off Rating //LIMITS auto,135`,
      yAxis: "next_off_usage*100 //LABEL Usage%",
      dotColor: "next_off_adj_rapm*next_off_team_poss_pct",
      dotSize: "Possession% (off)",
      dotColorMap: "oRAPM",
      labelStrategy: "Top 25",
      pointMarkerType: "Colored Dot",
    },
  ],
] as Array<[string, PlayerSeasonComparisonParams]>;

/** Currently only since PortalPalooza kicked off in earnest (need to keep up to date with PlayerSeasonComparison) */
const supportedYears = DateUtils.coreYears.filter((y) => y >= "2021/22");
export const multiYearScenarios = {
  "2021+": supportedYears,
} as Record<string, string[]>;

const PlayerSeasonComparisonChart: React.FunctionComponent<Props> = ({
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
  const [lboardParams, setLboardParams] = useState(
    startingState as PlayerLeaderboardParams
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

  const [gender, setGender] = useState("Men"); // TODO ignore input just take Men

  const [queryFilters, setQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const [tmpQueryFilters, setTmpQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const separatorKeyword = "BREAK"; //(not used but leave the logic in here in case we change our mind later)

  //TODO: make this generic, it's used in 3 places
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

  const [title, setTitle] = useState(startingState.title || "");

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

  const [incLowVol, setIncLowVol] = useState<boolean>(
    startingState.incLowVol || false
  );

  // All the complex config:

  // If there's a title show that, otherwise show the config
  const [showConfigOptions, setShowConfigOptions] = useState<boolean>(
    startingState.showConfig || !startingState.title
  );

  // If there's a title show that, otherwise show the config
  const [showTable, setShowTable] = useState<boolean>(
    startingState.showTable || false
  );

  // Whether to show prev and next seasons for each player
  const [showPrevNextInTable, setShowPrevNextInTable] = useState<boolean>(
    startingState.showPrevNextInTable || false
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
  const datasetFilterPresets = [
    ["All players", "ALL"],
    [
      "Transfers",
      "(prev_team != next_team) AND prev_team SORT_BY next_adj_rapm_margin DESC",
    ],
    [
      "Ranked Freshmen",
      `!prev_team AND next_roster.year_class == "Fr" SORT_BY next_adj_rapm_margin DESC`,
    ],
    [
      "Freshmen -> Sophomores",
      `prev_roster.year_class == "Fr" AND next_roster.year_class == "So" SORT_BY next_adj_rapm_margin DESC`,
    ],
    [
      "Sophomores -> Juniors",
      `prev_roster.year_class == "So" AND next_roster.year_class == "Jr" SORT_BY next_adj_rapm_margin DESC`,
    ],
    [
      "Juniors -> Seniors",
      `prev_roster.year_class == "Jr" AND next_roster.year_class == "Sr" SORT_BY next_adj_rapm_margin DESC`,
    ],
    [
      "Seniors -> Super-Seniors",
      `prev_roster.year_class == "Sr" SORT_BY next_adj_rapm_margin DESC`,
    ],
    [
      "Rotation+ caliber previous year",
      `prev_adj_rapm_margin >= 2 SORT_BY next_adj_rapm_margin DESC`,
    ],
    [
      "Starter+ caliber previous year",
      `prev_adj_rapm_margin >= 3.5 SORT_BY next_adj_rapm_margin DESC`,
    ],
  ] as Array<[string, string]>;

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
  const axisPresets = [
    [
      "Off RAPM: actual - predicted",
      "next_off_adj_rapm  - pred_ok_off_adj_rapm",
    ],
    [
      "Def RAPM: actual - predicted",
      "pred_ok_def_adj_rapm - next_def_adj_rapm",
    ],
    ["Off RAPM (prev)", "prev_off_adj_rapm"],
    ["Off RAPM", "next_off_adj_rapm"],
    ["Off RAPM Production (prev)", "prev_off_adj_rapm*prev_off_team_poss_pct"],
    ["Off RAPM Production", "next_off_adj_rapm*next_off_team_poss_pct"],
    ["Def RAPM (prev)", "prev_def_adj_rapm"],
    ["Def RAPM", "next_def_adj_rapm"],
    ["Def RAPM Production (prev)", "prev_def_adj_rapm*prev_def_team_poss_pct"],
    ["Def RAPM Production", "next_def_adj_rapm*next_def_team_poss_pct"],
    ["Off Rtg (prev)", "prev_off_rtg"],
    ["Off Rtg", "next_off_rtg"],
    ["Usage (prev)", "prev_off_usage"],
    ["Usage", "next_off_usage"],
    ["RAPM margin (prev)", "prev_adj_rapm_margin"],
    ["RAPM margin", "next_adj_rapm_margin"],
    ["RAPM production (prev)", "prev_adj_rapm_margin*prev_off_team_poss_pct"],
    ["RAPM production", "next_adj_rapm_margin*next_off_team_poss_pct"],
    ["Min/game (prev)", "40*prev_off_team_poss_pct"],
    ["Min/game", "40*next_off_team_poss_pct"],
    ["Possession% (off, prev)", "prev_off_team_poss_pct"],
    ["Possession% (off)", "next_off_team_poss_pct"],
  ] as Array<[string, string]>;
  const [dotColorMap, setDotColorMap] = useState(
    startingState.dotColorMap || "Default"
  );
  const colorMapOptions = CbbColors.colorMapOptions(resolvedTheme);

  const [labelStrategy, setLabelStrategy] = useState(
    startingState.labelStrategy || "None"
  );

  const [pointMarkerType, setPointMarkerType] = useState(
    startingState.pointMarkerType || "Colored Dot"
  );

  // On page load, if title is specified and the other params aren't then pre-load
  const applyPresetChart = (preset: PlayerSeasonComparisonParams) => {
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
      setPointMarkerType(preset.pointMarkerType || "Colored Dot");
    }, preset.title != title);
  };
  // Load presets on page startup
  useEffect(() => {
    if (title && !xAxis && !yAxis) {
      const maybePreset = _.find(
        overallPlayerChartPresets,
        (kv) => kv[0] == title || kv[1]?.title == title
      );
      if (maybePreset) applyPresetChart(maybePreset[1]);
    }
  }, []);

  /** When the params change */
  useEffect(() => {
    onChangeState({
      ...lboardParams,
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
      pointMarkerType: pointMarkerType,
      toggledEntities: _.keys(toggledEntities).join(";"),
      showTable: showTable,
      showPrevNextInTable: showPrevNextInTable,
      showOnlyHandSelectedInTable: showOnlyHandSelectedInTable,
      incLowVol,
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
    pointMarkerType,
    lboardParams,
    toggledEntities,
    showPrevNextInTable,
    showOnlyHandSelectedInTable,
    showTable,
    incLowVol,
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
  const extractBubbleAttr = (fieldDef: string) => {
    const typeAndField = fieldDef.split(":");
    const fieldType =
      typeAndField.length > 1 ? typeAndField[0] : "actualResults";
    const field = typeAndField.length > 1 ? typeAndField[1] : typeAndField[0];

    const fieldExtractor = fieldValExtractor(field);
    return (p: GoodBadOkTriple) => {
      const tripleAsMap = p as unknown as Record<
        string,
        Record<string, Statistic>
      >;
      if (fieldType == "delta") {
        return fieldExtractor(p.actualResults) - fieldExtractor(p.ok);
      } else if (fieldType == "deltaHistory") {
        return fieldExtractor(p.actualResults) - fieldExtractor(p.orig);
      } else {
        return fieldExtractor(tripleAsMap[fieldType]);
      }
    };
  };
  const bOrW = (f: number) => {
    return `${Math.abs(f).toFixed(1)} ${
      f > 0 ? "better" : "worse"
    } than expected`;
  };
  const genericExtraInfo = (field: string, factor: number = 1.0) => {
    const has = (target: string) => {
      return _.find(
        [xAxis, yAxis, dotColor, dotSize],
        (axis) => axis.indexOf(target) >= 0
      );
    };
    const prevSeasonExtractor = extractBubbleAttr(`orig:${field}`);
    const predictedSeasonExtractor = extractBubbleAttr(`ok:${field}`);
    const predDeltaExtractor = extractBubbleAttr(`delta:${field}`);
    const isFrPredictedField =
      _.endsWith(field, "adj_rapm") || _.endsWith(field, "off_team_poss_pct");
    const careAboutOffPrediction =
      has(`next_off_adj_rapm`) && has(`pred_ok_off_adj_rapm`);
    const careAboutDefPrediction =
      has(`next_def_adj_rapm`) && has(`pred_ok_def_adj_rapm`);
    const offOrDefRapmSpecialCase = // user cares about predicted vs actual delta specifically
      (_.startsWith(field, "off_") && careAboutOffPrediction) ||
      (_.startsWith(field, "def_") && careAboutDefPrediction);
    const rapmMarginSpecialCase = // user cares about predicted vs actual delta for both off and def
      field == "adj_rapm" && careAboutOffPrediction && careAboutDefPrediction;
    const rapmSpecialCase = offOrDefRapmSpecialCase || rapmMarginSpecialCase;

    return (data: any) => {
      const triple = data.p;
      const isFreshman = !triple.orig.off_rtg; //(filters out take Fr "prev" stats)
      if (
        (rapmSpecialCase && !isFreshman) ||
        has(`next_${field} - pred_ok_${field}`)
      ) {
        //(special case)
        return <i>({bOrW(factor * predDeltaExtractor(triple))})</i>;
      } else {
        const isRapmMargin = field == "adj_rapm";
        const hasPrev = isRapmMargin || (triple.orig[field] && !isFreshman);
        const hasPred =
          isRapmMargin ||
          (triple.ok[field] && (!isFreshman || isFrPredictedField));
        const shortForm = hasPrev && hasPrev;
        const prev = hasPrev ? (
          <i>
            {shortForm ? "Prev." : "Previous"} [
            {(factor * prevSeasonExtractor(triple)).toFixed(1)}]
          </i>
        ) : undefined;
        const pred = hasPred ? (
          <i>
            {shortForm ? "Pred." : "Predicted"} [
            {(factor * predictedSeasonExtractor(triple)).toFixed(1)}]
          </i>
        ) : undefined;

        return prev || pred ? (
          <span>
            {prev}
            {prev && pred ? <i> / </i> : undefined}
            {pred}
          </span>
        ) : undefined;
      }
    };
  };
  const netRapmExtraInfoExtractor = genericExtraInfo("adj_rapm"); //(special case handled in the fieldExtractor)
  const getNetRapmExtraInfo = (data: any) => netRapmExtraInfoExtractor(data);

  const offRapmExtraInfoExtractor = genericExtraInfo("off_adj_rapm");
  const getOffRapmExtraInfo = (data: any) => offRapmExtraInfoExtractor(data);

  const defRapmExtraInfoExtractor = genericExtraInfo("def_adj_rapm");
  const getDefRapmExtraInfo = (data: any) => defRapmExtraInfoExtractor(data);

  const offRtgExtraInfoExtractor = genericExtraInfo("off_rtg");
  const getOffRtgExtraInfo = (data: any) => offRtgExtraInfoExtractor(data);

  const offUsgExtraInfoExtractor = genericExtraInfo("off_usage", 100);
  const getUsgExtraInfo = (data: any) => offUsgExtraInfoExtractor(data);

  const mpgExtraInfoExtractor = genericExtraInfo("off_team_poss_pct", 40);
  const getMpgExtraInfo = (data: any) => mpgExtraInfoExtractor(data);

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

      const triple = data.p;
      const roster = triple.actualResults?.roster || triple.orig?.roster;
      const maybePrevSchool =
        data?.p?.orig.team &&
        data?.p?.orig.team != data?.p?.actualResults.team ? (
          <i>(Previous school: {data?.p?.orig.team})</i>
        ) : undefined;

      // these 2 can be null:
      const offRtgExtraInfo = getOffRtgExtraInfo(data);
      const usageExtraInfo = getUsgExtraInfo(data);

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
              <b>
                {`${triple.actualResults?.key}`}
                <br />
                {`${triple.actualResults?.team}`}
              </b>{" "}
              (<i>{ConferenceToNickname[triple.actualResults.conf] || "??"}</i>)
              <br />
              <i>
                {`${triple.actualResults?.posClass}`}
                {` ${roster?.height || "?-?"}`}
                {` ${roster?.year_class || ""}`}
              </i>
            </p>
            <p className="desc">
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
              <span>{getNetRapmExtraInfo(data)}</span>
              <br />
              <span>
                Off RAPM:{" "}
                <b>
                  {fieldValExtractor("off_adj_rapm")(
                    data?.p?.actualResults
                  ).toFixed(1)}
                </b>{" "}
                pts/100
              </span>
              <br />
              <span>{getOffRapmExtraInfo(data)}</span>
              <br />
              <span>
                Def RAPM:{" "}
                <b>
                  {fieldValExtractor("def_adj_rapm")(
                    data?.p?.actualResults
                  ).toFixed(1)}
                </b>{" "}
                pts/100
              </span>
              <br />
              <span>{getDefRapmExtraInfo(data)}</span>
              <br />
              <span>
                Off Rtg:{" "}
                <b>
                  {fieldValExtractor("off_rtg")(data?.p?.actualResults).toFixed(
                    1
                  )}
                </b>
              </span>
              <br />
              {offRtgExtraInfo ? <span>{offRtgExtraInfo}</span> : undefined}
              {offRtgExtraInfo ? <br /> : undefined}
              <span>
                Usage:{" "}
                <b>
                  {(
                    fieldValExtractor("off_usage")(data?.p?.actualResults) * 100
                  ).toFixed(1)}
                </b>
                %
              </span>
              <br />
              {usageExtraInfo ? <span>{usageExtraInfo}</span> : undefined}
              {usageExtraInfo ? <br /> : undefined}
              <span>
                Mpg:{" "}
                <b>
                  {(
                    fieldValExtractor("off_team_poss_pct")(
                      data?.p?.actualResults
                    ) * 40
                  ).toFixed(1)}
                </b>
              </span>
              <br />
              <span>{getMpgExtraInfo(data)}</span>
              <br />
              <br />
              <span>{maybePrevSchool}</span>
            </p>
          </small>
        </div>
      );
    }
    return null;
  };
  // (end chart tooltip)

  const [chart, playerLeaderboard] = React.useMemo(() => {
    if (_.isEmpty(dataEvent)) {
      // If we don't have players we're not done loading yet, so put up a loading screen:
      return [<div style={{ height: "200px" }}></div>, <div></div>];
    } else {
      setLoadingOverride(false);
    }

    //TODO Some ideas here:
    // 1] For un-ranked Fr give them 2*/3*/3*+ expectations (ie if actualResults exists but no orig)
    // 2] Allow a 23/24 season just showing the predictions
    // 4] (here and in PlayerLeaderboardTable, always enrich currently with transfer info once it exists)
    // 5] Copy to clipboard

    // Team stats generation business logic:

    const yearsToProcess = multiYearScenarios[year] || [year];

    const { teamRanks } = _.chain(yearsToProcess)
      .filter((y) => !_.isNil(dataEvent[y]))
      .transform(
        (acc, thisYear) => {
          const yearWithStats = DateUtils.getPrevYear(thisYear);

          // The avgEff based on which the stats were calc'd (yearWithStats) and what actually happened (year)
          const avgEff =
            efficiencyAverages[`${gender}_${yearWithStats}`] ||
            efficiencyAverages.fallback;
          const actualResultsAvgEff =
            efficiencyAverages[`${gender}_${year}`] ||
            efficiencyAverages.fallback;

          const {
            derivedDivisionStats,
            teamRanks: teamRanksPerYear,
            numTeams,
            netEffToRankMap,
            actualNetEffToRankMap,
            offEffToRankMap,
            defEffToRankMap,
          } = OffseasonLeaderboardUtils.buildAllTeamStats(
            dataEvent[thisYear],
            {
              confs,
              year: thisYear,
              gender,
              sortBy: "",
              evalMode: true,
              diagnosticCompareWithRosters: false,
            },
            {},
            {},
            avgEff,
            actualResultsAvgEff,
            true
          );
          acc.teamRanks = acc.teamRanks.concat(teamRanksPerYear);
        },
        { teamRanks: [] as OffseasonTeamInfo[] }
      )
      .value();

    const dataToFilter = _.flatMap(teamRanks, (t) => {
      // Inject transfers from this season
      const offseasonYear = DateUtils.getNextYear(t.year);
      const offseasonTransfers = dataEvent[offseasonYear]?.transfers?.[0];
      const chain = _.chain(t.players).filter(
        (p) => !_.isNil(p?.actualResults)
      );
      return (
        offseasonTransfers
          ? chain.map((p) => {
              const actualResults = p?.actualResults;
              if (actualResults) {
                const maybeTransfers =
                  offseasonTransfers[actualResults.code || "???"] || [];
                const maybeTransfer = _.find(
                  maybeTransfers,
                  (txfer) => txfer.f == actualResults.team
                );
                if (maybeTransfer) {
                  (actualResults as any).transfer_src = actualResults.team;
                  (actualResults as any).transfer_dest = maybeTransfer.t;
                }
                return p;
              }
            })
          : chain
      ).value();
    });
    const handlePlayerToggle = (playerKey: string) => {
      friendlyChange(
        () => {
          if (playerKey === "") {
            // Clear all selections
            settoggledEntities({});
          } else if (toggledEntities[playerKey]) {
            settoggledEntities(_.omit(toggledEntities, [playerKey]));
          } else {
            settoggledEntities({
              ...toggledEntities,
              [playerKey]: true,
            });
          }
        },
        true,
        250
      ); //(i experimented with making this shorter but it tended not to appear a bit too often)
    };

    // Apply filtering to the data
    const [filteredData, tmpAdvancedFilterError] = datasetFilterStr
      ? AdvancedFilterUtils.applyPlayerFilter(
          dataToFilter,
          datasetFilterStr,
          (year: string) => undefined, //(player rank queries not yet supported)
          (year: string) => undefined, //(team rank queries not yet supported)
          {
            x: decompAxis(xAxis).linq,
            y: decompAxis(yAxis).linq,
            z: dotSize,
            color: dotColor,
          },
          true
        )
      : [[], undefined];
    setAdvancedFilterError(tmpAdvancedFilterError);

    const [highlightData, tmpHighlightFilterError] = highlightFilterStr
      ? AdvancedFilterUtils.applyPlayerFilter(
          filteredData,
          highlightFilterStr,
          (year: string) => undefined, //(player rank queries not yet supported)
          (year: string) => undefined, //(team rank queries not yet supported)
          {},
          true
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

    const confFilter = (p: any) => {
      return (
        confSet?.has(p.actualResults?.conf || "???") ||
        false ||
        (hasCustomFilter &&
          (queryFilters || "").indexOf(`${p.actualResults?.team || ""};`) >= 0)
      );
    };

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
        pointMarkerType={pointMarkerType}
        labelBuilder={(p) => p.actualResults?.code || "Unknown player"}
        confFilter={
          _.isEmpty(confs) && !hasCustomFilter ? undefined : confFilter
        }
        axisPresets={axisPresets}
        colorMapOptions={colorMapOptions}
        contrastForegroundBuilder={contrastForegroundBuilder}
        screenHeight={screenHeight}
        screenWidth={screenWidth}
        height={height}
        toggledEntities={toggledEntities}
        onEntityToggle={handlePlayerToggle}
        entityType="player"
        incWeightedSummary={true}
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
              return _.isEmpty(confs) && !hasCustomFilter ? true : confFilter;
            })
            .value();

    const playerLeaderboardToReturn = (
      <PlayerLeaderboardTable
        startingState={{
          ...startingState,
          includePrevYear: showPrevNextInTable,
          sortBy: dataIsAlreadySorted ? "unsorted" : undefined, //(default if not sorted already)
          year: multiYearScenarios[year] ? DateUtils.AllYears : year,
          tier: "All",
          minPoss: incLowVol ? "0" : undefined,
        }}
        dataEvent={{
          players: (subChartData || filteredData)
            .map((p) => {
              if (showPrevNextInTable && p.actualResults && p.orig) {
                p.actualResults.prevYear = p.orig;
              }
              return p.actualResults;
            })
            .filter((p) => {
              return _.isEmpty(toggledEntities) || !showOnlyHandSelectedInTable
                ? true
                : toggledEntities[p?.code || "??"];
            }),
          confs: _.chain(dataEvent)
            .values()
            .flatMap((d) => d.confs || [])
            .uniq()
            .value(),
          //(don't need confMap because the conference selector isn't shown, it's just inherited)
          error: _.chain(dataEvent)
            .values()
            .flatMap((d) => (d.error ? [d.error] : []))
            .value()
            .join("/"),
          transfers: undefined, //(we've already injected transfer_src and transfer_dest where possible)
          syntheticData: true,
        }}
        onChangeState={(newParams: PlayerLeaderboardParams) => {
          setLboardParams(newParams);
        }}
      />
    );

    return [chartToReturn, playerLeaderboardToReturn];
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
    pointMarkerType,
    screenHeight,
    screenWidth,
    toggledEntities,
    showPrevNextInTable,
    showOnlyHandSelectedInTable,
    resolvedTheme,
  ]);

  // 3] View

  // Advanced filter text

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      loadingOverride ||
      _.chain(dataEvent)
        .map((d) => _.size(d.players || []))
        .sum()
        .value() == 0
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

  const handlePointMarkerTypeChange = (type: string) => {
    friendlyChange(() => {
      setPointMarkerType(type);
    }, type != pointMarkerType);
  };

  return (
    <>
      <Container className="medium_screen">
        <Form.Row>
          <Col xs={6} sm={6} md={3} lg={2} style={{ zIndex: 12 }}>
            <ThemedSelect
              isDisabled={true}
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
              value={stringToOption(year)}
              options={supportedYears
                .concat(_.keys(multiYearScenarios))
                .map(stringToOption)}
              isSearchable={false}
              onChange={(option: any) => {
                const maybeYear = (option as any)?.value;
                if (maybeYear) {
                  friendlyChange(() => setYear(maybeYear), maybeYear != year);
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
              confs={_.chain(dataEvent)
                .values()
                .flatMap((d) => d.confs || [])
                .uniq()
                .value()}
              onChangeConf={(confStr) =>
                friendlyChange(() => {
                  setConfs(confStr);
                  setTmpQueryFilters("");
                  setQueryFilters("");
                }, confs != confStr)
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
          <Form.Row className="mb-2">
            <Col xs={12} sm={12} md={8} lg={8}>
              <InputGroup>
                <InputGroup.Prepend>
                  <InputGroup.Text id="filter">Filter:</InputGroup.Text>
                </InputGroup.Prepend>
                <div className="flex-fill">
                  <TeamFilterAutoSuggestText
                    readOnly={false}
                    placeholder={`;-separated list of teams"`}
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
          </Form.Row>
        ) : null}
      </Container>
      <ChartConfigContainer
        title={title}
        onTitleChange={setTitle}
        chartPresets={overallPlayerChartPresets}
        onApplyPreset={applyPresetChart}
        onClearPreset={() => {
          applyPresetChart({});
        }}
        showConfigOptions={showConfigOptions}
        filterValue={datasetFilterStr}
        filterError={datasetFilterError}
        filterPlaceholder="Enter Linq: remove non-matching players (see presets for ideas - just type 'ALL' to get all players)"
        filterPresets={datasetFilterPresets}
        onFilterChange={handleFilterChange}
        highlightValue={highlightFilterStr}
        highlightError={highlightFilterError}
        highlightPlaceholder="Enter Linq: non-matching players from 'Filter' are faded into the background"
        highlightPresets={datasetFilterPresets}
        onHighlightChange={handleHighlightChange}
        labelStrategy={labelStrategy}
        onLabelStrategyChange={handleLabelStrategyChange}
        pointMarkerType={pointMarkerType}
        onPointMarkerTypeChange={handlePointMarkerTypeChange}
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
                text={"Loading Player Comparison Chart..."}
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
              title="Player Stats"
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
                      id="showPrevNextInTable"
                      checked={showPrevNextInTable}
                      onChange={() => {
                        friendlyChange(
                          () => setShowPrevNextInTable(!showPrevNextInTable),
                          true
                        );
                      }}
                      label="Show Both Years' Stats"
                    />
                  </Form.Group>
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
                <Row>{playerLeaderboard}</Row>
              </Container>
            </GenericCollapsibleCard>
          </Col>
        </Row>
      </Container>
    </>
  );
};
export default PlayerSeasonComparisonChart;
