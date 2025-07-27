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

type Props = {
  startingState: PlayerSeasonComparisonParams;
  dataEvent: Record<string, TeamEditorStatsModel>;
  onChangeState: (newParams: PlayerSeasonComparisonParams) => void;
};

type AxisDecomposition = {
  linq: string;
  label?: string;
  limits?: [string | number, string | number];
  ticks?: (string | number)[];
};
const extraAxisDecompKeywords = ["//LABEL", "//LIMITS", "//TICKS"];
const decompAxis = (axis: string): AxisDecomposition => {
  const decomp = axis.split("//");
  const postAxis = _.drop(decomp, 1);
  return {
    linq: decomp[0],
    label: _.filter(postAxis, (l) => _.startsWith(l, "LABEL ")).map((l) =>
      _.trim(l.substring(6))
    )[0],
    limits: _.filter(postAxis, (l) => _.startsWith(l, "LIMITS ")).map(
      (l) =>
        _.trim(l.substring(7))
          .split(",")
          .map((numOrStr) => {
            const maybeNum = parseFloat(numOrStr);
            return isNaN(maybeNum) ? numOrStr : maybeNum;
          }) as [string | number, string | number]
    )[0],
    ticks: _.filter(postAxis, (l) => _.startsWith(l, "TICKS ")).map((l) =>
      _.trim(l.substring(6))
        .split(",")
        .map((numOrStr) => {
          const maybeNum = parseFloat(numOrStr);
          return isNaN(maybeNum) ? numOrStr : maybeNum;
        })
    )[0],
  };
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

  const [title, setTitle] = useState(startingState.title || "");

  // Chart magic:

  const [toggledPlayers, setToggledPlayers] = useState<Record<string, boolean>>(
    startingState.toggledPlayers
      ? _.chain(startingState.toggledPlayers.split(";"))
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

  const [linqExpressionSync, setLinqExpressionSync] = useState<number>(0);

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
    startingState.dotColorMap || "Black"
  );
  const colorMapOptions = {
    Black: undefined,
    "Red/Green Auto": CbbColors.percentile_redBlackGreen,
    "Green/Red Auto": CbbColors.percentile_greenBlackRed,
    "Blue/Orange Auto": CbbColors.percentile_blueBlackOrange,
    "Off Rtg": CbbColors.off_pp100_redBlackGreen,
    "Def Rtg": CbbColors.def_pp100_redBlackGreen,
    RAPM: CbbColors.off_diff10_p100_redBlackGreen,
    oRAPM: CbbColors.off_diff10_p100_redBlackGreen,
    dRAPM: CbbColors.def_diff10_p100_redBlackGreen,
    "Adj oRtg+": CbbColors.off_diff10_p100_redBlackGreen,
    "Adj dRtg+": CbbColors.def_diff10_p100_redBlackGreen,
    Usage: CbbColors.usg_offDef_blueBlackOrange,
    "Red/Green -10:+10": CbbColors.off_diff10_p100_redBlackGreen,
    "Green/Red -10:+10": CbbColors.def_diff10_p100_redBlackGreen,
    "Red/Green 80:120": CbbColors.off_pp100_redBlackGreen,
    "Green/Red 80:120": CbbColors.def_pp100_redBlackGreen,
    "Blue/Orange 10%:30%": CbbColors.usg_offDef_blueBlackOrange,
    "Red/Green %ile": CbbColors.percentile_redBlackGreen,
    "Green/Red %ile": CbbColors.percentile_greenBlackRed,
    "Blue/Orange %ile": CbbColors.percentile_blueBlackOrange,
  } as Record<string, undefined | ((val: number) => string)>;

  const [labelStrategy, setLabelStrategy] = useState(
    startingState.labelStrategy || "None"
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
      setDotColorMap(preset.dotColorMap || "Black");
      setLabelStrategy(preset.labelStrategy || "None");
    }, true);
  };
  useEffect(() => {
    if (title && !xAxis && !yAxis) {
      const maybePreset = _.find(
        overallPlayerChartPresets,
        (kv) => kv[0] == title
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
      toggledPlayers: _.keys(toggledPlayers).join(";"),
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
    lboardParams,
    toggledPlayers,
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
            background: "rgba(255, 255, 255, 0.9)",
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
      return [<div></div>, <div></div>];
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

    const extractTitle = (fieldDef: string) => {
      const decomp = decompAxis(fieldDef);
      return (
        decomp.label ||
        axisPresets.find((kv) => kv[1] == decomp.linq)?.[0] ||
        decomp.linq
      );
    };

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
    const [filteredData, tmpAvancedFilterError] = datasetFilterStr
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
    setAdvancedFilterError(tmpAvancedFilterError);

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

    //TODO:
    // some of the entries seem like nonsense when displaying the JSON in applyFilter, plus entry far left is
    // undefined, wut

    const subChart =
      _.isEmpty(confs) && !highlightData
        ? undefined
        : _.chain(highlightData || filteredData)
            // .map((p, ii) => {
            //    //Debug:
            //    if (ii < 100) {
            //       console.log(`??? ${JSON.stringify(p)}`);
            //       // console.log(`??? ${p.orig.roster?.year_class} - ${fieldValExtractor("adj_rapm")(p.orig)}`);
            //       // console.log(`??? CONF = ${p.actualResults?.conf} TEAM=${p.actualResults?.team}`);
            //    }
            //    return p;
            // })
            .filter((p) => {
              return _.isEmpty(confs)
                ? true
                : confSet?.has(p.actualResults?.conf || "???") ||
                    false ||
                    (hasCustomFilter &&
                      (queryFilters || "").indexOf(
                        `${p.actualResults?.team || ""};`
                      ) >= 0);
            })
            .map((p) => {
              return {
                x: p.x,
                y: p.y,
                z: p.z,
                label: p.actualResults?.code || "Unknown player",
                showTooltips: true,
                p: p,
              };
            })
            .value();

    var minColor = Number.MAX_SAFE_INTEGER;
    var maxColor = -Number.MAX_SAFE_INTEGER;
    const mainChart = _.chain(filteredData)
      .map((p) => {
        if ((p.color || 0) < minColor) minColor = p.color || 0;
        if ((p.color || 0) > maxColor) maxColor = p.color || 0;
        return {
          x: p.x,
          y: p.y,
          z: p.z,
          label: p.actualResults?.code || "Unknown player",
          showTooltips: subChart == undefined,
          p: p,
        };
      })
      .value();

    // Labelling logic
    const [maxLabels, topAndBottom]: [number, boolean] = _.thru(
      labelStrategy,
      () => {
        if (labelStrategy == "None") return [0, true];
        else {
          return [
            parseInt(labelStrategy.replace(/^[^0-9]*([0-9]+)$/, "$1")),
            labelStrategy.indexOf("Bottom") >= 0,
          ];
        }
      }
    );

    //TODO: move this below calc of mutable state and then allow "outlier option" for labelling
    const chartToUseForLabels = subChart || mainChart;
    const dataPointsToLabelPhase1 =
      maxLabels > 0
        ? (_.thru(topAndBottom, () => {
            if (topAndBottom) {
              if (2 * maxLabels > _.size(chartToUseForLabels)) {
                return chartToUseForLabels;
              } else {
                return _.take(chartToUseForLabels, maxLabels).concat(
                  _.takeRight(chartToUseForLabels, maxLabels)
                );
              }
            } else {
              return _.take(chartToUseForLabels, maxLabels);
            }
          }) as any[])
        : undefined;

    const dataPointsToLabel = _.isEmpty(toggledPlayers)
      ? dataPointsToLabelPhase1
      : (dataPointsToLabelPhase1 || []).concat(
          mainChart.filter(
            (p) => toggledPlayers[p.p.actualResults?.code || "??"]
          )
        );

    // (Some util logic associated with building averages and limits)
    const mutAvgState = {
      avgX: 0,
      avgY: 0,
      weightAvgX: 0,
      weightAvgY: 0,
      varX: 0,
      varY: 0,
      weightVarX: 0,
      weightVarY: 0,
      avgCount: 0,
      avgWeightX: 0,
      avgWeightY: 0,
    };
    const xHasNext = xAxis.indexOf("next_") >= 0;
    const yHasNext = yAxis.indexOf("next_") >= 0;
    const updateAvgState = (p: any) => {
      mutAvgState.avgX += p.x || 0;
      mutAvgState.avgY += p.y || 0;
      mutAvgState.varX += (p.x || 0) * (p.x || 0);
      mutAvgState.varY += (p.y || 0) * (p.y || 0);
      const weightX = xHasNext
        ? p.p?.actualResults?.off_team_poss_pct?.value || 0
        : p.p?.orig?.off_team_poss_pct?.value || 0;
      const weightY = yHasNext
        ? p.p?.actualResults?.off_team_poss_pct?.value || 0
        : p.p?.orig?.off_team_poss_pct?.value || 0;
      mutAvgState.weightAvgX += (p.x || 0) * weightX;
      mutAvgState.weightAvgY += (p.y || 0) * weightY;
      mutAvgState.weightVarX += (p.x || 0) * (p.x || 0) * weightX;
      mutAvgState.weightVarY += (p.y || 0) * (p.y || 0) * weightY;
      mutAvgState.avgWeightX += weightX;
      mutAvgState.avgWeightY += weightY;
      mutAvgState.avgCount += 1;
    };
    const completeAvgState = () => {
      mutAvgState.avgX = mutAvgState.avgX / (mutAvgState.avgCount || 1);
      mutAvgState.avgY = mutAvgState.avgY / (mutAvgState.avgCount || 1);
      const avgX2 = mutAvgState.varX / (mutAvgState.avgCount || 1);
      const avgY2 = mutAvgState.varY / (mutAvgState.avgCount || 1);
      mutAvgState.varX = Math.sqrt(
        Math.abs(avgX2 - mutAvgState.avgX * mutAvgState.avgX)
      );
      mutAvgState.varY = Math.sqrt(
        Math.abs(avgY2 - mutAvgState.avgY * mutAvgState.avgY)
      );
      const avgWeightX2 =
        mutAvgState.weightVarX / (mutAvgState.avgWeightX || 1);
      const avgWeightY2 =
        mutAvgState.weightVarY / (mutAvgState.avgWeightY || 1);
      mutAvgState.weightAvgX =
        mutAvgState.weightAvgX / (mutAvgState.avgWeightX || 1);
      mutAvgState.weightAvgY =
        mutAvgState.weightAvgY / (mutAvgState.avgWeightY || 1);
      mutAvgState.weightVarX = Math.sqrt(
        Math.abs(avgWeightX2 - mutAvgState.weightAvgX * mutAvgState.weightAvgX)
      );
      mutAvgState.weightVarY = Math.sqrt(
        Math.abs(avgWeightY2 - mutAvgState.weightAvgY * mutAvgState.weightAvgY)
      );
    };
    if (subChart) {
      subChart.forEach((el) => updateAvgState(el));
    } else {
      mainChart.forEach((el) => updateAvgState(el));
    }
    //TODO: if the axis are the same except for next/prev then force the domains to be the same
    completeAvgState();
    const renderAvgState = () => {
      return (
        <div>
          Average: [({mutAvgState.avgX.toFixed(2)},{" "}
          {mutAvgState.avgY.toFixed(2)})]&nbsp; (std: [
          {mutAvgState.varX.toFixed(2)}], [{mutAvgState.varY.toFixed(2)}])
          //&nbsp; Weighted: [({mutAvgState.weightAvgX.toFixed(2)},{" "}
          {mutAvgState.weightAvgY.toFixed(2)})]&nbsp; (std: [
          {mutAvgState.weightVarX.toFixed(2)}], [
          {mutAvgState.weightVarY.toFixed(2)}]) //&nbsp; sample count=[
          {mutAvgState.avgCount}]
        </div>
      );
    };
    //(end averages and limits)

    const colorMapPicker =
      colorMapOptions[dotColorMap] || CbbColors.alwaysDarkGrey;
    const isAutoColorMap = dotColorMap.indexOf("Auto") >= 0;
    const deltaColorInv = 1 / (maxColor - minColor || 1);
    const colorMapTransformer = (n: number) => {
      if (isAutoColorMap) {
        return (n - minColor) * deltaColorInv;
      } else return n;
    };

    const handlePlayerToggle = (playerKey: string) => {
      friendlyChange(
        () => {
          globalScatterChartRef.current.handleItemMouseLeave();
          if (toggledPlayers[playerKey]) {
            setToggledPlayers(_.omit(toggledPlayers, [playerKey]));
          } else {
            setToggledPlayers({
              ...toggledPlayers,
              [playerKey]: true,
            });
          }
        },
        true,
        250
      ); //(i experimented with making this shorter but it tended not to appear a bit too often)
    };

    const labelState = ScatterChartUtils.buildEmptyLabelState();
    const xAxisDecom = decompAxis(xAxis);
    const yAxisDecom = decompAxis(yAxis);
    const chartToReturn = (
      <div>
        <ResponsiveContainer width={"100%"} height={0.75 * height}>
          <ScatterChart
            onMouseLeave={() =>
              globalScatterChartRef.current.handleItemMouseLeave()
            }
            ref={globalScatterChartRef}
          >
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="x"
              ticks={xAxisDecom.ticks}
              domain={xAxisDecom.limits || ["auto", "auto"]}
              allowDataOverflow={!_.isNil(xAxisDecom.limits)}
            >
              <Label
                value={extractTitle(xAxis)}
                position="top"
                style={{ textAnchor: "middle" }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              ticks={yAxisDecom.ticks}
              domain={yAxisDecom.limits || ["auto", "auto"]}
              allowDataOverflow={!_.isNil(yAxisDecom.limits)}
            >
              <Label
                angle={-90}
                value={extractTitle(yAxis)}
                position="insideLeft"
                style={{ textAnchor: "middle" }}
              />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[10, 100]} />
            <Scatter
              data={mainChart}
              fill="green"
              opacity={subChart ? 0.25 : 1.0}
            >
              {subChart
                ? undefined
                : ScatterChartUtils.buildLabelColliders("mainChart", {
                    maxHeight: screenHeight,
                    maxWidth: screenWidth,
                    mutableState: labelState,
                    dataKey: "label",
                    series: mainChart,
                  })}
              {mainChart.map((p, index) => {
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorMapPicker(colorMapTransformer(p.p.color))}
                    onClick={(e) => handlePlayerToggle(p.label)}
                  />
                );
              })}
              ;
            </Scatter>
            {subChart ? (
              <Scatter data={subChart} fill="green">
                {ScatterChartUtils.buildLabelColliders("subChart", {
                  maxHeight: screenHeight,
                  maxWidth: screenWidth,
                  mutableState: labelState,
                  dataKey: "label",
                  series: subChart,
                })}

                {subChart.map((p, index) => {
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={colorMapPicker(colorMapTransformer(p.p.color))}
                      onClick={(e) => handlePlayerToggle(p.label)}
                    />
                  );
                })}
              </Scatter>
            ) : null}
            ;
            {dataPointsToLabel ? (
              <Scatter data={dataPointsToLabel} fill="green">
                {ScatterChartUtils.buildTidiedLabelList({
                  maxHeight: screenHeight,
                  maxWidth: screenWidth,
                  mutableState: labelState,
                  dataKey: "label",
                  series: dataPointsToLabel,
                })}

                {dataPointsToLabel.map((p, index) => {
                  return <Cell key={`cell-${index}`} opacity={0} />;
                })}
              </Scatter>
            ) : null}
            ;
            {/* Repeat the label subset again, to ensure that the labels get rendered, see buildTidiedLabelList docs */}
            {dataPointsToLabel ? (
              <Scatter data={dataPointsToLabel} fill="green">
                {ScatterChartUtils.buildTidiedLabelList({
                  maxHeight: screenHeight,
                  maxWidth: screenWidth,
                  mutableState: labelState,
                  dataKey: "label",
                  series: dataPointsToLabel,
                  underlinedLabels: toggledPlayers,
                })}

                {dataPointsToLabel.map((p, index) => {
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={colorMapPicker(colorMapTransformer(p.p.color))}
                      onClick={(e) => handlePlayerToggle(p.label)}
                    />
                  );
                })}
              </Scatter>
            ) : null}
            ;
            <RechartTooltip
              content={<CustomTooltip />}
              wrapperStyle={{ opacity: "0.9", zIndex: 1000 }}
              allowEscapeViewBox={{ x: true, y: false }}
              itemSorter={(item: any) => item.value}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <i>
          <small>
            <p>
              {renderAvgState()}
              {_.isEmpty(toggledPlayers) ? null : (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    friendlyChange(() => setToggledPlayers({}), true);
                  }}
                >
                  [{_.size(toggledPlayers)}] player(s) manually selected. Click
                  to clear selection
                </a>
              )}
            </p>
          </small>
        </i>
      </div>
    );
    const dataIsAlreadySorted =
      datasetFilterStr.includes("SORT_BY") ||
      highlightFilterStr.includes("SORT_BY");
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
          players: (subChart || mainChart)
            .map((p) => {
              if (showPrevNextInTable && p.p.actualResults && p.p.orig) {
                p.p.actualResults.prevYear = p.p.orig;
              }
              return p.p.actualResults;
            })
            .filter((p) => {
              return _.isEmpty(toggledPlayers) || !showOnlyHandSelectedInTable
                ? true
                : toggledPlayers[p?.code || "??"];
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
    screenHeight,
    screenWidth,
    toggledPlayers,
    showPrevNextInTable,
    showOnlyHandSelectedInTable,
  ]);

  // 3] View

  // Advanced filter text

  const editingAdvFilterTooltip = (
    <Tooltip id="editingAdvFilterTooltip">
      Press enter to apply this Linq filter
    </Tooltip>
  );
  const doneAdvFilterTooltip = (
    <Tooltip id="doneAdvFilterTooltip">Filter successfully applied</Tooltip>
  );
  const errorAdvFilterTooltip = (
    <Tooltip id="errorAdvFilterTooltip">
      Malformed Linq query: [{datasetFilterError || ""}]
    </Tooltip>
  );
  const editingAdvFilterText = (
    <OverlayTrigger placement="auto" overlay={editingAdvFilterTooltip}>
      <div>...</div>
    </OverlayTrigger>
  );
  const doneAdvFilterText = datasetFilterError ? (
    <OverlayTrigger placement="auto" overlay={errorAdvFilterTooltip}>
      <FontAwesomeIcon icon={faExclamation} />
    </OverlayTrigger>
  ) : (
    <OverlayTrigger placement="auto" overlay={doneAdvFilterTooltip}>
      <FontAwesomeIcon icon={faCheck} />
    </OverlayTrigger>
  );

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

  const isoverallPlayerChartPresetselected = (
    preset: PlayerSeasonComparisonParams
  ) => {
    return (
      (datasetFilterPresets.find((t) => t[0] == preset.datasetFilter)?.[1] ||
        preset.datasetFilter ||
        "") == datasetFilterStr &&
      (datasetFilterPresets.find((t) => t[0] == preset.highlightFilter)?.[1] ||
        preset.highlightFilter ||
        "") == highlightFilterStr &&
      (axisPresets.find((t) => t[0] == preset.xAxis)?.[1] ||
        preset.xAxis ||
        "") == xAxis &&
      (axisPresets.find((t) => t[0] == preset.yAxis)?.[1] ||
        preset.yAxis ||
        "") == yAxis &&
      (axisPresets.find((t) => t[0] == preset.dotColor)?.[1] ||
        preset.dotColor ||
        "") == dotColor &&
      (axisPresets.find((t) => t[0] == preset.dotSize)?.[1] ||
        preset.dotColor ||
        "") == dotSize &&
      labelStrategy == preset.labelStrategy &&
      dotColorMap == preset.dotColorMap
    );
  };
  const buildOverallPresetMenuItem = (
    name: string,
    preset: PlayerSeasonComparisonParams
  ) => {
    return (
      <GenericTogglingMenuItem
        text={name}
        truthVal={isoverallPlayerChartPresetselected(preset)}
        onSelect={() => applyPresetChart(preset)}
      />
    );
  };
  const getoverallPlayerChartPresets = () => {
    const tooltipForFilterPresets = (
      <Tooltip id="overallFilterPresets">Preset charts</Tooltip>
    );
    return (
      <Dropdown alignRight>
        <Dropdown.Toggle
          variant={title == "" ? "warning" : "outline-secondary"}
        >
          <OverlayTrigger placement="auto" overlay={tooltipForFilterPresets}>
            <FontAwesomeIcon icon={faList} />
          </OverlayTrigger>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <GenericTogglingMenuItem
            text={<i>Clear selection</i>}
            truthVal={false}
            onSelect={() => {
              friendlyChange(() => {
                setTitle("");
                setAdvancedFilterStr("");
                setHighlightFilterStr("");
                setXAxis("");
                setYAxis("");
                setDotColor("Black");
                setDotSize("");
                setLabelStrategy("None");
              }, true);
            }}
          />
          {overallPlayerChartPresets.map((preset) =>
            buildOverallPresetMenuItem(preset[0], preset[1])
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  // Color selector

  const ColorMapSingleValue = (props: any) => {
    const label = props.data.label || "Black";
    const labelToRender = label.replace(/[A-Za-z]+[/][A-Za-z]+\s+/, ""); //(remove leading colors)
    const colorMapPicker = colorMapOptions[label] || CbbColors.alwaysDarkGrey;
    const leftColorStr = CbbColors.toRgba(
      colorMapPicker(-Number.MAX_SAFE_INTEGER),
      0.75
    );
    const rightColorStr = CbbColors.toRgba(
      colorMapPicker(Number.MAX_SAFE_INTEGER),
      0.75
    );
    return (
      <components.SingleValue {...props}>
        <div
          style={{
            textAlign: "center",
            background:
              label == "Black"
                ? undefined
                : `linear-gradient(to right, ${leftColorStr}, 20%, white, 80%, ${rightColorStr})`,
          }}
        >
          {labelToRender}
        </div>
      </components.SingleValue>
    );
  };

  // Label strategy

  const labelStrategyTooltip = (
    <Tooltip id="labelStrategyTooltip">
      Label the top/bottom entries based on a SORT BY clause in either the
      'Filter' or 'Highlight' Linq expressions
    </Tooltip>
  );
  const buildLabelStrategy = (name: string) => {
    return (
      <GenericTogglingMenuItem
        text={name}
        truthVal={name == labelStrategy}
        onSelect={() => {
          friendlyChange(() => {
            setLabelStrategy(name);
          }, true);
        }}
      />
    );
  };

  return (
    <Container>
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
      <Form.Row>
        <Form.Group as={Col} xs="12">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="filter">Chart Title</InputGroup.Text>
            </InputGroup.Prepend>
            <AsyncFormControl
              startingVal={title}
              onChange={(newStr: string) => {
                if (newStr != title) setTitle(newStr);
              }}
              timeout={500}
              placeholder="Enter a title for this chart or select a preset"
              allowExternalChange={true}
            />
            <InputGroup.Append>
              {getoverallPlayerChartPresets()}
            </InputGroup.Append>
          </InputGroup>
        </Form.Group>
      </Form.Row>
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={12} sm={12} md={12} lg={12}>
            <LinqExpressionBuilder
              label="Filter"
              prompt="Enter Linq: remove non-matching players (see presets for ideas)"
              value={datasetFilterStr}
              error={datasetFilterError}
              autocomplete={
                AdvancedFilterUtils.playerSeasonComparisonAutocomplete
              }
              presets={datasetFilterPresets}
              syncEvent={linqExpressionSync}
              callback={(newVal: string, onSync?: boolean) => {
                if (!onSync) setLinqExpressionSync((n) => n + 1);
                friendlyChange(() => setAdvancedFilterStr(newVal), true);
              }}
              showHelp={showHelp}
            />
          </Col>
        </Form.Row>
      ) : null}
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={11} sm={11} md={11} lg={11}>
            <LinqExpressionBuilder
              label="Highlight"
              prompt="Enter Linq: non-matching players from 'Filter' are faded into the background"
              value={highlightFilterStr}
              error={highlightFilterError}
              autocomplete={
                AdvancedFilterUtils.playerSeasonComparisonAutocomplete
              }
              presets={datasetFilterPresets}
              syncEvent={linqExpressionSync}
              callback={(newVal: string, onSync?: boolean) => {
                if (!onSync) setLinqExpressionSync((n) => n + 1);
                friendlyChange(() => setHighlightFilterStr(newVal), true);
              }}
              showHelp={showHelp}
            />
          </Col>
          <Col xs={1} sm={1} md={1} lg={1}>
            <Dropdown alignRight style={{ maxHeight: "2.4rem" }}>
              <Dropdown.Toggle variant="outline-secondary">
                <OverlayTrigger placement="auto" overlay={labelStrategyTooltip}>
                  <FontAwesomeIcon icon={faTags} />
                </OverlayTrigger>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {[
                  "None",
                  "Top 5",
                  "Top 10",
                  "Top 25",
                  "Top/Bottom 5",
                  "Top/Bottom 10",
                  "Top/Bottom 25",
                ].map(buildLabelStrategy)}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Form.Row>
      ) : null}
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={12} sm={12} md={6} lg={6}>
            <LinqExpressionBuilder
              label="X-Axis"
              prompt="Linq //LABEL //LIMITS //TICKS"
              value={xAxis}
              error={datasetFilterError}
              autocomplete={AdvancedFilterUtils.playerSeasonComparisonAutocomplete.concat(
                extraAxisDecompKeywords
              )}
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={(newVal: string, onSync?: boolean) => {
                if (!onSync) setLinqExpressionSync((n) => n + 1);
                friendlyChange(() => setXAxis(newVal), true);
              }}
              showHelp={showHelp}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6}>
            <LinqExpressionBuilder
              label="Y-Axis"
              prompt="Linq //LABEL //LIMITS //TICKS"
              value={yAxis}
              error={datasetFilterError}
              autocomplete={AdvancedFilterUtils.playerSeasonComparisonAutocomplete.concat(
                extraAxisDecompKeywords
              )}
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={(newVal: string, onSync?: boolean) => {
                if (!onSync) setLinqExpressionSync((n) => n + 1);
                friendlyChange(() => setYAxis(newVal), true);
              }}
              showHelp={showHelp}
            />
          </Col>
        </Form.Row>
      ) : null}
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={6} sm={6} md={5} lg={5}>
            <LinqExpressionBuilder
              label="Color"
              prompt="Linq expression for color vs colormap selected to right"
              value={dotColor}
              error={datasetFilterError}
              autocomplete={
                AdvancedFilterUtils.playerSeasonComparisonAutocomplete
              }
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={(newVal: string, onSync?: boolean) => {
                if (!onSync) setLinqExpressionSync((n) => n + 1);
                friendlyChange(() => setDotColor(newVal), true);
              }}
              showHelp={showHelp}
            />
          </Col>
          <Col xs={6} sm={6} md={2} lg={2}>
            <ThemedSelect
              value={stringToOption(dotColorMap)}
              options={_.keys(colorMapOptions).map((colorMap) =>
                stringToOption(colorMap)
              )}
              components={
                //@ts-ignore
                { SingleValue: ColorMapSingleValue }
              }
              styles={{
                singleValue: (provided: any, __: any) => ({
                  ...provided,
                  width: "100%",
                }),
              }}
              isSearchable={false}
              onChange={(option: any) => {
                const newColorMap = (option as any)?.value || "Black";
                friendlyChange(() => {
                  setDotColorMap(newColorMap);
                }, newColorMap != dotColorMap);
              }}
            />
          </Col>
          <Col xs={12} sm={12} md={5} lg={5}>
            <LinqExpressionBuilder
              label="Size"
              prompt="Linq expression for datapoint size"
              value={dotSize}
              error={datasetFilterError}
              autocomplete={
                AdvancedFilterUtils.playerSeasonComparisonAutocomplete
              }
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={(newVal: string, onSync?: boolean) => {
                if (!onSync) setLinqExpressionSync((n) => n + 1);
                friendlyChange(() => setDotSize(newVal), true);
              }}
              showHelp={showHelp}
            />
          </Col>
        </Form.Row>
      ) : null}
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
            minimizeMargin={true}
            title="Player Stats"
            helpLink={undefined}
            startClosed={!showTable}
            onShowHide={(nowShown: boolean) => setShowTable(nowShown)}
          >
            <Container>
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
                    disabled={_.isEmpty(toggledPlayers)}
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
              <Row>
                {(xAxis && yAxis) || loadingOverride ? (
                  <LoadingOverlay
                    active={needToLoadQuery()}
                    spinner
                    text={"Loading Player Comparison Chart..."}
                  >
                    {playerLeaderboard}
                  </LoadingOverlay>
                ) : (
                  <LoadingOverlay
                    active={true}
                    text={`Configure chart or select a preset from "Chart Title"`}
                  >
                    {playerLeaderboard}
                  </LoadingOverlay>
                )}
              </Row>
            </Container>
          </GenericCollapsibleCard>
        </Col>
      </Row>
    </Container>
  );
};
export default PlayerSeasonComparisonChart;
