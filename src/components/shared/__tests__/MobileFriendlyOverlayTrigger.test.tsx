/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Tooltip from "react-bootstrap/Tooltip";
import MobileFriendlyOverlayTrigger from "../MobileFriendlyOverlayTrigger";

/**
 * Note: Testing tooltip visibility is challenging due to React Bootstrap's
 * portal-based rendering in jsdom. These tests focus on the callback behavior
 * which is the core functionality of this component.
 */
describe("MobileFriendlyOverlayTrigger", () => {
  const mockOnClickWhenVisible = jest.fn();

  beforeEach(() => {
    mockOnClickWhenVisible.mockClear();
  });

  const renderComponent = () => {
    const overlay = <Tooltip id="test-tooltip">Test tooltip content</Tooltip>;
    return render(
      <MobileFriendlyOverlayTrigger
        overlay={overlay}
        onClickWhenVisible={mockOnClickWhenVisible}
      >
        <button>Click me</button>
      </MobileFriendlyOverlayTrigger>
    );
  };

  test("renders the child element", () => {
    renderComponent();
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  test("first click does not call onClickWhenVisible", () => {
    renderComponent();
    const button = screen.getByText("Click me");

    fireEvent.click(button);

    expect(mockOnClickWhenVisible).not.toHaveBeenCalled();
  });

  test("second click calls onClickWhenVisible", () => {
    renderComponent();
    const button = screen.getByText("Click me");

    // First click shows tooltip (internal state change)
    fireEvent.click(button);
    expect(mockOnClickWhenVisible).not.toHaveBeenCalled();

    // Second click triggers action
    fireEvent.click(button);
    expect(mockOnClickWhenVisible).toHaveBeenCalledTimes(1);
  });

  test("callback receives the click event", () => {
    renderComponent();
    const button = screen.getByText("Click me");

    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnClickWhenVisible).toHaveBeenCalledWith(
      expect.objectContaining({ type: "click" })
    );
  });

  test("keyboard Enter triggers callback on second press", () => {
    renderComponent();
    const button = screen.getByText("Click me");

    fireEvent.keyDown(button, { key: "Enter" });
    expect(mockOnClickWhenVisible).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: "Enter" });
    expect(mockOnClickWhenVisible).toHaveBeenCalledTimes(1);
  });

  test("keyboard Space triggers callback on second press", () => {
    renderComponent();
    const button = screen.getByText("Click me");

    fireEvent.keyDown(button, { key: " " });
    expect(mockOnClickWhenVisible).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: " " });
    expect(mockOnClickWhenVisible).toHaveBeenCalledTimes(1);
  });
});
