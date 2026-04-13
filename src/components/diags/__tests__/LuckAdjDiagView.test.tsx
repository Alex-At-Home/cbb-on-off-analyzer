/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import LuckAdjDiagView from "../LuckAdjDiagView";
import {
  sampleOffOnOffLuckDiagnostics,
  sampleDefOnOffLuckDiagnostics,
} from "../../../sample-data/sampleOnOffLuckDiagnostics";

describe("LuckAdjDiagView", () => {
  test("LuckAdjDiagView - should create snapshot (season, !override)", () => {
    const { asFragment } = render(
      <LuckAdjDiagView
        name="Test1"
        offLuck={sampleOffOnOffLuckDiagnostics}
        defLuck={sampleDefOnOffLuckDiagnostics}
        baseline="season"
        showHelp={false}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("LuckAdjDiagView - should create snapshot (baseline, override)", () => {
    const { asFragment } = render(
      <LuckAdjDiagView
        name="Test2"
        offLuck={sampleOffOnOffLuckDiagnostics}
        defLuck={sampleDefOnOffLuckDiagnostics}
        baseline="baseline"
        showHelp={true}
        showDetailsOverride={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("LuckAdjDiagView - should create snapshot (individual mode, baseline, override)", () => {
    const { asFragment } = render(
      <LuckAdjDiagView
        name="Test2"
        offLuck={sampleOffOnOffLuckDiagnostics}
        defLuck={sampleDefOnOffLuckDiagnostics}
        baseline="baseline"
        individualMode={true}
        showHelp={true}
        showDetailsOverride={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
