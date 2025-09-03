// React imports:
import React, { useState } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Data imports:
import { dataLastUpdated } from "../../utils/internal-data/dataLastUpdated";
import { DateUtils } from "../../utils/DateUtils";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { ClientRequestCache } from "../../utils/ClientRequestCache";

type Props = {
  readonly server: string;
  readonly year?: string;
  readonly gender?: string;
  readonly dateOverride?: number;
};

const Footer: React.FunctionComponent<Props> = ({
  server,
  gender,
  year,
  dateOverride,
}) => {
  const emailAddress = "bWFpbHRvOmhvb3AuZXhwbG9yZXJAZ21haWwuY29t";
  const twitterAddress = "aHR0cHM6Ly90d2l0dGVyLmNvbS9JdHNBVGVycF9DQkI=";

  const lastUpdated = _.flow([
    (maybeYear: string, maybeGender: string) => [
      maybeYear || "",
      maybeGender || "",
    ],
    (yearGender: string) =>
      dataLastUpdated[`${yearGender[1]}_${yearGender[0]}`],
    (lastUpdate: string | undefined) =>
      lastUpdate || dateOverride
        ? new Date(
            (dateOverride || parseInt(lastUpdate || "0")) * 1000
          ).toString()
        : "unknown",
    // Some browsers (cough firefox cough), show the timezone in full format which is annoyingly long
    // so turn the timezone into initials in that case
    (lastUpdate: string) =>
      lastUpdate.replace(
        /[(]([A-Z][a-z][^)]*)+[)]/,
        (match: string, ...args: any[]) => {
          return `(${args[0]
            .split(" ")
            .map((w: string) => w?.[0] || "")
            .join("")})`;
        }
      ),
  ]);

  const onMouseOver = (encoded: string) => (event: any) => {
    if (
      !_.startsWith(event.target.href, "mailto:") &&
      !_.startsWith(event.target.href, "https://twitter.com")
    ) {
      event.target.href = atob(encoded);
    }
  };

  const publicSite = !_.startsWith(server, "cbb-on-off-analyzer");

  const womenStatsSource =
    _.startsWith(year, "2018") || _.startsWith(year, "2019") ? (
      <a href="https://herhoopstats.com" target="_blank">
        herhoopstats.com
      </a>
    ) : (year || "2024") >= "2024" ? (
      <a href="https://barttorvik.com/ncaaw/trank.php" target="_blank">
        barttorvik.com
      </a>
    ) : (
      <a href="https://masseyratings.com/cbw/ncaa-d1/ratings" target="_blank">
        masseyratings.com
      </a>
    );

  // (only display twitter on public site, for analytics purposes)
  return (
    <Container>
      <Row>
        <Col>
          <i>
            <small>
              Data updated: [{lastUpdated(year, gender)}] [
              <OverlayTrigger
                placement="auto"
                overlay={
                  <Tooltip id="clearCache">
                    If the data appears out of date trying clicking here to
                    clear the cache and refresh the page
                  </Tooltip>
                }
              >
                <a
                  href="#"
                  onClick={(e) => {
                    ClientRequestCache.clearCache();
                    window.location.reload();
                  }}
                >
                  Clear Cache
                </a>
              </OverlayTrigger>
              ]
            </small>
          </i>
        </Col>
        <Col>
          <span className="float-right">
            <i>
              <small>
                PbP events and roster info from{" "}
                <a href="https://stats.ncaa.org" target="_blank">
                  stats.ncaa.org
                </a>{" "}
                and{" "}
                <a href="https://collegebasketballdata.com" target="_blank">
                  collegebasketballdata.com
                </a>
              </small>
            </i>
          </span>
        </Col>
      </Row>
      <Row>
        <Col>
          <i>
            <small>
              It's a beta(-ish!), so let me know if you see anything
              weird:&nbsp;
              {publicSite ? (
                <span>
                  <a
                    href={twitterAddress}
                    target="_blank"
                    onMouseOver={onMouseOver(twitterAddress)}
                  >
                    twitter
                  </a>
                  &nbsp;/&nbsp;
                </span>
              ) : null}
              <a
                href={emailAddress}
                target="_blank"
                onMouseOver={onMouseOver(emailAddress)}
              >
                email
              </a>
            </small>
          </i>
        </Col>
        <Col>
          <span className="float-right">
            <i>
              <small>
                SoS stats with kind permission from{" "}
                <a href="https://kenpom.com" target="_blank">
                  kenpom.com
                </a>{" "}
                and {womenStatsSource}
              </small>
            </i>
          </span>
        </Col>
      </Row>
    </Container>
  );
};

export default Footer;
