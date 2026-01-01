/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RowNamingModal, { RowNamingConfig } from "../RowNamingModal";
import { GameFilterParams } from "../../../utils/FilterModels";

// Helper to get input value
const getInputValue = (element: HTMLElement): string => {
  return (element as HTMLInputElement | HTMLTextAreaElement).value;
};

describe("RowNamingModal", () => {
  const defaultRowConfig: RowNamingConfig = {
    hasBase: true,
    hasOnA: true,
    hasOffB: true,
    numExtraQueries: 0,
  };

  const mockOnHide = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnHide.mockClear();
    mockOnSave.mockClear();
  });

  // Helper to render the modal
  const renderModal = (
    params: GameFilterParams = {},
    rowConfig: RowNamingConfig = defaultRowConfig
  ) => {
    return render(
      <RowNamingModal
        show={true}
        onHide={mockOnHide}
        onSave={mockOnSave}
        params={params}
        rowConfig={rowConfig}
      />
    );
  };

  describe("Text and phrase specified manually", () => {
    test("saves custom text and phrase when both are specified", () => {
      // Preset with splitPhrases to establish a baseline
      renderModal({
        presetSplit: "Top 7 players vs Substitution Patterns", // Has splitPhrases: ["5_of_T7", "4_of_T7", ...]
      });

      // Find the text areas and inputs
      const textAreas = screen.getAllByRole("textbox");
      // textAreas[0] = Base text, textAreas[1] = Base phrase
      // textAreas[2] = On('A') text, textAreas[3] = On('A') phrase
      // textAreas[4] = Off('B') text, textAreas[5] = Off('B') phrase

      // Set custom text and phrase for On('A')
      fireEvent.change(textAreas[2], { target: { value: "Custom A Text" } });
      fireEvent.change(textAreas[3], { target: { value: "CustomA" } });

      // Click Save
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      // Verify onSave was called with the custom values
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          splitText: expect.arrayContaining(["Custom A Text"]),
          splitPhrases: expect.arrayContaining(["CustomA"]),
        })
      );
    });

    test("saves custom base text and phrase", () => {
      renderModal({});

      const textAreas = screen.getAllByRole("textbox");

      // Set custom text and phrase for Base
      fireEvent.change(textAreas[0], { target: { value: "My Custom Base" } });
      fireEvent.change(textAreas[1], { target: { value: "Custom" } });

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          baseText: "My Custom Base",
          basePhrase: "Custom",
        })
      );
    });
  });

  describe("Clear text but specify phrase manually", () => {
    test("when phrase is set but text is cleared, saves phrase and derives text from phrase", () => {
      renderModal({
        presetSplit: "Top 7 players vs Substitution Patterns",
      });

      const textAreas = screen.getAllByRole("textbox");

      // Clear the On('A') text (set to empty)
      fireEvent.change(textAreas[2], { target: { value: "" } });
      // Set a custom phrase
      fireEvent.change(textAreas[3], { target: { value: "MyPhrase" } });

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      // Text should be empty (derived as "MyPhrase lineups" which is the default)
      // Phrase should be saved as "MyPhrase"
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          splitPhrases: expect.arrayContaining(["MyPhrase"]),
        })
      );

      // The text should NOT be saved if it matches the derived default
      const savedParams = mockOnSave.mock.calls[0][0];
      // If splitText is set, it should be empty for the first element (because it matches default)
      if (savedParams.splitText) {
        expect(savedParams.splitText[0]).toBe("");
      }
    });

    test("placeholder updates dynamically when phrase changes", () => {
      renderModal({
        presetSplit: "Top 7 players vs Substitution Patterns",
      });

      const textAreas = screen.getAllByRole("textbox");

      // Initially placeholder should show preset phrase
      const onATextArea = textAreas[2];
      expect(onATextArea.getAttribute("placeholder")).toContain("5_of_T7");

      // Change the phrase
      fireEvent.change(textAreas[3], { target: { value: "NewPhrase" } });

      // Now placeholder should reflect the new phrase
      expect(onATextArea.getAttribute("placeholder")).toContain("NewPhrase");
    });
  });

  describe("Clear text, no manual phrase, preset is set", () => {
    test("uses preset phrase as default when no manual phrase is set", () => {
      renderModal({
        presetSplit: "Home vs Away/Neutral", // Has splitPhrases: ["H", "A/N"]
      });

      const textAreas = screen.getAllByRole("textbox");

      // Check that the text area is populated with the preset-derived text
      expect(getInputValue(textAreas[2])).toBe("H lineups");
      expect(getInputValue(textAreas[4])).toBe("A/N lineups");

      // Save without changes
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      // Since values match defaults, they should not be saved
      expect(mockOnSave).toHaveBeenCalledWith({
        basePhrase: undefined,
        baseText: undefined,
        splitPhrases: undefined,
        splitText: undefined,
      });
    });

    test("base text uses preset filter phrase when set", () => {
      renderModal({
        presetMode: "Season Stats vs T50ish", // Has phrase: "T50"
      });

      const textAreas = screen.getAllByRole("textbox");

      // Base text should be derived from preset
      expect(getInputValue(textAreas[0])).toBe("Base (T50) stats");

      // Placeholder should also show this
      expect(textAreas[0].getAttribute("placeholder")).toContain("T50");
    });
  });

  describe("Clear text, no manual phrase, no preset", () => {
    test("base defaults to Season stats when default preset is used", () => {
      renderModal({
        presetMode: "Season Stats", // Default preset (capital S in Stats)
        presetSplit: "No Splits", // Default split (no phrases)
      });

      const textAreas = screen.getAllByRole("textbox");

      // Base text should be "Season stats" and phrase should be "Base"
      expect(getInputValue(textAreas[0])).toBe("Season stats");
      expect(getInputValue(textAreas[1])).toBe("Base");
    });

    test("split rows have empty text when no preset phrases", () => {
      renderModal(
        {
          presetMode: "Season Stats", // Default preset (capital S in Stats)
          presetSplit: "No Splits",
        },
        {
          hasBase: true,
          hasOnA: true,
          hasOffB: true,
          numExtraQueries: 0,
        }
      );

      const textAreas = screen.getAllByRole("textbox");

      // On('A') and Off('B') should have empty text (no preset phrases)
      expect(getInputValue(textAreas[2])).toBe("");
      expect(getInputValue(textAreas[4])).toBe("");

      // Placeholders should just say "Row display text..."
      expect(textAreas[2].getAttribute("placeholder")).toBe(
        "Row display text..."
      );
    });
  });

  describe("Button functionality", () => {
    test("Clear button resets to preset-only defaults", () => {
      renderModal({
        presetSplit: "Home vs Away/Neutral",
        splitPhrases: ["CustomX", "CustomY"], // Manual overrides
        splitText: ["Custom X Text", "Custom Y Text"],
      });

      const textAreas = screen.getAllByRole("textbox");

      // Initially should show param values
      expect(getInputValue(textAreas[2])).toBe("Custom X Text");
      expect(getInputValue(textAreas[3])).toBe("CustomX");

      // Click Clear
      fireEvent.click(screen.getByRole("button", { name: /clear/i }));

      // Should reset to preset defaults
      expect(getInputValue(textAreas[2])).toBe("H lineups");
      expect(getInputValue(textAreas[3])).toBe("H");
    });

    test("Reset button restores to current params", () => {
      renderModal({
        presetSplit: "Home vs Away/Neutral",
        splitPhrases: ["CustomX", "CustomY"],
        splitText: ["Custom X Text", "Custom Y Text"],
      });

      const textAreas = screen.getAllByRole("textbox");

      // Modify the values
      fireEvent.change(textAreas[2], { target: { value: "Modified" } });

      // Click Reset
      fireEvent.click(screen.getByRole("button", { name: /reset/i }));

      // Should restore to param values
      expect(getInputValue(textAreas[2])).toBe("Custom X Text");
    });

    test("Cancel button calls onHide without saving", () => {
      renderModal({});

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(mockOnHide).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe("Subsequent saves preserve custom values", () => {
    test("saving twice with same custom phrase preserves the phrase", () => {
      // First render with no saved params
      const { rerender } = render(
        <RowNamingModal
          show={true}
          onHide={mockOnHide}
          onSave={mockOnSave}
          params={{
            presetSplit: "Top 7 players vs Substitution Patterns",
          }}
          rowConfig={defaultRowConfig}
        />
      );

      const textAreas = screen.getAllByRole("textbox");

      // Set custom phrase
      fireEvent.change(textAreas[3], { target: { value: "X" } });
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      // First save should include the phrase
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          splitPhrases: expect.arrayContaining(["X"]),
        })
      );

      // Simulate the params being updated after save
      const savedParams = mockOnSave.mock.calls[0][0];
      mockOnSave.mockClear();

      // Re-render with the saved params (simulating reopening modal)
      rerender(
        <RowNamingModal
          show={true}
          onHide={mockOnHide}
          onSave={mockOnSave}
          params={{
            presetSplit: "Top 7 players vs Substitution Patterns",
            splitPhrases: savedParams.splitPhrases,
          }}
          rowConfig={defaultRowConfig}
        />
      );

      // Save again without changes
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      // The phrase should still be saved (not cleared)
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          splitPhrases: expect.arrayContaining(["X"]),
        })
      );
    });
  });

  describe("Extra queries (C, D, etc.)", () => {
    test("renders extra query rows correctly", () => {
      renderModal(
        {
          presetSplit: "Top 7 players vs Substitution Patterns", // Has 4 splits: A, B, C, D
        },
        {
          hasBase: true,
          hasOnA: true,
          hasOffB: true,
          numExtraQueries: 2, // C and D
        }
      );

      // Should have Base + On('A') + Off('B') + C + D = 5 rows
      // Each row has 2 textboxes (text + phrase) = 10 textboxes
      const textAreas = screen.getAllByRole("textbox");
      expect(textAreas.length).toBe(10);

      // Check that C and D rows exist with correct preset phrases
      // C is index 6 (text), D is index 8 (text)
      expect(getInputValue(textAreas[6])).toBe("3_of_T7 lineups");
      expect(getInputValue(textAreas[8])).toBe("2_of_T7 lineups");
    });
  });
});

