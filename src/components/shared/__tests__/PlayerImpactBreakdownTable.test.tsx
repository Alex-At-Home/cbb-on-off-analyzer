/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import PlayerImpactBreakdownTable, {
  PlayerImpactPoint,
} from "../PlayerImpactBreakdownTable";

function makePoint(
  seriesId: string,
  name: string,
  possPct: number,
  playerCode?: string,
): PlayerImpactPoint {
  return {
    seriesId,
    name,
    stats: {
      off_team_poss_pct: { value: possPct },
      code: playerCode ?? name,
      key: name,
    } as any,
    onOffStats: {
      playerCode: playerCode ?? name,
      rapm: undefined,
    } as any,
  };
}

describe("PlayerImpactBreakdownTable", () => {
  const defaultProps = {
    team: "Maryland",
    playerPoints: [
      makePoint("Maryland", "AbSmith", 0.25, "AbSmith"),
      makePoint("Maryland", "CdJones", 0.15, "CdJones"),
    ],
    avgEfficiency: 100,
    seasonStats: false,
    adjBreakdownForSoS: false,
    scaleType: "P%" as const,
    showWalkOns: true, // true so minimal mock rows (no poss% in row) are not filtered out
  };

  test("renders table with player names (no diag stats)", () => {
    render(<PlayerImpactBreakdownTable {...defaultProps} />);
    expect(screen.getByText(/AbSmith|Smith/i)).toBeTruthy();
    expect(screen.getByText(/CdJones|Jones/i)).toBeTruthy();
  });

  test("renders team subheader when showTeamColumn is false", () => {
    render(<PlayerImpactBreakdownTable {...defaultProps} />);
    expect(screen.getByText("Maryland:")).toBeTruthy();
  });

  test("renders Total row when showTeamColumn is false and scaleType is not P%", () => {
    render(
      <PlayerImpactBreakdownTable
        {...defaultProps}
        scaleType="T%"
      />,
    );
    expect(screen.getByText("Total")).toBeTruthy();
  });

  test("combined mode (showTeamColumn) renders without total row", () => {
    const pointsWithTeam: PlayerImpactPoint[] = [
      makePoint("Maryland", "AbSmith", 0.25),
      makePoint("Duke", "EfWilliams", 0.20),
    ];
    render(
      <PlayerImpactBreakdownTable
        team="Maryland"
        playerPoints={pointsWithTeam}
        avgEfficiency={100}
        adjBreakdownForSoS={false}
        scaleType="P%"
        showWalkOns={true}
        showTeamColumn={true}
        teamDisplay={(id) => <span>{id}</span>}
      />,
    );
    expect(screen.getByText("Maryland")).toBeTruthy();
    expect(screen.getByText("Duke")).toBeTruthy();
    expect(screen.queryByText("Total")).toBeNull();
  });
});
