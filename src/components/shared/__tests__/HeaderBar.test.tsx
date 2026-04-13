/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import HeaderBar from "../HeaderBar";
import { ParamPrefixes } from "../../../utils/FilterModels";

describe("HeaderBar", () => {
  test("HeaderBar - should create snapshot (game)", () => {
    const { asFragment } = render(
      <HeaderBar
        thisPage={ParamPrefixes.game}
        common={{
          team: "Test1",
          gender: "Men",
          year: "2019/20",
          baseQuery: "query1",
        }}
        override={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("HeaderBar - should create snapshot (lineup)", () => {
    const { asFragment } = render(
      <HeaderBar
        thisPage={ParamPrefixes.lineup}
        common={{
          team: "Test2",
          gender: "Men",
          year: "2019/20",
          baseQuery: "query2",
        }}
        override={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("HeaderBar - should create snapshot (report)", () => {
    const { asFragment } = render(
      <HeaderBar
        thisPage={ParamPrefixes.report}
        common={{
          team: "Test3",
          gender: "Men",
          year: "2019/20",
          baseQuery: "query3",
        }}
        override={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
