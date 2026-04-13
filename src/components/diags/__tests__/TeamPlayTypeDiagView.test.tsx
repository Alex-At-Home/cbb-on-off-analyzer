/**
 * @jest-environment jsdom
 */

import React from "react";
import _ from "lodash";
import { render } from "@testing-library/react";
import TeamPlayTypeDiagView from "../TeamPlayTypeDiagView";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { sampleTeamStatsResponse } from "../../../sample-data/sampleTeamStatsResponse";
import { RosterTableUtils } from "../../../utils/tables/RosterTableUtils";
import { IndivStatSet, TeamStatSet } from "../../../utils/StatModels";

describe("TeamPlayTypeDiagView", () => {
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
  const teamData = _.assign(
    sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets as {
      on: any;
      off: any;
      baseline: any;
    },
    { global: {}, onOffMode: true },
  ) as unknown as TeamStatSet;
  const teamSeasonLookup = "Men_Maryland_2018/9";
  const rosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
    testData.on,
    undefined,
    true,
    teamSeasonLookup,
  );
  const players = testData.on.map((p) => {
    const code = p.player_array?.hits?.hits?.[0]?._source?.player?.code;
    return {
      ...p,
      posClass: code ? rosterStatsByCode[code]?.posClass || "WG" : "WG",
    };
  }) as unknown as IndivStatSet[];
  test("TeamPlayTypeDiagView - should create snapshot (!details, help)", () => {
    const { asFragment } = render(
      <TeamPlayTypeDiagView
        title={"Title"}
        players={players}
        rosterStatsByCode={rosterStatsByCode}
        teamStats={teamData}
        avgEfficiency={100.0}
        showGrades="false"
        showHelp={false}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("TeamPlayTypeDiagView - should create snapshot (!help)", () => {
    const { asFragment } = render(
      <TeamPlayTypeDiagView
        title={"Title"}
        players={players}
        rosterStatsByCode={rosterStatsByCode}
        teamStats={teamData}
        avgEfficiency={100.0}
        showGrades="false"
        showHelp={false}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
