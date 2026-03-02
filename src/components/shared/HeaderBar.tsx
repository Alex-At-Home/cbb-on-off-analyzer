// React imports:
import React, { useState, useEffect } from "react";
import Link from "next/link";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Dropdown from "react-bootstrap/Dropdown";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";

import styles from "./HeaderBar.module.css";

// Utils:
import {
  getCommonFilterParams,
  getBaseFilterParams,
  getCommonLboardFilterParams,
  ParamPrefixes,
  CommonFilterParams,
  GameFilterParams,
  LineupFilterParams,
  TeamReportFilterParams,
  LineupLeaderboardParams,
  PlayerLeaderboardParams,
  MatchupFilterParams,
  TeamLeaderboardParams,
  TeamEditorParams,
  OffseasonLeaderboardParams,
  TeamStatsExplorerParams,
  ParamDefaults,
  SeasonMatchupFilterParams,
} from "../../utils/FilterModels";
import { UrlRouting } from "../../utils/UrlRouting";
import { HistoryManager } from "../../utils/HistoryManager";
import { DateUtils } from "../../utils/DateUtils";
import { useTheme } from "next-themes";
import GenericTogglingMenuItem from "./GenericTogglingMenuItem";
import PlayerFinderTextBox from "./PlayerFinderTextBox";

type Props = {
  thisPage: string;
  common: CommonFilterParams;
  override?: boolean; //(for testing)
};

/** Dropdowns for controlling navigation */
const StyledDropdown = React.forwardRef<HTMLAnchorElement>((props, ref) => (
  <a
    href=""
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      (props as any).onClick(e);
    }}
  >
    {props.children}
    &nbsp;&nbsp;
    <FontAwesomeIcon icon={faAngleDown} />
  </a>
));

const HeaderBar: React.FunctionComponent<Props> = ({
  thisPage,
  common,
  override,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const { theme, setTheme } = useTheme();

  const hasMidMajors =
    !common.year || common.year >= DateUtils.yearFromWhichAllMenD1Imported;

  const currYearLboard = common.year || DateUtils.mostRecentYearWithLboardData;
  const commonWithCorrectedYearLboard =
    currYearLboard <= DateUtils.mostRecentYearWithLboardData
      ? common
      : {
          ...common,
          year: DateUtils.mostRecentYearWithLboardData,
        };

  // Lineup Leaderboard
  function getLineupLeaderboardUrl(tier: "High" | "Medium" | "Low" | "All") {
    return UrlRouting.getLineupLeaderboardUrl(
      getCommonLboardFilterParams(
        commonWithCorrectedYearLboard,
        tier,
      ) as LineupLeaderboardParams,
    );
  }
  // Player Leaderboard
  function getPlayerLeaderboardUrl(tier: "High" | "Medium" | "Low" | "All") {
    return UrlRouting.getPlayerLeaderboardUrl(
      getCommonLboardFilterParams(
        commonWithCorrectedYearLboard,
        tier,
      ) as PlayerLeaderboardParams,
    );
  }
  function getPlayerLeaderboardGeoUrl(tier: "High" | "Medium" | "Low" | "All") {
    return UrlRouting.getPlayerLeaderboardGeoUrl(
      getCommonLboardFilterParams(
        commonWithCorrectedYearLboard,
        tier,
      ) as PlayerLeaderboardParams,
    );
  }
  function getPlayerLeaderboardTransferPortalUrl() {
    return UrlRouting.getPlayerLeaderboardUrl({
      ...(getCommonLboardFilterParams(common) as PlayerLeaderboardParams),
      gender: "Men",
      tier: "All",
      year: DateUtils.mostRecentYearWithLboardData,
      transferMode: "true:predictions",
    });
  }
  function getPlayerLeaderboardTrackingUrl(trackingList: string) {
    return UrlRouting.getPlayerLeaderboardUrl({
      ...(getCommonLboardFilterParams(common) as PlayerLeaderboardParams),
      gender: "Men",
      tier: "All",
      year: DateUtils.mostRecentYearWithLboardData,
      filter: trackingList,
    });
  }
  function getPlayerLeaderboardRegionalUrl(regionId: string) {
    return UrlRouting.getPlayerLeaderboardUrl({
      ...(getCommonLboardFilterParams(common) as PlayerLeaderboardParams),
      gender: "Men",
      tier: "All",
      year: DateUtils.mostRecentYearWithLboardData,
      advancedFilter: regionId,
    });
  }
  function getTeamLeaderboardUrl(allowOffseasonOverride: Boolean = true) {
    const currYear = common.year || DateUtils.mostRecentYearWithData;
    if (
      DateUtils.isSeasonFinished(currYear)
        ? currYear >= DateUtils.mostRecentYearWithData
        : currYear > DateUtils.mostRecentYearWithData
    ) {
      if (allowOffseasonOverride) {
        return UrlRouting.getOffseasonLeaderboard({});
      } else {
        return UrlRouting.getTeamLeaderboardUrl(
          getCommonLboardFilterParams({
            ...common,
            year: DateUtils.mostRecentYearWithData,
          }) as TeamLeaderboardParams,
        );
      }
    } else {
      return UrlRouting.getTeamLeaderboardUrl(
        getCommonLboardFilterParams(common) as TeamLeaderboardParams,
      );
    }
  }
  function getTeamBuilderUrl() {
    return UrlRouting.getTeamEditorUrl({} as TeamEditorParams);
  }
  function getTeamStatsExplorerUrl() {
    return UrlRouting.getTeamStatsExplorerUrl({} as TeamStatsExplorerParams);
  }

  // Last visited
  function getLastGameUrl(extraParams?: GameFilterParams) {
    return UrlRouting.getGameUrl(
      {
        ...UrlRouting.removedSavedKeys(
          HistoryManager.getLastQuery(ParamPrefixes.game) || "",
        ),
        ...(extraParams || {}),
      } as GameFilterParams,
      {},
    );
  }
  function getLastLineupUrl(extraParams?: LineupFilterParams) {
    return UrlRouting.getLineupUrl(
      {
        ...UrlRouting.removedSavedKeys(
          HistoryManager.getLastQuery(ParamPrefixes.lineup) || "",
        ),
        ...(extraParams || {}),
      } as LineupFilterParams,
      {},
    );
  }
  function getLastReportUrl(extraParams?: TeamReportFilterParams) {
    return UrlRouting.getTeamReportUrl({
      ...UrlRouting.removedSavedKeys(
        HistoryManager.getLastQuery(ParamPrefixes.report) || "",
      ),
      ...(extraParams || {}),
    } as TeamReportFilterParams);
  }
  // From baseline query
  function getBaseGameUrl(extraParams?: GameFilterParams) {
    return UrlRouting.getGameUrl(
      {
        ...getCommonFilterParams(common),
        ...(extraParams || {}),
      } as GameFilterParams,
      {},
    );
  }
  function getBaseLineupUrl(extraParams?: LineupFilterParams) {
    return UrlRouting.getLineupUrl(
      {
        ...getCommonFilterParams(common),
        ...(extraParams || {}),
      } as LineupFilterParams,
      {},
    );
  }
  function getBaseReportUrl(extraParams?: TeamReportFilterParams) {
    return UrlRouting.getTeamReportUrl({
      ...getCommonFilterParams(common),
      ...(extraParams || {}),
    } as TeamReportFilterParams);
  }

  const describeConfs = (tier: "High" | "Medium" | "Low" | "All") => {
    switch (tier) {
      case "High":
        return "P6 and friends, or any T150-better team";
      case "Medium":
        return "Mid majors, must be T275-better team";
      case "Low":
        return "Bottom 7 conferences, or any T250-worse team";
      case "All":
        return "All conferences, can get slow";
    }
    return "";
  };
  const lineupLeaderboardTooltip = (
    tier: "High" | "Medium" | "Low" | "All",
  ) => {
    return (
      <Tooltip id={"lineupLeaderboardTooltip" + tier}>
        Go to the (luck adjusted) Lineup T400 Leaderboard page (
        {describeConfs(tier)})
      </Tooltip>
    );
  };
  const playerLeaderboardTooltip = (
    tier: "High" | "Medium" | "Low" | "All",
  ) => {
    return (
      <Tooltip id={"playerLeaderboardTooltip" + tier}>
        Go to the (luck adjusted) Player Leaderboard page ({describeConfs(tier)}
        )
      </Tooltip>
    );
  };
  const playerLeaderboardTransferTooltip = (
    <Tooltip id={"playerLeaderboardTransferTooltip"}>
      View the transfer portal in the (luck adjusted) Player Leaderboard page.
      Includes predictions for the following year.
    </Tooltip>
  );
  const teamLeaderboardTooltip = (
    <Tooltip id={"teamLeaderboardTooltip"}>
      Build your own team leaderboard out of various resume and quality based
      metrics!
    </Tooltip>
  );
  const offseasonTierListTooltip = (
    <Tooltip id={"offseasonTierListTooltip"}>
      Show each conference split into tiers of teams of similar caliber. Edit
      results you don't like!
    </Tooltip>
  );
  const teamBuilderTooltip = (
    <Tooltip id={"teamBuilderTooltip"}>
      Build your own roster out of returning players, transfers (or steals!),
      and the bench!
    </Tooltip>
  );
  const teamStatsExplorerTooltip = (
    <Tooltip id={"teamStatsExplorerTooltip"}>
      Compare, sort, and filter stats for all D1 teams
    </Tooltip>
  );

  const teamStatsExplorerChartTooltip = (
    <Tooltip id={"teamStatsExplorerChartTooltip"}>
      Build team scatter charts from 100s of stats and analytics
    </Tooltip>
  );
  // const playerLeaderboardTooltipNba2021 = (
  //   <Tooltip id="playerLeaderboardTooltipNba2021">Go to the (luck adjusted) Player Leaderboard page (Men, 'high' tier), filtered for 2021 NBA prospects (from Tankathon)</Tooltip>
  // );
  const playerLeaderboardTooltipNba2022 = (
    <Tooltip id="playerLeaderboardTooltipNba2022">
      Go to the (luck adjusted) Player Leaderboard page (Men), filtered for 2022
      NBA prospects (from ESPN/@DraftExpress)
    </Tooltip>
  );
  const playerLeaderboardTooltipSuperSr2022 = (
    <Tooltip id="playerLeaderboardTooltipSuperSr2022">
      Go to the (luck adjusted) Player Leaderboard page (Men), filtered for 2022
      returning super seniors
    </Tooltip>
  );
  const playerLeaderboardTooltipGeo = (
    <Tooltip id="playerLeaderboardTooltipGeo">
      The Player Leaderboard overlaid on a map of their hometowns!
    </Tooltip>
  );
  const playerLeaderboardTooltipMdDmv2017 = (
    <Tooltip id="playerLeaderboardTooltipMdDmv2017">
      Go to the (luck adjusted) Player Leaderboard page (Men), filtered for
      Md/DMV-area players class of 2017-2023/24
    </Tooltip>
  );
  const playerLeaderboardTooltipMdDmv2023 = (
    <Tooltip id="playerLeaderboardTooltipMdDmv2023">
      Go to the (luck adjusted) Player Leaderboard page (Men), filtered for
      Md/DMV-area players class of 2023+
    </Tooltip>
  );
  const playerLeaderboardTooltipNyNj2017 = (
    <Tooltip id="playerLeaderboardTooltipNyNj2017">
      Go to the (luck adjusted) Player Leaderboard page (Men), filtered for
      NY/NJ-area players class of 2017-2022/23 (h/t jules99b from reddit)
    </Tooltip>
  );
  const playerLeaderboardTooltipEuro2017 = (
    <Tooltip id="playerLeaderboardTooltipEuro2017">
      Go to the (luck adjusted) Player Leaderboard page (Men), filtered for
      European players class of 2017-2022/23
    </Tooltip>
  );
  const playerLeaderboardTooltipCanada2017 = (
    <Tooltip id="playerLeaderboardTooltipCanada2017">
      Go to the (luck adjusted) Player Leaderboard page (Men), filtered for
      Canadian players class of 2017-2022/23
    </Tooltip>
  );
  const baseGameTooltip = (
    <Tooltip id="baseGameTooltip">
      Go to the On/Off Analysis page with the current baseline query
    </Tooltip>
  );
  const playerCareerTooltip = (
    <Tooltip id="playerCareerTooltip">
      Search for a player and view their career stats
    </Tooltip>
  );
  const similarPlayerFinderTooltip = (
    <Tooltip id="similarPlayerFinderTooltip">
      Search for a player and explore comparisons
    </Tooltip>
  );
  const lastGameTooltip = (
    <Tooltip id="lastGameTooltip">
      Go back to the most recently submitted On/Off Analysis page
    </Tooltip>
  );
  const shotChartsTooltip = (
    <Tooltip id="shotChartsTooltip">
      View on/off and season shot charts for a team
    </Tooltip>
  );
  const baseLineupTooltip = (
    <Tooltip id="baseLineupTooltip">
      Go to the Lineup Analysis page with the current baseline query
    </Tooltip>
  );
  const lastLineupTooltip = (
    <Tooltip id="lastLineupTooltip">
      Go back to the most recently submitted Lineup Analysis page
    </Tooltip>
  );
  const baseReportTooltip = (
    <Tooltip id="baseReportTooltip">
      Go to the On/Off Report page with the current baseline query
    </Tooltip>
  );
  const lastReportTooltip = (
    <Tooltip id="lastReportTooltip">
      Go back to the most recently submitted On/Off Report page
    </Tooltip>
  );
  const chartTooltip = (
    <Tooltip id="lastReportTooltip">
      View a gallery of interesting basketball analytics charts
    </Tooltip>
  );
  const gameReportTooltip = (
    <Tooltip id="gameReportTooltip">
      Charts and tables for individual games
    </Tooltip>
  );
  const seasonReportTooltip = (
    <Tooltip id="seasonReportTooltip">
      Net point breakdowns for every game in a season
    </Tooltip>
  );
  const playerSeasonAnalysisTooltip = (
    <Tooltip id="playerSeasonTooltip">
      Analyze players' year-vs-year statistics
    </Tooltip>
  );
  const transferAnalysisTooltip = (
    <Tooltip id="transferAnalysisTooltip">
      Analyze transfers' performance vs predicted
    </Tooltip>
  );

  /** Adds the current selection to history before navigating away */
  const onNav = (e: any) => {
    if (!_.isEmpty(common)) {
      //(do nothing if the page has just been loaded and not modified)
      const key = UrlRouting.getUrl({ [UrlRouting.noPrefix]: common });
      HistoryManager.addParamsToHistory(key, thisPage);
    }
  };
  const onForce = (url: string) => (e: any) => {
    // (can't force a full client refresh using Router - this is an ugly alternative)
    window.location.href = url;
  };

  /** Builds a nice looking nav dropdown item */
  const buildNavItem = (
    itemName: string,
    tooltip: React.ReactElement<any>,
    url: string,
    dstPage: string,
  ) => {
    return thisPage == dstPage ? (
      <OverlayTrigger rootClose placement="auto" overlay={tooltip}>
        <a
          className="text-center small dropdown-item"
          href={url}
          onClick={onForce(url)}
        >
          {itemName}
        </a>
      </OverlayTrigger>
    ) : (
      <OverlayTrigger rootClose placement="auto" overlay={tooltip}>
        <span>
          <Link href={url}>
            <div>
              <a
                className="text-center small dropdown-item"
                href={url}
                onClick={onNav}
              >
                {itemName}
              </a>
            </div>
          </Link>
        </span>
      </OverlayTrigger>
    );
  };

  const dropdownStyle = {
    left: "50%",
    marginLeft: "-20px",
  };

  const buildTeamDropdown = (highlight: Boolean) => {
    const teamAnalysisSettings: GameFilterParams = {
      showTeamPlayTypes: true,
      showRoster: true,
      calcRapm: true,
      showExtraInfo: true,
    };
    const teamShotChartSettings: GameFilterParams = {
      calcRapm: true,
      teamShotCharts: true,
    };
    return (
      <Dropdown>
        <Dropdown.Toggle
          id="chartDropDown"
          as={StyledDropdown as unknown as undefined}
        >
          {highlight ? <b>Teams</b> : "Teams"}
        </Dropdown.Toggle>
        <Dropdown.Menu style={dropdownStyle}>
          {DateUtils.frontPageIsOffseasonLeaderboard &&
          DateUtils.showOffseasonMetrics ? (
            <Dropdown.Item>
              {buildNavItem(
                "How is your off-season going?",
                teamLeaderboardTooltip,
                UrlRouting.getOffseasonLeaderboard({
                  transferInOutMode: true,
                } as OffseasonLeaderboardParams),
                `${ParamPrefixes.team}_leaderboard`,
              )}
            </Dropdown.Item>
          ) : undefined}
          {DateUtils.frontPageIsOffseasonLeaderboard ? (
            <>
              <Dropdown.Item>
                {buildNavItem(
                  "Editable off-season leaderboard!",
                  teamLeaderboardTooltip,
                  getTeamLeaderboardUrl(),
                  `${ParamPrefixes.team}_leaderboard`,
                )}
              </Dropdown.Item>
              <Dropdown.Item>
                {buildNavItem(
                  "Off-season Tier List!!",
                  offseasonTierListTooltip,
                  UrlRouting.getOffseasonTierList({}),
                  `${ParamPrefixes.team}_tierList`,
                )}
              </Dropdown.Item>
            </>
          ) : (
            <Dropdown.Item>
              {buildNavItem(
                "Build your own team leaderboard!",
                teamLeaderboardTooltip,
                getTeamLeaderboardUrl(),
                `${ParamPrefixes.team}_leaderboard`,
              )}
            </Dropdown.Item>
          )}
          {DateUtils.frontPageIsOffseasonLeaderboard ? (
            <Dropdown.Item>
              {buildNavItem(
                "Last season's team leaderboard",
                teamLeaderboardTooltip,
                getTeamLeaderboardUrl(false),
                `${ParamPrefixes.team}_leaderboard`,
              )}
            </Dropdown.Item>
          ) : null}
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "D1 Team Stats Explorer",
              teamStatsExplorerTooltip,
              getTeamStatsExplorerUrl(),
              `${ParamPrefixes.team}_statsExplorer`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Team Stat Charts",
              teamStatsExplorerChartTooltip,
              UrlRouting.TeamStatsExplorerChart({
                year: DateUtils.mostRecentYearWithLboardData,
                title: "Efficiency Landscape",
              }),
              `${ParamPrefixes.team}_chart`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Team Analysis",
              baseGameTooltip,
              getBaseGameUrl(),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Detailed Team Analysis",
              baseGameTooltip,
              getBaseGameUrl(teamAnalysisSettings),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Per Game Breakdown",
              seasonReportTooltip,
              UrlRouting.getSeasonMatchupUrl(
                getBaseFilterParams(common) as SeasonMatchupFilterParams,
              ),
              `${ParamPrefixes.gameInfo}_seasonReview`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Team Style Analysis",
              baseGameTooltip,
              getBaseGameUrl({
                showTeamPlayTypes: true,
                teamPlayTypeConfig: "||||all||multi||",
              }),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Team Shot Charts",
              shotChartsTooltip,
              getBaseGameUrl(teamShotChartSettings),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Team On-Off Report",
              baseReportTooltip,
              getBaseReportUrl(),
              `${ParamPrefixes.report}`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Build your own off-season roster!",
              teamBuilderTooltip,
              getTeamBuilderUrl(),
              `${ParamPrefixes.team}_editor`,
            )}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const buildPlayerDropdown = (highlight: Boolean) => {
    const basicAnalysisSettings: GameFilterParams = {
      showRoster: true,
      calcRapm: true,
      showExpanded: true,
    };
    const playerShotChartSettings: GameFilterParams = {
      showRoster: true,
      calcRapm: true,
      showExpanded: true,
      teamShotCharts: true,
      playerShotCharts: true,
    };
    return (
      <Dropdown>
        <Dropdown.Toggle
          id="chartDropDown"
          as={StyledDropdown as unknown as undefined}
        >
          {highlight ? <b>Players</b> : "Players"}
        </Dropdown.Toggle>
        <Dropdown.Menu style={dropdownStyle}>
          <Dropdown.Item>
            {buildNavItem(
              "Leaderboard",
              playerLeaderboardTooltip(hasMidMajors ? "All" : "High"),
              getPlayerLeaderboardUrl(hasMidMajors ? "All" : "High"),
              `${ParamPrefixes.player}_leaderboard`,
            )}
          </Dropdown.Item>
          {DateUtils.showOffseasonMetrics ? (
            <Dropdown.Item>
              {buildNavItem(
                "Transfer Portal",
                playerLeaderboardTransferTooltip,
                getPlayerLeaderboardTransferPortalUrl(),
                `${ParamPrefixes.player}_leaderboard`,
              )}
            </Dropdown.Item>
          ) : null}
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Player Career View",
              playerCareerTooltip,
              UrlRouting.getPlayerCareer({
                showExpanded: true,
              }),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <div className="px-3 py-2">
            <PlayerFinderTextBox
              playerCurrSelected={false}
              onSelectPlayer={function (ncaaId: string, gender: string): void {
                window.location.href = UrlRouting.getPlayerCareer({
                  ncaaId,
                  gender,
                  showInfoSubHeader: true,
                });
              }}
            />
          </div>
          <Dropdown.Item>
            {buildNavItem(
              "Similar Player Finder",
              similarPlayerFinderTooltip,
              UrlRouting.getPlayerCareer({
                hidePlayerOverview: true,
              }),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Roster Analysis",
              baseGameTooltip,
              getBaseGameUrl(basicAnalysisSettings),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Roster Style Analysis",
              baseGameTooltip,
              getBaseGameUrl({
                showPlayerPlayTypes: true,
                showExpanded: true,
                calcRapm: true,
              }),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Player Shot Charts",
              shotChartsTooltip,
              getBaseGameUrl(playerShotChartSettings),
              `${ParamPrefixes.game}`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Cross-Season Player Stat Charts",
              playerSeasonAnalysisTooltip,
              UrlRouting.getPlayerSeasonComparisonUrl({
                year: DateUtils.mostRecentYearWithLboardData,
              }),
              `${ParamPrefixes.player}_chart`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Player Hometown Maps! (HS 2023+)",
              playerLeaderboardTooltipGeo,
              getPlayerLeaderboardGeoUrl("All"),
              `${ParamPrefixes.player}_leaderboard_geo`,
            )}
          </Dropdown.Item>
          <Dropdown drop="right" as="div" className="dropdown-submenu">
            <Dropdown.Toggle
              as="div"
              className={styles["dropdown-toggle"]}
              style={{ position: "relative" }}
            >
              <span
                className="small text-center"
                style={{ display: "block", padding: "0.25rem 1.5rem" }}
              >
                Regional Player Leaderboards&nbsp;&nbsp;
                <FontAwesomeIcon icon={faAngleDown} />
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item>
                {buildNavItem(
                  "Md/DMV-area players (HS 2023+)",
                  playerLeaderboardTooltipMdDmv2023,
                  getPlayerLeaderboardRegionalUrl("hs_region_dmv"),
                  `${ParamPrefixes.player}_leaderboard`,
                )}
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item>
                {buildNavItem(
                  "Md/DMV-area players (HS 2017-2024)",
                  playerLeaderboardTooltipMdDmv2017,
                  getPlayerLeaderboardTrackingUrl("__DMV_2017__"),
                  `${ParamPrefixes.player}_leaderboard`,
                )}
              </Dropdown.Item>
              <Dropdown.Item>
                {buildNavItem(
                  "European players (HS 2017-2023)",
                  playerLeaderboardTooltipEuro2017,
                  getPlayerLeaderboardTrackingUrl("__EURO_2017__"),
                  `${ParamPrefixes.player}_leaderboard`,
                )}
              </Dropdown.Item>
              <Dropdown.Item>
                {buildNavItem(
                  "Canadian players (HS 2017-2023)",
                  playerLeaderboardTooltipCanada2017,
                  getPlayerLeaderboardTrackingUrl("__CANADA_2017__"),
                  `${ParamPrefixes.player}_leaderboard`,
                )}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Player On-Off/RAPM Report",
              baseReportTooltip,
              getBaseReportUrl({ incRapm: true }),
              `${ParamPrefixes.report}`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>
            {buildNavItem(
              "Player Positional Analysis",
              chartTooltip,
              "/Charts",
              "chart",
            )}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const buildLineupDropdown = (highlight: Boolean) => {
    return (
      <Dropdown>
        <Dropdown.Toggle
          id="chartDropDown"
          as={StyledDropdown as unknown as undefined}
        >
          {highlight ? <b>Lineups</b> : "Lineups"}
        </Dropdown.Toggle>
        <Dropdown.Menu style={dropdownStyle}>
          <Dropdown.Item>
            {buildNavItem(
              "Lineup Analysis",
              baseLineupTooltip,
              getBaseLineupUrl(),
              `${ParamPrefixes.lineup}`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Advanced Lineup Analysis",
              baseLineupTooltip,
              getBaseLineupUrl({ advancedMode: true }),
              `${ParamPrefixes.lineup}`,
            )}
          </Dropdown.Item>
          <Dropdown.Divider />
          {!common.year ||
          common.year >= DateUtils.firstYearWithImprovedLineupLboards ? (
            <Dropdown.Item>
              {buildNavItem(
                "Leaderboard",
                lineupLeaderboardTooltip("All"),
                getLineupLeaderboardUrl("All"),
                `${ParamPrefixes.lineup}_leaderboard`,
              )}
            </Dropdown.Item>
          ) : (
            <>
              <Dropdown.Item>
                {buildNavItem(
                  "Leaderboard - 'high' tier",
                  lineupLeaderboardTooltip("High"),
                  getLineupLeaderboardUrl("High"),
                  `${ParamPrefixes.lineup}_leaderboard`,
                )}
              </Dropdown.Item>
              <Dropdown.Item>
                {buildNavItem(
                  "Leaderboard - 'medium' tier",
                  lineupLeaderboardTooltip("Medium"),
                  getLineupLeaderboardUrl("Medium"),
                  `${ParamPrefixes.lineup}_leaderboard`,
                )}
              </Dropdown.Item>
              <Dropdown.Item>
                {buildNavItem(
                  "Leaderboard - 'low' tier",
                  lineupLeaderboardTooltip("Low"),
                  getLineupLeaderboardUrl("Low"),
                  `${ParamPrefixes.lineup}_leaderboard`,
                )}
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const buildGameDropdown = (highlight: Boolean) => {
    //(mega grovelling with types required to get TS to compile with example from react bootstrap custom dropdown example code)
    return (
      <Dropdown>
        <Dropdown.Toggle
          id={getBaseReportUrl()}
          as={StyledDropdown as unknown as undefined}
        >
          {highlight ? <b>Games</b> : "Games"}
        </Dropdown.Toggle>
        <Dropdown.Menu style={dropdownStyle}>
          <Dropdown.Item>
            {buildNavItem(
              "Game Reports",
              gameReportTooltip,
              UrlRouting.getMatchupUrl(
                getBaseFilterParams(common) as MatchupFilterParams,
              ),
              `${ParamPrefixes.gameInfo}_review`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Game Reports - Net Pts",
              gameReportTooltip,
              UrlRouting.getMatchupUrl({
                ...getBaseFilterParams(common),
                showBreakdownMinMaxRings: true,
                showImpactBreakdown: true,
                adjImpactStats: false,
                impactPerGame: true,
                factorMins: true,
              } as MatchupFilterParams),
              `${ParamPrefixes.gameInfo}_review`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Season Reports - Net Pts",
              seasonReportTooltip,
              UrlRouting.getSeasonMatchupUrl(
                getBaseFilterParams(common) as SeasonMatchupFilterParams,
              ),
              `${ParamPrefixes.gameInfo}_seasonReview`,
            )}
          </Dropdown.Item>
          <Dropdown.Item>
            {buildNavItem(
              "Game Previews",
              gameReportTooltip,
              UrlRouting.getMatchupPreviewUrl(
                getBaseFilterParams(common) as MatchupFilterParams,
              ),
              `${ParamPrefixes.gameInfo}_preview`,
            )}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  /** Show blog if rendering external version of the page */
  function maybeShowBlog() {
    if (!_.startsWith(server, "cbb-on-off-analyzer")) {
      const blogTooltip = (
        <Tooltip id="blogTooltip">
          Articles describing how to use the tool
        </Tooltip>
      );
      return (
        <OverlayTrigger placement="auto" overlay={blogTooltip}>
          <a
            href="https://hoop-explorer.blogspot.com/p/blog-page.html"
            target="_blank"
          >
            Docs...
          </a>
        </OverlayTrigger>
      );
    }
  }

  const buildOtherDropdown = () => {
    return (
      <Dropdown>
        <Dropdown.Toggle
          id={"other"}
          as={StyledDropdown as unknown as undefined}
        >
          Other
        </Dropdown.Toggle>
        <Dropdown.Menu style={dropdownStyle}>
          <Dropdown.Item>{maybeShowBlog()}</Dropdown.Item>
          <Dropdown.Divider />
          <GenericTogglingMenuItem
            text="Light Theme"
            truthVal={theme == "light"}
            onSelect={() => {
              setTheme("light");
            }}
          />
          <GenericTogglingMenuItem
            text="Dark Theme"
            truthVal={theme == "dark"}
            onSelect={() => {
              setTheme("dark");
            }}
          />
          <GenericTogglingMenuItem
            text="System Theme"
            truthVal={theme == "system"}
            onSelect={() => {
              setTheme("system");
            }}
          />
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  //(only render client-side - was running into cache issues of the Link href)
  return override || typeof window !== `undefined` ? (
    <Container>
      <Row className="border-top">
        <Col className="text-center small">
          {buildTeamDropdown(
            _.startsWith(thisPage, ParamPrefixes.team) ||
              _.startsWith(thisPage, ParamPrefixes.game),
          )}
        </Col>
        <Col className="text-center small">
          {buildPlayerDropdown(
            _.startsWith(thisPage, ParamPrefixes.player) ||
              _.startsWith(thisPage, ParamPrefixes.game) ||
              _.startsWith(thisPage, ParamPrefixes.report) ||
              thisPage == "charts",
          )}
        </Col>
        <Col className="text-center small">
          {buildLineupDropdown(_.startsWith(thisPage, ParamPrefixes.lineup))}
        </Col>
        <Col className="text-center small">
          {buildGameDropdown(_.startsWith(thisPage, ParamPrefixes.gameInfo))}
        </Col>
        <Col className="text-center small d-xl-none">
          {buildOtherDropdown()}
        </Col>
        <Col className="text-center small d-none d-xl-block">
          {maybeShowBlog()}
        </Col>
      </Row>
    </Container>
  ) : null;
};

export default HeaderBar;
