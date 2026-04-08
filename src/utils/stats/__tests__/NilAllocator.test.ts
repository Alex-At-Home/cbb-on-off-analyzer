import {
  NIL_ALLOCATOR_DEFAULT_DESIRED_NET,
  NIL_REPLACEMENT_LEVEL,
  nilAutoPoolDollars,
  nilFullBudgetDollarsPerMarginalPoint,
  nilMarginalPointsAboveReplacement,
  parseNilBudgetMillions,
  parseNilDesiredNet,
  totalImprovementNeededPoints,
} from "../NilAllocator";

describe("NilAllocator", () => {
  test("parseNilBudgetMillions", () => {
    expect(parseNilBudgetMillions(undefined)).toBeUndefined();
    expect(parseNilBudgetMillions("")).toBeUndefined();
    expect(parseNilBudgetMillions("  ")).toBeUndefined();
    expect(parseNilBudgetMillions("12.5")).toBeCloseTo(12.5);
    expect(parseNilBudgetMillions("0")).toBe(0);
    expect(parseNilBudgetMillions("bad")).toBeUndefined();
  });

  test("parseNilDesiredNet defaults", () => {
    expect(parseNilDesiredNet(undefined)).toBe(
      NIL_ALLOCATOR_DEFAULT_DESIRED_NET,
    );
    expect(parseNilDesiredNet("")).toBe(NIL_ALLOCATOR_DEFAULT_DESIRED_NET);
    expect(parseNilDesiredNet("27.6")).toBeCloseTo(27.6);
  });

  test("totalImprovementNeededPoints matches five replacement baseline", () => {
    expect(
      totalImprovementNeededPoints(27.6, NIL_REPLACEMENT_LEVEL, 5),
    ).toBeCloseTo(32.6);
    expect(totalImprovementNeededPoints(20, NIL_REPLACEMENT_LEVEL, 5)).toBe(25);
  });

  test("auto pool remainder", () => {
    expect(nilAutoPoolDollars(13.5e6, 1e6)).toBe(12.5e6);
    expect(nilAutoPoolDollars(5e6, 6e6)).toBe(0);
  });

  test("full-budget $/pt and Bidunga-style marginal dollars", () => {
    const rate = nilFullBudgetDollarsPerMarginalPoint(13.5e6, 27.6);
    expect(rate).toBeDefined();
    expect(rate!).toBeCloseTo(13.5e6 / 32.6, -2);
    const marginal = nilMarginalPointsAboveReplacement(10.5, 31.2 / 40);
    expect(marginal).toBeCloseTo(11.5 * 0.78, 5);
    const dollars = marginal * rate!;
    expect(dollars / 1e6).toBeCloseTo(3.71, 1);
  });
});
