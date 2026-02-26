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
} from "../utils/SeasonMatchupImpactUtils";
import type { GameStatsCache } from "../utils/tables/GameAnalysisUtils";

const SeasonMatchupAnalyzerPage: React.FunctionComponent = () => {
  const isServer = typeof window === "undefined";
  const allParams = isServer ? "" : window.location.search;

  const [params, setParams] = useState<SeasonMatchupFilterParams>(
    UrlRouting.removedSavedKeys(allParams) as SeasonMatchupFilterParams
  );
  const [dataEvent, setDataEvent] = useState<{
    games: SeasonMatchupPerGame[];
  }>({ games: [] });
  const [selectedPlayer, setSelectedPlayer] = useState<string>(SEASON_MATCHUP_TEAM_KEY);
  const [quickSwitchExtra, setQuickSwitchExtra] = useState<
    "extra" | "diff" | undefined
  >(undefined);
  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);
  const [perGameRapmCaches, setPerGameRapmCaches] = useState<
    GameStatsCache[]
  >([]);
  const [scaleType, setScaleType] = useState<"P%" | "T%" | "/G">("/G");
  const [adjBreakdownForSoS, setAdjBreakdownForSoS] = useState(false);

  const paramsRef = React.useRef<SeasonMatchupFilterParams>(params);
  paramsRef.current = params;

  const common = getCommonFilterParams(params);
  const genderYear =
    `${params.gender ?? ParamDefaults.defaultGender}_${params.year ?? ParamDefaults.defaultYear}`;
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
    if (!dataEvent.games.length) {
      setPerGameRapmCaches([]);
      return;
    }
    setPerGameRapmCaches([]);
    const commonParams = getCommonFilterParams(params);
    const caches = buildPerGameRapmCaches(
      dataEvent.games,
      commonParams,
      avgEfficiency
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
      adjBreakdownForSoS
    );
    const rows = buildGameImpactTableRows(impacts);
    const identityPrefix = (k: string) => k;
    const noCellMeta = () => "";
    const tableDefs = IndivTableDefs.impactDecompTable;
    return rows.map((rowData) =>
      GenericTableOps.buildDataRow(
        rowData,
        identityPrefix,
        noCellMeta,
        tableDefs
      )
    );
  }, [
    selectedPlayer,
    dataEvent.games,
    perGameRapmCaches,
    avgEfficiency,
    scaleType,
    adjBreakdownForSoS,
  ]);

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
    typeof window === "undefined"
      ? "server"
      : window.location.hostname;

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
        <HeaderBar
          common={common}
          thisPage="season-matchup"
        />
      </Row>
      <Row>
        <GenericCollapsibleCard
          minimizeMargin={false}
          screenSize="medium_screen"
          title="Team and season"
          summary={params.team && params.year ? `${params.team} ${params.year}` : "Select team and year"}
        >
          <SeasonMatchupFilter
            onStats={onSeasonMatchupStats}
            startingState={params}
            onChangeState={onChangeState}
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
              <QuickSwitchBar
                title="Select a player"
                quickSwitch={selectedPlayer}
                quickSwitchExtra={quickSwitchExtra}
                quickSwitchOptions={playerOptions}
                updateQuickSwitch={(
                  quickSwitch: string | undefined,
                  _newTitle: string | undefined,
                  _source: QuickSwitchSource,
                  _fromTimer: boolean
                ) => {
                  setSelectedPlayer(quickSwitch ?? SEASON_MATCHUP_TEAM_KEY);
                }}
                quickSwitchTimer={quickSwitchTimer}
                setQuickSwitchTimer={setQuickSwitchTimer}
              />
              <div className="mb-2 mt-2">
                <ToggleButtonGroup
                  labelOverride="Quick Select:"
                  items={[
                    {
                      label: "Adj",
                      tooltip:
                        "Include SoS adjustment in calcs (means total net won't sum to score differential)",
                      toggled: adjBreakdownForSoS,
                      onClick: () =>
                        setAdjBreakdownForSoS(!adjBreakdownForSoS),
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
                  ]}
                />
              </div>
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
            </GenericCollapsibleCard>
          </Col>
        </Row>
      )}
      <Footer
        year={params.year}
        gender={params.gender}
        server={server}
      />
    </Container>
  );
};

export default SeasonMatchupAnalyzerPage;
