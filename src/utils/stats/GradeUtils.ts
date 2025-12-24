// Lodash
import _, { find } from "lodash";
import {
  find as treeFind,
  emptyWithNumericKeys as emptyTree,
  fromPairsWithNumericKeys as treeFromPairs,
  RedBlackTree,
} from "@collectable/red-black-tree";

import {
  DivisionStatistics,
  Statistic,
  TeamStatSet,
  PureStatSet,
  DivisionStatisticsElement,
} from "../StatModels";
import {
  TopLevelIndivPlayAnalysis,
  TopLevelIndivPlayType,
  TopLevelPlayAnalysis,
  TopLevelPlayType,
} from "./PlayTypeUtils";

type QualifyingCriterion = [string, number];

/** Lets you select the tier against which you want to compare stats (defaults to Combo, or all together) */
export type GradeProps = {
  comboTier?: DivisionStatistics;
  highTier?: DivisionStatistics;
  mediumTier?: DivisionStatistics;
  lowTier?: DivisionStatistics;
};

/** Utility functions for calculating percentile/grade related statistics */
export class GradeUtils {
  /** For players, only use their stats for grades if they've played 40% of possessions (same for display, but will allow override) */
  static readonly minPossPctForInclusion = 0.4;

  /** Fields to be used for player grades, _plus_ "qualifying" criteria for including them */
  static readonly playerFields: Record<
    string,
    QualifyingCriterion | undefined
  > = {
    //(qualifying possessions will always be 40% for consistency with KenPom?)
    //TODO: poss%, poss count, SoS
    off_team_poss_pct: undefined,
    // Overall production
    off_rtg: undefined,
    def_rtg: undefined,
    off_adj_rtg: undefined,
    def_adj_rtg: undefined,
    off_adj_prod: undefined,
    def_adj_prod: undefined,
    off_adj_rapm: undefined,
    def_adj_rapm: undefined,
    off_adj_rapm_prod: undefined,
    def_adj_rapm_prod: undefined,
    off_adj_rapm_margin: undefined,
    off_adj_rapm_prod_margin: undefined,
    off_usage: undefined,
    // Assists, TOs, steals, blocks, fouls
    off_assist: undefined,
    off_to: undefined,
    def_to: undefined, //(actually def_stl)
    def_2prim: undefined, //(actually def_blk)
    def_ftr: undefined, // (FC/50) TODO invert
    // Rebounding:
    off_orb: undefined,
    def_orb: undefined,
    // Shooting % stats
    off_efg: ["off_team_poss_pct", 0.6],
    off_3p: ["total_off_3p_attempts", 60],
    off_2p: ["total_off_2p_attempts", 60],
    off_2pmid: ["total_off_2pmid_attempts", 45], //(less frequent so have a slightly lower threshold)
    off_2prim: ["total_off_2prim_attempts", 60],
    // Shooting style
    off_3pr: undefined,
    off_2pmidr: undefined,
    off_2primr: undefined,
    off_3p_ast: ["total_off_3p_attempts", 60], //(assisted %s)
    off_2prim_ast: ["total_off_2prim_attempts", 60],
    off_ftr: ["off_team_poss_pct", 0.6], //TODO: handle FT%
    // Other stylistic grades: assist breakdowns, transition, scramble etc
    //TODO
  };
  /** Subset of playerFields which have extra criteria */
  static readonly playerFieldsWithExtraCriteria = [
    "off_efg",
    "off_3p",
    "off_2p",
    "off_2prim",
    "off_2pmid",
    "off_3p_ast",
    "off_2prim_ast",
    "off_ftr",
  ];

  /** Quick util to check if player stats  */
  static readonly meetsExtraCriterion = (
    playerStats: PureStatSet,
    criterionInfo: QualifyingCriterion,
    mult: number = 1.0
  ) => {
    const [field, criterion] = criterionInfo;
    return (playerStats[field]?.value || 0) >= criterion * mult;
  };

  // The totals we do want to keep because they are useful in deciding if grades are good
  static readonly playerTotalsToKeep = new Set([
    "total_off_3p_attempts",
    "total_off_2p_attempts",
    "total_off_2pmid_attempts",
    "total_off_2prim_attempts",
  ]);

  /** Player fields has a few fields with very low dynamic range, so we'll treat these differently
   * TODO: decide whether to do this, or have fewer giant arrays which get compressed down?
   */
  static readonly unusualMultiplier = (field: string, player: boolean) => {
    if (player) {
      if (field == "def_2prim" || field == "def_to" || field == "off_usage") {
        return 1000;
      } else if (
        _.endsWith(field, "_adj_rtg") ||
        _.endsWith(field, "_prod") ||
        _.endsWith(field, "_rapm")
      ) {
        return 10;
      } else {
        return undefined;
      }
    } else {
      return undefined; //(not currently using non-standard multipliers for team division stats)
    }
  };

  /** Fields to record that are part of the query response (apart from "net", which is derived) */
  static readonly teamFieldsToRecord = [
    "net",
    "ppp",
    "adj_ppp",
    "efg",
    "to",
    "orb",
    "ft",
    "ftr",
    "assist",
    "3pr",
    "2pmidr",
    "2primr",
    "3p_ast",
    "2prim_ast",
    "ast_3p",
    "ast_rim", //(don't bother with mid)
    "3p",
    "2p",
    "2pmid",
    "2prim",
    "adj_opp",

    // Not in table
    "3p_opp",
  ];

  /* Fields derived in DerivedStatsUtils */
  static readonly teamDerivedFields = [
    "scramble",
    "scramble_per_orb",
    "scramble_ppp",
    "scramble_delta_ppp",
    "trans",
    "trans_ppp",
    "trans_delta_ppp",
    "half",
    "half_ppp",
    "half_delta_ppp",
    "scramble_to",
    "scramble_ftr",
    "scramble_3pr",
    "scramble_3p",
    "scramble_2p",
    "trans_to",
    "trans_ftr",
    "trans_3pr",
    "trans_3p",
    "trans_2p",
    "half_to",
    "half_ftr",
    "half_3pr",
    "half_3p",
    "half_2p",

    // Defensive only, but the code should handle that (actually now they have off_ values for teams)
    "stl",
    "to_nonstl", //(non-steal TO)
    "blk",
    "stk", //("stocks" = "blocks + steals")

    // Not in dataset but used here in extra dialog, so include for convenience (ignored if not present anyway)
    "3p_opp",
  ];

  /** Add a team's stats to the divison stats collection  */
  static buildAndInjectTeamDivisionStats = (
    teamBaseline: PureStatSet,
    derivedStats: PureStatSet,
    mutableDivisionStats: DivisionStatistics,
    inNaturalTier: boolean,
    fields: Array<string> | undefined = undefined
  ) => {
    //TODO: more complex: also style-based fields
    mutableDivisionStats.tier_sample_size += 1;
    if (inNaturalTier) {
      mutableDivisionStats.dedup_sample_size += 1;
    }
    const updateForField = (field: string, dataSet: PureStatSet) => {
      const maybeStat = dataSet[field]?.value;
      if (!_.isNil(maybeStat)) {
        if (!mutableDivisionStats.tier_samples[field]) {
          mutableDivisionStats.tier_samples[field] = [];
        }
        mutableDivisionStats.tier_samples[field]!.push(maybeStat);

        if (inNaturalTier) {
          if (!mutableDivisionStats.dedup_samples[field]) {
            mutableDivisionStats.dedup_samples[field] = [];
          }
          mutableDivisionStats.dedup_samples[field]!.push(maybeStat);
        }
      }
    };
    if (_.isNil(fields)) {
      _.chain(GradeUtils.teamFieldsToRecord)
        .flatMap((field) => [`off_${field}`, `def_${field}`])
        .forEach((f) => updateForField(f, teamBaseline))
        .value();
      _.chain(GradeUtils.teamDerivedFields)
        .flatMap((field) => [`off_${field}`, `def_${field}`])
        .concat(["tempo"])
        .forEach((f) => updateForField(f, derivedStats))
        .value();
    } else {
      // manually specified fields
      _.chain(fields)
        .forEach((f) => updateForField(f, teamBaseline))
        .value();
    }
  };

  /** Add play style stats to a team (division) stats collection */
  static buildAndInjectPlayStyleStats = (
    playStyle: TopLevelPlayAnalysis,
    defensivePlayStyle: TopLevelPlayAnalysis | undefined,
    mutableDivisionStats: DivisionStatistics,
    inNaturalTier: boolean
  ) => {
    _.forEach([playStyle, defensivePlayStyle], (tmpPlayStyle, isDef) => {
      const defPrefix = isDef == 1 ? "Def" : "";
      if (tmpPlayStyle) {
        _.forEach(tmpPlayStyle, (playStyleInfo, playStyleType) => {
          const updateForField = (field: string, stat: Statistic) => {
            if (!_.isNil(stat.value)) {
              if (!mutableDivisionStats.tier_samples[field]) {
                mutableDivisionStats.tier_samples[field] = [];
              }
              mutableDivisionStats.tier_samples[field]!.push(stat.value);

              if (inNaturalTier) {
                if (!mutableDivisionStats.dedup_samples[field]) {
                  mutableDivisionStats.dedup_samples[field] = [];
                }
                mutableDivisionStats.dedup_samples[field]!.push(stat.value);
              }
            }
          };
          const possPctField = `${playStyleType}|${defPrefix}Pct`;
          updateForField(possPctField, playStyleInfo.possPct);
          const pppField = `${playStyleType}|${defPrefix}Ppp`;
          updateForField(pppField, playStyleInfo.pts);
          if (playStyleInfo.adj_pts) {
            const adjPppField = `${playStyleType}|${defPrefix}AdjPpp`;
            updateForField(adjPppField, playStyleInfo.adj_pts);
          }
        });
      }
    });
  };

  /** Handy util to get the Medians of each play type */
  static getMedianPlayTypeValue = (
    fieldList: TopLevelPlayType[],
    divisionStats: DivisionStatistics
  ): TopLevelIndivPlayAnalysis => {
    return _.transform(
      fieldList,
      (acc, val) => {
        const calcMedian = (suffix: string): number => {
          const el = divisionStats.tier_lut[`${val}|${suffix}`];
          if (el) {
            const target = Math.floor(el.size / 2);
            const maybeMedium = _.find(
              el.lut,
              (lutEl) =>
                lutEl[0] < target && lutEl[0] + lutEl.length - 1 >= target
            );
            if (maybeMedium) {
              const currStart = maybeMedium[0];
              return maybeMedium[target - currStart];
            } else {
              return 0;
            }
          } else {
            return 0;
          }
        };
        const tierLutEl = divisionStats.tier_lut[`${val}|Pct`];
        if (tierLutEl) {
          acc[val] = {
            pts: { value: calcMedian("Ppp") },
            adj_pts: { value: calcMedian("AdjPpp") },
            possPct: { value: calcMedian("Pct") },
          };
        }
      },
      {} as TopLevelIndivPlayAnalysis
    );
  };

  /** Add a team's stats to the divison stats collection  */
  static buildAndInjectPlayerDivisionStats = (
    playerStats: PureStatSet,
    mutableDivisionStats: DivisionStatistics,
    inNaturalTier: boolean,
    fields: Array<string> | undefined = undefined,
    criteriaMult: number = 1.0,
    accessor?: (dataSet: PureStatSet, field: string) => number | undefined
  ) => {
    const possPct = playerStats.off_team_poss_pct?.value || 0;

    if (possPct >= GradeUtils.minPossPctForInclusion) {
      if (fields == undefined) {
        //(else we're calling it for secondary fields, so we don't want to increment the global counters)
        mutableDivisionStats.tier_sample_size += 1;
        if (inNaturalTier) {
          mutableDivisionStats.dedup_sample_size += 1;
        }
        //^(this will be inaccurate for fields with additional criteria but it's only used for display anyway)
      }
      const updateForField = (field: string, dataSet: PureStatSet) => {
        const maybeStat = accessor
          ? accessor(dataSet, field)
          : dataSet[field]?.value;
        if (!_.isNil(maybeStat)) {
          if (!mutableDivisionStats.tier_samples[field]) {
            mutableDivisionStats.tier_samples[field] = [];
          }
          mutableDivisionStats.tier_samples[field]!.push(maybeStat);

          if (inNaturalTier) {
            if (!mutableDivisionStats.dedup_samples[field]) {
              mutableDivisionStats.dedup_samples[field] = [];
            }
            mutableDivisionStats.dedup_samples[field]!.push(maybeStat);
          }
        }
      };
      const manualFieldSet = _.isNil(fields) ? new Set([]) : new Set(fields);
      const fieldChain = (
        accessor && fields //(derived fields, bypass any manual criteria for inclusion)
          ? _.chain(fields).map(
              (k) => [k, undefined] as [string, QualifyingCriterion | undefined]
            )
          : _.chain(GradeUtils.playerFields)
              .toPairs()
              .filter((kv) => {
                return _.isNil(fields) ? true : manualFieldSet.has(kv[0]);
              })
      ).flatMap((kv) => {
        const key = kv[0];
        const value = kv[1];
        if (!value) {
          return [key];
        } else {
          // Check if the qualifying criteria are met for each field
          return GradeUtils.meetsExtraCriterion(
            playerStats,
            value,
            criteriaMult
          )
            ? [key]
            : [];
        }
      });
      fieldChain.forEach((f) => updateForField(f, playerStats)).value();
    }
  };

  /** Handy util to get the Medians of each play type */
  static getMedianIndivPlayTypeValue = (
    fieldList: TopLevelIndivPlayType[],
    divisionStats: DivisionStatistics
  ): TopLevelIndivPlayAnalysis => {
    return _.transform(
      fieldList,
      (acc, val) => {
        const calcMedian = (suffix: string): number => {
          const el = divisionStats.tier_lut[`${val}|${suffix}`];
          if (el) {
            const target = Math.floor(el.size / 2);
            const maybeMedium = _.find(
              el.lut,
              (lutEl) =>
                lutEl[0] < target && lutEl[0] + lutEl.length - 1 >= target
            );
            if (maybeMedium) {
              const currStart = maybeMedium[0];
              return maybeMedium[target - currStart]; //(at least 1)
            } else {
              return 0;
            }
          } else {
            return 0;
          }
        };
        const tierLutEl = divisionStats.tier_lut[`${val}|Pct`];
        if (tierLutEl) {
          acc[val] = {
            pts: { value: calcMedian("Ppp") },
            adj_pts: { value: calcMedian("AdjPpp") },
            possPct: { value: calcMedian("Pct") },
            possPctUsg: { value: calcMedian("UsgPct") },
          };
        }
      },
      {} as TopLevelIndivPlayAnalysis
    );
  };

  /** Add play style stats to a team (division) stats collection */
  static buildAndInjectIndivPlayStyleStats = (
    playStyle: TopLevelIndivPlayAnalysis,
    defensivePlayStyle: TopLevelIndivPlayAnalysis | undefined,
    mutableDivisionStats: DivisionStatistics,
    inNaturalTier: boolean
  ) => {
    _.forEach([playStyle, defensivePlayStyle], (tmpPlayStyle, isDef) => {
      const defPrefix = isDef == 1 ? `Def` : "";
      if (tmpPlayStyle) {
        _.forEach(tmpPlayStyle, (playStyleInfo, playStyleType) => {
          const updateForField = (
            field: string,
            stat: Statistic | undefined
          ) => {
            if (stat && !_.isNil(stat?.value)) {
              if (!mutableDivisionStats.tier_samples[field]) {
                mutableDivisionStats.tier_samples[field] = [];
              }
              mutableDivisionStats.tier_samples[field]!.push(stat.value);

              if (inNaturalTier) {
                if (!mutableDivisionStats.dedup_samples[field]) {
                  mutableDivisionStats.dedup_samples[field] = [];
                }
                mutableDivisionStats.dedup_samples[field]!.push(stat.value);
              }
            }
          };
          const possPctField = `${playStyleType}|${defPrefix}Pct`;
          //(Usg field might not exist => treat as 0)
          updateForField(possPctField, playStyleInfo.possPct);
          const possPctUsgField = `${playStyleType}|${defPrefix}UsgPct`;
          updateForField(possPctUsgField, playStyleInfo.possPctUsg);
          const pppField = `${playStyleType}|${defPrefix}Ppp`;
          updateForField(pppField, playStyleInfo.pts);
          if (playStyleInfo.adj_pts) {
            const adjPppField = `${playStyleType}|${defPrefix}AdjPpp`;
            updateForField(adjPppField, playStyleInfo.adj_pts);
          }
        });
      }
    });
  };

  /** Convert an unsorted list of samples into an LUT for Team Divison Stats */
  static buildAndInjectTeamDivisionStatsLUT = (
    mutableUnsortedDivisionStats: DivisionStatistics
  ) => {
    return GradeUtils.buildAndInjectDivisionStatsLUT(
      mutableUnsortedDivisionStats,
      false
    );
  };

  /** Convert an unsorted list of samples into an LUT for Team Divison Stats */
  static buildAndInjectPlayerDivisionStatsLUT = (
    mutableUnsortedDivisionStats: DivisionStatistics
  ) => {
    return GradeUtils.buildAndInjectDivisionStatsLUT(
      mutableUnsortedDivisionStats,
      true
    );
  };

  /** Convert an unsorted list of samples into an LUT for Divison Stats */
  private static buildAndInjectDivisionStatsLUT = (
    mutableUnsortedDivisionStats: DivisionStatistics,
    player: boolean
  ) => {
    const sort = (
      samples: Record<string, Array<number>>,
      comp_factor: number | undefined
    ) => {
      return _.transform(
        samples,
        (acc, value, key) => {
          acc[key] = _.chain(value)
            .sortBy()
            .thru((samples) => {
              if (comp_factor) {
                return _.filter(
                  samples,
                  (__, index) => index % comp_factor == 0
                );
              } else {
                return samples;
              }
            })
            .value();
        },
        {} as Record<string, Array<number>>
      );
    };
    const player_compression_factor = 3;
    const dedup_compression_factor = player
      ? player_compression_factor
      : undefined; //(too many players so reducing granularity to keep size down)
    mutableUnsortedDivisionStats.compression_factor = dedup_compression_factor;

    const tier_compression_factor = _.isEmpty(
      mutableUnsortedDivisionStats.dedup_samples
    )
      ? undefined
      : dedup_compression_factor;
    //(if dedup samples is empty, we're combining tier_samples and it has already been downscaled)

    // Dedup samples: used to build the combined stats
    mutableUnsortedDivisionStats.dedup_samples = sort(
      mutableUnsortedDivisionStats.dedup_samples,
      dedup_compression_factor
    );
    //(this is a waste of cycles since will sort again in "Combo", but useful for debugging and not on performance critical path)
    //(sorting sorted arrays will likely be faster anyway, so we get some of that back)

    const tier_samples = sort(
      mutableUnsortedDivisionStats.tier_samples,
      tier_compression_factor
    );
    mutableUnsortedDivisionStats.tier_lut = _.transform(
      tier_samples,
      (acc, sample_set, field) => {
        const last_val = sample_set[sample_set.length - 1];
        const maybeMultiplier = GradeUtils.unusualMultiplier(field, player);
        acc[field] = _.transform(
          sample_set,
          (lutObj, val) => {
            const lutMult = lutObj.lutMult || (lutObj.isPct ? 100 : 1);
            const lutKey = (lutMult * val).toFixed(0);
            const currLutVal = lutObj.lut[lutKey];
            if (_.isNil(currLutVal)) {
              // New entry
              lutObj.lut[lutKey] = [lutObj.size, val];
            } else {
              // Existing entry, append
              currLutVal.push(val);
            }
            lutObj.size = lutObj.size + 1;
          },
          {
            lutMult: maybeMultiplier,
            isPct: maybeMultiplier //(don't fill in if using a non-standard multiplier)
              ? undefined
              : sample_set[0] >= -1 &&
                sample_set[0] <= 1 &&
                last_val >= -1 &&
                last_val <= 1,
            min: sample_set[0],
            size: 0, //(will mutate this to size during the loop)
            lut: {} as Record<string, Array<number>>,
          }
        );
      },
      {} as Record<string, any>
    );

    mutableUnsortedDivisionStats.tier_samples = {}; //(replace this by LUT)

    return mutableUnsortedDivisionStats;
  };

  private static readonly MIN = -10000;
  private static readonly MAX = 10000;

  /** Note first entry is the offset of the LUT entry - always go higher */
  static binaryChop(
    array: Array<number>,
    val: number,
    index1: number,
    index2: number
  ): number {
    //TODO: not my finest code, written while I wasn't feeling great in a stream-of-consciousness. Maybe rewrite sometime?

    if (index1 == index2) {
      //no choice
      return array[0]! + index1 - 1; //(because index is relative to the 2nd element of array, 1st is offset)
    } else {
      const midIndex = Math.floor(0.5 * (index1 + index2));
      const midVal = array[midIndex]!;
      const midValPlus1 =
        midIndex < index2 ? array[midIndex + 1]! : GradeUtils.MAX; //(always match in latter case)
      const midValMinus1 =
        midIndex > index1 ? array[midIndex - 1]! : GradeUtils.MIN; //(always match in latter case)

      //(for debugging:)
      //console.log(`${val.toFixed(5)} VS ${index1} ... ${midValMinus1.toFixed(5)} - ${midIndex}:${midVal.toFixed(5)}  - ${index2} ... ${midValPlus1.toFixed(5)} (start: [${array[0]}])`)

      if (val > midVal && val <= midValPlus1) {
        return array[0]! + midIndex; //(-1 because 0 is offset, but +1 because we pick next higher index)
      } else if (val <= midVal && val > midValMinus1) {
        return array[0]! + midIndex - 1; //(as above but one back)
      } else if (val == midValMinus1) {
        return array[0]! + midIndex - 2;
      } else if (val < midVal) {
        // (val < midValMinus1) ... Need a bigger jump downwards
        if (midIndex == index2) {
          return array[0]!; // never go lower (by construction - we'd hit the previous LUT element)
        } else {
          return GradeUtils.binaryChop(array, val, index1, midIndex);
        }
      } else {
        // (val > midValPlus1)... Need a bigger jump upwards
        if (midIndex == index1) {
          //(can't go any higher)
          return array[0]! + index2;
        } else {
          return GradeUtils.binaryChop(array, val, midIndex, index2);
        }
      }
    }
  }

  /** Builds a LUT for if the initial lookup misses */
  static buildSpacesBetween(
    divStats: DivisionStatistics,
    field: string
  ): RedBlackTree.Instance<number, number> {
    const divStatsField = divStats.tier_lut[field];
    if (divStatsField) {
      const minPctile = 1.0 / divStatsField.size;
      const buildPctile = (arrSize: number) =>
        Math.max(minPctile, (arrSize + 1) * minPctile); //(see getPercentile, old code)
      const vals: [number, number][] = _.chain(divStatsField.lut)
        .toPairs()
        .map((keyVal) => {
          const arr = keyVal[1];
          const numericKeyVsPctile: [number, number] =
            arr.length > 1 ? [arr[1]!, buildPctile(arr[0]!)] : [-1, -1];
          //(arr[1] is the first entry hence was the numeric value used to build the LUT key)

          return numericKeyVsPctile;
        })
        .filter((kv) => kv[1] >= 0)
        .value();
      return treeFromPairs(vals);
    } else {
      return emptyTree();
    }
  }

  /** Calculate the percentile of a given field */
  static getPercentile(
    divStats: DivisionStatistics,
    field: string,
    val: number,
    buildLutMissCache: boolean = false
  ): Statistic | undefined {
    const divStatsField = divStats.tier_lut[field];
    const compressionFactor = divStats.compression_factor || 1.0;
    if (divStatsField) {
      const lutMult = divStatsField.lutMult || (divStatsField.isPct ? 100 : 1);
      const lookupKey = (lutMult * val).toFixed(0);
      const lutArray = divStatsField.lut[lookupKey];

      const adjDivStatsFieldSize = compressionFactor * divStatsField.size;
      const minPctile = 1.0 / divStatsField.size;

      if (!lutArray && val <= divStatsField.min + 0.001) {
        return { value: minPctile, samples: adjDivStatsFieldSize } as Statistic; //1st percentile
      } else if (!lutArray) {
        const spacesBetween =
          divStatsField.spaces_between ||
          (buildLutMissCache
            ? GradeUtils.buildSpacesBetween(divStats, field)
            : undefined);
        if (buildLutMissCache && !divStatsField.spaces_between) {
          //(ugly: mutate divStats)
          divStatsField.spaces_between = spacesBetween;
        }
        if (spacesBetween) {
          const spaceBetween = treeFind("gt", val, spacesBetween); //smallest entry which is bigger than val
          return _.isUndefined(spaceBetween)
            ? ({ value: 1.0, samples: adjDivStatsFieldSize } as Statistic) //100% percentile
            : { value: spaceBetween.value, samples: adjDivStatsFieldSize };
        } else {
          //(OLD CODE, runs if haven't specified pre-build spaces_between - acts as FF on legacy code)
          // Either it's a split stat so doesn't appear in the LUT, or it's off the end of the chart
          // (slow may need/want to speed this up)
          const closestLutArray = _.find(
            divStatsField.lut,
            (arr, unusedKey) => {
              return arr.length > 1 && arr[1]! > val;
            }
          );
          if (closestLutArray) {
            return {
              value: Math.max(minPctile, (closestLutArray[0]! + 1) * minPctile),
              samples: adjDivStatsFieldSize,
            };
            //(+1 because we don't want index we want rank)
          } else {
            return { value: 1.0, samples: adjDivStatsFieldSize } as Statistic; //100% percentile
          }
        }
      } else {
        //lutArray
        const offsetIndex = GradeUtils.binaryChop(
          lutArray,
          val,
          1,
          lutArray.length - 1
        ); //(minPctile is lowest)
        return {
          value: Math.max(minPctile, (offsetIndex + 1) * minPctile),
          samples: adjDivStatsFieldSize,
        };
        //(+1 because we don't want index we want rank)
      }
    } else {
      return {};
    }
  }

  static readonly teamFieldsToInvert = {
    off_to: true,
    off_to_nonstl: true,
    off_stl: true,
    off_blk: true,
    off_stk: true,
    def_to: true,
    def_to_nonstl: true,
    def_stl: true,
    def_blk: true,
    def_stk: true,
    off_scramble_to: true,
    def_scramble_to: true,
    off_trans_to: true,
    def_trans_to: true,
    // The higher the defensive SoS the higher the rank should be:
    def_3p_opp: true,
    // Frequency:
    def_net: true,
    def_assist: true,
    def_3pr: true,
    def_2pmidr: true,
    def_2primr: true,
    def_trans_3pr: true,
    def_scramble_3pr: true,
  } as Record<string, boolean>;

  static readonly playerFieldsToInvert = {
    off_to: true,
    def_to: true,
    def_orb: true,
    def_2prim: true,
    off_3p_ast: true,
    off_2prim_ast: true,
  } as Record<string, boolean>;

  static readonly combinedStat = {
    //(no off/def)
    tempo: true,
  } as Record<string, boolean>;

  /** Calculate the percentile of all fields within a stat set */
  static buildTeamPercentiles = (
    divStats: DivisionStatistics,
    team: PureStatSet,
    fieldList: string[],
    supportRank: boolean,
    buildLutMissCache: boolean = false
  ): PureStatSet => {
    const offDefFieldList = _.chain(fieldList)
      .flatMap((field) =>
        GradeUtils.combinedStat[field]
          ? [field]
          : [`off_${field}`, `def_${field}`]
      )
      .map((key) => {
        return key == "def_net" ? "off_raw_net" : key;
      })
      .value();

    //(hack to fix field naming funkiness)
    divStats.tier_lut.off_raw_net = divStats.tier_lut.def_net;

    const retVal = GradeUtils.buildPercentiles(
      divStats,
      team,
      offDefFieldList,
      GradeUtils.teamFieldsToInvert,
      supportRank,
      buildLutMissCache
    );
    return retVal;
  };

  /** Play style stats are most usefully consumed as percentiles - this builds the %iles */
  static getPlayStyleStats = (
    playStyle: TopLevelPlayAnalysis,
    divisionStats: DivisionStatistics,
    scheduleStrengthMult: number | undefined,
    buildLutMissCache: boolean = false
  ): TopLevelPlayAnalysis => {
    return GradeUtils.getIndivPlayStyleStats(
      playStyle,
      divisionStats,
      scheduleStrengthMult,
      false, //(NA for team stats)
      buildLutMissCache
    );
  };

  /** Play style stats are most usefully consumed as percentiles - this builds the %iles */
  static getIndivPlayStyleStats = (
    playStyle: TopLevelPlayAnalysis | TopLevelIndivPlayAnalysis,
    divisionStats: DivisionStatistics,
    scheduleStrengthMult: number | undefined,
    teamPoss: boolean = false,
    buildLutMissCache: boolean = false
  ): TopLevelIndivPlayAnalysis => {
    const adjPrefix = _.isNumber(scheduleStrengthMult) ? "Adj" : "";
    const usgPrefix = teamPoss ? "Usg" : "";
    const pppAdj = scheduleStrengthMult || 1;
    const freqKey = teamPoss ? "possPctUsg" : "possPct";
    return _.transform(
      playStyle,
      (acc, playStyleInfo, playStyleType) => {
        const possPctField = `${playStyleType}|${usgPrefix}Pct`;
        const pppField = `${playStyleType}|${adjPrefix}Ppp`;
        if (
          !_.isNil(playStyleInfo[freqKey]?.value) &&
          !_.isNil(playStyleInfo.pts.value)
        ) {
          const maybePossPctile = GradeUtils.getPercentile(
            divisionStats,
            possPctField,
            playStyleInfo[freqKey]?.value || 0,
            buildLutMissCache
          );
          const maybePppPctile = GradeUtils.getPercentile(
            divisionStats,
            pppField,
            playStyleInfo.pts.value * pppAdj,
            buildLutMissCache
          );
          if (maybePossPctile && maybePppPctile) {
            acc[playStyleType] = {
              possPct: maybePossPctile,
              pts: maybePppPctile,
            };
          } else {
            acc[playStyleType] = {
              possPct: { value: 0 },
              pts: { value: 0 },
            };
          }
        } else {
          acc[playStyleType] = {
            possPct: { value: 0 },
            pts: { value: 0 },
          };
        }
      },
      {} as Record<string, { possPct: Statistic; pts: Statistic }>
    ) as TopLevelIndivPlayAnalysis;
  };

  /** Calculate the percentile of all fields within a stat set */
  static buildPlayerPercentiles = (
    divStats: DivisionStatistics,
    team: PureStatSet,
    fieldList: string[],
    supportRank: boolean,
    buildLutMissCache: boolean = true
  ): PureStatSet => {
    const playerGrades = GradeUtils.buildPercentiles(
      divStats,
      team,
      fieldList,
      GradeUtils.playerFieldsToInvert,
      supportRank,
      buildLutMissCache
    );
    playerGrades.off_drb = playerGrades.def_orb;
    return playerGrades;
  };

  /** Calculate the percentile of all fields within a stat set */
  static buildPercentiles = (
    divStats: DivisionStatistics,
    statSet: PureStatSet,
    fieldList: string[],
    fieldsToInvert: Record<string, boolean>,
    supportRank: boolean,
    buildLutMissCache: boolean = false,
    accessor?: (dataSet: PureStatSet, field: string) => number | undefined
  ): PureStatSet => {
    const format = (f: string, s: Statistic | undefined) => {
      const isDef = f.startsWith("def_");
      const isInverted = fieldsToInvert[f] || false;
      const invert = (!isDef && isInverted) || (isDef && !isInverted);
      const maxPct = 1 + 1.0 / (s?.samples || 1); //(since 100% is rank 1)
      const numSamples = s?.samples || 0;
      if (numSamples > 0 || !supportRank) {
        const maybeInvert = invert
          ? s && _.isNumber(s.value)
            ? { value: maxPct - s.value, samples: supportRank ? numSamples : 0 }
            : s
          : { value: s?.value, samples: supportRank ? numSamples : 0 };

        return maybeInvert;
      } else {
        return undefined;
      }
    };
    return _.chain(fieldList)
      .map((key) => {
        const playerVal = accessor
          ? accessor(statSet, key)
          : statSet[key]?.value;
        return [
          key,
          playerVal && _.isFinite(playerVal)
            ? format(
                key,
                GradeUtils.getPercentile(
                  divStats,
                  key,
                  playerVal,
                  buildLutMissCache
                )
              )
            : undefined,
        ];
      })
      .fromPairs()
      .omitBy(_.isNil)
      .value() as PureStatSet;
  };
}
