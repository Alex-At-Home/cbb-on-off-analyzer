import {
  caveatSmallPlayerCenterMinutes,
  portalEvalDefenseRapmNote,
  portalEvalOffensePredictedUsageWarning,
  portalEvalOffenseRapmNote,
} from "../portalEvalOffDefNotes";

describe("portalEvalOffDefNotes", () => {
  test("caveatSmallPlayerCenterMinutes", () => {
    expect(
      caveatSmallPlayerCenterMinutes({
        rosterHeight: "6-8",
        posFreqs: [0.2, 0.2, 0.2, 0.2, 0.16],
      }),
    ).toBeNull();
    expect(
      caveatSmallPlayerCenterMinutes({
        rosterHeight: "6-7",
        posFreqs: [0.2, 0.2, 0.2, 0.2, 0.16],
      }),
    ).toBe(
      "Small player with [16.0%] Center minutes, may not be positionally viable",
    );
  });

  test("portalEvalDefenseRapmNote when delta > 0.8", () => {
    expect(
      portalEvalDefenseRapmNote({ def_adj_rapm: -5.5, def_adj_rtg: -4.0 }),
    ).toMatch(/Note:.*significant \(\[1\.5\] better\)/);
    expect(
      portalEvalDefenseRapmNote({ def_adj_rapm: -4.0, def_adj_rtg: -5.5 }),
    ).toMatch(/Note:.*significant \(\[1\.5\] worse\)/);
  });

  test("portalEvalOffenseRapmNote worse branch reasons", () => {
    const avg = 105;
    expect(
      portalEvalOffenseRapmNote({
        off_adj_rapm: 5,
        off_adj_rtg: 110,
        off_rtg: 110,
        off_usage: 0.15,
        off_usage_pred: 0.2,
        off_rtg_pred: 110,
        avgEfficiency: avg,
      }),
    ).toMatch(/could be too low usage/);
    expect(
      portalEvalOffenseRapmNote({
        off_adj_rapm: 5,
        off_adj_rtg: 108,
        off_rtg: 108,
        off_usage: 0.25,
        off_usage_pred: 0.2,
        off_rtg_pred: 110,
        avgEfficiency: avg,
      }),
    ).toMatch(/could take too many low quality shots/);
  });

  test("portalEvalOffensePredictedUsageWarning", () => {
    expect(
      portalEvalOffensePredictedUsageWarning({
        off_usage_pred: 0.1,
        off_rtg_pred: 110,
        avgEfficiency: 105,
        off_adj_rapm: 0,
        off_adj_rtg: 0,
        off_usage: 0.2,
      }),
    ).toMatch(/Warning: to maintain/);
    expect(
      portalEvalOffensePredictedUsageWarning({
        off_usage_pred: 0.2,
        off_rtg_pred: 110,
        avgEfficiency: 105,
        off_adj_rapm: 0,
        off_adj_rtg: 0,
        off_usage: 0.2,
      }),
    ).toBeNull();
  });
});
