/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickSwitchBar, {
  QuickSwitchBarProps,
  quickSwitchDelim,
} from "../QuickSwitchBar";

describe("QuickSwitchBar", () => {
  const mockUpdateQuickSwitch = jest.fn();
  const mockSetQuickSwitchTimer = jest.fn();

  beforeEach(() => {
    mockUpdateQuickSwitch.mockClear();
    mockSetQuickSwitchTimer.mockClear();
  });

  const defaultProps: QuickSwitchBarProps = {
    title: "Default Title",
    quickSwitch: undefined,
    quickSwitchExtra: undefined,
    quickSwitchOptions: [{ title: "Option A" }, { title: "Option B" }],
    updateQuickSwitch: mockUpdateQuickSwitch,
    quickSwitchTimer: undefined,
    setQuickSwitchTimer: mockSetQuickSwitchTimer,
    modes: ["link", "timer"],
    theme: undefined,
  };

  const renderComponent = (props: Partial<QuickSwitchBarProps> = {}) => {
    return render(<QuickSwitchBar {...defaultProps} {...props} />);
  };

  describe("rendering", () => {
    test("renders the title when no quickSwitch is selected", () => {
      renderComponent();

      expect(screen.getByText(/Analysis:/)).toBeTruthy();
      expect(screen.getByText(/\[Default Title\]/)).toBeTruthy();
    });

    test("renders the selected quickSwitch value in title", () => {
      renderComponent({ quickSwitch: "Option A" });

      expect(screen.getByText(/\[Option A\]/)).toBeTruthy();
    });

    test("renders quick switch options", () => {
      renderComponent();

      expect(screen.getByText("Option A")).toBeTruthy();
      expect(screen.getByText("Option B")).toBeTruthy();
    });

    test("renders quick-toggles label when options exist", () => {
      renderComponent();

      expect(screen.getByText(/quick-toggles:/)).toBeTruthy();
    });

    test("does not render quick-toggles label when no options", () => {
      renderComponent({ quickSwitchOptions: [] });

      expect(screen.queryByText(/quick-toggles:/)).toBeNull();
    });

    test("renders custom title prefix", () => {
      renderComponent({ titlePrefix: "Shot Chart Analysis:" });

      expect(screen.getByText(/Shot Chart Analysis:/)).toBeTruthy();
    });

    test("shows original title when quickSwitchExtra is set", () => {
      renderComponent({
        quickSwitch: "Option A",
        quickSwitchExtra: "extra",
      });

      expect(screen.getByText(/\[Default Title\]/)).toBeTruthy();
    });
  });

  describe("link mode", () => {
    test("clicking option link calls updateQuickSwitch with link source", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Option A"));

      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        "Option A",
        "Option A",
        "link",
        false
      );
    });

    test("clicking selected option toggles it off", () => {
      renderComponent({ quickSwitch: "Option A" });

      fireEvent.click(screen.getByText("Option A"));

      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        undefined,
        "Option A",
        "link",
        false
      );
    });

    test("clicking selected option with extra mode active toggles it on (not off)", () => {
      renderComponent({
        quickSwitch: "Option A",
        quickSwitchExtra: "extra",
      });

      fireEvent.click(screen.getByText("Option A"));

      // When extra is active, clicking the link should select just the link mode
      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        "Option A",
        "Option A",
        "link",
        false
      );
    });

    test("renders plain text when link mode is disabled", () => {
      renderComponent({ modes: ["timer"] });

      // Option A should not be a link
      const optionA = screen.getByText("Option A");
      expect(optionA.tagName).not.toBe("A");
    });
  });

  describe("timer mode", () => {
    test("clicking timer icon calls setQuickSwitchTimer", () => {
      jest.useFakeTimers();
      renderComponent();

      // Find timer icons (clock icons)
      const timerLinks = screen.getAllByRole("link");
      // The second link should be the timer for Option A (first is Option A itself)
      fireEvent.click(timerLinks[1]);

      expect(mockSetQuickSwitchTimer).toHaveBeenCalled();
      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        "Option A",
        "Option A",
        "timer",
        false
      );

      jest.useRealTimers();
    });

    test("shows cancel timer option when timer is active", () => {
      const mockTimer = {} as NodeJS.Timer;
      renderComponent({ quickSwitchTimer: mockTimer });

      expect(screen.getByText("Cancel 4s timer")).toBeTruthy();
    });

    test("does not show timer icons when timer mode is disabled", () => {
      renderComponent({ modes: ["link"] });

      // Should only have 2 links (Option A and Option B, no timer icons)
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2);
    });
  });

  describe("extra mode (down arrow)", () => {
    test("clicking extra_down icon calls updateQuickSwitch with extra source", () => {
      renderComponent({ modes: ["link", "extra_down"] });

      const links = screen.getAllByRole("link");
      // Find the extra link (should be after the option link)
      fireEvent.click(links[1]);

      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        `Option A${quickSwitchDelim}extra`,
        "Option A",
        "extra",
        false
      );
    });

    test("clicking extra icon when already in extra mode cancels it", () => {
      renderComponent({
        quickSwitch: "Option A",
        quickSwitchExtra: "extra",
        modes: ["link", "extra_down"],
      });

      const links = screen.getAllByRole("link");
      fireEvent.click(links[1]);

      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        undefined,
        undefined,
        "extra",
        false
      );
    });
  });

  describe("extra mode (right arrow)", () => {
    test("clicking extra_right icon calls updateQuickSwitch with extra source", () => {
      renderComponent({ modes: ["link", "extra_right"] });

      const links = screen.getAllByRole("link");
      fireEvent.click(links[1]);

      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        `Option A${quickSwitchDelim}extra`,
        "Option A",
        "extra",
        false
      );
    });
  });

  describe("diff mode", () => {
    test("clicking diff icon calls updateQuickSwitch with diff source", () => {
      renderComponent({ modes: ["link", "diff"] });

      const links = screen.getAllByRole("link");
      fireEvent.click(links[1]);

      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        `Option A${quickSwitchDelim}diff`,
        "Option A",
        "diff",
        false
      );
    });

    test("clicking diff icon when already in diff mode cancels it", () => {
      renderComponent({
        quickSwitch: "Option A",
        quickSwitchExtra: "diff",
        modes: ["link", "diff"],
      });

      const links = screen.getAllByRole("link");
      fireEvent.click(links[1]);

      expect(mockUpdateQuickSwitch).toHaveBeenCalledWith(
        undefined,
        undefined,
        "diff",
        false
      );
    });
  });

  describe("all modes combined", () => {
    test("renders all icons when all modes are enabled", () => {
      renderComponent({
        modes: ["link", "timer", "extra_down", "diff"],
      });

      // For 2 options with link + timer + extra + diff:
      // Each option has: 1 link + 1 timer + 1 extra + 1 diff = 4 links per option
      // 2 options * 4 = 8 links
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(8);
    });
  });

  describe("quickSwitchDelim export", () => {
    test("quickSwitchDelim is correctly exported", () => {
      expect(quickSwitchDelim).toBe(":|:");
    });
  });

  describe("theme support", () => {
    test("applies dark theme styling when theme is dark", () => {
      renderComponent({
        quickSwitch: "Option A",
        theme: "dark",
      });

      // The selected option should have text shadow applied
      // We can verify the component renders without error with dark theme
      expect(screen.getByText("Option A")).toBeTruthy();
    });
  });
});
