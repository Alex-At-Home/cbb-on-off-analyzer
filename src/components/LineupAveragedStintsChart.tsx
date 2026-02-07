// React imports:
import _ from "lodash";
import React, { useState, useEffect } from "react";
import chroma from "chroma-js";
import { CbbColors } from "../utils/CbbColors";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

import { MatchupFilterParams, ParamDefaults } from "../utils/FilterModels";
import {
  TimeBinnedAggregation,
  TimeBinStats,
  TimeBinPlayerStats,
} from "../utils/StatModels";
import GenericTable, {
  GenericTableColProps,
  GenericTableOps,
  GenericTableRow,
} from "./GenericTable";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import ThemedSelect from "./shared/ThemedSelect";
import { useTheme } from "next-themes";

type Props = {
  startingState: MatchupFilterParams;
  teamA: string;
  teamB?: string;
  dataEvent: {
    aggregatedStintsA: TimeBinnedAggregation;
    aggregatedStintsB?: TimeBinnedAggregation;
  };
  onChangeState: (newParams: MatchupFilterParams) => void;
};

const LineupAveragedStintsChart: React.FunctionComponent<Props> = ({
  startingState,
  teamA,
  teamB,
  dataEvent,
  onChangeState,
}) => {
  const { aggregatedStintsA, aggregatedStintsB } = dataEvent;

  const { resolvedTheme } = useTheme();

  // UI State
  const [showPoss, setShowPoss] = useState<boolean>(true); // Default to true
  const [showUsage, setShowUsage] = useState<boolean>(
    _.isNil(startingState.showUsage)
      ? true // Default to showing usage
      : startingState.showUsage,
  );
  const [showPpp, setShowPpp] = useState<boolean>(
    _.isNil(startingState.showPpp)
      ? false // Default PPP to off
      : startingState.showPpp,
  );

  // If all 3 toggles are off, force Poss back on
  useEffect(() => {
    if (!showPoss && !showUsage && !showPpp) {
      setShowPoss(true);
    }
  }, [showPoss, showUsage, showPpp]);
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

  // Highlight player when hovering
  const [activePlayer, setActivePlayer] = useState<string | undefined>(
    undefined,
  );

  // Sync state with parent
  useEffect(() => {
    onChangeState({
      ...startingState,
      showUsage,
      showPpp,
      labelToShow,
    });
  }, [showUsage, showPpp, labelToShow]);

  // Constants for usage calculation (from LineupStintsChart)
  const orbFactor = 0.9; // Approximation for ORB factor

  // Color scale for possession% (0% = light, 100% = dark teal)
  //const possessionScale = chroma.scale(["#E6FAF7", "#7DE0D8", "#0F8F95"]);
  const possessionScale =
    resolvedTheme == "light"
      ? chroma.scale(["#EDF4FF", "#5FA6FF", "#004E98"]).mode("lab").gamma(1.1)
      : chroma
          .scale([
            "#0E1A24", // low possession
            "#1F4E79",
            "#6FB6FF", // high possession
          ])
          .mode("lab");
  // Calculate player stats for a bin (PPP, usage, possession%)
  const calcPlayerStintInfo = (
    player: TimeBinPlayerStats,
    binTeamPoss: number,
  ) => {
    // Player's "classic shots" = FGA + 0.475*FTA + TO
    const playerClassicShots =
      (player.fg_attempts?.value || 0) +
      0.475 * (player.ft_attempts?.value || 0) +
      (player.to?.value || 0);

    // Team shots for when player was on court
    // We use the player's team_num_possessions as proxy for team shots they were part of
    const teamPossForPlayer = player.team_num_possessions?.value || 0;

    // Possession% = player's time on court relative to bin
    const possessionPct = Math.min(teamPossForPlayer / (binTeamPoss || 1), 1);

    // Points scored
    const ptsScored =
      2 * (player.fg_2p_made?.value || 0) +
      3 * (player.fg_3p_made?.value || 0) +
      (player.ft_made?.value || 0);

    // PPP = points / player's classic shots (their own possessions used)
    const ppp = playerClassicShots > 0 ? ptsScored / playerClassicShots : 0;

    // Usage calculation (from LineupStintsChart)
    const playerMakes =
      (player.fg_2p_made?.value || 0) + (player.fg_3p_made?.value || 0);
    const playerMisses =
      (player.fg_2p_attempts?.value || 0) +
      (player.fg_3p_attempts?.value || 0) -
      playerMakes;
    const playerAssists = player.assist?.value || 0;
    const playerAssisted2s = player.fg_2p_ast?.value || 0;
    const playerAssisted3s = player.fg_3p_ast?.value || 0;
    const playerOrbs = player.orb?.value || 0;

    // Estimate game ORB% (use 0.28 as reasonable default for D1)
    const gameOrbPct = 0.28;

    // Player possessions used (from LineupStintsChart logic)
    const playerPossUsed =
      playerClassicShots -
      playerMisses * gameOrbPct - // not penalized for misses if team ORBs well
      playerMakes * (1.0 - orbFactor) + // small penalty on all shots from ORBs
      (0.25 * (playerAssists - (playerAssisted2s + playerAssisted3s)) +
        0.25 * playerOrbs) *
        orbFactor;

    // Points contributed (from LineupStintsChart)
    const ptsContributed =
      orbFactor *
      (ptsScored +
        0.5 * (playerAssists - (playerAssisted2s + playerAssisted3s)) +
        0.5 * playerOrbs);

    // Usage = player poss used / team shots
    const usage =
      teamPossForPlayer > 0 ? playerPossUsed / teamPossForPlayer : 0;

    // ORtg approximation
    const ortg = playerPossUsed > 0 ? ptsContributed / playerPossUsed : 0;

    return {
      possessionPct,
      ppp,
      usage,
      ortg,
      ptsScored,
      ptsContributed,
      playerPossUsed,
    };
  };

  // Label options for player stats display
  const labelOptions = {
    "No Labels": (_: TimeBinPlayerStats) => 0,
    Points: (p: TimeBinPlayerStats) =>
      3 * (p.fg_3p_made?.value || 0) +
      2 * (p.fg_2p_made?.value || 0) +
      (p.ft_made?.value || 0),
    "Plus Minus": (p: TimeBinPlayerStats) => p.team_plus_minus?.value || 0,
    Fouls: (p: TimeBinPlayerStats) => p.foul?.value || 0,
    Assists: (p: TimeBinPlayerStats) => p.assist?.value || 0,
    Turnovers: (p: TimeBinPlayerStats) => p.to?.value || 0,
    Steals: (p: TimeBinPlayerStats) => p.stl?.value || 0,
    Blocks: (p: TimeBinPlayerStats) => p.blk?.value || 0,
    ORBs: (p: TimeBinPlayerStats) => p.orb?.value || 0,
    DRBs: (p: TimeBinPlayerStats) => p.drb?.value || 0,
    FGM: (p: TimeBinPlayerStats) => p.fg_made?.value || 0,
    FGA: (p: TimeBinPlayerStats) => p.fg_attempts?.value || 0,
    "3PM": (p: TimeBinPlayerStats) => p.fg_3p_made?.value || 0,
    "3PA": (p: TimeBinPlayerStats) => p.fg_3p_attempts?.value || 0,
    "2PM": (p: TimeBinPlayerStats) => p.fg_2p_made?.value || 0,
    "2PA": (p: TimeBinPlayerStats) => p.fg_2p_attempts?.value || 0,
    FTM: (p: TimeBinPlayerStats) => p.ft_made?.value || 0,
    FTA: (p: TimeBinPlayerStats) => p.ft_attempts?.value || 0,
  } as Record<string, (p: TimeBinPlayerStats) => number>;

  // Extract bins from aggregation (bin_0 through bin_39)
  const getBins = (agg: TimeBinnedAggregation): [number, TimeBinStats][] => {
    return _.chain(agg)
      .toPairs()
      .filter(([key]) => key.startsWith("bin_"))
      .map(([key, value]) => {
        const binNum = parseInt(key.replace("bin_", ""));
        return [binNum, value] as [number, TimeBinStats];
      })
      .sortBy(([binNum]) => binNum)
      .value();
  };

  // Get all unique players across all bins, sorted by total possessions
  const getPlayersSorted = (
    bins: [number, TimeBinStats][],
  ): { code: string; totalPoss: number }[] => {
    const playerPoss: Record<string, number> = {};

    bins.forEach(([_, bin]) => {
      bin.player_stats?.players?.buckets?.forEach((player) => {
        const code = player.key;
        playerPoss[code] =
          (playerPoss[code] || 0) + (player.team_num_possessions?.value || 0);
      });
    });

    return _.chain(playerPoss)
      .toPairs()
      .map(([code, totalPoss]) => ({ code, totalPoss }))
      .sortBy((p) => -p.totalPoss)
      .value();
  };

  // Build table for a team
  const buildTable = (
    team: string,
    aggregation: TimeBinnedAggregation,
  ): [Record<string, GenericTableColProps>, GenericTableRow[]] => {
    const bins = getBins(aggregation);
    const players = getPlayersSorted(bins);

    // Build column definitions - one per bin (equal width)
    const binWidth = 1; // Each bin is 1 minute
    const tableCols: Record<string, GenericTableColProps> = {};

    bins.forEach(([binNum]) => {
      tableCols[`bin_${binNum}`] = new GenericTableColProps(
        "",
        `Minute ${binNum}-${binNum + 1}`,
        binWidth,
        false,
        GenericTableOps.htmlFormatter,
      );
    });

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
      labelToShow !== "No Labels" &&
      labelOptions[labelToShow]
        ? {
            total: GenericTableOps.addDataCol(
              "",
              `Total of [${labelToShow}] for each player`,
              CbbColors.applyThemedBackground,
              GenericTableOps.htmlFormatter,
            ),
          }
        : {}),
      ...tableCols,
    };

    // Build player lookup per bin for quick access
    const playersByBin: Record<number, Record<string, TimeBinPlayerStats>> = {};
    bins.forEach(([binNum, bin]) => {
      playersByBin[binNum] = {};
      bin.player_stats?.players?.buckets?.forEach((player) => {
        playersByBin[binNum][player.key] = player;
      });
    });

    // Build header row showing team offensive PPP per bin
    const headerRow = GenericTableOps.buildDataRow(
      {
        title: <i>Team Off PPP</i>,
        ..._.fromPairs(
          bins.map(([binNum, bin]) => {
            const poss = bin.team_stats?.off_num_possessions?.value || 1;
            const pts = bin.team_stats?.off_pts?.value || 0;
            const ppp = pts / poss;

            const tooltip = (
              <Tooltip id={`bin_${binNum}_team`}>
                <b>
                  Minute {binNum}-{binNum + 1}
                </b>
                <br />
                Possessions: {poss.toFixed(1)}
                <br />
                Points: {pts.toFixed(1)}
                <br />
                PPP: {ppp.toFixed(2)}
              </Tooltip>
            );

            return [
              `bin_${binNum}`,
              <OverlayTrigger placement="auto" overlay={tooltip}>
                <div>
                  <hr
                    className="mt-0 pt-0 pb-0"
                    style={{
                      height: "5px",
                      marginBottom: "2px",
                      background: CbbColors.off_ppp_redGreyGreen(ppp),
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
    );

    // Build player rows
    const playerRows = players.map((playerInfo) => {
      const playerCode = playerInfo.code;
      let labelTotal = 0;

      const playerCols = _.fromPairs(
        bins.map(([binNum, bin]) => {
          const player = playersByBin[binNum][playerCode];

          if (!player) {
            // Player not in this bin - treat as 0% possession
            return [
              `bin_${binNum}`,
              <div>
                {showPoss ? (
                  <hr
                    className="mt-0 pt-0 pb-0"
                    style={{
                      height: "4px",
                      marginBottom: "2px",
                      background: possessionScale(0).css(),
                    }}
                  />
                ) : undefined}
              </div>,
            ];
          }

          // Calculate stats using the helper function
          const binPoss = bin.team_stats?.off_num_possessions?.value || 1;
          const playerTeamPoss = player.team_num_possessions?.value || 0;
          const stintInfo = calcPlayerStintInfo(player, binPoss);

          const plusMinus = player.team_plus_minus?.value || 0;

          // Accumulate label total
          if (labelToShow && labelOptions[labelToShow]) {
            labelTotal += labelOptions[labelToShow](player) || 0;
          }

          const tooltip = (
            <Tooltip id={`bin_${binNum}_${playerCode}`}>
              <b>{playerCode}</b>
              <br />
              <br />
              <b>
                Minute {binNum}-{binNum + 1}
              </b>
              <br />
              Poss on court: {playerTeamPoss.toFixed(1)}
              <br />
              Poss%: {(stintInfo.possessionPct * 100).toFixed(0)}%
              <br />
              Usage: {(stintInfo.usage * 100).toFixed(0)}%
              <br />
              Points: {stintInfo.ptsScored.toFixed(1)}
              <br />
              PPP: {stintInfo.ppp.toFixed(2)}
              <br />
              +/-: {plusMinus.toFixed(1)}
              <br />
              <br />
              FG: {player.fg_made?.value?.toFixed(1) || 0}/
              {player.fg_attempts?.value?.toFixed(1) || 0}
              <br />
              3P: {player.fg_3p_made?.value?.toFixed(1) || 0}/
              {player.fg_3p_attempts?.value?.toFixed(1) || 0}
              <br />
              FT: {player.ft_made?.value?.toFixed(1) || 0}/
              {player.ft_attempts?.value?.toFixed(1) || 0}
              <br />
              AST: {player.assist?.value?.toFixed(1) || 0} TO:{" "}
              {player.to?.value?.toFixed(1) || 0}
            </Tooltip>
          );

          const labelValue =
            labelToShow && labelOptions[labelToShow]
              ? labelOptions[labelToShow](player)
              : 0;

          return [
            `bin_${binNum}`,
            <OverlayTrigger
              placement="auto"
              overlay={tooltip}
              onEntered={() => setActivePlayer(playerCode)}
              onExited={() => setActivePlayer(undefined)}
            >
              <div
                style={{
                  position: "relative",
                  textAlign: "center",
                }}
              >
                {/* Poss% bar */}
                {showPoss ? (
                  <hr
                    className="mt-0 pt-0 pb-0"
                    style={{
                      height: "4px",
                      marginBottom: "2px",
                      background: possessionScale(stintInfo.possessionPct).css(),
                    }}
                  />
                ) : undefined}
                {showUsage ? (
                  <hr
                    className="mt-0 pt-0 pb-0"
                    style={{
                      height: "2px",
                      marginBottom: "2px",
                      background: CbbColors.usg_offDef_alt(stintInfo.usage),
                    }}
                  />
                ) : undefined}
                {showPpp ? (
                  <hr
                    className="mt-0 pt-0 pb-0"
                    style={{
                      height: "2px",
                      marginBottom: "0px",
                      opacity: `${Math.min(stintInfo.possessionPct * 400, 100).toFixed(0)}%`,
                      background: CbbColors.off_ppp_redGreyGreen(stintInfo.ppp),
                    }}
                  />
                ) : undefined}
                {showLabels && labelValue ? (
                  <small
                    style={{
                      position: "absolute",
                      bottom: "calc(25% - 3px)",
                      right: "calc(50% - 3px)",
                    }}
                  >
                    <small>
                      <b>{labelValue.toFixed(1)}</b>
                    </small>
                  </small>
                ) : undefined}
              </div>
            </OverlayTrigger>,
          ];
        }),
      );

      const prettifiedPlayerCode = playerCode.replace(/([A-Z])/g, " $1").trim();

      return GenericTableOps.buildDataRow(
        {
          title: (
            <b
              style={{
                opacity: activePlayer
                  ? activePlayer === playerCode
                    ? "100%"
                    : "50%"
                  : "100%",
              }}
            >
              {prettifiedPlayerCode}
            </b>
          ),
          total: <small>{labelTotal.toFixed(1)}</small>,
          ...playerCols,
        },
        GenericTableOps.defaultFormatter,
        GenericTableOps.defaultCellMeta,
      );
    });

    // Build defense row (opponent PPP) - always shown
    const defenseRow = GenericTableOps.buildDataRow(
      {
        title: <i>Defense (Opp PPP):</i>,
        ..._.fromPairs(
          bins.map(([binNum, bin]) => {
            const poss = bin.team_stats?.def_num_possessions?.value || 1;
            const pts = bin.team_stats?.def_pts?.value || 0;
            const ppp = pts / poss;

            const tooltip = (
              <Tooltip id={`bin_${binNum}_def`}>
                <b>
                  Opponent - Minute {binNum}-{binNum + 1}
                </b>
                <br />
                Possessions: {poss.toFixed(1)}
                <br />
                Points Allowed: {pts.toFixed(1)}
                <br />
                PPP Against: {ppp.toFixed(2)}
              </Tooltip>
            );

            return [
              `bin_${binNum}`,
              <OverlayTrigger placement="auto" overlay={tooltip}>
                <div>
                  <hr
                    className="mt-0 pt-0 pb-0"
                    style={{
                      height: "3px",
                      opacity: "75%",
                      marginBottom: "0px",
                      background: CbbColors.def_ppp_redGreyGreen(ppp),
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
    );

    const tableRows = (
      [
        GenericTableOps.buildSubHeaderRow(
          [[<b>{team}:</b>, _.size(tableDefs)]],
          "small text-center",
        ),
        headerRow,
      ] as GenericTableRow[]
    )
      .concat(playerRows)
      .concat([defenseRow]);

    return [tableDefs, tableRows];
  };

  const [tableDefsA, tableRowsA] = buildTable(teamA, aggregatedStintsA);
  const [tableDefsB, tableRowsB] = aggregatedStintsB
    ? buildTable(teamB || "Team B", aggregatedStintsB)
    : [{}, []];

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
                label: "Poss",
                tooltip:
                  "Show/hide player possession% (time on court) in each time bin",
                toggled: showPoss,
                onClick: () => setShowPoss(!showPoss),
              },
              {
                label: "Usage",
                tooltip: "Show/hide player usage rate in each time bin",
                toggled: showUsage,
                onClick: () => setShowUsage(!showUsage),
              },
              {
                label: "PPP",
                tooltip:
                  "Show/hide player points per possession in each time bin",
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
                tooltip: "Show/hide stat labels (see dropdown to right)",
                toggled: showLabels,
                onClick: () => setShowLabels(!showLabels),
              },
            ]}
          />
        </Col>
        <Col></Col>
        <Col xs={12} md={4} lg={3}>
          <ThemedSelect
            value={stringToOption(labelToShow)}
            isDisabled={!showLabels}
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
      {aggregatedStintsB && !_.isEmpty(tableRowsB) ? (
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
      ) : undefined}
    </Container>
  );
};

export default LineupAveragedStintsChart;
