// React imports:
import React from "react";

import {
  OffLuckAdjustmentDiags,
  DefLuckAdjustmentDiags,
} from "./stats/LuckUtils";
import { ORtgDiagnostics, DRtgDiagnostics } from "./stats/RatingUtils";
import { RedBlackTree } from "@collectable/red-black-tree";
import { PlayTypeStat, TopLevelIndivPlayType } from "./stats/PlayTypeUtils";

export type DivisionStatisticsElement = {
  isPct?: boolean; //(whether you need to *100 before applying .toFixed(0))
  lutMult?: number; //(alternative to isPct, let's you specify *10, *100)
  size: number; //(total number of samples in the LUT)
  min: number; //(don't need max, if value missed LUT and is >max then %ile==100, else 1)
  lut: Record<string, Array<number>>; //([0] of the entry is the offset)
  spaces_between?: RedBlackTree.Instance<number, number>; //(if not in the LUT use an optimized binary chop)
};

export type DivisionStatistics = {
  /** Info about how the fields have been truncated, default is 4dp */
  precision?: "native";
  /** The number of teams in the tier (includes teams in multiple tiers) */
  tier_sample_size: number;
  /** The number of teams in the tier (only teams in their "natural" tier) */
  dedup_sample_size: number;
  /* Sorted list of samples by field name (includes teams in multiple tiers) */
  tier_samples: Record<string, Array<number>>;

  /** Lets you do faster search of what percentile you are in by first looking up with .toFixed(0), or (100*).toFixed*/
  tier_lut: Record<string, DivisionStatisticsElement>;

  compression_factor?: number; //(defaults to 1, else we compress tier_lut[field].lut[lookup] by this number)

  /* Sorted list of samples by field name (only teams in their "natural" tier) - used to build the combined files */
  dedup_samples: Record<string, Array<number>>;
};

/** Represents a player, lineup, or team statistic */
export type Statistic = {
  /** The current most relevant number */
  value?: number;
  /** If a number was overridden by manual or luck adjustments, the original */
  old_value?: number;
  /** Provides some context for value */
  extraInfo?: string | React.ReactNode;
  /** Gives some details about how value was derived from old_value */
  override?: string | React.ReactNode;

  /** The number of samples that generated this statistic, if available (assume not) */
  samples?: number;

  /** Background color override (currently only supported for tables, not shadow background) */
  colorOverride?: number;
};
/** Like statistic, but can take an HTML val in its value */
export type StatisticOrRender = {
  /** The current most relevant number */
  value?: number | React.ReactNode | string;
  /** If a number was overridden by manual or luck adjustments, the original */
  old_value?: number | React.ReactNode | string;
  /** Provides some context for value */
  extraInfo?: string | React.ReactNode;
  /** Gives some details about how value was derived from old_value */
  override?: string | React.ReactNode;

  /** The number of samples that generated this statistic, if available (assume not) */
  samples?: number;
};

/** TODO: consider coming up with a list of all possible fields from ES and using a mapped type? */
export type PureStatSet = Record<string, Statistic>;

/** (eg ErAyala) */
export type PlayerCode = string;

/** (eg "Ayala, Eric") */
export type PlayerId = string;

export type PlayerCodeId = { code: PlayerCode; id: PlayerId; ncaa_id?: string };

export type RosterEntry = {
  player_code_id?: PlayerCodeId;
  /** In leaderboard data - NCAA id */
  ncaa_id?: string;
  height_in?: number;
  /** Listed jersey number */
  number?: string;
  /** Added by hand to fix errors */
  alt_number?: string;
  /** From NCAA roster - just G, F, C */
  pos?: string;
  /** We inject this periodically based on the most recent stats */
  role?: string;
  /** Ft-In format */
  height?: string;
  /** Fr/So/Jr/Sr */
  year_class?: string;
  gp?: number;
  /** From NCAA roster - "town, ST" in USA or "city, country" if foreign */
  origin?: string;
  lat?: number;
  lon?: number;
};

/** (For legacy code - doesn't support other) */
export type OnOffBaselineEnum = "on" | "off" | "baseline";

/** For indexing the different row-pair types in the TeamStatsTable */
export type OnOffBaselineOtherEnum = OnOffBaselineEnum | "other";

/** (For legacy code - doesn't support other) */
export type OnOffBaselineGlobalEnum = "on" | "off" | "baseline" | "global";

/** For indexing the different row-pair types in the RosterStatsTable */
export type OnOffBaselineGlobalOtherEnum = OnOffBaselineGlobalEnum | "other";

//////////////////////////////////////

// Invidual

/** Non statistical metadata relating to individuals */
export type IndivMetadata = {
  /** eg 'Ayala, Eric' - Id and Key are considered equivalent here  - this field is required */
  key: PlayerId;

  /** For responses that come from ES, a useful indicator of whether the query matched */
  doc_count?: number;

  /** Comes from the ES response */
  player_array?: any; //(long nested type)

  /** Some display info */
  off_title?: string | React.ReactNode;

  /** eg 'Ayala, Eric' gives ErAyala */
  code?: PlayerCode;

  /** Roster info for the player */
  roster?: RosterEntry;

  /** Gets abused to display roster info (height) in the table */
  def_efg?: React.ReactNode;

  /** Gets abused to display roster info (year/class) in the table */
  def_assist?: React.ReactNode;

  /** Gets abused to display positional information in the table */
  def_usage?: React.ReactNode;

  /** These can be elements to show spinner while loading */
  off_adj_rapm?: React.ReactNode;
  def_adj_rapm?: React.ReactNode;
  off_adj_rapm_prod?: React.ReactNode;
  def_adj_rapm_prod?: React.ReactNode;

  // Implementation detail for roster stats table:
  onOffKey?: "On" | "Off" | "Baseline" | "Global";

  // These are used in the leaderboard:
  conf?: string;
  team?: string;
  year?: string;
};

/** Derived stats we add to the individual's stat set */
export type IndivEnrichment = {
  /** Positional info derived from statistics */
  role?: string;

  /** Positional diag info - see also IndivPosInfo below */
  posClass?: string;
  posConfidences?: number[];
  posFreqs?: number[];

  /** Luck diags */
  off_luck?: OffLuckAdjustmentDiags;
  /** Luck diags */
  def_luck?: DefLuckAdjustmentDiags;

  /** Off Rating diags */
  diag_off_rtg?: ORtgDiagnostics;
  /** Def Rating diags */
  diag_def_rtg?: DRtgDiagnostics;
};

export type IndivStatSet = PureStatSet & IndivEnrichment & IndivMetadata;

export type IndivCareerStatSet = IndivStatSet & {
  style?: Record<TopLevelIndivPlayType, PlayTypeStat>;
  rapm?: TeamStatSet;
  on?: TeamStatSet;
  off?: TeamStatSet;
};

export type IndivCareerInfo = {
  season: IndivCareerStatSet;
  t100?: IndivCareerStatSet;
  conf?: IndivCareerStatSet;
};

/** Contains stats defining the position role for a given player */
export type IndivPosInfo = {
  posClass: string;
  posConfidences: number[];
  roster?: RosterEntry;
};

//////////////////////////////////////

// Team

/** Non statistical metadata relating to teams */
export type TeamMetadata = {
  /** For responses that come from ES, a useful indicator of whether the query matched */
  doc_count: number;

  /** Only present for global team info */
  roster?: Record<PlayerCode, RosterEntry>;
};

/** Derived stats we add to the team's stat set */
export type TeamEnrichment = {
  // Title info for tables
  off_title?: string | React.ReactNode;
  def_title?: string | React.ReactNode;

  /** Abused to contain the raw net rating (adjusted is in off_net) */
  def_net?: StatisticOrRender;
};

export type TeamStatSet = PureStatSet & TeamEnrichment & TeamMetadata;

//////////////////////////////////////

// Lineup

export type GameInfoStatSet = Record<string, any>; //TODO: model properly

/** Non statistical metadata relating to individuals */
export type LineupMetadata = {
  /** Required, list of codes, _ separated */
  key: string;

  /** For responses that come from ES, a useful indicator of whether the query matched */
  doc_count?: number;

  /** Comes from the ES response */
  players_array?: any; //(long nested type)

  /** From ES (object) or derived by aggregation (list), TODO encode the type */
  game_info?: GameInfoStatSet | Array<GameInfoStatSet>;

  // These are used in the leaderboard:
  conf?: string;
  team?: string;
  year?: string;
  /** Injected info about players for lineup leaderboards */
  player_info?: Record<PlayerId, IndivPosInfo & IndivStatSet>;
};

/** Derived stats we add to the individual's stat set */
export type LineupEnrichment = {
  /** Luck diags */
  off_luck_diags?: OffLuckAdjustmentDiags;
  /** Luck diags */
  def_luck_diags?: DefLuckAdjustmentDiags;

  /** For aggregating lineups with a filter (RAPM specific logic) - this is the unfiltered version */
  all_lineups?: LineupStatSet; //TODO: horrible recursiveness, should fix

  /** The key field when the lineup is an aggregation (TODO: should just rename to key I think?) */
  posKey?: string;

  /** The codes and ids of players in a lineup */
  codesAndIds?: Array<PlayerCodeId>;

  // Title info for tables
  off_title?: string | React.ReactNode;
  def_title?: string | React.ReactNode;

  /** Abused to contain the raw net rating (adjusted is in off_net) */
  def_net?: StatisticOrRender;

  /** Temp hacky flag to optimize some loops during RAPM */
  rapmRemove?: boolean;

  // see also LineupUtils:OnOffLineupStatSet
};

export type LineupStatSet = PureStatSet & LineupEnrichment & LineupMetadata;

//////////////////////////////////////

// Shot Charts

export interface HexZone {
  minDist: number;
  maxDist: number;
  distCenter?: number; //(if not specified then take average)
  minAngle: number;
  maxAngle: number;
  angleOffset: number;
  frequency: number;
  intensity: number;
  total_freq?: number;
  shots?: any[]; //(for debugging)
}

export interface CompressedHexData {
  doc_count: number;
  keys: string[]; //(have to zip these with the info, ES storage limitation)
  info: [number, number, number, number][]; //(x, y, total_pts, doc_count)
}
export interface CompressedHexZone {
  total_freq: number;
  info: [number, number, number][]; //(index, frequency, intensity)
  data?: CompressedHexData;
}

export interface HexData {
  key: string;
  frequency: number;
  intensity: number;
  x: number;
  y: number;
  tooltip: string;
}

export type ShotStats = {
  doc_count?: number;
  shot_chart?: {
    buckets: any[];
  };
};

export type ShotStatsModel = {
  on: {
    off: ShotStats;
    def: ShotStats;
  };
  off: {
    off: ShotStats;
    def: ShotStats;
  };
  other: {
    off: ShotStats;
    def: ShotStats;
  }[];
  baseline: {
    off: ShotStats;
    def: ShotStats;
  };
} & {
  onOffMode?: boolean;
  error_code?: string;
};

export type PlayerShotStatsModel = {
  on: Record<PlayerId, ShotStats>;
  off: Record<PlayerId, ShotStats>;
  other: Record<PlayerId, ShotStats>[];
  baseline: Record<PlayerId, ShotStats>;
} & {
  onOffMode?: boolean;
  error_code?: string;
};

//////////////////////////////////////

/** For team leaderboard info */
export type TeamInfo = {
  team_name: string;
  gender: string;
  year: string;
  conf: string;
  adj_off: number;
  adj_def: number;
  adj_off_calc: number; // calculated from raw PPP and SoS
  adj_def_calc: number;
  adj_off_calc_30d: number; // calculated from raw PPP and SoS, last 30d
  adj_def_calc_30d: number;

  opponents: Array<{
    oppo_name: string;
    date_str: string;
    date: number;
    team_scored: number;
    oppo_scored: number;
    off_poss: number;
    def_poss: number;
    avg_lead: number;
    location_type: "Home" | "Away" | "Neutral";
    rank: number;
    adj_off: number;
    adj_def: number;
    wab: number;
    wae: number;
  }>;
};

/** For team stats leaderboard info */
export type TeamStatInfo = {
  team_name: string;
  gender: string;
  year: string;
  conf: string;

  stats: PureStatSet;
};

/** Useful type */
export type RosterStatsByCode = Record<PlayerCode, IndivStatSet>;

//////////////////////////////////////

/* Lineup stints */

export type LineupStintScoreInfo = {
  scored: number;
  allowed: number;
};

export type LineupStintTeamStat = {
  total: number;
  early?: number;
  orb?: number;
  ast?: number;
};

export type LineupStintTeamShot = {
  made?: LineupStintTeamStat;
  attempts?: LineupStintTeamStat;
  ast?: LineupStintTeamStat;
  counts?: LineupStintTeamStat;
};

export type LineupStintTeamStats = {
  num_possessions: number;
  pts: number;
  plus_minus: number;
  player_shot_info: Record<string, number>; //(these are weirdly formatted, use with care)
} & Record<string, LineupStintTeamShot | LineupStintTeamStat>;

export type PlayerCodeIdWithStintStats = {
  stats?: LineupStintTeamStats;
} & PlayerCodeId;

export type LineupStintInfo = {
  players: PlayerCodeIdWithStintStats[];
  lineup_id: string;
  start_min: number;
  end_min: number;
  duration_mins: number;
  duration: number;
  team: {
    team: string;
    year: string;
  };
  opponent: {
    team: string;
    year: string;
  };
  score_info: {
    start_diff: number;
    end_diff: number;
    start: LineupStintScoreInfo;
    end: LineupStintScoreInfo;
  };
  team_stats: LineupStintTeamStats;
  opponent_stats: LineupStintTeamStats;
};

//////////////////////////////////////

/* Time-binned stint aggregations (for averaged stint analysis) */

/** Player stats within a time bin */
export type TimeBinPlayerStats = {
  key: string; // player code
  doc_count: number;
  // Player stats from player_stats.*
  num_possessions: { value: number };
  pts: { value: number };
  to: { value: number };
  assist: { value: number };
  stl: { value: number };
  blk: { value: number };
  foul: { value: number };
  orb: { value: number };
  drb: { value: number };
  fg_2p_made: { value: number };
  fg_2p_attempts: { value: number };
  fg_2p_ast: { value: number };
  fg_3p_made: { value: number };
  fg_3p_attempts: { value: number };
  fg_3p_ast: { value: number };
  fg_rim_made: { value: number };
  fg_rim_attempts: { value: number };
  fg_mid_made: { value: number };
  fg_mid_attempts: { value: number };
  ft_made: { value: number };
  ft_attempts: { value: number };
  fg_made: { value: number };
  fg_attempts: { value: number };
  // Team stats for when this player was on court (for usage calc)
  team_num_possessions: { value: number };
  team_plus_minus: { value: number };
};

/** Team stats sub-aggregation within a time bin (from lineup docs only) */
export type TimeBinTeamStatsAgg = {
  doc_count: number;
  // Offensive stats (from team_stats.*)
  off_num_possessions: { value: number };
  off_pts: { value: number };
  off_plus_minus: { value: number };
  off_to: { value: number };
  off_assist: { value: number };
  off_stl: { value: number };
  off_blk: { value: number };
  off_foul: { value: number };
  off_orb: { value: number };
  off_drb: { value: number };
  off_fg_2p_made: { value: number };
  off_fg_2p_attempts: { value: number };
  off_fg_3p_made: { value: number };
  off_fg_3p_attempts: { value: number };
  off_fg_rim_made: { value: number };
  off_fg_rim_attempts: { value: number };
  off_fg_mid_made: { value: number };
  off_fg_mid_attempts: { value: number };
  off_ft_made: { value: number };
  off_ft_attempts: { value: number };
  off_fg_made: { value: number };
  off_fg_attempts: { value: number };
  // Defensive stats (from opponent_stats.*)
  def_num_possessions: { value: number };
  def_pts: { value: number };
  def_plus_minus: { value: number };
  def_to: { value: number };
  def_assist: { value: number };
  def_stl: { value: number };
  def_blk: { value: number };
  def_foul: { value: number };
  def_orb: { value: number };
  def_drb: { value: number };
  def_fg_2p_made: { value: number };
  def_fg_2p_attempts: { value: number };
  def_fg_3p_made: { value: number };
  def_fg_3p_attempts: { value: number };
  def_fg_rim_made: { value: number };
  def_fg_rim_attempts: { value: number };
  def_fg_mid_made: { value: number };
  def_fg_mid_attempts: { value: number };
  def_ft_made: { value: number };
  def_ft_attempts: { value: number };
  def_fg_made: { value: number };
  def_fg_attempts: { value: number };
};

/** Player stats sub-aggregation within a time bin (from player_events docs only) */
export type TimeBinPlayerStatsAgg = {
  doc_count: number;
  players: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: TimeBinPlayerStats[];
  };
};

/** Complete stats for a time bin */
export type TimeBinStats = {
  doc_count: number;
  // Team stats from lineup docs only
  team_stats: TimeBinTeamStatsAgg;
  // Player stats from player_events docs only
  player_stats: TimeBinPlayerStatsAgg;
};

/** Complete time-binned aggregation response */
export type TimeBinnedAggregation = {
  [key: `bin_${number}`]: TimeBinStats;
};

//////////////////////////////////////

/** Useful constants */
export class StatModels {
  static emptyIndiv: () => IndivStatSet = () => {
    return { key: "empty", doc_count: 0 } as IndivStatSet;
  };
  static emptyTeam: () => TeamStatSet = () => {
    return { doc_count: 0 } as TeamStatSet;
  };
  static emptyLineup: () => LineupStatSet = () => {
    return { key: "empty", doc_count: 0 } as LineupStatSet;
  };
}
