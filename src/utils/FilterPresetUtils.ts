import {
  CommonFilterParams,
  GameFilterParams,
  LineupFilterParams,
  ParamDefaults,
} from "./FilterModels";

type CommonFilterPresets = {
  phrase?: string;
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

  static readonly commonFilterSelectedGamesPrefix = "Selected Games...";
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
    [FilterPresetUtils.commonFilterSelectedGamesPrefix]: {}, //(these are injected)
    "Season Stats vs T50ish": {
      phrase: "T50",
      commonParams: {
        maxRank: "50",
      },
    },
    "Season Stats vs T100ish": {
      phrase: "T100",
      commonParams: {
        maxRank: "100",
      },
    },
    "Season Stats vs T150ish": {
      phrase: "T150",
      commonParams: {
        maxRank: "150",
      },
    },
    "Season Stats In Conf": {
      phrase: "Conf",
      commonParams: {
        queryFilters: "Conf",
      },
    },
    "Last 30 days": {
      phrase: "L30d",
      commonParams: {
        queryFilters: "Last-30d",
      },
    },
  };

  static readonly gameSplitLabelSortOrder: string[] = [
    "Misc Splits",
    "Date Splits",
    "Lineup Splits",
    "SoS Splits",
  ];

  /** Split presets */
  static readonly gameSplitPresets: Record<string, GameFilterPresets> = {
    [ParamDefaults.defaultPresetSplit]: {
      label: "Misc Splits",
    },
    [FilterPresetUtils.commonFilterSelectedGamesPrefix]: {
      label: "Misc Splits",
    }, //(other fields are injected)
    "Home vs Away/Neutral": {
      label: "Misc Splits",
      splitPhrases: ["H", "A/N"],
      gameParams: {
        onQuery: "location_type:Home",
        offQuery: `NOT ${"location_type:Home"}`,
      },
    },
    "Top 5 players vs Substitution Patterns": {
      label: "Lineup Splits",
      splitPhrases: ["5_of_T5", "4_of_T5", "3_of_T5", "2_of_T5"],
      gameParams: {
        autoOffQuery: false,
        onQuery: "ROSTER_TOP_5",
        offQuery: `ROSTER_TOP_5=4`,
        otherQueries: [
          { query: `ROSTER_TOP_5=3` },
          { query: "ROSTER_TOP_5=2" },
        ],
      },
    },
    "Top 6 players vs Substitution Patterns": {
      label: "Lineup Splits",
      splitPhrases: ["5_of_T6", "4_of_T6", "3_of_T6", "2_of_T6"],
      gameParams: {
        autoOffQuery: false,
        onQuery: "ROSTER_TOP_6=5",
        offQuery: `ROSTER_TOP_6=4`,
        otherQueries: [
          { query: `ROSTER_TOP_6=3` },
          { query: "ROSTER_TOP_6=2" },
        ],
      },
    },
    "Top 7 players vs Substitution Patterns": {
      label: "Lineup Splits",
      splitPhrases: ["5_of_T7", "4_of_T7", "3_of_T7", "2_of_T7"],
      gameParams: {
        autoOffQuery: false,
        onQuery: "ROSTER_TOP_7=5",
        offQuery: `ROSTER_TOP_7=4`,
        otherQueries: [
          { query: `ROSTER_TOP_7=3` },
          { query: "ROSTER_TOP_7=2" },
        ],
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

  /** Encapsulation over commonFilterPresets */
  static getPresetFilterPhrase(presetMode: string): string | undefined {
    if (
      presetMode.startsWith(FilterPresetUtils.commonFilterSelectedGamesPrefix)
    ) {
      return `[${presetMode.split("|").length}]-G`;
    }
    return FilterPresetUtils.commonFilterPresets[presetMode]?.phrase;
  }

  /** Encapsulation over gameSplitPresets to handle the dynamically built on/off */
  static getPresetPhrase(presetSplit: string): string[] | undefined {
    if (presetSplit.startsWith(FilterPresetUtils.gameFilterOnOffPrefix)) {
      return ["ON", "OFF"];
    } else if (
      presetSplit.startsWith(FilterPresetUtils.commonFilterSelectedGamesPrefix)
    ) {
      const numGames = presetSplit.split("|").length;
      return [`[${numGames}]-G`, `NOT-G`];
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
