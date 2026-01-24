// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
import Router, { useRouter } from "next/router";
import Link from "next/link";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// App components:
import TeamReportFilter from "../components/TeamReportFilter";
import {
  ParamPrefixes,
  GameFilterParams,
  LineupFilterParams,
  TeamReportFilterParams,
  ParamDefaults,
} from "../utils/FilterModels";
import { HistoryManager } from "../utils/HistoryManager";
import TeamReportStatsTable from "../components/TeamReportStatsTable";
import { LineupStatsModel } from "../components/LineupStatsTable";
import { RosterStatsModel } from "../components/RosterStatsTable";
import { TeamStatsModel } from "../components/TeamStatsTable";
import GenericCollapsibleCard from "../components/shared/GenericCollapsibleCard";
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Utils:
import {
  StatModels,
  OnOffBaselineEnum,
  OnOffBaselineGlobalEnum,
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  TeamStatSet,
  LineupStatSet,
} from "../utils/StatModels";
import { UrlRouting } from "../utils/UrlRouting";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";

const TeamReportPage: NextPage<{}> = () => {
  useEffect(() => {
    // Set up GA
    if (process.env.NODE_ENV === "production" && typeof window !== undefined) {
      if (!gaInited) {
        initGA();
        setGaInited(true);
      }
      logPageView();
    }
  }); //(on any change to the DOM)

  // Team Stats interface

  const [gaInited, setGaInited] = useState(false);
  const [dataEvent, setDataEvent] = useState({
    lineupStats: {} as LineupStatsModel,
    teamStats: {
      on: StatModels.emptyTeam(),
      off: StatModels.emptyTeam(),
      baseline: StatModels.emptyTeam(),
      global: StatModels.emptyTeam(),
    } as TeamStatsModel,
    rosterStats: {
      on: [],
      off: [],
      other: [],
      baseline: [],
      global: [],
    } as RosterStatsModel,
  });

  const injectStats = (
    lineupStats: LineupStatsModel,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel
  ) => {
    setDataEvent({ lineupStats, teamStats, rosterStats });
  };

  // Game filter

  const allParams =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? ""
      : window.location.search;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const [teamReportFilterParams, setTeamReportFilterParams] = useState(
    UrlRouting.removedSavedKeys(allParams) as TeamReportFilterParams
  );
  const teamReportFilterParamsRef = useRef<TeamReportFilterParams>();
  teamReportFilterParamsRef.current = teamReportFilterParams;

  function getRootUrl(params: TeamReportFilterParams) {
    return UrlRouting.getTeamReportUrl(params);
  }

  const onTeamReportFilterParamsChange = (
    rawParams: TeamReportFilterParams
  ) => {
    const params = _.omit(
      rawParams,
      _.flatten([
        // omit all defaults
        rawParams.showComps == ParamDefaults.defaultShowComps
          ? ["showComps"]
          : [],
        rawParams.repOnOffDiagMode ==
          ParamDefaults.defaultTeamReportRepOnOffDiagMode
          ? ["repOnOffDiagMode"]
          : [],
        rawParams.rapmDiagMode == ParamDefaults.defaultTeamReportRapmDiagMode
          ? ["rapmDiagMode"]
          : [],
        rawParams.rapmPriorMode == ParamDefaults.defaultTeamReportRapmPriorMode
          ? ["rapmPriorMode"]
          : [],
        rawParams.rapmRegressMode ==
          ParamDefaults.defaultTeamReportRapmRegressMode
          ? ["rapmRegressMode"]
          : [],
        rawParams.regressDiffs == ParamDefaults.defaultTeamReportRegressDiffs
          ? ["regressDiffs"]
          : [],
        _.isEqual(rawParams.luck, ParamDefaults.defaultLuckConfig)
          ? ["luck"]
          : [],
        !rawParams.teamLuck ? ["teamLuck"] : [],
        rawParams.stickyQuickToggle ? ["stickyQuickToggle"] : [],
        // Table configuration:
        !rawParams.tablePreset ? ["tablePreset"] : [],
        _.isEmpty(rawParams.tableConfigExtraCols)
          ? ["tableConfigExtraCols"]
          : [],
        _.isNil(rawParams.tableConfigDisabledCols)
          ? ["tableConfigDisabledCols"]
          : [],
      ])
    );

    if (!_.isEqual(params, teamReportFilterParamsRef.current)) {
      //(to avoid recursion)
      const href = getRootUrl(params);
      const as = href;
      //TODO: this doesn't work if it's the same page (#91)
      // (plus adding the _current_ query to the history is a bit counter-intuitive)
      // (for intra-page, need to add to HistoryBounce page which will redirect back to force reload)
      // (need to figure out how to detect inter-page)
      // (for now use use "replace" vs "push" to avoid stupidly long browser histories)
      Router.replace(href, as, { shallow: true });
      setTeamReportFilterParams(params); // (to ensure the new params are included in links)
    }
  };

  /** Only rebuild the table if the data changes */
  const table = React.useMemo(() => {
    return (
      <TeamReportStatsTable
        startingState={teamReportFilterParamsRef.current || {}}
        dataEvent={dataEvent}
        onChangeState={onTeamReportFilterParamsChange}
      />
    );
  }, [dataEvent]);

  // View

  function maybeShowDocs() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      return "https://hoop-explorer.blogspot.com/2020/03/understanding-team-report-onoff-page.html";
    } else {
      return undefined;
    }
  }

  return (
    <Container className="medium_screen">
      <SiteModeDropdown />
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Team On/Off Report Tool</h3>
        </Col>
      </Row>
      <Row>
        <HeaderBar
          common={teamReportFilterParams}
          thisPage={ParamPrefixes.report}
        />
      </Row>
      <Row>
        <GenericCollapsibleCard
          screenSize={"medium_screen"}
          minimizeMargin={false}
          title="Team Report Filter"
          summary={HistoryManager.teamReportFilterSummary(
            teamReportFilterParams
          )}
        >
          <TeamReportFilter
            onStats={injectStats}
            startingState={teamReportFilterParams}
            onChangeState={onTeamReportFilterParamsChange}
          />
        </GenericCollapsibleCard>
      </Row>
      <Row>
        <GenericCollapsibleCard
          screenSize={"medium_screen"}
          minimizeMargin={true}
          title="Team Analysis"
          helpLink={maybeShowDocs()}
        >
          {table}
        </GenericCollapsibleCard>
      </Row>
      <Footer
        year={teamReportFilterParams.year}
        gender={teamReportFilterParams.gender}
        server={server}
      />
    </Container>
  );
};
export default TeamReportPage;
