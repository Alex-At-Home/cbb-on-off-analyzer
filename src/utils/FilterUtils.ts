import {
  CommonFilterParams,
  GameFilterParams,
  ParamDefaults,
} from "./FilterModels";

type GameFilterPresets = {
  commonParams?: CommonFilterParams;
  gameParams?: GameFilterParams;
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
      gameParams: {
        onQuery: "location_type:Home",
        offQuery: `NOT ${"location_type:Home"}`,
      },
    },
    "T100ish vs Weaker": {
      gameParams: {
        onQuery: "vs_rank:<=100",
        offQuery: `NOT ${"vs_rank:<=100"}`,
      },
    },
    "First halves vs Second halves": {
      gameParams: {
        onQuery: "end_min:<=20",
        offQuery: `NOT ${"end_min:<=20"}`,
      },
    },
    "Last 30 days vs Before": {
      gameParams: {
        onQueryFilters: "Last-30d",
      },
    },
  };
}
