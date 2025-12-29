// Utils:
import _ from "lodash";
// @ts-ignore
import { erf } from "mathjs";

import {
  absolutePositionFixes,
  relativePositionFixes,
  RelativePositionFixRule,
} from "./PositionalManualFixes";
import { IndivPosInfo, PlayerCodeId } from "../StatModels";

/** (just to make copy/pasting between colab and this code easier)*/
const array = (v: number[]) => {
  return v;
};

const sqrt2 = Math.sqrt(2);

/** Positional analysis module */
export class PositionUtils {
  /** The LDA intercepts */
  static readonly positionFeatureInit = [
    -2.82375823, -2.41283573, -3.74982844, -8.98755013, -3.23442276,
  ];

  /** List of the fields used in the positional confidence vectors - note need to be prefixed with pos_ */
  static readonly tradPosList = [
    "pos_pg",
    "pos_sg",
    "pos_sf",
    "pos_pf",
    "pos_c",
  ];

  /** triples in the form [ fieldname, scale, weights-from-ML ] */
  static readonly positionFeatureWeights = [
    // Ball handling
    [
      "calc_ast_tov",
      1.0,
      array([0.08281269, 0.09093907, -0.37973552, -0.67240486, 0.5964297]),
    ],
    [
      "off_assist",
      100.0,
      array([0.15829941, 0.02598234, -0.06537337, -0.05021328, -0.12142258]),
    ],
    [
      "off_to",
      100.0,
      array([-0.00680258, 0.0051497, -0.02123889, -0.03861639, 0.04709196]),
    ],
    [
      "calc_assist_per_fga",
      100.0, //(expressed as %)
      array([0.01429017, -0.00313073, 0.0082461, 0.01833772, -0.0319402]),
    ],
    // Shot selection
    [
      "off_3pr",
      100.0,
      array([0.02713631, 0.0218532, -0.00223302, 0.00081636, -0.06555841]),
    ],
    [
      "off_2pmidr",
      100.0,
      array([-0.0010662, -0.00969839, -0.01555429, -0.04862983, 0.06485701]),
    ],
    [
      "off_2primr",
      100.0,
      array([0.01545738, 0.01531782, -0.00856427, -0.03075521, -0.01459524]),
    ],
    [
      "off_ftr",
      100.0,
      array([0.00270944, 0.00083536, 0.00011253, -0.01560428, 0.00500472]),
    ],
    // Shot making ability
    [
      "calc_three_relative",
      100.0,
      array([0.00753295, 0.00814222, 0.00794373, 0.01847985, -0.04255395]),
    ],
    [
      "calc_mid_relative",
      100.0,
      array([0.00281905, 0.00377201, 0.00400989, 0.01991123, -0.02632626]),
    ],
    [
      "calc_rim_relative",
      100.0,
      array([-0.00995088, 0.00740773, 0.01560057, 0.03010704, -0.03693076]),
    ],
    [
      "calc_ft_relative_inv",
      100.0,
      array([-0.01016761, -0.0056131, -0.00079665, -0.00547513, 0.02533069]),
    ],
    // Rebounding and defense
    [
      "def_to",
      100.0, //(used as the field for steals)
      array([0.8133556, 0.54765371, -0.02580977, -0.68504559, -1.39476509]),
    ],
    [
      "off_orb",
      100.0,
      array([-0.26888945, -0.21892123, 0.07832771, 0.26210603, 0.42330573]),
    ],
    [
      "def_orb",
      100.0,
      array([-0.23799504, -0.07938086, 0.10442655, 0.21672752, 0.15512722]),
    ],
    [
      "def_2prim",
      100.0, //(used as the field for blocks)
      array([-0.29122875, -0.22875385, -0.09758256, 0.20918001, 0.69598967]),
    ],
    [
      "def_ftr",
      100.0, //(this is FC/(50*100), which isn't _quite_ FC/40m but close enough given these low numbers)
      array([-0.08827297, -0.20674559, -0.01827295, 0.22834328, 0.3239175]),
    ],
  ] as Array<[string, number, number[]]>;

  static readonly positionFeatureAverages = {
    calc_ast_tov: array([
      1.71771567, 1.17932242, 0.79621661, 0.74306857, 0.51254529,
    ]),
    off_assist: array([
      24.86785714, 13.05019881, 9.63812274, 8.73104467, 6.37806666,
    ]),
    off_to: array([
      22.45299921, 18.04530996, 18.44424188, 17.58870432, 20.07028442,
    ]),
    calc_assist_per_fga: array([
      51.81818417, 24.21690841, 17.89512103, 15.10389804, 13.50735024,
    ]),

    off_3pr: array([
      40.5474501, 49.22191966, 28.19592525, 33.62534936, 1.68639513,
    ]),
    off_2pmidr: array([
      28.41474701, 24.5276034, 31.24101352, 29.92330697, 38.24966097,
    ]),
    off_2primr: array([
      30.86647093, 26.14022775, 40.36403453, 36.10765493, 59.75727503,
    ]),
    off_ftr: array([
      38.30457774, 30.19707211, 39.07963899, 32.61391657, 49.06417728,
    ]),

    calc_three_relative: array([
      105.20372914, 103.32803494, 94.36055369, 110.83302518, 10.55692479,
    ]),
    calc_mid_relative: array([
      72.5681835, 69.11712719, 68.56060901, 72.54753109, 67.48685787,
    ]),
    calc_rim_relative: array([
      109.28254527, 115.53768733, 123.82853889, 125.66705542, 122.39476683,
    ]),
    calc_ft_relative_inv: array([
      64.98897552, 68.39666748, 74.86478424, 75.10386658, 93.1631546,
    ]),

    def_to: array([2.38133386, 1.92994759, 1.75611913, 1.37696567, 1.37380911]),
    off_orb: array([
      2.10153907, 2.86361829, 6.82231047, 7.9960502, 10.19931949,
    ]),
    def_orb: array([
      9.06756117, 10.43093259, 15.15236462, 18.20837948, 17.1899494,
    ]),
    def_2prim: array([
      0.46286504, 0.79057473, 1.77850181, 3.52768549, 4.76859187,
    ]),
    def_ftr: array([
      3.13113654, 3.08755648, 3.86938628, 4.45762274, 5.06942942,
    ]),
  } as Record<string, number[]>;

  static readonly heightMeanStds = [
    { mean: 73.57716289697129, std: 2.5561436676424854 },
    { mean: 75.23626157179437, std: 2.539520215232971 },
    { mean: 77.73867983130089, std: 2.286685273859796 },
    { mean: 79.14888834651121, std: 2.0930557964524996 },
    { mean: 80.2680159415085, std: 2.014906878530024 },
  ];

  static readonly averageScoresByPos = _.chain(
    PositionUtils.positionFeatureWeights
  )
    .transform(
      (acc: number[], feat_scale_weights: [string, number, number[]]) => {
        const feat = feat_scale_weights[0];
        const scale = feat_scale_weights[1];
        const weights = feat_scale_weights[2];
        const fieldVal = PositionUtils.positionFeatureAverages[feat];

        weights.forEach((weight, index) => {
          const sumPart = fieldVal[index] * weight;
          acc[index] += sumPart; //(factor to make the scores render nicely)
        });
      },
      _.clone(PositionUtils.positionFeatureInit)
    )
    .map((v, i) => [PositionUtils.tradPosList[i], { value: 0.1 * v }])
    .fromPairs()
    .value();

  /** Some shot quality stats on small samples can skew the stats badly
      We'll regress samples <20 to the average for that position
  */
  static regressShotQuality(
    stat: number,
    pos: number,
    feat: string,
    player: Record<string, any>
  ) {
    if (
      feat == "calc_three_relative" ||
      feat == "calc_rim_relative" ||
      feat == "calc_mid_relative"
    ) {
      const volumeIndex = {
        calc_three_relative: "total_off_3p_attempts",
        calc_mid_relative: "total_off_2pmid_attempts",
        calc_rim_relative: "total_off_2prim_attempts",
      };
      const totalVolume = player.total_off_fga.value || 0;
      const regressVol = Math.max(0.25 * totalVolume, 15); //(for each position, regress to the position's average if you shoot under 25% of your shots from there)
      const regressVolInv = 1.0 / regressVol;
      const volume = player[volumeIndex[feat]]?.value || 0;

      if (volume < regressVol) {
        // Special case: as a C if you've only taken 0-2 3s and hit none of them, we'll keep that
        // at 0 to avoid widespread changes
        if (
          pos == 4 &&
          volume < 3 &&
          stat == 0 &&
          feat == "calc_three_relative"
        ) {
          return stat;
        } else {
          const av = 0.01 * PositionUtils.positionFeatureAverages[feat][pos];
          return regressVolInv * (volume * stat + (regressVol - volume) * av);
        }
      } else {
        //(enough samples, leave as is)
        return stat;
      }
    } else {
      return stat;
    }
  }

  /** Returns a vector of 5 elements representing the confidence that the player
      can play that position (0=PG, 1=SG, 4=SF, 4=PF, 5=C)
  */
  static buildPositionConfidences(
    player: Record<string, any>,
    height_in: number | undefined
  ): [Record<string, number>, any] {
    const posList = PositionUtils.tradPosList;

    const calculated = {
      calc_ast_tov:
        player.total_off_assist.value / (player.total_off_to.value || 1),
      calc_three_relative:
        (1.5 * player.off_3p.value) / (player.off_efg.value || 1),
      calc_mid_relative: player.off_2pmid.value / (player.off_efg.value || 1),
      calc_rim_relative: player.off_2prim.value / (player.off_efg.value || 1),
      calc_assist_per_fga:
        player.total_off_assist.value / (player.total_off_fga.value || 1),
      //=eFG/FT%, (where FT% = FTM/FTA)
      calc_ft_relative_inv:
        (player.off_efg.value * player.total_off_fta.value) /
        (player.total_off_ftm.value || 1),
    } as Record<string, number>;

    const scores = _.transform(
      PositionUtils.positionFeatureWeights,
      (acc: number[], feat_scale_weights: [string, number, number[]]) => {
        const feat = feat_scale_weights[0];
        const scale = feat_scale_weights[1];
        const weights = feat_scale_weights[2];
        const fieldVal = _.startsWith(feat, "calc_")
          ? calculated[feat] || 0
          : player[feat]?.value || 0;

        weights.forEach((weight, index) => {
          const regressedFieldVal = PositionUtils.regressShotQuality(
            fieldVal,
            index,
            feat,
            player
          );
          const sumPart = regressedFieldVal * scale * weight;
          acc[index] += sumPart;
        });

        // (used for debugging - shouldn't be needed moving forward)
        //console.log(`${player.key}: ${pos} ${scale} ${weights}  - ${fieldVal} ... ${acc}`);
      },
      _.clone(PositionUtils.positionFeatureInit)
    );

    const addPosAndScale = (v: number[], scale: number) => {
      return _.chain(v)
        .map((s: number, i: number) => [posList[i], s * scale])
        .fromPairs()
        .value();
    };
    const maxScore = _.max(scores) || 0;
    const confsNoHeight = scores.map((s: number) => Math.exp(s - maxScore));
    const maxConfNoHeightInv = 1.0 / (_.sum(confsNoHeight) || 1);
    const confsNoHeightScaled = confsNoHeight.map(
      (s: number) => s * maxConfNoHeightInv
    );

    const confsScaled = height_in
      ? PositionUtils.incorporateHeight(height_in, confsNoHeightScaled)
      : confsNoHeightScaled;

    return [
      addPosAndScale(confsScaled, 1.0),
      {
        scores: addPosAndScale(scores, 0.1), //(0.1 == factor to make the scores render nicely)
        confsNoHeight: height_in
          ? addPosAndScale(confsNoHeightScaled, 1.0)
          : undefined,
        calculated: calculated,
      },
    ];
  }

  /** See https://www.wolframalpha.com/input/?i=cdf+normal+distribution */
  private static cdf(val: number, mean: number, std: number): number {
    return 0.5 * (1 + erf((val - mean) / (sqrt2 * std)));
  }

  /** Incorporates height - see build_height_adj_probs in https://hoop-explorer.blogspot.com/2020/05/classifying-college-basketball.html */
  static incorporateHeight(height_in: number, confs: number[]): number[] {
    const thresh = 1;
    const heightDampening = sqrt2; //(increase variance to make the effect smaller - empirically this seems a touch aggro)
    const mutableState = { sumProduct: 0, scores: [0, 0, 0, 0, 0] };
    _.transform(
      confs,
      (acc, v, i) => {
        const mean = PositionUtils.heightMeanStds[i]!.mean!;
        const std = heightDampening * PositionUtils.heightMeanStds[i]!.std!;
        const newScore =
          acc.scores[i]! +
          PositionUtils.cdf(height_in + thresh, mean, std) -
          PositionUtils.cdf(height_in - thresh, mean, std);
        acc.sumProduct = acc.sumProduct + newScore * v;
        acc.scores[i]! = newScore;
      },
      mutableState
    );

    return mutableState.scores.map(
      (v, i) => (confs[i]! * v) / (mutableState.sumProduct || 1)
    );
  }

  /** Ballhandlers, All Guards, All Wings, All 4s, All 5s, Frontcourt */
  static readonly positionGroupings = ["BH", "G", "W", "PF", "C", "FC"];

  /** Maps position ids to position groupings */
  static readonly positionsToGroup: Record<string, string[]> = {
    PG: ["BH", "G"],
    "s-PG": ["BH", "G"],
    CG: ["BH", "G"],
    WG: ["G", "W"],
    "G?": ["G"],
    WF: ["W", "PF", "FC"],
    "S-PF": ["PF", "FC"],
    "PF/C": ["PF", "C", "FC"],
    C: ["C", "FC"],
  };

  /** Description of the different roles */
  static readonly idToPosition = {
    PG: "Pure PG",
    "s-PG": "Scoring PG",
    CG: "Combo Guard",
    WG: "Wing Guard",
    WF: "Wing Forward",
    "S-PF": "Stretch PF",
    "PF/C": "Power Forward/Center",
    C: "Center",
    "G?": "Unknown - probably Guard",
    "F/C?": "Unknown - probably Forward/Center",
  } as Record<string, string>;

  /** Tag the player with a position string given the confidences */
  static buildPosition(
    confs: Record<string, number>,
    confsNoHeight: Record<string, number> | undefined,
    player: Record<string, any>,
    teamSeason: string
  ): [string, string] {
    const override = absolutePositionFixes[teamSeason]?.[player.key];
    if (override) {
      // Look for overrides
      const [manualPos, diag] = PositionUtils.buildPosition(
        confs,
        confsNoHeight,
        player,
        ""
      );
      return [
        override.position,
        `Override from [${manualPos}] which matched rule [${diag}]`,
      ];
    } else {
      const posList = PositionUtils.tradPosList;

      // Get the class with the highest prio
      const maxPos = _.maxBy(posList, (pos: string) => confs[pos] || 0) || 0;

      const assistRate = player?.off_assist?.value || 0;
      const minAstRate = 0.09; // (less than this and you can't be a PG!)
      const threeRate = player?.off_3pr?.value || 0;
      const minThreeRate = 0.2;

      const fwdConfSum = confs["pos_sf"] + confs["pos_pf"] + confs["pos_c"];

      const maybeIgnoreHeight = (inPosInfo: [string, string, string]) => {
        if (confsNoHeight) {
          const posWithHeight = inPosInfo[0];
          const [posNoHeight, diagNoHeight] = PositionUtils.buildPosition(
            confsNoHeight,
            undefined,
            player,
            teamSeason
          );
          if (
            (posNoHeight == "s-PG" && posWithHeight == "PG") ||
            (posNoHeight == "PG" && posWithHeight == "s-PG")
          ) {
            return [
              posNoHeight,
              `${diagNoHeight} ('PG' vs 's-PG', ignore height)`,
              inPosInfo[2],
            ];
          } else {
            return inPosInfo;
          }
        } else {
          return inPosInfo;
        }
      };

      // Just do the rules as a big bunch of if statements
      const getPosition = () => {
        if (confs["pos_pg"] > 0.85) {
          return assistRate >= minAstRate
            ? maybeIgnoreHeight(["PG", `(P[PG] >= 85%)`, "G?"])
            : [
                "WG",
                `(PG:)(P[PG] >= 85%) BUT (AST%[${(assistRate * 100).toFixed(
                  1
                )}] < 9%)`,
                "G?",
              ];
        } else if (confs["pos_pg"] > 0.5) {
          return assistRate >= minAstRate
            ? maybeIgnoreHeight(["s-PG", `(P[PG] >= 50%)`, "G?"])
            : [
                "WG",
                `(pG:)(P[PG] >= 50%) BUT (AST%[${(assistRate * 100).toFixed(
                  1
                )}] < 9%)`,
                "G?",
              ];
        } else if (maxPos == posList[0]) {
          return assistRate >= minAstRate
            ? ["CG", `(Max[P] == PG)`, "G?"]
            : [
                "WG",
                `(CG:)(Max[P] == PG) BUT (AST%[${(assistRate * 100).toFixed(
                  1
                )}] < 9%)`,
                "G?",
              ];
        } else if (maxPos == posList[1] && confs["pos_pg"] >= fwdConfSum) {
          return assistRate >= minAstRate
            ? ["CG", `(Max[P] == SG) AND (P[PG] >= P[SF] + P[PF] + P[C])`, "G?"]
            : [
                "WG",
                `(CG:)(Max[P] == SG) AND (P[PG] >= P[SF] + P[PF] + P[C]) BUT (AST%[${(
                  assistRate * 100
                ).toFixed(1)}] < 9%)`,
                "G?",
              ];
        } else if (maxPos == posList[1] && confs["pos_pg"] < fwdConfSum) {
          return [
            "WG",
            `(Max[P] == SG) AND (P[PG] < P[SF] + P[PF] + P[C])`,
            "G?",
          ];
        } else if (
          maxPos == posList[2] &&
          confs["pos_pg"] + confs["pos_sg"] >= confs["pos_pf"] + confs["pos_c"]
        ) {
          return [
            "WG",
            `(Max[P] == SF) AND (P[PG] + P[SG] >= P[PF] + P[C])`,
            "G?",
          ];
        } else if (maxPos == posList[2]) {
          return [
            "WF",
            `(Max[P] == SF) AND (P[PG] + P[SG] < P[PF] + P[C])`,
            "F/C?",
          ];
        } else if (confs["pos_pf"] >= 0.85) {
          return ["PF/C", `(P[PF] >= 85%)`, "F/C?"];
        } else if (
          maxPos == posList[3] &&
          confs["pos_pg"] + confs["pos_sg"] + confs["pos_sf"] >= confs["pos_c"]
        ) {
          return threeRate >= minThreeRate
            ? [
                "S-PF",
                `(Max[P] == PF) AND (P[PG] + P[SG] + P[SF] >= P[C])`,
                "F/C?",
              ]
            : [
                "PF/C",
                `(S4:)(Max[P] == PF) AND (P[PG] + P[SG] + P[SF] >= P[C]) BUT 3PR%[${(
                  threeRate * 100
                ).toFixed(1)}] < 20%`,
                "F/C?",
              ];
        } else if (confs["pos_c"] >= 0.85) {
          return ["C", `(P[C] >= 85%)`, "F/C?"];
        }
        //(else fallback)
        return [
          "PF/C",
          `(Max[P] == C) OR ((Max[P] == PF) AND (P[PG] + P[SG] + P[SF] < P[C]))`,
          "F/C?",
        ];
      };
      const [pos, diag, fallbackPos] = getPosition();

      const usage = player?.off_usage?.value || 0;
      const poss = player?.off_team_poss?.value || 0;
      const effectivePoss = poss * usage;

      const posFromStats = effectivePoss < 25.0 ? fallbackPos : pos;

      const [posWithRoster, posWithRosterInfo] = PositionUtils.usingRosterPos(
        posFromStats,
        player.roster?.pos
      );
      const extraInfo = posWithRosterInfo
        ? `${posWithRosterInfo}. From stats: `
        : "";

      if (effectivePoss < 25.0) {
        // Too few possessions to make an accurate determination
        return [
          player.roster?.role || posWithRoster,
          `${extraInfo}Too few used possessions [${effectivePoss.toFixed(
            1
          )}]=[${poss.toFixed(0)}]*[${(usage * 100).toFixed(1)}]% < [25.0]. ` +
            `Would have matched [${pos}] from rule [${diag}]`,
        ];
      } else {
        return [posWithRoster, `${extraInfo}${diag}`];
      }
    }
  }

  /** Corrects dubious categorizations from the roster metadata */
  static usingRosterPos(
    posClass: string,
    rosterPos: string | undefined
  ): [string, string | undefined] {
    if (rosterPos) {
      // Handle unsure cases:
      if (posClass == "G?" || posClass == "F/C?") {
        if (rosterPos == "G") {
          return ["G?", "Based on roster info"];
        } else if (rosterPos == "C") {
          //(if someone's roster pos is a C then they are always a C!)
          return ["C", "Based on roster info"];
        } else {
          return ["F/C?", "Based on roster info"];
        }
      } else {
        // Handle the algo being obviously wrong:
        const score = PositionUtils.posClassToScore(posClass);

        if (score < 7000 && rosterPos == "C") {
          return [
            "PF/C",
            `Roster info says 'C', stats say [${posClass}] - compromize at 'PF/C'`,
          ];
        } else if (score < 4000 && rosterPos == "F") {
          return [
            "WG",
            `Roster info says 'F', stats say [${posClass}] - compromize at 'WG'`,
          ];
        } else if (score == 4000 && rosterPos == "F") {
          return ["WF", "Roster info says 'F', stats say 'WG'"];
        } else if (score == 5000 && rosterPos == "G") {
          return ["WG", "Roster info says 'G', stats say 'WF'"];
        } else if (score > 5000 && rosterPos == "G") {
          return [
            "WF",
            `Roster info says 'G', stats say [${posClass}] - compromize at 'WF'`,
          ];
        } else {
          return [posClass, undefined];
        }
      }
    } else return [posClass, undefined];
  }

  /** We usee the positional class of the player as the most important */
  static posClassToScore(posClass: string) {
    switch (posClass) {
      case "PG":
        return 1000;
      case "s-PG":
        return 2000;
      case "CG":
        return 3000;
      case "G?":
        return 3000;
      case "WG":
        return 4000;
      case "WF":
        return 5000;
      case "S-PF":
        return 6000;
      case "PF/C":
        return 7000;
      case "F/C?":
        return 7000;
      case "C":
        return 8000;
      default:
        return 4000; //(won't happen)
    }
  }

  /** Allows me to swap lineups around by hand when someone complains */
  private static applyRelativePositionalOverrides(
    results: PlayerCodeId[],
    teamSeason: string,
    recurseCount: number = 0
  ): PlayerCodeId[] {
    const rules = relativePositionFixes[teamSeason];
    if (rules && recurseCount < rules.length) {
      const ruleSet = _.find(rules, (rule: RelativePositionFixRule) => {
        return _.every(rule.key, (key: string | undefined, index: number) => {
          return key == undefined || key == results[index].code;
        });
      });
      if (ruleSet) {
        // Matching rule
        return PositionUtils.applyRelativePositionalOverrides(
          results.map((val: { code: string; id: string }, index: number) => {
            const changeRule = ruleSet.rule[index];
            if (changeRule == undefined) {
              return val;
            } else if (typeof changeRule == "number") {
              return results[(changeRule as number) - 1];
            } else {
              return changeRule;
            }
          }),
          teamSeason,
          recurseCount + 1
        ); //(if we matched >0, we might need to match again)
      } else {
        // No rules matched
        return results;
      }
    } else {
      // This team/season has no overrides
      return results; // (return unchanged)
    }
  }

  /** Takes lineup in form X1_X2_X3_X4_X5 and returns an array of Xi ordered by position and some info for tooltips */
  static orderLineup(
    playerCodesAndIds: PlayerCodeId[],
    playersById: Record<string, IndivPosInfo>,
    teamSeason: string
  ): PlayerCodeId[] {
    const playerIdToPlayerCode = _.fromPairs(
      playerCodesAndIds.map((codeId: { code: string; id: string }) => [
        codeId.id,
        codeId.code,
      ])
    );

    const playerIds = _.keys(playerIdToPlayerCode);
    const init = -100000;
    const mutableScores = [init, init, init, init, init]; //TODO use fill heree, make this small number
    const mutableBestFits = [-1, -1, -1, -1, -1]; //(indices of "winning" player)
    const playerInfos = playerIds.map((pid: string) => playersById[pid]);

    /** Fit a player to their best position, refitting recursively any player dislodged */
    const fitPlayer = (pid: string, plIndex: number) => {
      const posClass = playerInfos[plIndex]?.posConfidences || [0, 0, 0, 0, 0];
      //(require for this to be injected by the calling function)
      const posClassScore = PositionUtils.posClassToScore(
        playerInfos[plIndex]?.posClass || ""
      );
      // (^ basically this is the dominating scoring factor, the others are just within position classes)
      const pgScore = 3 * posClass[0] + posClass[1];
      const postScore = 3 * posClass[4] + posClass[3];
      const backcourtScore = posClass[0] + posClass[1];
      const frontcourtScore = posClass[4] + posClass[3];

      const plScores = [
        //(could do better here?)
        [pgScore - 2 * frontcourtScore - posClassScore, 0], //PG
        [postScore - 2 * backcourtScore + posClassScore, 4], //C
        [backcourtScore - frontcourtScore - posClassScore, 1], //SG
        [frontcourtScore - backcourtScore + posClassScore, 3], //PF
        [0, 2], // SF is fallback
      ] as [number, number][];

      _.takeWhile(plScores, ([score, scorePos]: [number, number]) => {
        if (score > mutableScores[scorePos]) {
          const prevBestFit = mutableBestFits[scorePos];
          if (prevBestFit >= 0) {
            //refit the player being replaced
            fitPlayer(playerIds[prevBestFit], prevBestFit);
          }
          mutableBestFits[scorePos] = plIndex;
          mutableScores[scorePos] = score;
          return false;
        } else {
          return true; //(keep going)
        }
      });
    };
    playerIds.forEach((pid: string, plIndex: number) => {
      fitPlayer(pid, plIndex);
    });
    return PositionUtils.applyRelativePositionalOverrides(
      mutableBestFits.map((index: number) => {
        const playerId = playerIds[index];
        return { code: playerIdToPlayerCode[playerId], id: playerId };
      }),
      teamSeason
    );
  }

  /** Decomposes a filter string into positionally aware +ve and -ve filters */
  static buildPositionalAwareFilter(
    filterStr: string
  ): [
    { filter: string; pos: number[] }[],
    { filter: string; pos: number[] }[],
    boolean
  ] {
    var separator = "!!!";
    _.takeWhile([";", "/", ","], (sep) => {
      if (filterStr.indexOf(sep) >= 0) {
        separator = sep;
      }
      return separator == "!!!";
    });

    var hasPosition = false;
    const decomp = (filterStr: string) => {
      const matchInfo = /([^=]+)(?:=(([a-zA-Z1-5+]+)))?/.exec(filterStr);
      const filter = matchInfo?.[1];
      if (filter) {
        const pos = _.flatMap((matchInfo?.[2] || "").split("+"), (s) => {
          switch (_.trim(s.toLowerCase())) {
            case "1":
            case "pg":
              return [0];
            case "2":
            case "sg":
              return [1];
            case "3":
            case "sf":
              return [2];
            case "4":
            case "pf":
              return [3];
            case "5":
            case "c":
              return [4];
          }
          return [];
        });
        hasPosition = hasPosition || !_.isEmpty(pos);
        return [{ filter: filter.toLowerCase(), pos }];
      } else {
        return [];
      }
    };
    // Basic decomposition:
    const filterFragments = filterStr
      .split(separator)
      .map((fragment) => _.trim(fragment))
      .filter((fragment) => fragment?.[0] != "[") //(use [key] to filter on aggregation keys instead of raw lineups)
      .filter((fragment) => (fragment ? true : false));
    const filterFragmentsPve = filterFragments.filter(
      (fragment) => fragment[0] != "-"
    );
    const filterFragmentsNve = filterFragments
      .filter((fragment) => fragment[0] == "-")
      .map((fragment) => fragment.substring(1));

    return [
      _.flatMap(filterFragmentsPve, (s) => decomp(s)),
      _.flatMap(filterFragmentsNve, (s) => decomp(s)),
      hasPosition,
    ];
  }

  /** Checks a positional aware filter against a sorted lineup array */
  static testPositionalAwareFilter(
    sortedToTest: { id: string; code: string }[],
    pveFrags: { filter: string; pos: number[] }[],
    nveFrags: { filter: string; pos: number[] }[]
  ): boolean {
    const noPveFrags = _.isEmpty(pveFrags);
    const noNveFrags = _.isEmpty(nveFrags);

    const matchFrag = (cid: { id: string; code: string }, frag: string) => {
      return (
        cid.id.toLowerCase().indexOf(frag) >= 0 ||
        cid.code.toLowerCase().indexOf(frag) >= 0
      );
    };
    const match = (frag: { filter: string; pos: number[] }) => {
      const namesToTest = _.isEmpty(frag.pos)
        ? sortedToTest
        : frag.pos.map((index) => sortedToTest[index]);

      return _.some(namesToTest, (cid: { id: string; code: string }) =>
        matchFrag(cid, frag.filter)
      );
    };
    return (
      (noPveFrags || _.every(pveFrags, match)) &&
      (noNveFrags || !_.some(nveFrags, match))
    );
  }

  // Useful for display filter
  // TODO move to a PositionUtils under tables?

  static readonly positionClasses = [
    "Pure PG",
    "Scoring PG",
    "Combo Guard",
    "(All Ballhandlers)",
    "Wing Guard",
    "(All Guards)",
    "Wing Forward",
    "(All Wings)",
    "Stretch PF",
    "Power Forward/Center",
    "(All PFs)",
    "Center",
    "(All Post Players)",
    "(All Frontcourt)",
    "Unknown:Guard?",
    "Unknown:Forward/Center?",
  ];
  static readonly posClassToNickname = {
    "Pure PG": "PG",
    "Scoring PG": "s-PG",
    "Combo Guard": "CG",
    "(All Ballhandlers)": "BH*",
    "Wing Guard": "WG",
    "Unknown - probably Guard": "G?",
    "Unknown:Guard?": "G?",
    "(All Guards)": "*G",
    "Wing Forward": "WF",
    "(All Wings)": "W*",
    "Stretch PF": "S-PF",
    "Power Forward/Center": "PF/C",
    "Unknown - probably Forward/Center": "F/C?",
    "Unknown:Forward/Center?": "F/C?",
    "(All PFs)": "PF+",
    Center: "C",
    "(All Post Players)": "C+",
    "(All Frontcourt)": "4/5",
  } as Record<string, string>;

  static readonly nicknameToPosClass = {
    ...PositionUtils.idToPosition,
    "BH*": "(All Ballhandlers)",
    "*G": "(All Guards)",
    "W*": "(All Wings)",
    "PF+": "(All PFs)",
    "C+": "(All Post Players)",
    "4/5": "(All Frontcourt)",
  } as Record<string, string>;

  static readonly expandedPosClasses = {
    "BH*": ["PG", "s-PG", "CG"],
    "*G": ["PG", "s-PG", "CG", "WG", "G?"],
    "W*": ["WG", "WF"],
    "PF+": ["WF", "S-PF", "PF/C"],
    "C+": ["PF/C", "C"],
    "4/5": ["WF", "S-PF", "PF/C", "C"],
  } as Record<string, string[]>;
}
