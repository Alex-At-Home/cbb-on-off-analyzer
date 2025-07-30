// Google analytics:
import { initGA, logPageView } from "../utils/GoogleAnalytics";

// React imports:
import React, { useState, useEffect } from "react";
import Router, { useRouter } from "next/router";
import Link from "next/link";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tab from "react-bootstrap/Tab";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Alert from "react-bootstrap/Alert";

// App components:
import Footer from "../components/shared/Footer";
import HeaderBar from "../components/shared/HeaderBar";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
import LandingPageIcon from "../components/shared/LandingPageIcon";
import SiteModeDropdown from "../components/shared/SiteModeDropdown";

// Utils:

const ChartsPage: NextPage<{}> = () => {
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

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  // View

  // Changes made to Vega charts:
  // url="/high_major_positions.html"
  //    - {"continuousWidth": 680, "continuousHeight": 510}
  //    -   <div id="vis" style="margin-left: 50px"></div>

  const defaultChart = "high_major_positions";

  // Stateful management of the page for deep linking

  const [tabKey, setTabKey] = useState(defaultChart);
  useEffect(() => {
    const hashOnLoad =
      typeof window === `undefined`
        ? defaultChart
        : (window.location.hash || `#${defaultChart}`).substring(1);
    setTabKey(hashOnLoad);
  }, []);

  // Links that we'll only show in blog mode
  const maybeShowBlogArticle = (chart: string) => {
    const isPublicSite = !_.startsWith(server, "cbb-on-off-analyzer");

    const chartToUrl: Record<string, string> = {
      high_major_positions:
        "https://hoop-explorer.blogspot.com/2020/05/classifying-college-basketball.html",
    };
    if (isPublicSite) {
      return (
        <span>
          &nbsp;A description of the fields and methodology used is{" "}
          <a target="_blank" href={chartToUrl[chart]}>
            here
          </a>
          .
        </span>
      );
    }
  };

  // Positional chart loading?
  const [positionChartLoading, setPositionChartLoading] = useState(true);
  const highMajorPositionChart: React.RefObject<HTMLIFrameElement> =
    React.createRef();

  useEffect(() => {
    // On window load, if iframe has insta-loaded then onLoad doesn't fire so clear here:
    if (
      highMajorPositionChart?.current?.contentDocument?.readyState == "complete"
    ) {
      setPositionChartLoading(false);
    }
  }, []);

  return (
    <Container>
      <SiteModeDropdown />
      <Row className="mt-2">
        <Col xs={12} className="text-center">
          <LandingPageIcon />
          <h3>Analysis Tool - Interesting Charts</h3>
        </Col>
      </Row>
      <Row>
        <HeaderBar common={{}} thisPage={"charts"} />
      </Row>
      <Row className="border-top">
        <Nav>
          <NavDropdown title="View Charts" id="chartSelection">
            <NavDropdown.Item
              href="#high_major_positions"
              onSelect={() => setTabKey("high_major_positions")}
              eventKey="high_major_positions"
            >
              Position Analysis 2010+
            </NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </Row>
      <Row>
        <Tab.Container activeKey={tabKey}>
          <Row>
            <Tab.Content>
              <Tab.Pane eventKey="high_major_positions">
                <div>
                  <Alert variant="info" className="small">
                    <em>
                      A 2-d visualization of the different positions (P6
                      2010-2020, all D1 2015-2020).
                      {maybeShowBlogArticle(tabKey)}
                      &nbsp;The data came from{" "}
                      <a
                        target="_blank"
                        href="http://adamcwisports.blogspot.com/p/data.html"
                      >
                        barttorvik.com
                      </a>
                      , much appreciated!
                      <br />
                      The graph below is interactive - you can scroll in or out,
                      move around, highlight specific teams, etc. Note - it can
                      be a bit slow!
                      <br />
                    </em>
                  </Alert>
                  <LoadingOverlay
                    active={positionChartLoading}
                    text="Loading Chart"
                  >
                    <iframe
                      onLoad={() => {
                        //(sometimes this fires too early, handled in useEffect above)
                        setPositionChartLoading(false);
                      }}
                      ref={highMajorPositionChart}
                      frameBorder="0"
                      src="/high_major_positions.html"
                      width="1024px"
                      height="700px"
                    />
                  </LoadingOverlay>
                  <Alert variant="info" className="small">
                    <em>
                      The x- and y- axis are linear combinations of the input
                      features that are hard to interpret in basketball terms.
                      But basically:
                      <ul>
                        <li>
                          Left-to-right is "guard-like" to "forward-like":
                        </li>
                        <ul>
                          <li>
                            leftwards: 3P%, Assist rate, 3P rate, steal rate
                          </li>
                          <li>
                            rightwards: DRB%, ORB%, dunk rate, mid-2P rate,
                            block rate, foul rate
                          </li>
                        </ul>
                        <li>
                          Top-to-bottom is a mishmash of position-specific
                          bonuses/penalties: combined because we only have 2-d
                          to play with!
                        </li>
                        <ul>
                          <li>
                            upwards: AST/TOV, Assist rate, TO rate, steal rate;
                            dunk/rim rate, mid-2P rate, block rate
                          </li>
                          <li>
                            downwards: 3P rate, rim shooting ability,
                            assists/FG; DRB%, ORB%
                          </li>
                        </ul>
                      </ul>
                    </em>
                  </Alert>
                </div>
              </Tab.Pane>
            </Tab.Content>
          </Row>
        </Tab.Container>
      </Row>
    </Container>
  );
};
export default ChartsPage;
