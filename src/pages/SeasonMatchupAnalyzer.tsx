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
import { IndivTableDefs } from "../utils/tables/IndivTableDefs";
import {
  computeNetRatingPerGame,
  buildGameImpactTableRows,
} from "../utils/SeasonMatchupImpactUtils";

const SeasonMatchupAnalyzerPage: React.FunctionComponent = () => {
  const isServer = typeof window === "undefined";
  const allParams = isServer ? "" : window.location.search;

  const [params, setParams] = useState<SeasonMatchupFilterParams>(
    UrlRouting.removedSavedKeys(allParams) as SeasonMatchupFilterParams
  );
  const [dataEvent, setDataEvent] = useState<{
    games: SeasonMatchupPerGame[];
  }>({ games: [] });
  const [selectedPlayer, setSelectedPlayer] = useState<string | undefined>();
  const [quickSwitchExtra, setQuickSwitchExtra] = useState<
    "extra" | "diff" | undefined
  >(undefined);
  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);
  const [impactCache, setImpactCache] = useState<
    Record<string, Record<string, { value: number } | string>[]>
  >({});

  const paramsRef = React.useRef<SeasonMatchupFilterParams>(params);
  paramsRef.current = params;

  const common = getCommonFilterParams(params);
  const genderYear = `${params.gender || ""}_${params.year || ""}`;
  const avgEfficiency =
    efficiencyAverages[genderYear] || efficiencyAverages.fallback;

  const playerOptions = useMemo(() => {
    const codes = new Set<string>();
    dataEvent.games.forEach((g) => {
      (g.rosterStats || []).forEach((r: { key?: string }) => {
        if (r.key) codes.add(r.key);
      });
    });
    return Array.from(codes).map((code) => ({ title: code }));
  }, [dataEvent.games]);

  useEffect(() => {
    setImpactCache({});
  }, [dataEvent.games]);

  useEffect(() => {
    if (!selectedPlayer || !dataEvent.games.length) return;
    setImpactCache((c) => {
      if (c[selectedPlayer]) return c;
      const impacts = computeNetRatingPerGame(
        selectedPlayer,
        dataEvent.games,
        common,
        avgEfficiency
      );
      const rows = buildGameImpactTableRows(impacts);
      return { ...c, [selectedPlayer]: rows };
    });
  }, [selectedPlayer, dataEvent.games, common, avgEfficiency]);

  const tableRows = useMemo(() => {
    if (!selectedPlayer) return [];
    const rows = impactCache[selectedPlayer];
    if (!rows) return [];
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
  }, [selectedPlayer, impactCache]);

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
                  setSelectedPlayer(quickSwitch);
                }}
                quickSwitchTimer={quickSwitchTimer}
                setQuickSwitchTimer={setQuickSwitchTimer}
              />
              {selectedPlayer && tableRows.length > 0 ? (
                <GenericTable
                  tableCopyId="seasonMatchup_impact"
                  tableFields={IndivTableDefs.impactDecompTable}
                  tableData={tableRows}
                  cellTooltipMode="missing"
                />
              ) : (
                <p className="small text-muted mb-0">
                  {selectedPlayer
                    ? "Loading…"
                    : "Select a player above to see per-game impact."}
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
