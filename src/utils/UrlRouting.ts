// Lodash
import _ from "lodash";

// Additional components:
import queryString from "query-string";

// Utils
import { GameFilterParams, LineupFilterParams, TeamReportFilterParams } from '../utils/FilterModels';

/** Url routing utils */
export class UrlRouting {

  static readonly noSuffix = "";
  static readonly savedLineupSuffix = "_lineup";
  static readonly savedGameSuffix = "_game";
  static readonly savedTeamReportSuffix = "_report";
  /** List of all the keys that can be saved */
  static readonly savedKeySuffices = [
    UrlRouting.savedLineupSuffix, UrlRouting.savedGameSuffix, UrlRouting.savedTeamReportSuffix
  ];

  /** If any of these change then copy between saved (and reset the others) */
  static readonly commonParams = [ "year", "team", "gender" ];

  /** If one of the common params changed, then copy across and */
  static checkForCommonParamChange(
    newParams: any, oldParams: any,
    onParamChanges: Array<(params: any) => void>
  ) {
    if (_.some(UrlRouting.commonParams, (param) => newParams[param] != oldParams[param])) {
      const newObj = _.fromPairs(
        UrlRouting.commonParams.map((param) => [param, newParams[param]])
      );
      _.forEach(onParamChanges, (onParamChange) => onParamChange(newObj));
    }
  }

  /** The URL to use to view the "On/Off" page */
  static getGameUrl(params: GameFilterParams, lineupParams: LineupFilterParams) {
    return `/?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
      [UrlRouting.savedLineupSuffix]: lineupParams
    })}`;
  }
  /** The URL to use to view the "Lineups" page */
  static getLineupUrl(params: LineupFilterParams, gameParams: GameFilterParams) {
    return `/LineupAnalyzer?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params,
      [UrlRouting.savedGameSuffix]: gameParams
    })}`;
  }
  /** The URL to use to view the "Team Report" page */
  static getTeamReportUrl(params: TeamReportFilterParams) {
    return `/TeamReport?${UrlRouting.getUrl({
      [UrlRouting.noSuffix]: params
    })}`;
  }

  /** Filters out _lineup or _game from object to avoid them getting chained repeatedly */
  static removedSavedKeys(urlParams: string, suffices: Array<string> = UrlRouting.savedKeySuffices) {
    return _.pickBy(queryString.parse(urlParams), (value, key) => {
      return !_.some(suffices, (suffix) => key.indexOf(suffix) >= 0);
    });
  }

  /** Retries only the specified saved URL params */
  static extractSavedKeys(urlParams: string, suffixToKeep: string) {
    return _.mapKeys(_.pickBy(queryString.parse(urlParams), (value, key) => {
      return key.indexOf(suffixToKeep) >= 0;
    }), (value, key) => key.replace(suffixToKeep, ""));
  }

  /** Builds a state URL out of the base params (key "") and the saved ones (key==suffix) */
  static getUrl(paramsBySuffix: Record<string, any>) {
    return _.toPairs(paramsBySuffix).map((kv) => {
      const queryStr =
        queryString.stringify(
          _.mapKeys(kv[1], (value, key) => key + kv[0])
        );
      return (queryStr == "") ? "" : (queryStr + "&");
    }).join("");
  }

}
