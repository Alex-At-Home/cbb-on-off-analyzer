/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import PlayerPlayTypeDiagView from "../PlayerPlayTypeDiagView";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { sampleTeamStatsResponse } from "../../../sample-data/sampleTeamStatsResponse";
import { RosterTableUtils } from "../../../utils/tables/RosterTableUtils";
import { IndivStatSet, TeamStatSet } from "../../../utils/StatModels";

describe("PlayerPlayTypeDiagView", () => {
  const testData = {
    on:
      samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
        ?.on?.player?.buckets || [],
    off:
      samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
        ?.off?.player?.buckets || [],
    baseline:
      samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets
        ?.baseline?.player?.buckets || [],
    error_code: undefined,
  };
  const testTeamData = sampleTeamStatsResponse.responses[0].aggregations
    .tri_filter.buckets.baseline as unknown as TeamStatSet;
  const teamSeasonLookup = "Men_Maryland_2018/9";
  const rosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
    testData.on,
    undefined,
    true,
    teamSeasonLookup,
  );
  test("PlayerPlayTypeDiagView - should create snapshot (!details, help)", () => {
    const { asFragment } = render(
      <PlayerPlayTypeDiagView
        player={
          { ...testData.on[0], posClass: "WG" } as unknown as IndivStatSet
        }
        teamStats={testTeamData}
        rosterStatsByCode={rosterStatsByCode}
        showHelp={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("PlayerPlayTypeDiagView - should create snapshot (details, !help)", () => {
    const { asFragment } = render(
      <PlayerPlayTypeDiagView
        player={
          { ...testData.on[0], posClass: "WG" } as unknown as IndivStatSet
        }
        teamStats={testTeamData}
        rosterStatsByCode={rosterStatsByCode}
        showHelp={false}
        showDetailsOverride={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
