import type { GoodBadOkTriple } from "../../stats/TeamEditorUtils";
import {
  buildTwoDepthRows,
  defaultDepthChartMinutes,
} from "../TeamEditorDepthChart";

function mt(key: string, mpg: number, posClass = "PG"): GoodBadOkTriple {
  const poss = mpg / 40;
  return {
    key,
    good: {} as GoodBadOkTriple["good"],
    bad: {} as GoodBadOkTriple["bad"],
    ok: {
      off_team_poss_pct: { value: poss },
    } as unknown as GoodBadOkTriple["ok"],
    orig: {
      key,
      code: key,
      posClass,
      posConfidences: [1, 0, 0, 0, 0],
    } as unknown as GoodBadOkTriple["orig"],
  };
}

describe("TeamEditorDepthChart", () => {
  test("defaultDepthChartMinutes matches mpg", () => {
    const t = mt("a", 20);
    expect(defaultDepthChartMinutes(t)).toBe(20);
  });

  test("row1 C is top Big; PG–PF are top four G/W by minutes in vertical table order", () => {
    const g1 = mt("g1", 10, "PG");
    const g2 = mt("g2", 15, "SG");
    const w1 = mt("w1", 12, "WG");
    const b1 = mt("b1", 30, "C");
    const b2 = mt("b2", 8, "PF/C");
    const [r1] = buildTwoDepthRows([g1, g2], [w1], [b1, b2]);
    expect(r1.c?.triple.key).toBe("b1");
    const pgPfKeys = [r1.pg, r1.sg, r1.sf, r1.pf].map((c) => c?.triple.key);
    expect(pgPfKeys).toEqual(["g1", "g2", "w1", undefined]);
  });

  test("PG–PF: top 4 by minutes, columns follow Guards-then-Wings vertical order", () => {
    const house = mt("House", 22.1, "CG");
    const delp = mt("DelP", 22.1, "CG");
    const rice = mt("Rice", 22.1, "CG");
    const mills = mt("Mills", 30.3, "WG");
    const adams = mt("Adams", 26, "WG");
    const baba = mt("Baba", 30, "WF");
    const payne = mt("Payne", 24, "C");
    const [r1] = buildTwoDepthRows(
      [house, delp, rice],
      [mills, adams, baba],
      [payne],
    );
    expect(r1.c?.triple.key).toBe("Payne");
    expect([r1.pg, r1.sg, r1.sf, r1.pf].map((c) => c?.triple.key)).toEqual([
      "House",
      "Mills",
      "Adams",
      "Baba",
    ]);
  });

  test("tie among Bigs prefers earlier in bigs array", () => {
    const b1 = mt("b1", 20, "C");
    const b2 = mt("b2", 20, "C");
    const [r1] = buildTwoDepthRows([], [], [b1, b2]);
    expect(r1.c?.triple.key).toBe("b1");
    const [r1b] = buildTwoDepthRows([], [], [b2, b1]);
    expect(r1b.c?.triple.key).toBe("b2");
  });

  test("row2 C is next Big; row2 slots exclude all row1 players", () => {
    const players = [
      mt("b1", 40, "C"),
      mt("b2", 35, "C"),
      mt("g1", 25, "PG"),
      mt("g2", 20, "SG"),
      mt("w1", 18, "WG"),
      mt("w2", 5, "WG"),
    ];
    const guards = [players[2], players[3]];
    const wings = [players[4], players[5]];
    const bigs = [players[0], players[1]];
    const [r1, r2] = buildTwoDepthRows(guards, wings, bigs);
    expect(r1.c?.triple.key).toBe("b1");
    expect(r2.c?.triple.key).toBe("b2");
    const usedR1 = new Set(
      (["pg", "sg", "sf", "pf", "c"] as const).map((k) => r1[k]?.triple.key),
    );
    expect(usedR1.size).toBe(5);
    for (const k of ["pg", "sg", "sf", "pf", "c"] as const) {
      const p = r2[k]?.triple.key;
      if (p) {
        expect(usedR1.has(p)).toBe(false);
      }
    }
    expect(r2.pg).toBeUndefined();
  });

  test("empty bigs leaves C blank; PG–PF from guards/wings", () => {
    const g1 = mt("g1", 22, "PG");
    const g2 = mt("g2", 11, "SG");
    const [r1] = buildTwoDepthRows([g1, g2], [], []);
    expect(r1.c).toBeUndefined();
    expect(r1.pg?.triple.key).toBe("g1");
    expect(r1.sg?.triple.key).toBe("g2");
    expect(r1.sf).toBeUndefined();
    expect(r1.pf).toBeUndefined();
  });

  test("fewer than five roster players", () => {
    const [r1, r2] = buildTwoDepthRows([mt("a", 5)], [], [mt("b", 10, "C")]);
    expect(r1.c?.triple.key).toBe("b");
    expect(r1.pg?.triple.key).toBe("a");
    expect(r2.c).toBeUndefined();
  });

  describe("row 2 bench sparse (<4 perimeter)", () => {
    const fourStarters = [
      mt("s1", 50, "PG"),
      mt("s2", 49, "PG"),
      mt("s3", 48, "PG"),
      mt("s4", 47, "PG"),
    ];

    test("WG first starts at SG; last >= WF pins to PF (3 players)", () => {
      const benchW = [
        mt("WingG", 8, "WG"),
        mt("Combo", 7, "CG"),
        mt("WingF", 6, "WF"),
      ];
      const [r1, r2] = buildTwoDepthRows(fourStarters, benchW, [
        mt("C1", 20, "C"),
      ]);
      expect(r1.c?.triple.key).toBe("C1");
      expect(r2.pg).toBeUndefined();
      expect(r2.sg?.triple.key).toBe("WingG");
      expect(r2.sf?.triple.key).toBe("Combo");
      expect(r2.pf?.triple.key).toBe("WingF");
    });

    test("last >= WF to PF; first not WG fills from PG (2 players)", () => {
      const w = [mt("Combo", 9, "CG"), mt("WingF", 8, "WF")];
      const [, r2] = buildTwoDepthRows(fourStarters, w, [mt("C1", 25, "C")]);
      expect(r2.pg?.triple.key).toBe("Combo");
      expect(r2.sg).toBeUndefined();
      expect(r2.sf).toBeUndefined();
      expect(r2.pf?.triple.key).toBe("WingF");
    });

    test("two players WG then CG: start SG, no WF pin", () => {
      const w = [mt("WingG", 10, "WG"), mt("Combo", 9, "CG")];
      const [, r2] = buildTwoDepthRows(fourStarters, w, [mt("C1", 20, "C")]);
      expect(r2.sg?.triple.key).toBe("WingG");
      expect(r2.sf?.triple.key).toBe("Combo");
      expect(r2.pg).toBeUndefined();
      expect(r2.pf).toBeUndefined();
    });

    test("PF/C+ class only in PF or C, not PG–SF (both rows)", () => {
      const g = [mt("g1", 25, "PG"), mt("stretch", 24, "PF/C")];
      const w = [mt("w1", 20, "WG"), mt("w2", 19, "WF")];
      const [r1] = buildTwoDepthRows(g, w, [mt("c1", 15, "C")]);
      expect(r1.pg?.triple.key).toBe("g1");
      expect(r1.sg?.triple.key).toBe("w1");
      expect(r1.sf?.triple.key).toBe("w2");
      expect(r1.pf?.triple.key).toBe("stretch");
    });

    test("row 2 with 4 perimeter uses standard PG–PF order (no bench sparse)", () => {
      const guards = [
        mt("a", 40),
        mt("b", 39),
        mt("c", 38),
        mt("d", 37),
        mt("e", 36),
        mt("f", 35),
        mt("g", 34),
        mt("h", 33),
      ];
      const bigs = [mt("b1", 30, "C"), mt("b2", 5, "C")];
      const [, r2] = buildTwoDepthRows(guards, [], bigs);
      expect(r2.pg?.triple.key).toBe("e");
      expect(r2.sg?.triple.key).toBe("f");
      expect(r2.sf?.triple.key).toBe("g");
      expect(r2.pf?.triple.key).toBe("h");
    });
  });
});
