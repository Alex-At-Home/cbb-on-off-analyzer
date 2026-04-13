/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import HistorySelector from "../HistorySelector";
import { HistoryManager } from "../../../utils/HistoryManager";

describe("HistorySelector", () => {
  beforeEach(() => {
    HistoryManager.clearHistory();
    HistoryManager.addParamsToHistory("year=2019/20&gender=Men", "game-");
    HistoryManager.addParamsToHistory("year=2018/9&gender=Women", "lineup-");
    HistoryManager.addParamsToHistory("year=2018/9&gender=Women", "report-");
  });

  afterEach(() => {
    HistoryManager.clearHistory();
  });

  test("HistorySelector - should create snapshot", () => {
    const { asFragment } = render(<HistorySelector tablePrefix="game-" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
