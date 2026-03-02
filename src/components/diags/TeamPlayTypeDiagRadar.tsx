// React imports:
import React, { useEffect, useRef, useState } from "react";

import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Utils
import {
  PlayTypeUtils,
  TopLevelIndivPlayAnalysis,
  TopLevelPlayAnalysis,
  TopLevelPlayType,
} from "../../utils/stats/PlayTypeUtils";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../GenericTable";
import {
  Statistic,
  IndivStatSet,
  TeamStatSet,
  RosterStatsByCode,
  StatModels,
  PlayerCode,
} from "../../utils/StatModels";

import {
  Text,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { GradeUtils } from "../../utils/stats/GradeUtils";
import {
  GradeTableUtils,
  DivisionStatsCache,
} from "../../utils/tables/GradeTableUtils";
import { PlayTypeDiagUtils } from "../../utils/tables/PlayTypeDiagUtils";
import QuickSwitchBar, {
  quickSwitchDelim,
  QuickSwitchMode,
  QuickSwitchSource,
} from "../shared/QuickSwitchBar";
import { Overlay, OverlayTrigger, Tooltip } from "react-bootstrap";
import { faAdjust } from "@fortawesome/free-solid-svg-icons";
import AsyncFormControl from "../shared/AsyncFormControl";
import { UrlRouting } from "../../utils/UrlRouting";
import { useTheme } from "next-themes";
import { ParamDefaults } from "../../utils/FilterModels";
import { IndivTableDefs } from "../../utils/tables/IndivTableDefs";
import ToggleButtonGroup from "../shared/ToggleButtonGroup";

const indivPlayTypeBreakdownFields = (
  adjustForSos: boolean,
  titleFilter: React.ReactNode,
) => ({
  title: GenericTableOps.addTitle(
    titleFilter,
    "",
    GenericTableOps.defaultRowSpanCalculator,
    "",
    GenericTableOps.htmlFormatter,
    4,
  ),
  pos: GenericTableOps.addDataCol(
    "Pos",
    "The positional role of the player",
    CbbColors.applyThemedBackground,
    GenericTableOps.htmlFormatter,
  ),
  playType: GenericTableOps.addDataCol(
    "Sub-Type",
    "The sub-type of the selected play type(s)",
    CbbColors.applyThemedBackground,
    GenericTableOps.htmlFormatter,
  ),
  sep2: GenericTableOps.addColSeparator(),
  possPct: GenericTableOps.addPctCol(
    "Play%",
    "The % of team plays to which this player/play type corresponds",
    CbbColors.varPicker(CbbColors.p_ast_breakdown),
  ),
  ppp: GenericTableOps.addDataCol(
    adjustForSos ? "AdjPPP" : "PPP",
    adjustForSos
      ? "Adjusted points per play for this player/play type"
      : "Points per play for this player/play type",
    CbbColors.applyThemedBackground,
    GenericTableOps.pointsFormatter2dp,
  ),
  pts: GenericTableOps.addDataCol(
    "Pts",
    "The number of points per 100 team plays for this player/play type",
    CbbColors.applyThemedBackground,
    GenericTableOps.pointsFormatter2dp,
  ),
});

////////////////

// External Config:

/** Has to be bwc with the format below forever */
type TeamPlayTypeDiagRadarConfig = {
  adjustForSos: boolean;
  filterStr: string;
  selectedPlayTypes: Set<TopLevelPlayType> | "all";
  multiMode: boolean;
  quickSwitch?: string;
  possFreqType: "P%le" | "P%";
  cardView?: boolean;
  //(can add extra params but never change the above)
};
export const quickSwitchTitleDelim = ":_:";
export const teamRadarConfigToStr = (
  config: TeamPlayTypeDiagRadarConfig,
  startWithRaw: boolean,
): string => {
  const configStr = [
    startWithRaw //(default depends on this param)
      ? config.adjustForSos
        ? "sos"
        : ""
      : config.adjustForSos
        ? ""
        : "!sos",
    config.filterStr || "",
    config.selectedPlayTypes == "all"
      ? "all"
      : config.selectedPlayTypes
        ? _.thru(Array.from(config.selectedPlayTypes as Set<string>), (arr) =>
            arr.length == PlayTypeUtils.topLevelPlayTypes.length
              ? "all"
              : arr.join(","),
          )
        : "",
    config.multiMode ? "multi" : "",
    _.thru(config.quickSwitch, (newQuickSwitch) => {
      if (newQuickSwitch && newQuickSwitch.includes(quickSwitchDelim)) {
        return newQuickSwitch; //(don't store temp switches between graphs)
      } else return "";
    }),
    config.possFreqType == ParamDefaults.defaultTeamShowPlayTypesPlayType
      ? ""
      : config.possFreqType || "",
    config.cardView ? "card" : "",
    //(can add extra params but never change the above)
  ].join("||"); //TODO maybe remove trailing "||"?

  return configStr;
};
export const configStrToTeamRadarConfig = (
  configStr: string | undefined,
  startWithRaw: boolean,
): TeamPlayTypeDiagRadarConfig => {
  if (configStr) {
    const arr = configStr.split("||");
    return {
      adjustForSos: !arr[0] ? !startWithRaw : arr[0] == "sos",
      filterStr: arr[1] || "",
      selectedPlayTypes:
        arr[2] == "all"
          ? "all"
          : new Set(
              (arr[2] || "")
                .split(",")
                .filter((pt) => pt != "") as TopLevelPlayType[],
            ),
      multiMode: arr[3] == "multi",
      quickSwitch: arr[4],
      possFreqType:
        (arr[5] as "P%le" | "P%") ||
        ParamDefaults.defaultTeamShowPlayTypesPlayType,
      cardView: arr[6] === "card",
    };
  } else {
    return {
      adjustForSos: !startWithRaw,
      filterStr: "",
      selectedPlayTypes: new Set(),
      multiMode: false,
      possFreqType: ParamDefaults.defaultTeamShowPlayTypesPlayType,
      cardView: false,
    };
  }
};

// ^ end external config

///////////////////////////

export type Props = {
  title: string;
  players: Array<IndivStatSet>;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: Props[];
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
  playCountToUse?: number;
  defensiveOverride?: TopLevelPlayAnalysis;
  startWithRaw?: boolean;
  configStr?: string;
  updateConfig?: (configStr: string) => void;
  navigationLinkOverride?: React.ReactElement;
  exportOptions?: {
    gameId?: string;
    teamTitle?: string;
    invertTeamAndOppo?: boolean;
    jsonMode?: boolean;
    singleGameMode?: boolean;
  };
  /** For diff mode: allows chart's quickSwitch to be dynamically updated from configStr */
  dynamicQuickSwitch?: boolean;
  /** For diff mode: override the default quickSwitch modes */
  quickSwitchModesOverride?: QuickSwitchMode[];
};
const TeamPlayTypeDiagRadar: React.FunctionComponent<Props> = ({
  title,
  players: playersIn,
  rosterStatsByCode,
  teamStats: teamStatsIn,
  avgEfficiency,
  quickSwitchOptions,
  showGrades,
  grades,
  showHelp,
  playCountToUse,
  defensiveOverride: defensiveOverrideIn,
  startWithRaw,
  configStr,
  updateConfig: updateConfigIn,
  navigationLinkOverride,
  exportOptions,
  dynamicQuickSwitch,
  quickSwitchModesOverride,
}) => {
  // At some point calculate medians for display purposes
  // if (grades && grades.Combo) {
  //   console.log(
  //     "RESULTS",
  //     GradeUtils.getMedianPlayTypeValue(
  //       PlayTypeUtils.topLevelPlayTypes,
  //       grades.Combo
  //     )
  //   );
  // }

  const { resolvedTheme } = useTheme();
  const highlightColor = resolvedTheme == "dark" ? "#ffFFff" : "#000000";

  /** Translate from hacky string */
  const [incomingConfig, setIncomingConfig] =
    useState<TeamPlayTypeDiagRadarConfig>(
      configStrToTeamRadarConfig(configStr, startWithRaw || false),
    );
  const updateConfig = (newConfig: TeamPlayTypeDiagRadarConfig) => {
    setIncomingConfig(newConfig);
    if (updateConfigIn)
      updateConfigIn(teamRadarConfigToStr(newConfig, startWithRaw || false));
  };

  const [adjustForSos, setAdjustForSos] = useState<boolean>(
    incomingConfig.adjustForSos,
  );

  const [possFreqType, setPossFreqType] = useState<"P%le" | "P%">(
    incomingConfig.possFreqType,
  );

  const [cardView, setCardView] = useState<boolean>(
    incomingConfig.cardView ?? false,
  );

  /** Which players to filter */
  const [filterStr, setFilterStr] = useState(incomingConfig.filterStr);

  const [selectedPlayTypes, setSelectedPlayTypes] = useState<
    Set<TopLevelPlayType>
  >(
    incomingConfig.selectedPlayTypes == "all"
      ? new Set(PlayTypeUtils.topLevelPlayTypes)
      : incomingConfig.selectedPlayTypes,
  );
  const [multiMode, setMultiMode] = useState<boolean>(incomingConfig.multiMode);
  const [csvData, setCsvData] = useState<object[]>([]);

  const [quickSwitch, setQuickSwitch] = useState<string | undefined>(
    _.thru(incomingConfig.quickSwitch, (quickSwitchIn) => {
      const frags = (quickSwitchIn || "").split(quickSwitchTitleDelim);
      if (frags[0] == "" || frags[0] == title) {
        return frags[1];
      } else {
        return undefined; //(ignore quick switch for the wrong one)
      }
    }),
  );
  /** Support configStr getting changed externally */
  useEffect(() => {
    const newConfig = configStrToTeamRadarConfig(
      configStr,
      startWithRaw || false,
    );
    setIncomingConfig(newConfig);
    setAdjustForSos(newConfig.adjustForSos);
    setPossFreqType(
      (newConfig?.possFreqType ??
        ParamDefaults.defaultTeamShowPlayTypesPlayType) as "P%le" | "P%",
    );
    setCardView(newConfig.cardView ?? false);
  }, [configStr]);

  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);

  // Handle dynamic quickSwitch updates from external source (diff mode)
  // When configStr changes externally, update the quickSwitch state
  useEffect(() => {
    if (dynamicQuickSwitch && configStr) {
      const newConfig = configStrToTeamRadarConfig(
        configStr,
        startWithRaw || false,
      );
      const quickSwitchFromConfig = _.thru(
        newConfig.quickSwitch,
        (quickSwitchIn) => {
          const frags = (quickSwitchIn || "").split(quickSwitchTitleDelim);
          if (frags[0] == "" || frags[0] == title) {
            return frags[1];
          } else {
            return undefined; //(ignore quick switch for the wrong title)
          }
        },
      );
      setQuickSwitch(quickSwitchFromConfig);
    }
  }, [dynamicQuickSwitch, configStr, title, startWithRaw]);

  const quickSwitchBase = quickSwitch
    ? quickSwitch.split(quickSwitchDelim)[0]
    : undefined;
  const quickSwitchExtra: "extra" | "diff" | undefined = (
    quickSwitch ? quickSwitch.split(quickSwitchDelim)[1] : undefined
  ) as "extra" | "diff" | undefined;

  //TODO: there's a buch of stuff that should get moved into the react.useMemo here
  // (see IndivPlayTypeDiagRadar)

  // --- MAIN/BASE/EXTRA CHART DATA LOGIC ---
  // Compute the 'main' chart data (always from default props)
  const mainPlayers = playersIn;
  const mainTeamStats = teamStatsIn;
  const mainDefensiveOverride = defensiveOverrideIn;
  const mainSosAdjustment =
    avgEfficiency /
    ((mainDefensiveOverride
      ? mainTeamStats.off_adj_opp?.value
      : mainTeamStats.def_adj_opp?.value) || avgEfficiency);
  const mainTopLevelPlayTypeStyles: TopLevelPlayAnalysis =
    mainDefensiveOverride ||
    (mainTeamStats.style as TopLevelPlayAnalysis) ||
    PlayTypeUtils.buildTopLevelPlayStyles(
      mainPlayers,
      rosterStatsByCode,
      mainTeamStats,
    );

  const { tierToUse: mainTierToUse } = GradeTableUtils.buildTeamTierInfo(
    showGrades,
    {
      comboTier: grades?.Combo,
      highTier: grades?.High,
      mediumTier: grades?.Medium,
      lowTier: grades?.Low,
    },
  );

  const supportPlayerBreakdown =
    !startWithRaw && !defensiveOverrideIn && playersIn.length > 0;

  const playerTopLevelPlayTypeStyles:
    | Record<PlayerCode, TopLevelIndivPlayAnalysis>
    | undefined =
    selectedPlayTypes.size > 0 && supportPlayerBreakdown
      ? _.chain(mainPlayers)
          .map((p) => {
            return [
              p.code,
              PlayTypeUtils.buildTopLevelIndivPlayStyles(
                p,
                rosterStatsByCode,
                mainTeamStats,
                true,
              ),
            ];
          })
          .fromPairs()
          .value()
      : undefined;

  const filterBox = (
    <AsyncFormControl
      size="sm"
      startingVal={filterStr}
      onChange={(t: string) => {
        updateConfig({ ...incomingConfig, filterStr: t });
        setFilterStr(t);
      }}
      timeout={500}
      placeholder=", or ;-separated-list"
    />
  );

  const indivPlayTypeBreakdownTable =
    mainTierToUse && playerTopLevelPlayTypeStyles ? (
      <GenericTable
        tableFields={indivPlayTypeBreakdownFields(adjustForSos, filterBox)}
        tableData={PlayTypeUtils.fetchTopIndivPlayTypes(
          selectedPlayTypes,
          rosterStatsByCode,
          playerTopLevelPlayTypeStyles,
        )
          .filter((pt) => {
            if (!_.isEmpty(filterStr)) {
              const frags = filterStr.includes(";")
                ? filterStr.split(";")
                : filterStr.split(",");
              return _.find(
                frags,
                (f) => pt.player.key.includes(f) || pt.code.includes(f),
              );
            } else return true;
          })
          .map((pt) => {
            return GenericTableOps.buildDataRow(
              {
                title: pt.player.key,
                pos: rosterStatsByCode[pt.code]?.role || pt.player.role || "??",
                playType: <i>{pt.playType}</i>,
                possPct: pt.playStats.possPct,
                ppp: {
                  value:
                    (pt.playStats.pts?.value || 0) *
                    (adjustForSos ? mainSosAdjustment : 1.0),
                },
                pts: {
                  value:
                    (pt.playStats.pts?.value || 0) *
                    (pt.playStats.possPct?.value || 0) *
                    100,
                },
              },
              GenericTableOps.defaultFormatter,
              GenericTableOps.defaultCellMeta,
              {
                ppp: GenericTableOps.addDataCol(
                  "PPP",
                  "Points per play for this player/play type",
                  (val: any, valMeta: string) => {
                    const pppAdj = adjustForSos ? mainSosAdjustment : 1.0;
                    const maybePppPctile = GradeUtils.getPercentile(
                      mainTierToUse,
                      `${pt.teamPlayType}|${adjustForSos ? "Adj" : ""}Ppp`,
                      (pt.playStats.pts?.value || 0) * pppAdj,
                      false,
                    );
                    return (
                      CbbColors.off_pctile_qual(maybePppPctile?.value || 0) +
                      "88" //(50% opacity)
                    );
                  },
                  GenericTableOps.pointsFormatter2dp,
                ),
              },
            );
          })}
      />
    ) : null;

  const mainTopLevelPlayTypeStylesPctile = mainTierToUse
    ? GradeUtils.getPlayStyleStats(
        mainTopLevelPlayTypeStyles,
        mainTierToUse,
        mainSosAdjustment,
        true,
      )
    : undefined;

  const showingRawFreq = possFreqType == "P%";

  // In this case we just use the raw freq, but we do want the efficiency %s
  if (showingRawFreq) {
    _.forEach(mainTopLevelPlayTypeStyles, (val, key) => {
      const toAdjust =
        mainTopLevelPlayTypeStylesPctile?.[key as TopLevelPlayType];
      if (toAdjust) {
        const pctle = toAdjust.possPct?.value || 0;
        toAdjust.possPct = val.possPct;
        if (toAdjust.possPct) {
          toAdjust.possPct!.old_value = pctle;
        }
      }
    });
  }
  const mainData = mainTopLevelPlayTypeStylesPctile
    ? _.map(mainTopLevelPlayTypeStylesPctile, (stat, playType) => {
        const rawVal = (
          mainTopLevelPlayTypeStyles as Record<
            string,
            { possPct: Statistic; pts: Statistic }
          >
        )[playType];
        const rawPct = rawVal?.possPct?.value || 0;
        const pctle = Math.min(100, (stat.possPct?.value || 0) * 100);
        return {
          name: PlayTypeDiagUtils.getPlayTypeName(playType).replace("-", " - "),
          playType: playType,
          pct:
            //(the height of the bar chart, %ile or raw value)
            rawPct == 0
              ? 0
              : possFreqType == "P%"
                ? (stat.possPct?.value || 0) * 100
                : pctle,
          pctile:
            //(always the %ile)
            possFreqType == "P%"
              ? Math.min(100, (stat.possPct?.old_value || 0) * 100)
              : pctle, // Always store percentile
          pts: Math.min(100, (stat.pts.value || 0) * 100),
          rawPct,
          rawPts: rawVal?.pts?.value || 0,
        };
      })
    : [];

  // Compute the 'extra' (was 'base') chart data (from quickSwitchBase)
  let extraTopLevelPlayTypeStylesPctile: any = undefined;
  let extraData: any[] = [];
  let extraDefOverride: any = undefined;
  let extraSosAdjustment: number | undefined = undefined;
  let commonMaxBetweenMainAndExtra: number | undefined;
  let commonNumTicksToUse: number | undefined = undefined;
  let extraTopLevelPlayTypeStyles: TopLevelPlayAnalysis | undefined = undefined;
  if (quickSwitchBase && quickSwitchOptions) {
    const extraOpt = _.find(
      quickSwitchOptions,
      (opt) => opt.title == quickSwitchBase,
    );
    if (extraOpt) {
      const extraTeamStats = extraOpt.teamStats || StatModels.emptyTeam();
      const extraPlayers = extraOpt.players || [];
      extraDefOverride = extraOpt.defensiveOverride;
      extraSosAdjustment =
        avgEfficiency /
        ((extraDefOverride
          ? extraTeamStats.off_adj_opp?.value
          : extraTeamStats.def_adj_opp?.value) || avgEfficiency);
      extraTopLevelPlayTypeStyles =
        extraDefOverride ||
        (extraTeamStats.style as TopLevelPlayAnalysis) ||
        PlayTypeUtils.buildTopLevelPlayStyles(
          extraPlayers,
          rosterStatsByCode,
          extraTeamStats,
        );

      extraTopLevelPlayTypeStylesPctile = mainTierToUse
        ? GradeUtils.getPlayStyleStats(
            extraTopLevelPlayTypeStyles!,
            mainTierToUse,
            extraSosAdjustment,
            true,
          )
        : undefined;

      // In this case we just use the raw freq, but we do want the efficiency %s
      if (possFreqType == "P%") {
        _.forEach(extraTopLevelPlayTypeStyles, (val, key) => {
          const toAdjust =
            extraTopLevelPlayTypeStylesPctile?.[key as TopLevelPlayType];
          if (toAdjust) {
            const pctle = toAdjust.possPct?.value || 0;
            toAdjust.possPct = val.possPct;
            if (toAdjust.possPct) {
              toAdjust.possPct.old_value = pctle;
            }
          }
        });
      }
      extraData = extraTopLevelPlayTypeStylesPctile
        ? _.map(extraTopLevelPlayTypeStylesPctile, (stat, playType) => {
            const rawVal = (
              extraTopLevelPlayTypeStyles as Record<
                string,
                { possPct: Statistic; pts: Statistic }
              >
            )[playType];
            const rawPct = rawVal?.possPct?.value || 0;
            const pctle = Math.min(100, (stat.possPct?.value || 0) * 100);
            return {
              name: PlayTypeDiagUtils.getPlayTypeName(playType).replace(
                "-",
                " - ",
              ),
              playType: playType,
              pct:
                //(the height of the bar chart, %ile or raw value)
                rawPct == 0
                  ? 0
                  : possFreqType == "P%"
                    ? (stat.possPct?.value || 0) * 100
                    : pctle,
              pctile:
                //(always the %ile)
                possFreqType == "P%"
                  ? Math.min(100, (stat.possPct?.old_value || 0) * 100)
                  : pctle, // Always store percentile
              pts: Math.min(100, (stat.pts.value || 0) * 100),
              rawPct,
              rawPts: rawVal?.pts?.value || 0,
            };
          })
        : [];
    }
  }

  // Calculate the tick strategy if showing raw numbers
  if (showingRawFreq) {
    const tmpMax =
      100 *
      _.chain([
        _.values(mainTopLevelPlayTypeStyles),
        extraTopLevelPlayTypeStyles
          ? _.values(extraTopLevelPlayTypeStyles)
          : [],
      ])
        .flatten()
        .map((playTypeStat) => {
          return playTypeStat.possPct?.value || 0;
        })
        .max()
        .value();

    commonNumTicksToUse =
      _.minBy([10, 9, 8], (ticks) =>
        Math.abs(tmpMax - ticks * Math.ceil(tmpMax / ticks)),
      ) || 10;

    commonMaxBetweenMainAndExtra =
      commonNumTicksToUse * Math.ceil(tmpMax / commonNumTicksToUse);
  }

  const CustomizedAxisTick: React.FunctionComponent<any> = (props) => {
    const { x, y, payload, index, data } = props;
    // Check if this play type is selected
    const playType = data?.[index]?.playType;
    const isSelected = playType && selectedPlayTypes.has(playType);

    return (
      <Text
        x={x}
        y={y}
        width={40}
        textAnchor="middle"
        verticalAnchor="start"
        style={{ fontWeight: "bold" }}
        fill={resolvedTheme == "dark" ? "#CCC" : undefined}
      >
        {payload.value}
      </Text>
    );
  };

  //TODO: is mainDefensiveOveride correct here, or should this be the defOverride passed into renderBarChartRow
  const CustomLabelledWidthBar = (props: any) => {
    const {
      fill,
      x,
      y,
      width,
      height,
      rawPct,
      rawPts,
      pctile,
      pct,
      pts,
      playType,
      onClick,
    } = props;

    // Bar:

    // We adjust width according to rawPct
    // It's 0.1 at 0, and 1.0 at 0.10+

    const widthToUse =
      width * (0.1 + 0.9 * Math.max(0, Math.min(1.0, 10 * rawPct)));
    const xAdj = 0.5 * (width - widthToUse);

    // Text:
    //(incorporate the label along with the bar to workaround animation bug: https://github.com/recharts/recharts/issues/829#issuecomment-647998463)
    const textHeight = 10;

    // Outline .. starting from 10% we go from width 1 to 3 (at 25%+)
    const outlineWidth =
      1 + Math.min(3, Math.max(0, (rawPct - 0.1) * (3 / 0.15)));

    //Blob showing true efficiency
    const radius = 0.4 * (widthToUse / 2);
    const adjustment = adjustForSos ? mainSosAdjustment : 1.0;
    const themedRawColorBuilder =
      resolvedTheme == "dark"
        ? CbbColors.off_diff10_p100_redGreen_darkMode
        : CbbColors.off_diff10_p100_redBlackGreen;
    const rawColor = themedRawColorBuilder(
      (mainDefensiveOverride ? -1 : 1) * (rawPts - 0.89) * 100 * adjustment,
    );
    const contrastingColor = pts <= 25 || pts >= 75 ? "white" : "black";
    const selectedBarColor = resolvedTheme == "dark" ? "#666666" : "#aaaaaa";

    const showCircleInBar = height > 1.1 * width;
    const extraTextSpace = showCircleInBar ? 0 : width;

    // Check if this play type is currently selected
    const isSelected = selectedPlayTypes.has(playType);

    // Handle click event
    const handleClick = () => {
      if (onClick && playType) {
        onClick(playType);
      }
    };

    return (
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        {/* Draw background rectangle for selection highlight if selected */}
        {isSelected && (
          <rect
            x={x - 7}
            y={20} /* Start from the top of the chart */
            width={width + 14}
            height={
              y + height - 20
            } /* Extend all the way to the bottom (x-axis) */
            fill={selectedBarColor}
            rx={2}
            ry={2}
            opacity={0.5}
          />
        )}
        <path
          stroke={highlightColor}
          strokeWidth={outlineWidth}
          fill={fill}
          className="recharts-rectangle"
          d={`M ${
            x + xAdj
          },${y} h ${widthToUse} v ${height} h ${-widthToUse} Z`}
        />
        <rect
          x={x - 5}
          y={y - 4 * textHeight - extraTextSpace + 1}
          width={width + 10}
          height={4 * textHeight - 2}
          fill={resolvedTheme == "dark" ? "#222222" : "#dddddd"}
          opacity={0.5}
        />
        <text
          x={x + width / 2}
          y={y - 2 * textHeight - 4 - extraTextSpace}
          fill={highlightColor}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {rawPct > 0 ? (
            <tspan fill={rawColor}>
              {((rawPts || 0) * adjustment).toFixed(2)}
            </tspan>
          ) : undefined}
          <tspan> ppp</tspan>
        </text>
        <text
          x={x + width / 2}
          y={y - textHeight + 3 - extraTextSpace}
          fill={highlightColor}
          fontSize={"smaller"}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan>
            {(mainDefensiveOverride ? 100 - (pts || 0) : pts || 0).toFixed(1)}
            <tspan fontSize="smaller">%ile</tspan>
          </tspan>
        </text>
        {
          <circle
            cx={x + width / 2}
            cy={showCircleInBar ? y + height / 2 : y - width / 2}
            r={width / 2}
            fill={showCircleInBar ? fill : selectedBarColor}
            stroke={showCircleInBar ? contrastingColor : highlightColor}
            opacity={showCircleInBar ? 1.0 : 0.33}
            strokeWidth={showCircleInBar ? outlineWidth : 0.5}
          />
        }
        {showingRawFreq && (
          <text
            x={x + width / 2}
            y={showCircleInBar ? y + height / 2 - 2 : y - width / 2 - 2}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {(pctile || 0).toFixed(1)}
          </text>
        )}
        {showingRawFreq && (
          <text
            x={x + width / 2}
            y={
              showCircleInBar
                ? y + height / 2 + textHeight + 2
                : y - width / 2 + textHeight + 2
            }
            fontSize={"60%"}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            &#402; %ile
          </text>
        )}
        {!showingRawFreq && (
          <text
            x={x + width / 2}
            y={showCircleInBar ? y + height / 2 - 2 : y - width / 2 - 2}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {(100 * (rawPct || 0)).toFixed(1)}
          </text>
        )}
        {!showingRawFreq && (
          <text
            x={x + width / 2}
            y={
              showCircleInBar
                ? y + height / 2 + textHeight + 2
                : y - width / 2 + textHeight + 2
            }
            fontSize={"60%"}
            fill={showCircleInBar ? contrastingColor : highlightColor}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            &#402;/100
          </text>
        )}
      </g>
    );
  };

  //TODO: is mainDefensiveOveride correct here, or should this be the defOverride passed into renderBarChartRow
  const CustomTooltip: React.FunctionComponent<any> = (props: any) => {
    const { active, payload, label, coordinate } = props;
    if (active) {
      const data = payload?.[0].payload || {};

      // Avoid the labels going off the end:
      const tooltipOffset = _.thru(label, (playName) => {
        switch (playName) {
          case "Transition":
            return 350;
          case "Rebound & Scramble":
            return 350;
          case "High - Low":
            return 350;
          case "Pick & Pop":
            return 350;
          case "Inside Out":
            return 350;
          default:
            return 0;
        }
      });

      return (
        <div
          className="custom-tooltip"
          style={{
            position: "absolute",
            left: coordinate.x - tooltipOffset,
            width: 350,
            background:
              resolvedTheme == "dark"
                ? "rgba(0, 0, 0, 0.9)"
                : "rgba(238, 238, 238, 0.9)",
          }}
        >
          <p className="label pl-1 pr-1">
            <b>{`${PlayTypeDiagUtils.getPlayTypeName(data.playType)}`}</b>
          </p>
          <p className="desc pl-1 pr-1">
            {topLevelPlayTypeDescriptions[data.playType as TopLevelPlayType] ||
              data.playType}
          </p>
          <p className="desc pl-1 pr-1">
            Frequency: [<b>{(100 * data.rawPct).toFixed(1)}</b>] / 100&nbsp;
            plays
            <br />
            Frequency Pctile: [<b>{data.pctile.toFixed(1)}%</b>]
            {_.isNumber(playCountToUse) ? <br /> : null}
            {_.isNumber(playCountToUse) ? (
              <span>
                [<b>{(playCountToUse * data.rawPct).toFixed(1)}</b>] plays in
                this game ([{playCountToUse}] plays)
              </span>
            ) : null}
          </p>
          <p className="desc pl-1 pr-1">
            Efficiency: [<b>{data.rawPts.toFixed(2)}</b>] pts/play
            <br />
            Adj Efficiency: [
            <b>{(data.rawPts * mainSosAdjustment).toFixed(2)}</b>] pts/play
            <br />
            {mainDefensiveOverride ? (
              <span>
                {adjustForSos ? "Adj " : ""}Efficiency Pctile: [
                <b>{(100 - data.pts).toFixed(1)}%</b>]
              </span>
            ) : (
              <span>
                {adjustForSos ? "Adj " : ""}Efficiency Pctile: [
                <b>{data.pts.toFixed(1)}%</b>]
              </span>
            )}
            <br />
            (Average D1 play is approx [<b>0.89</b>] pts)
            {mainDefensiveOverride ? <br /> : undefined}
            {mainDefensiveOverride ? <br /> : undefined}
            {mainDefensiveOverride ? (
              <i>
                (NOTE: Pctiles shown are currently based on
                <br />
                offensive stats, a temporary limitation)
              </i>
            ) : undefined}
            {supportPlayerBreakdown ? (
              <>
                <br />
                <br />
                Click on the bar to view the approx player breakdown
              </>
            ) : null}
          </p>
        </div>
      );
    }
    return null;
  };

  // Helper to render a BarChart Row
  const renderBarChartRow = (
    data: any[],
    pctile: any,
    defOverride: any,
    sosAdj: number,
    rowTitle?: string,
    cellKeyPrefix: string = "cell-",
  ) => {
    return pctile ? (
      <Row className="recharts-container">
        <Col xs={11}>
          {rowTitle ? (
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>
              {rowTitle}
            </div>
          ) : null}
          <ResponsiveContainer minWidth={800} width="100%" height={400}>
            <BarChart
              height={410}
              data={data}
              margin={{
                top: 35,
                right: 30,
                left: 20,
                bottom: 30,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                interval={0}
                tick={<CustomizedAxisTick />}
              />
              <YAxis
                type="number"
                stroke={resolvedTheme == "dark" ? "#CCC" : undefined}
                domain={
                  showingRawFreq
                    ? commonMaxBetweenMainAndExtra
                      ? [0, Math.round(commonMaxBetweenMainAndExtra)]
                      : undefined
                    : [0, 100]
                }
                tickCount={commonNumTicksToUse}
                ticks={
                  showingRawFreq
                    ? commonMaxBetweenMainAndExtra && commonNumTicksToUse
                      ? _.range(
                          0,
                          commonMaxBetweenMainAndExtra + 1,
                          commonMaxBetweenMainAndExtra / commonNumTicksToUse,
                        )
                      : undefined
                    : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
                }
              >
                <Label
                  angle={-90}
                  value={
                    possFreqType == "P%"
                      ? `Frequency %`
                      : `Frequency %ile in D1`
                  }
                  fill={resolvedTheme == "dark" ? "#CCC" : undefined}
                  position="insideLeft"
                  style={{ textAnchor: "middle", fontWeight: "bold" }}
                />
              </YAxis>
              <RechartTooltip
                content={<CustomTooltip />}
                wrapperStyle={{
                  background:
                    resolvedTheme == "dark"
                      ? "rgba(0, 0, 0, 1.0)"
                      : "rgba(238, 238, 238, 1.0)",
                  zIndex: 1000,
                }}
                allowEscapeViewBox={{ x: true, y: false }}
              />
              <Bar
                dataKey="pct"
                fill="#8884d8"
                shape={(props: any) => (
                  <CustomLabelledWidthBar
                    {...props}
                    playType={props.payload.playType}
                    onClick={(playType: TopLevelPlayType) => {
                      if (multiMode) {
                        const newSelectedPlayTypes = new Set(selectedPlayTypes);
                        if (newSelectedPlayTypes.has(playType)) {
                          newSelectedPlayTypes.delete(playType);
                        } else {
                          newSelectedPlayTypes.add(playType);
                        }
                        updateConfig({
                          ...incomingConfig,
                          selectedPlayTypes: newSelectedPlayTypes,
                        });
                        setSelectedPlayTypes(newSelectedPlayTypes);
                      } else {
                        const newSelectedPlayTypes: Set<TopLevelPlayType> =
                          selectedPlayTypes.has(playType)
                            ? new Set()
                            : new Set([playType]);

                        updateConfig({
                          ...incomingConfig,
                          selectedPlayTypes: newSelectedPlayTypes,
                        });
                        setSelectedPlayTypes(newSelectedPlayTypes);
                      }
                    }}
                  />
                )}
                isAnimationActive={true}
              >
                {data.map((p, index) => {
                  return (
                    <Cell
                      key={`${cellKeyPrefix}${index}`}
                      stroke="#000000"
                      fill={(defOverride
                        ? CbbColors.def_pctile_qual
                        : CbbColors.off_pctile_qual)(
                        p.pts * 0.01 * (adjustForSos ? sosAdj : 1.0),
                      )}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Col>
      </Row>
    ) : null;
  };

  // --- TOP/BOTTOM CHART LOGIC ---
  // Top chart: show mainData if !quickSwitchBase or quickSwitchExtra === 'extra', otherwise show extraData
  const showMainOnTop = !quickSwitchBase || quickSwitchExtra === "extra";
  const topData = showMainOnTop ? mainData : extraData;
  const topPctile = showMainOnTop
    ? mainTopLevelPlayTypeStylesPctile
    : extraTopLevelPlayTypeStylesPctile;
  const topDefOverride = showMainOnTop
    ? mainDefensiveOverride
    : extraDefOverride;
  const topSosAdjustment = showMainOnTop
    ? mainSosAdjustment
    : (extraSosAdjustment ?? 1.0);
  const topTitle = undefined; // never show a title for the top chart
  const topCellPrefix = showMainOnTop ? "cell-" : "cell-extra-";

  // Bottom chart: only if quickSwitchExtra === 'extra', always show extraData
  const showBottom =
    quickSwitchExtra === "extra" && quickSwitchBase && quickSwitchOptions;

  // Card view: Pts = (PPP × Freq) × 100 (points per 100 poss); match IndivPlayTypeDiagRadar formatting
  const sumPlayTypePoints = _.sumBy(topData, (row) => {
    const ppp = adjustForSos ? row.rawPts * topSosAdjustment : row.rawPts;
    return ppp * row.rawPct * 100;
  });
  const sumPlayTypeUsage = _.sumBy(topData, (row) => row.rawPct * 100);
  const identityPrefix = (k: string) => k;
  const noCellMeta = () => "";
  const cardTableRows = _.chain(topData)
    .map((row) => {
      const ppp = adjustForSos ? row.rawPts * topSosAdjustment : row.rawPts;
      const pts = ppp * row.rawPct * 100;
      const pppPctileToUse = defensiveOverrideIn ? 100 - row.pts : row.pts;
      return GenericTableOps.buildDataRow(
        {
          title: row.name,
          pts: { value: pts },
          pts_pct: (
            <div>
              {sumPlayTypePoints > 0
                ? ((100 * pts) / sumPlayTypePoints).toFixed(1)
                : 0}
              %
            </div>
          ),
          ppp: (
            <div
              style={{
                ...CommonTableDefs.getTextShadow(
                  { value: pppPctileToUse * 0.01 },
                  resolvedTheme === "dark"
                    ? CbbColors.percentile_redBlackGreen
                    : CbbColors.off_pctile_qual,
                ),
              }}
            >
              {ppp.toFixed(2)} <sup>{pppPctileToUse.toFixed(0)}%</sup>
            </div>
          ),
          freq: (
            <div
              style={{
                ...CommonTableDefs.getTextShadow(
                  { value: row.pctile * 0.01 },
                  resolvedTheme === "dark"
                    ? CbbColors.percentile_blueBlackOrange
                    : CbbColors.all_pctile_freq,
                ),
              }}
            >
              {(row.rawPct * 100).toFixed(1)}%{" "}
              <sup>{row.pctile.toFixed(0)}%</sup>
            </div>
          ),
        },
        identityPrefix,
        noCellMeta,
      );
    })
    .concat([
      GenericTableOps.buildDataRow(
        {
          title: "Total",
          pts: { value: sumPlayTypePoints },
          pts_pct: { value: null },
          ppp: { value: null },
          freq: { value: null },
        },
        identityPrefix,
        noCellMeta,
      ),
    ])
    .value();

  /** Shows the JSON at the bottom if enabled */
  const debugView = false;

  return React.useMemo(() => {
    const buildExportData = () => {
      return grades
        ? PlayTypeDiagUtils.buildTeamStyleBreakdownData(
            exportOptions?.teamTitle || title,
            !exportOptions?.invertTeamAndOppo,
            exportOptions?.gameId || "",
            {
              on: [],
              off: [],
              other: [],
              baseline: playersIn,
              global: [],
            },
            {
              on: StatModels.emptyTeam(),
              off: StatModels.emptyTeam(),
              other: [],
              baseline: teamStatsIn,
              global: StatModels.emptyTeam(),
            },
            avgEfficiency,
            grades,
            exportOptions?.singleGameMode ?? false,
            undefined,
            rosterStatsByCode,
          )
        : [];
    };

    return exportOptions?.jsonMode ? (
      <span>{JSON.stringify(buildExportData(), null, 3)}</span>
    ) : (
      <span>
        {
          <QuickSwitchBar
            title={title}
            quickSwitch={quickSwitchBase}
            quickSwitchExtra={quickSwitchExtra}
            quickSwitchOptions={quickSwitchOptions}
            updateQuickSwitch={(
              newQuickSwitch: string | undefined,
              newTitle: string | undefined,
              source: QuickSwitchSource,
              fromTimer: boolean,
            ) => {
              if (fromTimer) {
                setQuickSwitch((curr) => (curr ? undefined : newQuickSwitch));
              } else {
                setQuickSwitch((__) => {
                  const newCurr = newQuickSwitch;
                  updateConfig({
                    ...incomingConfig,
                    quickSwitch: title + quickSwitchTitleDelim + newCurr,
                  });
                  return newCurr;
                });
              }
            }}
            quickSwitchTimer={quickSwitchTimer}
            setQuickSwitchTimer={setQuickSwitchTimer}
            modes={quickSwitchModesOverride || ["link", "timer", "extra_down"]}
            theme={resolvedTheme}
          />
        }

        <Container className="mt-2">
          <Row className="text-center">
            <Col xs={6} lg={2}>
              {PlayTypeDiagUtils.buildLegend("[LEGEND]")}
              {grades ? (
                <>
                  <span> | </span>
                  {PlayTypeDiagUtils.buildCsvDownload(
                    "[CSV]",
                    `play_types_${title}`,
                    csvData,
                    () => {
                      const playStyleData: object[] = buildExportData();
                      setCsvData(playStyleData);
                    },
                  )}
                </>
              ) : undefined}
            </Col>
            <Col xs={6} lg={7}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  alignItems: "center",
                  gap: "0.25em",
                }}
              >
                <ToggleButtonGroup
                  items={[
                    {
                      items: [
                        {
                          label: "Adj",
                          tooltip: (
                            <div>
                              <b>Adj:</b> Adjusted Pts/Play (SoS: x[
                              {mainSosAdjustment.toFixed(2)}])
                            </div>
                          ),
                          toggled: adjustForSos,
                          onClick: () => {
                            setAdjustForSos(true);
                            updateConfig({
                              ...incomingConfig,
                              adjustForSos: true,
                            });
                          },
                        },
                        {
                          label: "Raw",
                          tooltip: (
                            <div>
                              <b>Raw:</b> Show PPP with no SoS adjustments
                            </div>
                          ),
                          toggled: !adjustForSos,
                          onClick: () => {
                            setAdjustForSos(false);
                            updateConfig({
                              ...incomingConfig,
                              adjustForSos: false,
                            });
                          },
                        },
                      ],
                    },
                    {
                      label: " | ",
                      isLabelOnly: true,
                      toggled: false,
                      onClick: () => null,
                    },
                    {
                      items: [
                        {
                          label: "P%le",
                          tooltip: (
                            <div>
                              <b>P%le:</b> Shows play frequency (per /100{" "}
                              <i>team</i> possessions) as a percentile of the
                              selected sample (typically across all D1).
                            </div>
                          ),
                          toggled: possFreqType === "P%le",
                          onClick: () => {
                            setPossFreqType("P%le");
                            updateConfig({
                              ...incomingConfig,
                              possFreqType: "P%le",
                            });
                          },
                        },
                        {
                          label: "P%",
                          tooltip: (
                            <div>
                              <b>P%:</b> Shows play frequency per /100{" "}
                              <i>team</i> possessions.
                            </div>
                          ),
                          toggled: possFreqType === "P%",
                          onClick: () => {
                            setPossFreqType("P%");
                            updateConfig({
                              ...incomingConfig,
                              possFreqType: "P%",
                            });
                          },
                        },
                      ],
                    },
                    ...(supportPlayerBreakdown
                      ? [
                          {
                            label: " | ",
                            isLabelOnly: true,
                            toggled: false,
                            onClick: () => null,
                          },
                          {
                            label: "Player Details",
                            tooltip: (
                              <div>
                                Shows / hides the individual play-type breakdown
                                for all team plays. Click on individual bars to
                                select / deselect specific team play types.
                              </div>
                            ),
                            toggled: selectedPlayTypes.size > 0,
                            onClick: () => {
                              if (selectedPlayTypes.size > 0) {
                                setSelectedPlayTypes(new Set());
                                setMultiMode(false);
                                updateConfig({
                                  ...incomingConfig,
                                  selectedPlayTypes: new Set(),
                                  multiMode: false,
                                });
                              } else {
                                setMultiMode(true);
                                setSelectedPlayTypes(
                                  new Set(PlayTypeUtils.topLevelPlayTypes),
                                );
                                updateConfig({
                                  ...incomingConfig,
                                  selectedPlayTypes: "all",
                                  multiMode: true,
                                });
                              }
                            },
                          },
                        ]
                      : []),
                    {
                      label: " | ",
                      isLabelOnly: true,
                      toggled: false,
                      onClick: () => null,
                    },
                    {
                      items: [
                        {
                          label: "Card",
                          tooltip: (
                            <div>
                              <b>Card:</b> Show play type information as a table
                            </div>
                          ),
                          toggled: cardView,
                          onClick: () => {
                            setCardView(true);
                            updateConfig({
                              ...incomingConfig,
                              cardView: true,
                            });
                          },
                        },
                        {
                          label: "Chart",
                          tooltip: (
                            <div>
                              <b>Chart:</b> Show play type information as a bar
                              chart
                            </div>
                          ),
                          toggled: !cardView,
                          onClick: () => {
                            setCardView(false);
                            updateConfig({
                              ...incomingConfig,
                              cardView: false,
                            });
                          },
                        },
                      ],
                    },
                  ]}
                />
                {navigationLinkOverride ? " | " : null}
                {navigationLinkOverride}
              </div>
            </Col>
          </Row>
          {cardView ? (
            <Row>
              <Col xs={{ span: 7, offset: 2 }} className="pt-2">
                <GenericTable
                  growsToFit={false}
                  tableCopyId="teamPlayTypeCard"
                  tableFields={IndivTableDefs.playTypeCardTable}
                  tableData={cardTableRows}
                />
              </Col>
            </Row>
          ) : (
            <>
              {renderBarChartRow(
                topData,
                topPctile,
                topDefOverride,
                topSosAdjustment,
                topTitle,
                topCellPrefix,
              )}
              {showBottom
                ? renderBarChartRow(
                    extraData,
                    extraTopLevelPlayTypeStylesPctile,
                    extraDefOverride,
                    extraSosAdjustment ?? 1.0,
                    `Compare vs [${quickSwitchBase}]`,
                    "cell-extra-",
                  )
                : null}
            </>
          )}
          {playerTopLevelPlayTypeStyles && selectedPlayTypes.size > 0 && (
            <>
              <Row className="mt-1">
                <Col xs={10}>
                  <div className="p-3 border">
                    <strong>Selected:</strong>{" "}
                    {Array.from(selectedPlayTypes).map((playType, index) => (
                      <span key={playType}>
                        {index > 0 ? ", " : ""}
                        {PlayTypeDiagUtils.getPlayTypeName(playType)}
                      </span>
                    ))}
                    &nbsp;(
                    <a
                      href=""
                      onClick={(e) => {
                        e.preventDefault();
                        if (multiMode) {
                          setSelectedPlayTypes(new Set());
                          setMultiMode(false);
                          updateConfig({
                            ...incomingConfig,
                            selectedPlayTypes: new Set(),
                            multiMode: false,
                          });
                        } else {
                          setMultiMode(true);
                          updateConfig({
                            ...incomingConfig,
                            multiMode: true,
                          });
                        }
                      }}
                    >
                      {multiMode ? "clear" : "multi-select"}
                    </a>
                    )
                    <br />
                    <div className="mt-2">{indivPlayTypeBreakdownTable}</div>
                    <span>
                      <i>
                        (Passers and scorers both get some "credit" for passing
                        plays, so frequencies will not add up to 100%)
                      </i>
                    </span>
                  </div>
                </Col>
              </Row>
            </>
          )}
          {debugView ? (
            <Row>
              <Col xs={10}>
                {_.toPairs(mainTopLevelPlayTypeStylesPctile || {}).map((o) => (
                  <span>
                    {JSON.stringify(o, tidyNumbers)}
                    <br />
                  </span>
                ))}
                {_.toPairs(mainTopLevelPlayTypeStyles || {}).map((o) => (
                  <span>
                    {JSON.stringify(o, tidyNumbers)}
                    <br />
                  </span>
                ))}
              </Col>
            </Row>
          ) : undefined}
        </Container>
      </span>
    );
  }, [
    playersIn,
    defensiveOverrideIn,
    grades,
    showGrades,
    teamStatsIn,
    quickSwitch,
    quickSwitchTimer,
    csvData,
    adjustForSos,
    selectedPlayTypes,
    multiMode,
    filterStr,
    possFreqType,
    cardView,
    resolvedTheme,
  ]);
};
export default TeamPlayTypeDiagRadar;

/** Util for console log */
const tidyNumbers = (k: string, v: any) => {
  if (_.isNumber(v)) {
    const numStr = v.toFixed(3);
    if (_.endsWith(numStr, ".000")) {
      return numStr.split(".")[0];
    } else {
      return parseFloat(numStr);
    }
  } else {
    return v;
  }
};

const topLevelPlayTypeDescriptions: Record<TopLevelPlayType, React.ReactNode> =
  {
    "Rim Attack": (
      <i>
        Drives and slashes to the rim from the perimeter.
        <br />
        Includes pull-ups and floaters
      </i>
    ),
    "Attack & Kick": (
      <i>
        Ball-handler passes to the perimeter for 3P,
        <br />
        usually after the defense collapses on a drive
      </i>
    ),
    "Dribble Jumper": (
      <i>
        3P shots off the dribble, eg off ISOs
        <br />
        or defenders going under screens
      </i>
    ),
    "Mid-Range": (
      <i>
        The offense finds space in the mid-range,
        <br />
        from backcourt/wing passes or sagging defenders
      </i>
    ),
    "Backdoor Cut": (
      <i>
        A perimeter player cuts to the basket
        <br />
        eg via a backdoor cut
      </i>
    ),
    "Big Cut & Roll": (
      <i>
        A frontcourt player cuts to the basket,
        <br />
        Usually after a screen, eg in PnR
      </i>
    ),
    "Post-Up": (
      <i>
        A frontcourt player backs his defender
        <br />
        down to the rim
      </i>
    ),
    "Post & Kick": (
      <i>
        A frontcourt player is doubled (usually),
        <br />
        but finds an open shooter on the perimeter or mid-range
      </i>
    ),
    "Pick & Pop": (
      <i>
        An assisted 3P from a frontcourt player,
        <br />
        Sometimes after setting a screen
      </i>
    ),
    "High-Low": <i>Two bigs connect for a shot at the rim</i>,
    "Put-Back": (
      <i>
        Shots taken directly off a rebound
        <br />
        (can include a kick-out for 3P)
      </i>
    ),
    Transition: <i>Rim-to-rim, off turnovers, etc</i>,
    Misc: <i />,
  };
