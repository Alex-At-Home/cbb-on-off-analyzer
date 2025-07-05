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
  label: string;
  gameParams?: GameFilterParams;
  splitPhrases?: string[];
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
    otherQueries: [],
  };

  /** Filter/Query presets */
  static readonly commonFilterPresets: Record<string, CommonFilterPresets> = {
    [ParamDefaults.defaultPresetMode]: {},
    "Season Stats vs T50ish": {
      commonParams: {
        maxRank: "50",
      },
    },
    "Season Stats vs T100ish": {
      commonParams: {
        maxRank: "100",
      },
    },
    "Season Stats vs T150ish": {
      commonParams: {
        maxRank: "150",
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

  static readonly gameSplitLabelSortOrder: string[] = [
    "Misc Splits",
    "Date Splits",
    "SoS Splits",
  ];

  /** Split presets */
  static readonly gameSplitPresets: Record<string, GameFilterPresets> = {
    [ParamDefaults.defaultPresetSplit]: {
      label: "Misc Splits",
    },
    "Home vs Away/Neutral": {
      label: "Misc Splits",
      splitPhrases: ["H", "A/N"],
      gameParams: {
        onQuery: "location_type:Home",
        offQuery: `NOT ${"location_type:Home"}`,
      },
    },
    "Wins vs Losses": {
      label: "Misc Splits",
      splitPhrases: ["W", "L"],
      gameParams: {
        onQueryFilters: "Opponents:wins",
      },
    },
    "T100ish vs Weaker": {
      label: "SoS Splits",
      splitPhrases: ["T100", ">100"],
      gameParams: {
        onQuery: "vs_rank:<=100",
        offQuery: `NOT ${"vs_rank:<=100"}`,
      },
    },
    "Split by SoS band": {
      label: "SoS Splits",
      splitPhrases: [":T30", "T30:T80", "T80:T175", ">175"],
      gameParams: {
        autoOffQuery: false,
        onQuery: "vs_rank:<=30",
        offQuery: `${"vs_rank:>30"} AND ${"vs_rank:<=80"}`,
        otherQueries: [
          { query: `${"vs_rank:>80"} AND ${"vs_rank:<=175"}` },
          { query: "vs_rank:>175" },
        ],
      },
    },
    "First halves vs Second halves": {
      label: "Misc Splits",
      splitPhrases: ["1H", "2H"],
      gameParams: {
        onQuery: "end_min:<=20",
        offQuery: `NOT ${"end_min:<=20"}`,
      },
    },
    "Last 30 days vs Before": {
      label: "Date Splits",
      splitPhrases: ["L30", ">30"],
      gameParams: {
        onQueryFilters: "Last-30d",
      },
    },
    "Split by Month": {
      label: "Date Splits",
      splitPhrases: ["Nov", "Dec", "Jan", "Feb", "Mar+"],
      gameParams: {
        autoOffQuery: false,
        onQueryFilters: "Date:11.01-11.30",
        offQueryFilters: "Date:12.01-12.31",
        otherQueries: [
          { queryFilters: "Date:01.01-01.31" },
          { queryFilters: "Date:02.01-02.29" },
          { queryFilters: "Date:03.01-04.30" },
        ],
      },
    },
  };

  /** Encapsulation over gameSplitPresets to handle the dynamically built on/off */
  static getPresetPhrase(presetSplit: string): string[] | undefined {
    if (presetSplit.startsWith(FilterPresetUtils.gameFilterOnOffPrefix)) {
      return ["ON", "OFF"];
    } else {
      const radical = FilterPresetUtils.gameSplitPresets[presetSplit || "??"];
      return radical?.splitPhrases;
    }
  }

  //////////////////////////////////////////////////////

  // Lineup Preset Utils

  static readonly lineupLabelSortOrder: string[] = [
    "No Groupings",
    "Positional Groupings",
    "Player Groupings",
  ];

  /** Filter/Query presets */
  static readonly lineupGroupPresets: Record<string, LineupFilterPresets> = {
    [ParamDefaults.defaultPresetGroup]: {
      label: "No Groupings",
      lineupParams: {
        aggByPos: "",
      },
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
