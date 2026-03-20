// @ts-ignore
import "lodash.combinations";
import _ from "lodash";

import queryString from "query-string";

import {
  CommonFilterParams,
  ParamDefaults,
  GameFilterParams,
  DefaultSimilarityConfig,
} from "./FilterModels";

import {
  LineupStatSet,
  PlayerCodeId,
  IndivPosInfo,
  PlayerId,
} from "./StatModels";
import { LineupTableUtils } from "./tables/LineupTableUtils";
import { PositionUtils } from "./stats/PositionUtils";

import { format as dateFormat, parse as dateParse, addYears } from "date-fns";

/** Set to `false` to silence browser-console diagnostics for position-split queries. */
const isPosSplitBuilderDebug = false;

function positionSplitDebug(label: string, payload?: unknown) {
  if (!isPosSplitBuilderDebug) return;
  if (payload !== undefined) {
    console.warn(`[QueryUtils position-split] ${label}`, payload);
  } else {
    console.warn(`[QueryUtils position-split] ${label}`);
  }
}

export type PositionSplitLineupRow = {
  lineupKey: string;
  sortedIds: PlayerId[];
  xPosition: number;
  lowerIds: PlayerId[];
  higherIds: PlayerId[];
};

export type PositionSplitContext = {
  /** Union of ids below X / above X in lineups where X plays (partition + corrupt checks). */
  lowerIds: PlayerId[];
  higherIds: PlayerId[];
  isCorrupt: boolean;
  positionsPlayed: number[];
  lineupRows: PositionSplitLineupRow[];
  /**
   * For ordered slot index 0..4 (PG..C), ids that ever occupy that slot in any qualifying 5-man
   * team lineup. Used for normal-path `{pool}=k` clauses so all roster backcourt/frontcourt combos
   * are allowed, not only teammates who happened to sit below/above X when X was on the court.
   */
  teamSlotOccupants: PlayerId[][];
};

export type CommonFilterTypeSimple =
  | "Conf"
  | "Home"
  | "Away"
  | "Not-Home"
  | "1st-Half"
  | "2nd-Half"
  | "Stretch"
  | "Good-Off"
  | "Good-Def"
  | "Vs-Good"
  | "Last-30d"
  | "Nov-Dec"
  | "Jan-Apr";

export type CommonFilterCustomDate = {
  kind: CustomDateAlias;
  start: Date;
  end: Date;
};

export type CommonFilterGameSelector = {
  kind: GameSelectorAlias;
  specialCase?: "wins"; //(if specified, use instead of gamesIds)
  gameIds: string[]; //(format "YYYYMMDD:[HNA]:team")
};

/** The internal model */
export type GameSelection = {
  date: string; // YYYY-MM-DD
  opponent: string;
  location: string;
  score?: string;
};
export type FilteredGameSelection = {
  filter?: {
    team: string;
    year: string;
    gender: string;
  };
  games: GameSelection[];
};

/** All the different supported filters */
export type CommonFilterType =
  | CommonFilterTypeSimple
  | CommonFilterCustomDate
  | CommonFilterGameSelector;

export function isCommonFilterCustomDate(
  filter: CommonFilterType,
): filter is CommonFilterCustomDate {
  return (
    (filter as CommonFilterCustomDate).kind == QueryUtils.customDateAliasName
  );
}

export function isCommonFilterGameSelector(
  filter: CommonFilterType,
): filter is CommonFilterGameSelector {
  return (
    (filter as CommonFilterGameSelector).kind == QueryUtils.customGamesAliasName
  );
}

// Note name has to match customDateAliasName below
type CustomDateAlias = "Custom-Date";
type GameSelectorAlias = "Custom-Games";

type CommonFilterKeyType =
  | CommonFilterTypeSimple
  | CustomDateAlias
  | GameSelectorAlias;

export class QueryUtils {
  private static readonly legacyQueryField = "lineupQuery";
  private static readonly newQueryField = "baseQuery";

  // Note name has to match CustomDateAlias above
  static readonly customDateAliasName = "Custom-Date";
  private static readonly customDateFormat = "MM.dd";
  static readonly customDatePrefix = "Date:";

  // Note name has to match GameSelectorAlias above
  static readonly customGamesAliasName = "Custom-Games";
  static readonly customGamesPrefix = "Opponents:";

  /**
   * URL fields that must be `string[]` in app state. `query-string` returns a plain string when the
   * key appears once (e.g. `?splitPhrases=foo`), which then breaks lodash zip / indexing (string acts
   * like char[]). We coerce on parse and pad length-1 arrays on stringify so the query repeats the key
   * (`splitPhrases=a&splitPhrases=`).
   *
   * Other minimal library-level options (not used here): use `arrayFormat: 'bracket'` consistently
   * on parse+stringify (`splitPhrases[]=a`) — would change every URL; or ensure every producer passes
   * a second sentinel value (see `buildGameFilterParamsByPlayerPositions`, `MatchupFilter`, `TableDisplayUtils`).
   */
  private static readonly stringArrayUrlKeys = [
    "splitPhrases",
    "splitText",
  ] as const;

  /** Coerce `query-string` output to `string[]` for splitPhrases / splitText. */
  private static coerceUrlValueToStringArray(
    value: unknown,
  ): string[] | undefined {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value.map((v) => String(v));
    if (typeof value === "string") return [value];
    return undefined;
  }

  private static normalizeParsedStringArrayFields(parsed: Record<string, any>) {
    _.forEach(QueryUtils.stringArrayUrlKeys, (key) => {
      const coerced = QueryUtils.coerceUrlValueToStringArray(parsed[key]);
      if (coerced !== undefined) {
        parsed[key] = coerced;
      }
    });
  }

  /** Ensures repeated query keys so parse yields an array; keeps a harmless second slot for zip/UX. */
  private static padStringArrayUrlFieldsForStringify(obj: Record<string, any>) {
    _.forEach(QueryUtils.stringArrayUrlKeys, (key) => {
      const arr = obj[key];
      if (_.isArray(arr) && arr.length === 1) {
        obj[key] = [arr[0], ""];
      }
    });
  }

  /** Wraps QueryUtils.parse but with luck/baseQuery/lineupQuery handling */
  static parse(str: string): any {
    const parsed: Record<string, any> = queryString.parse(str, {
      parseBooleans: true,
    }) as any;
    // Handle baseQuery/lineupQuery
    if (parsed && parsed[QueryUtils.legacyQueryField]) {
      parsed[QueryUtils.newQueryField] = parsed[QueryUtils.legacyQueryField];
      delete parsed[QueryUtils.legacyQueryField];
    }
    // Handle nested luck + manual overrides + other queries:
    const luck = {} as any;
    const manualTmp = {} as any; //(start as map of arrays, will convert to array of maps later)
    const otherQueriesTmp = {} as any;
    const similarityParamsTmp = {} as any;
    const similarityConfigTmp = {} as any;
    _.forEach(parsed, (value: any, key: string) => {
      if (_.startsWith(key, "luck.")) {
        luck[key.substring(5)] = value;
        delete parsed[key];
      } else if (_.startsWith(key, "manual.")) {
        manualTmp[key.substring(7)] = _.isArray(value) ? value : [value];
        delete parsed[key];
      } else if (_.startsWith(key, "similarityParams.")) {
        similarityParamsTmp[key.substring(17)] = value;
        delete parsed[key];
      } else if (_.startsWith(key, "similarityConfig.")) {
        similarityConfigTmp[key.substring(17)] = value;
        delete parsed[key];
      } else if (_.startsWith(key, "otherQueries.")) {
        const otherQueryArr = key.substring(13).split(".");
        const otherQueryKeyIndex = parseInt(otherQueryArr[0]);
        if (otherQueryKeyIndex >= 0) {
          //(eg otherQueries.0.query|queryFilters)
          const tmpObj = otherQueriesTmp[otherQueryArr[0]] || {};
          tmpObj[otherQueryArr[1]] = value;
          otherQueriesTmp[otherQueryArr[0]] = tmpObj;
        }
        delete parsed[key];
      }
    });
    // complete nested overrides
    if (!_.isEmpty(manualTmp)) {
      parsed.manual = manualTmp.rowId.map((rid: string, index: number) => {
        return {
          rowId: rid,
          statName: manualTmp.statName?.[index] || "",
          newVal: parseFloat(manualTmp.newVal?.[index] || ""),
          use: manualTmp.use?.[index] || false,
        };
      });
    }
    if (!_.isEmpty(otherQueriesTmp)) {
      parsed.otherQueries = _.values(otherQueriesTmp);
    }
    if (!_.isEmpty(similarityParamsTmp)) {
      parsed.similarityParams = similarityParamsTmp;
    }
    if (!_.isEmpty(similarityConfigTmp)) {
      // Merge with defaults to ensure all fields are present
      parsed.similarityConfig = {
        ...DefaultSimilarityConfig,
        ...similarityConfigTmp,
      };
    }

    // (Extra annoyance: handle bwc in change of onOffLuck becoming a boolean)
    if (_.isString(parsed.onOffLuck)) {
      luck.base = parsed.onOffLuck;
      parsed.onOffLuck = true;
    }
    if (!_.isEmpty(luck)) {
      parsed.luck = luck;
    }
    QueryUtils.normalizeParsedStringArrayFields(parsed);
    return parsed;
  }
  /** Wraps QueryUtils.parse but with luck/baseQuery/lineupQuery handling */
  static stringify(obj: any): string {
    const objCopy = _.clone(obj); //(shallow clone)
    // Handle nested luck:
    if (objCopy.luck) {
      const luckCfg = objCopy.luck as any;
      delete objCopy.luck;
      _.forEach(luckCfg, (value: any, key: string) => {
        objCopy["luck." + key] = value;
      });
    }
    // Handle manual overrides (convert from array of obj into set of arrays):
    if (objCopy.manual && objCopy.manual.length > 0) {
      const manualOverrides = objCopy.manual as any[];
      delete objCopy.manual;
      _.forEach(manualOverrides[0], (value: any, key: string) => {
        objCopy["manual." + key] = manualOverrides.map((m) => m[key]);
      });
    }
    if (objCopy.otherQueries && objCopy.otherQueries.length > 0) {
      const otherQueries = objCopy.otherQueries as any[];
      delete objCopy.otherQueries;
      _.forEach(otherQueries, (queryObj, index) => {
        _.forEach(queryObj, (value: any, key: string) => {
          objCopy[`otherQueries.${index}.${key}`] = value;
        });
      });
    }
    // Handle similarityParams
    if (objCopy.similarityParams) {
      const similarityParams = objCopy.similarityParams as any;
      delete objCopy.similarityParams;
      _.forEach(similarityParams, (value: any, key: string) => {
        objCopy["similarityParams." + key] = value;
      });
    }
    // Handle similarityConfig - only include non-default values
    if (objCopy.similarityConfig) {
      const similarityConfig = objCopy.similarityConfig as any;
      delete objCopy.similarityConfig;
      _.forEach(similarityConfig, (value: any, key: string) => {
        // Only include in URL if value differs from default
        if (
          value !==
          DefaultSimilarityConfig[key as keyof typeof DefaultSimilarityConfig]
        ) {
          objCopy["similarityConfig." + key] = value;
        }
      });
    }
    // Handle baseQuery/lineupQuery
    if (objCopy && objCopy.hasOwnProperty(QueryUtils.legacyQueryField)) {
      objCopy.baseQuery = (objCopy as any)[QueryUtils.legacyQueryField];
      delete (objCopy as any)[QueryUtils.legacyQueryField];
    }
    QueryUtils.cleanseQuery(objCopy);
    QueryUtils.padStringArrayUrlFieldsForStringify(objCopy);
    return queryString.stringify(objCopy);
  }

  /** Removes some optional fields that we don't want */
  static cleanseQuery(mutableObj: CommonFilterParams) {
    if (mutableObj.filterGarbage == ParamDefaults.defaultFilterGarbage) {
      //default==false => remove altogether
      delete mutableObj.filterGarbage;
    }
    if (mutableObj.queryFilters == ParamDefaults.defaultQueryFilters) {
      //default==[] => remove altogether
      delete mutableObj.queryFilters;
    }
    return mutableObj; //(for chaining)
  }

  /** Returns the advanced query, with NOT support, or undefined if not an advanced query */
  static extractAdvancedQuery(
    maybeAdvQuery: string,
  ): [string, string | undefined] {
    const advancedMatch = /^\s*\[(.*)\]\s*$/.exec(maybeAdvQuery);
    if (advancedMatch) {
      //(just return the raw query, trust that it's well formed)
      return [maybeAdvQuery, advancedMatch[1]];
    } else {
      const advancedMatchNot = /^\s*NOT\s*\(\s*\[(.*)\]\s*\)\s*$/.exec(
        maybeAdvQuery,
      );
      if (advancedMatchNot) {
        // (if there's a NOT outside the query, lift it into the query)
        return [maybeAdvQuery, `NOT (${advancedMatchNot[1]})`];
      } else {
        // (return basic query)
        return [maybeAdvQuery, undefined];
      }
    }
  }

  /** Returns the advanced query, with NOT support, or undefined if not an advanced query
   ** NOTE: this is now basically obsolete, since the "advanced queries" work just fine without it
   */
  static basicOrAdvancedQuery(
    query: string | undefined,
    fallback: string,
  ): string {
    // Firstly, let's sub-in the special case of {playerX|...}~N to take N from that set
    const subMatch = /[{]([^}]*)[}]([~=])([0-9]+)/g;
    return _.chain(
      (_.trim(query) || fallback).replace(
        subMatch,
        function (match, p1, p2, p3) {
          const players = p1.split(";");
          const laxCombo = p2 == "~"; //(vs strict if ==)
          const numToInclude = parseInt(p3); //(number by construction)

          return (
            "(" +
            (_ as any)
              .combinations(players, numToInclude)
              .map((combo: any) => {
                const andTerms = `(${_.join(combo, " AND ")})`;
                const notTermList = laxCombo
                  ? []
                  : _.difference(players, combo);
                const notTerms = `(${_.join(notTermList, " OR ")})`;
                return laxCombo || _.isEmpty(notTermList)
                  ? andTerms
                  : `(${andTerms} AND NOT ${notTerms})`;
              })
              .join(" OR ") +
            ")"
          );
        },
      ),
    )
      .thru((subQuery) => {
        const locationMatch =
          /opponent[.]([Hh]ome|[Aa]way|[Nn]eutral): *([(][^)]+[)]|"[^"]+"|[^ )\]]+)/g;
        return subQuery.replace(locationMatch, function (match, p1, p2) {
          const replaceStr = `(location_type:${_.capitalize(
            p1,
          )} AND (opponent.team:${p2}))`;
          return replaceStr;
        });
      })
      .thru((subQuery) => {
        const [basicMatch, maybeAdvQuery] =
          QueryUtils.extractAdvancedQuery(subQuery);
        if (maybeAdvQuery) {
          //(advanced query must already have field ids etc)
          return maybeAdvQuery;
        } else {
          return `players.id:(${basicMatch})`;
        }
      })
      .value();
  }

  /** Lookups into the public efficiency records to get a team's conference */
  static getConference(
    team: string,
    efficiency: Record<string, any>,
    lookup: Record<string, any>,
  ) {
    const efficiencyName = lookup[team]?.pbp_kp_team || team;
    return efficiency[efficiencyName]?.conf || "";
  }

  /** Injects a new AND clause into the query */
  static injectIntoQuery(
    newQueryEl: string,
    currQuery: [string, string | undefined],
  ) {
    // Different cases
    if (currQuery[0] == "") {
      return newQueryEl;
    } else if (currQuery[1]) {
      // Complicated advanced query
      return `[players.id:(${newQueryEl}) AND (${currQuery[1]})]`;
    } else {
      return `(${newQueryEl}) AND (${currQuery[0]})`;
    }
  }

  ///////////////////////////

  // Lots of query filter handling

  /** Allows having objects (eg custom dates) as common filters also - all (eg) custom dates have the same name */
  private static byName(
    filter: CommonFilterType | CustomDateAlias | GameSelectorAlias,
  ): CommonFilterKeyType {
    if (typeof filter == "string") {
      return filter as CommonFilterKeyType;
    } else if (isCommonFilterCustomDate(filter)) {
      return QueryUtils.customDateAliasName;
    } else if (isCommonFilterGameSelector(filter)) {
      return QueryUtils.customGamesAliasName;
    } else {
      return filter as unknown as CommonFilterKeyType;
    }
  }

  static asString(filter: CommonFilterType, forDisplay: boolean = false) {
    if (isCommonFilterCustomDate(filter)) {
      // must be a custom date
      // we assume 02.28 actually means 02.29..
      const maybeLeapYear = (s: string) => (s == "02.28" ? "02.29" : s);
      return `${QueryUtils.customDatePrefix}${maybeLeapYear(
        dateFormat(filter.start, QueryUtils.customDateFormat),
      )}-${maybeLeapYear(dateFormat(filter.end, QueryUtils.customDateFormat))}`;
    } else if (isCommonFilterGameSelector(filter)) {
      if (forDisplay) {
        if (filter.specialCase) {
          return `${QueryUtils.customGamesPrefix}${filter.specialCase}`;
        } else {
          const gameSuffix = filter.gameIds.length > 1 ? "s" : "";
          return `${QueryUtils.customGamesPrefix}${filter.gameIds.length}-game${gameSuffix}`;
        }
      } else {
        if (filter.specialCase) {
          return `${QueryUtils.customGamesPrefix}${filter.specialCase}`;
        } else {
          return `${QueryUtils.customGamesPrefix}${filter.gameIds.join("|")}`;
        }
      }
    } else {
      return filter as string;
    }
  }

  /** Handles a set of new filters (which can cause existing filters to be removed) */
  private static filterWith(
    curr: CommonFilterType[],
    toAdd: CommonFilterType[],
  ): CommonFilterType[] {
    const typed = (s: CommonFilterKeyType) => s; //(give ts compiler a bit of help with its arrays!)
    const toRemove: CommonFilterKeyType[] = _.flatMap(toAdd, (add) => {
      switch (QueryUtils.byName(add)) {
        case "Home":
          return [typed("Away"), typed("Not-Home")];
        case "Away":
          return [typed("Home"), typed("Not-Home")];
        case "Not-Home":
          return [typed("Home"), typed("Away")];

        case "1st-Half":
          return [typed("2nd-Half"), typed("Stretch")];
        case "2nd-Half":
          return [typed("1st-Half"), typed("Stretch")];
        case "Stretch":
          return [typed("1st-Half"), typed("2nd-Half")];

        case "Vs-Good":
          return [typed("Good-Off"), typed("Good-Def"), typed("Custom-Games")];
        case "Good-Off":
          return [typed("Vs-Good"), typed("Custom-Games")];
        case "Good-Def":
          return [typed("Vs-Good"), typed("Custom-Games")];
        case "Custom-Games":
          return [
            typed("Vs-Good"),
            typed("Good-Off"),
            typed("Good-Def"),
            typed("Last-30d"),
            typed("Nov-Dec"),
            typed("Jan-Apr"),
            typed("Custom-Date"),
          ];

        case "Last-30d":
          return [
            typed("Nov-Dec"),
            typed("Jan-Apr"),
            typed("Custom-Date"),
            typed("Custom-Games"),
          ];
        case "Nov-Dec":
          return [
            typed("Last-30d"),
            typed("Jan-Apr"),
            typed("Custom-Date"),
            typed("Custom-Games"),
          ];
        case "Jan-Apr":
          return [
            typed("Last-30d"),
            typed("Nov-Dec"),
            typed("Custom-Date"),
            typed("Custom-Games"),
          ];
        case "Custom-Date":
          return [
            typed("Last-30d"),
            typed("Nov-Dec"),
            typed("Jan-Apr"),
            typed("Custom-Games"),
          ];

        default:
          return [];
      }
    }).concat(toAdd.map(QueryUtils.byName)); //(we'll add them back again, but this ensures uniqueness)
    return _.sortBy(QueryUtils.filterWithout(curr, toRemove).concat(toAdd));
  }

  /** Returns the composite filter without the specified filter elements */
  private static filterWithout(
    curr: CommonFilterType[],
    toRemoveByName: CommonFilterKeyType[],
  ): CommonFilterType[] {
    const toRemoveSet = _.chain(toRemoveByName)
      .map((filter) => [filter, true])
      .fromPairs()
      .value();

    return _.filter(
      curr,
      (filter) =>
        !toRemoveSet.hasOwnProperty(QueryUtils.byName(filter) as string),
    );
  }

  /** Returns a custom date filter from the string MM.dd-MM.dd (note: without "Date:" prefix) */
  static parseCustomDate(
    dateStr: string,
    year: string,
  ): CommonFilterCustomDate | undefined {
    const yearStr = year.substring(0, 4);
    const dateStrs = dateStr.split("-");
    try {
      const contextDate = dateParse(
        `${yearStr}-12-30`,
        "yyyy-MM-dd",
        new Date(),
      ); //(mid point of the season)
      const getCorrectYear = (d: Date) => {
        return d.getMonth() < 6 ? addYears(d, 1) : d;
      };
      const parseHandlingLeapYears = (d: string) => {
        if (d == "02.29") {
          const attempt1 = dateParse(
            d,
            QueryUtils.customDateFormat,
            addYears(contextDate, 1),
          );

          return isNaN(attempt1.getTime())
            ? dateParse(
                "02.28", //(not a leap year - switch to day before)
                QueryUtils.customDateFormat,
                addYears(contextDate, 1),
              )
            : attempt1;
        } else {
          return getCorrectYear(
            dateParse(d, QueryUtils.customDateFormat, contextDate),
          );
        }
      };
      const dateStart = parseHandlingLeapYears(dateStrs[0]);
      const dateEnd = parseHandlingLeapYears(dateStrs[1] || "");

      return !Number.isNaN(dateStart.getTime()) &&
        !Number.isNaN(dateEnd.getTime())
        ? {
            kind: QueryUtils.customDateAliasName,
            start: dateStart,
            end: dateEnd,
          }
        : undefined;
    } catch (err: unknown) {
      return undefined; //(invalid state)
    }
  }

  /** Returns the custom date filter if it exists in the current filter set */
  static extractCustomDate(
    queryFilters: CommonFilterType[],
  ): CommonFilterCustomDate | undefined {
    const maybeItem = _.find(
      queryFilters,
      (f) => QueryUtils.byName(f) == QueryUtils.customDateAliasName,
    );
    return maybeItem ? (maybeItem as CommonFilterCustomDate) : undefined;
  }

  /** Builds a game filter from the URL parameter */
  static parseGameSelector(gameStr: string): CommonFilterGameSelector {
    if (gameStr == "wins") {
      return {
        kind: QueryUtils.customGamesAliasName,
        specialCase: gameStr,
        gameIds: [],
      };
    } else {
      const gameIds = gameStr.split("|").filter((s) => s != "");
      return { kind: QueryUtils.customGamesAliasName, gameIds };
    }
  }

  /** Returns the custom game selector if it exists in the current filter set */
  static extractGameSelector(
    queryFilters: CommonFilterType[],
  ): CommonFilterGameSelector | undefined {
    const maybeItem = _.find(
      queryFilters,
      (f) => QueryUtils.byName(f) == QueryUtils.customGamesAliasName,
    );
    return maybeItem ? (maybeItem as CommonFilterGameSelector) : undefined;
  }

  /** Switches between string and array formulation */
  static parseFilter(queryFilters: string, year: string): CommonFilterType[] {
    return queryFilters
      .split(",")
      .filter((s: string) => s != "")
      .flatMap((s: string) => {
        const trimmed = s.trim();
        if (trimmed.startsWith(QueryUtils.customDatePrefix)) {
          const parsedDataObj = QueryUtils.parseCustomDate(
            trimmed.substring(QueryUtils.customDatePrefix.length),
            year,
          );
          return parsedDataObj ? [parsedDataObj] : [];
        } else if (trimmed.startsWith(QueryUtils.customGamesPrefix)) {
          const parsedDataObj = QueryUtils.parseGameSelector(
            trimmed.substring(QueryUtils.customGamesPrefix.length),
          );
          return parsedDataObj ? [parsedDataObj] : [];
        } else {
          return [trimmed] as CommonFilterType[];
        }
      });
  }

  /** Converts the CommonFilterTypr into a string, deduplicating if necessary  - FOR param building, not actual querying */
  static buildFilterStr(curr: CommonFilterType[]) {
    const currByName = curr.map((qf) => QueryUtils.asString(qf, false));
    return _.join(_.uniq(currByName), ",");
  }

  /** Like buildFilterStr but specifically when being used to build an ES query, so expand dynamic */
  static buildFilterStrForQuery(
    curr: CommonFilterType[],
    gameSelection: GameSelection[],
  ) {
    const currByName = curr.map((qf) => {
      if (QueryUtils.byName(qf) == QueryUtils.customGamesAliasName) {
        const gf = QueryUtils.extractGameSelector([qf]);
        if (gf && gf.specialCase == "wins") {
          return QueryUtils.asString(
            QueryUtils.buildGameSelectionFilter(
              gameSelection.filter((g) => {
                return g.score?.[0] == "W";
              }),
            ),
          );
        } else {
          return QueryUtils.asString(qf);
        }
      } else {
        return QueryUtils.asString(qf);
      }
    });
    return _.join(_.uniq(currByName), ",");
  }

  /** Checks if a filter item is enabled */
  static filterHas(
    curr: CommonFilterType[],
    item: CommonFilterType | CustomDateAlias | GameSelectorAlias,
  ) {
    return Boolean(
      _.find(curr, (f) => QueryUtils.byName(f) == QueryUtils.byName(item)),
    );
  }

  /** Toggles a filter item (not custom dates) */
  static toggleFilter(curr: CommonFilterType[], item: CommonFilterTypeSimple) {
    return QueryUtils.filterHas(curr, item)
      ? QueryUtils.filterWithout(curr, [item])
      : QueryUtils.filterWith(curr, [item]);
  }

  /** Adds a new custom date (overwrite the current one if it exists), or removes the custom date */
  static setCustomDate(
    curr: CommonFilterType[],
    setOrUnset: CommonFilterCustomDate | undefined,
  ) {
    return QueryUtils.filterWith(
      QueryUtils.filterWithout(curr, [QueryUtils.customDateAliasName]),
      setOrUnset ? [setOrUnset] : [],
    );
  }

  /** Goes from game selection to a query filter */
  static buildGameSelectionFilter(
    games: GameSelection[],
  ): CommonFilterGameSelector {
    return {
      kind: QueryUtils.customGamesAliasName,
      gameIds: games.map((g) => `${g.date}:${g.location[0]}:${g.opponent}`),
    };
  }

  /** Note for special (dynamic) cases likes "wins" and "close-games", we don't populate this
   * .. that way it's clear if you hit "save" you're going to over-write them
   */
  static buildGameSelectionModel(
    queryFilters: CommonFilterType[],
  ): GameSelection[] {
    return _.thru(
      QueryUtils.extractGameSelector(queryFilters),
      (gameSelector) => {
        return (gameSelector?.gameIds || []).map((gameId) => {
          const [date, locationTmp, opponent] = gameId.split(":");
          const location =
            locationTmp == "H"
              ? "Home"
              : locationTmp == "A"
                ? "Away"
                : "Neutral";
          return { date, location, opponent, score: "" };
        });
      },
    );
  }

  /** Adds a new custom date (overwrite the current one if it exists), or removes the custom date */
  static setCustomGameSelection(
    curr: CommonFilterType[],
    setOrUnset: CommonFilterGameSelector | undefined,
  ) {
    return QueryUtils.filterWith(
      QueryUtils.filterWithout(curr, [QueryUtils.customGamesAliasName]),
      setOrUnset ? [setOrUnset] : [],
    );
  }

  // Handy display feature for on/off query

  static queryDisplayStrs(params: GameFilterParams): {
    off: string;
    on: string;
    baseline: string;
    other: string[];
  } {
    const queryFilterSummary = (
      query: string | undefined,
      filters: string | undefined,
    ) => {
      const queryStr = query ? `query: '${_.trim(query)}'` : ``;
      const filterStr = filters
        ? `${queryStr ? ", " : ""}filters: '${filters}'`
        : ``;
      return queryStr + filterStr;
    };
    const onQuery = queryFilterSummary(params.onQuery, params.onQueryFilters);
    const offQuery = params.autoOffQuery
      ? onQuery
        ? `NOT [${onQuery}]`
        : ``
      : queryFilterSummary(params.offQuery, params.offQueryFilters);
    const baselineQuery = queryFilterSummary(
      params.baseQuery,
      params.queryFilters,
    );

    return {
      on: onQuery,
      off: offQuery,
      baseline: baselineQuery,
      other: (params.otherQueries || []).map((oq) =>
        queryFilterSummary(oq.query, oq.queryFilters),
      ),
    };
  }

  // A bunch of utils to handle some of the logic surrounding combined query strings and filters

  /** One of some overloaded checks for whether a query type is doing anything */
  static nonEmptyQueryObj(params: GameFilterParams, queryType: "on" | "off") {
    if (queryType == "on") {
      return QueryUtils.nonEmptyQueryStr(params.onQuery, params.onQueryFilters);
    } else {
      //off
      return QueryUtils.nonEmptyQueryStr(
        params.offQuery,
        params.offQueryFilters,
      );
    }
  }
  /** One of some overloaded checks for whether a query type is doing anything */
  static nonEmptyQueryStr(
    queryStr: string | undefined,
    queryFiltersStr: string | undefined,
  ) {
    return (queryStr || "") != "" || (queryFiltersStr || "") != "";
  }
  /** One of some overloaded checks for whether a query type is doing anything */
  static nonEmptyQuery(
    queryStr: string | undefined,
    queryFilter: CommonFilterType[],
  ) {
    return (queryStr || "") != "" || queryFilter.length > 0;
  }

  /** Auto off query with on query filters set - this is a special case because can't represent the query with a single query/filter pair */
  static autoOffAndFilters(
    autoOff: boolean,
    onQueryFilter: CommonFilterType[],
  ) {
    return autoOff && onQueryFilter.length > 0;
  }
  /** Auto off query with on query filters set - this is a special case because can't represent the query with a single query/filter pair */
  static autoOffAndFiltersObj(params: GameFilterParams) {
    return (
      (params.autoOffQuery || false) && (params.onQueryFilters || "") != ""
    );
  }
  /** To handle the "autoOffAndFilters" case described above, we have a special internal search mode for lineups */
  static invertedQueryMode(params: CommonFilterParams) {
    return (
      (params.invertBase || "") != "" ||
      (params.invertBaseQueryFilters || "") != ""
    );
  }

  /**
   * Context for position-split lineup queries: who ever played below/above the focal player
   * (ordered slots), whether lower/higher sets overlap (corrupt), and per-lineup rows for OR fallback.
   */
  static identifyHigherLowerSets(
    lineups: LineupStatSet[],
    resolved: PlayerCodeId,
    positionFromPlayerKey: Record<PlayerId, IndivPosInfo>,
    teamSeasonLookup: string,
  ): PositionSplitContext {
    const qualifyingLineups = _.chain(lineups)
      .reject(
        (l) =>
          l.key === LineupTableUtils.totalLineupId ||
          l.key === LineupTableUtils.droppedLineupId,
      )
      .filter((l) => LineupTableUtils.buildCodesAndIds(l).length === 5)
      .value();

    const orderedRows = _.chain(qualifyingLineups)
      .map((l) => {
        const codesAndIds = LineupTableUtils.buildCodesAndIds(l);
        const sorted = PositionUtils.orderLineup(
          codesAndIds,
          positionFromPlayerKey,
          teamSeasonLookup,
        );
        return { l, sorted };
      })
      .value();

    const teamSlotOccupants = _.chain(_.range(0, 5))
      .map((slot) =>
        _.chain(orderedRows)
          .map((row) => row.sorted[slot]?.id)
          .compact()
          .uniq()
          .sortBy()
          .value(),
      )
      .value();

    const lineupRows = _.chain(orderedRows)
      .filter((row) => _.some(row.sorted, (p) => p.id === resolved.id))
      .map((row) => {
        const { l, sorted } = row;
        const idx = _.findIndex(sorted, (p) => p.id === resolved.id);
        if (idx < 0) return undefined;
        const lowerIds = _.map(sorted.slice(0, idx), "id");
        const higherIds = _.map(sorted.slice(idx + 1), "id");
        return {
          lineupKey: l.key,
          sortedIds: _.map(sorted, "id"),
          xPosition: idx + 1,
          lowerIds,
          higherIds,
        };
      })
      .compact()
      .value();

    const lowerUnion = _.chain(lineupRows)
      .flatMap("lowerIds")
      .uniq()
      .sortBy()
      .value();
    const higherUnion = _.chain(lineupRows)
      .flatMap("higherIds")
      .uniq()
      .sortBy()
      .value();
    const lowerSet = new Set(lowerUnion);
    const isCorrupt = _.some(higherUnion, (id) => lowerSet.has(id));
    const corruptIntersectionIds = _.chain(higherUnion)
      .filter((id) => lowerSet.has(id))
      .sortBy()
      .value();

    const positionsPlayed = _.chain(lineupRows)
      .map("xPosition")
      .uniq()
      .sortBy()
      .value();

    if (isPosSplitBuilderDebug) {
      positionSplitDebug("identifyHigherLowerSets", {
        resolved: { code: resolved.code, id: resolved.id },
        teamSeasonLookup,
        qualifyingFiveManLineupCount: qualifyingLineups.length,
        xLineupRowCount: lineupRows.length,
        lowerUnion,
        higherUnion,
        corruptIntersectionIds,
        isCorrupt,
        positionsPlayed,
        perXLineup: _.map(lineupRows, (r) => ({
          key: r.lineupKey,
          xPosition: r.xPosition,
          sortedIds: r.sortedIds,
          lowerIds: r.lowerIds,
          higherIds: r.higherIds,
        })),
        teamSlotOccupants: _.map(teamSlotOccupants, (ids, slot) => ({
          slot,
          label: ["PG", "SG", "SF", "PF", "C"][slot],
          ids,
        })),
      });
    }

    return {
      lowerIds: lowerUnion,
      higherIds: higherUnion,
      isCorrupt,
      positionsPlayed,
      lineupRows,
      teamSlotOccupants,
    };
  }

  /**
   * Normal path: X on court, exactly (P-1) from lower slots' team-wide pool and (5-P) from higher
   * slots' team-wide pool (`teamSlotOccupants`), not only ids observed below/above X in X-lineups.
   * See `basicOrAdvancedQuery` strict `{pool}=k` expansion (all k-combos from the pool).
   * Corrupt path: OR of full `{id1;...;id5}=5` for each distinct ordered lineup where X held that slot.
   * Degenerate: X always at 5 when on court → query `*` for that split.
   */
  static buildPositionQueriesFromSets(
    resolved: PlayerCodeId,
    positionsPlayed: number[],
    ctx: PositionSplitContext,
  ): Record<number, string> {
    const playerId = resolved.id;
    const xAlwaysAtFive = _.every(ctx.lineupRows, (r) => r.xPosition === 5);
    const slots = ctx.teamSlotOccupants;

    const poolClause = (ids: PlayerId[], k: number): string | undefined => {
      if (k === 0) return undefined;
      if (_.isEmpty(ids)) return undefined;
      return `{${_.map(ids, (id) => `"${id}"`).join(";")}}=${k}`;
    };

    const unionSlotPools = (slotIndices: number[]): PlayerId[] =>
      _.chain(slotIndices)
        .flatMap((s) => slots[s] || [])
        .uniq()
        .without(playerId)
        .sortBy()
        .value();

    const normalQueryForPosition = (pos: number): string => {
      const nLower = pos - 1;
      const nHigher = 5 - pos;
      if (xAlwaysAtFive && pos === 5 && positionsPlayed.length === 1) {
        return "*";
      }
      const lowerPool = unionSlotPools(_.range(0, pos - 1));
      const higherPool = unionSlotPools(_.range(pos, 5));
      const parts = _.compact([
        `{"${playerId}"}=1`,
        poolClause(lowerPool, nLower),
        poolClause(higherPool, nHigher),
      ]);
      return parts.join(" AND ");
    };

    const corruptQueryForPosition = (pos: number): string => {
      const rows = _.filter(ctx.lineupRows, (r) => r.xPosition === pos);
      const terms = _.chain(rows)
        .map((r) => r.sortedIds)
        .uniqWith((a, b) => _.isEqual(a, b))
        .map((ids) => `{${_.map(ids, (id) => `"${id}"`).join(";")}}=5`)
        .value();
      return _.isEmpty(terms) ? `{"${playerId}"}=1` : terms.join(" OR ");
    };

    if (isPosSplitBuilderDebug) {
      positionSplitDebug("buildPositionQueriesFromSets (input)", {
        resolved: { code: resolved.code, id: resolved.id },
        isCorrupt: ctx.isCorrupt,
        positionsPlayed,
        xAlwaysAtFive,
        lowerUnionFromXLineups: ctx.lowerIds,
        higherUnionFromXLineups: ctx.higherIds,
        branch: ctx.isCorrupt
          ? "CORRUPT → explicit OR of =5 lineups (hideous lineup call)"
          : "NORMAL → pool clauses from teamSlotOccupants",
      });
    }

    if (isPosSplitBuilderDebug) {
      _.forEach(positionsPlayed, (pos) => {
        if (ctx.isCorrupt) {
          const rowsAtPos = _.filter(
            ctx.lineupRows,
            (r) => r.xPosition === pos,
          );
          const distinctFiveTuples = _.chain(rowsAtPos)
            .map((r) => r.sortedIds)
            .uniqWith((a, b) => _.isEqual(a, b))
            .value();
          positionSplitDebug(
            `buildPositionQueriesFromSets pos=${pos} CORRUPT`,
            {
              matchingLineupRows: rowsAtPos.length,
              distinctFiveTuples: distinctFiveTuples.length,
              tuplesPreview: distinctFiveTuples.slice(0, 8),
              queryPreview: corruptQueryForPosition(pos).slice(0, 500),
            },
          );
        } else {
          const nLower = pos - 1;
          const nHigher = 5 - pos;
          const lowerPool = unionSlotPools(_.range(0, pos - 1));
          const higherPool = unionSlotPools(_.range(pos, 5));
          positionSplitDebug(`buildPositionQueriesFromSets pos=${pos} NORMAL`, {
            nLower,
            nHigher,
            lowerPoolSize: lowerPool.length,
            higherPoolSize: higherPool.length,
            lowerPool,
            higherPool,
            queryPreview: normalQueryForPosition(pos).slice(0, 500),
          });
        }
      });
    }

    return _.chain(positionsPlayed)
      .map(
        (pos) =>
          [
            pos,
            ctx.isCorrupt
              ? corruptQueryForPosition(pos)
              : normalQueryForPosition(pos),
          ] as [number, string],
      )
      .fromPairs()
      .value() as Record<number, string>;
  }

  /**
   * Placeholder for shrinking `{P1..Pn}=k` clauses when pools are large. Currently a no-op.
   */
  static compressPositionQueries(
    queryByPosition: Record<number, string>,
    _ctx: PositionSplitContext,
  ): Record<number, string> {
    return queryByPosition;
  }

  /**
   * Builds partial GameFilterParams for splitting by positions a player played.
   * Pipeline: identifyHigherLowerSets → buildPositionQueriesFromSets → compressPositionQueries (no-op).
   */
  static buildGameFilterParamsByPlayerPositions(
    lineups: LineupStatSet[],
    playerIdentifier: string,
    positionFromPlayerKey: Record<PlayerId, IndivPosInfo>,
    teamSeasonLookup: string,
  ): Partial<GameFilterParams> {
    const empty: Partial<GameFilterParams> = {
      onQuery: "",
      offQuery: "",
      otherQueries: [],
      splitPhrases: [],
      autoOffQuery: false,
    };

    const normalizedId = _.trim(playerIdentifier).toLowerCase();
    if (!normalizedId) return empty;

    const resolved = _.chain(lineups)
      .reject(
        (l) =>
          l.key === LineupTableUtils.totalLineupId ||
          l.key === LineupTableUtils.droppedLineupId,
      )
      .flatMap((l) => LineupTableUtils.buildCodesAndIds(l))
      .uniqBy((c) => c.id)
      .find((c) =>
        Boolean(
          (c.code && c.code.toLowerCase() === normalizedId) ||
          (c.id && c.id.toLowerCase() === normalizedId),
        ),
      )
      .value();
    if (!resolved) return empty;

    const ctx = QueryUtils.identifyHigherLowerSets(
      lineups,
      resolved,
      positionFromPlayerKey,
      teamSeasonLookup,
    );

    if (_.isEmpty(ctx.positionsPlayed)) return empty;

    const queryByPositionRaw = QueryUtils.buildPositionQueriesFromSets(
      resolved,
      ctx.positionsPlayed,
      ctx,
    );
    const queryByPosition = QueryUtils.compressPositionQueries(
      queryByPositionRaw,
      ctx,
    );

    const sortedPositions = _.sortBy(ctx.positionsPlayed);
    const onQuery = queryByPosition[sortedPositions[0]!] ?? "";
    const offQuery =
      sortedPositions.length >= 2
        ? (queryByPosition[sortedPositions[1]!] ?? "")
        : "";
    const otherQueries = _.chain(sortedPositions)
      .slice(2)
      .map((pos) => ({ query: queryByPosition[pos] ?? "" }))
      .value();

    const splitPhrases = (() => {
      const phrases = _.map(
        sortedPositions,
        (pos) => `${resolved.code}=[${pos}]`,
      );
      // Single phrase → string in query-string → char-zip bug; mirror MatchupFilter / TableDisplayUtils
      return phrases.length === 1 ? [...phrases, ""] : phrases;
    })();

    if (isPosSplitBuilderDebug) {
      positionSplitDebug("buildGameFilterParamsByPlayerPositions (result)", {
        playerIdentifier: normalizedId,
        isCorrupt: ctx.isCorrupt,
        positionsPlayed: sortedPositions,
        splitPhrases,
        onQueryPreview: onQuery.slice(0, 600),
        offQueryPreview: offQuery.slice(0, 400),
        otherQueriesCount: otherQueries.length,
        /** True when raw query uses corrupt fallback `{...}=5 OR {...}=5` (not expanded). */
        rawQueryHasExplicitFiveManOr: _.some(queryByPosition, (q) =>
          /\}=5 OR/.test(q || ""),
        ),
      });
    }

    return {
      onQuery,
      offQuery,
      otherQueries,
      splitPhrases,
      autoOffQuery: false,
    };
  }
}
