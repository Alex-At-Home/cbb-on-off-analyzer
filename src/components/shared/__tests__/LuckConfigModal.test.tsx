/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import LuckConfigModal from "../LuckConfigModal";
import { LuckParams } from "../../../utils/FilterModels";

describe("LuckConfigModal", () => {
  test("LuckConfigModal - should create snapshot", () => {
    const { asFragment } = render(
      <div>
        <LuckConfigModal
          show={true}
          onHide={() => {}}
          onSave={(l: LuckParams) => {}}
          luck={{ base: "baseline" }}
          showHelp={true}
        />
      </div>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
