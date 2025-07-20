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
import { ParamDefaults, LandingPageParams } from "../utils/FilterModels";
import { DateUtils } from "../utils/DateUtils";
import ToggleButtonGroup from "../components/shared/ToggleButtonGroup";
import { ClientRequestCache } from "../utils/ClientRequestCache";
import LandingPageSelectModal from "../components/shared/LandingPageSelectModal";

type Props = {
  testMode?: boolean; //works around SSR issues, see below
};
const LandingPage: NextPage<Props> = ({ testMode }) => {
  const [gaInited, setGaInited] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(['All']));
  
  // Team selection state
  const [year, setYear] = useState<string>(ParamDefaults.defaultYear);
  const [gender, setGender] = useState<string>(ParamDefaults.defaultGender);
  const [team, setTeam] = useState<string>("");
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  
  // Initialize showIntro state from cache (default to true if not in cache)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const cachedValue = ClientRequestCache.decacheResponse('landing_show_intro', '', undefined);
      // If we have a cached value of false, use it; otherwise default to true
      return cachedValue === null || cachedValue.value !== false;
    }
    return true; // Default for server-side rendering
  });
  
  // Update cache when showIntro changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showIntro) {
        // For the default state (showIntro = true), we want to remove the entry
        // Since we can't directly remove it with ClientRequestCache (cacheKey is private),
        // we'll set an empty object to effectively clear it
        ClientRequestCache.cacheResponse('landing_show_intro', '', {}, undefined);
      } else {
        // Update cache when set to false
        ClientRequestCache.cacheResponse('landing_show_intro', '', { value: false }, undefined);
      }
    }
  }, [showIntro]);

  // Topic-filtered card component
  type TopicFilteredCardProps = {
    topics: string[];
    hide?: boolean;
    children: ReactNode;
  };

  const TopicFilteredCard: FC<TopicFilteredCardProps> = ({ topics, hide = false, children }) => {
    // Show the card if:
    // 1. hide is not set to true, AND
    // 2. Either 'All' is selected OR any of the card's topics are in the selected topics
    const showCard = !hide && (
      selectedTopics.has('All') || 
      topics.some(topic => selectedTopics.has(topic))
    );
    
    // Don't render anything if the card should be hidden
    if (!showCard) return null;
    
    // Otherwise render the children
    return <>{children}</>;
  };
  const router = useRouter();

  // Parse URL params on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Parse topics param
      const topicsParam = urlParams.get('topics');
      if (topicsParam) {
        const topicsList = topicsParam.split(',');
        // If 'All' is in the list, only include 'All'
        if (topicsList.includes('All')) {
          setSelectedTopics(new Set(['All']));
        } else {
          setSelectedTopics(new Set(topicsList));
        }
      }
      
      // Parse team selection params
      const yearParam = urlParams.get('year');
      if (yearParam) setYear(yearParam);
      
      const genderParam = urlParams.get('gender');
      if (genderParam) setGender(genderParam);
      
      const teamParam = urlParams.get('team');
      if (teamParam) setTeam(teamParam);
    }
  }, []);

  // Update URL when selected topics or team selection change - using useRef to track previous values
  const prevTopicsRef = useRef<string>('');
  const prevTeamSelectionRef = useRef<string>('');
  
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedTopics.size > 0) {
      const topicsArray = Array.from(selectedTopics);
      const currentTopicsStr = topicsArray.join(',');
      
      // Only update URL if topics have actually changed
      if (currentTopicsStr !== prevTopicsRef.current) {
        prevTopicsRef.current = currentTopicsStr;
        
        // Use setTimeout to ensure we're not calling replaceState too frequently
        const timer = setTimeout(() => {
          const urlParams = new URLSearchParams(window.location.search);
          
          // Only include the topics parameter if it's not just "All" selected
          if (topicsArray.length > 0 && !(topicsArray.length === 1 && topicsArray[0] === 'All')) {
            urlParams.set('topics', currentTopicsStr);
          } else {
            urlParams.delete('topics');
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
    if (typeof window !== 'undefined') {
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
            urlParams.set('year', year);
          } else {
            urlParams.delete('year');
          }
          
          if (gender) {
            urlParams.set('gender', gender);
          } else {
            urlParams.delete('gender');
          }
          
          if (team) {
            urlParams.set('team', team);
          } else {
            urlParams.delete('team');
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
    if (topic === 'All') {
      // If All was already selected, do nothing
      if (newTopics.has('All')) {
        return;
      }
      // Clear all other selections and only select "All"
      newTopics.clear();
      newTopics.add('All');
    } else {
      // For regular topics
      if (newTopics.has(topic)) {
        // If the topic is already selected, remove it
        newTopics.delete(topic);
        // If no topics are left, select "All"
        if (newTopics.size === 0) {
          newTopics.add('All');
        }
      } else {
        // If the topic isn't selected, add it and remove "All" if it was selected
        newTopics.delete('All');
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
  const handleTeamSave = (newYear: string, newGender: string, newTeam: string) => {
    setYear(newYear);
    setGender(newGender);
    setTeam(newTeam);
    setShowTeamModal(false);
  };

  const handleTeamClear = () => {
    setTeam("");
    setShowTeamModal(false);
  };

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
          {showIntro && (
            <Card id="intro">
              <Card.Body>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="close-tooltip">Hide the welcome message</Tooltip>}
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
                overlay={<Tooltip id="welcome-tooltip">Show the welcome message</Tooltip>}
              >
                <a href="#" onClick={(e) => { e.preventDefault(); setShowIntro(true); }}>(welcome)</a>
              </OverlayTrigger>
            )}
          </div>
          <p style={{ display: "inline-block" }}>
            <b>Currently selected team</b>:{" "}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="team-select-tooltip">(Optional) select a team-season to use when following any of the links below</Tooltip>}
            >
              <a href="#" onClick={(e) => { e.preventDefault(); setShowTeamModal(true); }}>
                {team && year && gender ? `${year} | ${gender} | ${team} (edit)` : "Select Here"}
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
                toggled: selectedTopics.has('All'),
                onClick: () => handleTopicToggle('All'),
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
                toggled: selectedTopics.has('Teams'),
                onClick: () => handleTopicToggle('Teams'),
              },
              {
                label: "Players",
                tooltip: "Show/hide topic cards related to Players",
                toggled: selectedTopics.has('Players'),
                onClick: () => handleTopicToggle('Players'),
              },
              {
                label: "Lineups",
                tooltip: "Show/hide topic cards related to Lineups",
                toggled: selectedTopics.has('Lineups'),
                onClick: () => handleTopicToggle('Lineups'),
              },
              {
                label: "Games",
                tooltip: "Show/hide topic cards related to Games",
                toggled: selectedTopics.has('Games'),
                onClick: () => handleTopicToggle('Games'),
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
                toggled: selectedTopics.has('Leaderboards'),
                onClick: () => handleTopicToggle('Leaderboards'),
              },
              {
                label: "RAPM",
                tooltip: "Show/hide topic cards related to RAPM",
                toggled: selectedTopics.has('RAPM'),
                onClick: () => handleTopicToggle('RAPM'),
              },
              {
                label: "On-Off",
                tooltip: "Show/hide topic cards related to On-Off",
                toggled: selectedTopics.has('On-Off'),
                onClick: () => handleTopicToggle('On-Off'),
              },
              {
                label: "Splits",
                tooltip: "Show/hide topic cards related to Splits",
                toggled: selectedTopics.has('Splits'),
                onClick: () => handleTopicToggle('Splits'),
              },
              {
                label: "CSV Export",
                tooltip: "Show/hide topic cards related to CSV Export",
                toggled: selectedTopics.has('CSV Export'),
                onClick: () => handleTopicToggle('CSV Export'),
              },
              {
                label: "Off-Season",
                tooltip: "Show/hide topic cards related to Off-Season",
                toggled: selectedTopics.has('Off-Season'),
                onClick: () => handleTopicToggle('Off-Season'),
              },
              {
                label: "Multi-Year",
                tooltip: "Show/hide topic cards related to Multi-Year",
                toggled: selectedTopics.has('Multi-Year'),
                onClick: () => handleTopicToggle('Multi-Year'),
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
                toggled: selectedTopics.has('Shot Charts'),
                onClick: () => handleTopicToggle('Shot Charts'),
              },
              {
                label: "Play Types",
                tooltip: "Show/hide topic cards related to Play Types",
                toggled: selectedTopics.has('Play Types'),
                onClick: () => handleTopicToggle('Play Types'),
              },
              {
                label: "Misc Charts",
                tooltip: "Show/hide topic cards related to Misc Charts",
                toggled: selectedTopics.has('Misc Charts'),
                onClick: () => handleTopicToggle('Misc Charts'),
              },
            ]}
          />
        </Col>
      </Row>
      <Row xs={1} sm={1} md={1} lg={2} xl={3} className="g-4 mb-4">
        <TopicFilteredCard hide={true} topics={['Examples', 'Teams', 'Players', 'Lineups', 'Games', 'RAPM', 'On-Off', 'Splits', 'CSV Export', 'Shot Charts', 'Play Types', 'Misc Charts']}>
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
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Off-Season', 'Teams']}>
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
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Lineups', 'Teams']}>
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
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Players', 'Leaderboards', 'RAPM']}>
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
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Players', 'Leaderboards']}>
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Generic Player Stats</Card.Title>
                <Card.Text>
                  All the basic stats - but with the ability to do
                  filtering/sorting by conference and other dimensions.
                  <br />
                  <br />
                  Includes (depending on availability): USG, eFG, ORB/DRB, ORtg/DRtg, TS%, A:TO, Win Shares, BPM
                  variants...
                </Card.Text>
                <Card.Link href="#">More details...</Card.Link>
                <Card.Link href="#">
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Teams', 'Players', 'Splits', 'Shot Charts']}>
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
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Play Types', 'Teams', 'Players']}>
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
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Shot Charts', 'Teams', 'Players']}>
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
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Teams', 'Players', 'On-Off', 'RAPM']}>
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Team On-Off</Card.Title>
                <Card.Text>
                  See how the team stats vary with each player on/off the court.
                  <br />
                  <br />
                  Also provides a more detailed breakdown of players' RAPM metric
                  into 4-factors etc components.
                </Card.Text>
                <Card.Link href="#">More details...</Card.Link>
                <Card.Link href="#">
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Teams', 'Leaderboards']}>
          <Col className="mt-2">
            <Card>
              <Card.Body>
                <Card.Title>Team Efficiency Stats</Card.Title>
                <Card.Text>
                  Team-focused, conference-adjusted team efficiency stats.
                  <br />
                  <br />
                  Sort by Adjusted Efficiency Margin, Offensive Efficiency, or
                  Defensive Efficiency, see 1/2/3 point shooting stats, turnover
                  percentages, etc.
                </Card.Text>
                <Card.Link href="#">More details...</Card.Link>
                <Card.Link href="#">
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Games', 'Teams', 'Players', 'Lineups', 'Play Types']}>
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
                <Card.Link href="#">More details...</Card.Link>
                <Card.Link href="#">
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Games', 'Teams', 'Players', 'Play Types', 'Shot Charts']}>
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
                <Card.Link href="#">More details...</Card.Link>
                <Card.Link href="#">
                  <b>Straight to the page!</b>
                </Card.Link>
              </Card.Body>
            </Card>
          </Col>
        </TopicFilteredCard>
        <TopicFilteredCard topics={['Teams', 'Leaderboards']}>
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
                <Card.Link href="#">More details...</Card.Link>
                <Card.Link href="#">
                  <b>Just take me to the leaderboard!</b>
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
        onClear={handleTeamClear}
        year={year}
        gender={gender}
        team={team}
      />
    </Container>
  );
};

export default LandingPage;
