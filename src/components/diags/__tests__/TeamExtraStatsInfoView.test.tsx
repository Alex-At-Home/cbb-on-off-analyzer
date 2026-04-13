/**
 * @jest-environment jsdom
 */

import React from "react";
import _ from "lodash";
import { render } from "@testing-library/react";
import TeamExtraStatsInfoView from "../TeamExtraStatsInfoView";
import { sampleTeamStatsResponse } from "../../../sample-data/sampleTeamStatsResponse";

describe("TeamExtraStatsInfoView", () => {
  test("TeamExtraStatsInfoView - should create snapshot", () => {
    const teamData = _.assign(
      sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets as {
        on: any;
        off: any;
        baseline: any;
      },
      { global: {}, onOffMode: true },
    );
    const { asFragment } = render(
      <TeamExtraStatsInfoView
        name="test"
        teamStatSet={teamData.baseline}
        showGrades=""
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
