/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TableSortPopupMenu, {
  TableSortPopupMenuState,
  TableSortOption,
} from "../TableSortPopupMenu";

describe("TableSortPopupMenu", () => {
  const mockOnClick = jest.fn();
  const mockOnClose = jest.fn();

  const sampleOptions: TableSortOption[] = [
    { label: "Points (Desc)", value: "desc:off_pts:baseline" },
    { label: "Points (Asc)", value: "asc:off_pts:baseline" },
    { label: "Rebounds (Desc)", value: "desc:off_reb:baseline" },
  ];

  beforeEach(() => {
    mockOnClick.mockClear();
    mockOnClose.mockClear();
  });

  test("renders nothing when state is undefined", () => {
    const { container } = render(
      <TableSortPopupMenu
        state={undefined}
        onClick={mockOnClick}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test("exports TableSortPopupMenuState type correctly", () => {
    // Type check - this test just verifies the types are exported and usable
    const state: TableSortPopupMenuState = {
      columnKey: "pts",
      options: sampleOptions,
      anchorEl: null,
      currentSortValue: "desc:off_pts:baseline",
    };

    expect(state.columnKey).toBe("pts");
    expect(state.options).toHaveLength(3);
    expect(state.currentSortValue).toBe("desc:off_pts:baseline");
  });

  test("exports TableSortOption type correctly", () => {
    // Type check
    const option: TableSortOption = {
      label: "Test Label",
      value: "test_value",
    };

    expect(option.label).toBe("Test Label");
    expect(option.value).toBe("test_value");
  });
});
