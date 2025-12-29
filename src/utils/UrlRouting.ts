// Lodash
import _ from "lodash";

// Additional components:
import { QueryUtils } from "./QueryUtils";

// Utils
import {
  CommonFilterParams,
  GameFilterParams,
  LineupFilterParams,
  LineupLeaderboardParams,
  OffseasonLeaderboardParams,
  PlayerCareerParams,
  PlayerLeaderboardParams,
  TeamEditorParams,
  TeamReportFilterParams,
  TeamStatsExplorerChartParams,
  TeamStatsExplorerParams,
} from "../utils/FilterModels";
import {
  PlayerSeasonComparisonParams,
  MatchupFilterParams,
} from "./FilterModels";

/** Url routing utils */
export class UrlRouting {
  static readonly noPrefix = "";

  /** If any of these change then copy between saved (and reset the others) */
  static readonly commonParams = ["year", "team", "gender"];

  /** If one of the common params changed, then copy across and */
  static checkForCommonParamChange(
    newParams: any,
    oldParams: any,
    onParamChanges: Array<(params: any) => void>
  ) {
    if (
      _.some(
        UrlRouting.commonParams,
        (param) => newParams[param] != oldParams[param]
      )
    ) {
      const newObj = _.fromPairs(
        UrlRouting.commonParams.map((param) => [param, newParams[param]])
      );
      _.forEach(onParamChanges, (onParamChange) => onParamChange(newObj));
    }
  }

  /** The URL to use to view the Landing Page */
  static getLandingPageUrl(params: CommonFilterParams) {
    return `/?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "On/Off" page [lineupParams is an old val now unused] */
  static getGameUrl(params: GameFilterParams, lineupParams: {}) {
    return `/OnOffAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Lineups" page [gameParams is an old val now unused]  */
  static getLineupUrl(params: LineupFilterParams, gameParams: {}) {
    return `/LineupAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Lineup Leaderboard" page */
  static getLineupLeaderboardUrl(params: LineupLeaderboardParams) {
    return `/LineupLeaderboard?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Leaderboard" page */
  static getTeamLeaderboardUrl(params: PlayerLeaderboardParams) {
    return `/TeamLeaderboardPage?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Player Leaderboard" page */
  static getPlayerLeaderboardUrl(params: PlayerLeaderboardParams) {
    return `/PlayerLeaderboard?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Player Leaderboard" page */
  static getPlayerLeaderboardGeoUrl(params: PlayerLeaderboardParams) {
    return `/PlayerLeaderboardGeo?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Player Leaderboard" page */
  static getPlayerCareer(params: PlayerCareerParams) {
    return `/PlayerCareer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: _.omit(params, ["similarityParams"]),
      similarityParams: params.similarityParams,
    })}`;
  }
  /** The URL to use to view the "Team Editor" page */
  static getTeamEditorUrl(params: TeamEditorParams) {
    return `/TeamEditor?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Stats Explorer" page */
  static getTeamStatsExplorerUrl(params: TeamStatsExplorerParams) {
    return `/TeamStatsExplorer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Stats Explorer" page (identical to fn above) */
  static getTeamStatsExplorer(params: TeamStatsExplorerParams) {
    return `/TeamStatsExplorer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Offseason Leaderboard" page */
  static TeamStatsExplorerChart(params: TeamStatsExplorerChartParams) {
    return `/TeamStatsChartPage?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Offseason Leaderboard" page */
  static getOffseasonLeaderboard(params: OffseasonLeaderboardParams) {
    return `/OffseasonLeaderboard?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  static getOffseasonTierList(params: OffseasonLeaderboardParams) {
    return `/OffseasonTierList?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Report" page */
  static getTeamReportUrl(params: TeamReportFilterParams) {
    return `/TeamReport?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the simple prototype for the "Player/Season Comparison" page */
  static getTransferRapmComparisonUrl(params: PlayerSeasonComparisonParams) {
    return `/TransferRapmComparison?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Player/Season Comparison" page */
  static getPlayerSeasonComparisonUrl(params: PlayerSeasonComparisonParams) {
    return `/PlayerSeasonComparison?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Matchup Analyzer" page */
  static getMatchupUrl(params: MatchupFilterParams) {
    return `/MatchupAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  static getCustomMatchupUrl(params: MatchupFilterParams) {
    return `/CustomMatchupAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }
  /** The URL to use to view the "Matchup Analyzer" page */
  static getMatchupPreviewUrl(params: MatchupFilterParams) {
    return `/MatchupPreviewAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noPrefix]: params,
    })}`;
  }

  /** Filters out _lineup or _game from object to avoid them getting chained repeatedly */
  static removedSavedKeys(urlParams: string, suffices: Array<string> = []) {
    return _.pickBy(QueryUtils.parse(urlParams), (value, key) => {
      return !_.some(suffices, (suffix) => key.indexOf(suffix) >= 0);
    });
  }

  /** Builds a state URL out of the base params (key "") and the saved ones (key==prefix)
   * NOTE: you also have to fix QueryUtils.parse (currently by hand!) to parse it correctly
   */
  static getUrl(paramsByPrefix: Record<string, any>) {
    return _.toPairs(paramsByPrefix)
      .map((kv) => {
        const queryStr = QueryUtils.stringify(
          _.mapKeys(kv[1], (value, key) => (kv[0] ? `${kv[0]}.${key}` : key))
        );
        return queryStr == "" ? "" : queryStr + "&";
      })
      .join("");
  }
}
