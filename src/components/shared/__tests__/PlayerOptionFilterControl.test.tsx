/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PlayerOptionFilterControl, {
  parseCodeOptionString,
  formatDisplayName,
  PlayerOptionFilterItem,
} from "../PlayerOptionFilterControl";

const SAMPLE_ITEMS: PlayerOptionFilterItem[] = [
  {
    code: "DaCoit",
    name: "Coit, David",
    allowedOptions: ["", "PG", "SG"],
  },
  {
    code: "JoSmith",
    name: "Smith, John",
    allowedOptions: [""],
  },
];

describe("formatDisplayName", () => {
  test('"Last, First" -> "First Last"', () => {
    expect(formatDisplayName("Coit, David")).toBe("David Coit");
  });

  test("no comma -> unchanged", () => {
    expect(formatDisplayName("David Coit")).toBe("David Coit");
  });

  test("single part -> unchanged", () => {
    expect(formatDisplayName("Madonna")).toBe("Madonna");
  });
});

describe("parseCodeOptionString", () => {
  test("empty string -> valid, tokens []", () => {
    const result = parseCodeOptionString("", SAMPLE_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([]);
  });

  test("single valid token (no option)", () => {
    const result = parseCodeOptionString("DaCoit", SAMPLE_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: false, code: "DaCoit", option: undefined },
    ]);
  });

  test("single valid token with option", () => {
    const result = parseCodeOptionString("DaCoit=PG", SAMPLE_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: false, code: "DaCoit", option: "PG" },
    ]);
  });

  test("option not in allowedOptions -> invalid", () => {
    const result = parseCodeOptionString("DaCoit=SF", SAMPLE_ITEMS);
    expect(result.valid).toBe(false);
    expect(result.tokens).toEqual([]);
  });

  test("negated token", () => {
    const result = parseCodeOptionString("-DaCoit", SAMPLE_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: true, code: "DaCoit", option: undefined },
    ]);
  });

  test("negated token with option", () => {
    const result = parseCodeOptionString("-DaCoit=SG", SAMPLE_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: true, code: "DaCoit", option: "SG" },
    ]);
  });

  test("semicolon-separated multiple tokens", () => {
    const result = parseCodeOptionString(
      "DaCoit;DaCoit=PG;-DaCoit=SG",
      SAMPLE_ITEMS,
    );
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: false, code: "DaCoit", option: undefined },
      { negated: false, code: "DaCoit", option: "PG" },
      { negated: true, code: "DaCoit", option: "SG" },
    ]);
  });

  test("unknown code -> invalid", () => {
    const result = parseCodeOptionString("UnknownCode", SAMPLE_ITEMS);
    expect(result.valid).toBe(false);
    expect(result.tokens).toEqual([]);
  });

  test("malformed token =PG (no code) -> invalid", () => {
    const result = parseCodeOptionString("=PG", SAMPLE_ITEMS);
    expect(result.valid).toBe(false);
    expect(result.tokens).toEqual([]);
  });

  test("whitespace around semicolons -> trim and ignore empty", () => {
    const result = parseCodeOptionString(
      "  DaCoit  ;  DaCoit=PG  ;  ",
      SAMPLE_ITEMS,
    );
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: false, code: "DaCoit", option: undefined },
      { negated: false, code: "DaCoit", option: "PG" },
    ]);
  });

  test("single semicolon -> empty tokens discarded", () => {
    const result = parseCodeOptionString(";", SAMPLE_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([]);
  });

  test("one valid one invalid -> invalid", () => {
    const result = parseCodeOptionString("DaCoit;BadCode", SAMPLE_ITEMS);
    expect(result.valid).toBe(false);
    expect(result.tokens).toEqual([]);
  });
});

describe("PlayerOptionFilterControl", () => {
  const defaultProps = {
    value: "",
    onChange: jest.fn(),
    items: SAMPLE_ITEMS,
  };

  beforeEach(() => {
    defaultProps.onChange.mockClear();
  });

  test("with valid empty value renders selector with emptyLabel placeholder", () => {
    render(
      <PlayerOptionFilterControl
        {...defaultProps}
        value=""
        emptyLabel="Pick players"
      />,
    );
    expect(screen.getByText("Pick players")).toBeTruthy();
    expect(
      document.querySelector(".hoop-explorer-select-container"),
    ).toBeTruthy();
  });

  test("with invalid value renders text mode (input + prepend button)", () => {
    render(
      <PlayerOptionFilterControl
        {...defaultProps}
        value="garbage"
        placeholder="Type here"
      />,
    );
    const input = document.querySelector("input") as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(input && input.value).toBe("garbage");
    expect(document.querySelector("button")).toBeTruthy();
  });

  test("text mode: prepend button click sets selector mode (still text UI if value invalid)", () => {
    render(<PlayerOptionFilterControl {...defaultProps} value="garbage" />);
    const button = document.querySelector("button");
    expect(button).toBeTruthy();
    fireEvent.click(button!);
    expect(document.querySelector("button")).toBeTruthy();
    const input = document.querySelector("input");
    expect(input).toBeTruthy();
  });

  test("selector mode with valid value shows nuggets (Badges)", () => {
    render(
      <PlayerOptionFilterControl {...defaultProps} value="DaCoit;-DaCoit=SG" />,
    );
    expect(
      document.querySelector(".hoop-explorer-select-container"),
    ).toBeTruthy();
    const badges = document.querySelectorAll(".badge");
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  test("onChange called when typing in text mode", () => {
    jest.useFakeTimers();
    render(
      <PlayerOptionFilterControl {...defaultProps} value="x" timeout={500} />,
    );
    const input = document.querySelector("input");
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: "DaCoit" } });
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(defaultProps.onChange).toHaveBeenCalledWith("DaCoit");
    jest.useRealTimers();
  });
});
