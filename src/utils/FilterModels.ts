
/** Typescript limitations - also have to repeat this for ParamPrefixesType */
export class ParamPrefixes {
  static readonly game = "game-";
  static readonly lineup = "lineup-";
  static readonly report = "report-"; //(not used currrently, we re-use lineup)
  static readonly roster = "roster-";
  static readonly player = "player-";
}
export type ParamPrefixesType = "game-" | "lineup-" | "report-" | "roster-" | "player-";

/** The common luck config */
export type LuckParams = {
  base: "baseline" | "season"
};

export type ManualOverride = {
  rowId: string, //(the player key, lineup key, or on/off key)
  statName: string, //(the field that has been changed)
  newVal: number,
  use: boolean
}

/** Common params across all filter types */
export type CommonFilterParams = {
  year?: string,
  team?: string,
  gender?: string,
  minRank?: string,
  maxRank?: string,
  baseQuery?: string,
  filterGarbage?: boolean, //(missing iff "false")
  queryFilters?: string //(missing iff empty)
};

/** Extracts the common params from a superset */
export function getCommonFilterParams(p: CommonFilterParams) {
  return {
    year: p.year,
    team: p.team,
    gender: p.gender,
    minRank: p.minRank,
    maxRank: p.maxRank,
    baseQuery: p.baseQuery,
    filterGarbage: p.filterGarbage,
    queryFilters: p.queryFilters
  };
}

/** Extracts the common leaderboard params from a superset */
export function getCommonLboardFilterParams(p: CommonFilterParams, tier?: string) {
  return {
    tier: tier,
    year: p.year,
    gender: p.gender,
  };
}

/** Combined params for game filtering */
export type GameFilterParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  onQuery?: string,
  offQuery?: string,
  autoOffQuery?: boolean
  // Team view
  teamDiffs?: boolean,
  showTeamPlayTypes?: boolean,
  showLineups?: boolean,
  // Manual override:
  manual?: ManualOverride[],
  showPlayerManual?: boolean,
  // Global luck adjustments
  luck?: LuckParams, //(missing iff default)
  // Luck adjustments
  onOffLuck?: boolean,
  showOnOffLuckDiags?: boolean,
  showPlayerOnOffLuckDiags?: boolean,
  showPlayerPlayTypes?: boolean,
  // Filtering of individual view:
  filter?: string,
  sortBy?: string,
  showBase?: boolean,
  showExpanded?: boolean,
  showDiag?: boolean
  possAsPct?: boolean,
  factorMins?: boolean,
  showPosDiag?: boolean,
  calcRapm?: boolean
};

/** Params for lineup filtering */
export type LineupFilterParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  // These params need to be explicitly merged in buildParamsFromState(true)
  // For sorting in the generated table:
  decorate?: boolean,
  showTotal?: boolean,
  minPoss?: string,
  maxTableSize?: string,
  sortBy?: string,
  // Filtering:
  filter?: string,
  // Luck adjustments
  luck?: LuckParams, //(missing iff default)
  lineupLuck?: boolean,
  showLineupLuckDiags?: boolean,
  // Other features:
  aggByPos?: string,
  showGameInfo?: boolean
};

export type LineupLeaderboardParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  tier?: string, //High, Medium, Low
  conf?: string, //(undefined ==> all conferences)
  minPoss?: string,
  maxTableSize?: string,
  sortBy?: string,
  // Filtering:
  filter?: string,
  lineupFilters?: string,
  // Luck adjustments
  showLineupLuckDiags?: boolean,
  // Query pre-sets
  confOnly?: boolean,
  t100?: boolean
};

export type PlayerLeaderboardParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  tier?: string,  //High, Medium, Low
  conf?: string, //(undefined ==> all conferences)
  minPoss?: string,
  maxTableSize?: string,
  sortBy?: string,
  // Player settings
  posClasses?: string, //(undefined => all positions)
  possAsPct?: boolean,
  factorMins?: boolean,
  useRapm?: boolean,
  // Filtering:
  filter?: string,
  // Query pre-sets
  confOnly?: boolean,
  t100?: boolean
};

export type TeamReportFilterParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  // These params need to be explicitly merged in buildParamsFromState(true)
  // For sorting in the generated table:
  sortBy?: string,
  // Filtering:
  filter?: string,
  showOnOff?: boolean,
  showComps?: boolean,
  incRepOnOff?: boolean,
  regressDiffs?: string, //+ve to add that number of 0 samples, -ve to regress to the given sample size
  repOnOffDiagMode?: string //(the number of diagnostic lineups to show, basically 0 or 20:sort order:sort field)
  incRapm?: boolean,
  rapmDiagMode?: string, //"" if disabled, "team" if enabled with nobody expanded, "playerId[;playerId]+" if expanded for players
  rapmPriorMode?: string, //(-1==default==adapative, else the prior weight as 0->1)
  // Luck adjustments
  luck?: LuckParams, //(missing iff default)
  teamLuck?: boolean
  //(there's no luck diags here because we're applying at the lineup level)
};

/** Used to give compile errors if a field is omitted, for fw compat */
export type RequiredTeamReportFilterParams = {
  [P in keyof TeamReportFilterParams]?: TeamReportFilterParams[P];
} & {
  [P in keyof Required<CommonFilterParams>]: CommonFilterParams[P] | undefined;
};

export class ParamDefaults {
  // Game
  static readonly defaultAutoOffQuery = true;
  static readonly defaultPlayerFilter = "";
  static readonly defaultPlayerSortBy = "desc:off_team_poss_pct:baseline";
  static readonly defaultOnOffLuckAdjust = false;
  static readonly defaultOnOffLuckDiagMode = false;
  static readonly defaultTeamShowPlayTypes = false;
  static readonly defaultTeamShowLineups = false;
  static readonly defaultPlayerShowPlayTypes = false;
  static readonly defaultPlayerDiagMode = false;
  static readonly defaultPlayerShowBase = false;
  static readonly defaultPlayerShowExpanded = false;
  static readonly defaultPlayerPossAsPct = true;
  static readonly defaultPlayerFactorMins = false;
  static readonly defaultPlayerPosDiagMode = false;
  static readonly defaultPlayerCalcRapm = false;
  // Lineup
  static readonly defaultLineupShowTotal = false;
  static readonly defaultLineupDecorate = true;
  static readonly defaultLineupMinPos = "5";
  static readonly defaultLineupMaxTableSize = "50";
  static readonly defaultLineupSortBy = "desc:off_poss";
  static readonly defaultLineupFilter = "";
  static readonly defaultLineupLuckAdjust = false;
  static readonly defaultLineupLuckDiagMode = false;
  static readonly defaultLineupAggByPos = "";
  static readonly defaultLineupShowGameInfo = false;
  // leaderboards
  static readonly defaultTier = "High";
  // Lineup leaderboard
  static readonly defaultLineupLboardMinPos = "20";
  static readonly defaultLineupLboardMaxTableSize = "100";
  static readonly defaultLineupLboardSortBy = "desc:diff_adj_ppp";
  static readonly defaultLineupLboardFilter = "";
  static readonly defaultLineupLboardLuckDiagMode = false;
  // Player leaderboard
  static readonly defaultPlayerLboardMinPos = "20";
  static readonly defaultPlayerLboardMaxTableSize = "100";
  static defaultPlayerLboardSortBy(useRapm: boolean, factorMins: boolean) {
    return useRapm ? (factorMins ? "desc:diff_adj_rapm_prod" : "desc:diff_adj_rapm") : (factorMins ? "desc:off_adj_prod" : "desc:off_adj_rtg");
  }
  static readonly defaultPlayerLboardFilter = "";
  static readonly defaultPlayerLboardFactorMins = false;
  static readonly defaultPlayerLboardPossAsPct = true;
  static readonly defaultPlayerLboardUseRapm = true;
  // Report
  static readonly defaultTeamReportSortBy = "desc:off_poss:on";
  static readonly defaultTeamReportFilter = "";
  static readonly defaultShowOnOff = true;
  static readonly defaultShowComps = false;
  static readonly defaultTeamReportIncRepOnOff = false;
  static readonly defaultTeamReportIncRapm = false;
  static readonly defaultTeamReportRegressDiffs = "-2000";
  static readonly defaultTeamReportRepOnOffDiagMode = "0";
  static readonly defaultTeamReportRepOnOffDiagModeIfEnabled = [ "20", "-1", "lineup.off_poss.value" ];
  static readonly defaultTeamReportRapmDiagMode = "";
  static readonly defaultTeamReportRapmPriorMode = "-1";
  static readonly defaultTeamReportLuckAdjust = false;
  // Common
  static readonly defaultTeam = "";
  static readonly defaultYear = "2020/21";
  static readonly defaultGender = "Men";
  static readonly defaultMinRank = "0";
  static readonly defaultMaxRank = "400";
  static readonly defaultFilterGarbage = false;
  static readonly defaultQueryFilters = "";
  static readonly defaultLuckConfig: LuckParams = { base: "season" };
};

export type FilterParamsType = GameFilterParams | LineupFilterParams | TeamReportFilterParams;

/** Which API to call and with what object */
export type FilterRequestInfo = {
  context: ParamPrefixesType,
  paramsObj: FilterParamsType
};
