/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import TeamRosterStatsConfigModal from "../TeamRosterStatsConfigModal";

describe("TeamRosterStatsConfigModal", () => {
  test("TeamRosterStatsConfigModal - should create snapshot (config set 1)", () => {
    const { asFragment } = render(
      <div>
        <TeamRosterStatsConfigModal
          show={true}
          onHide={() => {}}
          onSave={(l: any) => {}}
          config={{
            rapmPriorMode: -1,
            regressDiffs: -2000,
            showRapmDiag: false,
            rapmRegressMode: -1,
          }}
          showHelp={true}
        />
      </div>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("TeamRosterStatsConfigModal - should create snapshot (config set 2)", () => {
    const { asFragment } = render(
      <div>
        <TeamRosterStatsConfigModal
          show={true}
          onHide={() => {}}
          onSave={(l: any) => {}}
          config={{
            rapmPriorMode: 0,
            regressDiffs: 0,
            showRapmDiag: true,
            rapmRegressMode: -1,
          }}
          showHelp={false}
        />
      </div>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
  test("TeamRosterStatsConfigModal - should create snapshot (config set 3)", () => {
    const { asFragment } = render(
      <div>
        <TeamRosterStatsConfigModal
          show={true}
          onHide={() => {}}
          onSave={(l: any) => {}}
          config={{
            rapmPriorMode: 0.5,
            regressDiffs: 2000,
            showRapmDiag: true,
            rapmRegressMode: -1,
          }}
          showHelp={true}
        />
      </div>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
