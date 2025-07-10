// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect, useRef } from "react";
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

// App imports:
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";
import { ParamDefaults } from "../utils/FilterModels";
import { DateUtils } from "../utils/DateUtils";
import ToggleButtonGroup from "../components/shared/ToggleButtonGroup";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const LandingPage: NextPage<Props> = ({ testMode }) => {
  const [gaInited, setGaInited] = useState(false);

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

  return (
    <Container className="medium_screen">
      <Row>
        <Col xs={12} className="text-center">
          <h3>Welcome to Hoop Explorer!</h3>
        </Col>
      </Row>
      <Row className="border-bottom">
        <HeaderBar
          common={{
            gender: "Men",
            year: DateUtils.getLastSeasonWithDataFrom(
              ParamDefaults.defaultLeaderboardYear
            ),
          }}
          thisPage={`home`}
        />
      </Row>
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <Card>
            <Card.Body>
              <CloseButton
                aria-label="Close"
                style={{ marginTop: -15 }}
                className="float-right" // Set position-absolute, top, right, and margin
              />
              <Card.Text style={{ fontSize: "1.2rem" }}>
                <p>
                  Hoop Explorer is a free and open Web App intended for folks
                  who want to, well, <i>explore</i> college basketball stats ...
                  one notch deeper than is possible with most other sites.
                </p>
                <p>
                  It's used by college teams, NBA teams, Draft Twitter, sports
                  bettors, analytics gurus, basketball journalists and bloggers,
                  and (the group that includes me!) fans who enjoy digging into
                  stats when there are no games to watch.
                </p>
                <span>
                  The original goal, back in 2019, was to be{" "}
                  <i>
                    "Like{" "}
                    <a target="_blank" href="https://kenpom.com">
                      KenPom
                    </a>{" "}
                    /{" "}
                    <a target="_blank" href="https://barttorvik.com">
                      Bart Torvik
                    </a>
                    , but for also lineups and with user-defined splits and
                    queries"
                  </i>
                  ; and while the features have grown far beyond that (as you
                  can see below!) the principle remains similar: I want Hoop
                  Explorer to complement those excellent sites.
                </span>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mt-2 mb-2">
        <Col xs={12} className="text-center" style={{ position: "relative" }}>
          <div style={{ position: "absolute", right: 20 }}>
            <br className="d-block d-md-none" />
            <a href="">(welcome)</a>
          </div>
          <p style={{ display: "inline-block" }}>
            <b>Currently selected team</b>:{" "}
            <a href="#">2024/25 | Men | Maryland (edit)</a>
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
                tooltip: "",
                toggled: true,
                onClick: () => {},
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
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Players",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Lineups",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Games",
                tooltip: "",
                toggled: false,
                onClick: () => {},
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
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "RAPM",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "On-Off",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Splits",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "CSV Export",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Off-Season",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Multi-Year",
                tooltip: "",
                toggled: false,
                onClick: () => {},
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
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Play Types",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
              {
                label: "Misc Charts",
                tooltip: "",
                toggled: false,
                onClick: () => {},
              },
            ]}
          />
        </Col>
      </Row>
      <Row xs={1} sm={1} md={1} lg={2} xl={3} className="g-4 mb-4">
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Practical Examples</Card.Title>
              <Card.Text>
                Some screenshots / descriptions / links of Hoop Explorer uses in
                the wild.
                <br />
                <br />
                Have a browse to get an idea of some of the features!
              </Card.Text>
              <Card.Link href="#">
                <b>Show me Examples!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Offseason Predictions / Analysis</Card.Title>
              <Card.Text>
                Check out Hoop Explorer's very simple off-season predictions.
                <br />
                <br />A key point is that I show in detail how they are
                constructed and let you play with them to fix the bits you don't
                like.
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Just take me to the predictions!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Team Lineup Analysis</Card.Title>
              <Card.Text>
                All sorts of metrics about the different lineups played by the
                selected team.
                <br />
                <br />
                The best bit is the ability to combine stats for lineups, based
                on various groupings (frontcourt, backcourt, etc).
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Straight to the page!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
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
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Just take me to the leaderboard!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Team Stats Explorer</Card.Title>
              <Card.Text>
                View, sort, and filter D1 teams by lots of basic and advanced
                team metrics across single or multiple seasons.
                <br />
                <br />
                Also see offensive and defensive Style Breakdowns and Shot
                Charts.
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Let Me Explore!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Team And Roster Analysis / Splits</Card.Title>
              <Card.Text>
                The classic "KenPom"-like page showing team Adjusted Efficiency,
                4-factors, etc and player offensive/defensive ratings, shooting
                stats, etc...
                <br />
                <br />
                ... And a lot more: Filters! Splits! Style! Shot Charts! etc
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>I'm Sold! Let's Go</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Play Type / Style Analysis</Card.Title>
              <Card.Text>
                Maybe Hoop Explorer's most unique feature - break down a team or
                player's offense or defense into intuitive "style" categories
                ("Post-Up", "Transition", "Perimeter Sniper", etc)
                <br />
                <br />
                Accesible from lots of pages - see "More Details".
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Show Me For The Top 10 Teams!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Shot Charts</Card.Title>
              <Card.Text>
                Many pages allow you to view a hex map of team or player shots,
                showing frequency and efficiency vs D1 averages.
                <br />
                <br />
                Accesible from lots of pages - see "More Details". Particularly
                interesting with filters and splits!
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Show Me For The Top 10 Teams!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Team On-Off</Card.Title>
              <Card.Text>
                TODO
                <br />
                <br />
                TODO
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Straight to the page!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Game Reports</Card.Title>
              <Card.Text>
                TODO
                <br />
                <br />
                TODO
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Straight to the page!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Game Previews</Card.Title>
              <Card.Text>
                TODO
                <br />
                <br />
                TODO
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Straight to the page!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Build Your Own T25</Card.Title>
              <Card.Text>
                TODO
                <br />
                <br />
                TODO
              </Card.Text>
              <Card.Link href="#">More details...</Card.Link>
              <Card.Link href="#">
                <b>Just take me to the leaderboard!</b>
              </Card.Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Footer
        year={ParamDefaults.defaultLeaderboardYear}
        gender={"Men"}
        server={server}
      />
    </Container>
  );
};

export default LandingPage;
