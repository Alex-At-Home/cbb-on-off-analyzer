import _ from "lodash";

import {
  RapmUtils,
  RapmPlayerContext,
  RapmPreProcDiagnostics,
  defaultRapmConfig,
} from "../RapmUtils";
import { LuckUtils } from "../LuckUtils";
import {
  StatModels,
  PureStatSet,
  PlayerCodeId,
  PlayerCode,
  PlayerId,
  Statistic,
  IndivStatSet,
  LineupStatSet,
} from "../../StatModels";
// @ts-ignore
import { apply, transpose, matrix, zeros } from "mathjs";

// For creating test data:
import { sampleLineupStatsResponse } from "../../../sample-data/sampleLineupStatsResponse";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { LineupUtils, PlayerOnOffStats } from "../LineupUtils";

// Some handy data:

const reducedFilteredLineups = [
  {
    off_adj_ppp: { value: 123.5174 },
    def_adj_ppp: { value: 87.6567 },
    off_to: { value: 0.1234 },
    def_to: { value: 0.1506 },
    off_poss: { value: 397 },
    def_poss: { value: 385 },
  },
  {
    off_adj_ppp: { value: 115.2944 },
    def_adj_ppp: { value: 78.5102 },
    off_to: { value: 0.1578 },
    def_to: { value: 0.2248 },
    off_poss: { value: 209 },
    def_poss: { value: 209 },
  },
  {
    off_adj_ppp: { value: 120.3613 },
    def_adj_ppp: { value: 82.0894 },
    off_to: { value: 0.1725 },
    def_to: { value: 0.1709 },
    off_poss: { value: 197 },
    def_poss: { value: 193 },
  },
  {
    off_adj_ppp: { value: 106.4985 },
    def_adj_ppp: { value: 98.5939 },
    off_to: { value: 0.2 },
    def_to: { value: 0.1388 },
    off_poss: { value: 175 },
    def_poss: { value: 180 },
  },
  {
    off_adj_ppp: { value: 109.0532 },
    def_adj_ppp: { value: 96.0848 },
    off_to: { value: 0.1803 },
    def_to: { value: 0.1896 },
    off_poss: { value: 61 },
    def_poss: { value: 58 },
  },
  {
    off_adj_ppp: { value: 115.8655 },
    def_adj_ppp: { value: 97.398 },
    off_to: { value: 0.2272 },
    def_to: { value: 0.3695 },
    off_poss: { value: 44 },
    def_poss: { value: 46 },
  },
  {
    off_adj_ppp: { value: 116.7904 },
    def_adj_ppp: { value: 69.0444 },
    off_to: { value: 0.1363 },
    def_to: { value: 0.159 },
    off_poss: { value: 44 },
    def_poss: { value: 44 },
  },
  {
    off_adj_ppp: { value: 97.1418 },
    def_adj_ppp: { value: 68.3655 },
    off_to: { value: 0.1842 },
    def_to: { value: 0.2162 },
    off_poss: { value: 38 },
    def_poss: { value: 37 },
  },
  {
    off_adj_ppp: { value: 111.8079 },
    def_adj_ppp: { value: 73.4509 },
    off_to: { value: 0.1538 },
    def_to: { value: 0.1923 },
    off_poss: { value: 26 },
    def_poss: { value: 26 },
  },
  {
    off_adj_ppp: { value: 137.3557 },
    def_adj_ppp: { value: 92.6562 },
    off_to: { value: 0.05 },
    def_to: { value: 0.2222 },
    off_poss: { value: 20 },
    def_poss: { value: 18 },
  },
  {
    off_adj_ppp: { value: 126.2792 },
    def_adj_ppp: { value: 76.3977 },
    off_to: { value: 0.1 },
    def_to: { value: 0.1052 },
    off_poss: { value: 20 },
    def_poss: { value: 19 },
  },
  {
    off_adj_ppp: { value: 105.8534 },
    def_adj_ppp: { value: 78.1378 },
    off_to: { value: 0.3571 },
    def_to: { value: 0.25 },
    off_poss: { value: 14 },
    def_poss: { value: 16 },
  },
  {
    off_adj_ppp: { value: 83.1219 },
    def_adj_ppp: { value: 69.6595 },
    off_to: { value: 0.1428 },
    def_to: { value: 0.0555 },
    off_poss: { value: 14 },
    def_poss: { value: 18 },
  },
  {
    off_adj_ppp: { value: 81.2756 },
    def_adj_ppp: { value: 85.3294 },
    off_to: { value: 0.0769 },
    def_to: { value: 0.2142 },
    off_poss: { value: 13 },
    def_poss: { value: 14 },
  },
  {
    off_adj_ppp: { value: 113.5027 },
    def_adj_ppp: { value: 78.6277 },
    off_to: { value: 0.0833 },
    def_to: { value: 0.1818 },
    off_poss: { value: 12 },
    def_poss: { value: 11 },
  },
  {
    off_adj_ppp: { value: 113.2939 },
    def_adj_ppp: { value: 87.9023 },
    off_to: { value: 0.2 },
    def_to: { value: 0.1 },
    off_poss: { value: 10 },
    def_poss: { value: 10 },
  },
  {
    off_adj_ppp: { value: 147.184 },
    def_adj_ppp: { value: 146.6079 },
    off_to: { value: 0.2222 },
    def_to: { value: 0.125 },
    off_poss: { value: 9 },
    def_poss: { value: 8 },
  },
  {
    off_adj_ppp: { value: 125.4313 },
    def_adj_ppp: { value: 126.6332 },
    off_to: { value: 0.25 },
    def_to: { value: 0.1428 },
    off_poss: { value: 8 },
    def_poss: { value: 7 },
  },
  {
    off_adj_ppp: { value: 143.576 },
    def_adj_ppp: { value: 88.7995 },
    off_to: { value: 0 },
    def_to: { value: 0.1 },
    off_poss: { value: 7 },
    def_poss: { value: 10 },
  },
  {
    off_adj_ppp: { value: 0 },
    def_adj_ppp: { value: 140.9383 },
    off_to: { value: 0.25 },
    def_to: { value: 0 },
    off_poss: { value: 4 },
    def_poss: { value: 5 },
  },
  {
    off_adj_ppp: { value: 51.6649 },
    def_adj_ppp: { value: 113.5392 },
    off_to: { value: 0.25 },
    def_to: { value: 0.2 },
    off_poss: { value: 4 },
    def_poss: { value: 5 },
  },
  {
    off_adj_ppp: { value: 279.4759 },
    def_adj_ppp: { value: 37.3041 },
    off_to: { value: 0 },
    def_to: { value: 0 },
    off_poss: { value: 4 },
    def_poss: { value: 5 },
  },
  {
    off_adj_ppp: { value: 96.1502 },
    def_adj_ppp: { value: 52.7835 },
    off_to: { value: 0.25 },
    def_to: { value: 0.5 },
    off_poss: { value: 4 },
    def_poss: { value: 4 },
  },
  {
    off_adj_ppp: { value: 73.405 },
    def_adj_ppp: { value: 137.3543 },
    off_to: { value: 0 },
    def_to: { value: 0.25 },
    off_poss: { value: 3 },
    def_poss: { value: 4 },
  },
  {
    off_adj_ppp: { value: 68.5408 },
    def_adj_ppp: { value: 120.075 },
    off_to: { value: 0 },
    def_to: { value: 0 },
    off_poss: { value: 3 },
    def_poss: { value: 4 },
  },
  {
    off_adj_ppp: { value: 109.4017 },
    def_adj_ppp: { value: 0 },
    off_to: { value: 0.3333 },
    def_to: { value: 0.3333 },
    off_poss: { value: 3 },
    def_poss: { value: 3 },
  },
  {
    off_adj_ppp: { value: 129.5382 },
    def_adj_ppp: { value: 53.1671 },
    off_to: { value: 0 },
    def_to: { value: 0.25 },
    off_poss: { value: 3 },
    def_poss: { value: 4 },
  },
  {
    off_adj_ppp: { value: 160.5015 },
    def_adj_ppp: { value: 98.6512 },
    off_to: { value: 0.5 },
    def_to: { value: 0 },
    off_poss: { value: 2 },
    def_poss: { value: 2 },
  },
  {
    off_adj_ppp: { value: 199.6101 },
    def_adj_ppp: { value: 0 },
    off_to: { value: 0 },
    def_to: { value: 0 },
    off_poss: { value: 1 },
    def_poss: { value: 1 },
  },
  {
    off_adj_ppp: { value: 204.3912 },
    def_adj_ppp: { value: 176.8566 },
    off_to: { value: 0 },
    def_to: { value: 0 },
    off_poss: { value: 1 },
    def_poss: { value: 1 },
  },
  {
    off_adj_ppp: { value: 210.6995 },
    def_adj_ppp: { value: 129.2929 },
    off_to: { value: 0 },
    def_to: { value: 0 },
    off_poss: { value: 1 },
    def_poss: { value: 2 },
  },
];

export const semiRealRapmResults = {
  // Somewhat complex real world test data:
  testOffWeights: [
    [0.542, 0.542, 0.542, 0.542, 0.542, 0, 0, 0],
    [0.3933, 0.3933, 0.3933, 0.3933, 0, 0.3933, 0, 0],
    [0.3818, 0.3818, 0.3818, 0, 0.3818, 0.3818, 0, 0],
    [0.3599, 0.3599, 0, 0.3599, 0.3599, 0.3599, 0, 0],
    [0.2124, 0.2124, 0.2124, 0, 0.2124, 0, 0.2124, 0],
    [0.1804, 0.1804, 0.1804, 0.1804, 0, 0, 0.1804, 0],
    [0.1804, 0, 0.1804, 0.1804, 0.1804, 0.1804, 0, 0],
    [0.1677, 0.1677, 0.1677, 0, 0, 0.1677, 0, 0.1677],
    [0.1387, 0.1387, 0.1387, 0, 0, 0, 0.1387, 0.1387],
    [0.1216, 0.1216, 0.1216, 0.1216, 0, 0, 0, 0.1216],
    [0.1216, 0.1216, 0, 0.1216, 0.1216, 0, 0.1216, 0],
    [0.1017, 0, 0.1017, 0.1017, 0.1017, 0, 0.1017, 0],
    [0.1017, 0, 0.1017, 0.1017, 0.1017, 0, 0, 0.1017],
    [0.098, 0.098, 0, 0.098, 0, 0.098, 0, 0.098],
    [0.0942, 0.0942, 0, 0.0942, 0.0942, 0, 0, 0.0942],
    [0, 0.086, 0.086, 0.086, 0, 0.086, 0.086, 0],
    [0, 0.0816, 0.0816, 0.0816, 0.0816, 0.0816, 0, 0],
    [0, 0.0769, 0.0769, 0, 0.0769, 0.0769, 0.0769, 0],
    [0.0719, 0, 0.0719, 0, 0.0719, 0, 0.0719, 0.0719],
    [0.0544, 0, 0.0544, 0, 0.0544, 0.0544, 0, 0.0544],
    [0, 0, 0.0544, 0.0544, 0.0544, 0.0544, 0, 0.0544],
    [0.0544, 0, 0, 0.0544, 0.0544, 0.0544, 0, 0.0544],
    [0.0544, 0, 0, 0, 0.0544, 0.0544, 0.0544, 0.0544],
    [0, 0.0471, 0.0471, 0.0471, 0.0471, 0, 0.0471, 0],
    [0.0471, 0.0471, 0, 0.0471, 0, 0, 0.0471, 0.0471],
    [0.0471, 0.0471, 0, 0, 0.0471, 0.0471, 0, 0.0471],
    [0.0471, 0.0471, 0.0471, 0, 0.0471, 0, 0, 0.0471],
    [0.0384, 0, 0, 0.0384, 0.0384, 0, 0.0384, 0.0384],
    [0, 0.0272, 0.0272, 0.0272, 0, 0, 0.0272, 0.0272],
    [0, 0.0272, 0, 0.0272, 0.0272, 0.0272, 0, 0.0272],
    [0.0272, 0.0272, 0, 0, 0.0272, 0, 0.0272, 0.0272],
    [1.9467, 1.8564, 1.6476, 1.4789, 1.4611, 1.0703, 0.3019, 0.2368],
  ],

  testDefWeights: [
    [0.5342, 0.5342, 0.5342, 0.5342, 0.5342, 0, 0, 0],
    [0.3936, 0.3936, 0.3936, 0.3936, 0, 0.3936, 0, 0],
    [0.3782, 0.3782, 0.3782, 0, 0.3782, 0.3782, 0, 0],
    [0.3652, 0.3652, 0, 0.3652, 0.3652, 0.3652, 0, 0],
    [0.2073, 0.2073, 0.2073, 0, 0.2073, 0, 0.2073, 0],
    [0.1846, 0.1846, 0.1846, 0.1846, 0, 0, 0.1846, 0],
    [0.1806, 0, 0.1806, 0.1806, 0.1806, 0.1806, 0, 0],
    [0.1656, 0.1656, 0.1656, 0, 0, 0.1656, 0, 0.1656],
    [0.1388, 0.1388, 0.1388, 0, 0, 0, 0.1388, 0.1388],
    [0.1155, 0.1155, 0.1155, 0.1155, 0, 0, 0, 0.1155],
    [0.1186, 0.1186, 0, 0.1186, 0.1186, 0, 0.1186, 0],
    [0.1089, 0, 0.1089, 0.1089, 0.1089, 0, 0.1089, 0],
    [0.1155, 0, 0.1155, 0.1155, 0.1155, 0, 0, 0.1155],
    [0.1018, 0.1018, 0, 0.1018, 0, 0.1018, 0, 0.1018],
    [0.0903, 0.0903, 0, 0.0903, 0.0903, 0, 0, 0.0903],
    [0, 0.086, 0.086, 0.086, 0, 0.086, 0.086, 0],
    [0, 0.077, 0.077, 0.077, 0.077, 0.077, 0, 0],
    [0, 0.072, 0.072, 0, 0.072, 0.072, 0.072, 0],
    [0.086, 0, 0.086, 0, 0.086, 0, 0.086, 0.086],
    [0.0608, 0, 0.0608, 0, 0.0608, 0.0608, 0, 0.0608],
    [0, 0, 0.0608, 0.0608, 0.0608, 0.0608, 0, 0.0608],
    [0.0608, 0, 0, 0.0608, 0.0608, 0.0608, 0, 0.0608],
    [0.0544, 0, 0, 0, 0.0544, 0.0544, 0.0544, 0.0544],
    [0, 0.0544, 0.0544, 0.0544, 0.0544, 0, 0.0544, 0],
    [0.0544, 0.0544, 0, 0.0544, 0, 0, 0.0544, 0.0544],
    [0.0471, 0.0471, 0, 0, 0.0471, 0.0471, 0, 0.0471],
    [0.0544, 0.0544, 0.0544, 0, 0.0544, 0, 0, 0.0544],
    [0.0385, 0, 0, 0.0385, 0.0385, 0, 0.0385, 0.0385],
    [0, 0.0272, 0.0272, 0.0272, 0, 0, 0.0272, 0.0272],
    [0, 0.0272, 0, 0.0272, 0.0272, 0.0272, 0, 0.0272],
    [0.0385, 0.0385, 0, 0, 0.0385, 0, 0.0385, 0.0385],
    [1.9466, 1.8383, 1.6367, 1.4825, 1.4588, 1.0748, 0.3098, 0.252],
  ],

  reducedFilteredLineups: reducedFilteredLineups,

  testContext: {
    unbiasWeight: 2,
    removedPlayers: {
      "Mitchell, Makhel": [0.21, 0.01, StatModels.emptyIndiv()],
      "Tomaic, Joshua": [0.149, 0.02, StatModels.emptyIndiv()],
      "Marial, Chol": [0.0208, 0.0208, StatModels.emptyIndiv()],
      "Mona, Reese": [0.042, 0.042, StatModels.emptyIndiv()],
      "Hart, Hakim": [0.237, 0.0237, StatModels.emptyIndiv()],
      "Mitchell, Makhi": [0.264, 0.0264, StatModels.emptyIndiv()],
    } as Record<string, [number, number, IndivStatSet]>,
    playerToCol: {
      "Smith, Jalen": 0,
      "Cowan, Anthony": 1,
      "Wiggins, Aaron": 2,
      "Morsell, Darryl": 3,
      "Ayala, Eric": 4,
      "Scott, Donta": 5,
      "Lindo Jr., Ricky": 6,
      "Smith Jr., Serrel": 7,
    },
    colToPlayer: [
      "Smith, Jalen",
      "Cowan, Anthony",
      "Wiggins, Aaron",
      "Morsell, Darryl",
      "Ayala, Eric",
      "Scott, Donta",
      "Lindo Jr., Ricky",
      "Smith Jr., Serrel",
    ],
    avgEfficiency: 102.4,
    numPlayers: 8,
    numOffLineups: 31,
    numDefLineups: 31,
    offLineupPoss: 1351,
    defLineupPoss: 1349,
    priorInfo: {
      strongWeight: 0.5,
      noWeakPrior: false,
      useRecursiveWeakPrior: false,
      includeStrong: {},
      playersStrong: [
        { off_adj_ppp: 5.0 },
        { off_adj_ppp: 4.5 },
        { off_adj_ppp: 4.0 },
        { off_adj_ppp: 3.5 },
        { off_adj_ppp: 3.0 },
        { off_adj_ppp: 2.5 },
        { off_adj_ppp: 2.0 },
        { off_adj_ppp: 2.0 },
      ],
      playersWeak: [
        { off_adj_ppp: 5.0, def_adj_ppp: -5.0 },
        { off_adj_ppp: 4.5, def_adj_ppp: -4.5 },
        { off_adj_ppp: 4.0, def_adj_ppp: -4.0 },
        { off_adj_ppp: 3.5, def_adj_ppp: -3.5 },
        { off_adj_ppp: 3.0, def_adj_ppp: -3.0 },
        { off_adj_ppp: 2.5, def_adj_ppp: -2.5 },
        { off_adj_ppp: 2.0, def_adj_ppp: -2.0 },
        { off_adj_ppp: 1.5, def_adj_ppp: -1.5 },
      ],
      keyUsed: "value",
      basis: {
        off: 0,
        def: 0,
      },
    },
    // Extra fields:
    filteredLineups: (prefix: "off" | "def") => reducedFilteredLineups,
    teamInfo: {
      key: "teamInfo",
      doc_count: 1,
      off_adj_ppp: { value: 112.4 },
      def_adj_ppp: { value: 82.4 },
      off_poss: { value: 101 },
      def_poss: { value: 99 },
    } as LineupStatSet,
    config: {
      ...defaultRapmConfig,
      removalPct: 0.1,
    },
  } as RapmPlayerContext,
  //(defense picked to be more extreme so that it will trigger the "eff error too high" vs the "results stable")
};

describe("RapmUtils", () => {
  /** Inject old_values everywhere to test the calcs */
  const insertOldValues = (mutableLineup: any) => {
    _.toPairs(mutableLineup as Record<string, any>).forEach(
      ([key, stat]: [string, any]) => {
        if (LuckUtils.affectedFieldSet.has(key) && !_.isNil(stat.value)) {
          stat.old_value = stat.value;
          stat.override = "Test override";
        }
      },
    );
    return mutableLineup;
  };

  const lineupReport = {
    lineups: (
      sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets || []
    ).map(insertOldValues),
    avgOff: 100.0,
    error_code: "test",
  };

  const playersInfoByKey = _.chain(
    samplePlayerStatsResponse.responses[0].aggregations.tri_filter.buckets
      .baseline.player.buckets,
  )
    .map((p, ii) => {
      return {
        ...p,
        off_adj_rtg: { value: 5.0 - 0.5 * ii },
        def_adj_rtg: { value: -5.0 + ii * 0.5 },
      } as unknown as IndivStatSet;
    })
    .keyBy("key")
    .value();

  test("RapmUtils - buildPlayerContext", () => {
    // Build some dummy data with 2 extra players, one who we'll filter out
    // and the other we won't, but he'll get "chain filtered out"
    const dummyLineup1 = JSON.parse(
      JSON.stringify(lineupReport.lineups[0])
        .replace("JaSmith", "DuData")
        .replace("Smith, Jalen", "Data, Dummy")
        .replace("ErAyala", "OtPlayer")
        .replace("Ayala, Eric", "Player, Other"),
    );
    dummyLineup1.off_poss = { value: 50 };
    dummyLineup1.def_poss = { value: 50 };
    const dummyLineup2 = JSON.parse(
      JSON.stringify(lineupReport.lineups[0])
        .replace("ErAyala", "OtPlayer")
        .replace("Ayala, Eric", "Player, Other"),
    );
    dummyLineup2.off_poss = { value: 100 };
    dummyLineup2.def_poss = { value: 100 };
    const lineupReportWithExtra = {
      lineups: lineupReport.lineups.concat([dummyLineup1, dummyLineup2]),
      avgOff: lineupReport.avgOff,
      error_code: lineupReport.error_code,
    };

    const onOffReport = LineupUtils.lineupToTeamReport(lineupReportWithExtra);
    [0.0, 0.2].forEach((threshold) => {
      const results = RapmUtils.buildPlayerContext(
        onOffReport.players || [],
        lineupReportWithExtra.lineups || [],
        playersInfoByKey,
        {},
        100.0,
        "value",
        {
          ...defaultRapmConfig,
          removalPct: threshold,
        },
      );
      expect(
        _.omit(results, ["filteredLineups", "teamInfo"]),
      ).toMatchSnapshot();
      expect(results.filteredLineups("off").length).toEqual(
        threshold > 0.05 ? 5 : 5,
      ); //(filtering now v rare)
      expect(results.teamInfo.off_poss.value).toEqual(
        threshold > 0.05 ? 959 : 959,
      );
    });
  });

  test("RapmUtils - calcPlayerWeights", () => {
    [0.0, 2.0].forEach((unbiasWeight) => {
      //(we don't really support unbiasWeight any more but keept his test for now)
      const onOffReport = LineupUtils.lineupToTeamReport(lineupReport);
      var context = RapmUtils.buildPlayerContext(
        onOffReport.players || [],
        lineupReport.lineups || [],
        playersInfoByKey,
        {},
        100.0,
        "value",
        {
          ...defaultRapmConfig,
          removalPct: 0.0,
        },
      );
      context.unbiasWeight = unbiasWeight;
      const results = RapmUtils.calcPlayerWeights(context);

      const tidyResults = (resMatrix: any) => {
        return resMatrix.map((val: number) => val.toFixed(3)).valueOf();
      };

      expect(tidyResults(results[0])).toEqual(
        _.filter(
          [
            ["0.704", "0.704", "0.704", "0.704", "0.704", "0.000"],
            ["0.511", "0.511", "0.511", "0.511", "0.000", "0.511"],
            ["0.493", "0.493", "0.493", "0.000", "0.493", "0.493"],
            ["2.000", "2.000", "2.000", "1.513", "1.478", "1.009"], //(extra row if adding unbiasing obs)
          ],
          (r, i) => unbiasWeight != 0 || i < 3,
        ),
      );
      expect(tidyResults(results[1])).toEqual(
        _.filter(
          [
            ["0.699", "0.699", "0.699", "0.699", "0.699", "0.000"],
            ["0.518", "0.518", "0.518", "0.518", "0.000", "0.518"],
            ["0.493", "0.493", "0.493", "0.000", "0.493", "0.493"],
            ["2.000", "2.000", "2.000", "1.514", "1.463", "1.023"], //(extra row if adding unbiasing obs)
          ],
          (r, i) => unbiasWeight != 0 || i < 3,
        ),
      );
    });
  });

  test("RapmUtils - calcLineupOutputs", () => {
    [-1, 0.5].forEach((strongWeight) => {
      const onOffReport = LineupUtils.lineupToTeamReport(lineupReport);
      const context = RapmUtils.buildPlayerContext(
        onOffReport.players || [],
        lineupReport.lineups || [],
        playersInfoByKey,
        {},
        100.0,
        "value",
        {
          ...defaultRapmConfig,
          priorMode: strongWeight,
          removalPct: 0.0,
        },
      );
      expect(context.priorInfo.basis).toEqual({
        off: 0,
        def: 0,
      });
      const adjustedBasisOffEff = 100.0 - 5 * context.priorInfo.basis.off;
      const adjustedBasisDefEff = 100.0 - 5 * context.priorInfo.basis.def;

      const adapativeWeights = (onOffReport.players || []).map((p) => 0.5);
      const results = RapmUtils.calcLineupOutputs(
        "adj_ppp",
        adjustedBasisOffEff,
        adjustedBasisDefEff,
        context,
        strongWeight < 0 ? adapativeWeights : undefined,
      );

      const tidyResults = (resMatrix: Array<Array<number>>) => {
        return resMatrix.map((arr) => {
          return arr.map((val) => val.toFixed(2));
        });
      };
      expect(tidyResults(results)).toEqual([
        strongWeight ? ["13.07", "5.84", "7.70"] : [],
        strongWeight ? ["-8.48", "-10.69", "-8.83"] : [],
      ]);
      const oldValResults = RapmUtils.calcLineupOutputs(
        "adj_ppp",
        adjustedBasisOffEff,
        adjustedBasisDefEff,
        context,
        strongWeight < 0 ? adapativeWeights : undefined,
        [false, true],
      );
      expect(tidyResults(oldValResults)).toEqual([
        strongWeight ? ["13.07", "5.84", "7.70"] : [],
        strongWeight ? ["-8.48", "-10.69", "-8.83"] : [],
      ]);
    });
  });

  test("RapmUtils - pickRidgeRegression", () => {
    const adapativeWeights1 = (
      semiRealRapmResults.testContext.colToPlayer || []
    ).map((p) => 0.5);
    const adapativeWeights2 = (
      semiRealRapmResults.testContext.colToPlayer || []
    ).map((p) => 0.2);
    [true, false].forEach((luckAdjusted) => {
      const [offResults, defResults] = RapmUtils.pickRidgeRegression(
        semiRealRapmResults.testOffWeights,
        semiRealRapmResults.testDefWeights,
        semiRealRapmResults.testContext,
        undefined,
        false,
        luckAdjusted ? "value" : "old_value",
        [
          luckAdjusted ? "old_value" : "value",
          luckAdjusted ? "old_value" : "value",
        ],
      );
      var testContext1 = _.cloneDeep(semiRealRapmResults.testContext);
      testContext1.priorInfo.strongWeight = -1;
      const [offResults1, defResults1] = RapmUtils.pickRidgeRegression(
        semiRealRapmResults.testOffWeights,
        semiRealRapmResults.testDefWeights,
        testContext1,
        adapativeWeights1,
        false,
        luckAdjusted ? "value" : "old_value",
        [
          luckAdjusted ? "old_value" : "value",
          luckAdjusted ? "old_value" : "value",
        ],
      );
      var testContext2 = _.cloneDeep(semiRealRapmResults.testContext);
      testContext2.priorInfo.strongWeight = -1;
      const [offResults2, defResults2] = RapmUtils.pickRidgeRegression(
        semiRealRapmResults.testOffWeights,
        semiRealRapmResults.testDefWeights,
        testContext2,
        adapativeWeights2,
        false,
        luckAdjusted ? "value" : "old_value",
        [
          luckAdjusted ? "old_value" : "value",
          luckAdjusted ? "old_value" : "value",
        ],
      );
      expect(offResults1).toEqual(offResults); //(same adaptive weights)
      expect(offResults2).not.toEqual(offResults); //(same adaptive weights)
      expect(defResults1).toEqual(defResults); //(adaptive weights not used)
      expect(defResults2).toEqual(defResults); //(adaptive weights not used)

      // Hand checked results, just checking nothing's broken with changes!

      expect(offResults.playerPossPcts.map((n) => n.toFixed(2))).toEqual([
        "0.97",
        "0.93",
        "0.82",
        "0.74",
        "0.73",
        "0.54",
        "0.15",
        "0.12",
      ]);
      expect(defResults.playerPossPcts.map((n) => n.toFixed(2))).toEqual([
        "0.97",
        "0.92",
        "0.82",
        "0.74",
        "0.73",
        "0.54",
        "0.15",
        "0.13",
      ]);

      expect([
        luckAdjusted,
        offResults.prevAttempts.map((o: any) => {
          return {
            l: o?.ridgeLambda?.toFixed(2),
            ex: o?.results?.[0]?.toFixed(2),
          };
        }),
      ]).toEqual(
        // 3 iterations (both branches now produce same prevAttempts ex values)
        [
          luckAdjusted,
          [
            { l: "1.10", ex: "2.83" },
            { ex: "2.87", l: "1.32" },
            { ex: "2.89", l: "1.54" },
          ],
        ],
      );
      expect(offResults.ridgeLambda.toFixed(3)).toEqual("1.536");
      expect(
        _.take(
          offResults.rapmAdjPpp.map((n) => n.toFixed(2)),
          3,
        ),
      ).toEqual(["2.89", "2.79", "2.67"]);
      expect(
        _.take(
          offResults.rapmRawAdjPpp.map((n) => n.toFixed(2)),
          3,
        ),
      ).toEqual(["4.81", "4.71", "4.59"]);
      expect([
        luckAdjusted,
        defResults.prevAttempts.map((o: any) => {
          return {
            l: o?.ridgeLambda?.toFixed(2),
            ex: o?.results?.[0]?.toFixed(2),
          };
        }),
      ]).toEqual(
        // 3 iterations
        [
          luckAdjusted,
          [
            { l: "1.10", ex: "-5.86" },
            { l: "1.32", ex: "-5.73" },
            { l: "1.54", ex: "-5.64" },
          ],
        ],
      );
      expect(defResults.ridgeLambda.toFixed(3)).toEqual("1.536");
      expect(
        _.take(
          defResults.rapmAdjPpp.map((n) => n.toFixed(2)),
          3,
        ),
      ).toEqual(["-5.64", "-4.22", "-4.94"]);
      expect(
        _.take(
          defResults.rapmRawAdjPpp.map((n) => n.toFixed(2)),
          3,
        ),
      ).toEqual(["-5.06", "-3.70", "-4.48"]);
    });
  });

  test("RapmUtils - injectRapmIntoPlayers", () => {
    [true, false].forEach((luckAdjusted) => {
      const [offResults, defResults] = RapmUtils.pickRidgeRegression(
        semiRealRapmResults.testOffWeights,
        semiRealRapmResults.testDefWeights,
        semiRealRapmResults.testContext,
        undefined,
        false,
        luckAdjusted ? "value" : "old_value",
        [
          luckAdjusted ? "old_value" : "value",
          luckAdjusted ? "old_value" : "value",
        ],
        //^(note diag=true|false gives a different answer because the data is malformed so picks a really early lambda)
      );
      const onOffReport = LineupUtils.lineupToTeamReport(lineupReport);

      // Check that removed players are handled
      const players = [
        { playerId: "Mitchell, Makhel" } as PlayerOnOffStats,
      ].concat(onOffReport.players || []);
      if (luckAdjusted) {
        //(needs to be run in normal mode first)
        RapmUtils.injectRapmIntoPlayers(
          players,
          offResults,
          defResults,
          {},
          semiRealRapmResults.testContext,
          undefined,
          ["value", "old_value"],
          "value",
        );
        RapmUtils.injectRapmIntoPlayers(
          players,
          offResults,
          defResults,
          {},
          semiRealRapmResults.testContext,
          undefined,
          ["old_value", "old_value"],
          "old_value",
        );
      } else {
        //(not luck adjusted readKeyValue can be either value or old value, it doesn't matter)
        RapmUtils.injectRapmIntoPlayers(
          players,
          offResults,
          defResults,
          {},
          semiRealRapmResults.testContext,
          undefined,
          ["value", "value"],
          "value",
        );
      }

      const keyToCheck = luckAdjusted ? "old_value" : "value";
      const resultsToExamine = _.chain(players || [])
        .map((p) => p.rapm || { noRapm: true })
        .take(2)
        .map((p: any) => {
          return _.chain(p)
            .pick([
              "noRapm",
              "key",
              "off_adj_ppp",
              "def_adj_ppp",
              "off_poss",
              "def_poss",
              "off_to",
              "def_to",
            ])
            .mapValues((v: any) =>
              (v || {}).hasOwnProperty("value")
                ? (v?.[keyToCheck] || 0).toFixed(2)
                : v,
            )
            .value();
        })
        .value();

      expect([luckAdjusted, ...resultsToExamine]).toEqual([
        luckAdjusted,
        {
          noRapm: true,
        },
        {
          def_adj_ppp: "-4.94",
          def_poss: luckAdjusted ? "0.00" : "99.00", //(these don't get an old_value)
          def_to: luckAdjusted ? "0.00" : "0.01",
          key: "RAPM Wiggins, Aaron",
          off_adj_ppp: "2.67",
          off_poss: luckAdjusted ? "0.00" : "101.00",
          off_to: "0.00",
        },
      ]);
    });
  });

  test("RapmUtils - calcCollinearityDiag", () => {
    // Test matrix

    // Result matrix
    const test = matrix([
      [1, 0, 1],
      [-1, -2, 0],
      [0, 1, -1],
      [0.5, 0.5, 0.5],
    ]);

    const dummyContext = {
      avgEfficiency: 100.0,
      removedPlayers: {},
      playerToCol: { PlayerB: 1, PlayerC: 2, PlayerA: 0 },
      colToPlayer: ["PlayerA", "PlayerB", "PlayerC"],
      filteredLineups: (prefix: "off" | "def") => [],
      teamInfo: {} as LineupStatSet,
      numPlayers: 3,
      numOffLineups: 4,
      numDefLineups: 4,
      offLineupPoss: 10,
      defLineupPoss: 9,
      unbiasWeight: 0,
      priorInfo: {
        strongWeight: 0.5,
        noWeakPrior: false,
        useRecursiveWeakPrior: false,
        includeStrong: {},
        playersWeak: [],
        playersStrong: [],
        keyUsed: "value" as "value",
        basis: { off: 0, def: 0 },
      },
      config: {
        ...defaultRapmConfig,
        removalPct: 0.0,
      },
    };

    const results = RapmUtils.calcCollinearityDiag(test, dummyContext);

    const tidyResults = (t: RapmPreProcDiagnostics) => {
      return {
        lineupCombos: t.lineupCombos.map((val) => val.toFixed(4)),
        playerCombos: _.chain(t.playerCombos)
          .mapValues((playerRow) => {
            return playerRow.map((val) => val.toFixed(4));
          })
          .value(),
        correlMatrix: t.correlMatrix.valueOf().map((row: number[]) => {
          return row.map((n: number) => n.toFixed(4));
        }),
        adaptiveCorrelWeights: t.adaptiveCorrelWeights.map((val) =>
          val.toFixed(2),
        ),
      };
    };

    // (Results from https://www.mathworks.com/help/matlab/ref/double.svd.html using test)
    // Correlmatrix via:
    // A = [ 1, 0, 1 ;  -1, -2, 0 ; 0, 1, -1 ;  0.5, 0.5, 0.5 ]
    // corr(A, A)

    expect(tidyResults(results)).toEqual({
      lineupCombos: ["9.4618", "1.4154", "1.0000"],
      playerCombos: {
        PlayerA: ["0.9852", "0.0103", "0.0045"],
        PlayerB: ["0.9401", "0.0081", "0.0519"],
        PlayerC: ["0.9524", "0.0476", "0.0000"],
      },
      correlMatrix: [
        ["1.0000", "0.6865", "0.5429"],
        ["0.6865", "1.0000", "-0.2041"],
        ["0.5429", "-0.2041", "1.0000"],
      ],
      adaptiveCorrelWeights: ["0.25", "0.07", "0.06"],
    });
  });
  test("RapmUtils - calcCollinearityDiag (pseudo-real data)", () => {
    const lineupReportFake = {
      lineups: lineupReport.lineups.concat(lineupReport.lineups),
      avgOff: lineupReport.avgOff,
      error_code: lineupReport.error_code,
    };
    const onOffReport = LineupUtils.lineupToTeamReport(lineupReportFake);
    const context = RapmUtils.buildPlayerContext(
      onOffReport.players || [],
      lineupReportFake.lineups || [],
      playersInfoByKey,
      {},
      100.0,
    );
    const weights = RapmUtils.calcPlayerWeights(context);
    const results = RapmUtils.calcCollinearityDiag(weights[0], context);

    // Just check it doesn't crash and looks sane
    const logResults = false;
    if (logResults) {
      console.log(JSON.stringify(results));
    }
  });
});
