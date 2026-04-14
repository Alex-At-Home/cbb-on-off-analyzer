/**
 * Season Matchup Analyzer: per-game breakdown for a team's season.
 * Uses SeasonMatchupFilter (gender/year/team), loads team + player + lineup per game,
 * then shows player impact by game in a table with QuickSwitchBar.
 */
import React, { useState, useMemo, useEffect } from "react";
import Router from "next/router";
import _ from "lodash";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { useTheme } from "next-themes";
import { CbbColors } from "../utils/CbbColors";
import {
  SeasonMatchupFilterParams,
  ParamDefaults,
  getCommonFilterParams,
} from "../utils/FilterModels";
import { UrlRouting } from "../utils/UrlRouting";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import HeaderBar from "../components/shared/HeaderBar";
import Footer from "../components/shared/Footer";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";
import SeasonMatchupFilter, {
  SeasonMatchupPerGame,
  SeasonMatchupOnStats,
} from "../components/SeasonMatchupFilter";
import GenericCollapsibleCard from "../components/shared/GenericCollapsibleCard";
import QuickSwitchBar, {
  QuickSwitchSource,
} from "../components/shared/QuickSwitchBar";
import GenericTable, {
  GenericTableOps,
  GenericTableRow,
} from "../components/GenericTable";
import ToggleButtonGroup from "../components/shared/ToggleButtonGroup";
import GenericTogglingMenu from "../components/shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "../components/shared/GenericTogglingMenuItem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard, faDownload } from "@fortawesome/free-solid-svg-icons";
import { AnnotationMenuItems } from "../components/shared/AnnotationMenuItems";
import StickyRow from "../components/shared/StickyRow";
import { ImpactTableDefs } from "../utils/tables/ImpactTableDefs";
import {
  buildPerGameRapmCaches,
  buildSeasonRapmCache,
  buildGameImpactRowsFromCaches,
  buildGameImpactTableRows,
  buildTotalImpactRow,
  buildAverageImpactRow,
  buildTeamAverageImpactRow,
  SEASON_MATCHUP_TEAM_KEY,
  CHART_FIELD_OPTIONS,
  getScoreDiffForGame,
  getScoreStrForGame,
  getPlayerTooltipDataForGame,
  getPossPerGame,
  GameImpactRow,
} from "../utils/stats/ImpactBreakdownUtils";
import { GameAnalysisUtils } from "../utils/tables/GameAnalysisUtils";
import {
  buildGameQueryString,
  buildGameLabel,
} from "../utils/SeasonMatchupUtils";
import GameImpactDiagView, {
  GameImpactChartPoint,
  gameLabelToXAxisLabel,
  estimateXAxisLabelHeight,
} from "../components/diags/GameImpactDiagView";
import type { GameStatsCache } from "../utils/tables/GameAnalysisUtils";
import type { IndivStatSet } from "../utils/StatModels";
import { Statistic } from "../utils/StatModels";

export type ChartBackgroundType =
  | "Score Diff"
  | "SoS"
  | "SoS Offense"
  | "SoS Defense";

const CHART_BACKGROUND_OPTIONS: {
  value: ChartBackgroundType;
  label: string;
}[] = [
  { value: "Score Diff", label: "Score" },
  { value: "SoS", label: "SoS" },
  { value: "SoS Offense", label: "SoS Off." },
  { value: "SoS Defense", label: "SoS Def." },
];

/** Read off_adj_opp / def_adj_opp from game's teamStats (calculateOnOffStats bucket). */
function getSoSForGame(g: SeasonMatchupPerGame): {
  off: number;
  def: number;
} {
  const ts = (g as any).teamStats;
  const off = ts?.off_adj_opp?.value ?? 100;
  const def = ts?.def_adj_opp?.value ?? 100;
  return {
    off: typeof off === "number" ? off : 100,
    def: typeof def === "number" ? def : 100,
  };
}

const SeasonMatchupAnalyzerPage: React.FunctionComponent = () => {
  const isServer = typeof window === "undefined";
  const allParams = isServer ? "" : window.location.search;

  const [params, setParams] = useState<SeasonMatchupFilterParams>(
    UrlRouting.removedSavedKeys(allParams) as SeasonMatchupFilterParams,
  );
  const [dataEvent, setDataEvent] = useState<{
    games: SeasonMatchupPerGame[];
  }>({ games: [] });
  /** selectedPlayer holds player_id (ES aggregation key) or SEASON_MATCHUP_TEAM_KEY. */
  const [selectedPlayer, setSelectedPlayer] = useState<string>(
    SEASON_MATCHUP_TEAM_KEY,
  );
  /** Allows easy toggling between two players */
  const [lastSelectedPlayer, setLastSelectedPlayer] = useState<string>(
    SEASON_MATCHUP_TEAM_KEY,
  );
  const [perGameRapmCaches, setPerGameRapmCaches] = useState<GameStatsCache[]>(
    [],
  );
  const [seasonRapmCache, setSeasonRapmCache] = useState<GameStatsCache | null>(
    null,
  );
  const [scaleType, setScaleType] = useState<"P%" | "T%" | "/G">(
    (params.scaleType as "P%" | "T%" | "/G") ?? ParamDefaults.defaultScaleType,
  );
  const [adjBreakdownForSoS, setAdjBreakdownForSoS] = useState(
    params.adjustForOpponentStrength ?? false,
  );
  const [showTotalRow, setShowTotalRow] = useState(
    params.showTotalRow ?? ParamDefaults.defaultShowTotalRow,
  );
  const [showChart, setShowChart] = useState(params.showChart ?? true);
  const [chartLarge, setChartLarge] = useState(
    params.chartLarge ?? ParamDefaults.defaultChartLarge,
  );
  const [chartFieldKey, setChartFieldKey] = useState<keyof GameImpactRow>(
    (params.chartFieldKey as keyof GameImpactRow) ??
      ParamDefaults.defaultChartFieldKey,
  );
  const [chartBackground, setChartBackground] = useState<ChartBackgroundType>(
    (params.chartBackground as ChartBackgroundType) ??
      ParamDefaults.defaultChartBackground,
  );
  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    params.showRepeatingHeader ?? true,
  );
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    params.stickyQuickToggle ?? true,
  );
  const [primaryFilterPending, setPrimaryFilterPending] = useState(false);

  const paramsRef = React.useRef<SeasonMatchupFilterParams>(params);
  paramsRef.current = params;
  const lastUrlParamsRef = React.useRef<SeasonMatchupFilterParams>(params);
  const [lastSubmittedCommon, setLastSubmittedCommon] = useState<{
    team: string | undefined;
    year: string | undefined;
    gender: string | undefined;
  }>(() => ({
    team: params.team,
    year: params.year,
    gender: params.gender,
  }));
  const { resolvedTheme } = useTheme();

  const submitIsPending =
    params.team !== lastSubmittedCommon.team ||
    params.year !== lastSubmittedCommon.year ||
    params.gender !== lastSubmittedCommon.gender;

  const common = getCommonFilterParams(params);
  const genderYear = `${params.gender ?? ParamDefaults.defaultGender}_${params.year ?? ParamDefaults.defaultYear}`;
  const avgEfficiency =
    efficiencyAverages[genderYear] || efficiencyAverages.fallback;

  /** Player dropdown: Team first, then players in rosterStatsBaseline order (already sorted by poss). playerOptions[].title is player_id (ES aggregation key). */
  const playerOptions = useMemo(() => {
    const teamOption = { title: SEASON_MATCHUP_TEAM_KEY };
    const ids = new Set<string>();
    dataEvent.games.forEach((g) => {
      (g.rosterStats || []).forEach((r: { key?: string }) => {
        if (r.key) ids.add(r.key);
      });
    });
    const baseline =
      (
        dataEvent.games[0] as SeasonMatchupPerGame & {
          rosterStatsBaseline?: any[];
        }
      )?.rosterStatsBaseline ?? [];
    const inBaselineOrder = Array.isArray(baseline)
      ? baseline
          .map(
            (b: any) =>
              b.key ?? b.player_array?.hits?.hits?.[0]?._source?.player?.code,
          )
          .filter((id: string) => id && ids.has(id))
      : [];
    const rest = Array.from(ids)
      .filter((id) => !inBaselineOrder.includes(id))
      .sort();
    const sorted = [...inBaselineOrder, ...rest];
    return [teamOption, ...sorted.map((id) => ({ title: id }))];
  }, [dataEvent.games]);

  useEffect(() => {
    if (
      !primaryFilterPending &&
      params.presetGroup &&
      playerOptions.some((o) => o.title === params.presetGroup)
    ) {
      setSelectedPlayer(params.presetGroup);
    }
    if (params.adjustForOpponentStrength !== undefined) {
      setAdjBreakdownForSoS(params.adjustForOpponentStrength);
    }
    if (params.showTotalRow !== undefined) {
      setShowTotalRow(params.showTotalRow);
    }
    if (params.showChart !== undefined) {
      setShowChart(params.showChart);
    }
    if (params.chartLarge !== undefined) {
      setChartLarge(params.chartLarge);
    }
    if (params.scaleType !== undefined) {
      setScaleType(params.scaleType as "P%" | "T%" | "/G");
    }
    if (params.chartFieldKey !== undefined) {
      setChartFieldKey(params.chartFieldKey as keyof GameImpactRow);
    }
    if (params.chartBackground !== undefined) {
      setChartBackground(params.chartBackground as ChartBackgroundType);
    }
    if (params.showTotalRow !== undefined) {
      setShowTotalRow(params.showTotalRow);
    }
    if (params.showRepeatingHeader !== undefined) {
      setShowRepeatingHeader(params.showRepeatingHeader);
    }
    if (params.stickyQuickToggle !== undefined) {
      setStickyQuickToggle(params.stickyQuickToggle);
    }
  }, [
    primaryFilterPending,
    params.presetGroup,
    params.adjustForOpponentStrength,
    params.showChart,
    params.chartLarge,
    params.scaleType,
    params.chartFieldKey,
    params.chartBackground,
    params.showTotalRow,
    params.showRepeatingHeader,
    params.stickyQuickToggle,
    playerOptions,
  ]);

  useEffect(() => {
    if (!dataEvent.games.length) {
      setPerGameRapmCaches([]);
      setSeasonRapmCache(null);
      return;
    }
    setPerGameRapmCaches([]);
    setSeasonRapmCache(null);
    const commonParams = getCommonFilterParams(params);
    const caches = buildPerGameRapmCaches(
      dataEvent.games,
      commonParams,
      avgEfficiency,
    );
    setPerGameRapmCaches(caches);
    const seasonCache = buildSeasonRapmCache(
      dataEvent.games,
      commonParams,
      avgEfficiency,
    );
    setSeasonRapmCache(seasonCache);
  }, [dataEvent.games, params.team, params.year, params.gender, avgEfficiency]);

  const tableRows = useMemo(() => {
    if (
      !selectedPlayer ||
      !dataEvent.games.length ||
      perGameRapmCaches.length !== dataEvent.games.length
    ) {
      return [];
    }
    const impacts = buildGameImpactRowsFromCaches(
      perGameRapmCaches,
      dataEvent.games,
      selectedPlayer,
      avgEfficiency,
      scaleType,
      adjBreakdownForSoS,
    );
    const options = {
      games: dataEvent.games,
      scaleType,
      showTotalRow,
      ...(selectedPlayer !== SEASON_MATCHUP_TEAM_KEY
        ? {
            perGameCaches: perGameRapmCaches,
            playerCode: selectedPlayer,
            seasonCache: seasonRapmCache,
          }
        : { playerCode: selectedPlayer }),
    };
    const rows = buildGameImpactTableRows(impacts, options);
    const identityPrefix = (k: string) => k;
    const noCellMeta = () => "";
    const themedColorBuilder =
      resolvedTheme === "dark"
        ? CbbColors.off_diff10_p100_redGreen_darkMode
        : CbbColors.off_diff10_p100_redBlackGreen;

    const buildOneDataRow = (
      rowData: Record<string, Statistic | string | undefined>,
      gameIndex: number,
    ) => {
      if (gameIndex < 0) {
        const data =
          selectedPlayer === SEASON_MATCHUP_TEAM_KEY
            ? { ...rowData, team_poss_pct: { value: null } }
            : rowData;
        return GenericTableOps.buildDataRow(
          data,
          identityPrefix,
          noCellMeta,
          selectedPlayer === SEASON_MATCHUP_TEAM_KEY
            ? {
                off_gravity_bonus: GenericTableOps.addDataCol(
                  "",
                  "",
                  CbbColors.varPicker((val: number) =>
                    CbbColors.p_ast_breakdown(val * 0.1),
                  ),
                  GenericTableOps.pointsOrHtmlFormatter,
                ),
                def_gravity_bonus: GenericTableOps.addDataCol(
                  "",
                  "",
                  CbbColors.varPicker((val: number) =>
                    CbbColors.p_ast_breakdown(val * 0.1),
                  ),
                  GenericTableOps.pointsOrHtmlFormatter,
                ),
              }
            : undefined,
        );
      }
      const game = dataEvent.games[gameIndex];
      const impact = impacts[gameIndex];
      const scoreDiff = game ? getScoreDiffForGame(game) : 0;
      const scoreStr = game ? getScoreStrForGame(game) : "";
      const color = themedColorBuilder(scoreDiff) ?? "#888";
      const opponent = (impact?.gameLabel ?? "")
        .replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, "")
        .trim();
      const dateMatch = (impact?.gameLabel ?? "").match(
        /\((\d{4})-(\d{2})-(\d{2})\)/,
      );
      const mmDd = dateMatch ? `${dateMatch[2]}-${dateMatch[3]}` : "";
      const oppoTeamSuffix =
        game && scoreStr
          ? `${scoreDiff >= 0 ? "W " : "L "}${scoreStr}`
          : scoreStr;
      const href = UrlRouting.getMatchupUrl({
        team: params.team,
        year: params.year,
        gender: params.gender ?? ParamDefaults.defaultGender,
        minRank: params.minRank ?? ParamDefaults.defaultMinRank,
        maxRank: params.maxRank ?? ParamDefaults.defaultMaxRank,
        ...(game
          ? {
              baseQuery: buildGameQueryString(game.gameInfo),
              oppoTeam: `${buildGameLabel(game.gameInfo)}: ${oppoTeamSuffix}`,
              adjImpactStats: adjBreakdownForSoS,
              impactPerGame: scaleType == "/G",
              factorMins: scaleType != "P%",
              showImpactBreakdown: true,
            }
          : {}),
      } as any);
      const gameTooltipData =
        selectedPlayer !== SEASON_MATCHUP_TEAM_KEY &&
        perGameRapmCaches[gameIndex]
          ? getPlayerTooltipDataForGame(
              perGameRapmCaches[gameIndex],
              selectedPlayer,
            )
          : null;
      const titleNode = (
        <>
          <span style={{ color }}>{scoreStr}</span>{" "}
          <OverlayTrigger
            overlay={
              <Tooltip id={`game-detail-${gameIndex}`}>
                {gameTooltipData ? (
                  <>
                    {GameAnalysisUtils.buildPlayerTooltipContents(
                      impact?.gameLabel ?? "",
                      gameTooltipData.stats,
                      gameTooltipData.onOffStats,
                      gameTooltipData.posInfo,
                      false,
                      scaleType === "/G" ? getPossPerGame(game) : undefined,
                    )}
                    Click to open in new page
                  </>
                ) : (
                  "Click here to view details for this game"
                )}
              </Tooltip>
            }
          >
            <a href={href} target="_blank" rel="noopener noreferrer">
              {opponent} <sup>{mmDd}</sup>
            </a>
          </OverlayTrigger>
        </>
      );
      const data: Record<string, unknown> = {
        ...rowData,
        title: titleNode,
      };
      if (selectedPlayer === SEASON_MATCHUP_TEAM_KEY) {
        (data as any).team_poss_pct = { value: null };
      }
      return GenericTableOps.buildDataRow(
        data,
        identityPrefix,
        noCellMeta,
        selectedPlayer === SEASON_MATCHUP_TEAM_KEY
          ? {
              off_gravity_bonus: GenericTableOps.addDataCol(
                "",
                "",
                CbbColors.varPicker((val: number) =>
                  CbbColors.p_ast_breakdown(val * 0.1),
                ),
                GenericTableOps.pointsOrHtmlFormatter,
              ),
              def_gravity_bonus: GenericTableOps.addDataCol(
                "",
                "",
                CbbColors.varPicker((val: number) =>
                  CbbColors.p_ast_breakdown(val * 0.1),
                ),
                GenericTableOps.pointsOrHtmlFormatter,
              ),
            }
          : undefined,
      );
    };

    const separator = GenericTableOps.buildRowSeparator("1px");
    let idx = 0;
    const result: GenericTableRow[] = [];
    if (showTotalRow && rows.length > 0) {
      result.push(buildOneDataRow(rows[0], -1), separator);
      idx = 1;
    }
    if (options && rows.length > idx) {
      result.push(buildOneDataRow(rows[idx], -1), separator);
      idx++;
    }
    const dataRows = rows
      .slice(idx)
      .map((rowData, i) => buildOneDataRow(rowData, i));
    const repeatHeader = GenericTableOps.buildHeaderRepeatRow(
      ImpactTableDefs.repeatingLineupHeaderFields,
      "small",
    );
    let dataRowCount = 0;
    for (const row of dataRows) {
      result.push(row);
      dataRowCount++;
      if (
        showRepeatingHeader &&
        dataRowCount % 10 === 0 &&
        dataRowCount < dataRows.length
      ) {
        result.push(repeatHeader);
      }
    }
    return result;
  }, [
    selectedPlayer,
    dataEvent.games,
    perGameRapmCaches,
    seasonRapmCache,
    avgEfficiency,
    scaleType,
    adjBreakdownForSoS,
    showTotalRow,
    showRepeatingHeader,
    resolvedTheme,
    params,
  ]);

  const impactRows = useMemo(() => {
    if (
      !selectedPlayer ||
      !dataEvent.games.length ||
      perGameRapmCaches.length !== dataEvent.games.length
    ) {
      return [];
    }
    return buildGameImpactRowsFromCaches(
      perGameRapmCaches,
      dataEvent.games,
      selectedPlayer,
      avgEfficiency,
      scaleType,
      adjBreakdownForSoS,
    );
  }, [
    selectedPlayer,
    dataEvent.games,
    perGameRapmCaches,
    avgEfficiency,
    scaleType,
    adjBreakdownForSoS,
  ]);

  const chartData = useMemo((): GameImpactChartPoint[] => {
    if (impactRows.length !== dataEvent.games.length) return [];
    return impactRows.map((row, i) => {
      const g = dataEvent.games[i];
      const cell = row[chartFieldKey];
      const value =
        cell && typeof cell === "object" && "value" in cell
          ? (cell as { value: number }).value
          : 0;
      const scoreDiff = g ? getScoreDiffForGame(g) : 0;
      let backgroundValue: number | undefined;
      if (chartBackground !== "Score Diff" && g) {
        const sos = getSoSForGame(g);
        if (chartBackground === "SoS") backgroundValue = sos.off - sos.def;
        else if (chartBackground === "SoS Offense") backgroundValue = sos.off;
        else if (chartBackground === "SoS Defense") backgroundValue = sos.def;
      }
      return {
        gameLabel: row.gameLabel,
        value,
        scoreDiff,
        ...(backgroundValue !== undefined && { backgroundValue }),
      };
    });
  }, [impactRows, dataEvent.games, chartFieldKey, chartBackground]);

  /** Themed red-to-green scale: delta from avgEfficiency, domain [-15,0,15] for SoS; domain [-30,0,30] for Score Diff. */
  const chartBackgroundColorFn = useMemo((): ((val: number) => string) => {
    const scale =
      resolvedTheme === "dark"
        ? CbbColors.getRedToGreenViaDarkBackground()
        : CbbColors.getRedToGreen();
    const scoreDiffDomain: [number, number, number] = [-30, 0, 30];
    const sosDeltaDomain: [number, number, number] = [-15, 0, 15];
    if (chartBackground === "Score Diff") {
      return (val: number) => scale.domain(scoreDiffDomain)(val).toString();
    } else if (chartBackground === "SoS Offense") {
      return (val: number) =>
        scale
          .domain(sosDeltaDomain)(avgEfficiency - val)
          .toString();
    } else if (chartBackground === "SoS Defense") {
      return (val: number) =>
        scale
          .domain(sosDeltaDomain)(val - avgEfficiency)
          .toString();
    } else {
      //(SoS)
      return (val: number) => scale.domain(scoreDiffDomain)(val).toString();
    }
  }, [chartBackground, resolvedTheme, avgEfficiency]);

  const paddingBelowChart = 8;
  const chartHeightAndLabelSpace = useMemo(() => {
    const topMargin = 5;
    const barArea = chartLarge ? 420 : 140;
    if (chartData.length === 0)
      return {
        chartHeight: topMargin + barArea + 70 + paddingBelowChart,
        labelAreaHeight: 70,
      };
    const maxLabelLen = Math.max(
      ...chartData.map((d) => gameLabelToXAxisLabel(d.gameLabel).length),
    );
    const labelAreaHeight = estimateXAxisLabelHeight(maxLabelLen);
    return {
      chartHeight: topMargin + barArea + labelAreaHeight + paddingBelowChart,
      labelAreaHeight,
    };
  }, [chartData, chartLarge]);

  const onSeasonMatchupStats: SeasonMatchupOnStats = (data) => {
    setDataEvent({ games: data.games });
    setLastSubmittedCommon({
      team: paramsRef.current.team,
      year: paramsRef.current.year,
      gender: paramsRef.current.gender,
    });
  };

  const getRootUrl = (p: SeasonMatchupFilterParams) =>
    UrlRouting.getSeasonMatchupUrl(p);

  const onChangeState = (raw: SeasonMatchupFilterParams) => {
    setPrimaryFilterPending(false);
    const keysToOmit: string[] = [];
    if (!raw.team) keysToOmit.push("team");
    if (!raw.year) keysToOmit.push("year");
    if (raw.gender === ParamDefaults.defaultGender) keysToOmit.push("gender");
    if (raw.advancedMode === false) keysToOmit.push("advancedMode");
    if (raw.presetMode === ParamDefaults.defaultPresetMode)
      keysToOmit.push("presetMode");
    if (raw.presetGroup === SEASON_MATCHUP_TEAM_KEY)
      keysToOmit.push("presetGroup");
    if (raw.adjustForOpponentStrength === false)
      keysToOmit.push("adjustForOpponentStrength");
    if (raw.showChart === true) keysToOmit.push("showChart");
    if (
      raw.chartLarge == null ||
      raw.chartLarge === ParamDefaults.defaultChartLarge
    )
      keysToOmit.push("chartLarge");
    if (
      raw.scaleType == null ||
      raw.scaleType === ParamDefaults.defaultScaleType
    )
      keysToOmit.push("scaleType");
    if (
      raw.chartFieldKey == null ||
      raw.chartFieldKey === ParamDefaults.defaultChartFieldKey
    )
      keysToOmit.push("chartFieldKey");
    if (
      raw.chartBackground == null ||
      raw.chartBackground === ParamDefaults.defaultChartBackground
    )
      keysToOmit.push("chartBackground");
    if (raw.showTotalRow === false) keysToOmit.push("showTotalRow");
    if (raw.showRepeatingHeader === true)
      keysToOmit.push("showRepeatingHeader");
    if (raw.stickyQuickToggle === true) keysToOmit.push("stickyQuickToggle");
    const next = keysToOmit.length > 0 ? _.omit(raw, keysToOmit) : raw;
    setParams(raw);
    if (!_.isEqual(next, lastUrlParamsRef.current)) {
      lastUrlParamsRef.current = next;
      Router.replace(getRootUrl(next), undefined, { shallow: true });
    }
  };

  const friendlyChange = (
    fn: () => void,
    changed: boolean,
    urlSlice?: Partial<SeasonMatchupFilterParams>,
  ) => {
    fn();
    if (changed && !submitIsPending && urlSlice) {
      onChangeState({ ...params, ...urlSlice });
    }
  };

  const DISPLAYED_FIELDS: (keyof GameImpactRow)[] = [
    "team_poss_pct",
    "diff_adj_rapm",
    "off_adj_rapm",
    "def_adj_rapm",
    "off_net_3p",
    "off_net_mid",
    "off_net_rim",
    "off_net_ft",
    "off_net_ast",
    "off_net_to",
    "off_net_orb",
    "off_sos_bonus",
    "off_gravity_bonus",
    "def_net_team",
    "def_net_stks",
    "def_net_drb",
    "def_sos_bonus",
    "def_gravity_bonus",
  ];
  const BREAKDOWN_FIELDS: (keyof GameImpactRow)[] = [
    "off_net_ast_2p",
    "off_net_ast_3p",
    "off_net_pts_wowy",
    "off_net_pts_volume",
    "def_net_pts_wowy",
    "def_net_stl",
    "def_net_blk",
  ];

  /** Tooltip/box-score columns for player/game rows only (match GameAnalysisUtils.buildPlayerTooltipContents). */
  const PLAYER_GAME_TOOLTIP_COLUMNS = [
    "off_rtg",
    "usage_pct",
    "mpg",
    "3pm",
    "3pa",
    "2pmid_m",
    "2pmid_a",
    "2prim_m",
    "2prim_a",
    "ftm",
    "fta",
    "assists",
    "tos",
    "fouls",
    "stls",
    "blks",
    "orbs",
    "drbs",
  ];

  const getPlayerGameTooltipCells = (stats: IndivStatSet | null): string[] => {
    if (!stats) return PLAYER_GAME_TOOLTIP_COLUMNS.map(() => "");
    const v = (k: string) =>
      (stats as Record<string, { value?: number }>)[k]?.value ?? 0;
    const offRtg = v("off_rtg");
    const usagePct = (v("off_usage") * 100).toFixed(1);
    const mpg = ((v("off_team_poss_pct") || 0) * 40).toFixed(1);
    return [
      String(offRtg.toFixed(1)),
      usagePct,
      mpg,
      String(Math.round(v("total_off_3p_made"))),
      String(Math.round(v("total_off_3p_attempts"))),
      String(Math.round(v("total_off_2pmid_made"))),
      String(Math.round(v("total_off_2pmid_attempts"))),
      String(Math.round(v("total_off_2prim_made"))),
      String(Math.round(v("total_off_2prim_attempts"))),
      String(Math.round(v("total_off_ftm"))),
      String(Math.round(v("total_off_fta"))),
      String(Math.round(v("total_off_assist"))),
      String(Math.round(v("total_off_to"))),
      String(Math.round(v("total_off_fouls"))),
      String(Math.round(v("total_off_stl"))),
      String(Math.round(v("total_off_blk"))),
      String(Math.round(v("total_off_orb"))),
      String(Math.round(v("total_off_drb"))),
    ];
  };

  const buildExportStr = (): string => {
    if (
      !dataEvent.games.length ||
      perGameRapmCaches.length !== dataEvent.games.length
    ) {
      return "";
    }
    const escapeCsv = (v: string | number): string => {
      const s = String(v ?? "");
      if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const getVal = (row: GameImpactRow, key: keyof GameImpactRow): number => {
      const c = row[key];
      if (c && typeof c === "object" && "value" in c)
        return (c as Statistic).value ?? 0;
      return 0;
    };
    const getValOrBlank = (
      row: GameImpactRow,
      key: keyof GameImpactRow,
      blankIfNull: boolean,
    ): string => {
      if (key === "team_poss_pct" && blankIfNull) return "";
      const c = row[key];
      if (c && typeof c === "object" && "value" in c) {
        const v = (c as Statistic).value;
        if (v == null) return "";
        return String(v);
      }
      return "";
    };
    /** CSV columns: id = ncaa_id, name = player_id (long form), code = player_code (short form, roster index). */
    const rowToCells = (
      ncaaId: string,
      playerId: string,
      playerCode: string,
      opponent: string,
      row: GameImpactRow,
      blankTeamPossPct: boolean,
    ): string[] => [
      escapeCsv(ncaaId),
      escapeCsv(playerId),
      escapeCsv(playerCode),
      escapeCsv(opponent),
      ...DISPLAYED_FIELDS.map((k) => getValOrBlank(row, k, blankTeamPossPct)),
      ...BREAKDOWN_FIELDS.map((k) => String(getVal(row, k))),
    ];
    /** rosterInfo is keyed by player_code (short form, e.g. "AnMills"). Each entry has player_code_id.id (player_id, long form) and player_code_id.ncaa_id. */
    const rosterInfo = dataEvent.games[0]?.rosterInfo as
      | Record<
          string,
          { player_code_id?: { id?: string; ncaa_id?: string }; name?: string }
        >
      | undefined;
    const teamName = params.team ?? "";
    const header = [
      "id",
      "name",
      "code",
      "opponent",
      ...DISPLAYED_FIELDS,
      ...BREAKDOWN_FIELDS,
      ...PLAYER_GAME_TOOLTIP_COLUMNS,
    ].join(",");
    const rows: string[] = [];
    const games = dataEvent.games;
    const sortedGameIndices = _.orderBy(
      games.map((_, i) => i),
      [(i) => (games[i].gameInfo as { date?: string })?.date ?? ""],
      ["desc"],
    );

    // 1. Team season breakdown (Totals then Average)
    const teamImpacts = buildGameImpactRowsFromCaches(
      perGameRapmCaches,
      games,
      SEASON_MATCHUP_TEAM_KEY,
      avgEfficiency,
      scaleType,
      adjBreakdownForSoS,
    );
    const teamTotalRow = buildTotalImpactRow(teamImpacts, true);
    const teamAvgRow = buildTeamAverageImpactRow(teamImpacts);
    rows.push(
      rowToCells(
        teamName,
        teamName,
        SEASON_MATCHUP_TEAM_KEY,
        "Season Totals",
        teamTotalRow,
        true,
      )
        .concat(getPlayerGameTooltipCells(null))
        .join(","),
    );
    rows.push(
      rowToCells(
        teamName,
        teamName,
        SEASON_MATCHUP_TEAM_KEY,
        "Season Average",
        teamAvgRow,
        true,
      )
        .concat(getPlayerGameTooltipCells(null))
        .join(","),
    );

    // 2. Each player's season breakdown (Totals then Average)
    /** playerOptions[].title is player_id (ES aggregation key, long form e.g. "Mills, Andre"). */
    const players = playerOptions.filter(
      (o) => o.title !== SEASON_MATCHUP_TEAM_KEY,
    );
    const playerImpactsByPlayerId: Record<string, GameImpactRow[]> = {};
    for (const opt of players) {
      const player_id = opt.title;
      const impacts = buildGameImpactRowsFromCaches(
        perGameRapmCaches,
        games,
        player_id,
        avgEfficiency,
        scaleType,
        adjBreakdownForSoS,
      );
      playerImpactsByPlayerId[player_id] = impacts;
      const found = rosterInfo
        ? Object.entries(rosterInfo).find(
            ([, v]) => v?.player_code_id?.id === player_id,
          )
        : null;
      const player_code = found?.[0] ?? "";
      const entry = found?.[1];
      const ncaaId = entry?.player_code_id?.ncaa_id ?? "";
      const totalRow = buildTotalImpactRow(impacts, false);
      const avgRow = buildAverageImpactRow(
        perGameRapmCaches,
        games,
        impacts,
        player_id,
        scaleType,
        seasonRapmCache,
      );
      rows.push(
        rowToCells(
          ncaaId,
          player_id,
          player_code,
          "Season Totals",
          totalRow,
          true,
        )
          .concat(getPlayerGameTooltipCells(null))
          .join(","),
      );
      rows.push(
        rowToCells(
          ncaaId,
          player_id,
          player_code,
          "Season Average",
          avgRow,
          false,
        )
          .concat(getPlayerGameTooltipCells(null))
          .join(","),
      );
    }

    // 3. Per-game rows (newest first): team then each player for that game
    for (const gameIdx of sortedGameIndices) {
      const g = games[gameIdx];
      const opponentLabel =
        (g as SeasonMatchupPerGame & { gameLabel?: string }).gameLabel ??
        buildGameLabel(g.gameInfo as any);
      const teamGameRow = teamImpacts[gameIdx];
      rows.push(
        rowToCells(
          teamName,
          teamName,
          SEASON_MATCHUP_TEAM_KEY,
          opponentLabel,
          teamGameRow,
          true,
        )
          .concat(getPlayerGameTooltipCells(null))
          .join(","),
      );
      for (const opt of players) {
        const player_id = opt.title;
        const found = rosterInfo
          ? Object.entries(rosterInfo).find(
              ([, v]) => v?.player_code_id?.id === player_id,
            )
          : null;
        const player_code = found?.[0] ?? "";
        const entry = found?.[1];
        const ncaaId = entry?.player_code_id?.ncaa_id ?? "";
        const playerGameRow = playerImpactsByPlayerId[player_id]?.[gameIdx];
        if (playerGameRow) {
          const tooltipData = getPlayerTooltipDataForGame(
            perGameRapmCaches[gameIdx],
            player_id,
          );
          rows.push(
            rowToCells(
              ncaaId,
              player_id,
              player_code,
              opponentLabel,
              playerGameRow,
              false,
            )
              .concat(getPlayerGameTooltipCells(tooltipData?.stats ?? null))
              .join(","),
          );
        }
      }
    }

    return [header].concat(rows).join("\n");
  };

  const optionsDropdown = (
    <GenericTogglingMenu>
      <AnnotationMenuItems friendlyChange={friendlyChange} />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text={
          <span>
            <FontAwesomeIcon icon={faClipboard} />
            {"  "}Export all players to CSV
          </span>
        }
        truthVal={false}
        onSelect={() => {
          friendlyChange(() => {
            navigator.clipboard.writeText(buildExportStr());
          }, true);
        }}
      />
      <GenericTogglingMenuItem
        text={
          <span>
            <FontAwesomeIcon icon={faDownload} />
            {"  "}Export all players to CSV
          </span>
        }
        truthVal={false}
        onSelect={() => {
          friendlyChange(() => {
            const blob = new Blob([buildExportStr()], {
              type: "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "season_matchup_impact.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, true);
        }}
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        text={"Show repeating header every 10 rows"}
        truthVal={showRepeatingHeader}
        onSelect={() =>
          friendlyChange(
            () => setShowRepeatingHeader(!showRepeatingHeader),
            true,
            { showRepeatingHeader: !showRepeatingHeader },
          )
        }
      />
      <Dropdown.Divider />
      <GenericTogglingMenuItem
        className="d-none d-md-flex"
        text="'Quick Select' Bar Is Sticky"
        truthVal={stickyQuickToggle}
        onSelect={() =>
          friendlyChange(() => setStickyQuickToggle(!stickyQuickToggle), true, {
            stickyQuickToggle: !stickyQuickToggle,
          })
        }
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

  if (isServer) return null;

  const server =
    typeof window === "undefined" ? "server" : window.location.hostname;

  return (
    <Container className="medium_screen">
      <SiteModeDropdown />
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Season Matchup Analyzer</h3>
        </Col>
      </Row>
      <Row>
        <HeaderBar common={common} thisPage="season-matchup" />
      </Row>
      <Row>
        <GenericCollapsibleCard
          minimizeMargin={false}
          screenSize="medium_screen"
          title="Team and season"
          summary={
            params.team && params.year
              ? `${params.team} ${params.year}`
              : "Select team and year"
          }
        >
          <SeasonMatchupFilter
            onStats={onSeasonMatchupStats}
            startingState={params}
            onChangeState={onChangeState}
            playerOptions={playerOptions}
            onPrimaryFilterPendingChange={setPrimaryFilterPending}
            selectedPlayerNcaaId={
              selectedPlayer &&
              selectedPlayer !== SEASON_MATCHUP_TEAM_KEY &&
              dataEvent.games[0]?.rosterInfo
                ? (() => {
                    // selectedPlayer is player_id; find roster entry by player_code_id.id === selectedPlayer
                    const roster = dataEvent.games[0].rosterInfo as Record<
                      string,
                      { player_code_id?: { id?: string; ncaa_id?: string } }
                    >;
                    const entry = Object.values(roster).find(
                      (r) => r?.player_code_id?.id === selectedPlayer,
                    );
                    return entry?.player_code_id?.ncaa_id;
                  })()
                : undefined
            }
          />
        </GenericCollapsibleCard>
      </Row>
      {dataEvent.games.length > 0 && (
        <Row className="mt-3">
          <Col xs={12}>
            <GenericCollapsibleCard
              minimizeMargin={true}
              screenSize="medium_screen"
              title="Player impact by game"
            >
              <div className="px-3">
                <QuickSwitchBar
                  title=" "
                  titlePrefix=" "
                  toggleText="Select:"
                  hideSelected={true}
                  quickSwitch={selectedPlayer}
                  quickSwitchExtra={undefined}
                  quickSwitchOptions={playerOptions}
                  updateQuickSwitch={(
                    quickSwitch: string | undefined,
                    _newTitle: string | undefined,
                    _source: QuickSwitchSource,
                    _fromTimer: boolean,
                  ) => {
                    const next = quickSwitch ?? lastSelectedPlayer;
                    setLastSelectedPlayer(selectedPlayer);
                    setSelectedPlayer(next);
                    if (!submitIsPending) {
                      onChangeState({
                        ...params,
                        presetGroup: next,
                      });
                    }
                  }}
                  quickSwitchTimer={undefined}
                  modes={["link"]}
                  setQuickSwitchTimer={() => null}
                />
                <Row>
                  <Col className="text-center">
                    <h2 className="h3 mb-2 mt-2">
                      [
                      {SEASON_MATCHUP_TEAM_KEY == selectedPlayer
                        ? lastSubmittedCommon.team
                        : selectedPlayer}
                      ] Analysis
                    </h2>
                  </Col>
                </Row>
                <StickyRow
                  className="pt-1"
                  stickyEnabled={stickyQuickToggle}
                  topOffset="0px"
                >
                  <Col sm="11">
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-2 mt-2">
                      <ToggleButtonGroup
                        labelOverride="Quick Select:"
                        items={[
                          {
                            label: "Chart",
                            tooltip: "Show per-game impact chart",
                            toggled: showChart,
                            onClick: () => {
                              const next = !showChart;
                              setShowChart(next);
                              if (!submitIsPending) {
                                onChangeState({ ...params, showChart: next });
                              }
                            },
                          },
                          {
                            label: "L",
                            tooltip: "Make chart 3× taller",
                            toggled: chartLarge,
                            onClick: () => {
                              const next = !chartLarge;
                              setChartLarge(next);
                              if (!submitIsPending) {
                                onChangeState({ ...params, chartLarge: next });
                              }
                            },
                          },
                          {
                            label: "| ",
                            tooltip: "",
                            toggled: true,
                            onClick: () => {},
                            isLabelOnly: true,
                          },
                          {
                            label: "Adj",
                            tooltip:
                              "Include SoS adjustment in calcs (means total net won't sum to score differential)",
                            toggled: adjBreakdownForSoS,
                            onClick: () => {
                              const next = !adjBreakdownForSoS;
                              setAdjBreakdownForSoS(next);
                              if (!submitIsPending) {
                                onChangeState({
                                  ...params,
                                  adjustForOpponentStrength: next,
                                });
                              }
                            },
                          },
                          {
                            label: "\u03A3",
                            tooltip:
                              "Show/hide the total net points over all games in each category",
                            toggled: showTotalRow,
                            onClick: () => {
                              const next = !showTotalRow;
                              setShowTotalRow(next);
                              if (!submitIsPending) {
                                onChangeState({
                                  ...params,
                                  showTotalRow: next,
                                });
                              }
                            },
                          },
                          {
                            label: "| ",
                            tooltip: "",
                            toggled: true,
                            onClick: () => {},
                            isLabelOnly: true,
                          },
                          {
                            items: [
                              {
                                label: (
                                  <small>
                                    P<sup>%</sup>
                                  </small>
                                ),
                                tooltip: `P%: Impact per 100 possessions when on court`,
                                toggled: scaleType === "P%",
                                onClick: () => {
                                  setScaleType("P%");
                                  if (!submitIsPending) {
                                    onChangeState({
                                      ...params,
                                      scaleType: "P%",
                                    });
                                  }
                                },
                              },
                              {
                                label: (
                                  <small>
                                    T<sup>%</sup>
                                  </small>
                                ),
                                tooltip: `T%: Impact per 100 team possessions`,
                                toggled: scaleType === "T%",
                                onClick: () => {
                                  setScaleType("T%");
                                  if (!submitIsPending) {
                                    onChangeState({
                                      ...params,
                                      scaleType: "T%",
                                    });
                                  }
                                },
                              },
                              {
                                label: (
                                  <small>
                                    <sup>/</sup>G
                                  </small>
                                ),
                                tooltip: `/G: Impact per game`,
                                toggled: scaleType === "/G",
                                onClick: () => {
                                  setScaleType("/G");
                                  if (!submitIsPending) {
                                    onChangeState({
                                      ...params,
                                      scaleType: "/G",
                                    });
                                  }
                                },
                              },
                            ],
                          },
                          {
                            label: "| ",
                            tooltip: "",
                            toggled: true,
                            onClick: () => {},
                            isLabelOnly: true,
                          },
                        ]}
                      />
                      <span className="small text-muted pr-2">
                        Chart Field:
                      </span>
                      <Form.Control
                        as="select"
                        size="sm"
                        style={{ width: "auto" }}
                        value={chartFieldKey}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const next = e.target.value as keyof GameImpactRow;
                          setChartFieldKey(next);
                          if (!submitIsPending) {
                            onChangeState({ ...params, chartFieldKey: next });
                          }
                        }}
                      >
                        {CHART_FIELD_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </Form.Control>
                      <span className="small px-2">|</span>
                      <span className="small text-muted pr-2">Background:</span>
                      <Form.Control
                        as="select"
                        size="sm"
                        style={{ width: "auto" }}
                        value={chartBackground}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const next = e.target.value as ChartBackgroundType;
                          setChartBackground(next);
                          if (!submitIsPending) {
                            onChangeState({ ...params, chartBackground: next });
                          }
                        }}
                      >
                        {CHART_BACKGROUND_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Form.Control>
                    </div>
                  </Col>
                  <Form.Group as={Col} sm="1" className="mb-0">
                    {optionsDropdown}
                  </Form.Group>
                </StickyRow>
                {showChart && chartData.length > 0 && (
                  <div
                    className="mb-2"
                    style={{ position: "relative", zIndex: 2 }}
                  >
                    <GameImpactDiagView
                      data={chartData}
                      fieldLabel={
                        CHART_FIELD_OPTIONS.find((o) => o.key === chartFieldKey)
                          ?.label ?? "Net"
                      }
                      height={chartHeightAndLabelSpace.chartHeight}
                      labelAreaHeight={chartHeightAndLabelSpace.labelAreaHeight}
                      paddingBelowChart={paddingBelowChart}
                      backgroundColorFn={chartBackgroundColorFn}
                      customTooltipContent={
                        selectedPlayer !== SEASON_MATCHUP_TEAM_KEY &&
                        perGameRapmCaches.length === chartData.length
                          ? (point, index) => {
                              const tooltipData = getPlayerTooltipDataForGame(
                                perGameRapmCaches[index],
                                selectedPlayer,
                              );
                              if (!tooltipData) return null;
                              const game = dataEvent.games[index];
                              const perGamePossIn =
                                scaleType === "/G" && game
                                  ? getPossPerGame(game)
                                  : undefined;
                              return GameAnalysisUtils.buildPlayerTooltipContents(
                                point.gameLabel,
                                tooltipData.stats,
                                tooltipData.onOffStats,
                                tooltipData.posInfo,
                                false,
                                perGamePossIn,
                              );
                            }
                          : undefined
                      }
                    />
                  </div>
                )}
                {selectedPlayer && tableRows.length > 0 ? (
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <GenericTable
                      tableCopyId="seasonMatchup_impact"
                      tableFields={ImpactTableDefs.impactDecompTable}
                      tableData={tableRows}
                      cellTooltipMode="missing"
                    />
                  </div>
                ) : (
                  <p className="small text-muted mb-0">
                    {!selectedPlayer
                      ? "Select a player above to see per-game impact."
                      : perGameRapmCaches.length !== dataEvent.games.length
                        ? "Computing RAPM…"
                        : "Loading…"}
                  </p>
                )}
              </div>
            </GenericCollapsibleCard>
          </Col>
        </Row>
      )}
      <Footer year={params.year} gender={params.gender} server={server} />
    </Container>
  );
};

export default SeasonMatchupAnalyzerPage;
