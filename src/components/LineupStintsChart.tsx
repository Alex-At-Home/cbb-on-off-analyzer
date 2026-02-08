// React imports:
import _ from "lodash";
import React, { useState, useEffect } from "react";
import { CbbColors } from "../utils/CbbColors";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
//@ts-ignore
import Select from "react-select";

import {
  getCommonFilterParams,
  MatchupFilterParams,
  ParamDefaults,
} from "../utils/FilterModels";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import {
  LineupStintInfo,
  LineupStintTeamShot,
  LineupStintTeamStat,
  LineupStintTeamStats,
  PlayerCode,
} from "../utils/StatModels";
import GenericTable, {
  GenericTableColProps,
  GenericTableOps,
  GenericTableRow,
} from "./GenericTable";
import { LineupStatsModel } from "./LineupStatsTable";
import { RosterStatsModel } from "./RosterStatsTable";
import { TeamStatsModel } from "./TeamStatsTable";
import {
  GameAnalysisUtils,
  GameStatsCache,
} from "../utils/tables/GameAnalysisUtils";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import ThemedSelect from "./shared/ThemedSelect";
import { useTheme } from "next-themes";

type Props = {
  startingState: MatchupFilterParams;
  opponent: string;
  dataEvent: {
    lineupStatsA: LineupStatsModel;
    teamStatsA: TeamStatsModel;
    rosterStatsA: RosterStatsModel;
    lineupStatsB: LineupStatsModel;
    teamStatsB: TeamStatsModel;
    rosterStatsB: RosterStatsModel;
    lineupStintsA: LineupStintInfo[];
    lineupStintsB: LineupStintInfo[];
  };
  onChangeState: (newParams: MatchupFilterParams) => void;
};

type StintClump = {
  stints: LineupStintInfo[];
};

const LineupStintsChart: React.FunctionComponent<Props> = ({
  startingState,
  opponent,
  dataEvent,
  onChangeState,
}) => {
  const {
    lineupStatsA,
    teamStatsA,
    rosterStatsA,
    lineupStatsB,
    teamStatsB,
    rosterStatsB,
    lineupStintsA,
    lineupStintsB,
  } = dataEvent;

  const { resolvedTheme } = useTheme();

  // Model

  const commonParams = getCommonFilterParams(startingState);
  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  // Luck:
  const [adjustForLuck, setAdjustForLuck] = useState(
    _.isNil(startingState.onOffLuck)
      ? ParamDefaults.defaultOnOffLuckAdjust
      : startingState.onOffLuck,
  );
  const [luckConfig, setLuckConfig] = useState(
    _.isNil(startingState.luck)
      ? ParamDefaults.defaultLuckConfig
      : startingState.luck,
  );

  // Highlight lineup in hovered over stint:

  const [activeLineup, setActiveLineup] = useState<Set<string> | undefined>(
    undefined,
  );

  const [showUsage, setShowUsage] = useState<boolean>(
    _.isNil(startingState.showUsage)
      ? ParamDefaults.defaultMatchupAnalysisShowUsage
      : startingState.showUsage,
  );
  const [showPpp, setShowPpp] = useState<boolean>(
    _.isNil(startingState.showPpp)
      ? ParamDefaults.defaultMatchupAnalysisShowPpp
      : startingState.showPpp,
  );

  const [showLabels, setShowLabels] = useState<boolean>(
    _.isNil(startingState.showLabels)
      ? ParamDefaults.defaultMatchupAnalysisShowLabels
      : startingState.showLabels,
  );
  const [labelToShow, setLabelToShow] = useState<string>(
    _.isNil(startingState.labelToShow)
      ? ParamDefaults.defaultMatchupAnalysisLabelToShow
      : startingState.labelToShow,
  );

  /** Util for manipulating player stats */
  const toStats = (stats: LineupStintTeamStats) =>
    stats as Record<string, LineupStintTeamStat>;
  /** Util for manipulating player stats */
  const toShots = (stats: LineupStintTeamStats) =>
    stats as Record<string, LineupStintTeamShot>;

  /** Overlay counting stats on each stint if enabled */
  const labelOptions = {
    "No Labels": (info) => 0,
    "Plus Minus": (info) => info.plus_minus || 0,
    Fouls: (info) => toStats(info)?.foul?.total || 0,
    Points: (info) =>
      3 * (toShots(info)?.fg_3p?.made?.total || 0) +
      2 * (toShots(info)?.fg_2p?.made?.total || 0) +
      (toShots(info)?.ft?.made?.total || 0),
    Assists: (info) => toStats(info)?.assist?.total || 0,
    Turnovers: (info) => toStats(info)?.to?.total || 0,
    Steals: (info) => toStats(info)?.stl?.total || 0,
    Blocks: (info) => toStats(info)?.blk?.total || 0,
    ORBs: (info) => toStats(info)?.orb?.total || 0,
    DRBs: (info) => toStats(info)?.drb?.total || 0,
    FGM: (info) => toShots(info)?.fg?.made?.total || 0,
    FGA: (info) => toShots(info)?.fg?.attempts?.total || 0,
    FGmi: (info) =>
      (toShots(info)?.fg?.attempts?.total || 0) -
      (toShots(info)?.fg?.made?.total || 0),
    "Putback Pts": (info) =>
      2 * (toShots(info)?.fg_2p?.made?.orb || 0) +
      (toShots(info)?.ft?.made?.orb || 0),
    "Putback FGA/SF": (info) =>
      (toShots(info)?.fg_2p?.attempts?.orb || 0) +
      Math.floor(0.5 * (toShots(info)?.ft?.attempts?.orb || 0)),
    "3PA / ORBs": (info) => toShots(info)?.fg_3p?.attempts?.orb || 0,
    "3PM / ORBs": (info) => toShots(info)?.fg_3p?.made?.orb || 0,
    "'Empty' ORBs": (info) =>
      Math.max(
        0,
        (toStats(info)?.orb?.total || 0) -
          (toShots(info)?.fg?.attempts?.orb || 0),
      ),
    "Transition Pts": (info) =>
      2 * (toShots(info)?.fg_2p?.made?.early || 0) +
      3 * (toShots(info)?.fg_3p?.made?.early || 0) +
      (toShots(info)?.ft?.made?.early || 0),
    "Transition FGA/SF": (info) =>
      (toShots(info)?.fg_2p?.attempts?.early || 0) +
      (toShots(info)?.fg_3p?.attempts?.early || 0) +
      Math.floor(0.5 * (toShots(info)?.ft?.attempts?.early || 0)),
    "3PM": (info) => toShots(info)?.fg_3p?.made?.total || 0,
    "3PA": (info) => toShots(info)?.fg_3p?.attempts?.total || 0,
    "3Pmi": (info) =>
      (toShots(info)?.fg_3p?.attempts?.total || 0) -
      (toShots(info)?.fg_3p?.made?.total || 0),
    "2PM": (info) => toShots(info)?.fg_2p?.made?.total || 0,
    "2PA": (info) => toShots(info)?.fg_2p?.attempts?.total || 0,
    "2Pmi": (info) =>
      (toShots(info)?.fg_2p?.attempts?.total || 0) -
      (toShots(info)?.fg_2p?.made?.total || 0),
    "2PM (mid)": (info) => toShots(info)?.fg_mid?.made?.total || 0,
    "2PA (mid)": (info) => toShots(info)?.fg_mid?.attempts?.total || 0,
    "2Pmi (mid)": (info) =>
      (toShots(info)?.fg_mid?.attempts?.total || 0) -
      (toShots(info)?.fg_mid?.made?.total || 0),
    "2PM (rim)": (info) => toShots(info)?.fg_rim?.made?.total || 0,
    "2PA (rim)": (info) => toShots(info)?.fg_rim?.attempts?.total || 0,
    "2Pmi (rim)": (info) =>
      (toShots(info)?.fg_rim?.attempts?.total || 0) -
      (toShots(info)?.fg_rim?.made?.total || 0),
    FTM: (info) => toShots(info)?.ft?.made?.total || 0,
    FTA: (info) => toShots(info)?.ft?.attempts?.total || 0,
    FTmi: (info) =>
      (toShots(info)?.ft?.attempts?.total || 0) -
      (toShots(info)?.ft?.made?.total || 0),
  } as Record<string, (info: LineupStintTeamStats) => number>;

  /** Some special cases where it makes sense to show the labels over the defense also */
  const defenseOnlyLabelOptions = {
    Turnovers: (info) => toStats(info)?.to?.total || 0, //(turnovers forced)
    Points: (info) => info?.pts || 0, //(for some reason pts isn't filled in on individuals stats)

    // Transition
    "Transition Pts": (info) =>
      2 * (toShots(info)?.fg_2p?.made?.early || 0) +
      3 * (toShots(info)?.fg_3p?.made?.early || 0) +
      (toShots(info)?.ft?.made?.early || 0),
    "Transition FGA/SF": (info) =>
      (toShots(info)?.fg_2p?.attempts?.early || 0) +
      (toShots(info)?.fg_3p?.attempts?.early || 0),

    // Putbacks
    ORBs: (info) => toStats(info)?.orb?.total || 0, //(ORBs allowed)
    "Putback Pts": (info) =>
      2 * (toShots(info)?.fg_2p?.made?.orb || 0) +
      (toShots(info)?.ft?.made?.orb || 0),
    "Putback FGA/SF": (info) => toShots(info)?.fg_2p?.attempts?.orb || 0,
    "3PA / ORBs": (info) => toShots(info)?.fg_3p?.attempts?.orb || 0,
    "3PM / ORBs": (info) => toShots(info)?.fg_3p?.made?.orb || 0,
    "'Empty' ORBs": (info) =>
      Math.max(
        0,
        (toStats(info)?.orb?.total || 0) -
          (toShots(info)?.fg?.attempts?.orb || 0),
      ),
  } as Record<string, (info: LineupStintTeamStats) => number>;

  // Integration with main page

  useEffect(() => {
    onChangeState({
      ...startingState,
      showUsage,
      showPpp,
      labelToShow,
    });
  }, [showUsage, showPpp, labelToShow]);

  // RAPM building

  const [cachedStats, setCachedStats] = useState<{
    aStats?: GameStatsCache;
    bStats?: GameStatsCache;
  }>({});
  useEffect(() => {
    setCachedStats({});
  }, [dataEvent, adjustForLuck]);
  useEffect(() => {
    if (_.isEmpty(cachedStats) && !_.isEmpty(lineupStatsA.lineups)) {
      const aStats = GameAnalysisUtils.buildGameRapmStats(
        commonParams.team!,
        commonParams,
        lineupStatsA,
        teamStatsA,
        rosterStatsA,
        adjustForLuck,
        luckConfig,
        avgEfficiency,
      );

      const bStats = GameAnalysisUtils.buildGameRapmStats(
        opponent,
        commonParams,
        lineupStatsB,
        teamStatsB,
        rosterStatsB,
        adjustForLuck,
        luckConfig,
        avgEfficiency,
      );
      setCachedStats({
        aStats,
        bStats,
      });
    }
  }, [cachedStats]);

  // Lineup building model

  const toStintsPerPlayer = (
    stints: LineupStintInfo[],
  ): Record<PlayerCode, LineupStintInfo[]> => {
    return _.chain(stints)
      .flatMap((l) => {
        return l.players.map(
          (p) => [p.code, l] as [PlayerCode, LineupStintInfo],
        );
      })
      .groupBy((idStint: [PlayerCode, LineupStintInfo]) => idStint[0])
      .mapValues((idStints: [PlayerCode, LineupStintInfo][]) =>
        idStints.map((idStint) => idStint[1]),
      )
      .value();
  };

  const gameBreaks = [
    20.0, 40.0, 45.0, 50.0, 55.0, 60.0, 65.0, 70.0, 75.0, 80.0,
  ];

  const crossesGameBreak = (
    breakTime: number,
    lastStingInClump: LineupStintInfo,
    nextStint: LineupStintInfo,
  ) => {
    if (breakTime > nextStint.end_min) {
      return false;
    } else {
      const lastClumpEnd = lastStingInClump.end_min;
      if (lastClumpEnd <= breakTime && nextStint.end_min > breakTime) {
        return true;
      } else {
        return false;
      }
    }
  };
  const toClumpsPerPlayer = (stints: LineupStintInfo[]): StintClump[] => {
    return _.transform(
      stints,
      (acc, v) => {
        if (_.isEmpty(acc.res)) {
          acc.res = [{ stints: [v] }];
        } else {
          const lastClump = _.last(acc.res)!;
          const lastStint = _.last(lastClump.stints)!; //(non-empty by construction)
          if (v.start_min > lastStint.end_min) {
            //(new clump!)
            acc.res = acc.res.concat([{ stints: [v] }]);
            if (v.end_min > gameBreaks[acc.nextGameBreakIndex]!) {
              acc.nextGameBreakIndex = acc.nextGameBreakIndex + 1;
            }
          } else if (
            crossesGameBreak(
              gameBreaks[acc.nextGameBreakIndex]!,
              _.last(lastClump.stints)!,
              v,
            )
          ) {
            //(new clump!)
            acc.res = acc.res.concat([{ stints: [v] }]);
            acc.nextGameBreakIndex = acc.nextGameBreakIndex + 1;
          } else {
            lastClump.stints = lastClump.stints.concat([v]);
          }
        }
      },
      { res: [] as StintClump[], nextGameBreakIndex: 0 },
    ).res;
  };

  const playersA = _.mapValues(toStintsPerPlayer(lineupStintsA), (ss) =>
    toClumpsPerPlayer(ss),
  );
  const playersB = _.mapValues(toStintsPerPlayer(lineupStintsB), (ss) =>
    toClumpsPerPlayer(ss),
  );

  const buildTable = (
    team: string,
    teamStats: TeamStatsModel,
    lineupStints: LineupStintInfo[],
    players: Record<string, StintClump[]>,
    playerInfoCache: GameStatsCache | undefined,
  ): [Record<string, GenericTableColProps>, GenericTableRow[]] => {
    const starterCodes = new Set(
      _.first(lineupStints)?.players?.map((p) => p.code) || [],
    );

    const gameOrbPct = teamStats.baseline?.off_orb?.value || 0;

    const { tableCols, gameBreakRowInfo } = _.transform(
      lineupStints,
      (acc, stint, index) => {
        if (stint.end_min > gameBreaks[acc.nextGameBreakIndex]!) {
          const fieldName = `gm${acc.nextGameBreakIndex}`;
          acc.tableCols[fieldName] = new GenericTableColProps(
            "",
            "",
            0.1,
            false,
            GenericTableOps.htmlFormatter,
          );
          acc.gameBreakRowInfo[fieldName] = _.thru(
            acc.nextGameBreakIndex,
            (breakNum) => {
              const tooltip = (
                <Tooltip id={`gameBreak${breakNum}`}>
                  [{GameAnalysisUtils.buildDurationStr(gameBreaks[breakNum])}]
                  break
                  <br />
                  Score: [{stint.score_info.start.scored}:
                  {stint.score_info.start.allowed}]
                </Tooltip>
              );
              const styled = (str: string) => (
                <OverlayTrigger placement="auto" overlay={tooltip}>
                  <small>
                    <sup
                      style={{
                        paddingLeft: "5px",
                        paddingRight: "4px",
                      }}
                    >
                      <b>{str}</b>
                    </sup>
                  </small>
                </OverlayTrigger>
              );
              if (breakNum == 0) {
                return styled("H");
              } else if (breakNum == 1) {
                return styled("F");
              } else {
                return styled((breakNum - 1).toFixed(0));
              }
            },
          );
          acc.nextGameBreakIndex = acc.nextGameBreakIndex + 1;
        }
        acc.tableCols[`stint${index}`] = new GenericTableColProps(
          "",
          ``,
          stint.duration_mins,
          false,
          GenericTableOps.htmlFormatter,
        );
      },
      {
        tableCols: {} as Record<string, GenericTableColProps>,
        nextGameBreakIndex: 0,
        gameBreakRowInfo: {} as Record<string, any>,
      },
    );

    const tableDefs = {
      title: GenericTableOps.addTitle(
        "",
        "",
        GenericTableOps.defaultRowSpanCalculator,
        "",
        GenericTableOps.htmlFormatter,
        7.5,
      ),
      sep0: GenericTableOps.addColSeparator(),
      ...(showLabels &&
      labelToShow &&
      labelToShow != "No Labels" &&
      labelOptions[labelToShow]
        ? {
            total: GenericTableOps.addDataCol(
              "",
              `The total of label [${labelToShow}] for each player`,
              CbbColors.applyThemedBackground,
              GenericTableOps.htmlFormatter,
            ),
          }
        : {}),
      ...tableCols,
    };

    const sortedPlayerObjs = _.chain(players)
      .map((clumps, playerCode) => {
        const playerKey =
          _.find(
            clumps[0].stints[0].players,
            (player) => player.code == playerCode,
          )?.id || "?????";

        const { cols: playerCols, labelTotal } = _.transform(
          clumps,
          (acc, clump) => {
            const clumpStart = clump.stints[0].start_min;
            const clumpEnd = _.last(clump.stints)!.end_min;
            const clumpPlusMinus = _.sum(
              clump.stints.map((c) => c.team_stats.plus_minus),
            );
            const clumpNumPoss =
              _.sum(clump.stints.map((c) => c.team_stats.num_possessions)) || 1;

            const stintsRemaining = _.drop(lineupStints, acc.currStint);
            const startStint = _.thru(
              _.findIndex(
                stintsRemaining,
                (stint) => stint.start_min >= clumpStart,
              ),
              (index) =>
                index < 0 ? _.size(lineupStints) : index + acc.currStint,
            );
            if (startStint >= 0) {
              const endStint = _.thru(
                _.findIndex(
                  stintsRemaining,
                  (stint) => stint.end_min >= clumpEnd,
                ),
                (index) =>
                  index < 0 ? _.size(lineupStints) : index + acc.currStint,
              );

              //   console.log(
              //     `${playerCode}: ${clumpStart}:${clumpEnd} found ${startStint}(${lineupStints[startStint].start_min})` +
              //       ` vs ${startStint}(${lineupStints[endStint]?.end_min}`
              //   );

              for (var ii = startStint; ii <= endStint; ++ii) {
                const stint = lineupStints[ii];

                const playerInfo = _.find(
                  stint.players,
                  (p) => p.code == playerCode,
                );
                const playerStats = playerInfo?.stats;
                if (playerStats) {
                  //(for some reason this is empty in the API response, fill it in)
                  playerStats.plus_minus = stint.team_stats.plus_minus;
                }
                acc.labelTotal +=
                  labelToShow && labelOptions[labelToShow] && playerInfo?.stats
                    ? labelOptions[labelToShow](playerInfo?.stats) || 0
                    : 0;

                // Calculate very simple usage rate:
                const playerStintInfo = _.thru(playerStats, (__) => {
                  /** Use this instead of stint.team_stats.num_possessions for consistency with how we calc player equivs */
                  const getClassicShots = (stat: LineupStintTeamStats) => {
                    return (
                      (toShots(stat)?.fg?.attempts?.total || 0) +
                      0.475 * (toShots(stat)?.ft?.attempts?.total || 0) +
                      (toStats(stat)?.to?.total || 0)
                    );
                  };
                  const orbFactor = 0.9; //(in real ORtg calculate this exactly, but here just make a guess)

                  const teamShots = getClassicShots(stint.team_stats);

                  if (playerStats && teamShots) {
                    const playerPoss = getClassicShots(playerStats);

                    const ptsScored =
                      2 * (toShots(playerStats)?.fg_2p?.made?.total || 0) +
                      3 * (toShots(playerStats)?.fg_3p?.made?.total || 0) +
                      (toShots(playerStats)?.ft?.made?.total || 0);

                    // Generate an approximate ORtg
                    // (for ORB we don't calculate it exactly per stint, instead we rely on game/D1 averages
                    //  the issue is that you could have lots of ORBs and no made shots in a stint - unlike
                    //  assists where every assist corresponds to a make .. would still be interesting to
                    //  weight the ORB factors according to whether there were any ORBs?)

                    const playerAssists =
                      toStats(playerStats)?.assist?.total || 0;

                    const playerAssisted2s =
                      toShots(playerStats)?.fg_2p?.ast?.total || 0;

                    const playerAssisted3s =
                      toShots(playerStats)?.fg_3p?.ast?.total || 0;

                    const playerMakes =
                      (toShots(playerStats)?.fg_2p?.made?.total || 0) +
                      (toShots(playerStats)?.fg_3p?.made?.total || 0);

                    const playerMisses =
                      (toShots(playerStats)?.fg_2p?.attempts?.total || 0) +
                      (toShots(playerStats)?.fg_3p?.attempts?.total || 0) -
                      playerMakes;

                    const playerPossUsed =
                      playerPoss - //(ie makes + misses + other stuff)
                      playerMisses * gameOrbPct - //(not penalized for misses if team ORBs well)
                      playerMakes * (1.0 - orbFactor) + //(small penalty on all shots from ORBs)
                      (0.25 *
                        (playerAssists -
                          (playerAssisted2s + playerAssisted3s)) + //(gain more credit on unassisted shots)
                        0.25 * (toStats(playerStats)?.orb?.total || 0)) *
                        orbFactor;

                    const ptsContributed =
                      orbFactor *
                      (ptsScored +
                        0.5 *
                          (playerAssists -
                            (playerAssisted2s + playerAssisted3s)) +
                        0.5 * (toStats(playerStats)?.orb?.total || 0));

                    // Possessions break down:
                    // if (
                    //   team == "XXX" &&
                    //   GameAnalysisUtils.buildDurationStr(stint.start_min) ==
                    //     'YY"ZZ'
                    // ) {
                    //   console.log(`POSS: ${playerCode} team=[${teamShots}|${
                    //     stint.team_stats.num_possessions
                    //   }]: ${playerPoss} - [${playerMisses}*0.9] - [${playerMakes}*0.1] +
                    //   0.25*([${playerAssists}]a - [${
                    //     playerAssisted2s + playerAssisted3s
                    //   }]a'd + 0.25*([${
                    //     toStats(playerStats)?.orb?.total || 0
                    //   }]orbs)-> ${playerPossUsed} / ${
                    //     playerPossUsed / (teamShots || 1)
                    //   } vs ${playerPoss}`);
                    // }

                    return {
                      pts: ptsContributed,
                      ppp: ptsScored / (playerPoss || 1),
                      ortg: ptsContributed / (playerPossUsed || 1),
                      usage: playerPossUsed / (teamShots || 1),
                    };
                  } else {
                    return undefined;
                  }
                });

                const tooltipTeam = (
                  <Tooltip id={`stint${ii}`}>
                    <b>CLUMP</b>: [
                    {GameAnalysisUtils.buildDurationStr(
                      clump.stints[0].start_min,
                    )}
                    ]-[
                    {GameAnalysisUtils.buildDurationStr(
                      _.last(clump.stints)!.end_min,
                    )}
                    ]
                    <br />
                    Score: [{clump.stints[0].score_info.start.scored}:
                    {clump.stints[0].score_info.start.allowed}]-[
                    {_.last(clump.stints)!.score_info.end.scored}:
                    {_.last(clump.stints)!.score_info.end.allowed}
                    ]
                    <br />
                    <br />
                    Team Stats:
                    <br />
                    {GameAnalysisUtils.renderStintStats(clump.stints, true)}
                    <br />
                    Opponent Stats:
                    <br />
                    {GameAnalysisUtils.renderStintStats(clump.stints, false)}
                    <br />
                    <br />
                    <b>STINT</b>: [
                    {GameAnalysisUtils.buildDurationStr(stint.start_min)}]-[
                    {GameAnalysisUtils.buildDurationStr(stint.end_min)}]
                    <br />
                    Score: [{stint.score_info.start.scored}:
                    {stint.score_info.start.allowed}]-[
                    {stint.score_info.end.scored}:{stint.score_info.end.allowed}
                    ]
                    <br />
                    <br />
                    Team Stats:
                    <br />
                    {GameAnalysisUtils.renderStintStats([stint], true)}
                    <br />
                    Opponent Stats:
                    <br />
                    {GameAnalysisUtils.renderStintStats([stint], false)}
                    <br />
                  </Tooltip>
                );

                const tooltipPlayer = (
                  <Tooltip id={`stintPlayer${ii}`}>
                    <b>{playerInfo?.id || "???"}</b>
                    <br />
                    <br />
                    <b>Lineup Stint Stats</b>
                    <br />
                    ORtg = [
                    <b>{(100 * (playerStintInfo?.ortg || 0)).toFixed(2)}</b>]
                    <br />
                    (Contributed [
                    <b>{(playerStintInfo?.pts || 0).toFixed(1)}</b>]pts)
                    <br />
                    (PPP = [
                    <b>{(100 * (playerStintInfo?.ppp || 0)).toFixed(2)}</b>])
                    <br />
                    Usage = [
                    <b>{(100 * (playerStintInfo?.usage || 0)).toFixed(0)}</b>
                    %]
                    <br />
                    <br />
                    {playerStats
                      ? GameAnalysisUtils.renderStintStats(
                          [
                            {
                              ...stint,
                              team_stats: playerStats,
                            },
                          ],
                          true,
                        )
                      : undefined}
                  </Tooltip>
                );

                acc.cols[`stint${ii}`] = (
                  <div>
                    <OverlayTrigger
                      placement="auto"
                      overlay={tooltipTeam}
                      onEntered={() => {
                        setActiveLineup(
                          new Set(stint.players.map((p) => `${team}${p.code}`)),
                        );
                      }}
                      onExited={() => {
                        setActiveLineup(undefined);
                      }}
                    >
                      <div>
                        <hr
                          className="mt-0 pt-0 pb-0"
                          style={{
                            height: "4px",
                            marginBottom: "2px",
                            background:
                              CbbColors.off_diff20_p100_redGreyGreen(
                                clumpPlusMinus,
                              ),
                          }}
                        />
                      </div>
                    </OverlayTrigger>
                    {showUsage || showPpp ? (
                      <OverlayTrigger
                        placement="auto"
                        overlay={tooltipPlayer}
                        onEntered={() => {
                          setActiveLineup(
                            new Set(
                              stint.players.map((p) => `${team}${p.code}`),
                            ),
                          );
                        }}
                        onExited={() => {
                          setActiveLineup(undefined);
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            textAlign: "center",
                          }}
                        >
                          {showUsage ? (
                            <hr
                              className="mt-0 pt-0 pb-0"
                              style={{
                                height: "2px",
                                marginBottom: "2px",
                                opacity: _.isUndefined(playerStintInfo)
                                  ? "0%"
                                  : "100%",
                                background: CbbColors.usg_offDef_alt(
                                  playerStintInfo?.usage || 0,
                                ),
                              }}
                            />
                          ) : undefined}
                          {showPpp ? (
                            <hr
                              className="mt-0 pt-0 pb-0"
                              style={{
                                height: "2px",
                                marginBottom: "0px",
                                opacity: `${Math.min(
                                  (playerStintInfo?.usage || 0) * 400,
                                  100,
                                ).toFixed(0)}%`,
                                background: CbbColors.off_ppp_redGreyGreen(
                                  playerStintInfo?.ppp || 0,
                                ),
                              }}
                            />
                          ) : undefined}
                          {showLabels &&
                          labelToShow &&
                          labelOptions[labelToShow] &&
                          playerInfo?.stats &&
                          labelOptions[labelToShow](playerInfo?.stats) ? (
                            <small
                              style={{
                                position: "absolute",
                                bottom: "calc(25% - 3px)",
                                right: "calc(50% - 3px)",
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor:
                                    resolvedTheme === "light"
                                      ? "rgba(255, 255, 255, 0.7)"
                                      : "rgba(0, 0, 0, 0.3)",
                                  borderRadius: "50%",
                                  padding: "1px 3px",
                                }}
                              >
                                <small>
                                  <b>
                                    {labelOptions[labelToShow](
                                      playerInfo?.stats,
                                    )}
                                  </b>
                                </small>
                              </span>
                            </small>
                          ) : undefined}
                        </div>
                      </OverlayTrigger>
                    ) : undefined}
                  </div>
                );
              }
              acc.currStint = endStint + 1;
            } else return undefined; //(can complete the transform)
          },
          { currStint: 0, cols: {} as Record<string, any>, labelTotal: 0 },
        );

        const addFormattingToPlayers = (playerCode: string) => {
          const prettifiedPlayerCode =
            GameAnalysisUtils.namePrettifier(playerCode);
          const maybeUnderline = (s: string) =>
            starterCodes.has(s) ? <u>{s}</u> : s;
          if (!playerInfoCache) {
            return <b>{maybeUnderline(playerCode)}</b>;
          } else {
            const maybeRapmInfo = _.find(
              playerInfoCache.rapmInfo?.enrichedPlayers,
              (p) => p.playerCode == playerCode,
            );
            const tooltip = (
              <Tooltip id={`playerInfo${playerCode}`}>
                {maybeRapmInfo
                  ? GameAnalysisUtils.buildPlayerTooltipContents(
                      team,
                      playerInfoCache.playerInfo[playerKey] || {},
                      maybeRapmInfo,
                      playerInfoCache.positionInfo[playerKey],
                    )
                  : "(loading)"}
              </Tooltip>
            );

            const maybePos =
              playerInfoCache.positionInfo[playerKey]?.posClass || "??";
            return (
              <span style={{ whiteSpace: "nowrap" }}>
                <sup>
                  <small>{maybePos} </small>
                </sup>
                <OverlayTrigger placement="auto" overlay={tooltip}>
                  <b
                    style={{
                      opacity: activeLineup
                        ? activeLineup.has(`${team}${playerCode}`)
                          ? "100%"
                          : "50%"
                        : "100%",
                    }}
                  >
                    {maybeUnderline(prettifiedPlayerCode)}
                  </b>
                </OverlayTrigger>
              </span>
            );
          }
        };

        return {
          title: addFormattingToPlayers(playerCode),
          total: <small>{labelTotal}</small>,
          pct_poss:
            playerInfoCache?.playerInfo?.[playerKey]?.off_team_poss_pct?.value,
          ...playerCols,
        };
      })
      .sortBy((playerObj) => -(playerObj.pct_poss || 0))
      .value();

    const tableRows = (
      [
        GenericTableOps.buildSubHeaderRow(
          [[<b>{team}:</b>, _.size(tableDefs)]],
          "small text-center",
        ),
        GenericTableOps.buildDataRow(
          {
            title: <i>Game score</i>,
            ...gameBreakRowInfo,
            ..._.fromPairs(
              lineupStints.map((stint, stintNum) => {
                const scoreDiffAtStart = stint.score_info.start_diff;
                const scoreDiffAtEnd = stint.score_info.end_diff;
                const stintDiff =
                  stint.score_info.end_diff - stint.score_info.start_diff;
                const tooltip = (
                  <Tooltip id={`gameScore${stintNum}`}>
                    Stint: [
                    {GameAnalysisUtils.buildDurationStr(stint.start_min)}]-[
                    {GameAnalysisUtils.buildDurationStr(stint.end_min)}]
                    <br />
                    Score: [{stint.score_info.start.scored}:
                    {stint.score_info.start.allowed}]-[
                    {stint.score_info.end.scored}:{stint.score_info.end.allowed}
                    ]
                    <br />
                    <br />
                    Stint Delta Pts: [{stintDiff}]
                  </Tooltip>
                );
                return [
                  `stint${stintNum}`,
                  <OverlayTrigger placement="auto" overlay={tooltip}>
                    <div>
                      <hr
                        className="mt-0 pt-0 pb-0"
                        style={{
                          height: "5px",
                          marginBottom: "2px",
                          background: `linear-gradient(to right, ${CbbColors.off_diff20_p100_redGreyGreen(
                            scoreDiffAtStart,
                          )} 0%, ${CbbColors.off_diff20_p100_redGreyGreen(
                            scoreDiffAtEnd,
                          )} 100%)`,
                        }}
                      />
                      <hr
                        className="mt-0 pt-0 pb-0"
                        style={{
                          height: "2px",
                          marginBottom: "0px",
                          background: `linear-gradient(to right, ${CbbColors.off_diff20_p100_redGreyGreen(
                            stintDiff,
                          )} 0%, ${CbbColors.off_diff20_p100_redGreyGreen(
                            stintDiff,
                          )} 100%)`,
                        }}
                      />
                    </div>
                  </OverlayTrigger>,
                ];
              }),
            ),
          },
          GenericTableOps.defaultFormatter,
          GenericTableOps.defaultCellMeta,
        ),
      ] as GenericTableRow[]
    )
      .concat(
        sortedPlayerObjs.map((playerObj) => {
          return GenericTableOps.buildDataRow(
            playerObj,
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta,
          );
        }),
      )
      .concat(
        showPpp
          ? ([
              GenericTableOps.buildDataRow(
                {
                  title: <i>Defense:</i>,
                  ...gameBreakRowInfo,
                  ..._.fromPairs(
                    lineupStints.map((stint, stintNum) => {
                      const scoredVsAtStart = stint.score_info.start.allowed;
                      const scoredVsAtEnd = stint.score_info.end.allowed;
                      const stintDiff = scoredVsAtEnd - scoredVsAtStart;
                      const ppp =
                        stintDiff / (stint.team_stats.num_possessions || 1);
                      const tooltip = (
                        <Tooltip id={`gameScore${stintNum}`}>
                          Stint: [
                          {GameAnalysisUtils.buildDurationStr(stint.start_min)}
                          ]-[
                          {GameAnalysisUtils.buildDurationStr(stint.end_min)}]
                          <br />
                          Score: [{stint.score_info.start.scored}:
                          {stint.score_info.start.allowed}]-[
                          {stint.score_info.end.scored}:
                          {stint.score_info.end.allowed}
                          ]
                          <br />
                          <br />
                          Pts Allowed: [{stintDiff}]
                          <br />
                          PPP Against: [{ppp.toFixed(2)}]
                        </Tooltip>
                      );
                      return [
                        `stint${stintNum}`,
                        <OverlayTrigger placement="auto" overlay={tooltip}>
                          <div
                            style={{
                              position: "relative",
                              textAlign: "center",
                            }}
                          >
                            <hr
                              className="mt-0 pt-0 pb-0"
                              style={{
                                height: "3px",
                                opacity: "75%",
                                marginBottom: "0px",
                                background: `linear-gradient(to right, ${CbbColors.def_ppp_redGreyGreen(
                                  ppp,
                                )} 0%, ${CbbColors.def_ppp_redGreyGreen(
                                  ppp,
                                )} 100%)`,
                              }}
                            />
                            {showLabels &&
                            labelToShow &&
                            defenseOnlyLabelOptions[labelToShow] &&
                            stint.opponent_stats &&
                            defenseOnlyLabelOptions[labelToShow](
                              stint.opponent_stats,
                            ) ? (
                              <small
                                style={{
                                  position: "absolute",
                                  bottom: "calc(25% - 3px)",
                                  right: "calc(50% - 3px)",
                                }}
                              >
                                <span
                                  style={{
                                    backgroundColor:
                                      resolvedTheme === "light"
                                        ? "rgba(255, 255, 255, 0.7)"
                                        : "rgba(0, 0, 0, 0.3)",
                                    borderRadius: "50%",
                                    padding: "1px 3px",
                                  }}
                                >
                                  <small>
                                    <b>
                                      {labelOptions[labelToShow](
                                        stint.opponent_stats,
                                      )}
                                    </b>
                                  </small>
                                </span>
                              </small>
                            ) : undefined}
                          </div>
                        </OverlayTrigger>,
                      ];
                    }),
                  ),
                },
                GenericTableOps.defaultFormatter,
                GenericTableOps.defaultCellMeta,
              ),
            ] as GenericTableRow[])
          : [],
      );
    return [tableDefs, tableRows];
  };

  const [tableDefsA, tableRowsA] = buildTable(
    commonParams.team!,
    teamStatsA,
    lineupStintsA,
    playersA,
    cachedStats.aStats,
  );
  const [tableDefsB, tableRowsB] = buildTable(
    opponent,
    teamStatsB,
    lineupStintsB,
    playersB,
    cachedStats.bStats,
  );

  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  return (
    <Container>
      <Row className="mb-1 text-left">
        <Col xs={12} md={6}>
          <ToggleButtonGroup
            items={[
              {
                label: "Usage",
                tooltip: "Show/hide player usage in each stint/clump",
                toggled: showUsage,
                onClick: () => setShowUsage(!showUsage),
              },
              {
                label: "PPP",
                tooltip: "Show/hide player pts/play in each stint/clump",
                toggled: showPpp,
                onClick: () => setShowPpp(!showPpp),
              },
              {
                label: "| ",
                tooltip: "",
                toggled: true,
                onClick: () => {},
                isLabelOnly: true,
              },
              {
                label: "Labels",
                tooltip: "Show/hide player labels (see dropdown to right)",
                toggled: showLabels,
                disabled: !(showUsage || showPpp),
                onClick: () => setShowLabels(!showLabels),
              },
            ]}
          />
        </Col>
        <Col></Col>
        <Col xs={12} md={4} lg={3}>
          <ThemedSelect
            value={stringToOption(labelToShow)}
            isDisabled={!(showUsage || showPpp) || !showLabels}
            options={_.keys(labelOptions).map((l) => stringToOption(l))}
            isSearchable={true}
            onChange={(option: any) => {
              if ((option as any)?.value) {
                setLabelToShow((option as any).value);
              }
            }}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="w-100 text-center">
          <GenericTable
            tableFields={tableDefsA}
            tableData={tableRowsA}
            cellTooltipMode="missing"
            rowStyleOverride={{
              paddingLeft: "0px",
              paddingRight: "1px",
            }}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="w-100 text-center">
          <GenericTable
            tableFields={tableDefsB}
            tableData={tableRowsB}
            cellTooltipMode="missing"
            rowStyleOverride={{
              paddingLeft: "0px",
              paddingRight: "1px",
            }}
          />
        </Col>
      </Row>
    </Container>
  );
};
export default LineupStintsChart;
