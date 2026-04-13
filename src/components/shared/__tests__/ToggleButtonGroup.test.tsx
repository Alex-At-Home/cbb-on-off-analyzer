/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import ToggleButtonGroup from "../ToggleButtonGroup";

describe("ToggleButtonGroup", () => {
  test("ToggleButtonGroup", () => {
    const { asFragment } = render(
      <ToggleButtonGroup
        override={true}
        items={[
          {
            label: "Test A",
            tooltip: "Test Tooltip A",
            toggled: true,
            onClick: () => {},
          },
          {
            label: "Test B",
            tooltip: "Test Tooltip A",
            toggled: false,
            onClick: () => {},
          },
        ]}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("ToggleButtonGroup - empty SSR render", () => {
    const { asFragment } = render(
      <ToggleButtonGroup
        override={false}
        items={[
          {
            label: "Test A",
            tooltip: "Test Tooltip A",
            toggled: true,
            onClick: () => {},
          },
          {
            label: "Test B",
            tooltip: "Test Tooltip A",
            toggled: false,
            onClick: () => {},
          },
        ]}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
