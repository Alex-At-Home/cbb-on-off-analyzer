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
          <p>
            Hoop Explorer is a free and open Web App intended for folks who want
            to, well, <i>explore</i> college basketball stats ... one notch
            deeper than is possible with most other sites.
          </p>
          <p>
            It's used by college teams, NBA teams, Draft Twitter, sports
            bettors, analytics gurus, basketball journalists and bloggers, and
            (the group that includes me!) fans who enjoy digging into stats.{" "}
            <a href="#">Click Here To See Practical Examples Of Its Use.</a>
          </p>
          <p>
            The original goal, set back in 2019, was to be{" "}
            <i>
              "Like{" "}
              <a target="_blank" href="https://kenpom.com">
                KenPom
              </a>{" "}
              /{" "}
              <a target="_blank" href="https://barttorvik.com">
                Bart Torvik
              </a>
              , but for also lineups and with user-defined splits and queries"
            </i>
            ; and while the features have grown far beyond that (as you can see
            below!) the principle remains similar: I aim for Hoop Explorer to
            complement those excellent sites.
          </p>
          <p>
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
              <Card.Title>Offseason Predictions / Analysis</Card.Title>
              <Card.Text>
                Hoop Explorer builds a really simple prediction model for each
                roster: how did each player do last season (measured by the
                all-in-one production metric RAPM)...?
                <br />
                <br />
                ... Well they will probably do a little better next season, so
                add those up to get the team's Adjusted Efficiency Margin
                (skipping over some details!)
                <br />
                <br />
                This lets us do a few fun things during the Long Summer
                Months... <a href="#">(Click For More Info / Options)</a>
              </Card.Text>
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
                I never found pure lineup aggregations very useful, outside of
                early season "What is the coach's plan?" type questions. Still,
                you can see them <a href="">Here</a>.
                <br />
                <br />
                More interesting are various ways of combining lineups together
                into useful aggregates (eg{" "}
                <a href="">Evaluate backcourt combos</a>).{" "}
                <a href="">See Other Options Here.</a>
                <br />
                <br />
                There's also a leaderboard of all lineups (<a href="">Here</a>),
                though unless you want to export them for external analytics,
                you'll probably want the one filtered for higher frequency:{" "}
                <a href="">Here</a>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Player Leaderboards</Card.Title>
              <Card.Text>
                See all players with enough possessions (about 10mpg), sorted by
                the all-in-one production metric RAPM: <a href="">Here</a>
                <br />
                <br />
                You can see <a href="">Style Breakdowns</a> and{" "}
                <a href="">Shot Charts</a> for the top 50 shown players.
                <br />
                <br />
                By default this is per season, but you can also list players
                across multiple years: <a href="">Here</a>
                <br />
                <br />
                Almost nobody uses this, but you can even see players plotted on
                a map of their listed hometowns! (<a href="">Here</a>)
              </Card.Text>
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
                View, sort, and filter D1 teams by all sorts of basic and
                advanced team metrics and attributes in single (
                <a href="">Here</a>) or multiple (<a href="">Here</a>) seasons.
                <br />
                <br />
                Also see offensive and defensive <a href="">
                  Style Breakdowns
                </a>{" "}
                and <a href="">Shot Charts</a>.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Team And Roster Analysis - Default View</Card.Title>
              <Card.Text>
                With the default settings, one of the simplest pages on the
                site, but still very useful: show the "usual" Adjusted
                Efficiency, 4-Factors, shooting breakdowns for a given team and
                the players on its roster: <a href="">Here</a>
                <br />
                <br />
                ...And then you can also filter based on either presets (
                <a href="">Here</a>) or an advanced text query (
                <a href="">Here</a>).
                <br />
                <br />
                ...And then you can also split the data up based on either
                standard presets (<a href="">Here</a>) or based on as complex
                criteria as you want (<a href="">Here</a>).
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col className="mt-2">
          <Card>
            <Card.Body>
              <Card.Title>Team And Roster Analysis - Advanced Views</Card.Title>
              <Card.Text>TODO</Card.Text>
            </Card.Body>
          </Card>
        </Col>{" "}
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
