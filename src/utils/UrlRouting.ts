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
  PlayerLeaderboardParams,
  TeamEditorParams,
  TeamReportFilterParams,
  TeamStatsExplorerParams,
} from "../utils/FilterModels";
import {
  PlayerSeasonComparisonParams,
  MatchupFilterParams,
} from "./FilterModels";

/** Url routing utils */
export class UrlRouting {
  static readonly noSuffix = "";
  static readonly savedLineupSuffix = "_lineup";
  static readonly savedGameSuffix = "_game";
  static readonly savedTeamReportSuffix = "_report";
  /** List of all the keys that can be saved */
  static readonly savedKeySuffices = [
    UrlRouting.savedLineupSuffix,
    UrlRouting.savedGameSuffix,
    UrlRouting.savedTeamReportSuffix,
  ];

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
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "On/Off" page */
  static getGameUrl(
    params: GameFilterParams,
    lineupParams: LineupFilterParams
  ) {
    return `/OnOffAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
      [UrlRouting.savedLineupSuffix]: lineupParams,
    })}`;
  }
  /** The URL to use to view the "Lineups" page */
  static getLineupUrl(
    params: LineupFilterParams,
    gameParams: GameFilterParams
  ) {
    return `/LineupAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
      [UrlRouting.savedGameSuffix]: gameParams,
    })}`;
  }
  /** The URL to use to view the "Lineup Leaderboard" page */
  static getLineupLeaderboardUrl(params: LineupLeaderboardParams) {
    return `/LineupLeaderboard?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Leaderboard" page */
  static getTeamLeaderboardUrl(params: PlayerLeaderboardParams) {
    return `/TeamLeaderboardPage?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Player Leaderboard" page */
  static getPlayerLeaderboardUrl(params: PlayerLeaderboardParams) {
    return `/PlayerLeaderboard?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Player Leaderboard" page */
  static getPlayerLeaderboardGeoUrl(params: PlayerLeaderboardParams) {
    return `/PlayerLeaderboardGeo?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Editor" page */
  static getTeamEditorUrl(params: TeamEditorParams) {
    return `/TeamEditor?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Stats Explorer" page */
  static getTeamStatsExplorerUrl(params: TeamStatsExplorerParams) {
    return `/TeamStatsExplorer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Offseason Leaderboard" page */
  static getTeamStatsExplorer(params: TeamStatsExplorerParams) {
    return `/TeamStatsExplorer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Offseason Leaderboard" page */
  static getOffseasonLeaderboard(params: OffseasonLeaderboardParams) {
    return `/OffseasonLeaderboard?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Team Report" page */
  static getTeamReportUrl(params: TeamReportFilterParams) {
    return `/TeamReport?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the simple prototype for the "Player/Season Comparison" page */
  static getTransferRapmComparisonUrl(params: PlayerSeasonComparisonParams) {
    return `/TransferRapmComparison?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Player/Season Comparison" page */
  static getPlayerSeasonComparisonUrl(params: PlayerSeasonComparisonParams) {
    return `/PlayerSeasonComparison?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Matchup Analyzer" page */
  static getMatchupUrl(params: MatchupFilterParams) {
    return `/MatchupAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  static getCustomMatchupUrl(params: MatchupFilterParams) {
    return `/CustomMatchupAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }
  /** The URL to use to view the "Matchup Analyzer" page */
  static getMatchupPreviewUrl(params: MatchupFilterParams) {
    return `/MatchupPreviewAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
    })}`;
  }

  /** Filters out _lineup or _game from object to avoid them getting chained repeatedly */
  static removedSavedKeys(
    urlParams: string,
    suffices: Array<string> = UrlRouting.savedKeySuffices
  ) {
    return _.pickBy(QueryUtils.parse(urlParams), (value, key) => {
      return !_.some(suffices, (suffix) => key.indexOf(suffix) >= 0);
    });
  }

  /** Retries only the specified saved URL params */
  static extractSavedKeys(urlParams: string, suffixToKeep: string) {
    return _.mapKeys(
      _.pickBy(QueryUtils.parse(urlParams), (value, key) => {
        return key.indexOf(suffixToKeep) >= 0;
      }),
      (value, key) => key.replace(suffixToKeep, "")
    );
  }

  /** Builds a state URL out of the base params (key "") and the saved ones (key==suffix) */
  static getUrl(paramsBySuffix: Record<string, any>) {
    return _.toPairs(paramsBySuffix)
      .map((kv) => {
        const queryStr = QueryUtils.stringify(
          _.mapKeys(kv[1], (value, key) => key + kv[0])
        );
        return queryStr == "" ? "" : queryStr + "&";
      })
      .join("");
  }
}
