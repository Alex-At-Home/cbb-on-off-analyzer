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
            This site is intended for folks who want to explore college
            basketball stats one notch deeper than is possible with most other
            sites.
          </p>
          <p>
            The original goal, back in 2019, was to be{" "}
            <i>
              "
              <a target="_blank" href="https://kenpom.com">
                KenPom
              </a>{" "}
              /{" "}
              <a target="_blank" href="https://barttorvik.com">
                Bart Torvik
              </a>
              , but for lineups and user-defined splits and queries"
            </i>
            ; and while the scope has crept far beyond that (as you can see
            below!) the principle remains similar: I aim to be a complement to
            those excellent sites.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="text-center">
          <p>TODO Quick Select Topics</p>
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
                ... Well they will probably do a little better next season
                (skipping over some details!)
                <br />
                <br />
                This lets us do a few fun things during the Long Summer
                Months... <a href="#">(Click For More Info / Options)</a>
              </Card.Text>
              <Card.Link href="#">Just take me to the predictions!</Card.Link>
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
                the all-in-one production metric RAPM (or filtered/sorted by any
                other stat, or combination of stats!): <a href="">Here</a>
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
