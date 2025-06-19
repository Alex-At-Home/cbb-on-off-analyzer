import {
  CommonFilterParams,
  GameFilterParams,
  LineupFilterParams,
  ParamDefaults,
} from "./FilterModels";

type CommonFilterPresets = {
  commonParams?: CommonFilterParams;
};

type GameFilterPresets = {
  gameParams?: GameFilterParams;
  splitPhrases?: [string, string];
};

type LineupFilterPresets = {
  label: string;
  lineupParams?: LineupFilterParams;
};

/** Collection of business logic related to CommonFilter, GameFilter, etc */
export class FilterPresetUtils {
  // Common Preset Utils

  /** Handy constant for preset-calcs */
  static readonly basePresetQuery: CommonFilterParams = {
    minRank: "0",
    maxRank: "400",
    queryFilters: "",
    baseQuery: "",
  };

  // Game Preset Utils

  static readonly gameFilterOnOffPrefix = "On/Off: ";

  /** Handy constant for preset-calcs */
  static readonly basePresetOnOffQuery: GameFilterParams = {
    onQuery: "",
    offQuery: "",
    autoOffQuery: true,
    onQueryFilters: "",
    offQueryFilters: "",
  };

  /** Filter/Query presets */
  static readonly commonFilterPresets: Record<string, CommonFilterPresets> = {
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

  /** Split presets */
  static readonly gameSplitPresets: Record<string, GameFilterPresets> = {
    [ParamDefaults.defaultPresetSplit]: {},
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
    "Wins vs Losses": {
      splitPhrases: ["W", "L"],
      gameParams: {
        onQueryFilters: "Opponents:wins",
      },
    },
  };

  /** Encapsulation over gameSplitPresets to handle the dynamically built on/off */
  static getPresetPhrase(presetSplit: string): [string, string] | undefined {
    if (presetSplit.startsWith(FilterPresetUtils.gameFilterOnOffPrefix)) {
      return ["ON", "OFF"];
    } else {
      const radical = FilterPresetUtils.gameSplitPresets[presetSplit || "??"];
      return radical?.splitPhrases;
    }
  }

  // Lineup Preset Utils

  /** Filter/Query presets */
  static readonly lineupGroupPresets: Record<string, LineupFilterPresets> = {
    [ParamDefaults.defaultPresetGroup]: {
      label: "No Groupings",
    },
    "Grouped by On/Off Combos": {
      label: "Player Groupings",
      lineupParams: {
        aggByPos: "On-Off",
      },
    },
    "Grouped by Backcourt": {
      label: "Positional Groupings",
      lineupParams: {
        aggByPos: "Backcourt",
      },
    },
    "Grouped by Frontcourt": {
      label: "Positional Groupings",
      lineupParams: {
        aggByPos: "Frontcourt",
      },
    },
    "Grouped by PG": {
      label: "Positional Groupings",
      lineupParams: {
        aggByPos: "PG",
      },
    },
    "Grouped by PG+C": {
      label: "Positional Groupings",
      lineupParams: {
        aggByPos: "PG+C",
      },
    },
    "Grouped by Center": {
      label: "Positional Groupings",
      lineupParams: {
        aggByPos: "C",
      },
    },
    "Grouped by Pairs": {
      label: "Player Groupings",
      lineupParams: {
        aggByPos: "Pairs",
      },
    },
    "Grouped by Triples": {
      label: "Player Groupings",
      lineupParams: {
        aggByPos: "Triples",
      },
    },
    "Grouped by Quads": {
      label: "Player Groupings",
      lineupParams: {
        aggByPos: "Quads",
      },
    },
  };
}
