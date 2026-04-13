/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import OnBallDefenseModal from "../OnBallDefenseModal";
import { OnBallDefenseModel } from "../../../utils/stats/RatingUtils";

describe("OnBallDefenseModal", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("OnBallDefenseModal - should create snapshot (not initialized at all)", () => {
    const { asFragment } = render(
      <div>
        <OnBallDefenseModal
          players={[]}
          onBallDefense={[]}
          show={true}
          onHide={() => false}
          onSave={(onBallDefense: OnBallDefenseModel[]) => false}
          showHelp={false}
        />
      </div>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
