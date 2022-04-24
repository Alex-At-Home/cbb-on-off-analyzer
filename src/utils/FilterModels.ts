import { DateUtils } from "./DateUtils";

/** Typescript limitations - also have to repeat this for ParamPrefixesType */
export class ParamPrefixes {
  static readonly game = "game-"; //(this is on-off / team info)
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
  queryFilters?: string, //(missing iff empty)

  // FOR INTERNAL USE ONLY
  invertBase?: string //special case - the inverse of these two are used in combination with the usual queryFilters/baseQuery
  invertBaseQueryFilters?: string
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
  onQueryFilters?: string, //(missing iff empty)
  offQueryFilters?: string, //(missing iff empty)
  autoOffQuery?: boolean
  // Team view
  teamDiffs?: boolean,
  showExtraInfo?: boolean,
  showTeamPlayTypes?: boolean,
  showRoster?: boolean,
  showGrades?: string,
  // Manual override:
  manual?: ManualOverride[],
  showPlayerManual?: boolean,
  showOnBallConfig?: boolean,
  // Global luck adjustments
  luck?: LuckParams, //(missing iff default)
  // Luck adjustments
  onOffLuck?: boolean,
  showOnOffLuckDiags?: boolean,
  showPlayerOnOffLuckDiags?: boolean,
  showPlayerPlayTypes?: boolean,
  // Misc display:
  showInfoSubHeader?: boolean,
  // Filtering of individual view:
  filter?: string,
  sortBy?: string,
  showBase?: boolean,
  showExpanded?: boolean,
  showDiag?: boolean
  possAsPct?: boolean,
  factorMins?: boolean,
  showPosDiag?: boolean,
  calcRapm?: boolean,
  // For leaderboard building:
  getGames?: boolean
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

export type TeamEditorParams = {
  [P in keyof PlayerLeaderboardParams]?: PlayerLeaderboardParams[P];
} & {
  // Player editor settings:
  showPrevSeasons?: boolean, //(defaults to false)
  offSeason?: boolean, //(defaults to true, else shows current performance - for building all star teams and seeing effect of injury)
  evalMode?: boolean, //(defaults to false, if true will compare the season X with the predictions from the previous offseason)
  alwaysShowBench?: boolean, //(defaults to false)
  superSeniorsBack?: boolean, //(defaults to false)
  // Controls what transfers are shown
  showOnlyTransfers?: boolean, //(defaults to true)
  showOnlyCurrentYear?: boolean, //(defaults to true)
  diffBasis?: string, //JSON representation of the starting point for showing diffs
  // Editor state
  deletedPlayers?: string, //;-separated list
  disabledPlayers?: string,//;-separated list
  addedPlayers?: string, //;-separated list
  editOpen?: string, //;-separated list, <key>|<open-tab>
  overrides?: string; //;-separated list, see TeamEditorUtils.PlayerEditModel
  allEditOpen?: string, //(defaults to undefined, all edit pages open to the tab if true)
};

export type OffseasonLeaderboardParams = {
  year?: string,
  teamView?: string,
  confs?: string,
  evalMode?: boolean,
} & Record<string, string>;

export type PlayerLeaderboardParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  tier?: string,  //All, High, Medium, Low
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
  advancedFilter?: string,
  // Misc display:
  showInfoSubHeader?: boolean,
  // Query pre-sets
  confOnly?: boolean,
  t100?: boolean,
  // Transfer info
  transferMode?: string //==true => show only available, vs ==$year show all
};

export type TeamLeaderboardParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  conf?: string, //(undefined ==> all conferences)
  // Lots of settings:
  qualityWeight?: string,
  pinQualityWeight?: string,
  wabWeight?: string,
  pinWabWeight?: string,
  waeWeight?: string,
  pinWaeWeight?: string,
  domWeight?: string,
  pinDomWeight?: string,
  timeWeight?: string
  pinTimeWeight?: string
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
  static readonly defaultTeamShowRoster = false;
  static readonly defaultTeamEnabledGrade = "rank:Combo";
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
  // Team leaderboard
  static readonly defaultTeamLboardQualityWeight = "0.5";
  static readonly defaultTeamLboardDomWeight = "0.25";
  static readonly defaultTeamLboardWabWeight = "0.5"; //(don't have decimal places for comparison with "" + 1.0)
  static readonly defaultTeamLboardWaeWeight = "0.25";
  static readonly defaultTeamLboardTimeWeight = "0"; //(don't have decimal places for comparison with "" + 0.0)
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
  static readonly defaultYear = DateUtils.mostRecentYearWithData;
  static readonly defaultLeaderboardYear = DateUtils.mostRecentYearWithLboardData; //(takes a while longer to get updated)
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
  paramsObj: FilterParamsType,
  includeRoster?: boolean //(if true will fetch the roster, eg one call per page should do this)
};
