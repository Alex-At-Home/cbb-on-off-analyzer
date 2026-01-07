import { DateUtils } from "./DateUtils";

/** Typescript limitations - also have to repeat this for ParamPrefixesType
 * (in addition to being used as a cache key, this is used to determine when a HeaderBar dropdown is a same-page refresh)
 */
export class ParamPrefixes {
  static readonly game = "game-"; //(this is on-off / team info)
  static readonly lineup = "lineup-";
  static readonly lineupStints = "lineupStints-";
  static readonly report = "report-"; //(only used for HeaderBar, we re-use lineup for AP requests)
  static readonly roster = "roster-";
  static readonly player = "player-";
  static readonly gameInfo = "gameInfo-";
  static readonly shots = "shots-";
  static readonly playerShots = "playerShots-";
  static readonly playerCareer = "playerCareer-";
  static readonly similarPlayers = "similarPlayers-";
  static readonly team = "team-"; //(only used for HeaderBar)
  static readonly defensiveInfo = "defensiveInfo-"; //(only used for HeaderBar)
  static readonly allTeamInfo = "allTeamInfo-"; //(only used for HeaderBar)
}
export type ParamPrefixesType =
  | "game-"
  | "lineup-"
  | "lineupStints-"
  | "report-"
  | "roster-"
  | "player-"
  | "playerShots-"
  | "playerCareer-"
  | "similarPlayers-"
  | "gameInfo-"
  | "shots-"
  | "defensiveInfo-"
  | "allTeamInfo-";

/** The common luck config */
export type LuckParams = {
  base: "baseline" | "season";
};

export type ManualOverride = {
  rowId: string; //(the player key, lineup key, or on/off key)
  statName: string; //(the field that has been changed)
  newVal: number;
  use: boolean;
};

/** Common params across all filter types */
export type CommonFilterParams = {
  year?: string;
  team?: string;
  gender?: string;
  minRank?: string;
  maxRank?: string;
  baseQuery?: string;
  filterGarbage?: boolean; //(missing iff "false")
  queryFilters?: string; //(missing iff empty)

  // FOR INTERNAL USE ONLY
  invertBase?: string; //special case - the inverse of these two are used in combination with the usual queryFilters/baseQuery
  invertBaseQueryFilters?: string;
};

export type QueryWithFilters = {
  query?: string;
  queryFilters?: string;
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
    queryFilters: p.queryFilters,
  };
}

/** Extracts the most basic params from a superset (eg for getting the params for game reports) */
export function getBaseFilterParams(p: CommonFilterParams) {
  return {
    year: p.year,
    team: p.team,
    gender: p.gender,
  };
}

/** Extracts the common leaderboard params from a superset */
export function getCommonLboardFilterParams(
  p: CommonFilterParams,
  tier?: string
) {
  return {
    tier: tier,
    year: p.year,
    gender: p.gender,
  };
}

/** Combined params for analyzing game match-ups */
export type MatchupFilterParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  oppoTeam?: string;
  luck?: LuckParams; //(missing iff default)
  onOffLuck?: boolean;
  showUsage?: boolean; // show player usage in stint view
  showPpp?: boolean; // show player ppp in stint view
  showLabels?: boolean; // show player ppp in stint view
  labelToShow?: string; // show player ppp in stint view
  posClasses?: string; // which position classes to show
  showTeam?: boolean;
  showOppo?: boolean;
  iconType?: string; // "logo" / "icon" / "jersey" / "pos"
  factorMins?: boolean; //impact vs /100 (defaults to true)
  lockAspect?: boolean; //(force x to be correct proportions to y)
  breakdownConfig?: string; //(currently: [off|def];[off|def])
  shotChartsShowZones?: boolean;
  shotChartsUseEfg?: boolean;
  customDisplayMode?: string; //(write only: CSV list: can be teamStats|playTypes)
  playStyleConfigStr?: string; //(chart configuration string)
};

/** Combined params for game filtering - Don't forget need to update GameFilter as well when adding to here
 * ALSO need to update OnOffAnalyzer.onGameFilterParamsChange to decide how to handle each param change
 */
export type GameFilterParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  // UI
  advancedMode?: boolean;
  presetMode?: string;
  presetSplit?: string;
  splitText?: string[]; //(if present then use instead of A/etc in the rows)
  baseText?: string;
  splitPhrases?: string[]; //(if present then use instead of A/etc in smaller places)
  basePhrase?: string;
  // Base on/off
  onQuery?: string;
  offQuery?: string;
  onQueryFilters?: string; //(missing iff empty)
  offQueryFilters?: string; //(missing iff empty)
  otherQueries?: QueryWithFilters[]; // In addition to A-on/B-off, allows for C+ queries
  autoOffQuery?: boolean;
  stickyQuickToggle?: boolean; //(true by default, if disabled will not show the quick toggle for this page)
  // Team view
  teamDiffs?: boolean;
  showExtraInfo?: boolean;
  showTeamPlayTypes?: boolean;
  teamPlayTypeConfig?: string;
  teamPlayStyleConfig?: string; //"off", "def", or "offdef"
  showRoster?: boolean;
  showGameInfo?: boolean;
  showGrades?: string;
  // Indiv view
  showPlayerGrades?: string;
  // Manual override:
  manual?: ManualOverride[];
  showPlayerManual?: boolean;
  showOnBallConfig?: boolean;
  // Global luck adjustments
  luck?: LuckParams; //(missing iff default)
  // Luck adjustments
  onOffLuck?: boolean;
  showOnOffLuckDiags?: boolean;
  showPlayerOnOffLuckDiags?: boolean;
  showPlayerPlayTypes?: boolean;
  showPlayerPlayTypesAdjPpp?: boolean;
  showPlayerPlayTypesPlayType?: string;
  // Misc display:
  showInfoSubHeader?: boolean;
  // Filtering of individual view:
  filter?: string;
  sortBy?: string;
  showBase?: boolean;
  showExpanded?: boolean;
  showDiag?: boolean;
  possAsPct?: boolean;
  factorMins?: boolean;
  showPosDiag?: boolean;
  // RAPM
  calcRapm?: boolean;
  rapmPriorMode?: string; //(-1==default==adapative, else the prior weight as 0->1)
  rapmRegressMode?: string; //0-1 to force the regression, or -1 to auto-choose (default: -1)
  // For leaderboard building:
  getGames?: boolean;
  // Shot chart params:
  teamShotCharts?: boolean;
  teamShotChartsShowZones?: boolean;
  teamShotChartsUseEfg?: boolean;
  playerShotCharts?: boolean;
  playerShotChartsShowZones?: boolean;
  playerShotChartsUseEfg?: boolean;
};

/** Params for lineup filtering */
export type LineupFilterParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  // UI
  advancedMode?: boolean;
  presetMode?: string;
  presetGroup?: string;
  tablePreset?: string;
  tableConfigExtraCols?: string[];
  tableConfigDisabledCols?: string[];
  // These params need to be explicitly merged in buildParamsFromState(true)
  // For sorting in the generated table:
  decorate?: boolean;
  lineupFontSize?: string;
  showTotal?: boolean;
  showOff?: boolean;
  minPoss?: string;
  showRawPts?: boolean;
  maxTableSize?: string;
  sortBy?: string;
  // Filtering:
  filter?: string;
  // Luck adjustments
  luck?: LuckParams; //(missing iff default)
  lineupLuck?: boolean;
  showLineupLuckDiags?: boolean;
  // Other features:
  aggByPos?: string;
  onOffPlayerSel?: string;
  wowyPlayerSel?: string; //on^off| where on/off are ;-sep-lists
  showGameInfo?: boolean;
  stickyQuickToggle?: boolean; //(true by default, if disabled will not show the quick toggle for this page)
};

export type LineupLeaderboardParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  tier?: string; //High, Medium, Low
  conf?: string; //(undefined ==> all conferences)
  minPoss?: string;
  maxTableSize?: string;
  sortBy?: string;
  // Filtering:
  filter?: string;
  lineupFilters?: string;
  // Luck adjustments
  showLineupLuckDiags?: boolean;
  // Query pre-sets
  confOnly?: boolean;
  t100?: boolean;
};

export type TeamEditorParams = {
  [P in keyof PlayerLeaderboardParams]?: PlayerLeaderboardParams[P];
} & {
  // Player editor settings:
  showPrevSeasons?: boolean; //(defaults to false)
  offSeason?: boolean; //(defaults to true, else shows current performance - for building all star teams and seeing effect of injury)
  evalMode?: boolean; //(defaults to false, if true will compare the season X with the predictions from the previous offseason)
  alwaysShowBench?: boolean; //(defaults to false)
  superSeniorsBack?: boolean; //(defaults to false)
  // Controls what transfers are shown
  showOnlyTransfers?: boolean; //(defaults to true)
  showOnlyCurrentYear?: boolean; //(defaults to true)
  diffBasis?: string; //JSON representation of the starting point for showing diffs
  enableNil?: boolean;
  // Editor state
  deletedPlayers?: string; //;-separated list
  disabledPlayers?: string; //;-separated list
  addedPlayers?: string; //;-separated list
  editOpen?: string; //;-separated list, <key>|<open-tab>
  overrides?: string; //;-separated list, see TeamEditorUtils.PlayerEditModel
  allEditOpen?: string; //(defaults to undefined, all edit pages open to the tab if true)
};

export type TeamStatsExplorerParams = {
  gender?: string;
  year?: string;
  confs?: string;
  t100?: boolean;
  confOnly?: boolean;
  sortBy?: string;
  queryFilters?: string;
  showAdvancedFilter?: boolean;
  advancedFilter?: string;
  showGrades?: string;
  showPlayStyles?: boolean;
  playStyleConfig?: string; //currently "off"/"def"/"offdef"
  playStyleConfigStr?: string; //(chart configuration string)
  showExtraInfo?: boolean;
  luck?: LuckParams; //(missing iff default)
  maxTableSize?: string;
  secretQuery?: string; //(allows table view of all teams)
  stickyQuickToggle?: boolean; //(true by default, if disabled will not show the quick toggle for this page)
};

export type OffseasonLeaderboardParams = {
  gender?: string;
  year?: string;
  teamView?: string; //(show details for a specific team)
  confs?: string;
  evalMode?: boolean;
  transferInOutMode?: boolean;
  showAllTeams?: boolean;
  sortBy?: string; //(for transferInOutMode)
  queryFilters?: string;
} & Record<string, string>; //(for teamOverrides)

export type PlayerCareerParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  ncaaId?: string;
  // Player settings
  possAsPct?: boolean;
  factorMins?: boolean;
  useRapm?: boolean;
  showGrades?: string;
  // Filtering:
  filter?: string;
  sortBy?: string;
  // Misc display:
  showInfoSubHeader?: boolean;
  // Query pre-sets
  yearsToShow?: string;
  d1?: boolean;
  conf?: boolean;
  t100?: boolean;
  // Transfer info
  showExpanded?: boolean;
  stickyQuickToggle?: boolean; //(true by default, if disabled will not show the quick toggle for this page)
  // Shot charts and style:
  playerShotCharts?: boolean;
  playerShotChartsShowZones?: boolean;
  playerShotChartsUseEfg?: boolean;
  playerShotChartQuickSwitch?: string;
  showPlayerPlayTypes?: boolean;
  showPlayerPlayTypesAdjPpp?: boolean;
  showPlayerPlayTypesPlayType?: string;
  // Equivalent for similarity table
  similarityParams?: PlayerCareerParams;
  queryVector?: string; //(only used for API interface)
};

export type PlayerLeaderboardParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  tier?: string; //All, High, Medium, Low
  conf?: string; //(undefined ==> all conferences)
  minPoss?: string;
  maxTableSize?: string;
  sortBy?: string;
  // Player settings
  posClasses?: string; //(undefined => all positions)
  possAsPct?: boolean;
  factorMins?: boolean;
  useRapm?: boolean;
  showGrades?: string;
  // Filtering:
  filter?: string;
  advancedFilter?: string;
  // Misc display:
  showInfoSubHeader?: boolean;
  // Query pre-sets
  confOnly?: boolean;
  t100?: boolean;
  incLowVol?: boolean; //(if true includes players in the ~3-10mpg range who are otherwise filtered out)
  // Transfer info
  transferMode?: string; //==true => show only available, vs ==$year show all, append ":predictions" show all but including predictions
  includePrevYear?: boolean; //(if available add an extra 2 rows with the player's prev year stats)
  // Geo info
  geoCenterLat?: string;
  geoCenterLon?: string;
  geoZoom?: string;
  // Misc view controls
  showExpanded?: boolean;
  stickyQuickToggle?: boolean; //(true by default, if disabled will not show the quick toggle for this page)
  // Shot charts:
  shotCharts?: boolean;
  shotChartsUseEfg?: boolean;
  showPlayerPlayTypes?: boolean;
  showPlayerPlayTypesAdjPpp?: boolean;
  showPlayerPlayTypesPlayType?: string;
};

export type ChartControlParams = {
  year?: string;
  gender?: string;
  confs?: string;
  showConfig?: boolean; //(whether to show all the config for the axis etc)
  showTable?: boolean;
  showOnlyHandSelectedInTable?: boolean; //(if enabled, and any players hand selected, show only those players)
  title?: string;
  datasetFilter?: string;
  highlightFilter?: string;
  queryFilters?: string;
  xAxis?: string;
  yAxis?: string;
  dotSize?: string;
  dotColor?: string;
  dotColorMap?: string;
  labelStrategy?: string;
  pointMarkerType?: string;
  toggledEntities?: string;
};

export type PlayerSeasonComparisonParams = {
  [P in keyof PlayerLeaderboardParams]?: PlayerLeaderboardParams[P];
} & {
  [C in keyof ChartControlParams]?: ChartControlParams[C];
} & {
  showPrevNextInTable?: boolean; //(if showing table, show prev and next stats)
  incLowVol?: boolean;
};

export type TeamStatsExplorerChartParams = {
  [T in keyof TeamStatsExplorerParams]?: TeamStatsExplorerParams[T];
} & {
  [C in keyof ChartControlParams]?: ChartControlParams[C];
};

export type LandingPageParams = {
  team?: string;
  gender?: string;
  year?: string;
  topics?: string; // Comma-separated list of selected topics
  moreDetailsId?: string;
};

export type TeamLeaderboardParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  conf?: string; //(undefined ==> all conferences)
  // Lots of settings:
  qualityWeight?: string;
  pinQualityWeight?: string;
  wabWeight?: string;
  pinWabWeight?: string;
  waeWeight?: string;
  pinWaeWeight?: string;
  domWeight?: string;
  pinDomWeight?: string;
  timeWeight?: string;
  pinTimeWeight?: string;
};

export type TeamReportFilterParams = {
  [P in keyof CommonFilterParams]?: CommonFilterParams[P];
} & {
  // These params need to be explicitly merged in buildParamsFromState(true)
  // For sorting in the generated table:
  sortBy?: string;
  // Filtering:
  filter?: string;
  showOnOff?: boolean;
  showComps?: boolean;
  incRepOnOff?: boolean;
  regressDiffs?: string; //+ve to add that number of 0 samples, -ve to regress to the given sample size
  repOnOffDiagMode?: string; //(the number of diagnostic lineups to show, basically 0 or 20:sort order:sort field)
  incRapm?: boolean;
  rapmDiagMode?: string; //"" if disabled, "team" if enabled with nobody expanded, "playerId[;playerId]+" if expanded for players
  rapmPriorMode?: string; //(-1==default==adapative, else the prior weight as 0->1)
  rapmRegressMode?: string; //0-1 to force the regression, or -1 to auto-choose (default: -1)
  // Luck adjustments
  luck?: LuckParams; //(missing iff default)
  teamLuck?: boolean;
  //(there's no luck diags here because we're applying at the lineup level)
  stickyQuickToggle?: boolean; //(true by default, if disabled will not show the quick toggle for this page)
};

/** Used to give compile errors if a field is omitted, for fw compat */
export type RequiredTeamReportFilterParams = {
  [P in keyof TeamReportFilterParams]?: TeamReportFilterParams[P];
} & {
  [P in keyof Required<CommonFilterParams>]: CommonFilterParams[P] | undefined;
};

export class ParamDefaults {
  // Common
  static readonly defaultTeam = "";
  static readonly defaultYear = DateUtils.mostRecentYearWithData;
  static readonly defaultLeaderboardYear =
    DateUtils.mostRecentYearWithLboardData; //(takes a while longer to get updated)
  static readonly defaultGender = "Men";
  static readonly defaultMinRank = "0";
  static readonly defaultMaxRank = "400";
  static readonly defaultFilterGarbage = false;
  static readonly defaultQueryFilters = "";
  static readonly defaultLuckConfig: LuckParams = { base: "season" };
  static readonly defaultEnabledGrade = "rank:Combo";
  static readonly defaultPresetMode = "Season Stats";
  // Game
  static readonly defaultPresetSplit = "No Splits";
  static readonly defaultAutoOffQuery = true;
  static readonly defaultPlayerFilter = "";
  static readonly defaultPlayerSortBy = "desc:off_team_poss_pct:baseline";
  static readonly defaultOnOffLuckAdjust = false;
  static readonly defaultOnOffLuckDiagMode = false;
  static readonly defaultTeamShowPlayTypes = false;
  static readonly defaultTeamPlayTypeConfig = "||||||||||"; //(5 params, all blank)
  static readonly defaultTeamPlayStyleConfig = "off"; //(default to offensive only)
  static readonly defaultTeamShowPlayTypesPlayType = "P%le";
  static readonly defaultTeamShowRoster = false;
  static readonly defaultTeamShowGameInfo = false;
  static readonly defaultPlayerShowPlayTypes = false;
  static readonly defaultPlayerShowPlayTypesPlayType = "P%le";
  static readonly defaultPlayerShowPlayTypesAdjPpp = true;
  static readonly defaultPlayerDiagMode = false;
  static readonly defaultPlayerShowBase = false;
  static readonly defaultPlayerShowExpanded = false;
  static readonly defaultPlayerPossAsPct = true;
  static readonly defaultPlayerFactorMins = false;
  static readonly defaultPlayerPosDiagMode = false;
  static readonly defaultPlayerCalcRapm = false;
  static readonly defaultShotChartShowZones = true;
  // Lineup
  static readonly defaultPresetGroup = "Lineups";
  static readonly defaultLineupShowTotal = false;
  static readonly defaultLineupShowDropped = false;
  static readonly defaultLineupDecorate = true;
  static readonly defaultLineupFontSize = "small";
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
  // Team stats explorer
  static readonly defaultTeamExplorerMaxTableSize = "100";
  static readonly defaultTeamExplorerPlayStyleConfig = "offdef";
  // Player leaderboard
  static readonly defaultPlayerLboardMinPos = "20";
  static readonly defaultPlayerLboardMaxTableSize = "100";
  static readonly defaultPlayerLboardGeoMaxTableSize = "10"; // (otherwise it's too slow)
  static defaultPlayerLboardSortBy(useRapm: boolean, factorMins: boolean) {
    return useRapm
      ? factorMins
        ? "desc:diff_adj_rapm_prod"
        : "desc:diff_adj_rapm"
      : factorMins
      ? "desc:off_adj_prod"
      : "desc:off_adj_rtg";
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
  static readonly defaultTeamReportRepOnOffDiagModeIfEnabled = [
    "20",
    "-1",
    "lineup.off_poss.value",
  ];
  static readonly defaultTeamReportRapmDiagMode = "";
  static readonly defaultTeamReportRapmPriorMode = "-1";
  static readonly defaultTeamReportRapmRegressMode = "-1";
  static readonly defaultTeamReportLuckAdjust = false;
  // Matchup analysis
  static readonly defaultMatchupAnalysisShowUsage = false;
  static readonly defaultMatchupAnalysisAspectLock = false;
  static readonly defaultMatchupAnalysisShowPpp = true;
  static readonly defaultMatchupAnalysisShowLabels = true;
  static readonly defaultMatchupAnalysisLabelToShow = "No Labels";
  static readonly defaultMatchupAnalysisIconType = "logo";
  static readonly defaultMatchupAnalysisBreakdownConfig = "off;def";
}

export type FilterParamsType =
  | GameFilterParams
  | LineupFilterParams
  | TeamReportFilterParams
  | PlayerCareerParams;

/** Which API to call and with what object */
export type FilterRequestInfo = {
  /** Need to start using this to avoid the hideous array wrangling I currently have */
  tag?: string;
  context: ParamPrefixesType;
  paramsObj: FilterParamsType;
  includeRoster?: boolean; //(if true will fetch the roster, eg one call per page should do this)
};
