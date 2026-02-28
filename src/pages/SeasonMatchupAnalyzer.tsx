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
import GenericTable, { GenericTableOps } from "../components/GenericTable";
import ToggleButtonGroup from "../components/shared/ToggleButtonGroup";
import { IndivTableDefs } from "../utils/tables/IndivTableDefs";
import {
  buildPerGameRapmCaches,
  buildSeasonRapmCache,
  buildGameImpactRowsFromCaches,
  buildGameImpactTableRows,
  SEASON_MATCHUP_TEAM_KEY,
  CHART_FIELD_OPTIONS,
  getScoreDiffForGame,
  getScoreStrForGame,
  getPlayerTooltipDataForGame,
  getPossPerGame,
} from "../utils/SeasonMatchupImpactUtils";
import type { GameImpactRow } from "../utils/SeasonMatchupImpactUtils";
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
import { Statistic } from "../utils/StatModels";

const SeasonMatchupAnalyzerPage: React.FunctionComponent = () => {
  const isServer = typeof window === "undefined";
  const allParams = isServer ? "" : window.location.search;

  const [params, setParams] = useState<SeasonMatchupFilterParams>(
    UrlRouting.removedSavedKeys(allParams) as SeasonMatchupFilterParams,
  );
  const [dataEvent, setDataEvent] = useState<{
    games: SeasonMatchupPerGame[];
  }>({ games: [] });
  const [selectedPlayer, setSelectedPlayer] = useState<string>(
    SEASON_MATCHUP_TEAM_KEY,
  );
  const [quickSwitchExtra, setQuickSwitchExtra] = useState<
    "extra" | "diff" | undefined
  >(undefined);
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
  const [showChart, setShowChart] = useState(params.showChart ?? true);
  const [chartLarge, setChartLarge] = useState(
    params.chartLarge ?? ParamDefaults.defaultChartLarge,
  );
  const [chartFieldKey, setChartFieldKey] = useState<keyof GameImpactRow>(
    (params.chartFieldKey as keyof GameImpactRow) ??
      ParamDefaults.defaultChartFieldKey,
  );
  const [primaryFilterPending, setPrimaryFilterPending] = useState(false);

  const paramsRef = React.useRef<SeasonMatchupFilterParams>(params);
  paramsRef.current = params;
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

  const playerOptions = useMemo(() => {
    const teamOption = { title: SEASON_MATCHUP_TEAM_KEY };
    const codes = new Set<string>();
    dataEvent.games.forEach((g) => {
      (g.rosterStats || []).forEach((r: { key?: string }) => {
        if (r.key) codes.add(r.key);
      });
    });
    return [teamOption, ...Array.from(codes).map((code) => ({ title: code }))];
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
  }, [
    primaryFilterPending,
    params.presetGroup,
    params.adjustForOpponentStrength,
    params.showChart,
    params.chartLarge,
    params.scaleType,
    params.chartFieldKey,
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
    const tableDefs = IndivTableDefs.impactDecompTable;
    const themedColorBuilder =
      resolvedTheme === "dark"
        ? CbbColors.off_diff10_p100_redGreen_darkMode
        : CbbColors.off_diff10_p100_redBlackGreen;

    const buildOneDataRow = (
      rowData: Record<string, Statistic | string | undefined>,
      gameIndex: number,
    ) => {
      if (gameIndex < 0) {
        return GenericTableOps.buildDataRow(
          rowData,
          identityPrefix,
          noCellMeta,
          undefined,
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

    if (options) {
      const averageRow = buildOneDataRow(rows[0], -1);
      const separator = GenericTableOps.buildRowSeparator("1px");
      const gameRows = rows
        .slice(1)
        .map((rowData, i) => buildOneDataRow(rowData, i));
      return [averageRow, separator, ...gameRows];
    }
    return rows.map((rowData, i) => buildOneDataRow(rowData, i));
  }, [
    selectedPlayer,
    dataEvent.games,
    perGameRapmCaches,
    seasonRapmCache,
    avgEfficiency,
    scaleType,
    adjBreakdownForSoS,
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
      return {
        gameLabel: row.gameLabel,
        value,
        scoreDiff: g ? getScoreDiffForGame(g) : 0,
      };
    });
  }, [impactRows, dataEvent.games, chartFieldKey]);

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
    const next = keysToOmit.length > 0 ? _.omit(raw, keysToOmit) : raw;
    if (!_.isEqual(next, paramsRef.current)) {
      Router.replace(getRootUrl(next), undefined, { shallow: true });
      setParams(next);
    }
  };

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
                  quickSwitch={selectedPlayer}
                  quickSwitchExtra={undefined}
                  quickSwitchOptions={playerOptions}
                  updateQuickSwitch={(
                    quickSwitch: string | undefined,
                    _newTitle: string | undefined,
                    _source: QuickSwitchSource,
                    _fromTimer: boolean,
                  ) => {
                    const next = quickSwitch ?? SEASON_MATCHUP_TEAM_KEY;
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
                      [{selectedPlayer ?? SEASON_MATCHUP_TEAM_KEY}] Analysis
                    </h2>
                  </Col>
                </Row>
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
                                onChangeState({ ...params, scaleType: "P%" });
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
                                onChangeState({ ...params, scaleType: "T%" });
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
                                onChangeState({ ...params, scaleType: "/G" });
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
                  <span className="small text-muted pr-2">Chart Field:</span>
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
                </div>
                {showChart && chartData.length > 0 && (
                  <div className="mb-2">
                    <GameImpactDiagView
                      data={chartData}
                      fieldLabel={
                        CHART_FIELD_OPTIONS.find((o) => o.key === chartFieldKey)
                          ?.label ?? "Net"
                      }
                      height={chartHeightAndLabelSpace.chartHeight}
                      labelAreaHeight={chartHeightAndLabelSpace.labelAreaHeight}
                      paddingBelowChart={paddingBelowChart}
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
                  <GenericTable
                    tableCopyId="seasonMatchup_impact"
                    tableFields={IndivTableDefs.impactDecompTable}
                    tableData={tableRows}
                    cellTooltipMode="missing"
                  />
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
