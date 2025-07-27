// React imports:
import React, { useState, useEffect } from "react";

// Lodash:
import _ from "lodash";

import styles from "./TeamLeaderboardTable.module.css";

// mathjs
// @ts-ignore
import { mean, mode } from "mathjs";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
// @ts-ignore
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { faPercent } from "@fortawesome/free-solid-svg-icons";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons";
import { faTrashRestore } from "@fortawesome/free-solid-svg-icons";
import {
  faArrowAltCircleDown,
  faArrowAltCircleUp,
} from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import AsyncFormControl from "./shared/AsyncFormControl";

// Util imports
import { UrlRouting } from "../utils/UrlRouting";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { TeamLeaderboardParams, ParamDefaults } from "../utils/FilterModels";
import { ConferenceToNickname } from "../utils/public-data/ConferenceInfo";
import { TeamInfo } from "../utils/StatModels";

import { TeamEvalUtils } from "../utils/stats/TeamEvalUtils";
import { CbbColors } from "../utils/CbbColors";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import { apPolls, sCurves } from "../utils/public-data/rankingInfo";
import chroma from "chroma-js";
import { GenericTableColProps } from "./GenericTable";
import { DateUtils } from "../utils/DateUtils";
import ConferenceSelector, {
  ConfSelectorConstants,
} from "./shared/ConferenceSelector";
import TeamFilterAutoSuggestText from "./shared/TeamFilterAutoSuggestText";
import ThemedSelect from "./shared/ThemedSelect";

export type TeamLeaderboardStatsModel = {
  year?: string;
  gender?: string;
  teams?: Array<TeamInfo>;
  confs?: Array<string>;
  confMap?: Map<string, Array<string>>;
  bubbleOffense?: Array<number>;
  bubbleDefense?: Array<number>;
  lastUpdated?: number;
  error?: string;
};
type Props = {
  startingState: TeamLeaderboardParams;
  dataEvent: TeamLeaderboardStatsModel;
  onChangeState: (newParams: TeamLeaderboardParams) => void;
};

// Some static methods

// View

const TeamLeaderboardTable: React.FunctionComponent<Props> = ({
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

  // 1] Data Model

  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);

  // 2] State

  // Data source
  const [confs, setConfs] = useState(startingState.conf || "");
  const hasCustomFilter =
    confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0;
  const [queryFilters, setQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const [tmpQueryFilters, setTmpQueryFilters] = useState(
    startingState.queryFilters || ""
  );

  const [year, setYear] = useState(
    startingState.year || ParamDefaults.defaultLeaderboardYear
  );
  const [gender, setGender] = useState(
    startingState.gender || ParamDefaults.defaultGender
  );
  const isMultiYr = year == "Extra" || year == "All";

  // (don't support tier changes)
  const tier: string = "All";

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  const [wabWeight, setWabWeight] = useState(
    !_.isNil(startingState.wabWeight)
      ? parseFloat(startingState.wabWeight)
      : parseFloat(ParamDefaults.defaultTeamLboardWabWeight)
  );
  const [waeWeight, setWaeWeight] = useState(
    !_.isNil(startingState.waeWeight)
      ? parseFloat(startingState.waeWeight)
      : parseFloat(ParamDefaults.defaultTeamLboardWaeWeight)
  );
  const [qualityWeight, setQualityWeight] = useState(
    !_.isNil(startingState.qualityWeight)
      ? parseFloat(startingState.qualityWeight)
      : parseFloat(ParamDefaults.defaultTeamLboardQualityWeight)
  );
  const [dominanceWeight, setDominanceWeight] = useState(
    !_.isNil(startingState.domWeight)
      ? parseFloat(startingState.domWeight)
      : parseFloat(ParamDefaults.defaultTeamLboardDomWeight)
  );
  const [timeWeight, setTimeWeight] = useState(
    !_.isNil(startingState.timeWeight)
      ? parseFloat(startingState.timeWeight)
      : parseFloat(ParamDefaults.defaultTeamLboardTimeWeight)
  );

  const [pinnedWabWeight, setPinnedWabWeight] = useState(
    !_.isNil(startingState.pinWabWeight)
      ? parseFloat(startingState.pinWabWeight)
      : wabWeight
  );
  const [pinnedWaeWeight, setPinnedWaeWeight] = useState(
    !_.isNil(startingState.pinWaeWeight)
      ? parseFloat(startingState.pinWaeWeight)
      : waeWeight
  );
  const [pinnedQualityWeight, setPinnedQualityWeight] = useState(
    !_.isNil(startingState.pinQualityWeight)
      ? parseFloat(startingState.pinQualityWeight)
      : qualityWeight
  );
  const [pinnedDomWeight, setPinnedDomWeight] = useState(
    !_.isNil(startingState.pinDomWeight)
      ? parseFloat(startingState.pinDomWeight)
      : dominanceWeight
  );
  const [pinnedTimeWeight, setPinnedTimeWeight] = useState(
    !_.isNil(startingState.pinTimeWeight)
      ? parseFloat(startingState.pinTimeWeight)
      : timeWeight
  );

  const [pinnedRankings, setPinnedRankings] = useState(
    {} as Record<string, number>
  );
  const [currentTable, setCurrentTable] = useState([] as Array<any>);

  const [netRankings, setNetRankings] = useState({} as Record<string, number>);

  useEffect(() => {
    //(this ensures that the filter component is up to date with the union of these fields)
    const newState: TeamLeaderboardParams = {
      ...startingState,
      wabWeight: "" + wabWeight,
      waeWeight: "" + waeWeight,
      qualityWeight: "" + qualityWeight,
      domWeight: "" + dominanceWeight,
      timeWeight: "" + timeWeight,
      pinWabWeight: "" + pinnedWabWeight,
      pinWaeWeight: "" + pinnedWaeWeight,
      pinQualityWeight: "" + pinnedQualityWeight,
      pinDomWeight: "" + pinnedDomWeight,
      pinTimeWeight: "" + pinnedTimeWeight,
      conf: confs,
      gender: gender,
      year: year,
      queryFilters: queryFilters,
    };
    onChangeState(newState);
  }, [
    wabWeight,
    waeWeight,
    qualityWeight,
    dominanceWeight,
    timeWeight,
    pinnedWabWeight,
    pinnedWaeWeight,
    pinnedQualityWeight,
    pinnedDomWeight,
    pinnedTimeWeight,
    confs,
    year,
    gender,
    queryFilters,
  ]);

  useEffect(() => {
    // Get NET rankings for this year, if available
    fetch(`/api/getRankings?name=NET&year=${year}&gender=${gender}`)
      .then((resp) => resp.json())
      .then((respJson) => {
        setNetRankings(respJson);
      });
  }, [year, gender]);

  const table = React.useMemo(() => {
    if (year != dataEvent.year || gender != dataEvent.gender) {
      //(else we're about get pinged again)
      return (
        <div>
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
        </div>
      );
    }
    setLoadingOverride(false); //(rendering)

    const genderYear = `${gender}_${year}`;
    const last30d =
      (DateUtils.getEndOfRegSeason(genderYear) ||
        dataLastUpdated[genderYear] ||
        new Date().getTime() / 1000) -
      30 * 24 * 3600;
    const apPoll: Record<string, number> | undefined = apPolls[genderYear]?.();
    const apPollSize = apPoll?.__max__ || 25;

    const sCurve: Record<string, number> | undefined = sCurves[genderYear]?.();
    const sCurveSize = _.size(sCurve || {});

    const netRankingSize = 100; // (only calculate the delta on the first 100 NET)

    // Calculate a commmon set of games
    const gameArray = (dataEvent.teams || []).map((t) => t.opponents.length);
    const gameBasis: number =
      gameArray.length > 0
        ? Math.floor(mean(mode(gameArray.map((g) => Math.floor(g)))) || 1)
        : 1;

    const mutableLimitState = {
      maxWab: -1000,
      minWab: 1000,
      maxWae: -1000,
      minWae: 1000,
      maxQual: -1000,
      minQual: 1000,
      maxTotal: -1000,
      minTotal: 1000,
      maxDom: -1000,
      minDom: 1000,
      maxTime: -1000,
      minTime: 1000,
    };
    var anyPinDeltas = false;

    var varApDelta = 0; //(calculate total error of AP poll vs h-e ranking)
    var varNetDelta = 0; //(calculate total error of NET vs h-e ranking)
    var varSDelta = 0; //(calculate total error of S-Curve vs h-e ranking)

    const rankingDeltaColorScale = (val: number) =>
      chroma.scale(["green", "orange", "red"])(val).toString();

    const buildLastGamesElement = (t: TeamInfo, lastN: number) => {
      return _.chain(t.opponents)
        .drop(t.opponents.length - lastN)
        .map((g) => {
          const ptsScored = g.team_scored;
          const ptsAgainst = g.oppo_scored;
          const avgLead = g.avg_lead;
          const gameWab = g.wab;
          const locationStr = _.thru(g.location_type || "Neutral", (loc) => {
            if (loc == "Home") {
              return "";
            } else if (loc == "Neutral") {
              return "vs ";
            } else {
              return "@ ";
            }
          });
          const winOrLoss = ptsScored > ptsAgainst ? "W" : "L";
          const scoreStr = `${winOrLoss} ${ptsScored}-${ptsAgainst}`;
          const gameStr = `${locationStr}${g.oppo_name} (${g.date_str.substring(
            0,
            10
          )}): ${scoreStr}`;

          const endLead = ptsScored - ptsAgainst;
          const colorClass = _.thru(winOrLoss, (__) => {
            const bigResultThresh = 8.0;
            if (endLead >= 0) {
              if (avgLead > bigResultThresh && endLead > bigResultThresh) {
                return styles.bigwin;
              } else {
                return styles.win;
              }
            } else {
              if (avgLead < -bigResultThresh && endLead < -bigResultThresh) {
                return styles.bigloss;
              } else {
                return styles.loss;
              }
            }
          });
          const [description, weight] = _.thru(
            g.team_scored > g.oppo_scored ? g.wab : g.wab - 1,
            (wab) => {
              if (wab > 0.6) {
                return ["Great win!", 800];
              } else if (wab > 0.5) {
                return ["Good win", 600];
              } else if (wab <= -0.7) {
                return ["Awful loss!", 800];
              } else if (wab <= -0.6) {
                return ["Bad loss", 600];
              } else {
                return ["", 400];
              }
            }
          );

          const unexpectedResultStr = endLead * avgLead <= 0 ? " (!) " : "";

          const tooltip = (
            <Tooltip id={(t.team_name + g.oppo_name).replace(/[^a-zA-Z]/g, "")}>
              {gameStr}
              <br />
              Average {avgLead >= 0 ? "lead" : "deficit"}
              {unexpectedResultStr} of {Math.abs(avgLead).toFixed(1)} pts
              <br />
              {description ? (
                <span>
                  {description}
                  <br />
                </span>
              ) : null}
              <br />
              Click to view a game report in a new tab.
            </Tooltip>
          );

          return (
            <OverlayTrigger placement="auto" overlay={tooltip}>
              <a
                style={{
                  //@ts-ignore
                  fontWeight: weight,
                }}
                className={colorClass}
                target="_blank"
                href={UrlRouting.getMatchupUrl({
                  team: t.team_name,
                  year: year,
                  gender: gender,
                  oppoTeam: gameStr,
                  minRank: "0",
                  maxRank: "400",
                })}
              >
                {winOrLoss}
              </a>
            </OverlayTrigger>
          );
        })
        .value();
    };

    /** If buildPin then don't do any mutable operations */
    const buildTable = (
      buildPin: boolean,
      qualityWeightIn: number,
      wabWeightIn: number,
      waeWeightIn: number,
      domWeightIn: number,
      timeWeightIn: number,
      pinnedRankingsIn: Record<string, number>
    ) => {
      const mutableDedupSet = new Set() as Set<string>;
      const tableDataTmp = _.chain(dataEvent.teams || [])
        .flatMap((team) => {
          if (!mutableDedupSet.has(team.team_name)) {
            mutableDedupSet.add(team.team_name);

            const mutableGreatGames: Array<React.ReactNode> = [];
            const mutableGoodGames: Array<React.ReactNode> = [];
            const mutableBadGames: Array<React.ReactNode> = [];
            const mutableTerribleGames: Array<React.ReactNode> = [];
            const numOpponents = team.opponents.length;
            const recencyWindow = 10;
            type CalcState = {
              wab: number;
              wae: number;
              sumDom: number;
              sumWab10g: number;
              sumWae10g: number;
              totalPoss: number;
              last10games: number;
              gamesInLast30d: number;
              cupcakeWab: number;
              cupcakeWabGames: number;
              cupcakeWae: number;
              cupcakeWaeGames: number;
            };
            const {
              wab,
              wae,
              sumWab10g,
              sumWae10g,
              sumDom,
              totalPoss,
              last10games,
              gamesInLast30d,
              cupcakeWab,
              cupcakeWabGames,
              cupcakeWae,
              cupcakeWaeGames,
            } = _.transform(
              team.opponents,
              (acc, o, ii) => {
                const wab = o.team_scored > o.oppo_scored ? o.wab : o.wab - 1;
                acc.wab = acc.wab + wab;
                acc.wae =
                  acc.wae + (o.team_scored > o.oppo_scored ? o.wae : o.wae - 1);
                const poss = 0.5 * (o.off_poss + o.def_poss);
                acc.sumDom = acc.sumDom + poss * o.avg_lead;
                acc.totalPoss = acc.totalPoss + poss;

                if (ii >= numOpponents - recencyWindow) {
                  acc.sumWab10g = acc.sumWab10g + wab;
                  acc.sumWae10g =
                    acc.sumWae10g +
                    (o.team_scored > o.oppo_scored ? o.wae : o.wae - 1);
                  acc.last10games = acc.last10games + 1;
                }
                if (o.date >= last30d) {
                  acc.gamesInLast30d = acc.gamesInLast30d + 1;
                }
                if (wab > 0.6)
                  mutableGreatGames.push(
                    <div>
                      {o.oppo_name}
                      <sup>{o.location_type.substring(0, 1)}</sup>
                    </div>
                  );
                else if (wab > 0.5)
                  mutableGoodGames.push(
                    <div>
                      {o.oppo_name}
                      <sup>{o.location_type.substring(0, 1)}</sup>
                    </div>
                  );
                else if (wab <= -0.7)
                  mutableTerribleGames.push(
                    <div>
                      {o.oppo_name}
                      <sup>{o.location_type.substring(0, 1)}</sup>
                    </div>
                  );
                else if (wab <= -0.6)
                  mutableBadGames.push(
                    <div>
                      {o.oppo_name}
                      <sup>{o.location_type.substring(0, 1)}</sup>
                    </div>
                  );

                // Find cupcakes that we can use to reduce games played to gameBasis
                if (
                  numOpponents - acc.cupcakeWabGames > gameBasis &&
                  wab > 0 &&
                  wab < 0.055
                ) {
                  acc.cupcakeWab = acc.cupcakeWab + wab;
                  acc.cupcakeWabGames = acc.cupcakeWabGames + 1;
                }
                if (
                  numOpponents - acc.cupcakeWaeGames > gameBasis &&
                  wae > 0 &&
                  wae < 0.035
                ) {
                  acc.cupcakeWae = acc.cupcakeWae + wae;
                  acc.cupcakeWaeGames = acc.cupcakeWaeGames + 1;
                }
              },
              {
                wab: 0,
                wae: 0,
                sumDom: 0,
                sumWab10g: 0,
                sumWae10g: 0,
                totalPoss: 0,
                last10games: 0,
                gamesInLast30d: 0,
                cupcakeWab: 0,
                cupcakeWabGames: 0,
                cupcakeWae: 0,
                cupcakeWaeGames: 0,
              } as CalcState
            );

            const avDominance = sumDom / (totalPoss || 1);
            const expWinPctVsBubble = TeamEvalUtils.calcWinsAbove(
              team.adj_off,
              team.adj_def,
              dataEvent.bubbleOffense || [],
              dataEvent.bubbleDefense || [],
              0.0
            );
            const effectOfDom = 1.5 * 0.1 * avDominance; //3pts per 10pts avg lead is the NBA stat
            const expWinPctVsBubbleIncDom = TeamEvalUtils.calcWinsAbove(
              team.adj_off + effectOfDom,
              team.adj_def - effectOfDom,
              dataEvent.bubbleOffense || [],
              dataEvent.bubbleDefense || [],
              0.0
            );

            const expWinPctVsBubbleRecentIncDom = TeamEvalUtils.calcWinsAbove(
              team.adj_off_calc_30d,
              team.adj_def_calc_30d,
              dataEvent.bubbleOffense || [],
              dataEvent.bubbleDefense || [],
              0.0
            );

            // Build cell entries

            // Base stats
            const qualityNoDom = (expWinPctVsBubble - 0.5) * gameBasis; //(-0.5 to give win differential)
            const qualityIncDom = (expWinPctVsBubbleIncDom - 0.5) * gameBasis;
            const qualityDiff = qualityIncDom - qualityNoDom;
            const baseWinPct =
              expWinPctVsBubble +
              domWeightIn * (expWinPctVsBubbleIncDom - expWinPctVsBubble);
            const quality = qualityNoDom + domWeightIn * qualityDiff;
            const factor =
              numOpponents > 0.5 * gameBasis ? gameBasis / numOpponents : 1;
            const cupcakeWabFactor =
              gameBasis / (numOpponents - cupcakeWabGames);
            const cupcakeWaeFactor =
              gameBasis / (numOpponents - cupcakeWaeGames);

            // Pro-rate to the mode number of games in D1
            const proRatedWab = wab * factor;
            const proRatedWae = wae * factor;
            const proRatedCupcakeWab =
              numOpponents - cupcakeWabGames >= gameBasis
                ? (wab - cupcakeWab) * cupcakeWabFactor
                : proRatedWab;
            const proRatedCupcakeWae =
              numOpponents - cupcakeWaeGames >= gameBasis
                ? (wae - cupcakeWae) * cupcakeWaeFactor
                : proRatedWae;
            const gameAdjustedWab = Math.max(proRatedWab, proRatedCupcakeWab);
            const gameAdjustedWae = Math.max(proRatedWae, proRatedCupcakeWae);

            // Nightmare recency calcs
            // At 100% we count the last 10 games double for resume (WAB/WAE) and the weight of the last 30d's effiency double

            //(resume)
            const wabWithFullRecencyBonus =
              (gameBasis * (wab + sumWab10g)) /
              (last10games + numOpponents || 1);
            const recentWabDelta = wabWithFullRecencyBonus - gameAdjustedWab;
            const waeWithFullRecencyBonus =
              (gameBasis * (wae + sumWae10g)) /
              (last10games + numOpponents || 1);
            const recentWaeDelta = waeWithFullRecencyBonus - gameAdjustedWae;

            //(quality)
            const recentWinPctDelta =
              expWinPctVsBubbleRecentIncDom - expWinPctVsBubbleIncDom;
            const recentExpWin = baseWinPct + recentWinPctDelta;
            const recencyQualityDenomInv =
              1 / (gamesInLast30d + gameBasis || 1);
            const qualityWithFullRecencyBonus =
              gameBasis *
              recencyQualityDenomInv *
              (quality + (recentExpWin - 0.5) * gamesInLast30d);
            const recentQualityDelta = qualityWithFullRecencyBonus - quality;

            const recentDelta =
              (recentWabDelta + waeWeightIn * recentWaeDelta) * wabWeightIn +
              qualityWeightIn * recentQualityDelta;

            const total =
              (gameAdjustedWab + gameAdjustedWae * waeWeightIn) * wabWeightIn +
              quality * qualityWeightIn +
              timeWeightIn * recentDelta;

            // Update min/max:
            if (!buildPin) {
              if (gameAdjustedWab > mutableLimitState.maxWab)
                mutableLimitState.maxWab = gameAdjustedWab;
              if (gameAdjustedWab < mutableLimitState.minWab)
                mutableLimitState.minWab = gameAdjustedWab;
              if (gameAdjustedWae > mutableLimitState.maxWae)
                mutableLimitState.maxWae = gameAdjustedWae;
              if (gameAdjustedWae < mutableLimitState.minWae)
                mutableLimitState.minWae = gameAdjustedWae;
              if (quality > mutableLimitState.maxQual)
                mutableLimitState.maxQual = quality;
              if (quality < mutableLimitState.minQual)
                mutableLimitState.minQual = quality;
              if (total > mutableLimitState.maxTotal)
                mutableLimitState.maxTotal = total;
              if (total < mutableLimitState.minTotal)
                mutableLimitState.minTotal = total;
              if (qualityDiff > mutableLimitState.maxDom)
                mutableLimitState.maxDom = qualityDiff;
              if (qualityDiff < mutableLimitState.minDom)
                mutableLimitState.minDom = qualityDiff;
              if (recentDelta > mutableLimitState.maxTime)
                mutableLimitState.maxTime = recentDelta;
              if (recentDelta < mutableLimitState.minTime)
                mutableLimitState.minTime = recentDelta;
            }

            const teamTooltip = (
              <Tooltip id={`team_${team.team_name}`}>
                Open new tab with detailed team and individual stats, plus
                on/off analysis
              </Tooltip>
            );

            // Build table entry
            const cell = [
              {
                lastGames: (
                  <span>
                    <small className="d-none d-xl-block">
                      <sup>
                        {
                          buildLastGamesElement(
                            team,
                            5
                          ) /*TODO: this should depend on mobile vs desktop*/
                        }
                      </sup>
                    </small>
                    <small className="d-block d-xl-none">
                      <sup>
                        {
                          buildLastGamesElement(
                            team,
                            2
                          ) /*TODO: this should depend on mobile vs desktop*/
                        }
                      </sup>
                    </small>
                  </span>
                ),
                titleStr: team.team_name,
                title: (
                  <span>
                    <OverlayTrigger placement="auto" overlay={teamTooltip}>
                      <a
                        target="_blank"
                        href={UrlRouting.getGameUrl(
                          {
                            minRank: "0",
                            maxRank: "400",
                            calcRapm: true,
                            showExpanded: true,
                            year: year,
                            gender: gender,
                            team: team.team_name,
                            showGrades: "rank:Combo",
                            showExtraInfo: true,
                            showRoster: true,
                            showTeamPlayTypes: true,
                          },
                          {}
                        )}
                      >
                        <b>{team.team_name}</b>
                      </a>
                    </OverlayTrigger>
                  </span>
                ),
                confStr: ConferenceToNickname[team.conf],
                conf: <small>{ConferenceToNickname[team.conf] || "??"}</small>,
                rank: null as any,
                rankDiff: null as any,
                rankNum: 0,
                rating: { value: total },
                wab: {
                  value: gameAdjustedWab,
                  extraInfo: (
                    <div>
                      <b>Great wins</b>:{" "}
                      {mutableGreatGames.length > 0 ? (
                        <span>{mutableGreatGames}</span>
                      ) : (
                        <i>
                          none
                          <br />
                        </i>
                      )}
                      <br />
                      <b>Good wins</b>:{" "}
                      {mutableGoodGames.length > 0 ? (
                        <span>{mutableGoodGames}</span>
                      ) : (
                        <i>
                          none
                          <br />
                        </i>
                      )}
                      <br />
                      <b>Bad losses</b>:{" "}
                      {mutableBadGames.length > 0 ? (
                        <span>{mutableBadGames}</span>
                      ) : (
                        <i>
                          none
                          <br />
                        </i>
                      )}
                      <br />
                      <b>Awful losses</b>:{" "}
                      {mutableTerribleGames.length > 0 ? (
                        <span>{mutableTerribleGames}</span>
                      ) : (
                        <i>
                          none
                          <br />
                        </i>
                      )}
                      <br />
                      {numOpponents != gameBasis ? (
                        <i>Adjusted from [{wab.toFixed(1)}]</i>
                      ) : null}
                    </div>
                  ),
                },
                wae: {
                  value: gameAdjustedWae,
                  extraInfo:
                    numOpponents != gameBasis ? (
                      <i>Adjusted from [{wae.toFixed(1)}]</i>
                    ) : undefined,
                },
                quality: { value: quality },
                dominance: { value: qualityDiff },
                recency: {
                  value: recentDelta,
                  extraInfo: (
                    <div>
                      <b>WAB delta</b>: [{recentWabDelta.toFixed(1)}]<br />
                      <b>WAE delta</b>: [{recentWaeDelta.toFixed(1)}]<br />
                      <b>Quality delta</b>: [{recentQualityDelta.toFixed(1)}]
                      <br />
                    </div>
                  ),
                },
                games: { value: numOpponents },
                ap: undefined as any,
                NET: undefined as any,
                S: undefined as any,
              },
            ];
            return cell;
          } else return [];
        })
        .sortBy((t) =>
          t.games.value > 0.5 * gameBasis
            ? -(t.rating?.value || 0)
            : 100 - (t.rating?.value || 0)
        )
        .map((t, i) => {
          t.rank = (
            <small>
              <b>{i + 1}</b>
            </small>
          );
          t.rankNum = i + 1;
          const pinnedRank = pinnedRankingsIn[t.titleStr] || -1;
          if (pinnedRank > 0) {
            const delta = pinnedRank - i - 1;
            t.rankDiff =
              delta != 0 ? (
                delta > 0 ? (
                  <div>
                    <FontAwesomeIcon
                      icon={faArrowAltCircleUp}
                      style={{ color: "green" }}
                    />{" "}
                    {delta}
                  </div>
                ) : (
                  <div>
                    <FontAwesomeIcon
                      icon={faArrowAltCircleDown}
                      style={{ color: "red" }}
                    />{" "}
                    {-delta}
                  </div>
                )
              ) : (
                ""
              );
            if (!buildPin) anyPinDeltas = anyPinDeltas || delta != 0;
          }
          if (apPoll) {
            const apPos = apPoll?.[t.titleStr] || 0;
            var varDelta = 0;
            if (t.rankNum <= apPollSize && !apPos) {
              varDelta = 5 + (apPollSize - t.rankNum); //(assume an error is 5 more than the ranking size)
            } else if (apPos) {
              varDelta = Math.min(Math.abs(apPos - t.rankNum), 15);
            }
            if (!buildPin) {
              varApDelta = varApDelta + varDelta;
            }
            if (apPos || t.rankNum <= 25) {
              t.ap = (
                <small
                  style={CommonTableDefs.getTextShadow(
                    { value: varDelta * 0.1 },
                    rankingDeltaColorScale
                  )}
                >
                  {apPos || "NR"}
                </small>
              );
            }
          }
          if (sCurve) {
            const sCurvePos: number = sCurve?.[t.titleStr] || 0;
            var varDelta = 0;
            if (t.rankNum <= sCurveSize && !sCurvePos) {
              varDelta = 5 + (sCurveSize - t.rankNum); //(assume an error is 5 more than the ranking size)
            } else if (sCurvePos) {
              varDelta = Math.min(Math.abs(sCurvePos - t.rankNum), 15);
            }
            if (!buildPin) {
              varSDelta = varSDelta + varDelta;
            }
            if (sCurvePos) {
              t.S = (
                <small
                  style={CommonTableDefs.getTextShadow(
                    { value: varDelta * 0.1 },
                    rankingDeltaColorScale
                  )}
                >
                  {sCurvePos || "-"}
                </small>
              );
            }
          }
          if (!_.isEmpty(netRankings)) {
            const netPos: number = netRankings[t.titleStr] || 0;
            var varDelta = 0;
            if (t.rankNum <= netRankingSize && !netPos) {
              varDelta = 0; //(for NET this means there was a name lookup error)
            } else if (netPos <= netRankingSize) {
              varDelta = Math.min(Math.abs(netPos - t.rankNum), 15);
            }
            if (!buildPin) {
              varNetDelta = varNetDelta + varDelta;
            }
            if (netPos) {
              t.NET = (
                <small
                  style={CommonTableDefs.getTextShadow(
                    { value: varDelta * 0.1 },
                    rankingDeltaColorScale
                  )}
                >
                  {netPos || "NR"}
                </small>
              );
            }
          }
          return t;
        })
        .value();

      return tableDataTmp;
    };
    // On page load, if user has specified a pin!=actual state, pre-build the pinned rankings and use those
    // to build the ranking diffs
    const needToPrebuildPinnedRankings =
      _.isEmpty(pinnedRankings) &&
      (qualityWeight != pinnedQualityWeight ||
        wabWeight != pinnedWabWeight ||
        waeWeight != pinnedWaeWeight ||
        dominanceWeight != pinnedDomWeight ||
        timeWeight != pinnedTimeWeight);

    const maybePrebuiltPinnedRankings = needToPrebuildPinnedRankings
      ? _.chain(
          buildTable(
            true,
            pinnedQualityWeight,
            pinnedWabWeight,
            pinnedWaeWeight,
            pinnedDomWeight,
            pinnedTimeWeight,
            {}
          )
        )
          .map((t) => [t.titleStr, t.rankNum])
          .fromPairs()
          .value()
      : pinnedRankings;

    const tableDataTmp = buildTable(
      false,
      qualityWeight,
      wabWeight,
      waeWeight,
      dominanceWeight,
      timeWeight,
      maybePrebuiltPinnedRankings
    );

    if (!needToPrebuildPinnedRankings && _.isEmpty(pinnedRankings)) {
      setPinnedRankings(
        _.chain(tableDataTmp)
          .map((t) => [t.titleStr, t.rankNum])
          .fromPairs()
          .value()
      );
    } else if (needToPrebuildPinnedRankings) {
      setPinnedRankings(maybePrebuiltPinnedRankings);
    }
    setCurrentTable(tableDataTmp);

    const confFilter = (t: { titleStr: string; confStr: string }) => {
      return (
        confs == "" ||
        confs.indexOf(t.confStr) >= 0 ||
        (confs.indexOf(ConfSelectorConstants.highMajorConfsNick) >= 0 &&
          ConfSelectorConstants.powerSixConfsStr.indexOf(t.confStr) >= 0) ||
        (confs.indexOf(ConfSelectorConstants.nonHighMajorConfsNick) >= 0 &&
          ConfSelectorConstants.powerSixConfsStr.indexOf(t.confStr) < 0) ||
        (hasCustomFilter &&
          (startingState.queryFilters || "").indexOf(`${t.titleStr};`) >= 0)
      );
    };

    const mainTable = tableDataTmp
      .filter((t) => t.games.value > 0.5 * gameBasis)
      .filter((t) => confFilter(t))
      .map((t, ii) => {
        if (confs != "") {
          t.title = (
            <span>
              <sup>
                <small>{1 + ii}</small>&nbsp;
              </sup>
              {t.title}
            </span>
          );
        }
        return t;
      });
    const tooFewGames = tableDataTmp
      .filter((t) => t.games.value <= 0.5 * gameBasis)
      .filter((t) => confFilter(t));

    const apTooltip = (
      <Tooltip id="apTooltip">
        The average delta between AP poll and this ranking (note there may have
        been games since the AP poll's release)
      </Tooltip>
    );
    const netTooltip = (
      <Tooltip id="netTooltip">
        The average delta between daily NET and this ranking (T100 only)
      </Tooltip>
    );
    const sCurveTooltip = (
      <Tooltip id="sCurveTooltip">
        The average delta between the NCAA S-Curve and this ranking (top-seeds /
        at-large / last-4-out only)
      </Tooltip>
    );
    const gameBasisTooltip = (
      <Tooltip id="gameBasisTooltip">
        The mode (most common) number of games played in D1 (all metrics are
        normalized as if each team had played this many games)
      </Tooltip>
    );
    const subHeaderRow = [[<i>Top 25 + 1</i>, anyPinDeltas ? 15 : 14]]
      .concat([
        [
          <OverlayTrigger placement="auto" overlay={gameBasisTooltip}>
            <i>{gameBasis}</i>
          </OverlayTrigger>,
          1,
        ],
      ])
      .concat(
        apPoll
          ? [
              [
                <OverlayTrigger placement="auto" overlay={apTooltip}>
                  <i>{(varApDelta / apPollSize).toFixed(1)}</i>
                </OverlayTrigger>,
                1,
              ],
            ]
          : []
      )
      .concat(
        !_.isEmpty(netRankings)
          ? [
              [
                <OverlayTrigger placement="auto" overlay={netTooltip}>
                  <i>{(varNetDelta / netRankingSize).toFixed(1)}</i>
                </OverlayTrigger>,
                1,
              ],
            ]
          : []
      )
      .concat(
        sCurve
          ? [
              [
                <OverlayTrigger placement="auto" overlay={sCurveTooltip}>
                  <i>{(varSDelta / sCurveSize).toFixed(1)}</i>
                </OverlayTrigger>,
                1,
              ],
            ]
          : []
      ) as Array<[React.ReactNode, number]>;

    const tableData = (
      confs == ""
        ? [GenericTableOps.buildSubHeaderRow(subHeaderRow, "small text-center")]
            .concat(
              _.take(mainTable, 26).map((t) =>
                GenericTableOps.buildDataRow(
                  t,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta
                )
              )
            )
            .concat([
              GenericTableOps.buildTextRow(
                <i>Solid NCAAT teams</i>,
                "small text-center"
              ),
            ])
            .concat(
              _.take(_.drop(mainTable, 26), 9).map((t) =>
                GenericTableOps.buildDataRow(
                  t,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta
                )
              )
            )
            .concat([
              GenericTableOps.buildTextRow(
                <i>The Bubble</i>,
                "small text-center"
              ),
            ])
            .concat(
              _.take(_.drop(mainTable, 35), 20).map((t) =>
                GenericTableOps.buildDataRow(
                  t,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta
                )
              )
            )
            .concat([
              GenericTableOps.buildTextRow(
                <i>Autobids / AD on Selection Committee / Maybe Next Year</i>,
                "small text-center"
              ),
            ])
            .concat(
              _.drop(mainTable, 55).map((t) =>
                GenericTableOps.buildDataRow(
                  t,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta
                )
              )
            )
        : mainTable.map(
            // (if filtering by conf just show them all)
            (t) =>
              GenericTableOps.buildDataRow(
                t,
                GenericTableOps.defaultFormatter,
                GenericTableOps.defaultCellMeta
              )
          )
    )
      .concat(
        tooFewGames.length > 0
          ? [
              GenericTableOps.buildTextRow(
                <i>Teams with too few games</i>,
                "small text-center"
              ),
            ]
          : []
      )
      .concat(
        tooFewGames.map((t) =>
          GenericTableOps.buildDataRow(
            t,
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta
          )
        )
      );

    //console.log(JSON.stringify(_.take(tableDataTmp, 5), null, 3));

    const wabPicker = (val: { value: number }, valMeta: string) =>
      CbbColors.getRedToGreen()
        .domain([mutableLimitState.minWab, 0, mutableLimitState.maxWab])(
          val.value
        )
        .toString();
    const waePicker = (val: { value: number }, valMeta: string) =>
      CbbColors.getRedToGreen()
        .domain([mutableLimitState.minWae, 0, mutableLimitState.maxWae])(
          val.value
        )
        .toString();
    const qualPicker = (val: { value: number }, valMeta: string) =>
      CbbColors.getRedToGreen()
        .domain([mutableLimitState.minQual, 0, mutableLimitState.maxQual])(
          val.value
        )
        .toString();
    const totalPicker = (val: { value: number }, valMeta: string) =>
      CbbColors.getRedToGreen()
        .domain([mutableLimitState.minTotal, 0, mutableLimitState.maxTotal])(
          val.value
        )
        .toString();
    const domPicker = (val: { value: number }, valMeta: string) =>
      CbbColors.getBlueToOrange()
        .domain([mutableLimitState.minDom, 0, mutableLimitState.maxDom])(
          val.value
        )
        .toString();
    const timePicker =
      mutableLimitState.maxTime == 0
        ? GenericTableOps.defaultColorPicker
        : (val: { value: number }, valMeta: string) =>
            CbbColors.getBlueToOrange()
              .domain([
                mutableLimitState.minTime,
                0,
                mutableLimitState.maxTime,
              ])(val.value)
              .toString();

    const teamLeaderboard = _.omit(
      {
        title: GenericTableOps.addTitle(
          "",
          "",
          CommonTableDefs.rowSpanCalculator,
          "small",
          GenericTableOps.htmlFormatter,
          6
        ),
        conf: GenericTableOps.addDataCol(
          "Conf",
          "The team's conference",
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
        rankDiff: GenericTableOps.addDataCol(
          <b>&Delta;</b>,
          "The difference vs pinned rank",
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
        sep0: GenericTableOps.addColSeparator(),
        rank: GenericTableOps.addDataCol(
          "Rank",
          "The overall team ranking",
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
        rating: GenericTableOps.addPtsCol(
          "Rating",
          `The weighted sum of the bonus-adjusted 'resume' plus 'quality' metrics. The rating is on the same scale as WAB.`,
          totalPicker
        ),
        sep1: GenericTableOps.addColSeparator(),
        wab: GenericTableOps.addPtsCol(
          "WAB",
          "Wins Above Bubble (the number of wins more than an average bubble team is expected against this schedule)",
          wabPicker
        ),
        wae: GenericTableOps.addPtsCol(
          "+WAE",
          "Wins Above Elite (the number of wins more than an average elite team is expected against this schedule), used as a bonus for WAB",
          waePicker
        ),
        sep2: GenericTableOps.addColSeparator(),
        quality: GenericTableOps.addPtsCol(
          "Quality",
          "The efficiency ('eye test') of a team, measured as expected W-L difference against a schedule of bubble teams, includes weighted dominance",
          qualPicker
        ),
        dominance: GenericTableOps.addPtsCol(
          "Dom.",
          "Dominance delta (at 100% weight) - Bonus to efficiency due to building and maintaining leads, values shown are for 100% weight",
          domPicker
        ),
        sep3: GenericTableOps.addColSeparator(),
        recency: GenericTableOps.addPtsCol(
          "Rec.",
          "Recency Bias delta (at 100% weight) - mouse over to see breakdown vs resume/quality",
          timePicker
        ),
        sep4: GenericTableOps.addColSeparator(),
        games: GenericTableOps.addIntCol(
          "Games",
          `Number of games played (D1-D1 only; all metrics adjusted to [${gameBasis}] games by ignoring the weakest opponents and/or pro-rating)`,
          GenericTableOps.defaultColorPicker
        ),
        ap: GenericTableOps.addDataCol(
          `AP${apPoll?.__week__}`,
          `The team's AP ranking in week [${apPoll?.__week__}]`,
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
        NET: GenericTableOps.addDataCol(
          `NET`,
          `The team's NET ranking`,
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
        S: GenericTableOps.addDataCol(
          `S`,
          `The S-Curve for the top seeds, at-larges, and first 4 out`,
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
        lastGames: GenericTableOps.addDataCol(
          <span>
            <b className="d-none d-xl-block">L5</b>
            <b className="d-block d-xl-none">L2</b>
          </span>,
          `Most recent games (including game report links), right = most recent`,
          GenericTableOps.defaultColorPicker,
          GenericTableOps.htmlFormatter
        ),
      },
      (anyPinDeltas ? [] : ["rankDiff"])
        .concat(apPoll ? [] : ["ap"])
        .concat(sCurve ? [] : ["S"])
        .concat(_.isEmpty(netRankings) ? ["NET"] : [])
    ) as Record<string, GenericTableColProps>;

    return (
      <GenericTable
        tableCopyId="teamLeaderboardTable"
        tableFields={teamLeaderboard}
        tableData={tableData}
        cellTooltipMode="missing"
      />
    );
  }, [
    confs,
    queryFilters,
    dataEvent,
    wabWeight,
    waeWeight,
    qualityWeight,
    dominanceWeight,
    pinnedWabWeight,
    pinnedWaeWeight,
    pinnedQualityWeight,
    pinnedDomWeight,
    timeWeight,
    pinnedTimeWeight,
    netRankings,
  ]);

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      !dataEvent.error &&
      (loadingOverride || (dataEvent?.teams || []).length == 0)
    );
  }

  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  // 4] View

  /** Switch to pre-season button */
  const getPreseasonButton = () => {
    const tooltip = (
      <Tooltip id="preseasonLeaderboard">
        Switch to pre-season leaderboard
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={(e) => {
            window.location.href = UrlRouting.getOffseasonLeaderboard({
              year,
            });
          }}
        >
          PRE
        </Button>
      </OverlayTrigger>
    );
  };

  const getExploreButton = () => {
    const tooltip = (
      <Tooltip id="statsExplorer">Explore team stats in more detail</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={(e) => {
            window.location.href = UrlRouting.getTeamStatsExplorerUrl({
              year,
              gender,
              confs,
              queryFilters,
            });
          }}
        >
          <FontAwesomeIcon icon={faPercent} />
        </Button>
      </OverlayTrigger>
    );
  };

  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          className="float-left"
          id={`copyLink_teamLeaderboard`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>
    );
  };

  const onPinWeights = (ev: any) => {
    friendlyChange(
      () => {
        setPinnedWabWeight(wabWeight);
        setPinnedWaeWeight(waeWeight);
        setPinnedQualityWeight(qualityWeight);
        setPinnedDomWeight(dominanceWeight);
        setPinnedTimeWeight(timeWeight);

        setPinnedRankings(
          _.chain(currentTable)
            .map((t) => [t.titleStr as string, t.rankNum as number])
            .fromPairs()
            .value()
        );
        setLoadingOverride(false);
      },
      true,
      50
    );
  };

  /** Copy to clipboard button */
  const getPinButton = () => {
    const toPct = (s: number) => (s * 100).toFixed(0) + "%";
    const tooltip = (
      <Tooltip id="pinTooltip">
        Pins rankings for selected weightings
        <br />
        (current: WAB=[{toPct(pinnedWabWeight)}] WAE=[{toPct(pinnedWaeWeight)}]
        Quality=[{toPct(pinnedQualityWeight)}], Dominance=[
        {toPct(pinnedDomWeight)}], Recency=[{toPct(pinnedTimeWeight)}])
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          onClick={onPinWeights}
          className="float-left"
          id={`pinWeights_teamLeaderboard`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faThumbtack} />
        </Button>
      </OverlayTrigger>
    );
  };

  const onRestoreToDefault = (ev: any) => {
    friendlyChange(
      () => {
        setWabWeight(parseFloat(ParamDefaults.defaultTeamLboardWabWeight));
        setPinnedWabWeight(
          parseFloat(ParamDefaults.defaultTeamLboardWabWeight)
        );
        setWaeWeight(parseFloat(ParamDefaults.defaultTeamLboardWaeWeight));
        setPinnedWaeWeight(
          parseFloat(ParamDefaults.defaultTeamLboardWaeWeight)
        );
        setQualityWeight(
          parseFloat(ParamDefaults.defaultTeamLboardQualityWeight)
        );
        setPinnedQualityWeight(
          parseFloat(ParamDefaults.defaultTeamLboardQualityWeight)
        );
        setDominanceWeight(
          parseFloat(ParamDefaults.defaultTeamLboardDomWeight)
        );
        setPinnedDomWeight(
          parseFloat(ParamDefaults.defaultTeamLboardDomWeight)
        );
        setTimeWeight(parseFloat(ParamDefaults.defaultTeamLboardTimeWeight));
        setPinnedTimeWeight(
          parseFloat(ParamDefaults.defaultTeamLboardTimeWeight)
        );

        setPinnedRankings({});
        setLoadingOverride(false);
      },
      true,
      50
    );
  };

  const getRestoreToDefault = () => {
    const tooltip = (
      <Tooltip id="pinRestoreToDefault">
        Return to default weights and re-pin
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          onClick={onRestoreToDefault}
          className="float-left"
          id={`restoreToDefaults_teamLeaderboard`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faTrashRestore} />
        </Button>
      </OverlayTrigger>
    );
  };

  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_teamLeaderboard`, {
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

  // Handle slicker slider dragging

  const [tmpWabWeight, setTmpWabWeight] = useState(
    undefined as number | undefined
  );
  const [tmpWaeWeight, setTmpWaeWeight] = useState(
    undefined as number | undefined
  );
  const [tmpQualityWeight, setTmpQualityWeight] = useState(
    undefined as number | undefined
  );
  const [tmpDomWeight, setTmpDomWeight] = useState(
    undefined as number | undefined
  );
  const [tmpTimeWeight, setTmpTimeWeight] = useState(
    undefined as number | undefined
  );

  const onMouseDown = () => {
    setLoadingOverride(true);
  };
  const onMouseUp = (setter: () => void) => {
    setLoadingOverride(false);
    setter();
  };

  // Slider tooltips

  const elitenessBonusTooltip = (
    <Tooltip id="elitenessBonusTooltip">
      At 100%, adds the entire WAE(lite) rating to the WAB(bubble).
      <br />
      This bonus rewards teams more for big wins and punishes them more for
      losing to middling opposition.
    </Tooltip>
  );

  const dominanceBonusTooltip = (
    <Tooltip id="dominanceBonusTooltip">
      There is a well-known effect in the NBA that teams with a lead perform
      less efficiently, around 3pts/100 per 10pts lead. My research suggests the
      effect exists in college as well, though possibly less pronounced - in the
      25%-50% range.
      <br />
      At 100%, this gives the full "NBA" dominance bonus.
    </Tooltip>
  );

  const recencyBiasTooltip = (
    <Tooltip id="recencyBiasTooltip">
      At 100%, counts the WAB/WAE from the last 10 games double, and the
      efficiency from the last month of games double.
    </Tooltip>
  );

  return (
    <Container>
      <Form.Group as={Row}>
        <Col xs={6} sm={6} md={3} lg={2} style={{ zIndex: 12 }}>
          <ThemedSelect
            value={stringToOption(gender)}
            options={["Men", "Women"].map((gender) => stringToOption(gender))}
            isSearchable={false}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                setPinnedRankings({});
                setLoadingOverride(true);
                setGender((option as any).value);
              }
            }}
          />
        </Col>
        <Col xs={6} sm={6} md={3} lg={2} style={{ zIndex: 11 }}>
          <ThemedSelect
            value={stringToOption(year)}
            options={DateUtils.lboardYearListWithNextYear(tier == "High").map(
              (r) => stringToOption(r)
            )}
            isSearchable={false}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                setPinnedRankings({});
                setLoadingOverride(true);
                setYear((option as any).value);
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
        <Col lg={2} className="mt-1">
          {getCopyLinkButton()}
          &nbsp;&nbsp;
          {getExploreButton()}
          &nbsp;&nbsp;
          {getPreseasonButton()}
        </Col>
      </Form.Group>
      {hasCustomFilter ? (
        <Form.Group as={Row}>
          <Col xs={12} sm={12} md={8} lg={8}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="filter">Filter:</InputGroup.Text>
              </InputGroup.Prepend>
              <div className="flex-fill">
                <TeamFilterAutoSuggestText
                  readOnly={false}
                  placeholder={`;-separated list of teams`}
                  autocomplete={(dataEvent?.teams || []).map(
                    (s) => s.team_name + ";"
                  )}
                  value={tmpQueryFilters}
                  onChange={(ev: any) => setTmpQueryFilters(ev.target.value)}
                  onSelectionChanged={(newStr: string) =>
                    friendlyChange(() => {
                      setQueryFilters(newStr);
                    }, newStr != queryFilters)
                  }
                  onKeyUp={(ev: any) => setTmpQueryFilters(ev.target.value)}
                />
              </div>
            </InputGroup>
          </Col>
        </Form.Group>
      ) : null}
      <Row
        className="mt-2 sticky-top internal-sticky-overlay"
        style={{
          opacity: "85%",
          zIndex: 1,
        }}
      >
        <Col xs={11}>
          <Row>
            <Col xs={1}></Col>
            <Col xs={4}>
              <Form>
                <Form.Group controlId="formBasicRange">
                  <Form.Label>
                    <small>
                      <b>How much you weight W-L record</b> [
                      {_.isNil(tmpWabWeight) ? (
                        <b>{(wabWeight * 100).toFixed(0)}</b>
                      ) : (
                        <i>{(tmpWabWeight * 100).toFixed(0)}</i>
                      )}
                      %]
                    </small>
                  </Form.Label>
                  <Form.Control
                    type="range"
                    custom
                    value={_.isNil(tmpWabWeight) ? wabWeight : tmpWabWeight}
                    onChange={(ev: any) => {
                      const newVal = parseFloat(ev.target.value);
                      if (_.isNil(tmpWabWeight)) onMouseDown();
                      setTmpWabWeight(newVal);
                      setTmpQualityWeight(1.0 - newVal);
                    }}
                    onClick={(ev: any) =>
                      onMouseUp(() => {
                        const newVal = parseFloat(ev.target.value);
                        setWabWeight(newVal);
                        setQualityWeight(1.0 - newVal);
                        setTmpWabWeight(undefined);
                        setTmpQualityWeight(undefined);
                      })
                    }
                    onTouchEnd={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpWabWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setWabWeight(newVal);
                          setQualityWeight(1.0 - newVal);
                          setTmpWabWeight(undefined);
                          setTmpQualityWeight(undefined);
                        }
                      })
                    }
                    onMouseUp={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpWabWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setWabWeight(newVal);
                          setQualityWeight(1.0 - newVal);
                          setTmpWabWeight(undefined);
                          setTmpQualityWeight(undefined);
                        }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </Form.Group>
              </Form>
            </Col>
            <Col xs={2} className="mt-4 text-center">
              <span>vs</span>
            </Col>
            <Col xs={4}>
              <Form>
                <Form.Group controlId="formBasicRange">
                  <Form.Label>
                    <small>
                      <b>How much you weight team efficiency</b> [
                      {_.isNil(tmpQualityWeight) ? (
                        <b>{(qualityWeight * 100).toFixed(0)}</b>
                      ) : (
                        <i>{(tmpQualityWeight * 100).toFixed(0)}</i>
                      )}
                      %]
                    </small>
                  </Form.Label>
                  <Form.Control
                    type="range"
                    custom
                    value={
                      _.isNil(tmpQualityWeight)
                        ? qualityWeight
                        : tmpQualityWeight
                    }
                    onChange={(ev: any) => {
                      const newVal = parseFloat(ev.target.value);
                      if (_.isNil(tmpQualityWeight)) onMouseDown();
                      setTmpWabWeight(1.0 - newVal);
                      setTmpQualityWeight(newVal);
                    }}
                    onClick={(ev: any) =>
                      onMouseUp(() => {
                        const newVal = parseFloat(ev.target.value);
                        setWabWeight(1.0 - newVal);
                        setQualityWeight(newVal);
                        setTmpWabWeight(undefined);
                        setTmpQualityWeight(undefined);
                      })
                    }
                    onTouchEnd={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpQualityWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setWabWeight(1.0 - newVal);
                          setQualityWeight(newVal);
                          setTmpWabWeight(undefined);
                          setTmpQualityWeight(undefined);
                        }
                      })
                    }
                    onMouseUp={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpQualityWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setWabWeight(1.0 - newVal);
                          setQualityWeight(newVal);
                          setTmpWabWeight(undefined);
                          setTmpQualityWeight(undefined);
                        }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </Form.Group>
              </Form>
            </Col>
          </Row>
        </Col>
        <Col xs={1} className="mt-4">
          {getPinButton()}
        </Col>
        <Col xs={11}>
          <Row>
            <Col xs={4}>
              <Form>
                <Form.Group controlId="formBasicRange">
                  <Form.Label>
                    <OverlayTrigger
                      placement="auto"
                      overlay={elitenessBonusTooltip}
                    >
                      <small>
                        Bonus for "eliteness" of record [
                        {_.isNil(tmpWaeWeight) ? (
                          <b>{(waeWeight * 100).toFixed(0)}</b>
                        ) : (
                          <i>{(tmpWaeWeight * 100).toFixed(0)}</i>
                        )}
                        %]
                      </small>
                    </OverlayTrigger>
                  </Form.Label>
                  <Form.Control
                    type="range"
                    custom
                    value={_.isNil(tmpWaeWeight) ? waeWeight : tmpWaeWeight}
                    onChange={(ev: any) => {
                      const newVal = parseFloat(ev.target.value);
                      if (_.isNil(tmpWaeWeight)) onMouseDown();
                      setTmpWaeWeight(newVal);
                    }}
                    onClick={(ev: any) =>
                      onMouseUp(() => {
                        const newVal = parseFloat(ev.target.value);
                        setWaeWeight(newVal);
                        setTmpWaeWeight(undefined);
                      })
                    }
                    onTouchEnd={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpWaeWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setWaeWeight(newVal);
                          setTmpWaeWeight(undefined);
                        }
                      })
                    }
                    onMouseUp={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpWaeWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setWaeWeight(newVal);
                          setTmpWaeWeight(undefined);
                        }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </Form.Group>
              </Form>
            </Col>
            <Col xs={4}>
              <Form>
                <Form.Group controlId="formBasicRange">
                  <Form.Label>
                    <OverlayTrigger
                      placement="auto"
                      overlay={dominanceBonusTooltip}
                    >
                      <small>
                        Bonus for "dominance" of scoring [
                        {_.isNil(tmpDomWeight) ? (
                          <b>{(dominanceWeight * 100).toFixed(0)}</b>
                        ) : (
                          <i>{(tmpDomWeight * 100).toFixed(0)}</i>
                        )}
                        %]
                      </small>
                    </OverlayTrigger>
                  </Form.Label>
                  <Form.Control
                    type="range"
                    custom
                    value={
                      _.isNil(tmpDomWeight) ? dominanceWeight : tmpDomWeight
                    }
                    onChange={(ev: any) => {
                      const newVal = parseFloat(ev.target.value);
                      if (_.isNil(tmpDomWeight)) onMouseDown();
                      setTmpDomWeight(newVal);
                    }}
                    onClick={(ev: any) =>
                      onMouseUp(() => {
                        const newVal = parseFloat(ev.target.value);
                        setDominanceWeight(newVal);
                        setTmpDomWeight(undefined);
                      })
                    }
                    onTouchEnd={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpDomWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setDominanceWeight(newVal);
                          setTmpDomWeight(undefined);
                        }
                      })
                    }
                    onMouseUp={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpDomWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setDominanceWeight(newVal);
                          setTmpDomWeight(undefined);
                        }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </Form.Group>
              </Form>
            </Col>
            <Col xs={4}>
              <Form>
                <Form.Group controlId="formBasicRange">
                  <Form.Label>
                    <OverlayTrigger
                      placement="auto"
                      overlay={recencyBiasTooltip}
                    >
                      <small>
                        "Recency bias" [
                        {_.isNil(tmpTimeWeight) ? (
                          <b>{(timeWeight * 100).toFixed(0)}</b>
                        ) : (
                          <i>{(tmpTimeWeight * 100).toFixed(0)}</i>
                        )}
                        %]
                      </small>
                    </OverlayTrigger>
                  </Form.Label>
                  <Form.Control
                    type="range"
                    custom
                    value={_.isNil(tmpTimeWeight) ? timeWeight : tmpTimeWeight}
                    onChange={(ev: any) => {
                      const newVal = parseFloat(ev.target.value);
                      if (_.isNil(tmpTimeWeight)) onMouseDown();
                      setTmpTimeWeight(newVal);
                    }}
                    onClick={(ev: any) =>
                      onMouseUp(() => {
                        const newVal = parseFloat(ev.target.value);
                        setTimeWeight(newVal);
                        setTmpTimeWeight(undefined);
                      })
                    }
                    onTouchEnd={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpTimeWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setTimeWeight(newVal);
                          setTmpTimeWeight(undefined);
                        }
                      })
                    }
                    onMouseUp={(ev: any) =>
                      onMouseUp(() => {
                        if (!_.isNil(tmpTimeWeight)) {
                          const newVal = parseFloat(ev.target.value);
                          setTimeWeight(newVal);
                          setTmpTimeWeight(undefined);
                        }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </Form.Group>
              </Form>
            </Col>
          </Row>
        </Col>
        <Col xs={1} className="mt-4">
          {getRestoreToDefault()}
        </Col>
      </Row>
      <Row className="mt-2" style={{ zIndex: 0 }}>
        <Col style={{ paddingLeft: "5px", paddingRight: "5px", zIndex: 0 }}>
          <LoadingOverlay
            active={needToLoadQuery()}
            spinner
            text={"Loading/Calculating Team Leaderboard..."}
          >
            {table}
          </LoadingOverlay>
        </Col>
      </Row>
    </Container>
  );
};
export default TeamLeaderboardTable;
