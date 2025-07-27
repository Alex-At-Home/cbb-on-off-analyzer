// React imports:
import React, { useState, useEffect, useRef } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
//@ts-ignore
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faPen, faEye } from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ConferenceSelector, {
  ConfSelectorConstants,
} from "./shared/ConferenceSelector";

// Table building
// Util imports
import {
  TeamEditorParams,
  PlayerSeasonComparisonParams,
  ParamDefaults,
} from "../utils/FilterModels";

import { Statistic, RosterEntry, PureStatSet } from "../utils/StatModels";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { GradeUtils } from "../utils/stats/GradeUtils";
import { UrlRouting } from "../utils/UrlRouting";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import TeamEditorTable, { TeamEditorStatsModel } from "./TeamEditorTable";
import { DateUtils } from "../utils/DateUtils";
import { InputGroup } from "react-bootstrap";
import AsyncFormControl from "./shared/AsyncFormControl";

// Library imports:
import fetch from "isomorphic-unfetch";
import { RequestUtils } from "../utils/RequestUtils";
import { OffseasonLeaderboardUtils } from "../utils/stats/OffseasonLeaderboardUtils";

// Recharts imports:
//@ts-ignore
import {
  ReferenceArea,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Label,
  Cell,
} from "recharts";
import { GoodBadOkTriple } from "../utils/stats/TeamEditorUtils";
import { CbbColors } from "../utils/CbbColors";
import {
  NicknameToConference,
  NonP6Conferences,
  Power6Conferences,
} from "../utils/public-data/ConferenceInfo";
import ThemedSelect from "./shared/ThemedSelect";

type Props = {
  startingState: PlayerSeasonComparisonParams;
  dataEvent: TeamEditorStatsModel;
  onChangeState: (newParams: PlayerSeasonComparisonParams) => void;
};

/** Set to true to rebuild public/leaderboard/lineups/stats_all_Men_YYYY_Preseason.json */
const logDivisionStatsToConsole = false;

/** Will dump out some possible manual overrides to be made */
const diagnosticCompareWithRosters = false;

const TransferRapmComparisonChart: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data model

  // (don't support tier changes)
  const tier: string = "All";

  // Data source
  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);
  const [confs, setConfs] = useState(startingState.confs || "");
  const hasCustomFilter =
    confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0;

  const [year, setYear] = useState(
    startingState.year || DateUtils.mostRecentYearWithData
  );
  const yearWithStats = DateUtils.getPrevYear(year);

  const [gender, setGender] = useState("Men"); // TODO ignore input just take Men

  const [queryFilters, setQueryFilters] = useState(
    startingState.queryFilters || ""
  );

  const [rostersPerTeam, setRostersPerTeam] = useState(
    {} as Record<string, Record<string, RosterEntry>>
  );

  const [height, setHeight] = useState(512);
  const latestHeight = useRef(height);
  useEffect(() => {
    function handleResize() {
      setTimeout(() => {
        setHeight(window.innerHeight);
      }, 250);
    }
    window.addEventListener("resize", handleResize);
    setHeight(window.innerHeight);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Chart control
  if (diagnosticCompareWithRosters && _.isEmpty(rostersPerTeam)) {
    const fetchRosterJson = (teamName: string) => {
      const rosterJsonUri = (encodeEncodePrefix: boolean) =>
        `/rosters/${gender}_${(year || "").substring(0, 4)}` +
        `/${RequestUtils.fixLocalhostRosterUrl(
          teamName,
          encodeEncodePrefix
        )}.json`;
      return fetch(rosterJsonUri(true))
        .then((resp: any) => resp.json())
        .then(
          (json: any) =>
            [teamName, json] as [string, Record<string, RosterEntry>]
        );
    };
    const rosterPromises: Promise<[string, Record<string, RosterEntry>]>[] =
      _.flatMap(AvailableTeams.byName, (teams, __) => {
        const maybeTeam = teams.find(
          (t) => t.year == yearWithStats && t.gender == gender
        );
        return maybeTeam
          ? [
              fetchRosterJson(maybeTeam.team).catch(
                //(carry on error, eg if the file doesn't exist)
                (err: any) => [maybeTeam.team, {}]
              ),
            ]
          : [];
      });
    if (_.isEmpty(rosterPromises)) {
      setRostersPerTeam({});
    } else {
      Promise.all(rosterPromises).then(
        (rosterInfo: [string, Record<string, RosterEntry>][]) => {
          setRostersPerTeam(_.fromPairs(rosterInfo));
        }
      );
    }
  }

  /** When the params change */
  useEffect(() => {
    onChangeState({
      year: year,
      confs,
      queryFilters: queryFilters,
    });
  }, [confs, year, queryFilters]);

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  useEffect(() => {
    // Add and remove clipboard listener
    initClipboard();

    if (typeof document !== `undefined`) {
      //(if we added a clipboard listener, then remove it on page close)
      //(if we added a submitListener, then remove it on page close)
      return () => {
        if (clipboard) {
          clipboard.destroy();
          setClipboard(null);
        }
      };
    }
  });
  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_offSeasonTeamLeaderboard`, {
        text: function (trigger) {
          return window.location.href;
        },
      });
      newClipboard.on("success", (event: ClipboardJS.Event) => {
        //(unlike other tables, don't add to history)
        // Clear the selection in some visually pleasing way
        setTimeout(function () {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  }

  /** At the expense of some time makes it easier to see when changes are happening */
  const friendlyChange = (
    change: () => void,
    guard: boolean,
    timeout: number = 250
  ) => {
    if (guard) {
      setLoadingOverride(true);
      setTimeout(() => {
        change();
      }, timeout);
    }
  };

  // 2] Processing

  const editTooltip = (
    <Tooltip id="editTooltip">
      Show/Hide the inline Team Viewer and Editor{" "}
    </Tooltip>
  );

  const chart = React.useMemo(() => {
    const waitForRosterDiagMode =
      diagnosticCompareWithRosters && _.isEmpty(rostersPerTeam);
    if (waitForRosterDiagMode || _.isEmpty(dataEvent.players)) {
      // If we don't have players we're not done loading yet, so put up a loading screen:
      return <div></div>;
    } else {
      setLoadingOverride(false);
    }

    // The avgEff based on which the stats were calc'd (yearWithStats) and what actually happened (year)
    const avgEff =
      efficiencyAverages[`${gender}_${yearWithStats}`] ||
      efficiencyAverages.fallback;
    const actualResultsAvgEff =
      efficiencyAverages[`${gender}_${year}`] || efficiencyAverages.fallback;

    // Team stats generation business logic:
    const {
      derivedDivisionStats,
      teamRanks,
      numTeams,
      netEffToRankMap,
      actualNetEffToRankMap,
      offEffToRankMap,
      defEffToRankMap,
    } = OffseasonLeaderboardUtils.buildAllTeamStats(
      dataEvent,
      {
        confs,
        year,
        gender,
        sortBy: "",
        evalMode: true,
        diagnosticCompareWithRosters,
      },
      {},
      rostersPerTeam,
      avgEff,
      actualResultsAvgEff,
      true
    );

    //Useful for building late off-season grade lists (copy to public/leaderboard/lineups/stats_all_Men_YYYY_Preseason.json)
    //(note this gets printed out multiple times - ignore all but the last time, it doesn't have all the data yet)
    if (logDivisionStatsToConsole && server == "localhost") {
      console.log(JSON.stringify(derivedDivisionStats));
    }

    const fieldValExtractor = (field: string) => {
      return (p: PureStatSet | undefined) => {
        if (field[0] == "o" || field[0] == "d") {
          return p?.[field]?.value || 0;
        } else {
          return (
            (p?.[`off_${field}`]?.value || 0) -
            (p?.[`def_${field}`]?.value || 0)
          );
        }
      };
    };

    type CustomTooltipProps = {
      active?: boolean;
      payload?: any;
      label?: string;
    };
    const extractBubbleAttr = (fieldDef: string) => {
      const typeAndField = fieldDef.split(":");
      const fieldType =
        typeAndField.length > 1 ? typeAndField[0] : "actualResults";
      const field = typeAndField.length > 1 ? typeAndField[1] : typeAndField[0];

      const fieldExtractor = fieldValExtractor(field);
      return (p: GoodBadOkTriple) => {
        const tripleAsMap = p as unknown as Record<
          string,
          Record<string, Statistic>
        >;
        if (fieldType == "delta") {
          return fieldExtractor(p.actualResults) - fieldExtractor(p.ok);
        } else if (fieldType == "deltaHistory") {
          return fieldExtractor(p.actualResults) - fieldExtractor(p.orig);
        } else {
          return fieldExtractor(tripleAsMap[fieldType]);
        }
      };
    };
    const oRtgExtractor = extractBubbleAttr("delta:off_rtg");
    const usageExtractor = extractBubbleAttr("delta:off_usage");
    const possExtractor = extractBubbleAttr("delta:off_team_poss_pct");
    const CustomTooltip: React.FunctionComponent<CustomTooltipProps> = ({
      active,
      payload,
      label,
    }) => {
      const bOrW = (f: number) => {
        return `${Math.abs(f).toFixed(1)} ${
          f > 0 ? "better" : "worse"
        } than expected`;
      };
      if (active) {
        const data = payload?.[0].payload || {};
        const net = data.x + data.y;
        const triple = data.p;
        const deltaORtg = oRtgExtractor(triple);
        const deltaUsage = usageExtractor(triple);
        const deltaMpg = possExtractor(triple);
        return (
          <div
            className="custom-tooltip"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
            }}
          >
            <small>
              <p className="label">
                <b>
                  {`${triple.actualResults?.key}`}
                  <br />
                  {`${triple.actualResults?.team}`}
                </b>
                <br />
                <i>
                  {`${triple.actualResults?.posClass}`}
                  {` ${triple.orig?.roster?.height || "?-?"}`}
                </i>
              </p>
              <p className="desc">
                <span>
                  Net RAPM:{" "}
                  <b>
                    {fieldValExtractor("adj_rapm")(
                      data?.p?.actualResults
                    ).toFixed(1)}
                  </b>{" "}
                  pts/100
                </span>
                <br />
                <span>
                  <i>({bOrW(net)})</i>
                </span>
                <br />
                <span>
                  Off RAPM:{" "}
                  <b>
                    {fieldValExtractor("off_adj_rapm")(
                      data?.p?.actualResults
                    ).toFixed(1)}
                  </b>{" "}
                  pts/100
                </span>
                <br />
                <span>
                  <i>({bOrW(data.x)})</i>
                </span>
                <br />
                <span>
                  Def RAPM:{" "}
                  <b>
                    {fieldValExtractor("def_adj_rapm")(
                      data?.p?.actualResults
                    ).toFixed(1)}
                  </b>{" "}
                  pts/100
                </span>
                <br />
                <span>
                  <i>({bOrW(data.y)})</i>
                </span>
                <br />
                <span>
                  Off Rtg:{" "}
                  <b>
                    {fieldValExtractor("off_rtg")(
                      data?.p?.actualResults
                    ).toFixed(1)}
                  </b>
                </span>
                <br />
                <span>
                  <i>({bOrW(deltaORtg)})</i>
                </span>
                <br />
                <span>
                  Usage:{" "}
                  <b>
                    {(
                      fieldValExtractor("off_usage")(data?.p?.actualResults) *
                      100
                    ).toFixed(1)}
                  </b>
                  %
                </span>
                <br />
                <span>
                  <i>({bOrW(100 * deltaUsage)})</i>
                </span>
                <br />
                <span>
                  Mpg:{" "}
                  <b>
                    {(
                      fieldValExtractor("off_team_poss_pct")(
                        data?.p?.actualResults
                      ) * 40
                    ).toFixed(1)}
                  </b>
                </span>
                <br />
                <span>
                  <i>({bOrW(40 * deltaMpg)})</i>
                </span>
                <br />
                <br />
                <span>
                  <i>(Previous school: {data?.p?.orig.team})</i>
                </span>
              </p>
            </small>
          </div>
        );
      }
      return null;
    };

    const extractTitle = (fieldDef: string) => {
      const typeAndField = fieldDef.split(":");
      const fieldType =
        typeAndField.length > 1 ? typeAndField[0] : "actualResults";
      const field = typeAndField.length > 1 ? typeAndField[1] : typeAndField[0];

      const humanFieldMap: Record<string, string> = {
        off_adj_rapm: "Off RAPM",
        def_adj_rapm: "Def RAPM",
      };
      const humanFieldTypeMap: Record<string, string> = {
        delta: "(actual - predicted)",
        deltaHistory: "(actual - last year)",
        actualResults: "(actual)",
      };
      return `${humanFieldMap[field] || field} ${
        humanFieldTypeMap[fieldType] || ""
      }`;
    };

    const xAxisExtractor = extractBubbleAttr("delta:off_adj_rapm");
    const yAxisExtractor = extractBubbleAttr("delta:def_adj_rapm");
    const zAxisExtractor = extractBubbleAttr("off_team_poss_pct");
    const colorExtractor = extractBubbleAttr("adj_rapm");

    const hasCustomFilter =
      confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0;
    const specialCases = {
      P6: Power6Conferences,
      MM: NonP6Conferences,
    } as Record<string, any>;
    const confSet = confs
      ? new Set(
          _.flatMap(
            (confs || "").split(","),
            (c) => specialCases[c] || [NicknameToConference[c] || c]
          )
        )
      : undefined;

    const subChart = _.isEmpty(confs)
      ? undefined
      : _.chain(teamRanks)
          .flatMap((t) => t.players || [])
          .map((p, ii) => {
            // Add custom stats in here
            //Debug:
            // if (ii < 100) {
            //    console.log(`??? ${p.orig.roster?.year_class} - ${fieldValExtractor("adj_rapm")(p.orig)}`)
            // }
            // Example query - super seniors with a rotation+ RAPM
            // (only useful is also set maybeOverride.superSeniorsBack in OffseasonLeaderboardUtils.buildAllTeamStats)
            // if ((p.orig.roster?.year_class == "Sr") &&
            //    (fieldValExtractor("adj_rapm")(p.orig) > 2)) {
            //    }
            return p;
          })
          .filter(
            (p) =>
              !_.isEmpty(p.orig.team) &&
              (p.actualResults || false) &&
              (p.orig || false) &&
              p.actualResults.team != p.orig.team
          )
          .filter((p) => {
            return (
              confSet?.has(p.actualResults?.conf || "???") ||
              false ||
              (hasCustomFilter &&
                (queryFilters || "").indexOf(
                  `${p.actualResults?.team || ""};`
                ) >= 0)
            );
          })
          .map((p) => {
            return {
              x: xAxisExtractor(p),
              y: -yAxisExtractor(p),
              z: zAxisExtractor(p),
              p: p,
            };
          })
          .value();

    var inSubChart = new Set(subChart?.map((p) => p.p.key) || []);

    const mainChart = _.chain(teamRanks)
      .flatMap((t) => t.players || [])
      .filter(
        (p) =>
          !_.isEmpty(p.orig.team) &&
          !inSubChart.has(p.key) &&
          (p.actualResults || false) &&
          (p.orig || false) &&
          p.actualResults.team != p.orig.team
      )
      .map((p) => {
        return {
          x: xAxisExtractor(p),
          y: -yAxisExtractor(p),
          z: zAxisExtractor(p),
          p: p,
        };
      })
      .value();

    const [minX, maxX, minY, maxY] = _.transform(
      mainChart,
      (acc, v) => {
        if (v.x < acc[0]!) {
          acc[0] = v.x;
        } else if (v.x > 0 && -v.x < acc[0]) {
          acc[0] = -v.x;
        } else if (v.x > acc[1]!) {
          acc[1] = v.x;
        } else if (v.x < 0 && -v.x > acc[1]) {
          acc[1] = -v.x;
        }
        if (v.y < acc[2]!) {
          acc[2] = v.y;
        } else if (v.y > 0 && -v.y < acc[2]) {
          acc[2] = -v.y;
        } else if (v.y > acc[3]!) {
          acc[3] = v.y;
        } else if (v.y < 0 && -v.y > acc[3]) {
          acc[3] = -v.y;
        }
      },
      [1000, -1000, 1000, -1000]
    );

    return (
      <ResponsiveContainer width={"100%"} height={0.75 * height}>
        <ScatterChart>
          <ReferenceArea
            x1={0}
            x2={1.1 * maxX}
            y1={0}
            y2={maxY}
            fillOpacity={0}
          >
            <Label
              position="insideTopRight"
              value="Better offense, better defense"
            />
          </ReferenceArea>
          <ReferenceArea
            x1={0}
            x2={1.1 * maxX}
            y1={0}
            y2={minY}
            fillOpacity={0}
          >
            <Label
              position="insideBottomRight"
              value="Better offense, worse defense"
            />
          </ReferenceArea>
          <ReferenceArea
            x1={1.1 * minX}
            x2={0}
            y1={0}
            y2={maxY}
            fillOpacity={0}
          >
            <Label
              position="insideTopLeft"
              value="Worse offense, better defense"
            />
          </ReferenceArea>
          <ReferenceArea
            x1={1.1 * minX}
            x2={0}
            y1={0}
            y2={minY}
            fillOpacity={0}
          >
            <Label
              position="insideBottomLeft"
              value="Worse offense, worse defense"
            />
          </ReferenceArea>
          <CartesianGrid />
          <XAxis type="number" dataKey="x">
            <Label
              value={extractTitle("delta:off_adj_rapm")}
              position="top"
              style={{ textAnchor: "middle" }}
            />
          </XAxis>
          <YAxis type="number" dataKey="y">
            <Label
              angle={-90}
              value={extractTitle("delta:def_adj_rapm")}
              position="insideLeft"
              style={{ textAnchor: "middle" }}
            />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[10, 100]} />
          <Scatter
            data={mainChart}
            fill="green"
            opacity={subChart ? 0.25 : 1.0}
          >
            {mainChart.map((p, index) => {
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={CbbColors.off_diff10_p100_redBlackGreen(
                    colorExtractor(p.p)
                  )}
                />
              );
            })}
            ;
          </Scatter>
          {subChart ? (
            <Scatter data={subChart} fill="green">
              {subChart.map((p, index) => {
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={CbbColors.off_diff10_p100_redBlackGreen(
                      colorExtractor(p.p)
                    )}
                  />
                );
              })}
            </Scatter>
          ) : null}
          ;
          <RechartTooltip
            content={<CustomTooltip />}
            wrapperStyle={{ opacity: "0.9", zIndex: 1000 }}
            allowEscapeViewBox={{ x: true, y: false }}
            itemSorter={(item: any) => item.value}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }, [gender, year, confs, dataEvent, queryFilters, rostersPerTeam, height]);

  // 3] View

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      !dataEvent.error &&
      (loadingOverride || (dataEvent?.players || []).length == 0)
    );
  }

  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          className="float-left"
          id={`copyLink_offSeasonTeamLeaderboard`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>
    );
  };

  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  return (
    <Container>
      <Form.Group as={Row}>
        <Col xs={6} sm={6} md={3} lg={2} style={{ zIndex: 12 }}>
          <ThemedSelect
            isDisabled={true}
            value={stringToOption("Men")}
            options={["Men"].map((gender) => stringToOption(gender))}
            isSearchable={false}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                /* currently only support Men */
              }
            }}
          />
        </Col>
        <Col xs={6} sm={6} md={3} lg={2} style={{ zIndex: 11 }}>
          <ThemedSelect
            value={stringToOption(year)}
            options={[stringToOption("2021/22"), stringToOption("2022/23")]}
            isSearchable={false}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                setYear((option as any)?.value);
              }
            }}
          />
        </Col>
        <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
        <Col xs={12} sm={12} md={6} lg={6} style={{ zIndex: 10 }}>
          <ConferenceSelector
            emptyLabel={
              year < DateUtils.yearFromWhichAllMenD1Imported
                ? `All High Tier Teams`
                : `All Teams`
            }
            confStr={confs}
            confMap={dataEvent?.confMap}
            confs={dataEvent?.confs}
            onChangeConf={(confStr) =>
              friendlyChange(() => setConfs(confStr), confs != confStr)
            }
          />
        </Col>
        <Col lg={1} className="mt-1">
          {getCopyLinkButton()}
        </Col>
      </Form.Group>
      {hasCustomFilter ? (
        <Form.Group as={Row}>
          {hasCustomFilter ? (
            <Col xs={12} sm={12} md={8} lg={8}>
              <InputGroup>
                <InputGroup.Prepend>
                  <InputGroup.Text id="filter">Filter:</InputGroup.Text>
                </InputGroup.Prepend>
                <AsyncFormControl
                  startingVal={queryFilters}
                  onChange={(t: string) => {
                    const newStr = t.endsWith(";") ? t : t + ";";
                    friendlyChange(
                      () => setQueryFilters(newStr),
                      newStr != queryFilters
                    );
                  }}
                  timeout={500}
                  placeholder=";-separated list of teams"
                />
              </InputGroup>
            </Col>
          ) : null}
        </Form.Group>
      ) : null}
      <Row>
        <Col>
          <LoadingOverlay
            active={needToLoadQuery()}
            spinner
            text={"Loading Player Comparison Chart..."}
          >
            {chart}
          </LoadingOverlay>
        </Col>
      </Row>
    </Container>
  );
};
export default TransferRapmComparisonChart;
