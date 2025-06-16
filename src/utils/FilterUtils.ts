import {
  CommonFilterParams,
  GameFilterParams,
  ParamDefaults,
} from "./FilterModels";

type GameFilterPresets = {
  commonParams?: CommonFilterParams;
  gameParams?: GameFilterParams;
  splitPhrases?: [string, string];
  longerSplitPhrases?: [string, string];
};

/** Collection of business logic related to CommonFilter, GameFilter, etc */
export class FilterUtils {
  static readonly gameFilterOnOffPrefix = "On/Off: ";

  static readonly gameFilterPresets: Record<string, GameFilterPresets> = {
    [ParamDefaults.defaultPresetMode]: {},
    "Season Stats vs T100ish": {
      commonParams: {
        maxRank: "100",
      },
    },
    "Season Stats In Conf": {
      commonParams: {
        queryFilters: "Conf",
      },
    },
    "Last 30 days": {
      commonParams: {
        queryFilters: "Last-30d",
      },
    },
  };

  static readonly gameSplitPresets: Record<string, GameFilterPresets> = {
    "Home vs Away/Neutral": {
      splitPhrases: ["H", "A/N"],
      gameParams: {
        onQuery: "location_type:Home",
        offQuery: `NOT ${"location_type:Home"}`,
      },
    },
    "T100ish vs Weaker": {
      splitPhrases: ["T100", ">100"],
      gameParams: {
        onQuery: "vs_rank:<=100",
        offQuery: `NOT ${"vs_rank:<=100"}`,
      },
    },
    "First halves vs Second halves": {
      splitPhrases: ["1H", "2H"],
      gameParams: {
        onQuery: "end_min:<=20",
        offQuery: `NOT ${"end_min:<=20"}`,
      },
    },
    "Last 30 days vs Before": {
      splitPhrases: ["L30", ">30"],
      gameParams: {
        onQueryFilters: "Last-30d",
      },
    },
  };

  /** Encapsulation over gameSplitPresets to handle the dynamically built on/off */
  static getPresetPhrase(presetSplit: string): [string, string] | undefined {
    if (presetSplit.startsWith(FilterUtils.gameFilterOnOffPrefix)) {
      return ["ON", "OFF"];
    } else {
      const radical = FilterUtils.gameSplitPresets[presetSplit || "??"];
      return radical?.splitPhrases;
    }
  }
}
