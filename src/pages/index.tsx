// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef, FC, ReactNode } from "react";
import Router, { useRouter } from "next/router";
import Link from "next/link";

// Next imports:
import { NextPage } from "next";
import Head from "next/head";
import fetch from "isomorphic-unfetch";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import CloseButton from "react-bootstrap/CloseButton";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

// App imports:
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";
import {
  ParamDefaults,
  LandingPageParams,
  OffseasonLeaderboardParams,
} from "../utils/FilterModels";
import { DateUtils } from "../utils/DateUtils";
import ToggleButtonGroup from "../components/shared/ToggleButtonGroup";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import LandingPageSelectModal from "../components/shared/LandingPageSelectModal";
import LandingPageMoreDetails, {
  MoreDetailsProps,
} from "../components/shared/LandingPageMoreDetails";
import { UrlRouting } from "../utils/UrlRouting";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import ExpandableImage from "../components/shared/ExpandableImage";
import PlayerFinderTextBox from "../components/shared/PlayerFinderTextBox";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const LandingPage: NextPage<Props> = ({ testMode }) => {
  const [gaInited, setGaInited] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    new Set(["All"])
  );

  // Team selection state - will be initialized properly in useEffect
  const [year, setYear] = useState<string>(ParamDefaults.defaultYear);
  const [gender, setGender] = useState<string>(ParamDefaults.defaultGender);
  const [team, setTeam] = useState<string>("");
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [visitOnExitTeamModal, setVisitOnExitTeamModal] = useState<
    ((year: string, gender: string, team: string) => string) | undefined
  >(undefined);

  // More Details modal state
  const [showMoreDetailsModal, setShowMoreDetailsModal] =
    useState<boolean>(false);
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  // Helper function to generate card ID from title
  const getCardIdFromTitle = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  // More details handler functions
  const handleMoreDetailsOpen = (cardId: string) => {
    setSelectedCardId(cardId);
    setShowMoreDetailsModal(true);
    const urlParams = new URLSearchParams(window.location.search);
    const currSelectedCardId = urlParams.get("moreDetailsId");
    if (currSelectedCardId != cardId) {
      urlParams.set("moreDetailsId", cardId);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      router.replace(newUrl, undefined, { shallow: true });
    }
  };

  const handleMoreDetailsClose = () => {
    setShowMoreDetailsModal(false);
    setSelectedCardId("");
    const urlParams = new URLSearchParams(window.location.search);
    const currSelectedCardId = urlParams.get("moreDetailsId");
    if (currSelectedCardId) {
      urlParams.delete("moreDetailsId");
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      router.replace(newUrl, undefined, { shallow: true });
    }
  };

  /** Builds a link that either opens a new, or opens a dialog box to specify the  */
  const buildLink = (
    toDisplay: React.ReactElement | string,
    visitOnSave: (year: string, gender: string, team: string) => string,
    teamNotNeeded: Boolean = false
  ) => {
    return (team || teamNotNeeded) && year && gender ? (
      <a
        className="card-body-link"
        href={visitOnSave(year, gender, team)}
        target="_blank"
      >
        {toDisplay}
      </a>
    ) : (
      <a
        className="card-body-link"
        href="#"
        onClick={(e: any) => {
          e.preventDefault();
          setVisitOnExitTeamModal((__: any) => visitOnSave);
          setShowTeamModal(true);
        }}
      >
        {toDisplay}
      </a>
    );
  };

  /** Builds a link that either opens a new, or opens a dialog box to specify the  */
  const buildCardLink = (
    toDisplay: React.ReactElement | string,
    visitOnSave: (year: string, gender: string, team: string) => string
  ) => {
    return team && year && gender ? (
      <Card.Link href={visitOnSave(year, gender, team)} target="_blank">
        {toDisplay}
      </Card.Link>
    ) : (
      <Card.Link
        href="#"
        onClick={(e: any) => {
          e.preventDefault();
          setVisitOnExitTeamModal((__: any) => visitOnSave);
          setShowTeamModal(true);
        }}
      >
        {toDisplay}
      </Card.Link>
    );
  };

  /**
   * The HTML to display
   * Note to build images for the image list use eg:
   * sips -s format jpeg -s formatOptions low ~/Desktop/offseason_predictions_1.png  --out public/images/landing_page/offseason/offseason_predictions_1.jpeg
   */
  const moreDetailsByCardId: Record<string, MoreDetailsProps> = {
    "offseason-predictions--analysis": {
      title: "Off-Season Predictions / Analysis",
      content: (
        <div style={{ fontSize: "1.2rem" }}>
          <p>
            Hoop Explorer builds a really simple prediction model for each
            roster: how did each player do last season (measured by the
            all-in-one production metric RAPM)...?
            <br />
            <br />
            ... Well they will probably do a little better next season, so add
            those up to get the team's Adjusted Efficiency Margin (skipping over
            some details!)
            <br />
            <br />
            This lets us do a few fun things during the Long Summer Months:
            <ul>
              <li>
                {buildLink(
                  `The usual "next season predictions"`,
                  (year, gender, team) =>
                    UrlRouting.getOffseasonLeaderboard({
                      gender,
                      year,
                    }),
                  true
                )}
                <ul>
                  <li>
                    <ExpandableImage
                      src="./images/landing_page/offseason/offseason_predictions_1.jpeg"
                      caption="The ranking is the least interesting bit, except for being the starting point for more analysis..."
                    />
                  </li>
                </ul>
              </li>
              <li>
                {buildLink(
                  `See a breakdown of how each player contributes to their team, in optimistic/balanced/pessimistic scenarios`,
                  (year, gender, team) =>
                    UrlRouting.getTeamEditorUrl({
                      gender,
                      year,
                      team,
                    })
                )}
                <ul>
                  <li>
                    Edit the breakdowns:{" "}
                    <ExpandableImage
                      src="./images/landing_page/offseason/offseason_predictions_2.jpeg"
                      caption="See a detailed breakdown of why a team has a given ranking, and change it if you don't like it!"
                    />
                  </li>
                  <li>
                    Or add more players!{" "}
                    <ExpandableImage
                      src="./images/landing_page/offseason/offseason_predictions_3.jpeg"
                      caption="During Portal Season, pick players you like and see the impact of landing them."
                    />
                  </li>
                </ul>
              </li>
              <li>
                {buildLink(
                  `Look at what each team is losing vs picking up vs keeping / developing`,
                  (year, gender, team) =>
                    UrlRouting.getOffseasonLeaderboard({
                      gender,
                      year,
                      transferInOutMode: true,
                    } as OffseasonLeaderboardParams),
                  true
                )}
                <ul>
                  <li>
                    <ExpandableImage
                      src="./images/landing_page/offseason/offseason_changes.jpeg"
                      caption="Break down a team's predictions compared to last season's performance based on who is coming/staying/leaving"
                    />
                  </li>
                </ul>
              </li>
              <li>
                {buildLink(
                  `How did a team do compared to its prediction, and what were the key differences?`,
                  (year, gender, team) =>
                    UrlRouting.getOffseasonLeaderboard({
                      gender,
                      year,
                      evalMode: true,
                    } as OffseasonLeaderboardParams),
                  true
                )}
                <ul>
                  <li>
                    <i>(tangent: why does nobody else do this?!)</i>
                  </li>
                </ul>
              </li>
            </ul>
          </p>
        </div>
      ),
      imageList: [
        {
          src: "./images/landing_page/offseason/offseason_predictions_1.jpeg",
          text: "The ranking is the least interesting bit, except for being the starting point for more analysis... [1/4]",
        },
        {
          src: "./images/landing_page/offseason/offseason_predictions_2.jpeg",
          text: "See a detailed breakdown of why a team has a given ranking, and change it if you don't like it! [2/4]",
        },
        {
          src: "./images/landing_page/offseason/offseason_predictions_3.jpeg",
          text: "During Portal Season, pick players you like and see the impact of landing them. [3/4]",
        },
        {
          src: "./images/landing_page/offseason/offseason_changes.jpeg",
          text: "Break down a team's predictions compared to last season's performance based on who is coming/staying/leaving [4/4]",
        },
      ],
    },
    "play-type--style-analysis": {
      title: "Play Type / Style Analysis",
      content: (
        <div style={{ fontSize: "1.2rem" }}>
          <p>
            This is probably Hoop Explorer's most important feature that is not
            easily available elsewhere.
          </p>
          <p>
            The Play-by-Play action is algorithmically (/statistically)
            converted into a set of "intuitive" individual or team play type
            categories, eg:
            <ul>
              <li>
                <b>Rim Attack</b> - drives and slashes to the rim from the
                perimeter
              </li>
              <li>
                <b>Attack & Kick</b> - ball-handler passes to the perimeter for
                3P, usually after the defense collapses on a drive
              </li>
              <li>
                <b>Perimeter Sniper</b> - A 3P shooter fed by a drive or post-up
                (individual category only)
              </li>
              <li>
                <b>Big Cut & Roll</b> - A frontcourt player cuts to the basket,
                usually after a screen, eg in PnR
              </li>
              <li>
                <i>
                  And many more... eg{" "}
                  <ExpandableImage
                    src="./images/landing_page/play_style/team_explorer.jpeg"
                    caption="The set of team play styles"
                  />
                </i>
              </li>
            </ul>
          </p>
          <p>
            A number of pages allow you to view different variants of the Play
            Style graphs:
            <ul>
              <li>
                <b>Team Play Styles</b>
              </li>
              <ul>
                <li>
                  For a given filter / split, see the{" "}
                  {buildLink(
                    "Team Offensive Play Style Breakdown",
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          showTeamPlayTypes: true,
                          //(always show these)
                          calcRapm: true,
                          showRoster: true,
                        },
                        {}
                      )
                  )}{" "}
                  (and compare vs other splits)
                </li>
                <ul>
                  <li>
                    <i>
                      Note this view doesn't currently include the defense,
                      which is complicated to calculate for splits - for now you
                      can see it from the{" "}
                      {buildLink(
                        "Team Stats Explorer",
                        (year, gender, team) =>
                          UrlRouting.getTeamStatsExplorerUrl({
                            year,
                            gender,
                            showPlayStyles: true,
                            playStyleConfig: "def",
                            maxTableSize: "10",
                          }),
                        true
                      )}{" "}
                      or{" "}
                      {buildLink(
                        `Game Previews (No Oppponent) pages`,
                        (year, gender, team) =>
                          UrlRouting.getMatchupPreviewUrl({
                            year,
                            gender,
                            team,
                            oppoTeam: "No Opponent",
                          })
                      )}
                    </i>
                  </li>
                  <li>
                    <i>
                      To see the Team Play Style Breakdown for a given lineup,{" "}
                      {buildLink(
                        `go to the Lineup Analysis page`,
                        (year, gender, team) =>
                          UrlRouting.getLineupUrl(
                            {
                              year,
                              gender,
                              team,
                            },
                            {}
                          )
                      )}
                      , and click the lineup in which you're interested
                      (leftmost column) to open a new tab including Play Style
                      info.
                    </i>
                  </li>
                </ul>
                <li>
                  For a given filter / split, see how the different players
                  contribute to the{" "}
                  {buildLink(
                    `Team Offensive Play Style Breakdown`,
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          showTeamPlayTypes: true,
                          teamPlayTypeConfig: "sos||||all||multi||",
                          //(always show these)
                          calcRapm: true,
                          showRoster: true,
                        },
                        {}
                      )
                  )}
                  <ul>
                    <li>
                      <ExpandableImage
                        src="./images/landing_page/play_style/player_and_team.jpeg"
                        caption="See a team's Offensive Play Style Breakdown, and how each player contributed"
                      />
                    </li>
                  </ul>
                </li>
                <li>
                  You can see the Offensive and Defensive Play Style Breakdowns
                  for all teams in the{" "}
                  {buildLink(
                    "Team Stats Explorer page (eg Top 10)",
                    (year, gender, team) =>
                      UrlRouting.getTeamStatsExplorerUrl({
                        year,
                        gender,
                        showPlayStyles: true,
                        maxTableSize: "10",
                      }),
                    true
                  )}
                </li>
                <li>
                  Every game report includes each team's{" "}
                  {buildLink(
                    `Offensive and Defensive Play Style Breakdown`,
                    (year, gender, team) =>
                      UrlRouting.getMatchupUrl({
                        year,
                        gender,
                        team,
                        oppoTeam: "No Opponent",
                      })
                  )}{" "}
                  for that game (and you can compare vs their season)
                </li>
                <li>
                  When{" "}
                  {buildLink(
                    `previewing a matchup between two teams`,
                    (year, gender, team) =>
                      UrlRouting.getMatchupPreviewUrl({
                        year,
                        gender,
                        team,
                      })
                  )}{" "}
                  you can see/compare their Offensive and Defensive Play Style
                  Breakdowns (including SoS filters.)
                </li>
                <ul>
                  <li>
                    <ExpandableImage
                      src="./images/landing_page/play_style/play_style_matchup.jpeg"
                      caption="Another Team Stats Explorer use - to preview the match-up of two teams"
                    />
                  </li>
                  <li>
                    <i>
                      If you just want to use the SoS filters and don't have a
                      particular opponent in mind, then use the{" "}
                      {buildLink(`"No Opponent" mode`, (year, gender, team) =>
                        UrlRouting.getMatchupPreviewUrl({
                          year,
                          gender,
                          team,
                          oppoTeam: "No Opponent",
                        })
                      )}
                      . Otherwise the Team Stats Explorer is probably better.
                    </i>
                  </li>
                </ul>
              </ul>
              <li className="mt-2">
                <b>Individual Play Styles</b>
              </li>
              <ul>
                <li>
                  For a given filter / split, see the{" "}
                  {buildLink(
                    "Individual Offensive Play Style Breakdown",
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          showPlayerPlayTypes: true,
                          //(always show these)
                          calcRapm: true,
                        },
                        {}
                      )
                  )}{" "}
                  (and compare vs other splits)
                </li>
                <ul>
                  <li>
                    <i>
                      (To see the Individual Play Style Breakdown for a given
                      lineup,{" "}
                      {buildLink(
                        `go to the Lineup Analysis page`,
                        (year, gender, team) =>
                          UrlRouting.getLineupUrl(
                            {
                              year,
                              gender,
                              team,
                            },
                            {}
                          )
                      )}
                      , and click the lineup in which you're interested
                      (leftmost column) to open a new tab including Play Style
                      info.)
                    </i>
                  </li>
                </ul>
                <li>
                  For a given filter / split, see how the different players
                  contribute to the{" "}
                  {buildLink(
                    `Team Offensive Play Style Breakdown`,
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          showTeamPlayTypes: true,
                          teamPlayTypeConfig: "sos||||all||multi||",
                          //(always show these)
                          calcRapm: true,
                          showRoster: true,
                        },
                        {}
                      )
                  )}
                  <ul>
                    <li>
                      <ExpandableImage
                        src="./images/landing_page/play_style/player_and_team_2.jpeg"
                        caption="See a team's Offensive Play Style Breakdown, and how each player contributed (filtered by Play Type)"
                      />
                    </li>
                  </ul>
                </li>
              </ul>
              <li>
                You can see the Offensive Play Style Breakdowns for all players
                in the{" "}
                {buildLink(
                  `Player Leaderboard page (eg Top 50)`,
                  (year, gender, team) =>
                    UrlRouting.getPlayerLeaderboardUrl({
                      year,
                      gender,
                      showPlayerPlayTypes: true,
                      maxTableSize: "50",
                    }),
                  true
                )}
                <ul>
                  <li>
                    <ExpandableImage
                      src="./images/landing_page/play_style/player_lboard.jpeg"
                      caption="See the Offensive Play Style Breakdown for every player directly in the Leaderboard"
                    />
                  </li>
                </ul>
              </li>
            </ul>
          </p>
        </div>
      ),
      imageList: [
        {
          src: "./images/landing_page/play_style/player_and_team.jpeg",
          text: "See a team's Offensive Play Style Breakdown, and how each player contributed [1/7]",
        },
        {
          src: "./images/landing_page/play_style/player_and_team_2.jpeg",
          text: "See a team's Offensive Play Style Breakdown, and how each player contributed (filtered by Play Type) [2/7]",
        },
        {
          src: "./images/landing_page/play_style/player_lboard.jpeg",
          text: "See the Offensive Play Style Breakdown for every player directly in the Leaderboard [3/7]",
        },
        {
          src: "./images/landing_page/play_style/team_explorer.jpeg",
          text: "See Offensive and Defensive Play Style Breakdowns for every team in D1 (single year) [4/7]",
        },
        {
          src: "./images/landing_page/play_style/multi_yr_team_explorer.jpeg",
          text: "See Offensive and Defensive Play Style Breakdowns for every team in D1 (multi year, with a filter to single out one coach) [5/7]",
        },
        {
          src: "./images/landing_page/play_style/play_style_matchup.jpeg",
          text: "Another Team Stats Explorer use - to preview the match-up of two teams [6/7]",
        },
        {
          src: "./images/landing_page/play_style/team_play_style_fun.jpeg",
          text: "How the excellent Michigan CBB blogger mgoblog brought a 24/25 Wisconsin Play Style Breakdown to life! [7/7]",
        },
      ],
    },
    "shot-charts": {
      title: "Shot Charts Feature",
      content: (
        <div style={{ fontSize: "1.2rem" }}>
          <p>
            A number of pages allow you to view different hex maps of team or
            player shots, showing frequency and efficiency vs D1 averages:
          </p>
          <ul>
            <li>
              <b>Team Shot Charts</b>
            </li>
            <ul>
              <li>
                For a given filter / split, see the{" "}
                {buildLink("Team Shot Charts", (year, gender, team) =>
                  UrlRouting.getGameUrl(
                    {
                      year,
                      gender,
                      team,
                      teamShotCharts: true,
                      //(always show these)
                      calcRapm: true,
                      showRoster: true,
                    },
                    {}
                  )
                )}{" "}
                (and compare vs other splits)
              </li>
              <ul>
                <li>
                  <i>
                    (To see the Shot Chart for a given lineup,{" "}
                    {buildLink(
                      `go to the Lineup Analysis page`,
                      (year, gender, team) =>
                        UrlRouting.getLineupUrl(
                          {
                            year,
                            gender,
                            team,
                          },
                          {}
                        )
                    )}
                    , and click the lineup in which you're interested (leftmost
                    column) to open a new tab including Shot Chart info.)
                  </i>
                </li>
              </ul>
              <li>
                {buildLink(
                  `Every game report includes each team's Shot Chart`,
                  (year, gender, team) =>
                    UrlRouting.getMatchupPreviewUrl({
                      year,
                      gender,
                      team,
                    })
                )}{" "}
                for that game (and you can compare vs their season)
              </li>
              <li>
                When{" "}
                {buildLink(
                  `previewing a matchup between two teams`,
                  (year, gender, team) =>
                    UrlRouting.getMatchupPreviewUrl({
                      year,
                      gender,
                      team,
                    })
                )}{" "}
                you can see/compare their Offensive and Defensive Shot Charts
              </li>
            </ul>
            <li className="mt-2">
              <b>Individual Shot Charts</b>
            </li>
            <ul>
              <li>
                For a given filter / split, see each player's{" "}
                {buildLink("Shot Chart", (year, gender, team) =>
                  UrlRouting.getGameUrl(
                    {
                      year,
                      gender,
                      team,
                      playerShotCharts: true,
                      //(always show these)
                      calcRapm: true,
                    },
                    {}
                  )
                )}{" "}
                (and compare vs other splits)
              </li>
              <ul>
                <li>
                  <i>
                    (To see the Shot Chart for a given lineup,{" "}
                    {buildLink(
                      `go to the Lineup Analysis page`,
                      (year, gender, team) =>
                        UrlRouting.getLineupUrl(
                          {
                            year,
                            gender,
                            team,
                          },
                          {}
                        )
                    )}
                    , and click the lineup in which you're interested (leftmost
                    column) to open a new tab including Shot Chart info.)
                  </i>
                </li>
              </ul>
              <li>
                You can see the Shot Charts for all players in the{" "}
                {buildLink(
                  `Player Leaderboard page (eg Top 50)`,
                  (year, gender, team) =>
                    UrlRouting.getPlayerLeaderboardUrl({
                      year,
                      gender,
                      shotCharts: true,
                      maxTableSize: "50",
                    }),
                  true
                )}
              </li>
            </ul>
          </ul>
        </div>
      ),
      imageList: [
        {
          src: "./images/landing_page/shot_charts/shot_chart_team_split.jpeg",
          text: "See how Purdue's shot distribution changed with/without Zach Edey on the court (23/24 season) [1/3]",
        },
        {
          src: "./images/landing_page/shot_charts/shot_chart_player_split.jpeg",
          text: "See how Purdue's PG's shot distribution changed with/without Zach Edey on the court (23/24 season) [2/3]",
        },
        {
          src: "./images/landing_page/shot_charts/shot_chart_player_lboard.jpeg",
          text: "See player's shot charts directly in the Player Leaderboard [3/3]",
        },
      ],
    },
    "team-lineup-analysis": {
      title: "Team Lineup Analysis",
      content: (
        <div style={{ fontSize: "1.2rem" }}>
          <p>
            {buildLink(`Lineup tables`, (year, gender, team) =>
              UrlRouting.getLineupUrl(
                {
                  year,
                  gender,
                  team,
                },
                {}
              )
            )}{" "}
            were one of the first pages I added to Hoop Explorer, but I never
            found them very useful in practice, outside of being an early
            indication of a coach's thinking, before the rotations became set.{" "}
            <ExpandableImage
              src="./images/landing_page/lineups/ungrouped_lineups.jpeg"
              caption="Why I didn't find the basic lineup view all that useful:"
            />
            <br />
            <br />
            Why? The sample sizes get too small really quickly (eg the third
            most common lineup for most teams is already ~150 possessions over a
            season, or only about 2 games), so you're mostly looking at noise. A
            good way of illustrating this is by looking at the{" "}
            {buildLink(
              `unfiltered Lineup Leaderboard`,
              (year, gender, team) =>
                UrlRouting.getLineupLeaderboardUrl({
                  year,
                  gender,
                }),
              true
            )}
            , and observing how the best performing lineups typically are on the
            lower end of possessions counts, and typically have a big plus net
            in 3P% (a very high variance stat) - filtering it with a{" "}
            {buildLink(
              `higher possession count`,
              (year, gender, team) =>
                UrlRouting.getLineupLeaderboardUrl({
                  year,
                  gender,
                }),
              true
            )}{" "}
            gives a more stable (but much smaller) list.
            <br />
            <br />I did add an option to{" "}
            {buildLink(`regress 3P% for luck`, (year, gender, team) =>
              UrlRouting.getLineupUrl(
                {
                  year,
                  gender,
                  team,
                  lineupLuck: true,
                  showLineupLuckDiags: true,
                },
                {}
              )
            )}{" "}
            (and the leaderboard does use that), but even the full Team Analysis
            luck calculations aren't great, and the Lineup Analysis versions are
            missing some key per-lineup info so should be treated as very
            unreliable.
            <br />
            <br />
            Later I came back to the idea of Lineup Analysis with the goal of
            combining individual lineups back together in meaningful ways to try
            to get the sample sizes into the 300 possessions+:{" "}
            <ExpandableImage
              src="./images/landing_page/lineups/grouped_lineups.jpeg"
              caption="One of the many groupings available:"
            />
            <ul>
              <li>
                <b>Positional Groupings:</b>
              </li>
              <ul>
                <li>
                  <i>
                    (Warning: I love these but they depend on the slightly
                    unreliable positional roles assigned algorithmically - I
                    have a manual override to correct errors if you let me
                    know!)
                  </i>
                </li>
                <li>
                  {buildLink(`Point Guard`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by PG",
                        aggByPos: "PG",
                      },
                      {}
                    )
                  )}
                  : Aggregate all the lineups with each PG{" "}
                  <i>("How did the team do with each floor general?")</i>
                </li>
                <li>
                  {buildLink(`Center`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by Center",
                        aggByPos: "C",
                      },
                      {}
                    )
                  )}
                  : Aggregate all the lineups with each PG
                </li>
                <li>
                  {buildLink(`PG + C`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by PG+C",
                        aggByPos: "PG+C",
                      },
                      {}
                    )
                  )}
                  : Aggregate all the lineups with a specific PG and Center (PnR
                  buddies!)
                </li>
                <li>
                  {buildLink(`Backcourt`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by Backcourt",
                        aggByPos: "Backcourt",
                      },
                      {}
                    )
                  )}
                  : Aggregate all the lineups for a given 3-player backcourt (or
                  4-player if it's a 4-guard lineup) -{" "}
                  <i>one of the most useful groupings in my experience</i>
                </li>
                <li>
                  {buildLink(`Frontcourt`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by Frontcourt",
                        aggByPos: "Frontcourt",
                      },
                      {}
                    )
                  )}
                  : Aggregate all the lineups for a given Frontcourt (PF/C,
                  includes the guard playing the 4) - <i>also very useful!</i>
                </li>
              </ul>
              <li>
                <b>Combinatorial Groupings:</b>
              </li>
              <ul>
                <li>
                  <i>
                    (I'm not such a fan of these position-independent groupings
                    of 2 / 3 / 4 players, I find it hard to trust them without
                    knowing the mix of team-mates; but lots of people who
                    understand basketball better than I do like them, so see
                    what you think!)
                  </i>
                </li>
                <li>
                  {buildLink(`Pairs (2)`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by Pairs",
                        aggByPos: "Pairs",
                      },
                      {}
                    )
                  )}
                  : Group by pairs of players
                </li>
                <li>
                  {buildLink(`Triples (3)`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by Triples",
                        aggByPos: "Triples",
                      },
                      {}
                    )
                  )}
                  : Group by triples of players
                </li>
                <li>
                  {buildLink(`Quads (4)`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by Quads",
                        aggByPos: "Quads",
                      },
                      {}
                    )
                  )}
                  : Group by quads of players
                </li>
              </ul>
              <li>
                <b>On / Off Groupings: (check this one out!)</b>
              </li>
              <ul>
                <li>
                  <i>
                    This is the newest lineup grouping feature ... I find it
                    really useful for analyzing teams with a very dominant
                    starting lineup -{" "}
                    <a
                      className="card-body-link"
                      href={UrlRouting.getLineupUrl(
                        {
                          year: "2024/25",
                          gender: "Men",
                          team: "Maryland",
                          presetGroup: "Grouped by On/Off Combos",
                          aggByPos: "On-Off",
                        },
                        {}
                      )}
                      target="_blank"
                    >
                      say 24/25 Maryland
                    </a>{" "}
                    (~15mpg), but less useful for more balanced teams like{" "}
                    <a
                      className="card-body-link"
                      href={UrlRouting.getLineupUrl(
                        {
                          year: "2024/25",
                          gender: "Men",
                          team: "Texas A&M",
                          presetGroup: "Grouped by On/Off Combos",
                          aggByPos: "On-Off",
                        },
                        {}
                      )}
                      target="_blank"
                    >
                      say 24/25 Texas A&amp;M
                    </a>{" "}
                    (just ~3mpg!). The idea is to show how every possible
                    deviation from the starting lineup (shown in blue) - aka
                    substitution patterns - impacts the team's stats.
                  </i>
                </li>
                <ul>
                  <li>
                    <i>
                      (if you have an idea for how to make this concept more
                      useful for teams without a dominant lineup, let me know!)
                    </i>
                  </li>
                </ul>
                <li>
                  {buildLink(`On/Off Analysis`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                        presetGroup: "Grouped by On/Off Combos",
                        aggByPos: "On-Off",
                      },
                      {}
                    )
                  )}
                  : As described above, shows deviations from most common lineup
                  <ul>
                    <li>
                      <ExpandableImage
                        src="./images/landing_page/lineups/on_off_lineups_1.jpeg"
                        caption="Substitution patterns off the starting lineup:"
                      />
                    </li>
                    <li>
                      (or select the lineup/sub-lineup you want from the
                      "On/Off" selector)
                    </li>
                  </ul>
                </li>
                <li>
                  {buildLink(
                    `Main Lineup vs Substitution Patterns`,
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          presetSplit: "Top 5 players vs Substitution Patterns",
                          //(player view)
                          showRoster: true,
                          possAsPct: false,
                          calcRapm: true,
                          showExpanded: true,
                        },
                        {}
                      )
                  )}{" "}
                  (or from the{" "}
                  {buildLink(`Main Lineup Page`, (year, gender, team) =>
                    UrlRouting.getLineupUrl(
                      {
                        year,
                        gender,
                        team,
                      },
                      {}
                    )
                  )}
                  , click the '5/4/3/2 "Starter Analysis" link): A similar
                  concept to the On/Off Analysis above with two differences
                </li>
                <ul>
                  <li>
                    Takes you to the Team Analysis page (which has a bunch more
                    detail, as explained in the next section)
                  </li>
                  <li>
                    <ExpandableImage
                      src="./images/landing_page/lineups/on_off_lineups_2.jpeg"
                      caption="Substitution patterns with maximum aggregation:"
                    />
                  </li>
                  <li>
                    Has only 4 "rows" of data, showing the main lineup, main
                    lineup with any <i>one</i> player missing, then any{" "}
                    <i>two</i> players missing etc - in other words it's
                    aggregated one step further than the On/Off Analysis, you
                    lose a bit of information but in return get a really clear
                    picture of how the team is impacted by the substitution
                    patterns.
                  </li>
                  <ul>
                    <li>
                      <i>
                        (as with the On/Off Analysis, I'd love ideas on making
                        the concept work better when there isn't a clear "main
                        lineup"!)
                      </i>
                    </li>
                  </ul>
                </ul>
              </ul>
            </ul>
            For each lineup (or lineup combo), there is relatively little detail
            - just the "standard" Hoop Explorer team offense/defense stat lines.
            This lets you compare many lineups/lineup-combos very easily, but
            often you'll want to "dig into" a given lineup/lineup-combo and get
            access to all the goodies that the Team/Roster analysis provides,
            eg:{" "}
            <ExpandableImage
              src="./images/landing_page/lineups/lineups_more_details_trigger.jpeg"
              caption="Just one easy click!"
            />
            <ul>
              <li>
                <i>
                  {buildLink(
                    `What do each players' stats (Off Rating, usage, rebounding etc) look like within a lineup/combo?`,
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          // custom query:
                          onQuery: "ROSTER_TOP_5",
                          offQuery: "",
                          autoOffQuery: false,
                          //(player view)
                          possAsPct: false,
                          calcRapm: true,
                          showExpanded: true,
                        },
                        {}
                      )
                  )}
                </i>
              </li>
              <li>
                <i>
                  {buildLink(
                    `How is the team's play style impacted by the lineup/combo?`,
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          // custom query:
                          onQuery: "ROSTER_TOP_5",
                          offQuery: "",
                          autoOffQuery: false,
                          //(team view)
                          showTeamPlayTypes: true,
                          //(player view)
                          possAsPct: false,
                          calcRapm: true,
                          showExpanded: true,
                        },
                        {}
                      )
                  )}
                </i>
              </li>
              <li>
                <i>
                  {buildLink(
                    `What does the team shot chart look like for the given lineup/combo?`,
                    (year, gender, team) =>
                      UrlRouting.getGameUrl(
                        {
                          year,
                          gender,
                          team,
                          // custom query:
                          onQuery: "ROSTER_TOP_5",
                          offQuery: "",
                          autoOffQuery: false,
                          //(team view)
                          teamShotCharts: true,
                          //(player view)
                          possAsPct: false,
                          calcRapm: true,
                          showExpanded: true,
                        },
                        {}
                      )
                  )}
                </i>
              </li>
              <li>
                (etc; as noted above the higher the sample size the more
                valuable the stats are so lineup combos tend to work better than
                most lineups.){" "}
                <ExpandableImage
                  src="./images/landing_page/lineups/lineups_more_details.jpeg"
                  caption="Much richer stats for a given lineup (and comparison vs season stats):"
                />
              </li>
            </ul>
            To see these more detailed views, simply click on the lineup or
            combo cell on the right of the table. This will show the
            lineup/combo-specific stats as the "A" query, and the season stats
            as the "Base" query.
            <br />
            <br />
            One visualization that can be useful is the{" "}
            {buildLink(
              `possessions-per-game chart for each lineup/combo`,
              (year, gender, team) =>
                UrlRouting.getLineupUrl(
                  {
                    year,
                    gender,
                    team,
                    showGameInfo: true,
                  },
                  {}
                )
            )}
            , which shows how lineups wane and wax in popularity over the
            season. (in the Team/Roster Analysis Page it's also very useful as a
            diagnostic to ensure the filter/splits are doing what you expect.){" "}
            <ExpandableImage
              src="./images/landing_page/lineups/lineups_games_view.jpeg"
              caption="Look for interesting patterns - are they injuries / slumps / experimentation etc?"
            />
            <br />
            <br />
            <a
              href="https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html"
              target="_blank"
            >
              <i>
                Link to an older article I wrote about the two lineup pages,
                which has some extra details.
              </i>
            </a>
          </p>
        </div>
      ),
      imageList: [
        {
          src: "./images/landing_page/lineups/ungrouped_lineups.jpeg",
          text: "See the stats for each individual lineup, but note that the possessions get low very quickly [1/7]",
        },
        {
          src: "./images/landing_page/lineups/grouped_lineups.jpeg",
          text: "One of many ways of grouping lineups together in sensible ways to get the possession count up [2/7]",
        },
        {
          src: "./images/landing_page/lineups/on_off_lineups_1.jpeg",
          text: "On-Off: a very useful grouping technique to analyze subsitution patterns from significant lineups [3/7]",
        },
        {
          src: "./images/landing_page/lineups/on_off_lineups_2.jpeg",
          text: "Another On-Off view, groups missing players to maximize the possession count  [4/7]",
        },
        {
          src: "./images/landing_page/lineups/lineups_more_details_trigger.jpeg",
          text: "The lineup view is quite simple but you can click on a lineup/combo to get a much richer view... [5/7]",
        },
        {
          src: "./images/landing_page/lineups/lineups_more_details.jpeg",
          text: "...A richer view of a lineup stats in the Team Analysis page [6/7]",
        },
        {
          src: "./images/landing_page/lineups/lineups_games_view.jpeg",
          text: "A fun view showing how the lineup usages varied over time [7/7]",
        },
      ],
    },
  };

  // Initialize showIntro state from cache (default to true if not in cache)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      const cachedValue = ClientRequestCache.decacheResponse(
        "landing_show_intro",
        "",
        undefined
      );
      // If we have a cached value of false, use it; otherwise default to true
      return cachedValue === null || cachedValue.value !== false;
    }
    return true; // Default for server-side rendering
  });

  // Update cache when showIntro changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (showIntro) {
        // For the default state (showIntro = true), we want to remove the entry
        // Since we can't directly remove it with ClientRequestCache (cacheKey is private),
        // we'll set an empty object to effectively clear it
        ClientRequestCache.cacheResponse(
          "landing_show_intro",
          "",
          {},
          undefined
        );
      } else {
        // Update cache when set to false
        ClientRequestCache.cacheResponse(
          "landing_show_intro",
          "",
          { value: false },
          undefined
        );
      }
    }
  }, [showIntro]);

  type SupportedTopic =
    | "Teams"
    | "Players"
    | "Lineups"
    | "Games"
    | "Leaderboards"
    | "RAPM"
    | "On-Off"
    | "Splits"
    | "CSV Export"
    | "Off-Season"
    | "Multi-Year"
    | "Shot Charts"
    | "Play Types";

  // Topic-filtered card component
  type TopicFilteredCardProps = {
    topics: string[];
    hide?: boolean;
    children: ReactNode;
  };

  const TopicFilteredCard: FC<TopicFilteredCardProps> = ({
    topics,
    hide = false,
    children,
  }) => {
    // Show the card if:
    // 1. hide is not set to true, AND
    // 2. Either 'All' is selected OR any of the card's topics are in the selected topics
    const showCard =
      !hide &&
      (selectedTopics.has("All") ||
        topics.some((topic) => selectedTopics.has(topic)));

    // Don't render anything if the card should be hidden
    if (!showCard) return null;

    // Otherwise render the children
    return <>{children}</>;
  };
  const router = useRouter();

  // Parse URL params on initial load and load from cache if params aren't present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);

      // Parse "more details" page
      const moreDetailsId = urlParams.get("moreDetailsId");
      if (moreDetailsId) {
        handleMoreDetailsOpen(moreDetailsId);
      }

      // Parse topics param
      const topicsParam = urlParams.get("topics");
      if (topicsParam) {
        const topicsList = topicsParam.split(",");
        // If 'All' is in the list, only include 'All'
        if (topicsList.includes("All")) {
          setSelectedTopics(new Set(["All"]));
        } else {
          setSelectedTopics(new Set(topicsList));
        }
      }

      // Parse team selection params or use cached values if URL params are not present
      // Year
      const yearParam = urlParams.get("year");
      if (yearParam) {
        setYear(yearParam);
      } else {
        // Try to load from cache
        const cachedYear = ClientRequestCache.decacheResponse(
          "landing_show_year",
          "",
          undefined
        );
        if (cachedYear !== null && cachedYear.value) {
          setYear(cachedYear.value as string);
        }
      }

      // Gender
      const genderParam = urlParams.get("gender");
      if (genderParam) {
        setGender(genderParam);
      } else {
        // Try to load from cache
        const cachedGender = ClientRequestCache.decacheResponse(
          "landing_show_gender",
          "",
          undefined
        );
        if (cachedGender !== null && cachedGender.value) {
          setGender(cachedGender.value as string);
        }
      }

      // Team
      const teamParam = urlParams.get("team");
      if (teamParam) {
        setTeam(teamParam);
      } else {
        // Try to load from cache
        const cachedTeam = ClientRequestCache.decacheResponse(
          "landing_show_team",
          "",
          undefined
        );
        if (cachedTeam !== null && cachedTeam.value) {
          setTeam(cachedTeam.value as string);
        }
      }
    }
  }, []);

  // Update URL when selected topics or team selection change - using useRef to track previous values
  const prevTopicsRef = useRef<string>("");
  const prevTeamSelectionRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && selectedTopics.size > 0) {
      const topicsArray = Array.from(selectedTopics);
      const currentTopicsStr = topicsArray.join(",");

      // Only update URL if topics have actually changed
      if (currentTopicsStr !== prevTopicsRef.current) {
        prevTopicsRef.current = currentTopicsStr;

        // Use setTimeout to ensure we're not calling replaceState too frequently
        const timer = setTimeout(() => {
          const urlParams = new URLSearchParams(window.location.search);

          // Only include the topics parameter if it's not just "All" selected
          if (
            topicsArray.length > 0 &&
            !(topicsArray.length === 1 && topicsArray[0] === "All")
          ) {
            urlParams.set("topics", currentTopicsStr);
          } else {
            urlParams.delete("topics");
          }

          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          router.replace(newUrl, undefined, { shallow: true });
        }, 100);

        return () => clearTimeout(timer);
      }
    }
  }, [selectedTopics, router]);

  // Update URL when team selection changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Create a string representation of current team selection
      const currentTeamSelection = JSON.stringify({ year, gender, team });

      // Only update URL if team selection has changed
      if (currentTeamSelection !== prevTeamSelectionRef.current) {
        prevTeamSelectionRef.current = currentTeamSelection;

        // Use setTimeout to ensure we're not calling replaceState too frequently
        const timer = setTimeout(() => {
          const urlParams = new URLSearchParams(window.location.search);

          // Update or delete URL params based on selected values
          if (year) {
            urlParams.set("year", year);
          } else {
            urlParams.delete("year");
          }

          if (gender) {
            urlParams.set("gender", gender);
          } else {
            urlParams.delete("gender");
          }

          if (team) {
            urlParams.set("team", team);
          } else {
            urlParams.delete("team");
          }

          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          router.replace(newUrl, undefined, { shallow: true });
        }, 100);

        return () => clearTimeout(timer);
      }
    }
  }, [year, gender, team, router]);

  // Handle topic toggle clicks
  const handleTopicToggle = (topic: string): void => {
    // Create a new set to avoid mutating the state directly
    const newTopics = new Set(selectedTopics);

    // Special case for "All" button
    if (topic === "All") {
      // If All was already selected, do nothing
      if (newTopics.has("All")) {
        return;
      }
      // Clear all other selections and only select "All"
      newTopics.clear();
      newTopics.add("All");
    } else {
      // For regular topics
      if (newTopics.has(topic)) {
        // If the topic is already selected, remove it
        newTopics.delete(topic);
        // If no topics are left, select "All"
        if (newTopics.size === 0) {
          newTopics.add("All");
        }
      } else {
        // For now we'll always have a single selection
        // If the topic isn't selected, add it and remove "All" if it was selected
        newTopics.clear();
        //newTopics.delete("All");
        newTopics.add(topic);
      }
    }

    setSelectedTopics(newTopics);
  };

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

  const allParams =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? ""
      : window.location.search;

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  // Handler functions for team selection modal
  const handleTeamSave = (
    newYear: string,
    newGender: string,
    newTeam: string
  ) => {
    // Update state
    setYear(newYear);
    setGender(newGender);
    setTeam(newTeam);
    setShowTeamModal(false);

    // Update cache entries
    if (typeof window !== "undefined") {
      ClientRequestCache.cacheResponse(
        "landing_show_year",
        "",
        { value: newYear },
        undefined
      );
      ClientRequestCache.cacheResponse(
        "landing_show_gender",
        "",
        { value: newGender },
        undefined
      );
      ClientRequestCache.cacheResponse(
        "landing_show_team",
        "",
        { value: newTeam },
        undefined
      );
    }
  };

  const handleTeamClear = () => {
    // Update state
    setTeam("");
    setShowTeamModal(false);

    // Clear cache entries
    if (typeof window !== "undefined") {
      // For consistency with showIntro behavior, we'll set empty objects to effectively clear the entries
      ClientRequestCache.cacheResponse("landing_show_year", "", {}, undefined);
      ClientRequestCache.cacheResponse(
        "landing_show_gender",
        "",
        {},
        undefined
      );
      ClientRequestCache.cacheResponse("landing_show_team", "", {}, undefined);
    }
  };

  // Helper function to add team parameters to links
  const withTeamParam = (url: string): string => {
    if (!team || !year || !gender) return url;

    // If the URL already has query parameters, append team parameters
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}team=${encodeURIComponent(
      team
    )}&year=${encodeURIComponent(year)}&gender=${encodeURIComponent(gender)}`;
  };

  // Helper function to conditionally render the More Details link
  const maybeMoreDetails = (cardId: string): JSX.Element | null => {
    return moreDetailsByCardId[cardId] ? (
      <Card.Link
        href="#"
        onClick={(e: any) => {
          e.preventDefault();
          handleMoreDetailsOpen(cardId);
        }}
      >
        <u>More Details</u>
      </Card.Link>
    ) : null;
  };

  return (
    <Container className="medium_screen">
      <SiteModeDropdown />
      <Row>
        <Col xs={12} className="text-center mt-2">
          <h3>Welcome to Hoop Explorer!</h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: gender || "Men",
            year:
              year ||
              DateUtils.getLastSeasonWithDataFrom(
                ParamDefaults.defaultLeaderboardYear
              ),
            team: team,
          }}
          thisPage={`home`}
        />
      </Row>
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          {showIntro && (
            <Card id="intro">
              <Card.Body>
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id="close-tooltip">
                      Hide the welcome message
                    </Tooltip>
                  }
                >
                  <CloseButton
                    aria-label="Close"
                    style={{ marginTop: -15 }}
                    className="float-right"
                    onClick={() => setShowIntro(false)}
                  />
                </OverlayTrigger>
                <Card.Text style={{ fontSize: "1.2rem" }}>
                  <p>
                    Created in 2019, Hoop Explorer is a free and open Web App
                    intended for folks who want to, well, <i>explore</i> college
                    basketball stats ... one notch deeper than is possible with
                    most other sites.
                  </p>
                  <p>
                    It's used by college teams, NBA teams, Draft Twitter, sports
                    bettors, analytics gurus, basketball journalists and
                    bloggers, and (the group that includes me!) fans who enjoy
                    digging into stats when there are no games to watch.
                  </p>
                  <span>
                    The list below gives an idea of the different ways you can
                    use Hoop Explorer both to get everything from high-level
                    summaries of how teams play, through game reports with
                    insights not found elsewhere, to the most detailed samples
                    and splits you can imagine.
                  </span>
                </Card.Text>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
      <Row className="mt-2 mb-2">
        <Col xs={12} className="text-center" style={{ position: "relative" }}>
          <div style={{ position: "absolute", right: 20 }}>
            <br className="d-block d-md-none" />
            {!showIntro && (
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id="welcome-tooltip">
                    Show the welcome message
                  </Tooltip>
                }
              >
                <a
                  href="#"
                  onClick={(e: any) => {
                    e.preventDefault();
                    setShowIntro(true);
                  }}
                >
                  (welcome)
                </a>
              </OverlayTrigger>
            )}
          </div>
          <p style={{ display: "inline-block" }}>
            <b>Currently selected team</b>:{" "}
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="team-select-tooltip">
                  (Optional) select a team-season to use when following any of
                  the links below
                </Tooltip>
              }
            >
              <a
                href="#"
                onClick={(e: any) => {
                  e.preventDefault();
                  setShowTeamModal(true);
                  setVisitOnExitTeamModal(undefined);
                }}
              >
                {team && year && gender
                  ? `${year} | ${gender} | ${team} (edit)`
                  : "Select Here"}
              </a>
            </OverlayTrigger>
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="text-center">
          <ToggleButtonGroup
            labelOverride="Topic Filter: "
            items={[
              {
                label: "All",
                tooltip: "Show all topic cards",
                toggled: selectedTopics.has("All"),
                onClick: () => handleTopicToggle("All"),
              },
              {
                label: "Details",
                tooltip:
                  "Show cards with extra details that I think are worth reading! (Click on 'More Details')",
                toggled: selectedTopics.has("Details"),
                onClick: () => handleTopicToggle("Details"),
              },
              {
                label: "| ",
                isLabelOnly: true,
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Teams",
                tooltip: "Show/hide topic cards related to Teams",
                toggled: selectedTopics.has("Teams"),
                onClick: () => handleTopicToggle("Teams"),
              },
              {
                label: "Players",
                tooltip: "Show/hide topic cards related to Players",
                toggled: selectedTopics.has("Players"),
                onClick: () => handleTopicToggle("Players"),
              },
              {
                label: "Lineups",
                tooltip: "Show/hide topic cards related to Lineups",
                toggled: selectedTopics.has("Lineups"),
                onClick: () => handleTopicToggle("Lineups"),
              },
              {
                label: "Games",
                tooltip: "Show/hide topic cards related to Games",
                toggled: selectedTopics.has("Games"),
                onClick: () => handleTopicToggle("Games"),
              },
              {
                label: "| ",
                isLabelOnly: true,
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Leaderboards",
                tooltip: "Show/hide topic cards related to Leaderboards",
                toggled: selectedTopics.has("Leaderboards"),
                onClick: () => handleTopicToggle("Leaderboards"),
              },
              {
                label: "RAPM",
                tooltip: "Show/hide topic cards related to RAPM",
                toggled: selectedTopics.has("RAPM"),
                onClick: () => handleTopicToggle("RAPM"),
              },
              {
                label: "On-Off",
                tooltip: "Show/hide topic cards related to On-Off",
                toggled: selectedTopics.has("On-Off"),
                onClick: () => handleTopicToggle("On-Off"),
              },
              {
                label: "Splits",
                tooltip: "Show/hide topic cards related to Splits",
                toggled: selectedTopics.has("Splits"),
                onClick: () => handleTopicToggle("Splits"),
              },
              {
                label: "CSV Export",
                tooltip: "Show/hide topic cards related to CSV Export",
                toggled: selectedTopics.has("CSV Export"),
                onClick: () => handleTopicToggle("CSV Export"),
              },
              {
                label: "Off-Season",
                tooltip: "Show/hide topic cards related to Off-Season",
                toggled: selectedTopics.has("Off-Season"),
                onClick: () => handleTopicToggle("Off-Season"),
              },
              {
                label: "Multi-Year",
                tooltip: "Show/hide topic cards related to Multi-Year",
                toggled: selectedTopics.has("Multi-Year"),
                onClick: () => handleTopicToggle("Multi-Year"),
              },
              {
                label: "| ",
                isLabelOnly: true,
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Shot Charts",
                tooltip: "Show/hide topic cards related to Shot Charts",
                toggled: selectedTopics.has("Shot Charts"),
                onClick: () => handleTopicToggle("Shot Charts"),
              },
              {
                label: "Play Types",
                tooltip: "Show/hide topic cards related to Play Types",
                toggled: selectedTopics.has("Play Types"),
                onClick: () => handleTopicToggle("Play Types"),
              },
            ]}
          />
        </Col>
      </Row>
      <Row xs={1} sm={1} md={1} lg={2} xl={3} className="g-4 mb-4">
        <TopicFilteredCard
          hide={true}
          topics={[
            "Examples",
            "Teams",
            "Players",
            "Lineups",
            "Games",
            "RAPM",
            "On-Off",
            "Splits",
            "CSV Export",
            "Shot Charts",
            "Play Types",
            "Misc Charts",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Practical Examples</Card.Title>
                <Card.Text>
                  Some screenshots / descriptions / links of Hoop Explorer uses
                  in the wild.
                  <br />
                  <br />
                  Have a browse to get an idea of some of the features!
                </Card.Text>
                {/** TODO ADD CARD ONCE WE HAVE WRITTEN A MODAL TO DISPLAY EXAMPLES */}
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          hide={gender == "Women"}
          topics={["Details", "Off-Season", "Teams", "Leaderboards"]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Off-Season Predictions / Analysis</Card.Title>
                <Card.Text>
                  Check out Hoop Explorer's very simple off-season predictions{" "}
                  <small>(please don't be mad at me.)</small>
                  <br />
                  <br />A key point is that I show in detail how they are
                  constructed and let you play with them to fix the bits you
                  don't like.
                </Card.Text>
                {maybeMoreDetails(
                  getCardIdFromTitle("Offseason Predictions / Analysis")
                )}
                <Card.Link
                  href={UrlRouting.getOffseasonLeaderboard({ year, gender })}
                  target="_blank"
                >
                  <b>Just take me to the predictions!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Play Types",
            "Players",
            "RAPM",
            "Shot Charts",
            "Multi-Year",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Player Career View</Card.Title>
                <Card.Text>
                  My newest page! Search for players (currently 2021+) using
                  auto-complete; then view and compare their stats, shot charts,
                  play styles, and more across seasons and All/Conference/T100
                  samples. Just start typing below...
                  <br />
                  <br />
                  <PlayerFinderTextBox
                    playerCurrSelected={false}
                    onSelectPlayer={function (
                      ncaaId: string,
                      gender: string
                    ): void {
                      window.open(
                        UrlRouting.getPlayerCareer({
                          ncaaId,
                          showInfoSubHeader: true,
                        }),
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  />
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Play Type / Style Analysis</Card.Title>
                <Card.Text>
                  Maybe Hoop Explorer's most unique feature - break down a team
                  or player's offense or defense into intuitive "style"
                  categories ("Post-Up", "Transition", "Perimeter Sniper", etc)
                  <br />
                  <br />
                  Accesible from lots of pages - see "More Details".
                </Card.Text>
                {maybeMoreDetails(
                  getCardIdFromTitle("Play Type / Style Analysis")
                )}
                <Card.Link
                  href={UrlRouting.getTeamStatsExplorerUrl({
                    year,
                    gender,
                    showPlayStyles: true,
                    maxTableSize: "10",
                  })}
                  target="_blank"
                >
                  <b>Show Me For The Top 10 Teams!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Players",
            "Leaderboards",
            "RAPM",
            "CSV Export",
            "Multi-Year",
            "Shot Charts",
            "Play Types",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Player Leaderboards</Card.Title>
                <Card.Text>
                  See all qualifying players sorted by various stats (eg the
                  all-in-one production stat called RAPM)
                  <br />
                  <br />
                  And lots and lots of options for sorting, filtering,
                  visualizing, and exporting the data.
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Player Leaderboards"))}
                <Card.Link
                  href={UrlRouting.getPlayerLeaderboardUrl({ year, gender })}
                  target="_blank"
                >
                  <b>Just take me to the leaderboard!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Teams",
            "Leaderboards",
            "CSV Export",
            "Multi-Year",
            "Shot Charts",
            "Play Types",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Multi Team Stats Explorer</Card.Title>
                <Card.Text>
                  Team-focused, conference-adjusted team efficiency stats.
                  <br />
                  <br />
                  Sort by Adjusted Efficiency Margin, Offensive Efficiency, or
                  Defensive Efficiency, Play Style; see shooting stats, turnover
                  percentages, etc.
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Team Efficiency Stats"))}
                <Card.Link
                  href={UrlRouting.getTeamStatsExplorerUrl({
                    year,
                    gender,
                  })}
                  target="_blank"
                >
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Teams",
            "Players",
            "Splits",
            "Shot Charts",
            "On-Off",
            "Play Types",
            "RAPM",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Team And Roster Analysis / Splits</Card.Title>
                <Card.Text>
                  The classic "KenPom"-like page showing team Adjusted
                  Efficiency, 4-factors, etc and player offensive/defensive
                  ratings, shooting stats, etc...
                  <br />
                  <br />
                  ... And a lot more: Filters! Splits! Style! Shot Charts! etc
                </Card.Text>
                {maybeMoreDetails(
                  getCardIdFromTitle("Team And Roster Analysis / Splits")
                )}
                {buildCardLink(
                  <b>I'm Sold! Let's Go...</b>,
                  (year, gender, team) =>
                    UrlRouting.getGameUrl(
                      {
                        year,
                        gender,
                        team,
                        // Show these "advanced options" always
                        showRoster: true,
                        calcRapm: true,
                      },
                      {}
                    )
                )}
                {buildCardLink(
                  <span>(Advanced View...)</span>,
                  (year, gender, team) =>
                    UrlRouting.getGameUrl(
                      {
                        year,
                        gender,
                        team,
                        // Advanced settings
                        advancedMode: true,
                        showGrades: "rank:Combo",
                        // Advanced settings - team
                        showTeamPlayTypes: true,
                        showRoster: true,
                        calcRapm: true,
                        showExtraInfo: true,
                        // Advanced settings - player
                        showPlayerPlayTypes: true,
                        showExpanded: true,
                      },
                      {}
                    )
                )}
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Details",
            "Lineups",
            "Leaderboards",
            "CSV Export",
            "Multi Year",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Team Lineup Analysis</Card.Title>
                <Card.Text>
                  All sorts of metrics about the different lineups played by the
                  selected team.
                  <br />
                  <br />
                  The best bit is the ability to combine stats for lineups,
                  based on various groupings (frontcourt, backcourt, etc).
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Team Lineup Analysis"))}
                {buildCardLink(<b>Team Page...</b>, (year, gender, team) =>
                  UrlRouting.getLineupUrl(
                    {
                      year,
                      gender,
                      team,
                    },
                    {}
                  )
                )}
                <Card.Link
                  href={UrlRouting.getLineupLeaderboardUrl({
                    year,
                    gender,
                    tier: "All",
                  })}
                  target="_blank"
                >
                  Leaderboard...
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Details",
            "Shot Charts",
            "Teams",
            "Players",
            "Leaderboards",
            "Splits",
            "On-Off",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Shot Charts</Card.Title>
                <Card.Text>
                  Many pages allow you to view a hex map of team or player
                  shots, showing frequency and efficiency vs D1 averages.
                  <br />
                  <br />
                  Accessible from lots of pages - see "More Details".
                  Particularly interesting with filters and splits!
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Shot Charts"))}
                <Card.Link
                  href={UrlRouting.getPlayerLeaderboardUrl({
                    year,
                    gender,
                    shotCharts: true,
                    maxTableSize: "50",
                  })}
                  target="_blank"
                >
                  <b>Show Me For The Top 50 Players!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Games",
            "Players",
            "Lineups",
            "Play Types",
            "Shot Charts",
            "CSV Export",
            "RAPM",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Game Reports</Card.Title>
                <Card.Text>
                  Advanced game analytics you won't find elsewhere:
                  <ul>
                    <li>Single game player offensive and defensive impact</li>
                    <li>Time series charts showing lineups</li>
                    <li>A style breakdown for each team</li>
                  </ul>
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Game Reports"))}
                <Card.Link
                  href={UrlRouting.getMatchupUrl({
                    year,
                    gender,
                    team,
                  })}
                  target="_blank"
                >
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          topics={[
            "Games",
            "Players",
            "Play Types",
            "Shot Charts",
            "CSV Export",
            "RAPM",
          ]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Game Previews</Card.Title>
                <Card.Text>
                  Advanced match-up analytics between any two teams in D1, with
                  charts showing:
                  <ul>
                    <li>Players' offensive and defensive impact</li>
                    <li>A breakdown of offense vs defense style matchups</li>
                    <li>Shot charts</li>
                  </ul>
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Game Previews"))}
                <Card.Link
                  href={UrlRouting.getMatchupPreviewUrl({
                    year,
                    gender,
                    team,
                  })}
                  target="_blank"
                >
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={["Players", "On-Off", "RAPM", "Splits"]}>
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Team On-Off</Card.Title>
                <Card.Text>
                  See how the team stats vary with <i>each</i> player on/off the
                  court. (Unlike the Splits Analysis page which shows you more
                  detailed stats but for a selected player on/off)
                  <br />
                  <br />
                  Also provides a more detailed breakdown of players' RAPM
                  metric into 4-factors etc components.
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Team On-Off"))}
                {buildCardLink(
                  <b>Straight to the page!</b>,
                  (year, gender, team) =>
                    UrlRouting.getTeamReportUrl({
                      year,
                      gender,
                      team,
                      incRapm: true,
                    })
                )}
                <Card.Link
                  href={`https://hoop-explorer.blogspot.com/2020/03/understanding-team-report-onoff-page.html`}
                  target="_blank"
                >
                  Blog Post
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard
          hide={gender == "Women"}
          topics={["Players", "Multi-Year", "RAPM", "CSV Export"]}
        >
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>X-Season Player Charts</Card.Title>
                <Card.Text>
                  Build Your Own Visualization of how player stats are related,
                  or explore one of our built-in charts.
                  <br />
                  <br />A key feature of this page is that each "player season"
                  data set contains both their current and previous seasons, so
                  you can ask questions like "how did they improve"?
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Team On-Off"))}
                <Card.Link
                  href={UrlRouting.getPlayerSeasonComparisonUrl({
                    gender,
                    year,
                  })}
                  target="_blank"
                >
                  <b>Let's Go Charting!</b>
                </Card.Link>
                <Card.Link
                  href={`https://hoop-explorer.blogspot.com/2023/04/multi-season-player-analysis-chart.html`}
                  target="_blank"
                >
                  Blog Post
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={["Players"]}>
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Positional Analysis</Card.Title>
                <Card.Text>
                  A feature used to power a lot of cool stuff in Hoop Explorer
                  is the "positional role" categorization of each player based
                  on their box score stats (mostly offensive) and height.
                  <br />
                  <br />
                  <i>
                    It's not perfect (especially for the women), let me know if
                    you spot errors and I'll fix them.
                  </i>
                </Card.Text>
                <Card.Link
                  href={`https://hoop-explorer.blogspot.com/2020/05/classifying-college-basketball.html`}
                  target="_blank"
                >
                  <b>Blog Post</b>
                </Card.Link>
                <Card.Link href={`/Charts`} target="_blank">
                  Source Data
                </Card.Link>
                {buildCardLink(
                  <span>Team Details</span>,
                  (year, gender, team) =>
                    UrlRouting.getGameUrl(
                      {
                        year,
                        gender,
                        team,
                        showPosDiag: true,
                        showExpanded: true,
                        calcRapm: true,
                      },
                      {}
                    )
                )}
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={["Teams", "Leaderboards"]}>
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Build Your Own T25</Card.Title>
                <Card.Text>
                  The only team ranking <b>you</b> control! What matters to you
                  most - Wins? Efficiency? Dominance? Recency?
                  <br />
                  <br />
                  Pick the weights you want and see how the teams stack up...
                </Card.Text>
                {maybeMoreDetails(getCardIdFromTitle("Build Your Own T25"))}
                <Card.Link
                  href={UrlRouting.getTeamLeaderboardUrl({
                    gender,
                    year,
                  })}
                  target="_blank"
                >
                  <b>Just take me to the leaderboard!</b>
                </Card.Link>
                <Card.Link
                  href={`https://hoop-explorer.blogspot.com/2019/12/a-very-simple-and-transparent-ncaa-seed.html?view=classic`}
                  target="_blank"
                >
                  Blog Post
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
      </Row>
      <Footer
        year={ParamDefaults.defaultLeaderboardYear}
        gender={"Men"}
        server={server}
      />

      {/* Team selection modal */}
      <LandingPageSelectModal
        show={showTeamModal}
        onHide={() => setShowTeamModal(false)}
        onSave={handleTeamSave}
        visitOnSave={visitOnExitTeamModal}
        onClear={handleTeamClear}
        year={year}
        gender={gender}
        team={team}
      />

      {/* More Details Modal */}
      {selectedCardId && moreDetailsByCardId[selectedCardId] && (
        <LandingPageMoreDetails
          show={showMoreDetailsModal}
          onHide={handleMoreDetailsClose}
          title={moreDetailsByCardId[selectedCardId].title}
          content={moreDetailsByCardId[selectedCardId].content}
          imageList={moreDetailsByCardId[selectedCardId].imageList}
        />
      )}
    </Container>
  );
};

export default LandingPage;
