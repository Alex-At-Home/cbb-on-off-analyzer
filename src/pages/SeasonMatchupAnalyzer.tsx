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
  buildGameImpactRowsFromCaches,
  buildGameImpactTableRows,
  SEASON_MATCHUP_TEAM_KEY,
  CHART_FIELD_OPTIONS,
  getScoreDiffForGame,
  getScoreStrForGame,
} from "../utils/SeasonMatchupImpactUtils";
import type { GameImpactRow } from "../utils/SeasonMatchupImpactUtils";
import { getMatchupQueryFiltersForGame } from "../utils/SeasonMatchupUtils";
import GameImpactDiagView, {
  GameImpactChartPoint,
  gameLabelToXAxisLabel,
  estimateXAxisLabelHeight,
} from "../components/diags/GameImpactDiagView";
import type { GameStatsCache } from "../utils/tables/GameAnalysisUtils";

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
  const [scaleType, setScaleType] = useState<"P%" | "T%" | "/G">("/G");
  const [adjBreakdownForSoS, setAdjBreakdownForSoS] = useState(
    params.adjustForOpponentStrength ?? false,
  );
  const [showChart, setShowChart] = useState(params.showChart ?? true);
  const [chartLarge, setChartLarge] = useState(false);
  const [chartFieldKey, setChartFieldKey] =
    useState<keyof GameImpactRow>("diff_adj_rapm");

  const paramsRef = React.useRef<SeasonMatchupFilterParams>(params);
  paramsRef.current = params;
  const { resolvedTheme } = useTheme();

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
  }, [
    params.presetGroup,
    params.adjustForOpponentStrength,
    params.showChart,
    playerOptions,
  ]);

  useEffect(() => {
    if (!dataEvent.games.length) {
      setPerGameRapmCaches([]);
      return;
    }
    setPerGameRapmCaches([]);
    const commonParams = getCommonFilterParams(params);
    const caches = buildPerGameRapmCaches(
      dataEvent.games,
      commonParams,
      avgEfficiency,
    );
    setPerGameRapmCaches(caches);
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
    const rows = buildGameImpactTableRows(impacts);
    const identityPrefix = (k: string) => k;
    const noCellMeta = () => "";
    const tableDefs = IndivTableDefs.impactDecompTable;
    const themedColorBuilder =
      resolvedTheme === "dark"
        ? CbbColors.off_diff10_p100_redGreen_darkMode
        : CbbColors.off_diff10_p100_redBlackGreen;
    return rows.map((rowData, i) => {
      const game = dataEvent.games[i];
      const impact = impacts[i];
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
      const href = UrlRouting.getMatchupUrl({
        ...params,
        queryFilters: game
          ? getMatchupQueryFiltersForGame(game.gameInfo)
          : undefined,
      } as any);
      const titleNode = (
        <>
          <span style={{ color }}>{scoreStr}</span>{" "}
          <OverlayTrigger
            overlay={
              <Tooltip id="game-detail-link">
                Click here to view details for this game
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
    });
  }, [
    selectedPlayer,
    dataEvent.games,
    perGameRapmCaches,
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
      ...chartData.map((d) => gameLabelToXAxisLabel(d.gameLabel).length)
    );
    const labelAreaHeight = estimateXAxisLabelHeight(maxLabelLen);
    return {
      chartHeight: topMargin + barArea + labelAreaHeight + paddingBelowChart,
      labelAreaHeight,
    };
  }, [chartData, chartLarge]);

  const onSeasonMatchupStats: SeasonMatchupOnStats = (data) => {
    setDataEvent({ games: data.games });
  };

  const getRootUrl = (p: SeasonMatchupFilterParams) =>
    UrlRouting.getSeasonMatchupUrl(p);

  const onChangeState = (raw: SeasonMatchupFilterParams) => {
    const keysToOmit: string[] = [];
    if (!raw.team) keysToOmit.push("team");
    if (!raw.year) keysToOmit.push("year");
    if (raw.gender === ParamDefaults.defaultGender) keysToOmit.push("gender");
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
          <p className="text-muted small">
            Per-game breakdown for a team&apos;s season. Select team, year, and
            gender, then Submit.
          </p>
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
                    setSelectedPlayer(quickSwitch ?? SEASON_MATCHUP_TEAM_KEY);
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
                      onClick: () => setShowChart(!showChart),
                    },
                    {
                      label: "L",
                      tooltip: "Make chart 3× taller",
                      toggled: chartLarge,
                      onClick: () => setChartLarge(!chartLarge),
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
                      onClick: () => setAdjBreakdownForSoS(!adjBreakdownForSoS),
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
                          onClick: () => setScaleType("P%"),
                        },
                        {
                          label: (
                            <small>
                              T<sup>%</sup>
                            </small>
                          ),
                          tooltip: `T%: Impact per 100 team possessions`,
                          toggled: scaleType === "T%",
                          onClick: () => setScaleType("T%"),
                        },
                        {
                          label: (
                            <small>
                              <sup>/</sup>G
                            </small>
                          ),
                          tooltip: `/G: Impact per game`,
                          toggled: scaleType === "/G",
                          onClick: () => setScaleType("/G"),
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setChartFieldKey(e.target.value as keyof GameImpactRow)
                  }
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
