// Lodash
import _ from "lodash";

// @ts-ignore
import ls from 'local-storage';

// @ts-ignore
import LZUTF8 from 'lzutf8';
import queryString from "query-string";

import { ParamPrefixes, GameFilterParams, LineupFilterParams, TeamReportFilterParams, ParamDefaults } from "../utils/FilterModels";

/** Wraps the local storage based cache of recent requests */
export class HistoryManager {

  static readonly key = "analysisHistory"
  static readonly maxHistorySize = 50;

  /** Returns an ordered list of filter params */
  static getHistory(): Array<[string, GameFilterParams | LineupFilterParams]> {
    return _.flatMap(HistoryManager.getParamStrs(), (param) => {
      if (_.startsWith(param, ParamPrefixes.game)) {
        const paramNoPrefix = param.substring(ParamPrefixes.game.length);
        return [ [ ParamPrefixes.game, queryString.parse(paramNoPrefix) ] ];
      } else if (_.startsWith(param, ParamPrefixes.lineup)) {
        const paramNoPrefix = param.substring(ParamPrefixes.lineup.length);
        return [ [ ParamPrefixes.lineup, queryString.parse(paramNoPrefix) ] ];
      } else {
        return [];
      }
    });
  }

  /** Called when a request is submitted to add/bring to front of history */
  static addParamsToHistory(paramStrPlusPrefix: string) {
    const currParams = HistoryManager.getParamStrs();
    const newParamStrList = _.take(_.concat( // move to the front
      [ paramStrPlusPrefix ],
      _.filter(currParams, (param) => param != paramStrPlusPrefix)
    ), HistoryManager.maxHistorySize);
    (ls as any).set(HistoryManager.key,
      LZUTF8.compress(
        JSON.stringify(newParamStrList), { outputEncoding: "StorageBinaryString" }
      )
    );
  }

  /** Retrieves */
  private static getParamStrs(): Array<string> {
    const result = (ls as any).get(HistoryManager.key);
    if (result) {
      return JSON.parse(LZUTF8.decompress(
        result, { inputEncoding: "StorageBinaryString" }
      )) as Array<string>;
    } else {
      return [];
    }
  }

  /** Picks the right filter params and summarizes */
  static filterSummary(prefix: string, p: GameFilterParams | LineupFilterParams) {
    if (prefix == ParamPrefixes.game) {
      return HistoryManager.gameFilterSummary(p as GameFilterParams);
    } else if (prefix == ParamPrefixes.lineup) {
      return HistoryManager.lineupFilterSummary(p as LineupFilterParams);
    } else {
      return "unknown";
    }
  }

  /** The common component of the filter */
  static commonFilterSummary(p: GameFilterParams | LineupFilterParams) {
    const gender = p.gender || ParamDefaults.defaultGender;
    const getSosFilter = () => {
      if (parseInt(p.minRank || ParamDefaults.defaultMinRank) > 1
            || parseInt(p.maxRank || ParamDefaults.defaultMaxRank) < 360
      ) {
        return ` [${p.minRank}:${p.maxRank}]`;
      } else {
        return "";
      }
    };
    return `${p.year || ParamDefaults.defaultYear} ${p.team || ParamDefaults.defaultTeam} (${gender[0]})${getSosFilter()}`;
  }

  /** Returns a summary string for the game filter */
  static gameFilterSummary(p: GameFilterParams) {
    const isAutoOff =
      (((p.autoOffQuery == undefined) ? "true" : p.autoOffQuery) || "false") == "true";
    const base = `base:'${tidyQuery(p.baseQuery)}'`;
    const on = `on:'${tidyQuery(p.onQuery)}'`;
    const off = isAutoOff ? `auto-off` : `off:'${tidyQuery(p.offQuery)}'`;
    return `On/Off: ${HistoryManager.commonFilterSummary(p)}: ${on}, ${off}, ${base}`;
  }

  /** Returns a summary string for the game filter */
  static lineupFilterSummary(p: LineupFilterParams) {
    const lineupQuery = `query:'${tidyQuery(p.lineupQuery)}'`;
    const otherParams = `max:${p.maxTableSize || ParamDefaults.defaultLineupMaxTableSize}, ` +
      `min-poss:${p.minPoss || ParamDefaults.defaultLineupMinPos}, ` +
      `sort:${p.sortBy || ParamDefaults.defaultLineupSortBy}`;
    return `Lineups: ${HistoryManager.commonFilterSummary(p)}: ${lineupQuery} (${otherParams})`;
  }

  /** Returns a summary string for the game filter */
  static teamReportFilterSummary(p: TeamReportFilterParams) {
    const baseQuery = `query:'${tidyQuery(p.baseQuery)}'`;
    const otherParams = `filter:'', ` +
      `sort:${p.sortBy || ParamDefaults.defaultLineupSortBy}`;
    return `On/Off Report: ${HistoryManager.commonFilterSummary(p)}: ${baseQuery} (${otherParams})`;
  }
}
/** (handy util) */
function tidyQuery(q: string | undefined | null): string {
  return (q || "").replace(/'/g, '"');
}
