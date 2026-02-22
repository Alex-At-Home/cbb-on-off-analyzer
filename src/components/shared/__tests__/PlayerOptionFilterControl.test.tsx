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

  test("unknown code still parses as valid (token accepted, used for display)", () => {
    const result = parseCodeOptionString("UnknownCode", SAMPLE_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: false, code: "UnknownCode", option: undefined },
    ]);
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

  test("one valid one malformed -> invalid", () => {
    const result = parseCodeOptionString("DaCoit;=PG", SAMPLE_ITEMS);
    expect(result.valid).toBe(false);
    expect(result.tokens).toEqual([]);
  });

  test("An.Mills (code with dot): single token parses and yields 1 token", () => {
    const items: PlayerOptionFilterItem[] = [
      { code: "An.Mills", name: "An.Mills", allowedOptions: [""] },
    ];
    const result = parseCodeOptionString("An.Mills", items);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: false, code: "An.Mills", option: undefined },
    ]);
  });

  test("An.Mills (code with dot): -An.Mills;An.Mills parses and yields 2 tokens", () => {
    const items: PlayerOptionFilterItem[] = [
      { code: "An.Mills", name: "An.Mills", allowedOptions: [""] },
    ];
    const result = parseCodeOptionString("-An.Mills;An.Mills", items);
    expect(result.valid).toBe(true);
    expect(result.tokens).toEqual([
      { negated: true, code: "An.Mills", option: undefined },
      { negated: false, code: "An.Mills", option: undefined },
    ]);
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

  test("with invalid value (malformed token) renders text mode (input + prepend button)", () => {
    render(
      <PlayerOptionFilterControl
        {...defaultProps}
        value="=noCode"
        placeholder="Type here"
      />,
    );
    const input = document.querySelector("input") as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(input && input.value).toBe("=noCode");
    expect(document.querySelector("button")).toBeTruthy();
  });

  test("text mode: prepend button click sets selector mode (still text UI if value invalid)", () => {
    render(<PlayerOptionFilterControl {...defaultProps} value="=noCode" />);
    const button = document.querySelector("button");
    expect(button).toBeTruthy();
    fireEvent.click(button!);
    expect(document.querySelector("button")).toBeTruthy();
    const input = document.querySelector("input");
    expect(input).toBeTruthy();
  });

  test("selector mode with valid value shows nuggets (multi-value elements)", () => {
    render(
      <PlayerOptionFilterControl {...defaultProps} value="DaCoit;-DaCoit=SG" />,
    );
    expect(
      document.querySelector(".hoop-explorer-select-container"),
    ).toBeTruthy();
    const multiValues = document.querySelectorAll(
      ".hoop-explorer-select__multi-value",
    );
    expect(multiValues.length).toBeGreaterThanOrEqual(2);
  });

  test("onChange called when typing in text mode", () => {
    jest.useFakeTimers();
    render(
      <PlayerOptionFilterControl
        {...defaultProps}
        value="=invalid"
        timeout={500}
      />,
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
